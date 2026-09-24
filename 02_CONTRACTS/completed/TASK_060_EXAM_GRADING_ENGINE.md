---
task_id: "TASK_060_EXAM_GRADING_ENGINE"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 7500
  thinking_budget_tokens: 5000
  output_diff_max: 4000
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_059_EXAM_POOL_BUILD"]
queue_gate: "SOFT — needs server-lib/exam/types.ts from TASK_059 to exist. Re-read it before writing; do not redefine any type locally."
blueprint: "strategy/design/exam-hall-blueprint.md §3, §16"
---

# 0. Batch rules
Same as TASK_059 §0: stay inside the Scope fence; never touch the drill flow; no migrations, commits or pushes; status ≤ `AWAITING_VERIFICATION`; never write `01_CONTROL/` or `03_MEMORY/`; receipts carry raw output and exit codes, no prose.

# 1. High-Density Distilled Objective
Implement the pure grading engine `gradeSheet()` in `server-lib/exam/grading.ts`. It scores a UPSC-style answer sheet with negative marking in integer hundredths (+200 right, −66 wrong, −66 invalid for two bubbles in a row, 0 blank). It also computes the ledgers the scorecard needs: subject, confidence, options struck, sheet discipline, pace and dwell time. Prove it with the exact fixture tests in §3.3. The function is pure: no I/O, no `Date.now()`, no randomness.

# 2. Transcluded Context References
- `server-lib/exam/types.ts` (created by TASK_059) — `PoolItem`, `ResponseSheet`, `SheetEvent`, `ExamResult`, `ItemResult`, `LedgerRow`, `SubjectRow`, `DisciplineStats`, `PacePoint`, `OPTION_KEYS`, `PaperCode`, `RulesPreset`, `SubmitMode`, `Confidence`.
- `scripts/test-rebase-contract.ts:1-3` — test convention: `import test from 'node:test'`, `import assert from 'node:assert/strict'`, relative imports ending `.js`, run with `tsx --test`.
- `package.json` `scripts.test` is currently `tsx --test scripts/test-rebase-contract.ts`.

# 2.5 Scope fence
Create: `server-lib/exam/grading.ts`, `scripts/exam-tests/grading.test.ts`.
Modify: `package.json` (`scripts` only; see §3.4).

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` `server-lib/exam/types.ts` to confirm the names.
2. `write_to_file` `server-lib/exam/grading.ts` per §3.1–§3.2.
3. `write_to_file` `scripts/exam-tests/grading.test.ts` per §3.3.
4. `replace_file_content` `package.json` per §3.4.
5. `run_command` `npm run test:exam`, then `npm run test`, then `npm run lint`.

## 3.1 Signature
```ts
import { OPTION_KEYS } from './types.js';
import type { Confidence, ExamResult, OptionKey, PaperCode, PoolItem, ResponseSheet, RulesPreset, SubmitMode } from './types.js';

export interface GradeOptions {
  attemptId: string;
  paperCode: PaperCode;
  rules: RulesPreset;
  durationSeconds: number;
  startedAtMs: number;
  submittedAtMs: number;
  submitMode: SubmitMode;
}

export const MARKS_CORRECT = 200;   // hundredths
export const MARKS_WRONG = -66;     // hundredths, also used for invalid rows

