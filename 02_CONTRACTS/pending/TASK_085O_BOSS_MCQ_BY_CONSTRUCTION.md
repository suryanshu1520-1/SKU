---
task_id: "TASK_085O"
title: "Boss MCQ by construction: truth decided before wording; no runtime fallbacks"
parent: "TASK_085"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
depends_on: ["TASK_085A2", "TASK_085G", "TASK_085J"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 6000
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Generate 3-statement "how many are correct" questions for a program where every statement's truth value is known
by construction from verified events and the registry, the key is unbiased, and nothing comes from hard-coded
fallbacks or other programs.

# 2. Transcluded Context References
- Defects replaced: `server-lib/cron/policy-graph-worker.ts:226-231` (global top-10 entities), `CANONICAL_BOSS_MCQ_FALLBACKS` (`policy-graph-worker.ts:51`, used at `:297-298` when the LLM fails and by `server-lib/policy-radar.ts:5, 247-248`; all keyed `a`), `synthesizeChainBossMcq`. The client copy was removed by 085A2.
- **Do not write boss MCQs to `current_affairs_mcqs`**: it is read without filters by the Arena (`server-lib/questions.ts:49`), training (`server-lib/training-questions.ts:112`) and the SEO bot renderer (`server-lib/seo/bot-renderer.ts:179-196, 720`), so radar questions would bypass the kill switch. The legacy `is_boss_mcq` columns (`20261019_ripple_volcano_ev_engine.sql:23-32`) stay unused.
- `verify.ts:81` `extractFacts`; `resolve.ts` `jaroWinkler`; registry rows (`entity_slug, authority, kind, jurisdiction, parent_entity_slug, legal_basis_kind, legal_basis_ref, source_url`).

**Distilled spec** — `server-lib/policy/prng.ts` (shared with 085R) and `server-lib/policy/boss-mcq.ts` (pure, LLM injected):
```ts
// prng.ts
export function fnv1a(s: string): number;                     // 32-bit FNV-1a over UTF-16 code units
export function mulberry32(seed: number): () => number;       // returns floats in [0, 1)
// boss-mcq.ts
export type TrueStmt = { text: string; eventId: string; actorSlug: string|null; numbers: string[]; quote: string; url: string };
export type Built = { stem: string; statements: string[]; truth: boolean[]; key: 'a'|'b'|'c'|'d';
  dissection: Array<{ n: number; is_true: boolean; operator: string|null; original?: string; replaced?: string; evidence: { quote: string; url: string } }> };
export function buildBossMcq(program: { slug: string; name: string }, trues: TrueStmt[], registry: RegistryRow[],
  editionDate: string, paraphrase?: (s: string, keep: string[]) => Promise<string>): Promise<Built | null>;
```
Algorithm:
1. Require ≥ 3 public events in **this** program and ≥ 2 `trues` (verified claim texts of those events). Else `null`.
2. Registry statement (optional, at most one): for the program's resolved actors with a `provenance='registry'` row
   (ties by slug, first by rng), a true statement from `BASIS_TRUE[legal_basis_kind]` with evidence
   `{ quote: legal_basis_ref, url: source_url }`:
   `constitution_article` "{A} is a constitutional body ({ref})." · `central_act`/`state_act` "{A} is a statutory body
   established under the {ref}." · `executive_order` "{A} was set up by an executive order of the government, not by an
   Act." · `society_registration` "{A} is registered as a society." · `companies_act_section8` "{A} is a not-for-profit
   company under Section 8 of the Companies Act, 2013." · `trust` "{A} is constituted as a trust." ·
   `companies_act_cpse` "{A} is a public sector company."
3. `rng = mulberry32(fnv1a(slug + '|' + editionDate))`; build 3 slots = the registry statement (if any) + event
   claims drawn by rng; shuffle the slots with rng; `kTrue = floor(rng()*4)` ∈ {0,1,2,3}; the first `kTrue` slots
   stay true, the rest are falsified. If 3 slots cannot be filled → `null`.
4. Falsifiers for event claims, tried in this order until one applies:
   - `PSY_05_SCOPE_MUTATE`: take the first number token `x` of the statement (`extractFacts`); candidates
     `round(1.5x)`, `round(0.5x)`, `x + 10^floor(log10 x)`, `x − 10^floor(log10 x)` (formatted like the original:
     same thousands separators and unit words); choose the first candidate not equal to any number in **any** verified
     claim of the program.
   - `PSY_01_INST_SWAP`: if the statement names the actor (authority or alias), replace it with the registry sibling
     of the same `kind` and `jurisdiction` maximising `jaroWinkler(names) + 0.5·[same parent_entity_slug]`, excluding
     every authority that appears in any event of the program; ties by slug.
   - else drop this statement and draw another true; if none left → `null`.
   Falsifier for the registry statement — `PSY_03_LEGAL_TIER`, reference-free text so nothing is invented:
   `constitution_article` → "{A} is a statutory body created by an Act of Parliament." · `central_act` → "{A} is a
   constitutional body." · `executive_order`, `society_registration`, `companies_act_section8`, `trust`,
   `companies_act_cpse` → "{A} is a statutory body created by an Act of Parliament." · `state_act` → not falsifiable,
   replace the slot with another event claim.
5. Optional paraphrase: accept the paraphrase only if every `extractFacts` token of the input (and, for false
   statements, the `replaced` token) is present verbatim; otherwise keep the original wording.
6. `key` from count of true statements: 1 → `a` "Only one", 2 → `b` "Only two", 3 → `c` "All three", 0 → `d` "None".
7. Dissection: true → event (or registry) quote + url; false → operator, `original`, `replaced`, and the true quote + url.
8. Worker: replace `synthesizeChainBossMcq` with a v2 job `server-lib/cron/boss-mcq-worker.ts` that calls `buildBossMcq` for programs with ≥ 3 new public
   events since the last build, and upserts into a dedicated table (migration
   `20261021000850_policy_boss_mcqs.sql`):
   ```sql
   CREATE TABLE IF NOT EXISTS public.policy_boss_mcqs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     program_slug TEXT NOT NULL REFERENCES public.policy_programs(program_slug) ON DELETE CASCADE,
     edition_date DATE NOT NULL, question TEXT NOT NULL, options JSONB NOT NULL,
     correct_index SMALLINT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
     statement_dissection JSONB NOT NULL, primary_operator examiner_operator_type,
     generator_version TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (program_slug, edition_date));
   ALTER TABLE public.policy_boss_mcqs ENABLE ROW LEVEL SECURITY;   -- no policies: service role only
   ```
   Row: `question = stem + '\n' + statements numbered 1–3`, `options = ["Only one","Only two","All three","None"]`,
   `correct_index = { a: 0, b: 1, c: 2, d: 3 }[key]`, `statement_dissection = dissection`, `primary_operator` = operator
   of the first false statement (or null), `generator_version = 'boss_v1'`.
9. Move `CANONICAL_BOSS_MCQ_FALLBACKS` to `scripts/tests/fixtures/radar/legacy-boss-fallbacks.ts`; no runtime import remains.
10. Schedule it: step `- name: Boss MCQs` / `run: npx tsx server-lib/cron/boss-mcq-worker.ts`.
   If `.github/workflows/radar-daily.yml` does not exist, create it exactly as below, then add your step under the
   marker in the stated order (gaps 085L → node signals 085N → boss MCQs 085O → eval 085R):
   ```yaml
   name: Radar Daily
   on:
     schedule:
       - cron: '0 3 * * *'   # after the 02:30 UTC ingest run
     workflow_dispatch:
   jobs:
     radar:
       runs-on: ubuntu-latest
       timeout-minutes: 30
       env:
         SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
         SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
         GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
         GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
         RADAR_V2_SINCE: ${{ vars.RADAR_V2_SINCE }}
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: '22', cache: 'npm' }
         - run: npm ci
         # --- radar steps (order: gaps, node signals, boss MCQs, eval) ---
   ```

# 3. Mandatory Tool Chain & Execution Path
1. `write_to_file` `prng.ts`, `boss-mcq.ts`, `boss-mcq-worker.ts`, the migration (not applied), the workflow step, fixtures move; `multi_replace_file_content` worker + `policy-radar.ts` imports.
2. `write_to_file` `scripts/tests/radar/boss-mcq.test.ts` (picked up by the `test:radar` glob).
3. `run_command` `npm run test:radar`, `npm run lint`.

# 4. Deterministic Acceptance Criteria
- Property test over 500 synthetic programs (seeded): `key` always equals the mapping of `truth.filter(Boolean).length`;
  every false statement contains its `replaced` token and not its `original` token; no `replaced` number appears in
  any verified claim of that program; no swapped authority appears in any event of that program; every false
  registry statement uses a basis kind different from the entity's `legal_basis_kind` and contains no `legal_basis_ref` text.
- Key distribution over 400 builds with distinct `editionDate`s: each of a/b/c/d between 70 and 130 (expected 100).
- Same `(slug, editionDate)` → identical output (determinism).
- Row builder: `correct_index` equals the index of the key letter; re-running the job for the same day upserts on `(program_slug, edition_date)` (no duplicate).
- Worker entry guard (pattern of `policy-graph-worker.ts:714-724`): `if (process.argv[1]?.includes("boss-mcq-worker"))` runs the job, `process.exit(0)` on success, `process.exit(1)` on error.
- Paraphrase guard: a mocked paraphrase that changes "₹19,744 crore" to "₹19.7 thousand crore" is rejected.
- `grep_search "CANONICAL_BOSS_MCQ_FALLBACKS"` outside `scripts/tests/` → 0 matches.
- `npm run lint`, `npm run test:radar` exit 0.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: { test_radar: null, lint: null }
  migration_applied: false
  key_distribution: { a: 0, b: 0, c: 0, d: 0 }
diff: |
  <unified diff>
```
