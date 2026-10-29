/**
 * server-lib/news/worker.ts
 *
 * Conditional-Fetch Fast-Path & Durable Pipeline Execution (Phase 2).
 *
 * Implements Stage B of the target processing architecture:
 *   - Conditional HTTP checks (`If-None-Match` / `If-Modified-Since`)
 *   - Zero extraction compute when upstream returns `304 Not Modified`
 *   - Cryptographic content fingerprinting (SHA-256)
 *   - Safe host validation and bounded payloads
 */

import crypto from "node:crypto";
import { gotScraping } from "got-scraping";
import { validateHost } from "./source-policy.js";

export interface ConditionalFetchResult {
  statusCode: number;
  notModified: boolean;
  body: string | null;
  etag: string | null;
  lastModified: string | null;
  contentHash: string | null;
  charLength: number;
}

/**
 * Computes deterministic SHA-256 hash of normalized text.
 */
export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text.trim()).digest("hex");
}

/**
 * Executes a conditional HTTP fetch with If-None-Match / If-Modified-Since.
 * Returns notModified: true on HTTP 304 without burning extraction compute.
 */
export async function executeConditionalFetch(
  url: string,
  sourceId: string,
  opts?: {
    etag?: string | null;
    lastModified?: string | null;
    timeoutMs?: number;
  }
): Promise<ConditionalFetchResult> {
  // 1. Host approval boundary
  if (!validateHost(url, sourceId)) {
    console.warn(`[news-worker] Host rejected by source policy for ${sourceId}: ${url}`);
    return {
      statusCode: 403,
      notModified: false,
      body: null,
      etag: null,
      lastModified: null,
      contentHash: null,
      charLength: 0,
    };
  }

  const headers: Record<string, string> = {};
  if (opts?.etag) {
    headers["if-none-match"] = opts.etag;
  }
  if (opts?.lastModified) {
    headers["if-modified-since"] = opts.lastModified;
  }

  try {
    const res = await gotScraping({
      url,
      headers,
      headerGeneratorOptions: {
        browsers: [{ name: "chrome", minVersion: 118 }],
        devices: ["desktop"],
        locales: ["en-US", "en"],
        operatingSystems: ["windows", "linux"],
      },
      timeout: { request: opts?.timeoutMs ?? 20_000 },
      retry: { limit: 1 },
      throwHttpErrors: false,
      responseType: "text",
    });

    const statusCode = res.statusCode;
    const resEtag = (res.headers["etag"] as string) || null;
    const resLastModified = (res.headers["last-modified"] as string) || null;

    if (statusCode === 304) {
      // 304 Not Modified Fast-Path: Zero body extraction compute consumed!
      return {
        statusCode: 304,
        notModified: true,
        body: null,
        etag: resEtag || opts?.etag || null,
        lastModified: resLastModified || opts?.lastModified || null,
        contentHash: null,
        charLength: 0,
      };
    }

    if (statusCode >= 400) {
      console.warn(`[news-worker] HTTP ${statusCode} for ${url}`);
      return {
        statusCode,
        notModified: false,
        body: null,
        etag: resEtag,
        lastModified: resLastModified,
        contentHash: null,
        charLength: 0,
      };
    }

    const bodyText = typeof res.body === "string" ? res.body : null;
    const charLength = bodyText ? bodyText.length : 0;
    const contentHash = bodyText ? sha256(bodyText) : null;

    return {
      statusCode,
      notModified: false,
      body: bodyText,
      etag: resEtag,
      lastModified: resLastModified,
      contentHash,
      charLength,
    };
  } catch (err: any) {
    console.warn(`[news-worker] Conditional fetch failed for ${url}:`, err?.message ?? err);
    return {
      statusCode: 500,
      notModified: false,
      body: null,
      etag: null,
      lastModified: null,
      contentHash: null,
      charLength: 0,
    };
  }
}

