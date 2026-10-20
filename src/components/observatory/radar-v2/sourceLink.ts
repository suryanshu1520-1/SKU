/**
 * src/components/observatory/radar-v2/sourceLink.ts
 *
 * Deterministic source link builder with Scroll-to-Text-Fragment support.
 * TASK_085Q
 */

import type { Evidence } from "../../../lib/policy-radar-v2-types.ts";

export function sourceHref(e: Evidence | { source_url: string; quote: string }): string {
  if (!e || !e.source_url) return "";
  if (e.source_url.includes("#")) {
    return e.source_url;
  }
  if (!e.quote || typeof e.quote !== "string") {
    return e.source_url;
  }

  const words = e.quote.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return e.source_url;
  }

  const firstWords = words.slice(0, 8).join(" ");
  const encoded = encodeURIComponent(firstWords).replace(/-/g, "%2D");
  return `${e.source_url}#:~:text=${encoded}`;
}

export function sourceLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}
