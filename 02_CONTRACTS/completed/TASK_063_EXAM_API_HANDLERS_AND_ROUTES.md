---
task_id: "TASK_063_EXAM_API_HANDLERS_AND_ROUTES"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 6000
  output_diff_max: 4500
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_060_EXAM_GRADING_ENGINE", "TASK_061_EXAM_PAPER_ASSEMBLY_AND_SANITIZER", "TASK_062_MOCK_ATTEMPTS_MIGRATION_AND_DB"]
queue_gate: "SOFT — needs grading.ts, papers.ts, assemble.ts, sanitize.ts, pool.ts, db.ts. The mock_attempts table does NOT exist in any database yet; that is expected. Verify with the DB-free checks in §4 only."
blueprint: "strategy/design/exam-hall-blueprint.md §5, §6.2"
---

# 0. Batch rules
Same as TASK_059 §0. The `/api/submit-quiz` drill grader and every existing route stay byte-identical, apart from the two `express.json` lines named in §3.4.

# 1. High-Density Distilled Objective
Expose the Exam Hall over seven JSON endpoints in `server-lib/exam/handlers.ts`, wired into **both** servers: `api/server.ts` (Vercel) and root `server.ts` (local dev). Four integrity rules are non-negotiable:
1. The client never receives a key, explanation, year or subject before submission.
2. Grading uses only the attempt's stored `question_ids` and the server pool.
3. The deadline is server time. Late sheets fall back to the last checkpoint.
4. Submit is idempotent.
Also add a `PORT` override to root `server.ts`, so a verifier can run a second dev server beside one that is already on port 3000.

# 2. Transcluded Context References
- `server-lib/exam/{types,pool,papers,assemble,sanitize,grading,db}.ts` — everything here composes these. Read their exports; do not duplicate logic.
- `api/server.ts:1-47` — Express app for Vercel; `app.use(express.json())` at line 21; route list lines 24-42.
- `server.ts:112-120` (hard-coded `const PORT = 3000;` and `app.use(express.json())`), `server.ts:150-162` (route registrations), and `server.ts:244-256` (Vite middleware and the production `app.get('*')` catch-all). New routes must be registered **before** the Vite/static block.
- Blueprint §6.2 (endpoint table and timing rules).

