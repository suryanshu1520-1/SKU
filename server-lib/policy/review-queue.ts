/**
 * server-lib/policy/review-queue.ts
 *
 * Enqueues unresolved or ambiguous entity mentions into policy_entity_review.
 */

import { createClient } from "@supabase/supabase-js";
import { aliasNorm, type ResolveResult } from "./resolve.ts";

export async function enqueueReview(
  mention: string,
  quote: string,
  sourceUrl: string,
  result: ResolveResult
): Promise<{ ok: boolean; id?: number; error?: string }> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

  if (!supabaseUrl) {
    return { ok: false, error: "Missing SUPABASE_URL / VITE_SUPABASE_URL" };
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const mention_norm = aliasNorm(mention);
  const candidates = "candidates" in result ? result.candidates : [];

  const { data, error } = await supabase
    .from("policy_entity_review")
    .upsert(
      [
        {
          mention,
          mention_norm,
          quote,
          source_url: sourceUrl,
          candidates,
          status: "open",
        },
      ],
      { onConflict: "mention_norm,source_url" }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data?.id };
}
