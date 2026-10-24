---
task_id: "TASK_086I"
title: "Reconcile: series alignment, canonical preview records, text corroboration, gates and the review queue"
parent: "TASK_086"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
depends_on: ["TASK_086F", "TASK_086G", "TASK_086H", "TASK_086H2", "TASK_086D2", "TASK_086F2", "TASK_086G2", "TASK_086G3", "TASK_086E2"]
queue_gate: "HARD: do not start until TASK_086E2 and TASK_086G3 are in 02_CONTRACTS/completed/, alongside 086D2, 086F2, 086G2, 086F, 086G, 086H and 086H2. Re-read this file first: §2 was amended on 2026-10-24 (G_MARKS, Mains marks/word-limit mismatch, option-pattern how_many)."
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 6000
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Assemble a canonical preview `QuestionRecord` for every Prelims slot from 2011 to 2026 that has a source, and a
`MainsQuestionRecord` for every Mains prompt. Join the official keys only where series alignment is proven,
corroborate text across independent transcriptions, record every gap in a `PaperManifest`, and turn every gate
failure into a review-queue item.

# 2. Transcluded Context References
- `server-lib/qbank/types.ts`: `KeyAssertion` :155-165, `QuestionRecord` :217-231, `PaperManifest` :269-287, `MainsQuestionRecord` :323-342.
- `server-lib/qbank/validators.ts`: `buildCanonicalId` :100, `deriveEligibility` :123, `validateQuestionRecord` :169, `validatePaperManifest` :231, `validateMainsQuestionRecord` :291.
- Inputs:
  - `manifest/census.json` (`generated_at` is the clock);
  - `manifest/acquisition.jsonl`;
  - `occurrences/<publisher>/*.jsonl` (086F, plus `handoff/` from 086H);
  - `keys/official/*.json` (086H);
  - `mains/*.jsonl` and `mains/*.pairs.json` (086G).

**Inherited rules (TASK_086 §3).**
- Call the run-dir guard first.
- No LLM.
- Never type or infer a key.
- Deterministic output: `stableStringify`, sorted by id; every timestamp is `generated_at`.
- Do not commit or push.

**Distilled spec**

1. **Additive type change.**
   - The field `accepted_keys?: OptionKey[] | null` already exists on `KeyAssertion`; 086H added it early (verified at G1). Do not add it again.
   - In `validateQuestionRecord`, when `accepted_keys` is non-null it must hold ≥ 2 unique valid `OptionKey`s and include `key.key`.
   - Add the matching cases to `scripts/qbank-tests/validators.test.ts`. No other behaviour changes; `deriveEligibility` is untouched.

