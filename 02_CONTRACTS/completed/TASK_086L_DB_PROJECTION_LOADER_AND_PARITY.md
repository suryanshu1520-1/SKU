---
task_id: "TASK_086L"
title: "DB projection: additive migration file (never applied), dry-run loader, read-only legacy parity report"
parent: "TASK_086"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_086K"]
queue_gate: "HARD: do not start until TASK_086K is in 02_CONTRACTS/completed/."
human_gate: "G4: the owner applies the migration by hand. G5: the owner runs the loader with --apply and QBANK_APPLY_CONFIRM. The delegate does neither."
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Write the additive Supabase migration for the release tables, keeping answers and explanations unreadable to
`anon`. Build a loader that defaults to a dry run, plus a read-only parity report against the legacy Exam Hall
pool. Apply nothing.

# 2. Transcluded Context References
- Pattern to follow: `supabase/migrations/20260830230000_lockdown_answer_columns.sql`, which locks answer columns away from anon.
- `server-lib/load-env.ts:9-10` loads `.env`, then `.env.local`. The env names are `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; never print their values.
- Inputs: `reports/release.json` (`files` with SHA-256), `canonical/questions.jsonl`, `mains.jsonl`, `occurrences.jsonl` (with `canonical_id` set) and `manifests.json`.
- Legacy pool: `server-lib/exam/data/gs1ExamPool.ts` (647 items: `id, year, subject, format, stem, options, key, explanation`). Read the export name with `view_file`.

**Inherited rules (TASK_086 §3).**
- **Never call `apply_migration`, `execute_sql` or any DDL/DML.**
- Never run `--apply`.
- Never modify legacy tables or files.
- Do not commit or push.

**Distilled spec**

1. **`supabase/migrations/20261022120000_qbank_final_edition.sql`** (file only)
   - **Tables.** Use `create table if not exists public.…` for each:
     - **`qbank_releases`**: `release_id text pk, created_at timestamptz not null default now(), manifest_sha256 text not null, counts jsonb not null default '{}', notes text`.
     - **`qbank_sources`**: `release_id text not null references qbank_releases, document_id text, publisher text not null, url text not null, sha256 text not null, bytes bigint, pages int, retrieved_at timestamptz, source_status text not null`; pk `(release_id, document_id)`.
     - **`qbank_questions`**: `release_id, canonical_id, year int check 2011-2026, stage text check ='Prelims', paper text check in ('GS-1','GS-2'), booklet_series text check in ('A','B','C','D'), question_number int > 0, stem text not null, statements jsonb, passage text, options jsonb not null, figures jsonb, instruction_refs jsonb, format text, topic text, difficulty text, status text check in ('complete','incomplete'), eligibility jsonb not null, content_sha256 text not null`; pk `(release_id, canonical_id)`. **It has no key, answer or explanation column.**
     - **`qbank_keys`**: `release_id, canonical_id, authority text not null check in (the 7 KEY_AUTHORITIES), key text check in ('a','b','c','d'), accepted_keys text[], source_ref jsonb, paper_series_join text`; pk `(release_id, canonical_id)`, with an fk to `qbank_questions`.
     - **`qbank_occurrences`**: `release_id, occurrence_id, canonical_id, source_document_id text not null, identity jsonb not null, text jsonb not null, key_claim jsonb, evidence jsonb not null`; pk `(release_id, occurrence_id)`.
     - **`qbank_explanations`**: `release_id, canonical_id, provenance text check in ('editorial','model-authored','none'), review_state text not null, text text, source_refs jsonb, display_policy text not null default 'internal_only' check in ('internal_only','public')`; pk `(release_id, canonical_id)`.
     - **`qbank_mains_questions`**: `release_id, canonical_id, year int, paper text check in ('GS-M1','GS-M2','GS-M3','GS-M4','Essay'), question_number int, subpart text, prompt text not null, case_study text, word_limit int, marks_allotted numeric, section text, status text, eligibility jsonb not null, evidence jsonb not null`; pk `(release_id, canonical_id)`.
     - **`qbank_discrepancies`**: `id bigint generated always as identity pk, release_id text not null references qbank_releases, canonical_id text not null, code text not null, detail text not null, resolved boolean not null default false, evidence jsonb`, unique `(release_id, canonical_id, code, detail)`.
   - **Access control.**
     - Enable row level security on all 8 tables.
     - `revoke all … from anon, authenticated` on all 8.
     - Grant SELECT to `anon, authenticated` **only** on `qbank_releases`, `qbank_questions` and `qbank_mains_questions`, each with a `for select … using (true)` policy.
   - **Scope.** No `drop`, and no reference to any table other than the 8 above.
2. **`scripts/qbank/final/load.ts`** (`npm run qbank:load`, with `--preview` or `--apply`)
   - **Integrity.** Recompute the SHA-256 of every file listed in `reports/release.json` and exit 1 on any mismatch. `--preview` instead reads the `*.preview.*` files, skips the hash check, and only plans.
   - **Row builders**, one per table:
     - `content_sha256` = the SHA-256 of `stableStringify(record.text)`.
     - Keys go only to `qbank_keys`.
     - Explanations go to `qbank_explanations` with `display_policy: 'internal_only'`.
   - **Dry run** (the default):
     - Write `release-preview/load-plan.json` = `{release_id, tables:{name:{rows, sample_pk}}}`.
     - If the env holds a URL and a service key, also SELECT the existing primary keys for this `release_id`, read-only, and report inserts vs updates.
   - **`--apply`:**
     - Requires `QBANK_APPLY_CONFIRM` to equal `release_id`, and the service key to be set.
     - Upserts by primary key in batches of 500, in this order: releases, sources, questions, keys, occurrences, explanations, mains, discrepancies.
     - Never deletes. Stops at the first error and reports the table and batch.
3. **`scripts/qbank/final/parity.ts`** (`npm run qbank:parity`, read-only)
   - Match each legacy pool item to a canonical record by `year` plus stem token-set Jaccard ≥ 0.85.
   - Write `release-preview/parity-legacy.json` = `{matched, unmatched, key_disagreements:[{pool_id, canonical_id, pool_key, canonical_key, canonical_authority}]}`.
   - Compare letters case-insensitively.
4. **`package.json`.** Add:
   - `"qbank:load": "tsx scripts/qbank/final/load.ts"`
   - `"qbank:parity": "tsx scripts/qbank/final/parity.ts"`
5. **Tests** in `scripts/qbank-tests/final/load.test.ts`.
   - **Migration text checks:**
     - `enable row level security` appears 8 times;
     - no grant to anon/authenticated on `qbank_keys`, `qbank_explanations`, `qbank_occurrences`, `qbank_sources` or `qbank_discrepancies`;
     - `default 'internal_only'` is present;
     - there is no `drop `;
     - no `static_questions`, `pyq_prelims` or `pyq_mains` appears;
     - the `qbank_questions` DDL contains no `key` or `explanation` column.
   - **Loader:**
     - refuses `--apply` without the confirm variable;
     - refuses on a hash mismatch;
     - the `qbank_questions` rows carry no `key`;
     - batches of 500.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file`: `supabase/migrations/20260830230000_lockdown_answer_columns.sql`, `server-lib/load-env.ts` and the export line of `gs1ExamPool.ts`.
