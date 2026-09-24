---
task_id: "TASK_065_EXAM_CLIENT_API_LAYOUT_AND_CUTOFFS"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 6500
  thinking_budget_tokens: 3000
  output_diff_max: 3500
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_064_EXAM_CLIENT_STATE_CORE"]
queue_gate: "SOFT — needs src/components/exam/types.ts."
blueprint: "strategy/design/exam-hall-blueprint.md §6.2, §11, §16.3"
---

# 0. Batch rules
Same as TASK_059 §0.

# 1. High-Density Distilled Objective
Add three small client modules:
1. `lib/itemLayout.ts` — makes UPSC stems render correctly as markdown. Numbered statements become lists and pair tables become tables, and neither swallows the closing question line. It also decides the 2×2 versus one-column option layout and the booklet page marks.
2. `lib/examApi.ts` — the only client module that calls `/api/exam/*`: typed wrappers over `fetchWithAuth()` with one error type.
3. `data/prelimsCutoffs.ts` — official UPSC Prelims cut-offs, verified by the Orchestrator against UPSC's PDFs. Write it verbatim; never edit a number.

# 2. Transcluded Context References
- `src/lib/api.ts:3-16` — `fetchWithAuth(url, options)` adds the Bearer token and passes `options` (including `keepalive`) to `fetch`.
- `src/components/exam/types.ts` — `CatalogResponse`, `StartRequest`, `StartResponse`, `ActiveResponse`, `ResponseSheet`, `SubmitResponse`, `AttemptSummary`.
- CommonMark behaviour that motivates §3.1: a paragraph line directly after a list item is absorbed into that item ("lazy continuation"), and a table needs a blank line before it when it follows a paragraph.

# 2.5 Scope fence
Create: `src/components/exam/lib/itemLayout.ts`, `src/components/exam/lib/examApi.ts`, `src/components/exam/data/prelimsCutoffs.ts`, `scripts/exam-tests/itemLayout.test.ts`.
Modify: `package.json` (append the test file to `scripts.test:exam`).

# 3. Mandatory Tool Chain & Execution Path
1. `write_to_file` the three modules per §3.1–§3.3, then the test file per §3.4.
2. `replace_file_content` `package.json` → append `scripts/exam-tests/itemLayout.test.ts` to `test:exam`.
3. `run_command` `npm run test:exam`, `npm run lint`.

## 3.1 `lib/itemLayout.ts`
```ts
export function normalizeStemMarkdown(stem: string): string;
export function optionLayout(options: readonly string[]): 'grid' | 'list';  // 'grid' iff every option.length <= 28
export function pageNumberAfter(n: number): number | null;                   // n % 5 === 0 ? Math.ceil(n / 5) + 1 : null
```
`normalizeStemMarkdown`, exactly:
```ts
const isList = (l: string) => /^\s*\d{1,2}[.)]\s+\S/.test(l);
const isTable = (l: string) => /^\s*\|.*\|\s*$/.test(l);
// walk stem.split('\n'); keep an output array `out`; for each line, with prev = out.at(-1) ?? '':
//   if isList(line)  && prev.trim() !== '' && !isList(prev)  → push ''
//   if isTable(line) && prev.trim() !== '' && !isTable(prev) → push ''
//   if line.trim() !== '' && !isList(line) && !isTable(line) && (isList(prev) || isTable(prev)) → push ''
//   push line
// return out.join('\n')
```

## 3.2 `lib/examApi.ts`
```ts
export class ExamApiError extends Error {
  constructor(public status: number, public code: string, message: string, public body?: unknown) { super(message); this.name = 'ExamApiError'; }
}
export const examApi = {
  catalog(): Promise<CatalogResponse>,                                    // GET  /api/exam/catalog
  start(req: StartRequest): Promise<StartResponse>,                       // POST /api/exam/start
  active(): Promise<ActiveResponse>,                                      // GET  /api/exam/active
  checkpoint(attemptId: string, sheet: ResponseSheet, opts?: { keepalive?: boolean }): Promise<{ ok: true; savedAt: string }>,
  submit(attemptId: string, sheet: ResponseSheet, mode: 'manual' | 'timeout'): Promise<SubmitResponse>,
  attempts(): Promise<{ attempts: AttemptSummary[] }>,                    // GET  /api/exam/attempts
  result(attemptId: string): Promise<SubmitResponse>,                     // GET  /api/exam/result?attemptId=<encodeURIComponent>
};
```
- Every call goes through `fetchWithAuth`. POST bodies are JSON with `Content-Type: application/json`.
- A rejected `fetch` (network) → `throw new ExamApiError(0, 'NETWORK', 'You appear to be offline.')`.
- Non-2xx → parse the JSON if possible → `throw new ExamApiError(res.status, body?.error ?? 'HTTP_' + res.status, body?.message ?? 'Request failed.', body)`.
- 2xx → return the parsed JSON cast to the declared type. No retries in this module; the session hook owns retries.

