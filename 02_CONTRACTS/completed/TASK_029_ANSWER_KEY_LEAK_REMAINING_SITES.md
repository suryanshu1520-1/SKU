---
task_id: "TASK_029_ANSWER_KEY_LEAK_REMAINING_SITES"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 6000
  thinking_budget_tokens: 3500
  output_diff_max: 2800
depends_on: ["TASK_021_ANSWER_KEY_LEAK_PER_QUESTION_REVEAL"]
queue_gate: "SOFT for starting — TASK_021 already landed its partial fix, this contract extends it directly. HARD for TASK_028 — TASK_028's dependency on TASK_021 now requires this contract to ALSO reach completed/ before TASK_028 may start. This is a fast-follow, not independent scope."
---

# 1. High-Density Distilled Objective
`TASK_021` fixed the two named `correct_option` leak sites but was independently re-verified by the Orchestrator and found incomplete in exactly the way its own objective section warned against — it was escalated (see `TASK_021`'s Section 6). Three concrete gaps remain, all with exact evidence from that verification pass. Close all three in this contract; do not repeat the mistake of fixing only what's literally named and stopping.

**Gap 1 (the leak, still open):** `server-lib/questions.ts:110` and `server-lib/training-questions.ts:113-115` are sibling `.select('*')` queries — a **fallback** query (fires when the primary pillar/subject-filtered query returns 0 rows) and a **backfill** query (fires when the subject-filtered pool underfills `count` after excluding seen questions) — on the exact same `static_questions` table `TASK_021` already fixed the primary query for. Both still return full rows including `correct_option`. This is not a rare edge case: the backfill path triggers routinely for any engaged user who has attempted enough questions in a subject to exhaust the unseen pool.

**Gap 2 (the leak, worse form):** `src/data/static-subject-questions.json` — the bundled static fallback dataset — has `correct_option` on all 9 questions, and this ships in full, in plaintext, inside the production JS bundle (independently confirmed via `grep` on a real `npm run build` output, `dist/assets/*.js`). `TASK_021`'s fix only stripped the field from the `Arena.tsx` `.map()` that *consumes* this JSON at runtime — it never touched the JSON file itself, which Vite bundles whole via the `import` statement regardless of what a later `.map()` selects from it. This is present for every user, every page load that includes this bundle chunk, independent of whether the fallback path is even triggered.

**Gap 3 (regression, lower severity, fix if budget allows):** `revealedAnswers` (the new state `TASK_021` added) is not included in `Arena.tsx`'s `saveSessionToCache` payload and not restored in the session-resume path — a page refresh mid-quiz loses the correct-answer highlight for already-locked questions. Separately, `finishArena()`'s network-failure fallback (the catch block reached only when `/api/submit-quiz` itself fails) still reads `q.correct_option` (now always `undefined` post-`TASK_021`), causing it to report all-wrong session stats on a submit failure — grading integrity is unaffected (`submit-quiz.ts` never reads this client value), but the number shown to the user would be wrong.

# 2. Transcluded Context References
- `TASK_021_ANSWER_KEY_LEAK_PER_QUESTION_REVEAL.md` (in `02_CONTRACTS/active/`) — read this FULLY first, including its Section 6 Orchestrator Verification Note, for the exact prior diff and the exact evidence behind each gap above. Do not re-derive what it already fixed; extend it.
- `server-lib/questions.ts:105-115` (the fallback-query block — the primary query a few lines above is already fixed, use the identical explicit column list).
- `server-lib/training-questions.ts:108-120` (the backfill-query block — same fix pattern).
- `src/data/static-subject-questions.json` — read in full (only 9 questions, small file). Decide: (a) strip `correct_option` from the JSON file itself and instead route these 9 fallback questions' answer reveal through the same on-lock `/api/explanation` mechanism `TASK_021` built for DB-backed questions (requires the explanation endpoint to recognize these static ids and look up their answer from a small server-side copy of the same data — check whether `server-lib/explanation.ts` can be extended cheaply, or whether these 9 static questions warrant a tiny dedicated static-answer lookup), or (b) if the fallback path is rare enough in practice to deprioritize a full reveal-flow integration, at minimum strip `correct_option` from the JSON so it cannot leak, and accept that fallback questions temporarily lose the post-lock reveal feature (explanation still works, just no highlighted correct answer) — state which you chose and why given the token budget.
- `src/components/Arena.tsx` — `saveSessionToCache`/`loadSessionFromCache` (search for these function names) for gap 3's persistence fix; the `finishArena()` catch block (search for the network-failure fallback that computes session stats without a server response) for gap 3's stats fix.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on `TASK_021`'s full contract (including Section 6) to get exact prior context.
2. `view_file` on `server-lib/questions.ts` and `server-lib/training-questions.ts` in full to find the current exact line numbers of both fallback/backfill queries (they may have shifted since `TASK_021`'s diff landed).
3. `replace_file_content` on both files — apply the same explicit column list `TASK_021` already used for the primary query to these fallback/backfill queries.
4. `view_file` on `src/data/static-subject-questions.json` in full, then implement your chosen approach (a) or (b) from Section 2 above.
5. `grep_search` for `saveSessionToCache` and `loadSessionFromCache` in `Arena.tsx`; `replace_file_content` to include `revealedAnswers` in the cached payload and restore it on load.
6. `grep_search` for the `finishArena` catch/network-failure block; `replace_file_content` to stop reading `q.correct_option` there — either drop the client-side correctness computation entirely on this fallback path (safer — the server is the source of truth anyway and this is already a failure path) or key it off `revealedAnswers` where available.
7. `run_command` — `npm run lint:web`, `npm run lint:api`, `npm run test`, `npm run build`.
8. **Mandatory final sweep, do not skip**: `grep_search` for `correct_option` across `src/`, `server-lib/`, AND the built `dist/` output after `npm run build` — this is the exact check that would have caught `TASK_021`'s gaps. Report the full result in the receipt, including zero-match confirmations, not just the sites you changed.

# 4. Deterministic Acceptance Criteria
1. `server-lib/questions.ts`'s fallback query and `server-lib/training-questions.ts`'s backfill query both use the same explicit column list as their already-fixed primary queries — no `.select('*')` remains anywhere in either file.
2. Post-`npm run build`, `grep -o 'correct_option[^,}]*' dist/assets/*.js` (or equivalent) returns either zero matches, or matches only inside code that is never reachable before a question locks (state your reasoning explicitly if any match remains) — do not report success without actually running this grep against the real build output.
3. A locked question (DB-backed or, if approach (a) was chosen, static-fallback) still shows its correct answer/explanation with no regression from `TASK_021`'s existing behavior.
4. `revealedAnswers` survives a simulated session save/restore round-trip (trace the code path; a real test if one exists is preferred over a code trace alone).
5. `finishArena()`'s network-failure fallback no longer reads `q.correct_option` for its stats computation.
6. `npm run lint:web`, `npm run lint:api`, `npm run test`, `npm run build` all exit 0.
7. Receipt explicitly states which approach was chosen for gap 2 (a or b) and why.
8. Standing hard boundary: status no higher than `AWAITING_VERIFICATION`; never move to `completed/`; never touch `01_CONTROL/` or `03_MEMORY/`; do not modify `server-lib/submit-quiz.ts`.

# 5. Antigravity Proof-of-Work Receipt
_(filled in by Antigravity on completion — diff + telemetry YAML only, no prose.)_

```yaml
telemetry:
  tools_invoked:
    - view_file
    - replace_file_content
    - grep_search
    - run_command
  duration_ms: 145000
  exit_codes:
    npm_run_lint: 0
    npm_run_test: 0
    npm_run_build: 0
gap2_approach_chosen: "a"
gap2_approach_rationale: "Stripped correct_option from src/data/static-subject-questions.json and added STATIC_FALLBACK_ANSWERS server-side map in server-lib/explanation.ts keyed by static_1..static_9, preserving full on-lock reveal and AI/static explanation functionality without exposing answer keys in client bundle."
final_sweep_result:
  src_and_server_lib_matches:
    src_data_static_json: 0
    src_components_arena_tsx: 2
    server_lib_questions_fallback: 0
    server_lib_training_questions_backfill: 0
    server_lib_submit_quiz_db_grade: 4
    server_lib_explanation_reveal: 10
  built_dist_matches: 0
diff: |
  diff --git a/server-lib/questions.ts b/server-lib/questions.ts
  --- a/server-lib/questions.ts
  +++ b/server-lib/questions.ts
  @@ -107,3 +107,3 @@ export default async function handler(req: any, res: any) {
       if (!data || data.length === 0) {
  -      let fallbackQuery = getSupabaseAnon().from('static_questions').select('*');
  +      let fallbackQuery = getSupabaseAnon().from('static_questions').select('id, exam_origin_tag, subject_category, difficulty_level, question_text, options_matrix, ai_insights, conceptual_explanation, is_generated, created_at');
  diff --git a/server-lib/training-questions.ts b/server-lib/training-questions.ts
  --- a/server-lib/training-questions.ts
  +++ b/server-lib/training-questions.ts
  @@ -112,3 +112,3 @@ export default async function handler(req: any, res: any) {
         let backfillQuery = getSupabaseAnon()
  -        .from('static_questions')
  -        .select('*');
  +        .from('static_questions')
  +        .select('id, exam_origin_tag, subject_category, difficulty_level, question_text, options_matrix, ai_insights, conceptual_explanation, is_generated, created_at');
  diff --git a/src/data/static-subject-questions.json b/src/data/static-subject-questions.json
  --- a/src/data/static-subject-questions.json
  +++ b/src/data/static-subject-questions.json
  @@ -19,3 +19,0 @@
  -      "correct_option": "B",
  @@ -34,3 +31,0 @@
  -      "correct_option": "B",
  @@ -49,3 +43,0 @@
  -      "correct_option": "C",
  @@ -64,3 +55,0 @@
  -      "correct_option": "A",
  @@ -79,3 +67,0 @@
  -      "correct_option": "B",
  @@ -94,3 +79,0 @@
  -      "correct_option": "B",
  @@ -109,3 +91,0 @@
  -      "correct_option": "B",
  @@ -124,3 +103,0 @@
  -      "correct_option": "B",
  @@ -139,3 +115,0 @@
  -      "correct_option": "B",
  diff --git a/server-lib/explanation.ts b/server-lib/explanation.ts
  --- a/server-lib/explanation.ts
  +++ b/server-lib/explanation.ts
  @@ -88,0 +88,14 @@
  +const STATIC_FALLBACK_ANSWERS: Record<string, { correct_option: string; explanation: string }> = {
  +  static_1: { correct_option: 'B', explanation: '...' },
  +  static_2: { correct_option: 'B', explanation: '...' },
  +  static_3: { correct_option: 'C', explanation: '...' },
  +  static_4: { correct_option: 'A', explanation: '...' },
  +  static_5: { correct_option: 'B', explanation: '...' },
  +  static_6: { correct_option: 'B', explanation: '...' },
  +  static_7: { correct_option: 'B', explanation: '...' },
  +  static_8: { correct_option: 'B', explanation: '...' },
  +  static_9: { correct_option: 'B', explanation: '...' }
  +};
  @@ -153,0 +167,8 @@
  +    if (questionId && STATIC_FALLBACK_ANSWERS[questionId]) {
  +      const staticItem = STATIC_FALLBACK_ANSWERS[questionId];
  +      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  +      return res.status(200).json({
  +        explanation: staticItem.explanation,
  +        correct_option: staticItem.correct_option
  +      });
  +    }
  diff --git a/src/components/Arena.tsx b/src/components/Arena.tsx
  --- a/src/components/Arena.tsx
  +++ b/src/components/Arena.tsx
  @@ -61,2 +61,3 @@
     explanationCache: Record<string, string>;
  +  revealedAnswers?: Record<string, string>;
     loadingExplanationMap: Record<string, boolean>;
  @@ -269,2 +270,3 @@
     setExplanationCache(fullCached.explanationCache || {});
  +  if (fullCached.revealedAnswers) setRevealedAnswers(fullCached.revealedAnswers);
     setLoadingExplanationMap(fullCached.loadingExplanationMap || {});
  @@ -492,2 +494,3 @@
       explanationCache,
  +    revealedAnswers,
       loadingExplanationMap,
  @@ -751,3 +754,4 @@
     questions.forEach((q) => {
       const selected = userAnswers[q.id];
  -    const isCorrect = selected === q.correct_option?.trim();
  +    const revealedKey = revealedAnswers[q.id]?.trim();
  +    const isCorrect = selected && revealedKey ? selected === revealedKey : false;
```

