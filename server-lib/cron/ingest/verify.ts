/**
 * server-lib/cron/ingest/verify.ts
 *
 * The evidence-span ledger — deterministic, $0 anti-hallucination.
 *
 * The atomic unit is a (bullet ↔ source_span) pair. We sentence-segment the
 * extracted body into stable-id spans, the synthesizer must cite the span(s) each
 * bullet is derived from, and here we CHECK — with zero LLM cost — that:
 *   (a) the cited span ids exist, and
 *   (b) every significant fact in the bullet (numbers, %, currency, years,
 *       acronyms) appears verbatim in the cited spans.
 *
 * Bullets that fail are dropped ("cite-or-drop"). This catches the classic
 * "altered figure / swapped acronym" hallucination deterministically, and it
 * produces the verbatim quotes the trust UI shows. It is also the substrate the
 * Contested-claim engine reads (facts[] → (entity, metric, value) quads).
 *
 * Cross-lingual note: PIB bodies are Hindi but bullets are English. Numbers,
 * percentages, years and Latin acronyms survive translation intact, so the fact
 * check works against Hindi spans; the stored quote is simply in the source
 * language (which is honest — that IS the evidence).
 */

/** A source sentence, addressable by a stable id within one extracted body. */
export type EvidenceSpan = { id: string; text: string };

export type ClaimType = "numeric" | "context";

/** A span-anchored, deterministically-verified claim (one per surviving bullet). */
export type VerifiedClaim = {
  text: string;
  /** Stable span ids the bullet is grounded in (e.g. ["s3","s7"]). */
  spanIds: string[];
  /** Verbatim cited sentences — the trust-UI hover payload. */
  quotes: string[];
  /** Significant facts extracted from the bullet (for verify + Contested quads). */
  facts: string[];
  claimType: ClaimType;
  /** Passed the deterministic entity/number check. */
  verified: boolean;
};

const MAX_SPANS = 60;
const MAX_SPAN_CHARS = 400;

/**
 * Sentence-segment a body into stable-id spans (s0, s1, …). English + Hindi
 * (Devanagari danda ।॥). Does not split decimals like "3.9". Bounded for prompt
 * safety.
 */
export function segmentSpans(body: string): EvidenceSpan[] {
  const clean = body.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  // Split on a terminator FOLLOWED BY whitespace. The trailing-\s+ requirement
  // already protects decimals ("3.9%" has no space after the dot), so we only
  // additionally guard common abbreviations (Rs. No. Dr. …) from false splits.
  const ABBR = "Rs|No|Dr|Mr|Mrs|Ms|Vs|Etc|Ltd|Pvt|Sr|Jr|St|Fig|Vol|Govt|Sec|Art|Ch";
  const parts = clean.split(new RegExp(String.raw`(?<!\b(?:${ABBR}))[.!?।॥]+\s+`));
  const spans: EvidenceSpan[] = [];
  for (const p of parts) {
    const t = p.trim();
    if (t.length < 20) continue; // drop fragments/nav chrome
    spans.push({ id: `s${spans.length}`, text: t.slice(0, MAX_SPAN_CHARS) });
    if (spans.length >= MAX_SPANS) break;
  }
  return spans;
}

/** Normalize text for fact containment: lowercase, strip commas in numbers. */
function norm(s: string): string {
  return s.toLowerCase().replace(/(\d),(?=\d)/g, "$1");
}

/**
 * Extract SIGNIFICANT facts from a bullet — the ones worth enforcing:
 *   - numbers with ≥3 digit chars, decimals, or currency/percent context
 *   - 4-digit years
 *   - acronyms (ALLCAPS 2–6, incl. hyphenated schemes like PM-KISAN)
 * Small ordinals ("1 to 3") are deliberately skipped to avoid false drops.
 */
