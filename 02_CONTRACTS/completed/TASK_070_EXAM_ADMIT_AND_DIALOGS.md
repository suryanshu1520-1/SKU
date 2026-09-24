---
task_id: "TASK_070_EXAM_ADMIT_AND_DIALOGS"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 3500
  output_diff_max: 5000
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_067_EXAM_BOOKLET_UI", "TASK_069_EXAM_BAR_AND_ANNOUNCEMENTS"]
queue_gate: "SOFT — needs exam.css tokens, types.ts, lib/clock.ts, lib/bell.ts."
blueprint: "strategy/design/exam-hall-blueprint.md §9, §13 · visual target: mockup screen 'Admit slip' and the 'Hand in your answer sheet?' dialog on screen 'Sitting'"
---

# 0. Batch rules
Same as TASK_059 §0. Presentational components only.

# 1. High-Density Distilled Objective
Build the four ritual surfaces that frame a sitting:
1. The **admit slip**: particulars, a rules preset, UPSC-style instructions, **booklet-series encoding** (exam-day rules must match to proceed), options, the declaration, and "Break the seal and start".
2. The **hand-in dialog**, with the last-look tallies and jump chips.
3. The **pens-down** overlay.
4. The **resume** prompt for a paper that kept running while the candidate was away.
Every string is exact, from blueprint §9 and §13.

# 2. Transcluded Context References
- Mockup: `#screen-admit` markup and CSS (`.admit`, `.eyebrow`, `.parts-grid`, `.rules-seg`, `.instr`, `.series-row`, `.opts-row`, `.decl`, `.admit-acts`, `.foot`), and `#handInDialog` (`.dialog`, `.stat-grid`, `.stat`, `.qchips`).
- Blueprint §9 (admit, all copy), §13 (hand-in, pens down, resume, all copy).
- `src/components/shared/Modal.tsx:5-24` — the `Modal` props (`isOpen`, `onClose`, `title`, `subtitle`, `maxWidth`, `showCloseButton`). It already handles Escape and dialog roles (TASK_058). Use it for hand-in.
- `src/components/exam/types.ts` (`PaperCode`, `SectionSubject`, `CatalogResponse`, `ExamPrefs`, `RulesPreset`, `Series`, `ActiveAttempt`, `SUBJECT_LABELS`, `PAPER_SHORT_TITLES`), `lib/clock.ts` (`durationLabel`, `hallEnd`, `formatTimeLeft`), `lib/bell.ts` (`primeBell`).

