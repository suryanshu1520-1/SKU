/**
 * src/lib/policy-ripple-radar-shared.ts
 *
 * Policy Ripple Shared Definitions (Boss MCQ extractors).
 * Legacy regex chain, canonical hard-coded entity lists, and volcano telemetry have been
 * retired in favor of Radar API v2 (TASK_085Q2).
 */

import type { RippleChain } from '../components/observatory/policy-ripple-types';

export interface BossMcqDefinition {
  stem: string;
  statements: string[];
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  official_key: 'a' | 'b' | 'c' | 'd';
  primary_operator: string;
  secondary_operator?: string;
  claim_half_life_days: number;
  statutory_anchor: string;
  statement_dissection: Array<{
    stmt_num: number;
    is_true: boolean;
    operator: string | null;
    marked_trap?: string;
    truth_key?: string;
    anchor?: string;
  }>;
}

/**
 * Extracts Boss MCQ for a chain only when server-constructed with dissection.
 */
export function getBossMcqForChain(chain: RippleChain | { chain_id: string; boss_mcq?: any }): BossMcqDefinition | null {
  if (chain && 'boss_mcq' in chain && chain.boss_mcq && chain.boss_mcq.statement_dissection) {
    return chain.boss_mcq as BossMcqDefinition;
  }
  return null;
}
