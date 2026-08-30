/**
 * server-lib/rebase.ts
 *
 * Authenticated endpoints for Continuous Readiness / Tark Rebase v1:
 *   GET  /api/rebase     — Fetches the verified numeric claim mutation patch for the authenticated user
 *   POST /api/rebase/ack — Monotonically advances the user's Rebase checkpoint watermark
 *
 * Security:
 *   - Resolves identity exclusively from Supabase Bearer JWT via supabase.auth.getUser(token).
 *   - Never accepts userId from query params or body.
 *   - Adheres strictly to the schema contract in src/lib/rebase.ts.
 */

import { createClient } from "@supabase/supabase-js";
import type { RebasePatch, RebasePatchItem } from "../src/lib/rebase.js";

function cleanEnv(val: any): string {
  if (typeof val !== "string") return "";
  let c = val.trim();
  while (c.startsWith('"') || c.startsWith("'")) c = c.substring(1);
  while (c.endsWith('"') || c.endsWith("'")) c = c.substring(0, c.length - 1);
  return c.trim();
}

function getSupabase() {
  const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!rawSupabaseUrl) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Supabase URL missing.");
  const rawSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rawSupabaseKey) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Secret missing.");
  return createClient(cleanEnv(rawSupabaseUrl), cleanEnv(rawSupabaseKey));
}

/**
 * Authenticate request via Bearer token.
 */
async function authenticateUser(req: any, supabase: ReturnType<typeof getSupabase>) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"] || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { user: null, error: "Missing authorization token" };
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: "Invalid or expired session token" };
  }

  return { user, error: null };
}

/**
 * GET /api/rebase
 */
export async function handleGetRebase(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabase = getSupabase();
  const { user, error: authError } = await authenticateUser(req, supabase);

  if (authError || !user) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: authError || "Authentication required" });
  }

  try {
    // 1. Get user checkpoint
    const { data: checkpoint } = await supabase
      .from("user_rebase_checkpoints")
      .select("last_mutation_sequence, last_run_id, verified_through")
      .eq("user_id", user.id)
      .maybeSingle();

    const fromSequence = checkpoint?.last_mutation_sequence ? String(checkpoint.last_mutation_sequence) : "0";
    const fromVerifiedThrough = checkpoint?.verified_through ? new Date(checkpoint.verified_through).toISOString() : null;

    // 2. Get latest completed ingest run
    const { data: latestRun } = await supabase
      .from("news_ingest_runs")
      .select("id, status, completed_at, ledger_sequence_through")
      .in("status", ["success", "degraded", "warning"])
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const patchId = latestRun?.id || "00000000-0000-0000-0000-000000000000";
    const runVerifiedThrough = latestRun?.completed_at ? new Date(latestRun.completed_at).toISOString() : new Date().toISOString();

    // 3. Query mutations after user's sequence watermark
    const fromSeqBigInt = parseInt(fromSequence, 10) || 0;
    const PAGE_LIMIT = 50;

    const { data: mutations, error: mutError } = await supabase
      .from("news_claim_mutations")
      .select(`
        id,
        sequence,
        action,
        reason,
        effective_at,
        detected_at,
        claim:news_claims (
          id,
          entity,
          metric,
          period,
          unit,
          syllabus_node_id,
          syllabus_tags
        ),
        current_version:news_claim_versions!current_version_id (
          id,
          claim_text,
          value_text,
          evidence_quote,
          evidence_span_ids,
          source_id,
          source_url,
          story_headline,
          story_url,
          observed_at
        ),
        previous_version:news_claim_versions!previous_version_id (
          id,
          claim_text,
          value_text
        )
      `)
      .gt("sequence", fromSeqBigInt)
      .order("sequence", { ascending: true })
      .limit(PAGE_LIMIT + 1);

    if (mutError) {
      console.error("[rebase] Error querying mutations:", mutError);
      return res.status(500).json({ error: "DATABASE_ERROR", message: mutError.message });
    }

    const rawItems = mutations || [];
    const hasMore = rawItems.length > PAGE_LIMIT;
    const returnedItems = hasMore ? rawItems.slice(0, PAGE_LIMIT) : rawItems;

    let learnCount = 0;
    let replaceCount = 0;

    const items: RebasePatchItem[] = returnedItems.map((m: any) => {
      const isLearn = m.action === "learn";
      if (isLearn) learnCount++;
      else replaceCount++;

      const cv = m.current_version;
      const pv = m.previous_version;
      const claim = m.claim;

      return {
        mutationId: m.id,
        action: m.action as "learn" | "replace",
        claimId: claim.id,
        previousText: pv ? pv.claim_text : null,
        currentText: cv.claim_text,
        previousValue: pv ? pv.value_text : null,
        currentValue: cv.value_text,
        reason: m.reason,
        observedAt: new Date(cv.observed_at).toISOString(),
        effectiveAt: m.effective_at ? new Date(m.effective_at).toISOString() : null,
        verificationMethod: "live_cite_or_drop_v1",
        evidence: [
          {
            source: cv.source_id,
            url: cv.source_url,
            quote: cv.evidence_quote,
            spanIds: cv.evidence_span_ids || ["s0"],
          },
        ],
        syllabus: {
          nodeId: claim.syllabus_node_id || null,
          tags: claim.syllabus_tags || [],
        },
        story: {
          headline: cv.story_headline,
          url: cv.story_url,
        },
      };
    });

    const throughSequence = returnedItems.length > 0
      ? String(returnedItems[returnedItems.length - 1].sequence)
      : fromSequence;

    const status: "changes" | "empty" | "degraded" =
      items.length > 0
        ? "changes"
        : latestRun?.status === "degraded"
        ? "degraded"
        : "empty";

    const responsePayload: RebasePatch = {
      schemaVersion: 1,
      patchId,
      fromCheckpoint: {
        sequence: fromSequence,
        verifiedThrough: fromVerifiedThrough,
      },
      throughSequence,
      verifiedThrough: runVerifiedThrough,
      status,
      counts: {
        learn: learnCount,
        replace: replaceCount,
        watch: 0,
        retire: 0,
      },
      items,
      hasMore,
    };

    return res.status(200).json(responsePayload);
  } catch (err: any) {
    console.error("[rebase] Exception in handleGetRebase:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Unknown error" });
  }
}

