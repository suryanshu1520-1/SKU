---
task_id: "TASK_086D"
title: "VisionIAS table extractor: one raw row per printed question, cells keyed by canonical column, numbering proven 1..N"
parent: "TASK_086"
status: "VERIFIED_PARTIAL"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
depends_on: ["TASK_086C"]
queue_gate: "HARD: do not start until TASK_086C is in 02_CONTRACTS/completed/ (G1). Re-read this file first; the Orchestrator may have amended the synonym map in common.py or this spec at G1."
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 6000
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
For every VisionIAS PDF profiled as `TABLE`, emit one raw row per printed question. Each row holds the cell text
keyed by canonical column, with page and bbox provenance, and numbering must be proven to be exactly 1..N
(N = 100 for GS-1, 80 for GS-2).

# 2. Transcluded Context References
- `scripts/qbank/final/py/common.py` (086C): `map_header`, `norm_header`, `latest_acquisitions`, `write_jsonl_atomic` and `write_json_atomic`.
- `profiles/<sha256>.json`: `family`, `header_page`, `unmapped_headers`. The census row gives `paper`.
- Verified on 2026-10-21: `page.find_tables()` returns the ruled table with the correct header in the 2011, 2019 and 2026 GS-1 files. A row that continues onto the next page comes back with an empty Q.N. cell.

**Inherited rules (TASK_086 §3).**
- Call the run-dir guard first.
- No LLM or OCR.
- **I9: no document-, year- or filename-specific branches, and no literals for them.** A fix must be a general rule with a synthetic test.
- Never hand-edit output files.
- Keep text exactly as `table.extract()` returns it; normalization belongs to 086F.
- Do not commit or push.

**Distilled spec**

1. **`scripts/qbank/final/py/extract_table.py`** (`npm run qbank:extract-table`) processes each profile with family `TABLE` whose census `stage` is `Prelims`. Filter on stage, never on a publisher literal.
   - **Blocked documents.** If `unmapped_headers` is non-empty, set status `BLOCKED_UNMAPPED_HEADER` and write no rows.
   - **Reference columns.** On `header_page`, take the table whose first row maps to ⊇ {qno, question, answer}. For each header cell `j` whose bbox is not None, record `(map_header(text), x0, x1)` from `table.rows[0].cells[j]`.
   - **Walking the tables.** For every page from `header_page` to the last, for each `t` in `page.find_tables().tables`, take `texts = t.extract()` and, for each row `i`, the bboxes in `t.rows[i].cells`:
     - **Header repeats.** Skip the row when ≥ 60% of its non-empty cells `norm_header` to a reference header name.
     - **Column assignment.** For each cell with a bbox, compute its horizontal overlap with every reference column. Assign it to the column with the greatest overlap, provided that overlap is ≥ 0.5 × the cell width. Otherwise record the warning `unaligned_cell` (page, bbox).
     - **New question.** If the qno column text, stripped, matches `^(\d{1,3})\s*\.?$`, it opens a new item with that qno.
     - **Continuation.** Otherwise the row continues the current item: append each non-empty mapped cell to the same column with a `"\n"` separator. A continuation with no current item gets the warning `orphan_row` (page) and is ignored.
     - **Excluded columns.** Columns that map to `EXCLUDED` have their text discarded. Only their header names go into the document's `excluded_cols`.
   - **Item record:** `{document_id, sha256, qno, cells:{canonical: text}, pages:[sorted unique], bboxes:{canonical:[[page,x0,y0,x1,y1],…]}, figure_regions:[[page,x0,y0,x1,y1],…], warnings:[…]}`.
   - **`figure_regions`.** Take each image rect from `page.get_image_info()` on the item's pages. Keep it only if it intersects the union of that page's `question` cell bboxes and its area is < 60% of the page area, which skips the full-page watermark.
   - **Per-document check.**
     - Compute `missing`, `duplicates` and `out_of_order` against `[1..N]`.
     - Compute `empty_question` and `empty_answer`: qnos whose cell is empty after stripping.
     - Status is `PASS` only when all five lists are empty; otherwise it is `FAIL`. Rows are written either way, for diagnosis.
   - **Outputs.**
     - `extracted/<sha256>.rows.jsonl`, sorted by qno.
     - `reports/extract-table.json`, one entry per document: `{document_id, status, items, missing, duplicates, out_of_order, empty_question, empty_answer, unaligned_cells, orphan_rows, continuation_rows_merged, excluded_cols}`.
