/**
 * server-lib/cron/ingest/classify.ts
 *
 * The SINGLE classifier — replaces the four divergent copies of ministry
 * tagging / exclusion lists / policy-relevance scoring that had drifted
 * across pipeline.ts, scrape.ts, worker.ts and run-scraper.ts.
 *
 * Deterministic and zero-API-cost. Ported from pipeline.ts (the strongest of
 * the four) and consolidated.
 */

// ------------------------------------------------------------
// Ministry detection (deterministic entity match)
// ------------------------------------------------------------
const CANONICAL_ENTITIES = [
  "Prime Minister's Office", "Cabinet Secretariat", "Ministry of Finance",
  "Ministry of Commerce & Industry", "Ministry of External Affairs",
  "Ministry of Defence", "Ministry of Home Affairs", "Ministry of Education",
  "Ministry of Health and Family Welfare", "Ministry of Agriculture & Farmers Welfare",
  "Ministry of Environment, Forest and Climate Change", "Ministry of Power",
  "Ministry of Railways", "Ministry of Road Transport & Highways",
  "Ministry of Information & Broadcasting", "Ministry of Coal",
  "Ministry of Petroleum & Natural Gas", "Ministry of Labour & Employment",
  "Ministry of Culture", "Ministry of Electronics & IT", "Ministry of Steel",
  "Ministry of New and Renewable Energy", "Ministry of Heavy Industries",
  "Ministry of Civil Aviation", "Ministry of Mines", "Ministry of Tourism",
  "Ministry of Textiles", "Ministry of Science & Technology",
  "Ministry of Jal Shakti", "Ministry of Rural Development",
  "Ministry of Panchayati Raj", "Ministry of Social Justice & Empowerment",
  "Ministry of Women and Child Development", "Ministry of Youth Affairs and Sports",
  "Ministry of Housing & Urban Affairs", "Ministry of Ports, Shipping and Waterways",
  "Ministry of Skill Development and Entrepreneurship",
  "Ministry of Fisheries, Animal Husbandry & Dairying",
  "Ministry of Consumer Affairs, Food & Public Distribution",
  "Ministry of Law and Justice", "Ministry of Corporate Affairs", "NITI Aayog",
  "Department of Space", "Department of Atomic Energy", "Election Commission",
  "Reserve Bank of India",
];

const MINISTRY_ALIASES: Record<string, string[]> = {
  "Prime Minister's Office": ["PMO", "PM Office"],
  "Ministry of Finance": ["MOF", "Finance Ministry", "Finance"],
  "Ministry of Commerce & Industry": ["Commerce Ministry", "Commerce", "MOCI"],
  "Ministry of External Affairs": ["MEA", "External Affairs"],
  "Ministry of Defence": ["MOD", "Defence", "Defense"],
  "Ministry of Home Affairs": ["MHA", "Home Ministry"],
  "Ministry of Education": ["MOE", "Education Ministry", "MHRD"],
  "Ministry of Health and Family Welfare": ["MOHFW", "Health Ministry"],
  "Ministry of Agriculture & Farmers Welfare": ["MOAFW", "Agriculture"],
  "Ministry of Environment, Forest and Climate Change": ["MOEFCC", "Environment"],
  "Ministry of Power": ["Power Ministry"],
  "Ministry of Railways": ["Railway Ministry"],
  "Ministry of Electronics & IT": ["MEITY", "Electronics", "IT"],
  "Ministry of Information & Broadcasting": ["MIB", "I&B"],
  "NITI Aayog": ["NITI"],
  "Reserve Bank of India": ["RBI"],
};

import { normUnicode } from "../../text/normalize.ts";
import pibMinistriesData from "./data/pib-ministries.json" with { type: "json" };

export interface PibMinistryEntry {
  slug: string;
  en: string;
  hi: string[];
  source_url: string;
}

export interface MinistryAttribution {
  ministry: string;
  ministry_source: "pib_heading" | "hi_alias" | "en_alias" | "fallback";
  slug?: string;
  confidence?: number;
}

const pibEntries = pibMinistriesData as PibMinistryEntry[];

/**
 * Derive ministry attribution with detailed source provenance.
 * Order of evaluation:
 *  1. ministryHint (from PIB release heading / metadata)
 *  2. Hindi alias match on the first 200 chars of body
 *  3. English aliases & canonical entities
 *  4. Fallback default
 */
