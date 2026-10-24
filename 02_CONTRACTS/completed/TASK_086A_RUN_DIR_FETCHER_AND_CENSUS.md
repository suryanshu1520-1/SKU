---
task_id: "TASK_086A"
title: "Run-directory guard, polite fetcher and source census (VisionIAS + Rau's Mains)"
parent: "TASK_086"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: []
queue_gate: "NONE: first contract of the epic"
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Build the run-directory guard, the polite HTTP client and the census. The census inventories every document the
owner selected (VisionIAS paper solutions and Rau's IAS Mains papers) with a resolved PDF URL, and must reproduce
the counts the Orchestrator verified live on 2026-10-21.

# 2. Transcluded Context References
- `.gitignore:123` ignores `_raw_source_archive/`. `package.json:22` defines `test:qbank`. `cheerio` is already a dependency; add no new dependencies.
- `server-lib/qbank/types.ts:25-36` defines `STAGES` and `PAPER_KINDS` (`GS-1`, `GS-2`, `GS-M1`..`GS-M4`, `Essay`).

**Inherited rules (TASK_086 §3).**
- Run dir: `_raw_source_archive/qbank-quality/final-2026-10/`, overridable with `QBANK_RUN_DIR`. Every CLI calls the guard first.
- No LLM or OCR.
- No document-, year- or filename-specific branches outside the expected-count assertions in step 3.
- ESM: use `fileURLToPath(import.meta.url)` (never `__dirname`) and `.js` import specifiers.
- Do not commit or push. Never write to `01_CONTROL/` or `03_MEMORY/`.

**Distilled spec**

1. **`scripts/qbank/final/run-dir.ts`**
   - `REPO_ROOT` is three directories above this file.
   - `getRunDir()` returns `process.env.QBANK_RUN_DIR`, else `REPO_ROOT/_raw_source_archive/qbank-quality/final-2026-10`.
   - `assertRunDirSafe(dir)`: if `dir` is inside `REPO_ROOT`, run `git check-ignore -q <dir>/__probe__.pdf` with cwd `REPO_ROOT`. A non-zero exit throws `RunDirNotIgnoredError`.
   - `ensureLayout(dir)` creates:
     - `manifest/robots`
     - `sources/html`, `sources/visionias`, `sources/rau`, `sources/.tmp`
     - `profiles`, `extracted`
     - `occurrences/visionias`, `occurrences/handoff`
     - `mains`, `keys/official`, `crops`, `conflicts`, `canonical`, `reports`, `release-preview`
   - `stableStringify(v)`: JSON with object keys sorted recursively. Every JSON writer in the epic uses it.
   - `writeJsonAtomic(file, v)`: `stableStringify` with 2-space indent and a trailing newline. Write `${file}.tmp-${pid}`, then rename; on EPERM/EBUSY retry 3× with a 500 ms wait.
   - `appendJsonl(file, row)`: one `stableStringify` line per row.

2. **`scripts/qbank/final/http.ts`**
   - `politeFetch(url, {conditional?: {etag?, lastModified?}, fetchImpl?, sleep?, now?})` returns `{status, headers, body: Buffer, finalUrl, requestedAt}`.
   - User-Agent: `Mozilla/5.0 (compatible; TarkQbankBot/1.0; +https://www.tark.live)`.
   - Per host: at most one request in flight, and ≥ 3000 ms between request starts.
   - Retries: on a network error, 429 or 5xx, retry 3 times, waiting 5 s, 15 s and 45 s, or `Retry-After` when that is larger. Any other 4xx fails without a retry.
   - Conditional requests send `If-None-Match` / `If-Modified-Since`.
   - Push `{host, url, status, startedAt}` onto an exported `requestLog`.
   - `robotsAllowed(url)`: fetch `https://<host>/robots.txt` once per host and save it to `manifest/robots/<host>.txt`. Parse the `User-agent: *` group and apply longest-prefix match over Allow/Disallow, ignoring any value that starts with `http`. A 404 means allowed.

3. **`scripts/qbank/final/census.ts`** (`npm run qbank:census`)
   - **Run clock.** `generated_at` keeps the existing value from `manifest/census.json` if present, otherwise now (ISO). It is the run clock for every later stage.
   - **Listing pages.** Save every fetched page to `sources/html/<sha256>.html` and record its SHA-256.
   - **VisionIAS listing** (`https://www.visionias.in/resources/upsc-paper-solution/`): for every `a[href*="/resources/material"]`:
     - `id` and `type` come from the query string.
     - The card is the nearest ancestor whose text matches `/Year\s*\d{4}/`. The title is the card's first non-empty line; the year is `/Year\s*(\d{4})/`.
     - Language is `hi` if the card text contains `HINDI`, `en` if it contains `ENGLISH`, otherwise an error.
     - Stage comes from `type` (`prelims_sol` → `Prelims`, `mains_sol` → `Mains`) and must agree with the card text.
     - Prelims paper: `/CSAT|Paper\s*II\b/i` → `GS-2`, else `/GS|General Studies/i` → `GS-1`, else an error.
     - Mains paper: `/Essay/i` → `Essay`, else `/GS\s*Paper\s*(IV|III|II|I)\b/i` (test IV, then III, II, I) → `GS-M4`/`M3`/`M2`/`M1`, else an error.
     - English rows: GET `https://www.visionias.in/resources/material/?id=<id>&type=<type>` and snapshot it. `pdf_url` is the capture of the first line matching `/^\s*const\s+pdfPath\s*=\s*'([^']+\.pdf)'/`; lines whose trimmed text starts with `//` are ignored. The URL must start with `https://cdn.visionias.in/`.
     - Hindi rows: `skip_reason: "hindi_out_of_scope"`; no landing fetch.
     - `document_id = visionias:${year}-${paper}:${stage==='Prelims'?'solution':'paper'}:${lang}`.
   - **Rau's** (`https://compass.rauias.com/upsc-mains/10-years-paper/`):
     - Walk `h2, a` in document order. The current year comes from the last `h2` matching `/UPSC Mains (\d{4})/`.
     - For each `a` whose href ends `.pdf` and contains `/wp-content/uploads/`, classify the paper from the filename: `/ess?a?y|eassy/i` → `Essay`; otherwise test `/(?:GS|paper)[-_ ]?(IV|4)\b/i` → `GS-M4`, then the same pattern for `III|3` → `GS-M3`, `II|2` → `GS-M2`, `I|1` → `GS-M1`, case-insensitively and in that order; anything else is an error.
     - `document_id = rau:${year}-${paper}:paper:bi`; `language: "bi"`.
   - **Robots.** Every URL must pass `robotsAllowed` (recorded as `robots_ok`).
   - **Row fields:** `document_id, publisher, stage, year, paper, role, language, title, listing_url, landing_url, pdf_url, landing_snapshot_sha256, robots_ok, skip_reason?`.
   - **Outputs.** `manifest/census.json` is `{generated_at, rows}`, sorted by `document_id`. `reports/census.json` is `{counts, extras, errors}`.
   - **Assertions** (verified 2026-10-21). Exit 1 on any shortfall or error:
     - VisionIAS: 32 items.
       - English Prelims `GS-1` covers years ⊇ {2011…2026}.
       - English Prelims `GS-2` covers years ⊇ {2017, 2020…2026}.
       - English Mains 2024 covers papers ⊇ {Essay, GS-M1, GS-M2, GS-M3}.
       - Every Hindi row has a `skip_reason`.
     - Rau's: 65 PDFs covering {2013…2025} × {Essay, GS-M1, GS-M2, GS-M3, GS-M4}, with no duplicate (year, paper).
     - A duplicate `document_id` is an error. Rows beyond these sets go to `extras`; they are not errors.

4. **`package.json`**
   - Add `"qbank:census": "tsx scripts/qbank/final/census.ts"`.
   - Set `test:qbank` to `tsx --test scripts/qbank-tests/validators.test.ts "scripts/qbank-tests/final/**/*.test.ts"`.

5. **Tests** in `scripts/qbank-tests/final/census.test.ts`. Use synthetic inline HTML and no network.
   - (a) VisionIAS card parsing: GS, CSAT, Mains Essay and GS Paper II/III, and a Hindi skip.
   - (b) A script holding `//const url = 'https://cdn.visionias.in/x/old.pdf';` followed by `const pdfPath = 'https://cdn.visionias.in/value_added_material/new.pdf'` yields `new.pdf`.
   - (c) Rau's: `ESSAY.pdf` under "UPSC Mains 2022" → (2022, Essay); `Eassy_2020.pdf` → Essay; `GS-IV_2019.pdf` → GS-M4; `UPSC-Mains-2025-GS-paper-3.pdf` → GS-M3.
   - (d) robots: `Disallow: /resources/tab.php` still allows `/resources/material/?id=1`.
   - (e) `assertRunDirSafe` throws for the non-ignored `REPO_ROOT/scripts/qbank/final/__probe_dir__` and passes for the default run dir.
   - (f) Two `politeFetch` calls to one host start ≥ 3000 ms apart, using injected `sleep`/`now` so the test stays fast.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file`: `package.json` (scripts block) and `.gitignore:118-125`.
2. `write_to_file`: `run-dir.ts`, `http.ts`, `census.ts` and `census.test.ts`.
3. `replace_file_content`: `package.json`.
4. `run_command`, in order: `npm run test:qbank` → `npm run qbank:census` → `git status --porcelain` → `npm run lint`.

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank` exits 0, and the existing validator tests still pass.
- `npm run qbank:census` exits 0. Paste `reports/census.json` verbatim along with its SHA-256.
- The census has:
  - 32 VisionIAS rows: 24 English Prelims and 4 English Mains, all with `pdf_url` on `cdn.visionias.in`, plus 4 Hindi rows with `skip_reason`;
  - 65 Rau's rows.
- `git status --porcelain` lists only code files: nothing under `_raw_source_archive/`.
- `npm run lint` exits 0.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: {}
  report_sha256: {}
report_summary: |
  <paste reports/census.json verbatim>
diff: |
  <unified diff, code files only>
```

# 6. Orchestrator Verification Note (2026-10-22, G1)
**VERIFIED.** Each check below was re-run by the Orchestrator rather than read from a receipt:
- **Tests and lint.** `npm run test:qbank` passed 40/40 and `npm run lint` exited 0.
- **Census.** Re-derived from `manifest/census.json` (generated_at 2026-10-22T11:12:59.688Z):
  - 97 rows in total. VisionIAS has 32: GS-1 for 2011-2026 (16), GS-2 for 2017 and 2020-2026 (8), 4 English Mains rows for 2024, and 4 Hindi rows with `skip_reason`. Rau's has 65: 13 years × 5 papers.
  - Every English VisionIAS `pdf_url` is on `cdn.visionias.in`.
  - `reports/census.json` (sha256 df8b2cf1…) has `errors` [] and `extras` [].
- **Isolation.** The run dir is gitignored (`.gitignore:123`), and `git status` lists no run-dir paths.
- **Receipt.** The delivery summary had no separate 086A receipt, so this was verified from the artifacts.
