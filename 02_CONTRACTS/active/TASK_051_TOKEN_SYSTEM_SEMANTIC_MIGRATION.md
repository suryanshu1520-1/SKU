---
task_id: "TASK_051_TOKEN_SYSTEM_SEMANTIC_MIGRATION"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 1500
  output_diff_max: 2000
depends_on: ["TASK_050_AUDIT_REMEDIATION_VERIFY_FORGED_OBSERVATORY_STAT"]
queue_gate: "SOFT — re-anchor line numbers in src/index.css before editing."
---

# 1. High-Density Distilled Objective
Add canonical semantic tokens in `src/index.css` (`--surface`, `--surface-elevated`, `--surface-shell`, `--border`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--accent-foreground`, `--success`, `--danger`, `--focus-ring`) whose values equal the current Chamber pixels, both in `@theme` and in `:root`. Do NOT delete the zinc/neutral/stone remap block in `src/index.css:39-74` in this contract.

# 2. Transcluded Context References
- `src/index.css:26-107` — active `@theme` block containing Chamber system tokens and remap.
- `src/index.css:109-158` — active `:root` definitions.
- `strategy/design/ux-north-star.md:228-250` — UX North Star design-system cleanup token specification.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on `src/index.css:20-160` to anchor line numbers.
2. `replace_file_content` on `src/index.css` to add the semantic tokens into `@theme` and `:root`.
3. `run_command` — `npm run lint`.
4. `run_command` — `npm run build`.

# 4. Deterministic Acceptance Criteria
1. Semantic tokens (`--surface`, `--surface-elevated`, `--surface-shell`, `--border`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--accent-foreground`, `--success`, `--danger`, `--focus-ring`) are defined in `src/index.css`.
2. The legacy `zinc/neutral/stone` remap block in `src/index.css:39-74` remains intact.
3. `npm run lint` and `npm run build` exit 0.
4. Status updated to `AWAITING_VERIFICATION`.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - replace_file_content
    - run_command
  duration_ms: 75000
  exit_codes:
    npm_run_lint: 0
    npm_run_build: 0
diff: |
  --- a/src/index.css
  +++ b/src/index.css
  @@ -88,4 +88,19 @@
     --ground: #072e63;
  -  --surface: #136c99;
  -  --surface-elevated: #1b85b8;
  +  --surface: #072e63;
  +  --surface-elevated: #0b3d78;
  +  --surface-shell: #041936;
     --accent-teal: #0194a8;
     --ink-gold: #e0d0ab;
     --ink-sand: #c8b998;
     --ink-muted: #a69a7f;
     --integrity: #34d399;
     --penalty: #e14e4e;
  +
  +  /* ── UX North Star Chamber Semantic Tokens ── */
  +  --color-surface: #072e63;
  +  --color-surface-elevated: #0b3d78;
  +  --color-surface-shell: #041936;
  +  --color-border: #136c99;
  +  --color-border-subtle: #41536e;
  +  --color-text-primary: #e8e0cf;
  +  --color-text-secondary: #9fb0c8;
  +  --color-text-muted: #8fa2bd;
  +  --color-accent: #e0d0ab;
  +  --color-accent-foreground: #041d40;
  +  --color-success: #34d399;
  +  --color-warning: #f59e0b;
  +  --color-danger: #e14e4e;
  +  --color-focus-ring: #e0d0ab;
  @@ -107,3 +122,17 @@
   :root {
  +  /* ── UX North Star Semantic Design Tokens ── */
  +  --surface: #072e63;
  +  --surface-elevated: #0b3d78;
  +  --surface-shell: #041936;
  +  --border: #136c99;
  +  --border-subtle: #41536e;
  +  --text-primary: #e8e0cf;
  +  --text-secondary: #9fb0c8;
  +  --text-muted: #8fa2bd;
  +  --accent: #e0d0ab;
  +  --accent-foreground: #041d40;
  +  --success: #34d399;
  +  --warning: #f59e0b;
  +  --danger: #e14e4e;
  +  --focus-ring: #e0d0ab;
```
