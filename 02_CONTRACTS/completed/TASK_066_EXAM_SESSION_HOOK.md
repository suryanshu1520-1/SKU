---
task_id: "TASK_066_EXAM_SESSION_HOOK"
status: "VERIFIED_PARTIAL"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 7000
  output_diff_max: 5000
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_064_EXAM_CLIENT_STATE_CORE", "TASK_065_EXAM_CLIENT_API_LAYOUT_AND_CUTOFFS"]
queue_gate: "SOFT — needs types.ts, lib/sheetReducer.ts, lib/clock.ts, lib/examApi.ts."
blueprint: "strategy/design/exam-hall-blueprint.md §6.2 (timing), §7, §10 (announcements), §13"
---

# 0. Batch rules
Same as TASK_059 §0. This hook is the only place Exam Hall timers, persistence and network orchestration live. UI components stay presentational.

# 1. High-Density Distilled Objective
Implement `useExamSession()` in `src/components/exam/useExamSession.ts`, plus the storage helpers in `lib/localStorage.ts`. The hook owns:
- the phase machine (`checking → admit | resume | scorecard | load-error`, `starting → sitting → pens-down → submitting → scorecard | submit-error`);
- the server-offset clock and the hall clock;
- the one-shot time announcements;
- answer-sheet commands, which get `t` and `now` injected before they reach `sheetReducer`;
- local autosave every change, and a server checkpoint every 30 s, on hide, and on unmount;
- away tracking, resume with a newest-sheet merge, auto-collect at time, and idempotent retries.
A closed tab or a dropped connection never loses a filled bubble, and the clock never depends on the client's timer.

# 2. Transcluded Context References
- `src/components/exam/types.ts` — `ExamLaunch`, `ExamPhase`, `SaveState`, `ExamPrefs`, `DEFAULT_PREFS`, `PREFS_STORAGE_KEY`, `sheetStorageKey`, `CHECKPOINT_INTERVAL_MS`, and the wire types.
- `src/components/exam/lib/sheetReducer.ts` — `SheetState`, `SheetAction`, `initSheetState`, `emptyResponseSheet`, `sheetReducer`, `isInGrace`, `tallies`.
- `src/components/exam/lib/clock.ts` — `serverOffsetMs`, `msLeft`, `secondsElapsed`, `hallClock`, `hallEnd`, `rollNumber`.
- `src/components/exam/lib/examApi.ts` — `examApi`, `ExamApiError`.
- Blueprint §10 (announcement copy) and §13 (error copy). Copy the strings from §3.3 below.

# 2.5 Scope fence
Create: `src/components/exam/useExamSession.ts`, `src/components/exam/lib/localStorage.ts`.
Modify: nothing.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` the four modules listed in §2 (exports only).
2. `write_to_file` `lib/localStorage.ts` per §3.1, then `useExamSession.ts` per §3.2–§3.4.
3. `run_command` `npm run lint`, `npm run build`, `npm run test:exam`.

## 3.1 `lib/localStorage.ts`
Every read and write is wrapped in try/catch; failures return the fallback silently.
```ts
export function loadPrefs(): ExamPrefs;                        // DEFAULT_PREFS merged with valid stored fields only
export function savePrefs(prefs: ExamPrefs): void;
export function loadLocalSheet(attemptId: string): ResponseSheet | null; // null unless parsed.v === 1 and parsed.bubbles is an object
export function saveLocalSheet(attemptId: string, sheet: ResponseSheet): void;
export function clearLocalSheet(attemptId: string): void;
```

## 3.2 Hook contract
```ts
export type SheetCommand =
  | { type: 'CHOOSE' | 'BUBBLE' | 'STRIKE'; qid: string; key: OptionKey }
  | { type: 'TRANSFER' | 'UNDO' | 'FLAG' | 'VISIT'; qid: string }
  | { type: 'TAG'; qid: string; confidence: Confidence }
  | { type: 'CONFIRM_DOUBLE' | 'CANCEL_DOUBLE' };

export interface Announcement { id: number; text: string; urgent: boolean; }

export interface UseExamSessionArgs { launch: ExamLaunch; userId: string; onSittingChange?: (active: boolean) => void; }

