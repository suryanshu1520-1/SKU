/**
 * Pure validation, normalization and eligibility derivation for the canonical
 * question-bank contract. No filesystem or network access; deterministic.
 */
import {
  BOOKLET_SERIES,
  KEY_AUTHORITIES,
  LANGUAGES,
  OPTION_KEYS,
  PAPER_KINDS,
  REASON_CODES,
  REVIEW_STATES,
  SOURCE_STATUSES,
  STAGES,
} from './types.js';
import type {
  Discrepancy,
  Eligibility,
  KeyAuthority,
  OptionKey,
  PaperManifest,
  QuestionIdentity,
  QuestionRecord,
  ReasonCode,
} from './types.js';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

const SHA256_RE = /^[0-9a-f]{64}$/;

// Reason codes that block the `scored` eligibility tier. Explanation and
// taxonomy review are separate metrics (see scope §9), not scoring blockers.
const SCORED_BLOCKERS: ReadonlySet<ReasonCode> = new Set<ReasonCode>([
  'missing_source',
  'missing_page',
  'missing_question',
  'missing_option',
  'missing_passage',
  'figure_unreadable',
  'series_unresolved',
  'key_unavailable',
  'key_conflict',
  'source_identity_conflict',
]);

// ---------------------------------------------------------------------------
// Normalization (duplicate candidates only — never an approved merge)
// ---------------------------------------------------------------------------

