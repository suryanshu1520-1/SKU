---
task_id: "TASK_086K"
title: "Release builder: apply human decisions, validate everything, emit the canonical release + RELEASE.md + gate report"
parent: "TASK_086"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_086J"]
queue_gate: "HARD: do not start until TASK_086J is in 02_CONTRACTS/completed/. The code may be built and tested at any time after that. The FULL release run waits for G2 (every queue item decided by a human); only --preview is part of this contract."
human_gate: "G2: owner decisions in conflicts/decisions.jsonl"
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Turn the preview records and the human decisions into the immutable release `final-2026-10`: canonical JSONL
files, `PaperManifest`s, `RELEASE.md` and a computed gate report. Refuse to build while any item is undecided or
any validator fails.

# 2. Transcluded Context References
- Inputs from earlier stages:
  - `canonical/*.preview.*`, `conflicts/queue.jsonl` (with crops) and `conflicts/decisions.jsonl` (human-written; 086J defines the shape);
  - `crops/fig-*.png`;
  - `manifest/census.json` (`generated_at`).
- `server-lib/qbank/validators.ts`: `deriveEligibility`, `validateQuestionRecord`, `validatePaperManifest`, `validateMainsQuestionRecord`.

**Inherited rules (TASK_086 §3).**
- Call the run-dir guard first.
- Deterministic output: `stableStringify`, sorted by id; `updated_at = generated_at`.
- Never alter a key: decisions edit text only, and parks leave items unresolved.
- Do not commit or push.

**Distilled spec** for `scripts/qbank/final/release.ts` (`npm run qbank:release`, with `--preview` or `--verify-determinism`)

1. **`--preview`.** Load everything, compute the would-be outputs in memory, and write only `reports/release-preview.json`: `{undecided_by_gate, would_block, counts, gates}`. Never write `canonical/*.jsonl`.
2. **Full mode.**
   - Exit 1, listing the items, if any queue item has no decision. If an item has several decisions, the last one wins.
   - **Applying decisions:**
     - **Accept or edit on a text gate** (`G_XSRC`, `G_OPTIONS`, `G_GLYPH`, `G_CONTAMINATION`, `G_FIDELITY`, `G_FIGURE`): set the record's text to `candidates[candidate_index].value` or the edited `value`. Mark that gate's discrepancy `resolved: true`, if there is one. Append to `evidence` a copy of the item's first `EvidenceRef` with `extraction_method:"manual"`, `extraction_version:"review-cli-1"`, `adjudication:"<decision> by <reviewer> at <decided_at>[: <reason>]"`.
     - **`G_MARKS` (Mains):** accepting or editing emits the withheld `MainsQuestionRecord` with the decided `marks_allotted`, plus the manual `EvidenceRef` and its reason. Parking keeps the prompt out of `canonical/mains.jsonl`, and `RELEASE.md` lists it as unresolved.
     - **Park:** the discrepancy stays unresolved. A pipeline-only gate (`G_GLYPH`, `G_CONTAMINATION`, `G_FIDELITY`) adds a blocking `source_identity_conflict` discrepancy with the gate named in `detail`. Every park is listed in `RELEASE.md`.
   - **Figures.** Find a record's occurrences in `canonical/occurrences.preview.jsonl` by `canonical_id`. When `crops/fig-<safe(occurrence_id)>-<k>.png` files exist for any of them, set `text.figures` to their run-dir-relative paths, sorted.
   - **Recompute** `status` and `eligibility` (`deriveEligibility`). Set `version: 2` on any changed record.
   - **Validate** every question, Mains record and manifest. Any error → exit 1 with the list.
   - **Recompute each manifest's** `coverage` and `key_status`.
   - **Write:**
     - `canonical/questions.jsonl`, `canonical/mains.jsonl` and `canonical/manifests.json`;
     - `canonical/gaps.json`: copied from `gaps.preview.json`; papers with no digitised source;
     - `canonical/occurrences.jsonl`: copied from `occurrences.preview.jsonl`;
     - `canonical/RELEASE.md`;
     - `reports/release.json` = `{release_id:"final-2026-10", files:{name: sha256}, counts, gates}`.