export function gradeSheet(items: readonly PoolItem[], sheet: ResponseSheet, opts: GradeOptions): ExamResult;
```
`items` are in booklet order: item at index `i` is question `n = i + 1`, and its `qid` is `item.id`.

## 3.2 Rules (every one is tested)
Define `validKeys(x)`: if `x` is not an array, return `[]`; otherwise keep the entries that are in `OPTION_KEYS`, de-duplicate, and sort A→D.

1. **Per item**
   - `bubbled = validKeys(sheet.bubbles?.[qid])`.
   - `verdict`: `bubbled.length === 0` → `'blank'`; `>= 2` → `'invalid'`; `=== 1` → `'correct'` if `bubbled[0] === item.key`, else `'wrong'`.
   - `marksHundredths`: correct `200`, wrong `-66`, invalid `-66`, blank `0`.
   - `circled` = `sheet.circled?.[qid]` if it is in `OPTION_KEYS`, else `null`. `struck = validKeys(sheet.struck?.[qid])`.
   - `confidence` = `sheet.confidence?.[qid]` if it is `'sure' | 'fifty' | 'guess'`, else `null`. `flagged = sheet.flagged?.[qid] === true`.
   - Copy `subject`, `year`, `format`, `key` from the item.
2. **Totals**: `correct`, `wrong` (verdict wrong only), `invalid`, `blank`. `grossHundredths = 200 * correct`. `penaltyHundredths = 66 * (wrong + invalid)`. `netHundredths = gross - penalty`. `maxHundredths = 200 * items.length`. `questionCount = items.length`.
3. **bySubject**: one entry per subject present in `items` (even when nothing was attempted). `total` = items of that subject. `attempted` = non-blank. `correct`. `wrong` = wrong + invalid. `netHundredths` = sum of marks.
4. **byConfidence**: keys `sure`, `fifty`, `guess`, `untagged` always present. Count only non-blank items, bucketed by `confidence ?? 'untagged'`. Same fields as `LedgerRow`.
5. **byStruckCount**: keys `'0'`–`'3'` always present. Non-blank items only, bucket `String(Math.min(3, struck.length))`.
6. **discipline**:
   - `circledNotBubbled` = items with `circled !== null && bubbled.length === 0`
   - `circledNotBubbledCorrect` = of those, `circled === key`
   - `changedAtTransfer` = items with `circled !== null && bubbled.length === 1 && bubbled[0] !== circled`
   - `changedRightToWrong` = of those, `circled === key`
   - `changedWrongToRight` = of those, `bubbled[0] === key`
7. **timeUsedSeconds** = `clamp(Math.round((submittedAtMs - startedAtMs) / 1000), 0, durationSeconds)`.
8. **pace**: take `sheet.events` (not an array → `[]`), keep events whose `q` is a paper qid and whose `t` is a finite number, and stable-sort by `t`. Replay into a Set: `'bubble'` and `'double'` add `q`, `'erase'` deletes `q`, every other type is ignored. For every `minute` in `0, 5, 10, …, durationSeconds / 60` (inclusive), emit `{ minute, bubbled: size of the Set after applying every event with t <= minute * 60 }`.
9. **dwellSeconds**: take the `'visit'` events (after the same filtering and stable sort). Visit k covers `[t_k, t_{k+1})`; the last visit covers `[t_last, end)` with `end = timeUsedSeconds`. Clip each interval to `[0, end]`; add its length to that visit's `q`. Items with no visits get `0`.
10. **away**: `sheet.away` (not an array → `[]`). For each span with finite `from` and `to`, clip both to `[0, durationSeconds]`. Keep spans with `to > from`. `awaySeconds` = sum of lengths; `awayCount` = number kept.
11. `startedAt = new Date(startedAtMs).toISOString()` and `submittedAt = new Date(submittedAtMs).toISOString()`. Copy `attemptId`, `paperCode`, `rules`, `durationSeconds` and `submitMode` from opts. `items` are `ItemResult[]` in booklet order.

## 3.3 `scripts/exam-tests/grading.test.ts` — required tests (exact values)
Helper `item(id, subject, key)` → `{ id, year: 2019, subject, format: 'single', stem: 'S', options: ['a','b','c','d'], key, explanation: '' }`.

**Test A — "grades the reference sheet"** with items `q1 Economy A`, `q2 Economy B`, `q3 Polity C`, `q4 History D`, `q5 Geography A`, `q6 Environment B`.
Sheet:
```ts
{ v: 1, rules: 'exam_day',
  bubbles: { q1: ['A'], q2: ['C'], q4: ['A', 'D'], q5: ['A'] },
  circled: { q1: 'A', q2: 'B', q3: 'C', q4: 'D', q5: 'B' },
  struck: { q2: ['A', 'D'], q5: ['C'] },
  confidence: { q1: 'sure', q2: 'fifty', q3: 'guess', q5: 'fifty' },
  flagged: { q6: true },
  events: [
    { t: 0, q: 'q1', e: 'visit' }, { t: 100, q: 'q1', e: 'bubble', v: 'A' },
    { t: 300, q: 'q2', e: 'visit' }, { t: 400, q: 'q2', e: 'bubble', v: 'C' },
    { t: 450, q: 'q3', e: 'visit' }, { t: 480, q: 'q4', e: 'visit' },
    { t: 500, q: 'q4', e: 'bubble', v: 'A' }, { t: 700, q: 'q4', e: 'double', v: 'D' },
    { t: 900, q: 'q5', e: 'visit' }, { t: 1000, q: 'q5', e: 'bubble', v: 'A' },
    { t: 1300, q: 'q6', e: 'visit' } ],
  away: [ { from: 600, to: 660 }, { from: 1000, to: 1030 } ],
  clientUpdatedAt: 0 }