/** Lowercase + whitespace collapse. A duplicate candidate, not an identity. */
export function normalizedStem(stem: string | null | undefined): string {
  return (stem ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Placeholder detection per baseline: "Any option equals Option A/B/C/D,
 * optionally preceded by its parenthesized letter". Not a completeness test.
 */
export function isPlaceholderOption(text: string | null | undefined): boolean {
  if (text == null) return false;
  const t = text.trim();
  if (!t) return false;
  return /^(?:\(?\s*[a-dA-D]\s*\)?[.:\-]?\s*)?Option\s*[A-Da-d]\s*$/i.test(t);
}

export function isEmptyOption(text: string | null | undefined): boolean {
  return text == null || text.trim().length === 0;
}

/** First N normalized characters, used only to *propose* near-duplicates. */
export function stemPrefix(stem: string | null | undefined, n = 80): string {
  return normalizedStem(stem).slice(0, n);
}

/** Identity tuple for collision *candidates*; booklet/language are excluded on purpose. */
export function identityTuple(i: Partial<QuestionIdentity>): string {
  return [i.exam, i.stage, i.year, i.paper, i.question_number]
    .map((v) => (v == null ? '' : String(v)))
    .join('|');
}

// ---------------------------------------------------------------------------
// Canonical / occurrence IDs
// ---------------------------------------------------------------------------

/**
 * Series-independent canonical identity. The same question across booklet
 * series A/B/C/D resolves to one canonical id; the series-level option order is
 * retained on the SourceOccurrence.
 */
export function buildCanonicalId(i: QuestionIdentity): string {
  const q = String(i.question_number).padStart(3, '0');
  const sub = i.subpart ? `_${i.subpart.replace(/[^a-z0-9]/gi, '')}` : '';
  return `${i.exam}_${i.stage}_${i.year}_${i.paper}_Q${q}${sub}_${i.language}`;
}

export function buildOccurrenceId(sourceDocId: string, page: number, qn: number | string): string {
  return `${sourceDocId}_p${page}_q${qn}`;
}

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

const EMPTY_ELIGIBILITY: Eligibility = {
  authentic: false,
  text_complete: false,
  key_verified: false,
  scored: false,
  reference_only: false,
  blocking: [],
};

export function deriveEligibility(record: QuestionRecord): Eligibility {
  const open = record.discrepancies.filter((d) => !d.resolved);
  const blocking = open.map((d) => d.code).filter((c) => SCORED_BLOCKERS.has(c));

  const authentic = record.evidence.length > 0;
  const text_complete =
    authentic &&
    !blocking.some((c) =>
      ['missing_source', 'missing_page', 'missing_question', 'missing_option', 'missing_passage', 'figure_unreadable'].includes(c)
    );
  const key_verified =
    record.key.authority === 'official-final' &&
    record.key.key != null &&
    (OPTION_KEYS as readonly string[]).includes(record.key.key);
  const scored = authentic && text_complete && key_verified && blocking.length === 0;

  return {
    authentic,
    text_complete,
    key_verified,
    scored,
    reference_only: authentic && !scored,
    blocking: [...new Set(blocking)],
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function err(field: string, message: string): ValidationError {
  return { field, message };
}

function isKey(a: unknown): a is KeyAuthority {
  return typeof a === 'string' && (KEY_AUTHORITIES as readonly string[]).includes(a);
}

function isOptionKey(k: unknown): k is OptionKey {
  return typeof k === 'string' && (OPTION_KEYS as readonly string[]).includes(k);
}

// ---------------------------------------------------------------------------
// Question record validation
// ---------------------------------------------------------------------------

export function validateQuestionRecord(record: QuestionRecord): ValidationResult {
  const errors: ValidationError[] = [];
  const id = record.identity;

  if (!record.canonical_id) errors.push(err('canonical_id', 'missing'));
  if (id.exam !== 'UPSC_CSE') errors.push(err('identity.exam', `invalid: ${id.exam}`));
  if (!(STAGES as readonly string[]).includes(id.stage)) errors.push(err('identity.stage', `invalid: ${id.stage}`));
  if (!Number.isInteger(id.year) || id.year < 1900 || id.year > 2100)
    errors.push(err('identity.year', `invalid: ${id.year}`));
  if (!(PAPER_KINDS as readonly string[]).includes(id.paper)) errors.push(err('identity.paper', `invalid: ${id.paper}`));
  if (!(LANGUAGES as readonly string[]).includes(id.language)) errors.push(err('identity.language', `invalid: ${id.language}`));
  if (!Number.isInteger(id.question_number) || id.question_number < 1)
    errors.push(err('identity.question_number', `invalid: ${id.question_number}`));
  if (id.booklet_series != null && !(BOOKLET_SERIES as readonly string[]).includes(id.booklet_series))
    errors.push(err('identity.booklet_series', `invalid: ${id.booklet_series}`));

  if (typeof record.text.stem !== 'string' || record.text.stem.trim().length === 0)
    errors.push(err('text.stem', 'empty'));
  if (!Array.isArray(record.text.options)) errors.push(err('text.options', 'missing'));
  else {
    const seen = new Set<string>();
    for (const [idx, o] of record.text.options.entries()) {
      if (!isOptionKey(o.key)) errors.push(err(`text.options[${idx}].key`, `invalid: ${o.key}`));
      if (seen.has(o.key)) errors.push(err(`text.options[${idx}].key`, `duplicate: ${o.key}`));
      seen.add(o.key);
      if (isEmptyOption(o.text)) errors.push(err(`text.options[${idx}].text`, 'empty'));
      if (isPlaceholderOption(o.text)) errors.push(err(`text.options[${idx}].text`, 'placeholder'));
    }
  }

  if (!isKey(record.key.authority)) errors.push(err('key.authority', `invalid: ${record.key.authority}`));
  if (record.key.key != null && !isOptionKey(record.key.key)) errors.push(err('key.key', `invalid: ${record.key.key}`));
  if (record.key.authority === 'official-final' && record.key.key == null)
    errors.push(err('key.key', 'official-final requires a key'));
  if ((record.key.authority === 'unavailable' || record.key.authority === 'not-applicable') && record.key.key != null)
    errors.push(err('key.key', `${record.key.authority} must not carry a key`));

  if (record.evidence.length === 0) errors.push(err('evidence', 'empty (not authentic)'));
  for (const [i, e] of record.evidence.entries()) {
    if (!SHA256_RE.test(e.sha256)) errors.push(err(`evidence[${i}].sha256`, 'malformed'));
    if (!(LANGUAGES as readonly string[]).includes(e.language)) errors.push(err(`evidence[${i}].language`, `invalid: ${e.language}`));
    if (!Number.isInteger(e.page) || e.page < 1) errors.push(err(`evidence[${i}].page`, `invalid: ${e.page}`));
  }

  if (!(REVIEW_STATES as readonly string[]).includes(record.classification.review_state))
    errors.push(err('classification.review_state', `invalid: ${record.classification.review_state}`));
  if (!(REVIEW_STATES as readonly string[]).includes(record.explanation.review_state))
    errors.push(err('explanation.review_state', `invalid: ${record.explanation.review_state}`));

  if (!Number.isInteger(record.version) || record.version < 1) errors.push(err('version', `invalid: ${record.version}`));

  const derived = deriveEligibility(record);
  if (JSON.stringify(derived) !== JSON.stringify(record.eligibility))
    errors.push(err('eligibility', 'does not match derived value'));

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Paper manifest validation
// ---------------------------------------------------------------------------

export function validatePaperManifest(m: PaperManifest): ValidationResult {
  const errors: ValidationError[] = [];

  if (m.exam !== 'UPSC_CSE') errors.push(err('exam', `invalid: ${m.exam}`));
  if (!(STAGES as readonly string[]).includes(m.stage)) errors.push(err('stage', `invalid: ${m.stage}`));
  if (!Number.isInteger(m.year) || m.year < 1900 || m.year > 2100) errors.push(err('year', `invalid: ${m.year}`));
  if (!(PAPER_KINDS as readonly string[]).includes(m.paper)) errors.push(err('paper', `invalid: ${m.paper}`));
  if (!(LANGUAGES as readonly string[]).includes(m.language)) errors.push(err('language', `invalid: ${m.language}`));
  if (m.booklet_series != null && !(BOOKLET_SERIES as readonly string[]).includes(m.booklet_series))
    errors.push(err('booklet_series', `invalid: ${m.booklet_series}`));

  if (m.source_documents.length === 0) errors.push(err('source_documents', 'empty'));
  for (const [i, d] of m.source_documents.entries()) {
    if (!SHA256_RE.test(d.sha256)) errors.push(err(`source_documents[${i}].sha256`, 'malformed'));
    if (!(SOURCE_STATUSES as readonly string[]).includes(d.source_status))
      errors.push(err(`source_documents[${i}].source_status`, `invalid: ${d.source_status}`));
  }

  const expected = new Set(m.coverage.expected);
  const accounted = new Set(m.coverage.accounted);
  const unresolved = new Set(m.coverage.unresolved);
  for (const n of m.coverage.accounted) if (!expected.has(n)) errors.push(err('coverage.accounted', `not expected: ${n}`));
  for (const n of m.coverage.unresolved) if (!expected.has(n)) errors.push(err('coverage.unresolved', `not expected: ${n}`));
  for (const n of m.coverage.accounted) if (unresolved.has(n)) errors.push(err('coverage', `slot ${n} both accounted and unresolved`));

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Discrepancy collection (drives the exception queue)
// ---------------------------------------------------------------------------

/** Derive the discrepancy queue for a record from its text/key/evidence gaps. */
export function collectDiscrepancies(record: QuestionRecord): Discrepancy[] {
  const d: Discrepancy[] = [];
  const qn = record.identity.question_number;

  if (record.evidence.length === 0) d.push({ code: 'missing_source', detail: 'no source occurrence', question_number: qn });
  if (record.text.options.length === 0) d.push({ code: 'missing_option', detail: 'no options', question_number: qn });
  else {
    const placeholders = record.text.options.filter((o) => isPlaceholderOption(o.text));
    if (placeholders.length > 0)
      d.push({ code: 'missing_option', detail: `${placeholders.length} placeholder option(s)`, question_number: qn });
    const empties = record.text.options.filter((o) => isEmptyOption(o.text));
    if (empties.length > 0)
      d.push({ code: 'missing_option', detail: `${empties.length} empty option(s)`, question_number: qn });
    if (record.text.options.length < 4 && record.identity.stage === 'Prelims')
      d.push({ code: 'missing_option', detail: `only ${record.text.options.length} options`, question_number: qn });
  }

  if (record.key.authority === 'unavailable') d.push({ code: 'key_unavailable', detail: 'key not found', question_number: qn });
  if (record.key.authority === 'disputed') d.push({ code: 'key_conflict', detail: 'key disputed', question_number: qn });
  if (record.key.authority === 'secondary-claimed') d.push({ code: 'key_unavailable', detail: 'only secondary key claim', question_number: qn });
  if (record.key.authority === 'withdrawn') d.push({ code: 'key_unavailable', detail: 'question withdrawn', question_number: qn });
  if (record.identity.booklet_series == null && record.identity.stage === 'Prelims')
    d.push({ code: 'series_unresolved', detail: 'booklet series unresolved', question_number: qn });

  return d;
}

export { EMPTY_ELIGIBILITY };
export type { ReasonCode };


