import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { evaluate, type AuditRow, type EvalInputs, type Thresholds } from "../../../server-lib/policy/radar-eval.ts";
import { isRadarPublic, clearRadarPublicCache } from "../../../server-lib/policy/radar-flags.ts";

const MOCK_THRESHOLDS: Thresholds = {
  public_evidence_missing: 0,
  hardcoded_fallbacks: 0,
  pib_non_fallback_ministry_rate: 0.90,
  passing_rows_node_id_rate: 0.95,
  event_precision: 0.90,
  instrument_accuracy: 0.85,
  resolver_precision: 0.98,
  resolver_recall: 0.85,
  ordering_errors: 0,
  learned_edges_precision: 0.90,
  learned_edges_wilson_lb: 0.80,
  pending_backlog_stale_count: 0,
  boss_mcq_traceable_rate: 1.00,
  audit_max_age_days: 35,
  run_max_age_days: 8,
};

function createAuditRows(correctCount: number, total: number = 50): AuditRow[] {
  const rows: AuditRow[] = [];
  for (let i = 0; i < total; i++) {
    const isCorrect = i < correctCount;
    rows.push({
      event_id: `ev_${i}`,
      event_date: "2026-10-15",
      instrument: "cabinet_approval",
      actor: "ENT_MOCI",
      program: "green-hydrogen-mission",
      is_policy_event: isCorrect ? 1 : 0,
      actor_correct: 1,
      date_correct: 1,
      program_correct: 1,
      quote: "Cabinet approved allocation.",
      source_url: "https://pib.gov.in/PressReleasePage.aspx?PRID=123",
    });
  }
  return rows;
}

test("TASK_085R: evaluate on fixtures - 46/50 correct passes and matches wilson_lb 0.8116", () => {
  const today = "2026-10-21";
  const rows = createAuditRows(46, 50);
  const inputs: EvalInputs = {
    audit: { rows, date: "2026-10-20" },
    instrument: { correct: 55, total: 60 },
    resolver: { precision: 0.99, recall: 0.88, n_accepted: 90, n_labelled: 100 },
    ordering_errors: 0,
    learned_edges: { passed: false },
    public_evidence_missing: 0,
    hardcoded_fallbacks: 0,
    pib_non_fallback_ministry_rate: 0.95,
    passing_rows_node_id_rate: 0.98,
    radar_v2_since_set: true,
    pending_backlog_stale_count: 0,
    boss_mcq_traceable_rate: 1.0,
  };

  const res = evaluate(inputs, MOCK_THRESHOLDS, today);
  const m = res.metrics.find((x) => x.key === "event_precision");
  assert.ok(m, "event_precision metric present");
  assert.equal(m?.value, 0.92);
  assert.equal(m?.status, "pass");
  assert.ok(
    m?.wilson_lb !== undefined && Math.abs(m.wilson_lb - 0.8116) <= 1e-4,
    `wilson_lb ${m?.wilson_lb} within 1e-4 of 0.8116`
  );
  assert.equal(res.passed, true);
  assert.deepEqual(res.failing, []);
});

test("TASK_085R: evaluate on fixtures - 44/50 fails event_precision", () => {
  const today = "2026-10-21";
  const rows = createAuditRows(44, 50);
  const inputs: EvalInputs = {
    audit: { rows, date: "2026-10-20" },
    instrument: { correct: 55, total: 60 },
    resolver: { precision: 0.99, recall: 0.88, n_accepted: 90, n_labelled: 100 },
    ordering_errors: 0,
    learned_edges: { passed: false },
    public_evidence_missing: 0,
    hardcoded_fallbacks: 0,
    pib_non_fallback_ministry_rate: 0.95,
    passing_rows_node_id_rate: 0.98,
    radar_v2_since_set: true,
    pending_backlog_stale_count: 0,
    boss_mcq_traceable_rate: 1.0,
  };

  const res = evaluate(inputs, MOCK_THRESHOLDS, today);
  const m = res.metrics.find((x) => x.key === "event_precision");
  assert.equal(m?.value, 0.88);
  assert.equal(m?.status, "fail");
  assert.equal(res.passed, false);
  assert.ok(res.failing.includes("event_precision"));
});

test("TASK_085R: evaluate on fixtures - no audit file reports missing and fails run", () => {
  const today = "2026-10-21";
  const inputs: EvalInputs = {
    audit: null,
    instrument: { correct: 55, total: 60 },
    resolver: { precision: 0.99, recall: 0.88, n_accepted: 90, n_labelled: 100 },
    ordering_errors: 0,
    learned_edges: { passed: false },
    public_evidence_missing: 0,
    hardcoded_fallbacks: 0,
    pib_non_fallback_ministry_rate: 0.95,
    passing_rows_node_id_rate: 0.98,
    radar_v2_since_set: true,
    pending_backlog_stale_count: 0,
    boss_mcq_traceable_rate: 1.0,
  };

  const res = evaluate(inputs, MOCK_THRESHOLDS, today);
  const m = res.metrics.find((x) => x.key === "event_precision");
  assert.equal(m?.status, "missing");
  assert.equal(res.passed, false);
  assert.ok(res.failing.includes("event_precision"));
});

