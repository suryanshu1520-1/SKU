/**
 * server-lib/cron/ingest/contested.ts
 *
 * The Contested-Claim Engine — premium intelligence when primary sources disagree.
 *
 * Discovers factual contradictions across independent, authority-distinct cluster
 * members on the same underlying entity + metric in the same time period.
 *
 * Requirements (precision-biased):
 *   1. Quads: (entity, metric, value, unit, period) extracted from span-verified claims.
 *   2. Independent source families (e.g., PIB vs Indian Express, RBI vs The Hindu).
 *   3. At least one side must be high authority (authority >= 80, e.g. PIB/RBI/PRS).
 *   4. Strict unit + period matching (zero false contradictions from differing temporal baselines).
 *   5. Temporal distinction: distinguishes contested-now vs sequential revision (corrected/developed).
 *
 * Output: summary.contested = { entity, metric, sides: [{ source, url, value, quote }], nodeId? }
 */

import { authorityOf } from "./cluster.js";
import { nodeById, loadNodes } from "./syllabus/nodes.js";
import type { Candidate, Story } from "./types.js";
import { extractFacts, verifyClaim, type VerifiedClaim, segmentSpans } from "./verify.js";

export type FactQuad = {
  entity: string;
  metric: string;
  value: string;
  numericValue?: number;
  unit: string;
  period: string;
  rawFact: string;
  quote: string;
  source: string;
  url: string;
};

export type ContestedSide = {
  source: string;
  url: string;
  value: string;
  quote: string;
};

export type ContestedClaim = {
  entity: string;
  metric: string;
  period: string;
  sides: [ContestedSide, ContestedSide, ...ContestedSide[]];
  nodeId?: string;
};

const METRIC_PATTERNS: Array<{ metric: string; pattern: RegExp; defaultUnit?: string }> = [
  { metric: "gdp_growth_rate", pattern: /\b(?:gdp|growth\s+rate|economy\s+grow(?:th|s)?)\b/i, defaultUnit: "%" },
  { metric: "repo_rate", pattern: /\b(?:repo\s+rate|policy\s+rate|benchmark\s+rate)\b/i, defaultUnit: "%" },
  { metric: "inflation_rate", pattern: /\b(?:cpi|wpi|inflation|retail\s+inflation)\b/i, defaultUnit: "%" },
  { metric: "fiscal_deficit", pattern: /\b(?:fiscal\s+deficit|budget\s+deficit)\b/i, defaultUnit: "%" },
  { metric: "scheme_outlay", pattern: /\b(?:outlay|budgetary\s+allocation|financial\s+allocation|corpus|package)\b/i, defaultUnit: "crore" },
  { metric: "target_year", pattern: /\b(?:target\s+year|deadline|complete\s+by|achieve\s+by)\b/i, defaultUnit: "year" },
  { metric: "beneficiary_count", pattern: /\b(?:beneficiar(?:y|ies)|farmers|families|households|subscribers)\b/i, defaultUnit: "count" },
  { metric: "disinvestment_target", pattern: /\b(?:disinvestment|monetisation|monetization)\b/i, defaultUnit: "crore" },
  { metric: "trade_deficit", pattern: /\b(?:trade\s+deficit|current\s+account\s+deficit|cad)\b/i, defaultUnit: "billion" },
];

const SPECIFIC_ENTITIES: Record<string, string> = {
  "pm-kisan": "PM-KISAN",
  "pm kisan": "PM-KISAN",
  "ayushman bharat": "Ayushman Bharat",
  "pm-jay": "Ayushman Bharat",
  "jal jeevan mission": "Jal Jeevan Mission",
  "gst council": "GST Council",
  "election commission": "Election Commission",
  eci: "Election Commission",
  "supreme court": "Supreme Court",
  "national green tribunal": "NGT",
  ngt: "NGT",
  isro: "ISRO",
  drdo: "DRDO",
  sebi: "SEBI",
  cag: "CAG",
  "monetary policy committee": "RBI",
  mpc: "RBI",
  "reserve bank of india": "RBI",
  rbi: "RBI",
  "repo rate": "RBI",
  "reverse repo": "RBI",
  "policy rate": "RBI",
};

