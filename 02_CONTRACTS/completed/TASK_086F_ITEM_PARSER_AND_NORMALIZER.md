---
task_id: "TASK_086F"
title: "Item parser + normalizer: raw rows -> canonical-shaped occurrence envelopes, never inferring missing content"
parent: "TASK_086"
status: "VERIFIED_PARTIAL"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
depends_on: ["TASK_086D", "TASK_086E"]
queue_gate: "SOFT: start once reports/extract-table.json and reports/extract-linear.json exist with every document PASS; re-verify them first."
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 6000
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Convert every extracted Prelims row into an occurrence envelope: a `SourceOccurrence` (types.ts) plus the
explanation claim, annotations and parse diagnostics. Normalization must be deterministic and logged. Missing
content is flagged and never inferred.

# 2. Transcluded Context References
- `server-lib/qbank/types.ts`:
  - `EvidenceRef` :92-110
  - `QuestionIdentity` :116-130
  - `QuestionText` :137-149
  - `KeyAssertion` :155-165
  - `ExplanationAssertion` :167-173
  - `SourceOccurrence` :234-242
- Inputs from earlier stages:
  - `extracted/<sha>.rows.jsonl` and `<sha>.passages.jsonl` (086D/086E);
  - `profiles/<sha>.json` (`family`, `legend_text`);
  - the census (`pdf_url`, `year`, `paper`, `publisher`) and acquisition (`retrieved_at`).

**Inherited rules (TASK_086 §3).**
- Call the run-dir guard first.
- No LLM or OCR.
- I9: no document-, year- or filename-specific branches or literals. Output folders come from the census `publisher` value.
- Never hand-edit output.
- Deterministic JSON: `sort_keys`, compact lines.
- Do not commit or push.

**Distilled spec** for `scripts/qbank/final/py/parse_items.py` (`npm run qbank:parse`). Output goes to `occurrences/<publisher>/<year>-<paper>.jsonl`, sorted by qno, plus `reports/parse.json`.

1. **Character normalization**, applied to every cell. Log each change into `parse.repairs[kind] += n`.
   - (a) NFC. U+00A0 becomes a space. Strip trailing spaces on every line.
   - (b) U+FFFD repair:
     - First re-read every bbox of that field with pdfplumber (`page.crop(bbox).extract_text()`, joined with `"\n"`). If that alternative text has no U+FFFD, and its whitespace-free form equals the original's whitespace-free form with each U+FFFD treated as a one-character wildcard, take its characters at those positions. Kind: `glyph_pdfplumber`.
     - Otherwise apply these context rules, in this order:
       - `(?<=[A-Za-z])�(?=[A-Za-z])` → `’` (`glyph_apostrophe`)
       - `(^|\n)\s*�\s+` → `\1• ` (`glyph_bullet`)
       - `�([^�\n]{1,120})�` → `“\1”` (`glyph_quotes`)
       - `\s�\s` → ` – ` (`glyph_dash`)
     - A U+FFFD that survives in the stem, statements, options or passage raises warning `G_GLYPH`. In an explanation it only increments `explanation_glyphs_unresolved`.

2. **Question cell structure.** Work on lines after step 1.
   - **Options.**
     - Find the labels `(?:(?<=\s)|^)\(([a-dA-D])\)\s*`. If none are found, use `(?m)^\s*([a-dA-D])[.)]\s`.
     - Take the **last** `d`, then the last `c` before it, then the last `b` before that, then the last `a` before that.
     - The options are the four segments between those labels, trimmed. The stem region is the text before `a`.
     - If a label is missing, keep the options found, in order, and raise `G_OPTIONS`. **Never infer a label or option text.**
   - **Statements.** These only exist when the stem region has ≥ 2 label lines.
     - A statement starts on a line matching `^\s*(\d{1,2}|I|II|III|IV|V|VI|VII|VIII)\s*[.)]\s+\S`; continuation lines append to it.
     - `text.statements` holds each statement exactly as printed, label and punctuation included (`"1. …"`, `"II) …"`). Never rewrite a label; the fidelity check depends on it.
     - Text before the first statement is the stem lead.
     - Trailing text matching `(Which|How many|Select|What|Choose)[^?:]*[?:]` goes to `text.instruction_refs`. Any other trailing text joins the last statement.
   - **Table-like stems.** When both `List[\s-]*I\b` and `List[\s-]*II\b` occur, or `following pairs` (case-insensitive) occurs, do not split statements. `text.stem` keeps the whole stem region with its line breaks.
   - **Line joins.** Apply these within each block (stem lead, each statement, each option and the instruction) and never across blocks:
     - Build `vocab`, the lowercase tokens matching `[A-Za-z]+(?:-[A-Za-z]+)*` across every cell of the document.
     - `X-\nY`, where Y starts lowercase, becomes `X-Y` if `x-y` is in `vocab`, else `XY`.
     - `X\nY` becomes `XY` only when Y starts lowercase, `xy` is in `vocab` and `y` is never a standalone token in the document; otherwise it becomes `X Y`.
     - Every other break becomes a space, except inside table-like stems.
   - **`parse.question_type`** (first match wins):
     1. `Statement[\s-]*I\b[\s\S]*Statement[\s-]*II\b` → `statement_i_ii`
     2. `How many of the (above|given|following)` (case-insensitive) → `how_many`
     3. List-I/List-II → `match_list`
     4. `following pairs` → `pairs`
     5. ≥ 2 statements → `statements`
     6. `Which one of the following` → `single_best`
     7. a `passage_ref` is present → `passage`
     8. otherwise `direct`

     Also set `parse.has_roman_and_arabic_labels` when the statements use both kinds of label.
   - **Passage.** When the row has a `passage_ref`, `text.passage` is the normalized passage text.

