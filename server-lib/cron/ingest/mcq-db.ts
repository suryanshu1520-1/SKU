/**
 * server-lib/cron/ingest/mcq-db.ts
 *
 * Database persistence for Daily Briefs auto-generated MCQs (table: current_affairs_mcqs).
 * Uses the Supabase service-role client, upserting on conflict `affair_url`.
 */

import { createClient } from "@supabase/supabase-js";

export type McqRow = {
  affair_url: string;
  headline?: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  subject?: string;
  edition_date?: string;
};

export async function upsertMcq(row: McqRow): Promise<{ ok: boolean; errorMessage?: string }> {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? "https://ixngfxaerlkkcacrbdgc.supabase.co";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const payload = {
    affair_url: row.affair_url,
    headline: row.headline || "",
    question: row.question,
    options: row.options,
    correct_index: row.correct_index,
    explanation: row.explanation || "",
    subject: row.subject || "General Studies",
    edition_date: row.edition_date || new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from("current_affairs_mcqs")
      .upsert([payload], { onConflict: "affair_url" });

    if (error) {
      return { ok: false, errorMessage: error.message };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, errorMessage: e?.message ?? String(e) };
  }
}
