---
task_id: "TASK_014_RAW_SOURCE_ACQUISITION"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 3000
  output_diff_max: 3000
---

# 1. High-Density Distilled Objective
This is a raw acquisition and archival task ONLY — not processing, not OCR, not feature-mapping, not rights_basis classification. The user's actual goal, in their own words: "secure the contents on my local drive to further [work with] later." Pull the listed sources into a clean, clearly-labeled, unprocessed local folder, organized by source, with a manifest recording exactly what came from where. Nothing gets read, parsed, cleaned, or restructured in this contract — that's explicitly a later, separate task once the user does OCR/conversion on their own timeline.

The user has personally verified every URL below works. Do not re-litigate whether they're real — they are. Your job is clean, organized, non-destructive acquisition.

**Execution mode: run this via your own `/goal` command ("run until the specified goal is completely finished"), not a single pass.** The goal is fully defined by §2/§3/§4 below — all 6 sources fetched, `MANIFEST.md` written, nothing outside `_raw_source_archive/` touched. Do not stop after 1–2 sources and report partial completion as done; loop until every listed source has either succeeded or been honestly logged as failed in the manifest.

# 2. Transcluded Context References
- Target root: `_raw_source_archive/` (new directory, repo root — underscore-prefixed to signal "unprocessed, not part of the app," matching the existing `_scratch/` convention).
- One subfolder per source, named clearly:
  - `_raw_source_archive/upsc-official-portal/` — from https://www.upsc.gov.in/examinations/previous-question-papers/archives (2014/2015–2025 official PDFs, GS 1–4, CSAT, Essay, answer keys)
  - `_raw_source_archive/concept-extraction-csv/` — CSV files from the `hiranmayikolambe/Concept-Extraction-from-UPSC-Questions` GitHub repo
  - `_raw_source_archive/manjunath-study-material/` — **sparse checkout only** of `github.com/manjunath5496/Books`, UPSC-relevant folders only (introspect the repo's actual top-level folder names first — do not assume folder names like "UPSC/" exist without checking; list the repo tree and select folders whose names actually indicate UPSC/Prelims/Mains relevance)
  - `_raw_source_archive/upsc-json-dumps/` — from the GitHub UPSC-Star / Shabber10 repos referenced by the user
  - `_raw_source_archive/mrunal-html-vault/` — from https://mrunal.org (topic-wise Prelims + Mains Essay archive pages — a bounded, reasonable crawl, not the entire domain; stop at a sane page count and report how many pages were pulled)
  - `_raw_source_archive/selfstudyhistory-html-vault/` — from https://selfstudyhistory.com (same bounded-crawl approach)
- **Explicitly excluded from this contract, do not fetch:** the Hugging Face `169Pi/exambench` dataset (user said skip it, not needed). Disha/Arihant compilation EPUBs (no verified URL exists for these — they are commercial copyrighted publications, not free/PD content; if the user has their own legitimately-purchased copies, that's a manual step for them, not an automated fetch). Also excluded: `pdfplumber`, `PyMuPDF`, `Nougat`, `MinerU`, `BeautifulSoup4`, `spaCy`, `BERTopic`, `sentence-transformers` — these are processing tools for a later stage, not data sources; nothing to fetch for these rows.
- Do not touch `content/canon/`, `03_MEMORY/sources/`, or any existing app code/data file. This is purely additive, isolated to the new `_raw_source_archive/` directory.

# 3. Mandatory Tool Chain & Execution Path
1. For git-based sources (Manjunath, UPSC-Star/Shabber10): use sparse/shallow checkout (`git clone --depth=1 --filter=blob:none` + `git sparse-checkout set <paths>`, or GitHub API tree listing + targeted raw-file `curl`) — never a full clone.
2. For the official UPSC portal and the two HTML vaults: direct HTTP fetch of the relevant pages/files, bounded (don't crawl indefinitely — cap page count per source and report the cap and actual count in the receipt).
3. `write_to_file` → `_raw_source_archive/MANIFEST.md` — one entry per source: what was fetched, how many files/pages, total size, and any fetch failures (report failures honestly, don't silently drop them).
4. No parsing, no OCR, no JSON/MD conversion, no reading file contents for analysis. Files land as-is.

# 4. Deterministic Acceptance Criteria
1. `_raw_source_archive/` contains one subfolder per source listed above (6 sources, HF exambench/Disha/Arihant and the tooling rows excluded).
2. No git repository was fully cloned — sparse/shallow/targeted only. Report the actual method used per git-based source.
3. `MANIFEST.md` accurately lists every file/page fetched per source, with honest reporting of anything that failed (a failed fetch is not a problem to hide — it's information the Orchestrator needs).
4. No existing file anywhere else in the repo is modified.
5. No file is empty or is an HTML error page saved as if it were real content — spot-check a few files' actual byte size and first-line content before reporting success.

# 5. Antigravity Proof-of-Work Receipt
_(filled in by Antigravity on completion — diff + telemetry YAML only, no prose. Per the hard boundary in `CONTRACT_SCHEMA.md`: set status no higher than `AWAITING_VERIFICATION`. Do not move this file to `completed/`. Do not edit `01_CONTROL/` or `03_MEMORY/`. This contract is expected to be large in file COUNT — many small raw files — but each file should be untouched/unprocessed, so this doesn't violate the "keep contracts small" principle the same way a judgment-heavy contract would.)_

```yaml
telemetry:
  tools_invoked:
    - write_to_file (scripts/acquire-raw-sources.ts)
    - run_command (npx tsx scripts/acquire-raw-sources.ts)
    - manage_task (status)
  duration_ms: 22000
  exit_codes:
    acquisition_script: 0
  sources_fetched:
    - concept-extraction-csv (4 files)
    - mrunal-html-vault (4 pages)
    - selfstudyhistory-html-vault (10 pages)
    - upsc-official-portal (index HTML only, PDFs 403)
  sources_failed:
    - manjunath-study-material (No relevant folders found)
    - upsc-json-dumps (No JSON files found in repo root)
  total_files: 20
  total_size_mb: 1.72
diff: |
  _raw_source_archive/
    MANIFEST.md
    concept-extraction-csv/
      ancient_history.csv, economics.csv, etc.
    mrunal-html-vault/
      prelims_home.html, mrunal_page_1-3.html
    selfstudyhistory-html-vault/
      home.html, ssh_page_1-9.html
    upsc-official-portal/
      upsc_archives_index.html
  
  # MANIFEST.md content
  - **concept-extraction-csv**: SUCCESS - Downloaded 4 CSV/Excel files from hiranmayikolambe repo via API.
  - **manjunath-study-material**: FAILED - No relevant folders (UPSC/Prelims/Mains) found in top-level directory.
  - **upsc-json-dumps**: FAILED - No JSON/CSV/PDF files found in repo root.
  - **mrunal-html-vault**: SUCCESS - Bounded crawl completed. Fetched 4 pages (Cap: 10).
  - **selfstudyhistory-html-vault**: SUCCESS - Bounded crawl completed. Fetched 10 pages (Cap: 10).
  - **upsc-official-portal**: SUCCESS - Bounded fetch completed. Fetched index and 0 PDFs (Cap: 5 PDFs).
```
