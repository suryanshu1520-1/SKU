/**
 * server-lib/cron/ingest/synthesize.ts
 *
 * Language-aware distillation. Turns a real, extracted body into 1–3 honest,
 * exam-relevant English bullets + syllabus tags, prelims/mains pointers via
 * the multi-provider LLM layer (Gemini → Groq).
 *
 * Two modes:
 *   - synthesize(): returns string[] bullets (legacy/compatible)
 *   - synthesizeStructured(): returns { bullets, tags, prelims, mains }
 *
 * Never pads to a fixed count. Returns null when the model self-classifies the
 * item as non-exam-relevant (the honest, no-fabrication path).
 */

import { llmGenerate } from "../../llm.js";
import type { SourceLang } from "./types.js";
import { segmentSpans, verifyClaim, groundingScore, type VerifiedClaim } from "./verify.js";

const EN_SYSTEM = [
  "You are a policy summarizer for UPSC/civil-services aspirants.",
  "Return 1 to 3 compact, standalone, information-dense sentences, one per line (prefer 3 only when the content genuinely supports it — never pad).",
  "Do NOT use markdown markers (-, *, •, #). Do NOT use section headers like 'Facts:', 'Metrics:'.",
  "When 3 lines fit: Line 1 = the core decision/announcement; Line 2 = quantitative metrics/fiscal figures/scale; Line 3 = implementation, timeline, or administrative context.",
  "FIRST, silently judge: is this a systemic public-administrative action, macro-economic shift, regulatory change, judgment, or international development relevant to India/UPSC? If it is retail stock tips, local crime, celebrity news, or corporate gossip, return exactly: NULL.",
].join("\n");

const HI_SYSTEM = [
  "You are a policy summarizer for UPSC/civil-services aspirants.",
  "The source text below is an Indian GOVERNMENT press release written in HINDI. Read the Hindi accurately and write the summary in clear ENGLISH.",
  "Return 1 to 3 compact, standalone, information-dense English sentences, one per line (never pad to three).",
  "Do NOT use markdown markers or section headers. Preserve scheme names, figures, dates and ministries exactly; do not invent details not present in the Hindi text.",
  "When 3 lines fit: Line 1 = the core decision/announcement; Line 2 = quantitative metrics/scale; Line 3 = implementation, timeline, or administrative context.",
  "FIRST, silently judge exam-relevance. If it is a purely ceremonial notice (tribute, greeting, condolence) with no policy substance, return exactly: NULL.",
].join("\n");

const EN_STRUCTURED_SYSTEM = [
  "You are a policy analyst and elite exam intelligence distiller for UPSC Civil Services aspirants.",
  "Decide if this item belongs in an authoritative UPSC Civil Services current affairs briefing. It qualifies ONLY if it maps to a General Studies syllabus node (GS1 Society/Geography/Culture; GS2 Polity/Governance/IR/Social Justice/Schemes; GS3 Economy/Environment/Science-Tech/Security). Routine crime, celebrity, local accidents, corporate quarterly earnings, and party political rhetoric are NOT UPSC-relevant → return NULL.",
  "If and only if the item is UPSC-relevant, distill it into structured JSON matching this schema:",
  "{",
  '  "bullets": string[], // 2 to 3 compact, information-dense, factual sentences without markdown markers (-, *, #). Preserve numbers and scheme names.',
  '  "syllabus_tags": string[], // 1 to 3 tags from: ["GS1 Society", "GS1 Geography", "GS1 History & Culture", "GS2 Polity", "GS2 Governance", "GS2 Social Justice", "GS2 International Relations", "GS3 Economy", "GS3 Environment & Ecology", "GS3 Science & Tech", "GS3 Internal Security", "GS3 Disaster Management"]',
  '  "prelims_pointer": string, // Key factual/constitutional/statutory/metric data for Prelims.',
  '  "mains_pointer": string, // Analytical significance, policy vector, or administrative impact for Mains.',
  '  "revision_targets": {',
  '    "data_metric": string, // The single most testable quantitative metric/outlay/timeline/quota, or empty string.',
  '    "nodal_body": string, // The key executing Ministry, Statutory Authority, Commission, or Department.',
  '    "statutory_legal": string // Key Act, Constitutional Article, Landmark Judgement, or Treaty.',
  '  },',
  '  "thematic_pillars": [ // 2 to 3 distinct thematic dimensions of this news',
  '    { "title": string, "description": string }',
  '  ],',
  '  "mains_analysis": {',
  '    "context": string, // 1-2 sentences on historical background or regulatory origin.',
  '    "core_implications": string, // 2-3 sentences on core policy trade-offs, socio-economic impact, or federal dynamics.',
  '    "way_forward": string // 1-2 sentences on constructive reform, administrative solution, or committee recommendation.',
  '  },',
  '  "static_linkages": [ // 1 to 3 essential textbook concepts (from NCERT/Laxmikanth/standard references) needed to master this topic',
  '    { "concept": string, "textbook_context": string }',
  '  ],',
  '  "prelims_trap_radar": string, // Subtle distinction UPSC examiners use to set traps (e.g. Centrally Sponsored vs Central Sector, Statutory vs Executive body, Mandatory vs Advisory, Upper house vs Lower house).',
  '  "prelims_relevance": "HIGH" | "MEDIUM" | "LOW",',
  '  "mains_relevance": "HIGH" | "MEDIUM" | "LOW"',
  "}",
  "Guidelines:",
  "- Strictly factual; zero extrapolation or fabricated metrics.",
  "- If not UPSC-relevant or if no syllabus tag applies, respond with exactly: {\"relevance\": \"NULL\"} or NULL.",
].join("\n");

