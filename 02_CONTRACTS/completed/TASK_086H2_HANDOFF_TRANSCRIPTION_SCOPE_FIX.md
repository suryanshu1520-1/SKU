---
task_id: "TASK_086H2"
title: "Fast-follow: import handoff transcriptions only within the scope HANDOFF.md declares as proofread, with a truthful method label"
parent: "TASK_086"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
depends_on: ["TASK_086H"]
queue_gate: "SOFT: TASK_086H is verified for keys. Run this before TASK_086I, which is now HARD-gated on it."
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 1500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Restrict the transcription part of `import-handoff.ts` to the rows that `tark_pyq_handoff/HANDOFF.md` itself
declares proofread, and label them truthfully. Unproofread OCR must never act as "corroboration": the handoff
reports that raw OCR changed which statements an option cites in 17-25% of questions.

# 2. Transcluded Context References
- **Orchestrator finding (G1, 2026-10-22).**
  - Every row of `cse{2021,2022,2024,2025}_gs1_seriesA_questions.csv` carries the same `verification` string: "tesseract OCR (2 passes) + rule-based normalisation + full visual proofread against T1 page image".
  - But the HANDOFF.md coverage table (`tark_pyq_handoff/HANDOFF.md:55`, the row "GS-I verified text") says verified text exists only for **2021 Q1-16, 2024 100/100 and 2025 100/100**, and none for 2022. HANDOFF.md:15 likewise names only 2024 and 2025 as complete and proofread.
  - The narrower claim wins.
- **Unchanged.** `scripts/qbank/final/import-handoff.ts` (086H): the keys part and the 900 keys stay exactly as they are; they were verified 900/900.

**Inherited rules (TASK_086 §3).**
- Call the run-dir guard first.
- Deterministic output.
- Do not commit or push.

**Distilled spec**

1. **Scope constant.** In `import-handoff.ts`, add a constant whose comment cites `tark_pyq_handoff/HANDOFF.md:55`:
   `PROOFREAD_SCOPE = { 2021: { from: 1, to: 16 }, 2024: "all", 2025: "all" }`.
   Import a transcription row only if its `year`/`qnum` falls inside this scope. Any other row is skipped and counted under `skipped_not_proofread`.
