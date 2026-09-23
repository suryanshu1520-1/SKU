---
title: Tark UX North Star
author: v0 (Vercel) — validated by Orchestrator 2026-09-20
status: canonical-reference
consumers: [antigravity, orchestrator]
scope: product-wide UX direction — not a per-file spec
---

# Tark UX North Star

> Source: external design audit by v0 (Vercel). Validated by the Orchestrator on 2026-09-20 as directionally correct but **not** an atomic contract. Sequenced execution lives at `.agents/inbox/tark-ux-north-star-execution-handoff.md`. When those contracts and this document ever disagree, the contract wins — this doc is the compass, not the map.

## Product objective

Help a user answer three questions immediately:

1. **What should I do now?**
2. **How am I performing?**
3. **What should I do next to improve?**

Every screen, component, label, animation, and visual treatment must support one of those questions. Remove anything that adds atmosphere but not comprehension, confidence, or action.

## Core design direction

Preserve Tark's serious editorial character (Prussian Blue ground, Chamber Gold ink) but evolve it from "instrument panel" to "elite exam companion." Restrained, high-contrast visual system with one memorable accent — Tark's accent is already **Chamber Gold** (`#e0d0ab`); do not re-pick a palette.

Use:
- The existing warm-cool near-black **Chamber ground** (`#041d40` / `#072e63`).
- Layered surfaces rather than many unrelated panel colors.
- One primary accent for action and progress (Chamber Gold).
- One success color (emerald) and one danger color (rose).
- Muted text with sufficient contrast.
- Thin borders used selectively.
- Subtle elevation and depth, never excessive glow.

Avoid:
- Dense neon dashboards.
- Decorative gradients behind every section.
- Excessive borders and nested cards.
- Multiple competing accent colors.
- Large areas of animated noise.
- Fake technical language used as decoration.
- Glassmorphism that reduces readability.
- Emoji as interface icons.

## Typography

Target no more than two families for **body/UI**; display faces are allowed only for brand moments. Current shipping stack is four families (Inter, Merriweather, Cinzel, JetBrains Mono) — that is over-budget and must be pruned. Suggested landing:

- **Inter** — UI sans (nav, controls, metadata, body).
- **Merriweather** — editorial serif for long-form (Daily Brief dossiers, Manifesto).
- **JetBrains Mono** — kept only for timers, scores, question numbers, codes, IDs.
- **Cinzel** — evaluate; retain only if a brand moment truly needs it. Otherwise retire.

Type scale must have visible hierarchy: page title → section title → card title → body → supporting → metadata. No all-caps except short metadata labels. No monospace for ordinary paragraphs or nav.

## Information architecture

Reduce primary navigation to four destinations:

1. **Arena** — practice, mock exams, PYQs, timed sessions.
2. **Daily Brief** — current affairs, PIB, PRS, saved briefings.
3. **Observatory** — analytics, progress, weaknesses, performance trends.
4. **Profile** — goals, preferences, account, subscription, help.

Move secondary tools into contextual menus: PRS, PIB, Signals, Edition selection, Filters, Saved items, Data/source preferences, Advanced settings. Navigation should answer "where am I?" and "what can I do next?" — not advertise the entire system.

## Landing page

Direction within five seconds. Structure:

1. Clear promise: "Diagnose your UPSC readiness and improve with evidence."
2. One dominant CTA: "Start diagnostic."
3. Secondary CTA: "Explore the daily brief."
4. Three proof points in plain language.
5. Preview of the learning loop: Practice → Diagnose → Review → Improve.
6. Feature modules below the fold.
7. Trust section: data quality, evaluation, privacy, methodology.

Replace jargon with outcomes:
- "atomic state locking" → "Your progress is saved reliably."
- "zero-trust evaluation" → "Scores are calculated consistently and transparently."
- "cognitive observatory" → "See exactly where your preparation is improving or falling behind."

Technical terminology may remain in an advanced methodology section, never as the primary conversion language.

## First-run experience

No timer-triggered auto-tour. Use:
- Quiet "Take a quick tour" link.
- Contextual onboarding first time a feature is opened.
- Dismissible checklist: Set goal → Take diagnostic → Review mistakes → Plan next session.
- Visible way to resume unfinished setup.

If a modal is necessary: explain why it's appearing, clear close action, correct focus trap, never make the user feel blocked.

## Arena / exam experience

Highest-stakes surface. Calmer than the rest of the app. Hierarchy:

1. Exam/session title and mode
2. Question progress and timer
3. Question text
4. Answer choices
5. Navigation controls
6. Review/submit actions

Question + answer choices must dominate the viewport. Behavior:

- Sticky but compact progress header.
- Large, readable question text.
- Answer cards with obvious selected / correct / incorrect / disabled / review states.
- Full keyboard navigation for options and next/previous.
- Clear "Mark for review" action.
- Confirmation before final submission.
- Persistent timer with restrained visual treatment until the final threshold.
- No sudden layout shifts on selection.
- Preserve position when navigating back.
- "Saved just now" persistence feedback.
- Recovery path if browser closes or connection drops.

Feels like a reliable examination room, not a game HUD.

## Results experience

Results must lead to action. Order:

1. Score and completion summary
2. What improved
3. Main weaknesses
4. Question-level mistakes
5. Subject/topic breakdown
6. Recommended next action
7. Start targeted practice CTA

