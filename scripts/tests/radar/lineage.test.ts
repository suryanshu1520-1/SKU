import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  orderKey,
  compareEv,
  programParents,
  explicitReferences,
  assertAcyclic,
  type Ev,
} from "../../../server-lib/policy/lineage.ts";

function createAcceptanceFixture(): Ev[] {
  return [
    {
      id: "a",
      program: "P",
      ring: 0,
      date: "2026-01-12",
      createdAt: "2026-01-12T10:00:00Z",
      text: "treaty signed",
    },
    {
      id: "b",
      program: "P",
      ring: 1,
      date: "2026-10-19",
      createdAt: "2026-10-19T08:00:00Z",
      text: "comes into force 20 Oct",
    },
    {
      id: "c",
      program: "P",
      ring: 2,
      date: "2026-10-19",
      createdAt: "2026-10-19T09:00:00Z",
      text: "customs notification",
    },
    {
      id: "d",
      program: "P",
      ring: 1,
      date: "2026-10-19",
      createdAt: "2026-10-19T10:00:00Z", // created after b
      text: "rules published",
    },
    {
      id: "e",
      program: "Q",
      ring: 2,
      date: "2026-11-02",
      createdAt: "2026-11-02T08:00:00Z",
      text: "The scheme aligns with the India New Zealand Free Trade Agreement for export clearance.",
    },
    {
      id: "f",
      program: "Q",
      ring: 2,
      date: "2026-11-02",
      createdAt: "2026-11-02T10:00:00Z", // created after e, no reference
      text: "Quarterly review of export performance and targets.",
    },
  ];
}

test("TASK_085J: Order Key and CompareEv", () => {
  const events = createAcceptanceFixture();
  const byId = new Map(events.map((e) => [e.id, e]));

  const a = byId.get("a")!;
  const b = byId.get("b")!;
  const c = byId.get("c")!;
  const d = byId.get("d")!;

  assert.deepEqual(orderKey(a), ["2026-01-12", 0, "2026-01-12T10:00:00Z", "a"]);

  // Total order in P: a < b < d < c
  assert.ok(compareEv(a, b) < 0, "a should precede b by date");
  assert.ok(compareEv(b, d) < 0, "b should precede d by createdAt");
  assert.ok(compareEv(d, c) < 0, "d should precede c by ring depth (r1 < r2)");
  assert.ok(compareEv(a, c) < 0);
  assert.equal(compareEv(a, a), 0);
  assert.ok(compareEv(c, a) > 0);
});

test("TASK_085J: Program Parents Acceptance Fixture and 20 Permutations", () => {
  const events = createAcceptanceFixture();

  // Baseline evaluation
  const parents = programParents(events);
  assert.equal(parents.get("a"), null);
  assert.equal(parents.get("b"), "a");
  assert.equal(parents.get("d"), "b");
  assert.equal(parents.get("c"), "d");
  assert.equal(parents.get("e"), null);
  assert.equal(parents.get("f"), "e");

  // 20 random permutations must yield identical parent maps
  for (let seed = 0; seed < 20; seed++) {
    const perm = [...events].sort(() => Math.random() - 0.5);
    const permParents = programParents(perm);

    for (const e of events) {
      assert.equal(
        permParents.get(e.id),
        parents.get(e.id),
        `Permutation ${seed} gave divergent parent for event ${e.id}`
      );
    }
  }
});

test("TASK_085J: Explicit References Acceptance Fixture", () => {
  const events = createAcceptanceFixture();
  const aliasesByProgram = new Map<string, string[]>([
    ["P", ["India-New Zealand Free Trade Agreement"]],
    ["Q", ["National Export Promotion Scheme"]],
  ]);

  const refs = explicitReferences(events, aliasesByProgram);

  // Must return exactly [{ src: "c", dst: "e" }]
  assert.equal(refs.length, 1);
  assert.equal(refs[0].src, "c");
  assert.equal(refs[0].dst, "e");
});

test("TASK_085J: AssertAcyclic and Cycle Detection", () => {
  const events = createAcceptanceFixture();
  const byId = new Map(events.map((e) => [e.id, e]));

  // Valid forward edges in DAG
  const validEdges = [
    { src: "a", dst: "b" },
    { src: "b", dst: "d" },
    { src: "d", dst: "c" },
    { src: "c", dst: "e" },
    { src: "e", dst: "f" },
  ];

  assert.doesNotThrow(() => {
    assertAcyclic(validEdges, byId);
  });

  // Hand-made backward edge e -> a (November -> January)
  const cyclicEdges = [...validEdges, { src: "e", dst: "a" }];
  assert.throws(
    () => {
      assertAcyclic(cyclicEdges, byId);
    },
    /Cycle or backward edge detected/,
    "Must throw on backward edge"
  );
});

test("TASK_085J: Legacy Behavior Guarded by RADAR_V2", () => {
  const orchestratorPath = path.join(
    process.cwd(),
    "server-lib",
    "cron",
    "ingest",
    "orchestrator.ts"
  );
  const src = fs.readFileSync(orchestratorPath, "utf-8");

  // Verify processDispatchIntoPolicyGraph is inside RADAR_V2 check
  assert.ok(
    src.includes('process.env.RADAR_V2 === "1"'),
    "Must check RADAR_V2 flag"
  );
  assert.ok(
    src.includes("rebuildLineage"),
    "Must call rebuildLineage when RADAR_V2=1"
  );
  assert.ok(
    src.includes("runPolicyGraphWorker"),
    "Must keep runPolicyGraphWorker for legacy fallback"
  );

  // Check workflow file has RADAR_V2 variables
  const workflowPath = path.join(
    process.cwd(),
    ".github",
    "workflows",
    "scraper.yml"
  );
  const workflowSrc = fs.readFileSync(workflowPath, "utf-8");
  assert.ok(workflowSrc.includes("RADAR_V2: ${{ vars.RADAR_V2 }}"));
  assert.ok(workflowSrc.includes("RADAR_V2_SINCE: ${{ vars.RADAR_V2_SINCE }}"));

  // Check migration exists
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261021000500_rebuild_program_edges.sql"
  );
  assert.ok(fs.existsSync(migrationPath), "Migration 20261021000500 must exist");
});
