---
task_id: "TASK_086C"
title: "Document profiler: forensics, text density, table header signature, legend and format family per PDF"
parent: "TASK_086"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_086B"]
queue_gate: "SOFT: run after 086B's first run has written reports/acquire.json with failed = 0."
human_gate: "G1: the Orchestrator verifies this profile, rules on every unmapped header and may amend the synonym map before Wave 2 (086D/086E/086G are HARD-gated on this contract)."
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Profile every bronze PDF so the Orchestrator can verify the extraction plan before any extraction runs. Each
profile records forensics, per-page text density, image-only pages, the table header signature mapped to canonical
columns, the legend page and one format family.

# 2. Transcluded Context References
- Run dir and atomic-write rules from 086A. Census and acquisition rows from 086A/086B.
- PyMuPDF and pdfplumber are already installed for `python` 3.13 (import name `fitz`). Run everything as `python -X utf8`.

**Inherited rules (TASK_086 §3).**
- Call the run-dir guard first.
- No LLM or OCR.
- No document-, year- or filename-specific branches.
- Do not commit or push.
- Reports may contain header names but never source prose.

**Distilled spec**

1. **`scripts/qbank/final/py/common.py`** (shared by every later Python stage)
   - `REPO_ROOT = Path(__file__).resolve().parents[4]`.
   - `run_dir()` returns `QBANK_RUN_DIR`, else `REPO_ROOT/_raw_source_archive/qbank-quality/final-2026-10`.
   - `assert_run_dir_safe()` applies the same rule as 086A: `subprocess` runs `git check-ignore -q <dir>/__probe__.pdf`.
   - JSON helpers:
     - `read_jsonl(path)`.
     - `write_json_atomic(path, obj)`: `json.dumps(sort_keys=True, ensure_ascii=False, indent=2)` plus a newline, written to a temp file and then `os.replace`, retried 3× on `PermissionError`.
     - `write_jsonl_atomic(path, rows)`: one compact `sort_keys=True` line per row.
   - `latest_acquisitions()` maps `document_id` to its latest row with status `ok` or `not_modified`, plus the census row.
   - `norm_header(s) = re.sub(r'[^a-z0-9]', '', s.lower())`.
   - `map_header(raw)` returns the canonical name, `"EXCLUDED"` or `None` (unmapped). It uses exact matches after `norm_header`:
     ```
     qno: qno qn qnno qsno questionno questionnumber sno slno no
     section: section topics subject area subjectarea
     topic: topic subtopic subtopics
     question: question questions
     answer: answer answers ans key answerkey correctanswer correctoption
     explanation: explanation explanations exp solution solutions
     level: level difficulty difficultylevel levelofdifficulty
     nature: nature natureofquestion natureofthequestion
     source: source sources reference references sourcelink sourcelinks
     source_type: sourcetype broadsource typeofsource
     applicability: appuapp
     motivation: any norm starting with "motivation"
     EXCLUDED: starts "visionias" | contains "testseries" | starts "digitalcurrent" | starts "coverage"
               | contains "allindia" | starts "pt365" | contains "sandhan" | contains "abhyaas"
     ```
2. **`scripts/qbank/final/py/profile_docs.py`** (`npm run qbank:profile`). Profile each unique SHA-256 once, listing every `document_id` that shares it.
   - **Forensics:** `producer`, `creator`, `creationDate`, `modDate`, `page_count`, `is_encrypted`, `needs_pass`.
   - **Per page:** `chars = len(page.get_text())`, the image count, and `landscape = width > height`. `image_only_pages` are pages with chars < 30 and ≥ 1 image.
   - **Header search** on pages 1..min(15, n). For each `page.find_tables().tables`, map the cells of `extract()[0]`. The first table whose mapped set contains {qno, question, answer} gives `header_page`, `header_raw`, `header_canonical` and `unmapped_headers` (the raw names that map to `None`).
   - **`tables_per_page`:** counted for every page from `header_page` onward.
   - **`legend_text`:** the first page in 1..10 whose text contains `Nature` and either `Difficulty` or `Level`, taking up to 4000 characters. It is stored only in the profile file, never in a report.
   - **Family** (first match wins):
     - `SCANNED` when the median page chars < 50;
     - `TABLE` when a header is found and ≥ 50% of pages after `header_page` have ≥ 1 table;
     - `LINEAR` when there are ≥ 60 lines matching `^\s*\d{1,3}\.\s` and ≥ 60 matches of `Answer\s*[:\-]?\s*\(?[a-dA-D]\)?`;
     - `MAINS_TEXT` when the census stage is `Mains` and the median chars ≥ 200;
     - else `UNKNOWN`.

     Set `family_evidence` to the numbers that decided the family.
   - **Outputs.**
     - `profiles/<sha256>.json`.
     - `profiles/summary.json`, sorted by `document_id`: `{document_id, sha256, family, pages, median_page_chars, header_canonical, unmapped_headers, producer}`.
     - `reports/profile.json`: counts by family, every document that has `unmapped_headers`, and every `UNKNOWN`/`SCANNED` document.
