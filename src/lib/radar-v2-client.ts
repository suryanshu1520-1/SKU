/**
 * src/lib/radar-v2-client.ts
 *
 * Client cache and batching layer for Radar API v2:
 * - Coalescing batcher for /by-dispatch and /authorities
 * - Memoiser for node signals from /api/policy-radar/v2
 * - Safe null fallback on network/status error (never throws into render)
 * TASK_085Q2
 */

export interface DispatchLineage {
  program_slug: string;
  program_name: string;
  ring: number;
  instrument: string;
  gap_sentence: string | null;
  evidence: {
    quote: string;
    source_url: string;
    span_id?: string;
  };
}

export interface NodeSignalClient {
  node_id: string;
  x_recent: number;
  n_baseline: number;
  expected: number;
  p: number;
  score: number;
  surging: boolean;
  exam_weight: number;
  computed_at: string;
  title?: string;
}

export interface AuthorityClient {
  slug: string;
  authority: string;
  tier_number: number | null;
  legal_basis_kind: string | null;
  legal_basis_ref: string | null;
  source_url: string | null;
}

export interface BatcherOptions {
  max?: number;
  waitMs?: number;
}

export function createBatcher<K extends string, V>(
  fetchMany: (keys: K[]) => Promise<Record<string, V>>,
  options?: BatcherOptions
) {
  const max = options?.max ?? 50;
  const waitMs = options?.waitMs ?? 25;

  const cache = new Map<string, V | null>();
  const pendingQueue = new Map<
    K,
    Array<{ resolve: (val: V | null) => void; reject: (err: any) => void }>
  >();
  let timer: any = null;

  function flush() {
    timer = null;
    if (pendingQueue.size === 0) return;

    // Grab up to max distinct keys
    const entries = Array.from(pendingQueue.entries());
    const chunk = entries.slice(0, max);
    chunk.forEach(([k]) => pendingQueue.delete(k));

    // If more remain in the queue, schedule another flush
    if (pendingQueue.size > 0) {
      timer = setTimeout(flush, 0);
    }

    const keys = chunk.map(([k]) => k);
    fetchMany(keys)
      .then((results) => {
        for (const [k, listeners] of chunk) {
          const val = results && k in results ? results[k] : null;
          cache.set(k, val);
          listeners.forEach((l) => l.resolve(val));
        }
      })
      .catch(() => {
        for (const [k, listeners] of chunk) {
          cache.set(k, null);
          listeners.forEach((l) => l.resolve(null));
        }
      });
  }

  return {
    get(key: K): Promise<V | null> {
      if (cache.has(key)) {
        return Promise.resolve(cache.get(key) ?? null);
      }

      return new Promise<V | null>((resolve, reject) => {
        let listeners = pendingQueue.get(key);
        if (!listeners) {
          listeners = [];
          pendingQueue.set(key, listeners);
        }
        listeners.push({ resolve, reject });

        if (!timer) {
          timer = setTimeout(flush, waitMs);
        }
      });
    },
    _cache: cache,
  };
}

// 1. Dispatch Lineage Batcher (max 50)
const dispatchBatcher = createBatcher<string, DispatchLineage>(
  async (ids) => {
    try {
      const res = await fetch(`/api/policy-radar/v2/by-dispatch?ids=${ids.join(",")}`);
      if (!res.ok) return {};
      const data = await res.json();
      if (!data || typeof data !== "object" || data.status === "paused" || data.status === "unavailable") {
        return {};
      }
      return data;
    } catch {
      return {};
    }
  },
  { max: 50, waitMs: 25 }
);

export function getDispatchLineage(id: string): Promise<DispatchLineage | null> {
  if (!id) return Promise.resolve(null);
  return dispatchBatcher.get(id);
}

// 2. Node Signals (single memoised fetch)
let nodeSignalsPromise: Promise<Map<string, NodeSignalClient> | null> | null = null;

export function resetNodeSignalsCache(): void {
  nodeSignalsPromise = null;
}

export function getNodeSignals(): Promise<Map<string, NodeSignalClient> | null> {
  if (nodeSignalsPromise) {
    return nodeSignalsPromise;
  }

  nodeSignalsPromise = (async () => {
    try {
      const res = await fetch("/api/policy-radar/v2");
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status !== "ok" && data.status !== "stale") {
        return null;
      }
      const map = new Map<string, NodeSignalClient>();
      for (const sig of data.node_signals ?? []) {
        if (sig && sig.node_id) {
          map.set(sig.node_id, sig);
        }
      }
      return map;
    } catch {
      return null;
    }
  })();

  return nodeSignalsPromise;
}

export async function getNodeSignal(nodeId: string): Promise<NodeSignalClient | null> {
  if (!nodeId) return null;
  const signals = await getNodeSignals();
  return signals?.get(nodeId) ?? null;
}

// 3. Authorities Batcher (max 20)
const authorityBatcher = createBatcher<string, AuthorityClient>(
  async (slugs) => {
    try {
      const res = await fetch(`/api/policy-radar/v2/authorities?slugs=${slugs.join(",")}`);
      if (!res.ok) return {};
      const rows = await res.json();
      if (!Array.isArray(rows)) {
        return {};
      }
      const map: Record<string, AuthorityClient> = {};
      for (const r of rows) {
        if (r?.slug) {
          map[r.slug] = r;
        }
      }
      return map;
    } catch {
      return {};
    }
  },
  { max: 20, waitMs: 25 }
);

export function getAuthority(slug: string): Promise<AuthorityClient | null> {
  if (!slug) return Promise.resolve(null);
  return authorityBatcher.get(slug);
}

export async function getFirstAuthority(slugs: string[]): Promise<AuthorityClient | null> {
  if (!slugs || slugs.length === 0) return null;
  for (const s of slugs) {
    const auth = await getAuthority(s);
    if (auth) return auth;
  }
  return null;
}
