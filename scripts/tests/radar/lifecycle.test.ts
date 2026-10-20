/**
 * scripts/tests/radar/lifecycle.test.ts
 *
 * Deterministic unit tests for Kaplan-Meier lifecycle gap estimation.
 * Tests acceptance criteria from TASK_085L.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  kaplanMeier,
  quantileTime,
  transitionSamples,
  programGap,
  daysBetween,
  type Obs,
  type ProgramInput,
  type EventInput,
} from "../../../server-lib/policy/lifecycle.ts";
import { TEMPLATES } from "../../../server-lib/policy/lifecycle-templates.ts";

test("TASK_085L: Kaplan-Meier baseline fixture matches exact reference values", () => {
  // Durations: [30, 45, 60c, 60, 90, 120c, 150, 200, 210c, 365] (c = censored)
  const obs: Obs[] = [
    { duration: 30, event: true },
    { duration: 45, event: true },
    { duration: 60, event: false }, // 60c
    { duration: 60, event: true },
    { duration: 90, event: true },
    { duration: 120, event: false }, // 120c
    { duration: 150, event: true },
    { duration: 200, event: true },
    { duration: 210, event: false }, // 210c
    { duration: 365, event: true },
  ];

  const curve = kaplanMeier(obs);

  // Expected distinct event times: 30, 45, 60, 90, 150, 200, 365
  const expectedTimes = [30, 45, 60, 90, 150, 200, 365];
  const expectedS = [0.9, 0.8, 0.7, 0.5833, 0.4375, 0.2917, 0.0];

  assert.equal(curve.length, expectedTimes.length, "Should have 7 event time points");

  for (let i = 0; i < curve.length; i++) {
    assert.equal(curve[i].t, expectedTimes[i], `Time at index ${i} should match`);
    assert.ok(
      Math.abs(curve[i].S - expectedS[i]) <= 1e-4,
      `S(${curve[i].t}) = ${curve[i].S} should match ${expectedS[i]} within 1e-4`
    );
  }

  // Quantiles
  const median = quantileTime(curve, 0.5);
  const q25 = quantileTime(curve, 0.25);

  assert.equal(median, 150, "quantileTime(curve, 0.5) should be 150");
  assert.equal(q25, 365, "quantileTime(curve, 0.25) should be 365");
});

test("TASK_085L: Ties rule - observation censored at t is still at risk at t", () => {
  // At t=60, 1 event and 1 censoring. Risk set must be 8, S must be 0.7 (not 0.8 * (1 - 1/7))
  const obs: Obs[] = [
    { duration: 30, event: true },
    { duration: 45, event: true },
    { duration: 60, event: false },
    { duration: 60, event: true },
  ];

  const curve = kaplanMeier(obs);
  const pt60 = curve.find((p) => p.t === 60);
  assert.ok(pt60, "Must have point at t=60");
  assert.equal(pt60.atRisk, 2, "At t=60, 2 observations remain at risk (both event and censor)");
  assert.equal(pt60.events, 1);
  assert.ok(Math.abs(pt60.S - 0.25) <= 1e-4, "S at t=60 should be 0.25");
});

test("TASK_085L: Extended fixture with n_observed = 8 matches reference S and quantiles", () => {
  // Adding an observed duration of 20 days gives 8 observed events
  const obs: Obs[] = [
    { duration: 20, event: true },
    { duration: 30, event: true },
    { duration: 45, event: true },
    { duration: 60, event: false },
    { duration: 60, event: true },
    { duration: 90, event: true },
    { duration: 120, event: false },
    { duration: 150, event: true },
    { duration: 200, event: true },
    { duration: 210, event: false },
    { duration: 365, event: true },
  ];

  const nObserved = obs.filter((o) => o.event).length;
  assert.equal(nObserved, 8, "nObserved counts uncensored observations only");

  const curve = kaplanMeier(obs);
  const expectedTimes = [20, 30, 45, 60, 90, 150, 200, 365];
  const expectedS = [0.9091, 0.8182, 0.7273, 0.6364, 0.5303, 0.3977, 0.2652, 0.0];

  assert.equal(curve.length, expectedTimes.length);
  for (let i = 0; i < curve.length; i++) {
    assert.equal(curve[i].t, expectedTimes[i]);
    assert.ok(
      Math.abs(curve[i].S - expectedS[i]) <= 1e-4,
      `S(${curve[i].t}) = ${curve[i].S} should match ${expectedS[i]} within 1e-4`
    );
  }

  const median = quantileTime(curve, 0.5);
  const q25 = quantileTime(curve, 0.25);
  assert.equal(median, 150, "Median should be 150");
  assert.equal(q25, 365, "q25 should be 365");

  // Program sitting 400 days -> longer_than_usual
  const testProg: ProgramInput = { program_slug: "prog-act-test", kind: "act" };
  const events400: EventInput[] = [
    {
      program_slug: "prog-act-test",
      instrument: "act_assented",
      event_date: "2025-01-01",
      is_public: true,
    },
  ];
  const today400 = "2026-02-05"; // 400 days later
  assert.equal(daysBetween("2025-01-01", today400), 400);

  const stats = new Map([
    ["act:act_assented->commencement_or_entry_into_force", { nObserved: 8, medianDays: 150, q25Days: 365 }],
  ]);

  const gap400 = programGap(testProg, events400, stats, today400);
  assert.equal(gap400.status, "longer_than_usual");
  assert.equal(gap400.nObserved, 8);
  assert.equal(gap400.elapsedDays, 400);
  assert.ok(gap400.sentence.includes("400 days on. That is longer than 75% of past cases (n = 8)"));

  // Program sitting 100 days -> on_track with "about 150 days (n = 8)"
  const today100 = "2025-04-11"; // 100 days later
  assert.equal(daysBetween("2025-01-01", today100), 100);

  const gap100 = programGap(testProg, events400, stats, today100);
  assert.equal(gap100.status, "on_track");
  assert.equal(gap100.nObserved, 8);
  assert.equal(gap100.elapsedDays, 100);
  assert.ok(
    gap100.sentence.includes("Typically follows in about 150 days (n = 8)"),
    `Sentence should contain 'about 150 days (n = 8)': got ${gap100.sentence}`
  );
});

test("TASK_085L: nObserved < 8 yields no_estimate and contains (n = k)", () => {
  const testProg: ProgramInput = { program_slug: "prog-small", kind: "act" };
  const events: EventInput[] = [
    {
      program_slug: "prog-small",
      instrument: "act_assented",
      event_date: "2025-01-01",
      is_public: true,
    },
  ];
  const stats = new Map([
    ["act:act_assented->commencement_or_entry_into_force", { nObserved: 3, medianDays: 120, q25Days: 300 }],
  ]);

  const gap = programGap(testProg, events, stats, "2025-05-01");
  assert.equal(gap.status, "no_estimate");
  assert.equal(gap.nObserved, 3);
  assert.ok(
    gap.sentence.includes("(n = 3)"),
    `Sentence must contain '(n = 3)': got ${gap.sentence}`
  );
  assert.ok(gap.sentence.includes("Not enough history to estimate timing"));
});

test("TASK_085L: Completed lifecycle returns complete status", () => {
  const testProg: ProgramInput = { program_slug: "prog-completed-scheme", kind: "scheme" };
  // scheme template: ['cabinet_approval','guidelines_issued','funds_released','state_rollout']
  const events: EventInput[] = [
    { program_slug: "prog-completed-scheme", instrument: "cabinet_approval", event_date: "2024-01-01", is_public: true },
    { program_slug: "prog-completed-scheme", instrument: "guidelines_issued", event_date: "2024-03-01", is_public: true },
    { program_slug: "prog-completed-scheme", instrument: "funds_released", event_date: "2024-06-01", is_public: true },
    { program_slug: "prog-completed-scheme", instrument: "state_rollout", event_date: "2024-09-01", is_public: true },
  ];

  const gap = programGap(testProg, events, new Map(), "2025-01-01");
  assert.equal(gap.status, "complete");
  assert.equal(gap.lastStage, "state_rollout");
  assert.equal(gap.nextStage, null);
  assert.ok(gap.sentence.includes("All expected lifecycle stages observed"));
});

test("TASK_085L: Not applicable for unknown program kind", () => {
  const testProg: ProgramInput = { program_slug: "prog-unknown", kind: "unknown_kind" as any };
  const gap = programGap(testProg, [], new Map(), "2025-01-01");
  assert.equal(gap.status, "not_applicable");
  assert.equal(gap.nextStage, null);
});

test("TASK_085L: Negative phrasing guard - no sentence contains pending, delayed, failed, or not done", () => {
  const forbiddenWords = ["pending", "delayed", "failed", "not done"];

  const testProg: ProgramInput = { program_slug: "prog-test", kind: "act" };
  const events: EventInput[] = [
    { program_slug: "prog-test", instrument: "bill_introduced", event_date: "2025-01-01", is_public: true },
  ];

  const testStatsCases = [
    { nObserved: 0, medianDays: null, q25Days: null }, // no_estimate
    { nObserved: 3, medianDays: 100, q25Days: 200 },  // no_estimate
    { nObserved: 10, medianDays: 100, q25Days: 200 }, // on_track
    { nObserved: 10, medianDays: 100, q25Days: 200 }, // longer_than_usual (with elapsed = 300)
  ];

  for (const st of testStatsCases) {
    const statsMap = new Map([["act:bill_introduced->bill_passed", st]]);
    const gap = programGap(testProg, events, statsMap, "2025-10-01");
    const lowerSentence = gap.sentence.toLowerCase();
    for (const forbidden of forbiddenWords) {
      assert.ok(
        !lowerSentence.includes(forbidden),
        `Sentence for status '${gap.status}' must not contain '${forbidden}': got "${gap.sentence}"`
      );
    }
  }

  // Also test complete and not_applicable
  const completeGap = programGap({ program_slug: "p", kind: "policy" }, [
    { program_slug: "p", instrument: "cabinet_approval", event_date: "2024-01-01", is_public: true },
    { program_slug: "p", instrument: "guidelines_issued", event_date: "2024-02-01", is_public: true },
  ], new Map(), "2024-03-01");
  for (const forbidden of forbiddenWords) {
    assert.ok(!completeGap.sentence.toLowerCase().includes(forbidden));
  }

  const naGap = programGap({ program_slug: "p", kind: "non_existent" as any }, [], new Map(), "2024-03-01");
  for (const forbidden of forbiddenWords) {
    assert.ok(!naGap.sentence.toLowerCase().includes(forbidden));
  }
});

test("TASK_085L: transitionSamples extracts durations and censors correctly", () => {
  const progs: ProgramInput[] = [
    { program_slug: "p1", kind: "bill" },
    { program_slug: "p2", kind: "bill" },
    { program_slug: "p3", kind: "bill" },
    { program_slug: "p4", kind: "scheme" }, // different kind
  ];

  const events: EventInput[] = [
    // p1: bill_introduced -> bill_passed in 30 days
    { program_slug: "p1", instrument: "bill_introduced", event_date: "2025-01-01", is_public: true },
    { program_slug: "p1", instrument: "bill_passed", event_date: "2025-01-31", is_public: true },
    // p2: bill_introduced, no bill_passed yet, today is 50 days later
    { program_slug: "p2", instrument: "bill_introduced", event_date: "2025-01-01", is_public: true },
    // p3: no bill_introduced (skipped or never reached)
    { program_slug: "p3", instrument: "bill_passed", event_date: "2025-01-15", is_public: true },
  ];

  const samples = transitionSamples(progs, events, "bill", "bill_introduced", "bill_passed", "2025-02-20");

  assert.equal(samples.length, 2, "Should have 2 samples (p1 and p2)");
  assert.deepEqual(samples[0], { duration: 30, event: true });
  assert.deepEqual(samples[1], { duration: 50, event: false });
});
