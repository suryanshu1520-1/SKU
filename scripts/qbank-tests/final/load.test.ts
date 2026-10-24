import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { planLoad, runLoad, sha256String } from '../../qbank/final/load.js';
import { jaccard, runParity, tokenize } from '../../qbank/final/parity.js';
import { getRunDir, REPO_ROOT } from '../../qbank/final/run-dir.js';

test('1. Migration SQL: strict security, RLS, and column lockdown', () => {
  const migrationPath = path.join(
    REPO_ROOT,
    'supabase/migrations/20261022120000_qbank_final_edition.sql'
  );
  assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // 1.1 RLS enabled on all 8 tables
  const rlsMatches = sql.match(/enable row level security/gi) || [];
  assert.equal(rlsMatches.length, 8, 'Must enable row level security exactly 8 times');

  // 1.2 No DROP statements
  assert.equal(/\bdrop\s+/i.test(sql), false, 'Migration must contain no DROP statements');

  // 1.3 No legacy table names
  assert.ok(!sql.includes('static_questions'), 'Must not reference static_questions');
  assert.ok(!sql.includes('pyq_prelims'), 'Must not reference pyq_prelims');
  assert.ok(!sql.includes('pyq_mains'), 'Must not reference pyq_mains');

  // 1.4 Explanations default to internal_only
  assert.ok(
    sql.includes("default 'internal_only'"),
    "qbank_explanations must default display_policy to 'internal_only'"
  );

  // 1.5 No grants to anon/authenticated on restricted tables
  const restrictedTables = [
    'qbank_keys',
    'qbank_explanations',
    'qbank_occurrences',
    'qbank_sources',
    'qbank_discrepancies',
  ];
  for (const table of restrictedTables) {
    const regex = new RegExp(`grant\\s+.*\\s+on\\s+.*${table}\\s+to\\s+.*(anon|authenticated)`, 'i');
    assert.equal(regex.test(sql), false, `Must not grant permissions on ${table} to anon/auth`);
  }

  // 1.6 qbank_questions DDL has no key, answer or explanation column
  const questionsTableMatch = sql.match(
    /create table if not exists public\.qbank_questions\s*\(([\s\S]*?)\);/i
  );
  assert.ok(questionsTableMatch, 'qbank_questions table DDL must be present');
  const questionsTableDDL = questionsTableMatch[1];
  const forbiddenColumns = ['key text', 'answer text', 'explanation text'];
  for (const col of forbiddenColumns) {
    assert.ok(
      !questionsTableDDL.toLowerCase().includes(col),
      `qbank_questions DDL must not contain column ${col}`
    );
  }
});

test('2. Loader: refusal on missing confirmation for --apply', async () => {
  const origEnv = process.env.QBANK_APPLY_CONFIRM;
  try {
    delete process.env.QBANK_APPLY_CONFIRM;
    await assert.rejects(
      async () => {
        await runLoad({ preview: false, apply: true });
      },
      {
        message: /--apply requires QBANK_APPLY_CONFIRM='final-2026-10'/,
      }
    );

    process.env.QBANK_APPLY_CONFIRM = 'wrong-release-id';
    await assert.rejects(
      async () => {
        await runLoad({ preview: false, apply: true });
      },
      {
        message: /--apply requires QBANK_APPLY_CONFIRM='final-2026-10'/,
      }
    );
  } finally {
    if (origEnv !== undefined) {
      process.env.QBANK_APPLY_CONFIRM = origEnv;
    } else {
      delete process.env.QBANK_APPLY_CONFIRM;
    }
  }
});

test('3. Loader: refusal on file integrity hash mismatch in release mode', async () => {
  const tempDir = path.join(getRunDir(), '..', `test-load-hash-${Date.now()}`);
  fs.mkdirSync(path.join(tempDir, 'canonical'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'reports'), { recursive: true });

  try {
    const dummyFile = path.join(tempDir, 'canonical', 'dummy.jsonl');
    fs.writeFileSync(dummyFile, '{"test":1}\n', 'utf-8');

    // reports/release.json with intentional hash mismatch
    const releaseRep = {
      files: {
        'canonical/dummy.jsonl': '0000000000000000000000000000000000000000000000000000000000000000',
      },
    };
    fs.writeFileSync(
      path.join(tempDir, 'reports', 'release.json'),
      JSON.stringify(releaseRep),
      'utf-8'
    );

    await assert.rejects(
      async () => {
        await planLoad({ runDir: tempDir, preview: false });
      },
      {
        message: /Integrity check mismatch for canonical\/dummy.jsonl/,
      }
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('4. Loader: preview planning & column isolation', async () => {
  const { plan, rowsByTable } = await planLoad({ preview: true });

  assert.equal(plan.release_id, 'final-2026-10');
  assert.ok(plan.tables.qbank_releases);
  assert.ok(plan.tables.qbank_questions);
  assert.ok(plan.tables.qbank_keys);
  assert.ok(plan.tables.qbank_explanations);
  assert.ok(plan.tables.qbank_mains_questions);

  // qbank_questions rows must NOT carry key or explanation properties
  const qRows = rowsByTable.qbank_questions;
  assert.ok(qRows.length > 0, 'Must have planned question rows');
  for (const row of qRows.slice(0, 10)) {
    assert.equal((row as any).key, undefined, 'qbank_questions row must not have key');
    assert.equal((row as any).answer, undefined, 'qbank_questions row must not have answer');
    assert.equal(
      (row as any).explanation,
      undefined,
      'qbank_questions row must not have explanation'
    );
    assert.ok(row.content_sha256, 'Must compute content_sha256');
  }

  // qbank_explanations rows must have display_policy: 'internal_only'
  const expRows = rowsByTable.qbank_explanations;
  assert.ok(expRows.length > 0, 'Must have planned explanation rows');
  for (const row of expRows.slice(0, 10)) {
    assert.equal(row.display_policy, 'internal_only');
  }
});

test('5. Parity & Jaccard logic', async () => {
  // Test tokenization and Jaccard
  const setA = tokenize('The quick brown fox jumps over the lazy dog');
  const setB = tokenize('The lazy dog barked at the quick brown fox');
  const sim = jaccard(setA, setB);
  assert.ok(sim >= 0.6, `Expected high similarity, got ${sim}`);

  const disjointA = tokenize('apple orange banana');
  const disjointB = tokenize('car train airplane');
  assert.equal(jaccard(disjointA, disjointB), 0.0);

  // Run parity check
  const report = await runParity();
  assert.ok(report.matched >= 600, `Matched should be >= 600, got ${report.matched}`);
  assert.ok(report.unmatched >= 0, `Unmatched should be >= 0, got ${report.unmatched}`);
  assert.ok(Array.isArray(report.key_disagreements));
  assert.ok(
    report.key_disagreements.length > 0,
    'Expected known disagreements with legacy pool'
  );

  const sample = report.key_disagreements[0];
  assert.ok(sample.pool_id);
  assert.ok(sample.canonical_id);
  assert.ok(sample.pool_key);
  assert.ok(sample.canonical_authority);
});
