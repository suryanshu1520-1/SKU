/**
 * Canonical question-bank evidence contract.
 *
 * Source-controlled, versioned schema for the question-bank restoration and
 * corroboration project. Implements the "pristine" definition in
 * docs/handoffs/qbank-quality-scope-2026-09-24.md §6 (identity, text fidelity,
 * key authority, explanation support, classification, usability) and the
 * discrepancy reason codes in §7.
 *
 * Design rules enforced here:
 *  - Unknown values stay unknown. A missing key is `key_unavailable`, never a
 *    default letter. A missing year is not 2020.
 *  - Canonical IDs are separate from source-occurrence IDs. Booklet series is a
 *    presentation variant captured on occurrences; the canonical identity is
 *    series-independent (the same question can appear across series with
 *    permuted option order).
 *  - Tark's randomized mock series must never be confused with an official
 *    booklet series.
 */

// ---------------------------------------------------------------------------
// Enumerations (value objects so callers can iterate them at runtime)
// ---------------------------------------------------------------------------

export const STAGES = ['Prelims', 'Mains'] as const;
export type Stage = (typeof STAGES)[number];

export const PAPER_KINDS = ['GS-1', 'GS-2', 'GS-M1', 'GS-M2', 'GS-M3', 'GS-M4', 'Essay'] as const;
export type PaperKind = (typeof PAPER_KINDS)[number];

/** Official UPSC booklet series. Distinct from Tark's randomized mock series. */
export const BOOKLET_SERIES = ['A', 'B', 'C', 'D'] as const;
export type BookletSeries = (typeof BOOKLET_SERIES)[number];

export const LANGUAGES = ['en', 'hi'] as const;
export type Language = (typeof LANGUAGES)[number];

export const OPTION_KEYS = ['a', 'b', 'c', 'd'] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];

/**
 * Authority of an answer key, most to least authoritative. `unavailable` (no
 * key found) and `not-applicable` (e.g. a Mains prompt) are distinct from
 * `withdrawn` (a question UPSC cancelled).
 */
export const KEY_AUTHORITIES = [
  'official-final',
  'official-provisional',
  'secondary-claimed',
  'disputed',
  'withdrawn',
  'unavailable',
  'not-applicable',
] as const;
export type KeyAuthority = (typeof KEY_AUTHORITIES)[number];

export const REVIEW_STATES = ['unreviewed', 'pending', 'approved', 'rejected', 'unresolved'] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

