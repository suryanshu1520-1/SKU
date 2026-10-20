import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  RING_OF,
  NON_EVENTS,
  assertEvidence,
  ringOfInstrument,
  type InstrumentClass,
} from "../../../server-lib/policy/instruments.ts";

test("TASK_085H: Policy Instruments - Ring Mapping & Non-Events", () => {
  const instruments = Object.keys(RING_OF) as InstrumentClass[];
  assert.equal(instruments.length, 20, "Expected exactly 20 policy instrument classes");

  // Invariant: commencement_or_entry_into_force must be in ring 1 (Law)
  assert.equal(RING_OF.commencement_or_entry_into_force, 1);
  assert.equal(ringOfInstrument("commencement_or_entry_into_force"), 1);

  // Invariant: cabinet_approval in ring 0, guidelines_issued in ring 2, state_rollout in ring 3
  assert.equal(RING_OF.cabinet_approval, 0);
  assert.equal(RING_OF.guidelines_issued, 2);
  assert.equal(RING_OF.state_rollout, 3);

  // Check NON_EVENTS
  assert.equal(NON_EVENTS.length, 6);
  assert.ok(NON_EVENTS.includes("review_meeting"));
  assert.ok(NON_EVENTS.includes("campaign_or_awareness"));
  assert.ok(NON_EVENTS.includes("award_or_ceremony"));
});

test("TASK_085H: Drift Guard - SQL Migration vs TypeScript Mirror", () => {
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261021000400_policy_events.sql"
  );
  assert.ok(fs.existsSync(migrationPath), `Migration file not found at ${migrationPath}`);

  const sql = fs.readFileSync(migrationPath, "utf-8");

  // 1. Invariant: No non-event exists in SQL instrument_class enum
  for (const nonEvent of NON_EVENTS) {
    assert.equal(
      sql.includes(`'${nonEvent}'`),
      false,
      `Non-event '${nonEvent}' must NOT exist in SQL migration`
    );
  }

  // 2. Extract instrument_class enum values from SQL
  const enumRegex = /CREATE\s+TYPE\s+instrument_class\s+AS\s+ENUM\s*\(([\s\S]*?)\);/;
  const enumMatch = sql.match(enumRegex);
  assert.ok(enumMatch, "Could not find instrument_class enum in SQL");

  const enumValues = enumMatch[1]
    .split(",")
    .map((s) => s.replace(/['"\s]/g, "").trim())
    .filter(Boolean);

  assert.equal(enumValues.length, 20, `Expected 20 SQL enum values, got ${enumValues.length}`);

  for (const val of enumValues) {
    assert.ok(val in RING_OF, `SQL enum contains unknown instrument: ${val}`);
  }

  // 3. Extract CASE branches from ring_of_instrument function
  // Format: WHEN i IN ('cabinet_approval','budget_announcement'...) THEN 0
  const branchRegex = /WHEN\s+i\s+IN\s*\(([^()]+)\)\s*THEN\s*(\d+)/g;
  const accountedInstruments = new Set<string>();

  let branchMatch: RegExpExecArray | null;
  while ((branchMatch = branchRegex.exec(sql)) !== null) {
    const ring = parseInt(branchMatch[2], 10);
    const branchInstruments = branchMatch[1]
      .split(",")
      .map((s) => s.replace(/['"\s]/g, "").trim())
      .filter(Boolean);

    for (const inst of branchInstruments) {
      assert.equal(
        RING_OF[inst as InstrumentClass],
        ring,
        `Ring mismatch for ${inst}: SQL has ${ring}, TS has ${RING_OF[inst as InstrumentClass]}`
      );
      accountedInstruments.add(inst);
    }
  }

  // The rest (ELSE 3) must be all instruments with ring 3
  for (const [inst, ring] of Object.entries(RING_OF)) {
    if (ring === 3) {
      assert.ok(
        !accountedInstruments.has(inst),
        `Instrument ${inst} is in ring 3 but was explicitly captured in earlier WHEN branch`
      );
    } else {
      assert.ok(
        accountedInstruments.has(inst),
        `Instrument ${inst} (ring ${ring}) is missing from SQL CASE statement`
      );
    }
  }
});

test("TASK_085H: Evidence Validation Guard (assertEvidence)", () => {
  // Valid evidence array passes cleanly
  const valid = [
    {
      span_id: "s0",
      quote: "India and New Zealand signed a bilateral trade pact",
      source_url: "https://pib.gov.in/PressReleasePage.aspx?PRID=2325286",
    },
  ];
  assert.doesNotThrow(() => assertEvidence(valid));

  // Empty array throws
  assert.throws(() => assertEvidence([]), /non-empty array/);

  // Missing source_url throws
  assert.throws(
    () =>
      assertEvidence([
        {
          span_id: "s0",
          quote: "Some quote",
        },
      ]),
    /source_url/
  );

  // Non-https URL throws
  assert.throws(
    () =>
      assertEvidence([
        {
          span_id: "s0",
          quote: "Some quote",
          source_url: "http://insecure.gov.in",
        },
      ]),
    /https:\/\//
  );

  // Missing span_id throws
  assert.throws(
    () =>
      assertEvidence([
        {
          span_id: "",
          quote: "Some quote",
          source_url: "https://pib.gov.in/test",
        },
      ]),
    /span_id/
  );

  // Missing quote throws
  assert.throws(
    () =>
      assertEvidence([
        {
          span_id: "s0",
          quote: "",
          source_url: "https://pib.gov.in/test",
        },
      ]),
    /quote/
  );
});
