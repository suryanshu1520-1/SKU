---
task_id: "TASK_064_EXAM_CLIENT_STATE_CORE"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 6000
  output_diff_max: 4500
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_059_EXAM_POOL_BUILD"]
queue_gate: "SOFT — needs server-lib/exam/types.ts. Independent of TASK_060-063 otherwise."
blueprint: "strategy/design/exam-hall-blueprint.md §3, §7, §10, §12"
---

# 0. Batch rules
Same as TASK_059 §0. Client files under `src/components/exam/` may import **types only** from `server-lib`, and only in `src/components/exam/types.ts` (blueprint §5 invariant 4).

# 1. High-Density Distilled Objective
Build the client's pure core for the Exam Hall:
1. `types.ts` — type re-exports from the server plus client constants.
2. `lib/sheetReducer.ts` — every answer-sheet mutation: circles, bubbles with the 5-second "lift the pen" grace, double-mark confirmation, strikes, confidence, flags, visits, away spans, and the event cap.
3. `lib/clock.ts` — the server-offset clock, time-left and hall-clock formatting, marks formatting, and the roll number.
All three are pure and proven by the exact tests in §3.4. The session hook (TASK_066) and every UI contract build on them.

# 2. Transcluded Context References
- `server-lib/exam/types.ts` — the names to re-export (`ResponseSheet`, `SheetEvent`, `OptionKey`, `Confidence`, `RulesPreset`, and so on).
- `server-lib/exam/sanitize.ts` (TASK_061, may not exist yet) — the server applies the same event-cap rule; mirror §3.2 rule 12 exactly.
- Blueprint §7 (rules presets), §10 (clock formats), §12 (overwrite confirm).

# 2.5 Scope fence
Create: `src/components/exam/types.ts`, `src/components/exam/lib/sheetReducer.ts`, `src/components/exam/lib/clock.ts`, `scripts/exam-tests/sheetReducer.test.ts`, `scripts/exam-tests/clock.test.ts`.
Modify: `package.json` (append the two test files to `scripts.test:exam`).

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` `server-lib/exam/types.ts`.
2. `write_to_file` the three source files per §3.1–§3.3, then the two test files per §3.4.
3. `replace_file_content` `package.json` → append `scripts/exam-tests/sheetReducer.test.ts scripts/exam-tests/clock.test.ts` to `test:exam`.
4. `run_command` `npm run test:exam`, `npm run lint`.

## 3.1 `src/components/exam/types.ts`
```ts
export type {
  OptionKey, ExamSubject, ItemFormat, PaperCode, SectionSubject, RulesPreset, Series, Confidence, SubmitMode,
  PaperItem, PaperSpec, SheetEventType, SheetEvent, AwaySpan, ResponseSheet, Verdict, ItemResult, LedgerRow,
  SubjectRow, DisciplineStats, PacePoint, ExamResult, StartRequest, StartResponse, ActiveAttempt, SubmitResponse,
  ActiveResponse, AttemptSummary, CatalogResponse,
} from '../../../server-lib/exam/types';
import type { OptionKey, PaperCode, RulesPreset, SectionSubject } from '../../../server-lib/exam/types';

export const OPTIONS: readonly OptionKey[] = ['A', 'B', 'C', 'D'];
export const SUBJECT_LABELS: Record<string, string> = {
  Economy: 'Economy', Environment: 'Environment', Geography: 'Geography',
  History: 'History & Culture', Polity: 'Polity', 'General Studies': 'General', Mixed: 'Mixed',
};
export const PAPER_SHORT_TITLES: Record<PaperCode, string> = {
  GS1_FULL: 'Full paper', GS1_HALF: 'Half paper', GS1_SECTION: 'Sectional',
};
export const HALL_START_MINUTES = 9 * 60 + 30;
export const INK_GRACE_MS = 5000;
export const CHECKPOINT_INTERVAL_MS = 30000;
export const MAX_EVENTS = 2000;

export type ExamPhase =
  | 'checking' | 'admit' | 'starting' | 'resume' | 'sitting' | 'pens-down' | 'submitting' | 'submit-error' | 'scorecard' | 'load-error';
