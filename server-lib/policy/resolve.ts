/**
 * server-lib/policy/resolve.ts
 *
 * Deterministic, bilingual, precision-first entity resolver.
 * Maps an organisation mention to a canonical registry slug or returns ambiguous/unknown.
 */

import { normUnicode } from "../text/normalize.ts";

export type AliasRow = {
  alias_norm: string;
  entity_slug: string;
};

export type ResolveResult =
  | { status: "resolved"; slug: string; score: number; via: "exact" | "fuzzy" }
  | { status: "ambiguous"; candidates: { slug: string; score: number }[] }
  | { status: "unknown"; candidates: { slug: string; score: number }[] };

export interface ResolverIndex {
  exactMap: Map<string, string>;
  tokenIndex: Map<string, Array<{ slug: string; alias_norm: string }>>;
  allRows: AliasRow[];
}

export interface ResolveConfig {
  accept?: number;
  margin?: number;
}

const DEFAULT_CONFIG: Required<ResolveConfig> = {
  accept: 0.94,
  margin: 0.04,
};

const SIMILARITY_STOP_WORDS = new Set([
  "and",
  "of",
  "the",
  "एवं",
  "और",
  "का",
  "की",
  "के",
]);

/**
 * Normalises an alias string:
 *  - normUnicode (strips ZWJ/ZWNJ, combines NFKC, trims punctuation)
 *  - Strips leading "the "
 */
export function aliasNorm(s: string): string {
  let norm = normUnicode(s);
  if (norm.startsWith("the ")) {
    norm = norm.slice(4).trim();
  }
  return norm;
}

/**
 * Strips similarity stop words ONLY for fuzzy metric calculation.
 */
function stripStopWords(s: string): string {
  return s
    .split(/\s+/)
    .filter((w) => w && !SIMILARITY_STOP_WORDS.has(w))
    .join(" ")
    .trim();
}

/**
 * Generates alias variants from a display string.
 * e.g., "India Semiconductor Mission (ISM)" ->
 * ["india semiconductor mission (ism)", "india semiconductor mission", "ism"]
 */
export function aliasVariants(display: string): string[] {
  const variants = new Set<string>();
  const base = aliasNorm(display);
  if (base) variants.add(base);

  const parenMatch = display.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (parenMatch) {
    const main = aliasNorm(parenMatch[1]);
    const acronym = aliasNorm(parenMatch[2]);
    if (main) variants.add(main);
    if (acronym) variants.add(acronym);
  }

  return Array.from(variants);
}

/**
 * Standard Jaro distance computation.
 */
function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchDist = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
}

/**
 * Standard Jaro-Winkler metric with prefix scaling factor p = 0.1, max prefix 4.
 */
export function jaroWinkler(a: string, b: string, p = 0.1): number {
  const jaro = jaroSimilarity(a, b);
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(a.length, b.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * p * (1 - jaro);
}

/**
 * Token Set Jaccard similarity: |SetA ∩ SetB| / |SetA ∪ SetB|.
 * Uses raw whitespace tokens.
 */
export function tokenSetJaccard(a: string, b: string): number {
  const wordsA = a.split(/\s+/).filter((w) => w.length > 0);
  const wordsB = b.split(/\s+/).filter((w) => w.length > 0);

  if (wordsA.length === 0 && wordsB.length === 0) return 1.0;
  if (wordsA.length === 0 || wordsB.length === 0) return 0.0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);

  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0.0 : intersection / union;
}

/**
 * Builds an in-memory resolver index from alias rows.
 */
export function buildIndex(rows: AliasRow[]): ResolverIndex {
  const exactMap = new Map<string, string>();
  const tokenIndex = new Map<string, Array<{ slug: string; alias_norm: string }>>();

  for (const row of rows) {
    exactMap.set(row.alias_norm, row.entity_slug);

    const stripped = stripStopWords(row.alias_norm);
    const tokens = stripped.split(/\s+/).filter((t) => t.length > 1);

    for (const token of tokens) {
      let list = tokenIndex.get(token);
      if (!list) {
        list = [];
        tokenIndex.set(token, list);
      }
      list.push({ slug: row.entity_slug, alias_norm: row.alias_norm });
    }
  }

  return {
    exactMap,
    tokenIndex,
    allRows: rows,
  };
}

/**
 * Resolves an entity mention against the registry index.
 */
export function resolve(
  mention: string,
  idx: ResolverIndex,
  cfg: ResolveConfig = {}
): ResolveResult {
  const accept = cfg.accept ?? DEFAULT_CONFIG.accept;
  const margin = cfg.margin ?? DEFAULT_CONFIG.margin;

  const normMention = aliasNorm(mention);

  // Rule 3: Mentions shorter than 3 characters after normalisation -> unknown
  if (normMention.length < 3) {
    return { status: "unknown", candidates: [] };
  }

  // Rule 2.1: Exact alias_norm hit
  if (idx.exactMap.has(normMention)) {
    const slug = idx.exactMap.get(normMention)!;
    return { status: "resolved", slug, score: 1.0, via: "exact" };
  }

  // Rule 2.2: Candidates sharing >= 1 non-stop token
  const strippedMention = stripStopWords(normMention);
  const tokens = strippedMention.split(/\s+/).filter((t) => t.length > 1);

  const matchedAliasesBySlug = new Map<string, Set<string>>();

  for (const token of tokens) {
    const list = idx.tokenIndex.get(token);
    if (list) {
      for (const entry of list) {
        let set = matchedAliasesBySlug.get(entry.slug);
        if (!set) {
          set = new Set();
          matchedAliasesBySlug.set(entry.slug, set);
        }
        set.add(entry.alias_norm);
      }
    }
  }

  const slugScores: Array<{ slug: string; score: number }> = [];

  for (const [slug, aliasSet] of matchedAliasesBySlug.entries()) {
    let maxEntityScore = 0;
    for (const alias of aliasSet) {
      const strippedAlias = stripStopWords(alias);
      const jw = jaroWinkler(strippedMention, strippedAlias);
      const jaccard = tokenSetJaccard(strippedMention, strippedAlias);
      const s = Math.max(jw, jaccard);
      if (s > maxEntityScore) {
        maxEntityScore = s;
      }
    }
    slugScores.push({ slug, score: Math.round(maxEntityScore * 10000) / 10000 });
  }

  slugScores.sort((a, b) => b.score - a.score);

  if (slugScores.length === 0) {
    return { status: "unknown", candidates: [] };
  }

  const top = slugScores[0].score;
  const second = slugScores[1]?.score ?? 0;

  if (top >= accept && top - second >= margin) {
    return { status: "resolved", slug: slugScores[0].slug, score: top, via: "fuzzy" };
  }

  if (top >= accept) {
    return { status: "ambiguous", candidates: slugScores.slice(0, 5) };
  }

  return { status: "unknown", candidates: slugScores.slice(0, 5) };
}
