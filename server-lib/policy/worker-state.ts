/**
 * server-lib/policy/worker-state.ts
 *
 * Deterministic helper functions for graph worker retry scheduling and state transitions.
 * TASK_085B
 */

export const MAX_GRAPH_ATTEMPTS = 5;

/**
 * Computes next retry timestamp using exponential backoff: now + 2^attempts hours (for attempts >= 1).
 */
export function nextAttemptAt(attempts: number, now: Date): Date {
  const hours = Math.pow(2, attempts);
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Returns the state patch on failure.
 * When attempts reach MAX_GRAPH_ATTEMPTS, status transitions to 'failed'.
 * Otherwise, status remains 'pending' with an exponential backoff timestamp.
 * Notice: graph_processed_at is intentionally omitted.
 */
export function onFailure(
  attempts: number,
  now: Date
): {
  graph_status: 'pending' | 'failed';
  graph_attempts: number;
  graph_next_attempt_at: string | null;
} {
  const nextAttempts = attempts + 1;
  if (nextAttempts >= MAX_GRAPH_ATTEMPTS) {
    return {
      graph_status: 'failed',
      graph_attempts: nextAttempts,
      graph_next_attempt_at: null,
    };
  }
  const nextDate = nextAttemptAt(nextAttempts, now);
  return {
    graph_status: 'pending',
    graph_attempts: nextAttempts,
    graph_next_attempt_at: nextDate.toISOString(),
  };
}
