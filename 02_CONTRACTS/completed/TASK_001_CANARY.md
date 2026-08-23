---
task_id: "TASK_001_CANARY"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Claude 3.7 Flash (Thinking: Medium)"
thinking_tier: "medium"
token_budget:
  input_context_max: 3000
  thinking_budget_tokens: 2500
  output_diff_max: 1500
---

# 1. High-Density Distilled Objective
Create a self-contained TTL cache utility at `src/utils/canary_cache.ts` with a companion unit test at `src/utils/canary_cache.test.ts`. Closed when the module compiles, the test file passes with 100% branch coverage of the module, and the invalid-TTL edge case throws the exact named error.

# 2. Transcluded Context References
- No existing file to read — this is a new module. `src/utils/` does not yet exist; create it.
- Test runtime convention: this repo uses `tsx --test <file>` (see `package.json` → `"test": "tsx --test scripts/test-rebase-contract.ts"`). Do NOT assume `npm run test` will pick up the new test file automatically — it points at one hardcoded path. Run the new test directly (see §3).
- No pre-existing cache/TTL utility elsewhere in `src/` to conflict with (confirmed via `grep_search` before this contract was issued).

# 3. Mandatory Tool Chain & Execution Path
1. `write_to_file` → `src/utils/canary_cache.ts`
2. `write_to_file` → `src/utils/canary_cache.test.ts`
3. `run_command` → `npx tsc --noEmit src/utils/canary_cache.ts` (or `npm run lint:web` if faster) — must exit `0`
4. `run_command` → `npx tsx --test src/utils/canary_cache.test.ts` — must exit `0`
5. Self-heal (up to 2 passes) on any non-zero exit per `AGENT_CAPABILITIES.md` §4, then emit the receipt below.

# 4. Deterministic Acceptance Criteria
1. Exports a class/factory implementing:
   - `set(key: string, val: unknown, ttlMs: number): void`
   - `get(key: string): unknown | undefined` — returns `undefined` for missing or expired keys
   - `evictExpired(): number` — removes all expired entries, returns count evicted
2. `set(...)` with `ttlMs <= 0` throws an error named exactly `InvalidTTLExpression` (a distinct exported `Error` subclass, not a generic `Error`).
3. `get()` on an expired-but-not-yet-evicted key returns `undefined` (lazy expiry check on read, independent of `evictExpired()`).
4. Unit test suite covers every branch: fresh set/get, expired get, `evictExpired` count on 0/some/all expired, and the `ttlMs <= 0` throw (both `0` and negative).
5. `tsc --noEmit` clean and `tsx --test` exits 0 with no skipped/todo tests.
6. No dependency additions — stdlib/`Map` only.

# 5. Antigravity Proof-of-Work Receipt
_(filled in by Antigravity on completion — diff + telemetry YAML only, no prose)_

