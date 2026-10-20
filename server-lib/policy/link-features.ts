/**
 * server-lib/policy/link-features.ts
 *
 * Link feature extraction for policy event pair classification.
 * Generates 7-dimensional normalized feature vectors:
 * [x1 shared actor, x2 shared node_id, x3 Jaccard(entity sets), x4 cosine(embeddings),
 *  x5 1[ring(e)-ring(f) in {0,1}], x6 -log1p(days)/log(366), x7 explicit reference]
 * TASK_085K
 */

export interface EventFeatureInput {
  id: string;
  actor_slug?: string | null;
  node_id?: string | null;
  entities?: string[];
  embedding?: number[] | null;
  ring: number;
  date: string; // YYYY-MM-DD
}

export interface LinkFeatureContext {
  explicitReference?: boolean;
}

export function cosineSim(a?: number[] | null, b?: number[] | null): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA <= 0 || normB <= 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function setJaccard(a?: string[], b?: string[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase().trim()).filter(Boolean));
  const setB = new Set(b.map((s) => s.toLowerCase().trim()).filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;

  let inter = 0;
  for (const item of setA) {
    if (setB.has(item)) inter++;
  }
  const union = setA.size + setB.size - inter;
  return union > 0 ? inter / union : 0;
}

export function daysDiff(olderDate: string, newerDate: string): number {
  const t1 = new Date(olderDate).getTime();
  const t2 = new Date(newerDate).getTime();
  if (isNaN(t1) || isNaN(t2)) return 0;
  const diffDays = Math.max(0, Math.round((t2 - t1) / (24 * 3600 * 1000)));
  return Math.min(diffDays, 365);
}

/**
 * Extracts 7-dimensional normalized feature vector for event pair (f, e).
 * f is the earlier/source event, e is the later/target event.
 */
export function extractLinkFeatures(
  f: EventFeatureInput,
  e: EventFeatureInput,
  ctx: LinkFeatureContext = {}
): number[] {
  // x1: shared actor
  const x1 =
    f.actor_slug && e.actor_slug && f.actor_slug === e.actor_slug ? 1 : 0;

  // x2: shared syllabus node_id
  const x2 = f.node_id && e.node_id && f.node_id === e.node_id ? 1 : 0;

  // x3: Jaccard similarity of entity sets
  const x3 = setJaccard(f.entities, e.entities);

  // x4: Cosine similarity of event embeddings
  const x4 = cosineSim(f.embedding, e.embedding);

  // x5: Ring step indicator: 1 if ring(e) - ring(f) is 0 or 1, else 0
  const ringDiff = e.ring - f.ring;
  const x5 = ringDiff === 0 || ringDiff === 1 ? 1 : 0;

  // x6: Time decay: -log1p(days) / log(366)
  const days = daysDiff(f.date, e.date);
  const x6 = -Math.log1p(days) / Math.log(366);

  // x7: Explicit reference present
  const x7 = ctx.explicitReference ? 1 : 0;

  return [x1, x2, x3, x4, x5, x6, x7];
}
