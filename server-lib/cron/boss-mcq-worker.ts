/**
 * server-lib/cron/boss-mcq-worker.ts
 *
 * Daily worker to generate grounded Full-Chain Boss MCQs by construction.
 * Writes output to public.policy_boss_mcqs.
 * TASK_085O
 */

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildBossMcq, type TrueStmt } from "../policy/boss-mcq.ts";
import { extractFacts } from "./ingest/verify.ts";
import type { RegistryRow } from "../policy/tiers.ts";

function loadSeedAuthorities(): RegistryRow[] {
  try {
    const p = new URL("../policy/data/authorities.seed.json", import.meta.url);
    const content = fs.readFileSync(p, "utf-8");
    return JSON.parse(content) as RegistryRow[];
  } catch {
    return [];
  }
}

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface RunBossMcqWorkerResult {
  ok: boolean;
  generatedCount?: number;
  reason?: string;
  error?: string;
}

export async function runBossMcqWorker(): Promise<RunBossMcqWorkerResult> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn("[boss-mcq-worker] Supabase service role key unavailable. Aborting worker.");
    return { ok: false, reason: "NO_DB_CONNECTION" };
  }

  console.log("[boss-mcq-worker] Starting Boss MCQ generation...");

  // 1. Fetch policy programs
  const { data: programs, error: progErr } = await supabase
    .from("policy_programs")
    .select("program_slug, name");

  if (progErr || !programs) {
    console.error("[boss-mcq-worker] Failed to load policy programs:", progErr);
    return { ok: false, error: progErr?.message };
  }

  // 2. Fetch public policy events
  const { data: events, error: evErr } = await supabase
    .from("policy_events")
    .select("id, program_slug, actor_slug, summary, evidence, is_public")
    .eq("is_public", true);

  if (evErr) {
    console.error("[boss-mcq-worker] Failed to load policy events:", evErr);
    return { ok: false, error: evErr.message };
  }

  // 3. Load authority registry
  const registry = loadSeedAuthorities();

  const eventsByProgram = new Map<string, any[]>();
  for (const ev of events || []) {
    if (!ev.program_slug) continue;
    const list = eventsByProgram.get(ev.program_slug) || [];
    list.push(ev);
    eventsByProgram.set(ev.program_slug, list);
  }

  const editionDate = new Date().toISOString().slice(0, 10);
  const rowsToUpsert: any[] = [];

  for (const prog of programs) {
    const progEvents = eventsByProgram.get(prog.program_slug) || [];
    if (progEvents.length < 3) continue;

    const trues: TrueStmt[] = progEvents.map((e) => {
      const evidenceList = Array.isArray(e.evidence) ? e.evidence : [];
      const quote = evidenceList[0]?.quote || e.summary;
      const url = evidenceList[0]?.source_url || "";
      const facts = extractFacts(e.summary);
      return {
        text: e.summary,
        eventId: e.id,
        actorSlug: e.actor_slug || null,
        numbers: facts,
        quote,
        url,
      };
    });

    try {
      const built = await buildBossMcq(
        { slug: prog.program_slug, name: prog.name },
        trues,
        registry,
        editionDate
      );

      if (built) {
        const keyIndexMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
        const numberedStmts = built.statements
          .map((s, idx) => `${idx + 1}. ${s}`)
          .join("\n");
        const fullQuestion = `${built.stem}\n${numberedStmts}`;
        const firstFalse = built.dissection.find((d) => !d.is_true);

        rowsToUpsert.push({
          program_slug: prog.program_slug,
          edition_date: editionDate,
          question: fullQuestion,
          options: ["Only one", "Only two", "All three", "None"],
          correct_index: keyIndexMap[built.key],
          statement_dissection: built.dissection,
          primary_operator: firstFalse?.operator || null,
          generator_version: "boss_v1",
          created_at: new Date().toISOString(),
        });
      }
    } catch (buildErr) {
      console.warn(`[boss-mcq-worker] Failed to build Boss MCQ for ${prog.program_slug}:`, buildErr);
    }
  }

  if (rowsToUpsert.length === 0) {
    console.log("[boss-mcq-worker] No programs qualified for Boss MCQ generation.");
    return { ok: true, generatedCount: 0 };
  }

  // 4. Upsert into public.policy_boss_mcqs
  const { error: upsertErr } = await supabase
    .from("policy_boss_mcqs")
    .upsert(rowsToUpsert, { onConflict: "program_slug, edition_date" });

  if (upsertErr) {
    if (upsertErr.message.includes("relation \"public.policy_boss_mcqs\" does not exist")) {
      console.warn(
        "[boss-mcq-worker] Notice: table policy_boss_mcqs not yet migrated to DB (pre-migration run). Generated in memory:",
        rowsToUpsert.length
      );
      return { ok: true, generatedCount: rowsToUpsert.length };
    }
    console.error("[boss-mcq-worker] Failed to upsert policy_boss_mcqs:", upsertErr);
    return { ok: false, error: upsertErr.message };
  }

  console.log(`[boss-mcq-worker] Successfully generated ${rowsToUpsert.length} Boss MCQs for edition ${editionDate}.`);
  return { ok: true, generatedCount: rowsToUpsert.length };
}

if (process.argv[1]?.includes("boss-mcq-worker")) {
  runBossMcqWorker()
    .then((res) => {
      console.log("[boss-mcq-worker] Finished with result:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[boss-mcq-worker] Uncaught fatal error:", err);
      process.exit(1);
    });
}
