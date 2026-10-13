/**
 * server-lib/seo/indexnow.ts
 *
 * Instant search engine indexing protocol (Bing, Microsoft Copilot, Yandex, Seznam).
 * Automatically notifies index engines when new intelligence or daily editions are published.
 */

export const INDEXNOW_KEY = 'e49286d54c56471291dc671e58500a13';
export const INDEXNOW_HOST = 'tark.live';
export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export interface IndexNowResponse {
  ok: boolean;
  status: number;
  message: string;
  submittedCount: number;
}

/**
 * Submits a list of absolute URLs to the IndexNow protocol endpoint.
 * Bing & participating search engines distribute to crawlers within minutes.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResponse> {
  if (!urls || urls.length === 0) {
    return { ok: true, status: 200, message: 'No URLs provided', submittedCount: 0 };
  }

  // Ensure absolute URLs on tark.live and deduplicate
  const cleanUrls = Array.from(
    new Set(
      urls
        .map((u) => u.trim())
        .filter((u) => u.startsWith('https://tark.live') || u.startsWith('http://tark.live'))
    )
  );

  if (cleanUrls.length === 0) {
    return { ok: false, status: 400, message: 'No valid tark.live URLs found', submittedCount: 0 };
  }

  // IndexNow allows up to 10,000 URLs per request
  const batch = cleanUrls.slice(0, 10000);

  const payload = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: batch,
  };

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Tark-SEO-Engine/1.0',
      },
      body: JSON.stringify(payload),
    });

    const isSuccess = res.status === 200 || res.status === 202;
    const resText = await res.text().catch(() => '');

    if (isSuccess) {
      console.log(`[indexnow] Successfully submitted ${batch.length} URLs (status: ${res.status})`);
      return {
        ok: true,
        status: res.status,
        message: `Submitted ${batch.length} URLs to IndexNow (status: ${res.status})`,
        submittedCount: batch.length,
      };
    } else {
      console.warn(`[indexnow] Warning: status ${res.status} - ${resText}`);
      return {
        ok: false,
        status: res.status,
        message: `IndexNow returned status ${res.status}: ${resText}`,
        submittedCount: batch.length,
      };
    }
  } catch (err: any) {
    console.error('[indexnow] Network fault submitting to IndexNow:', err);
    return {
      ok: false,
      status: 500,
      message: err?.message || 'Network error',
      submittedCount: 0,
    };
  }
}