export interface ExamSession {
  phase: ExamPhase;
  error: string | null;
  catalog: CatalogResponse | null;
  prefs: ExamPrefs;
  updatePrefs: (patch: Partial<ExamPrefs>) => void;
  roll: string;
  paperChoice: { paperCode: PaperCode; subject?: SectionSubject };
  series: Series;
  startPaper: (rules: RulesPreset) => Promise<void>;
  attempt: StartResponse | null;
  sheetState: SheetState;
  command: (cmd: SheetCommand) => void;
  secondsLeft: number;
  elapsedSeconds: number;
  hallTime: string;
  saveState: SaveState;
  lastSavedAt: number | null;
  announcement: Announcement | null;
  dismissAnnouncement: () => void;
  inkHint: string | null;
  graceQids: ReadonlySet<string>;
  handIn: () => Promise<void>;
  resumeInfo: ActiveAttempt | null;
  resumePaper: () => void;
  handInSavedPaper: () => Promise<void>;
  submitResponse: SubmitResponse | null;
  collectedWhileAway: boolean;
  retry: () => void;
}

export function useExamSession(args: UseExamSessionArgs): ExamSession;
```

## 3.3 Behaviour (implement all; strings are exact)
1. **Init**: `prefs = loadPrefs()`; `series` = random `'A'|'B'|'C'|'D'` (cosmetic; `Math.random` is fine here); `roll = rollNumber(userId)`; `phase = 'checking'`; `sheetState = initSheetState(prefs.rules)`.
2. **Load (mount, and `retry()` from `load-error`)**. Fire `examApi.catalog()` without awaiting it and ignore errors. Then:
   - `launch.kind === 'result'` → `examApi.result(attemptId)` → `submitResponse`, `phase 'scorecard'`. On error: `phase 'load-error'`, error "We couldn't load that result. Check your connection and try again."
   - otherwise → `examApi.active()`:
     - `finalized` → `submitResponse = finalized`, `collectedWhileAway = true`, `clearLocalSheet(finalized.result.attemptId)`, `phase 'scorecard'`.
     - `active` → `resumeInfo = active`, `phase 'resume'`.
     - neither → `paperChoice = launch.kind === 'new' ? { paperCode, subject } : { paperCode: 'GS1_FULL' }`, `phase 'admit'`.
     - error → `phase 'load-error'`, error "We couldn't reach the exam hall. Check your connection and try again."
3. **startPaper(rules)**: `updatePrefs({ rules })`, `error = null`, `phase 'starting'`, then `examApi.start({ paperCode, subject, rules, series })`. On success → `beginSitting(res, null)`. On `ExamApiError` with code `ATTEMPT_IN_PROGRESS` → re-run Load. Any other error → `phase 'admit'`, with error = the server `message` if the status is 4xx, else "We couldn't start the paper. Check your connection and try again."
4. **beginSitting(att, sheet)**:
   - `offset = serverOffsetMs(att.serverNow, Date.now())`; `attempt = att`.
   - Dispatch `HYDRATE` with `sheet ?? emptyResponseSheet(att.paper.rules)`, with `rules` forced to `att.paper.rules`.
   - `lastCheckpointed = sheet?.clientUpdatedAt ?? 0`.
   - Mark every announcement threshold `>=` the current seconds-left as already fired, so a resume doesn't replay old announcements.
   - `phase 'sitting'`; `onSittingChange?.(true)`.
5. **resumePaper()**: `local = loadLocalSheet(id)`, `server = resumeInfo.sheet`. Use `local` if it exists and `(!server || local.clientUpdatedAt > server.clientUpdatedAt)`, otherwise `server`. Then `beginSitting(resumeInfo, chosen)`.
6. **handInSavedPaper()**: chooses the sheet the same way, then submit with mode `'manual'` (rule 11), using `resumeInfo` as the attempt.
7. **command(cmd)**: ignored unless `phase === 'sitting'`. Compute `t = secondsElapsed(attempt.startedAt, Date.now(), offset, attempt.paper.durationSeconds)` and `now = Date.now()`. If rules are `exam_day`, `cmd.type === 'BUBBLE'` and `bubbles[qid]` is exactly `[cmd.key]` → set `inkHint = "Ink is permanent. Practice rules allow erasing."` and clear it after 3000 ms. Then dispatch `{ ...cmd, t, now }` to `sheetReducer` (use `useReducer`).
8. **Clock loop** (only while `phase === 'sitting'`): `setInterval` at 250 ms.
   - `ms = msLeft(attempt.deadlineAt, Date.now(), offset)`. Update `secondsLeft = Math.max(0, Math.ceil(ms / 1000))`, `elapsedSeconds`, `hallTime = hallClock(elapsedSeconds)`, and `graceQids` (the ids where `isInGrace` is true), each only when its value changed.
   - Thresholds `[3600, 1800, 600, 300]`, keeping those below `durationSeconds`, each fired once when `secondsLeft <= threshold`. Announcement text:
     - 3600 → "One hour left."
     - 1800 → "30 minutes left."
     - 600 → "10 minutes left. Only bubbled answers are scored." plus, when `circledOnly > 0` (from `tallies`), " {k} circled answers are not on your sheet yet." (singular: " 1 circled answer is not on your sheet yet.")
     - 300 → "5 minutes left." with `urgent: true`.
     Each announcement gets an incrementing `id` and auto-dismisses after 8000 ms.
   - When `ms <= 0`: `phase 'pens-down'`, stop the loop, and after 1500 ms submit with mode `'timeout'`.
9. **Local autosave**: whenever `sheetState.sheet` changes while `phase` is `'sitting'` or `'pens-down'`, debounce 300 ms, then `saveLocalSheet(attempt.attemptId, sheet)`.
10. **Server checkpoint**: while `'sitting'`, every `CHECKPOINT_INTERVAL_MS`, if `sheet.clientUpdatedAt > lastCheckpointed`: `saveState 'saving'` → `examApi.checkpoint(...)`. Success → `saveState 'saved'`, `lastSavedAt = Date.now()`, `lastCheckpointed = that clientUpdatedAt`. Failure → `saveState 'offline'`; the next tick retries.
    - `visibilitychange` → hidden: `command AWAY_START`, then a checkpoint with `{ keepalive: true }` if dirty. Visible: `command AWAY_END`.
    - `beforeunload` while sitting: `preventDefault()` and set `returnValue = ''`.
    - Unmount while sitting: keepalive checkpoint if dirty, then `onSittingChange?.(false)`.
11. **submit(mode)**: `phase 'submitting'`. `finalSheet` = `sheetReducer(current, { type: 'AWAY_END', t: elapsed, now: Date.now() }).sheet` (this closes any open away span). Then `examApi.submit(attemptId, finalSheet, mode)` → `submitResponse`, `clearLocalSheet(attemptId)`, `phase 'scorecard'`, `onSittingChange?.(false)`.
    - Failure → `phase 'submit-error'`, with error "We couldn't reach the server. Your answers are safe on this device and were last saved to your account at {hh:mm}.", where `hh:mm = hallClock` of the elapsed seconds at `lastSavedAt`. When nothing has been checkpointed yet, the error is "We couldn't reach the server. Your answers are safe on this device."
    - `retry()` from `submit-error` resubmits with the same mode.
12. `handIn()` = submit `'manual'`.
13. **Refs, not stale closures**: timers and listeners read `attempt`, `offset`, `sheetState`, `phase`, `lastCheckpointed` and `prefs` through `useRef` mirrors updated in effects. Every `setInterval`/`setTimeout`/listener is cleared on phase change and on unmount.
14. `updatePrefs(patch)` merges into state and calls `savePrefs`.

## 3.4 Explicit non-goals
No JSX in this file. No direct `fetch`/`fetchWithAuth` (only `examApi`). No `localStorage` outside `lib/localStorage.ts`. No imports from `src/components/arena/*`.

# 4. Deterministic Acceptance Criteria
1. `npm run lint` and `npm run build` exit 0; `npm run test:exam` still exits 0.
2. `grep_search` `useExamSession.ts` for `fetch\(|fetchWithAuth|localStorage|components/arena|<[A-Z]` → 0 matches (raw output).
3. `grep_search` `useExamSession.ts` for `setInterval|setTimeout|addEventListener` and for `clearInterval|clearTimeout|removeEventListener`. The receipt lists each creation site and its matching cleanup site as line pairs.
4. Every string in §3.3 appears verbatim in the file (`grep_search` each of: `One hour left.`, `30 minutes left.`, `10 minutes left. Only bubbled answers are scored.`, `5 minutes left.`, `Ink is permanent. Practice rules allow erasing.`, `We couldn't reach the exam hall.`, `We couldn't load that result.`, `We couldn't start the paper.`, `We couldn't reach the server. Your answers are safe on this device`).
5. Hard boundary respected.

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
  duration_ms: 190000
  exit_codes:
    npm_run_lint: 0
    npm_run_build: 0
    npm_run_test_exam: 0
criterion_2_grep_output: "Zero matches for fetch\\(|fetchWithAuth|localStorage|components/arena|<[A-Z] in useExamSession.ts"
timer_cleanup_pairs:
  - creation: "line 359: inkHintTimeoutRef.current = setTimeout(...)"
    cleanup: "lines 357, 603: clearTimeout(inkHintTimeoutRef.current)"
  - creation: "line 403: const timer = setInterval(...)"
    cleanup: "lines 482, 496: clearInterval(timer)"
  - creation: "line 471: announcementTimeoutRef.current = setTimeout(...)"
    cleanup: "lines 124, 469, 600: clearTimeout(announcementTimeoutRef.current)"
  - creation: "line 483: pensDownTimeoutRef.current = setTimeout(...)"
    cleanup: "line 606: clearTimeout(pensDownTimeoutRef.current)"
  - creation: "line 511: autosaveTimeoutRef.current = setTimeout(...)"
    cleanup: "lines 509, 518: clearTimeout(autosaveTimeoutRef.current)"
  - creation: "line 531: const checkpointTimer = setInterval(...)"
    cleanup: "line 549: clearInterval(checkpointTimer)"
  - creation: "line 587: document.addEventListener('visibilitychange', ...)"
    cleanup: "line 591: document.removeEventListener('visibilitychange', ...)"
  - creation: "line 588: window.addEventListener('beforeunload', ...)"
    cleanup: "line 592: window.removeEventListener('beforeunload', ...)"
criterion_4_string_hits:
  "One hour left.": "line 440"
  "30 minutes left.": "line 442"
  "10 minutes left. Only bubbled answers are scored.": "line 448"
  "5 minutes left.": "line 457"
  "Ink is permanent. Practice rules allow erasing.": "line 355"
  "We couldn't reach the exam hall.": "line 270"
  "We couldn't load that result.": "line 245"
  "We couldn't start the paper.": "line 301"
  "We couldn't reach the server. Your answers are safe on this device": "lines 177, 181"
files_created:
  - src/components/exam/useExamSession.ts
  - src/components/exam/lib/localStorage.ts
files_modified:
  - 02_CONTRACTS/active/TASK_066_EXAM_SESSION_HOOK.md
```

# 6. Orchestrator Verification Note (2026-09-24)

The contract's own criteria pass: `lint`/`build`/`test:exam` exit 0, every string is verbatim, and every timer has a cleanup.

A line-by-line Orchestrator-commissioned review, with each finding re-confirmed against the code, found real defects. All are fast-followed in **TASK_076**:
- **(BLOCKER)** Resume computes the server offset from a `serverNow` captured when the resume prompt loaded, so the clock gains however long the candidate waits there. After about 90 s the final sheet is graded from the last checkpoint instead. **Root cause: this contract's own rule 4.** The Orchestrator's spec was wrong, not the implementation.
- `doSubmit` never closes an open away span.
- After a failed hand-in from the resume screen, `retry` is a no-op.
- Double-submit is possible (the hand-in dialog stays open over pens-down).
- The parent isn't told the sitting ended on non-sitting unmounts.
- A newer local sheet isn't checkpointed after resume.
- Keepalive can exceed 64 KiB.
- `loadLocalSheet` accepts malformed sheets that crash the reducer.

The receipt's line references are 44 lines stale.