/** Discrepancy reason codes from the scope §7. */
export const REASON_CODES = [
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
  'taxonomy_unreviewed',
  'explanation_unsupported',
  'reuse_unresolved',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export const SOURCE_STATUSES = ['official', 'mirror', 'secondary-hosted', 'unknown'] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export const EXPLANATION_PROVENANCES = ['editorial', 'model-authored', 'none'] as const;
export type ExplanationProvenance = (typeof EXPLANATION_PROVENANCES)[number];

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

/**
 * A single assertion of provenance: which source document, which page/region,
 * and how the text was recovered. Every accepted assertion links to evidence.
 */
export interface EvidenceRef {
  source_document_id: string;
  /** Original/final URL of the source document. */
  source_url: string;
  /** Where the bytes were actually retrieved from, if different from original. */
  mirror_url?: string;
  sha256: string;
  retrieved_at: string; // ISO-8601
  /** 1-based page number within the document. */
  page: number;
  /** Free-form region within the page, e.g. "right-column", "lines 1-3". */
  region?: string;
  language: Language;
  /** e.g. "native-pdf-text", "vision-ocr-gemini-3.1-flash-lite", "manual". */
  extraction_method: string;
  extraction_version: string;
  /** Human adjudication record when a risky page was visually confirmed. */
  adjudication?: string;
}

// ---------------------------------------------------------------------------
// Identity and text fidelity
// ---------------------------------------------------------------------------

export interface QuestionIdentity {
  exam: 'UPSC_CSE';
  stage: Stage;
  year: number;
  /** Optional session disambiguator (e.g. a second sitting in a year). */
  session?: string;
  paper: PaperKind;
  /** Official booklet series when known. Absent = unresolved, not assumed. */
  booklet_series?: BookletSeries;
  language: Language;
  /** Question number exactly as printed (1-based for Prelims). */
  question_number: number;
  /** Subpart for Mains prompts, e.g. "1(b)". */
  subpart?: string;
}

export interface OptionText {
  key: OptionKey;
  text: string;
}

export interface QuestionText {
  stem: string;
  /** Numbered statements (e.g. "Consider the following statements:"). */
  statements?: string[] | null;
  /** Shared comprehension passage. Distinct from a per-question stem. */
  passage?: string | null;
  /** Options in the ORDER they were printed. Order is meaningful. */
  options: OptionText[];
  /** References to figures/tables/diagrams that carry meaning. */
  figures?: string[] | null;
  /** References to instructions (e.g. "select the correct answer using the code"). */
  instruction_refs?: string[] | null;
}

// ---------------------------------------------------------------------------
// Key, explanation, classification
// ---------------------------------------------------------------------------

export interface KeyAssertion {
  authority: KeyAuthority;
  /** Present only when authority admits a letter (official-final, etc.). */
  key?: OptionKey | null;
  /** The key document + page this was read from. */
  source_ref?: EvidenceRef;
  /** Note describing the validated paper/series join, when applicable. */
  paper_series_join?: string;
  /** Other letters/claims in conflict, when `disputed`. */
  disputed_with?: string[];
}

export interface ExplanationAssertion {
  text?: string | null;
  provenance: ExplanationProvenance;
  review_state: ReviewState;
  reviewed_at?: string;
  source_refs?: EvidenceRef[];
}

export interface ClassificationAssertion {
  topic?: string | null;
  concepts?: string[] | null;
  directive?: string | null;
  format?: string | null;
  difficulty?: string | null;
  annotation_method?: string;
  annotation_version?: string;
  review_state: ReviewState;
}

// ---------------------------------------------------------------------------
// Discrepancy and eligibility
// ---------------------------------------------------------------------------

export interface Discrepancy {
  code: ReasonCode;
  detail: string;
  question_number?: number;
  evidence?: EvidenceRef[];
  resolved?: boolean;
}

export interface Eligibility {
  /** Has at least one source occurrence proving the record is authentic. */
  authentic: boolean;
  /** Text is complete: no missing option/passage/figure/question. */
  text_complete: boolean;
  /** Key is official-final and joined to the paper. */
  key_verified: boolean;
  /** Eligible for scored practice. */
  scored: boolean;
  /** Authentic but not scored (e.g. key unavailable). */
  reference_only: boolean;
  /** Reason codes currently blocking `scored`. */
  blocking: ReasonCode[];
}

// ---------------------------------------------------------------------------
// Canonical record and occurrences
// ---------------------------------------------------------------------------

export interface QuestionRecord {
  canonical_id: string;
  identity: QuestionIdentity;
  text: QuestionText;
  key: KeyAssertion;
  explanation: ExplanationAssertion;
  classification: ClassificationAssertion;
  evidence: EvidenceRef[];
  status: 'complete' | 'incomplete';
  discrepancies: Discrepancy[];
  eligibility: Eligibility;
  version: number;
  created_at: string;
  updated_at: string;
}

/** A single appearance of a question in a concrete source. Retained, not collapsed. */
export interface SourceOccurrence {
  occurrence_id: string;
  /** Resolved canonical identity, when a merge has been accepted. */
  canonical_id?: string | null;
  identity: Partial<QuestionIdentity>;
  text: QuestionText;
  key_claim?: KeyAssertion;
  evidence: EvidenceRef;
}

// ---------------------------------------------------------------------------
// Paper manifest (drives acquisition; coverage has two denominators)
// ---------------------------------------------------------------------------

export interface SourceDocument {
  document_id: string;
  url: string;
  mirror_url?: string;
  sha256: string;
  bytes: number;
  pages: number;
  retrieved_at: string;
  source_status: SourceStatus;
  chain_of_origin?: string;
}

export interface SlotCoverage {
  /** Printed question numbers/slots expected from the actual booklet. */
  expected: number[];
  /** Slots accounted for by an accepted source-backed record. */
  accounted: number[];
  /** Slots not yet accounted for. */
  unresolved: number[];
}

export interface PaperManifest {
  exam: 'UPSC_CSE';
  stage: Stage;
  year: number;
  paper: PaperKind;
  booklet_series?: BookletSeries;
  language: Language;
  source_documents: SourceDocument[];
  key_documents: SourceDocument[];
  coverage: SlotCoverage;
  /** Key coverage has its own denominator; see §9. */
  key_status: {
    official: number;
    provisional: number;
    secondary: number;
    unavailable: number;
    withdrawn: number;
  };
}

// ---------------------------------------------------------------------------
// Mains & Essay Non-MCQ Types
// ---------------------------------------------------------------------------

export interface MainsQuestionText {
  /** The core analytical prompt or essay topic */
  prompt: string;
  /** Sub-part identifier if composite, e.g. "1(a)", "1(b)" */
  subpart?: string | null;
  /** Case study narrative (primarily for GS-M4 / Ethics Section B) */
  case_study?: string | null;
  /** Word limit explicitly specified on the paper, e.g. 150, 250, 1000-1200 */
  word_limit?: number | null;
  /** Marks allocated to this prompt or subpart (e.g. 10, 12.5, 15, 20, 25, 125, 250) */
  marks_allotted: number;
  /** Section on the paper, e.g. "Section A", "Section B" */
  section?: string | null;
  /** Authentic instructions printed alongside the prompt */
  instructions?: string | null;
}

export interface MainsRubricDimension {
  dimension: string; // e.g. "Constitutional Framework", "Empirical Arguments", "Way Forward"
  weight_pct?: number;
  guidelines: string;
}

export interface MainsRubricAssertion {
  dimensions?: MainsRubricDimension[];
  expected_keywords?: string[];
  reference_outline?: string | null;
  review_state: ReviewState;
}

export interface MainsQuestionRecord {
  canonical_id: string;
  identity: QuestionIdentity;
  text: MainsQuestionText;
  rubric: MainsRubricAssertion;
  classification: ClassificationAssertion;
  evidence: EvidenceRef[];
  status: 'complete' | 'incomplete';
  discrepancies: Discrepancy[];
  eligibility: {
    authentic: boolean;
    text_complete: boolean;
    scored: false; // Mains prompts are evaluation-rubric scored, not auto-MCQ scored
    reference_only: boolean;
    blocking: ReasonCode[];
  };
  version: number;
  created_at: string;
  updated_at: string;
}
