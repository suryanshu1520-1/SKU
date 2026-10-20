import test from 'node:test';
import assert from 'node:assert';
import {
  MAX_GRAPH_ATTEMPTS,
  nextAttemptAt,
  onFailure,
} from '../../../server-lib/policy/worker-state.js';

test('TASK_085B: Graph Worker State & Exponential Backoff', async (t) => {
  const T0 = new Date('2026-10-20T12:00:00.000Z');

  await t.test('nextAttemptAt calculates exponential backoff hours correctly', () => {
    // 2^1 = 2 hours
    const t1 = nextAttemptAt(1, T0);
    assert.strictEqual(t1.toISOString(), '2026-10-20T14:00:00.000Z');
    assert.strictEqual(t1.getTime() - T0.getTime(), 2 * 60 * 60 * 1000);

    // 2^2 = 4 hours
    const t2 = nextAttemptAt(2, T0);
    assert.strictEqual(t2.toISOString(), '2026-10-20T16:00:00.000Z');
    assert.strictEqual(t2.getTime() - T0.getTime(), 4 * 60 * 60 * 1000);

    // 2^3 = 8 hours
    const t3 = nextAttemptAt(3, T0);
    assert.strictEqual(t3.toISOString(), '2026-10-20T20:00:00.000Z');
    assert.strictEqual(t3.getTime() - T0.getTime(), 8 * 60 * 60 * 1000);

    // 2^4 = 16 hours
    const t4 = nextAttemptAt(4, T0);
    assert.strictEqual(t4.toISOString(), '2026-10-21T04:00:00.000Z');
    assert.strictEqual(t4.getTime() - T0.getTime(), 16 * 60 * 60 * 1000);
  });

  await t.test('onFailure(0, T0) sets pending, attempts=1, next_attempt=T0 + 2h', () => {
    const res = onFailure(0, T0);
    assert.strictEqual(res.graph_status, 'pending');
    assert.strictEqual(res.graph_attempts, 1);
    assert.strictEqual(res.graph_next_attempt_at, '2026-10-20T14:00:00.000Z');
  });

  await t.test('onFailure(4, T0) transitions to failed with attempts=5 and null next_attempt', () => {
    const res = onFailure(4, T0);
    assert.strictEqual(res.graph_status, 'failed');
    assert.strictEqual(res.graph_attempts, 5);
    assert.strictEqual(res.graph_attempts, MAX_GRAPH_ATTEMPTS);
    assert.strictEqual(res.graph_next_attempt_at, null);
  });

  await t.test('onFailure for attempts >= MAX_GRAPH_ATTEMPTS remains failed', () => {
    const res = onFailure(5, T0);
    assert.strictEqual(res.graph_status, 'failed');
    assert.strictEqual(res.graph_attempts, 6);
    assert.strictEqual(res.graph_next_attempt_at, null);
  });

  await t.test('row-shape invariant: failure update object contains no graph_processed_at key', () => {
    const failureStatePending = onFailure(1, T0);
    assert.strictEqual('graph_processed_at' in failureStatePending, false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(failureStatePending, 'graph_processed_at'), false);

    const failureStateTerminal = onFailure(4, T0);
    assert.strictEqual('graph_processed_at' in failureStateTerminal, false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(failureStateTerminal, 'graph_processed_at'), false);
  });
});
