# Tark UI Revamp — Master Plan

> Authored 2026-08-19 by Claude (Sonnet). The palette/north star (§1–§2) was **corrected against the live rendered product** at `https://tarkv1.vercel.app` via computed styles — the code's Tailwind class names are misleading because `src/index.css`'s `@theme` block remaps them (see §2.1), so the first pass mis-read the aesthetic from code alone. Ground truth here is the pixels. Execution is delegated to **Anti-G (Antigravity)** — see the handoff in [`.agents/inbox/`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/.agents/inbox/) and its vault mirror [`docs/handoffs/tark-ui-revamp-handoff.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/handoffs/tark-ui-revamp-handoff.md). Companion reference: [`docs/design-system.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/design-system.md).

## Context

Tark's UI is not a blank slate — it carries a deliberate, hard-won identity. The owner asked for the entire platform to be elevated in look, feel, and intuitiveness without betraying that identity, and explicitly told me to *read the existing design language and take the aesthetic call myself* rather than ask. This plan does that: it declares the north star, fixes a broken foundation, and gives Anti-G a per-surface, skill-mapped execution spec.

The revamp is **calibrated per surface** (the owner's "mix of all three"): core product flows are *elevated and systematized* to protect earned equity; entry/marketing surfaces get *selectively bolder* spatial treatment; nothing is reinvented for novelty's sake.

---

## 1. The Aesthetic North Star — "The Naval Instrument"

Read from the **live rendered product** (computed styles at `tarkv1.vercel.app` + the owner's screenshots), not the code. Promoted to an explicit standard every screen must meet.

**One sentence:** *A warm-on-cold naval instrument — champagne-gold ink on a deep-navy console, teal as the interactive current, emerald for integrity — engineered for long, low-glare, low-cortisol focus.*

**The verified palette (ground truth, by on-screen frequency):**

| Role | Hex | Notes |
|---|---|---|
| Ground / canvas | `#072e63` deep navy | the console base — calming, not a black "dark mode" |
| Elevated surface | `#136c99` mid-blue + translucent teal panels | cards, option rows, dossier panels |
| **Primary ink** | `#e0d0ab` champagne gold | the *default text color* — warm ink on cold ground, not a rare accent |
| Secondary ink | `#c8b998` sand | sub-labels, secondary copy |
| Muted ink | `#a69a7f` | meta, timestamps, hints |
| **Structural accent** | `#0194a8` teal | pills, progress dots, borders, interactive affordances, badges |
| Integrity / correct | `#34d399` → `#10b981` emerald | +score, verified, correct |
| Penalty / incorrect | `#e14e4e` → `#ad0202` rose | −score, wrong option |
| PIB reader surface | `#002113` deep green + gold ink | Daily Briefs reader only (its own scoped theme + `light-theme`) |

**The five pillars:**

1. **Deep-navy console, not black.** The ground is `#072e63` — a cold, calm, low-glare base. This is the *low-cortisol reading environment* the product is built around. Navy is canonical; do not "correct" it toward black.
2. **Warm gold ink, teal current.** Gold (`#e0d0ab`) is the *primary text/ink* — warmth against the cold navy — with sand/muted steps below it. **Teal (`#0194a8`) is the structural, interactive accent** (dots, pills, borders, option surfaces). Gold reads as *authority/content*; teal reads as *system/interaction*. Emerald = integrity; rose = penalty. That's the whole hue set — no cyan-badge/yellow-podium/lighter-gold one-offs.
3. **A tri-voice type system with strict jobs.** Merriweather serif = *authority* (display headings, question stems, editorial body). JetBrains Mono = *instrument readout* (timers, telemetry, labels, stats, badges). Inter = *humane prose* (explanations, UI copy). The drift — Arena headings serif/gold vs Autopsy hero sans/white — is a defect, not a choice.
4. **Sharp precision geometry.** `rounded-sm` as the corner vocabulary (`rounded-full` reserved for dots/pills/avatars). Hairline teal/gold-tinted borders, generous vertical rhythm. It should read as an instrument panel.
5. **The Antigravity spatial layer as the "premium register."** 3D tilt (`TiltCard`), particle constellation (`InteractiveBackground`), cursor spotlight, spring physics — today only on Landing. It is the brand's high-end voice; extend it deliberately and sparingly into a few earned moments (Autopsy victory hero, Manifesto, Login), never everywhere.

**The design tension to hold:** *Academic Austerity* (pillars 1–4) and *Antigravity Spatial* (pillar 5) pull against each other — that tension is the brand. Austerity is the default; spatial richness is earned at emotional peaks (arrival, victory, purchase). All-austere feels dead; all-spatial betrays "the war on noise."

**Per-surface ambition dial:**

| Surface | Dial | Rationale |
|---|---|---|
| Arena, Autopsy, Profile, Leaderboard, PublicProfile | **Elevate & systematize** | Earned core product. Fix drift, tokenize, add purposeful motion, sharpen hierarchy. No new visual direction. |
| Daily Briefs (CurrentAffairs + PIB reader) | **Elevate** (partly done) | Already mid-revamp; unify with tokens, keep the editorial gazette direction. See separate deep-work mandate below. |
| App shell / nav / shared primitives | **Systematize** | The connective tissue that makes everything feel like one product. |
| Login, PasswordReset, LegalModal | **Hybrid** | Entry surfaces may carry more spatial richness than the utilitarian core. |
| Landing, Manifesto | **Bold (contained)** | The showcase. Push the Antigravity language further; these sell the product. |

---

## 2. Foundation Fixes (P0 — blocks all visual work)

Nothing visual is trustworthy until these are resolved. Anti-G does these **first**, as a single foundation PR, before touching any screen.

### 2.1 Make the intentional remap legible (not "fix" it — it's canonical)
`src/index.css`'s `@theme` block remaps `zinc`/`stone`/`neutral` `*-950` → navy `#072e63`, mid-steps → teal `#0194a8`, and `--color-white` → gold `#e0d0ab`. **This is the real, shipped palette — navy/teal/gold is the identity, confirmed against the live site.** Do NOT retire the navy or push toward black; the earlier "resolve to near-black" instinct was a code-only mis-read.
- **The actual problem is legibility, not the colors:** class names lie (`bg-zinc-950` paints navy, `bg-white` paints gold, `bg-zinc-800` paints teal), and components *also* hardcode the same values as hex — so every brand color has 2–3 representations. Any future edit made by "reading the class name" will be wrong.
- **Deliverable:** migrate to explicit **semantic tokens** (§3.1) whose values equal the verified pixels (`--ground:#072e63`, `--surface:#136c99`, `--accent-teal:#0194a8`, `--ink-gold:#e0d0ab`, `--ink-sand:#c8b998`, `--ink-muted:#a69a7f`, `--integrity:#34d399`, `--penalty:#e14e4e`). Keep the remap working during migration for compatibility, but author all new/changed code against tokens, and update `docs/design-system.md` (which currently lists `zinc-950` as the ambiguous `#072e63 / #09090b` — delete the `#09090b`).

### 2.2 Kill the genuine off-palette one-offs (teal & gold are NOT off-palette)
Replace hardcoded literals with §3.1 tokens. The true strays to eliminate (they sit *outside* the navy/teal/gold/emerald/rose set): **cyan** premium badge (Profile L503), **yellow/amber** podium (Leaderboard L67–71), and the **lighter gold `#f2e1bb`** in the radar (PublicProfile L296 — should be `--ink-gold`). Note: navy `#072e63` pill text (Profile L671) is *on*-palette (it's the ground used as ink on a gold surface) — keep the intent, just tokenize it.

### 2.3 Clean the type foundation
- Remove/якщо unused: **Playfair Display** (installed, never imported) and **Cinzel** (loaded in `index.html`, not in theme). Decide serif = Merriweather (current) and delete the rest, OR intentionally adopt one — but stop loading fonts that nothing uses (perf + clarity).
- Define the missing `@keyframes shake` (Login `animate-shake` L399 is currently a dead no-op) or remove the class.

### 2.4 Housekeeping that affects perceived quality
- **Favicon:** none is declared in `index.html`. Add one (brand mark). Also generate the missing `/og-image.png` (referenced by OG/Twitter meta but not confirmed present).
- **Accessibility regression:** `index.html` viewport locks zoom (`maximum-scale=1.0, user-scalable=no`) — a WCAG failure. Remove the lock.
- **Ship-blocking cleanups spotted:** `console.log` of user session payload (PublicProfile L79–83); contradictory CP-rule copy (Leaderboard says +15 CP bonus, PublicProfile tooltip says +25) — pick one source of truth.

---

## 3. Cross-Cutting Systems (build once, apply everywhere)

### 3.1 Design-token layer
Author a single semantic token set (CSS custom properties in the `@theme` block) and drive everything from it:
- **Color:** `--surface-0/1/2` (canvas → elevated), `--gold` (+ `-dim`, `-glow`), `--integrity` (emerald), `--penalty` (rose), `--warning` (amber), `--ink-primary/secondary/muted`, `--hairline`. Keep the existing PIB Material-style semantic tokens (`--color-surface`, `--color-on-surface`, `--color-primary`, the `light-theme` override) — the Daily Briefs reader depends on them; fold them into the unified system rather than leaving them as an island.
- **Space & radius:** a documented spacing scale and the `rounded-sm` radius contract.
- **Elevation & glow:** standardize the gold glow (`shadow-[#e0d0ab]/10`) and card shadows as tokens.
- Lock this into `design-system.md` (update it — it currently has the two-value ambiguity) and, if using superdesign, into a canvas `design-system.md`.

### 3.2 Motion system
Codify one motion language (the app standard is **Framer Motion / `motion/react`** — do NOT introduce GSAP except for a deliberate showcase; avoid dependency sprawl):
- **Durations/easings:** enter 150–300ms, exit faster; spring defaults (`stiffness ~300, damping ~28`) for interactive feedback; the custom `[0.22,1,0.36,1]` ease already used in Autopsy for content reveals.
- **Primitives to standardize:** count-up numbers (Autopsy's `AnimatedNumber` — extract and reuse), staggered list entrance, `whileTap` press feedback, `layoutId` shared-element morphs (already used for nav pill + brand H1 + the Daily Briefs headline→dossier morph I added), `AnimatePresence` route/section transitions.
- **`prefers-reduced-motion`:** must be respected globally via `useReducedMotion()` — several screens don't.

### 3.3 Reusable component extraction
The core screens are monoliths (Arena 1,521 lines; Profile 986; Autopsy 327 as one tree). Extract shared primitives so the revamp is consistent and maintainable — not a per-file re-skin:
- `StatCard`, `MetaPill`, `SectionHeader`, `AnimatedNumber`, `AccuracyBar`, `EmptyState`, `SkeletonCard`, `Toast`, `Modal`/`SlideOver`, `PrimaryButton`/`GhostButton`, `SubjectChip`.
- Promote the Antigravity primitives (`TiltCard`, `InteractiveBackground`) from Landing-only to a shared `src/components/spatial/` so other premium moments can reuse them.

### 3.4 Data-visualization system
Data-viz is nearly absent (only PublicProfile's premium-gated Recharts radar). This is the biggest *intuitiveness* lever. Establish a consistent chart language (Recharts is already a dependency): score-trend sparkline/line (Profile history), accuracy-by-subject bars (unify Autopsy + Profile + PublicProfile), leaderboard relative-points bars, and — tie-in to the roadmap — the Syllabus Coverage Ledger. Use the `dataviz` skill's palette/rules; all charts theme from §3.1 tokens and animate per §3.2.

---

## 4. Per-Surface Revamp Specs

Each entry: **current → issues → target**. Line numbers are anchors from the recon, not exhaustive. **Pixel-grounded companion:** [`docs/live-site-critique.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/live-site-critique.md) — a live walkthrough of the rendered product (Landing, Daily Brief, Leaderboard, Sign In verified; Autopsy/Profile/PublicProfile still auth-gated/provisional). Where the two differ, the live critique wins.

### 4.1 App shell / nav header (`src/App.tsx`)
- **Current:** fixed frosted header, animated `layoutId` nav pill (good), brand H1 shared-layout morph.
- **Target:** it already models the motion standard — make it the reference. Ensure the pill/brand morph, focus states, and mobile nav (horizontal scroll tabs) meet the tokenized system. Add a persistent, quiet **exam-countdown / pace** slot here later (roadmap tie-in) — the "clock" that replaces streak-noise.

### 4.2 Landing (`src/components/Landing.tsx` + spatial primitives)
- **Current:** the showcase — `InteractiveBackground`, `TiltCard`, `DiagnosticPreview`, `SyllabusMatrix`. Strong.
- **Issues:** capability-card copy is generic B2B (per brand-review); "War on Noise" is buried in the gated Manifesto, not the hero; no visible proof/scarcity.
- **Target (Bold, contained):** lead the hero with "The War on Noise"; wire the copy from [`strategy/landing-page-copy.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/landing-page-copy.md); add the live 500-seat counter (provable scarcity); tighten the spatial choreography (don't overload). This is the primary `superdesign`-canvas + `imagegen-frontend-web` surface.

### 4.3 Login / PasswordReset (`Login.tsx`, `PasswordReset.tsx`)
- **Current:** split-panel gold/dark; `layoutId` brand morph; `AnimatePresence` form-mode swap. PasswordReset is emerald-led (intentional or drift — decide).
- **Issues:** dead `animate-shake`; hardcoded hex; PasswordReset's emerald vs gold inconsistency.
- **Target (Hybrid):** keep the strong split-panel; fix the shake; tokenize; decide the emerald question (recommend: emerald only as the success/valid signal, gold as the brand frame). Optional spatial touch: subtle `InteractiveBackground` behind the dark panel.

### 4.4 Manifesto (`src/components/Manifesto.tsx`)
- **Current:** philosophy sales page → Razorpay checkout; Crown icon on CTA.
- **Issues (from brand-review):** anti-manipulation pledge undercut by unproven scarcity; Crown is game-badge iconography the manifesto disavows; "Unfair Advantage" has no proof.
- **Target (Bold, contained):** live seat counter to make scarcity honest; replace Crown with an austere mark (Shield/Sparkles); add one concrete proof number; carry the spatial register. **Invariant: do not alter the Razorpay order/verify flow** — restyle only.

### 4.5 Arena (`src/components/Arena.tsx`) — highest-effort surface
- **Current:** 1,521-line monolith, four inlined screens (intro / training setup / loading / quiz). Signature two-step **Lock-Answer** commit barrier. Per-question timer.
- **Issues:** native `window.confirm` (L657) breaks the design; off-palette loading/error (`neutral`/`red` vs `zinc`/`rose`, L1156–1164); option buttons have zero motion; no question enter/exit transition; the Lock→reveal (the app's most important action) has no confirmation animation; timer is a weak right-aligned number with no depletion arc; progress chain (25–50 tiny 2.5px dots) doesn't scale and has 10px tap targets; two corner radii mixed; training setup has no motion; grammatical slip ("We proactive backfilled…", L372).
- **Target (Elevate & systematize):**
  - Replace `window.confirm` with the tokenized `Modal`.
  - Fix loading/error to palette; extract them to `EmptyState`/`SkeletonCard`.
  - **Motion where it matters most:** `whileTap` on options; a satisfying, restrained Lock→reveal confirmation (correct = emerald settle, incorrect = rose + the correct one revealed); `AnimatePresence` question enter/exit; stagger options on question change.
  - **Redesign the timer** into a spatially prominent radial/arc depletion with a calm→urgent transition (respect low-cortisol — urgency should be legible, not panic-inducing).
  - **Rework the progress palette** for scale + mobile tap targets (grouped/segmented, not 50 micro-dots).
  - Extract the four screens into sub-components; de-duplicate the copy-pasted toast/grid/save calls.
  - Preserve **all** state semantics: Lock-Answer barrier, `pendingAnswersMap`/`lockedMap`, per-question timer, localStorage resume keys, server-side grading. Restyle, don't re-architect the logic.

### 4.6 Autopsy (`src/components/Autopsy.tsx`)
- **Current:** 327 lines; `AnimatedNumber` count-up on CP figures; animated subject bars; percentile card.
- **Issues:** the three **headline** stats (Correct/Incorrect/Unattempted) are static while secondary CP figures animate — emphasis inverted from importance; percentile (the most reward-worthy number) is static; no stagger; sans/white hero heading conflicts with Arena's serif/gold display; "Autopsy" name not reflected (H1 says "Performance Analytics"); `<br className="mt-4">` code smell.
- **Target (Elevate):** this is the **victory moment** — earn a spatial touch. Count-up the headline stats and percentile; stagger the reveal (stat grid → CP → metrics); unify the display heading to the serif/gold standard; differentiate high vs low performance with restrained motion; add a score-trend context (data-viz §3.4). Reuse the extracted `AnimatedNumber`, `AccuracyBar`, `StatCard`.

### 4.7 Daily Briefs — CurrentAffairs + PIB reader (`src/components/CurrentAffairs.tsx`)
- **Current:** substantially rebuilt already (editorial lead-story hero, category tabs, search, slide-over dossier). I recently added: animated tab pill, headline→dossier `layoutId` morph, spring hover/tap, bookmark pop, and a drag-to-swipe PIB edition carousel with dot navigator + reading-time.
- **Target (Elevate):** unify with the §3.1 tokens (it uses the PIB semantic tokens — keep, fold in); ensure the new motion respects `prefers-reduced-motion` (done for the parts I touched); do **not** regress the carousel/morph work. Deeper content/intelligence work is a **separate mandate** (see §9) — this plan covers only its visual unification.

### 4.8 Profile (`src/components/Profile.tsx`)
- **Current:** 986-line monolith; three stat cards; saved insights/articles toggle; previous-attempts **table**.
- **Issues:** no data-viz despite rich score-history time-series; static stat cards (no count-up/stagger); Saved Articles list unanimated while Saved Insights above it is animated (in-file inconsistency); cyan premium badge off-palette; duplicated save-name handlers; overwrought "tactical" copy; filler footer text.
- **Target (Elevate & systematize):** extract `ProfileCard`/`StatCard`/`HistoryTable`/`SavedList`; add a **score-trend chart** (the headline intuitiveness win); count-up + stagger stats; unify the saved lists' motion; fix the cyan badge to gold; de-dupe handlers; tighten copy.

### 4.9 Leaderboard (`src/components/Leaderboard.tsx`)
- **Current:** 293 lines; ranked table; modal is the only motion.
- **Issues:** table rows have no entrance/stagger/layout animation (the single most motion-worthy, competitive surface is static); podium is only a text-color difference (weak hierarchy); no "you are here" row; dead public/private branch (L166–180).
- **Target (Elevate):** animate rows (stagger + `layout` for rank changes); design a real **podium** (top-3 elevation/medals, still austere); highlight the current user; relative-points bars (data-viz §3.4); remove the dead branch.

### 4.10 PublicProfile (`src/components/PublicProfile.tsx`)
- **Current:** modal dossier with a Recharts radar (premium-gated) — the only real chart in the app.
- **Issues:** shipped `console.log` of user data (P0 cleanup); double round-trip (RPC + separate quiz_sessions query for the radar); `#f2e1bb` off-token; no `AnimatePresence` (declared exit props are dead); static stat cards; contradictory CP copy vs Leaderboard.
- **Target (Elevate):** remove the console.log; wrap in `AnimatePresence`; tokenize the radar; count-up stats; reuse `StatCard`; reconcile CP rules with a single source.

### 4.11 Shared primitives (`LegalModal.tsx`, `InfoTooltip.tsx`)
- **LegalModal:** tokenize; add `AnimatePresence` exit; keep the `prose` treatment.
- **InfoTooltip:** currently CSS-only, no motion, 21 lines — fine as a base, but align to tokens and add a subtle fade/scale for consistency; ensure keyboard/focus accessibility (tooltips must be reachable, not hover-only).

### 4.12 Global states
Standardize **empty / loading / error** across the app into `EmptyState` + `SkeletonCard` (Arena's off-palette states and Profile's plain `animate-pulse` text are the worst offenders). Skeletons should match final layout to keep CLS ~0.

---

## 5. Accessibility & Responsive (non-negotiable, checked per screen)

- Contrast ≥ 4.5:1 (verify gold-on-dark and muted-zinc text — several `zinc-500/600` on dark are borderline).
- Restore pinch-zoom (remove viewport lock, §2.4).
- Keyboard nav + visible focus rings on every interactive element; tooltips/menus reachable without hover.
- Touch targets ≥ 44×44 (Arena progress dots fail today).
- `prefers-reduced-motion` respected everywhere.
- Every screen validated at 375 / 768 / 1024 / 1440.

---

## 6. Execution Structure for Anti-G (sub-agent parallelization)

The owner flagged this "might require sub agents." Recommended structure:

- **Phase 0 — Foundation (serial, one agent, blocks all):** §2 fixes + §3.1 tokens + §3.2 motion primitives + §3.3 shared-component scaffolding. Nothing else starts until this merges.
- **Phase 1 — Critique pass (parallel, read-only):** run `design:design-critique` per screen to produce a per-surface defect list; reconcile against this plan.
- **Phase 2 — Surface execution (parallel, up to ~3–4 agents), grouped to avoid collisions:**
  - Agent A: **Core arena** — Arena + Autopsy (share the most primitives).
  - Agent B: **Identity & social** — Profile + Leaderboard + PublicProfile (share StatCard + data-viz).
  - Agent C: **Entry & marketing** — Landing + Login + PasswordReset + Manifesto + LegalModal (share spatial primitives).
  - Daily Briefs is excluded from re-architecture (only token unification) to protect recent work.
- **Phase 3 — Integration & QA (serial):** cross-screen consistency sweep, `high-end-visual-design` "does it feel expensive" pass, accessibility/responsive validation (§5), verification (§8).

Each Phase-2 agent works on a disjoint file set to avoid merge conflicts; all consume the Phase-0 tokens/primitives.

---

## 7. Skills Playbook — see the handoff

The full "which skill, when, why, how" mapping — plus Framer MCP usage and guardrails — lives in the Anti-G handoff so it travels with the delegation: [`docs/handoffs/tark-ui-revamp-handoff.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/handoffs/tark-ui-revamp-handoff.md) (canonical copy in `.agents/inbox/`). Summary: `design:design-critique` (audit) → `superdesign` (canvas drafts/variants for high-stakes screens + lock design-system) → `redesign-existing-projects` + `high-end-visual-design` + `design-taste-frontend` (execution & taste) → `impeccable` (live browser polish + Antigravity effects) → `dataviz` + `ui-ux-pro-max` (charts + motion/UX reference) → `brandkit`/`imagegen-frontend-web` (favicon, OG image, hero visuals). Framer MCP: motion/interaction prototyping and optionally the public marketing/SEO pages.

---

## 8. Verification (definition of done)

- `npm run lint` (tsc web + api) passes.
- Dev server renders every revamped screen with **no console errors** (note: local run currently needs the Supabase anon key in `.env`/`.env.local` — a pre-existing setup gap, see the crash in `server-lib/training-questions.ts`).
- Every screen screenshotted at 4 breakpoints, light where applicable (PIB reader), and with reduced-motion on.
- All P0 cleanups (§2.4) resolved.
- No preserved-invariant regressions (§ handoff guardrails): auth, server-side scoring, Lock-Answer semantics, localStorage resume, Razorpay flow, PIB tokens, the Daily Briefs motion already shipped.
- One before/after gallery per surface for owner review.

---

## 9. Deferred (owner's separate mandate — do NOT start here)

After design is delegated to Anti-G, the owner wants deep-work with me on making **Tark Daily Briefs a hyper-intelligent, unavoidable intelligence unit** — re-architecting the scraper logic (incl. the PIB scraper that pulls digests from open-source coaching archives) to be *100× better, faster, more efficient, quality-first*, delivering clutter-free administrative news in a low-cortisol, low-stimulus, intuitive, innovative environment. This is tracked separately from the UI revamp and connects to [`docs/news-feed-quality-roadmap.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/news-feed-quality-roadmap.md). **This plan does not cover it; it is the next conversation.**
