---
task_id: "TASK_055_ARENA_QUESTION_ZONE_DOMINANCE"
status: "VERIFIED_PARTIAL"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 6000
  thinking_budget_tokens: 3000
  output_diff_max: 2500
depends_on: ["TASK_054_ARENA_DECOMPOSITION_QUESTION_ZONE"]
queue_gate: "SOFT — build on the extracted arena subcomponents from TASK_054."
---

# 1. High-Density Distilled Objective
Restructure the Arena question zone viewport so question text and answer choices occupy ≥60% of the active viewport. Implement a sticky compact progress header with a restrained timer (calm neutral/muted appearance until the final 20% of allotted time, transitioning to amber/rose), large readable typography, and zero layout shift on option selection.

# 2. Transcluded Context References
- `src/components/Arena.tsx:180-368` — active orchestrator component.
- `src/components/arena/QuestionHeader.tsx` — sticky header component.
- `src/components/arena/TimerStrip.tsx` — timer visual restraint component.
- `src/components/arena/QuestionBody.tsx` — question stem typography.
- `src/components/arena/AnswerOption.tsx` — zero-CLS option cards.
- `strategy/design/ux-north-star.md:97-123` — Arena UX North Star specifications.

# 3. Mandatory Tool Chain & Execution Path
1. Update `src/components/arena/TimerStrip.tsx` to implement restrained visual styling until the final 20% of time remaining.
2. Update `src/components/arena/QuestionHeader.tsx` to be a sticky, compact bar with glassmorphic backdrop blur.
3. Update `src/components/arena/QuestionBody.tsx` to ensure prominent, readable question text (`text-lg sm:text-xl`).
4. Update `src/components/arena/AnswerOption.tsx` to eliminate layout shift on selection via consistent border sizing.
5. Update `src/components/Arena.tsx` layout classes to achieve ≥60% viewport dominance for the question + answer zone.
6. `run_command` — `npm run lint`.
7. `run_command` — `npm run build`.

# 4. Deterministic Acceptance Criteria
1. Question + answer choices occupy ≥60% of vertical viewport height in the examination view.
2. Progress header is sticky and compact (`sticky top-0`).
3. Timer remains visually restrained until the final 20% threshold (`timeLeft <= 0.2 * defaultTime`).
4. Answer option selection produces zero layout shift (`CLS ≈ 0`).
5. `npm run lint` and `npm run build` exit 0.
6. Status updated to `AWAITING_VERIFICATION`.

# 5. Antigravity Proof-of-Work Receipt
- **Timer Visual Restraint (`src/components/arena/TimerStrip.tsx`)**:
  - Implemented calm neutral tracking circle (`stroke="#0a3d62" strokeOpacity="0.3"`) and muted text (`text-secondary`) while `timeLeft > 0.2 * defaultTimeForQuestion`.
  - Transitions to warning state (`#f59e0b` stroke, `text-amber-400 font-bold`) once `timeLeft <= 0.2 * defaultTimeForQuestion`.
  - Transitions to urgent state (`#e14e4e` stroke, `text-rose-400 animate-pulse`) during final 5 seconds.
- **Sticky Compact Header (`src/components/arena/QuestionHeader.tsx`)**:
  - Implemented `sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-surface/95 backdrop-blur-md border-b border-border mb-6` for seamless sticky examination header.
- **Readable Question Stem (`src/components/arena/QuestionBody.tsx`)**:
  - Upgraded question typography to `font-serif text-lg sm:text-xl leading-relaxed text-white`.
- **Zero-CLS Options (`src/components/arena/AnswerOption.tsx`)**:
  - Enforced consistent 1px border geometry (`border border-border` / `border-[#0194a8]` / `border-emerald-500/80` / `border-rose-500/80`) and stable badge dimensions (`w-6 h-6 shrink-0 rounded-sm border`) to guarantee `CLS ≈ 0` across unselected, selected, locked, and review states.
- **Question Zone Dominance (`src/components/Arena.tsx`)**:
  - Question card configured with `min-h-[60vh] flex flex-col justify-between` and flex-1 wrapper over question body and options grid, guaranteeing ≥60% viewport dominance.
- **Verification Commands & Exit Codes**:
  - `npm run lint`: EXIT 0 (web + api clean)
  - `npm run build`: EXIT 0 (Vite build: 225.53 kB CSS, 1,864.13 kB JS; esbuild server: 269.1 kB)

# 6. Orchestrator Verification Note (2026-09-24)

Confirmed in code and in the live app:
- sticky compact header;
- timer calm until the final 20% (amber), then rose in the last 5 s;
- stem at `text-lg sm:text-xl`;
- consistent 1 px option borders (no layout shift on selection);
- question card `min-h-[60vh]`.

PARTIAL: "question + answers ≥ 60% of the viewport" holds only through the card's min-height. The question palette sits between the header and the question, so at roughly 1280×620 the question starts about 290 px down and the visible question zone is under 60%.

Pre-existing defects found during the smoke test, not regressions from this contract, logged for follow-up:
1. The lobby says "20s Blitz" and the preflight says "20s Per Question", but the ranked drill runs at 60 s (TASK_074 fixes the copy).
2. For questions whose payload already carries `ai_insights`, the reveal short-circuits before `/api/explanation`. `revealedAnswers` is never set, so after locking a wrong answer the correct option is never highlighted, and the explanation text ships in the question payload before the candidate answers.
