import { createClient } from "@supabase/supabase-js";

export async function upsertCurrentAffairs(params: {
  source: string;
  headline: string;
  url: string;
  ministry: string;
  summary: { bullets: string[] };
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const { source, headline, url, ministry, summary } = params;

  const supabaseUrl =
    process.env.SUPABASE_URL ?? "https://ixngfxaerlkkcacrbdgc.supabase.co";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const row = {
    source,
    headline,
    summary, // { bullets: string[] } — matches frontend contract
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