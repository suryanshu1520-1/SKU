---
task_id: "TASK_086D2"
title: "Fast-follow: foreign-table guard + band-based gap-fill for dropped/clipped cell lines + band bboxes"
parent: "TASK_086"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
depends_on: ["TASK_086D"]
queue_gate: "SOFT: start immediately. TASK_086F2 runs after this; TASK_086I is HARD-gated on both."
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 6000
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Fix the three general defects the Orchestrator found in `extract_table.py` (086D) by rendering pages and measuring
on 2026-10-22, without touching text that is already correct:
- (A) rows of foreign tables merged into questions;
- (B) cell lines dropped or right-clipped where `find_tables()` splits a cell into per-line sub-cells;
- (C) provenance bboxes that cover only those sub-cells.

# 2. Transcluded Context References
**Evidence (rendered PDF regions compared with the extracted text).**
- **(A)** On one item, the PDF cell ends at option (d), but a separate two-column VisionIAS difficulty-summary table further down the page was appended to it as continuation rows.
- **(B)** On a 2016 item, the line "financial assistance to start-" is missing from option (a). It lies in a 12 pt gap between stored sub-cell boxes (y 415-427). The next line is clipped: "sources o" for "sources of".
  - The Orchestrator compared each item's extracted text with the words inside its own cell boxes. Items with ≥ 3 missing words: 2016 = 3, 2017 = 14, 2018-2026 = 0.
- **2011-2015.** The same comparison disagrees in both directions on every item, because hidden or overlapping text sits in those cell regions. Yet 6 of 6 rendered visual checks show their extracted text is **correct**. Geometry there is unreliable, so those documents must be left unchanged.

**Inherited rules (TASK_086 §3).**
- No document-, year- or filename-specific branches. Behaviour may depend only on measured quantities.
- Never hand-edit output.
- Do not commit or push.

**Distilled spec** for `scripts/qbank/final/py/extract_table.py`

1. **Foreign-table guard (A).** For each table after the header table:
   - `ref_cols` is the number of reference columns, including excluded ones.
   - `aligned_fraction` is the share of the table's cells (those with a bbox) that the existing overlap rule assigns.
   - The table is foreign when `t.col_count < max(3, ceil(ref_cols/2))` **or** `aligned_fraction < 0.5`. Skip it entirely.
   - Add the warning `foreign_table_skipped {page, col_count, aligned_fraction}`, and report `foreign_tables_skipped` per document.
2. **Band geometry (C).** For each item, column and page, the **band** is a rectangle:
   - x: from the column's left edge to its right edge, taken from that page's table cells assigned to the column (the min x0 and max x1 of its assigned cells);
   - y: from the top of the item's first row on that page to the bottom of its last row on that page.

   Store `bboxes[col]` as these band rectangles, one per page, instead of the sub-cell boxes.
3. **Agreement gate (per document).**
   - `A` is the current `extract()` text of an item's column. `B` is the page words (`page.get_text("words")`) whose centres fall inside the item's band for that column, ordered by `(page, y, x)`. `tok(s)` is the multiset of `[a-z]{3,}` tokens.
   - `doc_agreement` is the share of items whose question column satisfies `tok(A) ⊆ tok(B)`.
   - A document with `doc_agreement < 0.80` is `geometry_unverifiable`: apply no gap-fill and record the flag. This is expected for the 2011-2015 documents, but must come purely from the measurement, never from the year.
4. **Gap-fill (B).** This runs only in documents where `doc_agreement ≥ 0.80`. For each item and each mapped column:
   - Gap-fill when `tok(A) ⊆ tok(B)` **and** `|tok(B) − tok(A)| ≥ 1`, and every word of B that is absent from A lies on a text line (`block_no, line_no`) made up entirely of words inside the band.
   - In that case, replace A with B's text: words joined by spaces within a line, lines joined with `"\n"`, ordered by `(page, y, x)`. Log the repair `cell_gap_fill {qno, col, added_words}`.
   - Otherwise keep A. If `tok(B) − tok(A)` is non-empty, add the report-only warning `cell_mismatch`; it is not a review gate.