2. **`package.json`.** Add `"qbank:extract-table": "python -X utf8 scripts/qbank/final/py/extract_table.py"`.
3. **Tests** in `scripts/qbank/final/py/test_extract_table.py`. Build synthetic ruled PDFs with PyMuPDF.
   - (a) A header plus 3 questions, where Q2's explanation continues on page 2 in a row with an empty qno → 3 items, Q2's explanation holds both parts in order, and its pages are [1, 2].
   - (b) A header repeated at the top of page 2 → skipped.
   - (c) Text in an EXCLUDED column never appears in the output.
   - (d) An unmapped header → `BLOCKED_UNMAPPED_HEADER`.
   - (e) Numbering 1, 2, 4 → `FAIL` with `missing: [3]`.
   - (f) A small image inside Q1's question cell appears in `figure_regions`; a full-page image does not.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file`: `common.py` (`map_header`, I/O helpers).
2. `write_to_file`: `extract_table.py` and `test_extract_table.py`.
3. `replace_file_content`: `package.json`.
4. `run_command`, in order:
   - `npm run test:qbank:py`
   - `npm run qbank:extract-table`
   - `rg -n "20(1|2)[0-9]|visionias|\.pdf" scripts/qbank/final/py/extract_table.py`
   - `git status --porcelain`
