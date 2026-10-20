import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  TIER_FROM_BASIS,
  TIER_NAME,
  tierFromBasis,
  tierName,
  type LegalBasisKind,
} from "../../../server-lib/policy/tiers.ts";

test("TASK_085E: Authority Registry Tiers - TypeScript Mapping", () => {
  const expected: Record<LegalBasisKind, 1 | 2 | 3 | 4 | 5> = {
    constitution_article: 1,
    central_act: 2,
    state_act: 2,
    executive_order: 3,
    society_registration: 4,
    companies_act_section8: 4,
    trust: 4,
    companies_act_cpse: 5,
  };

  const kinds = Object.keys(expected) as LegalBasisKind[];
  assert.equal(kinds.length, 8, "Expected exactly 8 legal basis kinds");

  for (const kind of kinds) {
    assert.equal(
      TIER_FROM_BASIS[kind],
      expected[kind],
      `Tier mismatch for legal basis kind: ${kind}`
    );
    assert.equal(
      tierFromBasis(kind),
      expected[kind],
      `Helper tierFromBasis mismatch for: ${kind}`
    );
  }

  assert.equal(tierName(1), "Constitutional body");
  assert.equal(tierName(2), "Statutory body");
  assert.equal(tierName(3), "Executive / attached office");
  assert.equal(tierName(4), "Registered society / Section-8 / trust");
  assert.equal(tierName(5), "Public sector undertaking");
});

test("TASK_085E: Drift Guard - SQL Migration vs TypeScript Mirror", () => {
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261021000300_authority_registry.sql"
  );
  assert.ok(fs.existsSync(migrationPath), `Migration file not found at ${migrationPath}`);

  const sql = fs.readFileSync(migrationPath, "utf-8");

  // Extract all WHEN '...' THEN ... expressions from tier_from_basis function
  const whenThenRegex = /WHEN\s+'([a-zA-Z0-9_]+)'\s+THEN\s+(\d+)/g;
  const sqlMap: Record<string, number> = {};

  let match: RegExpExecArray | null;
  while ((match = whenThenRegex.exec(sql)) !== null) {
    sqlMap[match[1]] = parseInt(match[2], 10);
  }

  const sqlKinds = Object.keys(sqlMap);
  assert.equal(sqlKinds.length, 8, `Expected 8 SQL mappings, found: ${sqlKinds.length}`);

  for (const [kind, tier] of Object.entries(sqlMap)) {
    assert.ok(
      kind in TIER_FROM_BASIS,
      `SQL contains unknown legal basis kind: ${kind}`
    );
    assert.equal(
      tier,
      TIER_FROM_BASIS[kind as LegalBasisKind],
      `Drift detected between SQL and TS mirror for '${kind}': SQL=${tier}, TS=${TIER_FROM_BASIS[kind as LegalBasisKind]}`
    );
  }

  for (const kind of Object.keys(TIER_FROM_BASIS)) {
    assert.ok(
      kind in sqlMap,
      `TypeScript kind '${kind}' is missing from Postgres tier_from_basis migration`
    );
  }
});
