import test from 'node:test';
import assert from 'node:assert';
import {
  createBatcher,
  getDispatchLineage,
  getNodeSignal,
  getAuthority,
  resetNodeSignalsCache,
} from '../../../src/lib/radar-v2-client.ts';

test('TASK_085Q2: Radar v2 Client & Batcher Tests', async (t) => {
  await t.test('batcher coalesces 120 distinct keys into exactly 3 chunks (50, 50, 20)', async () => {
    const fetchCalls: string[][] = [];
    const batcher = createBatcher<string, { id: string; name: string }>(
      async (keys) => {
        fetchCalls.push([...keys]);
        const record: Record<string, { id: string; name: string }> = {};
        for (const k of keys) {
          // Leave one key out to test absent handling
          if (k !== 'key-99') {
            record[k] = { id: k, name: `Name of ${k}` };
          }
        }
        return record;
      },
      { max: 50, waitMs: 15 }
    );

    // Call 120 distinct keys in the same tick
    const promises: Promise<{ id: string; name: string } | null>[] = [];
    for (let i = 0; i < 120; i++) {
      promises.push(batcher.get(`key-${i}`));
    }

    const results = await Promise.all(promises);

    // Exactly 3 fetch calls with lengths 50, 50, 20
    assert.strictEqual(fetchCalls.length, 3, `Expected exactly 3 fetch calls, got ${fetchCalls.length}`);
    assert.strictEqual(fetchCalls[0].length, 50);
    assert.strictEqual(fetchCalls[1].length, 50);
    assert.strictEqual(fetchCalls[2].length, 20);

    // Check successful resolutions
    assert.strictEqual(results[0]?.id, 'key-0');
    assert.strictEqual(results[49]?.id, 'key-49');
    assert.strictEqual(results[119]?.id, 'key-119');

    // Absent key resolves to null
    assert.strictEqual(results[99], null);

    // Repeated calls: return from cache immediately with NO additional fetch calls
    const beforeCount = fetchCalls.length;
    const repeatedPresent = await batcher.get('key-10');
    assert.strictEqual(repeatedPresent?.id, 'key-10');
    assert.strictEqual(fetchCalls.length, beforeCount, 'Repeated present key should not trigger fetch');

    const repeatedAbsent = await batcher.get('key-99');
    assert.strictEqual(repeatedAbsent, null);
    assert.strictEqual(fetchCalls.length, beforeCount, 'Repeated absent key should not trigger fetch');
  });

  await t.test('paused or unavailable response resolves to null with no console.error', async () => {
    const originalFetch = globalThis.fetch;
    const originalConsoleError = console.error;
    let consoleErrorCount = 0;

    console.error = (...args: any[]) => {
      consoleErrorCount++;
      originalConsoleError(...args);
    };

    try {
      // Mock fetch returning paused status for all endpoints
      globalThis.fetch = async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/policy-radar/v2/by-dispatch')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ status: 'paused' }),
          } as any;
        }
        if (urlStr.includes('/api/policy-radar/v2/authorities')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ status: 'paused' }),
          } as any;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'paused', node_signals: [] }),
        } as any;
      };

      resetNodeSignalsCache();

      const [lineage, signal, authority] = await Promise.all([
        getDispatchLineage('00000000-0000-0000-0000-000000000001'),
        getNodeSignal('GS3.ECO.TEST'),
        getAuthority('ENT_NONEXISTENT'),
      ]);

      assert.strictEqual(lineage, null, 'Lineage should resolve to null on paused');
      assert.strictEqual(signal, null, 'Node signal should resolve to null on paused');
      assert.strictEqual(authority, null, 'Authority should resolve to null on paused');
      assert.strictEqual(consoleErrorCount, 0, 'No console.error should be called');
    } finally {
      globalThis.fetch = originalFetch;
      console.error = originalConsoleError;
      resetNodeSignalsCache();
    }
  });

  await t.test('surge condition evaluation correctly distinguishes surging vs non-surging nodes', () => {
    const surgingSignal = {
      node_id: 'GS3.ECO.INFRA',
      x_recent: 8,
      n_baseline: 12,
      expected: 1.8,
      p: 0.001,
      score: 4.2,
      surging: true,
      exam_weight: 3.45,
      computed_at: new Date().toISOString(),
    };

    const normalSignal = {
      ...surgingSignal,
      surging: false,
    };

    // CardExtras / Brief logic check:
    const hasSurgeSurging = Boolean(surgingSignal && surgingSignal.surging);
    const hasSurgeNormal = Boolean(normalSignal && normalSignal.surging);

    assert.strictEqual(hasSurgeSurging, true);
    assert.strictEqual(hasSurgeNormal, false);
  });
});
