---
task_id: "TASK_076_EXAM_SESSION_HARDENING"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 7000
  output_diff_max: 5000
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_066_EXAM_SESSION_HOOK", "TASK_071_EXAM_HALL_COMPOSITION"]
queue_gate: "SOFT — fast-follow from the Orchestrator's verification of TASK_066/071. Order-independent with TASK_074: the two touch disjoint files (074 edits ArenaLobby/Arena/App; this contract edits the exam hook, ExamHall, ResumePrompt and localStorage). Re-anchor every line number with view_file; the anchors below are from the 2026-09-24 tree."
blueprint: "strategy/design/exam-hall-blueprint.md §6.2 (timing), §7, §13"
---

# 0. Batch rules
Same as TASK_059 §0. The drill flow (`src/components/arena/*`) is out of scope.

# 1. High-Density Distilled Objective
Close the defects the Orchestrator found and confirmed in `useExamSession.ts` and `ExamHall.tsx`. They matter because they can mis-time a paper, lose the last answers, double-submit, or show the wrong answering rules.

**The blocker.** Resuming uses a server time captured when the resume prompt loaded, so the clock gains however long the candidate waits on that prompt. After about 90 s, the final sheet arrives past the server's grace window and is graded from the last checkpoint instead. This defect came from TASK_066's own rule 4; the fix below supersedes that rule.

# 2. Transcluded Context References
- `src/components/exam/useExamSession.ts`:
  - `:173-231` `doSubmit` (its `finalSheet` is built from a synthetic state with `awayOpenAt: null`, so `AWAY_END` is a no-op)
  - `:233-272` `beginSitting` (`const offset = serverOffsetMs(att.serverNow, Date.now());`)
  - `:322-346` `startPaper`
  - `:348-373` `resumePaper` / `handInSavedPaper`
  - `:405-425` `handIn` / `retry`
  - `:523-532` pens-down timeout
  - `:600-641` visibility listener
  - `:643-662` unmount effect
- `src/components/exam/lib/localStorage.ts:33-51` `loadLocalSheet`. It only checks `v === 1` and that `bubbles` is an object, so a sheet missing `struck` crashes the reducer.
- `src/components/exam/ExamHall.tsx` lines 373, 629, 651, 666 and 690 pass `session.prefs.rules` (the saved preference) where the **attempt's** rules are required. Lines 103-105 hold the `handInOpen`/`shortcutsOpen`/`sheetOpen` dialog state.
- `src/components/exam/ResumePrompt.tsx` (its props interface).
- `src/components/exam/lib/sheetReducer.ts` (`sheetReducer`, `emptyResponseSheet`) and `lib/clock.ts` (`serverOffsetMs`).

# 2.5 Scope fence
Modify: `src/components/exam/useExamSession.ts`, `src/components/exam/lib/localStorage.ts`, `src/components/exam/ExamHall.tsx`, `src/components/exam/ResumePrompt.tsx`, `package.json` (append one test file to `test:exam`).
Create: `src/components/exam/lib/sessionHelpers.ts`, `scripts/exam-tests/sessionHelpers.test.ts`.

# 3. Required changes (all of them)
**F1 — Resume clock (BLOCKER).**
- Change `beginSitting(att, existingSheet)` to `beginSitting(att, existingSheet, receivedAtMs: number)`. Compute `offset = serverOffsetMs(att.serverNow, receivedAtMs)`, where `receivedAtMs` is `Date.now()` taken immediately after the network response that carried `att` resolved.
- `startPaper`: `const res = await examApi.start(...); const receivedAt = Date.now(); beginSitting(res, null, receivedAt);`.
- `resumePaper()` must **re-fetch** `examApi.active()`, capture `receivedAt = Date.now()` right after it resolves, and then:
  - `active` → choose the sheet (F8) and call `beginSitting(active, chosen, receivedAt)`;
  - `finalized` → `submitResponse = finalized`, `collectedWhileAway = true`, `clearLocalSheet(id)`, `phase 'scorecard'`;
  - both null → `phase 'admit'`;
  - network error → stay in `'resume'` and set error "We couldn't reach the exam hall. Check your connection and try again."
- `ResumePrompt` gains an optional `error?: string | null` prop, rendered as `role="alert"` text above its buttons. ExamHall passes `session.error`.

**F2 — Open away span closed on submit.**
- When submitting the live paper, build `finalSheet = sheetReducer(sheetStateRef.current, { type: 'AWAY_END', t: elapsed, now }).sheet`, using the real current state (which carries `awayOpenAt`).
- For `handInSavedPaper` (no live state), submit the chosen sheet unchanged.

**F3 — Retry resubmits what failed.**
- At the start of every submit attempt, store `pendingSubmitRef.current = { attempt, sheet, mode }`.
- `retry()` in `'submit-error'` resubmits exactly `pendingSubmitRef.current`. Retry must not depend on `attemptRef` or `sheetStateRef`. This fixes "Try again" after a failed hand-in from the resume screen.

**F4 — Single-flight submit.**
- Add `submitInFlightRef` and `submittedRef`. `doSubmit` returns immediately when either is true.
- Set in-flight at start. On success: `submittedRef = true`, then clear in-flight. On failure: clear in-flight only, so retry works.
- `handIn()` proceeds only when `phaseRef.current === 'sitting'`. The pens-down timeout path proceeds only when `phaseRef.current === 'pens-down'`.
- In `ExamHall`, add an effect: whenever `session.phase !== 'sitting'`, set `handInOpen`, `shortcutsOpen` and `sheetOpen` to `false`. The hand-in `Modal` must never sit over `PensDown`.