const HI_STRUCTURED_SYSTEM = [
  "You are a policy analyst and elite exam intelligence distiller for UPSC Civil Services aspirants.",
  "The source text below is an official Indian GOVERNMENT press release in HINDI. Read the Hindi text accurately and produce the intelligence synthesis in authoritative, flawless ENGLISH.",
  "Judge UPSC relevance: ceremonial greetings, tributes, protocol notices without policy substance are NOT UPSC-relevant → return NULL.",
  "If and only if UPSC-relevant, distill it into structured JSON matching this schema in ENGLISH:",
  "{",
  '  "bullets": string[], // 2 to 3 compact, information-dense English sentences preserving exact scheme names, metrics, and dates.',
  '  "syllabus_tags": string[], // 1 to 3 tags from: ["GS1 Society", "GS1 Geography", "GS1 History & Culture", "GS2 Polity", "GS2 Governance", "GS2 Social Justice", "GS2 International Relations", "GS3 Economy", "GS3 Environment & Ecology", "GS3 Science & Tech", "GS3 Internal Security", "GS3 Disaster Management"]',
  '  "prelims_pointer": string,',
  '  "mains_pointer": string,',
  '  "revision_targets": {',
  '    "data_metric": string, // Quantifiable outlays, beneficiaries, targets, or deadlines.',
  '    "nodal_body": string, // Implementing Ministry/Department or Autonomous Body in English.',
  '    "statutory_legal": string // Statutory Act or Constitutional basis.',
  '  },',
  '  "thematic_pillars": [',
  '    { "title": string, "description": string }',
  '  ],',
  '  "mains_analysis": {',
  '    "context": string, // Background of the scheme or policy decision.',
  '    "core_implications": string, // Impact on governance, federalism, vulnerable sections, or macro-economy.',
  '    "way_forward": string // Administrative execution, monitoring mechanism, or forward outlook.',
  '  },',
  '  "static_linkages": [',
  '    { "concept": string, "textbook_context": string }',
  '  ],',
  '  "prelims_trap_radar": string, // Subtle distinction (e.g. 100% Central funding vs 60:40 Centre-State sharing, Statutory vs Executive body).',
  '  "prelims_relevance": "HIGH" | "MEDIUM" | "LOW",',
  '  "mains_relevance": "HIGH" | "MEDIUM" | "LOW"',
  "}",
  "Guidelines:",
  "- Translate accurately from Hindi; do not hallucinate non-existent ministries or numbers.",
  "- If purely ceremonial or non-exam-relevant, respond with: {\"relevance\": \"NULL\"} or NULL.",
].join("\n");

