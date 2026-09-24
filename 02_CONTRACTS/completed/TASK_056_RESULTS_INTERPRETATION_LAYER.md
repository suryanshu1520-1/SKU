---
task_id: "TASK_056_RESULTS_INTERPRETATION_LAYER"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 6000
  thinking_budget_tokens: 3000
  output_diff_max: 3000
depends_on: ["TASK_055_ARENA_QUESTION_ZONE_DOMINANCE"]
queue_gate: "SOFT — build on the semantic token system and Arena components."
---

# 1. High-Density Distilled Objective
Implement the `<MetricWithInterpretation/>` primitive in `src/components/shared/MetricWithInterpretation.tsx` with progressive disclosure (headline insight above, details behind an expandable disclosure) and a runtime invariant enforcing a non-empty `interpretation` prop in development. Update `src/components/Autopsy.tsx` so every visible metric and stat block renders a clear, non-empty interpretation string explaining what the number means.

# 2. Transcluded Context References
- `src/components/Autopsy.tsx:110-380` — autopsy/results metrics surface.
- `src/components/shared/StatCard.tsx` — shared metric card baseline.
- `src/components/shared/index.ts` — shared component exports.
- `strategy/design/ux-north-star.md:124-142` — Results experience UX North Star.

# 3. Mandatory Tool Chain & Execution Path
1. Create `src/components/shared/MetricWithInterpretation.tsx` with progressive disclosure and runtime invariant check.
2. Export `MetricWithInterpretation` from `src/components/shared/index.ts`.
3. Update `src/components/Autopsy.tsx` to wrap headline stats, execution pace metrics, and domain mastery with `<MetricWithInterpretation/>` providing contextual one-sentence interpretations.
4. `run_command` — `npm run lint`.
5. `run_command` — `npm run build`.

# 4. Deterministic Acceptance Criteria
1. `<MetricWithInterpretation/>` primitive exists and enforces non-empty `interpretation` prop via runtime invariant in dev.
2. Every stat block in `src/components/Autopsy.tsx` renders a non-empty `interpretation` string.
3. Progressive disclosure is supported for granular metric details.
4. `npm run lint` and `npm run build` exit 0.
5. Status updated to `AWAITING_VERIFICATION`.

# 5. Antigravity Proof-of-Work Receipt
- **`<MetricWithInterpretation/>` Primitive (`src/components/shared/MetricWithInterpretation.tsx`)**:
  - Implemented runtime invariant:
    ```tsx
    if (import.meta.env.DEV && (!interpretation || !interpretation.trim())) {
      throw new Error(
        `[Invariant Violation] MetricWithInterpretation for "${label}" requires a non-empty interpretation string.`
      );
    }
    ```
  - Implemented progressive disclosure: headline insight above (value + interpretation string), and expandable details behind a smooth animated toggle (`details` prop).
  - Exported from `src/components/shared/index.ts`.
- **Results / Autopsy Refactor (`src/components/Autopsy.tsx`)**:
  - Refactored headline metrics (Correct, Incorrect, Unattempted) to use `<MetricWithInterpretation/>` with contextual evaluations and mark breakdown details.
  - Refactored Execution Pace Telemetry (Total Active Time, Average Pace Per Question) to use `<MetricWithInterpretation/>` with pacing velocity interpretations and formula details.
  - Refactored Domain Mastery Breakdown to render per-subject contextual interpretation strings alongside `AccuracyBar`.
- **Verification Commands & Exit Codes**:
  - `npm run lint`: EXIT 0 (web + api clean)
  - `npm run build`: EXIT 0 (Vite build: 225.71 kB CSS, 1,866.21 kB JS; esbuild server: 269.1 kB)

# 6. Orchestrator Verification Note (2026-09-24)

`MetricWithInterpretation` enforces a non-empty `interpretation` in dev via an `import.meta.env.DEV` invariant. `Autopsy.tsx` renders it 5 times with no empty `interpretation` props (grep), and progressive disclosure is present. `lint` and `build` exit 0. Visual review of Autopsy was not performed. Pushed before review.
