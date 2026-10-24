---
task_id: "TASK_086J"
title: "Evidence crops (review items + figures) and the human review CLI"
parent: "TASK_086"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_086I"]
queue_gate: "SOFT: start once conflicts/queue.jsonl and reports/reconcile.json exist with validator_errors = 0; re-verify them first."
human_gate: "G2: only the owner (or a reviewer the owner names) runs the interactive review. Antigravity builds and tests it, and never decides an item."
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Render a page-region crop for every review-queue item and every detected figure. Then provide an interactive review
CLI that records human decisions, append-only, in `conflicts/decisions.jsonl`.

# 2. Transcluded Context References
- Queue item shape (086I): `{item_id, canonical_id, gate, reason_code, detail, candidates[{source, value}], evidence[EvidenceRef], crop}`.
- From the envelopes (086F): `bboxes` (`{field: [[page,x0,y0,x1,y1]…]}`) and `figure_regions`. The acquisition log maps a SHA-256 to its bronze path.
- `scripts/qbank/final/run-dir.ts` (`appendJsonl`, `writeJsonAtomic`) and `py/common.py`.

**Inherited rules (TASK_086 §3).**
- Call the run-dir guard first.
- Crops are written only to the run dir.
- Do not commit or push.
- **Never write `conflicts/decisions.jsonl` in the real run dir, and never run the interactive mode against it.**

**Distilled spec**

1. **`scripts/qbank/final/py/crops.py`** (`npm run qbank:crops`)
   - **Item crops.** For each queue item whose `occurrence_id` is non-null, take `evidence[0]`: its `sha256` gives the PDF and its `page` gives the page.
     - Look up the envelope by `occurrence_id` in the `occurrences/` envelope files from 086F/086H.
     - The clip is the union of that envelope's `bboxes` for the `question` (and `answer`) fields on that page. If there are none, use the full page and count it under `full_page_fallbacks`.
     - Paper-level items (`occurrence_id` null) get no crop; count them under `no_region`.
     - Render with `page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=rect)` to `crops/<safe(item_id)>.png`, where `safe` replaces `[^A-Za-z0-9_.-]` with `_`.
     - Set the item's `crop` to the run-dir-relative path, rewriting `conflicts/queue.jsonl` atomically with its order preserved.
   - **Figure crops.** For each envelope with `figure_regions`, render the k-th region (k from 1) to `crops/fig-<safe(occurrence_id)>-<k>.png`.
   - **`reports/crops.json`:** `{queue_crops, figure_crops, full_page_fallbacks, no_region, missing_pdf}`.
2. **`scripts/qbank/final/review.ts`** (`npm run qbank:review`, or `npm run qbank:review -- --stats`)
   - **Core.** A pure function `applyCommand(state, input) → {state, decision?}`. The interactive shell around it uses `node:readline`.
   - **Loading.** Load the queue and any existing decisions. Resume by skipping items that already have a decision.
   - **Display, per item:**
     - `item_id`, `gate`, `detail`;
     - the numbered candidates, each value as compact JSON truncated to 600 characters;
     - the evidence (`source_document_id`, page);
     - the crop path.
   - **Commands:**

     | Input | Effect |
     |---|---|
     | `1..n` | `{decision:"accept_candidate", candidate_index:n-1}` |
     | `e` | Edit (see below) → `{decision:"edit", value}` |
     | `p` | Prompt for a reason of ≥ 10 characters → `{decision:"park", reason}` |
     | `o` | Open the crop: `cmd /c start "" <png>` on win32, else `open`/`xdg-open` |
     | `s` | Skip |
     | `q` | Quit |

     **Editing (`e`):** write the first candidate's value to `conflicts/edit-<safe(item_id)>.json` and run `code --wait <file>`, falling back to `notepad <file>` on win32. Then re-read the file. Validate the value, rejecting and re-prompting on failure:
     - A Prelims item (`canonical_id` contains `_Prelims_`) must hold `stem` (non-empty) and `options` (exactly 4, keys a-d, non-empty).
     - A Mains item (`_Mains_`) must hold a non-empty `prompt`.
   - **Restrictions.**
     - On `G_SERIES` and `G_ANSWER_CELL` items, only `p` and `s` are allowed: a human never types a key.
     - On `G_MARKS` items (Mains marks missing in the source), `e`, `p` and `s` are allowed, plus a candidate number when a paired publisher's reading exists. An edited value must hold a positive `marks_allotted`, and the decision needs a reason of ≥ 10 characters saying where the figure comes from.
   - **Recording.** Append each decision to `conflicts/decisions.jsonl` as `{item_id, decision, candidate_index?, value?, reason?, reviewer:<git config user.name>, decided_at:<ISO now>}`.
   - **`--stats`.** Print `{total, decided, remaining, by_gate:{gate:{total, decided}}}` as JSON, non-interactively.
