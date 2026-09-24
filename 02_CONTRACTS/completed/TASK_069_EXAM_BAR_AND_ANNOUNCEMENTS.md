---
task_id: "TASK_069_EXAM_BAR_AND_ANNOUNCEMENTS"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 7000
  thinking_budget_tokens: 3500
  output_diff_max: 4000
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_066_EXAM_SESSION_HOOK", "TASK_067_EXAM_BOOKLET_UI"]
queue_gate: "SOFT — needs types.ts, lib/clock.ts, and the Announcement type exported by useExamSession.ts."
blueprint: "strategy/design/exam-hall-blueprint.md §10 · visual target: mockup screen 'Sitting' (header.bar, .announce) and screen 'Mobile' (.m-bar)"
---

# 0. Batch rules
Same as TASK_059 §0. Presentational only; no timers except the announcement enter animation.

# 1. High-Density Distilled Objective
Build the sticky exam bar and the time-check banner:
- **Exam bar**: paper identity and series chip, a **hall clock** plus **time left** read-out that stays calm and only changes colour in the last 10 minutes (never pulses), live tallies (bubbled · circled only · to revisit), save status, "Hand in", and a "More" menu (shortcuts, hall bell, Paper/Night booklet, full screen).
- **Hall announcements**: a banner under the bar with an accessible live region and an optional two-tone WebAudio bell.

# 2. Transcluded Context References
- Mockup CSS `.bar`, `.paper-id`, `.chip`, `.readouts`, `.readout .lbl/.val/.val.warn`, `.tallies`, `.save`, `.btn-outline`, `.more`, `.announce`, and the mobile `.m-bar`.
- Blueprint §10 (every string, thresholds, colours, and the mobile collapse).
- `src/components/exam/types.ts` (`SaveState`, `ExamPrefs`, `RulesPreset`, `Series`), `lib/clock.ts` (`formatTimeLeft`), `useExamSession.ts` (`Announcement`).
- `src/App.tsx:480-484` — the mobile app header is `fixed top-0` and 104 px tall. That is why the bar sticks at `top-[104px] md:top-0`.
- Motion: `motion/react` only (`AnimatePresence`, `motion.div`, `useReducedMotion`).