3. **Answer cell.** `^\s*\(?([a-dA-D])\)?\s*\.?\s*$` gives the key as a lowercase letter. Anything else sets `key = null`, sets `disputed_with` to the unique lowercase letters matching `\b[a-dA-D]\b`, and raises `G_ANSWER_CELL`.

4. **Explanation.** A non-empty `explanation` cell becomes `explanation_claim = {text, provenance:"editorial", review_state:"unreviewed", source_refs:[evidence]}`. Otherwise `explanation_claim` is `null`.

5. **Annotations.**
   - `section` and `topic` are normalized strings or null. `motivation` is normalized text or null.
   - `level`, `nature` and `source_type` each get `{raw, canonical}`.
     - Parse the legend with `\b([A-Z]{1,4})\s*[:=]\s*([A-Z][^\n]{2,80})`; the first occurrence of each code wins.
     - The label is the words up to the first `,` `.` `;` `(`, or up to one of {question, questions, which, that, is, are, like, based, from, means}, capped at 4 words.
     - `canonical` is the label lowercased, with each non-alphanumeric run replaced by `_`.
     - A code missing from the legend gets `canonical: null` plus the non-blocking warning `annotation_code_unmapped`.
   - `source_urls`:
     - A line starting with `http` begins a URL.
     - A following line with no spaces that does not start with `http` is appended to it.
     - Then extract `https?://\S+`.

6. **Guards**, run on stem, statements, options and passage:
   - **`G_CONTAMINATION`**: a case-insensitive hit on `vision\s*ias|www\.|https?://|©|all india test series|\bAITS\b|sandhan|abhyaas|PT\s?365|\bTest\s+\d{3,5}\b|Page\s+\d+`.
   - **`G_FIDELITY`**: `fid(field)` is not a substring of `fid(normalized source text)`, where `fid` removes all whitespace and `-`. The source text is the step-1 output of the question cell, or of the passage.
   - **`G_OPTIONS`**: also raised unless there are exactly 4 options that are non-empty and pairwise distinct after `fid`.
   - **`G_FIGURE`**: `\b(figure|diagram|map|graph|chart|picture)\b` (case-insensitive) occurs in the stem or statements while `figure_regions` is empty.

7. **Envelope.**
   - **`EvidenceRef`**:
     - `source_document_id`; `source_url` = census `pdf_url`; `sha256`; `retrieved_at` from acquisition;
     - `page` = the first page; `region = "pages <first>-<last>; fields question/answer"`; `language: "en"`;
     - `extraction_method` = `"native-pdf-text:pymupdf-find_tables"` for a TABLE document or `"native-pdf-text:pymupdf-linear"` for a LINEAR one;
     - `extraction_version: "086F-1"`.
   - **`occurrence`**:
     - `occurrence_id = "<document_id>_p<page>_q<qno>"`; `canonical_id: null`;
     - `identity: {exam:"UPSC_CSE", stage:"Prelims", year, paper, language:"en", question_number: qno}`. There is no `booklet_series`; 086I proves that later.
     - `text: {stem, statements|null, passage|null, options:[{key,text}], figures:null, instruction_refs|null}`;
     - `key_claim: {authority:"secondary-claimed", key, source_ref, disputed_with?}`;
     - `evidence`.
   - The envelope also carries `explanation_claim`, `annotations`, `parse:{question_type, has_roman_and_arabic_labels, repairs, warnings(sorted unique)}`, and passes through `figure_regions` and `bboxes`.

8. **`reports/parse.json`** holds, for each paper, `{items, by_warning, question_types, repairs}`, plus `totals`. `blocking_rate` is the share of items carrying any of `G_OPTIONS`, `G_GLYPH`, `G_CONTAMINATION`, `G_FIDELITY` or `G_ANSWER_CELL`.

