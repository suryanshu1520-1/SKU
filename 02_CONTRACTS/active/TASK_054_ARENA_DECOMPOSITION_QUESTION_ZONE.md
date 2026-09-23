---
task_id: "TASK_054_ARENA_DECOMPOSITION_QUESTION_ZONE"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 4000
  output_diff_max: 3000
depends_on: ["TASK_053_FONT_STACK_PRUNING"]
queue_gate: "SOFT — re-anchor Arena.tsx lines before decomposition."
---

# 1. High-Density Distilled Objective
Extract `src/components/Arena.tsx` (1938 lines) into modular subcomponents under `src/components/arena/` (`QuestionHeader.tsx`, `QuestionBody.tsx`, `AnswerOption.tsx`, `TimerStrip.tsx`, `ReviewControls.tsx`, `QuestionPalette.tsx`, `ArenaLobby.tsx`, `TrainingSetup.tsx`, `useArenaSession.ts`), reducing `Arena.tsx` to ≤ 400 lines without changing any runtime behavior or state semantics.

# 2. Transcluded Context References
- `src/components/Arena.tsx:1-1938` — active monolithic component.
- `strategy/design/ux-north-star.md:97-123` — Arena UX North Star architecture.
- Non-negotiable guardrails 1-4 from handoff (auth, server-side scoring, lock-answer barrier, localStorage resume keys).

# 3. Mandatory Tool Chain & Execution Path
1. Create `src/components/arena/TimerStrip.tsx`.
2. Create `src/components/arena/QuestionHeader.tsx`.
3. Create `src/components/arena/QuestionBody.tsx`.
4. Create `src/components/arena/AnswerOption.tsx`.
5. Create `src/components/arena/ReviewControls.tsx`.
6. Create `src/components/arena/QuestionPalette.tsx`.
7. Create `src/components/arena/TrainingSetup.tsx`.
8. Create `src/components/arena/ArenaLobby.tsx`.
9. Refactor `src/components/Arena.tsx` to compose these subcomponents, bringing line count to ≤ 400 lines.
10. `run_command` — `npm run lint`.
11. `run_command` — `npm run test`.
12. `run_command` — `npm run build`.

# 4. Deterministic Acceptance Criteria
1. `src/components/Arena.tsx` has ≤ 400 lines (actual: 368 lines).
2. `src/components/arena/` contains the extracted subcomponents.
3. Zero regressions in session cache, timer, answer locking, or submit flow.
4. `npm run lint`, `npm run test`, and `npm run build` exit 0.
5. Status updated to `AWAITING_VERIFICATION`.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - write_to_file
    - replace_file_content
    - run_command
  duration_ms: 180000
  exit_codes:
    npm_run_lint: 0
    npm_run_test: 0 # 9/9 TAP tests pass
    npm_run_build: 0
metrics:
  arena_lines_before: 1938
  arena_lines_after: 368
  extracted_subcomponents:
    - src/components/arena/TimerStrip.tsx
    - src/components/arena/QuestionHeader.tsx
    - src/components/arena/QuestionBody.tsx
    - src/components/arena/AnswerOption.tsx
    - src/components/arena/ReviewControls.tsx
    - src/components/arena/QuestionPalette.tsx
    - src/components/arena/TrainingSetup.tsx
    - src/components/arena/ArenaLobby.tsx
    - src/components/arena/useArenaSession.ts
status_verified: "Clean — Arena.tsx successfully decomposed to 368 lines; full test suite, lint, and production build pass with exit code 0."
```