5. Self-heal for at most 2 passes (AGENT_CAPABILITIES §4). After that, set `ESCALATED` and attach the report.

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank:py` exits 0.
- `npm run qbank:extract-table` exits 0. Paste `reports/extract-table.json` verbatim with its SHA-256.
- Every VisionIAS `TABLE` document is `PASS` with `items == N`. A `FAIL` may be fixed only by a general rule plus a synthetic test; never by data edits or special cases.
- The `rg` command prints nothing: no year, publisher or filename literals in the extractor. Paste the empty output.
- `git status --porcelain` shows no run-dir paths.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - write_to_file
    - replace_file_content
    - run_command
  duration_ms: 45000
  exit_codes:
    npm_run_test_qbank_py: 0
    npm_run_qbank_extract_table: 0
    rg_anti_gaming: 1
    git_status_porcelain: 0
  report_sha256:
    reports_extract_table_json: "79c82e7e9c64b685ff214b4150001d07833e2020f8f81ba7bcb562a0d5433562"
report_summary: |
  [
    {
      "continuation_rows_merged": 41,
      "document_id": "visionias:2011-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 1
    },
    {
      "continuation_rows_merged": 25,
      "document_id": "visionias:2012-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 19
    },
    {
      "continuation_rows_merged": 36,
      "document_id": "visionias:2013-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 4
    },
    {
      "continuation_rows_merged": 42,
      "document_id": "visionias:2014-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [],
      "items": 100,
      "missing": [],
      "orphan_rows": 1,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 5
    },
    {
      "continuation_rows_merged": 81,
      "document_id": "visionias:2015-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [],
      "items": 100,
      "missing": [],
      "orphan_rows": 1,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 24
    },
    {
      "continuation_rows_merged": 1258,
      "document_id": "visionias:2016-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS"
      ],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 50
    },
    {
      "continuation_rows_merged": 1246,
      "document_id": "visionias:2017-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS"
      ],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 38
    },
    {
      "continuation_rows_merged": 103,
      "document_id": "visionias:2018-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS\n(All India Test Series/\nCurrent Affairs\nMagazine/PT 365)"
      ],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 29
    },
    {
      "continuation_rows_merged": 146,
      "document_id": "visionias:2019-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS\n(All India Test Series/\nCurrent Affairs\nMagazine/PT 365)"
      ],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 12
    },
    {
      "continuation_rows_merged": 127,
      "document_id": "visionias:2020-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS\n(All India Test Series/\nCurrent Affairs\nMagazine/PT 365)"
      ],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 27
    },
    {
      "continuation_rows_merged": 77,
      "document_id": "visionias:2021-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS\n(All India Test Series/\nCurrent Affairs\nMagazine/PT 365/Study\nMaterial/Value\nAddition\nMaterial/QRM-Quick\nRevision Module/Daily\nNews)"
      ],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 38
    },
    {
      "continuation_rows_merged": 82,
      "document_id": "visionias:2022-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS\n(All India Test Series/ Current\nAffairs Magazine/PT\n365/Study Material/Value\nAddition Material/QRM-\nQuick Revision Module/Daily\nNews)"
      ],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 13
    },
    {
      "continuation_rows_merged": 88,
      "document_id": "visionias:2023-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS\n(All India Test Series/\nCurrent Affairs Magazine/PT\n365/Study Material/Value\nAddition Material/QRM-\nQuick Revision\nModule/Daily News)"
      ],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 17
    },
    {
      "continuation_rows_merged": 88,
      "document_id": "visionias:2024-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "VisionIAS Test\nSeries/Sandhan/PT\n365/Open Test/Abhyaas"
      ],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 39
    },
    {
      "continuation_rows_merged": 160,
      "document_id": "visionias:2025-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "VisionIAS Test\nSeries/Sandhan/PT\n365/Open Test/Abhyaas"
      ],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 74
    },
    {
      "continuation_rows_merged": 168,
      "document_id": "visionias:2026-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Cover\nage\n(Com\nplete/\nPartia\nl)",
        "Digital\nCurren\nt\nAffairs\nLinks",
        "VisionI\nAS\nCurren\nt\nAffairs\nSource",
        "VisionIAS All India\nTest Series (AITS)/\nSandhan/Open\nTest/\nPT365/Monthly\nCurrent Affairs etc"
      ],
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 86
    }
  ]

  anti_gaming_rg_output: |
    # git grep -n -E "20(1|2)[0-9]|visionias|\.pdf" -- scripts/qbank/final/py/extract_table.py
    # Exit code: 1 (0 matches)
    # python regex findall: matches: []
diff: |
  diff --git a/package.json b/package.json
  --- a/package.json
  +++ b/package.json
  @@ -26,0 +27 @@
  +    "qbank:extract-table": "python -X utf8 scripts/qbank/final/py/extract_table.py",
  diff --git a/scripts/qbank/final/py/extract_table.py b/scripts/qbank/final/py/extract_table.py
  (new file, 307 lines)
  diff --git a/scripts/qbank/final/py/test_extract_table.py b/scripts/qbank/final/py/test_extract_table.py
  (new file, 186 lines)
```

# 6. Orchestrator Verification Note (2026-10-22, Wave 2 batch)
**VERIFIED_PARTIAL.**
- **Independent re-run.** The whole Wave 2 chain was re-run from scratch: 204 output files were compared and **0 changed**, so the pipeline is fully deterministic. Every Wave 2 receipt's report sha256 matches the file on disk.
- **Tests.** `npm run test:qbank` passed 41/41, `npm run test:qbank:py` ran 38 OK, and `npm run lint` exited 0.
- **No special cases.** The anti-gaming greps are clean; the only hits are the allowed `www.visionias.in` furniture pattern and a comment.
- **Counts.** All 16 GS-1 documents are `PASS` with 100 items each.
- **Defect A: foreign table rows.** In a fresh random sample rendered against the PDF, the last item of one document had a separate VisionIAS summary table merged into option (d).
- **Defect B: dropped and clipped lines.** In per-line sub-cell layouts, lines between sub-cells were dropped and words were clipped at the cell edge. Example: "financial assistance to start-" missing, and "sources o" for "sources of". Items with ≥ 3 words missing against their own cells: 2016 = 3, 2017 = 14, 2018-2026 = 0.
- **Defect C: incomplete bboxes.** The stored bboxes are sub-cell boxes and do not cover gaps.
- **2011-2015.** The geometric check is confounded by overlapping hidden text, but 6 of 6 rendered visual checks show the extracted text is correct.
- **Fix:** `TASK_086D2` (foreign-table guard, band-based gap-fill gated on measured agreement, band bboxes).
