# Tark — Live-Site Design Critique (pixel-grounded)

> 2026-08-19. Done the right way this time: walked the **actually rendered** product at `https://tarkv1.vercel.app` through the `design:design-critique` + `design-taste-frontend` lenses, not the code (the `@theme` remap makes class names lie — see [[ui-revamp-masterplan]] §2.1). Surfaces captured live: Landing, Daily Brief, Leaderboard (empty), Sign In, **Profile & History, Arena, Autopsy** (7 of 8 verified after sign-in). Only **PublicProfile** remains unreachable (opens from a Leaderboard analyst; the board is empty). This is the ground-truth companion to the master plan's §4.

## Verified identity (from pixels)
Deep-navy console (`#072e63`) · champagne-gold `#e0d0ab` as **primary ink** · teal `#0194a8` as the **interactive/structural accent** · emerald integrity · rose penalty · Merriweather serif display / Inter body / JetBrains Mono telemetry. Warm-on-cold, low-glare, genuinely low-cortisol. The identity is strong and coherent — the work below is *elevation*, not rescue.

---

## Landing — "The War on Noise"
**First impression:** Confident and distinctive. The serif gold hero on navy lands the brand in 2 seconds. Strong.

| Finding | Severity | Recommendation |
|---|---|---|
| **Duplicate "Sign In"** in the nav — a text link *and* a filled button, side by side | 🔴 | One sign-in affordance. Keep the filled button; drop the text link (taste-skill: no duplicate CTA intent). |
| **"0 / 500 seats claimed"** shown prominently | 🟡 | Zero is honest but reads as "no traction." Either soft-hide the count until it's non-trivial, or reframe ("Founding cohort now open · 500 seats"). Don't broadcast 0. |
| Tagline `ASSESS. ANALYZE. TRACK. • TARK | तर्क` appends the wordmark again under the wordmark | 🟢 | Drop the trailing `TARK | तर्क`; the hero already says it. |
| Two teal HUD badges (Founders / 1,720+ synced) are tiny mono, low-contrast on navy | 🟢 | Fine as ambient telemetry; nudge contrast up one step. |

**Works well:** hero hierarchy (headline → subhead → 2 CTAs with correct gold/outline priority); the interactive Diagnostic Preview is a genuinely great above-the-fold proof device; spacing is calm.

---

## Daily Brief
**First impression:** The editorial masthead ("The Daily Brief | दैनिक नीति संकेत") is the most "expensive"-feeling surface in the app. Serif + gold + navy = a real gazette.

| Finding | Severity | Recommendation |
|---|---|---|
| **"Summary pending." bullet renders live** on the lead card | 🔴 | This is the `normalizeToThreeBullets` fabricated-padding defect (see news-feed roadmap) leaking to users. Publish 1–2 honest bullets rather than a fake third. Ties to the scraper mandate. |
| The feed is near-monochrome navy top-to-bottom | 🟡 | Introduce one more surface step (`#136c99` / translucent-teal panels from the token set) so the lead story separates from the stream. Right now hierarchy leans only on type size. |
| PIB Gazette (teal) vs Fetch Live (gold) buttons sit together | 🟢 | Correct instinct (teal = system action, gold = primary), just formalize it as the rule everywhere. |

**Works well:** category tabs with the gold active pill; ministry pills in teal; the lead-signal serif headline; reading rhythm. The recently-added motion (tab pill, headline→dossier morph, swipe carousel) is the right direction — unify tokens, don't regress.

---

## Leaderboard (empty state)
**First impression:** A small empty-state card marooned in a very large navy void — ~70% of the viewport is blank.

| Finding | Severity | Recommendation |
|---|---|---|
| **Empty state doesn't hold the space** | 🟡 | Compose it: center it vertically, give the teal shield more presence, and *show the structure that will fill* — a ghost/skeleton podium + rank rows behind the message, so the user sees what's coming. |
| Podium/structure invisible when empty | 🟡 | Preview the top-3 podium as a dimmed placeholder; it teaches the mechanic and kills the void. |
| Copy "The ledger is clean" is on-brand but the only thing on screen | 🟢 | Pair with one concrete next-action button ("Take today's assessment"). |

**Works well:** the header lockup ("TARK VANGUARD" + reset time) is clean and on-voice.

---

## Sign In
**First impression:** The strongest *composition* in the product — a warm gold (`#e0d0ab`) left panel against the cold navy form panel. Distinctive, memorable, on-brand.

