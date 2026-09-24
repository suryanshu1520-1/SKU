---
task_id: "TASK_068_EXAM_OMR_SHEET_UI"
status: "VERIFIED_PARTIAL"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 7500
  thinking_budget_tokens: 5000
  output_diff_max: 4500
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_067_EXAM_BOOKLET_UI"]
queue_gate: "SOFT — needs exam.css tokens and types.ts."
blueprint: "strategy/design/exam-hall-blueprint.md §12, §15 · visual target: strategy/design/exam-hall-mockup.html (screen 'Sitting', right column 'ANSWER SHEET'; screen 'Mobile', peek bar)"
---

# 0. Batch rules
Same as TASK_059 §0. Presentational components only. State changes go through callbacks.

# 1. High-Density Distilled Objective
Build the OMR answer sheet, the only surface that scores. It is a cream sheet with navy print: particulars, then numbered rows of four lettered bubbles in 2 columns (1 for sectionals), grouped by 5, with ring and flag marks and an active-row band. Keyboard support is a single roving tab stop. The exam-day **second-bubble confirmation** is an inline popover. Below `lg` the same grid lives in a **bottom sheet** behind a 56 px peek bar.

# 2. Transcluded Context References
- Mockup CSS blocks `.sheet`, `.cols`, `.row`, `.row.g5`, `.row.active`, `.row.invalid`, `.num`, `.bub`, `.bub.on`, `.marks`, `.ring`, `.fl`, `.legend`, `.hint`, `.popover`, `.peek`.
- Blueprint §12 (all copy and states), §15.
- `src/components/exam/types.ts` (`PaperItem`, `ResponseSheet`, `OptionKey`, `RulesPreset`, `Series`, `OPTIONS`); `exam.css` tokens.
- Icons: `lucide-react` `Flag`, `ChevronUp`, `X`.

