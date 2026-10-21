/**
 * server-lib/cron/node-signal-worker.ts
 *
 * Daily worker to compute node signals:
 * (a) News surge via Gamma-Poisson empirical Bayes + Benjamini-Hochberg FDR
 * (b) Exam weight from syllabus testability estimator
 * Writes output to public.node_signals.
 * TASK_085N
 */

import { createClient } from "@supabase/supabase-js";
import { surge, type SurgeNodeInput } from "../policy/surge.js";
import { NODES } from "./ingest/syllabus/nodes.js";
import { estimateTestability } from "./ingest/syllabus/testability.js";
import type { Evidence } from "./ingest/syllabus/types.js";

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface RunNodeSignalWorkerResult {
  ok: boolean;
  nodesProcessed?: number;
  surgingCount?: number;
  reason?: string;
  error?: string;
}

export async function runNodeSignalWorker(): Promise<RunNodeSignalWorkerResult> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn("[node-signal-worker] Supabase service role key unavailable. Aborting worker.");
    return { ok: false, reason: "NO_DB_CONNECTION" };
  }

  console.log("[node-signal-worker] Starting node signals calculation...");

  // 1. Time windows: W = 14 recent days, T = 180 baseline days
  const W_DAYS = 14;
  const T_DAYS = 180;
  const nowMs = Date.now();
  const recentCutoffMs = nowMs - W_DAYS * 24 * 3600 * 1000;
  const baselineCutoffMs = nowMs - (T_DAYS + W_DAYS) * 24 * 3600 * 1000;

  const baselineCutoffIso = new Date(baselineCutoffMs).toISOString();

  // 2. Fetch current_affairs dispatches within baseline window
  const { data: dispatches, error: dispErr } = await supabase
    .from("current_affairs")
    .select("node_id, published_at")
    .not("node_id", "is", null)
    .gte("published_at", baselineCutoffIso);

  if (dispErr) {
    console.error("[node-signal-worker] Failed to fetch current_affairs:", dispErr);
    return { ok: false, error: dispErr.message };
  }

  const recentCounts = new Map<string, number>();
  const baselineCounts = new Map<string, number>();

  for (const d of dispatches || []) {
    if (!d.node_id || !d.published_at) continue;
    const pubMs = new Date(d.published_at).getTime();
    if (isNaN(pubMs)) continue;

    if (pubMs >= recentCutoffMs) {
      recentCounts.set(d.node_id, (recentCounts.get(d.node_id) || 0) + 1);
    } else if (pubMs >= baselineCutoffMs) {
      baselineCounts.set(d.node_id, (baselineCounts.get(d.node_id) || 0) + 1);
    }
  }

  // 3. Prepare surge inputs across all syllabus nodes
  const surgeInputs: SurgeNodeInput[] = NODES.map((node) => ({
    id: node.id,
    N: baselineCounts.get(node.id) || 0,
    x: recentCounts.get(node.id) || 0,
  }));

  const surgeOutputs = surge(surgeInputs, {
    T: T_DAYS,
    W: W_DAYS,
    q: 0.10,
    minX: 3,
  });

  // 4. Fetch PYQ questions to derive Tier-A evidence for exam testability
  let pyqEvidence: Evidence[] = [];
  try {
    const { data: pyqRows } = await supabase
      .from("pyq_prelims")
      .select("syllabus_node_id, exam_year")
      .not("syllabus_node_id", "is", null);

    if (pyqRows && pyqRows.length > 0) {
      pyqEvidence = pyqRows
        .filter((r: any) => r.syllabus_node_id)
        .map((r: any) => ({
          nodeId: r.syllabus_node_id,
          tier: "A" as const,
          year: typeof r.exam_year === "number" ? r.exam_year : undefined,
        }));
    }
  } catch (pyqErr) {
    console.warn("[node-signal-worker] Non-fatal error loading pyq evidence:", pyqErr);
  }

  // Estimate testability (exam_weight = NodeTestability.score)
  const testabilityMap = estimateTestability(NODES, pyqEvidence);

  // 5. Build database rows
  const computedAt = new Date().toISOString();
  let surgingCount = 0;

  const rows = surgeOutputs.map((out, idx) => {
    if (out.surging) surgingCount++;
    const testability = testabilityMap.get(out.id);
    const examWeight = testability?.score ?? 0;

    return {
      node_id: out.id,
      x_recent: surgeInputs[idx].x,
      n_baseline: surgeInputs[idx].N,
      expected: Number(out.expected.toFixed(4)),
      p: out.p,
      score: Number(out.score.toFixed(4)),
      surging: out.surging,
      exam_weight: Number(examWeight.toFixed(4)),
      computed_at: computedAt,
    };
  });

  // 6. Upsert to public.node_signals
  const { error: upsertErr } = await supabase
    .from("node_signals")
    .upsert(rows, { onConflict: "node_id" });

  if (upsertErr) {
    if (upsertErr.message.includes("relation \"public.node_signals\" does not exist")) {
      console.warn(
        "[node-signal-worker] Notice: table node_signals not yet migrated to DB (pre-migration run). Computed in memory:",
        rows.length
      );
      return { ok: true, nodesProcessed: rows.length, surgingCount };
    }
    console.error("[node-signal-worker] Failed to upsert node_signals:", upsertErr);
    return { ok: false, error: upsertErr.message };
  }

  console.log(
    `[node-signal-worker] Successfully updated signals for ${rows.length} syllabus nodes (${surgingCount} surging).`
  );
  return { ok: true, nodesProcessed: rows.length, surgingCount };
}

if (process.argv[1]?.includes("node-signal-worker")) {
  runNodeSignalWorker()
    .then((res) => {
      console.log("[node-signal-worker] Finished with result:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[node-signal-worker] Uncaught fatal error:", err);
      process.exit(1);
    });
}
