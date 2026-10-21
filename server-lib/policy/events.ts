/**
 * server-lib/policy/events.ts
 *
 * Deterministic gating and extraction for policy events.
 * Evaluates LLM-proposed event frames against source spans before storage.
 * TASK_085I
 */

import fs from "node:fs";
import { normUnicode } from "../text/normalize.js";
import { TRIGGERS } from "./instrument-lexicon.js";
import {
  RING_OF,
  NON_EVENTS,
  ringOfInstrument,
  assertEvidence,
  type InstrumentClass,
  type RingDepth,
  type EvidenceItem,
} from "./instruments.js";
import { verifyClaim, type EvidenceSpan } from "../cron/ingest/verify.js";
import {
  type ResolveResult,
  buildIndex,
  resolve,
  aliasVariants,
  type ResolverIndex,
  type AliasRow,
} from "./resolve.js";

export type ProgramKind =
  | "scheme"
  | "mission"
  | "act"
  | "bill"
  | "treaty"
  | "regulation"
  | "policy";

export type EventFrame = {
  instrument: string;
  actor: string;
  program: string | null;
  program_en: string | null;
  program_kind: string | null;
  date_text: string | null;
  summary: string;
  spans: number[];
};

export interface PolicyEventInsert {
  dispatch_id: string;
  event_seq: number;
  instrument: InstrumentClass;
  ring_depth: RingDepth;
  actor_slug: string | null;
  program_slug: string | null;
  jurisdiction: "union" | "state";
  summary: string;
  event_date: string;
  date_source: "release_meta" | "span" | "ingested";
  evidence: EvidenceItem[];
  review_id: number | null;
  extractor_version: string;
}

export interface PolicyProgramInsert {
  program_slug: string;
  name: string;
  kind: ProgramKind;
  nodal_entity_slug?: string | null;
  aliases: string[];
  node_id?: string | null;
  provenance: "auto" | "registry";
}

export type GateOutcome =
  | { ok: true; row: PolicyEventInsert; autoProgram?: PolicyProgramInsert | null }
  | { ok: false; reason: string };

const VALID_PROGRAM_KINDS = new Set<string>([
  "scheme",
  "mission",
  "act",
  "bill",
  "treaty",
  "regulation",
  "policy",
]);

const HINDI_MONTHS: Record<string, string> = {
  जनवरी: "01",
  फरवरी: "02",
  फ़रवरी: "02",
  मार्च: "03",
  अप्रैल: "04",
  मई: "05",
  जून: "06",
  जुलाई: "07",
  अगस्त: "08",
  सितंबर: "09",
  सितम्बर: "09",
  अक्टूबर: "10",
  अक्तूबर: "10",
  नवंबर: "11",
  नवम्बर: "11",
  दिसंबर: "12",
  दिसम्बर: "12",
};

const ENGLISH_MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

/**
 * Builds an auto-program slug: PRG_ + uppercase snake ASCII <= 48 chars.
 */
export function buildProgramSlug(programEn: string): string {
  const ascii = programEn
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const base = `PRG_${ascii}`;
  return base.slice(0, 48).replace(/_+$/, "");
}

/**
 * Parses event date from release meta -> cited spans -> ingested fallback.
 */
export function parseEventDate(
  citedSpansText: string,
  releaseDate: string | null,
  ingestedAt: string
): { event_date: string; date_source: "release_meta" | "span" | "ingested" } {
  // 1. Release date
  if (releaseDate && typeof releaseDate === "string") {
    const trimmed = releaseDate.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = isoMatch[2].padStart(2, "0");
      const d = isoMatch[3].padStart(2, "0");
      return { event_date: `${y}-${m}-${d}`, date_source: "release_meta" };
    }
  }

  // 2. Search cited spans text
  if (citedSpansText) {
    const normText = normUnicode(citedSpansText);

    type FoundDate = { index: number; dateStr: string };
    const candidates: FoundDate[] = [];

    // ISO: YYYY-MM-DD
    const isoRegex = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
    let match: RegExpExecArray | null;
    while ((match = isoRegex.exec(normText)) !== null) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const d = parseInt(match[3], 10);
      if (y >= 1947 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        candidates.push({
          index: match.index,
          dateStr: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        });
      }
    }

    // d Month yyyy (English or Hindi)
    const wordDateRegex = /\b(\d{1,2})\s+([a-zA-Z\u0900-\u097F]+)\s+(\d{4})\b/g;
    while ((match = wordDateRegex.exec(normText)) !== null) {
      const d = parseInt(match[1], 10);
      const monthWord = match[2].toLowerCase();
      const y = parseInt(match[3], 10);

      const m = ENGLISH_MONTHS[monthWord] || HINDI_MONTHS[monthWord];
      if (m && y >= 1947 && y <= 2100 && d >= 1 && d <= 31) {
        candidates.push({
          index: match.index,
          dateStr: `${y}-${m}-${String(d).padStart(2, "0")}`,
        });
      }
    }

    // Month d, yyyy (English)
    const monthFirstRegex = /\b([a-zA-Z]+)\s+(\d{1,2})\s+(\d{4})\b/g;
    while ((match = monthFirstRegex.exec(normText)) !== null) {
      const monthWord = match[1].toLowerCase();
      const d = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      const m = ENGLISH_MONTHS[monthWord];
      if (m && y >= 1947 && y <= 2100 && d >= 1 && d <= 31) {
        candidates.push({
          index: match.index,
          dateStr: `${y}-${m}-${String(d).padStart(2, "0")}`,
        });
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.index - b.index);
      return { event_date: candidates[0].dateStr, date_source: "span" };
    }
  }

  // 3. Ingested fallback
  let fallback = new Date().toISOString().slice(0, 10);
  if (ingestedAt && typeof ingestedAt === "string") {
    const m = ingestedAt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      fallback = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    }
  }
  return { event_date: fallback, date_source: "ingested" };
}

