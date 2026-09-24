---
task_id: "TASK_072_EXAM_SCORECARD_SUMMARY"
status: "VERIFIED_PARTIAL"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 5000
  output_diff_max: 5000
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_071_EXAM_HALL_COMPOSITION"]
queue_gate: "SOFT — replaces the scorecard placeholder block in ExamHall.tsx that TASK_071 created."
blueprint: "strategy/design/exam-hall-blueprint.md §16 (1-7, 9) · visual target: mockup screen 'Scorecard' (everything except the 'Review your paper' block, which is TASK_073)"
---

# 0. Batch rules
Same as TASK_059 §0. The scorecard shows results only. It never computes a score; `ExamResult` from the server is the source of truth.

# 1. High-Density Distilled Objective
Build the UPSC-native scorecard:
- net score out of the paper's maximum, with the earned / lost-to-negative-marking split;
- where it sits against **official UPSC cut-offs** (full papers only);
- the **risk ledger**: how Sure / 50:50 / Guess answers and struck options actually paid off;
- sheet discipline, pace against even pace, and subject breakdown;
- next actions.
Every metric carries a plain-language interpretation line produced by pure functions in `scorecard/interpret.ts`. Those functions are unit-tested for exact strings.

# 2. Transcluded Context References
- Blueprint §16 items 1–7 and 9 (order, copy, thresholds). Mockup `#screen-scorecard` markup and CSS (`.score`, `.hero`, `.block`, `.interp`, `table.data`, `.verdict.*`, `.explainer`, `.accbar`, `.disc`, `svg.chart`, `details summary`, `.next`). The mockup's sample numbers are exactly the fixture in §3.3.
- `src/components/exam/types.ts` (`ExamResult`, `LedgerRow`, `SubjectRow`, `SubmitResponse`, `CatalogResponse`, `SUBJECT_LABELS`, `PAPER_SHORT_TITLES`), `lib/clock.ts` (`formatMarks`, `formatSignedMarks`, `formatPercent`, `formatDuration`, `hallClockAtMinute`, `hallEnd`), `data/prelimsCutoffs.ts` (`PRELIMS_CUTOFFS`).
- `src/components/exam/ExamHall.tsx` — the `scorecard` placeholder block (`data-testid="exam-scorecard-placeholder"`) to replace.

