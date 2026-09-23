---
task_id: "TASK_053_FONT_STACK_PRUNING"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 1500
  output_diff_max: 1500
depends_on: ["TASK_052_TOKEN_SYSTEM_CONSUMER_MIGRATION"]
queue_gate: "SOFT — verify zero Cinzel callers in src/ before pruning."
---

# 1. High-Density Distilled Objective
Audit callers of `--font-cinzel` and `--font-mono` in `src/**/*.tsx`. Prune `Cinzel` from the shipped font stack (zero callers in `src/`) by removing its `@fontsource/cinzel` imports and `--font-cinzel` declaration in `src/index.css`. Retain `JetBrains Mono` strictly for numeric, time, and code contexts, bringing the total shipped font families down to ≤3 (Inter, Merriweather, JetBrains Mono).

# 2. Transcluded Context References
- `src/index.css:13-15` — `@fontsource/cinzel` imports (`500.css`, `600.css`, `700.css`).
- `src/index.css:24` — `--font-cinzel` theme declaration.
- `strategy/design/ux-north-star.md:46-56` — Typography specification (target ≤3 shipped families).

# 3. Mandatory Tool Chain & Execution Path
1. `run_command` — `git grep -n -i "cinzel" src/` to verify zero callers exist in `src/**/*.tsx`.
2. `replace_file_content` — delete Cinzel imports and `--font-cinzel` from `src/index.css`.
3. `run_command` — `npm run lint`.
4. `run_command` — `npm run build`.

# 4. Deterministic Acceptance Criteria
1. Cinzel imports and `--font-cinzel` declaration are removed from `src/index.css`.
2. Total shipped font families in `src/` is ≤3 (Inter, Merriweather, JetBrains Mono).
3. `npm run lint` and `npm run build` exit 0.
4. Status updated to `AWAITING_VERIFICATION`.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - replace_file_content
    - run_command
  duration_ms: 65000
  exit_codes:
    cinzel_audit_grep: 0 # 0 callers in .tsx
    npm_run_lint: 0
    npm_run_build: 0
diff: |
  --- a/src/index.css
  +++ b/src/index.css
  @@ -13,3 +13,0 @@
  -@import "@fontsource/cinzel/500.css";
  -@import "@fontsource/cinzel/600.css";
  -@import "@fontsource/cinzel/700.css";
  @@ -24,1 +21,0 @@
  -  --font-cinzel: "Cinzel", ui-serif, Georgia, serif;
bundle_impact:
  css_bundle_before: "227.54 kB"
  css_bundle_after: "225.22 kB"
  shipped_font_families: 3 # Inter, Merriweather, JetBrains Mono
status_verified: "Clean — Cinzel pruned completely; font stack trimmed to 3 families; build and lint clean."
```
