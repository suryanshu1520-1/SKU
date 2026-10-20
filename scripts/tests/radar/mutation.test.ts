/**
 * scripts/tests/radar/mutation.test.ts
 *
 * Deterministic unit tests for mutation formatting and edge linkage.
 * Tests acceptance criteria from TASK_085M.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  formatChange,
  buildMutationEdges,
  type MutationRow,
  type MutationConflict,
} from "../../../server-lib/policy/mutation-format.ts";
import type { Ev } from "../../../server-lib/policy/lineage.ts";

test("TASK_085M: formatChange matches byte-identical reference headline", () => {
  const input = {
    metric: "Outlay",
    prev: "₹19,744 crore",
    cur: "₹21,000 crore",
  };

  const res = formatChange(input);
  assert.equal(res.headline, "Outlay: ₹19,744 crore → ₹21,000 crore");
});

test("TASK_085M: formatChange handles quotes, urls, and effectiveAt", () => {
  const input = {
    metric: "Target",
    prevValueText: "50 GW",
    curValueText: "100 GW",
    prevQuote: "Original target was 50 GW",
    curQuote: "Cabinet increased target to 100 GW",
    prevUrl: "https://pib.gov.in/PressReleasePage.aspx?PRID=111",
    curUrl: "https://pib.gov.in/PressReleasePage.aspx?PRID=222",
    effectiveAt: "2025-04-01T00:00:00Z",
  };

  const res = formatChange(input);
  assert.equal(res.headline, "Target: 50 GW → 100 GW");
  assert.equal(res.effectiveAt, "2025-04-01T00:00:00Z");
  assert.equal(res.sources.length, 2);
  assert.deepEqual(res.sources[0], {
    quote: "Original target was 50 GW",
    url: "https://pib.gov.in/PressReleasePage.aspx?PRID=111",
  });
  assert.deepEqual(res.sources[1], {
    quote: "Cabinet increased target to 100 GW",
    url: "https://pib.gov.in/PressReleasePage.aspx?PRID=222",
  });
});

test("TASK_085M: buildMutationEdges creates AMENDS edge for replace mutation with correct chronology", () => {
  const ev1: Ev = {
    id: "ev-old-001",
    program: "green-hydrogen",
    ring: 0,
    date: "2024-01-01",
    createdAt: "2024-01-01T10:00:00Z",
  };
  const ev2: Ev = {
    id: "ev-new-002",
    program: "green-hydrogen",
    ring: 0,
    date: "2025-01-01",
    createdAt: "2025-01-01T10:00:00Z",
  };

  const eventsById = new Map<string, Ev>([
    [ev1.id, ev1],
    [ev2.id, ev2],
  ]);

  const mutations: MutationRow[] = [
    {
      id: "mut-001",
      action: "replace",
      src_event: ev1.id,
      dst_event: ev2.id,
    },
  ];

  const { edges, conflicts } = buildMutationEdges(mutations, eventsById);

  assert.equal(edges.length, 1);
  assert.equal(conflicts.length, 0);
  assert.deepEqual(edges[0], {
    src_event: ev1.id,
    dst_event: ev2.id,
    edge_type: "AMENDS",
    anchor_kind: "fact_mutation",
    p: null,
    model_version: "mutation_v1",
  });
});

test("TASK_085M: buildMutationEdges ignores learn action", () => {
  const ev1: Ev = {
    id: "ev-learn-001",
    program: "mission-ev",
    ring: 0,
    date: "2024-01-01",
    createdAt: "2024-01-01T10:00:00Z",
  };

  const eventsById = new Map<string, Ev>([[ev1.id, ev1]]);
  const mutations: MutationRow[] = [
    {
      id: "mut-learn",
      action: "learn",
      src_event: null,
      dst_event: ev1.id,
    },
  ];

  const { edges, conflicts } = buildMutationEdges(mutations, eventsById);
  assert.equal(edges.length, 0, "learn action must produce no edges");
  assert.equal(conflicts.length, 0);
});

test("TASK_085M: buildMutationEdges detects reversed chronology, records mutation_order_conflict and skips edge", () => {
  // evSrc has later date than evDst (reversed chronology)
  const evSrc: Ev = {
    id: "ev-reversed-src",
    program: "solar-mission",
    ring: 0,
    date: "2025-06-01",
    createdAt: "2025-06-01T10:00:00Z",
  };
  const evDst: Ev = {
    id: "ev-reversed-dst",
    program: "solar-mission",
    ring: 0,
    date: "2024-01-01",
    createdAt: "2024-01-01T10:00:00Z",
  };

  const eventsById = new Map<string, Ev>([
    [evSrc.id, evSrc],
    [evDst.id, evDst],
  ]);

  const loggedConflicts: MutationConflict[] = [];
  const mutations: MutationRow[] = [
    {
      id: "mut-conflict-001",
      action: "replace",
      src_event: evSrc.id,
      dst_event: evDst.id,
    },
  ];

  const { edges, conflicts } = buildMutationEdges(mutations, eventsById, (c) => {
    loggedConflicts.push(c);
  });

  assert.equal(edges.length, 0, "Reversed chronology must produce NO edge");
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].reason, "mutation_order_conflict");
  assert.equal(conflicts[0].mutation_id, "mut-conflict-001");
  assert.equal(loggedConflicts.length, 1);
  assert.equal(loggedConflicts[0].reason, "mutation_order_conflict");
});

test("TASK_085M: server-lib/policy/ has 0 matches for mutates_prior_fact", () => {
  const policyDir = path.resolve(process.cwd(), "server-lib/policy");
  const files = fs.readdirSync(policyDir);
  for (const file of files) {
    const fullPath = path.join(policyDir, file);
    if (fs.statSync(fullPath).isFile()) {
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(
        !content.includes("mutates_prior_fact"),
        `File ${file} should not contain "mutates_prior_fact"`
      );
    }
  }
});