2. `write_to_file`: the migration, `load.ts`, `parity.ts` and `load.test.ts`.
3. `replace_file_content`: `package.json`.
4. `run_command`, in order:
   - `npm run test:qbank`
   - `npm run qbank:load -- --preview` (or a dry run on the release if G2 is done)
   - `npm run qbank:parity`
   - `npm run lint`
   - `git status --porcelain`

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank` and `npm run lint` both exit 0.
- Paste the dry-run plan (`load-plan.json`) and the parity summary (`matched`, `unmatched`, and the count of `key_disagreements`), each with its SHA-256.
- The receipt states, in so many words: **"migration not applied; no apply_migration / execute_sql calls; --apply not run."**
- `git status --porcelain` shows only code files and the new migration file.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - write_to_file
    - replace_file_content
    - run_command
  duration_ms: 18450
  exit_codes:
    npm run test:qbank: 0
    npm run qbank:load --preview: 0
    npm run qbank:parity: 0
    npm run lint: 0
    git status: 0
  report_sha256:
    load-plan.json: "9806aee2b82313c07e5d2ed27198c58fdd15a563e4bac13ac8260116fe845a86"
    parity-legacy.json: "da65605bbf12ed9bb9b7a889371f3ad1fb5eb4c8b201ae982cc103a25b37add8"
report_summary: |
  load-plan.json:
  {
    "release_id": "final-2026-10",
    "tables": {
      "qbank_discrepancies": {
        "rows": 1981,
        "sample_pk": {
          "canonical_id": "UPSC_CSE_Prelims_2011_GS-1_Q001_en",
          "code": "series_unresolved",
          "detail": "booklet series unresolved",
          "release_id": "final-2026-10"
        }
      },
      "qbank_explanations": {
        "rows": 2240,
        "sample_pk": {
          "canonical_id": "UPSC_CSE_Prelims_2011_GS-1_Q001_en",
          "release_id": "final-2026-10"
        }
      },
      "qbank_keys": {
        "rows": 2240,
        "sample_pk": {
          "canonical_id": "UPSC_CSE_Prelims_2011_GS-1_Q001_en",
          "release_id": "final-2026-10"
        }
      },
      "qbank_mains_questions": {
        "rows": 248,
        "sample_pk": {
          "canonical_id": "UPSC_CSE_Mains_2023_Essay_Q001_en",
          "release_id": "final-2026-10"
        }
      },
      "qbank_occurrences": {
        "rows": 2453,
        "sample_pk": {
          "occurrence_id": "handoff:2021-GS-1:transcription:en_p3_q1",
          "release_id": "final-2026-10"
        }
      },
      "qbank_questions": {
        "rows": 2240,
        "sample_pk": {
          "canonical_id": "UPSC_CSE_Prelims_2011_GS-1_Q001_en",
          "release_id": "final-2026-10"
        }
      },
      "qbank_releases": {
        "rows": 1,
        "sample_pk": {
          "release_id": "final-2026-10"
        }
      },
      "qbank_sources": {
        "rows": 46,
        "sample_pk": {
          "document_id": "visionias:2011-GS-1:solution:en",
          "release_id": "final-2026-10"
        }
      }
    }
  }

  parity-legacy.json summary:
  matched: 631
  unmatched: 16
  key_disagreements: 12

  migration not applied; no apply_migration / execute_sql calls; --apply not run.
diff: |
  diff --git a/package.json b/package.json
  --- a/package.json
  +++ b/package.json
  @@ -34,4 +34,6 @@
       "qbank:release": "tsx scripts/qbank/final/release.ts",
  +    "qbank:load": "tsx scripts/qbank/final/load.ts",
  +    "qbank:parity": "tsx scripts/qbank/final/parity.ts",
       "test:qbank:py": "python -X utf8 -m unittest discover -s scripts/qbank/final/py -p \"test_*.py\"",
```
