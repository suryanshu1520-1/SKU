import test from "node:test";
import assert from "node:assert/strict";
import { gatherInputs } from "../../radar/eval.ts";

// gatherInputs() used to select current_affairs.source_meta and .syllabus_node_id. Neither column exists
// (ministry and node_id do), so the PIB-ministry and node-id gates stayed "missing" forever and the
// radar kill switch could never open. This client answers like Postgres: 42703 for an unknown column.
const CURRENT_AFFAIRS_COLUMNS = new Set(["id", "source", "ministry", "node_id", "created_at"]);

const PIB_ROWS = [
  { id: "1", ministry: "Ministry of Finance" },
  { id: "2", ministry: "Ministry of Home Affairs" },
  { id: "3", ministry: "Government of India" },
  { id: "4", ministry: "Ministry of Commerce & Industry" },
];
const NODE_ROWS = [
  { id: "1", node_id: "GS2.POL.CONSTITUTION" },
  { id: "2", node_id: "GS3.ECO.MONETARY" },
  { id: "3", node_id: null },
  { id: "4", node_id: "GS2.IR.BILATERAL" },
  { id: "5", node_id: "GS3.ENV.RENEWABLE" },
];

function fakeClient() {
  const selects: Array<{ table: string; cols: string }> = [];
  const respond = (table: string, cols: string) => {
    if (table === "current_affairs") {
      const unknown = cols.split(",").map((c) => c.trim()).filter((c) => !CURRENT_AFFAIRS_COLUMNS.has(c));
      if (unknown.length > 0) {
        return { data: null, error: { code: "42703", message: `column current_affairs.${unknown[0]} does not exist` } };
      }
      if (cols.includes("ministry")) return { data: PIB_ROWS, error: null };
      if (cols.includes("node_id")) return { data: NODE_ROWS, error: null };
    }
    return { data: [], error: null };
  };
  return {
    selects,
    from(table: string) {
      let cols = "";
      const builder: any = {
        select(c: string) { cols = c; selects.push({ table, cols: c }); return builder; },
        eq: () => builder, not: () => builder, order: () => builder, limit: () => builder,
        gte: () => builder, lt: () => builder, in: () => builder,
        then: (resolve: any, reject: any) => Promise.resolve(respond(table, cols)).then(resolve, reject),
      };
      return builder;
    },
  };
}

async function gather() {
  const since = process.env.RADAR_V2_SINCE;
  delete process.env.RADAR_V2_SINCE;
  try {
    const client = fakeClient();
    const inputs = await gatherInputs("2026-10-21", client);
    return { inputs, client };
  } finally {
    if (since !== undefined) process.env.RADAR_V2_SINCE = since;
  }
}

test("PIB ministry gate: share of latest PIB rows whose ministry is not the 'Government of India' fallback", async () => {
  const { inputs } = await gather();
  assert.equal(inputs.pib_non_fallback_ministry_rate, 0.75);
  assert.equal(inputs.pib_total, 4);
});

test("node gate: share of latest rows with current_affairs.node_id set", async () => {
  const { inputs } = await gather();
  assert.equal(inputs.passing_rows_node_id_rate, 0.8);
  assert.equal(inputs.passing_rows_total, 5);
});

test("eval never selects a current_affairs column outside the known set", async () => {
  const { client } = await gather();
  for (const { table, cols } of client.selects.filter((s) => s.table === "current_affairs")) {
    for (const col of cols.split(",").map((c) => c.trim())) {
      assert.ok(CURRENT_AFFAIRS_COLUMNS.has(col), `current_affairs.${col} is not a known column`);
    }
  }
});
