import type { ExaminerOperatorType } from '../types.js';

export type ExamInsightKind =
  | 'mechanism'
  | 'institution'
  | 'scope'
  | 'metric'
  | 'legal'
  | 'other';

export interface EvidenceRef {
  source_url: string;
  source_fingerprint: string;
  span_id: string;
  /** Verbatim extracted source text, NEVER generated prose. */
  quote: string;
}

export interface ExamInsightFact {
  id: string;
  kind: ExamInsightKind;
  label?: string;
  statement: string;
  evidence: EvidenceRef[];
}

export interface ExamInsightDistinction {
  statement: string;
  fact_ids: string[];
  evidence: EvidenceRef[];
  operator?: ExaminerOperatorType;
}

export interface ArticleExamInsights {
  schema_version: 1;
  generator_version: string;
  source_fingerprint: string;
  /** Enrichment timestamp; never the publication time. */
  generated_at: string;
  status: 'ready' | 'insufficient_evidence';
  facts: ExamInsightFact[];
  distinction?: ExamInsightDistinction;
  omission_reason?: string;
}

export interface ResolvedExamInsights {
  status: 'ready' | 'empty';
  facts: ExamInsightFact[];
  distinction?: ExamInsightDistinction;
  reason?: string;
}

/**
 * Deterministic, platform-agnostic hash for normalizing and fingerprinting
 * extracted source bodies (synchronous, zero-dependency, works in Browser & Node).
 */
