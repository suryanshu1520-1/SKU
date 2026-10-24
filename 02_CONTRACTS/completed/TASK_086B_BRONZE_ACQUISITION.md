---
task_id: "TASK_086B"
title: "Bronze acquisition: hash-named immutable PDFs with an append-only acquisition log"
parent: "TASK_086"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_086A"]
queue_gate: "SOFT: run after 086A has written manifest/census.json; re-verify that the file exists and that reports/census.json has an empty errors list before starting."
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Download every census document without a `skip_reason` exactly once, into immutable SHA-256-named files, and log
every attempt in an append-only acquisition file. A second run must download nothing.

# 2. Transcluded Context References
- `scripts/qbank/final/run-dir.ts` (086A): `getRunDir`, `assertRunDirSafe`, `ensureLayout`, `appendJsonl`, `writeJsonAtomic`.
- `scripts/qbank/final/http.ts` (086A): `politeFetch` (the conditional option and `requestLog`).
- Census row fields: `document_id, publisher, pdf_url, skip_reason?`.

**Inherited rules (TASK_086 §3).**
- Call the run-dir guard first.
- Bronze bytes are never modified or deleted.
- No document- or filename-specific branches.
- Do not commit or push.

**Distilled spec**

1. **Core function.** `scripts/qbank/final/acquire.ts` exports `acquireAll({census, runDir, fetcher, now})`. The CLI (`npm run qbank:acquire`, with an optional `--dry-run`) wraps it. Process rows without a `skip_reason` in `document_id` order.
   - **Previously fetched.** If the latest log row for this `document_id` has `status` `ok` or `not_modified` and its file exists, send a conditional request with the stored `etag`/`last_modified`:
     - 304 → append `{status:"not_modified"}`, carrying over the prior `sha256` and `path`.
     - 200 → handle it as a new download, and set `previous_sha256` when the hash changes.
   - **New download.** Require all three:
     - status 200, otherwise `failed` with `http_<code>`;
     - body > 1000 bytes, otherwise `too_small`;
     - first five bytes `%PDF-`, otherwise `not_pdf`.

     Then compute the SHA-256 and write `sources/.tmp/<sha>.part`. Rename it to `sources/<publisher>/<sha256>.pdf`, retrying on EPERM/EBUSY as in 086A. If the target already exists, do not rewrite it. If another `document_id` already maps to this SHA-256 in the log, set `duplicate_of` to that id.
   - **Log row.** Append to `manifest/acquisition.jsonl` (append-only, never rewritten): `document_id, url, final_url, http_status, etag, last_modified, bytes, sha256, retrieved_at, path, status, duplicate_of?, previous_sha256?, error?`.
     - `retrieved_at` is the real fetch time.
     - `path` is relative to the run dir.
   - **Failures.** Keep going after a failure; exit 1 at the end if any row failed.
   - **`--dry-run`.** Print the planned `{document_id, url}` list and exit 0 without touching the network.
2. **Report.** Write `reports/acquire.json`: `{downloaded, not_modified, duplicates, failed, total_bytes, failures:[{document_id, reason}], min_interval_ms_by_host}`. `min_interval_ms_by_host` is computed from the `requestLog` start times.
3. **`package.json`.** Add `"qbank:acquire": "tsx scripts/qbank/final/acquire.ts"`.
4. **Tests** in `scripts/qbank-tests/final/acquire.test.ts`, using an injected fake fetcher and a temp run dir:
   - (a) An HTML body served as a PDF → `failed:not_pdf`, and no file is written.
   - (b) Two rows returning identical bytes → one file, and the second row has `duplicate_of`.
   - (c) A rerun with a stored etag → the fetcher receives `If-None-Match`, returns 304, the row is `not_modified`, and the file's mtime is unchanged.
   - (d) A rerun returning changed bytes with 200 → a new SHA-256 file, and `previous_sha256` is set.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file`: `scripts/qbank/final/http.ts` and `run-dir.ts` (exports only).
2. `write_to_file`: `acquire.ts` and `acquire.test.ts`.
3. `replace_file_content`: `package.json`.
4. `run_command`, in order:
   - `npm run test:qbank`
   - `npm run qbank:acquire` (first run)
   - `npm run qbank:acquire` (second run)
   - the hash check below
   - `git status --porcelain`

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank` exits 0.
- **First run:** exit 0. `downloaded + duplicates = 93` (28 English VisionIAS + 65 Rau's), `failed = 0`, and every value in `min_interval_ms_by_host` is ≥ 3000. Paste the report verbatim.
- **Second run:** exit 0, `downloaded = 0`. Paste the report.
- **Hash check.** Run this one-off command (paste both the command and its output):
  ```
  node -e "const fs=require('fs'),c=require('crypto'),p=require('path');const d=process.env.QBANK_RUN_DIR||'_raw_source_archive/qbank-quality/final-2026-10';let n=0,m=0;for(const pub of ['visionias','rau'])for(const f of fs.readdirSync(p.join(d,'sources',pub))){n++;if(c.createHash('sha256').update(fs.readFileSync(p.join(d,'sources',pub,f))).digest('hex')+'.pdf'!==f)m++}console.log({files:n,mismatches:m})"
  ```
  The expected output has `mismatches: 0`.
- `git status --porcelain` shows no run-dir paths.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: {}
  report_sha256: {}
report_summary: |
  <first-run report, second-run report, hash-check output>
diff: |
  <unified diff, code files only>
```

# 6. Orchestrator Verification Note (2026-10-22, G1)
**VERIFIED.**
- **Report.** The `reports/acquire.json` sha256 matches the receipt (8c784511…).
- **Independent re-hash.** All 93 latest documents were re-hashed: 93 files, 0 mismatches, and every file is named by its SHA-256.
- **Log.** `manifest/acquisition.jsonl` has 186 append-only rows (two runs × 93), with statuses limited to {ok, not_modified}.
- **Politeness.** The minimum interval per host was 3000 ms on both hosts.
- **Receipt defect.** The receipt's diff showed only `package.json`, not the full unified diff of `acquire.ts`; the code was reviewed on disk instead.
