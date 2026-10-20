/**
 * scripts/radar/backfill-ministry.ts
 *
 * Backfill script for PIB articles tagged with generic "Government of India".
 * Scans the first evidence quote (or headline/body) against Devanagari and English
 * ministry aliases from pib-ministries.json.
 *
 * Usage:
 *   npx tsx scripts/radar/backfill-ministry.ts          # Dry-run
 *   npx tsx scripts/radar/backfill-ministry.ts --apply  # Execute updates
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { deriveMinistryDetailed } from "../../server-lib/cron/ingest/classify.ts";

function extractFirstQuote(summary: any): string | null {
  if (!summary || typeof summary !== "object") return null;

  // Check summary.claims[0].quotes[0]
  if (Array.isArray(summary.claims) && summary.claims.length > 0) {
    const q = summary.claims[0]?.quotes?.[0];
    if (typeof q === "string" && q.trim()) return q.trim();
  }

  // Check summary.exam_insights.facts[*].evidence[0].quote with span_id='s0'
  if (Array.isArray(summary.exam_insights?.facts)) {
    for (const fact of summary.exam_insights.facts) {
      if (Array.isArray(fact?.evidence)) {
        const s0 = fact.evidence.find((e: any) => e?.span_id === "s0");
        if (s0?.quote && typeof s0.quote === "string" && s0.quote.trim()) {
          return s0.quote.trim();
        }
        const first = fact.evidence[0];
        if (first?.quote && typeof first.quote === "string" && first.quote.trim()) {
          return first.quote.trim();
        }
      }
    }
  }

  // Fallback to bullets or prelims context if present
  if (Array.isArray(summary.bullets) && summary.bullets.length > 0) {
    const firstBullet = summary.bullets[0];
    if (typeof firstBullet === "string" && firstBullet.trim()) return firstBullet.trim();
  }

  return null;
}

export async function runBackfill(apply = false): Promise<{
  scanned: number;
  resolved: number;
  still_fallback: number;
}> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL / VITE_SUPABASE_URL is required");
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: rows, error } = await supabase
    .from("current_affairs")
    .select("id, headline, summary, ministry, source, url")
    .eq("source", "PIB")
    .eq("ministry", "Government of India");

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  let scanned = 0;
  let resolved = 0;
  let still_fallback = 0;

  for (const row of rows || []) {
    scanned++;
    const quote = extractFirstQuote(row.summary);
    const textToScan = quote || row.headline || "";

    const attribution = deriveMinistryDetailed(textToScan, "Government of India", null);

    if (attribution.ministry !== "Government of India") {
      resolved++;
      if (apply) {
        const { error: updateError } = await supabase
          .from("current_affairs")
          .update({ ministry: attribution.ministry })
          .eq("id", row.id);
        if (updateError) {
          console.error(`Failed to update row ${row.id}: ${updateError.message}`);
        }
      }
    } else {
      still_fallback++;
    }
  }

  return { scanned, resolved, still_fallback };
}

// Direct execution entry point
if (process.argv[1]?.endsWith("backfill-ministry.ts") || process.argv[1]?.endsWith("backfill-ministry.js")) {
  const isApply = process.argv.includes("--apply");
  console.log(`[backfill-ministry] Running in ${isApply ? "APPLY" : "DRY-RUN"} mode...`);
  runBackfill(isApply)
    .then((stats) => {
      console.log(JSON.stringify(stats, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("[backfill-ministry] Fatal error:", err);
      process.exit(1);
    });
}