```
Opts: `{ attemptId: 'att-1', paperCode: 'GS1_SECTION', rules: 'exam_day', durationSeconds: 1800, startedAtMs: 1700000000000, submittedAtMs: 1700001500000, submitMode: 'manual' }`.
Assert with `deepStrictEqual` / `strictEqual`:
- `correct 2, wrong 1, invalid 1, blank 2`; `grossHundredths 400`, `penaltyHundredths 132`, `netHundredths 268`, `maxHundredths 1200`, `questionCount 6`
- verdicts in order `['correct','wrong','blank','invalid','correct','blank']`; marks `[200,-66,0,-66,200,0]`
- `items[3].bubbled` = `['A','D']`; `items[1].struck` = `['A','D']`; `items[2].circled` = `'C'`; `items[5].flagged` = `true`; `items[4].confidence` = `'fifty'`
- dwell in order `[300,150,30,420,400,200]`
- `bySubject`: `Economy {total 2, attempted 2, correct 1, wrong 1, netHundredths 134}`, `Polity {1,0,0,0,0}`, `History {1,1,0,1,-66}`, `Geography {1,1,1,0,200}`, `Environment {1,0,0,0,0}` (compare as `{ total, attempted, correct, wrong, netHundredths }`)
- `byConfidence`: `sure {1,1,0,200}`, `fifty {2,1,1,134}`, `guess {0,0,0,0}`, `untagged {1,0,1,-66}` (as `{ attempted, correct, wrong, netHundredths }`)
- `byStruckCount`: `'0' {2,1,1,134}`, `'1' {1,1,0,200}`, `'2' {1,0,1,-66}`, `'3' {0,0,0,0}`
- `discipline` = `{ circledNotBubbled: 1, circledNotBubbledCorrect: 1, changedAtTransfer: 2, changedRightToWrong: 1, changedWrongToRight: 1 }`
- `pace` = `[{minute:0,bubbled:0},{minute:5,bubbled:1},{minute:10,bubbled:3},{minute:15,bubbled:3},{minute:20,bubbled:4},{minute:25,bubbled:4},{minute:30,bubbled:4}]`
- `timeUsedSeconds 1500`, `awaySeconds 90`, `awayCount 2`
- `startedAt '2023-11-14T22:13:20.000Z'`, `submittedAt '2023-11-14T22:38:20.000Z'`

**Test B — "empty sheet scores zero"**: 3 items, sheet with every map `{}`, `events: []`, `away: []`; duration 1800, submitted after 0 s. Expect `blank 3`, `netHundredths 0`, every `byConfidence` row all zeros, `pace.length === 7` and every `bubbled === 0`, discipline all zeros, every dwell 0.

**Test C — "ignores garbage and foreign ids"**: items `q1 Economy A`. Sheet bubbles `{ q1: ['A','A','Z'], qX: ['B'] }` (cast through `unknown`), confidence `{ q1: 'maybe' }`, events `[{t:10,q:'qX',e:'bubble'},{t:Number.NaN,q:'q1',e:'bubble'},{t:20,q:'q1',e:'bubble'}]`, duration 1800, submitted after 600 s. Expect `items[0].verdict === 'correct'`, `items[0].bubbled` = `['A']`, `items[0].confidence === null`, `pace[1]` = `{minute:5,bubbled:1}` and `pace[0].bubbled === 0`.

**Test D — "clamps time used and away spans"**: 1 item, duration 1800, submitted 5000 s after start, `away: [{from:1700,to:4000},{from:50,to:50},{from:-20,to:10}]`. Expect `timeUsedSeconds 1800`, `awaySeconds 110`, `awayCount 2`.

**Test E — "erase removes a bubble from pace"**: 1 item, events `[{t:10,q:'q1',e:'bubble'},{t:400,q:'q1',e:'erase'}]`, duration 1800. Expect `pace[1].bubbled === 1` (t≤300), `pace[2].bubbled === 0` (t≤600).

## 3.4 `package.json` scripts
- Add `"test:exam": "tsx --test scripts/exam-tests/grading.test.ts"`.
- Change `"test"` to `"tsx --test scripts/test-rebase-contract.ts && npm run test:exam"`.
- Change nothing else in the file.

# 4. Deterministic Acceptance Criteria
1. `npm run test:exam` exits 0 and reports 5 passing tests, 0 failing. Paste the TAP summary lines (`# tests`, `# pass`, `# fail`).
2. `npm run test` exits 0; the rebase tests still pass alongside the exam tests.
3. `npm run lint` exits 0.
4. `grading.ts` contains no `Date.now`, `Math.random`, `fetch`, `fs`, `process.env` or `console.` (paste the raw `grep_search` result for `Date.now|Math.random|fetch\(|from 'fs'|process\.env|console\.` in that file: zero matches).
5. `grading.ts` imports only from `./types.js`.
6. Hard boundary respected.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - write_to_file
    - replace_file_content
    - run_command
    - grep_search
  duration_ms: 90000
  exit_codes:
    test_exam: 0
    test_all: 0
    lint: 0
test_exam_tap_summary: |
  # tests 5
  # suites 0
  # pass 5
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
criterion_4_grep_output: "Date.now|Math.random|fetch(|from 'fs'|process.env|console.: 0 matches"
files_created:
  - server-lib/exam/grading.ts
  - scripts/exam-tests/grading.test.ts
files_modified:
  - package.json
```

# 6. Orchestrator Verification Note (2026-09-24)

Independent Orchestrator script (`verify-exam.ts`, scratchpad) imported `gradeSheet` directly and re-asserted the full Test A fixture: totals, verdicts, marks, dwell, bySubject, byConfidence, byStruckCount, discipline, pace, time/away and ISO timestamps. It also re-asserted the clamp and garbage/foreign-id cases. All match. `npm run test:exam` 65/65. Pure module: imports only `./types.js`.