export type SaveState = 'idle' | 'saving' | 'saved' | 'offline';
export type BookletTheme = 'paper' | 'night';
export interface ExamPrefs { rules: RulesPreset; booklet: BookletTheme; bell: boolean; }
export const DEFAULT_PREFS: ExamPrefs = { rules: 'exam_day', booklet: 'paper', bell: false };
export const PREFS_STORAGE_KEY = 'tark_exam_prefs';
export const sheetStorageKey = (attemptId: string) => `tark_exam_sheet_${attemptId}`;

export type ExamLaunch =
  | { kind: 'new'; paperCode: PaperCode; subject?: SectionSubject }
  | { kind: 'resume' }
  | { kind: 'result'; attemptId: string };
```

## 3.2 `src/components/exam/lib/sheetReducer.ts`
```ts
export interface SheetState {
  sheet: ResponseSheet;
  /** epoch ms when the row's current single bubble was inked (exam-day grace window) */
  inkAt: Record<string, number>;
  pendingDouble: { qid: string; key: OptionKey } | null;
  awayOpenAt: number | null;
  lastVisit: string | null;
}
export type SheetAction =
  | { type: 'HYDRATE'; sheet: ResponseSheet }
  | { type: 'CHOOSE'; qid: string; key: OptionKey; t: number; now: number }
  | { type: 'BUBBLE'; qid: string; key: OptionKey; t: number; now: number }
  | { type: 'TRANSFER'; qid: string; t: number; now: number }
  | { type: 'CONFIRM_DOUBLE'; t: number; now: number }
  | { type: 'CANCEL_DOUBLE' }
  | { type: 'UNDO'; qid: string; t: number; now: number }
  | { type: 'STRIKE'; qid: string; key: OptionKey; t: number; now: number }
  | { type: 'TAG'; qid: string; confidence: Confidence; t: number; now: number }
  | { type: 'FLAG'; qid: string; t: number; now: number }
  | { type: 'VISIT'; qid: string; t: number; now: number }
  | { type: 'AWAY_START'; t: number; now: number }
  | { type: 'AWAY_END'; t: number; now: number };