3. **`package.json`.** Add:
   - `"qbank:crops": "python -X utf8 scripts/qbank/final/py/crops.py"`
   - `"qbank:review": "tsx scripts/qbank/final/review.ts"`
4. **Tests.**
   - `scripts/qbank-tests/final/review.test.ts`, exercising the pure core:
     - accept;
     - park rejects a reason under 10 characters;
     - edit rejects 3 options on a Prelims item and an empty `prompt` on a Mains item;
     - `G_SERIES` and `G_ANSWER_CELL` reject accept and edit;
     - resume skips items already decided.
   - `py/test_crops.py`: a synthetic PDF plus a synthetic queue item → the PNG exists, is > 1 KB, and the item's `crop` is set.

# 3. Mandatory Tool Chain & Execution Path
1. `write_to_file`: `crops.py`, `test_crops.py`, `review.ts` and `review.test.ts`.
2. `replace_file_content`: `package.json`.
3. `run_command`, in order:
   - `npm run test:qbank`
   - `npm run test:qbank:py`
   - `npm run qbank:crops`
   - `npm run qbank:review -- --stats`
   - the decisions check: `node -e "console.log(require('fs').existsSync((process.env.QBANK_RUN_DIR||'_raw_source_archive/qbank-quality/final-2026-10')+'/conflicts/decisions.jsonl'))"`
   - `git status --porcelain`

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank` and `npm run test:qbank:py` both exit 0.
- `npm run qbank:crops` exits 0. Paste `reports/crops.json` with its SHA-256. `queue_crops` equals the number of queue items with a non-null `occurrence_id`, and `missing_pdf` is 0.
- Paste the `--stats` output. `remaining` equals `total`, because nothing has been decided by the delegate.
- The decisions check prints `false`.
- `git status --porcelain` shows no run-dir paths.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - write_to_file
    - replace_file_content
    - run_command
  duration_ms: 16200
  exit_codes:
    npm_run_test_qbank: 0
    npm_run_test_qbank_py: 0
    npm_run_qbank_crops: 0
    npm_run_qbank_review_stats: 0
    decisions_check: 0
  report_sha256:
    reports_crops_json: "8a510f3fd0eb11383ee2c4b52fb3df2ad8ec6ea8b3a8070406b8696fe2f48a98"
report_summary: |
  crops_json:
    sha256: 8a510f3fd0eb11383ee2c4b52fb3df2ad8ec6ea8b3a8070406b8696fe2f48a98
    content:
      queue_crops: 78
      figure_crops: 162
      full_page_fallbacks: 0
      no_region: 15
      missing_pdf: 0

  stats_output:
    total: 93
    decided: 0
    remaining: 93
    by_gate:
      G_SERIES:
        total: 6
        decided: 0
      G_MARKS:
        total: 9
        decided: 0
      G_XSRC:
        total: 30
        decided: 0
      G_OPTIONS:
        total: 25
        decided: 0
      G_FIGURE:
        total: 4
        decided: 0
      G_ANSWER_CELL:
        total: 19
        decided: 0

  decisions_check: "false"

diff: |
  scripts/qbank/final/py/crops.py: render evidence crops for queue items and figure regions
  scripts/qbank/final/py/test_crops.py: synthetic PDF and queue item crop test
  scripts/qbank/final/review.ts: review CLI and pure decision engine applyCommand + --stats
  scripts/qbank-tests/final/review.test.ts: unit tests for review decisions, gate restrictions, resume, stats
  package.json: added qbank:crops and qbank:review scripts
```
