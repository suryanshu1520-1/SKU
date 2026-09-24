---
task_id: "TASK_067_EXAM_BOOKLET_UI"
status: "VERIFIED_PARTIAL"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 3500
  output_diff_max: 5000
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_064_EXAM_CLIENT_STATE_CORE", "TASK_065_EXAM_CLIENT_API_LAYOUT_AND_CUTOFFS"]
queue_gate: "SOFT — needs types.ts, lib/itemLayout.ts, lib/clock.ts."
blueprint: "strategy/design/exam-hall-blueprint.md §8, §11, §15 · visual target: strategy/design/exam-hall-mockup.html (screen 'Sitting', booklet column; screen 'Scorecard', review item)"
---

# 0. Batch rules
Same as TASK_059 §0. Presentational components only: no fetches, no timers, no localStorage.

# 1. High-Density Distilled Objective
Build the question booklet exactly as the mockup shows it. It is a paper surface with serif print, "(a)–(d)" options in a 2×2 grid or one column, a strike toggle on every option, and a Sure / 50:50 / Guess control, a Revisit flag and a plain-language state line under each question. Below `lg` each question also gets an inline answer-sheet row. The same component renders a non-interactive **review** mode for the scorecard. Also create the scoped token stylesheet `exam.css` (Paper and Night themes).

# 2. Transcluded Context References
- Mockup `strategy/design/exam-hall-mockup.html`: CSS blocks `.booklet`, `.q`, `.opt`, `.lab`, `.strike`, `.tools`, `.seg`, `.flagbtn`, `.state`, `.pagemark`, `.inline-row`, `.rv-head`, `.opt.correct`, `.tag`, `.expl`. Open it in `browser_subagent` or `view_file` for the visual target.
- Blueprint §8 (token table, typography), §11 (booklet spec, exact state copy, review mode), §15 (a11y).
- `src/components/arena/AnswerOption.tsx:3-5, 55-61` — how the repo renders option markdown (react-markdown + remark-gfm + rehype-sanitize, `p` mapped to `span`). Reuse the imports, not the component.
- `src/components/exam/types.ts` (`PaperItem`, `ItemResult`, `OptionKey`, `Confidence`, `RulesPreset`, `SUBJECT_LABELS`), `lib/itemLayout.ts` (`normalizeStemMarkdown`, `optionLayout`, `pageNumberAfter`), `lib/clock.ts` (`formatSignedMarks`, `formatDuration`).
- Icons: `lucide-react` `Strikethrough`, `Flag`.

