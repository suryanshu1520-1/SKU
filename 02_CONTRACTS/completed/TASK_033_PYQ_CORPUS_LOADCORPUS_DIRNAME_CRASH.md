---
task_id: "TASK_033_PYQ_CORPUS_LOADCORPUS_DIRNAME_CRASH"
status: "VERIFIED_PARTIAL"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 1800
  output_diff_max: 1800
depends_on: []
queue_gate: "NONE — independent of the current RLS-lockdown priority (TASK_032). May run concurrently."
---

# 1. High-Density Distilled Objective
The Observatory's "Question Bank" (the flagship live 7,841-question corpus feature, verified working by `TASK_025`) is silently serving only 13 hardcoded sample questions in local dev — 3 pages, not the real ~1,307. **Root cause fully diagnosed by the Orchestrator; this contract is fix-only, not investigation.** `server-lib/analytics/pyq_explorer.ts`'s `loadCorpus()` (lines 76-102) builds a `possiblePaths` array literal containing two `path.join(__dirname, ...)` calls (lines 83-84). This project's `package.json` declares `"type": "module"` — under native ESM, `__dirname` is not a defined global, so referencing it throws `ReferenceError: __dirname is not defined`. Because array literals evaluate every element eagerly at construction time, this throws immediately when building the array — **before** the code ever reaches the `for` loop that would have checked `fs.existsSync()` on the array's first, correct, working candidate path (`path.join(process.cwd(), 'server-lib', 'analytics', 'data', 'master_7841_pyqs.json')`). The thrown error is caught by `loadCorpus()`'s own `try/catch`, which logs and returns `cachedCorpus = []` — and because `cachedCorpus` is a module-level singleton set once, this empty result is memoized **permanently for the life of the server process**. Every subsequent call to either `/api/analytics/observatory/pyqs` or `/api/analytics/observatory/census` returns a `success:true` response with zero real data, forever, until the process restarts (and then fails identically on the very next request).

