---
task_id: "TASK_059_EXAM_POOL_BUILD"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 7000
  thinking_budget_tokens: 2500
  output_diff_max: 3000
batch: "EXAM_HALL_2026_09_24"
depends_on: []
queue_gate: "SOFT — no dependency. First contract of the Exam Hall batch (TASK_059–TASK_075). The Orchestrator hand-audits a random sample of the generated pool before any later contract's output is trusted; that audit does not block you from continuing to TASK_060."
blueprint: "strategy/design/exam-hall-blueprint.md §4, §5"
---

# 0. Batch rules (apply to every Exam Hall contract, TASK_059–TASK_075)
- Touch only the files listed in this contract's Scope fence. Anything else is a failed contract, even if it "helps".
- Never modify the drill flow: `src/components/arena/useArenaSession.ts`, its lock-and-reveal behaviour, or its localStorage keys (`tark_arena_session`, `tark_active_session`, `tark_arena_results`).
- Never apply a migration to any Supabase project. Never run `git commit`, `git push`, or change branches. The Orchestrator commits after verification.
- Hard boundary (CONTRACT_SCHEMA.md): `AWAITING_VERIFICATION` is the highest status you may write. Never move a contract into `completed/`. Never write to `01_CONTROL/` or `03_MEMORY/`.
- Receipts: file list, raw command output where the contract asks for it, exit codes. Do not paste whole file bodies. No prose summaries.

# 1. High-Density Distilled Objective
Create the Exam Hall's server-only question pool. Build a deterministic generator `scripts/build-exam-pool.ts` that filters `server-lib/analytics/data/verified_pyqs_15yr.json` down to exam-grade items and writes `server-lib/exam/data/gs1ExamPool.ts`. Create the canonical wire types `server-lib/exam/types.ts` (verbatim, §3.1) and the accessor `server-lib/exam/pool.ts`. The output must match the exact counts in §4. Those counts come from the Orchestrator's reference implementation of the same rules, so a mismatch means a rule was implemented differently.

Why this filter exists (audited by the Orchestrator 2026-09-24; do not re-litigate it): the source file's `TARK_*` rows are 74% keyed "A" (placeholder keys). Its 2024/2025 rows include non-UPSC school-quiz items. Its 2020 rows mix genuine and fabricated questions.

# 2. Transcluded Context References
- `server-lib/analytics/pyq_explorer.ts:10-27` — the `PYQItem` shape of each source row (`id, year, paper, stage, subject, era, stem, options, correctKey, cognitiveType, wordCount, trapAnalysis, qualifiers`).
- `server-lib/analytics/data/verified_pyqs_15yr.json` — 1,869-row JSON array. Do not open it whole; the script reads it with `fs`.
- `scripts/test-rebase-contract.ts:1-3` — repo convention: ESM TypeScript run by `tsx`, relative imports end in `.js`.
- Blueprint `strategy/design/exam-hall-blueprint.md` §4 (pool rationale) and §5 invariant 4 (`src/` never imports values from `server-lib/`).

# 2.5 Scope fence
Create: `server-lib/exam/types.ts`, `server-lib/exam/pool.ts`, `server-lib/exam/data/gs1ExamPool.ts` (generated), `scripts/build-exam-pool.ts`.
Modify: nothing else.

# 3. Mandatory Tool Chain & Execution Path
1. `write_to_file` `server-lib/exam/types.ts` with the exact content of §3.1. Do not rename, reorder or "improve" any type. Later contracts compile against these names.
2. `write_to_file` `scripts/build-exam-pool.ts` implementing §3.2 exactly.
3. `run_command` `npx tsx scripts/build-exam-pool.ts`. It writes the pool file and prints the stats JSON.
4. `write_to_file` `server-lib/exam/pool.ts` per §3.3.
5. `run_command` the verification commands in §4, in order, and paste their raw output into the receipt.

