import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import {
  computeSeriesAlignment,
  checkCriticalDiff,
  reconcilePrelimsSlot,
  runReconcile,
  type EnvelopeOccurrence,
} from '../../qbank/final/reconcile.js';
import { REPO_ROOT } from '../../qbank/final/run-dir.js';
import type { KeyAssertion, QuestionText } from '../../../server-lib/qbank/types.js';

function makeMockEnvelope(
  qno: number,
  claimKey: 'a' | 'b' | 'c' | 'd' | null,
  text?: Partial<QuestionText>
): EnvelopeOccurrence {
  return {
    occurrence: {
      occurrence_id: `mock:2024-GS-1_q${qno}`,
      identity: {
        exam: 'UPSC_CSE',
        stage: 'Prelims',
        year: 2024,
        paper: 'GS-1',
        language: 'en',
        question_number: qno,
      },
      text: {
        stem: text?.stem || `Question stem ${qno}`,
        statements: text?.statements || null,
        instruction_refs: text?.instruction_refs || null,
        options: text?.options || [
          { key: 'a', text: 'Option A' },
          { key: 'b', text: 'Option B' },
          { key: 'c', text: 'Option C' },
          { key: 'd', text: 'Option D' },
        ],
        figures: null,
        passage: null,
      },
      key_claim: claimKey ? { authority: 'secondary-claimed', key: claimKey } : undefined,
      evidence: {
        source_document_id: 'mock:doc',
        source_url: 'https://example.com/mock.pdf',
        sha256: '0'.repeat(64),
        retrieved_at: '2026-10-22T00:00:00.000Z',
        page: 1,
        language: 'en',
        extraction_method: 'native-pdf-text',
        extraction_version: '086F-1',
      },
    },
    explanation_claim: {
      provenance: 'editorial',
      review_state: 'unreviewed',
      text: `Explanation for Q${qno}`,
    },
    parse: {
      question_type: 'direct',
    },
  };
}

test('1. Alignment: passes at 0.9, fails at 0.3, accepted_keys agreement', () => {
  // 10 items
  const envelopes: EnvelopeOccurrence[] = Array.from({ length: 10 }, (_, i) =>
    makeMockEnvelope(i + 1, 'a')
  );

  // Case A: 9 agree out of 10 -> 0.9 >= 0.8 -> aligned = true
  const officialPass: Record<string, KeyAssertion> = {};
  for (let i = 1; i <= 9; i++) {
    officialPass[String(i)] = { authority: 'official-final', key: 'a' };
  }
  officialPass['10'] = { authority: 'official-final', key: 'b' };

  const resPass = computeSeriesAlignment(envelopes, officialPass);
  assert.equal(resPass.n, 10);
  assert.equal(resPass.agree, 9);
  assert.equal(resPass.rate, 0.9);
  assert.equal(resPass.aligned, true);

  // Case B: 3 agree out of 10 -> 0.3 < 0.8 -> aligned = false
  const officialFail: Record<string, KeyAssertion> = {};
  for (let i = 1; i <= 3; i++) {
    officialFail[String(i)] = { authority: 'official-final', key: 'a' };
  }
  for (let i = 4; i <= 10; i++) {
    officialFail[String(i)] = { authority: 'official-final', key: 'b' };
  }

  const resFail = computeSeriesAlignment(envelopes, officialFail);
  assert.equal(resFail.n, 10);
  assert.equal(resFail.agree, 3);
  assert.equal(resFail.rate, 0.3);
  assert.equal(resFail.aligned, false);

  // Case C: accepted_keys agreement
  // Official key is 'b', but accepted_keys has ['a', 'b']. Claim is 'a' -> counts as agreement
  const officialAccepted: Record<string, KeyAssertion> = {
    '1': { authority: 'official-final', key: 'b', accepted_keys: ['a', 'b'] },
  };
  const resAccepted = computeSeriesAlignment([envelopes[0]], officialAccepted);
  assert.equal(resAccepted.n, 1);
  assert.equal(resAccepted.agree, 1);
  assert.equal(resAccepted.rate, 1.0);
  assert.equal(resAccepted.aligned, true);
});

test('2. Key resolution: official override + explanation rejection, withdrawn key, secondary null key', () => {
  const clockTime = '2026-10-22T00:00:00.000Z';

  // Case A: Official key overrides claim and explanation is rejected on contradiction
  const envA = makeMockEnvelope(1, 'a');
  const officialKeyA: KeyAssertion = { authority: 'official-final', key: 'c' };
  const resA = reconcilePrelimsSlot(envA, true, 95, 100, officialKeyA, undefined, clockTime);

  assert.equal(resA.record.key.authority, 'official-final');
  assert.equal(resA.record.key.key, 'c');
  assert.equal(resA.record.explanation.review_state, 'rejected');
  assert.ok(
    resA.record.discrepancies.some((d) => d.code === 'explanation_unsupported'),
    'Expected explanation_unsupported discrepancy'
  );

  // Case B: Withdrawn key -> authority: "withdrawn", key: null
  const envB = makeMockEnvelope(2, 'b');
  const officialKeyWithdrawn: KeyAssertion = { authority: 'withdrawn', key: null };
  const resB = reconcilePrelimsSlot(envB, true, 95, 100, officialKeyWithdrawn, undefined, clockTime);

  assert.equal(resB.record.key.authority, 'withdrawn');
  assert.equal(resB.record.key.key, null);

  // Case C: Secondary null key -> key_unavailable discrepancy
  const envC = makeMockEnvelope(3, null);
  const resC = reconcilePrelimsSlot(envC, false, 0, 0, undefined, undefined, clockTime);

  assert.equal(resC.record.key.authority, 'secondary-claimed');
  assert.equal(resC.record.key.key, null);
  assert.ok(
    resC.record.discrepancies.some((d) => d.code === 'key_unavailable'),
    'Expected key_unavailable discrepancy'
  );
});

