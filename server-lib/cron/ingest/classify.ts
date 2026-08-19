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

function norm(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Derive a ministry tag from text. `fallback` lets primary sources supply a
 * sensible default (e.g. RBI -> "Reserve Bank of India").
 */
export function deriveMinistry(text: string, fallback = "Government of India"): string {
  const hay = ` ${norm(text)} `;
  for (const [ministry, aliases] of Object.entries(MINISTRY_ALIASES)) {
    for (const alias of aliases) {
      if (hay.includes(` ${norm(alias)} `)) return ministry;
    }
  }
  for (const ministry of CANONICAL_ENTITIES) {
    if (hay.includes(norm(ministry))) return ministry;
  }
  return fallback;
}

// ------------------------------------------------------------
// Hard exclusion filter (zero-cost pre-filter)
// ------------------------------------------------------------
const EXCLUDE_KEYWORDS = [
  "MURDER", "RAPE", "ACCIDENT", "ASSAULT", "ARRESTED", "DIED", "DEATH",
  "CREMATED", "CELEBRITY", "CINEMA", "FILM", "BOLLYWOOD", "CRIME",
  "AQUAPLANING", "OBITUARY", "OBIT", "FUNERAL", "VIP PASS", "CONCERT",
  "FESTIVAL", "TRAFFIC JAM", "ROAD CLOSURE", "NEIGHBOURHOOD",
  "CELEBRATION", "WEDDING", "MARRIAGE", "DROWN", "SUICIDE", "THEFT",
  "ROBBERY", "KIDNAP", "MOLESTATION", "CORRUPTION CASE", "SCAM",
  "SENSEX", "NIFTY", "MUTUAL FUND", "D-STREET", "WALL STREET",
  "STOCK MARKET", "FLEXICAP", "MULTICAP", "DATING APP", "VIRAL",
];

/** True if the item is obvious noise and should be dropped pre-LLM. */
export function isExcluded(title: string, body = ""): boolean {
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
