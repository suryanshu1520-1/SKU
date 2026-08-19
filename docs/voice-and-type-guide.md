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

## Type rule (the fix isn't new fonts — the three are right)
Fonts stay: **Merriweather** (serif), **Inter** (sans), **JetBrains Mono** (mono). The defect is *misassignment* — mono-uppercase is doing the job of headings everywhere.

| Role | Font | Example |
|---|---|---|
| Section / card titles | **Merriweather serif**, tracking-tight, sentence case | "Saved for Later", "What the Syllabus Actually Weighs" |
| Body, labels, helper text | **Inter sans**, sentence case | "Your highest in a single test" |
| Numbers, timers, short status tags, source pills | **JetBrains Mono** | "9s", "380 items", "RANKED" |

- **Eyebrow restraint** (taste §4.7): at most one mono-uppercase eyebrow per ~3 sections. Most headings need none — the serif title alone is enough.
- Sentence case for titles and labels. Reserve ALL-CAPS for tiny tags only.
- No em-dashes anywhere (taste §9.G).

## Applied so far (2026-08-19)
- Profile: "Peak Query Yield"→"Best Score"; "Candidate Knowledge Dossier"→"Saved for Later" (now serif title).
- SyllabusMatrix: mono-caps title → serif "What the Syllabus Actually Weighs".
- Landing: single Sign-In, cleaned tagline, em-dash removed, button-in-button CTA.

## Remaining sweep (same lexicon + type rule)
Arena (Pre-Flight/protocols/Vanguard), Autopsy (Deploy Next/Telemetry/Contender), Leaderboard (Tark Vanguard/Contender), CurrentAffairs (Dossier→Full Brief — visible strings only, not the `selectedDossier` variable). Do NOT rename code identifiers — visible copy only.
