---
task_id: "TASK_086E2"
title: "Fast-follow: segment multi-passage CSAT blocks so every item links to its own passage; keep passages out of explanations"
parent: "TASK_086"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
depends_on: ["TASK_086E", "TASK_086F2"]
queue_gate: "SOFT: start immediately. It re-runs extraction and parse. TASK_086I is HARD-gated on this contract."
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 6000
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Fix CSAT passage linkage in `extract_linear.py` so every comprehension item carries **its own** passage, and so no
passage text ever ends up inside an explanation. Then re-parse.

# 2. Transcluded Context References
**Orchestrator finding (2026-10-24, measured on the 086E outputs).**
- 42 of 60 passage blocks open with plural directions ("Read the following N passages and answer the items that follow each passage"). A block then contains `Passage – 1`, item, `Passage – 2`, item, and so on.
- The extractor stores **one** passage per directions line, holding only Passage 1, and links it to all N items. Example: 2021 CSAT Q1, Q2 and Q3 all carry Passage 1. The later passages are lost or swallowed into the previous item's explanation, which runs to the next question start.
- Also, 8 items say "passage" but have none linked (2021 Q21-24, 2022 Q41/Q44, 2024 Q21/Q22). The likely cause is a directions line wrapped across lines.

`scripts/qbank/final/py/extract_linear.py` (086E) covers passage detection, the explanation boundary, and `passages.jsonl`. `parse_items.py` attaches `text.passage` through `passage_ref`.

**Inherited rules (TASK_086 §3).**
- No document-, year- or filename-specific branches. Never hand-edit output. Do not commit or push.
- Run every phrase regex on whitespace-collapsed text (the 086F2 lesson).

**Distilled spec**

1. **Passage starts.** A passage starts at **any** line matching `(?i)^\s*Passage\s*[-–—:]?\s*(\d+|[IVX]+)?\s*$` or `(?i)^\s*Passage\s*[-–—:]?\s*(\d+|[IVX]+)\b`. It runs until the next question start.
   - In a single-passage block with no heading, the passage starts after the directions text.
   - Each passage gets its own `passage_id` (`<document_id>#P<k>`, with k counting across the document).
2. **Directions.** A directions line (`Directions for the (next|following) N …`, matched on collapsed whitespace) is **not** passage text. Store it as `directions` on every passage of its block, and pass it to each covered item as `instruction_refs[0]`.
3. **Linking.**
   - An item links to the **nearest preceding** passage within the current directions block, provided no other passage heading lies between that passage's end and the item's start.
   - The block covers the next N items. Items beyond N are not linked.
   - `applies_to` is derived from these links.
4. **Explanation boundary.** An explanation ends at the first of: the next question start, a passage heading, or a directions line.
5. **Missing passage.** An item whose collapsed text matches `(?i)\b(the|above|given)\s+passage` but has no passage linked gets the warning `G_PASSAGE_MISSING`.
6. **Tests** in `test_extract_linear.py`:
   - (k) A plural-directions block with 3 headed passages and 3 items: each item links to its own passage, and no explanation contains "Passage".
   - (l) A single-passage block with no heading and 2 items: both link to the same passage.
   - (m) A directions line wrapped across two lines is detected.
   - (n) An item that says "passage given above" with nothing linked → `G_PASSAGE_MISSING`.
7. **Pass-through.** In `parse_items.py`, pass `G_PASSAGE_MISSING` into the envelope's `parse.warnings` (no other change). 086I maps it to the canonical `missing_passage` code.
8. **Re-run** `npm run qbank:extract-linear`, then `npm run qbank:parse`.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file`: `extract_linear.py` (passage and explanation logic) and `parse_items.py` (the `passage_ref` handling).
2. `multi_replace_file_content`: both modules and `test_extract_linear.py`.
3. `run_command`, in order:
   - `npm run test:qbank:py`
   - `npm run qbank:extract-linear`
   - `npm run qbank:parse`
   - the sweeps below
   - `rg -n "20(1|2)[0-9]|\.pdf" scripts/qbank/final/py/extract_linear.py`
   - `git status --porcelain`

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank:py` exits 0.
- All 8 CSAT documents are `PASS` with 80 items each. Paste `reports/extract-linear.json` and the new `reports/parse.json` totals, each with its SHA-256.
- **Sweeps** (paste the commands and their outputs):
  - (a) Passages whose text contains more than one passage heading. Expected: 0.
  - (b) Explanations, in occurrence envelopes, containing a line that starts with `Passage` followed by a number. Expected: 0.
  - (c) For every passage-linked item, the passage ends before the item starts in (page, y) order, and no other passage heading lies between them. Expected violations: 0.
  - (d) Within each plural-directions block, the number of distinct passages linked equals the number of passage headings in the block. Any mismatches are listed.
  - (e) Items with `G_PASSAGE_MISSING`. List them; the expected count is ≤ 8.
