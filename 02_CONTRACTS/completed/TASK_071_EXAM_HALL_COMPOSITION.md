---
task_id: "TASK_071_EXAM_HALL_COMPOSITION"
status: "VERIFIED_PARTIAL"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 6000
  output_diff_max: 5000
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_066_EXAM_SESSION_HOOK", "TASK_067_EXAM_BOOKLET_UI", "TASK_068_EXAM_OMR_SHEET_UI", "TASK_069_EXAM_BAR_AND_ANNOUNCEMENTS", "TASK_070_EXAM_ADMIT_AND_DIALOGS"]
queue_gate: "SOFT — composes every Exam Hall component. The scorecard component (TASK_072) does not exist yet: render a temporary placeholder in the scorecard phase exactly as §3.5 says; TASK_072 replaces it."
blueprint: "strategy/design/exam-hall-blueprint.md §7, §8, §12, §13, §14 · visual target: mockup screens 'Sitting' and 'Mobile'"
---

# 0. Batch rules
Same as TASK_059 §0. Do not mount `ExamHall` anywhere yet; TASK_074 wires it into the Arena.

# 1. High-Density Distilled Objective
Compose the Exam Hall into one default-exported component, `src/components/exam/ExamHall.tsx`. It drives every phase from `useExamSession` and lays out the sitting (sticky bar, announcements, booklet, answer-sheet panel on desktop, bottom sheet on mobile). It tracks the active question (scroll plus interaction), implements the full keyboard map in `useExamKeyboard.ts`, and renders the shortcuts dialog, full screen, the hand-in flow, pens down, resume, and every loading and error state. Memoised booklet items must not re-render on each clock tick.

# 2. Transcluded Context References
- `src/components/exam/useExamSession.ts` — the `ExamSession` fields and `command()` shapes.
- `src/components/exam/{Booklet,BookletItem,OmrSheet,ExamBar,HallAnnouncements,AdmitCard,HandInDialog,PensDown,ResumePrompt}.tsx` — their props interfaces.
- `src/components/exam/lib/sheetReducer.ts` (`tallies`), `lib/clock.ts` (`hallEnd`), `types.ts` (`ExamLaunch`, `PAPER_SHORT_TITLES`, `OPTIONS`).
- `src/components/shared/Modal.tsx` for the shortcuts dialog.
- Blueprint §14 keyboard table (copy it into the shortcuts dialog verbatim).

# 2.5 Scope fence
Create: `src/components/exam/ExamHall.tsx`, `src/components/exam/useExamKeyboard.ts`, `src/components/exam/ShortcutsDialog.tsx`.
Modify: nothing.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` the props interfaces of every component listed in §2.
2. `write_to_file` `useExamKeyboard.ts` (§3.3), `ShortcutsDialog.tsx` (§3.4), `ExamHall.tsx` (§3.1, §3.2, §3.5).
3. `run_command` `npm run lint`, `npm run build`.

## 3.1 `ExamHall` props and root
```ts
export interface ExamHallProps {
  launch: ExamLaunch;
  userId: string;
  candidateName?: string | null;
  onExit: () => void;
  onSittingChange?: (active: boolean) => void;
  onStartPaper: (paperCode: PaperCode, subject?: SectionSubject) => void;
}
export default function ExamHall(props: ExamHallProps): JSX.Element;
```
- `import './exam.css';`. The root is `<div ref={rootRef} className="exam-hall w-full font-sans text-primary" data-booklet={session.prefs.booklet}>`. Full screen targets this element, so the booklet colours still apply in full screen.
- **Stable handlers**: every `BookletHandlers` function and every sheet callback is created once with `useCallback` over `session.command`, taking `qid` as an argument. `session.command` itself must be stable. If it isn't, wrap it with a ref-backed `useCallback` here.

## 3.2 Sitting layout (`phase === 'sitting' || phase === 'pens-down'`)
```
<ExamBar …/>
<HallAnnouncements …/>
<div className="grid items-start gap-6 pt-5 pb-24 lg:pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
  <Booklet mode="sitting" … />
  <aside aria-label="Answer sheet" className="hidden lg:block lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto">
    <OmrSheet variant="panel" … />
  </aside>