test("TASK_085R: evaluate on fixtures - audit dated 36 days before today reports missing", () => {
  const today = "2026-10-21";
  const rows = createAuditRows(46, 50);
  const inputs: EvalInputs = {
    audit: { rows, date: "2026-09-15" }, // 36 days before 2026-10-21
  };

  const res = evaluate(inputs, MOCK_THRESHOLDS, today);
  const m = res.metrics.find((x) => x.key === "event_precision");
  assert.equal(m?.status, "missing");
  assert.ok(res.failing.includes("event_precision"));
});

test("TASK_085R: learned edges metric is skipped when link-model passed is false, fail when passed is true but precision < 0.90", () => {
  const today = "2026-10-21";
  const rows = createAuditRows(46, 50);

  // Case A: link-model.json.passed is false
  const inputsSkipped: EvalInputs = {
    audit: { rows, date: today },
    learned_edges: { passed: false },
  };
  const resSkipped = evaluate(inputsSkipped, MOCK_THRESHOLDS, today);
  const mPrecSkipped = resSkipped.metrics.find((x) => x.key === "learned_edges_precision");
  const mLbSkipped = resSkipped.metrics.find((x) => x.key === "learned_edges_wilson_lb");
  assert.equal(mPrecSkipped?.status, "skipped");
  assert.equal(mLbSkipped?.status, "skipped");
  assert.equal(resSkipped.failing.includes("learned_edges_precision"), false);
  assert.equal(resSkipped.failing.includes("learned_edges_wilson_lb"), false);

  // Case B: link-model passed is true, but precision = 0.85 (< 0.90)
  const inputsFail: EvalInputs = {
    audit: { rows, date: today },
    learned_edges: { passed: true, precision: 0.85, wilson_lb: 0.75, n: 100 },
  };
  const resFail = evaluate(inputsFail, MOCK_THRESHOLDS, today);
  const mPrecFail = resFail.metrics.find((x) => x.key === "learned_edges_precision");
  assert.equal(mPrecFail?.status, "fail");
  assert.ok(resFail.failing.includes("learned_edges_precision"));
});

test("TASK_085R: isRadarPublic kill-switch states with mocked client", async () => {
  const origEnv = process.env.RADAR_PUBLIC;
  clearRadarPublicCache();

  try {
    const now = new Date("2026-10-21T12:00:00Z").getTime();

    // 1. env unset -> false
    delete process.env.RADAR_PUBLIC;
    const resUnset = await isRadarPublic({ bypassCache: true, now });
    assert.equal(resUnset, false);

    // Set env
    process.env.RADAR_PUBLIC = "1";

    // 2. env set + latest run passed 2 days ago -> true
    const client2DaysAgo = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({
                data: {
                  run_at: new Date(now - 2 * 86400 * 1000).toISOString(),
                  passed: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    const res2Days = await isRadarPublic({ client: client2DaysAgo, bypassCache: true, now });
    assert.equal(res2Days, true);

    // 3. passed 9 days ago -> false
    const client9DaysAgo = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({
                data: {
                  run_at: new Date(now - 9 * 86400 * 1000).toISOString(),
                  passed: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    const res9Days = await isRadarPublic({ client: client9DaysAgo, bypassCache: true, now });
    assert.equal(res9Days, false);

    // 4. latest run failed -> false
    const clientFailed = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({
                data: {
                  run_at: new Date(now - 1 * 86400 * 1000).toISOString(),
                  passed: false,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    const resFailed = await isRadarPublic({ client: clientFailed, bypassCache: true, now });
    assert.equal(resFailed, false);

    // 5. DB throws -> false
    const clientError = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => {
                throw new Error("DB connection timeout");
              },
            }),
          }),
        }),
      }),
    };
    const resError = await isRadarPublic({ client: clientError, bypassCache: true, now });
    assert.equal(resError, false);
  } finally {
    if (origEnv !== undefined) {
      process.env.RADAR_PUBLIC = origEnv;
    } else {
      delete process.env.RADAR_PUBLIC;
    }
    clearRadarPublicCache();
  }
});

test("TASK_085R: npm test runs test:radar via package.json script check", () => {
  const pkgPath = path.join(process.cwd(), "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  assert.ok(
    pkg.scripts.test.includes("npm run test:radar"),
    "package.json scripts.test must chain npm run test:radar"
  );
});