Every chart labeled with **interpretation**, not only data:
- "Polity accuracy is strong, but constitutional bodies remain inconsistent."
- "Your speed drops after question 60."
- "Most errors are knowledge gaps, not careless mistakes."

Progressive disclosure — headline insight first, details on demand.

## Daily Brief / current affairs

Optimize for comprehension and retention. Use:
- Strong date and edition header.
- Clear source attribution.
- Topic grouping.
- Estimated reading time.
- Save / share / mark-as-read actions.
- "Why it matters for UPSC" summaries.
- Links from news to related syllabus topics or practice questions.
- Concise daily completion state.

Rank stories by relevance — must-read / useful / optional — do not weight every article equally.

## Observatory / analytics

Coaching-oriented. Prioritize:
- Readiness trend
- Accuracy by subject
- Accuracy by topic
- Time per question
- Revision retention
- Weakest recurring concepts
- Recommended study action

Do not lead with abstract scores of unclear meaning. Explain benchmarks, sample size, date range, confidence. Empty states for insufficient data instead of misleading zeros.

## Navigation and responsive behavior

Desktop and mobile share the same IA and content model — layout changes, product logic does not.

**Desktop:** compact grouped rail; unmistakable active item; collapse secondary labels only with tooltip + keyboard access.

**Mobile:** bottom navigation with the four primary destinations; secondary tools in sheets/menus; primary actions in thumb reach; no horizontal scroll for essential content; bottom sheets for filters.

Breakpoints defined by content failure, not device names. Test at narrow mobile, standard mobile, tablet, current desktop.

## Accessibility

Product-quality, not compliance polish:

- Skip-to-content link.
- Semantic landmarks: header, nav, main, aside, footer.
- `aria-current="page"` for active nav.
- Accessible names for every icon-only button.
- Visible keyboard focus states.
- Full keyboard navigation for menus, dialogs, tabs, answer choices, charts.
- Dialog focus management + escape behavior.
- `aria-live` for save state, timer warnings, async results.
- Reduced-motion support.
- Color-independent states (text, icons, patterns, shape).
- Minimum touch target ~44px.
- Contrast fit for dark mode and muted metadata.
- Correct heading order.
- Error messages adjacent to relevant field/action.

Hover is never the only discovery mechanism.

## UX copy

Direct, calm, human:
- "Start diagnostic" > "Initialize assessment protocol."
- "Review mistakes" > "Open error intelligence."
- "Saved just now" > "State synchronization complete."
- "Try again" > "Re-run operation."
- "No sessions yet" + next action > blank chart.

Tell the user what happened, why it matters, what to do next. No military / surveillance / pseudo-scientific language unless it genuinely improves comprehension.

## State design (must exist explicitly for every surface)

Loading, skeleton loading, empty, first-run, offline, partial data, error, permission denied, expired session, saved, unsaved, submission in progress, submission success, submission failure, stale resume session.

No blank screens, no unexplained spinners, no empty cards without a next action.

## Motion

Communicate causality and state:
- Short transitions for navigation and selection.
- Subtle progress animation.
- Restrained completion moment after an exam.
- Honor `prefers-reduced-motion`.

Avoid: constant ambient animation, pulsing every card, delayed content that blocks action, bouncy transitions in serious exam flows, animation used to disguise slow loading.

## Design-system cleanup

Consolidate color aliases and theme tokens. Semantic names, not remapped Tailwind scales. Tark's current `zinc/neutral/stone` scales are all remapped to the same four Chamber colors (`src/index.css:39-74`) — that remap must be replaced with named semantic tokens whose values equal the same pixels:

- `--surface` / `--surface-elevated` / `--surface-shell`
- `--border`
- `--text-primary` / `--text-secondary` / `--text-muted`
- `--accent` / `--accent-foreground`
- `--success` / `--warning` / `--danger`
- `--focus-ring`

Reusable components (single source of truth per pattern):
- Button variants
- Nav item
- Card
- Stat block
- Status badge
- Empty state / Error state
- Dialog / Sheet
- Tabs
- Progress indicator
- Question option
- Chart container

No one-off CSS per screen.

## Performance and trust

Optimize first meaningful interaction. Defer nonessential analytics and decorative effects. Kill layout shift from late fonts, images, charts, nav. Preserve form and exam state safely. Never expose sensitive server credentials in browser code. Visible source attribution and methodology wherever scores or news are presented — **trust is a UX feature** for an exam platform.

## Ship-gate checklist (per surface)

- Can a new user state the primary action after five seconds?
- Is there one dominant action?
- Does every visible metric have an interpretation?
- Can the full flow be completed by keyboard?
- Does the screen work with reduced motion?
- Are loading / empty / error / offline / success states designed?
- Does the layout remain clear on mobile?
- Is the visual hierarchy still understandable without color?
- Are labels plain enough for a first-time aspirant?
- Does the interface reduce exam anxiety rather than increase it?

## Final principle

Tark should feel like a **disciplined mentor**: focused, evidence-based, quietly confident, always clear about the next best action. Preserve the distinctive editorial identity, remove unnecessary complexity. The strongest redesign is not the one with more panels, effects, or terminology — it is the one that helps an aspirant make better preparation decisions with less cognitive effort.
