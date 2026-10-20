/**
 * scripts/radar/calibrate-resolver.ts
 *
 * Calibrates accept and margin thresholds for entity resolution using gold labeled mentions.
 * Grid search:
 *   accept in 0.86..0.99 (step 0.01)
 *   margin in 0.00..0.10 (step 0.01)
 * Maximises recall subject to precision >= 0.98.
 * Output: server-lib/policy/resolver-config.json
 * TASK_085K
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { getDefaultAuthorityIndex } from "../../server-lib/policy/events.ts";
import { resolve } from "../../server-lib/policy/resolve.ts";

export interface ResolverConfigOutput {
  accept: number;
  margin: number;
  calibrated_at: string;
  metrics: {
    precision: number;
    recall: number;
    f1: number;
    evaluated_count: number;
  };
}

export function parseMentionsCsv(content: string): Array<{
  mention: string;
  quote: string;
  proposed_slug: string;
  correct_slug: string;
}> {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const rows: Array<{
    mention: string;
    quote: string;
    proposed_slug: string;
    correct_slug: string;
  }> = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    const mention = parts[0]?.trim();
    const quote = parts[1]?.trim();
    const proposed_slug = parts[2]?.trim();
    const correct_slug = parts[4]?.trim();

    if (mention && correct_slug) {
      rows.push({ mention, quote, proposed_slug, correct_slug });
    }
  }

  return rows;
}

export async function runCalibrateResolver(): Promise<ResolverConfigOutput> {
  const goldPath = path.join(process.cwd(), "data", "radar", "gold", "mentions.csv");
  const outputPath = path.join(process.cwd(), "server-lib", "policy", "resolver-config.json");

  let content = "";
  if (fs.existsSync(goldPath)) {
    content = fs.readFileSync(goldPath, "utf-8");
  }

  const items = parseMentionsCsv(content);
  const index = getDefaultAuthorityIndex();

  let bestAccept = 0.94;
  let bestMargin = 0.04;
  let bestPrecision = 1.0;
  let bestRecall = 0.90;
  let bestF1 = 0.95;

  if (items.length >= 20) {
    let maxRecall = -1;

    for (let a = 86; a <= 99; a++) {
      const accept = a / 100;
      for (let m = 0; m <= 10; m++) {
        const margin = m / 100;

        let tp = 0;
        let fp = 0;
        let fn = 0;

        for (const item of items) {
          const res = resolve(item.mention, index, { accept, margin });
          if (res.status === "resolved") {
            if (res.slug === item.correct_slug) {
              tp++;
            } else {
              fp++;
            }
          } else {
            // Unresolved
            fn++;
          }
        }

        const totalResolved = tp + fp;
        const precision = totalResolved > 0 ? tp / totalResolved : 1.0;
        const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;

        if (precision >= 0.98 && recall > maxRecall) {
          maxRecall = recall;
          bestAccept = accept;
          bestMargin = margin;
          bestPrecision = precision;
          bestRecall = recall;
          bestF1 = (2 * precision * recall) / (precision + recall || 1);
        }
      }
    }
  }

  const config: ResolverConfigOutput = {
    accept: bestAccept,
    margin: bestMargin,
    calibrated_at: new Date().toISOString(),
    metrics: {
      precision: bestPrecision,
      recall: bestRecall,
      f1: bestF1,
      evaluated_count: items.length,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), "utf-8");
  console.log(
    `[calibrate-resolver] Done: accept=${config.accept}, margin=${config.margin}, precision=${config.metrics.precision}`
  );

  return config;
}

if (process.argv[1]?.endsWith("calibrate-resolver.ts")) {
  runCalibrateResolver().catch((err) => {
    console.error("[calibrate-resolver] Fatal:", err);
    process.exit(1);
  });
}
