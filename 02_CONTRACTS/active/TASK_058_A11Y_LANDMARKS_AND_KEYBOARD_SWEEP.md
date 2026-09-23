---
task_id: "TASK_058_A11Y_LANDMARKS_AND_KEYBOARD_SWEEP"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 6000
  thinking_budget_tokens: 3000
  output_diff_max: 3000
depends_on: ["TASK_057_LANDING_FIVE_SECOND_TEST"]
queue_gate: "SOFT — final contract in the North Star execution queue."
---

# 1. High-Density Distilled Objective
Implement comprehensive accessibility landmarks and keyboard navigation across Tark:
1. Add a skip-to-content link at the top of `src/App.tsx` targeting `<main id="main-content">`.
2. Ensure semantic landmarks (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`) are present and properly structured.
3. Add `aria-current="page"` on active navigation items in both horizontal and vertical command rails.
4. Provide explicit `aria-label` attributes for all icon-only and compact buttons.
5. Enhance `src/components/shared/Modal.tsx` with `role="dialog"`, `aria-modal="true"`, and label association.
6. Add `aria-live` regions for save state feedback and urgent timer countdown alerts.
7. Verify with `npm run lint` and `npm run build`.

# 2. Transcluded Context References
- `src/App.tsx:1-942` — root app shell, skip link, main container landmarks.
- `src/components/VerticalNavRail.tsx:160-490` — command rail navigation landmarks & aria labels.
- `src/components/shared/Modal.tsx:38-95` — accessible dialog wrapper.
- `src/components/arena/TimerStrip.tsx:40-80` — timer aria-live alerts.
- `src/components/Arena.tsx:353-365` — save/toast aria-live status.
- `strategy/design/ux-north-star.md:180-200` — Accessibility checklist.

# 3. Mandatory Tool Chain & Execution Path
1. Update `src/App.tsx` with skip-to-content link, `aria-current="page"`, and `<main id="main-content">` landmark.
2. Update `src/components/VerticalNavRail.tsx` with `aria-current="page"` and explicit `aria-label` attributes.
3. Update `src/components/shared/Modal.tsx` with dialog accessibility roles and labels.
4. Update `src/components/arena/TimerStrip.tsx` with `aria-live` countdown alerts.
5. Update `src/components/Arena.tsx` toast notification with `role="status"` and `aria-live="polite"`.
6. `run_command` — `npm run lint`.
7. `run_command` — `npm run build`.

# 4. Deterministic Acceptance Criteria
1. Skip-to-content link exists at root of `src/App.tsx` linking to `<main id="main-content">`.
2. Semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`) are correctly rendered.
3. Active nav items render `aria-current="page"`.
4. Dialog component has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
5. Timer alerts render `aria-live` notification when reaching critical urgency.
6. `npm run lint` and `npm run build` exit 0.
7. Status updated to `AWAITING_VERIFICATION`.

# 5. Antigravity Proof-of-Work Receipt
- **Skip-to-Content Link (`src/App.tsx`)**:
  - Implemented `<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] ...">Skip to main content</a>`.
- **Semantic Landmarks (`src/App.tsx`, `src/components/VerticalNavRail.tsx`)**:
  - Top header wrapped in `<header>` and navigation in `<nav>`.
  - Command rail wrapped in `<aside aria-label="Candidate Command Rail">`.
  - Content containers in both landing and view modes wrapped in `<main id="main-content" tabIndex={-1}>`.
- **Active State & Accessible Names (`src/App.tsx`, `src/components/VerticalNavRail.tsx`)**:
  - `aria-current={isActive ? 'page' : undefined}` and explicit `aria-label` applied to all horizontal and vertical navigation items.
  - Explicit `aria-label` applied to compact control buttons (rail collapse/expand, tour triggers, header layout switchers).
- **Accessible Dialogs (`src/components/shared/Modal.tsx`)**:
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby={title ? 'modal-title' : undefined}`, and `aria-describedby={subtitle ? 'modal-subtitle' : undefined}` with matching IDs on `h3` and `p`.
- **Live Regions (`src/components/arena/TimerStrip.tsx`, `src/components/Arena.tsx`)**:
  - Timer alert region with `aria-live={isUrgent ? 'assertive' : 'polite'}` announcing time thresholds to screen readers.
  - Toast notification configured with `role="status"` and `aria-live="polite"` for asynchronous save and assessment state feedback.
- **Verification Commands & Exit Codes**:
  - `npm run lint`: EXIT 0 (web + api clean)
  - `npm run build`: EXIT 0 (Vite build: 227.23 kB CSS, 1,871.74 kB JS; esbuild server: 269.1 kB)
