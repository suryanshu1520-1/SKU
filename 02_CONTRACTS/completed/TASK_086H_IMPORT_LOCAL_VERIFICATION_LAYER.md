---
task_id: "TASK_086H"
title: "Import the locally held, already-digitised official keys (900) and proofread transcriptions as a verification layer"
parent: "TASK_086"
status: "VERIFIED_PARTIAL"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
depends_on: ["TASK_086A"]
queue_gate: "SOFT: needs only run-dir.ts from 086A. No network: this contract reads local files only."
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 1500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Turn the owner's existing digitised verification data into run-dir artifacts. The 900 official Series-A keys for
2020-2024 become `KeyAssertion` files, and the proofread GS-I transcriptions become `SourceOccurrence` envelopes.
No network access and no new sources.

# 2. Transcluded Context References
- Local, gitignored inputs that are already on disk:
  - `tark_pyq_handoff/data/official_keys_seriesA_2020_2024.csv`, with columns `id,year,paper,series,qnum,official_key,key_status,item_status,verification,note,official_filename,file_sha256,page,source_tier,mirror_vajiram`.
  - `tark_pyq_handoff/data/cse{2021,2022,2024,2025}_gs1_seriesA_questions.csv`, with columns `id,year,paper,series,qnum,question_text,option_a,option_b,option_c,option_d,official_key,key_status,item_status,deleted_flag,format,n_items,items_json,truth_basis,primary_topic,secondary_topic,word_count,source_url,archive_url,file_sha256,page,source_tier,verification,coder_notes`.
- Types: `server-lib/qbank/types.ts` (`KeyAssertion` :155-165, `EvidenceRef` :92-110, `SourceOccurrence` :234-242). 086I adds `accepted_keys?: OptionKey[] | null` to `KeyAssertion`; emit the field here already.

**Inherited rules (TASK_086 §3).**
- Call the run-dir guard first.
- Deterministic output using `stableStringify`.
- Add no new dependencies. Write a small RFC-4180 CSV parser that handles quoted commas, doubled quotes and newlines inside quotes.
- Do not commit or push.

**Distilled spec** for `scripts/qbank/final/import-handoff.ts` (`npm run qbank:import-handoff`)

1. **Missing input.** If any input file is missing, exit 1 with a message naming it.
2. **Keys.** Map CSV paper `GS1` to `GS-1` and `GS2` to `GS-2`; the slug is `<year>-<paper>`.
   - **Key by `item_status`:**
     - `scored` → `{authority:"official-final", key: lower(official_key)}`. The key must be a-d; otherwise exit 1 naming the row `id`.
     - `dropped` → `{authority:"withdrawn", key:null}`.
     - `two_answers_accepted` → find the two accepted letters:
       1. Take the unique `[A-D]` characters in `official_key` (e.g. `C/D`). If there are exactly 2, use them.
       2. Otherwise apply `\b([A-D])\s*(?:or|and|/|,)\s*([A-D])\b` to `note` (e.g. "both C and D accepted").
       3. Otherwise exit 1 naming the row `id`.

       Emit `{authority:"official-final", key: first alphabetically (lowercase), accepted_keys:[both, lowercase]}`.
     - Any other `item_status` → exit 1 naming the row `id`.
   - **`source_ref` (an `EvidenceRef`):**

     | Field | Value |
     |---|---|
     | `source_document_id` | `upsc:<slug>:key:en` |
     | `source_url` | `https://www.upsc.gov.in/sites/default/files/<official_filename>` |
     | `sha256` | `file_sha256` |
     | `retrieved_at` | the first `\d{4}-\d{2}-\d{2}` in `source_tier`, else `"2026-09-28"` |
     | `page` | `Number(page)` |
     | `region` | `"Q<qnum> cell"` |
     | `language` | `"en"` |
     | `extraction_method` | `"visual_read+glyph_clustering (tark_pyq_handoff)"` |
     | `extraction_version` | `"handoff-2026-09"` |
     | `adjudication` | the `verification` text |
   - **`paper_series_join`:** `"Series A, as printed on UPSC key <official_filename>"`.
   - **Output:** write `keys/official/<slug>.json` = `{paper_slug, series:{A:{"<qnum>": KeyAssertion}}, documents:[unique EvidenceRefs with page and region removed], method:"tark_pyq_handoff import"}`.
