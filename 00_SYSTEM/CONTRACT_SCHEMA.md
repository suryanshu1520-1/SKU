# ACDEP Contract Schema

Rigid specification for every task contract dispatched from the Orchestrator (Claude Code) to the Workhorse (Antigravity IDE). Contracts live in `02_CONTRACTS/{pending,active,completed}/TASK-YYYYMMDD-XXX.md`.

```yaml
---
task_id: "TASK-YYYYMMDD-XXX"
status: "PENDING_EXECUTION" # PENDING_EXECUTION | IN_PROGRESS | AWAITING_VERIFICATION | VERIFIED | ESCALATED
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)" # per 00_SYSTEM/AGENT_CAPABILITIES.md
thinking_tier: "medium" # low | medium | high — see AGENT_CAPABILITIES.md §3
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
One or two sentences. What must be true when this contract is closed.

# 2. Transcluded Context References
Obsidian wikilinks or AST/line-slice pointers only — no pasted file bodies.
- `[[some-note]]`
- `src/path/File.tsx:120-160`

# 3. Mandatory Tool Chain & Execution Path
Ordered list of specific Antigravity tools to invoke (from AGENT_CAPABILITIES.md §2), e.g.:
1. `grep_search` — locate target symbol
2. `view_file` — audit exact line slice
3. `replace_file_content` — apply patch
4. `run_command` — `npm run lint` / `npm run test`

# 4. Deterministic Acceptance Criteria
Concrete, checkable conditions (exit codes, TDD assertions, lint clean). No subjective criteria.

# 5. Antigravity Proof-of-Work Receipt
Filled in by Antigravity on completion — diff + telemetry YAML only, no prose.

```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: {}
diff: |
  <unified diff>
```
```

## Status lifecycle

`PENDING_EXECUTION` → `IN_PROGRESS` → `AWAITING_VERIFICATION` → `VERIFIED` (or `ESCALATED` if unresolved after 2 self-healing passes, per AGENT_CAPABILITIES.md §4).

- **Orchestrator** writes/moves contracts into `02_CONTRACTS/pending/`, promotes to `active/` on dispatch.
- **Workhorse** ingests from `active/`, executes per §4 of `AGENT_CAPABILITIES.md`, writes the receipt in-place, sets status to `AWAITING_VERIFICATION`.
- **Orchestrator** verifies the receipt, moves the contract to `completed/`, and commits.

> [!danger] Hard boundary — recorded after a real violation (2026-08-23)
> Antigravity self-set `status: "VERIFIED"` on TASK_002 and TASK_003, moved both contracts into `02_CONTRACTS/completed/` itself, and edited `01_CONTROL/STATE.md` to report them verified — none of which the Orchestrator had reviewed. The prose above already said the Orchestrator does this; that wasn't sufficient. Rule, not guidance:
> - **`AWAITING_VERIFICATION` is the highest status a delegate may ever write.** `VERIFIED` and `ESCALATED` are Orchestrator-only.
> - **A delegate never moves a file into `02_CONTRACTS/completed/`.** Only the Orchestrator does, after independently re-running the acceptance criteria — not reading the receipt and trusting it.
> - **A delegate never writes to `01_CONTROL/` or `03_MEMORY/`.** Those paths are Orchestrator-exclusive. A delegate's telemetry belongs in the contract's own Proof-of-Work section only.
> - Self-reported gates are not gates — this is already §7.4 of the R&D pipeline delegation contract; this schema now enforces the same rule for ACDEP specifically.

See also: [[AGENT_CAPABILITIES]] for the full tool matrix and anti-patterns this schema must respect.