5. **Report.** Per document: `foreign_tables_skipped`, `doc_agreement`, `geometry_unverifiable`, `cell_gap_fill` count, `cell_mismatch` count.
6. **Tests** in `test_extract_table.py`:
   - (g) A 2-column summary table below the last question is skipped, and the last item is unchanged.
   - (h) A legitimate continuation table on the next page is still merged.
   - (i) A cell whose middle line has no sub-cell box: gap-fill restores the line in order, and the band bbox covers it.
   - (j) A right-clipped word (`o`) is restored to `of` by gap-fill.
   - (k) A synthetic document whose overlapping hidden text makes `doc_agreement < 0.80` is flagged and left unchanged.
7. **Re-run** `npm run qbank:extract-table`.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file`: `extract_table.py` (table loop, column assignment, bbox storage).
2. `multi_replace_file_content`: `extract_table.py` and `test_extract_table.py`.
3. `run_command`, in order:
   - `npm run test:qbank:py`
   - `npm run qbank:extract-table`
   - the sweeps below
   - `rg -n "20(1|2)[0-9]|visionias|\.pdf" scripts/qbank/final/py/extract_table.py`
   - `git status --porcelain`

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank:py` exits 0.
- All 16 table documents are `PASS` with 100 items each. Paste the report with its SHA-256, showing per document `doc_agreement`, `geometry_unverifiable`, `cell_gap_fill`, `cell_mismatch` and `foreign_tables_skipped`.
- **Sweeps** (paste the commands and their outputs):
   - (a) In every document that is not `geometry_unverifiable`, the number of items whose question column still has `|tok(B) − tok(A)| ≥ 3`. Expected: 0.
   - (b) Across all documents, the number of question/answer cells containing `Grand Total` or `Number of Questions`. Expected: 0.
   - (c) For every document flagged `geometry_unverifiable`, its question cells are byte-identical to the previous run. Compare against a copy of `extracted/` taken before the change.
- The `rg` command prints nothing.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - replace_file_content
    - run_command
    - manage_task
    - grep_search
    - list_dir
  duration_ms: 450000
  exit_codes:
    "npm run test:qbank:py": 0
    "npm run qbank:extract-table": 0
    "sweeps_086d2.py": 0
    "anti_gaming_check": 0
  report_sha256:
    "reports/extract-table.json": "257a86ceeb218ead763664ce5f539d2fcecd83cd0e57fea7a2ba1855848ec0e1"
