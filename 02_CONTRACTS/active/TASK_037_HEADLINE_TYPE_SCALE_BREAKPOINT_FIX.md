---
task_id: "TASK_037_HEADLINE_TYPE_SCALE_BREAKPOINT_FIX"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
token_budget:
  input_context_max: 3500
  thinking_budget_tokens: 1200
  output_diff_max: 1200
depends_on: []
queue_gate: "NONE — independent of every other contract in this batch, safe to chain freely."
---

# 1. High-Density Distilled Objective
Fix coarse-jump type scale breakpoints in `Landing.tsx` and `CurrentAffairs.tsx` hero headlines to prevent wrapping bottlenecks at ~768-820px viewports.

# 2. Transcluded Context References
- `src/components/Landing.tsx:197` — hero H1 (`text-3xl sm:text-4xl md:text-5xl lg:text-6xl`).
- `src/components/CurrentAffairs.tsx:1152` — Lead Signal headline (`text-xl sm:text-2xl md:text-2xl lg:text-3xl`).
- `src/components/CurrentAffairs.tsx:1661` — modal dossier H2 (already stepped cleanly `text-2xl sm:text-3xl lg:text-4xl`).

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on all candidate headline sites.
2. `replace_file_content` — smooth `Landing.tsx` H1 and `CurrentAffairs.tsx` lead H2.
3. `run_command` — `npm run lint:web`, `npm run build`.

# 4. Deterministic Acceptance Criteria
1. Both headlines step smoothly across 4 breakpoints without sudden single leaps at cramped container widths.
2. `npm run lint:web` and `npm run build` both exit 0.
3. Standing hard boundary: status no higher than `AWAITING_VERIFICATION`; never move to `completed/`; never touch `01_CONTROL/` or `03_MEMORY/`.

# 5. Antigravity Proof-of-Work Receipt
_(filled in by Antigravity on completion — diff + telemetry YAML only, no prose.)_

```yaml
telemetry:
  tools_invoked:
    - view_file
    - replace_file_content
    - run_command
  duration_ms: 1600
  exit_codes:
    lint_web: 0
    build: 0
modal_dossier_h2_had_same_pattern: false
diff: |
  --- a/src/components/Landing.tsx
  +++ b/src/components/Landing.tsx
  @@ -197,1 +197,1 @@
  -            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#e0d0ab] drop-shadow-[0_4px_30px_rgba(224,208,171,0.22)] leading-[1.15]">
  +            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#e0d0ab] drop-shadow-[0_4px_30px_rgba(224,208,171,0.22)] leading-[1.15]">
  --- a/src/components/CurrentAffairs.tsx
  +++ b/src/components/CurrentAffairs.tsx
  @@ -1152,1 +1152,1 @@
  -                className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#e8e0cf] group-hover:text-[#e0d0ab] transition-colors leading-tight mb-4 cursor-pointer"
  +                className="font-serif text-xl sm:text-2xl md:text-2xl lg:text-3xl font-bold text-[#e8e0cf] group-hover:text-[#e0d0ab] transition-colors leading-tight mb-4 cursor-pointer"
```