# 2.5 Scope fence
Create: `src/components/exam/AdmitCard.tsx`, `src/components/exam/HandInDialog.tsx`, `src/components/exam/PensDown.tsx`, `src/components/exam/ResumePrompt.tsx`.
Modify: nothing.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` the mockup admit + dialog markup and blueprint §9, §13.
2. `write_to_file` the four components per §3.1–§3.4.
3. `run_command` `npm run lint`, `npm run build`.

## 3.1 `AdmitCard`
```ts
export interface AdmitCardProps {
  paperCode: PaperCode;
  subject?: SectionSubject;
  catalog: CatalogResponse | null;
  candidateName: string | null;
  roll: string;
  series: Series;
  prefs: ExamPrefs;
  starting: boolean;
  error: string | null;
  onPrefsChange: (patch: Partial<ExamPrefs>) => void;
  onStart: (rules: RulesPreset, opts: { fullscreen: boolean }) => void;
  onBack: () => void;
}
```
- Layout: a centred paper card `mx-auto w-full max-w-3xl mt-7 mb-10 rounded-md border border-[var(--eh-paper-edge)] bg-[var(--eh-paper)] text-[var(--eh-ink)] shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-5 py-6 sm:px-10 sm:py-8 font-serif`.
- Paper facts come from `catalog?.papers` by code. If the catalog hasn't loaded, fall back to: FULL 100 questions / 7200 s, HALF 50 / 3600 s, SECTION 25 / 1800 s.
- Content, in order (copy exact; `{…}` substituted):
  1. Eyebrow "Tark Exam Hall · Admit slip". `h1` (`text-[28px] font-semibold tracking-[-0.01em] text-balance`) = the paper title: "General Studies Paper I · Full paper" / "· Half paper" / "· Sectional". Subtitle (`font-sans text-sm text-[var(--eh-ink-soft)]`): "{n} questions · {durationLabel} · Series {S}".
  2. Particulars grid (2 columns ≥ sm, 1 column below; bordered cells like the mockup): "Candidate" `{candidateName ?? 'Candidate'}` · "Roll No." `{roll}` · "Booklet series" `{S}` · "Hall clock" "09:30 – {hallEnd(duration)}" · "Marking" "+2 · −0.66 · 0" · "Paper" "GS-I". Values are `font-mono`.
  3. `h2` "Rules for this sitting", then a `role="radiogroup"` with two `role="radio"` cards:
     - "Exam-day rules" / "Circle in the booklet, commit on the answer sheet. Ink is permanent after 5 seconds."
     - "Practice rules" / "Tap an option to bubble it. You can erase and change answers."
     Local state starts at `prefs.rules`.
  4. `h2` "Instructions", then an `ol` with the 5 base items from blueprint §9.4 (substitute `{n}` and `{end}`). With exam-day rules selected, append the two exam-day items.
  5. Exam-day only: `h2` "Encode your booklet series". Four bubbles, 26 px, lowercase letters, `aria-label` "Series A"…"Series D", `role="radio"` in a `role="radiogroup" aria-label="Booklet series"`. Help text before choosing: "Your booklet is Series {S}. Fill the matching bubble. In the real exam, a wrong series code can void your answer sheet." After a correct choice: "Series {S} encoded." After a wrong choice (in `text-[var(--eh-danger)]`): "That's not your series. Your booklet is Series {S}."
  6. `h2` "Options": checkbox "Hall bell at time checks (sound)" (bound to `prefs.bell` via `onPrefsChange`); segmented "Booklet: Paper | Night" (bound to `prefs.booklet`); checkbox "Full screen while I write" (local state, default off; hidden when `!document.fullscreenEnabled`).
  7. Declaration checkbox (required): "I have read the instructions."
  8. Primary button "Break the seal and start". It is enabled only when the declaration is checked, and (practice rules, or the encoded series equals `series`), and `!starting`. While `starting` its label is "Distributing your booklet…". On click: `primeBell()` then `onStart(rules, { fullscreen })`. Style: `bg-[var(--eh-ink)] text-[var(--eh-paper)] px-[18px] py-2.5 rounded-md font-sans font-bold disabled:opacity-40`. Secondary text button "Back to Arena" → `onBack`.
  9. `error` (when non-null) as `role="alert"` text in `--eh-danger` above the buttons.
  10. Footer (`mt-5 pt-3.5 border-t border-[var(--eh-paper-edge)] font-sans text-[12.5px] leading-relaxed text-[var(--eh-ink-soft)] space-y-1.5`):
     - composition line: "This paper: " + the blueprint entries with count > 0, labelled with `SUBJECT_LABELS` and joined by " · " (e.g. "Economy 34 · Environment 24 · Geography 21 · History & Culture 15 · Polity 5 · General 1"). For a single-subject sectional: "This paper: {label} 25".
     - then the provenance footnote from blueprint §4, verbatim.
- All form controls have stable `id`s and `<label htmlFor>`.

## 3.2 `HandInDialog`
```ts
export interface HandInDialogProps {
  open: boolean;
  submitting: boolean;
  bubbled: number; blank: number; invalidQids: number[];
  circledOnly: { qid: string; n: number }[];
  flagged: { qid: string; n: number }[];
  secondsLeft: number; hallEndLabel: string;
  onClose: () => void; onConfirm: () => void; onJump: (qid: string) => void;
}
```
- `Modal` with `isOpen={open}`, `title="Hand in your answer sheet?"` and `maxWidth="max-w-lg"`.
- A 2-column stat grid (like the mockup `.stat`): "Bubbled {b}" · "Blank {n}" · "Circled, not bubbled {k}" (amber value; question chips "Q{n}", each a button that calls `onClose()` then `onJump(qid)`) · "To revisit {r}" (chips) · "Invalid rows {i}" (rose; only when > 0).
- Line: "{formatTimeLeft(secondsLeft)} left on the clock. You can keep working until {hallEndLabel}."
- Buttons: "Keep working" (`autoFocus`, gold) → `onClose`; "Hand in now" (ghost) → `onConfirm`, disabled while `submitting`.

## 3.3 `PensDown`
`{ hallEndLabel: string }` → `<div role="alertdialog" aria-modal="true" aria-labelledby="pens-down-title" className="fixed inset-0 z-50 grid place-items-center bg-[rgba(2,8,20,0.82)] p-4">` holding a card (`bg-surface border border-border rounded-xl px-8 py-7 text-center`). Inside: `<h2 id="pens-down-title" tabIndex={-1} className="font-serif text-2xl text-primary">Time. Pens down.</h2>`, focused on mount, and `<p className="mt-2 text-sm text-secondary">{hallEndLabel} on the hall clock. Your answer sheet is being collected.</p>`.

## 3.4 `ResumePrompt`
`{ info: ActiveAttempt; secondsLeft: number; submitting: boolean; onResume: () => void; onHandIn: () => void; onBack: () => void }`
- A paper card like the admit slip, with `h1` "Your paper is still running" and the body "{info.paper.title} · Series {S}. {formatTimeLeft(secondsLeft)} left on the clock. It kept running while you were away."
- Buttons: "Return to the paper" (primary; `primeBell()` then `onResume`); "Hand in now" (secondary) opens an inline confirm "Hand in with the answers saved so far?" with "Hand in" (→ `onHandIn`) and "Cancel"; text button "Back to Arena" → `onBack`.
- `secondsLeft` is passed in by the parent; this component does not compute time.

# 4. Deterministic Acceptance Criteria
1. `npm run lint` and `npm run build` exit 0.
2. `grep_search` for each exact string across the four files: `Tark Exam Hall · Admit slip`, `Rules for this sitting`, `Exam-day rules`, `Practice rules`, `Circle in the booklet, commit on the answer sheet. Ink is permanent after 5 seconds.`, `Tap an option to bubble it. You can erase and change answers.`, `Encode your booklet series`, `In the real exam, a wrong series code can void your answer sheet.`, `That's not your series.`, `I have read the instructions.`, `Break the seal and start`, `Distributing your booklet…`, `Back to Arena`, `About this paper: questions come from UPSC Prelims GS Paper I, 2011–2023`, `Hand in your answer sheet?`, `Circled, not bubbled`, `To revisit`, `Keep working`, `Hand in now`, `Time. Pens down.`, `Your answer sheet is being collected.`, `Your paper is still running`, `It kept running while you were away.`, `Hand in with the answers saved so far?` → each ≥ 1.
3. `grep_search` the four files for `fetch|setInterval|localStorage|examApi` → 0.
4. `AdmitCard.tsx` passes the start-button enable rule by inspection: the receipt quotes the exact `disabled=` expression.
5. Hard boundary respected.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - write_to_file
    - run_command
    - grep_search
    - view_file
  duration_ms: 3400
  exit_codes:
    lint: 0
    build: 0
    test_exam: 0
criterion_2_string_hits: verified_all_24_strings
start_button_disabled_expression: "disabled={!canStart} where canStart = declared && !starting && (localRules === 'practice' || seriesCorrect)"
files_created:
  - "src/components/exam/AdmitCard.tsx"
  - "src/components/exam/HandInDialog.tsx"
  - "src/components/exam/PensDown.tsx"
  - "src/components/exam/ResumePrompt.tsx"
```

# 6. Orchestrator Verification Note (2026-09-24)

- All 24 exact strings are present. "That's not your series." is written as the JSX entity `That&apos;s`, which renders correctly.
- The start-button rule is `declared && !starting && (localRules === 'practice' || seriesCorrect)`, exactly §3.1.8.
- No fetch, timer or localStorage use.
- Visual verification is deferred to TASK_075: the components are not mounted until TASK_074.
