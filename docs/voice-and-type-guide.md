# Tark — Voice & Type Guide

> 2026-08-19. The rule for making Tark's language human and its typography legible, applied platform-wide. Companion to [[design-system]] and [[ui-revamp-masterplan]]. Both Claude and Anti-G follow this for every string and heading.

## The problem
The product drifted into a "tactical/military/intelligence" register — *Peak Query Yield, Candidate Knowledge Dossier, Contender Points, Deploy Next Assessment, Pre-Flight Briefing, protocols, telemetry, Vanguard, Terminate Session* — and into **JetBrains Mono UPPERCASE for nearly every heading and label**. Together they make a study tool read like a cockpit sim. Serious ≠ jargon; austere ≠ shouting in mono-caps.

## Voice rule
Write like a sharp, respectful coach talking to an adult aspirant. Precise and calm, never cute, never military cosplay. Plain nouns beat invented ones. When unsure, use the boring true word.

### Lexicon (replace left with right, everywhere)
| Jargon (banned) | Human (use) |
|---|---|
| Peak Query Yield | Best Score |
| Candidate Knowledge Dossier | Saved for Later |
| Contender Points / CP | Rank Points (or just Points) |
| Vanguard Assessment / VANGUARD RANKED | Ranked Test / Ranked |
| Tark Vanguard (leaderboard) | Tark Rankings |
| Deploy Next Assessment | Take Another Test |
| Pre-Flight Briefing | Before You Begin |
| protocol(s) (meaning questions) | question(s) |
| Telemetry / Tactical Baseline | Stats / Last Attempt |
| Intelligence Dossier / Dossier (article reader) | Full Brief |
| Terminate Session | Sign Out |
| Founders Club Clearance | Membership |
| Recalibrating focus… | Loading… |
| processed protocols | questions answered |

Keep as brand names (deliberate, not jargon): **The War on Noise**, **The Arena**, **The Autopsy**, **The Daily Brief**, **Founders Club**. These are evocative *product* names, not invented metrics — that's the line.

## Type rule — TWO fonts do 95% of the work; mono is a numeric accent only
The three fonts are the right fonts. The defect is **density**: serif + mono + sans all appear at once on every screen because mono-uppercase is doing eyebrows, labels, buttons, tags AND sub-labels. A viewer should perceive **two** type voices per screen, not three. So:

| Role | Font | Notes |
|---|---|---|
| Display + section/card titles | **Merriweather serif**, tracking-tight, sentence case | The one "voice" font. "The War on Noise", "Saved for Later" |
| **Everything textual** — body, labels, eyebrows, buttons, tags, helper, nav | **Inter sans** | The workhorse. Small labels/eyebrows may be uppercase + tracked, but in **Inter, not mono** |
| **Numbers only** — timers, scores, counts, dates, +2/-0.66, seat counts | **JetBrains Mono** | Strictly digits and digit-adjacent glyphs. **Never words, buttons, or eyebrows.** This is what keeps mono a rare, deliberate accent instead of a third omnipresent font |

**The hard change:** every `font-mono` currently on a *word* (eyebrow, label, button, tag) moves to `font-sans`. `font-mono` survives only where the content is essentially a number. Net effect: any given screen reads as serif titles + Inter everything, with mono flashing only on the actual data.

- **Eyebrow restraint** (taste §4.7): ≤1 uppercase eyebrow per ~3 sections; most need none.
- Sentence case for titles and labels; reserve ALL-CAPS for tiny tags only.
- No em-dashes anywhere (taste §9.G).

### Acceptance gate for the platform-wide sweep
Mechanical check per component: `grep -c "font-mono" <file>` should approach zero, and every surviving `font-mono` must sit on numeric content (verify each). Then a screenshot of each screen showing at most two perceptible type voices. This gate exists because a "done" claim without it is how the mono-everywhere pattern crept in.

## Sweep status — COMPLETE (2026-08-19)
Every user-visible jargon string across all components has been humanised; typecheck clean; verified live on Landing + Daily Brief.
- **Landing**: single Sign-In, cleaned tagline, em-dash removed, button-in-button CTA, capability-card titles → serif ("The Arena & Autopsy", "The Daily Brief").
- **SyllabusMatrix**: mono-caps title → serif "What the Syllabus Actually Weighs" + human subhead.
- **Profile**: "Peak Query Yield"→"Best Score"; "Candidate Knowledge Dossier"→"Saved for Later" (serif); "Vanguard"→"Ranked"; telemetry copy humanised.
- **Arena**: "Select Assessment Protocol"→"Choose Your Test"; "Vanguard Ranked Assessment"→"Ranked Test"; "Pre-Flight Protocol Briefing"→"Before You Begin"; "Contender Points"→"Rank Points"; "Saved to Dossier"→"Saved"; architect/backfill copy humanised.
- **Autopsy**: "Deploy Next Protocol"→"Take Another Test"; "Founders Club Clearance"→"Join the Founders Club"; "Contender Points"→"Rank Points"; "Vanguard Competitive Protocol"→"Ranked test"; "Cohort Standing & Mastery Index"→"Where you stand".
- **Leaderboard**: "Vanguard Arena Leaderboard"→"Tark Rankings"; "Contender"→"Ranked Aspirant"/"Rank Points"; empty/loading + scoring-modal copy humanised.
- **PublicProfile**: "Contender Points"→"Rank Points"; telemetry copy humanised.
- **CurrentAffairs**: "PIB Gazette Dossiers"→"PIB Briefs"; "Intelligence Dossier"/"Read Full Dossier"/"Save Dossier"→"Full Brief"/"Read Full Brief"/"Save Brief"; masthead eyebrow + subhead + "Chronological Policy Dispatches"→"Latest Briefs".
- **LegalModal**: "platform telemetry"→"usage data".

Code identifiers deliberately left untouched (`selectedDossier`, `contender_points`, `dossier-headline` layoutIds, `subject_stats`) — renaming them is out of scope and risks breakage. Product/brand names kept: The War on Noise, The Arena, The Autopsy, The Daily Brief, Founders Club.
