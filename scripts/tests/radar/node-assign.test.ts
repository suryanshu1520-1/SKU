import test from "node:test";
import assert from "node:assert/strict";
import { assignNode } from "../../../server-lib/policy/node-assign.ts";
import { nodeById } from "../../../server-lib/cron/ingest/syllabus/nodes.ts";

test("TASK_085D: Node Assign - Contract Acceptance Fixtures", async (t) => {
  await t.test("India-New Zealand FTA assigns to GS3.ECO.TRADE", () => {
    const res = assignNode({
      headline: "India-New Zealand Free Trade Agreement to take effect on October 20, 2026, unlocking new export opportunities.",
      bullets: [],
      tags: [],
    });
    assert.equal(res.nodeId, "GS3.ECO.TRADE");
    assert.ok(res.score > 0);
  });

  await t.test("Banking regulation directions assigns to GS3.ECO or prefix GS3.ECO", () => {
    const res = assignNode({
      headline: "Directions under Section 35A read with Section 56 of the Banking Regulation Act, 1949 – The Konark Urban Co-operative Bank",
      bullets: [],
      tags: [],
    });
    // Contract explicitly allows asserting stated node (GS3.ECO.BANKING) or its parent prefix (GS3.ECO)
    assert.ok(
      res.nodeId === "GS3.ECO.BANKING" || res.nodeId?.startsWith("GS3.ECO"),
      `Expected GS3.ECO.BANKING or GS3.ECO prefix, got ${res.nodeId}`
    );
  });

  await t.test("India-Saudi bilateral interconnection assigns to prefix GS2.IR", () => {
    const res = assignNode({
      headline: "India and Saudi Arabia Discuss Bilateral Power Interconnection Initiative",
      bullets: [],
      tags: [],
    });
    assert.ok(res.nodeId?.startsWith("GS2.IR"), `Expected prefix GS2.IR, got ${res.nodeId}`);
  });

  await t.test("Ceremonial / floral tributes headline returns nodeId: null", () => {
    const res = assignNode({
      headline: "Union Minister pays floral tributes to martyrs at the National War Memorial",
      bullets: [],
      tags: [],
    });
    assert.equal(res.nodeId, null);
    assert.equal(res.score, 0);
  });
});

test("TASK_085D: Node Assign - Integration & Guardrails", async (t) => {
  await t.test("Concatenation of bullets and tags enriches classification", () => {
    const res = assignNode({
      headline: "Government signs key multilateral pact",
      bullets: [
        "The treaty addresses emissions reduction under the Paris Agreement framework",
        "Parties agreed on common carbon accounting standards"
      ],
      tags: ["Climate Change", "UNFCCC"],
    });
    assert.ok(res.nodeId !== null, "Should resolve a node when context is in bullets");
    assert.ok(res.nodeId.startsWith("GS3.ENV") || res.nodeId.startsWith("GS2.IR"), `Resolved: ${res.nodeId}`);
  });

  await t.test("Empty or whitespace input returns nodeId: null", () => {
    const res = assignNode({
      headline: "",
      bullets: [],
      tags: [],
    });
    assert.equal(res.nodeId, null);
    assert.equal(res.score, 0);
    assert.equal(res.runnerUp, null);
  });

  await t.test("Assigned nodeId always exists in syllabus taxonomy (FK safety)", () => {
    const res = assignNode({
      headline: "Reserve Bank of India Monetary Policy Committee increases Repo Rate by 25 basis points",
      bullets: ["Inflation target remains at 4 percent"],
      tags: ["RBI", "Monetary Policy"],
    });
    assert.ok(res.nodeId !== null);
    const node = nodeById(res.nodeId);
    assert.ok(node !== undefined, `Node ${res.nodeId} must exist in taxonomy`);
  });
});