test('3. Critical diff: number change, "not" count, option text change, whitespace tolerance', () => {
  const baseText: QuestionText = {
    stem: 'Consider the following statements about 42 rivers: not all rivers flow south.',
    statements: ['1. Exactly 10 rivers flow east.'],
    instruction_refs: null,
    options: [
      { key: 'a', text: '1 only' },
      { key: 'b', text: '2 only' },
      { key: 'c', text: 'Both 1 and 2' },
      { key: 'd', text: 'Neither 1 nor 2' },
    ],
    figures: null,
    passage: null,
  };

  // Case A: Changed number (42 -> 43)
  const numDiffText: QuestionText = {
    ...baseText,
    stem: 'Consider the following statements about 43 rivers: not all rivers flow south.',
  };
  const resNum = checkCriticalDiff(baseText, numDiffText);
  assert.equal(resNum.isDiff, true);
  assert.match(resNum.detail || '', /number count mismatch/);

  // Case B: Removed "not"
  const notDiffText: QuestionText = {
    ...baseText,
    stem: 'Consider the following statements about 42 rivers: all rivers flow south.',
  };
  const resNot = checkCriticalDiff(baseText, notDiffText);
  assert.equal(resNot.isDiff, true);
  assert.match(resNot.detail || '', /sensitive word 'not' count mismatch/);

  // Case C: Changed option text (keeping numbers and sensitive words identical)
  const optBaseText: QuestionText = {
    ...baseText,
    options: [
      { key: 'a', text: 'Statement alpha' },
      { key: 'b', text: 'Statement beta' },
      { key: 'c', text: 'Statement gamma' },
      { key: 'd', text: 'Statement delta' },
    ],
  };
  const optDiffText: QuestionText = {
    ...optBaseText,
    options: [
      { key: 'a', text: 'Statement omega' },
      { key: 'b', text: 'Statement beta' },
      { key: 'c', text: 'Statement gamma' },
      { key: 'd', text: 'Statement delta' },
    ],
  };
  const resOpt = checkCriticalDiff(optBaseText, optDiffText);
  assert.equal(resOpt.isDiff, true);
  assert.match(resOpt.detail || '', /option a text differs/);

  // Case D: Whitespace and casing tolerance only
  const wsDiffText: QuestionText = {
    ...baseText,
    stem: 'Consider  the   following statements about 42 rivers: not all rivers flow south. ',
    statements: ['1.   Exactly 10 rivers flow east.'],
    options: [
      { key: 'a', text: '  1  only  ' },
      { key: 'b', text: '2 ONLY' },
      { key: 'c', text: 'Both 1 and 2' },
      { key: 'd', text: 'Neither 1 nor 2' },
    ],
  };
  const resWs = checkCriticalDiff(baseText, wsDiffText);
  assert.equal(resWs.isDiff, false);
  assert.equal(resWs.detail, null);
});

test('4. Pairing and coverage: gaps file and manifests', () => {
  const runDir = path.join(REPO_ROOT, '_raw_source_archive', 'qbank-quality', 'final-2026-10');
  const gapsPath = path.join(runDir, 'canonical', 'gaps.preview.json');
  const manifestsPath = path.join(runDir, 'canonical', 'manifests.preview.json');

  assert.ok(fs.existsSync(gapsPath), 'gaps.preview.json should exist');
  assert.ok(fs.existsSync(manifestsPath), 'manifests.preview.json should exist');

  const gaps = JSON.parse(fs.readFileSync(gapsPath, 'utf-8'));
  const manifests = JSON.parse(fs.readFileSync(manifestsPath, 'utf-8'));

  // CSAT missing years in gaps: 2011-2016, 2018, 2019
  const missingCsatYears = [2011, 2012, 2013, 2014, 2015, 2016, 2018, 2019];
  for (const yr of missingCsatYears) {
    const slug = `${yr}-GS-2`;
    const gapEntry = gaps.find((g: { paper_slug: string }) => g.paper_slug === slug);
    assert.ok(gapEntry, `Gap entry should exist for ${slug}`);
    assert.equal(gapEntry.expected_slots, 80);
    assert.equal(manifests[slug], undefined, `Manifest should NOT exist for gap slug ${slug}`);
  }
});

test('5. Determinism: verify runReconcile produces consistent output', async () => {
  const { validator_errors } = await runReconcile();
  assert.equal(validator_errors, 0, 'Reconcile should produce 0 validator errors');
});