# 2.5 Scope fence
Create: `src/components/exam/ExamBar.tsx`, `src/components/exam/HallAnnouncements.tsx`, `src/components/exam/lib/bell.ts`.
Modify: nothing.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` the mockup bar CSS and blueprint §10.
2. `write_to_file` `lib/bell.ts` per §3.3, `HallAnnouncements.tsx` per §3.2, `ExamBar.tsx` per §3.1.
3. `run_command` `npm run lint`, `npm run build`.

## 3.1 `ExamBar`
```ts
export interface ExamBarProps {
  paperShortTitle: string;          // PAPER_SHORT_TITLES[code]
  series: Series;
  hallTime: string;
  secondsLeft: number;
  totalQuestions: number;
  tallies: { bubbled: number; circledOnly: number; flagged: number };
  rules: RulesPreset;
  saveState: SaveState;
  prefs: ExamPrefs;
  fullscreen: boolean;
  fullscreenAvailable: boolean;
  onHandIn: () => void;
  onOpenSheet: () => void;
  onShowShortcuts: () => void;
  onPrefsChange: (patch: Partial<ExamPrefs>) => void;
  onToggleFullscreen: () => void;
}
```
- `<header className="sticky top-[104px] md:top-0 z-30 -mx-4 md:-mx-8 px-4 md:px-8 py-2 min-h-[52px] md:min-h-[56px] flex flex-wrap items-center gap-x-4 gap-y-1 bg-surface/95 backdrop-blur-sm border-b border-border">`.
- Left: `<b className="font-semibold">GS Paper I</b>`, `<span className="hidden sm:inline text-muted">· {paperShortTitle}</span>`, and the chip `rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-secondary` "Series {S}".
- Read-outs (`flex gap-5 md:mx-auto`): the "Hall clock" block is hidden below `sm`; the "Time left" block is always shown. Labels use `text-[10px] uppercase tracking-[0.12em] text-muted`; values use `font-mono tabular-nums text-base md:text-lg`. The time-left value colour: `secondsLeft <= 300` → `text-rose-400`, `<= 600` → `text-amber-400`, otherwise `text-primary`. No animation classes anywhere in this component.
- Tallies (`hidden md:flex gap-3 text-[12.5px] text-secondary`): "{b} bubbled" · (exam_day only) "{c} circled only", `text-amber-400` when `c > 0` · "{f} to revisit". Numbers are `font-mono`. On mobile: `<span className="md:hidden font-mono text-xs text-secondary">{b}/{total}</span>`.
- Save status (`hidden md:inline-flex items-center gap-1.5 text-xs text-muted`):
  - `saved` → emerald dot + "Saved"
  - `saving` → "Saving…"
  - `offline` → amber dot + "Offline · kept on this device"
  - `idle` → nothing
  Wrap it in `role="status" aria-live="polite"`.
- Buttons:
  - "Answer sheet" (`lg:hidden`, ghost border style) → `onOpenSheet`.
  - "Hand in" → `onHandIn`, class `px-3.5 py-1.5 rounded-md border border-[#e0d0ab] text-[#e0d0ab] text-[13px] font-semibold hover:bg-[#e0d0ab]/10`.
  - "More": icon button, `aria-label="More options"`, `aria-haspopup="menu"`, `aria-expanded`. It opens a `role="menu"` popover (right-aligned, `bg-surface-elevated border border-border rounded-lg shadow-2xl py-1 min-w-56`) with these items:
    - `menuitem` "Keyboard shortcuts" with a `<kbd>?</kbd>` hint → `onShowShortcuts`
    - `menuitemcheckbox` "Hall bell" (`aria-checked={prefs.bell}`) → `primeBell()` then `onPrefsChange({ bell: !prefs.bell })`
    - two `menuitemradio`, "Booklet: Paper" and "Booklet: Night"
    - `menuitemcheckbox` "Full screen" (only when `fullscreenAvailable`) → `onToggleFullscreen`
    Menu behaviour: ArrowUp/ArrowDown move focus, Enter/Space activate, Escape closes and returns focus to the button, and a click outside closes.

## 3.2 `HallAnnouncements`
```ts
export interface HallAnnouncementsProps { announcement: Announcement | null; bell: boolean; onDismiss: () => void; }
```
- Two permanently mounted, visually hidden live regions: `<div className="sr-only" role="status" aria-live="polite">` and `<div className="sr-only" aria-live="assertive">`. The announcement text goes into the assertive one when `urgent`, otherwise the polite one.
- Visual banner (`AnimatePresence`; `y: -8 → 0`, opacity, 180 ms; no motion under `useReducedMotion`): `mt-3 flex items-center gap-3 rounded-md px-3.5 py-2.5 text-[13.5px]`.
  - When `urgent`, or when the text starts with "10 minutes": amber `border border-amber-500/35 bg-amber-500/10 text-amber-200`.
  - Otherwise neutral `border border-border bg-surface-elevated text-primary`.
  - Button "Dismiss" (`text-xs underline underline-offset-2`) → `onDismiss`.
- When a new `announcement.id` appears and `bell` is true → `playBell()`.

## 3.3 `lib/bell.ts`
```ts
export function primeBell(): void;   // create or resume a module-level AudioContext; call from a user gesture; swallow errors
export function playBell(): void;    // if the context is 'running': 880 Hz for 0.25 s, then 660 Hz for 0.25 s, sine, gain 0.12 with a 10 ms attack and a 60 ms release; otherwise no-op
```
No audio files. Everything is wrapped in try/catch.

# 4. Deterministic Acceptance Criteria
1. `npm run lint` and `npm run build` exit 0.
2. `grep_search` for each exact string: `GS Paper I`, `Series `, `Hall clock`, `Time left`, `bubbled`, `circled only`, `to revisit`, `Saved`, `Saving…`, `Offline · kept on this device`, `Answer sheet`, `Hand in`, `More options`, `Keyboard shortcuts`, `Hall bell`, `Booklet: Paper`, `Booklet: Night`, `Full screen`, `Dismiss` → each ≥ 1 across the two components.
3. `grep_search` `ExamBar.tsx` for `animate-pulse|animate-` → 0 matches.
4. `grep_search` `top-\[104px\] md:top-0` → 1 match in `ExamBar.tsx`.
5. Hard boundary respected.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - write_to_file
    - run_command
    - grep_search
    - view_file
  duration_ms: 2600
  exit_codes:
    lint: 0
    build: 0
    test_exam: 0
criterion_2_string_hits:
  "GS Paper I": 1
  "Series ": 1
  "Hall clock": 1
  "Time left": 1
  "bubbled": 1
  "circled only": 1
  "to revisit": 1
  "Saved": 1
  "Saving…": 1
  "Offline · kept on this device": 1
  "Answer sheet": 1
  "Hand in": 1
  "More options": 1
  "Keyboard shortcuts": 1
  "Hall bell": 1
  "Booklet: Paper": 1
  "Booklet: Night": 1
  "Full screen": 1
  "Dismiss": 1
criterion_3_grep_output: "No results found"
files_created:
  - "src/components/exam/ExamBar.tsx"
  - "src/components/exam/HallAnnouncements.tsx"
  - "src/components/exam/lib/bell.ts"
```

# 6. Orchestrator Verification Note (2026-09-24)

ExamBar conforms to §3.1: classes, colour thresholds (amber ≤600 s, rose ≤300 s), no `animate-` classes, tallies, save states, menu roles and keyboard handling, and the sticky `top-[104px] md:top-0` (review plus grep).

The Orchestrator read `HallAnnouncements` and `bell.ts` in full:
- two permanently mounted live regions, with urgent text routed to the assertive one;
- the bell plays once per announcement id;
- the WebAudio envelope matches the spec, with everything in try/catch.

The keyboard/More-menu interplay is handled in TASK_077 U3 (a new `onMenuOpenChange` prop).
