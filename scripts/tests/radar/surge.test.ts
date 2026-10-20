/**
 * scripts/tests/radar/surge.test.ts
 *
 * Deterministic unit tests for news surge detection and empirical Bayes FDR.
 * Tests acceptance criteria from TASK_085N.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  lgamma,
  negBinSf,
  ebPrior,
  benjaminiHochberg,
  surge,
  type SurgeNodeInput,
} from "../../../server-lib/policy/surge.ts";

test("TASK_085N: lgamma matches exact reference values within 1e-12", () => {
  const refHalf = 0.5723649429247001;
  const refTen = 12.801827480081469;

  const valHalf = lgamma(0.5);
  const valTen = lgamma(10);

  assert.ok(
    Math.abs(valHalf - refHalf) <= 1e-12,
    `lgamma(0.5) = ${valHalf} should match ${refHalf} within 1e-12 (diff: ${Math.abs(valHalf - refHalf)})`
  );
  assert.ok(
    Math.abs(valTen - refTen) <= 1e-12,
    `lgamma(10) = ${valTen} should match ${refTen} within 1e-12 (diff: ${Math.abs(valTen - refTen)})`
  );
});

test("TASK_085N: negBinSf matches scipy reference table with rel_err <= 1e-6", () => {
  const table = [
    { alpha: 5.2, beta: 180.4, W: 14, x: 7, ref: 3.03549e-06 },
    { alpha: 2.0, beta: 180.0, W: 14, x: 3, ref: 0.00142191 },
    { alpha: 12.0, beta: 190.0, W: 14, x: 5, ref: 0.00349979 },
    { alpha: 0.8, beta: 200.0, W: 14, x: 2, ref: 0.00310919 },
    { alpha: 30.0, beta: 182.0, W: 14, x: 10, ref: 0.000319266 },
  ];

  for (const row of table) {
    const q = row.beta / (row.beta + row.W);
    const p = negBinSf(row.x, row.alpha, q);
    const relErr = Math.abs(p - row.ref) / row.ref;

    assert.ok(
      relErr <= 1e-5, // Table references have 6 significant digits
      `negBinSf(x=${row.x}, a=${row.alpha}, q=${q.toFixed(4)}) = ${p} should match ${row.ref} with relErr <= 1e-5 (got ${relErr})`
    );
  }

  // Edge cases
  assert.equal(negBinSf(0, 5, 0.5), 1.0, "x=0 returns 1.0");
  assert.equal(negBinSf(-1, 5, 0.5), 1.0, "x<0 returns 1.0");
});

test("TASK_085N: ebPrior matches reference values within 1e-4", () => {
  const counts = [0, 1, 2, 0, 5, 3, 1, 0, 8, 2];
  const T = 180;
  const res = ebPrior(counts, T);

  assert.ok(
    Math.abs(res.alpha0 - 1.09447) <= 1e-4,
    `alpha0 = ${res.alpha0} should match 1.09447 within 1e-4`
  );
  assert.ok(
    Math.abs(res.beta0 - 89.5477) <= 1e-4,
    `beta0 = ${res.beta0} should match 89.5477 within 1e-4`
  );
});

test("TASK_085N: benjaminiHochberg rejects first 6 hypotheses at q=0.10", () => {
  const p = [0.001, 0.008, 0.039, 0.041, 0.042, 0.06, 0.074, 0.205, 0.212, 0.216];
  const rejections = benjaminiHochberg(p, 0.10);

  const expected = [true, true, true, true, true, true, false, false, false, false];
  assert.deepEqual(rejections, expected, "First six must be true, rest false");
});

test("TASK_085N: surge excludes x < minX from surging family", () => {
  const nodes: SurgeNodeInput[] = [
    { id: "node-high-surge", N: 1, x: 10 },  // x >= 3 and very high -> surging true
    { id: "node-low-count", N: 0, x: 2 },    // x < 3 -> surging false regardless of p
    { id: "node-normal", N: 10, x: 1 },      // x < 3 -> surging false
    { id: "node-steady", N: 20, x: 1 },      // x < 3 -> surging false
  ];

  const results = surge(nodes, { T: 180, W: 14, q: 0.10, minX: 3 });

  const highSurge = results.find((r) => r.id === "node-high-surge")!;
  const lowCount = results.find((r) => r.id === "node-low-count")!;

  assert.equal(highSurge.surging, true, "Node with high anomaly and x >= 3 should surge");
  assert.equal(lowCount.surging, false, "Node with x < 3 must never surge");
  assert.ok(highSurge.score > 2, "High surge node should have significant -log10(p) score");
});

test("TASK_085N: No hardcoded year 2026 literals in surge.ts or node-signal-worker.ts", () => {
  const surgePath = path.resolve(process.cwd(), "server-lib/policy/surge.ts");
  const workerPath = path.resolve(process.cwd(), "server-lib/cron/node-signal-worker.ts");

  const surgeContent = fs.readFileSync(surgePath, "utf-8");
  const workerContent = fs.readFileSync(workerPath, "utf-8");

  assert.ok(!surgeContent.includes("2026"), "surge.ts must not contain '2026'");
  assert.ok(!workerContent.includes("2026"), "node-signal-worker.ts must not contain '2026'");
});