let cachedAuthorityIndex: ResolverIndex | null = null;

export function getDefaultAuthorityIndex(): ResolverIndex {
  if (cachedAuthorityIndex) return cachedAuthorityIndex;

  try {
    const seedPath = new URL("./data/authorities.seed.json", import.meta.url);
    const content = fs.readFileSync(seedPath, "utf-8");
    const parsed = JSON.parse(content) as Array<{
      entity_slug: string;
      authority: string;
      aliases_en?: string[];
      aliases_hi?: string[];
    }>;

    const rows: AliasRow[] = [];
    for (const entry of parsed) {
      const slug = entry.entity_slug;
      const allAliases = [
        entry.authority,
        ...(Array.isArray(entry.aliases_en) ? entry.aliases_en : []),
        ...(Array.isArray(entry.aliases_hi) ? entry.aliases_hi : []),
      ];
      for (const a of allAliases) {
        if (!a) continue;
        for (const v of aliasVariants(a)) {
          rows.push({ alias_norm: v, entity_slug: slug });
        }
      }
    }
    cachedAuthorityIndex = buildIndex(rows);
  } catch {
    cachedAuthorityIndex = buildIndex([]);
  }

  return cachedAuthorityIndex;
}

export function defaultResolveActor(mention: string): ResolveResult {
  const index = getDefaultAuthorityIndex();
  return resolve(mention, index);
}

/**
 * Deterministic gate for a policy event frame.
 * Checks gates in exact sequence:
 * 1. non_event
 * 2. no_spans
 * 3. no_trigger
 * 4. actor_not_in_span
 * 5. program_not_in_span
 * 6. numbers_unverified
 */