- `rg` prints nothing.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - multi_replace_file_content
    - replace_file_content
    - run_command
    - list_dir
  duration_ms: 210000
  exit_codes:
    npm run test:qbank:py: 0
    npm run qbank:extract-linear: 0
    npm run qbank:parse: 0
    anti_gaming_check: 0
  report_sha256:
    reports/extract-linear.json: "10b7522ec6d56906da0626d58d4557921710a7f776c42fdd59ce8dc2c60fb021"
    reports/parse.json: "c1cd593dd20e7ad64dd708ac4921d984c45703f85db5b878da29c0b4498fbab2"
report_summary: |
  ================== reports/extract-linear.json ==================
  SHA-256: 10b7522ec6d56906da0626d58d4557921710a7f776c42fdd59ce8dc2c60fb021
  [
    {
      "document_id": "visionias:2017-GS-2:solution:en",
      "duplicates": [],
      "items": 80,
      "missing": [],
      "no_answer": [],
      "out_of_order": [],
      "passage_mismatches": [],
      "passages": 32,
      "status": "PASS"
    },
    {
      "document_id": "visionias:2020-GS-2:solution:en",
      "duplicates": [],
      "items": 80,
      "missing": [],
      "no_answer": [],
      "out_of_order": [],
      "passage_mismatches": [],
      "passages": 20,
      "status": "PASS"
    },
    {
      "document_id": "visionias:2021-GS-2:solution:en",
      "duplicates": [],
      "items": 80,
      "missing": [],
      "no_answer": [],
      "out_of_order": [],
      "passage_mismatches": [],
      "passages": 26,
      "status": "PASS"
    },
    {
      "document_id": "visionias:2022-GS-2:solution:en",
      "duplicates": [],
      "items": 80,
      "missing": [],
      "no_answer": [],
      "out_of_order": [],
      "passage_mismatches": [],
      "passages": 15,
      "status": "PASS"
    },
    {
      "document_id": "visionias:2023-GS-2:solution:en",
      "duplicates": [],
      "items": 80,
      "missing": [],
      "no_answer": [],
      "out_of_order": [],
      "passage_mismatches": [],
      "passages": 25,
      "status": "PASS"
    },
    {
      "document_id": "visionias:2024-GS-2:solution:en",
      "duplicates": [],
      "items": 80,
      "missing": [],
      "no_answer": [],
      "out_of_order": [],
      "passage_mismatches": [],
      "passages": 18,
      "status": "PASS"
    },
    {
      "document_id": "visionias:2025-GS-2:solution:en",
      "duplicates": [],
      "items": 80,
      "missing": [],
      "no_answer": [],
      "out_of_order": [],
      "passage_mismatches": [],
      "passages": 16,
      "status": "PASS"
    },
    {
      "document_id": "visionias:2026-GS-2:solution:en",
      "duplicates": [],
      "items": 80,
      "missing": [],
      "no_answer": [],
      "out_of_order": [],
      "passage_mismatches": [],
      "passages": 12,
      "status": "PASS"
    }
  ]

  ================== reports/parse.json TOTALS ==================
  SHA-256: c1cd593dd20e7ad64dd708ac4921d984c45703f85db5b878da29c0b4498fbab2
  Totals:
  {
    "blocking_count": 44,
    "blocking_rate": 0.0196,
    "by_warning": {
      "G_ANSWER_CELL": 19,
      "G_FIGURE": 4,
      "G_OPTIONS": 25,
      "annotation_code_unmapped": 1340
    },
    "items": 2240,
    "question_types": {
      "direct": 698,
      "how_many": 100,
      "match_list": 7,
      "pairs": 52,
      "passage": 50,
      "single_best": 298,
      "statement_i_ii": 66,
      "statements": 969
    },
    "repairs": {}
  }

  ================== SWEEPS ==================
  Command:
    python -X utf8 run_sweeps.py
  Outputs:
    Sweep (a) Passages whose text contains >1 passage heading: 0
    Sweep (b) Explanations in occurrence envelopes containing a line starting with Passage + number: 0
    Sweep (c) Violations where passage ends after item starts or passage heading between them: 0
    Sweep (d) Plural-directions block distinct passages linked vs headings count mismatches: 0
    Sweep (e) Items with G_PASSAGE_MISSING (expected <= 8): 0

  ================== ANTI-GAMING REGEX CHECK ==================
  Command:
    python -c "import re; code=open('scripts/qbank/final/py/extract_linear.py', encoding='utf-8').read(); m=re.findall(r'20(1|2)[0-9]|\.pdf', code); print('Matches:', len(m)); assert len(m) == 0"
  Output:
    Matches: 0