# 2.5 Scope fence
Create: `server-lib/exam/handlers.ts`.
Modify: `api/server.ts` (one import block, seven route lines, the `express.json` limit), `server.ts` (the same, plus the PORT line).

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` all seven `server-lib/exam/*.ts` modules (exports only) and the three server slices above.
2. `write_to_file` `server-lib/exam/handlers.ts` per §3.1–§3.3.
3. `multi_replace_file_content` on `api/server.ts` and `server.ts` per §3.4.
4. `run_command` `npm run lint`, `npm run test`, `npm run build`.
5. Start an isolated dev server: `$env:PORT='3107'; $env:EXAM_DEV_DURATION_SECONDS='120'; npm run dev` (background, `IsDaemon`). Run the curl checks in §4.5–§4.7, then stop that server. Never stop a server you did not start.

## 3.1 Shared helpers (inside handlers.ts)
- `GRACE_CHECKPOINT_MS = 30_000`, `GRACE_SUBMIT_MS = 90_000`.
- `sendError(res, status, code, message)` → `res.status(status).json({ error: code, message })`.
- `requireUserId(req, res)`: read `Authorization: Bearer <token>`. If missing, or `getUserIdFromToken` returns null → `401 UNAUTHORIZED "Sign in to use the exam hall."` and return `null`.
- `resolveDuration(spec)`: if `process.env.EXAM_DEV_DURATION_SECONDS` parses to an integer `n` with `30 <= n <= spec.durationSeconds`, **and** `process.env.NODE_ENV !== 'production'`, **and** `!process.env.VERCEL`, return `n`. Otherwise return `spec.durationSeconds`.
- `paperItemsFor(row)`: `row.question_ids.map((id, i) => { const item = getPoolItem(id); if (!item) throw new Error('POOL_MISMATCH ' + id); return toPaperItem(item, i + 1); })`.
- `compositionFor(row)`: count of `getPoolItem(id).subject` over `question_ids`.
- `buildStartResponse(row): StartResponse` — `paper = { ...PAPER_SPECS[row.paper_code], durationSeconds: row.duration_seconds, series, rules, subject, composition, items }`; `startedAt`, `deadlineAt` from the row; `serverNow = new Date().toISOString()`.
- `buildSubmitResponse(result): SubmitResponse` — for every `result.items` entry: `explanations[qid] = getPoolItem(qid)?.explanation ?? ''`, and `paper` = `toPaperItem(getPoolItem(qid)!, item.n)` in `result.items` order (skip a qid missing from the pool rather than throwing, because a stored result must stay viewable).
- `toAttemptRows(result, userId)` → `QuestionAttemptRow[]`: `session_id = result.attemptId`, `question_id = qid`, `selected_option = bubbled.length ? bubbled.join(',') : null`, `is_correct = verdict === 'correct' ? true : verdict === 'blank' ? null : false`, `time_spent_seconds = Math.min(32767, dwellSeconds)`, `subject_category = subject`.
- `finalize(row, sheet, submitMode, submittedAtMs)`: `items = row.question_ids.map(getPoolItem)` (a missing item throws `POOL_MISMATCH`). Then `result = gradeSheet(items, sheet, { attemptId: row.id, paperCode: row.paper_code, rules: row.rules, durationSeconds: row.duration_seconds, startedAtMs: Date.parse(row.started_at), submittedAtMs, submitMode })` and `updated = markSubmitted(...)`. If `updated` is null, re-read with `getAttempt`; if that row is submitted with a result, return `buildSubmitResponse(existing.result)`. Otherwise call `insertQuestionAttemptsBestEffort(toAttemptRows(result, row.user_id))` and return `buildSubmitResponse(result)`.
- `finalizeIfExpired(row)`: if `row.status === 'in_progress'` and `Date.now() > Date.parse(row.deadline_at) + GRACE_SUBMIT_MS`, then `finalize(row, sanitizeSheet(row.sheet, row.question_ids, row.rules, row.duration_seconds), 'recovered', Date.parse(row.deadline_at))`. Otherwise return `null`.

## 3.2 Handlers (export each; wrap every body in try/catch → `500 INTERNAL "Something went wrong on our side. Your answers are saved."` plus `console.error('[exam]', err)`)
1. `examCatalogHandler` (GET, **no auth**): `CatalogResponse` with `papers = PAPER_CODES.map(c => PAPER_SPECS[c])`. `sectionSubjects = offeredSectionSubjects(counts).map(s => ({ subject: s, available: s === 'Mixed' ? getPool().length : counts[s] }))`. `blueprints = BLUEPRINTS`, `poolSize = getPool().length`, `yearsCovered = '2011–2023 (2020 excluded)'`. Header `Cache-Control: public, max-age=300`.
2. `examStartHandler` (POST, auth). Validate the body:
   - `paperCode ∈ PAPER_CODES`, `rules ∈ {'exam_day','practice'}`, `series ∈ A–D`.
   - `subject` is allowed only for `GS1_SECTION`, and must be `'Mixed'` or an offered subject.
   - Otherwise → `400 INVALID_REQUEST` with a specific message.
   Then:
   - `existing = findInProgressAttempt(userId)`. If present: `finalizeIfExpired(existing)`; if that returned null, the paper is still running → `409 ATTEMPT_IN_PROGRESS "You have a paper in progress."` with `attemptId: existing.id` in the JSON.
   - `seen = getSeenQuestionIds(userId)`; `seed = crypto.randomBytes(4).readUInt32BE(0)` (`import crypto from 'crypto'`).
   - `items = assemblePaper(getPool(), { paperCode, subject, seenIds: seen, seed })`. `PaperUnavailableError` → `422 PAPER_UNAVAILABLE` with its message.
   - `duration = resolveDuration(PAPER_SPECS[paperCode])`; `startedAt = new Date()`; `deadline = startedAt + duration * 1000`.
   - `row = insertAttempt({ ..., subject: paperCode === 'GS1_SECTION' ? (subject ?? 'Mixed') : null, question_ids: items.map(i => i.id) })`. `AttemptInProgressError` → 409 as above.
   - Respond `200 buildStartResponse(row)`.
3. `examActiveHandler` (GET, auth): no in-progress row → `{ active: null, finalized: null }`. Expired (`finalizeIfExpired` returns a response) → `{ active: null, finalized }`. Otherwise `{ active: { ...buildStartResponse(row), sheet, checkpointAt: row.checkpoint_at }, finalized: null }`, where `sheet` is `sanitizeSheet(row.sheet, …)`, or `null` when the sanitised sheet has no bubbles, circles, struck, confidence, flags or events.
4. `examCheckpointHandler` (POST, auth, body `{ attemptId, sheet }`):
   - `row = getAttempt(attemptId, userId)`; missing → `404 NOT_FOUND`.
   - Not `in_progress` → `409 ATTEMPT_CLOSED`. `Date.now() > deadline + GRACE_CHECKPOINT_MS` → `409 DEADLINE_PASSED`.
   - `saveCheckpoint(row.id, userId, sanitizeSheet(sheet, row.question_ids, row.rules, row.duration_seconds), now.toISOString())`. A `false` return → `409 ATTEMPT_CLOSED`.
   - Respond `{ ok: true, savedAt }`.
5. `examSubmitHandler` (POST, auth, body `{ attemptId, sheet, mode }`):
   - Missing row → 404. `status === 'submitted'` and `result` present → `200 buildSubmitResponse(row.result)` (idempotent).
   - If `Date.now() <= deadline + GRACE_SUBMIT_MS`: `finalize(row, sanitizeSheet(body.sheet, …), mode === 'timeout' ? 'timeout' : 'manual', Math.min(Date.now(), deadlineMs))`.
   - Otherwise `finalize(row, sanitizeSheet(row.sheet, …), 'recovered', deadlineMs)`.
6. `examAttemptsHandler` (GET, auth): first `finalizeIfExpired` on any in-progress row. Then `listSubmittedAttempts(userId, 10)` → `{ attempts: AttemptSummary[] }`, mapped from `row.result` (skip rows without a result): `{ attemptId, paperCode, subject, submittedAt, submitMode, questionCount, correct, wrong: result.wrong + result.invalid, blank, netHundredths, maxHundredths }`.
7. `examResultHandler` (GET, auth, query `attemptId`): missing → 404; not submitted → `409 NOT_SUBMITTED`; else `200 buildSubmitResponse(row.result)`.

## 3.3 Leak guard
Every response that carries paper items builds them with `toPaperItem`. A literal `key:`, `explanation`, `year` or `subject` property must never be added to an item object in handlers.ts. The only places explanations and keys reach a client are `buildSubmitResponse` (post-submit) and `result.items`.

## 3.4 Server wiring (both files)
```ts
import {
  examCatalogHandler, examStartHandler, examActiveHandler, examCheckpointHandler,
  examSubmitHandler, examAttemptsHandler, examResultHandler,
} from "<relative>/server-lib/exam/handlers.js";   // "../server-lib/..." in api/server.ts, "./server-lib/..." in server.ts

app.get("/api/exam/catalog", examCatalogHandler);
app.post("/api/exam/start", examStartHandler);
app.get("/api/exam/active", examActiveHandler);
app.post("/api/exam/checkpoint", examCheckpointHandler);
app.post("/api/exam/submit", examSubmitHandler);
app.get("/api/exam/attempts", examAttemptsHandler);
app.get("/api/exam/result", examResultHandler);
```
- In both files change `app.use(express.json());` to `app.use(express.json({ limit: '512kb' }));` (a full sheet with events can pass the 100 kb default).
- In `server.ts` change `const PORT = 3000;` to `const PORT = Number(process.env.PORT) || 3000;`.
- In `server.ts` register the seven routes right after `app.get("/api/questions", questionsHandler);` (currently line 162), so they sit before the Vite/static block.

# 4. Deterministic Acceptance Criteria
1. `npm run lint`, `npm run test` and `npm run build` exit 0.
2. `grep_search` `server-lib/exam/handlers.ts` for `select\('\*'\)|correct_option|\.\.\.item\b|\.\.\.poolItem` → 0 matches (raw output).
3. `grep_search` `api/server.ts` and `server.ts` for `/api/exam/` → exactly 7 matches in each file (raw output).
4. `git diff --stat -- api/server.ts server.ts` shows only those two files changed within the Scope fence, and `git diff -- server-lib/submit-quiz.ts` is empty.
5. With the isolated dev server on port 3107: `curl.exe -s http://localhost:3107/api/exam/catalog` returns JSON with `"poolSize":647`, papers `GS1_FULL/GS1_HALF/GS1_SECTION` at 100/50/25 questions and 7200/3600/1800 seconds, and `sectionSubjects` subjects exactly `["Mixed","Economy","Environment","Geography","History"]`. Paste the raw response.
6. `curl.exe -s -X POST http://localhost:3107/api/exam/start -H "Content-Type: application/json" -d "{}"` → HTTP 401 with `"error":"UNAUTHORIZED"`. Paste the response with `-w " %{http_code}"`.
7. `curl.exe -s http://localhost:3107/api/exam/result?attemptId=x -w " %{http_code}"` → 401.
8. The server you started is stopped at the end, and no other process was killed.
9. Hard boundary respected; no database tool used.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - write_to_file
    - replace_file_content
    - multi_replace_file_content
    - run_command
    - manage_task
    - grep_search
  duration_ms: 180000
  exit_codes:
    npm_run_lint: 0
    npm_run_test: 0
    npm_run_build: 0
    curl_catalog: 0
    curl_start: 0
    curl_result: 0
criterion_2_grep_output: "Zero matches for select('*'), correct_option, ...item\\b, and ...poolItem in server-lib/exam/handlers.ts"
criterion_3_grep_output: |
  api/server.ts: 7 matches (lines 53-59)
  server.ts: 7 matches (lines 173-179)
criterion_4_diffstat: |
   api/server.ts | 19 ++++++++++++++++++-
   server.ts     | 21 +++++++++++++++++++--
   2 files changed, 37 insertions(+), 3 deletions(-)
curl_catalog: |
  {"papers":[{"code":"GS1_FULL","title":"General Studies Paper I · Full paper","questionCount":100,"durationSeconds":7200},{"code":"GS1_HALF","title":"General Studies Paper I · Half paper","questionCount":50,"durationSeconds":3600},{"code":"GS1_SECTION","title":"General Studies Paper I · Sectional","questionCount":25,"durationSeconds":1800}],"sectionSubjects":[{"subject":"Mixed","available":647},{"subject":"Economy","available":251},{"subject":"Environment","available":156},{"subject":"Geography","available":133},{"subject":"History","available":90}],"blueprints":{"GS1_FULL":{"Economy":34,"Environment":24,"Geography":21,"History":15,"Polity":5,"General Studies":1},"GS1_HALF":{"Economy":17,"Environment":12,"Geography":10,"History":8,"Polity":2,"General Studies":1},"GS1_SECTION":{"Economy":9,"Environment":6,"Geography":5,"History":4,"Polity":1,"General Studies":0}},"poolSize":647,"yearsCovered":"2011–2023 (2020 excluded)"}
curl_start_unauth: '{"error":"UNAUTHORIZED","message":"Sign in to use the exam hall."} 401'
curl_result_unauth: '{"error":"UNAUTHORIZED","message":"Sign in to use the exam hall."} 401'
files_created:
  - server-lib/exam/handlers.ts
files_modified:
  - api/server.ts
  - server.ts
  - 02_CONTRACTS/active/TASK_063_EXAM_API_HANDLERS_AND_ROUTES.md
```

# 6. Orchestrator Verification Note (2026-09-24)

Line-by-line review of `handlers.ts`:
- every paper item is built with `toPaperItem`; keys and explanations leave the server only in `buildSubmitResponse`;
- grading uses stored `question_ids` only, with a server deadline, 30 s/90 s grace, checkpoint fallback, and idempotent submit (including a concurrent-submit race);
- the dev duration override is guarded by `NODE_ENV` and `VERCEL`.

The wiring diff in `api/server.ts` and `server.ts` is exactly 7 routes plus the 512 kb JSON limit, plus the `PORT` override in `server.ts`. `submit-quiz.ts` is untouched.

Live checks against the running dev server:
- `/api/exam/catalog` → poolSize 647, the three paper specs, and sectionSubjects exactly [Mixed, Economy, Environment, Geography, History] with counts 647/251/156/133/90;
- start, active, result, checkpoint, submit and attempts without auth → 401 UNAUTHORIZED.

Latent risk logged, not a defect: if the pool is ever rebuilt with different ids, an in-progress attempt referencing a removed id makes `active` return 500 (POOL_MISMATCH) and blocks new starts. Coordinate with the qbank restoration workstream before any pool change (pin pool versions per attempt).
