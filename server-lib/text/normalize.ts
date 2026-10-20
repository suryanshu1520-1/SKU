/**
 * server-lib/text/normalize.ts
 *
 * Unicode-safe and multilingual text normalization for Devanagari and Latin scripts.
 * Preserves combining marks (matras, viramas) and removes zero-width characters (ZWJ/ZWNJ).
 * TASK_085C
 */

export function normUnicode(t: string): string {
  if (!t) return "";
  return t
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200C\u200D]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
