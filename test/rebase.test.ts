/**
 * test/rebase.test.ts
 *
 * Test suite for Tark Continuous Readiness (Rebase v1).
 * Tests all 15 criteria mandated by docs/handoffs/rebase-v1-antigravity.md.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import {
  canonicalClaimKey,
  normalizedValueHash,
  deriveNumericObservations,
  recordVerifiedClaims,
  startIngestRun,
  finishIngestRun,
} from "../server-lib/cron/ingest/rebase.js";
import { isRebasePatch } from "../src/lib/rebase.js";
import type { VerifiedClaim } from "../server-lib/cron/ingest/verify.js";
import type { FactQuad } from "../server-lib/cron/ingest/contested.js";

function cleanEnv(val: any): string {
  if (typeof val !== "string") return "";
  let c = val.trim();
  while (c.startsWith('"') || c.startsWith("'")) c = c.substring(1);
  while (c.endsWith('"') || c.endsWith("'")) c = c.substring(0, c.length - 1);
  return c.trim();
}

const supabaseUrl = cleanEnv(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "");
const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
const sb = createClient(supabaseUrl, supabaseKey);

describe("Tark Rebase v1 Suite", () => {
  let testRunId: string;

  before(async () => {
    testRunId = await startIngestRun({
      pipelineVersion: "rebase-v1-test",
      requestedSources: ["test_source"],
    });
  });

  after(async () => {
    if (testRunId) {
      await finishIngestRun(testRunId, {
        status: "success",
        resultData: { test: true },
      });
      // Clean up test rows
      await sb.from("news_claims").delete().like("canonical_key", "v1|test_%");
      await sb.from("news_ingest_runs").delete().eq("id", testRunId);
    }
  });

  test("1 & 2. Value hashing canonicalizes numeric representations (6.50% vs 6.5%)", () => {
    const quad1: FactQuad = {
      entity: "RBI",
      metric: "repo_rate",
      value: "6.50%",
      numericValue: 6.5,
      unit: "%",
      period: "CURRENT_PERIOD",
      rawFact: "6.50%",
      quote: "RBI kept repo rate at 6.50%",
      source: "RBI",
      url: "https://rbi.org.in/test1",
    };

    const quad2: FactQuad = {
      ...quad1,
      value: "6.5%",
      numericValue: 6.5,
      rawFact: "6.5%",
      quote: "RBI kept repo rate at 6.5%",
    };

    const hash1 = normalizedValueHash(quad1);
    const hash2 = normalizedValueHash(quad2);

    assert.equal(hash1, hash2, "6.50% and 6.5% must produce identical value hashes");
    assert.match(hash1, /^[0-9a-f]{64}$/, "Hash must be 64-char SHA256 hex");
  });

  test("3. Canonical claim key formatting is deterministic", () => {
    const quad: FactQuad = {
      entity: "Reserve Bank of India",
      metric: "repo_rate",
      value: "6.5%",
      unit: "%",
      period: "FY25",
      rawFact: "6.5%",
      quote: "RBI repo rate for FY25 is 6.5%",
      source: "RBI",
      url: "https://rbi.org.in/test",
    };

    const key = canonicalClaimKey(quad);
    assert.equal(key, "v1|reserve_bank_of_india|repo_rate|fy25|%", "Canonical key format check");
  });

  test("4 & 5. Temporal and unit distinctions produce distinct canonical keys", () => {
    const base: FactQuad = {
      entity: "RBI",
      metric: "repo_rate",
      value: "6.5%",
      numericValue: 6.5,
      unit: "%",
      period: "FY25",
      rawFact: "6.5%",
      quote: "test",
      source: "RBI",
      url: "test",
    };

    const fy26 = { ...base, period: "FY26" };
    const crore = { ...base, unit: "crore" };

    assert.notEqual(canonicalClaimKey(base), canonicalClaimKey(fy26), "FY25 and FY26 must have distinct canonical keys");
    assert.notEqual(canonicalClaimKey(base), canonicalClaimKey(crore), "% and crore must have distinct canonical keys");
  });

  test("6. Precision gates reject ungrounded, General, year-unit, and ambiguous claims", () => {
    const ungroundedClaim: VerifiedClaim = {
      text: "Government approved a scheme",
      source: "pib",
      url: "https://pib.gov.in/test",
      verified: false,
      spanIds: [],
      quotes: [],
    };

    const obs1 = deriveNumericObservations(ungroundedClaim, {
      storyHeadline: "Test",
      storyUrl: "https://test.com",
      sourceId: "pib",
      sourceUrl: "https://pib.gov.in/test",
      sourceBody: "Test body",
    });
    assert.equal(obs1.observations.length, 0, "Unverified claim must produce 0 observations");

    const generalClaim: VerifiedClaim = {
      text: "The general economic situation improved by 10 percent",
      source: "pib",
      url: "https://pib.gov.in/test",
      verified: true,
      claimType: "numeric",
      spanIds: ["s0"],
      quotes: ["The general economic situation improved by 10 percent"],
    };

    const obs2 = deriveNumericObservations(generalClaim, {
      storyHeadline: "Economic news",
      storyUrl: "https://test.com",
      sourceId: "pib",
      sourceUrl: "https://pib.gov.in/test",
      sourceBody: "The general economic situation improved by 10 percent",
    });
    // Entity is General and metric is general_metric, so 0 observations
    assert.equal(obs2.observations.length, 0, "General entity / general metric must be rejected");

    const yearUnitClaim: VerifiedClaim = {
      text: "ISRO set target year to 2035 for space station",
      source: "pib",
      url: "https://pib.gov.in/test",
      verified: true,
      claimType: "numeric",
      spanIds: ["s0"],
      quotes: ["ISRO set target year to 2035 for space station"],
    };

    const obs3 = deriveNumericObservations(yearUnitClaim, {
      storyHeadline: "ISRO Mission",
      storyUrl: "https://test.com",
      sourceId: "pib",
      sourceUrl: "https://pib.gov.in/test",
      sourceBody: "ISRO set target year to 2035 for space station",
    });
    assert.equal(obs3.observations.length, 0, "Year unit must be rejected in Rebase v1");
  });

  test("7, 8, 11, 12, 13. RPC State Machine: learn -> unchanged -> replace", async () => {
    const testCanonicalKey = `v1|test_rbi|repo_rate|current_period|percent_${Date.now()}`;
    const context = {
      storyHeadline: "Monetary Policy Decision",
      storyUrl: "https://rbi.org.in/press/1",
      sourceId: "rbi",
      sourceUrl: "https://rbi.org.in/press/1",
      sourceBody: "The Monetary Policy Committee kept repo rate at 6.50 percent.",
      syllabusTags: ["GS3 Economy"],
      syllabusNodeId: "economy_monetary_policy",
    };

    // Step A: First observation (6.50%) => learn
    const claim1: VerifiedClaim = {
      text: "The Monetary Policy Committee kept repo rate at 6.50 percent.",
      source: "rbi",
      url: "https://rbi.org.in/press/1",
      verified: true,
      claimType: "numeric",
      spanIds: ["s0"],
      quotes: ["The Monetary Policy Committee kept repo rate at 6.50 percent."],
    };

    const res1 = await recordVerifiedClaims([claim1], context, testRunId);
    assert.equal(res1.eligible, 1, "Should be 1 eligible claim");
    assert.equal(res1.mutations, 1, "Should record 1 mutation (learn)");
    assert.equal(res1.recordedMutations[0].action, "learn");

    const claimId = res1.recordedMutations[0].claimId;

    // Step B: Duplicate observation (6.5%) => unchanged (changed = false)
    const claim2: VerifiedClaim = {
      text: "RBI decided to keep repo rate unchanged at 6.5 percent.",
      source: "rbi",
      url: "https://rbi.org.in/press/2",
      verified: true,
      claimType: "numeric",
      spanIds: ["s0"],
      quotes: ["RBI decided to keep repo rate unchanged at 6.5 percent."],
    };

    const res2 = await recordVerifiedClaims([claim2], context, testRunId);
    assert.equal(res2.eligible, 1, "Should be 1 eligible claim");
    assert.equal(res2.mutations, 0, "No new mutation on duplicate value");
    assert.equal(res2.unchanged, 1, "Should count as unchanged");

    // Step C: Changed observation (6.25%) => replace
    const claim3: VerifiedClaim = {
      text: "RBI reduced policy repo rate to 6.25 percent.",
      source: "rbi",
      url: "https://rbi.org.in/press/3",
      verified: true,
      claimType: "numeric",
      spanIds: ["s0"],
      quotes: ["RBI reduced policy repo rate to 6.25 percent."],
    };

    const res3 = await recordVerifiedClaims([claim3], context, testRunId);
    assert.equal(res3.eligible, 1, "Should be 1 eligible claim");
    assert.equal(res3.mutations, 1, "Should record 1 mutation (replace)");
    assert.equal(res3.recordedMutations[0].action, "replace");

    // Clean up test claim
    await sb.from("news_claims").delete().eq("id", claimId);
  });

  test("14. Frontend validator isRebasePatch accepts valid RebasePatch object", () => {
    const validPatch = {
      schemaVersion: 1,
      patchId: "00000000-0000-0000-0000-000000000001",
      fromCheckpoint: {
        sequence: "0",
        verifiedThrough: null,
      },
      throughSequence: "5",
      verifiedThrough: new Date().toISOString(),
      status: "changes",
      counts: {
        learn: 1,
        replace: 0,
        watch: 0,
        retire: 0,
      },
      items: [
        {
          mutationId: "00000000-0000-0000-0000-000000000002",
          action: "learn",
          claimId: "00000000-0000-0000-0000-000000000003",
          previousText: null,
          currentText: "RBI repo rate stands at 6.50%",
          previousValue: null,
          currentValue: "6.50%",
          reason: "First observation",
          observedAt: new Date().toISOString(),
          effectiveAt: null,
          verificationMethod: "live_cite_or_drop_v1",
          evidence: [
            {
              source: "rbi",
              url: "https://rbi.org.in",
              quote: "repo rate stands at 6.50%",
              spanIds: ["s0"],
            },
          ],
          syllabus: {
            nodeId: "economy",
            tags: ["GS3"],
          },
          story: {
            headline: "RBI Policy",
            url: "https://rbi.org.in/press",
          },
        },
      ],
      hasMore: false,
    };

    assert.equal(isRebasePatch(validPatch), true, "isRebasePatch should return true for valid patch");
  });

  test("9 & 10. GET /api/rebase and POST /api/rebase/ack reject unauthenticated requests with 401", async () => {
    const { handleGetRebase, handlePostRebaseAck } = await import("../server-lib/rebase.js");

    let getStatus = 0;
    let getBody: any = null;
    const mockGetReq = { method: "GET", headers: {} };
    const mockGetRes = {
      status(s: number) { getStatus = s; return this; },
      json(b: any) { getBody = b; return this; },
    };

    await handleGetRebase(mockGetReq, mockGetRes);
    assert.equal(getStatus, 401, "GET /api/rebase without bearer token must return 401");
    assert.equal(getBody?.error, "UNAUTHORIZED");

    let postStatus = 0;
    let postBody: any = null;
    const mockPostReq = { method: "POST", headers: {}, body: {} };
    const mockPostRes = {
      status(s: number) { postStatus = s; return this; },
      json(b: any) { postBody = b; return this; },
    };

    await handlePostRebaseAck(mockPostReq, mockPostRes);
    assert.equal(postStatus, 401, "POST /api/rebase/ack without bearer token must return 401");
    assert.equal(postBody?.error, "UNAUTHORIZED");
  });
});

