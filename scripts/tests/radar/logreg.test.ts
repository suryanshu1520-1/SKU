import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  wilsonLower,
  fitLogReg,
  predict,
} from "../../../server-lib/policy/logreg.ts";
import type { LinkModelConfig } from "../../radar/fit-link-model.ts";
import type { ResolverConfigOutput } from "../../radar/calibrate-resolver.ts";

test("TASK_085K: Wilson Lower Bound Reference Values", () => {
  const eps = 1e-4;

  const w1 = wilsonLower(27, 30);
  assert.ok(Math.abs(w1 - 0.7438) <= eps, `wilsonLower(27, 30) expected 0.7438, got ${w1}`);

  const w2 = wilsonLower(45, 50);
  assert.ok(Math.abs(w2 - 0.7864) <= eps, `wilsonLower(45, 50) expected 0.7864, got ${w2}`);

  const w3 = wilsonLower(9, 10);
  assert.ok(Math.abs(w3 - 0.5958) <= eps, `wilsonLower(9, 10) expected 0.5958, got ${w3}`);

  const w4 = wilsonLower(90, 100);
  assert.ok(Math.abs(w4 - 0.8256) <= eps, `wilsonLower(90, 100) expected 0.8256, got ${w4}`);
});

test("TASK_085K: IRLS Parameter Recovery on 20,000 Synthetic Rows", () => {
  let seed = 12345;
  function rand() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  function randNormal() {
    const u1 = Math.max(1e-15, rand());
    const u2 = rand();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  const n = 20000;
  const trueW = [1.5, -2.0, 0.5];
  const trueB = -0.3;

  const X: number[][] = new Array(n);
  const y: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const x = [randNormal(), randNormal(), randNormal()];
    const z = trueB + trueW[0] * x[0] + trueW[1] * x[1] + trueW[2] * x[2];
    const p = 1 / (1 + Math.exp(-z));
    X[i] = x;
    y[i] = rand() < p ? 1 : 0;
  }

  const fit = fitLogReg(X, y, 1e-6);

  assert.ok(
    fit.iterations <= 10,
    `Expected convergence in <= 10 iterations, took ${fit.iterations}`
  );

  const tol = 0.12;
  assert.ok(
    Math.abs(fit.w[0] - trueW[0]) <= tol,
    `w[0] error exceeds tol: recovered ${fit.w[0]} vs true ${trueW[0]}`
  );
  assert.ok(
    Math.abs(fit.w[1] - trueW[1]) <= tol,
    `w[1] error exceeds tol: recovered ${fit.w[1]} vs true ${trueW[1]}`
  );
  assert.ok(
    Math.abs(fit.w[2] - trueW[2]) <= tol,
    `w[2] error exceeds tol: recovered ${fit.w[2]} vs true ${trueW[2]}`
  );
  assert.ok(
    Math.abs(fit.b - trueB) <= tol,
    `b error exceeds tol: recovered ${fit.b} vs true ${trueB}`
  );
});

test("TASK_085K: Perfectly Separable Set with Lambda = 1.0 Stays Finite", () => {
  const X = [
    [-5, -5],
    [-4, -6],
    [-6, -4],
    [5, 5],
    [6, 4],
    [4, 6],
  ];
  const y = [0, 0, 0, 1, 1, 1];

  const fit = fitLogReg(X, y, 1.0);

  assert.ok(fit.w.every((v) => Number.isFinite(v)), "Weights must remain finite with L2 regularization");
  assert.ok(Number.isFinite(fit.b), "Intercept must remain finite");
});

test("TASK_085K: Config Artifacts Validation and Learned Edges Guard", () => {
  // Validate link-model.json
  const linkModelPath = path.join(process.cwd(), "server-lib", "policy", "link-model.json");
  assert.ok(fs.existsSync(linkModelPath), "link-model.json must exist");
  const linkModel = JSON.parse(fs.readFileSync(linkModelPath, "utf-8")) as LinkModelConfig;

  assert.equal(linkModel.version, "link_v1");
  assert.ok(Array.isArray(linkModel.features));
  assert.equal(linkModel.features.length, 7);
  assert.ok(typeof linkModel.passed === "boolean");
  assert.ok(typeof linkModel.labels_sha256 === "string");

  // Validate resolver-config.json
  const resolverPath = path.join(process.cwd(), "server-lib", "policy", "resolver-config.json");
  assert.ok(fs.existsSync(resolverPath), "resolver-config.json must exist");
  const resolverConfig = JSON.parse(fs.readFileSync(resolverPath, "utf-8")) as ResolverConfigOutput;

  assert.ok(resolverConfig.accept >= 0.86 && resolverConfig.accept <= 0.99);
  assert.ok(resolverConfig.margin >= 0.00 && resolverConfig.margin <= 0.10);
  assert.ok(resolverConfig.metrics.precision >= 0.98);

  // Invariant guard: learned edges are impossible when passed: false
  assert.equal(linkModel.passed, false, "Model must not pass before G2 labels exist");
  assert.equal(linkModel.tau, null, "Tau must be null when passed is false");
});
