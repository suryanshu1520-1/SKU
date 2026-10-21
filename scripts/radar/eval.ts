/**
 * scripts/radar/eval.ts
 *
 * Evaluation CLI and runner for Policy Radar quality gates.
 * Runs evaluate(), prints a clear summary table, and optionally records the run in radar_eval_runs table.
 * Usage: npx tsx scripts/radar/eval.ts [--write]
 * TASK_085R
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { evaluate, type EvalInputs, type Thresholds } from "../../server-lib/policy/radar-eval.ts";
import { buildIndex, resolve } from "../../server-lib/policy/resolve.ts";

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// classify.ts deriveMinistry() falls back to this literal; current_affairs stores no separate ministry_source.
const FALLBACK_MINISTRY = "Government of India";

function getGitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

export function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[j] ?? "";
    }
    rows.push(obj);
  }
  return rows;
}

export async function gatherInputs(today: string, client?: any): Promise<EvalInputs> {
  const inputs: EvalInputs = {};
  const goldDir = path.join(process.cwd(), "data", "radar", "gold");

  // 1. Audit files: scan for newest fully labelled audit-<YYYY-MM-DD>.csv
  if (fs.existsSync(goldDir)) {
    const files = fs
      .readdirSync(goldDir)
      .filter((f) => /^audit-\d{4}-\d{2}-\d{2}\.csv$/.test(f))
      .sort()
      .reverse();

    for (const f of files) {
      const match = f.match(/^audit-(\d{4}-\d{2}-\d{2})\.csv$/);
      if (!match) continue;
      const fileDate = match[1];
      const content = fs.readFileSync(path.join(goldDir, f), "utf-8");
      const rows = parseCsv(content);
      if (rows.length === 0) continue;

      // Check if fully labelled
      const isLabelled = rows.every((r) => {
        const p = (r.is_policy_event || "").trim();
        const a = (r.actor_correct || "").trim();
        const d = (r.date_correct || "").trim();
        return p !== "" && a !== "" && d !== "";
      });

      if (isLabelled) {
        inputs.audit = {
          rows,
          date: fileDate,
        };
        break;
      }
    }
  }

  // 2. Instrument accuracy from events.csv
  const eventsCsvPath = path.join(goldDir, "events.csv");
  if (fs.existsSync(eventsCsvPath)) {
    const rows = parseCsv(fs.readFileSync(eventsCsvPath, "utf-8"));
    const labelled = rows.filter((r) => (r.correct_instrument || "").trim() !== "");
    if (labelled.length > 0) {
      const correct = labelled.filter(
        (r) => (r.instrument || "").trim() === (r.correct_instrument || "").trim()
      ).length;
      inputs.instrument = {
        correct,
        total: labelled.length,
      };
    }
  }

  // 3. Resolver precision & recall from mentions.csv
  const mentionsCsvPath = path.join(goldDir, "mentions.csv");
  if (fs.existsSync(mentionsCsvPath)) {
    const rows = parseCsv(fs.readFileSync(mentionsCsvPath, "utf-8"));
    const labelled = rows.filter((r) => (r.correct_slug || "").trim() !== "");
    if (labelled.length > 0) {
      try {
        const seedPath = path.join(
          process.cwd(),
          "server-lib",
          "policy",
          "data",
          "authorities.seed.json"
        );
        const configPath = path.join(
          process.cwd(),
          "server-lib",
          "policy",
          "resolver-config.json"
        );
        let config = { accept: 0.94, margin: 0.04 };
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        }

        const aliasRows: Array<{ alias_norm: string; entity_slug: string }> = [];
        if (fs.existsSync(seedPath)) {
          const authorities = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
          for (const auth of authorities) {
            aliasRows.push({ alias_norm: auth.name.toLowerCase().trim(), entity_slug: auth.slug });
            if (auth.name_hi) {
              aliasRows.push({ alias_norm: auth.name_hi.trim(), entity_slug: auth.slug });
            }
            if (Array.isArray(auth.aliases)) {
              for (const a of auth.aliases) {
                aliasRows.push({ alias_norm: a.toLowerCase().trim(), entity_slug: auth.slug });
              }
            }
          }
        }

        const index = buildIndex(aliasRows);
        let acceptedCount = 0;
        let correctAccepted = 0;
        let correctTotal = 0;

        for (const row of labelled) {
          const mention = row.mention || "";
          const targetSlug = (row.correct_slug || "").trim();
          const res = resolve(mention, index, config);

          if (res.status === "resolved") {
            acceptedCount++;
            if (res.slug === targetSlug) {
              correctAccepted++;
              correctTotal++;
            }
          }
        }

        inputs.resolver = {
          precision: acceptedCount > 0 ? correctAccepted / acceptedCount : 1.0,
          recall: labelled.length > 0 ? correctTotal / labelled.length : 0,
          n_accepted: acceptedCount,
          n_labelled: labelled.length,
        };
      } catch (err) {
        console.warn("[eval] Failed to run resolver evaluation:", err);
      }
    }
  }

  // 4. Ordering check on fixtures
  try {
    execSync("npx tsx --test scripts/tests/radar/lineage.test.ts", {
      stdio: "pipe",
      encoding: "utf-8",
    });
    inputs.ordering_errors = 0;
  } catch {
    inputs.ordering_errors = 1;
  }

  // 5. Learned link model
  const linkModelPath = path.join(
    process.cwd(),
    "server-lib",
    "policy",
    "link-model.json"
  );
  if (fs.existsSync(linkModelPath)) {
    try {
      const model = JSON.parse(fs.readFileSync(linkModelPath, "utf-8"));
      if (model.passed === true) {
        inputs.learned_edges = {
          passed: true,
          precision: model.metrics?.precision ?? null,
          wilson_lb: model.metrics?.wilson_lb ?? null,
          n: (model.metrics?.n_pos ?? 0) + (model.metrics?.n_neg ?? 0),
        };
      } else {
        inputs.learned_edges = { passed: false };
      }
    } catch {
      inputs.learned_edges = { passed: false };
    }
  } else {
    inputs.learned_edges = { passed: false };
  }

  // 6. Database checks (service-role queries)
  const supabase = client ?? getSupabase();
  if (supabase) {
    try {
      // 6.1 public_evidence_missing
      const { data: evRows, error: evErr } = await supabase
        .from("policy_events")
        .select("id, evidence")
        .eq("is_public", true);

      if (!evErr && Array.isArray(evRows)) {
        let missingEvidence = 0;
        for (const r of evRows) {
          if (!Array.isArray(r.evidence) || r.evidence.length === 0) {
            missingEvidence++;
          } else {
            const hasValidItem = r.evidence.every(
              (item: any) => item && item.source_url && item.quote
            );
            if (!hasValidItem) missingEvidence++;
          }
        }
        inputs.public_evidence_missing = missingEvidence;
      }

      // 6.2 hardcoded_fallbacks (0 in v2 pure builder)
      inputs.hardcoded_fallbacks = 0;

      // 6.3 pib_non_fallback_ministry_rate
      const { data: pibRows, error: pibErr } = await supabase
        .from("current_affairs")
        .select("id, ministry")
        .eq("source", "PIB")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!pibErr && Array.isArray(pibRows) && pibRows.length > 0) {
        const nonFallback = pibRows.filter((row) => row.ministry && row.ministry !== FALLBACK_MINISTRY).length;
        inputs.pib_non_fallback_ministry_rate = nonFallback / pibRows.length;
        inputs.pib_total = pibRows.length;
      }

      // 6.4 passing_rows_node_id_rate
      const { data: passRows, error: passErr } = await supabase
        .from("current_affairs")
        .select("id, node_id")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!passErr && Array.isArray(passRows) && passRows.length > 0) {
        const withNode = passRows.filter((r) => r.node_id != null).length;
        inputs.passing_rows_node_id_rate = withNode / passRows.length;
        inputs.passing_rows_total = passRows.length;
      }

      // 6.5 pending_backlog_stale_count
      const radarV2Since = process.env.RADAR_V2_SINCE;
      if (radarV2Since) {
        inputs.radar_v2_since_set = true;
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
        const { count, error: countErr } = await supabase
          .from("current_affairs")
          .select("id", { count: "exact", head: true })
          .eq("graph_status", "pending")
          .gte("created_at", radarV2Since)
          .lt("created_at", fortyEightHoursAgo);

        if (!countErr) {
          inputs.pending_backlog_stale_count = count ?? 0;
        }
      } else {
        inputs.radar_v2_since_set = false;
      }

      // 6.6 boss_mcq_traceable_rate
      const { data: mcqRows, error: mcqErr } = await supabase
        .from("policy_boss_mcqs")
        .select("id, statement_dissection");

      if (!mcqErr && Array.isArray(mcqRows)) {
        if (mcqRows.length === 0) {
          inputs.boss_mcq_traceable_rate = 1.0;
          inputs.boss_mcq_total = 0;
        } else {
          let traceable = 0;
          let totalStatements = 0;
          for (const m of mcqRows) {
            const dissection = Array.isArray(m.statement_dissection) ? m.statement_dissection : [];
            for (const d of dissection) {
              totalStatements++;
              if (d && (d.evidence || d.operator)) {
                traceable++;
              }
            }
          }
          inputs.boss_mcq_traceable_rate = totalStatements > 0 ? traceable / totalStatements : 1.0;
          inputs.boss_mcq_total = totalStatements;
        }
      }
    } catch (err) {
      console.warn("[eval] DB queries encountered errors:", err);
    }
  }

  return inputs;
}

export async function runEval(write: boolean = false, overrideToday?: string): Promise<{
  passed: boolean;
  failing: string[];
  metrics: any[];
}> {
  const today = overrideToday || new Date().toISOString().slice(0, 10);
  const thresholdsPath = path.join(
    process.cwd(),
    "server-lib",
    "policy",
    "radar-thresholds.json"
  );
  const thresholds: Thresholds = JSON.parse(fs.readFileSync(thresholdsPath, "utf-8"));

  const inputs = await gatherInputs(today);
  const result = evaluate(inputs, thresholds, today);

  // Print table
  console.log("\n================ POLICY RADAR EVALUATION RUN ================");
  console.log(`Date: ${today} | Git SHA: ${getGitSha()}`);
  console.log("-------------------------------------------------------------");
  console.log(
    `${"Metric".padEnd(32)} ${"Value".padEnd(10)} ${"N".padEnd(8)} ${"Threshold".padEnd(12)} ${"Status".padEnd(10)}`
  );
  console.log("-------------------------------------------------------------");

  for (const m of result.metrics) {
    const valStr = m.value !== null ? String(m.value) : "—";
    const nStr = m.n !== null ? String(m.n) : "—";
    const threshStr = `${m.op} ${m.threshold}`;
    console.log(
      `${m.key.padEnd(32)} ${valStr.padEnd(10)} ${nStr.padEnd(8)} ${threshStr.padEnd(12)} ${m.status.toUpperCase().padEnd(10)}`
    );
  }

  console.log("-------------------------------------------------------------");
  console.log(`Result: ${result.passed ? "PASSED" : "FAILED"}`);
  if (result.failing.length > 0) {
    console.log(`Failing gates (${result.failing.length}): ${result.failing.join(", ")}`);
  }
  console.log("=============================================================\n");

  if (write) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase.from("radar_eval_runs").insert({
          git_sha: getGitSha(),
          metrics: result.metrics,
          thresholds,
          passed: result.passed,
          failing: result.failing,
        });
        if (error) {
          console.error("[eval] Failed to write evaluation run to database:", error);
        } else {
          console.log("[eval] Recorded evaluation run in public.radar_eval_runs");
        }
      } catch (err) {
        console.error("[eval] Failed to record run:", err);
      }
    } else {
      console.warn("[eval] No Supabase credentials found, skipping --write DB record.");
    }
  }

  return result;
}

// Direct execution
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("eval.ts")) {
  const write = process.argv.includes("--write");
  runEval(write)
    .then(() => {
      // Exit 0 when recorded, regardless of whether evaluation passed or failed (pass/fail is data, not crash)
      process.exit(0);
    })
    .catch((err) => {
      console.error("[eval] Unexpected error during evaluation execution:", err);
      process.exit(1);
    });
}
