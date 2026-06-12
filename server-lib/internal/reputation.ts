import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "https://ixngfxaerlkkcacrbdgc.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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