3. **`scripts/qbank/final/py/requirements.txt`.** Pin the exact versions that `python -m pip show pymupdf pdfplumber` reports.
4. **`package.json`.** Add:
   - `"qbank:profile": "python -X utf8 scripts/qbank/final/py/profile_docs.py"`
   - `"test:qbank:py": "python -X utf8 -m unittest discover -s scripts/qbank/final/py -p \"test_*.py\""`
5. **Tests** in `scripts/qbank/final/py/test_profile.py`. Build the PDFs in a `TemporaryDirectory`: draw ruled grids with `page.draw_rect`/`draw_line` and place text with `insert_text`.
   - (a) Headers `Q.N.`, `Questions`, `A ns w er`, `Explanation`, `Lev el` → family TABLE, `header_canonical = [qno, question, answer, explanation, level]`.
   - (b) `Coverage (Complete/Partial)` → `EXCLUDED`; `Weird Column` → listed in `unmapped_headers`.
   - (c) 60 linear items of the form `N. text (a) w (b) x (c) y (d) z` followed by `Answer: (b)` → LINEAR.
   - (d) Image-only pages → SCANNED.

# 3. Mandatory Tool Chain & Execution Path
1. `run_command`: `python -m pip show pymupdf pdfplumber` (for the pins).
2. `write_to_file`: `common.py`, `profile_docs.py`, `test_profile.py` and `requirements.txt`.
3. `replace_file_content`: `package.json`.
4. `run_command`, in order: `npm run test:qbank:py` → `npm run qbank:profile` → `git status --porcelain`.

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank:py` exits 0. Paste the unittest summary line.
- `npm run qbank:profile` exits 0. Paste `reports/profile.json` verbatim with its SHA-256.
- VisionIAS GS-1 for 2011, 2019 and 2026 is `TABLE`, and VisionIAS GS-2 2026 is `LINEAR`.
- If any of the 24 VisionIAS Prelims documents is not `TABLE` or `LINEAR`, list it. Do not tune the rules to force a family.
- Every `unmapped_headers` entry is pasted verbatim. The delegate does **not** add synonyms; the Orchestrator rules on them at G1.
- Paste the counts of Rau's documents by family.
- `git status --porcelain` shows no run-dir paths.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: {}
  report_sha256: {}
report_summary: |
  <paste reports/profile.json verbatim>
diff: |
  <unified diff, code files only>
```

# 6. Orchestrator Verification Note (2026-10-22, G1)
**VERIFIED, with notes. G1 is cleared for 086D, 086E (amended) and 086G.**
- **Tests.** `npm run test:qbank:py` passed 4/4.
- **Determinism.** The re-run of `npm run qbank:profile` reproduced `reports/profile.json` byte-for-byte (sha256 29ab76fe…), so the profiler is deterministic.
- **Receipt defect.** The receipt quoted sha256 e0d37e06…, which matches no artifact. The content matched the pasted report; only the self-reported hash was wrong (the same class of defect as TASK_018). Future receipts must hash the file on disk.
- **Family results, confirmed by an Orchestrator probe:**
  - 16 GS-1 TABLE documents with 0 unmapped headers.
  - CSAT 2026 is LINEAR.
  - The 7 UNKNOWN documents (VisionIAS CSAT 2017, 2020-2025) are native-text linear documents with exactly 80 answer markers each, spelled `Ans.` (letter on the next line), `Ans:`, `Ans.`, or `Answer:`/`Answer:X`, with question numbers as `N.` or `Q.N.`.
  - Cause: the implementation tested `^\d{1,3}\.\s` per *stripped* line, so a number alone on its line never matched. This was an ambiguity in the Orchestrator's spec ("lines matching"), not a delegate error. It is fixed by Step 0 of the amended TASK_086E.
- **Rau's Mains.** The 40 SCANNED documents (2014 and 2016-2022, all 5 papers) were confirmed as image-only: 0 chars and one full-page image per page (PIXPDF, Adobe Scan, Print-To-PDF). Under the owner's no-OCR rule they are gaps. The 25 Rau's MAINS_TEXT documents cover 2013, 2015 and 2023-2025.
- **Hygiene.** `scripts/qbank/final/py/__pycache__/` was not gitignored; the Orchestrator added `__pycache__/` and `*.pyc` to `.gitignore`.
