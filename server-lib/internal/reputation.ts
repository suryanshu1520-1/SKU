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

const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://ixngfxaerlkkcacrbdgc.supabase.co";
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  "";

const supabase = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawServiceKey));

/**
 * Calls the update_source_reputation PostgreSQL function to record
 * the outcome of a single source scrape attempt.
 *
 * @param sourceId - The source identifier (e.g. "PIB", "LIVEMINT")
 * @param isSuccess - Whether the scrape completed successfully
 * @param latency - Total execution time in milliseconds
 */
export async function callUpdateSourceReputation(
  sourceId: string,
  isSuccess: boolean,
  latency: number
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_source_reputation', {
      p_source_id: sourceId,
      p_is_success: isSuccess,
      p_latency: Math.round(latency)
    });

    if (error) {
      console.error(`[reputation] RPC error for ${sourceId}:`, error);
    } else {
      console.log(`[reputation] Updated reputation for ${sourceId}: success=${isSuccess}, latency=${latency}ms`);
    }
  } catch (err) {
    console.error(`[reputation] Exception updating reputation for ${sourceId}:`, err);
  }
}