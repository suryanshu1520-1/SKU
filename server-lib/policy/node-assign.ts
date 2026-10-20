/**
 * server-lib/policy/node-assign.ts
 *
 * Deterministic syllabus node classification for current affairs stories.
 * Evaluates headline, bullets, and tags against the syllabus taxonomy without LLM cost.
 */

import { keywordClassify } from "../cron/ingest/syllabus/keyword-classifier.ts";
import { loadNodes, nodeById } from "../cron/ingest/syllabus/nodes.ts";

export interface NodeAssignInput {
  headline: string;
  bullets?: string[];
  tags?: string[];
}

export interface NodeAssignResult {
  nodeId: string | null;
  score: number;
  runnerUp: string | null;
}

export function assignNode(input: NodeAssignInput): NodeAssignResult {
  const parts: string[] = [];
  if (input.headline) parts.push(input.headline);
  if (Array.isArray(input.bullets) && input.bullets.length > 0) {
    parts.push(input.bullets.join(" "));
  }
  if (Array.isArray(input.tags) && input.tags.length > 0) {
    parts.push(input.tags.join(" "));
  }

  const text = parts.join(" ").trim();
  if (!text) {
    return { nodeId: null, score: 0, runnerUp: null };
  }

  const nodes = loadNodes();
  const result = keywordClassify(text, nodes);

  if (!result.passed || result.matches.length === 0) {
    return { nodeId: null, score: 0, runnerUp: null };
  }

  const topMatch = result.matches[0];
  const runnerUp = result.matches[1]?.nodeId ?? null;

  // Taxonomy guard: if nodeById(nodeId) is undefined, store null — never violate FK
  if (!nodeById(topMatch.nodeId)) {
    console.warn(`[node-assign] Node ${topMatch.nodeId} not found in taxonomy, returning null`);
    return { nodeId: null, score: topMatch.score, runnerUp };
  }

  return {
    nodeId: topMatch.nodeId,
    score: topMatch.score,
    runnerUp,
  };
}
