import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";

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

const COOLDOWN_SECONDS = 300; // 5 minutes user-level throttle

// 7 target sources for the adaptive scraper engine
const ALL_SOURCES = [
  "PIB",
  "ECONOMIC TIMES",
  "LIVEMINT",
  "THE HINDU",
  "RBI",
  "INDIAN EXPRESS",
  "BUSINESS STANDARD"
];

// Exponential backoff: 5 minutes * 2^(fail_count - 1), capped at 24 hours
function computeCooldownMs(failCount: number): number {
  if (failCount <= 0) return 0;
  const raw = 5 * 60 * 1000 * Math.pow(2, failCount - 1);
  return Math.min(raw, 86_400_000); // cap at 24 hours
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'Missing required field: userId' });
  }

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

        const now = Date.now();
        const activeSources: string[] = [];

        for (const source of ALL_SOURCES) {
          const rep = reputationMap[source];
          const failCount = rep?.fail_count ?? 0;

          if (failCount > 0) {
            const lastFailure = rep?.last_failure_at;
            const lastFailureMs = lastFailure ? new Date(lastFailure).getTime() : 0;
            const cooldownMs = computeCooldownMs(failCount);

            if (now - lastFailureMs < cooldownMs) {
              console.log("Adaptive Scraper: Backing off from volatile source: " + source);
              continue;
            }
          }

          activeSources.push(source);
        }

        // Step 3: Construct absolute base URL for internal worker dispatch
        const baseUrl = process.env.VERCEL_URL
          ? "https://" + process.env.VERCEL_URL
          : "http://localhost:3000";

        const workerSecret = process.env.INTERNAL_WORKER_SECRET || "";

        // Step 4: Fire-and-forget concurrent dispatch to internal worker endpoints
        for (const source of activeSources) {
          const workerUrl = baseUrl + "/api/internal/worker?source=" + encodeURIComponent(source);
          const headers: Record<string, string> = {
            'Accept': 'application/json',
          };
          if (workerSecret) {
            headers['Authorization'] = 'Bearer ' + workerSecret;
          }

          fetch(workerUrl, { headers }).catch((err: any) => {
            console.error("[sync-feed] Worker fetch error for " + source + ":", err);
          });
        }

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