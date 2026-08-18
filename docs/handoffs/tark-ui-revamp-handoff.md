---
type: agent-handoff
from: Claude (Sonnet) — Claude Code
to: Anti-G (Antigravity)
date: 2026-08-19
subject: Execute the full Tark UI revamp
status: ready-for-pickup
---

# Handoff → Anti-G: Tark Full UI Revamp

> **Vault mirror** for graph visibility. The **canonical copy Anti-G picks up** lives at `.agents/inbox/tark-ui-revamp-handoff.md` (agent mailbox, alongside the shared `.agents/skills/`). Full spec: [[ui-revamp-masterplan]].

## Mission

Elevate the look, feel, and intuitiveness of **every** UI surface in Tark without betraying the identity the owner built. Anti-G owns execution end-to-end. Read [[ui-revamp-masterplan]] first; this is the operating manual on top of it. The aesthetic north star is already decided — **"The Analyst's Terminal"** (master plan §1). Honor it.

## Non-negotiable guardrails (regressions = failed handoff)

Restyle freely; never change these semantics:
1. **Auth:** `fetchWithAuth()` + Bearer token on all protected requests.
2. **Server-side scoring:** client never sees `correct_index`/answers pre-submission (`server-lib/submit-quiz.ts`).
3. **Arena Lock-Answer barrier:** two-step select→lock (`pendingAnswersMap` → `lockedMap`/`userAnswers`), per-question timer, and `localStorage` resume keys (`tark_arena_session`, `tark_active_session`, `tark_arena_results`) keep working.
4. **Razorpay flow:** Manifesto order-create → verify-payment + 15-min seat reservation are off-limits to restyle changes.
5. **PIB semantic tokens + `light-theme`:** the Daily Briefs reader depends on them — fold into the unified tokens, don't delete.
6. **Daily Briefs motion already shipped:** animated tab pill, headline→dossier `layoutId` morph, drag-swipe PIB carousel + dot navigator + reading-time, spring hover/tap in `CurrentAffairs.tsx` — unify tokens, don't regress interactions.
7. **Motion library:** app standard is **Framer Motion (`motion/react`)** — no GSAP/other deps except one deliberately-scoped showcase; respect `prefers-reduced-motion` everywhere.

## Foundation first (master plan §2/§3)

One serial foundation PR before any screen. **Palette is navy/teal/gold and canonical** — verified against the live site (`#072e63` navy ground, `#0194a8` teal interactive accent, `#e0d0ab` gold as *primary ink*, emerald integrity, rose penalty). The `@theme` remap (`zinc-950`→navy, `white`→gold, `zinc-800`→teal) is **intentional — do NOT retire it or push toward black.** The problem is legibility: class names lie and values are also hardcoded as hex. Fix = migrate to **semantic tokens** equal to the verified pixels (keep remap during migration); build **motion primitives + shared components**; clear P0 cleanups (dead `animate-shake`, `console.log` of user data in PublicProfile L79–83, contradictory CP copy, missing favicon, viewport zoom-lock a11y bug). **Derive all visual decisions from the rendered product, never from class names.**

## Skills playbook — what, when, why, how

All installed and available to Anti-G (project `.agents/skills/` + global `~/.agents/skills/`, symlinked to Antigravity). Order per surface:

| # | Skill | When | Why | How |
|---|---|---|---|---|
| 1 | **design:design-critique** | Phase 1, pre-touch | Objective per-surface defect list | Read-only per screen; merge into checklist |
| 2 | **superdesign** | High-stakes screens (Landing, Arena quiz, Autopsy, Manifesto) | Canvas drafts + variants before coding; lock `design-system.md` | `npx --yes @superdesign/cli@latest` (preflight/login, init repo, create drafts); share canvas URL with owner to pick direction before building |
| 3 | **redesign-existing-projects** | Every existing screen (core execution) | Upgrade to premium **without breaking functionality**; framework-agnostic | Audit-first, then apply; obey guardrails |
| 4 | **design-taste-frontend** | Every screen, with #3 | Anti-slop taste gate; audit-first | Keep its pre-flight check strict |
| 5 | **high-end-visual-design** | Building + QA | Exact fonts/spacing/shadows/cards/motion that read "expensive"; blocks cheap defaults | The "engineered, not decorated?" filter |
| 6 | **impeccable** | Polish + Antigravity spatial layer | Live browser iteration; ambitious effects; in-house skill | Earned spatial moments + final polish, browser open |
| 7 | **dataviz** | Data-viz system (§3.4) | Consistent accessible charts — biggest intuitiveness lever | Theme from §3.1 tokens, animate per §3.2; Recharts already a dep |
| 8 | **ui-ux-pro-max** | Reference throughout | 98 UX rules, motion presets, chart selection, palettes | `search.py --domain ux\|gsap\|chart`; translate GSAP intent → Framer Motion |
| 9 | **brandkit / imagegen-frontend-web** | Assets | Favicon, `/og-image.png`, hero visuals, reference boards | Image-gen only; wire into `public/` |

Variant skills (`minimalist-ui`, `industrial-brutalist-ui`, …) are reference-only — Tark is neither brutalist nor generic-minimalist.

## Framer MCP (Anti-G has access; Claude Code does not)

Tark ships as a **React/Vite app, not a Framer-hosted site**, so:
- **Prototype motion** (Arena timer depletion, Lock→reveal confirmation, Autopsy victory choreography, Leaderboard rank-change) in Framer, then port the feel to Framer Motion in-code — no runtime Framer dependency.
- **Optionally build the public marketing / SEO permalink pages** (roadmap Phase 3, `/briefs/[slug]`) in Framer if faster than SSR — confirm with owner before splitting the stack.

## Execution structure (sub-agents)

- **Phase 0 – Foundation** (1 agent, serial, blocks all).
- **Phase 1 – Critique** (parallel, read-only).
- **Phase 2 – Surfaces** (≤3–4 parallel agents, disjoint files): A: Arena+Autopsy · B: Profile+Leaderboard+PublicProfile · C: Landing+Login+PasswordReset+Manifesto+LegalModal · (Daily Briefs: token-unification only).
- **Phase 3 – Integration/QA** (serial): consistency sweep, `high-end-visual-design` pass, a11y + responsive (375/768/1024/1440), verification.

## Definition of done

`npm run lint` clean; every screen renders with no console errors; screenshots at 4 breakpoints (+ light PIB reader + reduced-motion); P0 cleanups resolved; zero guardrail regressions; before/after gallery per surface. (Local dev needs the Supabase anon key in `.env`/`.env.local` — pre-existing gap; see `server-lib/training-questions.ts` crash.)

## Read-first pointers

- [[ui-revamp-masterplan]] — exhaustive spec.
- [[live-site-critique]] — **pixel-grounded** critique of the rendered product (Autopsy/Profile/PublicProfile still need live capture).
- [[design-system]] — existing design/motion architecture (resolve its two-value color ambiguity).
- [[brand-review]] + [[landing-page-copy]] — brand voice + Landing/Manifesto copy.
- [[arena-ui]] + [[AGENTS]] — edit-impact map + operational invariants.