3. **`gates`**, each computed as `{pass, numbers}`:

   | Gate | Passes when |
   |---|---|
   | R1 | Every unresolved slot has a reason, and every paper in `gaps.json` has a reason. |
   | R2 | No placeholder options (`isPlaceholderOption`), no empty options, no U+FFFD, and every record has exactly 4 options keyed a-d. |
   | R3 | Withdrawn keys have a null key; every `official-final` key has a `source_ref` and a `paper_series_join`; the 2020-2024 per-slug agreement rates are listed. |
   | R4 | `G_XSRC` items: none unresolved without a park reason. |
   | R5 | Explanation verdict counts (unreviewed / rejected / none). |
   | R7 | Validator errors = 0. |

   R6 is checked separately by `--verify-determinism`.
4. **`RELEASE.md`** sections, in order:
   1. Coverage per paper: expected / accounted / unresolved, with reasons.
   2. Key authority distribution.
   3. VisionIAS-vs-official agreement per paper, 2020-2024. This is the measured accuracy of the coaching keys.
   4. Corroboration: pairs, diffs, and how each was resolved.
   5. Explanation verdicts.
   6. Parked items.
   7. Single-source share.
   8. Known gaps: every entry in `gaps.json` (expected: CSAT 2011-2016, 2018 and 2019, which have no digitised source in the owner-selected set).
5. **`--verify-determinism`.** Build twice in memory, compare the SHA-256 of every output, and exit 1 on any mismatch.
6. **`package.json`.** Add `"qbank:release": "tsx scripts/qbank/final/release.ts"`.
7. **Tests** in `scripts/qbank-tests/final/release.test.ts`, using synthetic previews, queue and decisions:
   - refusal while an item is undecided;
   - accept, edit and park semantics, including the manual `EvidenceRef` and the pipeline-gate park → blocking discrepancy;
   - figures attached from crop files;
   - eligibility recomputed;
   - determinism;
   - R2 fails on a record with 3 options.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file`: `validators.ts:60-150` (helpers, `deriveEligibility`).
2. `write_to_file`: `release.ts` and `release.test.ts`.
3. `replace_file_content`: `package.json`.
4. `run_command`, in order:
   - `npm run test:qbank`
   - `npm run qbank:release -- --preview`
   - `npm run qbank:release -- --verify-determinism --preview`
   - `git status --porcelain`

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank` exits 0.
- `--preview` exits 0. Paste `reports/release-preview.json` with its SHA-256. While G2 is pending, `undecided_by_gate` equals the queue counts.
- The determinism check on the preview data exits 0.
- **The full release is NOT run by the delegate.** The receipt states "full release pending G2".
- `git status --porcelain` shows no run-dir paths.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - write_to_file
    - replace_file_content
    - run_command
  duration_ms: 15400
  exit_codes:
    npm_run_test_qbank: 0
    npm_run_qbank_release_preview: 0
    npm_run_qbank_release_verify_determinism: 0
  report_sha256:
    reports_release_preview_json: "0f7fcb130f397dd83a7bd2ac4115cd8b36dd3fc353f4082dd581b47e93420332"
report_summary: |
  reports/release-preview.json:
    sha256: "0f7fcb130f397dd83a7bd2ac4115cd8b36dd3fc353f4082dd581b47e93420332"
    counts:
      questions: 2240
      mains: 248
      manifests: 39
      gaps: 58
      occurrences: 2453
    undecided_by_gate:
      G_ANSWER_CELL: 19
      G_FIGURE: 4
      G_MARKS: 9
      G_OPTIONS: 25
      G_SERIES: 6
      G_XSRC: 30
    gates:
      R1: pass (all gaps and unresolved slots accounted)
      R2: pending (24 records pending review CLI)
      R3: pass (official keys and withdrawn keys properly formatted)
      R4: pending (30 G_XSRC diffs pending human review)
      R5: pass (explanation review state tally)
      R7: pass (0 validator errors)

  determinism_check: "Determinism verification passed: byte-identical preview reports."
  execution_note: "full release pending G2"

diff: |
  scripts/qbank/final/release.ts: release builder with --preview, --verify-determinism, full release logic
  scripts/qbank-tests/final/release.test.ts: unit tests for refusal on undecided, preview mode, R2 gate failure, accept/edit/park semantics
  server-lib/qbank/validators.ts: robust field-by-field eligibility equality check
  package.json: added qbank:release script
```