## 3.1 `server-lib/exam/types.ts` (write verbatim)
```ts
/**
 * Exam Hall canonical wire types (TASK_059).
 * PoolItem is server-only (it holds the answer key). The client may only
 * `import type` from this file, and only via src/components/exam/types.ts.
 */

export type OptionKey = 'A' | 'B' | 'C' | 'D';
export const OPTION_KEYS: readonly OptionKey[] = ['A', 'B', 'C', 'D'];

export type ExamSubject = 'Economy' | 'Environment' | 'Geography' | 'History' | 'Polity' | 'General Studies';
export const EXAM_SUBJECTS: readonly ExamSubject[] = ['Economy', 'Environment', 'Geography', 'History', 'Polity', 'General Studies'];

export type ItemFormat = 'single' | 'statements' | 'pairs' | 'howmany' | 'assertion';
export type PaperCode = 'GS1_FULL' | 'GS1_HALF' | 'GS1_SECTION';
export type SectionSubject = 'Mixed' | ExamSubject;
export type RulesPreset = 'exam_day' | 'practice';
export type Series = 'A' | 'B' | 'C' | 'D';
export type Confidence = 'sure' | 'fifty' | 'guess';
export type SubmitMode = 'manual' | 'timeout' | 'recovered';

/** Server-only. Holds the key. Never serialise to a client before submission. */
export interface PoolItem {
  id: string;
  year: number;
  subject: ExamSubject;
  format: ItemFormat;
  stem: string;
  options: [string, string, string, string];
  key: OptionKey;
  explanation: string;
}

/** Sent to the client during a sitting: no key, explanation, year or subject. */
export interface PaperItem {
  qid: string;
  n: number;
  format: ItemFormat;
  stem: string;
  options: [string, string, string, string];
}

export interface PaperSpec {
  code: PaperCode;
  title: string;
  questionCount: number;
  durationSeconds: number;
}

export type SheetEventType =
  | 'visit' | 'circle' | 'uncircle' | 'bubble' | 'erase' | 'double' | 'strike' | 'unstrike' | 'tag' | 'flag';

export interface SheetEvent {
  /** Whole seconds since the attempt started. */
  t: number;
  q: string;
  e: SheetEventType;
  v?: string;
}

export interface AwaySpan {
  from: number;
  to: number;
}

export interface ResponseSheet {
  v: 1;
  rules: RulesPreset;
  bubbles: Record<string, OptionKey[]>;
  circled: Record<string, OptionKey>;
  struck: Record<string, OptionKey[]>;
  confidence: Record<string, Confidence>;
  flagged: Record<string, true>;
  events: SheetEvent[];
  away: AwaySpan[];
  clientUpdatedAt: number;
}

export type Verdict = 'correct' | 'wrong' | 'invalid' | 'blank';

export interface ItemResult {
  qid: string;
  n: number;
  subject: ExamSubject;
  year: number;
  format: ItemFormat;
  key: OptionKey;
  bubbled: OptionKey[];
  circled: OptionKey | null;
  struck: OptionKey[];
  confidence: Confidence | null;
  flagged: boolean;
  verdict: Verdict;
  /** +200 correct, -66 wrong or invalid, 0 blank. */
  marksHundredths: number;
  dwellSeconds: number;
}

export interface LedgerRow {
  attempted: number;
  correct: number;
  /** wrong + invalid */
  wrong: number;
  netHundredths: number;
}

export interface SubjectRow extends LedgerRow {
  total: number;
}

export interface DisciplineStats {
  circledNotBubbled: number;
  circledNotBubbledCorrect: number;
  changedAtTransfer: number;
  changedRightToWrong: number;
  changedWrongToRight: number;
}

export interface PacePoint {
  minute: number;
  bubbled: number;
}

export interface ExamResult {
  attemptId: string;
  paperCode: PaperCode;
  rules: RulesPreset;
  questionCount: number;
  durationSeconds: number;
  startedAt: string;
  submittedAt: string;
  submitMode: SubmitMode;
  correct: number;
  wrong: number;
  invalid: number;
  blank: number;
  grossHundredths: number;
  penaltyHundredths: number;
  netHundredths: number;
  maxHundredths: number;
  bySubject: Record<string, SubjectRow>;
  byConfidence: Record<Confidence | 'untagged', LedgerRow>;
  byStruckCount: Record<'0' | '1' | '2' | '3', LedgerRow>;
  discipline: DisciplineStats;
  pace: PacePoint[];
  timeUsedSeconds: number;
  awaySeconds: number;
  awayCount: number;
  items: ItemResult[];
}

export interface StartRequest {
  paperCode: PaperCode;
  subject?: SectionSubject;
  rules: RulesPreset;
  series: Series;
}

export interface StartResponse {
  attemptId: string;
  paper: PaperSpec & {
    series: Series;
    rules: RulesPreset;
    subject: SectionSubject | null;
    composition: Record<string, number>;
    items: PaperItem[];
  };
  startedAt: string;
  deadlineAt: string;
  serverNow: string;
}

export interface ActiveAttempt extends StartResponse {
  sheet: ResponseSheet | null;
  checkpointAt: string | null;
}

export interface SubmitResponse {
  result: ExamResult;
  /** Post-submission only. Keyed by qid. */
  explanations: Record<string, string>;
  /** The booklet as the candidate saw it, in order (for the review booklet). */
  paper: PaperItem[];
}

export interface ActiveResponse {
  active: ActiveAttempt | null;
  finalized: SubmitResponse | null;
}

export interface AttemptSummary {
  attemptId: string;
  paperCode: PaperCode;
  subject: SectionSubject | null;
  submittedAt: string;
  submitMode: SubmitMode;
  questionCount: number;
  correct: number;
  wrong: number;
  blank: number;
  netHundredths: number;
  maxHundredths: number;
}

export interface CatalogResponse {
  papers: PaperSpec[];
  sectionSubjects: { subject: SectionSubject; available: number }[];
  blueprints: Record<PaperCode, Record<string, number>>;
  poolSize: number;
  yearsCovered: string;
}
```