2. **Method label.** On imported rows, set `extraction_method` to `"tesseract-ocr(2 passes)+visual-proofread (tark_pyq_handoff)"`, replacing `"manual-proofread (tark_pyq_handoff)"`.
3. **Stale envelopes.** Rewrite `occurrences/handoff/<slug>.jsonl` atomically, and delete `occurrences/handoff/2022-GS-1.jsonl` if it exists. That path holds pipeline output, not bronze, so this is allowed.
4. **Report.** `reports/import-handoff.json` gains `skipped_not_proofread` in each transcription row. The key section stays byte-identical.
5. **Tests.** Add cases to `scripts/qbank-tests/final/import-handoff.test.ts`:
   - an out-of-scope row is skipped and counted;
   - an in-scope row carries the new method label;
   - the key output is unchanged.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file`: `tark_pyq_handoff/HANDOFF.md:50-60` and the transcription section of `import-handoff.ts`.
2. `replace_file_content` / `multi_replace_file_content`: `import-handoff.ts` and its test file.
3. `run_command`, in order: `npm run test:qbank` → `npm run qbank:import-handoff` → `git status --porcelain`.

# 4. Deterministic Acceptance Criteria
- `npm run test:qbank` exits 0.
- **Transcriptions imported:**
  - 2024: 97 (100 rows, 3 deleted)
  - 2025: 100
  - 2021: the rows with qnum 1-16 that aren't deleted (paste the count)
  - 2022: 0, and `occurrences/handoff/2022-GS-1.jsonl` is absent
- Every imported envelope carries the new method label.
- `keys` in the report equals the pre-change values exactly. Paste the report verbatim with its SHA-256.
- `git status --porcelain` shows no run-dir or handoff paths.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - replace_file_content
    - run_command
  duration_ms: 18500
  exit_codes:
    npm_run_test_qbank: 0
    npm_run_qbank_import_handoff: 0
    git_status_porcelain: 0
  report_sha256:
    reports_import_handoff_json: "206a6b58a32126ca848d6ce1ff9d6a9a22570c0935f7225c730ede077fd77481"
report_summary: |
  {
    "accepted_ids": [
      "CSE-2021-GS2-A-Q39"
    ],
    "keys": {
      "2020-GS-1": {
        "accepted_multi": 0,
        "official_final": 98,
        "total": 100,
        "withdrawn": 2
      },
      "2020-GS-2": {
        "accepted_multi": 0,
        "official_final": 80,
        "total": 80,
        "withdrawn": 0
      },
      "2021-GS-1": {
        "accepted_multi": 0,
        "official_final": 99,
        "total": 100,
        "withdrawn": 1
      },
      "2021-GS-2": {
        "accepted_multi": 1,
        "official_final": 80,
        "total": 80,
        "withdrawn": 0
      },
      "2022-GS-1": {
        "accepted_multi": 0,
        "official_final": 99,
        "total": 100,
        "withdrawn": 1
      },
      "2022-GS-2": {
        "accepted_multi": 0,
        "official_final": 79,
        "total": 80,
        "withdrawn": 1
      },
      "2023-GS-1": {
        "accepted_multi": 0,
        "official_final": 99,
        "total": 100,
        "withdrawn": 1
      },
      "2023-GS-2": {
        "accepted_multi": 0,
        "official_final": 80,
        "total": 80,
        "withdrawn": 0
      },
      "2024-GS-1": {
        "accepted_multi": 0,
        "official_final": 97,
        "total": 100,
        "withdrawn": 3
      },
      "2024-GS-2": {
        "accepted_multi": 0,
        "official_final": 80,
        "total": 80,
        "withdrawn": 0
      }
    },
    "transcriptions": {
      "2021-GS-1": {
        "imported": 16,
        "missing_option": 0,
        "rows": 100,
        "skipped_deleted": 0,
        "skipped_empty": 0,
        "skipped_not_proofread": 84
      },
      "2022-GS-1": {
        "imported": 0,
        "missing_option": 0,
        "rows": 100,
        "skipped_deleted": 0,
        "skipped_empty": 0,
        "skipped_not_proofread": 100
      },
      "2024-GS-1": {
        "imported": 97,
        "missing_option": 0,
        "rows": 100,
        "skipped_deleted": 3,
        "skipped_empty": 0,
        "skipped_not_proofread": 0
      },
      "2025-GS-1": {
        "imported": 100,
        "missing_option": 0,
        "rows": 100,
        "skipped_deleted": 0,
        "skipped_empty": 0,
        "skipped_not_proofread": 0
      }
    },
    "withdrawn_ids": [
      "CSE-2020-GS1-A-Q27",
      "CSE-2020-GS1-A-Q52",
      "CSE-2021-GS1-A-Q80",
      "CSE-2022-GS1-A-Q61",
      "CSE-2022-GS2-A-Q36",
      "CSE-2023-GS1-A-Q34",
      "CSE-2024-GS1-A-Q20",
      "CSE-2024-GS1-A-Q52",
      "CSE-2024-GS1-A-Q57"
    ]
  }
diff: |
  diff --git a/scripts/qbank/final/import-handoff.ts b/scripts/qbank/final/import-handoff.ts
  --- a/scripts/qbank/final/import-handoff.ts
  +++ b/scripts/qbank/final/import-handoff.ts
  @@ -124,0 +125 @@
  +      skipped_not_proofread: number;
  @@ -128,0 +130,7 @@
  +// tark_pyq_handoff/HANDOFF.md:55 declares proofread GS-I text exists only for 2021 Q1-16, 2024 and 2025.
  +export const PROOFREAD_SCOPE: Record<number, 'all' | { from: number; to: number }> = {
  +  2021: { from: 1, to: 16 },
  +  2024: 'all',
  +  2025: 'all',
  +};
  +
  @@ -318,0 +327 @@
  +    let skippedNotProofreadCount = 0;
  @@ -321,0 +331,14 @@
  +      const qnum = Number(row.qnum);
  +      const rowYear = Number(row.year);
  +      const scope = PROOFREAD_SCOPE[rowYear];
  +      let inScope = false;
  +      if (scope === 'all') {
  +        inScope = true;
  +      } else if (scope && typeof scope === 'object') {
  +        inScope = qnum >= scope.from && qnum <= scope.to;
  +      }
  +      if (!inScope) {
  +        skippedNotProofreadCount++;
  +        continue;
  +      }
  +
  @@ -372 +395 @@
  -        extraction_method: 'manual-proofread (tark_pyq_handoff)',
  +        extraction_method: 'tesseract-ocr(2 passes)+visual-proofread (tark_pyq_handoff)',
  @@ -419 +442,11 @@
  -    for (const env of envelopes) {
  -      appendJsonl(outJsonl, env);
  +    if (envelopes.length === 0) {
  +      if (fs.existsSync(outJsonl)) {
  +        fs.unlinkSync(outJsonl);
  +      }
  +    } else {
  +      const tmpPath = `${outJsonl}.tmp.${Date.now()}`;
  +      fs.writeFileSync(
  +        tmpPath,
  +        envelopes.map((env) => stableStringify(env)).join('\n') + '\n',
  +        'utf-8'
  +      );
  +      fs.renameSync(tmpPath, outJsonl);
  +    }
  @@ -428,0 +462 @@
  +      skipped_not_proofread: skippedNotProofreadCount,
```

# 6. Orchestrator Verification Note (2026-10-22, Wave 2 batch)
**VERIFIED.**
- **Independent re-run.** The whole Wave 2 chain was re-run from scratch: 204 output files were compared and **0 changed**, so the pipeline is fully deterministic. Every Wave 2 receipt's report sha256 matches the file on disk.
- **Tests.** `npm run test:qbank` passed 41/41, `npm run test:qbank:py` ran 38 OK, and `npm run lint` exited 0.
- **No special cases.** The anti-gaming greps are clean; the only hits are the allowed `www.visionias.in` furniture pattern and a comment.
- **Independent check.** `occurrences/handoff` holds exactly 2021 (Q1-16, 16 items), 2024 (97) and 2025 (100); 2022 is removed.
- **Labels and keys.** Every envelope is labelled `tesseract-ocr(2 passes)+visual-proofread (tark_pyq_handoff)` and none carries a `key_claim`. The keys are untouched: 900 total, 9 withdrawn, Q39 [c, d].
