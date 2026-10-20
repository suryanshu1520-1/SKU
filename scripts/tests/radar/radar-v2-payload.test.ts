/**
 * scripts/tests/radar/radar-v2-payload.test.ts
 *
 * Deterministic acceptance tests for Radar API v2:
 * - Pure builder evidence guarantee & quarantine
 * - Chronological & lexicographical program/node ordering
 * - 72-hour staleness threshold
 * - Public gate (paused when RADAR_PUBLIC unset)
 * - Validation on dispatch UUIDs and entity slugs
 * - Answer key isolation (no leaks in GET payload)
 * - Anti-grep verification
 * TASK_085P
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildRadarV2Payload,
  type RadarV2InputRows,
} from "../../../server-lib/policy/radar-v2-payload.ts";
import {
  v1FromV2,
} from "../../../server-lib/policy/radar-payload.ts";
import {
  radarV2Handler,
  radarV2ByDispatchHandler,
  radarV2AuthoritiesHandler,
  radarV2BossMcqCheckHandler,
} from "../../../server-lib/policy-radar-v2.ts";

function recursiveWalk(obj: any, fn: (o: any) => void) {
  if (!obj || typeof obj !== "object") return;
  fn(obj);
  for (const key of Object.keys(obj)) {
    recursiveWalk(obj[key], fn);
  }
}

function mockResponse() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let jsonBody: any = null;

  return {
    setHeader(k: string, v: string) {
      headers[k] = v;
      return this;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      jsonBody = body;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get jsonBody() {
      return jsonBody;
    },
    get headers() {
      return headers;
    },
  };
}

test("TASK_085P: Pure builder over 3 programs / 9 events enforces evidence integrity", () => {
  const rows: RadarV2InputRows = {
    programs: [
      { program_slug: "PROG_A", name: "Program Alpha", kind: "scheme", nodal_authority_slug: "ENT_RBI" },
      { program_slug: "PROG_B", name: "Program Beta", kind: "mission", nodal_authority_slug: "ENT_SEBI" },
      { program_slug: "PROG_C", name: "Program Gamma", kind: "policy", nodal_authority_slug: "ENT_ISRO" },
    ],
    events: [
      // PROG_A (2 public valid, 1 private)
      { id: "ev1", program_slug: "PROG_A", ring_depth: 0, event_date: "2025-01-10", is_public: true, summary: "Alpha 1", evidence: [{ quote: "Quote 1", source_url: "https://pib.gov.in/1" }] },
      { id: "ev2", program_slug: "PROG_A", ring_depth: 1, event_date: "2025-01-12", is_public: true, summary: "Alpha 2", evidence: [{ quote: "Quote 2", source_url: "https://pib.gov.in/2" }] },
      { id: "ev3", program_slug: "PROG_A", ring_depth: 2, event_date: "2025-01-15", is_public: false, summary: "Alpha private", evidence: [{ quote: "Private quote", source_url: "https://pib.gov.in/3" }] },

      // PROG_B (2 public valid, 1 public missing source_url)
      { id: "ev4", program_slug: "PROG_B", ring_depth: 0, event_date: "2025-02-01", is_public: true, summary: "Beta 1", evidence: [{ quote: "Quote 4", source_url: "https://pib.gov.in/4" }] },
      { id: "ev5", program_slug: "PROG_B", ring_depth: 1, event_date: "2025-02-05", is_public: true, summary: "Beta missing url", evidence: [{ quote: "Quote without URL" }] },
      { id: "ev6", program_slug: "PROG_B", ring_depth: 2, event_date: "2025-02-10", is_public: true, summary: "Beta 2", evidence: [{ quote: "Quote 6", source_url: "https://pib.gov.in/6" }] },

      // PROG_C (3 public valid)
      { id: "ev7", program_slug: "PROG_C", ring_depth: 0, event_date: "2025-03-01", is_public: true, summary: "Gamma 1", evidence: [{ quote: "Quote 7", source_url: "https://pib.gov.in/7" }] },
      { id: "ev8", program_slug: "PROG_C", ring_depth: 1, event_date: "2025-03-05", is_public: true, summary: "Gamma 2", evidence: [{ quote: "Quote 8", source_url: "https://pib.gov.in/8" }] },
      { id: "ev9", program_slug: "PROG_C", ring_depth: 2, event_date: "2025-03-08", is_public: true, summary: "Gamma 3", evidence: [{ quote: "Quote 9", source_url: "https://pib.gov.in/9" }] },
    ],
    nodeSignals: [
      { node_id: "GS3.ECO.EXTERNAL", x_recent: 5, n_baseline: 20, expected: 3.2, p: 0.04, score: 1.8, surging: true, exam_weight: 0.8 },
    ],
    bossMcqs: [
      {
        id: "mcq-1",
        program_slug: "PROG_C",
        edition_date: "2025-03-08",
        question: "Consider statements regarding Program Gamma",
        options: ["Only one", "Only two", "All three", "None"],
        correct_index: 2, // Must be stripped in GET payload
        statement_dissection: [{ n: 1, is_true: true }], // Must be stripped
      },
    ],
  };

  const now = new Date("2025-03-09T00:00:00.000Z");
  const payload = buildRadarV2Payload(rows, now);

  // 1. Total kept events = 7
  assert.equal(payload.coverage.events, 7);
  assert.equal(payload.coverage.dropped_no_evidence, 1);

  // Total nodes across all programs is exactly 7
  const totalNodesInPrograms = payload.programs.reduce((acc, p) => acc + p.nodes.length, 0);
  assert.equal(totalNodesInPrograms, 7);

  // 2. Recursive walk finds no object with quote without source_url or vice versa
  let quoteWithoutUrlCount = 0;
  let urlWithoutQuoteCount = 0;
  recursiveWalk(payload, (obj) => {
    const hasQuote = "quote" in obj && typeof obj.quote === "string" && obj.quote.length > 0;
    const hasUrl = "source_url" in obj && typeof obj.source_url === "string" && obj.source_url.length > 0;
    if (hasQuote && !hasUrl) quoteWithoutUrlCount++;
    if (!hasQuote && hasUrl) urlWithoutQuoteCount++;
  });
  assert.equal(quoteWithoutUrlCount, 0, "No object may have quote without source_url");
  assert.equal(urlWithoutQuoteCount, 0, "No object may have source_url without quote");

  // 3. No node_id in node_signals that was absent from input rows
  assert.equal(payload.node_signals.length, 1);
  assert.equal(payload.node_signals[0].node_id, "GS3.ECO.EXTERNAL");
  assert.ok(payload.node_signals[0].title, "Title should be populated");
});

test("TASK_085P: Program and node ordering follow chronological and lexicographical rules", () => {
  const rows: RadarV2InputRows = {
    programs: [
      { program_slug: "PROG_A", name: "Program Alpha" },
      { program_slug: "PROG_B", name: "Program Beta" },
      { program_slug: "PROG_C", name: "Program Gamma" },
    ],
    events: [
      { id: "ev1", program_slug: "PROG_A", ring_depth: 0, event_date: "2025-01-10", is_public: true, summary: "Alpha 1", evidence: [{ quote: "Q1", source_url: "U1" }] },
      { id: "ev4", program_slug: "PROG_B", ring_depth: 0, event_date: "2025-02-01", is_public: true, summary: "Beta 1", evidence: [{ quote: "Q4", source_url: "U4" }] },
      { id: "ev7", program_slug: "PROG_C", ring_depth: 1, event_date: "2025-03-01", is_public: true, summary: "Gamma 1", evidence: [{ quote: "Q7", source_url: "U7" }] },
      { id: "ev8", program_slug: "PROG_C", ring_depth: 0, event_date: "2025-03-01", is_public: true, summary: "Gamma 0", evidence: [{ quote: "Q8", source_url: "U8" }] },
    ],
  };

  const payload = buildRadarV2Payload(rows, new Date("2025-03-05T00:00:00.000Z"));

  // Programs sorted by latest event date desc: PROG_C (2025-03-01) > PROG_B (2025-02-01) > PROG_A (2025-01-10)
  assert.deepEqual(
    payload.programs.map((p) => p.slug),
    ["PROG_C", "PROG_B", "PROG_A"]
  );

  // Within PROG_C, nodes follow compareEv: date asc, then ring asc (ring 0 before ring 1)
  const cNodes = payload.programs[0].nodes;
  assert.equal(cNodes[0].ring, 0);
  assert.equal(cNodes[1].ring, 1);
});

test("TASK_085P: Staleness detection at 71h vs 73h", () => {
  const rows: RadarV2InputRows = {
    programs: [{ program_slug: "PROG_A", name: "Program Alpha" }],
    events: [
      {
        id: "ev1",
        program_slug: "PROG_A",
        ring_depth: 0,
        event_date: "2025-01-10T00:00:00.000Z",
        is_public: true,
        summary: "Alpha 1",
        evidence: [{ quote: "Q", source_url: "U" }],
      },
    ],
  };

  const lastEventTime = new Date("2025-01-10T00:00:00.000Z").getTime();

  // 71 hours later -> 'ok'
  const now71 = new Date(lastEventTime + 71 * 3600 * 1000);
  const p71 = buildRadarV2Payload(rows, now71, { staleAfterHours: 72 });
  assert.equal(p71.status, "ok");
  assert.equal(p71.programs.length, 1);

  // 73 hours later -> 'stale', data unchanged
  const now73 = new Date(lastEventTime + 73 * 3600 * 1000);
  const p73 = buildRadarV2Payload(rows, now73, { staleAfterHours: 72 });
  assert.equal(p73.status, "stale");
  assert.equal(p73.programs.length, 1);
  assert.deepEqual(p73.programs, p71.programs);
});

test("TASK_085P: RADAR_PUBLIC unset returns paused with empty arrays", async () => {
  const oldEnv = process.env.RADAR_PUBLIC;
  delete process.env.RADAR_PUBLIC;

  try {
    const res = mockResponse();
    await radarV2Handler({} as any, res as any);
    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonBody.status, "paused");
    assert.deepEqual(res.jsonBody.programs, []);
    assert.deepEqual(res.jsonBody.node_signals, []);
  } finally {
    if (oldEnv !== undefined) {
      process.env.RADAR_PUBLIC = oldEnv;
    }
  }
});

test("TASK_085P: by-dispatch rejects excessive ids and invalid UUIDs with 400", async () => {
  // Excessive IDs (> 50)
  const validUuid = "a0000000-0000-4000-8000-000000000001";
  const fiftyOneIds = Array(51).fill(validUuid).join(",");
  const resExcessive = mockResponse();
  await radarV2ByDispatchHandler({ query: { ids: fiftyOneIds } } as any, resExcessive as any);
  assert.equal(resExcessive.statusCode, 400);

  // Non-UUID
  const resInvalid = mockResponse();
  await radarV2ByDispatchHandler({ query: { ids: "not-a-valid-uuid" } } as any, resInvalid as any);
  assert.equal(resInvalid.statusCode, 400);
});

test("TASK_085P: authorities endpoint rejects invalid slug format with 400", async () => {
  // Semicolon / SQL injection attempt
  const resInject = mockResponse();
  await radarV2AuthoritiesHandler({ query: { slugs: "ENT_RBI,ENT_X;drop" } } as any, resInject as any);
  assert.equal(resInject.statusCode, 400);

  // Lowercase
  const resLower = mockResponse();
  await radarV2AuthoritiesHandler({ query: { slugs: "ent_rbi" } } as any, resLower as any);
  assert.equal(resLower.statusCode, 400);
});

test("TASK_085P: Evaluation isolation - no answer key leaks in GET; check validates choice", async () => {
  const rows: RadarV2InputRows = {
    programs: [{ program_slug: "PROG_A", name: "Program Alpha" }],
    events: [
      {
        id: "ev1",
        program_slug: "PROG_A",
        ring_depth: 0,
        event_date: "2025-01-10",
        is_public: true,
        summary: "Alpha 1",
        evidence: [{ quote: "Q", source_url: "U" }],
      },
    ],
    bossMcqs: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        program_slug: "PROG_A",
        edition_date: "2025-01-10",
        question: "Question?",
        options: ["A", "B", "C", "D"],
        correct_index: 3,
        key: "d",
        statement_dissection: [{ n: 1, is_true: false }],
      },
    ],
  };

  const payload = buildRadarV2Payload(rows, new Date("2025-01-11T00:00:00.000Z"));

  // Recursive walk: confirm no correct_index, key, or statement_dissection
  let leakedKeys = 0;
  recursiveWalk(payload, (obj) => {
    if ("correct_index" in obj) leakedKeys++;
    if ("statement_dissection" in obj) leakedKeys++;
    if ("key" in obj && typeof obj.key === "string" && ["a", "b", "c", "d"].includes(obj.key)) {
      leakedKeys++;
    }
  });
  assert.equal(leakedKeys, 0, "No answer keys or dissections may appear in GET payload");

  // Check endpoint rejects choice outside 0-3
  const resChoiceBad = mockResponse();
  await radarV2BossMcqCheckHandler({ body: { choice: 5 }, params: { id: "00000000-0000-4000-8000-000000000001" } } as any, resChoiceBad as any);
  assert.equal(resChoiceBad.statusCode, 400);

  // Check endpoint returns 404 for unknown or malformed id
  const resUnknown = mockResponse();
  await radarV2BossMcqCheckHandler({ body: { choice: 1 }, params: { id: "not-a-uuid" } } as any, resUnknown as any);
  assert.equal(resUnknown.statusCode, 404);
});

test("TASK_085P: Legacy v1FromV2 adapter converts RadarV2 to RadarPayloadV1", () => {
  const rows: RadarV2InputRows = {
    programs: [{ program_slug: "PROG_A", name: "Program Alpha", kind: "scheme", nodal_authority_slug: "ENT_RBI" }],
    events: [
      {
        id: "ev1",
        program_slug: "PROG_A",
        ring_depth: 0,
        event_date: "2025-01-10",
        is_public: true,
        summary: "Action alpha",
        evidence: [{ quote: "Q", source_url: "https://pib.gov.in/alpha" }],
      },
    ],
  };

  const v2 = buildRadarV2Payload(rows, new Date("2025-01-11T00:00:00.000Z"));
  const v1 = v1FromV2(v2);

  assert.equal(v1.status, "ok");
  assert.equal(v1.total_chains, 1);
  assert.equal(v1.chains[0].chain_id, "PROG_A");
  assert.equal(v1.chains[0].nodes_flow.length, 1);
  assert.equal(v1.chains[0].nodes_flow[0].pib_url, "https://pib.gov.in/alpha");
  assert.equal(v1.chains[0].nodes_flow[0].provenance, "observed");
});

test("TASK_085P: Anti-grep - no CANONICAL_ or hardcoded year 2026 in v2 payload or v2 routes", () => {
  const files = [
    path.resolve(process.cwd(), "server-lib/policy/radar-v2-payload.ts"),
    path.resolve(process.cwd(), "server-lib/policy-radar-v2.ts"),
  ];

  const forbiddenRegex = /CANONICAL_|2026/;
  for (const f of files) {
    const content = fs.readFileSync(f, "utf-8");
    assert.equal(
      forbiddenRegex.test(content),
      false,
      `File ${f} must have 0 matches for CANONICAL_ or 2026`
    );
  }
});