export function extractFacts(text: string): string[] {
  const facts = new Set<string>();

  // Currency / percentage / scaled numbers (keep the whole token).
  const numRe = /(?:₹|rs\.?|inr)?\s?\d[\d,]*(?:\.\d+)?\s?(?:%|per\s?cent|percent|crore|lakh|billion|million|trillion|bn|mn)?/gi;
  for (const m of text.matchAll(numRe)) {
    const tok = m[0].trim();
    const digits = tok.replace(/[^\d]/g, "");
    const hasContext = /[%₹]|per\s?cent|percent|crore|lakh|billion|million|trillion|\bbn\b|\bmn\b|\./i.test(tok);
    if (digits.length >= 3 || hasContext) facts.add(norm(tok));
  }
  // Acronyms + hyphenated scheme names. Minimum length 3: bare 2-letter
  // acronyms (PM, FY) are almost always English scaffolding a translator adds
  // around a non-Latin-script fact (e.g. "PM-Kisan" glossing "पीएम-किसान",
  // "FY 2025-26" glossing "2025-26") rather than a checkable claim — they can
  // never appear verbatim in a Hindi source, so enforcing them only produces
  // false drops on faithful Hindi→English bullets. Real load-bearing acronyms
  // (RBI, GDP, CPI, ISRO, NGT) are unaffected — all length >= 3.
  for (const m of text.matchAll(/\b[A-Z]{3,}(?:-[A-Z0-9]+)*\b/g)) {
    facts.add(m[0].toLowerCase());
  }
  return [...facts];
}

/** Devanagari block — a cheap, sufficient signal that hay is Hindi source text. */
function isDevanagari(s: string): boolean {
  return /[ऀ-ॿ]/.test(s);
}

/** The leading numeric core of a fact (digits + optional decimal), unit stripped. */
function numericCore(fact: string): string | null {
  const m = fact.match(/^[₹]?\s?\d[\d.,]*/);
  return m ? m[0] : null;
}

/**
 * True if a normalized fact appears in the normalized span text.
 *
 * FIXED (found via a live Groq dry-run, 2026-08-19): the prior "digit-core"
 * path stripped ALL non-digit characters from the fact to a bare concatenated
 * numeral (e.g. "6.50" -> "650"), but stripped non-digits from the haystack to
 * a SPACE (preserving the decimal point as a word break: "6.50" -> "6 50").
 * Those two never align, so every decimal-bearing fact (rates, percentages —
 * exactly the RBI/monetary-policy case) was silently dropped even when the
 * model cited it correctly. Real-model output surfaced this; a hand-authored
 * test fixture with pre-matched facts never could have (see the dry-run
 * report, docs/handoffs/dryrun-and-contested-antigravity.md).
 *
 * Fix: compare literally, only collapsing whitespace (both fact and hay are
 * already comma/case-normalized by norm() before reaching here). This still
 * requires exact digits AND the decimal point to match — "650" cannot pass
 * against a source that says "6.50" — so the anti-hallucination guarantee is
 * unchanged; only formatting/spacing noise around numbers is now tolerated.
 */
function factInText(fact: string, hay: string): boolean {
  const compact = (s: string) => s.replace(/\s+/g, "");
  if (compact(hay).includes(compact(fact))) return true;

  // Cross-lingual fallback (Hindi-PIB): a currency/scale unit word ("crore")
  // has no Latin-script counterpart in a Devanagari source ("करोड़") even when
  // the translation is perfectly faithful. If the full fact (number+unit)
  // doesn't match AND the source is Devanagari, accept a match on the numeric
  // core alone — the actual hallucination risk (a wrong FIGURE) is still
  // caught; only the untranslatable unit word's literal presence is relaxed.
  if (isDevanagari(hay)) {
    const core = numericCore(fact);
    if (core && compact(hay).includes(compact(core))) return true;
  }
  return false;
}

/**
 * Verify one bullet against its cited spans. cite-or-drop: ok requires at least
 * one valid cited span AND no significant fact missing from those spans.
 */
export function verifyClaim(
  text: string,
  citedSpanIds: string[],
  spans: EvidenceSpan[]
): VerifiedClaim {
  const byId = new Map(spans.map((s) => [s.id, s]));
  const valid = citedSpanIds.filter((id) => byId.has(id));
  const quotes = valid.map((id) => byId.get(id)!.text);
  const facts = extractFacts(text);
  const hay = norm(quotes.join(" — "));
  const missing = facts.filter((f) => !factInText(f, hay));
  const ok = valid.length > 0 && missing.length === 0;
  return {
    text,
    spanIds: valid,
    quotes,
    facts,
    claimType: facts.some((f) => /\d/.test(f)) ? "numeric" : "context",
    verified: ok,
  };
}

/** Fraction of claims that passed (0..1) — the per-brief grounding gauge. */
export function groundingScore(claims: VerifiedClaim[]): number {
  if (!claims.length) return 0;
  return claims.filter((c) => c.verified).length / claims.length;
}