export function computeSourceFingerprint(text: string): string {
  if (!text) return '00000000000000';
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

const VALID_KINDS = new Set<ExamInsightKind>([
  'mechanism',
  'institution',
  'scope',
  'metric',
  'legal',
  'other',
]);

const VALID_OPERATORS = new Set<string>([
  'PSY_01_INST_SWAP',
  'PSY_02_QUAL_POLARITY',
  'PSY_03_LEGAL_TIER',
  'PSY_04_CAUSAL_INV',
  'PSY_05_SCOPE_MUTATE',
]);

function normalizeQuote(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface ValidationContext {
  sourceUrl?: string;
  sourceFingerprint?: string;
  spans?: Array<{ id: string; text: string }>;
}

/**
 * Strict validator for ArticleExamInsights.
 * Fails closed on:
 * - schema_version mismatch != 1
 * - status 'ready' with 0 facts
 * - synthetic self-quoting (quote === statement)
 * - missing or invalid evidence references
 * - span ID or text mismatches against provided source context
 */
export function validateArticleExamInsights(
  data: unknown,
  context?: ValidationContext
): ArticleExamInsights | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, any>;

  if (raw.schema_version !== 1) return null;
  if (typeof raw.generator_version !== 'string' || !raw.generator_version.trim()) return null;
  if (typeof raw.source_fingerprint !== 'string' || !raw.source_fingerprint.trim()) return null;
  if (typeof raw.generated_at !== 'string' || !raw.generated_at.trim()) return null;

  const status = raw.status;
  if (status !== 'ready' && status !== 'insufficient_evidence') return null;

  if (status === 'insufficient_evidence') {
    return {
      schema_version: 1,
      generator_version: String(raw.generator_version),
      source_fingerprint: String(raw.source_fingerprint),
      generated_at: String(raw.generated_at),
      status: 'insufficient_evidence',
      facts: [],
      omission_reason: typeof raw.omission_reason === 'string' ? raw.omission_reason.trim() : 'Insufficient evidence in source',
    };
  }

  // status === 'ready' MUST have at least 1 validated fact
  if (!Array.isArray(raw.facts) || raw.facts.length === 0) return null;

  const spansMap = context?.spans ? new Map(context.spans.map(s => [s.id, s.text])) : null;
  const validatedFacts: ExamInsightFact[] = [];
  const factIds = new Set<string>();

  for (const f of raw.facts) {
    if (!f || typeof f !== 'object') continue;
    const id = typeof f.id === 'string' && f.id.trim() ? f.id.trim() : `f_${validatedFacts.length}`;
    const kind = VALID_KINDS.has(f.kind) ? (f.kind as ExamInsightKind) : 'other';
    const statement = typeof f.statement === 'string' ? f.statement.trim() : '';
    if (!statement || statement.length > 400) continue;

    if (!Array.isArray(f.evidence) || f.evidence.length === 0) continue;

    const validatedEvidence: EvidenceRef[] = [];
    let hasSelfQuote = false;

    for (const e of f.evidence) {
      if (!e || typeof e !== 'object') continue;
      const quote = typeof e.quote === 'string' ? e.quote.trim() : '';
      if (!quote || quote.length > 600) continue;

      // P0 Anti-shortcut check: a generated fact cannot cite itself as its source quotation
      if (normalizeQuote(quote) === normalizeQuote(statement)) {
        hasSelfQuote = true;
        break;
      }

      const spanId = typeof e.span_id === 'string' ? e.span_id.trim() : '';
      if (!spanId) continue;

      // Span containment check if context spans provided
      if (spansMap) {
        const spanText = spansMap.get(spanId);
        if (!spanText) continue;
        if (!normalizeQuote(spanText).includes(normalizeQuote(quote))) {
          continue;
        }
      }

      const sourceUrl = typeof e.source_url === 'string' ? e.source_url.trim() : (context?.sourceUrl || '');
      const sourceFp = typeof e.source_fingerprint === 'string'
        ? e.source_fingerprint.trim()
        : (context?.sourceFingerprint || raw.source_fingerprint);

      validatedEvidence.push({
        source_url: sourceUrl,
        source_fingerprint: sourceFp,
        span_id: spanId,
        quote,
      });
    }

    if (hasSelfQuote || validatedEvidence.length === 0) continue;

    factIds.add(id);
    validatedFacts.push({
      id,
      kind,
      label: typeof f.label === 'string' && f.label.trim() ? f.label.trim() : undefined,
      statement,
      evidence: validatedEvidence,
    });

    if (validatedFacts.length >= 3) break; // Cap at 3 non-redundant facts
  }

  if (validatedFacts.length === 0) {
    // If cite-or-drop eliminated all facts, cannot be 'ready'
    return {
      schema_version: 1,
      generator_version: String(raw.generator_version),
      source_fingerprint: String(raw.source_fingerprint),
      generated_at: String(raw.generated_at),
      status: 'insufficient_evidence',
      facts: [],
      omission_reason: 'All candidate facts failed source evidence verification',
    };
  }

  let validatedDistinction: ExamInsightDistinction | undefined = undefined;
  if (raw.distinction && typeof raw.distinction === 'object') {
    const d = raw.distinction;
    const stmt = typeof d.statement === 'string' ? d.statement.trim() : '';
    if (stmt && stmt.length <= 400 && Array.isArray(d.evidence) && d.evidence.length > 0) {
      const distEv: EvidenceRef[] = [];
      let distSelfQuote = false;
      for (const e of d.evidence) {
        if (!e || typeof e !== 'object') continue;
        const q = typeof e.quote === 'string' ? e.quote.trim() : '';
        if (!q || q.length > 600) continue;
        if (normalizeQuote(q) === normalizeQuote(stmt)) {
          distSelfQuote = true;
          break;
        }
        const sid = typeof e.span_id === 'string' ? e.span_id.trim() : '';
        if (spansMap && sid) {
          const st = spansMap.get(sid);
          if (!st || !normalizeQuote(st).includes(normalizeQuote(q))) continue;
        }
        distEv.push({
          source_url: typeof e.source_url === 'string' ? e.source_url.trim() : (context?.sourceUrl || ''),
          source_fingerprint: typeof e.source_fingerprint === 'string'
            ? e.source_fingerprint.trim()
            : (context?.sourceFingerprint || raw.source_fingerprint),
          span_id: sid,
          quote: q,
        });
      }

      if (!distSelfQuote && distEv.length > 0) {
        const refFactIds = Array.isArray(d.fact_ids)
          ? d.fact_ids.filter((fid: any) => factIds.has(String(fid)))
          : [];
        const op = typeof d.operator === 'string' && VALID_OPERATORS.has(d.operator)
          ? (d.operator as ExaminerOperatorType)
          : undefined;

        validatedDistinction = {
          statement: stmt,
          fact_ids: refFactIds,
          evidence: distEv,
          operator: op,
        };
      }
    }
  }

  return {
    schema_version: 1,
    generator_version: String(raw.generator_version),
    source_fingerprint: String(raw.source_fingerprint),
    generated_at: String(raw.generated_at),
    status: 'ready',
    facts: validatedFacts,
    distinction: validatedDistinction,
  };
}

/**
 * Pure display resolver consumed by both NewsSignalCard and PolicyBrief.
 * Returns { status: 'ready', facts } if authentic article-specific insights exist,
 * or { status: 'empty' } with a diagnostic reason otherwise.
 *
 * INVARIANT: Never returns taxonomy labels (e.g. "Mutates numerical thresholds...")
 * or canned mains blueprints as a fallback.
 */
export function resolveArticleExamInsights(item: any): ResolvedExamInsights {
  if (!item) return { status: 'empty', facts: [], reason: 'No item provided' };

  const rawInsights = item.summary?.exam_insights;
  if (!rawInsights) {
    return { status: 'empty', facts: [], reason: 'No exam_insights field present' };
  }

  const validated = validateArticleExamInsights(rawInsights);
  if (!validated || validated.status !== 'ready' || validated.facts.length === 0) {
    return {
      status: 'empty',
      facts: [],
      reason: validated?.omission_reason || 'Insights ungrounded or insufficient evidence',
    };
  }

  return {
    status: 'ready',
    facts: validated.facts,
    distinction: validated.distinction,
  };
}