const EN_GROUNDED_SYSTEM = [
  "You are a policy analyst and exam intelligence distiller for UPSC Civil Services aspirants.",
  "The source is given as NUMBERED sentences. Judge UPSC relevance as for a Vision IAS / InsightsIAS compilation; routine crime, local incidents, accidents, non-major sports, celebrity, market moves and corporate results are NOT relevant → return NULL.",
  "If and only if UPSC-relevant, distill into structured JSON matching this schema:",
  "{",
  '  "bullets": [{ "text": string, "spans": number[] }], // 1-3 compact factual sentences; `spans` lists the indices of the numbered source sentences each bullet is derived from.',
  '  "syllabus_tags": string[], // 1-3 from: ["GS1 Society", "GS1 Geography", "GS1 History & Culture", "GS2 Polity", "GS2 Governance", "GS2 Social Justice", "GS2 International Relations", "GS3 Economy", "GS3 Environment & Ecology", "GS3 Science & Tech", "GS3 Internal Security", "GS3 Disaster Management"]',
  '  "prelims_pointer": string,',
  '  "mains_pointer": string,',
  '  "revision_targets": { "data_metric": string, "nodal_body": string, "statutory_legal": string },',
  '  "thematic_pillars": [{ "title": string, "description": string }],',
  '  "mains_analysis": { "context": string, "core_implications": string, "way_forward": string },',
  '  "static_linkages": [{ "concept": string, "textbook_context": string }],',
  '  "prelims_trap_radar": string,',
  '  "prelims_relevance": "HIGH" | "MEDIUM" | "LOW",',
  '  "mains_relevance": "HIGH" | "MEDIUM" | "LOW"',
  "}",
  "HARD GROUNDING RULE: every figure, percentage, currency amount, date/year and acronym in a bullet MUST appear in its cited source sentences. If you cannot ground a fact in a specific numbered sentence, omit that fact or that bullet. Never introduce facts absent from the cited sentences.",
  "If not UPSC-relevant, respond with exactly: NULL.",
].join("\n");

const HI_GROUNDED_SYSTEM = [
  "You are a policy analyst and exam intelligence distiller for UPSC Civil Services aspirants.",
  "The source is an Indian GOVERNMENT press release in HINDI, given as NUMBERED sentences. Read the Hindi accurately and write the distillation in clear ENGLISH.",
  "Judge UPSC relevance; ceremonial greetings, tributes or protocol notices without policy substance are NOT relevant → return NULL.",
  "If and only if UPSC-relevant, produce structured JSON matching this schema in ENGLISH:",
  "{",
  '  "bullets": [{ "text": string, "spans": number[] }], // 1-3 compact English sentences; `spans` = indices of the numbered Hindi source sentences each bullet is derived from.',
  '  "syllabus_tags": string[], // 1-3 relevant UPSC syllabus tags',
  '  "prelims_pointer": string,',
  '  "mains_pointer": string,',
  '  "revision_targets": { "data_metric": string, "nodal_body": string, "statutory_legal": string },',
  '  "thematic_pillars": [{ "title": string, "description": string }],',
  '  "mains_analysis": { "context": string, "core_implications": string, "way_forward": string },',
  '  "static_linkages": [{ "concept": string, "textbook_context": string }],',
  '  "prelims_trap_radar": string,',
  '  "prelims_relevance": "HIGH" | "MEDIUM" | "LOW",',
  '  "mains_relevance": "HIGH" | "MEDIUM" | "LOW"',
  "}",
  "HARD GROUNDING RULE: preserve scheme names, figures, dates and acronyms exactly; every such fact in a bullet MUST appear in its cited source sentences. Omit any fact you cannot ground. Never invent details.",
  "If not exam-relevant or purely ceremonial, respond with exactly: NULL.",
].join("\n");

export type RevisionTargets = {
  data_metric?: string;
  nodal_body?: string;
  statutory_legal?: string;
};

export type MainsAnalysis = {
  context?: string;
  core_implications?: string;
  way_forward?: string;
};

export type StaticLinkage = {
  concept: string;
  textbook_context: string;
};

export type ThematicPillar = {
  title: string;
  description: string;
};

export type StructuredSynthesis = {
  bullets: string[];
  tags: string[];
  prelims: string;
  mains: string;
  revision_targets?: RevisionTargets;
  thematic_pillars?: ThematicPillar[];
  mains_analysis?: MainsAnalysis;
  static_linkages?: StaticLinkage[];
  prelims_trap_radar?: string;
  prelims_relevance?: "HIGH" | "MEDIUM" | "LOW";
  mains_relevance?: "HIGH" | "MEDIUM" | "LOW";
};

/** StructuredSynthesis + span-anchored, cite-or-drop verified claims (the ledger). */
export type GroundedSynthesis = StructuredSynthesis & {
  claims: VerifiedClaim[];
  /** Fraction of produced bullets that passed the deterministic fact check (0..1). */
  grounding: number;
};

