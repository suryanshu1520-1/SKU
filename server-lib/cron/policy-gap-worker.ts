/**
 * server-lib/cron/policy-gap-worker.ts
 *
 * Daily worker to compute lifecycle gaps with Kaplan-Meier timing across all policy programs.
 * Writes output to public.program_gaps.
 * TASK_085L
 */

import { createClient } from "@supabase/supabase-js";
import {
  computeAllTransitionStats,
  programGap,
  type ProgramInput,
  type EventInput,
} from "../policy/lifecycle.ts";

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface RunGapWorkerResult {
  ok: boolean;
  programsProcessed?: number;
  reason?: string;
  error?: string;
}

export async function runPolicyGapWorker(): Promise<RunGapWorkerResult> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn("[policy-gap-worker] Supabase service role key unavailable. Aborting gap worker.");
    return { ok: false, reason: "NO_DB_CONNECTION" };
  }

  console.log("[policy-gap-worker] Starting lifecycle gap calculation...");

  // 1. Fetch all policy programs
  const { data: programs, error: progErr } = await supabase
    .from("policy_programs")
    .select("program_slug, kind, name, first_seen_at");

  if (progErr) {
    console.error("[policy-gap-worker] Failed to load policy programs:", progErr);
    return { ok: false, error: progErr.message };
  }

  // 2. Fetch all public policy events
  const { data: events, error: evErr } = await supabase
    .from("policy_events")
    .select("id, program_slug, instrument, event_date, is_public")
    .eq("is_public", true);

  if (evErr) {
    console.error("[policy-gap-worker] Failed to load policy events:", evErr);
    return { ok: false, error: evErr.message };
  }

  const today = new Date().toISOString().slice(0, 10);
  const progInputs: ProgramInput[] = (programs || []).map((p: any) => ({
    program_slug: p.program_slug,
    kind: p.kind,
    name: p.name,
    first_seen_at: p.first_seen_at,
  }));

  const evInputs: EventInput[] = (events || []).map((e: any) => ({
    id: e.id,
    program_slug: e.program_slug,
    instrument: e.instrument,
    event_date: e.event_date,
    is_public: e.is_public,
  }));

  // 3. Compute transition statistics across all programs
  const stats = computeAllTransitionStats(progInputs, evInputs, today);

  // 4. Compute gaps for each program
  const computedAt = new Date().toISOString();
  const rows = progInputs.map((prog) => {
    const gap = programGap(prog, evInputs, stats, today);
    return {
      program_slug: prog.program_slug,
      gap,
      computed_at: computedAt,
    };
  });

  if (rows.length === 0) {
    console.log("[policy-gap-worker] No programs to process.");
    return { ok: true, programsProcessed: 0 };
  }

  // 5. Upsert to public.program_gaps
  const { error: upsertErr } = await supabase
    .from("program_gaps")
    .upsert(rows, { onConflict: "program_slug" });

  if (upsertErr) {
    if (upsertErr.message.includes("relation \"public.program_gaps\" does not exist")) {
      console.warn(
        "[policy-gap-worker] Notice: table program_gaps not yet migrated to DB (pre-migration run). Computed in memory:",
        rows.length
      );
      return { ok: true, programsProcessed: rows.length };
    }
    console.error("[policy-gap-worker] Failed to upsert program_gaps:", upsertErr);
    return { ok: false, error: upsertErr.message };
  }

  console.log(`[policy-gap-worker] Successfully updated lifecycle gaps for ${rows.length} programs.`);
  return { ok: true, programsProcessed: rows.length };
}

if (process.argv[1]?.includes("policy-gap-worker")) {
  runPolicyGapWorker()
    .then((res) => {
      console.log("[policy-gap-worker] Finished with result:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[policy-gap-worker] Uncaught fatal error:", err);
      process.exit(1);
    });
}