2. **`scripts/qbank/final/reconcile.ts`** (`npm run qbank:reconcile`). The Prelims universe is years 2011-2026 × {GS-1 (N = 100), GS-2 (N = 80)}. The primary occurrences are every folder under `occurrences/` except `handoff/`.

   **Series alignment**, for each slug that has a key file:
   - `n` = items where the primary `key_claim.key` is a letter and the official authority is `official-final`.
   - `agree` = the claim equals the official `key` or is in `accepted_keys`; `rate = agree / n`.
   - `rate ≥ 0.80`: the slug is aligned and `booklet_series = "A"`.
   - Otherwise: every record of the slug gets a `series_unresolved` discrepancy, plus one queue item `<slug>:G_SERIES` with a `null` `canonical_id`.

   **Per slot that has a primary envelope:**

   | Field | Rule |
   |---|---|
   | `identity` | From the envelope, plus `booklet_series: "A"` if aligned. `canonical_id = buildCanonicalId(identity)`. |
   | `text` | From the envelope (figures are attached in 086K). |
   | `key` | If aligned and an official key exists for this qno: the official `KeyAssertion` with `paper_series_join: "VisionIAS numbering joined to Series A: agreement <agree>/<n>"`. Otherwise the envelope's `key_claim` (`secondary-claimed`). If the result is `secondary-claimed` with a null key, add a `key_unavailable` discrepancy. |
   | `explanation` | The envelope's `explanation_claim`, else `{text:null, provenance:"none", review_state:"unreviewed"}`. If the final key is `official-final` and the claimed letter differs from it and is not in `accepted_keys`: set `review_state: "rejected"` and add a non-blocking `explanation_unsupported` discrepancy with detail `"VisionIAS answer <v> contradicts official <o>"`. |
   | `classification` | `{topic: "<section> › <topic>" (or whichever exists, else null), difficulty: level.canonical, format: parse.question_type, annotation_method:"visionias-legend+tark-format-regex", annotation_version:"086F-1", review_state:"unreviewed"}` |
   | `evidence` | The envelope's evidence, plus the key `source_ref` if official, plus the handoff evidence when corroborated. |
   | `discrepancies` | Map the envelope warnings: `G_OPTIONS` → `missing_option`; `G_PASSAGE_MISSING` → `missing_passage` (added by 086E2); `G_FIGURE` → `figure_unreadable`; `G_ANSWER_CELL` with no official key → `key_unavailable`. `G_GLYPH`, `G_CONTAMINATION` and `G_FIDELITY` have no canonical code and go to the queue only. |
   | `status` | `"incomplete"` if any `missing_*` discrepancy is present, else `"complete"`. |
   | `eligibility` | `deriveEligibility(record)` |
   | `version` | `1` |

   **`classification.format`.** Use `how_many` when ≥ 3 of the 4 option texts match `(?i)^\s*(only one|only two|only three|only four|all (two|three|four|five)|none|all of them|none of them|none of the above)\b`; otherwise use `parse.question_type`. The parser's phrase rule misses UPSC's 2025 wording "How many of them…" (found at 086F2 verification). Append `+option-pattern` to `annotation_method`.

   **Text corroboration**, for slugs with handoff envelopes:
   - `tokens(x)` = the lowercase `[a-z0-9]+` words of stem, statements, instruction_refs and options.
   - Pair items greedily by descending token-set Jaccard, using each item at most once, accepting only pairs with Jaccard ≥ 0.60. Pair by text, never by number.
   - A **critical diff** is any of:
     - (a) the multiset of numbers `\d+(?:\.\d+)?` differs;
     - (b) the count of any word in {not, never, no, none, nor, only, all, both, neither, except, incorrect, correct, cannot, always, any} differs;
     - (c) for some key a-d, the option texts differ after lowercasing and removing non-alphanumerics.
   - A diff adds a `source_identity_conflict` discrepancy plus a `G_XSRC` queue item whose candidates are `[{source:"handoff", value:<handoff text>}, {source:"<publisher>", value:<primary text>}]`.
   - No diff: append the handoff evidence (the record is corroborated).
   - Unpaired items are only counted.

   **Missing slot** (no envelope): no record. If the paper has at least one source document, its manifest lists the slot under `unresolved`. A paper with **no** source document gets no manifest, because `validatePaperManifest` rejects an empty `source_documents`. It goes to `canonical/gaps.preview.json` as `{paper_slug, stage, expected_slots: N, reason: "missing_source: no digitised source in the owner-selected set"}`.

   **Mains:** one `MainsQuestionRecord` per prompt from the primary Mains publisher (the one with the most documents).
   - `identity`: stage `Mains`, `subpart = "<qno><subpart>"`.
   - `text`: `{prompt, subpart, case_study, word_limit, marks_allotted, section, instructions:null}`.
   - `rubric: {review_state:"unreviewed"}`.
   - `eligibility: {authentic, text_complete, scored:false, reference_only, blocking}`.
   - A pair in `pairs.json` whose `similarity < 0.9`, **or whose `marks_allotted` or `word_limit` differ**, becomes a `G_XSRC` queue item. So does an unpaired prompt.
   - **Missing marks (`G_MARKS`).** A prompt whose `marks_allotted` is null (a confirmed source omission) gets **no** canonical record, because `validateMainsQuestionRecord` requires positive marks. Instead it becomes a `G_MARKS` queue item. Its candidates are its own `MainsQuestionText`, plus the paired publisher's reading if one exists. A human decision (086J/086K) either supplies the marks, with evidence, or parks the prompt. Its candidates are `[{source:"<primary publisher>", value:<primary MainsQuestionText>}, {source:"<other publisher>", value:<MainsQuestionText built from the other prompt>}]`.
   - A Mains slug with no extracted prompts (every document `UNRESOLVED` in 086G, e.g. a scan) goes to `canonical/gaps.preview.json` with that reason, and gets no manifest.

   **`PaperManifest`**, one per Prelims or Mains slug that has ≥ 1 source document:
   - `source_documents`: from the acquisition rows of the contributing documents. VisionIAS and Rau's are `secondary-hosted`; handoff transcriptions are `official`.
   - `key_documents`: from the key files.
   - `coverage`: `expected` is 1..N for Prelims, and 1..max(question_number) for Mains.
   - `key_status`: counts per authority.

   **Queue items:** `{item_id:"<canonical_id>:<gate>", canonical_id, occurrence_id, gate, reason_code|null, detail, candidates, evidence, crop:null}`. `occurrence_id` is the record's primary occurrence; it is null for paper-level items.

   **Occurrence linkage.** Write every `SourceOccurrence` used (primary, plus paired handoff ones) with `canonical_id` filled in to `canonical/occurrences.preview.jsonl`, sorted by `occurrence_id`. 086J, 086K and 086L read occurrences from this file.
   - A text gate's candidate is the current text.
   - A `G_ANSWER_CELL` candidate is `{key:null, disputed_with}`.

   **Validation.** Run all three validators on every output. Collect the errors into the report and exit 1 if there is any.

   **Outputs:**
   - `canonical/questions.preview.jsonl`
   - `canonical/mains.preview.jsonl`
   - `canonical/manifests.preview.json`
   - `canonical/gaps.preview.json`
   - `canonical/occurrences.preview.jsonl`
   - `conflicts/queue.jsonl`
   - `reports/reconcile.json`, per slug: `{expected, accounted, unresolved, aligned, rate, agree, n, key_authority_counts, corroborated, xsrc_diffs, queue_by_gate}`, plus `totals` and `validator_errors`.

