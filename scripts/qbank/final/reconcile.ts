import fs from 'node:fs';
import path from 'node:path';
import {
  assertRunDirSafe,
  ensureLayout,
  getRunDir,
  stableStringify,
  writeJsonAtomic,
} from './run-dir.js';
import {
  buildCanonicalId,
  deriveEligibility,
  validateMainsQuestionRecord,
  validatePaperManifest,
  validateQuestionRecord,
} from '../../../server-lib/qbank/validators.js';
import type {
  ClassificationAssertion,
  Discrepancy,
  EvidenceRef,
  ExplanationAssertion,
  KeyAssertion,
  MainsQuestionRecord,
  MainsQuestionText,
  OptionKey,
  PaperKind,
  PaperManifest,
  QuestionRecord,
  QuestionText,
  ReasonCode,
  SourceDocument,
  SourceOccurrence,
  Stage,
} from '../../../server-lib/qbank/types.js';

export interface EnvelopeOccurrence {
  annotations?: {
    level?: { canonical: string; raw: string } | null;
    section?: string | null;
    topic?: string | null;
    nature?: { canonical: string; raw: string } | null;
    source_type?: { canonical: string; raw: string } | null;
    source_urls?: string[];
    motivation?: string | null;
  };
  bboxes?: Record<string, unknown>;
  explanation_claim?: {
    provenance: 'editorial' | 'model-authored' | 'none';
    review_state: 'unreviewed' | 'pending' | 'approved' | 'rejected' | 'unresolved';
    source_refs?: EvidenceRef[];
    text?: string | null;
  };
  figure_regions?: unknown[];
  occurrence: {
    canonical_id?: string | null;
    evidence: EvidenceRef;
    identity: {
      exam: 'UPSC_CSE';
      stage: Stage;
      year: number;
      paper: PaperKind;
      language: 'en' | 'hi';
      question_number: number;
    };
    key_claim?: KeyAssertion;
    occurrence_id: string;
    text: QuestionText;
  };
  parse: {
    has_roman_and_arabic_labels?: boolean;
    question_type?: string;
    repairs?: Record<string, number>;
    warnings?: string[];
  };
}

export interface OfficialKeyFile {
  documents?: Array<{
    source_document_id: string;
    source_url: string;
    sha256: string;
    retrieved_at: string;
    language?: 'en' | 'hi';
    extraction_method?: string;
    extraction_version?: string;
    adjudication?: string;
  }>;
  method?: string;
  paper_slug?: string;
  series: {
    A?: Record<string, KeyAssertion>;
    [series: string]: Record<string, KeyAssertion> | undefined;
  };
}

export interface QueueItem {
  item_id: string;
  canonical_id: string | null;
  occurrence_id: string | null;
  gate: string;
  reason_code: ReasonCode | null;
  detail: string;
  candidates: unknown;
  evidence: EvidenceRef[] | null;
  crop: null;
}

export interface MainsExtractedItem {
  document_id: string;
  page: number;
  bbox?: number[];
  prompt: string;
  question_number: number;
  subpart: string | null;
  case_study: string | null;
  word_limit: number | null;
  marks_allotted: number | null;
  section: string | null;
  paper_slug: string;
  warnings: string[];
}

export interface MainsPairsFile {
  paper_slug: string;
  publishers: string[];
  pairs: Array<{
    question_number: number;
    subpart: string | null;
    prompts: Record<string, string>;
    similarity: number;
  }>;
  discrepant_count: number;
  discrepant_pairs?: unknown[];
}

export interface CensusRow {
  document_id: string;
  stage: Stage;
  year: number;
  paper: PaperKind;
  language: 'en' | 'hi';
  publisher: string;
  role: string;
  title?: string;
  pdf_url?: string;
  pages?: number;
}

export interface AcqRow {
  document_id: string;
  url?: string;
  final_url?: string;
  sha256: string;
  bytes: number;
  retrieved_at: string;
  path?: string;
}

// ---------------------------------------------------------------------------
// Series Alignment
// ---------------------------------------------------------------------------

export function computeSeriesAlignment(
  envelopes: EnvelopeOccurrence[],
  officialKeysSeriesA: Record<string, KeyAssertion> | undefined
): { n: number; agree: number; rate: number; aligned: boolean } {
  if (!officialKeysSeriesA) {
    return { n: 0, agree: 0, rate: 0, aligned: false };
  }

  let n = 0;
  let agree = 0;

  for (const env of envelopes) {
    const qn = String(env.occurrence.identity.question_number);
    const claimKey = env.occurrence.key_claim?.key;
    const off = officialKeysSeriesA[qn];
    if (!off) continue;

    if (
      off.authority === 'official-final' &&
      claimKey &&
      claimKey.length === 1 &&
      /^[a-z]$/i.test(claimKey)
    ) {
      n++;
      const normClaim = claimKey.toLowerCase();
      const normOff = off.key?.toLowerCase();
      const accepted = (off.accepted_keys || []).map((k) => k.toLowerCase());
      if (normClaim === normOff || accepted.includes(normClaim)) {
        agree++;
      }
    }
  }

  const rate = n > 0 ? agree / n : 0;
  return { n, agree, rate, aligned: rate >= 0.8 };
}

// ---------------------------------------------------------------------------
// Text Tokenization and Corroboration
// ---------------------------------------------------------------------------

export function extractTokens(textObj: QuestionText): Set<string> {
  const parts: string[] = [];
  if (textObj.stem) parts.push(textObj.stem);
  for (const s of textObj.statements || []) parts.push(s);
  for (const ir of textObj.instruction_refs || []) parts.push(ir);
  for (const opt of textObj.options || []) {
    if (opt.text) parts.push(opt.text);
  }
  const full = parts.join(' ').toLowerCase();
  const tokens = full.match(/[a-z0-9]+/g) || [];
  return new Set(tokens);
}

export function tokenSetJaccard(s1: Set<string>, s2: Set<string>): number {
  if (s1.size === 0 && s2.size === 0) return 1.0;
  let intersection = 0;
  for (const t of s1) {
    if (s2.has(t)) intersection++;
  }
  const union = s1.size + s2.size - intersection;
  return union > 0 ? intersection / union : 1.0;
}