## 3.3 `data/prelimsCutoffs.ts` (verbatim)
```ts
/**
 * Official UPSC CSE Preliminary Examination cut-offs: GS Paper I, out of 200 marks
 * ("Cut off marks on the basis of GS Paper-I only").
 * Verified by the Orchestrator against UPSC's own PDFs on 2026-09-24. EWS did not
 * exist before 2019. Do not add or change a value without a new source check.
 */
export interface PrelimsCutoff {
  year: number;
  general: number;
  ews: number | null;
  obc: number;
  sc: number;
  st: number;
  source: string;
}

export const PRELIMS_CUTOFFS: readonly PrelimsCutoff[] = [
  { year: 2025, general: 92.66, ews: 89.34, obc: 92.0, sc: 84.0, st: 82.66, source: 'https://www.upsc.gov.in/sites/default/files/CSE_2025_Cut-OffMks_Eng_09032026.pdf' },
  { year: 2024, general: 87.98, ews: 85.92, obc: 87.28, sc: 79.03, st: 74.23, source: 'https://www.upsc.gov.in/sites/default/files/CutOff-CSE-2024-Engl-220425.pdf' },
  { year: 2023, general: 75.41, ews: 68.02, obc: 74.75, sc: 59.25, st: 47.82, source: 'https://www.upsc.gov.in/sites/default/files/CutOff-CSE-23-engl-180424.pdf' },
  { year: 2022, general: 88.22, ews: 82.83, obc: 87.54, sc: 74.08, st: 69.35, source: 'https://www.upsc.gov.in/sites/default/files/CutOff-CSE-22-Engl-230523.pdf' },
  { year: 2021, general: 87.54, ews: 80.14, obc: 84.85, sc: 75.41, st: 70.71, source: 'https://www.upsc.gov.in/sites/default/files/CutOff-CSE-21-engl-300522.pdf' },
  { year: 2020, general: 92.51, ews: 77.55, obc: 89.12, sc: 74.84, st: 68.71, source: 'https://www.upsc.gov.in/sites/default/files/CutOff-CSE-20-engl-270921.pdf' },
  { year: 2019, general: 98.0, ews: 90.0, obc: 95.34, sc: 82.0, st: 77.34, source: 'https://www.upsc.gov.in/sites/default/files/Cut_Off_Marks_CS2019_Eng.pdf' },
  { year: 2018, general: 98.0, ews: null, obc: 96.66, sc: 84.0, st: 83.34, source: 'https://www.upsc.gov.in/sites/default/files/CutOff-CSE-2018-Engl-R.pdf' },
  { year: 2017, general: 105.34, ews: null, obc: 102.66, sc: 88.66, st: 88.66, source: 'https://www.upsc.gov.in/sites/default/files/Cutoff-CSE-2017-Engl.pdf' },
];
```

## 3.4 `scripts/exam-tests/itemLayout.test.ts`
1. An already-normal stem is returned unchanged: `'With reference to cultural history of India, consider the following statements:\n\n1. Most of the Tyagaraja Kritis are devotional songs in praise of Lord Krishna.\n2. Tyagaraja created several new ragas.\n\nWhich of the statements given above are correct?'`.
2. `'Consider the following:\n1. A\n2. B\nWhich of the above?'` → `'Consider the following:\n\n1. A\n2. B\n\nWhich of the above?'`.
3. `'Consider the following pairs:\n| | X | Y |\n|---|---|---|\n| 1. | a | b |\nHow many pairs?'` → `'Consider the following pairs:\n\n| | X | Y |\n|---|---|---|\n| 1. | a | b |\n\nHow many pairs?'`.
4. A single-line stem `'Banjaras during the medieval period of Indian history were generally'` is unchanged.
5. `optionLayout(['1 only','2 only','Both 1 and 2','Neither 1 nor 2'])` → `'grid'`. `optionLayout(['Increased plant growth due to increased concentration of carbon dioxide in the atmosphere','b','c','d'])` → `'list'`.
6. `pageNumberAfter(5)` → 2; `pageNumberAfter(90)` → 19; `pageNumberAfter(7)` → `null`.
7. `PRELIMS_CUTOFFS` has 9 rows, years 2025 → 2017 in descending order, every `source` starts with `https://www.upsc.gov.in/sites/default/files/`, and the 2023 General value is `75.41`.

# 4. Deterministic Acceptance Criteria
1. `npm run test:exam` exits 0 with the 7 new tests passing. Paste the TAP summary.
2. `npm run lint` exits 0.
3. `grep_search` `src/components/exam/lib/examApi.ts` for `fetch\(` → 0 matches (only `fetchWithAuth` is used), and for `/api/exam/` → 7 distinct paths.
4. `data/prelimsCutoffs.ts` matches §3.3 byte-for-byte apart from line endings.
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
  duration_ms: 110000
  exit_codes:
    npm_run_test_exam: 0
    npm_run_lint: 0
test_exam_tap_summary: |
  1..51
  # tests 51
  # suites 0
  # pass 51
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
criterion_3_grep_output: |
  fetch( calls in examApi.ts: 0 matches
  /api/exam/ paths in examApi.ts:
    - /api/exam/catalog (line 50)
    - /api/exam/start (line 54)
    - /api/exam/active (line 62)
    - /api/exam/checkpoint (line 70)
    - /api/exam/submit (line 83)
    - /api/exam/attempts (line 91)
    - /api/exam/result?attemptId=... (line 95)
files_created:
  - src/components/exam/lib/itemLayout.ts
  - src/components/exam/lib/examApi.ts
  - src/components/exam/data/prelimsCutoffs.ts
  - scripts/exam-tests/itemLayout.test.ts
files_modified:
  - package.json
  - 02_CONTRACTS/active/TASK_065_EXAM_CLIENT_API_LAYOUT_AND_CUTOFFS.md
```

# 6. Orchestrator Verification Note (2026-09-24)

- `prelimsCutoffs.ts` is byte-identical to §3.3, and every value matches UPSC's PDFs as re-checked.
- `normalizeStemMarkdown` passes the list, table and idempotence cases, and is idempotent across all 647 real stems.
- `optionLayout` and `pageNumberAfter` pass.
- `examApi` covers exactly the 7 `/api/exam/*` paths and makes no raw `fetch(` call.
