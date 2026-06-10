import { createClient } from "@supabase/supabase-js";
import { runPolicyPipeline } from "./cron/pipeline.js";

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

const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://ixngfxaerlkkcacrbdgc.supabase.co";
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmdmeGFlcmxra2NhY3JiZGdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDIxNjc0NCwiZXhwIjoyMDk1NzkyNzQ0fQ.BY5YQh7nbSUrNZ61nHDIuzOX2P2s3iD3L_s11QHz9mg";

const supabase = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawServiceKey));

const COOLDOWN_SECONDS = 300; // 5 minutes

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: "Missing required field: userId" });
    }

    // Step 1: Query the user's last_sync_timestamp
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('last_sync_timestamp')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error("[sync-feed] Profile query error:", profileError);
      return res.status(500).json({ error: "Failed to query sync cooldown state" });
    }

    if (profile) {
      const lastSync = new Date(profile.last_sync_timestamp).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - lastSync) / 1000);

      if (elapsed < COOLDOWN_SECONDS) {
        const remaining = COOLDOWN_SECONDS - elapsed;
        console.log(`[sync-feed] Cooldown active for user ${userId}: ${remaining}s remaining`);
        return res.status(429).json({
          status: 429,
          message: `Sync cooldown active. Available in ${remaining} seconds.`,
          remaining
        });
      }
    }

    // Step 2: Cooldown expired or first sync — run the pipeline
    console.log(`[sync-feed] Cooldown cleared for user ${userId}. Running pipeline.`);
    const result = await runPolicyPipeline();

    // Step 3: Update the last_sync_timestamp
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ last_sync_timestamp: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateError) {
      console.error("[sync-feed] Failed to update sync timestamp:", updateError);
      // Non-fatal — pipeline already ran
    }

    return res.status(200).json({ ...result, cooldown_reset: true });
  } catch (err: any) {
    console.error("[sync-feed] Handler error:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
}