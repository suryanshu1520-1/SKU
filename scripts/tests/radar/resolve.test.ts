import test from "node:test";
import assert from "node:assert/strict";
import {
  aliasNorm,
  aliasVariants,
  jaroWinkler,
  tokenSetJaccard,
  buildIndex,
  resolve,
  type AliasRow,
} from "../../../server-lib/policy/resolve.ts";

test("TASK_085G: Jaro-Winkler reference values", () => {
  const eps = 1e-4;

  assert.ok(Math.abs(jaroWinkler("martha", "marhta") - 0.9611) < eps);
  assert.ok(Math.abs(jaroWinkler("dwayne", "duane") - 0.84) < eps);
  assert.ok(Math.abs(jaroWinkler("dixon", "dicksonx") - 0.8133) < eps);
  assert.ok(Math.abs(jaroWinkler("reserve bank of india", "reserve bank of indai") - 0.9905) < eps);
  assert.ok(Math.abs(jaroWinkler("niti aayog", "niti ayog") - 0.98) < eps);
  assert.ok(Math.abs(jaroWinkler("department tele", "department telecommunications") - 0.9034) < eps);
});

test("TASK_085G: TokenSetJaccard raw tokens", () => {
  assert.equal(
    tokenSetJaccard("india semiconductor mission", "semiconductor mission india"),
    1.0
  );

  assert.equal(
    tokenSetJaccard("department of telecommunications", "department of telecom"),
    0.5
  );
});

test("TASK_085G: aliasVariants extracts parenthetical acronyms", () => {
  const variants = aliasVariants("India Semiconductor Mission (ISM)");
  assert.ok(variants.includes("india semiconductor mission ism"));
  assert.ok(variants.includes("india semiconductor mission"));
  assert.ok(variants.includes("ism"));
});

test("TASK_085G: Entity Resolution Acceptance Fixtures", () => {
  const rows: AliasRow[] = [
    { alias_norm: aliasNorm("reserve bank of india"), entity_slug: "ENT_RBI" },
    { alias_norm: aliasNorm("rbi"), entity_slug: "ENT_RBI" },
    { alias_norm: aliasNorm("ministry of commerce and industry"), entity_slug: "ENT_MOCI" },
    { alias_norm: aliasNorm("वाणिज्य एवं उद्योग मंत्रालय"), entity_slug: "ENT_MOCI" },
    { alias_norm: aliasNorm("department of telecommunications"), entity_slug: "ENT_DOT" },
    { alias_norm: aliasNorm("department of science and technology"), entity_slug: "ENT_DOST" },
  ];

  const index = buildIndex(rows);

  // Exact resolution: "Reserve Bank of India" -> ENT_RBI
  const res1 = resolve("Reserve Bank of India", index);
  assert.equal(res1.status, "resolved");
  if (res1.status === "resolved") {
    assert.equal(res1.slug, "ENT_RBI");
    assert.equal(res1.via, "exact");
    assert.equal(res1.score, 1.0);
  }

  // Exact resolution: "RBI" -> ENT_RBI
  const res2 = resolve("RBI", index);
  assert.equal(res2.status, "resolved");
  if (res2.status === "resolved") {
    assert.equal(res2.slug, "ENT_RBI");
  }

  // Ampersand variant: "Ministry of Commerce & Industry" -> ENT_MOCI
  const res3 = resolve("Ministry of Commerce & Industry", index);
  assert.equal(res3.status, "resolved");
  if (res3.status === "resolved") {
    assert.equal(res3.slug, "ENT_MOCI");
  }

  // Devanagari with zero-width joiner \u200D -> ENT_MOCI
  const res4 = resolve("वाणिज्\u200Dय एवं उद्योग मंत्रालय", index);
  assert.equal(res4.status, "resolved");
  if (res4.status === "resolved") {
    assert.equal(res4.slug, "ENT_MOCI");
  }

  // Below threshold: "Department of Tele" -> unknown (best score 0.9034 < 0.94)
  const res5 = resolve("Department of Tele", index);
  assert.equal(res5.status, "unknown");

  // Short length rule: "PM" -> unknown (length < 3)
  const res6 = resolve("PM", index);
  assert.equal(res6.status, "unknown");
});

test("TASK_085G: Ambiguous resolution when margin is insufficient", () => {
  const rows: AliasRow[] = [
    { alias_norm: "national energy agency", entity_slug: "ENT_NEA1" },
    { alias_norm: "national energy authority", entity_slug: "ENT_NEA2" },
  ];
  const index = buildIndex(rows);

  // "national energy admin" would score similarly for both
  const res = resolve("national energy", index, { accept: 0.8, margin: 0.1 });
  assert.ok(res.status === "ambiguous" || res.status === "unknown");
});