/**
 * POST /api/rebase/ack
 */
export async function handlePostRebaseAck(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabase = getSupabase();
  const { user, error: authError } = await authenticateUser(req, supabase);

  if (authError || !user) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: authError || "Authentication required" });
  }

  const { patchId, throughMutationId } = req.body || {};

  try {
    let targetSequence = 0;

    if (throughMutationId) {
      const { data: mut, error: mErr } = await supabase
        .from("news_claim_mutations")
        .select("sequence")
        .eq("id", throughMutationId)
        .maybeSingle();

      if (mErr || !mut) {
        return res.status(400).json({ error: "INVALID_MUTATION", message: "Mutation not found" });
      }
      targetSequence = Number(mut.sequence);
    }

    // Get current checkpoint
    const { data: currentCp } = await supabase
      .from("user_rebase_checkpoints")
      .select("last_mutation_sequence")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentSeq = Number(currentCp?.last_mutation_sequence || 0);
    const newSeq = Math.max(currentSeq, targetSequence);

    // Get verified_through from patch run if provided
    let verifiedThroughTime = new Date().toISOString();
    if (patchId && patchId !== "00000000-0000-0000-0000-000000000000") {
      const { data: run } = await supabase
        .from("news_ingest_runs")
        .select("completed_at")
        .eq("id", patchId)
        .maybeSingle();
      if (run?.completed_at) {
        verifiedThroughTime = new Date(run.completed_at).toISOString();
      }
    }

    // Upsert checkpoint
    const { error: upsertErr } = await supabase
      .from("user_rebase_checkpoints")
      .upsert({
        user_id: user.id,
        last_mutation_sequence: newSeq,
        last_run_id: patchId && patchId !== "00000000-0000-0000-0000-000000000000" ? patchId : null,
        verified_through: verifiedThroughTime,
        updated_at: new Date().toISOString(),
      });

    if (upsertErr) {
      console.error("[rebase] Error upserting checkpoint:", upsertErr);
      return res.status(500).json({ error: "DATABASE_ERROR", message: upsertErr.message });
    }

    return res.status(200).json({
      ok: true,
      sequence: String(newSeq),
      verifiedThrough: verifiedThroughTime,
    });
  } catch (err: any) {
    console.error("[rebase] Exception in handlePostRebaseAck:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Unknown error" });
  }
}
