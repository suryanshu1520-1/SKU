---
type: agent-handoff
from: Claude (Sonnet) — Claude Code
to: Anti-G (Antigravity)
date: 2026-08-19
subject: Platform-wide typography hierarchy sweep (mono → sans)
status: done
---

# Handoff → Anti-G: Typography Hierarchy Sweep

## The decision (already made — do not re-litigate)
The three fonts stay (Merriweather serif, Inter sans, JetBrains Mono). The defect is **density**: mono-uppercase is doing eyebrows, labels, buttons, tags AND sub-labels on every screen, so all three fonts appear at once = visual noise. Fix it to **two perceived voices per screen**. Full rule + rationale: [[voice-and-type-guide]] "Type rule" section. Proven live on `Landing.tsx` (now 0 `font-mono`; serif titles + Inter everything + mono only on the numeric syllabus tiles).

## The mechanical change
For every component, move `font-mono` **off words** onto `font-sans`. `font-mono` survives **only** where the content is essentially a number (timers, scores, counts, dates, +2/-0.66, seat counts, `%`, "380 items"). Never on eyebrows, labels, buttons, tags, headings, or body.

Section/card titles that are currently mono-uppercase → **Merriweather serif, sentence case** (see Landing's "The Arena & Autopsy" and Profile's "Saved for Later" for the pattern already applied).

## Files to sweep (Landing.tsx DONE as the reference)
`Arena.tsx`, `Autopsy.tsx`, `Profile.tsx`, `Leaderboard.tsx`, `PublicProfile.tsx`, `CurrentAffairs.tsx`, `Login.tsx`, `Manifesto.tsx`, `LegalModal.tsx`, `DiagnosticPreview.tsx`, `InfoTooltip.tsx`, and the nav in `App.tsx`.

Per file: flip word-`font-mono` → `font-sans`; convert mono-uppercase section titles to serif sentence-case; keep numeric mono. Screens WITH real data readouts (Arena timer, Autopsy scores, Profile stat numbers, Leaderboard points) keep mono on those numbers — that's the accent working. Screens with no real numbers (Login, Manifesto, LegalModal) should end at ~0 mono like Landing.

## Guardrails
- Copy is already humanised ([[voice-and-type-guide]] sweep COMPLETE) — **don't touch strings**, only `font-*` classes and the serif-title conversions.
- Preserve brand tokens, navy/teal/gold, `rounded-sm`, all motion/`layoutId`s, and the no-em-dash rule.
- Do NOT rename code identifiers.

## Acceptance gate (this is the point — an ungated "done" is how mono-everywhere happened)
1. `grep -c "font-mono" <file>` per component, and **every** surviving `font-mono` verified to sit on numeric content (paste the grep + a one-line justification per survivor).
2. A screenshot of each screen showing **at most two perceptible type voices**.
3. `npm run lint` clean.
Report all three per surface before claiming done.

## Read-first
- [[voice-and-type-guide]] — the rule + the completed copy lexicon.
- [[ui-revamp-masterplan]] / [[live-site-critique]] — surrounding revamp context.
- Reference implementation: `src/components/Landing.tsx` (git diff shows the exact pattern).
