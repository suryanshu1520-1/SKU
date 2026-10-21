import { createClient } from "@supabase/supabase-js";

function cleanEnvValue(val: any): string {
  if (typeof val !== 'string') return '';
  let cleaned = val.trim();
  while (cleaned.startsWith('"') || cleaned.startsWith("'")) {
    cleaned = cleaned.substring(1);
  }
  while (cleaned.endsWith('"') || cleaned.endsWith("'")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }
  return cleaned.trim();
}

function getSupabaseServer(): any {
  const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const rawSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rawSupabaseUrl || !rawSupabaseKey) return null;
  return createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseKey));
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseServer = getSupabaseServer();
  if (!supabaseServer) {
    return res.status(503).json({ error: "SERVICE_UNAVAILABLE", message: "User limits database unavailable." });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: "userId query parameter is required" });
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (userId === 'guest' || !UUID_REGEX.test(userId)) {
      res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=10, stale-while-revalidate=10');
      return res.status(200).json({
        tier: 'free',
        vanguardUsed: 0,
        insightsUsed: 0,
      });
    }

    const { data, error } = await supabaseServer
      .from('user_profiles')
      .select('membership_tier, vanguard_sessions_used, ai_autopsies_used')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error("[user-limits] Error fetching limits:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "User profile not found" });
    }

    // Set short cache to avoid stale reads immediately after usage, but still protect against hammering
    res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=10, stale-while-revalidate=10');

    return res.status(200).json({
      tier: data.membership_tier || 'free',
      vanguardUsed: data.vanguard_sessions_used || 0,
      insightsUsed: data.ai_autopsies_used || 0,
    });
  } catch (err: any) {
    console.error("[user-limits] Exception:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
}
