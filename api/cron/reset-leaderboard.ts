import { createClient } from "@supabase/supabase-js";

// ============================================================
// SECURE WEEKLY LEADERBOARD RESET ENDPOINT
// Protected by CRON_SECRET — rejects unauthorized requests.
// Delegates all scoring logic to the PostgreSQL RPC
// process_weekly_leaderboard() for atomic execution.
// ============================================================

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

export default async function handler(req: any, res: any) {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ----- AUTHORIZATION (Risk 3 mitigation) -----
  // Reject requests without a valid CRON_SECRET
  const authHeader = req.headers['authorization'] || '';
  const cronSecret = cleanEnvValue(process.env.CRON_SECRET || '');

  if (!cronSecret) {
    console.error("[reset-leaderboard] CRON_SECRET is not configured on the server");
    return res.status(500).json({ error: "Server misconfiguration: CRON_SECRET not set" });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Initialize service-role Supabase client
    const supabaseUrl = cleanEnvValue(
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "https://ixngfxaerlkkcacrbdgc.supabase.co"
    );
    const serviceKey = cleanEnvValue(
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      ""
    );

    const supabase = createClient(supabaseUrl, serviceKey);

    // ----- EXECUTE ATOMIC RESET (Risk 2 mitigation) -----
    // All logic lives in the PostgreSQL SECURITY DEFINER RPC —
    // this is a single atomic call, no partial state possible.
    const { data: winnerId, error } = await supabase.rpc('process_weekly_leaderboard');

    if (error) {
      console.error("[reset-leaderboard] RPC failed:", error);
      return res.status(500).json({ error: "Leaderboard reset failed: " + error.message });
    }

    console.log(`[reset-leaderboard] Weekly reset complete. Winner: ${winnerId || 'none'}`);
    return res.status(200).json({
      success: true,
      winner_id: winnerId,
      message: winnerId
        ? `Leaderboard reset. Trophy awarded to user ${winnerId}.`
        : "Leaderboard reset. No contenders this week."
    });
  } catch (err: any) {
    console.error("[reset-leaderboard] Unexpected error:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
}