export function gateEvent(
  f: EventFrame,
  spans: EvidenceSpan[],
  ctx: {
    dispatchId: string;
    seq: number;
    sourceUrl: string;
    releaseDate: string | null;
    ingestedAt: string;
    resolveActor(m: string): ResolveResult;
    resolveProgram(m: string): string | null;
    extractorVersion: string;
    reviewId?: number | null;
    actorAliases?: (slug: string) => string[];
    programAliases?: (slug: string) => string[];
    nodeId?: string | null;
  }
): GateOutcome {
  // Gate 1: non_event
  if ((NON_EVENTS as readonly string[]).includes(f.instrument) || !(f.instrument in RING_OF)) {
    return { ok: false, reason: "non_event" };
  }
  const instrument = f.instrument as InstrumentClass;

  // Gate 2: no_spans
  if (!Array.isArray(f.spans) || f.spans.length === 0) {
    return { ok: false, reason: "no_spans" };
  }
  const validSpanIndices = f.spans.filter(
    (idx) => typeof idx === "number" && Number.isInteger(idx) && idx >= 0 && idx < spans.length
  );
  if (validSpanIndices.length === 0) {
    return { ok: false, reason: "no_spans" };
  }

  // Gate 3: no_trigger
  const triggers = TRIGGERS[instrument];
  if (!triggers) {
    return { ok: false, reason: "no_trigger" };
  }

  const citedSpans = validSpanIndices.map((i) => spans[i]);
  const hasTriggerMatch = citedSpans.some((span) => {
    const text = span.text;
    const isHi = /[\u0900-\u097F]/.test(text);
    const isEn = /[a-zA-Z]/.test(text);

    let hiMatched = false;
    if (isHi && triggers.hi && triggers.hi.length > 0) {
      hiMatched = triggers.hi.some((rx) => rx.test(text));
    }

    let enMatched = false;
    if (isEn && triggers.en && triggers.en.length > 0) {
      enMatched = triggers.en.some((rx) => rx.test(text));
    }

    return (isHi && hiMatched) || (isEn && enMatched);
  });

  if (!hasTriggerMatch) {
    return { ok: false, reason: "no_trigger" };
  }

  // Gate 4: actor_not_in_span
  const normActor = normUnicode(f.actor);
  const citedSpanNorms = citedSpans.map((s) => normUnicode(s.text));

  let actorFound = false;
  if (normActor && citedSpanNorms.some((sn) => sn.includes(normActor))) {
    actorFound = true;
  } else {
    const actorRes = ctx.resolveActor(f.actor);
    if (actorRes && actorRes.status === "resolved") {
      const aliases = ctx.actorAliases ? ctx.actorAliases(actorRes.slug) : [];
      actorFound = aliases.some((alias) => {
        const an = normUnicode(alias);
        return an && citedSpanNorms.some((sn) => sn.includes(an));
      });
    }
  }

  if (!actorFound) {
    return { ok: false, reason: "actor_not_in_span" };
  }

  // Gate 5: program_not_in_span (when program is present)
  if (f.program !== null && f.program !== undefined && f.program.trim() !== "") {
    const normProg = normUnicode(f.program);
    let programFound = false;
    if (normProg && citedSpanNorms.some((sn) => sn.includes(normProg))) {
      programFound = true;
    } else {
      const resolvedProgSlug = ctx.resolveProgram(f.program);
      if (resolvedProgSlug && ctx.programAliases) {
        const aliases = ctx.programAliases(resolvedProgSlug);
        programFound = aliases.some((alias) => {
          const an = normUnicode(alias);
          return an && citedSpanNorms.some((sn) => sn.includes(an));
        });
      }
    }

    if (!programFound) {
      return { ok: false, reason: "program_not_in_span" };
    }
  }

  // Gate 6: numbers_unverified
  const citedSpanIds = validSpanIndices.map((i) => `s${i}`);
  const claimVerification = verifyClaim(f.summary, citedSpanIds, spans);
  if (!claimVerification.verified) {
    return { ok: false, reason: "numbers_unverified" };
  }

  // All gates passed — assemble row and program
  const ring = ringOfInstrument(instrument);

  const actorRes = ctx.resolveActor(f.actor);
  let actor_slug: string | null = null;
  let review_id: number | null = null;
  if (actorRes.status === "resolved") {
    actor_slug = actorRes.slug;
  } else {
    actor_slug = null;
    review_id = ctx.reviewId ?? null;
  }

  let program_slug: string | null = null;
  let autoProgram: PolicyProgramInsert | null = null;

  if (f.program && f.program.trim()) {
    const resolvedProg = ctx.resolveProgram(f.program);
    if (resolvedProg) {
      program_slug = resolvedProg;
    } else if (ring <= 1) {
      if (
        f.program_en &&
        f.program_kind &&
        VALID_PROGRAM_KINDS.has(f.program_kind)
      ) {
        const slug = buildProgramSlug(f.program_en);
        if (slug) {
          program_slug = slug;
          autoProgram = {
            program_slug: slug,
            name: f.program_en,
            kind: f.program_kind as ProgramKind,
            nodal_entity_slug: actor_slug,
            aliases: Array.from(
              new Set([f.program, f.program_en].filter(Boolean) as string[])
            ),
            node_id: ctx.nodeId ?? null,
            provenance: "auto",
          };
        }
      }
    } else {
      program_slug = null;
    }
  }

  const combinedCitedText = citedSpans.map((s) => s.text).join(" ");
  const dateInfo = parseEventDate(combinedCitedText, ctx.releaseDate, ctx.ingestedAt);

  const evidence: EvidenceItem[] = validSpanIndices.map((i) => ({
    span_id: `s${i}`,
    quote: spans[i].text,
    source_url: ctx.sourceUrl,
  }));

  assertEvidence(evidence);

  const row: PolicyEventInsert = {
    dispatch_id: ctx.dispatchId,
    event_seq: ctx.seq,
    instrument,
    ring_depth: ring,
    actor_slug,
    program_slug,
    jurisdiction: "union",
    summary: f.summary,
    event_date: dateInfo.event_date,
    date_source: dateInfo.date_source,
    evidence,
    review_id,
    extractor_version: ctx.extractorVersion,
  };

  return {
    ok: true,
    row,
    ...(autoProgram ? { autoProgram } : {}),
  };
}