```yaml
telemetry:
  tools_invoked:
    - write_to_file: src/utils/canary_cache.ts
    - write_to_file: src/utils/canary_cache.test.ts
    - run_command: npm run lint:web
    - run_command: npx tsx --test src/utils/canary_cache.test.ts
  duration_ms: 2431
  exit_codes:
    npm run lint:web: 0
    npx tsx --test src/utils/canary_cache.test.ts: 0
  tests:
    total: 5
    passed: 5
    failed: 0
    skipped: 0
diff: |
  --- /dev/null
  +++ b/src/utils/canary_cache.ts
  @@ -0,0 +1,47 @@
  +export class InvalidTTLExpression extends Error {
  +  constructor(message = 'TTL must be greater than 0 ms') {
  +    super(message);
  +    this.name = 'InvalidTTLExpression';
  +    Object.setPrototypeOf(this, InvalidTTLExpression.prototype);
  +  }
  +}
  +
  +interface CacheEntry<T> {
  +  value: T;
  +  expiresAt: number;
  +}
  +
  +export class CanaryCache<T = unknown> {
  +  private readonly store = new Map<string, CacheEntry<T>>();
  +
  +  set(key: string, val: T, ttlMs: number): void {
  +    if (ttlMs <= 0) {
  +      throw new InvalidTTLExpression(`Invalid TTL: ${ttlMs}. TTL must be > 0.`);
  +    }
  +    const expiresAt = Date.now() + ttlMs;
  +    this.store.set(key, { value: val, expiresAt });
  +  }
  +
  +  get(key: string): T | undefined {
  +    const entry = this.store.get(key);
  +    if (!entry) {
  +      return undefined;
  +    }
  +    if (Date.now() >= entry.expiresAt) {
  +      return undefined;
  +    }
  +    return entry.value;
  +  }
  +
  +  evictExpired(): number {
  +    const now = Date.now();
  +    let evictedCount = 0;
  +    for (const [key, entry] of this.store.entries()) {
  +      if (now >= entry.expiresAt) {
  +        this.store.delete(key);
  +        evictedCount++;
  +      }
  +    }
  +    return evictedCount;
  +  }
  +}
  --- /dev/null
  +++ b/src/utils/canary_cache.test.ts
  @@ -0,0 +1,67 @@
  +import { describe, it } from 'node:test';
  +import assert from 'node:assert/strict';
  +import { CanaryCache, InvalidTTLExpression } from './canary_cache.js';
  +
  +describe('CanaryCache', () => {
  +  it('stores and retrieves fresh values', () => {
  +    const cache = new CanaryCache<string>();
  +    cache.set('key1', 'value1', 1000);
  +    assert.equal(cache.get('key1'), 'value1');
  +  });
  +
  +  it('returns undefined for non-existent keys', () => {
  +    const cache = new CanaryCache<number>();
  +    assert.equal(cache.get('non_existent'), undefined);
  +  });
  +
  +  it('returns undefined for expired keys lazily before evictExpired is called', async () => {
  +    const cache = new CanaryCache<{ name: string }>();
  +    cache.set('temp', { name: 'tark' }, 20);
  +    assert.deepEqual(cache.get('temp'), { name: 'tark' });
  +    
  +    await new Promise((resolve) => setTimeout(resolve, 35));
  +    assert.equal(cache.get('temp'), undefined);
  +  });
  +
  +  it('throws InvalidTTLExpression for ttlMs <= 0 (zero and negative)', () => {
  +    const cache = new CanaryCache<string>();
  +    
  +    assert.throws(
  +      () => cache.set('zero_ttl', 'val', 0),
  +      (err: unknown) => err instanceof InvalidTTLExpression && err.name === 'InvalidTTLExpression'
  +    );
  +
  +    assert.throws(
  +      () => cache.set('neg_ttl', 'val', -500),
  +      (err: unknown) => err instanceof InvalidTTLExpression && err.name === 'InvalidTTLExpression'
  +    );
  +  });
  +
  +  it('evictExpired accurately returns count for 0, some, and all expired entries', async () => {
  +    const cache = new CanaryCache<number>();
  +    cache.set('short1', 10, 20);
  +    cache.set('short2', 20, 20);
  +    cache.set('long1', 30, 5000);
  +
  +    // 0 expired
  +    assert.equal(cache.evictExpired(), 0);
  +
  +    // Wait for short entries to expire
  +    await new Promise((resolve) => setTimeout(resolve, 35));
  +
  +    // 2 expired, 1 remains
  +    assert.equal(cache.evictExpired(), 2);
  +    assert.equal(cache.get('long1'), 30);
  +    assert.equal(cache.evictExpired(), 0);
  +
  +    // Add another short item and expire everything
  +    cache.set('short3', 40, 10);
  +    cache.set('short4', 50, 10);
  +    // Replace long1 with a short expiration
  +    cache.set('long1', 30, 10);
  +
  +    await new Promise((resolve) => setTimeout(resolve, 25));
  +    assert.equal(cache.evictExpired(), 3);
  +    assert.equal(cache.evictExpired(), 0);
  +  });
  +});
```