export function emptyResponseSheet(rules: RulesPreset): ResponseSheet;
export function initSheetState(rules: RulesPreset, sheet?: ResponseSheet | null): SheetState;
export function sheetReducer(state: SheetState, action: SheetAction): SheetState;
export function isInGrace(state: SheetState, qid: string, now: number): boolean;
export function tallies(sheet: ResponseSheet, qids: readonly string[]): {
  bubbled: number; blank: number; invalid: number; circledOnly: number; flagged: number;
  circledOnlyQids: string[]; flaggedQids: string[]; invalidQids: string[];
};
```
Rules. **E** = `sheet.rules === 'exam_day'`, **P** = `'practice'`. "Event" means append `{ t, q: qid, e, v }` to `sheet.events`. Every action that changes the sheet sets `sheet.clientUpdatedAt = now`. An action that changes nothing returns **the same state object** (reference-equal). Never mutate the input: copy each branch you change.
1. `HYDRATE` → `{ sheet: action.sheet, inkAt: {}, pendingDouble: null, awayOpenAt: null, lastVisit: null }`.
2. `CHOOSE` also removes `key` from `struck[qid]` if it is there.
   - **E**: `circled[qid] === key` → delete it and emit event `'uncircle'` (v = key). Otherwise set it and emit `'circle'` (v = key).
   - **P**: `bubbles[qid]` is exactly `[key]` → delete `bubbles[qid]` and `circled[qid]` and emit `'erase'`. Otherwise set `bubbles[qid] = [key]` and `circled[qid] = key` and emit `'bubble'` (v = key).
3. `BUBBLE` — **P**: identical to P-CHOOSE. **E**, with `b = bubbles[qid] ?? []`:
   - `b.length === 0` → `bubbles[qid] = [key]`, `inkAt[qid] = now`, emit `'bubble'`.
   - `b.length === 1 && b[0] === key` → no change (same object).
   - `b.length === 1 && b[0] !== key`:
     - `now - inkAt[qid] <= INK_GRACE_MS` → replace: `bubbles[qid] = [key]`, `inkAt[qid] = now`, emit `'erase'` (v = old key) then `'bubble'` (v = key).
     - otherwise → `pendingDouble = { qid, key }` and nothing else changes (the sheet object stays the same).
   - `b.length >= 2` → no change.
   E-BUBBLE never touches `circled`.
4. `TRANSFER` — **E** with `circled[qid]` set → the result of E-BUBBLE with that key. Otherwise no change.
5. `CONFIRM_DOUBLE` — `pendingDouble` set and `bubbles[q]` has length 1 → `bubbles[q] = [old, key]` sorted A→D, delete `inkAt[q]`, emit `'double'` (v = key), clear `pendingDouble`. With no `pendingDouble` → no change.
6. `CANCEL_DOUBLE` → clear `pendingDouble` (no sheet change, `clientUpdatedAt` unchanged). Already null → same object.
7. `UNDO` — **E**: `bubbles[qid]` has length 1 and `isInGrace` → delete `bubbles[qid]` and `inkAt[qid]`, emit `'erase'`. **P**: `bubbles[qid]` exists → delete it and `circled[qid]`, emit `'erase'`. Anything else → no change.
8. `STRIKE` — toggle `key` in `struck[qid]` (kept sorted; delete the entry when it empties) and emit `'strike'` or `'unstrike'` (v = key). **E**: striking the currently circled key also deletes `circled[qid]`.
9. `TAG` — `confidence[qid] === confidence` → delete it and emit `'tag'` with v `'none'`. Otherwise set it and emit `'tag'` with v = confidence.
10. `FLAG` — toggle `flagged[qid]` (`true`, or delete). Emit `'flag'` with v `'1'` or `'0'`.
11. `VISIT` — `lastVisit === qid` → same object. Otherwise emit `'visit'` and set `lastVisit = qid`.
12. **Event cap** (after every append): while `events.length > MAX_EVENTS`, remove the earliest `'visit'` event. If none are left and it is still over, keep the last `MAX_EVENTS`.
13. `AWAY_START` — `awayOpenAt === null` → set `awayOpenAt = t`. Otherwise same object. `AWAY_END` — if `awayOpenAt !== null` and `t >= awayOpenAt`, push `{ from: awayOpenAt, to: t }` to `sheet.away` and set `awayOpenAt = null`. If it is null, same object.
14. `isInGrace(state, qid, now)` = `inkAt[qid] !== undefined && now - inkAt[qid] <= INK_GRACE_MS`.
15. `tallies`: over `qids`, count rows with `bubbles` length 1 or more (`bubbled`), length 2 or more (`invalid`, also counted in bubbled), `blank = qids.length - bubbled`, `circledOnly` = circled with no bubble, and `flagged`. The `*Qids` lists follow `qids` order.

## 3.3 `src/components/exam/lib/clock.ts`
```ts
export function serverOffsetMs(serverNowIso: string, clientNowMs: number): number;        // Date.parse(serverNowIso) - clientNowMs
export function msLeft(deadlineIso: string, clientNowMs: number, offsetMs: number): number; // Date.parse(deadline) - (clientNow + offset), may be negative
export function secondsLeft(deadlineIso: string, clientNowMs: number, offsetMs: number): number; // Math.max(0, Math.ceil(msLeft / 1000))
export function secondsElapsed(startedIso: string, clientNowMs: number, offsetMs: number, durationSeconds: number): number; // clamp(floor(...), 0, duration)
export function formatTimeLeft(seconds: number): string;   // >= 3600 → "H:MM:SS", else "MM:SS"
export function hallClock(elapsedSeconds: number): string;  // "HH:MM" = 09:30 + floor(elapsed / 60) min
export function hallClockAtMinute(minute: number): string;  // "HH:MM" = 09:30 + minute
export function hallEnd(durationSeconds: number): string;   // hallClock(durationSeconds)
export function formatMarks(hundredths: number): string;    // "2.68", "−0.66" (U+2212 minus), "0.00"
export function formatSignedMarks(hundredths: number): string; // "+2.00", "−0.66", "0.00"
export function formatDuration(seconds: number): string;    // < 60 → "45s"; < 3600 → "1m 40s"; else "1h 02m"
export function durationLabel(seconds: number): string;     // 7200 → "2 hours", 3600 → "1 hour", else "<n> minutes"
export function rollNumber(userId: string): string;         // FNV-1a 32-bit over charCodeAt units, % 1e7, "TK" + padStart(7, '0')
export function formatPercent(numerator: number, denominator: number): string; // Math.round(100 * n / d) + "%", or "—" when d === 0
```
FNV-1a: `h = 0x811c9dc5`; for each unit `h ^= code; h = Math.imul(h, 0x01000193) >>> 0`. `formatMarks`: `a = Math.abs(h)`; `Math.floor(a / 100) + '.' + String(a % 100).padStart(2, '0')`; prefix `'−'` (U+2212) when `h < 0`.

## 3.4 Required tests
`scripts/exam-tests/clock.test.ts`:
- `formatTimeLeft`: 4552 → `"1:15:52"`, 3600 → `"1:00:00"`, 599 → `"09:59"`, 0 → `"00:00"`.
- `hallClock`: 0 → `"09:30"`, 59 → `"09:30"`, 2640 → `"10:14"`, 7200 → `"11:30"`. `hallEnd`: 1800 → `"10:00"`, 3600 → `"10:30"`. `hallClockAtMinute(90)` → `"11:00"`.
- `formatMarks`: 268 → `"2.68"`, −66 → `"−0.66"`, 0 → `"0.00"`, 9352 → `"93.52"`, −1848 → `"−18.48"`, 5 → `"0.05"`. `formatSignedMarks`: 200 → `"+2.00"`, −66 → `"−0.66"`, 0 → `"0.00"`.
- `serverOffsetMs('2026-09-24T10:00:05.000Z', Date.parse('2026-09-24T10:00:00.000Z'))` → 5000. `secondsLeft('2026-09-24T10:00:10.400Z', Date.parse('2026-09-24T10:00:00.000Z'), 0)` → 11; with offset 5000 → 6; a past deadline → 0. `secondsElapsed('2026-09-24T10:00:00.000Z', Date.parse('2026-09-24T10:05:00.900Z'), 0, 1800)` → 300; far future → 1800.
- `formatDuration`: 100 → `"1m 40s"`, 45 → `"45s"`, 3725 → `"1h 02m"`. `durationLabel`: 7200 → `"2 hours"`, 3600 → `"1 hour"`, 1800 → `"30 minutes"`.
- `rollNumber('00000000-0000-4000-8000-000000000000')` → `"TK7017141"`; `rollNumber('user-123')` → `"TK8496403"`.
- `formatPercent(56, 84)` → `"67%"`; `formatPercent(1, 0)` → `"—"`.

`scripts/exam-tests/sheetReducer.test.ts`. Deep-freeze every input state (a recursive `Object.freeze` helper) so any mutation throws. `E = initSheetState('exam_day')`, `P = initSheetState('practice')`.
1. E: CHOOSE q1 A (t 5, now 1000) → `circled.q1 === 'A'`, the last event is `{t:5,q:'q1',e:'circle',v:'A'}`, `clientUpdatedAt === 1000`. CHOOSE q1 A again → no `circled.q1`, last event `'uncircle'`.
2. E: BUBBLE q1 A (now 1000) → `bubbles.q1` = `['A']`. BUBBLE q1 A again (now 2000) → the returned state is `===` the previous state.
3. E grace: BUBBLE q1 A (now 1000), then BUBBLE q1 C (now 4000) → `['C']`, and the last two events are `erase(A)` then `bubble(C)`.
4. E after grace: BUBBLE q1 A (now 1000), then BUBBLE q1 C (now 7000) → `pendingDouble` = `{qid:'q1',key:'C'}` and `bubbles.q1` still `['A']`. Then CONFIRM_DOUBLE → `['A','C']`, `pendingDouble === null`, last event `double(C)`.
5. E: CANCEL_DOUBLE after step 4's pending → pending cleared, bubbles unchanged, `clientUpdatedAt` unchanged.
6. E UNDO: bubble at now 1000; UNDO at 3000 → row empty, event `erase`. Bubble at 1000; UNDO at 9000 → same object.
7. E TRANSFER: CHOOSE q2 B then TRANSFER q2 → `bubbles.q2` = `['B']`, and `circled.q2` is still `'B'`. TRANSFER q3 (nothing circled) → same object.
8. P: CHOOSE q1 A → `bubbles.q1 ['A']` and `circled.q1 'A'`. CHOOSE q1 C → `['C']` with no `pendingDouble`. CHOOSE q1 C → row and circle deleted, last event `erase`.
9. STRIKE: E CHOOSE q1 B, then STRIKE q1 B → `struck.q1 ['B']` and no `circled.q1`. STRIKE q1 B again → no `struck.q1`. STRIKE q1 D, then CHOOSE q1 D → no `struck.q1`, and `circled.q1 === 'D'`.
10. TAG q1 sure → `'sure'`; TAG q1 sure → deleted, last event v `'none'`. FLAG q1 → `true`; FLAG q1 → deleted.
11. VISIT q1, VISIT q1 → exactly 1 visit event and the second call returns the same object. VISIT q2 → 2 visit events.
12. AWAY_START t 100, AWAY_END t 160 → `away` = `[{from:100,to:160}]`. AWAY_END with nothing open → same object.
13. Event cap: 2005 VISITs alternating q1/q2 → `events.length === 2000`, and the first event's `t` is 5 when visit k has `t = k`.
14. `tallies` for E with bubbles `{q1:['A'],q2:['A','B']}`, circled `{q1:'A',q3:'C'}`, flagged `{q4:true}` over `['q1','q2','q3','q4','q5']` → `bubbled 2, invalid 1, blank 3, circledOnly 1, flagged 1, circledOnlyQids ['q3'], flaggedQids ['q4'], invalidQids ['q2']`.

# 4. Deterministic Acceptance Criteria
1. `npm run test:exam` exits 0 with all tests passing: the earlier exam tests plus clock and reducer. Paste the TAP summary.
2. `npm run lint` exits 0.
3. `grep_search` `src/components/exam` for `from '.*server-lib` → matches only the two `server-lib/exam/types'` lines in `src/components/exam/types.ts`, and both are `export type`/`import type` (paste the raw output).
4. `grep_search` `sheetReducer.ts` and `clock.ts` for `Date.now|Math.random|localStorage|fetch` → 0 matches.
5. Hard boundary respected.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - write_to_file
    - replace_file_content
    - run_command
    - manage_task
    - grep_search
  duration_ms: 140000
  exit_codes:
    npm_run_test_exam: 0
    npm_run_lint: 0
    npm_run_test: 0
test_exam_tap_summary: |
  1..44
  # tests 44
  # suites 0
  # pass 44
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
criterion_3_grep_output: |
  {"File":"c:\\Users\\bentn\\OneDrive\\Desktop\\SKU\\src\\components\\exam\\types.ts","LineNumber":6,"LineContent":"} from '../../../server-lib/exam/types';"}
  {"File":"c:\\Users\\bentn\\OneDrive\\Desktop\\SKU\\src\\components\\exam\\types.ts","LineNumber":7,"LineContent":"import type { OptionKey, PaperCode, RulesPreset, SectionSubject } from '../../../server-lib/exam/types';"}
criterion_4_grep_output: "Zero matches for Date.now|Math.random|localStorage|fetch in sheetReducer.ts and clock.ts"
files_created:
  - src/components/exam/types.ts
  - src/components/exam/lib/sheetReducer.ts
  - src/components/exam/lib/clock.ts
  - scripts/exam-tests/clock.test.ts
  - scripts/exam-tests/sheetReducer.test.ts
files_modified:
  - package.json
  - 02_CONTRACTS/active/TASK_064_EXAM_CLIENT_STATE_CORE.md
```

# 6. Orchestrator Verification Note (2026-09-24)

Independent Orchestrator checks all pass:
- clock formats, offsets, elapsed, marks formatting, and the roll-number golden values;
- reducer rules, run on deep-frozen state (so any mutation would throw): exam-day circle/uncircle, same-key no-op returning the same reference, grace replace, after-grace pendingDouble then confirm/cancel, undo in and after grace, transfer, practice choose/replace/erase, strike clears circle, choose unstrikes, tag toggle, visit dedupe, away spans, the 2000-event cap, tallies.

Note: TASK_072 later added direct type-only imports from `server-lib` in scorecard files. See the TASK_072 note.