export function deriveMinistryDetailed(
  text: string,
  fallback = "Government of India",
  ministryHint?: string | null
): MinistryAttribution {
  // 1. ministryHint
  if (ministryHint && ministryHint.trim()) {
    const normHint = normUnicode(ministryHint);
    if (normHint) {
      // Exact match in pib-ministries.json (Hindi or English)
      for (const entry of pibEntries) {
        if (normUnicode(entry.en) === normHint) {
          return { ministry: entry.en, slug: entry.slug, ministry_source: "pib_heading", confidence: 1.0 };
        }
        for (const h of entry.hi) {
          if (normUnicode(h) === normHint) {
            return { ministry: entry.en, slug: entry.slug, ministry_source: "pib_heading", confidence: 1.0 };
          }
        }
      }
      // Partial / containment in pib-ministries.json
      for (const entry of pibEntries) {
        for (const h of entry.hi) {
          const normH = normUnicode(h);
          if (normH.length >= 4 && (normHint.includes(normH) || normH.includes(normHint))) {
            return { ministry: entry.en, slug: entry.slug, ministry_source: "pib_heading", confidence: 0.95 };
          }
        }
        const normEn = normUnicode(entry.en);
        if (normEn.length >= 6 && (normHint.includes(normEn) || normEn.includes(normHint))) {
          return { ministry: entry.en, slug: entry.slug, ministry_source: "pib_heading", confidence: 0.95 };
        }
      }
      // English aliases / canonical entities check for hint
      const hintHay = ` ${normHint} `;
      for (const [ministry, aliases] of Object.entries(MINISTRY_ALIASES)) {
        for (const alias of aliases) {
          if (hintHay.includes(` ${normUnicode(alias)} `)) {
            const match = pibEntries.find((p) => p.en.toLowerCase() === ministry.toLowerCase());
            return { ministry, slug: match?.slug, ministry_source: "pib_heading", confidence: 0.9 };
          }
        }
      }
      for (const ministry of CANONICAL_ENTITIES) {
        if (hintHay.includes(normUnicode(ministry))) {
          const match = pibEntries.find((p) => p.en.toLowerCase() === ministry.toLowerCase());
          return { ministry, slug: match?.slug, ministry_source: "pib_heading", confidence: 0.9 };
        }
      }
    }
  }

  // 2. Hindi alias match on the first 200 chars of body
  const headSnippet = normUnicode((text || "").slice(0, 200));
  if (headSnippet) {
    let bestMatch: { entry: PibMinistryEntry; length: number } | null = null;
    for (const entry of pibEntries) {
      for (const h of entry.hi) {
        const normH = normUnicode(h);
        if (normH.length >= 3 && headSnippet.includes(normH)) {
          if (!bestMatch || normH.length > bestMatch.length) {
            bestMatch = { entry, length: normH.length };
          }
        }
      }
    }
    if (bestMatch) {
      return { ministry: bestMatch.entry.en, slug: bestMatch.entry.slug, ministry_source: "hi_alias", confidence: 0.9 };
    }
  }

  // 3. Existing English aliases
  const hay = ` ${normUnicode(text || "")} `;
  for (const [ministry, aliases] of Object.entries(MINISTRY_ALIASES)) {
    for (const alias of aliases) {
      if (hay.includes(` ${normUnicode(alias)} `)) {
        const match = pibEntries.find((p) => p.en.toLowerCase() === ministry.toLowerCase());
        return { ministry, slug: match?.slug, ministry_source: "en_alias", confidence: 0.85 };
      }
    }
  }
  for (const ministry of CANONICAL_ENTITIES) {
    if (hay.includes(normUnicode(ministry))) {
      const match = pibEntries.find((p) => p.en.toLowerCase() === ministry.toLowerCase());
      return { ministry, slug: match?.slug, ministry_source: "en_alias", confidence: 0.8 };
    }
  }

  // 4. Fallback
  return { ministry: fallback, ministry_source: "fallback", confidence: 0 };
}

/**
 * Derive a ministry tag from text. `fallback` lets primary sources supply a
 * sensible default (e.g. RBI -> "Reserve Bank of India").
 */
export function deriveMinistry(
  text: string,
  fallback = "Government of India",
  ministryHint?: string | null
): string {
  return deriveMinistryDetailed(text, fallback, ministryHint).ministry;
}

