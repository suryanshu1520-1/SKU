/**
 * src/lib/examiner_psyche.ts
 *
 * Deterministic Examiner Psyche 50:50 EV Degradation & Inversion Engine.
 * Fulfills TASK_084 Section 4.1.
 */

import type { Calibrated5050Metrics, EvExecutionProtocol } from '../types';
export type { Calibrated5050Metrics, EvExecutionProtocol };

/**
 * Computes Calibrated 50:50 Expected Value (EV) using continuous distractor-attraction curve:
 * EV(P_trap) = (1 - P_trap)(+2.00) + P_trap(-0.66) = 2.00 - 2.66 * P_trap
 *
 * Inversion Horizon: P_trap >= 0.7518 (Empirical accuracy <= 24.8%) -> EV <= 0.000 -> STRICT_ABSTENTION
 */
export function computeCalibrated5050EV(
  operator: string,
  correct5050Count: number,
  total5050Count: number,
  priorTrapRate = 0.50
): Calibrated5050Metrics {
  // Bayesian Laplace smoothing with weight k=2 toward operator prior until user logs >= 3 calls
  const pCorrect =
    total5050Count >= 3
      ? correct5050Count / total5050Count
      : (correct5050Count + 2 * (1 - priorTrapRate)) / (total5050Count + 2);

  const pTrap = Math.max(0, Math.min(1, 1 - pCorrect));
  const calibratedEvPerCall = Number((2.0 - 2.66 * pTrap).toFixed(3));
  const cumulativeEv15Calls = Number((calibratedEvPerCall * 15).toFixed(2));
  const isEvInverted = pTrap >= 0.7518 || calibratedEvPerCall <= 0;

  let protocol: EvExecutionProtocol = 'STANDARD_EXECUTION';
  if (isEvInverted) protocol = 'STRICT_ABSTENTION';
  else if (pTrap > 0.50) protocol = 'SELECTIVE_CAUTION';
  else if (pTrap <= 0.25) protocol = 'MANDATORY_EXECUTION';
  else if (pTrap <= 0.35) protocol = 'AGGRESSIVE_EXECUTION';

  return {
    operator,
    sampleSize: total5050Count,
    empiricalAccuracy: Number(pCorrect.toFixed(3)),
    trapAttractionRate: Number(pTrap.toFixed(3)),
    naiveEv: 0.67,
    calibratedEvPerCall,
    cumulativeEv15Calls,
    isEvInverted,
    protocol,
  };
}
