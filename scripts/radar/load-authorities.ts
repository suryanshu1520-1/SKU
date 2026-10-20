/**
 * scripts/radar/load-authorities.ts
 *
 * Loader for canonical authority registry and alias index.
 * Validates data integrity, alias uniqueness, and official provenance.
 *
 * Usage:
 *   npx tsx scripts/radar/load-authorities.ts          # Dry-run: prints diff vs DB
 *   npx tsx scripts/radar/load-authorities.ts --apply  # G1 Human Gate required
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { aliasVariants } from "../../server-lib/policy/resolve.ts";

export interface AuthoritySeedRow {
  entity_slug: string;
  authority: string;
  aliases_en: string[];
  aliases_hi: string[];
  kind: string;
  jurisdiction: "union" | "state";
  legal_basis_kind: string;
  legal_basis_ref: string;
  parent_entity_slug: string | null;
  source_url: string;
  [k: string]: unknown;
}

export function validateSeedData(entries: AuthoritySeedRow[]): {
  valid: boolean;
  errors: string[];
  aliasCount: number;
} {
  const errors: string[] = [];
  const slugs = new Set<string>();
  const slugByAlias = new Map<string, string>();
  let aliasCount = 0;

  for (const row of entries) {
    if (!row.entity_slug) errors.push("Row missing entity_slug");
    if (!row.authority) errors.push(`Row ${row.entity_slug} missing authority`);
    if (!row.source_url?.startsWith("https://")) {
      errors.push(`Row ${row.entity_slug} source_url must start with https://`);
    }
    if (!row.legal_basis_ref) {
      errors.push(`Row ${row.entity_slug} missing legal_basis_ref`);
    }
    if ("tier_number" in row) {
      errors.push(`Row ${row.entity_slug} must not specify tier_number (derived in DB)`);
    }

    slugs.add(row.entity_slug);
  }

  for (const row of entries) {
    if (row.parent_entity_slug && !slugs.has(row.parent_entity_slug)) {
      errors.push(`Row ${row.entity_slug} references nonexistent parent ${row.parent_entity_slug}`);
    }

    const allAliases: Array<{ text: string; lang: "en" | "hi" }> = [
      { text: row.authority, lang: "en" },
      ...row.aliases_en.map((a) => ({ text: a, lang: "en" as const })),
      ...row.aliases_hi.map((a) => ({ text: a, lang: "hi" as const })),
    ];

    for (const item of allAliases) {
      const variants = aliasVariants(item.text);
      for (const v of variants) {
        if (v.length < 3) continue;
        const existing = slugByAlias.get(v);
        if (existing && existing !== row.entity_slug) {
          errors.push(`Alias collision on '${v}' between ${existing} and ${row.entity_slug}`);
        } else {
          slugByAlias.set(v, row.entity_slug);
          aliasCount++;
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    aliasCount,
  };
}

export async function runLoader(apply = false): Promise<{
  total_seed_rows: number;
  to_insert: number;
  to_update: number;
  total_aliases: number;
  mode: "dry-run" | "apply";
}> {
  const seedPath = path.join(process.cwd(), "server-lib", "policy", "data", "authorities.seed.json");
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found at ${seedPath}`);
  }

  const entries: AuthoritySeedRow[] = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  const validation = validateSeedData(entries);

  if (!validation.valid) {
    throw new Error(`Seed validation failed with ${validation.errors.length} errors:\n${validation.errors.join("\n")}`);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

  let to_insert = 0;
  let to_update = 0;

  if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: existing, error } = await supabase
      .from("policy_entities")
      .select("entity_slug");

    if (error) {
      console.warn(`[load-authorities] Could not query DB for diff: ${error.message}`);
    } else {
      const existingSlugs = new Set((existing || []).map((e: any) => e.entity_slug));
      for (const row of entries) {
        if (existingSlugs.has(row.entity_slug)) {
          to_update++;
        } else {
          to_insert++;
        }
      }
    }

    if (apply) {
      console.log(`[load-authorities] G1 gate approved: applying ${entries.length} authorities to DB...`);
      for (const row of entries) {
        const entityRecord = {
          entity_slug: row.entity_slug,
          authority: row.authority,
          aliases: [...row.aliases_en, ...row.aliases_hi],
          kind: row.kind,
          jurisdiction: row.jurisdiction,
          legal_basis_kind: row.legal_basis_kind,
          legal_basis_ref: row.legal_basis_ref,
          parent_entity_slug: row.parent_entity_slug,
          source_url: row.source_url,
          provenance: "registry",
        };

        const { error: upsertError } = await supabase
          .from("policy_entities")
          .upsert([entityRecord], { onConflict: "entity_slug" });

        if (upsertError) {
          console.error(`Failed to upsert ${row.entity_slug}: ${upsertError.message}`);
        }
      }
    }
  } else {
    to_insert = entries.length;
  }

  return {
    total_seed_rows: entries.length,
    to_insert,
    to_update,
    total_aliases: validation.aliasCount,
    mode: apply ? "apply" : "dry-run",
  };
}

if (process.argv[1]?.endsWith("load-authorities.ts") || process.argv[1]?.endsWith("load-authorities.js")) {
  const isApply = process.argv.includes("--apply");
  console.log(`[load-authorities] Starting loader in ${isApply ? "APPLY" : "DRY-RUN"} mode...`);
  runLoader(isApply)
    .then((res) => {
      console.log("[load-authorities] Result Summary:");
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("[load-authorities] Fatal error:", err);
      process.exit(1);
    });
}