// ------------------------------------------------------------
// Ephemeral Trivia Filter (24-Hour Trivia / 0% Prelims Yield)
// ------------------------------------------------------------
export const EPHEMERAL_TRIVIA_PATTERNS = [
  /\b(VRRR|Variable Rate Repo|Variable Rate Reverse Repo)\s+auction\b/i,
  /\b(91-day|182-day|364-day)\s+Treasury Bills?\s+\(T-Bills?\)\s+auction/i,
  /\bSpecial Campaign\s+\d+\b.*\b(workshop|record management|cleanliness|scrap disposal)\b/i,
  /\bremoval of (dust|silt|construction debris) from roads\b/i,
  /\b(courtesy call|pays floral tributes|condoles the passing)\b/i,
  /\b(Auction of State Government Securities|State Government Securities\s*-\s*Full Auction Result)\b/i,
  /\bConversion\/Switch (auction )?of Government of India Securities\b/i,
  /\bPremature redemption under Sovereign Gold Bond \(SGB\) Scheme\b/i,
  /\bCPGRAMS Monthly Report\b/i,
];

/** True if item matches routine money-market liquidity or ministerial cleanliness trivia. */
export function isEphemeralTrivia(title: string, body = ""): boolean {
  const hay = `${title} ${body}`;
  return EPHEMERAL_TRIVIA_PATTERNS.some((pat) => pat.test(hay));
}

// ------------------------------------------------------------
// Hard exclusion filter (zero-cost pre-filter)
// ------------------------------------------------------------
const EXCLUDE_KEYWORDS = [
  "MURDER", "RAPE", "ACCIDENT", "ASSAULT", "ARRESTED", "ARREST", "DIED", "DEATH",
  "CREMATED", "CELEBRITY", "CINEMA", "FILM", "BOLLYWOOD", "CRIME",
  "AQUAPLANING", "OBITUARY", "OBIT", "FUNERAL", "VIP PASS", "CONCERT",
  "FESTIVAL", "TRAFFIC JAM", "ROAD CLOSURE", "NEIGHBOURHOOD",
  "CELEBRATION", "WEDDING", "MARRIAGE", "DROWN", "SUICIDE", "THEFT",
  "ROBBERY", "KIDNAP", "MOLESTATION", "CORRUPTION CASE", "SCAM",
  "SENSEX", "NIFTY", "MUTUAL FUND", "D-STREET", "WALL STREET",
  "STOCK MARKET", "FLEXICAP", "MULTICAP", "DATING APP", "VIRAL",
  "DETAINED", "CLASH", "ENCOUNTER", "PROTEST", "RALLY", "ROAD ACCIDENT",
  "FIRE BREAKS", "FIRE IN", "RESCUE", "HYPERLOCAL", "BOARD RESULT",
  "RECRUITMENT", "HOROSCOPE", "STAMPEDE", "MANHANDLED", "PAPER LEAK",
  "DIGITAL ARREST", "RAT POISON", "SMUGGLING", "KILLED", "GAS LEAK",
  "BLAST", "EXPLOSION", "COLLISION",
];

/** True if the item is obvious noise and should be dropped pre-LLM. */
export function isExcluded(title: string, body = ""): boolean {
  if (isEphemeralTrivia(title, body)) return true;
  const hay = `${title} ${body}`.toUpperCase();
  return EXCLUDE_KEYWORDS.some((kw) => hay.includes(kw));
}

// ------------------------------------------------------------
// Policy-relevance confidence (applied to WIRE sources only —
// primary/world sources are relevant by construction)
// ------------------------------------------------------------
const POLICY_KEYWORDS = [
  "policy", "ministry", "government", "cabinet", "regulation", "directive",
  "scheme", "programme", "program", "budget", "act", "bill", "parliament",
  "lok sabha", "rajya sabha", "notification", "circular", "reform",
  "initiative", "guideline", "framework", "committee", "allocation", "fund",
  "subsidy", "tax", "tariff", "treaty", "agreement", "mou", "rbi",
  "reserve bank", "inflation", "gdp", "fiscal", "monetary", "exports",
  "imports", "trade", "supreme court", "high court", "gazette",
];

/** Confidence 0–1 that a wire item is administratively relevant. */
export function policyConfidence(title: string, body: string, source: string): number {
  const hay = `${title} ${body} ${source}`.toLowerCase();
  let score = 0;
  for (const kw of POLICY_KEYWORDS) if (hay.includes(kw)) score++;
  if (/ministry|government|india|parliament/.test(title.toLowerCase())) score += 3;
  return Math.min(score / 8, 1);
}