const SENSITIVE_WORDS = new Set([
  'not',
  'never',
  'no',
  'none',
  'nor',
  'only',
  'all',
  'both',
  'neither',
  'except',
  'incorrect',
  'correct',
  'cannot',
  'always',
  'any',
]);

export function extractNumbers(textObj: QuestionText): Record<string, number> {
  const parts: string[] = [];
  if (textObj.stem) parts.push(textObj.stem);
  for (const s of textObj.statements || []) parts.push(s);
  for (const ir of textObj.instruction_refs || []) parts.push(ir);
  for (const opt of textObj.options || []) {
    if (opt.text) parts.push(opt.text);
  }
  const full = parts.join(' ');
  const nums = full.match(/\d+(?:\.\d+)?/g) || [];
  const counts: Record<string, number> = {};
  for (const n of nums) {
    counts[n] = (counts[n] || 0) + 1;
  }
  return counts;
}

export function extractSensitiveWordCounts(textObj: QuestionText): Record<string, number> {
  const parts: string[] = [];
  if (textObj.stem) parts.push(textObj.stem);
  for (const s of textObj.statements || []) parts.push(s);
  for (const ir of textObj.instruction_refs || []) parts.push(ir);
  for (const opt of textObj.options || []) {
    if (opt.text) parts.push(opt.text);
  }
  const words = (parts.join(' ').toLowerCase().match(/[a-z0-9]+/g) || []);
  const counts: Record<string, number> = {};
  for (const w of words) {
    if (SENSITIVE_WORDS.has(w)) {
      counts[w] = (counts[w] || 0) + 1;
    }
  }
  return counts;
}

