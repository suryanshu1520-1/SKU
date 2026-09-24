---
task_id: "TASK_073_EXAM_REVIEW_BOOKLET"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
token_budget:
  input_context_max: 5500
  thinking_budget_tokens: 1500
  output_diff_max: 2500
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_067_EXAM_BOOKLET_UI", "TASK_072_EXAM_SCORECARD_SUMMARY"]
queue_gate: "SOFT — fills the `{/* TASK_073: ReviewBooklet */}` slot in ExamScorecard.tsx."
blueprint: "strategy/design/exam-hall-blueprint.md §11 (review mode), §16.8 · visual target: mockup screen 'Scorecard', block 'Review your paper'"
---

# 0. Batch rules
Same as TASK_059 §0.

# 1. High-Density Distilled Objective
Add the question-by-question review: the booklet reopened in review mode with the correct answer, the candidate's bubble, their circles, strikes and tags, time spent, year and subject, and Tark's explanation. It has filters "All · Wrong · Blank · Invalid · Circled, not bubbled · Revisit" and a subject select. It reuses `Booklet` in `mode="review"`; do not build a second question renderer.

# 2. Transcluded Context References
- `src/components/exam/Booklet.tsx` (`BookletProps`: `items`, `mode`, `rules`, `results`, `explanations`, `activeQid`, `graceQids`).
- `src/components/exam/scorecard/ExamScorecard.tsx` — the `{/* TASK_073: ReviewBooklet */}` slot; `response.paper` (booklet order), `response.result.items`, `response.explanations`.
- Mockup `.filters` and `.review` CSS.
- `src/components/exam/types.ts` (`SUBJECT_LABELS`, `ItemResult`, `PaperItem`).

# 2.5 Scope fence
Create: `src/components/exam/scorecard/ReviewBooklet.tsx`.
Modify: `src/components/exam/scorecard/ExamScorecard.tsx` (replace the slot comment with `<ReviewBooklet response={response} />` only).

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` `Booklet.tsx` (props) and the slot in `ExamScorecard.tsx`.
2. `write_to_file` `ReviewBooklet.tsx` per §3.1.
3. `replace_file_content` the slot.
4. `run_command` `npm run lint`, `npm run build`.

## 3.1 `ReviewBooklet`
```ts
export interface ReviewBookletProps { response: SubmitResponse; }
type Filter = 'all' | 'wrong' | 'blank' | 'invalid' | 'circled' | 'revisit';
```
- `results = Object.fromEntries(response.result.items.map(i => [i.qid, i]))`.
- Filter predicates on `ItemResult`:
  - `wrong` → `verdict === 'wrong'`
  - `blank` → `verdict === 'blank'`
  - `invalid` → `verdict === 'invalid'`
  - `circled` → `circled !== null && bubbled.length === 0`
  - `revisit` → `flagged`
  - `all` → true
- Subject select (`<label htmlFor="review-subject" className="sr-only">Subject</label>`): "All subjects", then each subject present in the result, labelled via `SUBJECT_LABELS`, in first-appearance order.
- Visible items = `response.paper` filtered by both controls, in booklet order.
- Markup:
  - `h2` "Review your paper".
  - Filter chips `role="group" aria-label="Filter questions"`, each an `aria-pressed` button: "All", "Wrong", "Blank", "Invalid", "Circled, not bubbled", "Revisit", each with a count, e.g. "Wrong (27)". Chips with a zero count are disabled, except "All".
  - The subject select.
  - A line "Showing {k} of {n}".
  - `<Booklet mode="review" items={visible} rules={response.result.rules} results={results} explanations={response.explanations} activeQid={null} graceQids={EMPTY_SET} />`.
  - When `visible` is empty, render "No questions match this filter." instead of the booklet.
- Default filter: `'wrong'` when the wrong count is > 0, otherwise `'all'`.

# 4. Deterministic Acceptance Criteria
1. `npm run lint` and `npm run build` exit 0.
2. `grep_search` `ReviewBooklet.tsx` for `Review your paper`, `Circled, not bubbled`, `All subjects`, `No questions match this filter.`, `Showing `, `mode="review"` → each ≥ 1.
3. `grep_search` `ExamScorecard.tsx` for `TASK_073: ReviewBooklet` → 0; `<ReviewBooklet` → 1.
4. `grep_search` `ReviewBooklet.tsx` for `Markdown|react-markdown` → 0 (rendering stays in `Booklet`).
5. Hard boundary respected.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: ["view_file", "write_to_file", "multi_replace_file_content", "run_command"]
  duration_ms: 65000
  exit_codes:
    lint: 0
    build: 0
    test_exam: 0
criterion_2_string_hits:
  Review your paper: 1
  Circled, not bubbled: 1
  All subjects: 1
  No questions match this filter.: 1
  Showing : 1
  mode="review": 1
criterion_3_grep_output: "TASK_073: ReviewBooklet: 0 matches; <ReviewBooklet: 1 match (ExamScorecard.tsx:89)"
files_created:
  - "src/components/exam/scorecard/ReviewBooklet.tsx"
files_modified:
  - "src/components/exam/scorecard/ExamScorecard.tsx"
```

# 6. Orchestrator Verification Note (2026-09-24)

- All required strings are present.
- The slot is replaced by `<ReviewBooklet response={response} />`.
- No markdown re-implementation: rendering stays in `Booklet` `mode="review"`.
- `lint` and `build` exit 0.
- Visual verification is deferred to TASK_075.