## 3.2 `scripts/build-exam-pool.ts` rules (implement exactly)
Input: `path.join(process.cwd(), 'server-lib', 'analytics', 'data', 'verified_pyqs_15yr.json')`, parsed as an array. Process rows in file order.

**Eligibility — a row is kept only if every condition holds:**
- E1 `String(row.id)` starts with `db_`
- E2 `row.paper === 'GS-1'` and `row.stage === 'Prelims'`
- E3 `Number.isInteger(row.year)` and `2011 <= row.year <= 2023` and `row.year !== 2020`
- E4 `Array.isArray(row.options)` with length exactly 4, and for k = 0..3 `/^\(([a-d])\)\s+\S/.exec(row.options[k])` matches with capture `=== 'abcd'[k]` (non-string options fail)
- E5 `String(row.correctKey ?? '').trim().toUpperCase()` is one of `A B C D`
- E6 `String(row.stem ?? '').trim().length >= 20`
- E7 `row.subject` is one of the six `EXAM_SUBJECTS`

**Normalisation (kept rows):**
- `stem`: replace `\r\n` and lone `\r` with `\n`; strip trailing whitespace on every line (`/[ \t]+$/gm`); collapse 3+ consecutive `\n` to `\n\n`; `.trim()`.
- `options[k]`: remove `/^\([a-d]\)\s+/`, then `.trim()`.
- `key`: `String(row.correctKey).trim().toUpperCase()`.
- `explanation`: `String(row.trapAnalysis ?? '').trim()`.

**Format (evaluated on the normalised stem and options; first match wins):**
1. `'howmany'`: `/\bhow many of the\b/i.test(stem)` or `/^(only one|only two|only three|all three|all four|none of the)\b/i.test(options[0])`
2. `'assertion'`: `/\bStatement[- ]?I\b/.test(stem) && /\bStatement[- ]?II\b/.test(stem)`
3. `'pairs'`: `/^\s*\|.*\|\s*$/m.test(stem) || /\bfollowing pairs\b/i.test(stem)`
4. `'statements'`: `(stem.match(/^\s*\d{1,2}[.)]\s+\S/gm) ?? []).length >= 2`
5. `'single'` otherwise

**Dedupe:** key = `stem.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 120)`; keep the first occurrence.
**Sort:** by `year` ascending, then `id` ascending (plain `<` string comparison).
**Output file** `server-lib/exam/data/gs1ExamPool.ts`, no timestamp (reproducible), exactly:
```
// GENERATED by scripts/build-exam-pool.ts. Do not edit by hand.
// Re-generate: npx tsx scripts/build-exam-pool.ts
import type { PoolItem } from '../types.js';

export const GS1_EXAM_POOL: readonly PoolItem[] = <JSON.stringify(items, null, 2)>;
```
Each item's keys in this order: `id, year, subject, format, stem, options, key, explanation`.
**Stdout:** one line, `JSON.stringify` of `{ total, bySubject, byYear, byFormat, byKey, firstId, lastId }`, where each `by*` object has keys sorted ascending. Exit code 1 if `total === 0`.

## 3.3 `server-lib/exam/pool.ts`
```ts
import { GS1_EXAM_POOL } from './data/gs1ExamPool.js';
import { EXAM_SUBJECTS } from './types.js';
import type { ExamSubject, PoolItem } from './types.js';

const BY_ID = new Map<string, PoolItem>(GS1_EXAM_POOL.map((item) => [item.id, item]));

export function getPool(): readonly PoolItem[] {
  return GS1_EXAM_POOL;
}

export function getPoolItem(id: string): PoolItem | undefined {
  return BY_ID.get(id);
}

export function poolCountsBySubject(): Record<ExamSubject, number> {
  const counts = Object.fromEntries(EXAM_SUBJECTS.map((s) => [s, 0])) as Record<ExamSubject, number>;
  for (const item of GS1_EXAM_POOL) counts[item.subject] += 1;
  return counts;
}
```

# 4. Deterministic Acceptance Criteria
1. `npx tsx scripts/build-exam-pool.ts` exits 0 and prints exactly this object (key order may differ only if your `by*` sorting differs — it must not):
   `{"total":647,"bySubject":{"Economy":251,"Environment":156,"General Studies":3,"Geography":133,"History":90,"Polity":14},"byYear":{"2011":53,"2012":55,"2013":60,"2014":56,"2015":48,"2016":65,"2017":46,"2018":51,"2019":55,"2021":50,"2022":51,"2023":57},"byFormat":{"assertion":12,"howmany":33,"pairs":26,"single":253,"statements":323},"byKey":{"A":143,"B":188,"C":175,"D":141},"firstId":"db_0379066d-7395-4308-9277-64a9d48f5bd9","lastId":"db_f29ffb94-2601-49c2-9b40-6eea5bd97d71"}`
   Any different number is a failure. Find the rule you implemented differently. Do not tweak rules until the numbers match.
