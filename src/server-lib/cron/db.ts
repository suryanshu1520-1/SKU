import { createClient } from "@supabase/supabase-js";

// ─── STRICT ENV VALIDATION ───────────────────────────────────
if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL environment variable is required");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
}

export async function upsertCurrentAffairs(params: {
  source: string;
  headline: string;
  url: string;
  ministry: string;
  summary: { bullets: string[] };
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const { source, headline, url, ministry, summary } = params;

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const row = {
    source,
    headline,
    summary,
    url,
    ministry,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from("current_affairs")
      .upsert([row], { onConflict: "url" });

    if (error) return { ok: false, errorMessage: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, errorMessage: e?.message ?? String(e) };
  }
}