| Finding | Severity | Recommendation |
|---|---|---|
| **Left-panel body text is low-contrast** (muted teal on gold) — "Tark is a pristine environment…" and the footer "We know how much you hate logins…" | 🔴 (a11y) | Darken the left-panel body ink to the navy ground (`#072e63`) for WCAG AA on the gold field. Check every string on that panel. |
| **"Tark 1.0 | तर्क 1.0"** version number in the wordmark | 🟡 | Drop "1.0" from customer-facing surfaces (brand-review §). Reads as unfinished software. |
| Footer login copy is informal and quoted oddly ("…refer to our 'privacy' section to read EXACTLY why…") | 🟢 | Tighten to one calm sentence; lose the shouty EXACTLY. |

**Works well:** the split composition, the form hierarchy (labels above inputs, helper text, Google option), the emerald validity accent. This layout is a template the rest of the app should aspire to.

---

## Arena (from owner screenshot)
Confirms the master-plan §4.5 findings against real pixels: teal option-cards on navy, teal progress dots (too small/dense to tap on mobile), a weak right-aligned "9s" timer with no depletion visual, gold "LOCK ANSWER" as the primary action (correct), and the serif question stem reading well. The option cards have no visible press/selection motion. Priorities unchanged: timer redesign, Lock→reveal confirmation motion, option `whileTap`, progress-palette scale/tap-targets.

## Profile & History (verified live)
**First impression:** Dense and legible — three teal stat cards (Account Identity, Tactical Baseline, Performance Summary) over a saved-items area and a full attempts table. Reads like a real analyst dashboard.

| Finding | Severity | Recommendation |
|---|---|---|
| **Score history is a plain table, zero visualization** — the Score column runs 4/25, 21/25, 3/25, 7/25, 0/25… across many attempts | 🔴 | This is the single biggest intuitiveness win in the app. Add a **score-trend sparkline/line chart** above the table (dataviz skill, tokens). The data is already sorted by date and sitting right there. |
| Headline stat cards (Correct 4 / Incorrect 6 / Unanswered 15) are **static** | 🟡 | Count-up + light stagger on load (reuse Autopsy's `AnimatedNumber`). |
| Filler copy "Analytics aggregated from real-time database transactions." | 🟢 | Delete; it says nothing. |
| "Terminate Session" for log-out | 🟢 | Harsh even for the tactical voice; "Sign out" is fine. |
| "Export Locked" premium gate is a dead-looking disabled button | 🟢 | Style it as an intentional upsell, not a broken control. |

**Works well:** the tri-card top row, the accuracy pills (MARGINAL rose / ADVANCED emerald) in the table, the saved-insights/articles toggle. Membership + visibility controls are clear.

## Autopsy (verified live)
**First impression:** Informative but the emphasis is inverted — the big "Performance Analytics" header is sans/white while the numbers that matter sit quiet.

| Finding | Severity | Recommendation |
|---|---|---|
| **Headline stats static, secondary CP figures animate** — Correct 1 / Incorrect 0 / Unattempted 24 don't count up, but "+3 CP" below does | 🟡 | Invert it: count-up the headline stats and the percentile ("scored higher than 20.7%") — those are the reward numbers. |
| **"Performance Analytics" is sans/white**, clashing with Arena's serif/gold display voice | 🟡 | Unify to the serif/gold display standard; also make the H1 reflect the evocative "Autopsy" name. |
| The metrics panel is near-black (`#0c0c0c`) sitting on navy | 🟢 | Jarring seam; use the token surface step (`#136c99`/translucent) instead of a black island. |
| Founders "Unlock The Network" card + architect quote repeats the Manifesto pitch | 🟢 | Fine once, but it duplicates messaging seen elsewhere; consider a lighter touch here. |

**Works well:** the percentile statement card, the CP breakdown with animated figures, the weakest-subject ordering. This is the **victory moment** — it should earn one restrained Antigravity spatial touch (master plan §4.6).

## Still unreachable — PublicProfile
The analyst dossier modal (`PublicProfile.tsx`, the only real chart in the app — a Recharts radar) opens by **clicking an analyst on the Leaderboard**, and the Leaderboard is currently empty, so there's no entry point. Its spec still rests on the code recon (master plan §4.10) — directionally right but **not pixel-verified**. To close it: seed one public analyst into the leaderboard, or send a screenshot of an open dossier. Everything else is now verified live.

---

## Cross-surface takeaways (pixel-confirmed)
1. **The identity is genuinely good** — navy/gold/teal is distinctive and calm. Protect it.
2. **Two real, ship-visible defects**: the fabricated "Summary pending." bullet (Daily Brief) and low-contrast gold-panel text (Sign In). Both are P0.
3. **Duplicate Sign-In** and the **"1.0"** version stamp are quick brand wins.
4. **Empty/void states** (Leaderboard) waste the strongest asset — space — instead of using it.
5. Motion is thin on the interactive core (Arena options, Leaderboard rows) and rich only on entry/marketing — exactly inverted from where feedback matters most.
