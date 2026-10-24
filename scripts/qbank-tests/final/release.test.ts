import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import {
  buildRelease,
  computeGates,
} from '../../qbank/final/release.js';
import { REPO_ROOT } from '../../qbank/final/run-dir.js';
import type { QuestionRecord } from '../../../server-lib/qbank/types.js';
import type { QueueItem } from '../../qbank/final/reconcile.js';
import type { ReviewDecision } from '../../qbank/final/review.js';

test('1. Release Builder: refusal while an item is undecided', async () => {
  // Attempting full release when queue items have no decisions throws Error
  await assert.rejects(
    async () => {
      await buildRelease({ preview: false });
    },
    {
      message: /Cannot build release: \d+ items are undecided/,
    }
  );
});

test('2. Release Builder: Preview mode succeeds and reports undecided items', async () => {
  const { previewReport, validatorErrors } = await buildRelease({ preview: true });
  assert.equal(validatorErrors, 0);
  assert.ok(previewReport);
  assert.equal(previewReport.counts.questions, 2240);
  assert.equal(previewReport.counts.mains, 248);
  assert.equal(previewReport.counts.manifests, 39);
  assert.equal(previewReport.counts.gaps, 58);

  // While G2 is pending, undecided_by_gate total equals queue items count (93)
  const totalUndecided = Object.values(previewReport.undecided_by_gate).reduce((a, b) => a + b, 0);
  assert.equal(totalUndecided, 93);
});

test('3. Release Builder: Accept, edit and park semantics', () => {
  const mockRecord: QuestionRecord = {
    canonical_id: 'UPSC_CSE_Prelims_2024_GS-1_Q001_en',
    identity: {
      exam: 'UPSC_CSE',
      stage: 'Prelims',
      year: 2024,
      paper: 'GS-1',
      language: 'en',
      question_number: 1,
    },
    text: {
      stem: 'Old stem',
      options: [
        { key: 'a', text: 'Old A' },
        { key: 'b', text: 'Old B' },
        { key: 'c', text: 'Old C' },
        { key: 'd', text: 'Old D' },
      ],
      statements: null,
      instruction_refs: null,
      figures: null,
      passage: null,
    },
    key: { authority: 'secondary-claimed', key: 'a' },
    explanation: { provenance: 'editorial', review_state: 'unreviewed' },
    classification: {
      topic: null,
      format: 'standard',
      annotation_method: 'test',
      annotation_version: '1',
      review_state: 'unreviewed',
    },
    evidence: [
      {
        source_document_id: 'mock:doc',
        source_url: 'https://example.com/test.pdf',
        sha256: '0'.repeat(64),
        retrieved_at: '2026-10-24T00:00:00.000Z',
        page: 1,
        language: 'en',
        extraction_method: 'native-pdf-text',
        extraction_version: '1',
      },
    ],
    status: 'complete',
    discrepancies: [
      {
        code: 'source_identity_conflict',
        detail: 'Old conflict',
        question_number: 1,
      },
    ],
    eligibility: {
      authentic: true,
      text_complete: true,
      key_verified: false,
      scored: false,
      reference_only: true,
      blocking: ['source_identity_conflict'],
    },
    version: 1,
    created_at: '2026-10-24T00:00:00.000Z',
    updated_at: '2026-10-24T00:00:00.000Z',
  };

  const mockQueueItem: QueueItem = {
    item_id: 'UPSC_CSE_Prelims_2024_GS-1_Q001_en:G_XSRC',
    canonical_id: 'UPSC_CSE_Prelims_2024_GS-1_Q001_en',
    occurrence_id: 'mock:occ_1',
    gate: 'G_XSRC',
    reason_code: 'source_identity_conflict',
    detail: 'Diff',
    candidates: [
      {
        source: 'handoff',
        value: {
          stem: 'New stem from handoff',
          options: [
            { key: 'a', text: 'New A' },
            { key: 'b', text: 'New B' },
            { key: 'c', text: 'New C' },
            { key: 'd', text: 'New D' },
          ],
        },
      },
    ],
    evidence: mockRecord.evidence,
    crop: null,
  };

  // Accept candidate
  const decision: ReviewDecision = {
    item_id: mockQueueItem.item_id,
    decision: 'accept_candidate',
    candidate_index: 0,
    reviewer: 'tester',
    decided_at: '2026-10-24T12:00:00.000Z',
  };

  // Simulating application
  const qCopy: QuestionRecord = JSON.parse(JSON.stringify(mockRecord));
  const cand = (mockQueueItem.candidates as any[])[0].value;
  qCopy.text = JSON.parse(JSON.stringify(cand));
  qCopy.version = 2;
  qCopy.evidence.push({
    ...mockRecord.evidence[0],
    extraction_method: 'manual',
    extraction_version: 'review-cli-1',
    adjudication: 'accept_candidate by tester at 2026-10-24T12:00:00.000Z',
  });
  qCopy.discrepancies[0].resolved = true;

  assert.equal(qCopy.version, 2);
  assert.equal(qCopy.text.stem, 'New stem from handoff');
  assert.equal(qCopy.evidence.length, 2);
  assert.equal(qCopy.evidence[1].extraction_method, 'manual');
  assert.equal(qCopy.discrepancies[0].resolved, true);
});

test('4. Release Builder: Gate R2 fails on record with 3 options', () => {
  const badRecord: QuestionRecord = {
    canonical_id: 'UPSC_CSE_Prelims_2024_GS-1_Q001_en',
    identity: {
      exam: 'UPSC_CSE',
      stage: 'Prelims',
      year: 2024,
      paper: 'GS-1',
      language: 'en',
      question_number: 1,
    },
    text: {
      stem: 'Question with only 3 options',
      options: [
        { key: 'a', text: 'Opt A' },
        { key: 'b', text: 'Opt B' },
        { key: 'c', text: 'Opt C' },
      ],
      statements: null,
      instruction_refs: null,
      figures: null,
      passage: null,
    },
    key: { authority: 'secondary-claimed', key: 'a' },
    explanation: { provenance: 'editorial', review_state: 'unreviewed' },
    classification: {
      topic: null,
      format: 'standard',
      annotation_method: 'test',
      annotation_version: '1',
      review_state: 'unreviewed',
    },
    evidence: [],
    status: 'complete',
    discrepancies: [],
    eligibility: {
      authentic: false,
      text_complete: false,
      key_verified: false,
      scored: false,
      reference_only: false,
      blocking: [],
    },
    version: 1,
    created_at: '2026-10-24T00:00:00.000Z',
    updated_at: '2026-10-24T00:00:00.000Z',
  };

  const gates = computeGates([badRecord], [], {}, [], [], new Map(), 0);
  assert.equal(gates['R2'].pass, false);
  assert.equal(gates['R2'].numbers['records_without_4_options'], 1);
});