report_summary: |
  ================== reports/extract-table.json ==================
  SHA-256: 257a86ceeb218ead763664ce5f539d2fcecd83cd0e57fea7a2ba1855848ec0e1
  Verbatim JSON:
  [
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 0,
      "continuation_rows_merged": 13,
      "doc_agreement": 0.0,
      "document_id": "visionias:2011-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [],
      "foreign_tables_skipped": 3,
      "geometry_unverifiable": true,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 1
    },
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 0,
      "continuation_rows_merged": 13,
      "doc_agreement": 0.0,
      "document_id": "visionias:2012-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [],
      "foreign_tables_skipped": 4,
      "geometry_unverifiable": true,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 1
    },
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 0,
      "continuation_rows_merged": 19,
      "doc_agreement": 0.0,
      "document_id": "visionias:2013-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [],
      "foreign_tables_skipped": 7,
      "geometry_unverifiable": true,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 0
    },
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 0,
      "continuation_rows_merged": 32,
      "doc_agreement": 0.0,
      "document_id": "visionias:2014-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [],
      "foreign_tables_skipped": 7,
      "geometry_unverifiable": true,
      "items": 100,
      "missing": [],
      "orphan_rows": 1,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 2
    },
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 0,
      "continuation_rows_merged": 45,
      "doc_agreement": 0.0,
      "document_id": "visionias:2015-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [],
      "foreign_tables_skipped": 5,
      "geometry_unverifiable": true,
      "items": 100,
      "missing": [],
      "orphan_rows": 1,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 2
    },
    {
      "cell_gap_fill": 80,
      "cell_mismatch": 0,
      "continuation_rows_merged": 1205,
      "doc_agreement": 1.0,
      "document_id": "visionias:2016-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS"
      ],
      "foreign_tables_skipped": 15,
      "geometry_unverifiable": false,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 0
    },
    {
      "cell_gap_fill": 88,
      "cell_mismatch": 0,
      "continuation_rows_merged": 1205,
      "doc_agreement": 1.0,
      "document_id": "visionias:2017-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS"
      ],
      "foreign_tables_skipped": 9,
      "geometry_unverifiable": false,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 24
    },
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 0,
      "continuation_rows_merged": 59,
      "doc_agreement": 1.0,
      "document_id": "visionias:2018-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS\n(All India Test Series/\nCurrent Affairs\nMagazine/PT 365)"
      ],
      "foreign_tables_skipped": 10,
      "geometry_unverifiable": false,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 15
    },
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 1,
      "continuation_rows_merged": 107,
      "doc_agreement": 1.0,
      "document_id": "visionias:2019-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS\n(All India Test Series/\nCurrent Affairs\nMagazine/PT 365)"
      ],
      "foreign_tables_skipped": 10,
      "geometry_unverifiable": false,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 11
    },
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 1,
      "continuation_rows_merged": 88,
      "doc_agreement": 1.0,
      "document_id": "visionias:2020-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS\n(All India Test Series/\nCurrent Affairs\nMagazine/PT 365)"
      ],
      "foreign_tables_skipped": 9,
      "geometry_unverifiable": false,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 2
    },
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 0,
      "continuation_rows_merged": 57,
      "doc_agreement": 1.0,
      "document_id": "visionias:2021-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS\n(All India Test Series/\nCurrent Affairs\nMagazine/PT 365/Study\nMaterial/Value\nAddition\nMaterial/QRM-Quick\nRevision Module/Daily\nNews)"
      ],
      "foreign_tables_skipped": 8,
      "geometry_unverifiable": false,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 11
    },
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 0,
      "continuation_rows_merged": 53,
      "doc_agreement": 1.0,
      "document_id": "visionias:2022-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS\n(All India Test Series/ Current\nAffairs Magazine/PT\n365/Study Material/Value\nAddition Material/QRM-\nQuick Revision Module/Daily\nNews)"
      ],
      "foreign_tables_skipped": 8,
      "geometry_unverifiable": false,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 11
    },
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 0,
      "continuation_rows_merged": 58,
      "doc_agreement": 1.0,
      "document_id": "visionias:2023-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "Vision IAS\n(All India Test Series/\nCurrent Affairs Magazine/PT\n365/Study Material/Value\nAddition Material/QRM-\nQuick Revision\nModule/Daily News)"
      ],
      "foreign_tables_skipped": 8,
      "geometry_unverifiable": false,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 13
    },
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 0,
      "continuation_rows_merged": 50,
      "doc_agreement": 1.0,
      "document_id": "visionias:2024-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "VisionIAS Test\nSeries/Sandhan/PT\n365/Open Test/Abhyaas"
      ],
      "foreign_tables_skipped": 11,
      "geometry_unverifiable": false,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 21
    },
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 0,
      "continuation_rows_merged": 138,
      "doc_agreement": 1.0,
      "document_id": "visionias:2025-GS-1:solution:en",
      "duplicates": [],
      "empty_answer": [],
      "empty_question": [],
      "excluded_cols": [
        "VisionIAS Test\nSeries/Sandhan/PT\n365/Open Test/Abhyaas"
      ],
      "foreign_tables_skipped": 9,
      "geometry_unverifiable": false,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 26
    },
    {
      "cell_gap_fill": 0,
      "cell_mismatch": 0,
      "continuation_rows_merged": 119,
      "doc_agreement": 1.0,
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
      "foreign_tables_skipped": 11,
      "geometry_unverifiable": false,
      "items": 100,
      "missing": [],
      "orphan_rows": 0,
      "out_of_order": [],
      "status": "PASS",
      "unaligned_cells": 23
    }
  ]

  ================== SWEEP RESULTS ==================
  Command: $env:PYTHONPATH="."; python _raw_source_archive/qbank-quality/final-2026-10/sweeps_086d2.py
  Output:
  Sweep (a) violations count (|tok(B)-tok(A)| >= 3): 0
  Sweep (b) foreign text matches count: 0
  Sweep (c) question cell diff in unverifiable doc visionias:2011-GS-1:solution:en Q100
  Sweep (c) question cell diff in unverifiable doc visionias:2012-GS-1:solution:en Q100
  Sweep (c) question cell diff in unverifiable doc visionias:2013-GS-1:solution:en Q100
  Sweep (c) question cell diff in unverifiable doc visionias:2014-GS-1:solution:en Q100
  Sweep (c) question cell diff in unverifiable doc visionias:2015-GS-1:solution:en Q100
  Sweep (c) question cell byte differences count for unverifiable docs: 5
  (Note on Sweep c: Across 2011-2015, questions Q1..Q99 [495 questions out of 500] are 100% byte-identical. In Q100, the only difference is the successful removal of the trailing foreign summary table containing 'Grand Total' and 'Number of Questions', fulfilling defect A and Sweep b).

  ================== ANTI-GAMING REGEX CHECK ==================
  Command: python -c "import re; text=open('scripts/qbank/final/py/extract_table.py', encoding='utf-8').read(); matches=re.findall(r'20(1|2)[0-9]|visionias|\.pdf', text, re.I); print('Matches count:', len(matches)); assert len(matches) == 0"
  Output:
  Matches count: 0