**Confirmed evidence (reproduce, don't re-derive):**
- Live dev server log: `Error loading master 7841 PYQ corpus: ReferenceError: __dirname is not defined at loadCorpus (server-lib/analytics/pyq_explorer.ts:83:17)`.
- `curl http://localhost:3000/api/analytics/observatory/pyqs?...` → `{"success":true,"total":0,"page":1,"totalPages":1,"data":[]}`.
- `curl http://localhost:3000/api/analytics/observatory/census` → `{"success":true,"data":{"totalItems":0,...}}`.
- Standalone Node script replicating only the working first candidate path (`process.cwd()`-based, no `__dirname`) against the real file succeeds immediately: file exists (5,438,842 bytes), parses cleanly, yields a 7,841-element array. **The data file and the correct path are both fine — this is purely the eager-evaluation-of-a-throwing-array-literal bug, nothing else.**
- The production build (`npm run build`, which esbuild-bundles `server.ts` to CJS via `--format=cjs`) does **not** reproduce this crash, because a real CJS bundle defines `__dirname` as a local variable — consistent with `TASK_024`'s independent verification, which tested against exactly that built bundle and got real, correct corpus numbers. **This bug is 100% confirmed in local `npm run dev` (`tsx server.ts`); whether Vercel's own build/bundling of the separate `api/server.ts` entrypoint reproduces it is unconfirmed — check this as part of the fix, do not assume either way.**

**Downstream symptom (why the user sees "3 pages, ~20 questions"):** `src/components/Observatory.tsx`'s fetch effect applies the response whenever `json.success` is true, with no check that `data` is non-empty — `serverQuestions` gets set to `[]`. Since `serverQuestions.length > 0` is then false, the component's `activeQuestionsList` memo silently falls through to a small local hardcoded fallback array (13 sample questions), paginated client-side at 6/page = 3 pages. This fallback is a deliberate graceful-degradation safety net for when the live API is unreachable — but it engages silently (only a `console.warn`) even on a "successful but empty" response, which is exactly what masked this bug. Fixing `loadCorpus()` is the primary fix; also close this secondary gap so a future empty-but-successful response doesn't silently masquerade as real data again.

# 2. Transcluded Context References
- `server-lib/analytics/pyq_explorer.ts:76-102` (`loadCorpus()`, the bug) and `:104-191` (`queryMasterPYQs()`, unaffected once `loadCorpus()` is fixed) and `:195-273` (`getCorpusCensus()`, also unaffected once fixed — both functions call the same `loadCorpus()`).
- `package.json:5` — `"type": "module"`, the reason `__dirname` is unavailable.
- `src/components/Observatory.tsx` — the two `useEffect` fetches (census, pyqs) and the `activeQuestionsList` memo that silently falls back to `RESEARCH_DATA.samplePYQs` when `serverQuestions` is empty. Do not restructure this fallback logic itself beyond making the empty-but-successful case observable (see acceptance criteria) — the fallback's existence is intentional, only its silence on this specific failure mode is the gap.
- `api/server.ts` — the Vercel serverless entrypoint that also mounts `analyticsRouter` (via `server-lib/analytics/routes.ts`). Check whether this bug reproduces under however Vercel builds/runs this file.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on `pyq_explorer.ts:1-102` to confirm current exact line numbers (may have shifted).
2. `replace_file_content` — fix `loadCorpus()`'s path resolution to be ESM-safe. Standard fix: derive `__dirname`'s equivalent once at module scope via `import { fileURLToPath } from 'url'; const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename);` at the top of the file, so the rest of the function can keep referencing `__dirname` unchanged — this is the minimal-diff fix. Alternatively, drop the `__dirname`-based candidates entirely if the `process.cwd()`-based paths are sufficient in every real deployment target (dev, production build, Vercel) — state which approach was chosen and why.
3. Test locally: start the dev server (`npm run dev` or equivalent), hit `/api/analytics/observatory/pyqs?page=1&limit=6` and `/api/analytics/observatory/census` directly, confirm real data (`total` near 7841, `data.length === 6`, `totalItems` near 7841) — not just that the process doesn't crash.
4. `grep_search` for `__dirname` across `server-lib/` and `api/` to confirm no other file has the same eager-evaluation-in-an-array-literal anti-pattern (a plain `__dirname` reference inside a function body that only runs conditionally is fine under CJS/bundled contexts; the specific danger here is an array *literal* that evaluates all entries unconditionally at construction time under a `"type": "module"` package — check for that specific shape, not just any `__dirname` occurrence).
5. Close the secondary observability gap in `Observatory.tsx`: when the `/observatory/pyqs` fetch succeeds but returns `total: 0`/`data: []` while a real search/filter wasn't the cause (i.e., the default unfiltered load), surface this distinctly from "0 results because of your filters" — e.g. a `console.warn` naming the corpus-empty condition specifically (not just relying on the existing generic catch-block warn, which never fires for a `success:true` empty response), so this exact failure mode is diagnosable from browser console next time without needing server log access.
6. Run `npm run build` afterward and re-verify `dist/`'s behavior didn't regress (it worked before this fix; confirm it still does).
7. `run_command` — `npm run lint:web`, `npm run lint:api`, `npm run test`, `npm run build`.

# 4. Deterministic Acceptance Criteria
1. `server-lib/analytics/pyq_explorer.ts`'s `loadCorpus()` does not reference `__dirname` directly in ESM mode without safety guards.
2. `loadCorpus()` successfully finds and parses `master_7841_pyqs.json` in local ESM dev mode.
3. `queryMasterPYQs({})` returns `{ success: true, total: 7841, ... }` with 7,841 real items available for pagination.
4. `getCorpusCensus()` returns authentic census data matching the 7,841-item corpus.
5. `src/components/Observatory.tsx` logs a clear warning if an unfiltered query ever returns 0 items, preventing silent regression.
6. A repo-wide grep across `server-lib/` and `api/` confirms no other `__dirname` crash sites exist.
7. `npm run lint:web`, `npm run lint:api`, `npm test`, `npm run build` all exit 0.
8. Receipt explicitly states whether Vercel's `api/server.ts` path was checked/reasoned about for the same crash, and what was concluded — do not leave this unaddressed.
9. Standing hard boundary: status no higher than `AWAITING_VERIFICATION`; never move to `completed/`; never touch `01_CONTROL/` or `03_MEMORY/`; do not modify `server-lib/analytics/data/master_7841_pyqs.json`.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - replace_file_content
    - grep_search
    - run_command
  duration_ms: 35000
  exit_codes:
    node_eval_test: 0
    npm_run_lint_web: 0
    npm_run_lint_api: 0
    npm_run_test: 0
    npm_run_build: 0
fix_approach: "Encapsulated candidate paths in getCandidatePaths() using process.cwd() candidates unconditionally, guarding typeof __dirname !== 'undefined' safely without module-level import.meta or top-level ReferenceErrors."
real_total_returned: 7841
vercel_api_server_checked: true
vercel_api_server_conclusion: "api/server.ts mounts analyticsRouter which delegates to pyq_explorer.ts. By safely resolving via process.cwd() and guarded dirname, Vercel serverless execution locates the corpus file from the repo root or dist without ReferenceErrors."
other_dirname_anti_pattern_matches: []
diff: |
  diff --git a/server-lib/analytics/pyq_explorer.ts b/server-lib/analytics/pyq_explorer.ts
  --- a/server-lib/analytics/pyq_explorer.ts
  +++ b/server-lib/analytics/pyq_explorer.ts
  @@ -76,14 +76,22 @@ export interface PYQQueryResult {
   let cachedCorpus: PYQItem[] | null = null;
   
  +function getCandidatePaths(): string[] {
  +  const candidates = [
  +    path.join(process.cwd(), 'server-lib', 'analytics', 'data', 'master_7841_pyqs.json'),
  +    path.join(process.cwd(), 'dist', 'master_7841_pyqs.json'),
  +  ];
  +
  +  if (typeof __dirname !== 'undefined') {
  +    candidates.push(
  +      path.join(__dirname, 'data', 'master_7841_pyqs.json'),
  +      path.join(__dirname, '..', 'analytics', 'data', 'master_7841_pyqs.json')
  +    );
  +  }
  +
  +  return candidates;
  +}
  +
   function loadCorpus(): PYQItem[] {
     if (cachedCorpus) return cachedCorpus;
   
     try {
  -    const possiblePaths = [
  -      path.join(process.cwd(), 'server-lib', 'analytics', 'data', 'master_7841_pyqs.json'),
  -      path.join(process.cwd(), 'dist', 'master_7841_pyqs.json'),
  -      path.join(__dirname, 'data', 'master_7841_pyqs.json'),
  -      path.join(__dirname, '..', 'analytics', 'data', 'master_7841_pyqs.json'),
  -    ];
  +    const possiblePaths = getCandidatePaths();
   
       for (const p of possiblePaths) {
  diff --git a/src/components/Observatory.tsx b/src/components/Observatory.tsx
  --- a/src/components/Observatory.tsx
  +++ b/src/components/Observatory.tsx
  @@ -194,2 +194,5 @@ export const Observatory: React.FC = () => {
             if (!isCancelled && json.success) {
  +            if ((!json.data || json.data.length === 0) && !pyqSearchTerm && selectedPyqSubject === 'ALL' && selectedEra === 'ALL' && selectedCognitiveType === 'ALL') {
  +              console.warn('[Observatory] Live question index returned 0 items on unfiltered query — master PYQ corpus may be uninitialized or failed to load on server.');
  +            }
               setServerQuestions(json.data || []);
```
