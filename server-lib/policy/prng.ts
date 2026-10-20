/**
 * server-lib/policy/prng.ts
 *
 * Deterministic pseudo-random number generation for radar boss MCQ generation and evaluation.
 * TASK_085O / TASK_085R
 */

/**
 * 32-bit FNV-1a hash over UTF-16 code units.
 */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Mulberry32 32-bit PRNG generator.
 * Returns a generator function yielding uniform pseudo-random floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
