---
task_id: "TASK_061_EXAM_PAPER_ASSEMBLY_AND_SANITIZER"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 7500
  thinking_budget_tokens: 5000
  output_diff_max: 4000
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_059_EXAM_POOL_BUILD", "TASK_060_EXAM_GRADING_ENGINE"]
queue_gate: "SOFT — needs server-lib/exam/types.ts, pool.ts (TASK_059) and the test:exam script (TASK_060). Re-read package.json before editing it."
blueprint: "strategy/design/exam-hall-blueprint.md §3, §3.1, §5 (invariants 1-2)"
---

# 0. Batch rules
Same as TASK_059 §0: stay inside the Scope fence; never touch the drill flow; no migrations, commits or pushes; status ≤ `AWAITING_VERIFICATION`; never write `01_CONTROL/` or `03_MEMORY/`; receipts carry raw output and exit codes, no prose.

# 1. High-Density Distilled Objective
Build the three pure server modules the endpoints (TASK_063) will call:
1. `papers.ts`: paper specs, composition blueprints, the sectional-subject rule, and `toPaperItem()`. `toPaperItem()` is the only sanctioned way to turn a `PoolItem` into what the client sees. It must never carry `key`, `explanation`, `year` or `subject`.
2. `assemble.ts`: seeded, reproducible paper assembly that meets the blueprint, prefers questions the candidate hasn't seen, and spills any shortfall.
3. `sanitize.ts`: turns any client-sent answer sheet (including garbage) into a well-formed `ResponseSheet` restricted to the attempt's issued questions.
All three are pure (no I/O, no clock, no `Math.random`) and covered by the exact tests in §3.4.

# 2. Transcluded Context References
- `server-lib/exam/types.ts` — `PoolItem`, `PaperItem`, `PaperSpec`, `PaperCode`, `SectionSubject`, `ExamSubject`, `EXAM_SUBJECTS`, `OPTION_KEYS`, `ResponseSheet`, `SheetEvent`, `SheetEventType`, `RulesPreset`.
- `server-lib/exam/pool.ts` — `getPool()`, `poolCountsBySubject()`.
- Blueprint §3 (paper table) and §3.1 (blueprints). Copy the numbers from §3.1 below, not from memory.

# 2.5 Scope fence
Create: `server-lib/exam/papers.ts`, `server-lib/exam/assemble.ts`, `server-lib/exam/sanitize.ts`, `scripts/exam-tests/assemble.test.ts`, `scripts/exam-tests/sanitize.test.ts`.
Modify: `package.json` (append the two test files to `scripts.test:exam` only).

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` `server-lib/exam/types.ts` and `server-lib/exam/pool.ts`.
2. `write_to_file` the three modules per §3.1–§3.3.
3. `write_to_file` both test files per §3.4.
4. `replace_file_content` `package.json`: `"test:exam": "tsx --test scripts/exam-tests/grading.test.ts scripts/exam-tests/assemble.test.ts scripts/exam-tests/sanitize.test.ts"`.
5. `run_command` `npm run test:exam`, `npm run test`, `npm run lint`.

## 3.1 `server-lib/exam/papers.ts`
```ts
export const PAPER_SPECS: Record<PaperCode, PaperSpec> = {
  GS1_FULL:    { code: 'GS1_FULL',    title: 'General Studies Paper I · Full paper', questionCount: 100, durationSeconds: 7200 },
  GS1_HALF:    { code: 'GS1_HALF',    title: 'General Studies Paper I · Half paper', questionCount: 50,  durationSeconds: 3600 },
  GS1_SECTION: { code: 'GS1_SECTION', title: 'General Studies Paper I · Sectional',  questionCount: 25,  durationSeconds: 1800 },
};