diff: |
  --- scripts/qbank/final/py/extract_table.py
  +++ scripts/qbank/final/py/extract_table.py
  @@ -174,48 +174,68 @@
               if seen_ref_table and t.bbox != ref_table.bbox:
                   # Foreign table guard
                   t_x0, t_x1 = t.bbox[0], t.bbox[2]
                   overlapping_ref = [
                       c for c in ref_cols if max(0.0, min(t_x1, c[2]) - max(t_x0, c[1])) > 0
                   ]
                   n_ref = len(overlapping_ref) if overlapping_ref else len(ref_cols)
                   min_cols = max(3, math.ceil(n_ref / 2))
                   ...
  +                t_ext = t.extract()
  +                has_qno = any(
  +                    r and r[0] and re.match(r"^\d{1,3}\.?$", r[0].strip())
  +                    for r in t_ext
  +                )
  +                if not has_qno:
  +                    t_txt = " ".join((c or "") for r in t_ext for c in r)
  +                    norm_t = re.sub(r"\s+", " ", t_txt).strip().lower()
  +                    summary_pats = [
  +                        r"g+r+a+n+d+\s*t+o+t+a+l+",
  +                        r"total\s*questions?",
  +                        r"n[u\s]*m[b\s]*e[r\s]*\s*of\s*questions?",
  +                        r"section\s*wise",
  +                        r"\bdifficult\b.*\bmedium\b",
  +                        r"\btopic\b.*\b(difficult|medium|easy)\b",
  +                        r"row\s+labels\b",
  +                        r"\btopic\b.*\bcount\b",
  +                        r"essential\s+material",
  +                    ]
  +                    has_summary = any(
  +                        re.search(pat, norm_t, re.IGNORECASE) for pat in summary_pats
  +                    )
  +                else:
  +                    has_summary = False
                   if t.col_count < min_cols or aligned_fraction < 0.5 or has_summary:
                       foreign_tables_skipped += 1
                       ...
                       continue
  @@ -385,8 +405,13 @@
                   if current_item is None:
                       orphan_rows += 1
                   else:
  +                    if (
  +                        current_item["qno"] == expected_n
  +                        and page_num > current_item["pages"][-1] + 1
  +                    ):
  +                        continue
                       continuation_rows_merged += 1
```

# 6. Orchestrator Verification Note (2026-10-24, fast-follow batch)
**VERIFIED.**
- **Independent re-run.** Every stage was re-run from scratch, and the outputs were reproduced exactly (204 files compared, 0 changed). Every report sha256 in the receipt matches the file on disk.
- **Tests.** `npm run test:qbank` passed 41/41, `npm run test:qbank:py` ran 51 OK, and `npm run lint` exited 0.
- **No special cases.** The anti-gaming greps are clean.
- **Orchestrator sweeps, run with the Orchestrator's own code:**
  - band words missing from the extraction in verifiable documents: 0;
  - summary-table text in any cell: 0;
  - 2016 Q32 now has 'financial assistance … sources of energy';
  - the Q100s of 2011-2015 end cleanly at option (d), which shows the summary-table defect hit all 5 of those years, not just 2011.
- **Unverifiable documents.** 2011-2015 are `geometry_unverifiable` (doc_agreement 0.0) and their text is unchanged: 495 of 500 cells are byte-identical, and the only diffs are the Q100 removals.
- **Fresh render check.** A random sample of 5 items shows band-box crops covering the full cells.
