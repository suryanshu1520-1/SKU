---
task_id: "TASK_015_RAW_ACQUISITION_FIXUP"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 3000
  output_diff_max: 3000
---

# 1. High-Density Distilled Objective
TASK_014 correctly fetched 4 of 6 sources but failed 2, both for diagnosed, fixable reasons — this contract fixes both. Same rules as TASK_014 apply: raw acquisition only, no OCR/parsing/processing, additive to `_raw_source_archive/` only.

**Failure 1 — `manjunath-study-material`:** TASK_014 was told to sparse-checkout a "UPSC/" folder from `manjunath5496/Books`. That repo/approach was wrong. The Orchestrator fetched the real README directly and confirmed: the actual UPSC content lives at `manjunath5496/Exam-Study-Material` (README: https://github.com/manjunath5496/Exam-Study-Material/blob/master/README.md) as a **flat list of individually-linked PDFs** (e.g. `upa(5).pdf`, `cmt(23).pdf`) — there is no "UPSC/" folder to sparse-checkout. Some of the actual GS Prelims papers linked from that same README are hosted in a **third** repo, `manjunath5496/List-of-famous-experiments`. The Orchestrator counted 43 links in the README whose visible link text contains "UPSC", "IAS Prelim", "IAS Exam", or "Civil Service".

**Failure 2 — `upsc-json-dumps`:** TASK_014 searched the `amanbh2/UPSC-Star` repo root for JSON files and found none. The Orchestrator confirmed via the GitHub API tree listing that the file is right there at repo root: **`UPSC Star Data.json`** (173,529 bytes) — the filename contains a literal space, which almost certainly broke whatever URL construction or file-matching logic TASK_014 used.

# 2. Transcluded Context References
- Target: `_raw_source_archive/manjunath-study-material/` and `_raw_source_archive/upsc-json-dumps/` — both currently empty directories from TASK_014, fill them in place.
- Do not re-touch the 4 sources TASK_014 already succeeded on (`concept-extraction-csv`, `mrunal-html-vault`, `selfstudyhistory-html-vault`, `upsc-official-portal`) or `MANIFEST.md`'s existing entries for them — only add/update the two failed entries.
- For the space-in-filename fix: URL-encode as `%20` when constructing the raw download URL — `https://raw.githubusercontent.com/amanbh2/UPSC-Star/master/UPSC%20Star%20Data.json` — or use the GitHub API blob-by-sha endpoint the Orchestrator already used to confirm the file exists, which sidesteps the encoding issue entirely.
- Same acquisition-only constraint as TASK_014: no parsing, no reading the JSON/PDF contents for analysis, no OCR. Files land as-is.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` / fetch the real README at `https://raw.githubusercontent.com/manjunath5496/Exam-Study-Material/master/README.md`.
2. Parse out every link whose visible link text contains "UPSC", "IAS Prelim", "IAS Exam", or "Civil Service" (case-insensitive) — expect roughly 40–50 matches. Note which repo each resolves to (`Exam-Study-Material` or `List-of-famous-experiments`) from the URL itself.
3. Download each matched PDF into `_raw_source_archive/manjunath-study-material/`, preserving a name that reflects its link text (not just the opaque `upa(5).pdf`-style original filename) so the manifest is actually navigable.
4. Fetch `UPSC Star Data.json` from `amanbh2/UPSC-Star` (space-encoding fixed) into `_raw_source_archive/upsc-json-dumps/`.
5. Update `_raw_source_archive/MANIFEST.md` — append/update only the two entries for these sources; leave the other four entries untouched.

# 4. Deterministic Acceptance Criteria
1. `_raw_source_archive/manjunath-study-material/` contains real, non-empty PDF files — report the count (expect roughly 40–50, allowing for a few genuine 404s on individual links, which should be logged honestly, not silently skipped).
2. `_raw_source_archive/upsc-json-dumps/UPSC Star Data.json` (or an equivalently named file) exists and is non-empty — spot-check that it's real JSON, not an HTML error page saved with a `.json` extension.
3. `MANIFEST.md` accurately reflects both fixes; the four previously-successful entries are unchanged.
4. No file outside `_raw_source_archive/` is touched.

# 5. Antigravity Proof-of-Work Receipt
_(filled in by Antigravity on completion — diff + telemetry YAML only, no prose. Per the hard boundary in `CONTRACT_SCHEMA.md`: set status no higher than `AWAITING_VERIFICATION`. Do not move this file to `completed/`. Do not edit `01_CONTROL/` or `03_MEMORY/`.)_

```yaml
telemetry:
  tools_invoked:
    - write_to_file (scripts/fixup-raw-sources.ts)
    - run_command (npx tsx scripts/fixup-raw-sources.ts)
    - manage_task (status)
  duration_ms: 64856
  exit_codes:
    fixup_script: 0
  manjunath_pdfs_fetched: 43
  manjunath_links_404: 0
  upsc_star_json_fetched: true
  upsc_star_json_size_bytes: 173529
diff: |
  _raw_source_archive/
    manjunath-study-material/
      01_21 Years CSAT General Studies IAS Prelims Topic-wise Solved Papers (1995-2015).pdf
      02_Important Information to Students on UPSC Competitions and Conventional Questions of the Past Years.pdf
      03_A Beginner's guide to UPSC Preparation.pdf
      04_Biology for UPSC IAS Prelims.pdf
      05_Current Affairs Year Book 2018 for UPSC & PCS Exam.pdf
      ... (43 curated PDF files total)
    upsc-json-dumps/
      UPSC Star Data.json (173,529 bytes, valid JSON)

  # Updated MANIFEST.md entries:
  - **manjunath-study-material**: SUCCESS - Acquired 43 curated PDFs matching UPSC/IAS/Civil Service criteria (0 upstream 404s logged).
  - **upsc-json-dumps**: SUCCESS - Acquired 'UPSC Star Data.json' (173,529 bytes, valid JSON) from amanbh2/UPSC-Star.
```
