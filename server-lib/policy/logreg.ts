/**
 * server-lib/policy/logreg.ts
 *
 * Pure, high-precision L2-regularised logistic regression solver using Newton/IRLS.
 * Out-of-fold validation and Wilson score lower bounds for calibrated link decisions.
 * TASK_085K
 */

/**
 * Wilson score interval lower bound.
 * References:
 *   wilsonLower(27, 30) = 0.7438
 *   wilsonLower(45, 50) = 0.7864
 *   wilsonLower(9, 10)  = 0.5958
 *   wilsonLower(90, 100) = 0.8256
 */
export function wilsonLower(k: number, n: number, z = 1.959964): number {
  if (n <= 0) return 0;
  const p = k / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return (center - spread) / denominator;
}

export function predict(w: number[], b: number, x: number[]): number {
  let z = b;
  for (let i = 0; i < w.length; i++) {
    z += w[i] * x[i];
  }
  if (z > 35) return 1;
  if (z < -35) return 0;
  return 1 / (1 + Math.exp(-z));
}

/**
 * Solves A * x = b for an (N x N) matrix A via Gaussian elimination with partial pivoting.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Deep clone augmented matrix
  const M: number[][] = [];
  for (let i = 0; i < n; i++) {
    M.push([...A[i], b[i]]);
  }

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(M[row][col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }

    if (maxVal < 1e-12) {
      // Near-singular: add slight Tikhonov regularization on diagonal
      M[col][col] += 1e-6;
    } else if (maxRow !== col) {
      const tmp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = tmp;
    }

    const pivot = M[col][col];
    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      if (Math.abs(factor) > 1e-15) {
        for (let j = col; j <= n; j++) {
          M[row][j] -= factor * M[col][j];
        }
      }
    }
  }

  const sol: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    sol[i] = M[i][n];
  }
  return sol;
}

export interface FitResult {
  w: number[];
  b: number;
  iterations: number;
}

/**
 * Fits L2-regularised logistic regression using Newton-Raphson / IRLS.
 * Intercept b is unpenalised.
 * Stop when ||Δ||_inf < 1e-8 or 50 iterations.
 */
export function fitLogReg(
  X: number[][],
  y: number[],
  lambda = 1e-4,
  maxIterations = 50
): FitResult {
  const n = X.length;
  if (n === 0) return { w: [], b: 0, iterations: 0 };
  const d = X[0].length;

  const w = new Array(d).fill(0);
  let b = 0;

  let iter = 0;
  for (; iter < maxIterations; iter++) {
    // 1. Compute probabilities p_i
    const p = new Array(n);
    const S = new Array(n);
    for (let i = 0; i < n; i++) {
      const pi = predict(w, b, X[i]);
      p[i] = pi;
      S[i] = Math.max(pi * (1 - pi), 1e-12);
    }

    // 2. Compute gradients
    // g_w = X^T (p - y) + lambda * w
    // g_b = sum(p - y)
    const g_w = new Array(d).fill(0);
    let g_b = 0;
    for (let i = 0; i < n; i++) {
      const diff = p[i] - y[i];
      g_b += diff;
      for (let j = 0; j < d; j++) {
        g_w[j] += diff * X[i][j];
      }
    }
    for (let j = 0; j < d; j++) {
      g_w[j] += lambda * w[j];
    }

    // 3. Compute Hessian H of size (d+1) x (d+1)
    // Augmented parameters: [w_0, ..., w_{d-1}, b]
    const dim = d + 1;
    const H: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));

    for (let i = 0; i < n; i++) {
      const si = S[i];
      for (let r = 0; r < d; r++) {
        const x_ir = X[i][r];
        for (let c = r; c < d; c++) {
          const val = si * x_ir * X[i][c];
          H[r][c] += val;
          if (r !== c) H[c][r] += val;
        }
        // H_wb
        const wb = si * x_ir;
        H[r][d] += wb;
        H[d][r] += wb;
      }
      // H_bb
      H[d][d] += si;
    }

    // Add L2 penalty to w block (not intercept)
    for (let j = 0; j < d; j++) {
      H[j][j] += lambda;
    }

    // Right hand side: -gradient
    const negG = [...g_w.map((v) => -v), -g_b];

    // 4. Solve H * delta = -g
    const delta = solveLinearSystem(H, negG);

    // 5. Update parameters
    let maxDelta = 0;
    for (let j = 0; j < d; j++) {
      w[j] += delta[j];
      maxDelta = Math.max(maxDelta, Math.abs(delta[j]));
    }
    b += delta[d];
    maxDelta = Math.max(maxDelta, Math.abs(delta[d]));

    if (maxDelta < 1e-8) {
      iter++;
      break;
    }
  }

  return { w, b, iterations: iter };
}

/**
 * Stratified K-fold split generating k test index partitions.
 */
export function stratifiedKFold(y: number[], k: number, seed = 42): number[][] {
  const posIndices: number[] = [];
  const negIndices: number[] = [];

  for (let i = 0; i < y.length; i++) {
    if (y[i] === 1) posIndices.push(i);
    else negIndices.push(i);
  }

  // Seeded Fisher-Yates shuffle
  let rngState = seed;
  function rand() {
    rngState = (rngState * 1664525 + 1013904223) % 4294967296;
    return rngState / 4294967296;
  }

  for (let i = posIndices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = posIndices[i];
    posIndices[i] = posIndices[j];
    posIndices[j] = tmp;
  }

  for (let i = negIndices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = negIndices[i];
    negIndices[i] = negIndices[j];
    negIndices[j] = tmp;
  }

  const folds: number[][] = Array.from({ length: k }, () => []);

  for (let i = 0; i < posIndices.length; i++) {
    folds[i % k].push(posIndices[i]);
  }
  for (let i = 0; i < negIndices.length; i++) {
    folds[i % k].push(negIndices[i]);
  }

  for (const f of folds) {
    f.sort((a, b) => a - b);
  }

  return folds;
}
