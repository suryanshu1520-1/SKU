import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanonicalId,
  collectDiscrepancies,
  deriveEligibility,
  identityTuple,
  isPlaceholderOption,
  normalizedStem,
  stemPrefix,
  validatePaperManifest,
  validateQuestionRecord,
  validateMainsQuestionRecord,
} from '../../server-lib/qbank/validators.js';
import type {
  EvidenceRef,
  PaperManifest,
  QuestionRecord,
  MainsQuestionRecord,
} from '../../server-lib/qbank/types.js';

const ev: EvidenceRef = {
  source_document_id: 'doc-1',
  source_url: 'https://example.in/paper.pdf',
  sha256: 'a'.repeat(64),
  retrieved_at: '2026-09-24T00:00:00.000Z',
  page: 1,
  language: 'en',
  extraction_method: 'manual',
  extraction_version: '1',
};

function makeRecord(overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  const base: QuestionRecord = {
    canonical_id: 'UPSC_CSE_Prelims_2019_GS-1_Q001_en',
    identity: {
      exam: 'UPSC_CSE',
      stage: 'Prelims',
      year: 2019,
      paper: 'GS-1',
      booklet_series: 'A',
      language: 'en',
      question_number: 1,
    },
    text: {
      stem: 'Which of the following is correct?',
      options: [
        { key: 'a', text: 'Real option text one' },
        { key: 'b', text: 'Real option text two' },
        { key: 'c', text: 'Real option text three' },
        { key: 'd', text: 'Real option text four' },
      ],
    },
    key: { authority: 'official-final', key: 'b' },
    explanation: { provenance: 'none', review_state: 'unreviewed' },
    classification: { review_state: 'unreviewed' },
    evidence: [ev],
    status: 'complete',
    discrepancies: [],
    version: 1,
    created_at: '2026-09-24T00:00:00.000Z',
    updated_at: '2026-09-24T00:00:00.000Z',
  };
  const merged = { ...base, ...overrides } as QuestionRecord;
  merged.eligibility = deriveEligibility(merged);
  return merged;
}

// ---------------------------------------------------------------------------
// Normalization and placeholder detection
// ---------------------------------------------------------------------------

test('normalizedStem lowercases and collapses whitespace', () => {
  assert.equal(normalizedStem('  Which OF the   Following '), 'which of the following');
  assert.equal(normalizedStem(null), '');
  assert.equal(normalizedStem(undefined), '');
});

test('stemPrefix slices to N normalized characters', () => {
  assert.equal(stemPrefix('ABCDEFGHIJ', 5), 'abcde');
});

test('isPlaceholderOption detects "Option X" with and without letter prefix', () => {
  for (const s of ['Option A', '(a) Option A', 'A. Option B', 'b) Option C', 'OptionD', '(c)Option C']) {
    assert.ok(isPlaceholderOption(s), `should be placeholder: ${s}`);
  }
  for (const s of ['New Delhi', 'A real answer about the monsoon', '', null, undefined]) {
    assert.ok(!isPlaceholderOption(s), `should NOT be placeholder: ${s}`);
  }
});

test('identityTuple excludes booklet/language by design', () => {
  assert.equal(identityTuple({ exam: 'UPSC_CSE', stage: 'Prelims', year: 2019, paper: 'GS-1', question_number: 1 }), 'UPSC_CSE|Prelims|2019|GS-1|1');
});

// ---------------------------------------------------------------------------
// Canonical IDs
// ---------------------------------------------------------------------------

test('buildCanonicalId is series-independent and padded', () => {
  const a = makeRecord().identity;
  const b = { ...a, booklet_series: 'B' as const };
  assert.equal(buildCanonicalId(a), buildCanonicalId(b));
  assert.equal(buildCanonicalId(a), 'UPSC_CSE_Prelims_2019_GS-1_Q001_en');
});

// ---------------------------------------------------------------------------
// Question record validation
// ---------------------------------------------------------------------------

test('valid record validates cleanly', () => {
  const res = validateQuestionRecord(makeRecord());
  assert.ok(res.ok, JSON.stringify(res.errors));
});

