---
task_id: "TASK_057_LANDING_FIVE_SECOND_TEST"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 6000
  thinking_budget_tokens: 3000
  output_diff_max: 3000
depends_on: ["TASK_056_RESULTS_INTERPRETATION_LAYER"]
queue_gate: "SOFT — build on semantic tokens and autopsy interpretation layer."
---

# 1. High-Density Distilled Objective
Restructure `src/components/Landing.tsx` to satisfy the North Star 5-second test: clear promise ("Diagnose your UPSC readiness and improve with evidence."), one dominant "Start diagnostic" CTA above the fold, secondary "Explore the daily brief" CTA, three plain-language proof points, preview of the learning loop (Practice → Diagnose → Review → Improve), feature modules below the fold, and complete replacement of jargon ("atomic state locking", "zero-trust evaluation", "cognitive observatory").

# 2. Transcluded Context References
- `src/components/Landing.tsx:85-300` — desktop hero, feature modules, and comparison matrix.
- `src/components/MobileLanding.tsx:55-150` — mobile landing hero and engine deck.
- `strategy/design/ux-north-star.md:68-86` — Landing UX North Star specifications.

# 3. Mandatory Tool Chain & Execution Path
1. Replace jargon strings across `src/components/Landing.tsx` and `src/components/MobileLanding.tsx` with outcome-oriented language.
2. Restructure `src/components/Landing.tsx` hero to feature:
   - Promise: "Diagnose your UPSC readiness and improve with evidence."
   - Dominant "Start diagnostic" CTA above fold.
   - Secondary "Explore the daily brief" CTA.
   - 3 plain-language proof points.
   - Preview of the learning loop: Practice → Diagnose → Review → Improve.
3. Verify zero jargon occurrences remain via `run_command` with raw grep commands.
4. `run_command` — `npm run lint`.
5. `run_command` — `npm run build`.

# 4. Deterministic Acceptance Criteria
1. Single dominant CTA ("Start diagnostic") and secondary CTA ("Explore the daily brief") above the fold.
2. Three plain-language proof points and 4-stage learning loop preview rendered above the fold.
3. `git grep -F "atomic state locking"` returns 0 matches in `src/`.
4. `git grep -F "zero-trust evaluation"` returns 0 matches in `src/`.
5. `git grep -F "cognitive observatory"` returns 0 matches in `src/`.
6. `npm run lint` and `npm run build` exit 0.
7. Status updated to `AWAITING_VERIFICATION`.

# 5. Antigravity Proof-of-Work Receipt
- **Landing Hero & Conversion Structure (`src/components/Landing.tsx`, `src/components/MobileLanding.tsx`)**:
  - Primary Promise Headline: `"Diagnose your UPSC readiness and improve with evidence."`
  - Dominant CTA: `"Start diagnostic"` (`py-4 px-8 bg-[#e0d0ab] hover:bg-white text-[#072e63] font-bold shadow-[0_4px_24px_rgba(224,208,171,0.35)]`).
  - Secondary CTA: `"Explore the daily brief"` (`py-3.5 px-6 bg-[rgba(4,25,54,0.6)] border border-[rgba(19,108,153,0.5)]`).
  - 3 Plain-Language Proof Points: 4,150+ Authentic Questions, Examiner Trap Diagnostics, 10 Daily Grounded Briefs.
  - Preview of the Learning Loop: 4-stage sequential visual flow (`Practice` → `Diagnose` → `Review` → `Improve`).
  - Mobile synchronization: `MobileLanding.tsx` updated with synchronized headline, dominant CTA, and secondary CTA.
- **Jargon Sweep Verification (Raw Command Output)**:
```pwsh
PS C:\Users\bentn\OneDrive\Desktop\SKU> git grep -F "atomic state locking" src/; git grep -F "zero-trust evaluation" src/; git grep -F "cognitive observatory" src/
(exit code: 1, 0 matches)
```
- **Verification Commands & Exit Codes**:
  - `npm run lint`: EXIT 0 (web + api clean)
  - `npm run build`: EXIT 0 (Vite build: 225.96 kB CSS, 1,870.55 kB JS; esbuild server: 269.1 kB)