3. **Transcriptions.** Process each row of each questions CSV:
   - **Skipped rows.** Skip a row whose `deleted_flag` is truthy or whose `question_text` is empty, and count it.
   - **`text`:**
     - `stem` = `question_text`.
     - `statements` = `items_json` when it parses to an array of ≥ 2 strings, else null.
     - `passage: null`, `figures: null`, `instruction_refs: null`.
     - `options` = `[{key:"a", text: option_a}, …, {key:"d", text: option_d}]`. Any empty option adds the warning `missing_option`.
   - **No key copied.** Never copy `official_key` into a `key_claim`; keys come only from the key files.
   - **`EvidenceRef`:** `{source_document_id:"handoff:<slug>:transcription:en", source_url, sha256: file_sha256, retrieved_at:"2026-09-28", page:Number(page), region:"Q<qnum>", language:"en", extraction_method:"manual-proofread (tark_pyq_handoff)", extraction_version:"handoff-2026-09"}`.
   - **Envelope:** `{occurrence:{occurrence_id:"handoff:<slug>:transcription:en_p<page>_q<qnum>", canonical_id:null, identity:{exam:"UPSC_CSE", stage:"Prelims", year, paper:"GS-1", booklet_series:"A", language:"en", question_number:qnum}, text, evidence}, explanation_claim:null, annotations:null, parse:{warnings}}`.
   - **Output:** write the envelopes to `occurrences/handoff/<slug>.jsonl`, sorted by qnum.
4. **`reports/import-handoff.json`:**
   - `keys` per slug: `{official_final, withdrawn, accepted_multi, total}`.
   - `withdrawn_ids` and `accepted_ids`: the CSV `id`s.
   - `transcriptions` per slug: `{rows, imported, skipped_deleted, skipped_empty, missing_option}`.
5. **`package.json`.** Add `"qbank:import-handoff": "tsx scripts/qbank/final/import-handoff.ts"`.
6. **Tests** in `scripts/qbank-tests/final/import-handoff.test.ts`, using synthetic CSV strings:
   - quoted commas and doubled quotes;
   - the scored, dropped and two-answers mappings;
   - a two-answers row with 3 letters → error;
   - an empty option → `missing_option`;
   - an `official_key` present in a transcription row never reaches `key_claim`;
   - determinism: two runs produce byte-identical output.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file`: the header line plus 2 rows of each CSV, and `server-lib/qbank/types.ts:92-165`.
2. `write_to_file`: `import-handoff.ts` and `import-handoff.test.ts`.
3. `replace_file_content`: `package.json`.
4. `run_command`, in order: `npm run test:qbank` → `npm run qbank:import-handoff` → `git status --porcelain`.

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank` exits 0.
- `npm run qbank:import-handoff` exits 0. Paste the report verbatim with its SHA-256.
- **Key totals:**
  - 10 slugs (2020-2024 × GS-1, GS-2) holding 900 keys in all: GS-1 is 5 × 100 and GS-2 is 5 × 80.
  - `withdrawn_ids` is exactly {CSE-2020-GS1-A-Q27, CSE-2020-GS1-A-Q52, CSE-2021-GS1-A-Q80, CSE-2022-GS1-A-Q61, CSE-2022-GS2-A-Q36, CSE-2023-GS1-A-Q34, CSE-2024-GS1-A-Q20, CSE-2024-GS1-A-Q52, CSE-2024-GS1-A-Q57}.
  - `accepted_ids` is exactly {CSE-2021-GS2-A-Q39}, with `accepted_keys` [c, d].
- Transcription counts are pasted for 2021, 2022, 2024 and 2025.
- `git status --porcelain` shows no run-dir or handoff paths.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: {}
  report_sha256: {}
report_summary: |
  <paste reports/import-handoff.json verbatim>
diff: |
  <unified diff, code files only>
```

# 6. Orchestrator Verification Note (2026-10-22, G1)
**VERIFIED_PARTIAL.**
- **Keys: verified.**
  - All 900 rows were independently re-derived from the CSV against `keys/official/*.json`, with 0 mismatches.
  - The withdrawn ids are exactly the 9 expected.
  - CSE-2021-GS2-A-Q39 has key c and `accepted_keys` [c, d] (the CSV holds `C|D`).
  - Spot checks of the hand-overwritten keys: 2020-GS-1 Q56 = c and 2024-GS-1 Q71 = d.
  - None of the 395 transcription envelopes carries a `key_claim`.
- **Partial: a gap in the Orchestrator's spec, not a delegate error.**
  - Transcriptions for 2021 Q17-100 and all of 2022 were imported as `manual-proofread`.
  - `tark_pyq_handoff/HANDOFF.md:55` declares verified text only for 2021 Q1-16, 2024 and 2025. The per-row CSV `verification` string overstates this.
  - Fixed by the fast-follow `TASK_086H2_HANDOFF_TRANSCRIPTION_SCOPE_FIX`.
- **Scope deviation, disclosed in the receipt diff.** The delegate added `KeyAssertion.accepted_keys` to `server-lib/qbank/types.ts`, which was assigned to 086I. It is harmless, and 086I has been amended to match.