test('placeholder option fails validation', () => {
  const rec = makeRecord();
  rec.text.options[0] = { key: 'a', text: 'Option A' };
  const res = validateQuestionRecord(rec);
  assert.ok(!res.ok);
  assert.ok(res.errors.some((e) => e.field.includes('options') && e.message === 'placeholder'));
});

test('empty option fails validation', () => {
  const rec = makeRecord();
  rec.text.options[2] = { key: 'c', text: '' };
  const res = validateQuestionRecord(rec);
  assert.ok(res.errors.some((e) => e.field.includes('text') && e.message === 'empty'));
});

test('duplicate option key fails validation', () => {
  const rec = makeRecord();
  rec.text.options[1] = { key: 'a', text: 'dup' };
  const res = validateQuestionRecord(rec);
  assert.ok(res.errors.some((e) => e.message === 'duplicate: a'));
});

test('official-final key requires a key letter', () => {
  const rec = makeRecord();
  rec.key = { authority: 'official-final', key: null };
  const res = validateQuestionRecord(rec);
  assert.ok(res.errors.some((e) => e.message === 'official-final requires a key'));
});

test('unavailable key must not carry a letter', () => {
  const rec = makeRecord();
  rec.key = { authority: 'unavailable', key: 'a' };
  const res = validateQuestionRecord(rec);
  assert.ok(res.errors.some((e) => e.message.includes('must not carry a key')));
});

test('no evidence means not authentic', () => {
  const rec = makeRecord();
  rec.evidence = [];
  const res = validateQuestionRecord(rec);
  assert.ok(res.errors.some((e) => e.field === 'evidence'));
});

test('malformed sha256 fails validation', () => {
  const rec = makeRecord();
  rec.evidence = [{ ...ev, sha256: 'not-a-sha' }];
  const res = validateQuestionRecord(rec);
  assert.ok(res.errors.some((e) => e.message === 'malformed'));
});

test('invalid year fails validation', () => {
  const rec = makeRecord();
  rec.identity = { ...rec.identity, year: 202 };
  const res = validateQuestionRecord(rec);
  assert.ok(res.errors.some((e) => e.field === 'identity.year'));
});

test('eligibility must match derived value', () => {
  const rec = makeRecord();
  rec.eligibility = { ...rec.eligibility, scored: true, reference_only: false };
  rec.evidence = []; // now derived != stored
  const res = validateQuestionRecord(rec);
  assert.ok(res.errors.some((e) => e.field === 'eligibility'));
});

// ---------------------------------------------------------------------------
// Eligibility derivation
// ---------------------------------------------------------------------------

test('clean official record is scored', () => {
  const rec = makeRecord();
  rec.discrepancies = [];
  const elig = deriveEligibility(rec);
  assert.equal(elig.authentic, true);
  assert.equal(elig.text_complete, true);
  assert.equal(elig.key_verified, true);
  assert.equal(elig.scored, true);
  assert.equal(elig.reference_only, false);
});

test('secondary-claimed key is not scored, is reference-only', () => {
  const rec = makeRecord();
  rec.key = { authority: 'secondary-claimed', key: 'b' };
  rec.discrepancies = collectDiscrepancies(rec);
  const elig = deriveEligibility(rec);
  assert.equal(elig.key_verified, false);
  assert.equal(elig.scored, false);
  assert.equal(elig.reference_only, true);
});

test('missing options blocks scoring', () => {
  const rec = makeRecord();
  rec.text.options = [];
  rec.discrepancies = collectDiscrepancies(rec);
  const elig = deriveEligibility(rec);
  assert.equal(elig.text_complete, false);
  assert.equal(elig.scored, false);
});

// ---------------------------------------------------------------------------
// Discrepancy collection
// ---------------------------------------------------------------------------

test('collectDiscrepancies reports placeholders, secondary key, unresolved series', () => {
  const rec = makeRecord();
  rec.text.options[3] = { key: 'd', text: 'Option D' };
  rec.key = { authority: 'secondary-claimed', key: 'c' };
  rec.identity = { ...rec.identity, booklet_series: undefined };
  const d = collectDiscrepancies(rec);
  const codes = d.map((x) => x.code);
  assert.ok(codes.includes('missing_option'), codes.join(','));
  assert.ok(codes.includes('key_unavailable'), codes.join(','));
  assert.ok(codes.includes('series_unresolved'), codes.join(','));
});

