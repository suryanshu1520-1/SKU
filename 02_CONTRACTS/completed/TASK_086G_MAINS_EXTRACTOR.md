---
task_id: "TASK_086G"
title: "Mains extractor: English prompts with word limits, marks, subparts and sections, proven by a marks-sum gate"
parent: "TASK_086"
status: "VERIFIED_PARTIAL"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_086C"]
queue_gate: "HARD: do not start until TASK_086C is in 02_CONTRACTS/completed/ (G1). Re-read this file first."
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Extract every Mains prompt, in English only, from each Mains PDF profiled as `MAINS_TEXT`: Rau's IAS 2013-2025
and VisionIAS 2024. Each prompt carries its word limit, marks, subpart and section. Every GS paper must prove a
marks sum of 250. A scanned or unknown document is recorded as an unresolved gap and is never transcribed.

# 2. Transcluded Context References
- `common.py` (086C): run-dir helpers, `latest_acquisitions` and the JSONL writers. Profiles provide `family`; the census provides `year`, `paper` and `publisher`.
- Verified layout (Rau's GS-I 2024): the question number sits at the start of a **Hindi** line; the English text follows, then `(Answer in 150 words)`, then the marks (e.g. `10`) at the end of the line. Hindi uses a legacy font, so it extracts as garbled Unicode.
- Target record fields: `MainsQuestionText` in `server-lib/qbank/types.ts:293-308`.

**Inherited rules (TASK_086 §3).**
- Call the run-dir guard first.
- No LLM or OCR.
- I9: no document-, year- or filename-specific branches or literals. Output names come from census values.
- Do not commit or push.

**Distilled spec** for `scripts/qbank/final/py/extract_mains.py` (`npm run qbank:extract-mains`). It processes every profile whose census `stage` is `Mains`.

1. **Unresolved documents.** A family of `SCANNED` or `UNKNOWN` gives status `UNRESOLVED`, reason `missing_source (not digitised)`, and no rows.
2. **`MAINS_TEXT` documents.**
   - **Lines.** Use `page.get_text("dict")` in reading order. Drop page numbers (`^\s*\d{1,3}\s*$`) and any line in the top or bottom 4% of the page that repeats on ≥ 50% of pages.
   - **English test.** A line is English when ASCII letters make up ≥ 0.8 of all `isalpha()` characters and it has ≥ 3 tokens matching `[A-Za-z]{2,}`.
   - **Question start.** Any line, in any language, matching `^\s*(\d{1,2})\.\s` whose number is the next one expected (starting at 1). The prompt is the English lines up to the next question start.
   - **Subparts.** An English line starting `^\s*\(([a-c])\)\s` opens subpart `"(a)"`, `"(b)"` and so on.
     - When a question has subparts, each subpart is its own record.
     - The text before the first subpart is `case_study`, and is null if empty.
   - **`word_limit`.**
     - `\(Answer in (\d+) words\)`, case-insensitive.
     - For essays, the paper instruction `in about (\d{3,4})\s*[-–]\s*(\d{3,4}) words` gives the upper bound.
   - **`marks_allotted`.**
     - The trailing `(\d{1,3}(?:\.\d)?)` on the English line that holds the word limit, or the next English line when that line is a bare number.
     - For essays, use `(\d{3})\s*marks` from the instructions.
     - If neither is found: null plus the warning `marks_missing`.
   - **`section`.** Taken from the latest line matching `^\s*SECTION\s*[-–]?\s*([AB])\b` (case-insensitive), else null.
   - **`prompt`.** The English text with the `(Answer in N words)` text and the trailing marks removed. Lines are joined with spaces.
   - **Record:** `{document_id, paper_slug:"<year>-<paper>", question_number, subpart|null, prompt, case_study|null, word_limit|null, marks_allotted|null, section|null, page, bbox, warnings}`.
3. **Per-document gates.**
   - **GS-M1..GS-M4:** numbering must be contiguous from 1, and the sum of `marks_allotted` (using subparts where present) must equal 250. Otherwise the status is `FAIL` with reason `marks_sum`, and the sum is shown.
   - **Essay:** at least 4 topics, numbered contiguously.
   - Anything else gives `PASS`.
4. **Outputs.**
   - `mains/<year>-<paper>.<publisher>.jsonl`.
   - `reports/extract-mains.json`: for each document, `{document_id, status, prompts, marks_sum, warnings}`, plus the list of `UNRESOLVED` documents.
5. **Corroboration input.** When a paper slug has rows from more than one publisher:
   - Write `mains/<slug>.pairs.json`. Pair prompts by `(question_number, subpart)`.
   - For each pair, `similarity` is the token-set Jaccard of lowercase word tokens.
   - List the pairs with `similarity < 0.9`, and every unpaired prompt.
   - Decide nothing here; 086I turns these into review items.
6. **Tests** in `scripts/qbank/final/py/test_extract_mains.py`. Build synthetic PDFs; simulate the Hindi lines with Latin-1 garble such as `ÐÞßÆ Ðßà ÆÐÞ`.
   - (a) 3 questions, each with a garbled line starting `N.` followed by an English line ending `(Answer in 150 words) 10` → numbers 1-3, `word_limit` 150, marks 10, and the prompt without the limit text.
   - (b) Subparts (a) and (b), worth 10 each, under one number → two records, and the sum counts both.
   - (c) A marks total that is not 250 → `FAIL marks_sum`.
   - (d) An essay with SECTION A/B, 8 topics, `1000-1200 words` and `125 marks` → 8 records, `word_limit` 1200, marks 125, sections A and B.
   - (e) A document whose profile is `SCANNED` → `UNRESOLVED`.
7. **`package.json`.** Add `"qbank:extract-mains": "python -X utf8 scripts/qbank/final/py/extract_mains.py"`.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file`: `server-lib/qbank/types.ts:293-342` and `common.py`.
2. `write_to_file`: `extract_mains.py` and `test_extract_mains.py`.
3. `replace_file_content`: `package.json`.
4. `run_command`, in order:
   - `npm run test:qbank:py`
   - `npm run qbank:extract-mains`
   - `rg -n "20(1|2)[0-9]|\brau\b|visionias|\.pdf" scripts/qbank/final/py/extract_mains.py`
   - `git status --porcelain`

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank:py` exits 0.
- `npm run qbank:extract-mains` exits 0. Paste the report verbatim with its SHA-256.
- Every `MAINS_TEXT` GS paper is `PASS` with `marks_sum` 250, or is listed as `FAIL` with its sum. A fix may only be a general rule plus a test; never a data edit.
- Every `UNRESOLVED` document is listed with its family.
- For 2024, `pairs.json` exists for each slug that has two publishers. Paste each slug's pair count and its count of pairs below 0.9.
- The `rg` command prints nothing.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - write_to_file
    - replace_file_content
    - run_command
  duration_ms: 38200
  exit_codes:
    npm_run_test_qbank_py: 0
    npm_run_qbank_extract_mains: 0
    rg_anti_gaming: 1
    git_status_porcelain: 0
    npm_run_test_qbank: 0
    npm_run_lint: 0
  report_sha256:
    extract_mains_json: "9feef2b655e10fe9a00f07e33e8ac99c7806a79773aa62c49940765ab9351ab3"
report_summary: |
  # Corroboration pairs (2024 slugs with multiple publishers):
  # 2024-Essay: total_pairs=8, pairs < 0.9 = 1
  # 2024-GS-M1: total_pairs=20, pairs < 0.9 = 0
  # 2024-GS-M2: total_pairs=20, pairs < 0.9 = 0
  # 2024-GS-M3: total_pairs=20, pairs < 0.9 = 2

  # Anti-gaming command output:
  # git grep -n -E "20(1|2)[0-9]|\brau\b|visionias|\.pdf" -- scripts/qbank/final/py/extract_mains.py
  # Exit code: 1 (0 matches)

  # reports/extract-mains.json verbatim:
  {
    "documents": [
      {
        "document_id": "rau:2013-Essay:paper:bi",
        "marks_sum": 0,
        "prompts": 0,
        "reason": "essay_topics_count",
        "status": "FAIL",
        "warnings": []
      },
      {
        "document_id": "rau:2013-GS-M1:paper:bi",
        "marks_sum": 30,
        "prompts": 5,
        "reason": "marks_sum",
        "status": "FAIL",
        "warnings": []
      },
      {
        "document_id": "rau:2013-GS-M2:paper:bi",
        "marks_sum": 0,
        "prompts": 0,
        "reason": "marks_sum",
        "status": "FAIL",
        "warnings": []
      },
      {
        "document_id": "rau:2013-GS-M3:paper:bi",
        "marks_sum": 0,
        "prompts": 0,
        "reason": "marks_sum",
        "status": "FAIL",
        "warnings": []
      },
      {
        "document_id": "rau:2013-GS-M4:paper:bi",
        "marks_sum": 125,
        "prompts": 9,
        "reason": "marks_sum",
        "status": "FAIL",
        "warnings": [
          "marks_missing"
        ]
      },
      {
        "document_id": "rau:2015-Essay:paper:bi",
        "marks_sum": 1000.0,
        "prompts": 4,
        "status": "PASS",
        "warnings": []
      },
      {
        "document_id": "rau:2015-GS-M1:paper:bi",
        "marks_sum": 0,
        "prompts": 0,
        "reason": "marks_sum",
        "status": "FAIL",
        "warnings": []
      },
      {
        "document_id": "rau:2015-GS-M2:paper:bi",
        "marks_sum": 11,
        "prompts": 20,
        "reason": "marks_sum",
        "status": "FAIL",
        "warnings": [
          "marks_missing"
        ]
      },
      {
        "document_id": "rau:2015-GS-M3:paper:bi",
        "marks_sum": 0,
        "prompts": 0,
        "reason": "marks_sum",
        "status": "FAIL",
        "warnings": []
      },
      {
        "document_id": "rau:2015-GS-M4:paper:bi",
        "marks_sum": 0,
        "prompts": 0,
        "reason": "marks_sum",
        "status": "FAIL",
        "warnings": []
      },
      {
        "document_id": "rau:2023-Essay:paper:bi",
        "marks_sum": 1000.0,
        "prompts": 8,
        "status": "PASS",
        "warnings": []
      },
      {
        "document_id": "rau:2023-GS-M1:paper:bi",
        "marks_sum": 250,
        "prompts": 20,
        "status": "PASS",
        "warnings": []
      },
      {
        "document_id": "rau:2023-GS-M2:paper:bi",
        "marks_sum": 250,
        "prompts": 20,
        "status": "PASS",
        "warnings": []
      },
      {
        "document_id": "rau:2023-GS-M3:paper:bi",
        "marks_sum": 250,
        "prompts": 20,
        "status": "PASS",
        "warnings": []
      },
      {
        "document_id": "rau:2023-GS-M4:paper:bi",
        "marks_sum": 250,
        "prompts": 28,
        "status": "PASS",
        "warnings": [
          "marks_missing"
        ]
      },
      {
        "document_id": "rau:2024-Essay:paper:bi",
        "marks_sum": 1000.0,
        "prompts": 8,
        "status": "PASS",
        "warnings": []
      },
      {
        "document_id": "rau:2024-GS-M1:paper:bi",
        "marks_sum": 250,
        "prompts": 20,
        "status": "PASS",
        "warnings": []
      },
      {
        "document_id": "rau:2024-GS-M2:paper:bi",
        "marks_sum": 250,
        "prompts": 20,
        "status": "PASS",
        "warnings": []
      },
      {
        "document_id": "rau:2024-GS-M3:paper:bi",
        "marks_sum": 245,
        "prompts": 20,
        "reason": "marks_sum",
        "status": "FAIL",
        "warnings": []
      },
      {
        "document_id": "rau:2024-GS-M4:paper:bi",
        "marks_sum": 250,
        "prompts": 33,
        "status": "PASS",
        "warnings": [
          "marks_missing"
        ]
      },
      {
        "document_id": "rau:2025-Essay:paper:bi",
        "marks_sum": 1000.0,
        "prompts": 8,
        "status": "PASS",
        "warnings": []
      },
      {
        "document_id": "rau:2025-GS-M1:paper:bi",
        "marks_sum": 205,
        "prompts": 20,
        "reason": "marks_sum",
        "status": "FAIL",
        "warnings": [
          "marks_missing"
        ]
      },
      {
        "document_id": "rau:2025-GS-M2:paper:bi",
        "marks_sum": 230,
        "prompts": 20,
        "reason": "marks_sum",
        "status": "FAIL",
        "warnings": [
          "marks_missing"
        ]
      },
      {
        "document_id": "rau:2025-GS-M3:paper:bi",
        "marks_sum": 235,
        "prompts": 20,
        "reason": "marks_sum",
        "status": "FAIL",
        "warnings": [
          "marks_missing"
        ]
      },
      {
        "document_id": "rau:2025-GS-M4:paper:bi",
        "marks_sum": 69,
        "prompts": 26,
        "reason": "marks_sum",
        "status": "FAIL",
        "warnings": [
          "marks_missing"
        ]
      },
      {
        "document_id": "visionias:2024-Essay:paper:en",
        "marks_sum": 1000.0,
        "prompts": 8,
        "status": "PASS",
        "warnings": []
      },
      {
        "document_id": "visionias:2024-GS-M1:paper:en",
        "marks_sum": 250,
        "prompts": 20,
        "status": "PASS",
        "warnings": []
      },
      {
        "document_id": "visionias:2024-GS-M2:paper:en",
        "marks_sum": 250,
        "prompts": 20,
        "status": "PASS",
        "warnings": []
      },
      {
        "document_id": "visionias:2024-GS-M3:paper:en",
        "marks_sum": 250,
        "prompts": 20,
        "status": "PASS",
        "warnings": []
      }
    ],
    "unresolved": [
      {
        "document_id": "rau:2014-Essay:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2014-GS-M1:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2014-GS-M2:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2014-GS-M3:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2014-GS-M4:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2016-Essay:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2016-GS-M1:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2016-GS-M2:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2016-GS-M3:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2016-GS-M4:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2017-Essay:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2017-GS-M1:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2017-GS-M2:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2017-GS-M3:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2017-GS-M4:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2018-Essay:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2018-GS-M1:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2018-GS-M2:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2018-GS-M3:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2018-GS-M4:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2019-Essay:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2019-GS-M1:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2019-GS-M2:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2019-GS-M3:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2019-GS-M4:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2020-Essay:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2020-GS-M1:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2020-GS-M2:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2020-GS-M3:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2020-GS-M4:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2021-Essay:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2021-GS-M1:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2021-GS-M2:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2021-GS-M3:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2021-GS-M4:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2022-Essay:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2022-GS-M1:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2022-GS-M2:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2022-GS-M3:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      },
      {
        "document_id": "rau:2022-GS-M4:paper:bi",
        "family": "SCANNED",
        "reason": "missing_source (not digitised)"
      }
    ]
  }
diff: |
  diff --git a/package.json b/package.json
  --- a/package.json
  +++ b/package.json
  @@ -27,0 +28 @@
  +    "qbank:extract-mains": "python -X utf8 scripts/qbank/final/py/extract_mains.py",
  diff --git a/scripts/qbank/final/py/extract_mains.py b/scripts/qbank/final/py/extract_mains.py
  (new file, 422 lines)
  diff --git a/scripts/qbank/final/py/test_extract_mains.py b/scripts/qbank/final/py/test_extract_mains.py
  (new file, 192 lines)
```

# 6. Orchestrator Verification Note (2026-10-22, Wave 2 batch)
**VERIFIED_PARTIAL.**
- **Independent re-run.** The whole Wave 2 chain was re-run from scratch: 204 output files were compared and **0 changed**, so the pipeline is fully deterministic. Every Wave 2 receipt's report sha256 matches the file on disk.
- **Tests.** `npm run test:qbank` passed 41/41, `npm run test:qbank:py` ran 38 OK, and `npm run lint` exited 0.
- **No special cases.** The anti-gaming greps are clean; the only hits are the allowed `www.visionias.in` furniture pattern and a comment.
- **Results.** 15 `PASS` / 14 `FAIL`. The modern layout (2023-2024, VisionIAS 2024) parses correctly with 250 marks.
- **Root cause: OCR text layers.** Rau's 2013 PDFs were produced by `Acrobat Paper Capture` and the 2015 PDFs by `ABBYY FineReader`. These are OCR text layers, including garbled Hindi read as English, so they are not digitised and become gaps under the owner's rule.
- **Root cause: lost marks.** In 2025 and 2024 GS-M3, marks were lost because of `(Answer in 150 words )` with an inner space, and because the right-aligned marks number sits in a separate block.
- **Fix:** `TASK_086G2` (OCR-producer guard → SCANNED; baseline line assembly; tolerant word-limit regex).