</div>
<OmrBottomSheet open={sheetOpen} … ><OmrSheet variant="sheet" … /></OmrBottomSheet>
<HandInDialog … />   <ShortcutsDialog … />   {phase === 'pens-down' && <PensDown … />}
```
- `tallies` = `tallies(sheet, qids)` memoised on `sheet`. `circledOnly` and `flagged` lists map qids to `n` for the dialog chips.
- **Active question**: state `activeQid`, initialised to the first qid. `registerItem` keeps an element map. One `IntersectionObserver` (`rootMargin: '-35% 0px -55% 0px'`) sets `activeQid` from the most recent intersecting entry. `handlers.onActivate(qid)` also sets it. Whenever `activeQid` changes, call `session.command({ type: 'VISIT', qid })`.
- **goTo(qid)**: `el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })`, `setActiveQid(qid)`, then `el.focus({ preventScroll: true })`. The sheet's `onJump` and the hand-in chips use it; on mobile, `onJump` also closes the bottom sheet.
- **Seal broken**: when the phase first becomes `'sitting'`, call `goTo(firstQid)` once.
- **Full screen**: `onStart(rules, { fullscreen })` from `AdmitCard` must call `rootRef.current?.requestFullscreen?.()` **synchronously first** (user-gesture requirement), wrapped in try/catch, and only then `session.startPaper(rules)`. `ExamBar`'s toggle requests or exits full screen. Track `document.fullscreenElement` through `fullscreenchange`. `fullscreenAvailable = !!document.fullscreenEnabled`.
- **Hand-in**: the bar's "Hand in" opens `HandInDialog`; "Hand in now" calls `session.handIn()`.
- The `OmrSheet` `hint` prop is `session.inkHint`; `pendingDouble` is `session.sheetState.pendingDouble`; `onConfirmDouble`/`onCancelDouble` send `CONFIRM_DOUBLE`/`CANCEL_DOUBLE`.

## 3.3 `useExamKeyboard.ts`
```ts
export function useExamKeyboard(opts: {
  enabled: boolean;
  rules: RulesPreset;
  onChoose: (key: OptionKey) => void;
  onStrike: (key: OptionKey) => void;
  onTransfer: () => void;
  onTag: (c: Confidence) => void;
  onFlag: () => void;
  onNext: () => void;
  onPrev: () => void;
  onUndo: () => void;
  onFocusSheet: () => void;
  onShortcuts: () => void;
}): void;
```
- A `keydown` listener on `window` while `enabled`. Ignore the event when the target is an input, textarea, select or contentEditable, when any of Ctrl/Alt/Meta is held, or when `e.defaultPrevented`.
- Mapping (use `e.code` for letters and digits):
  - `Digit1–4` / `KeyA–D` → `onChoose('A'…'D')`, or `onStrike` when Shift is held
  - `Enter` → `onTransfer` (exam_day only)
  - `KeyS` / `KeyF` / `KeyG` → `onTag('sure' | 'fifty' | 'guess')`
  - `KeyR` → `onFlag`
  - `KeyN` / `KeyJ` → `onNext`; `KeyP` / `KeyK` → `onPrev`
  - `KeyU` → `onUndo`
  - `KeyO` → `onFocusSheet`
  - `Slash` with Shift (`?`) → `onShortcuts`
  Call `preventDefault` on handled keys. Escape is **not** handled here (dialogs own it) and never ends the paper.
- `enabled` in ExamHall = `phase === 'sitting'` and no dialog, bottom sheet or double-mark popover open.

## 3.4 `ShortcutsDialog.tsx`
`{ open: boolean; onClose: () => void }` → `Modal` titled "Keyboard shortcuts", holding a two-column table with blueprint §14's rows verbatim. Keys go in `<kbd>` with `font-mono text-[11px] border border-border border-b-2 rounded px-1.5`.

## 3.5 Non-sitting phases (exact copy)
- `checking` → centred `min-h-[50vh]` block with a Lucide `Loader2` spinner and "Opening the exam hall…".
- `load-error` → `session.error` + buttons "Try again" (`session.retry`) and "Back to Arena" (`onExit`).
- `admit` → `<AdmitCard …/>` (`starting={false}`, `error={session.error}`).
- `starting` → `<AdmitCard …/>` with `starting={true}`.
- `resume` → `<ResumePrompt …/>` fed a live `secondsLeft`. Compute it here with a 1 s interval from `resumeInfo.deadlineAt` and `resumeInfo.serverNow` (using `serverOffsetMs` captured once), cleared on phase change.
- `submitting` → spinner + "Collecting your answer sheet…".
- `submit-error` → `session.error` + "Try again" (`session.retry`).
- `scorecard` → **temporary placeholder until TASK_072**: `<div data-testid="exam-scorecard-placeholder">` showing "Net score {formatMarks(result.netHundredths)} / {result.maxHundredths / 100}" and a "Back to Arena" button. TASK_072 replaces this block.

# 4. Deterministic Acceptance Criteria
1. `npm run lint` and `npm run build` exit 0.
2. `grep_search` `ExamHall.tsx` for `useCallback` → ≥ 8 hits; for `IntersectionObserver` → ≥ 1; for `requestFullscreen` → ≥ 1; for `import './exam.css'` → 1.
3. `grep_search` `useExamKeyboard.ts` for `Escape` → 0 matches; for `KeyA|Digit1|KeyS|KeyR|KeyN|KeyP|KeyU|KeyO|Slash` → all present.
4. `grep_search` for each exact string: `Opening the exam hall…`, `Collecting your answer sheet…`, `Try again`, `Back to Arena`, `Keyboard shortcuts` → each ≥ 1 across the three files.
5. `grep_search` `src/` for `<ExamHall` → 0 matches (not mounted yet).
6. Hard boundary respected.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - write_to_file
    - multi_replace_file_content
    - run_command
    - grep_search
    - view_file
  duration_ms: 4500
  exit_codes:
    lint: 0
    build: 0
criterion_2_counts:
  useCallback: 26
  IntersectionObserver: 2
  requestFullscreen: 2
  import_exam_css: 1
criterion_3_grep_output: "Escape: 0 matches; KeyA, Digit1, KeyS, KeyR, KeyN, KeyP, KeyU, KeyO, Slash all present and verified"
criterion_4_string_hits:
  Opening the exam hall…: 1
  Collecting your answer sheet…: 1
  Try again: 2
  Back to Arena: 3
  Keyboard shortcuts: 2
files_created:
  - "src/components/exam/useExamKeyboard.ts"
  - "src/components/exam/ShortcutsDialog.tsx"
  - "src/components/exam/ExamHall.tsx"
```