// ---------------------------------------------------------------------------
// Paper manifest validation
// ---------------------------------------------------------------------------

function makeManifest(overrides: Partial<PaperManifest> = {}): PaperManifest {
  return {
    exam: 'UPSC_CSE',
    stage: 'Prelims',
    year: 2019,
    paper: 'GS-1',
    booklet_series: 'A',
    language: 'en',
    source_documents: [{
      document_id: 'doc-1',
      url: 'https://example.in/paper.pdf',
      sha256: 'a'.repeat(64),
      bytes: 8035034,
      pages: 44,
      retrieved_at: '2026-09-24T00:00:00.000Z',
      source_status: 'secondary-hosted',
    }],
    key_documents: [],
    coverage: { expected: [1, 2, 3], accounted: [1, 2], unresolved: [3] },
    key_status: { official: 0, provisional: 0, secondary: 0, unavailable: 3, withdrawn: 0 },
    ...overrides,
  };
}

test('valid manifest validates cleanly', () => {
  assert.ok(validatePaperManifest(makeManifest()).ok);
});

test('accounted slot outside expected range fails', () => {
  const m = makeManifest();
  m.coverage.accounted = [1, 99];
  const res = validatePaperManifest(m);
  assert.ok(res.errors.some((e) => e.field === 'coverage.accounted'));
});

test('slot both accounted and unresolved fails', () => {
  const m = makeManifest();
  m.coverage.unresolved = [1, 3];
  const res = validatePaperManifest(m);
  assert.ok(res.errors.some((e) => e.field === 'coverage'));
});

test('empty source documents fails', () => {
  const m = makeManifest();
  m.source_documents = [];
  const res = validatePaperManifest(m);
  assert.ok(res.errors.some((e) => e.field === 'source_documents'));
});

// ---------------------------------------------------------------------------
// Mains & Essay Prompt Validation Tests
// ---------------------------------------------------------------------------

function makeMainsRecord(overrides: Partial<MainsQuestionRecord> = {}): MainsQuestionRecord {
  return {
    canonical_id: 'UPSC_CSE_Mains_2023_GS-M4_Q001a_en',
    identity: {
      exam: 'UPSC_CSE',
      stage: 'Mains',
      year: 2023,
      paper: 'GS-M4',
      language: 'en',
      question_number: 1,
      subpart: 'a',
    },
    text: {
      prompt: 'What do you understand by moral integrity? How does it differ from statutory compliance in public administration?',
      subpart: 'a',
      marks_allotted: 10,
      word_limit: 150,
      section: 'Section A',
    },
    rubric: {
      review_state: 'approved',
      dimensions: [
        { dimension: 'Conceptual Definition', guidelines: 'Distinguish between internal moral compass vs external legal mandate.' },
        { dimension: 'Administrative Realism', guidelines: 'Illustrate with a public service dilemma where legal compliance was insufficient.' },
      ],
      expected_keywords: ['probity', 'moral agency', 'discretionary power', 'Nolan Principles'],
    },
    classification: { review_state: 'unreviewed' },
    evidence: [ev],
    status: 'complete',
    discrepancies: [],
    eligibility: {
      authentic: true,
      text_complete: true,
      scored: false,
      reference_only: true,
      blocking: [],
    },
    version: 1,
    created_at: '2026-09-25T00:00:00.000Z',
    updated_at: '2026-09-25T00:00:00.000Z',
    ...overrides,
  };
}

test('valid mains record validates cleanly without options', () => {
  const r = makeMainsRecord();
  const res = validateMainsQuestionRecord(r);
  assert.equal(res.ok, true, `Validation failed: ${JSON.stringify(res.errors)}`);
});

test('mains record with empty prompt fails validation', () => {
  const r = makeMainsRecord({
    text: {
      prompt: '   ',
      marks_allotted: 10,
    },
  });
  const res = validateMainsQuestionRecord(r);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.field === 'text.prompt'));
});

test('mains record with scored: true fails validation', () => {
  const r = makeMainsRecord({
    eligibility: {
      authentic: true,
      text_complete: true,
      scored: true as any,
      reference_only: false,
      blocking: [],
    },
  });
  const res = validateMainsQuestionRecord(r);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.field === 'eligibility.scored'));
});