# 2.5 Scope fence
Create: `src/components/exam/OmrSheet.tsx` (exports `OmrSheet` and `OmrBottomSheet`).
Modify: nothing.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` the mockup sheet CSS and blueprint §12.
2. `write_to_file` `OmrSheet.tsx` per §3.1–§3.3.
3. `run_command` `npm run lint`, `npm run build`.

## 3.1 `OmrSheet`
```ts
export interface OmrSheetProps {
  items: PaperItem[];
  sheet: ResponseSheet;
  rules: RulesPreset;
  activeQid: string | null;
  roll: string;
  series: Series;
  pendingDouble: { qid: string; key: OptionKey } | null;
  hint: string | null;
  variant: 'panel' | 'sheet';
  onBubble: (qid: string, key: OptionKey) => void;
  onJump: (qid: string) => void;
  onConfirmDouble: () => void;
  onCancelDouble: () => void;
}
```
- Root: `<div className="rounded-md border border-[var(--eh-paper-edge)] bg-[var(--eh-sheet)] text-[var(--eh-ink)] px-3 pt-3.5 pb-3">`. In the `panel` variant the parent (TASK_071) owns sticky positioning and scroll.
- Header: `<h2 className="font-sans text-[11px] font-semibold tracking-[0.14em] text-[var(--eh-print)]">ANSWER SHEET</h2>`, then `<p className="mt-1.5 mb-2.5 font-mono text-[11px] text-[var(--eh-print)]">Roll {roll} · Series {series} · GS-I</p>`.
- Columns: `panel` with ≥ 50 items → 2 columns (`grid grid-cols-2 gap-x-2.5`): first column Q1…Q(n/2), second column the rest. `panel` with 25 items, or `sheet` variant → 1 column.
- Row: `<div role="radiogroup" aria-label={`Answer sheet, question ${n}`} aria-invalid={invalid || undefined}>` with classes `relative grid grid-cols-[24px_repeat(4,20px)_12px] items-center gap-[5px] h-[26px] pl-1 border-l-2 border-transparent`.
  - Add `border-b border-[var(--eh-print-faint)]` when `n % 5 === 0`.
  - Active row: `bg-[var(--eh-print-faint)] border-l-[var(--eh-print)]`.
  - Number: `<button tabIndex={-1} aria-label={`Go to question ${n}`} onClick={() => onJump(qid)} className="font-mono text-[11px] text-right text-[var(--eh-print)]">{n}</button>`. An invalid row adds `line-through text-[var(--eh-danger)]`.
  - Bubbles: `role="radio" aria-checked={filled} aria-label={`Question ${n} option ${letter}`}` with classes `relative grid place-items-center w-5 h-5 rounded-full border-[1.25px] border-[var(--eh-print)] font-mono text-[10px] text-[var(--eh-print)]`. When filled: render `<span aria-hidden className="eh-bubble-fill absolute inset-0 rounded-full bg-[var(--eh-bubble-ink)]" />` under the letter, and set the letter to `relative text-[var(--eh-bubble-letter)]`. Letters are lowercase.
  - Marks cell `flex items-center gap-0.5`: circled with an empty row (exam_day) → `<span title="Circled in booklet" className="w-1.5 h-1.5 rounded-full shadow-[0_0_0_1.5px_var(--eh-pencil)]" />`; flagged → `Flag` icon `w-[9px] h-[9px] text-[var(--eh-flag)]` with an `sr-only` "Revisit".
- Below the grid: `<p aria-live="polite" className="mt-2 min-h-4 font-sans text-[11.5px] text-[var(--eh-pencil-text)]">{hint}</p>`, then the legend (`mt-2.5 pt-2 border-t border-[var(--eh-print-faint)] flex flex-wrap gap-x-3 gap-y-1 font-sans text-[10.5px] text-[var(--eh-ink-soft)]`): "Filled = answered" · "Ring = circled in booklet" · "Flag = revisit" · "Struck number = invalid".
- Auto-scroll: when `activeQid` changes, call `scrollIntoView({ block: 'nearest' })` on its row element (via a ref map), without moving focus.

## 3.2 Roving keyboard (one tab stop for the whole grid)
- State `focus = { row: index, col: 0..3 }`, initialised to the active question's index, col 0. Only that bubble has `tabIndex={0}`; all others `-1`.
- `onKeyDown` on the grid:
  - ArrowUp/ArrowDown → row ∓ 1 (clamped)
  - ArrowLeft/ArrowRight → col ∓ 1 (clamped)
  - Home/End → first/last row
  - Space/Enter → `onBubble(qid, key)`
  After any move, `.focus()` the new bubble via the ref map. `preventDefault` on every handled key.
- Clicking a bubble sets `focus` to it and calls `onBubble`.

## 3.3 Overwrite popover (exam-day)
When `pendingDouble?.qid === qid` render inside that row: `<div role="alertdialog" aria-labelledby=… className="absolute z-20 left-8 top-7 w-64 rounded-lg border border-border bg-surface-elevated p-3 text-primary font-sans text-[12.5px] leading-snug shadow-2xl">`:
- Text (exact): "Row {n} already has ({x}). A second bubble makes this answer invalid and it will be marked wrong (−0.66)."
- Buttons: "Keep ({x})" (`autoFocus`, gold `bg-[#e0d0ab] text-[#050b1a]`) → `onCancelDouble`; "Add second bubble" (`border border-rose-500/50 text-rose-200`) → `onConfirmDouble`.
- `Escape` inside the popover → `onCancelDouble`. A pointer-down outside the popover → `onCancelDouble`.

## 3.4 `OmrBottomSheet` (mobile only)
```ts
export interface OmrBottomSheetProps { open: boolean; onOpenChange: (open: boolean) => void; bubbled: number; total: number; children: React.ReactNode; }
```
- Wrapper `fixed inset-x-0 bottom-0 z-40 lg:hidden`.
- Closed: a peek bar button, full width, `h-14 flex items-center justify-between px-[18px] rounded-t-2xl border-t border-[var(--eh-paper-edge)] bg-[var(--eh-sheet)] text-[var(--eh-ink)] font-sans text-[13px] font-semibold pb-[env(safe-area-inset-bottom)]`, text "Answer sheet" + `<span className="font-medium text-[var(--eh-ink-soft)]">{bubbled}/{total} bubbled</span>` + `ChevronUp`. `aria-expanded={false}`.
- Open: a panel `h-[75vh] rounded-t-2xl bg-[var(--eh-sheet)] border-t border-[var(--eh-paper-edge)] flex flex-col` with a header row ("Answer sheet" + a close button with `aria-label="Close answer sheet"` and the `X` icon, focused on open) and a scroll area `overflow-y-auto px-3 pb-[calc(12px+env(safe-area-inset-bottom))]` containing `children` (the `sheet` variant).
- `Escape` closes. Only the `transform` animates (180 ms), and nothing animates under reduced motion.

# 4. Deterministic Acceptance Criteria
1. `npm run lint` and `npm run build` exit 0.
2. `grep_search` `OmrSheet.tsx` for each exact string: `ANSWER SHEET`, `Filled = answered`, `Ring = circled in booklet`, `Flag = revisit`, `Struck number = invalid`, `already has (`, `A second bubble makes this answer invalid and it will be marked wrong (−0.66).`, `Keep (`, `Add second bubble`, `Close answer sheet`, `bubbled` → each ≥ 1.
3. `grep_search` for `tabIndex` shows the roving pattern (a conditional `0 : -1` expression) and `tabIndex={-1}` on number buttons.
4. `grep_search` `OmrSheet.tsx` for `fetch|setInterval|localStorage|examApi` → 0.
5. Hard boundary respected.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - write_to_file
    - run_command
    - grep_search
    - view_file
  duration_ms: 2800
  exit_codes:
    lint: 0
    build: 0
    test_exam: 0
criterion_2_string_hits:
  "ANSWER SHEET": 1
  "Filled = answered": 1
  "Ring = circled in booklet": 1
  "Flag = revisit": 1
  "Struck number = invalid": 1
  "already has (": 1
  "A second bubble makes this answer invalid and it will be marked wrong (−0.66).": 1
  "Keep (": 1
  "Add second bubble": 1
  "Close answer sheet": 1
  "bubbled": 3
criterion_3_grep_output: |
  Line 176: tabIndex={-1}
  Line 201: tabIndex={isBubbleFocused ? 0 : -1}
  Line 283: tabIndex={-1}
files_created:
  - "src/components/exam/OmrSheet.tsx"
```

# 6. Orchestrator Verification Note (2026-09-24)

Confirmed:
- one roving tab stop with arrow/Home/End movement, and number buttons at `tabIndex=-1`;
- the popover is `role=alertdialog` with Keep autofocused, and Escape or an outside tap cancels it;
- the bottom sheet closes on Escape and focuses its close button;
- auto-scroll uses `block:'nearest'` without moving focus.

Defects fast-followed in **TASK_077 U4/U5/U7/U8/U10/U11**:
- the grid's `onKeyDown` takes Space/Enter from the popover's own buttons, so Keep re-sends the bubble and "Add second bubble" can't be reached by keyboard;
- the `left-8 w-64` popover is clipped for second-column rows;
- every mounted instance cancels the pending double on outside pointerdown, which breaks confirmation on mobile (see TASK_071 dual mount);
- the invalid row number stays navy because of the same colour-class ordering issue;
- focus isn't returned to the peek bar;
- the component isn't memoised and does a quadratic `findIndex` per row.