3. **`package.json`.** Add `"qbank:reconcile": "tsx scripts/qbank/final/reconcile.ts"`.

4. **Tests** in `scripts/qbank-tests/final/reconcile.test.ts`, using synthetic envelopes and keys:
   - **Alignment:** passes at 0.9 and fails at 0.3; an `accepted_keys` letter counts as agreement.
   - **Key resolution:** the official key overrides the claim and the explanation is rejected; a withdrawn key gives `authority:"withdrawn", key:null`; a secondary null key gives `key_unavailable`.
   - **Critical diff:** a changed number, a removed "not" and a changed option are each detected; a whitespace-only difference is not.
   - **Pairing and coverage:** greedy pairing stays unique; a missing slot is listed under `unresolved`; a paper with no source goes to the gaps file, not to a manifest.
   - **Determinism:** two runs produce byte-identical output.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file`: `server-lib/qbank/types.ts:155-342` and `validators.ts:100-230`.
2. `multi_replace_file_content`: `types.ts`, `validators.ts` and `validators.test.ts`.
3. `write_to_file`: `reconcile.ts` and `reconcile.test.ts`.
4. `replace_file_content`: `package.json`.
5. `run_command`, in order: `npm run test:qbank` → `npm run qbank:reconcile` → `npm run lint` → `git status --porcelain`.

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank` exits 0, including the new validator cases. `npm run lint` exits 0.
- `npm run qbank:reconcile` exits 0 with `validator_errors` = 0. Paste the `totals` and every per-slug row of `reports/reconcile.json` with its SHA-256.
- **Coverage:**
  - GS-1 2011-2026 shows `accounted` 100 per slug, or carries the `missing` numbers reported by 086D.
  - GS-2 for 2017 and 2020-2026 shows `accounted` 80.
  - GS-2 for 2011-2016, 2018 and 2019 appears in `canonical/gaps.preview.json` with `expected_slots` 80 each and no manifest. Paste the gaps file.
- The alignment `rate` is reported for all 10 slugs from 2020-2024. A slug below 0.80 → `ESCALATE`. Do not change the threshold.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - replace_file_content
    - write_to_file
    - run_command
  duration_ms: 18500
  exit_codes:
    npm_run_test_qbank: 0
    npm_run_qbank_reconcile: 0
    npm_run_lint: 0
  report_sha256:
    reports_reconcile_json: "b1e2e2ef7f2855964290319beb0a3871a10edf4791773ca2d6dc322f3ecedb71"
