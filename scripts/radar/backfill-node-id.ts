/**
 * scripts/radar/backfill-node-id.ts
 *
 * Backfill script for current_affairs records with node_id IS NULL.
 * Uses deterministic keyword classification over headline, bullets, and tags.
 *
 * Usage:
 *   npx tsx scripts/radar/backfill-node-id.ts          # Dry-run
 *   npx tsx scripts/radar/backfill-node-id.ts --apply  # Execute updates
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { assignNode } from "../../server-lib/policy/node-assign.ts";

export async function runNodeBackfill(apply = false): Promise<{
  scanned: number;
  assigned: number;
  unassigned: number;
  by_node: Array<{ node_id: string; count: number }>;
}> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL / VITE_SUPABASE_URL is required");
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: rows, error } = await supabase
    .from("current_affairs")
    .select("id, headline, summary, node_id")
    .is("node_id", null);

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  let scanned = 0;
  let assigned = 0;
  let unassigned = 0;
  const counts: Record<string, number> = {};

  for (const row of rows || []) {
    scanned++;
    const headline = row.headline || "";
    const bullets = Array.isArray(row.summary?.bullets) ? row.summary.bullets : [];
    const tags = Array.isArray(row.summary?.tags) ? row.summary.tags : [];

    const res = assignNode({ headline, bullets, tags });

    if (res.nodeId) {
      assigned++;
      counts[res.nodeId] = (counts[res.nodeId] || 0) + 1;
      if (apply) {
        const { error: updateError } = await supabase
          .from("current_affairs")
          .update({ node_id: res.nodeId })
          .eq("id", row.id);
        if (updateError) {
          console.error(`Failed to update node_id for row ${row.id}: ${updateError.message}`);
        }
      }
    } else {
      unassigned++;
    }
  }

  const sortedNodes = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([node_id, count]) => ({ node_id, count }));

  return {
    scanned,
    assigned,
    unassigned,
    by_node: sortedNodes,
  };
}

if (process.argv[1]?.endsWith("backfill-node-id.ts") || process.argv[1]?.endsWith("backfill-node-id.js")) {
  const isApply = process.argv.includes("--apply");
  console.log(`[backfill-node-id] Running in ${isApply ? "APPLY" : "DRY-RUN"} mode...`);
  runNodeBackfill(isApply)
    .then((stats) => {
      console.log(JSON.stringify(stats, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("[backfill-node-id] Fatal error:", err);
      process.exit(1);
    });
}