export function checkCriticalDiff(
  t1: QuestionText,
  t2: QuestionText
): { isDiff: boolean; detail: string | null } {
  // (a) Multiset of numbers differs
  const nums1 = extractNumbers(t1);
  const nums2 = extractNumbers(t2);
  const allNumKeys = Array.from(new Set([...Object.keys(nums1), ...Object.keys(nums2)])).sort();
  for (const k of allNumKeys) {
    if ((nums1[k] || 0) !== (nums2[k] || 0)) {
      return { isDiff: true, detail: `number count mismatch for '${k}': ${nums1[k] || 0} vs ${nums2[k] || 0}` };
    }
  }

  // (b) Sensitive word count differs
  const sw1 = extractSensitiveWordCounts(t1);
  const sw2 = extractSensitiveWordCounts(t2);
  for (const w of SENSITIVE_WORDS) {
    if ((sw1[w] || 0) !== (sw2[w] || 0)) {
      return { isDiff: true, detail: `sensitive word '${w}' count mismatch: ${sw1[w] || 0} vs ${sw2[w] || 0}` };
    }
  }

  // (c) For some key a-d, option texts differ after lowercasing and removing non-alphanumerics
  const normOpt = (txt?: string | null) => (txt || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const opts1: Record<string, string> = {};
  for (const opt of t1.options || []) {
    opts1[opt.key.toLowerCase()] = normOpt(opt.text);
  }
  const opts2: Record<string, string> = {};
  for (const opt of t2.options || []) {
    opts2[opt.key.toLowerCase()] = normOpt(opt.text);
  }

  for (const k of ['a', 'b', 'c', 'd']) {
    if ((opts1[k] || '') !== (opts2[k] || '')) {
      return { isDiff: true, detail: `option ${k} text differs` };
    }
  }

  return { isDiff: false, detail: null };
}

// ---------------------------------------------------------------------------
// Format & Classification derivation
// ---------------------------------------------------------------------------

const HOW_MANY_OPTION_RE =
  /^\s*(only one|only two|only three|only four|all (two|three|four|five)|none|all of them|none of them|none of the above)\b/i;

export function deriveFormatAndAnnotationMethod(
  options: Array<{ key: OptionKey; text: string }>,
  rawQuestionType?: string
): { format: string; annotation_method: string } {
  let howManyCount = 0;
  for (const opt of options) {
    if (opt.text && HOW_MANY_OPTION_RE.test(opt.text)) {
      howManyCount++;
    }
  }

  if (howManyCount >= 3) {
    return {
      format: 'how_many',
      annotation_method: 'visionias-legend+tark-format-regex+option-pattern',
    };
  }

  return {
    format: rawQuestionType || 'standard',
    annotation_method: 'visionias-legend+tark-format-regex',
  };
}

export function buildTopicString(section?: string | null, topic?: string | null): string | null {
  const s = section?.trim();
  const t = topic?.trim();
  if (s && t) return `${s} › ${t}`;
  if (s) return s;
  if (t) return t;
  return null;
}

// ---------------------------------------------------------------------------
// Reconcile Prelims Slot
// ---------------------------------------------------------------------------

export function reconcilePrelimsSlot(
  env: EnvelopeOccurrence,
  aligned: boolean,
  agree: number,
  n: number,
  officialKeyAssertion: KeyAssertion | undefined,
  corroboration: {
    matchedHandoff?: EnvelopeOccurrence;
    isDiff?: boolean;
    diffDetail?: string | null;
  } | undefined,
  clockTime: string
): { record: QuestionRecord; queueItems: QueueItem[] } {
  const qno = env.occurrence.identity.question_number;
  const year = env.occurrence.identity.year;
  const paper = env.occurrence.identity.paper;

  const identity = {
    exam: 'UPSC_CSE' as const,
    stage: 'Prelims' as const,
    year,
    paper,
    language: 'en' as const,
    question_number: qno,
    ...(aligned ? { booklet_series: 'A' as const } : {}),
  };

  const canonical_id = buildCanonicalId(identity);
  const text: QuestionText = JSON.parse(JSON.stringify(env.occurrence.text));

  const discrepancies: Discrepancy[] = [];
  const queueItems: QueueItem[] = [];

  // Key Resolution
  let key: KeyAssertion;
  if (aligned && officialKeyAssertion) {
    key = {
      ...officialKeyAssertion,
      paper_series_join: `VisionIAS numbering joined to Series A: agreement ${agree}/${n}`,
    };
  } else {
    key = env.occurrence.key_claim || { authority: 'secondary-claimed', key: null };
    if (key.authority === 'secondary-claimed' && !key.key) {
      discrepancies.push({
        code: 'key_unavailable',
        detail: 'key unavailable',
        question_number: qno,
      });
    }
  }

  // Explanation Resolution
  let explanation: ExplanationAssertion;
  if (env.explanation_claim) {
    explanation = JSON.parse(JSON.stringify(env.explanation_claim));
  } else {
    explanation = { text: null, provenance: 'none', review_state: 'unreviewed' };
  }

  if (key.authority === 'official-final') {
    const claimKey = env.occurrence.key_claim?.key;
    const offKey = key.key;
    const accepted = (key.accepted_keys || []).map((k) => k.toLowerCase());
    if (
      claimKey &&
      offKey &&
      claimKey.toLowerCase() !== offKey.toLowerCase() &&
      !accepted.includes(claimKey.toLowerCase())
    ) {
      explanation.review_state = 'rejected';
      discrepancies.push({
        code: 'explanation_unsupported',
        detail: `VisionIAS answer ${claimKey} contradicts official ${offKey}`,
        question_number: qno,
      });
    }
  }

  // Classification
  const { format, annotation_method } = deriveFormatAndAnnotationMethod(
    text.options || [],
    env.parse.question_type
  );
  const topic = buildTopicString(env.annotations?.section, env.annotations?.topic);
  const classification: ClassificationAssertion = {
    topic,
    difficulty: env.annotations?.level?.canonical || null,
    format,
    annotation_method,
    annotation_version: '086F-1',
    review_state: 'unreviewed',
  };

  // Evidence
  const evidence: EvidenceRef[] = [JSON.parse(JSON.stringify(env.occurrence.evidence))];
  if (aligned && key.source_ref) {
    evidence.push(JSON.parse(JSON.stringify(key.source_ref)));
  }

  // Discrepancies & Queue Items from Envelope Warnings
  const warnings = env.parse.warnings || [];
  for (const w of warnings) {
    if (w === 'G_OPTIONS') {
      discrepancies.push({
        code: 'missing_option',
        detail: 'options missing or incomplete',
        question_number: qno,
      });
      queueItems.push({
        item_id: `${canonical_id}:G_OPTIONS`,
        canonical_id,
        occurrence_id: env.occurrence.occurrence_id,
        gate: 'G_OPTIONS',
        reason_code: 'missing_option',
        detail: 'options missing or incomplete',
        candidates: text,
        evidence: [evidence[0]],
        crop: null,
      });
    } else if (w === 'G_PASSAGE_MISSING') {
      discrepancies.push({
        code: 'missing_passage',
        detail: 'referenced passage is missing',
        question_number: qno,
      });
      queueItems.push({
        item_id: `${canonical_id}:G_PASSAGE_MISSING`,
        canonical_id,
        occurrence_id: env.occurrence.occurrence_id,
        gate: 'G_PASSAGE_MISSING',
        reason_code: 'missing_passage',
        detail: 'referenced passage is missing',
        candidates: text,
        evidence: [evidence[0]],
        crop: null,
      });
    } else if (w === 'G_FIGURE') {
      discrepancies.push({
        code: 'figure_unreadable',
        detail: 'figure missing or unreadable',
        question_number: qno,
      });
      queueItems.push({
        item_id: `${canonical_id}:G_FIGURE`,
        canonical_id,
        occurrence_id: env.occurrence.occurrence_id,
        gate: 'G_FIGURE',
        reason_code: 'figure_unreadable',
        detail: 'figure missing or unreadable',
        candidates: text,
        evidence: [evidence[0]],
        crop: null,
      });
    } else if (w === 'G_ANSWER_CELL') {
      if (key.authority !== 'official-final') {
        discrepancies.push({
          code: 'key_unavailable',
          detail: 'answer cell could not be extracted and no official key',
          question_number: qno,
        });
      }
      queueItems.push({
        item_id: `${canonical_id}:G_ANSWER_CELL`,
        canonical_id,
        occurrence_id: env.occurrence.occurrence_id,
        gate: 'G_ANSWER_CELL',
        reason_code: 'key_unavailable',
        detail: 'answer cell unresolved',
        candidates: { key: null, disputed_with: key.disputed_with || [] },
        evidence: [evidence[0]],
        crop: null,
      });
    } else if (['G_GLYPH', 'G_CONTAMINATION', 'G_FIDELITY'].includes(w)) {
      queueItems.push({
        item_id: `${canonical_id}:${w}`,
        canonical_id,
        occurrence_id: env.occurrence.occurrence_id,
        gate: w,
        reason_code: null,
        detail: `gate ${w} flagged by parser`,
        candidates: text,
        evidence: [evidence[0]],
        crop: null,
      });
    }
  }

  // Series Unresolved
  if (!aligned) {
    discrepancies.push({
      code: 'series_unresolved',
      detail: 'booklet series unresolved',
      question_number: qno,
    });
  }

  // Corroboration with handoff
  if (corroboration && corroboration.matchedHandoff) {
    const handoffEv = corroboration.matchedHandoff.occurrence.evidence;
    if (corroboration.isDiff) {
      discrepancies.push({
        code: 'source_identity_conflict',
        detail: `Text corroboration conflict with handoff: ${corroboration.diffDetail || 'diff detected'}`,
        question_number: qno,
      });
      queueItems.push({
        item_id: `${canonical_id}:G_XSRC`,
        canonical_id,
        occurrence_id: env.occurrence.occurrence_id,
        gate: 'G_XSRC',
        reason_code: 'source_identity_conflict',
        detail: corroboration.diffDetail || 'critical diff with handoff',
        candidates: [
          { source: 'handoff', value: corroboration.matchedHandoff.occurrence.text },
          { source: 'visionias', value: text },
        ],
        evidence: [evidence[0], handoffEv],
        crop: null,
      });
    } else {
      evidence.push(JSON.parse(JSON.stringify(handoffEv)));
    }
  }

  // Status
  const missingBlockers = [
    'missing_source',
    'missing_page',
    'missing_question',
    'missing_option',
    'missing_passage',
  ];
  const isMissing = discrepancies.some((d) => missingBlockers.includes(d.code));
  const status: 'complete' | 'incomplete' = isMissing ? 'incomplete' : 'complete';

  const record: QuestionRecord = {
    canonical_id,
    identity,
    text,
    key,
    explanation,
    classification,
    evidence,
    status,
    discrepancies,
    eligibility: {
      authentic: false,
      text_complete: false,
      key_verified: false,
      scored: false,
      reference_only: false,
      blocking: [],
    },
    version: 1,
    created_at: clockTime,
    updated_at: clockTime,
  };

  record.eligibility = deriveEligibility(record);

  return { record, queueItems };
}

// ---------------------------------------------------------------------------
// Mains Reconcile
// ---------------------------------------------------------------------------

export function reconcileMainsPrompt(
  item: MainsExtractedItem,
  acqRow: AcqRow | undefined,
  pairInfo: {
    pairedWith?: MainsExtractedItem;
    similarity?: number;
    otherPublisher?: string;
  } | undefined,
  clockTime: string
): { record: MainsQuestionRecord | null; queueItem: QueueItem | null } {
  const parts = item.paper_slug.split('-');
  const year = parseInt(parts[0], 10);
  const paper = parts.slice(1).join('-') as PaperKind;
  const qno = item.question_number;

  const subpartIdentity = item.subpart ? `${qno}${item.subpart}` : null;
  const identity = {
    exam: 'UPSC_CSE' as const,
    stage: 'Mains' as const,
    year,
    paper,
    language: 'en' as const,
    question_number: qno,
    subpart: subpartIdentity,
  };

  const canonical_id = buildCanonicalId(identity);

  const mainsText: MainsQuestionText = {
    prompt: item.prompt,
    subpart: item.subpart,
    case_study: item.case_study,
    word_limit: item.word_limit,
    marks_allotted: item.marks_allotted ?? 0,
    section: item.section,
    instructions: null,
  };

  const evidence: EvidenceRef[] = [
    {
      source_document_id: item.document_id,
      source_url: acqRow?.final_url || acqRow?.url || 'https://compass.rauias.com/',
      sha256: acqRow?.sha256 || '0'.repeat(64),
      retrieved_at: acqRow?.retrieved_at || clockTime,
      page: item.page,
      language: 'en',
      extraction_method: 'native-pdf-text:pymupdf',
      extraction_version: '086G-1',
      region: item.bbox ? `bbox: [${item.bbox.join(', ')}]` : undefined,
    },
  ];

  // If marks_allotted is null (confirmed source defect)
  if (item.marks_allotted === null) {
    const queueItem: QueueItem = {
      item_id: `${item.paper_slug}_Q${qno}${item.subpart || ''}:G_MARKS`,
      canonical_id: null,
      occurrence_id: null,
      gate: 'G_MARKS',
      reason_code: null,
      detail: 'Mains question missing printed marks in source',
      candidates: [
        { source: 'rau', value: mainsText },
        ...(pairInfo?.pairedWith
          ? [
              {
                source: pairInfo.otherPublisher || 'visionias',
                value: {
                  prompt: pairInfo.pairedWith.prompt,
                  subpart: pairInfo.pairedWith.subpart,
                  case_study: pairInfo.pairedWith.case_study,
                  word_limit: pairInfo.pairedWith.word_limit,
                  marks_allotted: pairInfo.pairedWith.marks_allotted,
                  section: pairInfo.pairedWith.section,
                  instructions: null,
                },
              },
            ]
          : []),
      ],
      evidence,
      crop: null,
    };
    return { record: null, queueItem };
  }

  // Valid marks_allotted
  let queueItem: QueueItem | null = null;

  if (pairInfo) {
    const { pairedWith, similarity, otherPublisher } = pairInfo;
    if (pairedWith) {
      const marksDiffer = item.marks_allotted !== pairedWith.marks_allotted;
      const wlDiffer = item.word_limit !== pairedWith.word_limit;
      const simLow = similarity !== undefined && similarity < 0.9;

      if (marksDiffer || wlDiffer || simLow) {
        queueItem = {
          item_id: `${canonical_id}:G_XSRC`,
          canonical_id,
          occurrence_id: `${item.document_id}_p${item.page}_q${qno}`,
          gate: 'G_XSRC',
          reason_code: 'source_identity_conflict',
          detail: `Mains cross-source conflict: sim=${similarity}, marks=(${item.marks_allotted} vs ${pairedWith.marks_allotted}), wl=(${item.word_limit} vs ${pairedWith.word_limit})`,
          candidates: [
            { source: 'rau', value: mainsText },
            {
              source: otherPublisher || 'visionias',
              value: {
                prompt: pairedWith.prompt,
                subpart: pairedWith.subpart,
                case_study: pairedWith.case_study,
                word_limit: pairedWith.word_limit,
                marks_allotted: pairedWith.marks_allotted,
                section: pairedWith.section,
                instructions: null,
              },
            },
          ],
          evidence,
          crop: null,
        };
      }
    } else if (otherPublisher) {
      // Unpaired prompt in a multi-publisher paper
      queueItem = {
        item_id: `${canonical_id}:G_XSRC`,
        canonical_id,
        occurrence_id: `${item.document_id}_p${item.page}_q${qno}`,
        gate: 'G_XSRC',
        reason_code: 'source_identity_conflict',
        detail: 'Unpaired Mains prompt across publishers',
        candidates: [{ source: 'rau', value: mainsText }],
        evidence,
        crop: null,
      };
    }
  }

  const record: MainsQuestionRecord = {
    canonical_id,
    identity,
    text: mainsText,
    rubric: { review_state: 'unreviewed' },
    classification: {
      topic: null,
      format: paper.includes('Essay') ? 'essay_topic' : 'mains_analytical',
      annotation_method: 'mains_extractor',
      annotation_version: '086G-1',
      review_state: 'unreviewed',
    },
    evidence,
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
    created_at: clockTime,
    updated_at: clockTime,
  };

  return { record, queueItem };
}

// ---------------------------------------------------------------------------
// Main Orchestration
// ---------------------------------------------------------------------------

export async function runReconcile(customRunDir?: string): Promise<{
  validator_errors: number;
  report: unknown;
}> {
  const rDir = customRunDir || getRunDir();
  assertRunDirSafe(rDir);
  ensureLayout(rDir);

  const manifestDir = path.join(rDir, 'manifest');
  const occurrencesDir = path.join(rDir, 'occurrences');
  const mainsDir = path.join(rDir, 'mains');
  const keysDir = path.join(rDir, 'keys', 'official');
  const profilesDir = path.join(rDir, 'profiles');
  const canonicalDir = path.join(rDir, 'canonical');
  const conflictsDir = path.join(rDir, 'conflicts');
  const reportsDir = path.join(rDir, 'reports');

  // Load census
  const censusPath = path.join(manifestDir, 'census.json');
  if (!fs.existsSync(censusPath)) {
    throw new Error(`census.json not found at ${censusPath}`);
  }
  const censusData = JSON.parse(fs.readFileSync(censusPath, 'utf-8'));
  const clockTime: string = censusData.generated_at || '2026-10-22T11:12:59.688Z';
  const censusRows: CensusRow[] = censusData.rows || [];
  const censusByDocId = new Map<string, CensusRow>();
  for (const r of censusRows) {
    censusByDocId.set(r.document_id, r);
  }

  // Load acquisitions
  const acqPath = path.join(manifestDir, 'acquisition.jsonl');
  const acqByDocId = new Map<string, AcqRow>();
  if (fs.existsSync(acqPath)) {
    const lines = fs.readFileSync(acqPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const row: AcqRow = JSON.parse(line);
      acqByDocId.set(row.document_id, row);
    }
  }

  // Helper for source document creation
  const makeSourceDoc = (
    docId: string,
    defaultStatus: 'secondary-hosted' | 'official' = 'secondary-hosted'
  ): SourceDocument => {
    const acq = acqByDocId.get(docId);
    const census = censusByDocId.get(docId);
    let pages = census?.pages || 0;
    if (!pages && acq?.sha256) {
      const profP = path.join(profilesDir, `${acq.sha256}.json`);
      if (fs.existsSync(profP)) {
        try {
          const prof = JSON.parse(fs.readFileSync(profP, 'utf-8'));
          pages = prof.page_count || prof.pages || 0;
        } catch {
          // ignore
        }
      }
    }

    return {
      document_id: docId,
      url: acq?.final_url || acq?.url || census?.pdf_url || '',
      sha256: acq?.sha256 || '0'.repeat(64),
      bytes: acq?.bytes || 0,
      pages: pages || 1,
      retrieved_at: acq?.retrieved_at || clockTime,
      source_status: defaultStatus,
      chain_of_origin: acq?.url || census?.pdf_url || undefined,
    };
  };

  const canonicalQuestions: QuestionRecord[] = [];
  const canonicalMains: MainsQuestionRecord[] = [];
  const paperManifests: Record<string, PaperManifest> = {};
  const gaps: Array<{
    paper_slug: string;
    stage: Stage;
    expected_slots: number | null;
    reason: string;
  }> = [];
  const canonicalOccurrences: SourceOccurrence[] = [];
  const queueItems: QueueItem[] = [];

  const perSlugReport: Record<
    string,
    {
      expected: number;
      accounted: number;
      unresolved: number;
      aligned: boolean | null;
      rate: number | null;
      agree: number | null;
      n: number | null;
      key_authority_counts: Record<string, number>;
      corroborated: number;
      xsrc_diffs: number;
      queue_by_gate: Record<string, number>;
    }
  > = {};

  let totalValidatorErrors = 0;

  // -------------------------------------------------------------------------
  // 1. Prelims Universe: years 2011-2026 × {GS-1 (100), GS-2 (80)}
  // -------------------------------------------------------------------------

  const prelimsYears = Array.from({ length: 2026 - 2011 + 1 }, (_, i) => 2011 + i);
  const prelimsPapers: Array<{ kind: PaperKind; expectedCount: number }> = [
    { kind: 'GS-1', expectedCount: 100 },
    { kind: 'GS-2', expectedCount: 80 },
  ];

  for (const year of prelimsYears) {
    for (const { kind: paper, expectedCount } of prelimsPapers) {
      const slug = `${year}-${paper}`;
      const expectedSlots = Array.from({ length: expectedCount }, (_, i) => i + 1);

      // Check if primary occurrences exist for this slug
      const primaryOccPath = path.join(occurrencesDir, 'visionias', `${slug}.jsonl`);
      const hasPrimary = fs.existsSync(primaryOccPath);

      if (!hasPrimary) {
        gaps.push({
          paper_slug: slug,
          stage: 'Prelims',
          expected_slots: expectedCount,
          reason: 'missing_source: no digitised source in the owner-selected set',
        });
        continue;
      }

      // Read primary envelopes
      const primaryEnvelopes: EnvelopeOccurrence[] = fs
        .readFileSync(primaryOccPath, 'utf-8')
        .split('\n')
        .filter((l) => l.trim().length > 0)
        .map((l) => JSON.parse(l));

      // Read official key if available
      const keyPath = path.join(keysDir, `${slug}.json`);
      let keyData: OfficialKeyFile | null = null;
      if (fs.existsSync(keyPath)) {
        keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
      }

      // Series alignment
      const officialA = keyData?.series?.A;
      const { n, agree, rate, aligned } = computeSeriesAlignment(primaryEnvelopes, officialA);

      if (keyData && !aligned) {
        queueItems.push({
          item_id: `${slug}:G_SERIES`,
          canonical_id: null,
          occurrence_id: null,
          gate: 'G_SERIES',
          reason_code: 'series_unresolved',
          detail: `Series alignment rate ${rate.toFixed(4)} < 0.80 for ${slug} (${agree}/${n})`,
          candidates: null,
          evidence: null,
          crop: null,
        });
      }

      // Corroboration with handoff if available
      const handoffPath = path.join(occurrencesDir, 'handoff', `${slug}.jsonl`);
      const corroborationMap = new Map<
        number,
        {
          matchedHandoff: EnvelopeOccurrence;
          isDiff: boolean;
          diffDetail: string | null;
        }
      >();

      let corroboratedCount = 0;
      let xsrcDiffsCount = 0;
      const pairedHandoffEnvelopes: EnvelopeOccurrence[] = [];

      if (fs.existsSync(handoffPath)) {
        const handoffEnvelopes: EnvelopeOccurrence[] = fs
          .readFileSync(handoffPath, 'utf-8')
          .split('\n')
          .filter((l) => l.trim().length > 0)
          .map((l) => JSON.parse(l));

        // Pair greedily by descending Jaccard
        const pairCandidates: Array<{
          score: number;
          primIdx: number;
          handoffIdx: number;
        }> = [];

        for (let pi = 0; pi < primaryEnvelopes.length; pi++) {
          const pToks = extractTokens(primaryEnvelopes[pi].occurrence.text);
          for (let hi = 0; hi < handoffEnvelopes.length; hi++) {
            const hToks = extractTokens(handoffEnvelopes[hi].occurrence.text);
            const score = tokenSetJaccard(pToks, hToks);
            if (score >= 0.6) {
              pairCandidates.push({ score, primIdx: pi, handoffIdx: hi });
            }
          }
        }

        // Sort descending by score, deterministic tie-breaking
        pairCandidates.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.primIdx !== b.primIdx) return a.primIdx - b.primIdx;
          return a.handoffIdx - b.handoffIdx;
        });

        const usedPrim = new Set<number>();
        const usedHandoff = new Set<number>();

        for (const cand of pairCandidates) {
          if (usedPrim.has(cand.primIdx) || usedHandoff.has(cand.handoffIdx)) continue;
          usedPrim.add(cand.primIdx);
          usedHandoff.add(cand.handoffIdx);

          const primEnv = primaryEnvelopes[cand.primIdx];
          const handEnv = handoffEnvelopes[cand.handoffIdx];
          const { isDiff, detail } = checkCriticalDiff(
            primEnv.occurrence.text,
            handEnv.occurrence.text
          );

          if (isDiff) {
            xsrcDiffsCount++;
          } else {
            corroboratedCount++;
          }

          corroborationMap.set(primEnv.occurrence.identity.question_number, {
            matchedHandoff: handEnv,
            isDiff,
            diffDetail: detail,
          });
          pairedHandoffEnvelopes.push(handEnv);
        }
      }

      // Reconcile each slot
      const accountedSlots: number[] = [];
      const keyAuthorityCounts: Record<string, number> = {
        official: 0,
        provisional: 0,
        secondary: 0,
        unavailable: 0,
        withdrawn: 0,
      };

      const slugQueueByGate: Record<string, number> = {};

      for (const env of primaryEnvelopes) {
        const qno = env.occurrence.identity.question_number;
        const officialKeyAssertion = officialA ? officialA[String(qno)] : undefined;
        const corrob = corroborationMap.get(qno);

        const { record, queueItems: itemQueue } = reconcilePrelimsSlot(
          env,
          aligned,
          agree,
          n,
          officialKeyAssertion,
          corrob,
          clockTime
        );

        // Validate QuestionRecord
        const vRes = validateQuestionRecord(record);
        if (!vRes.ok) {
          totalValidatorErrors += vRes.errors.length;
          console.error(`Validation error in ${record.canonical_id}:`, vRes.errors);
        }

        canonicalQuestions.push(record);
        accountedSlots.push(qno);

        // Update occurrence linkage for primary
        const primOcc: SourceOccurrence = {
          occurrence_id: env.occurrence.occurrence_id,
          canonical_id: record.canonical_id,
          identity: env.occurrence.identity,
          text: env.occurrence.text,
          key_claim: env.occurrence.key_claim,
          evidence: env.occurrence.evidence,
        };
        canonicalOccurrences.push(primOcc);

        // Update occurrence linkage for paired handoff
        if (corrob?.matchedHandoff) {
          const hEnv = corrob.matchedHandoff;
          const hOcc: SourceOccurrence = {
            occurrence_id: hEnv.occurrence.occurrence_id,
            canonical_id: record.canonical_id,
            identity: hEnv.occurrence.identity,
            text: hEnv.occurrence.text,
            key_claim: hEnv.occurrence.key_claim,
            evidence: hEnv.occurrence.evidence,
          };
          canonicalOccurrences.push(hOcc);
        }

        // Tally key status
        if (record.key.authority === 'official-final') keyAuthorityCounts.official++;
        else if (record.key.authority === 'official-provisional') keyAuthorityCounts.provisional++;
        else if (record.key.authority === 'secondary-claimed') keyAuthorityCounts.secondary++;
        else if (record.key.authority === 'withdrawn') keyAuthorityCounts.withdrawn++;
        else keyAuthorityCounts.unavailable++;

        for (const qi of itemQueue) {
          queueItems.push(qi);
          slugQueueByGate[qi.gate] = (slugQueueByGate[qi.gate] || 0) + 1;
        }
      }

      accountedSlots.sort((a, b) => a - b);
      const accountedSet = new Set(accountedSlots);
      const unresolvedSlots = expectedSlots.filter((s) => !accountedSet.has(s));

      // Slot coverage unresolved also adds to unavailable
      keyAuthorityCounts.unavailable += unresolvedSlots.length;

      // Build source documents list for manifest
      const contributingDocIds = Array.from(
        new Set(primaryEnvelopes.map((e) => e.occurrence.evidence.source_document_id))
      );
      const sourceDocs: SourceDocument[] = contributingDocIds.map((did) =>
        makeSourceDoc(did, 'secondary-hosted')
      );

      // Add handoff documents if paired
      if (pairedHandoffEnvelopes.length > 0) {
        const handoffDocIds = Array.from(
          new Set(pairedHandoffEnvelopes.map((e) => e.occurrence.evidence.source_document_id))
        );
        for (const hdid of handoffDocIds) {
          const sample = pairedHandoffEnvelopes.find(
            (e) => e.occurrence.evidence.source_document_id === hdid
          )!;
          sourceDocs.push({
            document_id: hdid,
            url: sample.occurrence.evidence.source_url,
            sha256: sample.occurrence.evidence.sha256,
            bytes: 0,
            pages: sample.occurrence.evidence.page || 1,
            retrieved_at: sample.occurrence.evidence.retrieved_at || clockTime,
            source_status: 'official',
            chain_of_origin: sample.occurrence.evidence.extraction_method || 'tark_pyq_handoff',
          });
        }
      }

      // Key documents
      const keyDocs: SourceDocument[] = [];
      if (keyData?.documents) {
        for (const kd of keyData.documents) {
          keyDocs.push({
            document_id: kd.source_document_id,
            url: kd.source_url,
            sha256: kd.sha256,
            bytes: 0,
            pages: 1,
            retrieved_at: kd.retrieved_at,
            source_status: 'official',
            chain_of_origin: kd.extraction_method || 'tark_pyq_handoff',
          });
        }
      }

      const manifest: PaperManifest = {
        exam: 'UPSC_CSE',
        stage: 'Prelims',
        year,
        paper,
        ...(aligned ? { booklet_series: 'A' } : {}),
        language: 'en',
        source_documents: sourceDocs,
        key_documents: keyDocs,
        coverage: {
          expected: expectedSlots,
          accounted: accountedSlots,
          unresolved: unresolvedSlots,
        },
        key_status: {
          official: keyAuthorityCounts.official,
          provisional: keyAuthorityCounts.provisional,
          secondary: keyAuthorityCounts.secondary,
          unavailable: keyAuthorityCounts.unavailable,
          withdrawn: keyAuthorityCounts.withdrawn,
        },
      };

      const mRes = validatePaperManifest(manifest);
      if (!mRes.ok) {
        totalValidatorErrors += mRes.errors.length;
        console.error(`Validation error in manifest for ${slug}:`, mRes.errors);
      }

      paperManifests[slug] = manifest;

      perSlugReport[slug] = {
        expected: expectedCount,
        accounted: accountedSlots.length,
        unresolved: unresolvedSlots.length,
        aligned: keyData ? aligned : null,
        rate: keyData && n > 0 ? parseFloat(rate.toFixed(4)) : null,
        agree: keyData ? agree : null,
        n: keyData ? n : null,
        key_authority_counts: keyAuthorityCounts,
        corroborated: corroboratedCount,
        xsrc_diffs: xsrcDiffsCount,
        queue_by_gate: slugQueueByGate,
      };
    }
  }

  // -------------------------------------------------------------------------
  // 2. Mains Universe: 2013-2025 × {Essay, GS-M1, GS-M2, GS-M3, GS-M4}
  // -------------------------------------------------------------------------

  const mainsYears = Array.from({ length: 2025 - 2013 + 1 }, (_, i) => 2013 + i);
  const mainsPapers: PaperKind[] = ['Essay', 'GS-M1', 'GS-M2', 'GS-M3', 'GS-M4'];

  for (const year of mainsYears) {
    for (const paper of mainsPapers) {
      const slug = `${year}-${paper}`;

      // Primary Mains publisher is rau
      const primaryMainsFile = path.join(mainsDir, `${slug}.rau.jsonl`);
      const hasPrimary = fs.existsSync(primaryMainsFile);

      if (!hasPrimary) {
        gaps.push({
          paper_slug: slug,
          stage: 'Mains',
          expected_slots: null,
          reason: 'missing_source: not digitised (scanned source in owner-selected set)',
        });
        continue;
      }

      // Check if primary doc was SCANNED / unresolved in extract-mains
      // For years 2013 and 2015, they are scanned OCR docs (UNRESOLVED)
      if (year < 2023) {
        gaps.push({
          paper_slug: slug,
          stage: 'Mains',
          expected_slots: null,
          reason: 'missing_source: not digitised (scanned source in owner-selected set)',
        });
        continue;
      }

      const primaryItems: MainsExtractedItem[] = fs
        .readFileSync(primaryMainsFile, 'utf-8')
        .split('\n')
        .filter((l) => l.trim().length > 0)
        .map((l) => JSON.parse(l));

      if (primaryItems.length === 0) {
        gaps.push({
          paper_slug: slug,
          stage: 'Mains',
          expected_slots: null,
          reason: 'missing_source: not digitised (scanned source in owner-selected set)',
        });
        continue;
      }

      // Read pairs if available (e.g. 2024 has VisionIAS pairs)
      const pairsPath = path.join(mainsDir, `${slug}.pairs.json`);
      let pairsData: MainsPairsFile | null = null;
      const visionItemsByQ = new Map<string, MainsExtractedItem>();

      if (fs.existsSync(pairsPath)) {
        pairsData = JSON.parse(fs.readFileSync(pairsPath, 'utf-8'));
        const visionFile = path.join(mainsDir, `${slug}.visionias.jsonl`);
        if (fs.existsSync(visionFile)) {
          const visItems: MainsExtractedItem[] = fs
            .readFileSync(visionFile, 'utf-8')
            .split('\n')
            .filter((l) => l.trim().length > 0)
            .map((l) => JSON.parse(l));
          for (const vi of visItems) {
            visionItemsByQ.set(`${vi.question_number}_${vi.subpart || ''}`, vi);
          }
        }
      }

      const maxQ = Math.max(...primaryItems.map((it) => it.question_number));
      const expectedSlots = Array.from({ length: maxQ }, (_, i) => i + 1);
      const accountedSlotsSet = new Set<number>();

      let xsrcDiffsCount = 0;
      const slugQueueByGate: Record<string, number> = {};

      for (const item of primaryItems) {
        const acq = acqByDocId.get(item.document_id);
        const pairKey = `${item.question_number}_${item.subpart || ''}`;
        const visItem = visionItemsByQ.get(pairKey);

        let pairInfo: {
          pairedWith?: MainsExtractedItem;
          similarity?: number;
          otherPublisher?: string;
        } | undefined = undefined;

        if (pairsData) {
          const pairObj = pairsData.pairs?.find(
            (p) =>
              p.question_number === item.question_number &&
              (p.subpart || null) === (item.subpart || null)
          );
          pairInfo = {
            pairedWith: visItem,
            similarity: pairObj?.similarity,
            otherPublisher: 'visionias',
          };
        }

        const { record, queueItem } = reconcileMainsPrompt(item, acq, pairInfo, clockTime);

        if (record) {
          const vRes = validateMainsQuestionRecord(record);
          if (!vRes.ok) {
            totalValidatorErrors += vRes.errors.length;
            console.error(`Validation error in Mains record ${record.canonical_id}:`, vRes.errors);
          }
          canonicalMains.push(record);
          accountedSlotsSet.add(item.question_number);
        }

        if (queueItem) {
          queueItems.push(queueItem);
          slugQueueByGate[queueItem.gate] = (slugQueueByGate[queueItem.gate] || 0) + 1;
          if (queueItem.gate === 'G_XSRC') {
            xsrcDiffsCount++;
          }
        }
      }

      const accountedSlots = Array.from(accountedSlotsSet).sort((a, b) => a - b);
      const unresolvedSlots = expectedSlots.filter((s) => !accountedSlotsSet.has(s));

      // Build source documents
      const contributingDocIds = Array.from(new Set(primaryItems.map((it) => it.document_id)));
      if (visionItemsByQ.size > 0) {
        for (const vi of visionItemsByQ.values()) {
          contributingDocIds.push(vi.document_id);
        }
      }
      const uniqueDocIds = Array.from(new Set(contributingDocIds));
      const sourceDocs: SourceDocument[] = uniqueDocIds.map((did) =>
        makeSourceDoc(did, 'secondary-hosted')
      );

      const manifest: PaperManifest = {
        exam: 'UPSC_CSE',
        stage: 'Mains',
        year,
        paper,
        language: 'en',
        source_documents: sourceDocs,
        key_documents: [],
        coverage: {
          expected: expectedSlots,
          accounted: accountedSlots,
          unresolved: unresolvedSlots,
        },
        key_status: {
          official: 0,
          provisional: 0,
          secondary: 0,
          unavailable: expectedSlots.length,
          withdrawn: 0,
        },
      };

      const mRes = validatePaperManifest(manifest);
      if (!mRes.ok) {
        totalValidatorErrors += mRes.errors.length;
        console.error(`Validation error in manifest for Mains ${slug}:`, mRes.errors);
      }

      paperManifests[slug] = manifest;

      perSlugReport[slug] = {
        expected: expectedSlots.length,
        accounted: accountedSlots.length,
        unresolved: unresolvedSlots.length,
        aligned: null,
        rate: null,
        agree: null,
        n: null,
        key_authority_counts: {
          official: 0,
          provisional: 0,
          secondary: 0,
          unavailable: expectedSlots.length,
          withdrawn: 0,
        },
        corroborated: 0,
        xsrc_diffs: xsrcDiffsCount,
        queue_by_gate: slugQueueByGate,
      };
    }
  }

  // -------------------------------------------------------------------------
  // 3. Sort & Write Outputs
  // -------------------------------------------------------------------------

  canonicalQuestions.sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
  canonicalMains.sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
  canonicalOccurrences.sort((a, b) => a.occurrence_id.localeCompare(b.occurrence_id));
  queueItems.sort((a, b) => a.item_id.localeCompare(b.item_id));
  gaps.sort((a, b) => a.paper_slug.localeCompare(b.paper_slug));

  // Write canonical/questions.preview.jsonl
  const questionsPath = path.join(canonicalDir, 'questions.preview.jsonl');
  const questionsContent =
    canonicalQuestions.map((q) => stableStringify(q)).join('\n') +
    (canonicalQuestions.length > 0 ? '\n' : '');
  fs.writeFileSync(questionsPath, questionsContent, 'utf-8');

  // Write canonical/mains.preview.jsonl
  const mainsPath = path.join(canonicalDir, 'mains.preview.jsonl');
  const mainsContent =
    canonicalMains.map((m) => stableStringify(m)).join('\n') +
    (canonicalMains.length > 0 ? '\n' : '');
  fs.writeFileSync(mainsPath, mainsContent, 'utf-8');

  // Write canonical/manifests.preview.json
  const manifestsPath = path.join(canonicalDir, 'manifests.preview.json');
  writeJsonAtomic(manifestsPath, paperManifests);

  // Write canonical/gaps.preview.json
  const gapsPath = path.join(canonicalDir, 'gaps.preview.json');
  writeJsonAtomic(gapsPath, gaps);

  // Write canonical/occurrences.preview.jsonl
  const occPath = path.join(canonicalDir, 'occurrences.preview.jsonl');
  const occContent =
    canonicalOccurrences.map((o) => stableStringify(o)).join('\n') +
    (canonicalOccurrences.length > 0 ? '\n' : '');
  fs.writeFileSync(occPath, occContent, 'utf-8');

  // Write conflicts/queue.jsonl
  const queuePath = path.join(conflictsDir, 'queue.jsonl');
  const queueContent =
    queueItems.map((qi) => stableStringify(qi)).join('\n') +
    (queueItems.length > 0 ? '\n' : '');
  fs.writeFileSync(queuePath, queueContent, 'utf-8');

  // Compute Totals
  let totalExpected = 0;
  let totalAccounted = 0;
  let totalUnresolved = 0;
  let totalCorroborated = 0;
  let totalXsrcDiffs = 0;

  for (const row of Object.values(perSlugReport)) {
    totalExpected += row.expected;
    totalAccounted += row.accounted;
    totalUnresolved += row.unresolved;
    totalCorroborated += row.corroborated;
    totalXsrcDiffs += row.xsrc_diffs;
  }

  const totals = {
    expected_slots: totalExpected,
    accounted_slots: totalAccounted,
    unresolved_slots: totalUnresolved,
    canonical_questions: canonicalQuestions.length,
    canonical_mains: canonicalMains.length,
    manifests: Object.keys(paperManifests).length,
    gaps: gaps.length,
    occurrences_linked: canonicalOccurrences.length,
    queue_items: queueItems.length,
    corroborated_items: totalCorroborated,
    xsrc_diffs: totalXsrcDiffs,
  };

  const report = {
    totals,
    per_slug: perSlugReport,
    validator_errors: totalValidatorErrors,
  };

  const reportPath = path.join(reportsDir, 'reconcile.json');
  writeJsonAtomic(reportPath, report);

  return { validator_errors: totalValidatorErrors, report };
}

// Direct CLI invocation
const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith('reconcile.ts') || process.argv[1].endsWith('reconcile.js'));

if (isMainModule) {
  runReconcile()
    .then(({ validator_errors }) => {
      if (validator_errors > 0) {
        console.error(`Reconcile finished with ${validator_errors} validator errors.`);
        process.exit(1);
      } else {
        console.log('Reconcile complete. 0 validator errors.');
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error('Fatal error during reconcile:', err);
      process.exit(1);
    });
}
