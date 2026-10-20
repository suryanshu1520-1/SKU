/**
 * server-lib/policy/radar-flags.ts
 *
 * Feature flags and gates for the Policy Radar.
 * TASK_085P / TASK_085R
 */

import { createClient } from "@supabase/supabase-js";

let cache: { value: boolean; expiresAt: number } | null = null;

function getSupabaseClient() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key);
}

export function clearRadarPublicCache(): void {
  cache = null;
}

/**
 * Returns whether the Radar v2 public surface is active.
 * Requires:
 *  1. env RADAR_PUBLIC === '1'
 *  2. latest radar_eval_runs row passed === true
 *  3. run_at >= now - 8 days (run_max_age_days)
 * Cached in-memory for 10 minutes. Any DB or network error returns false.
 */
export async function isRadarPublic(opts?: {
  client?: any;
  now?: number;
  bypassCache?: boolean;
}): Promise<boolean> {
  if (process.env.RADAR_PUBLIC !== "1") {
    return false;
  }

  const now = opts?.now ?? Date.now();
  if (!opts?.bypassCache && cache && cache.expiresAt > now) {
    return cache.value;
  }

  try {
    const supabase = opts?.client ?? getSupabaseClient();
    if (!supabase) {
      return false;
    }

    const { data, error } = await supabase
      .from("radar_eval_runs")
      .select("run_at, passed")
      .order("run_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    if (data.passed !== true) {
      return false;
    }

    const runMaxAgeDays = 8;
    const runAtMs = new Date(data.run_at).getTime();
    if (isNaN(runAtMs)) {
      return false;
    }

    const ageDays = (now - runAtMs) / (86400 * 1000);
    const valid = ageDays <= runMaxAgeDays;

    cache = {
      value: valid,
      expiresAt: now + 10 * 60 * 1000,
    };
    return valid;
  } catch {
    return false;
  }
}
