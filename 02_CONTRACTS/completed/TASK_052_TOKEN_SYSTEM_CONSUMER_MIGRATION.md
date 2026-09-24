---
task_id: "TASK_052_TOKEN_SYSTEM_CONSUMER_MIGRATION"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 4000
  output_diff_max: 2500
depends_on: ["TASK_051_TOKEN_SYSTEM_SEMANTIC_MIGRATION"]
queue_gate: "SOFT — confirm TASK_051 tokens in src/index.css before consumer sweep."
---

# 1. High-Density Distilled Objective
Sweep all `.tsx` files in `src/` and replace all legacy `bg-zinc-*`, `text-zinc-*`, `border-zinc-*`, `divide-zinc-*`, `ring-zinc-*`, `bg-neutral-*`, `text-neutral-*`, `border-neutral-*`, `bg-stone-*`, `text-stone-*`, `border-stone-*` classes with canonical semantic tokens (`surface`, `surface-elevated`, `surface-shell`, `border`, `border-subtle`, `primary`, `secondary`, `muted`, `accent`, `focus-ring`). Then and only then, delete the `@theme` remap block in `src/index.css:39-74`.

# 2. Transcluded Context References
- `src/index.css:38-73` — the legacy `zinc/neutral/stone` remap block to be deleted AFTER all consumers are migrated.
- `strategy/design/ux-north-star.md:228-250` — design-system cleanup token specification.
- All 32 consumer files in `src/` identified via `git grep -l -E "\b(zinc|neutral|stone)-[0-9]{2,3}\b" src/`.

# 3. Mandatory Tool Chain & Execution Path
1. Update `src/index.css` `@theme` with utility mappings (`--color-primary`, `--color-secondary`, `--color-muted`) so `text-primary`, `text-secondary`, `text-muted` compile cleanly alongside `surface` and `border`.
2. Systematically replace legacy tokens across all identified `.tsx` files in `src/`.
3. Audit `src/index.css` and delete the remap block (lines 38-73).
4. Run `git grep -n -E "\b(zinc|neutral|stone)-[0-9]{2,3}\b" src/` to verify zero matches remain.
5. Run `npm run lint` and `npm run build`.
6. Paste the raw sweep command and its complete output into the receipt.

# 4. Deterministic Acceptance Criteria
1. `git grep -n -E "\b(zinc|neutral|stone)-[0-9]{2,3}\b" src/` returns 0 matches (raw output empty, exit code 1).
2. The legacy remap block in `src/index.css:38-73` is completely removed.
3. `npm run lint` and `npm run build` exit 0.
4. Status updated to `AWAITING_VERIFICATION`.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - replace_file_content
    - write_to_file
    - run_command
  duration_ms: 110000
  exit_codes:
    git_grep_sweep: 1 # 0 matches found in src/
    npm_run_lint: 0
    npm_run_build: 0
raw_sweep_output:
  command: 'git grep -n -E "\b(zinc|neutral|stone)-[0-9]{2,3}\b" src/'
  stdout: ""
  exit_code: 1
status_verified: "Clean — all 32 consumer .tsx files in src/ migrated to semantic tokens; legacy zinc/neutral/stone @theme remap deleted from src/index.css; zero legacy tokens remain."
```

# 6. Orchestrator Verification Note (2026-09-24)

Raw output of `git grep -n -E "\b(zinc|neutral|stone)-[0-9]{2,3}\b" -- src/`: 0 matches. `--color-(zinc|neutral|stone)-*` in `src/index.css`: 0, so the remap block is removed. `lint` and `build` exit 0, and the live app renders with the Chamber palette (Orchestrator smoke test of landing, lobby and drill). Pixel-parity of every surface was not audited. Pushed before review.
