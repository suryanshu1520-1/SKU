import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  validateSeedData,
  type AuthoritySeedRow,
} from "../../radar/load-authorities.ts";

test("TASK_085F: Authority Seed Validation", () => {
  const seedPath = path.join(
    process.cwd(),
    "server-lib",
    "policy",
    "data",
    "authorities.seed.json"
  );
  assert.ok(fs.existsSync(seedPath), `Seed file not found at ${seedPath}`);

  const rows: AuthoritySeedRow[] = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

  // Check >= 120 rows
  assert.ok(rows.length >= 120, `Expected >= 120 rows, got ${rows.length}`);

  // Official domain suffixes or explicit official body domains
  const allowedHostSuffixes = [".gov.in", ".nic.in", ".org.in", ".res.in", ".aero"];
  const allowedExplicitHosts = new Set([
    "rbi.org.in",
    "www.rbi.org.in",
    "pfrda.org.in",
    "nmc.org.in",
    "aicte-india.org",
    "nabard.org",
    "sidbi.in",
    "ongcindia.com",
    "ntpc.co.in",
    "coalindia.in",
    "sail.co.in",
    "barcouncilofindia.org",
  ]);

  for (const row of rows) {
    assert.ok(row.entity_slug, "entity_slug is required");
    assert.ok(row.authority, "authority name is required");
    assert.ok(row.legal_basis_ref, `Row ${row.entity_slug} missing legal_basis_ref`);
    assert.equal(
      "tier_number" in row,
      false,
      `Row ${row.entity_slug} must NOT specify tier_number (derived in DB by trigger)`
    );

    // URL validation
    assert.ok(
      row.source_url?.startsWith("https://"),
      `Row ${row.entity_slug} source_url must start with https://`
    );
    const parsed = new URL(row.source_url);
    const host = parsed.hostname.toLowerCase();
    const hasAllowedSuffix = allowedHostSuffixes.some((s) => host.endsWith(s));
    const isExplicitAllowed = allowedExplicitHosts.has(host);

    assert.ok(
      hasAllowedSuffix || isExplicitAllowed,
      `Host '${host}' for ${row.entity_slug} is not an official government or body domain`
    );
  }

  // Run full validation helper (including alias collision and parent reference checks)
  const validation = validateSeedData(rows);
  assert.equal(
    validation.valid,
    true,
    `Validation failed with errors:\n${validation.errors.join("\n")}`
  );
  assert.equal(validation.errors.length, 0);
  assert.ok(validation.aliasCount > 200, "Should generate > 200 searchable alias variants");
});

test("TASK_085F: Known-Answer Legal Basis Checks", () => {
  const seedPath = path.join(
    process.cwd(),
    "server-lib",
    "policy",
    "data",
    "authorities.seed.json"
  );
  const rows: AuthoritySeedRow[] = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  const bySlug = new Map(rows.map((r) => [r.entity_slug, r]));

  // 1. Textiles Committee -> central_act (Textiles Committee Act, 1963)
  const textiles = bySlug.get("ENT_TEXTILES_COMM");
  assert.ok(textiles, "ENT_TEXTILES_COMM must exist");
  assert.equal(textiles.legal_basis_kind, "central_act");
  assert.ok(textiles.legal_basis_ref.includes("Textiles Committee Act, 1963"));

  // 2. Reserve Bank of India -> central_act (Reserve Bank of India Act, 1934)
  const rbi = bySlug.get("ENT_RBI");
  assert.ok(rbi, "ENT_RBI must exist");
  assert.equal(rbi.legal_basis_kind, "central_act");
  assert.ok(rbi.legal_basis_ref.includes("Reserve Bank of India Act, 1934"));

  // 3. Election Commission of India -> constitution_article (Article 324)
  const eci = bySlug.get("ENT_ECI");
  assert.ok(eci, "ENT_ECI must exist");
  assert.equal(eci.legal_basis_kind, "constitution_article");
  assert.ok(eci.legal_basis_ref.includes("Article 324"));

  // 4. NITI Aayog -> executive_order (Cabinet Resolution)
  const niti = bySlug.get("ENT_NITI");
  assert.ok(niti, "ENT_NITI must exist");
  assert.equal(niti.legal_basis_kind, "executive_order");
  assert.ok(niti.legal_basis_ref.includes("Cabinet Resolution"));
});
