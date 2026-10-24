import fs from 'node:fs';
import path from 'node:path';
import { getRunDir } from './run-dir.js';

export const USER_AGENT = 'Mozilla/5.0 (compatible; TarkQbankBot/1.0; +https://www.tark.live)';

export interface RequestLogEntry {
  host: string;
  url: string;
  status: number;
  startedAt: number;
}

export const requestLog: RequestLogEntry[] = [];

export interface PoliteFetchOptions {
  conditional?: {
    etag?: string | null;
    lastModified?: string | null;
  };
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  runDir?: string;
}

export interface PoliteFetchResult {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  finalUrl: string;
  requestedAt: string;
}

interface HostState {
  lock: Promise<void>;
  lastStartAt: number;
}

const hostStates = new Map<string, HostState>();

export function resetHttpState(): void {
  hostStates.clear();
  requestLog.length = 0;
  robotsCache.clear();
}

function parseRetryAfter(header: string | null | undefined, nowMs: number): number {
  if (!header) return 0;
  const seconds = Number(header);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - nowMs);
  }
  return 0;
}

export async function politeFetch(
  url: string,
  options?: PoliteFetchOptions
): Promise<PoliteFetchResult> {
  const fetchImpl = options?.fetchImpl || globalThis.fetch;
  const sleep = options?.sleep || ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = options?.now || (() => Date.now());

  const parsedUrl = new URL(url);
  const host = parsedUrl.host;

  let state = hostStates.get(host);
  if (!state) {
    state = { lock: Promise.resolve(), lastStartAt: 0 };
    hostStates.set(host, state);
  }

  // Mutex per host
  const priorLock = state.lock;
  let releaseLock: () => void = () => {};
  state.lock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  await priorLock;

  try {
    const elapsed = now() - state.lastStartAt;
    if (state.lastStartAt > 0 && elapsed < 3000) {
      const waitMs = 3000 - elapsed;
      await sleep(waitMs);
    }

    const startedAt = now();
    state.lastStartAt = startedAt;

    const retryDelays = [5000, 15000, 45000];
    let attempt = 0;

    while (true) {
      let response: Response | null = null;
      let fetchError: any = null;

      try {
        const reqHeaders: Record<string, string> = {
          'User-Agent': USER_AGENT,
        };
        if (options?.conditional?.etag) {
          reqHeaders['If-None-Match'] = options.conditional.etag;
        }
        if (options?.conditional?.lastModified) {
          reqHeaders['If-Modified-Since'] = options.conditional.lastModified;
        }

        response = await fetchImpl(url, {
          method: 'GET',
          headers: reqHeaders,
        });
      } catch (err) {
        fetchError = err;
      }

      if (fetchError) {
        if (attempt < 3) {
          const delay = retryDelays[attempt];
          attempt++;
          await sleep(delay);
          continue;
        }
        requestLog.push({ host, url, status: 0, startedAt });
        throw fetchError;
      }

      const status = response!.status;

      // Check if retryable: network error, 429, or 5xx
      const isRetryable = status === 429 || (status >= 500 && status < 600);
      if (isRetryable && attempt < 3) {
        const retryAfterHeader = response!.headers.get('retry-after');
        const retryAfterMs = parseRetryAfter(retryAfterHeader, now());
        const delay = Math.max(retryDelays[attempt], retryAfterMs);
        attempt++;
        await sleep(delay);
        continue;
      }

      requestLog.push({ host, url, status, startedAt });

      const headers: Record<string, string> = {};
      response!.headers.forEach((val, key) => {
        headers[key.toLowerCase()] = val;
      });

      const arrayBuf = await response!.arrayBuffer();
      const body = Buffer.from(arrayBuf);
      const finalUrl = response!.url || url;

      return {
        status,
        headers,
        body,
        finalUrl,
        requestedAt: new Date(startedAt).toISOString(),
      };
    }
  } finally {
    releaseLock();
  }
}

export interface RobotsRule {
  type: 'allow' | 'disallow';
  pattern: string;
}

export function parseRobotsTxt(content: string): RobotsRule[] {
  const lines = content.split(/\r?\n/);
  const rules: RobotsRule[] = [];

  let inStarGroup = false;

  for (let rawLine of lines) {
    const hashIdx = rawLine.indexOf('#');
    if (hashIdx !== -1) {
      rawLine = rawLine.slice(0, hashIdx);
    }
    const line = rawLine.trim();
    if (!line) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const field = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (field === 'user-agent') {
      if (value === '*') {
        inStarGroup = true;
      } else {
        inStarGroup = false;
      }
    } else if (inStarGroup) {
      if (field === 'disallow' || field === 'allow') {
        // ignore any value that starts with http
        if (/^https?:\/\//i.test(value)) {
          continue;
        }
        if (!value) {
          // Empty disallow means allow all / resets
          continue;
        }
        rules.push({
          type: field === 'allow' ? 'allow' : 'disallow',
          pattern: value,
        });
      }
    }
  }

  return rules;
}

export function isAllowedByRules(targetPath: string, rules: RobotsRule[]): boolean {
  let longestMatch: RobotsRule | null = null;
  let maxLen = -1;

  for (const rule of rules) {
    if (targetPath.startsWith(rule.pattern)) {
      if (rule.pattern.length > maxLen) {
        maxLen = rule.pattern.length;
        longestMatch = rule;
      } else if (rule.pattern.length === maxLen && rule.type === 'allow') {
        longestMatch = rule;
      }
    }
  }

  if (!longestMatch) {
    return true;
  }

  return longestMatch.type === 'allow';
}

const robotsCache = new Map<string, RobotsRule[]>();

export async function robotsAllowed(
  url: string,
  options?: {
    runDir?: string;
    fetchImpl?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
  }
): Promise<boolean> {
  const parsed = new URL(url);
  const host = parsed.host;

  let rules = robotsCache.get(host);
  if (!rules) {
    const robotsUrl = `https://${host}/robots.txt`;
    let robotsText = '';
    try {
      const res = await politeFetch(robotsUrl, {
        fetchImpl: options?.fetchImpl,
        sleep: options?.sleep,
        now: options?.now,
      });
      if (res.status === 200) {
        robotsText = res.body.toString('utf-8');
        const rDir = options?.runDir || getRunDir();
        try {
          const robotsFile = path.join(rDir, 'manifest', 'robots', `${host}.txt`);
          fs.mkdirSync(path.dirname(robotsFile), { recursive: true });
          fs.writeFileSync(robotsFile, robotsText, 'utf-8');
        } catch {
          // ignore layout write error
        }
      } else if (res.status >= 400 && res.status < 500) {
        // 404 or any 4xx means allowed
        robotsText = '';
      }
    } catch {
      // network failure on robots.txt -> treat as allowed
      robotsText = '';
    }

    rules = parseRobotsTxt(robotsText);
    robotsCache.set(host, rules);
  }

  const targetPath = parsed.pathname + parsed.search;
  return isAllowedByRules(targetPath, rules);
}