# 6. Orchestrator Verification Note (2026-09-24)

Confirmed:
- stable `useCallback` handlers over a stable `command`;
- one IntersectionObserver with the exact rootMargin, disconnected on phase change and unmount;
- VISIT fires only when the active question changes;
- `requestFullscreen` is called synchronously in the click path;
- the key map matches §3.3 (`e.code`, Shift strikes, `?`, Escape not handled);
- ShortcutsDialog matches blueprint §14 verbatim;
- all phase copy is exact.

Defects, re-confirmed in code:
- **(BLOCKER)** full screen is requested on a root with no `overflow` and no `:fullscreen` CSS, so the booklet can't scroll → TASK_077 U1;
- Enter is `preventDefault`ed on every focused button under exam-day rules → U3;
- `O` focuses a non-focusable `<aside>` → U6;
- both the desktop panel and the mobile bottom sheet stay mounted, so their outside-click handlers cancel each other on mobile → U5 (**root cause: the layout spec in this contract**, which rendered both);
- smooth `goTo` scrolls can retarget the active question → U9;
- the UI reads `session.prefs.rules` rather than the attempt's rules, so a resumed exam-day paper can render as practice → TASK_076 F5;
- dialogs are not closed on phase change → TASK_076 F4;
- full-screen promise rejections are unhandled → U2.
