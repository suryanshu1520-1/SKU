/**
 * server-lib/policy/surge.ts
 *
 * News surge detection using Gamma-Poisson empirical Bayes + Benjamini-Hochberg FDR control.
 * Statistically rigorous anomaly detection over syllabus node news frequency.
 * TASK_085N
 */

// Lanczos parameters for g = 7, n = 9 with high-precision coefficients
const LANCZOS_COEFFS = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/**
 * Natural logarithm of the Gamma function via Lanczos approximation (g = 7, n = 9).
 * Error |err| < 1e-12 for x > 0.
 */
export function lgamma(z: number): number {
  if (z <= 0) {
    throw new Error(`lgamma domain error: argument must be positive, got ${z}`);
  }
  if (z < 0.5) {
    // Reflection formula: Gamma(z) * Gamma(1-z) = pi / sin(pi * z)
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - lgamma(1 - z);
  }

  const z1 = z - 1;
  let x = LANCZOS_COEFFS[0];
  for (let i = 1; i < LANCZOS_COEFFS.length; i++) {
    x += LANCZOS_COEFFS[i] / (z1 + i);
  }

  const t = z1 + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (z1 + 0.5) * Math.log(t) -
    t +
    Math.log(x)
  );
}

function negBinPmfLog(k: number, r: number, q: number): number {
  return (
    lgamma(k + r) -
    lgamma(r) -
    lgamma(k + 1) +
    r * Math.log(q) +
    k * Math.log(1 - q)
  );
}

/**
 * Survival function P(X >= x) for Negative Binomial distribution NegBin(r, q),
 * counting number of failures k until r successes with success probability q.
 * Evaluated as 1 - Sum_{k < x} pmf(k) with log-space terms and Kahan summation compensation.
 * x = 0 -> 1.
 */
export function negBinSf(x: number, r: number, q: number): number {
  if (x <= 0) return 1.0;
  if (q <= 0 || q >= 1 || r <= 0) return 0.0;

  let sum = 0.0;
  let comp = 0.0; // Kahan compensation

  for (let k = 0; k < x; k++) {
    const logP = negBinPmfLog(k, r, q);
    const p = Math.exp(logP);
    const y = p - comp;
    const t = sum + y;
    comp = (t - sum) - y;
    sum = t;
  }

  return Math.max(0.0, Math.min(1.0, 1.0 - sum));
}

/**
 * Empirical Bayes prior estimation over baseline counts.
 * r_j = N_j / T, m = mean(r), v = sample var(r) with ddof 1, varLambda = v - m / T.
 * If varLambda > 0: beta0 = m / varLambda, alpha0 = m * beta0.
 * Else: beta0 = 1e4, alpha0 = m * beta0.
 * If m = 0: alpha0 = 1e-3, beta0 = 1.
 */
export function ebPrior(
  baselineCounts: number[],
  T: number
): { alpha0: number; beta0: number } {
  if (baselineCounts.length === 0 || T <= 0) {
    return { alpha0: 1e-3, beta0: 1.0 };
  }

  const r = baselineCounts.map((cnt) => cnt / T);
  const m = r.reduce((acc, val) => acc + val, 0) / r.length;

  if (m === 0) {
    return { alpha0: 1e-3, beta0: 1.0 };
  }
  if (r.length < 2) {
    return { alpha0: 1e-3, beta0: 1.0 };
  }

  const v =
    r.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / (r.length - 1);
  const varLambda = v - m / T;

  let beta0: number;
  let alpha0: number;

  if (varLambda > 0) {
    beta0 = m / varLambda;
    alpha0 = m * beta0;
  } else {
    beta0 = 1e4;
    alpha0 = m * beta0;
  }

  return { alpha0, beta0 };
}

/**
 * Benjamini-Hochberg procedure for False Discovery Rate (FDR) control at level q.
 * Returns array of booleans indicating whether each hypothesis is rejected (surging).
 */
export function benjaminiHochberg(p: number[], q: number): boolean[] {
  const m = p.length;
  if (m === 0) return [];

  const indexed = p.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);

  let maxK = -1;
  for (let k = 1; k <= m; k++) {
    const threshold = (k / m) * q;
    if (indexed[k - 1].val <= threshold) {
      maxK = k - 1;
    }
  }

  const result = new Array(m).fill(false);
  if (maxK >= 0) {
    const maxPVal = indexed[maxK].val;
    for (let i = 0; i < m; i++) {
      if (p[i] <= maxPVal) {
        result[i] = true;
      }
    }
  }

  return result;
}

export interface SurgeNodeInput {
  id: string;
  N: number; // Baseline count over window T
  x: number; // Recent count over window W
}

export interface SurgeOptions {
  T?: number;     // Baseline days (default 180)
  W?: number;     // Recent days (default 14)
  q?: number;     // FDR target (default 0.10)
  minX?: number;  // Minimum recent count to enter BH family (default 3)
}

export interface SurgeNodeOutput {
  id: string;
  p: number;
  score: number;
  surging: boolean;
  expected: number;
}

/**
 * Pure surge detector across syllabus nodes.
 */
export function surge(
  nodes: SurgeNodeInput[],
  opts: SurgeOptions = {}
): SurgeNodeOutput[] {
  const T = opts.T ?? 180;
  const W = opts.W ?? 14;
  const qFdr = opts.q ?? 0.10;
  const minX = opts.minX ?? 3;

  const baselineCounts = nodes.map((n) => n.N);
  const { alpha0, beta0 } = ebPrior(baselineCounts, T);

  // Compute posterior parameters and p-values for all nodes
  const rawResults: Array<{
    id: string;
    p: number;
    score: number;
    expected: number;
    x: number;
  }> = [];

  for (const node of nodes) {
    const alpha = alpha0 + node.N;
    const beta = beta0 + T;
    const q = beta / (beta + W);
    const p = negBinSf(node.x, alpha, q);
    const score = -Math.log10(Math.max(p, 1e-300));
    const expected = (alpha * W) / beta;

    rawResults.push({
      id: node.id,
      p,
      score,
      expected,
      x: node.x,
    });
  }

  // BH-FDR applied only over candidate nodes with x >= minX
  const candidateIndices: number[] = [];
  const candidateP: number[] = [];

  for (let i = 0; i < rawResults.length; i++) {
    if (rawResults[i].x >= minX) {
      candidateIndices.push(i);
      candidateP.push(rawResults[i].p);
    }
  }

  const bhResults = benjaminiHochberg(candidateP, qFdr);
  const surgingMap = new Map<number, boolean>();
  for (let i = 0; i < candidateIndices.length; i++) {
    surgingMap.set(candidateIndices[i], bhResults[i]);
  }

  return rawResults.map((item, idx) => ({
    id: item.id,
    p: item.p,
    score: item.score,
    surging: surgingMap.get(idx) ?? false,
    expected: item.expected,
  }));
}