/** Tark v1 composition, constrained by the pool (blueprint §3.1). Each row sums to questionCount. */
export const BLUEPRINTS: Record<PaperCode, Record<ExamSubject, number>> = {
  GS1_FULL:    { Economy: 34, Environment: 24, Geography: 21, History: 15, Polity: 5, 'General Studies': 1 },
  GS1_HALF:    { Economy: 17, Environment: 12, Geography: 10, History: 8,  Polity: 2, 'General Studies': 1 },
  GS1_SECTION: { Economy: 9,  Environment: 6,  Geography: 5,  History: 4,  Polity: 1, 'General Studies': 0 },
};

export const SECTION_SUBJECT_MIN_POOL = 50;
export const PAPER_CODES: readonly PaperCode[] = ['GS1_FULL', 'GS1_HALF', 'GS1_SECTION'];

/** 'Mixed' first, then every subject whose pool count is >= SECTION_SUBJECT_MIN_POOL, in EXAM_SUBJECTS order. */
export function offeredSectionSubjects(counts: Record<ExamSubject, number>): SectionSubject[];

/** Builds a fresh object with exactly: qid, n, format, stem, options (a copied array). Never spread the PoolItem. */
export function toPaperItem(item: PoolItem, n: number): PaperItem;
```

## 3.2 `server-lib/exam/assemble.ts`
```ts
export class PaperUnavailableError extends Error {
  constructor(message: string) { super(message); this.name = 'PaperUnavailableError'; }
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface AssembleRequest {
  paperCode: PaperCode;
  subject?: SectionSubject;
  seenIds: ReadonlySet<string>;
  seed: number;
}

export function assemblePaper(pool: readonly PoolItem[], req: AssembleRequest): PoolItem[];
```
Algorithm. Keep the RNG call order exactly as written; reproducibility depends on it.
1. `N = PAPER_SPECS[req.paperCode].questionCount`; `rand = mulberry32(req.seed)`.
2. `unseenFirst(list)` = `s = seededShuffle(list, rand)`; return `[...s.filter(i => !seen.has(i.id)), ...s.filter(i => seen.has(i.id))]`.
3. **Single-subject sectional** (`paperCode === 'GS1_SECTION'` and `subject` is set and not `'Mixed'`): candidates = pool items of that subject. If fewer than `N`, throw `PaperUnavailableError('Not enough <subject> questions for a sectional paper')`. `picked = unseenFirst(candidates).slice(0, N)`. Go to step 5.
4. **Blueprint** (all other cases): for each subject in `EXAM_SUBJECTS` order, `quota = BLUEPRINTS[paperCode][subject]`, `ordered = unseenFirst(pool of that subject)`, take `min(quota, ordered.length)` into `picked`, push the rest into `remainder`, and add any shortfall to `shortfall`. If `shortfall > 0`: `fill = unseenFirst(remainder)`. If `fill.length < shortfall`, throw `PaperUnavailableError('Question pool too small for this paper')`. Otherwise append `fill.slice(0, shortfall)`.
5. Return `seededShuffle(picked, rand)`, the booklet order. Subjects end up interleaved, as in a real paper.
The result never contains duplicates and always has exactly `N` items, unless it throws.

## 3.3 `server-lib/exam/sanitize.ts`
```ts
export const MAX_EVENTS = 2000;
export const MAX_AWAY_SPANS = 200;
export const TIME_SLACK_SECONDS = 120;

export function emptySheet(rules: RulesPreset): ResponseSheet;  // { v: 1, rules, bubbles: {}, circled: {}, struck: {}, confidence: {}, flagged: {}, events: [], away: [], clientUpdatedAt: 0 }

export function sanitizeSheet(raw: unknown, issuedIds: readonly string[], rules: RulesPreset, durationSeconds: number): ResponseSheet;
```
Rules:
- If `raw` is not a non-null object → `emptySheet(rules)`. `rules` in the output always comes from the argument, never from `raw`.
- Only keys in `issuedIds` survive in every map. Use own-property iteration (`Object.keys`) and never copy `__proto__`.
- `bubbles[qid]`: raw value must be an array → keep `OPTION_KEYS` members, de-duplicate, sort A→D, keep the first 2. Omit the qid if the result is empty.
- `struck[qid]`: array → valid keys, de-duplicated, sorted A→D. Omit if empty.
- `circled[qid]`: must be exactly one of `'A' | 'B' | 'C' | 'D'`.
- `confidence[qid]`: must be `'sure' | 'fifty' | 'guess'`.
- `flagged[qid]`: kept only when the value is the boolean `true`.
- `events`: raw must be an array. Keep entries where `t` is a finite number with `0 <= t <= durationSeconds + TIME_SLACK_SECONDS` (store `Math.floor(t)`), `q` is an issued id, and `e` is a `SheetEventType`. Keep `v` only if it is a string of length ≤ 8. Keep input order. If more than `MAX_EVENTS` remain, drop `'visit'` events from the front of the array until the length is ≤ `MAX_EVENTS`. If it is still over, keep the last `MAX_EVENTS`.
- `away`: raw array. Keep spans with finite `from`/`to`, `0 <= from <= to <= durationSeconds + TIME_SLACK_SECONDS` (floored), at most the first `MAX_AWAY_SPANS`.
- `clientUpdatedAt`: finite number, else `0`. `v` is always `1`.

## 3.4 Required tests
`scripts/exam-tests/assemble.test.ts`. The helper `mk(subject, count)` returns items with ids `${subject}-${i}` for `i = 0..count-1`, `year 2019`, `format 'single'`, `options ['a','b','c','d']`, `key 'A'`, `stem 'S'`, `explanation ''`. `basePool` = Economy 40, Environment 30, Geography 25, History 15, Polity 8, General Studies 2.
1. `mulberry32(1)` yields exactly `0.6270739405881613`, `0.002735721180215478`, `0.5274470399599522` (`strictEqual`).
2. HALF from `basePool`, seed 7, no seen ids: length 50; per-subject counts `{Economy:17, Environment:12, Geography:10, History:8, Polity:2, 'General Studies':1}`; 50 unique ids.
3. Same request twice → identical id order (`deepStrictEqual`); seed 7 vs seed 8 → different order (`notDeepStrictEqual`).
4. Seen ids `Economy-0`…`Economy-29`, HALF, seed 7: the 17 Economy picks include all of `Economy-30`…`Economy-39`, plus exactly 7 seen ids.
5. `basePool` with Polity reduced to 1 item, HALF, seed 3: length 50, exactly 1 Polity, 50 unique ids, and every id exists in the pool.
6. Single-subject sectional `History` with History 15 → throws `PaperUnavailableError`. With History 30 → 25 items, all History.
7. Sectional `'Mixed'` from `basePool` → counts `{Economy:9, Environment:6, Geography:5, History:4, Polity:1}` and no General Studies.
8. A 20-item pool with a FULL request → throws `PaperUnavailableError`.
9. `toPaperItem(poolItem, 3)` → `Object.keys(result).sort()` deep-equals `['format','n','options','qid','stem']`; `result.n === 3`; `result.options !== poolItem.options` but has the same contents.
10. Against the real pool (`getPool()` and `poolCountsBySubject()` from `../../server-lib/exam/pool.js`), `offeredSectionSubjects` returns `['Mixed','Economy','Environment','Geography','History']`, and FULL with seed 1 returns 100 unique items with counts equal to `BLUEPRINTS.GS1_FULL`.

`scripts/exam-tests/sanitize.test.ts` (issued `['q1','q2','q3']`, duration 1800 unless stated):
1. `sanitizeSheet(null, …, 'exam_day', 1800)` deep-equals `emptySheet('exam_day')`.
2. Raw `{ rules: 'practice' }` with rules argument `'exam_day'` → output `rules === 'exam_day'`.
3. Raw bubbles `{ q1: ['C','A','A','Z','D'], qX: ['A'], q2: 'A', q3: [] }` → `{ q1: ['A','C'] }`.
4. Raw circled `{ q1: 'b', q2: 'B', qX: 'A' }` → `{ q2: 'B' }`. Confidence `{ q1: 'sure', q2: 'maybe' }` → `{ q1: 'sure' }`. Flagged `{ q1: true, q2: 'yes', q3: 1 }` → `{ q1: true }`. Struck `{ q1: ['D','D','B'], q2: ['X'] }` → `{ q1: ['B','D'] }`.
5. Events cap. Input is 2100 `visit` events `{ t: i % 1800, q: i % 2 ? 'q2' : 'q1', e: 'visit' }`, then 10 events `{ t: 1000 + i, q: 'q3', e: 'bubble', v: 'A' }`, then the invalid events `{t:-1,q:'q1',e:'visit'}`, `{t:NaN,q:'q1',e:'visit'}`, `{t:5,q:'q1',e:'hack'}`, `{t:5,q:'qX',e:'visit'}`, `{t:1921,q:'q1',e:'visit'}`. Output: length 2000, exactly 10 `bubble` events, and no event with `q === 'qX'`, `e === 'hack'` or `t` outside 0..1920.
6. In a separate call, the single event `{ t: 3, q: 'q1', e: 'bubble', v: 'abcdefghi' }` is kept, and its output has no `v` property.
7. Away `[{from:10,to:20},{from:30,to:10},{from:-5,to:3},{from:0,to:99999}]` → `[{from:10,to:20}]`.
8. Prototype safety. Pass `JSON.parse('{"bubbles":{"__proto__":{"polluted":["A"]}},"circled":{"__proto__":"A"}}')`. The output `bubbles` and `circled` are `{}`, and `({} as any).polluted === undefined`.

# 4. Deterministic Acceptance Criteria
1. `npm run test:exam` exits 0: 23 tests total (5 grading + 10 assemble + 8 sanitize), 0 failing. Paste the TAP summary.
2. `npm run test` and `npm run lint` exit 0.
3. `grep_search` for `Math.random|Date.now|fetch\(|process\.env|from 'fs'` in `papers.ts`, `assemble.ts` and `sanitize.ts` → zero matches (paste the raw output).
4. `toPaperItem` never uses object spread of the pool item (`grep_search` `\.\.\.item` in `papers.ts` → zero).
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
  duration_ms: 120000
  exit_codes:
    npm_run_test_exam: 0
    npm_run_test: 0
    npm_run_lint: 0
test_exam_tap_summary: |
  1..23
  # tests 23
  # suites 0
  # pass 23
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
criterion_3_grep_output: "No results found across papers.ts, assemble.ts, sanitize.ts"
criterion_4_grep_output: "No results found for \\.\\.\\.item in papers.ts"
files_created:
  - server-lib/exam/papers.ts
  - server-lib/exam/assemble.ts
  - server-lib/exam/sanitize.ts
  - scripts/exam-tests/assemble.test.ts
  - scripts/exam-tests/sanitize.test.ts
files_modified:
  - package.json
  - 02_CONTRACTS/active/TASK_061_EXAM_PAPER_ASSEMBLY_AND_SANITIZER.md
```

# 6. Orchestrator Verification Note (2026-09-24)

Independent Orchestrator checks all pass:
- mulberry32 golden values;
- HALF quotas, determinism, seed sensitivity, unseen-first, shortfall spill;
- single-subject sectional (throws below 25, otherwise 25 of that subject), Mixed sectional, too-small FULL throws;
- real-pool FULL composition equals `BLUEPRINTS.GS1_FULL`; `offeredSectionSubjects` = Mixed/Economy/Environment/Geography/History;
- `toPaperItem` emits exactly {format,n,options,qid,stem} with a copied options array;
- sanitizer: null, rules-from-attempt, bubbles, maps, the 2000-event cap keeping all bubble events, `v` length, away spans, `__proto__` safety.