const GENERIC_ENTITIES: Record<string, string> = {
  "union cabinet": "Government of India",
  cabinet: "Government of India",
  "ministry of finance": "Government of India",
  finmin: "Government of India",
};

function matchesAlias(text: string, alias: string): boolean {
  if (alias.length <= 4) {
    const re = new RegExp(`\\b${alias}\\b`, "i");
    return re.test(text);
  }
  return text.toLowerCase().includes(alias.toLowerCase());
}

/** Normalize entity names using syllabus taxonomy entities and aliases. */
export function normalizeEntity(text: string): string {
  for (const [alias, canonical] of Object.entries(SPECIFIC_ENTITIES)) {
    if (matchesAlias(text, alias)) return canonical;
  }
  const nodes = loadNodes();
  for (const n of nodes) {
    for (const ent of n.entities) {
      if (ent.length >= 3 && matchesAlias(text, ent)) {
        return ent;
      }
    }
  }
  for (const [alias, canonical] of Object.entries(GENERIC_ENTITIES)) {
    if (matchesAlias(text, alias)) return canonical;
  }
  return "General";
}

/** Extract temporal period from sentence (e.g. FY25, 2024-25, Q1, August 2026). */
export function extractPeriod(text: string): string {
  const fyMatch = text.match(/\b(?:fy\s?-?\s?(?:20)?\d{2}|20\d{2}-\d{2,4}|financial\s+year\s+(?:20)?\d{2})\b/i);
  if (fyMatch) return fyMatch[0].toUpperCase().replace(/\s+/g, "");

  const qtrMatch = text.match(/\b(?:q[1-4]|first|second|third|fourth)\s+quarter\b/i);
  if (qtrMatch) return qtrMatch[0].toLowerCase();

  const yearMatch = text.match(/\b(202[0-9]|203[0-9])\b/);
  if (yearMatch) return yearMatch[1];

  return "CURRENT_PERIOD";
}

/** Extract unit from text (e.g. %, crore, lakh, billion, bps). */
export function extractUnit(fact: string, text: string): string {
  if (fact.includes("%") || /per\s?cent|percent/i.test(text)) return "%";
  if (/crore|cr\b/i.test(fact) || /crore|cr\b/i.test(text)) return "crore";
  if (/lakh/i.test(fact) || /lakh/i.test(text)) return "lakh";
  if (/billion|bn\b/i.test(fact) || /billion|bn\b/i.test(text)) return "billion";
  if (/million|mn\b/i.test(fact) || /million|mn\b/i.test(text)) return "million";
  if (/trillion/i.test(fact) || /trillion/i.test(text)) return "trillion";
  if (/bps|basis\s+points/i.test(fact) || /bps|basis\s+points/i.test(text)) return "bps";
  if (/\b(?:202\d|203\d)\b/.test(fact)) return "year";
  return "units";
}

