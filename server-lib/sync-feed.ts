import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";
import { getSources } from "./cron/ingest/sources.js";

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

const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
if (!rawSupabaseUrl) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Supabase URL missing.");
const rawSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!rawSupabaseKey) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Secret missing.");
const supabase = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseKey));

const COOLDOWN_SECONDS = 300; // 5 minutes user-level throttle

// Dispatchable sources — derived from the unified ingest registry so this can
// never drift from what the worker can actually process (P2 consolidation).
const ALL_SOURCES = getSources().map((s) => s.id);

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/, '').trim();

  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing authorization token.' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired session token.' });
  }

  const userId = user.id;

  // Zero-Wait Dispatcher: return 202 BEFORE any heavy I/O
  res.status(202).json({
    status: "processing",
    message: "Dispatching workers..."
  });

  // Defer all heavy I/O to waitUntil, preventing Vercel from suspending
  // the container before the background scraping completes.
  waitUntil(
    (async () => {
      try {
        // Step 1: Query the user's last_sync_timestamp (user-level throttle)
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('last_sync_timestamp')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileError) {
          console.error('[sync-feed] Profile query error:', profileError);
          return;
        }

        if (profile) {
          const lastSync = new Date(profile.last_sync_timestamp).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - lastSync) / 1000);

          if (elapsed < COOLDOWN_SECONDS) {
            const remaining = COOLDOWN_SECONDS - elapsed;
            console.log('[sync-feed] Cooldown active for user ' + userId + ': ' + remaining + 's remaining');
            return;
          }
        }

        // Step 2: Query source_reputation for all sources
        const { data: reputationRows } = await supabase
          .from('source_reputation')
          .select('source_id, fail_count, last_failure_at')
          .in('source_id', ALL_SOURCES);

        const reputationMap: Record<string, { fail_count: number; last_failure_at: string | null }> = {};
        if (reputationRows) {
          for (const row of reputationRows) {
            reputationMap[row.source_id] = {
              fail_count: row.fail_count ?? 0,
              last_failure_at: row.last_failure_at
            };
          }
        }

        const activeSources: string[] = [];

        for (const source of ALL_SOURCES) {
          const status = reputationMap[source];
          console.log(`[sync-feed] Evaluating source: ${source}, status:`, status);

          let isEligible = true; // Open by default

          // Only apply backoff logic if the record explicitly shows failures
          if (status && status.fail_count > 0 && status.last_failure_at) {
            const lastFail = new Date(status.last_failure_at).getTime();
            const cooldown = 5 * 60 * 1000 * Math.pow(2, status.fail_count - 1);

            const diff = Date.now() - lastFail;
            console.log(`[sync-feed] Backoff check for ${source}: diff=${diff}, cooldown=${cooldown}`);

            // If within the cooldown period, skip
            if (diff < Math.min(cooldown, 86400000)) {
              console.log(`[sync-feed] Adaptive Scraper: Backing off from volatile source: ${source}`);
              isEligible = false;
            }
          }

          if (isEligible) {
            activeSources.push(source);
          }
        }

        console.log(`[sync-feed] Active sources identified for dispatch:`, activeSources);

        // Step 3: Construct absolute base URL for internal worker dispatch
        // Use production domain to guarantee reachability; fallback for local dev
        const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
          : "https://tarkv1.vercel.app";

        const workerSecret = process.env.INTERNAL_WORKER_SECRET || "";

        // Step 4: Await dispatches using Promise.all to force the event loop
        // to hold open until outbound network requests are fired.
        await Promise.all(activeSources.map(async (source) => {
          const targetUrl = baseUrl + "/api/internal/worker?source=" + encodeURIComponent(source);
          console.log("[sync-feed] Attempting dispatch to: " + targetUrl);

          try {
            const response = await fetch(targetUrl, {
              headers: {
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + workerSecret,
              }
            });
            console.log("[sync-feed] Dispatch success for " + source + ": " + response.status);
          } catch (error) {
            console.error("[sync-feed] Dispatch FAILED for " + source + ":", error);
          }
        }));

        // Step 5: Update the last_sync_timestamp after dispatch
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ last_sync_timestamp: new Date().toISOString() })
          .eq('user_id', userId);

        if (updateError) {
          console.error('[sync-feed] Failed to update sync timestamp:', updateError);
        }

        console.log("[sync-feed] Dispatched " + activeSources.length + " active sources: " + activeSources.join(", "));

      } catch (err: any) {
        console.error("Background sync failed:", err);
      }
    })()
  );
}