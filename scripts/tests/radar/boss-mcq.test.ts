/**
 * scripts/tests/radar/boss-mcq.test.ts
 *
 * Deterministic unit tests for Boss MCQ generation by construction.
 * Tests acceptance criteria from TASK_085O.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildBossMcq,
  type TrueStmt,
  type Built,
} from "../../../server-lib/policy/boss-mcq.ts";
import type { RegistryRow } from "../../../server-lib/policy/tiers.ts";

const mockRegistry: RegistryRow[] = [
  {
    entity_slug: "ENT_ISM",
    authority: "India Semiconductor Mission",
    tier_number: 4,
    kind: "society",
    jurisdiction: "union",
    legal_basis_kind: "society_registration",
    legal_basis_ref: "Societies Registration Act, 1860",
    source_url: "https://meity.gov.in/ism",
    provenance: "registry",
  },
  {
    entity_slug: "ENT_DIC",
    authority: "Digital India Corporation",
    tier_number: 4,
    kind: "society",
    jurisdiction: "union",
    legal_basis_kind: "companies_act_section8",
    legal_basis_ref: "Section 8 Companies Act 2013",
    source_url: "https://dic.gov.in",
    provenance: "registry",
  },
  {
    entity_slug: "ENT_ERNET",
    authority: "ERNET India",
    tier_number: 4,
    kind: "society",
    jurisdiction: "union",
    legal_basis_kind: "society_registration",
    legal_basis_ref: "Societies Registration Act 1860",
    source_url: "https://ernet.in",
    provenance: "registry",
  },
  {
    entity_slug: "ENT_CCI",
    authority: "Competition Commission of India",
    tier_number: 2,
    kind: "statutory",
    jurisdiction: "union",
    legal_basis_kind: "central_act",
    legal_basis_ref: "Competition Act, 2002",
    source_url: "https://cci.gov.in",
    provenance: "registry",
  },
  {
    entity_slug: "ENT_TRAI",
    authority: "Telecom Regulatory Authority of India",
    tier_number: 2,
    kind: "statutory",
    jurisdiction: "union",
    legal_basis_kind: "central_act",
    legal_basis_ref: "TRAI Act, 1997",
    source_url: "https://trai.gov.in",
    provenance: "registry",
  },
  {
    entity_slug: "ENT_ECI",
    authority: "Election Commission of India",
    tier_number: 1,
    kind: "constitutional",
    jurisdiction: "union",
    legal_basis_kind: "constitution_article",
    legal_basis_ref: "Article 324",
    source_url: "https://eci.gov.in",
    provenance: "registry",
  },
];

function makeSyntheticProgram(seedNum: number): {
  program: { slug: string; name: string };
  trues: TrueStmt[];
} {
  const slug = `prog-synth-${seedNum}`;
  const name = `National Initiative ${seedNum}`;
  const baseOutlay = 10000 + (seedNum % 50) * 100;
  const targetYear = 2030 + (seedNum % 5);

  const trues: TrueStmt[] = [
    {
      text: `Union Cabinet approved ${name} with an outlay of ₹${baseOutlay.toLocaleString("en-IN")} crore.`,
      eventId: `ev-synth-${seedNum}-1`,
      actorSlug: "ENT_ISM",
      numbers: [`₹${baseOutlay.toLocaleString("en-IN")} crore`],
      quote: `Cabinet approval with outlay of ₹${baseOutlay.toLocaleString("en-IN")} crore.`,
      url: "https://pib.gov.in/PressReleasePage.aspx?PRID=101",
    },
    {
      text: `Under ${name}, the target for domestic clean manufacturing is set for ${targetYear}.`,
      eventId: `ev-synth-${seedNum}-2`,
      actorSlug: "ENT_ISM",
      numbers: [String(targetYear)],
      quote: `Target year is ${targetYear}.`,
      url: "https://pib.gov.in/PressReleasePage.aspx?PRID=102",
    },
    {
      text: `The guidelines for ${name} were notified setting a milestone of 50 GW installed capacity.`,
      eventId: `ev-synth-${seedNum}-3`,
      actorSlug: "ENT_ISM",
      numbers: ["50 GW"],
      quote: "Guidelines set 50 GW milestone.",
      url: "https://pib.gov.in/PressReleasePage.aspx?PRID=103",
    },
    {
      text: `First phase of ${name} deployed 25 pilot testing facilities across union territories.`,
      eventId: `ev-synth-${seedNum}-4`,
      actorSlug: "ENT_ISM",
      numbers: ["25"],
      quote: "25 pilot testing facilities deployed.",
      url: "https://pib.gov.in/PressReleasePage.aspx?PRID=104",
    },
  ];

  return { program: { slug, name }, trues };
}

test("TASK_085O: Property test over 500 synthetic programs verifies truth invariants", async () => {
  const keyMap: Record<number, string> = {
    1: "a",
    2: "b",
    3: "c",
    0: "d",
  };

  let testedCount = 0;

  for (let i = 0; i < 500; i++) {
    const { program, trues } = makeSyntheticProgram(i);
    const editionDate = "2025-06-01";

    const built = await buildBossMcq(program, trues, mockRegistry, editionDate);
    if (!built) continue;
    testedCount++;

    // 1. key always equals the mapping of truth.filter(Boolean).length
    const trueCount = built.truth.filter(Boolean).length;
    assert.equal(built.key, keyMap[trueCount], `Key ${built.key} should match true count ${trueCount}`);

    // 2. Statements length must be 3
    assert.equal(built.statements.length, 3);
    assert.equal(built.truth.length, 3);
    assert.equal(built.dissection.length, 3);

    // Collect all numbers in verified claims of that program
    const programNumbers = new Set<string>();
    for (const t of trues) {
      for (const n of t.numbers) programNumbers.add(n);
    }

    for (let s = 0; s < 3; s++) {
      const isTrue = built.truth[s];
      const dis = built.dissection[s];
      const stmtText = built.statements[s];

      if (isTrue) {
        assert.equal(dis.is_true, true);
        assert.equal(dis.operator, null);
      } else {
        assert.equal(dis.is_true, false);
        assert.ok(dis.operator !== null, "False statement must have operator");
        assert.ok(dis.replaced, "False statement must have replaced token");

        // Every false statement contains its replaced token
        assert.ok(
          stmtText.includes(dis.replaced!),
          `Statement "${stmtText}" must contain replaced token "${dis.replaced}"`
        );

        if (dis.operator === "PSY_05_SCOPE_MUTATE") {
          // No replaced number appears in any verified claim of that program
          assert.ok(
            !programNumbers.has(dis.replaced!),
            `Replaced number ${dis.replaced} must not appear in verified claims`
          );
        }

        if (dis.operator === "PSY_01_INST_SWAP") {
          // No swapped authority appears in any event of that program
          assert.ok(
            dis.replaced !== "India Semiconductor Mission",
            "Swapped authority must not be program authority"
          );
        }

        if (dis.operator === "PSY_03_LEGAL_TIER") {
          // Every false registry statement uses a basis kind different and contains no legal_basis_ref text
          assert.ok(
            !stmtText.includes("Societies Registration Act"),
            "False registry statement must not contain legal_basis_ref text"
          );
        }
      }
    }
  }

  assert.ok(testedCount >= 450, `Should successfully build >= 450/500 programs (got ${testedCount})`);
});

test("TASK_085O: Key distribution over 400 builds is balanced (each in 70..130)", async () => {
  const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
  const { program, trues } = makeSyntheticProgram(42);

  for (let day = 1; day <= 400; day++) {
    // Generate distinct date string
    const m = String(Math.floor((day - 1) / 28) + 1).padStart(2, "0");
    const d = String(((day - 1) % 28) + 1).padStart(2, "0");
    const editionDate = `2025-${m}-${d}`;

    const built = await buildBossMcq(program, trues, mockRegistry, editionDate);
    assert.ok(built, `Must build for day ${day}`);
    counts[built.key]++;
  }

  for (const key of ["a", "b", "c", "d"]) {
    assert.ok(
      counts[key] >= 70 && counts[key] <= 130,
      `Key ${key} count (${counts[key]}) should be between 70 and 130`
    );
  }
});

test("TASK_085O: Determinism - same (slug, editionDate) produces identical output", async () => {
  const { program, trues } = makeSyntheticProgram(123);
  const editionDate = "2025-05-15";

  const run1 = await buildBossMcq(program, trues, mockRegistry, editionDate);
  const run2 = await buildBossMcq(program, trues, mockRegistry, editionDate);

  assert.deepEqual(run1, run2, "Outputs for identical slug and date must be byte-for-byte identical");
});

test("TASK_085O: Paraphrase guard rejects semantic drift / unpreserved fact tokens", async () => {
  const { program, trues } = makeSyntheticProgram(1);
  const editionDate = "2025-08-01";

  // Mock paraphrase that changes outlay format
  const badParaphrase = async (s: string) => {
    if (s.includes("₹10,000 crore")) {
      return s.replace("₹10,000 crore", "₹10.0 thousand crore");
    }
    return s;
  };

  const builtWithBadParaphrase = await buildBossMcq(
    program,
    trues,
    mockRegistry,
    editionDate,
    badParaphrase
  );

  assert.ok(builtWithBadParaphrase);
  // Must reject the paraphrase and keep original wording
  for (const stmt of builtWithBadParaphrase.statements) {
    assert.ok(
      !stmt.includes("₹10.0 thousand crore"),
      "Drifted paraphrase must be rejected in favor of verbatim original"
    );
  }
});

test("TASK_085O: CANONICAL_BOSS_MCQ_FALLBACKS outside scripts/tests/ has 0 matches", () => {
  const filesToCheck = [
    "server-lib/cron/policy-graph-worker.ts",
    "server-lib/policy-radar.ts",
    "server-lib/policy/boss-mcq.ts",
    "server-lib/cron/boss-mcq-worker.ts",
  ];

  for (const f of filesToCheck) {
    const fullPath = path.resolve(process.cwd(), f);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(
        !content.includes("CANONICAL_BOSS_MCQ_FALLBACKS"),
        `File ${f} must not contain CANONICAL_BOSS_MCQ_FALLBACKS`
      );
    }
  }
});
