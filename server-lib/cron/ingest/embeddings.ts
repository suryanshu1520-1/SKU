/**
 * server-lib/cron/ingest/embeddings.ts
 *
 * Pluggable, zero-cost-first embedder for Tier-2 clustering.
 *
 *   - GEMINI_API_KEY present → Gemini `text-embedding-004` (free tier, semantic).
 *   - otherwise             → a local lexical embedder (hashed bag-of-words,
 *                             offline, $0). Lower quality but it still catches
 *                             the "3 outlets, same release" near-duplicate case,
 *                             and it means clustering NEVER depends on an API.
 *
 * Each embedder advertises its own cosine `threshold`, since semantic and
 * lexical similarity live on different scales.
 */

import { GoogleGenAI } from "@google/genai";

export type Embedder = {
  mode: "gemini" | "local";
  /** Cosine similarity at/above which two items are "the same story". */
  threshold: number;
  /** Embed a batch of texts. Always resolves; falls back per-item on error. */
  embed: (texts: string[]) => Promise<number[][]>;
};

function env(name: string): string | undefined {
  const p = (globalThis as any)?.process;
  return p && p.env ? (p.env[name] as string | undefined) : undefined;
}

export function cosine(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are stored L2-normalized, so dot product == cosine
}

function l2normalize(v: number[]): number[] {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n);
  if (n === 0) return v;
  return v.map((x) => x / n);
}

// ------------------------------------------------------------
// Local lexical embedder (offline fallback)
// ------------------------------------------------------------
const DIM = 512;
const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "at", "by",
  "is", "are", "was", "were", "be", "as", "with", "that", "this", "it", "its",
  "from", "has", "have", "will", "would", "s", "said", "says", "new", "over",
]);

function hashToken(t: string): number {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % DIM;
}

export function localEmbed(text: string): number[] {
  const v = new Array<number>(DIM).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
  for (const t of tokens) v[hashToken(t)] += 1;
  return l2normalize(v);
}

const LOCAL: Embedder = {
  mode: "local",
  threshold: 0.62,
  embed: async (texts) => texts.map(localEmbed),
};

// ------------------------------------------------------------
// Gemini embedder (semantic, free tier)
// ------------------------------------------------------------
const GEMINI_EMBED_MODEL = env("GEMINI_EMBED_MODEL") || "text-embedding-004";

function geminiEmbedder(key: string): Embedder {
  const ai = new GoogleGenAI({ apiKey: key });
  return {
    mode: "gemini",
    threshold: 0.82,
    embed: async (texts) => {
      const out: number[][] = [];
      for (const text of texts) {
        try {
          const res: any = await ai.models.embedContent({
            model: GEMINI_EMBED_MODEL,
            contents: text.slice(0, 2000),
          });
          const values: number[] =
            res?.embeddings?.[0]?.values ?? res?.embedding?.values ?? [];
          out.push(values.length ? l2normalize(values) : localEmbed(text));
        } catch (err: any) {
          console.warn(`[ingest][embed] gemini failed, local fallback: ${err?.message ?? err}`);
          out.push(localEmbed(text));
        }
      }
      return out;
    },
  };
}

/** Resolve the best available embedder for this environment. */
export function getEmbedder(): Embedder {
  const key = env("GEMINI_API_KEY");
  if (key) return geminiEmbedder(key);
  console.warn("[ingest][embed] no GEMINI_API_KEY — using local lexical embedder for clustering");
  return LOCAL;
}