# 2.5 Scope fence
Create: `src/components/exam/scorecard/interpret.ts`, `scorecard/ExamScorecard.tsx`, `scorecard/ScoreHero.tsx`, `scorecard/CutoffBand.tsx`, `scorecard/RiskLedger.tsx`, `scorecard/SheetDiscipline.tsx`, `scorecard/PaceChart.tsx`, `scorecard/SubjectTable.tsx`, `scripts/exam-tests/interpret.test.ts`.
Modify: `src/components/exam/ExamHall.tsx` (the scorecard block only), `package.json` (append the test file to `test:exam`).

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` the mockup scorecard and blueprint §16.
2. `write_to_file` `interpret.ts` (§3.1) and its test (§3.3). Run `npm run test:exam` until green **before** building any UI.
3. `write_to_file` the six section components and `ExamScorecard.tsx` (§3.2).
4. `replace_file_content` the placeholder block in `ExamHall.tsx` with `<ExamScorecard response={session.submitResponse!} collectedWhileAway={session.collectedWhileAway} catalog={session.catalog} onSitAnother={() => onStartPaper('GS1_FULL')} onPractise={(s) => onStartPaper('GS1_SECTION', s)} onBack={onExit} />`.
5. `run_command` `npm run test:exam`, `npm run lint`, `npm run build`.

## 3.1 `scorecard/interpret.ts` (pure; exact strings)
```ts
const SUBJECT_ORDER = ['Economy', 'Environment', 'Geography', 'History', 'Polity', 'General Studies'];
export function perAnswerHundredths(row: LedgerRow): number | null;       // attempted === 0 ? null : Math.round(netHundredths / attempted)
export type VerdictTone = 'good' | 'even' | 'bad' | 'few';
export function ledgerVerdict(row: LedgerRow): { label: string; tone: VerdictTone };
export function heroInterpretation(r: ExamResult): string;
export function ledgerHeadline(r: ExamResult): string;
export function disciplineLines(r: ExamResult): string[];
export function paceLines(r: ExamResult): string[];
export function subjectLine(r: ExamResult): string | null;
export function weakestOfferedSubject(r: ExamResult, offered: readonly string[]): string | null;
```
- `ledgerVerdict`, with `p = perAnswerHundredths(row)`:
  - `attempted < 5` → `{ 'Too few to judge', 'few' }`
  - `p >= 30` → `{ 'Worth attempting', 'good' }`
  - `p >= -10` → `{ 'Roughly break-even', 'even' }`
  - otherwise → `{ 'Costing you marks', 'bad' }`
- `heroInterpretation` (first match):
  1. `gross > 0 && penalty * 100 >= 15 * gross` → `` `Negative marking took ${formatMarks(penalty)} marks, ${Math.round((100 * penalty) / gross)}% of what you earned. The risk ledger below shows where.` ``
  2. `blank * 100 >= 30 * questionCount` → `` `You left ${blank} questions blank. The risk ledger shows which kinds were worth a try.` ``
  3. otherwise → `` `${Math.round((100 * correct) / (correct + wrong + invalid))}% of your attempted answers were right.` ``
- `ledgerHeadline` (first match; `s/f/g = byConfidence.sure/fifty/guess`, `pf/pg` their per-answer):
  1. `s.attempted + f.attempted + g.attempted === 0` → "Tag answers Sure, 50:50 or Guess while you write, and this ledger will show which risks pay off for you."
  2. `g.attempted >= 5 && pg < -10` → `` `Guesses cost you ${formatMarks(-pg)} marks each. Leave pure guesses blank.` ``
  3. `f.attempted >= 5 && pf >= 30` → `` `Your 50:50 calls earned ${formatMarks(pf)} marks each. Keep taking them.` `` plus `' Pure guesses only broke even.'` when `g.attempted >= 5 && pg >= -10 && pg < 30`
  4. `f.attempted >= 5 && pf < -10` → `` `Your 50:50 calls cost ${formatMarks(-pf)} marks each. Rule out one more option before you attempt.` ``
  5. otherwise → "Your tagged answers roughly broke even. The options-struck table below shows where your odds improve."
- `disciplineLines`, in this order, each line only when its count is > 0:
  - `k = circledNotBubbled`, `kc = circledNotBubbledCorrect`, `net = 200 * kc - 66 * (k - kc)`:
    - `k === 1 && kc === 1` → "1 answer circled in the booklet never reached your sheet. It was right; bubbling it would have added 2.00 marks."
    - `k === 1 && kc === 0` → "1 answer circled in the booklet never reached your sheet. It was wrong; bubbling it would have cost 0.66 marks, so leaving it blank was right."
    - `k > 1` → `` `${k} answers circled in the booklet never reached your sheet. ${kc} of them ${kc === 1 ? 'was' : 'were'} right; ` `` + (`net > 0` ? `` `bubbling them would have added ${formatMarks(net)} marks.` `` : `` `bubbling them would have cost ${formatMarks(-net)} marks, so leaving them blank was right.` ``)
  - `` `${t} ${t === 1 ? 'answer' : 'answers'} changed while bubbling: ${changedRightToWrong} right → wrong, ${changedWrongToRight} wrong → right.` `` (with `t = changedAtTransfer`)
  - `` `${i} ${i === 1 ? 'row' : 'rows'} double-marked (−${formatMarks(66 * i)}).` `` (with `i = r.invalid`)
  - `` `You left the exam tab ${n} ${n === 1 ? 'time' : 'times'} (${formatDuration(r.awaySeconds)}).` `` (with `n = r.awayCount`)
  - When no line was produced → `['Clean sheet: every circled answer made it onto your answer sheet.']`
- `paceLines`:
  - `half = Math.ceil(questionCount / 2)`, `evenMinute = Math.ceil(durationSeconds / 120)`, `hit = pace.find(p => p.bubbled >= half)`, `last = pace[pace.length - 1]`.
  - Line 1: `hit` → `` `You bubbled half the paper by ${hallClockAtMinute(hit.minute)}; even pace gets there at ${hallClockAtMinute(evenMinute)}.` ``; otherwise → `` `You bubbled ${last.bubbled} of ${questionCount} answers; even pace reaches half the paper by ${hallClockAtMinute(evenMinute)}.` ``
  - Line 2: when `submitMode === 'manual'` and `m = Math.round((durationSeconds - timeUsedSeconds) / 60)` is > 0 → `` `You handed in with ${m} ${m === 1 ? 'minute' : 'minutes'} left.` ``; otherwise → "You used the full time."
- `subjectLine`:
  - Consider subjects with `total >= 5`, iterated in `SUBJECT_ORDER`; `per = Math.round(net / total)`.
  - Fewer than 2 subjects qualify → `null`.
  - Strongest = max `per` (first one on ties); weakest = min `per` (first one on ties).
  - Returns `` `Strongest: ${label(s)} (${formatMarks(ps)} per question). Weakest: ${label(w)} (${formatMarks(pw)} per question).` `` where `label = SUBJECT_LABELS`.
- `weakestOfferedSubject`: among `total >= 5` subjects that are also in `offered`, return the data label with the minimum `per` (first on ties), or `null`.

## 3.2 UI (match the mockup; semantic tokens on the desk)
- `ExamScorecard` props: `{ response: SubmitResponse; collectedWhileAway: boolean; catalog: CatalogResponse | null; onSitAnother: () => void; onPractise: (subject: SectionSubject) => void; onBack: () => void }`. Container `py-6 grid gap-[22px] max-w-[1080px]`. Sections are separated by `border-t border-border pt-[18px]` blocks with `h2` titles (`text-[15px] font-semibold`). Interpretation lines use `text-sm text-secondary max-w-[72ch]`.
  - Header: `h1` "Your answer sheet has been evaluated"; meta "{paper title} · {date in en-IN format, e.g. 24 Sep 2026}".
  - Banner (when applicable):
    - `result.submitMode === 'timeout'` → "Collected at {hallEnd(duration)} when time ran out."
    - `submitMode === 'recovered'` or `collectedWhileAway` → "Time ran out while you were away. We collected your sheet as it was last saved."
- `ScoreHero`: net `font-mono text-5xl font-semibold` = `formatMarks(net)` with a `<small>` " / {max / 100}". Split line "{c} right · {w} wrong · {i} invalid · {b} blank" (drop the invalid part when 0). Chips: `+{formatMarks(gross)} earned` in emerald, and `−{formatMarks(penalty)} lost to negative marking` in rose, or "No marks lost to negative marking" when penalty is 0. Then `heroInterpretation`.
- `CutoffBand` (only `paperCode === 'GS1_FULL'`; for other papers render just the line "Cut-off comparison is shown for full papers only."):
  - `h2` "Against real cut-offs". SVG `viewBox="0 0 900 96"`: an axis 0–200 with ticks every 25; one dot per `PRELIMS_CUTOFFS` General value, labelled with its year, with labels staggered upward when two are within 34 px (as in the mockup script); a Chamber Gold pin and label "You {net}" at the candidate's marks. `role="img"` with an `aria-label` listing the years above and below the candidate.
  - Caption (exact): "Official UPSC Prelims cut-offs, General category, GS Paper I. Reference only: each cut-off reflects that year's paper, not this one."
  - `<details>` with summary "All categories" → a table (Year, General, EWS, OBC, SC, ST, Source), where each Source is a link "UPSC PDF" (`target="_blank" rel="noopener noreferrer"`) and a null EWS shows "—".
- `RiskLedger`: `h2` "Risk ledger", then `ledgerHeadline`, then two `table.data`-style tables inside `overflow-x-auto`:
  - rows "Sure", "50:50", "Guess", "Not tagged";
  - rows "None", "One", "Two", "Three" for options struck.
  - Columns: "Attempted", "Right", "Wrong", "Accuracy" (`formatPercent(correct, attempted)`), "Net marks" (`formatMarks`), "Per answer" (`formatSignedMarks(perAnswer)`, or "—" when null), "Verdict" (a pill coloured by tone: good emerald, even amber, bad rose, few muted).
  - Explainer (exact): "A wrong answer costs a third of a right one. With four options a blind guess roughly breaks even; every option you can rule out tips the odds your way."
- `SheetDiscipline`: rendered only when `result.rules === 'exam_day'`. `h2` "Sheet discipline" and a `ul` of `disciplineLines`.
- `PaceChart`: `h2` "Pace". SVG `viewBox="0 0 900 230"`:
  - a step line (Chamber Gold, 2 px) of `pace`;
  - a dashed even-pace line from (0, 0) to (duration, questionCount);
  - gridlines at 0/25/50/75/100% of `questionCount`;
  - x labels in hall-clock time every 30 min (every 10 min when duration ≤ 1800);
  - an endpoint dot labelled "{last.bubbled} bubbled".
  `role="img"` with `aria-label` = `paceLines(r)[0]`, plus a `sr-only` table of minute/bubbled. Below it, both `paceLines` lines.
- `SubjectTable`: `h2` "Subjects", then `subjectLine` (when non-null), then a table (Subject via `SUBJECT_LABELS`, Questions, Attempted, Right, Wrong, Net, Accuracy with a 90×6 px bar filled Chamber Gold to `correct / attempted`), in `SUBJECT_ORDER` and skipping absent subjects.
- Next actions (`flex flex-wrap gap-2.5`):
  - primary gold "Sit another full paper" → `onSitAnother`;
  - secondary ghost "Practise {label}: 25 questions, 30 minutes", shown only when `weakestOfferedSubject(result, catalog?.sectionSubjects.map(s => s.subject) ?? [])` is non-null → `onPractise(subject)`;
  - text button "Back to Arena" → `onBack`.
- Leave a clearly marked slot, `{/* TASK_073: ReviewBooklet */}`, between SubjectTable and the next actions.

## 3.3 `scripts/exam-tests/interpret.test.ts` — fixtures and exact expectations
**Sample result `S`** (identical to the mockup):
- totals: `paperCode 'GS1_FULL'`, `rules 'exam_day'`, `questionCount 100`, `durationSeconds 7200`, `correct 56`, `wrong 27`, `invalid 1`, `blank 16`, `grossHundredths 11200`, `penaltyHundredths 1848`, `netHundredths 9352`, `maxHundredths 20000`, `submitMode 'manual'`, `timeUsedSeconds 6960`, `awaySeconds 100`, `awayCount 2`, `items []`
- `bySubject`: `Economy {total 34, attempted 30, correct 21, wrong 9, netHundredths 3606}`, `Environment {24,20,13,7,2138}`, `Geography {21,17,11,6,1804}`, `History {15,12,7,5,1070}`, `Polity {5,4,3,1,534}`, `'General Studies' {1,1,1,0,200}`
- `byConfidence`: `sure {attempted 38, correct 34, wrong 4, netHundredths 6536}`, `fifty {26,14,12,2008}`, `guess {12,3,9,6}`, `untagged {8,5,3,802}`
- `byStruckCount`: `'0' {41,30,11,5274}`, `'1' {22,13,9,2006}`, `'2' {17,11,6,1804}`, `'3' {4,2,2,268}`
- `discipline {circledNotBubbled 3, circledNotBubbledCorrect 2, changedAtTransfer 4, changedRightToWrong 1, changedWrongToRight 3}`
- `pace`: minutes 0,5,…,120 with bubbled `[0,6,12,17,22,27,31,35,38,42,45,47,49,52,55,58,61,64,67,70,74,78,82,84,84]`

Expect:
1. `heroInterpretation(S)` → "Negative marking took 18.48 marks, 17% of what you earned. The risk ledger below shows where."
2. `ledgerHeadline(S)` → "Your 50:50 calls earned 0.77 marks each. Keep taking them. Pure guesses only broke even."
3. `ledgerVerdict(S.byConfidence.sure)` → `{label:'Worth attempting',tone:'good'}`; `…guess` → `{label:'Roughly break-even',tone:'even'}`; `ledgerVerdict(S.byStruckCount['3'])` → `{label:'Too few to judge',tone:'few'}`; `perAnswerHundredths(S.byConfidence.fifty)` → 77.
4. `disciplineLines(S)` deep-equals `["3 answers circled in the booklet never reached your sheet. 2 of them were right; bubbling them would have added 3.34 marks.", "4 answers changed while bubbling: 1 right → wrong, 3 wrong → right.", "1 row double-marked (−0.66).", "You left the exam tab 2 times (1m 40s)."]`.
5. `paceLines(S)` deep-equals `["You bubbled half the paper by 10:35; even pace gets there at 10:30.", "You handed in with 4 minutes left."]`.
6. `subjectLine(S)` → "Strongest: Polity (1.07 per question). Weakest: History & Culture (0.71 per question)."
7. `weakestOfferedSubject(S, ['Mixed','Economy','Environment','Geography','History'])` → `'History'`.
**Variants** (copy `S` and override only the listed fields):
8. `{questionCount 25, correct 10, wrong 1, invalid 0, blank 14, grossHundredths 2000, penaltyHundredths 66}` → hero "You left 14 questions blank. The risk ledger shows which kinds were worth a try."
9. `{questionCount 25, correct 20, wrong 2, invalid 0, blank 3, grossHundredths 4000, penaltyHundredths 132}` → hero "91% of your attempted answers were right."
10. `byConfidence` with sure/fifty/guess all `{0,0,0,0}` → headline "Tag answers Sure, 50:50 or Guess while you write, and this ledger will show which risks pay off for you."
11. `byConfidence.guess = {attempted 10, correct 1, wrong 9, netHundredths -394}` → headline "Guesses cost you 0.39 marks each. Leave pure guesses blank."
12. `discipline` all 0, `invalid 0`, `awayCount 0` → `["Clean sheet: every circled answer made it onto your answer sheet."]`.
13. `discipline {circledNotBubbled 1, circledNotBubbledCorrect 0, changedAtTransfer 0, changedRightToWrong 0, changedWrongToRight 0}`, `invalid 0`, `awayCount 0` → `["1 answer circled in the booklet never reached your sheet. It was wrong; bubbling it would have cost 0.66 marks, so leaving it blank was right."]`.
14. `{questionCount 25, durationSeconds 1800, submitMode 'timeout', pace: minutes 0..30 step 5 with bubbled [0,2,4,6,8,10,11]}` → `["You bubbled 11 of 25 answers; even pace reaches half the paper by 09:45.", "You used the full time."]`.

# 4. Deterministic Acceptance Criteria
1. `npm run test:exam` exits 0 with the 14 interpret tests passing. Paste the TAP summary.
2. `npm run lint` and `npm run build` exit 0.
3. `grep_search` `ExamHall.tsx` for `exam-scorecard-placeholder` → 0 matches; for `<ExamScorecard` → 1.
4. `grep_search` `scorecard/` for these strings: `Your answer sheet has been evaluated`, `Against real cut-offs`, `Official UPSC Prelims cut-offs, General category, GS Paper I. Reference only`, `All categories`, `Risk ledger`, `A wrong answer costs a third of a right one.`, `Sheet discipline`, `Pace`, `Subjects`, `Sit another full paper`, `25 questions, 30 minutes`, `Cut-off comparison is shown for full papers only.`, `lost to negative marking`, `TASK_073: ReviewBooklet` → each ≥ 1.
5. `grep_search` `scorecard/` for hard-coded cut-off numbers (`92\.66|87\.98|75\.41`) → 0 (values come only from `PRELIMS_CUTOFFS`).
6. Hard boundary respected.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: ["run_command", "view_file", "write_to_file", "replace_file_content"]
  duration_ms: 125000
  exit_codes:
    test_exam: 0
    lint: 0
    build: 0
test_exam_tap_summary: "1..65, pass: 65, fail: 0 (14 interpret tests: ok 23-36 passing)"
criterion_3_grep_output: "exam-scorecard-placeholder: 0 matches; <ExamScorecard: 1 match (ExamHall.tsx:599)"
criterion_4_string_hits:
  Your answer sheet has been evaluated: 1
  Against real cut-offs: 1
  Official UPSC Prelims cut-offs, General category, GS Paper I. Reference only: 1
  All categories: 1
  Risk ledger: 1
  A wrong answer costs a third of a right one.: 1
  Sheet discipline: 1
  Pace: 1
  Subjects: 1
  Sit another full paper: 1
  25 questions, 30 minutes: 1
  Cut-off comparison is shown for full papers only.: 1
  lost to negative marking: 1
  TASK_073: ReviewBooklet: 1
criterion_5_grep_output: "0 matches for 92.66|87.98|75.41 in scorecard/ (all values come from PRELIMS_CUTOFFS)"
files_created:
  - "src/components/exam/scorecard/interpret.ts"
  - "src/components/exam/scorecard/ScoreHero.tsx"
  - "src/components/exam/scorecard/CutoffBand.tsx"
  - "src/components/exam/scorecard/RiskLedger.tsx"
  - "src/components/exam/scorecard/SheetDiscipline.tsx"
  - "src/components/exam/scorecard/PaceChart.tsx"
  - "src/components/exam/scorecard/SubjectTable.tsx"
  - "src/components/exam/scorecard/ExamScorecard.tsx"
  - "scripts/exam-tests/interpret.test.ts"
files_modified:
  - "src/components/exam/ExamHall.tsx"
  - "package.json"
```

# 6. Orchestrator Verification Note (2026-09-24)

Independent Orchestrator script re-asserted all 14 interpretation fixtures verbatim: hero (three rules), ledger headline (sample, guesses cost, untagged), verdicts, per-answer, discipline (sample, clean, k=1 wrong), pace (sample, timeout), subject line and weakest offered. All match. The placeholder is replaced by `<ExamScorecard>`, there are no hard-coded cut-off numbers, and all required strings are present.

PARTIAL (minor, no runtime or security impact): seven scorecard files import types directly from `../../../../server-lib/exam/types` instead of through `src/components/exam/types.ts`, breaching blueprint §5 invariant 4 as written. They are type-only (erased by the build). The client-bundle scan confirms no server data. Fix in the next Exam Hall touch. Visual verification is deferred to TASK_075.