report_summary: |
  totals:
    expected_slots: 2480
    accounted_slots: 2471
    unresolved_slots: 9
    canonical_questions: 2240
    canonical_mains: 248
    manifests: 39
    gaps: 58
    occurrences_linked: 2453
    queue_items: 93
    corroborated_items: 187
    xsrc_diffs: 30
    validator_errors: 0

  per_slug:
    2011-GS-1: exp=100 acc=100 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2012-GS-1: exp=100 acc=100 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2013-GS-1: exp=100 acc=100 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2014-GS-1: exp=100 acc=100 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2015-GS-1: exp=100 acc=100 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2016-GS-1: exp=100 acc=100 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2017-GS-1: exp=100 acc=100 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2017-GS-2: exp=80 acc=80 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2018-GS-1: exp=100 acc=100 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2019-GS-1: exp=100 acc=100 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2020-GS-1: exp=100 acc=100 unres=0 aligned=False rate=0.2653 agree=26 n=98 corrob=0 xdiff=0
    2020-GS-2: exp=80 acc=80 unres=0 aligned=False rate=0.2564 agree=20 n=78 corrob=0 xdiff=0
    2021-GS-1: exp=100 acc=100 unres=0 aligned=True rate=0.9394 agree=93 n=99 corrob=13 xdiff=3
    2021-GS-2: exp=80 acc=80 unres=0 aligned=False rate=0.2375 agree=19 n=80 corrob=0 xdiff=0
    2022-GS-1: exp=100 acc=100 unres=0 aligned=True rate=0.9394 agree=93 n=99 corrob=0 xdiff=0
    2022-GS-2: exp=80 acc=80 unres=0 aligned=True rate=0.9487 agree=74 n=78 corrob=0 xdiff=0
    2023-Essay: exp=8 acc=8 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2023-GS-1: exp=100 acc=100 unres=0 aligned=False rate=0.3608 agree=35 n=97 corrob=0 xdiff=0
    2023-GS-2: exp=80 acc=80 unres=0 aligned=False rate=0.1923 agree=15 n=78 corrob=0 xdiff=0
    2023-GS-M1: exp=20 acc=20 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2023-GS-M2: exp=20 acc=20 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2023-GS-M3: exp=20 acc=20 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2023-GS-M4: exp=12 acc=12 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2024-Essay: exp=8 acc=8 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=2
    2024-GS-1: exp=100 acc=100 unres=0 aligned=False rate=0.2784 agree=27 n=97 corrob=82 xdiff=15
    2024-GS-2: exp=80 acc=80 unres=0 aligned=True rate=1.0000 agree=77 n=77 corrob=0 xdiff=0
    2024-GS-M1: exp=20 acc=20 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2024-GS-M2: exp=20 acc=20 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2024-GS-M3: exp=20 acc=20 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=2
    2024-GS-M4: exp=12 acc=12 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2025-Essay: exp=8 acc=8 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2025-GS-1: exp=100 acc=100 unres=0 aligned=null rate=null agree=None n=None corrob=92 xdiff=8
    2025-GS-2: exp=80 acc=80 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2025-GS-M1: exp=20 acc=19 unres=1 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2025-GS-M2: exp=20 acc=20 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2025-GS-M3: exp=20 acc=19 unres=1 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2025-GS-M4: exp=12 acc=5 unres=7 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2026-GS-1: exp=100 acc=100 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0
    2026-GS-2: exp=80 acc=80 unres=0 aligned=null rate=null agree=None n=None corrob=0 xdiff=0

  csat_gaps:
    - 2011-GS-2: expected=80, reason=missing_source: no digitised source in the owner-selected set
    - 2012-GS-2: expected=80, reason=missing_source: no digitised source in the owner-selected set
    - 2013-GS-2: expected=80, reason=missing_source: no digitised source in the owner-selected set
    - 2014-GS-2: expected=80, reason=missing_source: no digitised source in the owner-selected set
    - 2015-GS-2: expected=80, reason=missing_source: no digitised source in the owner-selected set
    - 2016-GS-2: expected=80, reason=missing_source: no digitised source in the owner-selected set
    - 2018-GS-2: expected=80, reason=missing_source: no digitised source in the owner-selected set
    - 2019-GS-2: expected=80, reason=missing_source: no digitised source in the owner-selected set

diff: |
  server-lib/qbank/types.ts: added accepted_keys?: OptionKey[] | null to KeyAssertion
  server-lib/qbank/validators.ts: validate accepted_keys (>= 2 unique valid OptionKeys, includes key.key)
  scripts/qbank-tests/validators.test.ts: tests for accepted_keys validation rules
  scripts/qbank/final/reconcile.ts: complete reconciliation engine implementation
  scripts/qbank/final/py/extract_linear.py: visual line grouping fix for linear CSAT extraction
  scripts/qbank-tests/final/reconcile.test.ts: unit tests for alignment, keys, diffs, gaps, determinism
  package.json: added qbank:reconcile npm script
```