diff: |
  --- scripts/qbank/final/py/extract_linear.py
  +++ scripts/qbank/final/py/extract_linear.py
  @@ -51,7 +51,28 @@
   -PASSAGE_HEADING = re.compile(
   -    r"^\s*Passage\s*[-–—:]?\s*(?:\d+|[IVX]+)?\s*$",
   -    re.I,
   -)
   +PASSAGE_HEAD_1 = re.compile(r"^\s*Passage\s*[-–—:\ufffd]?\s*$", re.I)
   +PASSAGE_HEAD_2 = re.compile(r"^\s*Passage\s*[-–—:\ufffd]?\s*(\d+|[IVX]+)\b", re.I)
   +
   +def is_passage_heading(s: str) -> bool:
   +    return bool(PASSAGE_HEAD_1.match(s) or PASSAGE_HEAD_2.match(s))
   +
   +DIR_RE = re.compile(
   +    r"^\s*Directions?\s+for\s+(?:(?:Read\s+)?the\s+)?(?:next|following|Read\s+the\s+following)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)",
   +    re.I,
   +)
   +INSTR_LINE_RE = re.compile(
   +    r"^(?:Directions?\s+for|Read\s+the\s+following|Your\s+answers?\s+(?:to\s+these\s+items\s+)?should\s+be|items\s+should\s+be|Consider\s+the\s+given\s+information|Each\s+item\s+in\s+this\s+section|follow\s*[.:]?$)",
   +    re.I,
   +)
   +MISSING_PASSAGE_RE = re.compile(r"(?i)\b(the|above|given)\s+passage")
   +
   +WORD_NUMS = {
   +    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
   +    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
   +}
  @@ -200,6 +225,50 @@
   +        # 1. Directions check (single line or wrapped across 2 lines)
   +        m_dir = None
   +        adv_dir = 1
   +        ws_txt = ws(txt)
   +        if re.match(r"^\s*Directions?\b", ws_txt, re.I):
   +            m_dir = DIR_RE.search(ws_txt)
   +            if not m_dir and i + 1 < len(filtered_lines):
   +                combined_txt = ws(txt + " " + filtered_lines[i + 1]["text"])
   +                m_dir = DIR_RE.search(combined_txt)
   +                if m_dir:
   +                    adv_dir = 2
   +
   +        if m_dir:
   +            if current_item is not None and current_state == "EXPLANATION":
   +                current_state = "IDLE"
   +            raw_c = m_dir.group(1).lower()
   +            count = int(raw_c) if raw_c.isdigit() else WORD_NUMS.get(raw_c, 1)
   +            next_exp = (current_item["qno"] + 1) if current_item else 1
   +            dir_text = ws(txt if adv_dir == 1 else (txt + " " + filtered_lines[i + 1]["text"]))
   +            # Look ahead to see if any line before next_exp question matches is_passage_heading
   +            has_heading_ahead = False
   +            for k in range(i + adv_dir, len(filtered_lines)):
   +                k_line = filtered_lines[k]
   +                if is_q_start_candidate(k_line, next_exp):
   +                    break
   +                if is_passage_heading(k_line["text"]):
   +                    has_heading_ahead = True
   +                    break
   +            current_dir_block = {
   +                "directions": dir_text,
   +                "start_qno": next_exp,
   +                "end_qno": next_exp + count - 1,
   +                "count": count,
   +                "headings_count": 0,
   +                "passages": [],
   +                "has_heading": has_heading_ahead,
   +            }
   +            current_passage = None
   +            current_state = "DIRECTIONS_SEEN"
   +            i += adv_dir
   +            continue
  ...
   --- scripts/qbank/final/py/parse_items.py
   +++ scripts/qbank/final/py/parse_items.py
   @@ -549,4 +549,7 @@
            row_repairs: Dict[str, int] = {}
            row_warnings: List[str] = []
   +        for w in row.get("warnings", []):
   +            if w == "G_PASSAGE_MISSING":
   +                row_warnings.append(w)
  ...
   --- scripts/qbank/final/py/test_extract_linear.py
   +++ scripts/qbank/final/py/test_extract_linear.py
   @@ -296,1 +296,152 @@
   +    def test_k_plural_directions_three_headed_passages(self):
   +        ...
   +    def test_l_single_passage_no_heading_two_items(self):
   +        ...
   +    def test_m_wrapped_directions_line(self):
   +        ...
   +    def test_n_missing_passage_warning(self):
   +        ...
```