**F5 — Answering rules come from the attempt.**
- In `ExamHall`, define `const rules: RulesPreset = session.attempt?.paper.rules ?? session.prefs.rules;`.
- Use `rules` everywhere `session.prefs.rules` is passed to `Booklet`, `OmrSheet` (panel and sheet), `ExamBar` and `useExamKeyboard`. `AdmitCard` keeps receiving `prefs` for its initial choice.
- After the edit, `session.prefs.rules` may appear only in the `rules` definition line.

**F6 — Parent is always told the sitting ended.**
- Add `sittingNotifiedRef`. Set it `true` when calling `onSittingChange(true)`.
- Every place that ends the sitting (submit success, unmount in any phase) calls `onSittingChange(false)` once and sets it `false`.
- Add `mountedRef`. A `start`/`active` response that resolves after unmount must not call `beginSitting`.

**F7 — Unmount during pens-down still saves.** The unmount effect sends the dirty keepalive checkpoint when the phase is `'sitting'` **or** `'pens-down'`. The server accepts checkpoints until deadline + 30 s, so it can finalize from that checkpoint later.

**F8 — Newer local answers get checkpointed.**
- Move the choice into a pure helper `chooseResumeSheet(local, server)` in `lib/sessionHelpers.ts`. It returns the one with the larger `clientUpdatedAt`; ties go to `server`; a `null` side loses.
- `lastCheckpointedRef` after resume = `server?.clientUpdatedAt ?? 0` (not the chosen sheet's). A newer local sheet is then treated as dirty and sent on the next 30 s tick.

**F9 — Local flush, and keepalive within browser limits.**
- On `visibilitychange` → hidden and on unmount: clear the autosave debounce and call `saveLocalSheet(...)` immediately.
- Keepalive checkpoints are sent only when `keepaliveBodyFits(attemptId, sheet)` is true: the pure helper in `lib/sessionHelpers.ts` returns `JSON.stringify({ attemptId, sheet }).length <= 60000`, since browsers cap keepalive bodies at 64 KiB. Oversized bodies are skipped; the 30 s cadence and the local copy cover them.

**F10 — Robust local sheet.**
- Add a pure `normalizeLocalSheet(raw: unknown): ResponseSheet | null` in `lib/sessionHelpers.ts`:
  - `null` unless `raw` is an object with `v === 1`;
  - otherwise return `{ v: 1, rules: raw.rules === 'practice' ? 'practice' : 'exam_day', bubbles, circled, struck, confidence, flagged, events, away, clientUpdatedAt }`;
  - each map defaults to `{}` when not a plain object, each array to `[]` when not an array, and `clientUpdatedAt` to `0` when not a finite number.
- `loadLocalSheet` returns `normalizeLocalSheet(JSON.parse(raw))`.

**F11 — Nits.** Remove the unused `AttemptSummary` and `SubmitMode` imports from `useExamSession.ts`.

# 4. Mandatory Tool Chain & Execution Path
1. `view_file` every anchor in §2.
2. `write_to_file` `lib/sessionHelpers.ts` (`chooseResumeSheet`, `keepaliveBodyFits`, `normalizeLocalSheet`) and `scripts/exam-tests/sessionHelpers.test.ts` per §5.1.
3. `multi_replace_file_content` the four modified files per §3.
4. Append `scripts/exam-tests/sessionHelpers.test.ts` to `test:exam` in `package.json`.
5. `run_command` `npm run test:exam`, `npm run lint`, `npm run build`.

## 5.1 Required tests (`sessionHelpers.test.ts`)
1. `chooseResumeSheet(null, null)` → `null`. `chooseResumeSheet(L(5), null)` → the local sheet. `chooseResumeSheet(null, S(5))` → the server sheet. `chooseResumeSheet(L(9), S(5))` → local. `chooseResumeSheet(L(5), S(9))` → server. A tie `L(7), S(7)` → server. (`L(n)`/`S(n)` are sheets with `clientUpdatedAt n`.)
2. `keepaliveBodyFits('a', smallSheet)` → `true`. A sheet with 2000 events whose `q` is a 39-character id → `false`.
3. `normalizeLocalSheet({ v: 1, bubbles: {} })` → every map `{}`, `events`/`away` `[]`, `rules 'exam_day'`, `clientUpdatedAt 0`. `normalizeLocalSheet({ v: 2 })` → `null`. `normalizeLocalSheet(null)` → `null`. `normalizeLocalSheet({ v: 1, rules: 'practice', struck: 'x', events: {} })` → `rules 'practice'`, `struck {}`, `events []`.

# 6. Deterministic Acceptance Criteria
1. `npm run test:exam` exits 0 with the new tests passing (paste the TAP summary); `npm run lint` and `npm run build` exit 0.
2. `grep_search` `ExamHall.tsx` for `session.prefs.rules` → exactly 1 match (the `rules` definition).
3. `grep_search` `useExamSession.ts`:
   - `examApi.active` → ≥ 2 matches (load and resumePaper)
   - `pendingSubmitRef`, `submitInFlightRef`, `submittedRef`, `sittingNotifiedRef`, `mountedRef` → each ≥ 2
   - `awayOpenAt: null` → 0 matches inside `doSubmit`
   - `serverOffsetMs(att.serverNow, Date.now())` → 0 matches
4. `grep_search` `useExamSession.ts` for `keepaliveBodyFits` → ≥ 2 (both keepalive sites).
5. The receipt lists each of F1–F11 with the exact line numbers of its change.
6. Hard boundary respected.

# 7. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: {}
test_exam_tap_summary: ""
fix_line_map: {}      # "F1": "useExamSession.ts:233-260, 348-372; ResumePrompt.tsx:12,40" …
criterion_2_grep_output: ""
criterion_3_grep_output: ""
files_created: []
files_modified: []
```