2. Determinism: run the generator a second time; `Get-FileHash server-lib/exam/data/gs1ExamPool.ts` is identical before and after. Paste both hash lines.
3. `npx tsx -e "import('./server-lib/exam/pool.ts').then(m => { const p = m.getPool(); console.log(p.length, JSON.stringify(m.poolCountsBySubject()), m.getPoolItem('db_0379066d-7395-4308-9277-64a9d48f5bd9')?.year) })"` prints `647 {"Economy":251,"Environment":156,"Geography":133,"History":90,"Polity":14,"General Studies":3} 2011`.
4. No option text in the pool begins with `(a)`–`(d)`: `Select-String -Path server-lib/exam/data/gs1ExamPool.ts -Pattern '^\s+"\([a-d]\) '` returns nothing.
5. `grep_search` for `server-lib/exam` and `gs1ExamPool` under `src/` returns zero matches (paste the raw result).
6. `npm run lint` exits 0 (unchanged baseline; nothing imports the new files yet).
7. Hard boundary respected (§0).

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - write_to_file
    - run_command
    - grep_search
    - replace_file_content
  duration_ms: 120000
  exit_codes:
    build_pool_run1: 0
    build_pool_run2: 0
    hash_check: 0
    pool_api_check: 0
    option_prefix_check: 0
    lint_check: 0
generator_stdout_run1: '{"total":647,"bySubject":{"Economy":251,"Environment":156,"General Studies":3,"Geography":133,"History":90,"Polity":14},"byYear":{"2011":53,"2012":55,"2013":60,"2014":56,"2015":48,"2016":65,"2017":46,"2018":51,"2019":55,"2021":50,"2022":51,"2023":57},"byFormat":{"assertion":12,"howmany":33,"pairs":26,"single":253,"statements":323},"byKey":{"A":143,"B":188,"C":175,"D":141},"firstId":"db_0379066d-7395-4308-9277-64a9d48f5bd9","lastId":"db_f29ffb94-2601-49c2-9b40-6eea5bd97d71"}'
generator_stdout_run2: '{"total":647,"bySubject":{"Economy":251,"Environment":156,"General Studies":3,"Geography":133,"History":90,"Polity":14},"byYear":{"2011":53,"2012":55,"2013":60,"2014":56,"2015":48,"2016":65,"2017":46,"2018":51,"2019":55,"2021":50,"2022":51,"2023":57},"byFormat":{"assertion":12,"howmany":33,"pairs":26,"single":253,"statements":323},"byKey":{"A":143,"B":188,"C":175,"D":141},"firstId":"db_0379066d-7395-4308-9277-64a9d48f5bd9","lastId":"db_f29ffb94-2601-49c2-9b40-6eea5bd97d71"}'
pool_file_hash_run1: "4953DEBDDDD72DA2B47741D34545BCE1982A5F6983723FEB1A896FBCAC26D04F"
pool_file_hash_run2: "4953DEBDDDD72DA2B47741D34545BCE1982A5F6983723FEB1A896FBCAC26D04F"
criterion_3_output: "647 {\"Economy\":251,\"Environment\":156,\"Geography\":133,\"History\":90,\"Polity\":14,\"General Studies\":3} 2011"
criterion_4_output: ""
criterion_5_output: "server-lib/exam: 0 matches; gs1ExamPool: 0 matches"
files_created:
  - server-lib/exam/types.ts
  - scripts/build-exam-pool.ts
  - server-lib/exam/data/gs1ExamPool.ts
  - server-lib/exam/pool.ts
```

# 6. Orchestrator Verification Note (2026-09-24)

Independently re-run by the Orchestrator; the receipt was not trusted.
- `npx tsx scripts/build-exam-pool.ts` stdout is byte-identical to the §4.1 expected object (647 items; subject, year, format and key distributions; first and last ids).
- The pool file hash is unchanged across a re-run (deterministic).
- All 647 pool items are field-for-field identical (id, year, subject, format, stem, options, key, explanation) to the Orchestrator's independent Python build of the same rules. No extra keys.
- `server-lib/exam/types.ts` is byte-identical to the §3.1 block.
- No value import of `server-lib` from `src/`. The client bundle holds no pool data: `GS1_EXAM_POOL`, pool ids and explanation text are absent from `dist/assets/*.js` and present in `dist/server.cjs`.
- `npm run test`, `lint` and `build` exit 0.