9. **Tests** in `scripts/qbank/final/py/test_parse_items.py`. Feed synthetic rows directly, and use one tiny generated PDF for the pdfplumber path.
   - **Structure:**
     - statements with a closing prompt;
     - options on one line;
     - a missing `(d)` → `G_OPTIONS` and no inferred option;
     - roman and arabic labels → flag set;
     - List-I/List-II keeps its line breaks;
     - a "How many" question → `how_many`.
   - **Normalization:**
     - each U+FFFD context rule;
     - `"fundament\nal"` with `fundamental` elsewhere → `fundamental`;
     - `"socio-\neconomic"` with `socio-economic` elsewhere → kept hyphenated.
   - **Guards and cells:**
     - a contamination hit;
     - a tampered field → `G_FIDELITY`;
     - the legend E/M/D maps to easy/medium/difficult, and an unknown code is flagged;
     - the answer cell `B/C` → `key null`, `disputed_with [b, c]`.
   - **Determinism:** the same input twice gives byte-identical output.

10. **`package.json`.** Add `"qbank:parse": "python -X utf8 scripts/qbank/final/py/parse_items.py"`.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file`: `server-lib/qbank/types.ts:92-173` and `:234-242`.
2. `write_to_file`: `parse_items.py` and `test_parse_items.py`.
3. `replace_file_content`: `package.json`.
4. `run_command`, in order:
   - `npm run test:qbank:py`
   - `npm run qbank:parse`
   - the consistency one-liner below
   - `rg -n "20(1|2)[0-9]|visionias|\.pdf" scripts/qbank/final/py/parse_items.py`
   - `git status --porcelain`

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank:py` exits 0.
- `npm run qbank:parse` exits 0. Paste `reports/parse.json` (`totals` plus each paper's `by_warning`) with its SHA-256.
- For every paper, the envelope count equals the extracted item count.
- `totals.blocking_rate ≤ 0.05`. Above that the parser, not the data, is wrong: fix it with a general rule and a test, or `ESCALATE`.
- The consistency one-liner (paste the command and its output) finds 0 envelopes whose option count ≠ 4 without `G_OPTIONS`, and 0 envelopes with U+FFFD in a question field without `G_GLYPH`.
- The `rg` command prints nothing.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - write_to_file
    - replace_file_content
    - run_command
    - grep_search
  duration_ms: 125000
  exit_codes:
    npm run test:qbank:py: 0
    npm run qbank:parse: 0
    consistency_one_liner: 0
    rg_anti_gaming: 1
    git status: 0
  report_sha256:
    reports/parse.json: "408801b0cada8675f36fb1cf98a845ead75369762f0a5057d20dfd4f9e5b74aa"
report_summary: |
  reports/parse.json totals:
  {
    "blocking_count": 60,
    "blocking_rate": 0.0268,
    "by_warning": {
      "G_ANSWER_CELL": 19,
      "G_FIGURE": 4,
      "G_OPTIONS": 41,
      "annotation_code_unmapped": 1340
    },
    "items": 2240,
    "question_types": {
      "direct": 832,
      "how_many": 15,
      "match_list": 7,
      "pairs": 51,
      "passage": 53,
      "single_best": 181,
      "statement_i_ii": 66,
      "statements": 1035
    },
    "repairs": {}
  }

  Per-paper by_warning:
  visionias:2011-GS-1:solution:en items=100 blocking=2 by_warning={'G_OPTIONS': 2, 'annotation_code_unmapped': 100}
  visionias:2012-GS-1:solution:en items=100 blocking=2 by_warning={'G_OPTIONS': 2, 'annotation_code_unmapped': 100}
  visionias:2013-GS-1:solution:en items=100 blocking=0 by_warning={'annotation_code_unmapped': 100}
  visionias:2014-GS-1:solution:en items=100 blocking=0 by_warning={'annotation_code_unmapped': 100}
  visionias:2015-GS-1:solution:en items=100 blocking=1 by_warning={'G_OPTIONS': 1, 'annotation_code_unmapped': 100}
  visionias:2016-GS-1:solution:en items=100 blocking=8 by_warning={'G_OPTIONS': 8, 'annotation_code_unmapped': 100}
  visionias:2017-GS-1:solution:en items=100 blocking=8 by_warning={'G_OPTIONS': 8, 'annotation_code_unmapped': 100}
  visionias:2017-GS-2:solution:en items=80 blocking=0 by_warning={}
  visionias:2018-GS-1:solution:en items=100 blocking=10 by_warning={'G_OPTIONS': 10, 'annotation_code_unmapped': 100}
  visionias:2019-GS-1:solution:en items=100 blocking=1 by_warning={'G_FIGURE': 1, 'G_OPTIONS': 1, 'annotation_code_unmapped': 100}
  visionias:2020-GS-1:solution:en items=100 blocking=0 by_warning={'annotation_code_unmapped': 100}
  visionias:2020-GS-2:solution:en items=80 blocking=2 by_warning={'G_ANSWER_CELL': 2, 'G_FIGURE': 1}
  visionias:2021-GS-1:solution:en items=100 blocking=1 by_warning={'G_OPTIONS': 1, 'annotation_code_unmapped': 3}
  visionias:2021-GS-2:solution:en items=80 blocking=1 by_warning={'G_OPTIONS': 1}
  visionias:2022-GS-1:solution:en items=100 blocking=1 by_warning={'G_OPTIONS': 1, 'annotation_code_unmapped': 100}
  visionias:2022-GS-2:solution:en items=80 blocking=1 by_warning={'G_ANSWER_CELL': 1, 'G_FIGURE': 1}
  visionias:2023-GS-1:solution:en items=100 blocking=2 by_warning={'G_ANSWER_CELL': 2, 'annotation_code_unmapped': 99}
  visionias:2023-GS-2:solution:en items=80 blocking=2 by_warning={'G_ANSWER_CELL': 2}
  visionias:2024-GS-1:solution:en items=100 blocking=1 by_warning={'G_OPTIONS': 1, 'annotation_code_unmapped': 87}
  visionias:2024-GS-2:solution:en items=80 blocking=3 by_warning={'G_ANSWER_CELL': 3}
  visionias:2025-GS-1:solution:en items=100 blocking=0 by_warning={'annotation_code_unmapped': 48}
  visionias:2025-GS-2:solution:en items=80 blocking=4 by_warning={'G_ANSWER_CELL': 4}
  visionias:2026-GS-1:solution:en items=100 blocking=2 by_warning={'G_ANSWER_CELL': 2, 'annotation_code_unmapped': 3}
  visionias:2026-GS-2:solution:en items=80 blocking=8 by_warning={'G_ANSWER_CELL': 3, 'G_FIGURE': 1, 'G_OPTIONS': 5}

  Consistency command & output:
  python -c "from pathlib import Path; import json; opt_errs = 0; glyph_errs = 0; total = 0\nfor p in Path('_raw_source_archive/qbank-quality/final-2026-10/occurrences/visionias').glob('*.jsonl'):\n    for line in p.open(encoding='utf-8'):\n        total += 1\n        env = json.loads(line)\n        occ = env.get('occurrence', env)\n        opts = occ['text'].get('options', [])\n        warns = env['parse'].get('warnings', [])\n        if len(opts) != 4 and 'G_OPTIONS' not in warns:\n            opt_errs += 1\n        fields = [occ['text'].get('stem', '')] + (occ['text'].get('statements') or []) + [o['text'] for o in opts] + ([occ['text']['passage']] if occ['text'].get('passage') else [])\n        if any('\ufffd' in f for f in fields) and 'G_GLYPH' not in warns:\n            glyph_errs += 1\nprint(f'Total envelopes checked: {total}, opt_errs: {opt_errs}, glyph_errs: {glyph_errs}')"
  -> Total envelopes checked: 2240, opt_errs: 0, glyph_errs: 0

  Anti-gaming check:
  rg -n "20(1|2)[0-9]|visionias|\.pdf" scripts/qbank/final/py/parse_items.py
  -> 0 matches (exit code 1)
diff: |
  package.json
  scripts/qbank/final/py/parse_items.py
  scripts/qbank/final/py/test_parse_items.py
```

# 6. Orchestrator Verification Note (2026-10-22, Wave 2 batch)
**VERIFIED_PARTIAL.**
- **Independent re-run.** The whole Wave 2 chain was re-run from scratch: 204 output files were compared and **0 changed**, so the pipeline is fully deterministic. Every Wave 2 receipt's report sha256 matches the file on disk.
- **Tests.** `npm run test:qbank` passed 41/41, `npm run test:qbank:py` ran 38 OK, and `npm run lint` exited 0.
- **No special cases.** The anti-gaming greps are clean; the only hits are the allowed `www.visionias.in` furniture pattern and a comment.
- **Counts.** 2,240 envelopes with `blocking_rate` 0.0268. The consistency checks were reproduced.
- **Zero repairs is genuine.** The raw extracted cells contain no U+FFFD at all, so nothing is being dropped silently.
- **Defect: closing prompt merged.** In 4 of 8 random samples, the closing prompt was merged into the last statement, leaving `instruction_refs` empty.
- **Defect: phrases split across lines.** Phrase regexes don't tolerate line breaks. Only 15 `how_many` items were found, and a pairs question with wrapped lines was typed `direct` and flattened.
- **Limitation (non-blocking).** 1,340 items have `annotation_code_unmapped` because legend mapping fails for most pre-2025 documents. The raw codes are kept.
- **Fix:** `TASK_086F2` (whitespace-tolerant phrase matching, closing-prompt split, summary-table contamination terms).