/**
 * Honest bullet normalizer — strips markers/headers, flattens sub-bullets,
 * caps at 3 WITHOUT padding.
 */
function normalizeBullets(raw: string | string[]): string[] {
  const lines = Array.isArray(raw)
    ? raw.flatMap((r) => String(r).split("\n"))
    : raw.split("\n");

  const stripped = lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-•*]+\s+/, "").replace(/^#{1,6}\s+/, "").trim())
    .filter(Boolean);

  const headerRe =
    /^(Facts|Metrics|Outlays|Key Points|Summary|Details|Background|Overview|Highlights):?\s*$/i;
  const noHeaders = stripped.filter((l) => !headerRe.test(l));

  const flattened: string[] = [];
  for (const line of noHeaders) {
    if (flattened.length > 0 && /^\s{2,}/.test(line)) {
      flattened[flattened.length - 1] += "; " + line.trim();
    } else {
      flattened.push(line);
    }
  }
  if (flattened.length > 3) {
    const extra = flattened.splice(2);
    flattened[2] = extra.join("; ");
  }
  return flattened.filter((b) => b.length > 0);
}

function clamp(input: string, max: number): string {
  return input.length <= max ? input : input.slice(0, max);
}

function parseJsonSafe(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```$/, "").trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Distill an item into honest bullets, or null if non-relevant / LLM unavailable.
 */
export async function synthesize(params: {
  title: string;
  body: string;
  lang?: SourceLang;
}): Promise<string[] | null> {
  const { title, body, lang = "en" } = params;
  const system = lang === "hi" ? HI_SYSTEM : EN_SYSTEM;
  const prompt = [`Headline: ${title}`, "", "Source text:", clamp(body, 6000)].join("\n");

  let result;
  try {
    result = await llmGenerate({ system, prompt, temperature: 0.3 });
  } catch (err: any) {
    console.error(`[ingest][llm] synthesis error: ${err?.message ?? err}`);
    return null;
  }

  if (!result || !result.text) {
    console.warn("[ingest][llm] all providers empty/unavailable");
    return null;
  }

  const upper = result.text.trim().toUpperCase();
  if (upper === "NULL" || upper.startsWith("NULL") || upper.includes('"RELEVANCE": "NULL"')) {
    console.log(`[ingest][llm] self-classified non-relevant: ${title.slice(0, 60)}`);
    return null;
  }

  const bullets = normalizeBullets(result.text);
  if (bullets.length === 0) return null;
  console.log(`[ingest][llm] distilled via ${result.provider}/${result.model}`);
  return bullets;
}

/**
 * Distill an item into structured exam intelligence:
 * bullets + syllabus tags + prelims pointer + mains pointer.
 *
 * HARD RELEVANCE GATE:
 * Must return at least one valid UPSC syllabus tag, otherwise returns null.
 */
export async function synthesizeStructured(params: {
  title: string;
  body: string;
  lang?: SourceLang;
}): Promise<StructuredSynthesis | null> {
  const { title, body, lang = "en" } = params;
  const system = lang === "hi" ? HI_STRUCTURED_SYSTEM : EN_STRUCTURED_SYSTEM;
  const prompt = [`Headline: ${title}`, "", "Source text:", clamp(body, 6000)].join("\n");

  let result;
  try {
    result = await llmGenerate({ system, prompt, temperature: 0.2, json: true });
  } catch (err: any) {
    console.error(`[ingest][llm] structured synthesis error: ${err?.message ?? err}`);
    result = null;
  }

  if (result?.text) {
    const raw = result.text.trim();
    const upper = raw.toUpperCase();
    if (upper === "NULL" || upper.startsWith("NULL") || upper.includes('"RELEVANCE": "NULL"')) {
      console.log(`[ingest][llm] self-classified non-relevant: ${title.slice(0, 60)}`);
      return null;
    }

    const parsed = parseJsonSafe(raw);
    if (parsed && typeof parsed === "object") {
      if (parsed.relevance === "NULL" || parsed.relevance === null) {
        console.log(`[ingest][llm] self-classified non-relevant: ${title.slice(0, 60)}`);
        return null;
      }

      const rawBullets = parsed.bullets || parsed.summary || [];
      const bullets = normalizeBullets(rawBullets);

      if (bullets.length > 0) {
        const rawTags = Array.isArray(parsed.syllabus_tags)
          ? parsed.syllabus_tags
          : Array.isArray(parsed.tags)
          ? parsed.tags
          : [];
        const tags = rawTags
          .map((t: any) => String(t).trim())
          .filter(Boolean)
          .slice(0, 3);

        // Hard requirement: at least one syllabus tag must be returned
        if (tags.length === 0) {
          console.log(`[ingest][llm] rejected (no syllabus tags returned): ${title.slice(0, 60)}`);
          return null;
        }

        const prelims = typeof parsed.prelims_pointer === "string"
          ? parsed.prelims_pointer.trim()
          : typeof parsed.prelims === "string"
          ? parsed.prelims.trim()
          : "";

        const mains = typeof parsed.mains_pointer === "string"
          ? parsed.mains_pointer.trim()
          : typeof parsed.mains === "string"
          ? parsed.mains.trim()
          : "";

        const rich = extractRichFields(parsed);

        console.log(`[ingest][llm] structured distillation (${tags.join(", ")}) via ${result.provider}/${result.model}`);
        return { bullets, tags, prelims, mains, ...rich };
      }
    }
  }

  return null;
}

/**
 * Span-anchored distillation with cite-or-drop verification (the evidence ledger).
 *
 * Segments the body into numbered sentences, asks the model to cite the span(s)
 * behind each bullet, then deterministically verifies every significant fact
 * against the cited spans (verify.ts). Unverifiable bullets are DROPPED.
 *
 * Returns null when there is no groundable text, nothing survives cite-or-drop,
 * or no syllabus tag applies — the caller (orchestrator) then falls back to the
 * ungrounded synthesizeStructured() so the edition is never starved.
 */
export async function synthesizeGrounded(params: {
  title: string;
  body: string;
  lang?: SourceLang;
}): Promise<GroundedSynthesis | null> {
  const { title, body, lang = "en" } = params;
  const spans = segmentSpans(clamp(body, 6000));
  if (spans.length === 0) return null;

  const system = lang === "hi" ? HI_GROUNDED_SYSTEM : EN_GROUNDED_SYSTEM;
  const numbered = spans.map((s, i) => `[${i}] ${s.text}`).join("\n");
  const prompt = [`Headline: ${title}`, "", "Numbered source sentences:", numbered].join("\n");

  let result;
  try {
    result = await llmGenerate({ system, prompt, temperature: 0.2, json: true });
  } catch (err: any) {
    console.error(`[ingest][llm] grounded synthesis error: ${err?.message ?? err}`);
    return null;
  }
  if (!result?.text) return null;

  const raw = result.text.trim();
  const upper = raw.toUpperCase();
  if (upper === "NULL" || upper.startsWith("NULL") || upper.includes('"RELEVANCE": "NULL"')) {
    return null;
  }

  const parsed = parseJsonSafe(raw);
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.relevance === "NULL" || parsed.relevance === null) return null;

  const rawBullets = Array.isArray(parsed.bullets) ? parsed.bullets : [];
  const claims: VerifiedClaim[] = [];
  for (const b of rawBullets) {
    const text = (typeof b === "string" ? b : b?.text ? String(b.text) : "")
      .trim()
      .replace(/^[-•*]+\s+/, "")
      .replace(/^#{1,6}\s+/, "")
      .trim();
    if (!text) continue;
    const spanNums: unknown[] = Array.isArray(b?.spans) ? b.spans : [];
    const spanIds = spanNums
      .map((n) => `s${Number(n)}`)
      .filter((id) => spans.some((s) => s.id === id));
    claims.push(verifyClaim(text, spanIds, spans));
  }

  const kept = claims.filter((c) => c.verified);
  if (kept.length === 0) return null; // cite-or-drop killed everything → caller falls back

  const rawTags = Array.isArray(parsed.syllabus_tags)
    ? parsed.syllabus_tags
    : Array.isArray(parsed.tags)
    ? parsed.tags
    : [];
  const tags = rawTags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 3);
  if (tags.length === 0) return null;

  const prelims =
    typeof parsed.prelims_pointer === "string"
      ? parsed.prelims_pointer.trim()
      : typeof parsed.prelims === "string"
      ? parsed.prelims.trim()
      : "";
  const mains =
    typeof parsed.mains_pointer === "string"
      ? parsed.mains_pointer.trim()
      : typeof parsed.mains === "string"
      ? parsed.mains.trim()
      : "";

  const rich = extractRichFields(parsed);

  // grounding = kept/total across ALL produced bullets (honest drop-rate gauge).
  const grounding = groundingScore(claims);
  console.log(
    `[ingest][llm] grounded (${kept.length}/${claims.length} bullets, ${tags.join(", ")}) via ${result.provider}/${result.model}`
  );
  return { bullets: kept.map((c) => c.text), tags, prelims, mains, claims: kept, grounding, ...rich };
}

/**
 * Safely extracts high-density 6-layer intelligence fields from parsed JSON.
 */
function extractRichFields(parsed: any) {
  const revision_targets: RevisionTargets | undefined =
    parsed.revision_targets && typeof parsed.revision_targets === "object"
      ? {
          data_metric:
            typeof parsed.revision_targets.data_metric === "string" && parsed.revision_targets.data_metric.trim()
              ? parsed.revision_targets.data_metric.trim()
              : undefined,
          nodal_body:
            typeof parsed.revision_targets.nodal_body === "string" && parsed.revision_targets.nodal_body.trim()
              ? parsed.revision_targets.nodal_body.trim()
              : undefined,
          statutory_legal:
            typeof parsed.revision_targets.statutory_legal === "string" && parsed.revision_targets.statutory_legal.trim()
              ? parsed.revision_targets.statutory_legal.trim()
              : undefined,
        }
      : undefined;

  const thematic_pillars: ThematicPillar[] | undefined = Array.isArray(parsed.thematic_pillars)
    ? parsed.thematic_pillars
        .filter((p: any) => p && typeof p.title === "string" && typeof p.description === "string")
        .map((p: any) => ({ title: String(p.title).trim(), description: String(p.description).trim() }))
        .slice(0, 4)
    : undefined;

  const mains_analysis: MainsAnalysis | undefined =
    parsed.mains_analysis && typeof parsed.mains_analysis === "object"
      ? {
          context:
            typeof parsed.mains_analysis.context === "string" && parsed.mains_analysis.context.trim()
              ? parsed.mains_analysis.context.trim()
              : undefined,
          core_implications:
            typeof parsed.mains_analysis.core_implications === "string" && parsed.mains_analysis.core_implications.trim()
              ? parsed.mains_analysis.core_implications.trim()
              : undefined,
          way_forward:
            typeof parsed.mains_analysis.way_forward === "string" && parsed.mains_analysis.way_forward.trim()
              ? parsed.mains_analysis.way_forward.trim()
              : undefined,
        }
      : undefined;

  const static_linkages: StaticLinkage[] | undefined = Array.isArray(parsed.static_linkages)
    ? parsed.static_linkages
        .filter((s: any) => s && typeof s.concept === "string" && typeof s.textbook_context === "string")
        .map((s: any) => ({ concept: String(s.concept).trim(), textbook_context: String(s.textbook_context).trim() }))
        .slice(0, 4)
    : undefined;

  const prelims_trap_radar =
    typeof parsed.prelims_trap_radar === "string" && parsed.prelims_trap_radar.trim()
      ? parsed.prelims_trap_radar.trim()
      : undefined;

  const rawPrelimsRel = String(parsed.prelims_relevance || "").toUpperCase();
  const prelims_relevance = ["HIGH", "MEDIUM", "LOW"].includes(rawPrelimsRel)
    ? (rawPrelimsRel as "HIGH" | "MEDIUM" | "LOW")
    : undefined;

  const rawMainsRel = String(parsed.mains_relevance || "").toUpperCase();
  const mains_relevance = ["HIGH", "MEDIUM", "LOW"].includes(rawMainsRel)
    ? (rawMainsRel as "HIGH" | "MEDIUM" | "LOW")
    : undefined;

  return {
    ...(revision_targets ? { revision_targets } : {}),
    ...(thematic_pillars && thematic_pillars.length ? { thematic_pillars } : {}),
    ...(mains_analysis ? { mains_analysis } : {}),
    ...(static_linkages && static_linkages.length ? { static_linkages } : {}),
    ...(prelims_trap_radar ? { prelims_trap_radar } : {}),
    ...(prelims_relevance ? { prelims_relevance } : {}),
    ...(mains_relevance ? { mains_relevance } : {}),
  };
}