# 2.5 Scope fence
Create: `src/components/exam/exam.css`, `src/components/exam/Booklet.tsx`, `src/components/exam/BookletItem.tsx`.
Modify: nothing.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` the mockup's CSS for the classes listed above, plus blueprint §8 and §11.
2. `write_to_file` `exam.css` per §3.1, then `BookletItem.tsx` per §3.2 and `Booklet.tsx` per §3.3.
3. `run_command` `npm run lint`, `npm run build`.

## 3.1 `exam.css`
- `.exam-hall { … }` defines every `--eh-*` token in blueprint §8 with its **Paper** value, plus `--eh-hover: rgba(7, 46, 99, 0.045)`. `.exam-hall[data-booklet='night'] { … }` redefines them with the **Night** values, plus `--eh-hover: rgba(224, 208, 171, 0.05)`.
- Stem typography for react-markdown output under `.eh-stem`:
  - `p { margin: 0 0 0.625rem }`
  - `ol { list-style: decimal; padding-left: 1.5rem; margin: 0.625rem 0; display: grid; gap: 0.25rem }`
  - `ul { list-style: disc; padding-left: 1.5rem; margin: 0.625rem 0 }`
  - `table { width: 100%; border-collapse: collapse; margin: 0.75rem 0 0.875rem; font-size: 15px }`
  - `th, td { border: 1px solid var(--eh-paper-edge); padding: 0.375rem 0.75rem; text-align: left; vertical-align: top }`
  - `th, strong { font-weight: 600 }`
- `.eh-bubble-fill { animation: eh-fill 120ms ease-out }` with `@keyframes eh-fill { from { transform: scale(0.8) } to { transform: scale(1) } }`, and `@media (prefers-reduced-motion: reduce) { .eh-bubble-fill { animation: none } }`.
- Nothing else. No global selectors outside `.exam-hall` / `.eh-*`.

## 3.2 `BookletItem.tsx` (export `BookletItem`, wrapped in `React.memo`)
```ts
export interface BookletHandlers {
  onChoose: (qid: string, key: OptionKey) => void;
  onStrike: (qid: string, key: OptionKey) => void;
  onTag: (qid: string, c: Confidence) => void;
  onFlag: (qid: string) => void;
  onTransfer: (qid: string) => void;
  onUndo: (qid: string) => void;
  onBubble: (qid: string, key: OptionKey) => void;
  onActivate: (qid: string) => void;
}
export interface BookletItemProps {
  item: PaperItem;
  mode: 'sitting' | 'review';
  rules: RulesPreset;
  bubbled: OptionKey[];
  circled: OptionKey | null;
  struck: OptionKey[];
  confidence: Confidence | null;
  flagged: boolean;
  isActive: boolean;
  inGrace: boolean;
  handlers?: BookletHandlers;        // required in sitting mode
  result?: ItemResult;               // required in review mode
  explanation?: string;              // review mode
  registerItem?: (qid: string, el: HTMLElement | null) => void;
}
```
Structure and classes (sitting mode):
- Root `<article id={`q-${n}`} tabIndex={-1} aria-labelledby={`q-${n}-label`}>` with classes `relative grid grid-cols-[2rem_minmax(0,1fr)] sm:grid-cols-[2.5rem_minmax(0,1fr)] py-[18px] scroll-mt-[168px] md:scroll-mt-[72px] focus:outline-none`. When `isActive`, add `before:content-[''] before:absolute before:-left-3 sm:before:-left-5 before:top-[22px] before:bottom-[22px] before:w-0.5 before:rounded before:bg-[var(--eh-print)]`. `onPointerDown` and `onFocusCapture` call `handlers.onActivate(qid)`. `ref` calls `registerItem`.
- Gutter `<div aria-hidden="true" className="font-semibold tabular-nums">{n}.</div>` and `<h3 id={`q-${n}-label`} className="sr-only">Question {n}</h3>`.
- Stem `<div className="eh-stem max-w-[68ch]">` → `Markdown` with `remarkGfm` and `rehypeSanitize`, rendering `normalizeStemMarkdown(item.stem)`. Components: `table` is wrapped in `<div className="overflow-x-auto">`.
- Options container: `optionLayout(options) === 'grid'` → `mt-2.5 grid gap-x-6 gap-y-0.5 sm:grid-cols-2`; otherwise `mt-2.5 grid gap-y-0.5`.
- Each option row `<div className="flex items-start gap-2">` contains:
  - The choose button: `flex flex-1 items-start gap-2.5 min-h-[44px] px-1.5 py-1 text-left rounded-md hover:bg-[var(--eh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--eh-paper)]`, with `aria-pressed` = (exam_day: `circled === key`; practice: `bubbled.includes(key)`) and `aria-describedby` = the state-line id. Its `onClick` calls `handlers.onChoose(qid, key)`.
  - Its label span, base `w-[30px] h-[30px] shrink-0 grid place-items-center rounded-full font-serif text-base text-[var(--eh-ink-soft)] transition-shadow`:
    - when `bubbled.includes(key)` → add `bg-[var(--eh-bubble-ink)] text-[var(--eh-bubble-letter)]`
    - else when `circled === key` → add `shadow-[0_0_0_1.5px_var(--eh-pencil)] text-[var(--eh-ink)] font-semibold`
  - Its text span (react-markdown, `p` → `span`), base `pt-0.5`; circled → `font-semibold`; struck → `line-through text-[var(--eh-ink-faint)] opacity-55`.
  - The strike button: `shrink-0 grid place-items-center w-11 h-11 lg:w-8 lg:h-8 rounded-md text-[var(--eh-ink-faint)] opacity-45 hover:opacity-100 focus-visible:opacity-100 aria-pressed:opacity-100 aria-pressed:text-[var(--eh-ink)]`, `aria-pressed={isStruck}`, `aria-label` "Strike out option a" / "Restore option a" (lowercase letter), icon `Strikethrough w-4 h-4` with `aria-hidden`.
- Tools row `mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-2 font-sans text-xs text-[var(--eh-ink-soft)]`:
  - Confidence `role="radiogroup" aria-label={`Confidence for question ${n}`}` with three `role="radio"` buttons "Sure", "50:50", "Guess" in `inline-flex rounded-full border border-[var(--eh-paper-edge)] overflow-hidden`. Each button is `px-2.5 py-1`; `aria-checked` → `bg-[var(--eh-ink)] text-[var(--eh-paper)]`. Clicking the checked one clears it (`onTag` handles the toggle).
  - Revisit toggle: `aria-pressed` button, `inline-flex items-center gap-1.5 rounded-full border border-[var(--eh-paper-edge)] px-2 py-1`; pressed → `text-[var(--eh-flag)] border-[var(--eh-flag)]`; icon `Flag w-3 h-3`; label "Revisit".
  - State line `<span id=… className="ml-auto inline-flex items-center gap-2">`, exact copy:
    - `bubbled.length >= 2` → "Invalid · two bubbles" in `text-[var(--eh-danger)] font-semibold`
    - `bubbled.length === 1` → "On your sheet: ({x})"; when `inGrace` (exam_day), also a pill button "Undo" + `<kbd>U</kbd>` → `onUndo`
    - exam_day and `circled` with no bubble → "Circled ({x}) · not on your sheet" in `text-[var(--eh-pencil-text)] font-semibold`, plus a pill button "Bubble it" + `<kbd>↵</kbd>` → `onTransfer`
    - otherwise empty.
    The pill class is `rounded-full bg-[var(--eh-ink)] text-[var(--eh-paper)] px-2.5 py-0.5 text-[11.5px] font-semibold`. `{x}` is the lowercase letter.
- Inline answer row (**below lg only**, `lg:hidden`): `mt-3 flex items-center gap-3 rounded-lg border border-[var(--eh-paper-edge)] bg-[var(--eh-sheet)] px-3 py-2`. It holds the label "Answer sheet" (`font-sans text-[11px] uppercase tracking-[0.08em] text-[var(--eh-print)]`) and then `ml-auto flex gap-2` with four `role="radio"` buttons in a `role="radiogroup" aria-label={`Answer sheet, question ${n}`}`. Each bubble is `relative w-11 h-11 grid place-items-center`, with an inner 30 px circle (`w-[30px] h-[30px] rounded-full border-[1.25px] border-[var(--eh-print)] font-mono text-xs text-[var(--eh-print)]`). Filled → inner circle `bg-[var(--eh-bubble-ink)] border-[var(--eh-bubble-ink)] text-[var(--eh-bubble-letter)]`, plus the `eh-bubble-fill` class on mount of the filled state. Clicking calls `onBubble(qid, key)`. `aria-label` "Question {n} option {x}".

Review mode (`mode === 'review'`, driven by `result`):
- No buttons: options render as `div`s; the tools row and inline row are omitted.
- Header line above the stem (inside the right column): `font-sans text-[12.5px] text-[var(--eh-ink-soft)] flex flex-wrap gap-x-3.5 gap-y-1 mb-1`:
  - verdict: correct "+2.00" in `text-[var(--eh-correct)]`; wrong "−0.66"; invalid "−0.66 · invalid"; blank "0.00 · blank"; wrong and invalid use `text-[var(--eh-danger)]`; all `font-mono font-bold`
  - meta: "UPSC {year} · {SUBJECT_LABELS[subject]}", plus " · {formatDuration(dwellSeconds)} on this question" when dwell > 0.
- Option decoration:
  - the correct option gets `shadow-[inset_3px_0_0_var(--eh-correct)]` and the tag "Correct answer" (`ml-2 rounded-full border px-1.5 text-[11px] font-semibold font-sans` in `--eh-correct`)
  - each option in `result.bubbled` gets the tag "Your answer" (`--eh-correct` when the verdict is correct, else `--eh-danger`) and the filled label style
  - circled and struck styles apply at `opacity-60`.
- Explanation block: `mt-3 pt-3 border-t border-[var(--eh-paper-edge)] text-[15px]`, label "Explanation · written by Tark, not UPSC" (`font-sans text-[11.5px] font-semibold text-[var(--eh-ink-faint)]`), then the explanation markdown (sanitized). When it is empty: "No explanation in our bank for this question yet."

## 3.3 `Booklet.tsx` (export `Booklet`)
```ts
export interface BookletProps {
  items: PaperItem[];
  mode: 'sitting' | 'review';
  rules: RulesPreset;
  sheet?: ResponseSheet;                        // sitting
  results?: Record<string, ItemResult>;         // review
  explanations?: Record<string, string>;        // review
  activeQid: string | null;
  graceQids: ReadonlySet<string>;
  handlers?: BookletHandlers;
  registerItem?: (qid: string, el: HTMLElement | null) => void;
}
```
- `<section aria-label="Question booklet" className="rounded-md border border-[var(--eh-paper-edge)] bg-[var(--eh-paper)] text-[var(--eh-ink)] shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.35)] px-5 py-6 sm:px-10 sm:py-10 font-serif text-base lg:text-[17px] leading-[1.65]">`.
- Sitting mode: per item, pass `bubbled = sheet.bubbles[qid] ?? EMPTY`, `circled`, `struck`, `confidence`, `flagged`, `isActive = qid === activeQid` and `inGrace = graceQids.has(qid)`. `EMPTY` is a module-level frozen `[]`, so memoised items don't re-render.
- Review mode: feed the same props from `results[qid]`.
- After an item where `pageNumberAfter(n)` is non-null: `<div aria-hidden="true" className="text-center font-mono text-[11px] text-[var(--eh-ink-faint)] pt-3.5 pb-0.5">— {page} —</div>`.

# 4. Deterministic Acceptance Criteria
1. `npm run lint` and `npm run build` exit 0.
2. `grep_search` `src/components/exam/Booklet*.tsx` for `fetch|setInterval|setTimeout|localStorage|examApi` → 0 matches.
3. `grep_search` for every exact string: `Circled (`, `not on your sheet`, `On your sheet: (`, `Invalid · two bubbles`, `Bubble it`, `Revisit`, `Answer sheet`, `Correct answer`, `Your answer`, `Explanation · written by Tark, not UPSC`, `No explanation in our bank for this question yet.`, `Strike out option`, `Restore option` → each ≥ 1 hit.
4. `BookletItem` is exported through `React.memo`: `grep_search` `memo(` → ≥ 1 hit in `BookletItem.tsx`.
5. `exam.css` defines all 17 tokens from blueprint §8 plus `--eh-hover`, in both themes (paste the `grep_search` `--eh-` count per selector block).
6. Hard boundary respected.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - write_to_file
    - replace_file_content
    - run_command
    - grep_search
    - view_file
  duration_ms: 3200
  exit_codes:
    lint: 0
    build: 0
    test_exam: 0
criterion_2_grep_output: "No results found"
criterion_3_string_hits:
  "Circled (": 1
  "not on your sheet": 1
  "On your sheet: (": 1
  "Invalid · two bubbles": 1
  "Bubble it": 1
  "Revisit": 1
  "Answer sheet": 2
  "Correct answer": 1
  "Your answer": 1
  "Explanation · written by Tark, not UPSC": 1
  "No explanation in our bank for this question yet.": 1
  "Strike out option": 1
  "Restore option": 1
criterion_5_token_counts:
  paper_theme_tokens: 18
  night_theme_tokens: 18
  total_eh_declarations: 36
files_created:
  - "src/components/exam/exam.css"
  - "src/components/exam/BookletItem.tsx"
  - "src/components/exam/Booklet.tsx"
```

# 6. Orchestrator Verification Note (2026-09-24)

Confirmed:
- `React.memo` with stable props (the reducer preserves array identity; `Booklet` uses a frozen EMPTY constant);
- all copy exact, with U+2212 and U+2026 preserved;
- roles and aria attributes present.

Defect fast-followed in **TASK_077 U7/U11**: the option label combines a base `text-[var(--eh-ink-soft)]` with the state colour. The built CSS emits ink-soft later, so bubbled labels render at about 2.2:1 contrast (Paper) or 1.2:1 (Night), and circled labels lose `--eh-ink`. **Root cause: this contract's spec**, which asked for state classes to be *added* on top of a base colour class. Inline react-markdown `components` objects remount on each item update (perf nit).