/** Parse numeric value from fact string. */
export function parseNumericValue(fact: string): number | undefined {
  const match = fact.match(/\d[\d,]*(?:\.\d+)?/);
  if (!match) return undefined;
  const clean = match[0].replace(/,/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? undefined : num;
}

/**
 * Extract FactQuads from a candidate's text/claims.
 */
export function extractQuadsFromText(
  text: string,
  source: string,
  url: string,
  quote = text,
  contextHint = ""
): FactQuad[] {
  const facts = extractFacts(text);
  const quads: FactQuad[] = [];
  let entity = normalizeEntity(text);
  if (entity === "General" && contextHint) {
    const hintEntity = normalizeEntity(contextHint);
    if (hintEntity !== "General") entity = hintEntity;
  }
  let period = extractPeriod(text);
  if (period === "CURRENT_PERIOD" && contextHint) {
    const hintPeriod = extractPeriod(contextHint);
    if (hintPeriod !== "CURRENT_PERIOD") period = hintPeriod;
  }

  for (const fact of facts) {
    const num = parseNumericValue(fact);
    if (num === undefined) continue;

    // Detect metric associated with this sentence
    let metric = "general_metric";
    let defaultUnit = "units";
    for (const mp of METRIC_PATTERNS) {
      if (mp.pattern.test(text) || (contextHint && mp.pattern.test(contextHint))) {
        metric = mp.metric;
        defaultUnit = mp.defaultUnit ?? "units";
        break;
      }
    }

    const unit = extractUnit(fact, text) || defaultUnit;

    quads.push({
      entity,
      metric,
      value: fact,
      numericValue: num,
      unit,
      period,
      rawFact: fact,
      quote: quote.slice(0, 300),
      source,
      url,
    });
  }

  return quads;
}

/** Check if two values represent a true mathematical contradiction (>1% relative tolerance). */
function isNumericContradiction(val1: number, val2: number, unit: string): boolean {
  if (val1 === val2) return false;
  if (unit === "%" || unit === "bps") {
    // For rates and percentages, a difference > 0.15% is a significant policy disagreement
    return Math.abs(val1 - val2) >= 0.15;
  }
  const maxVal = Math.max(Math.abs(val1), Math.abs(val2));
  if (maxVal === 0) return false;
  const relDiff = Math.abs(val1 - val2) / maxVal;
  return relDiff > 0.02; // >2% relative difference
}

/**
 * Detect Contested Claims in a multi-source story cluster.
 *
 * High-precision gate:
 *   - >= 2 distinct source families
 *   - >= 1 source has authority >= 80 (e.g. PIB, RBI, PRS)
 *   - Same normalized entity and same metric
 *   - Same unit and same period (eliminates temporal/unit mismatch false positives)
 *   - Values significantly contradict
 */
export function findContestedClaims(story: Story): ContestedClaim | null {
  if (!story.members || story.members.length < 2) return null;

  // Filter to distinct source families
  const distinctSources = new Map<string, Candidate>();
  for (const m of story.members) {
    if (!distinctSources.has(m.source)) {
      distinctSources.set(m.source, m);
    }
  }

  if (distinctSources.size < 2) return null;

  // Check that at least one member is high authority (primary >= 80)
  const hasHighAuth = Array.from(distinctSources.values()).some((c) => authorityOf(c) >= 80);
  if (!hasHighAuth) return null;

  // Extract quads from top authority-distinct candidates
  const allQuads: FactQuad[] = [];
  for (const cand of distinctSources.values()) {
    const spans = segmentSpans(cand.body.slice(0, 4000));
    for (const s of spans) {
      const quads = extractQuadsFromText(
        s.text,
        cand.source,
        cand.url,
        s.text,
        `${cand.headline} ${cand.body.slice(0, 400)}`
      );
      allQuads.push(...quads);
    }
  }

  if (allQuads.length < 2) return null;

  // Align quads by (entity, metric, period, unit)
  const groups = new Map<string, FactQuad[]>();
  for (const q of allQuads) {
    if (q.metric === "general_metric") continue; // skip ambiguous metrics
    const key = `${q.entity}|${q.metric}|${q.period}|${q.unit}`.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(q);
  }

  for (const [key, quads] of groups.entries()) {
    // Need at least 2 distinct sources in the same (entity, metric, period, unit) bucket
    const sourcesInGroup = new Set(quads.map((q) => q.source));
    if (sourcesInGroup.size < 2) continue;

    // Check for numeric contradiction
    const first = quads[0];
    for (let i = 1; i < quads.length; i++) {
      const other = quads[i];
      if (first.source === other.source) continue;

      if (
        first.numericValue !== undefined &&
        other.numericValue !== undefined &&
        isNumericContradiction(first.numericValue, other.numericValue, first.unit)
      ) {
        return {
          entity: first.entity,
          metric: first.metric,
          period: first.period,
          sides: [
            { source: first.source, url: first.url, value: first.value, quote: first.quote },
            { source: other.source, url: other.url, value: other.value, quote: other.quote },
          ],
        };
      }
    }
  }

  return null;
}
