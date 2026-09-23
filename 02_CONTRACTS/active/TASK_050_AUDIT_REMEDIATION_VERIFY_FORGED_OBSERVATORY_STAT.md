---
task_id: "TASK_050_AUDIT_REMEDIATION_VERIFY_FORGED_OBSERVATORY_STAT"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 1500
  output_diff_max: 1500
depends_on: []
queue_gate: "NONE — independent audit verification."
---

# 1. High-Density Distilled Objective
Verify and certify that all fabricated or unmeasured statistical claims (specifically chi-square and p-value claims flagged in the 2026-08-30 audit) have been excised from `src/components/Observatory.tsx`, ensuring that any displayed analytics cite real data computed from `master_7841_pyqs.json` or present an honest empty state.

# 2. Transcluded Context References
- `src/components/Observatory.tsx:1-120` — verified high-yield topics and PYQ baseline.
- `server-lib/analytics/pyq_explorer.ts:49-65` — live computed `CorpusCensus` from `master_7841_pyqs.json`.
- `02_CONTRACTS/completed/TASK_024_OBSERVATORY_STAT_HONESTY_PASS.md` — prior art resolving the fabricated census blob.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on `src/components/Observatory.tsx` to inspect active stat presentation.
2. `run_command` to execute the exact required verification grep command:
   `git grep -n -i -E "chi.?square|p.?value|p ?<" src/components/Observatory.tsx`
3. Paste the raw, unedited command execution output into the receipt.
4. `run_command` — `npm run lint`.

# 4. Deterministic Acceptance Criteria
1. `git grep -n -i -E "chi.?square|p.?value|p ?<" src/components/Observatory.tsx` returns 0 lines that reference an unmeasured claim.
2. Raw command output is pasted in full into the Proof-of-Work receipt.
3. `npm run lint` exits 0.
4. Status updated to `AWAITING_VERIFICATION`.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - run_command
    - grep_search
  duration_ms: 12000
  exit_codes:
    git_grep: 1 # 0 matches found
    npm_run_lint: 0
raw_sweep_output:
  command: 'git grep -n -i -E "chi.?square|p.?value|p ?<" src/components/Observatory.tsx'
  stdout: ""
  exit_code: 1
powershell_verification:
  command: 'Get-Content src/components/Observatory.tsx | Select-String -Pattern "chi.?square", "p.?value", "p\s*<"'
  stdout: ""
  exit_code: 0
status_verified: "Clean — zero unmeasured chi-square/p-value claims exist in src/components/Observatory.tsx."
```
