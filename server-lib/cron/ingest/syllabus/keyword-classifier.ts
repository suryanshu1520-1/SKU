/**
 * server-lib/cron/ingest/syllabus/keyword-classifier.ts
 *
 * Deterministic keyword & entity-overlap classifier (Rater B).
 * Used as an independent validation rater alongside the embedding-cosine relevance gate (Rater A).
 *
 * Operates purely on the existing SyllabusNode.entities (+ gloss fallback) in nodes.ts.
 * Zero external dependencies.
 */

import type { SyllabusNode } from "./types.js";

export type KeywordMatch = {
  nodeId: string;
  score: number;
  matchedEntities: string[];
};

export type KeywordGateResult = {
  passed: boolean;
  topScore: number;
  matches: KeywordMatch[];
};

export type KeywordGateConfig = {
  topK: number;
  minScore: number;
};

export const DEFAULT_KEYWORD_CONFIG: KeywordGateConfig = {
  topK: 3,
  minScore: 0.5,
};

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "at", "by",
  "is", "are", "was", "were", "be", "as", "with", "that", "this", "it", "its",
  "from", "has", "have", "will", "would", "s", "said", "says", "new", "over",
  "also", "into", "their", "under", "after", "been", "which", "more", "other"
]);

function normalizeText(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Classify a claim text against syllabus nodes using entity and gloss keyword matching.
 */
export function keywordClassify(
  text: string,
  nodes: SyllabusNode[],
  cfg: KeywordGateConfig = DEFAULT_KEYWORD_CONFIG
): KeywordGateResult {
  const normText = ` ${normalizeText(text)} `;
  const words = normText.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const wordSet = new Set(words);

  const candidateMatches: KeywordMatch[] = [];

  for (const node of nodes) {
    let score = 0;
    const matchedEntities: string[] = [];

    // 1. High-signal entity matching (entities are curated acronyms and key phrases)
    for (const entity of node.entities) {
      const normEntity = normalizeText(entity);
      if (!normEntity) continue;

      // Check phrase or word containment
      if (normText.includes(` ${normEntity} `)) {
        score += 2.0 + normEntity.split(" ").length * 0.5;
        matchedEntities.push(entity);
      } else if (normEntity.includes(" ")) {
        // Multi-word entity: check if all individual terms are present
        const entityWords = normEntity.split(" ");
        const allPresent = entityWords.every((ew) => wordSet.has(ew));
        if (allPresent) {
          score += 1.5;
          matchedEntities.push(entity);
        }
      }
    }

    // 2. Gloss keyword fallback (secondary signal)
    const normGloss = normalizeText(node.gloss);
    const glossWords = normGloss.split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w));
    let glossHits = 0;
    for (const gw of glossWords) {
      if (wordSet.has(gw)) {
        glossHits++;
      }
    }
    if (glossWords.length > 0) {
      score += Math.min(glossHits * 0.15, 1.5);
    }

    if (score >= cfg.minScore) {
      candidateMatches.push({
        nodeId: node.id,
        score: Math.round(score * 100) / 100,
        matchedEntities,
      });
    }
  }

  candidateMatches.sort((a, b) => b.score - a.score);

  return {
    passed: candidateMatches.length > 0,
    topScore: candidateMatches.length ? candidateMatches[0].score : 0,
    matches: candidateMatches.slice(0, cfg.topK),
  };
}
