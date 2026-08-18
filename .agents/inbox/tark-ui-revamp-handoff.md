---
type: agent-handoff
from: Claude (Sonnet) — Claude Code
to: Anti-G (Antigravity)
date: 2026-08-19
subject: Execute the full Tark UI revamp
status: ready-for-pickup
canonical: .agents/inbox/tark-ui-revamp-handoff.md
mirror: docs/handoffs/tark-ui-revamp-handoff.md
---

# Handoff → Anti-G: Tark Full UI Revamp

## Mission

Elevate the look, feel, and intuitiveness of **every** UI surface in Tark (a minimalist UPSC/State-PSC test arena + AI current-affairs platform) **without betraying the identity the owner worked hard to build**. You own execution end-to-end. The full spec is [`docs/ui-revamp-masterplan.md`](../../docs/ui-revamp-masterplan.md) — read it first; this handoff is the operating manual on top of it.

The owner explicitly wants the aesthetic *read from the existing design language, not reinvented*. That read is already done for you — the north star is **"The Analyst's Terminal"** (§1 of the master plan). Honor it.

## Non-negotiable guardrails (regressions here = failed handoff)

These are functional invariants. **Restyle freely; never change these semantics:**
1. **Auth:** all protected requests use `fetchWithAuth()` with a Bearer token.
2. **Server-side scoring:** the client must never receive `correct_index`/answers before submission. Grading stays in `server-lib/submit-quiz.ts`.
3. **Arena Lock-Answer barrier:** the two-step select→lock commit (`pendingAnswersMap` → `lockedMap`/`userAnswers`), per-question timer, and `localStorage` resume keys (`tark_arena_session`, `tark_active_session`, `tark_arena_results`) must keep working.
4. **Razorpay flow:** the Manifesto order-create → verify-payment sequence and the 15-min seat-reservation logic are off-limits to restyling changes.
5. **PIB semantic tokens + `light-theme`:** the Daily Briefs reader depends on `--color-surface*/on-surface*/primary*`. Fold them into the unified token system; do not delete them.
6. **Daily Briefs motion already shipped:** the animated tab pill, headline→dossier `layoutId` morph, drag-swipe PIB carousel + dot navigator + reading-time, and spring hover/tap in `CurrentAffairs.tsx` are recent work — unify tokens, do NOT regress the interactions.
7. **Motion library:** the app standard is **Framer Motion (`motion/react`)**. Do not introduce GSAP (or other animation deps) except for one deliberately-scoped showcase, if any. Respect `prefers-reduced-motion` everywhere.

## Foundation first (do before any screen — see master plan §2/§3)

One serial foundation PR. **Palette is navy/teal/gold and it is canonical** — verified against the live site (`#072e63` navy ground, `#0194a8` teal interactive accent, `#e0d0ab` gold as the *primary ink*, emerald integrity, rose penalty). The `@theme` remap that makes `zinc-950` paint navy / `white` paint gold / `zinc-800` paint teal is **intentional, not a bug — do NOT retire it or push toward black.** The real problem is legibility: class names lie and the same values are also hardcoded as hex, so every brand color has 2–3 representations. Fix = migrate to **semantic tokens** whose values equal the verified pixels (keep the remap working during migration), then build the **motion primitives + shared components**, and clear the P0 cleanups (dead `animate-shake`, `console.log` of user data in PublicProfile L79–83, contradictory CP copy, missing favicon, zoom-lock a11y bug). Derive all visual decisions from the **rendered product**, never from Tailwind class names. Nothing is trustworthy until this lands.

## Skills playbook — what to use, when, why, how

All of these are installed and available to you (project `.agents/skills/` + global `~/.agents/skills/`, symlinked into every agent incl. Antigravity). Use them in this order per surface:

| # | Skill | When | Why | How |
|---|---|---|---|---|
| 1 | **design:design-critique** | Phase 1, before touching a screen | Produces an objective per-surface defect list to reconcile with the master plan's §4 findings | Run read-only per screen; merge output into your working checklist |
| 2 | **superdesign** | High-stakes screens only (Landing, Arena quiz, Autopsy, Manifesto) | Generate/iterate visual drafts + variants on canvas before coding; lock the shared `design-system.md` | `npx --yes @superdesign/cli@latest` (preflight/login first); init the repo; create drafts; share the canvas URL with the owner to pick a direction *before* you build |
| 3 | **redesign-existing-projects** | Every existing screen (the core execution skill) | Purpose-built to upgrade existing UI to premium **without breaking functionality**; framework-agnostic (fits Tailwind v4) | Audit-first, then apply; pair with the guardrails above |
| 4 | **design-taste-frontend** | Every screen, alongside #3 | Anti-slop enforcement; infers correct design direction; audit-first on redesigns | Keep its "pre-flight check" strict; it's your taste gate |
| 5 | **high-end-visual-design** | Integration/QA pass + while building | Defines the exact fonts/spacing/shadows/cards/motion that read "expensive"; blocks cheap AI defaults | Use as the "does this feel engineered, not decorated?" filter |
| 6 | **impeccable** | Polish + the Antigravity spatial layer | Live browser iteration; ambitious visual effects; the in-house design skill | Use for the earned spatial moments (TiltCard/InteractiveBackground extensions) and final polish with the browser open |
| 7 | **dataviz** | The data-viz system (master plan §3.4) | Consistent, accessible chart language — the biggest intuitiveness lever (score trends, subject accuracy, leaderboard bars, coverage ledger) | Charts theme from the §3.1 tokens, animate per §3.2; Recharts is already a dep |
| 8 | **ui-ux-pro-max** | Reference throughout | 98 UX rules, motion presets, chart-type selection, palettes — a lookup, not a generator | `python .../search.py "<query>" --domain <ux\|gsap\|chart>`; translate any GSAP preset intent into Framer Motion |
| 9 | **brandkit / imagegen-frontend-web** | Assets | Generate the missing favicon, `/og-image.png`, Landing hero key visuals, reference boards | Image-gen only; wire outputs into `public/` |

Aesthetic-variant skills (`minimalist-ui`, `industrial-brutalist-ui`, etc.) are **reference only** — Tark is neither brutalist nor generic-minimalist; `minimalist-ui`'s editorial monochrome sensibility is a useful touchstone for Daily Briefs, nothing more.

## Framer MCP (you have access; Claude Code does not)

Use Framer MCP for what it's best at, given Tark ships as a **React/Vite app, not a Framer-hosted site**:
- **Motion/interaction prototyping** — explore the Arena timer depletion, Lock→reveal confirmation, Autopsy victory choreography, and Leaderboard rank-change motion in Framer, then port the chosen feel to Framer Motion in-code. Do not leave the app depending on Framer at runtime.
- **Optionally build the public marketing / SEO permalink pages** (roadmap Phase 3, `/briefs/[slug]`) as Framer-built surfaces if that's faster than SSR — but confirm with the owner before splitting the stack.

## Execution structure (sub-agents)

- **Phase 0 – Foundation** (1 agent, serial, blocks all): tokens, motion primitives, shared components, P0 cleanups.
- **Phase 1 – Critique** (parallel, read-only): `design:design-critique` per screen.
- **Phase 2 – Surfaces** (up to 3–4 parallel agents on disjoint files):
  - A: Arena + Autopsy
  - B: Profile + Leaderboard + PublicProfile
  - C: Landing + Login + PasswordReset + Manifesto + LegalModal
  - (Daily Briefs: token-unification only — protect recent work)
- **Phase 3 – Integration/QA** (serial): consistency sweep, `high-end-visual-design` pass, accessibility + responsive (375/768/1024/1440), verification.

## Definition of done

`npm run lint` clean; every screen renders with no console errors; screenshotted at 4 breakpoints (+ light PIB reader + reduced-motion); all P0 cleanups resolved; zero guardrail regressions; a before/after gallery per surface for owner review. (Local dev currently needs the Supabase anon key in `.env`/`.env.local` — pre-existing gap; see the `server-lib/training-questions.ts` crash.)

## Read-first pointers

- [`docs/ui-revamp-masterplan.md`](../../docs/ui-revamp-masterplan.md) — the exhaustive spec (north star, foundation, per-surface §4, systems §3).
- [`docs/live-site-critique.md`](../../docs/live-site-critique.md) — **pixel-grounded** critique of the rendered product (start here for what's actually on screen; Autopsy/Profile/PublicProfile still need live capture).
- [`docs/design-system.md`](../../docs/design-system.md) — existing design/motion architecture (note: has the two-value color ambiguity to resolve).
- [`strategy/brand-review.md`](../../strategy/brand-review.md) + [`strategy/landing-page-copy.md`](../../strategy/landing-page-copy.md) — brand voice + Landing/Manifesto copy.
- [`map/objects/arena-ui.md`](../../map/objects/arena-ui.md) + [`AGENTS.md`](../../AGENTS.md) — edit-impact map + operational invariants.
