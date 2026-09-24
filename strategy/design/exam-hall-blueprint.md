---
title: Exam Hall Blueprint — UPSC Prelims Simulation
author: Orchestrator (Claude Code), 2026-09-24
status: canonical-reference
consumers: [antigravity, orchestrator]
scope: TASK_059 – TASK_075 (Exam Hall batch)
visual_reference: strategy/design/exam-hall-mockup.html
---

# Exam Hall Blueprint

> Authority order: the active contract > this blueprint > `strategy/design/exam-hall-mockup.html` > `strategy/design/ux-north-star.md`.
> The mockup is the visual target. This file is the behavioural and copy target. Every string in quotes below ships as written.

## 1. Verdict — why this is a new mode, not a restyle

The current Arena is a per-question quiz: a 20 s / 60 s timer per question, lock-and-reveal after every question, 25 questions, and a server grader that counts right/wrong but never applies negative marking (`server-lib/submit-quiz.ts` ranks percentile on raw `correctCount`) and caps time at 60 s per question (`submit-quiz.ts:229`). UPSC Prelims GS Paper I is the opposite on every axis:

| Axis | UPSC Prelims GS-I | Current Arena | Exam Hall |
|---|---|---|---|
| Clock | One 2-hour clock for the paper | Per-question timer | One paper clock, server-authoritative |
| Size | 100 questions | 25 | 100 / 50 / 25 |
| Navigation | Free: flip anywhere in the booklet | One question at a time | Scrollable booklet + answer-sheet jump |
| Answer record | Separate OMR sheet, ink | Tap + "Lock" | Separate answer sheet (bubbles) |
| Feedback | None until results | Reveal after each lock | None until hand-in |
| Marking | +2 / −0.66 / 0, two bubbles = wrong | Counts only | +2 / −0.66 / 0, double-mark = wrong |
| End | Sheets collected at time | Last question → submit | Auto-collect at time, or hand in |

The drill flow keeps its value (instant feedback is how you learn a topic). It stays untouched. The Exam Hall is a separate module under `src/components/exam/` and `server-lib/exam/`, launched from the Arena lobby.

## 2. Principles

1. **Simulate conditions and consequences, not decorations.** Immersion comes from the same constraints (one clock, commit on the sheet, no feedback, negative marking, auto-collect), the same artefacts (booklet, answer sheet, series code), the same rituals (instructions, seal, hand-in) and consequences that teach (risk ledger, transfer errors, pace). No crowd sounds, no invigilator avatars, no game HUD.
2. **Calm presentation, real pressure.** Paper-like surfaces, serif print, quiet chrome. The clock never pulses. Colour shifts only in the final 10 minutes.
3. **Every claim is true.** Question provenance, cut-offs, and composition are shown honestly. Sample numbers never ship.
4. **Integrity scope, stated plainly.** No accidental reveals (no keys or explanations reach the client before hand-in) and no trivial tampering (server clock, server-held keys, server-issued question list). It cannot stop someone searching a public PYQ and does not try; mock papers are unranked.

## 3. Papers and marking

| Code | Title (exact) | Questions | Duration | Hall clock | Max marks |
|---|---|---|---|---|---|
| `GS1_FULL` | "General Studies Paper I · Full paper" | 100 | 7200 s | 09:30 – 11:30 | 200 |
| `GS1_HALF` | "General Studies Paper I · Half paper" | 50 | 3600 s | 09:30 – 10:30 | 100 |
| `GS1_SECTION` | "General Studies Paper I · Sectional" | 25 | 1800 s | 09:30 – 10:00 | 50 |

- Time ratio is UPSC's: 72 s per question.
- Marking: +2 for a right answer, −0.66 for a wrong answer, 0 for blank. A row with two bubbles is **invalid** and scored as wrong (−0.66). This follows UPSC's own wording ("one-third (0.33) of the marks assigned") and the arithmetic aspirants use when they self-score.
- All marks are computed in **integer hundredths**: `net = 200·correct − 66·(wrong + invalid)`. Display with two decimals. Never use floating-point sums.
- Hall clock: simulated wall time that starts at 09:30 (the GS Paper I forenoon slot) and advances with real elapsed time. Aspirants plan with wall-clock checkpoints ("first pass done by 10:30"); the hall clock trains exactly that.

### 3.1 Composition blueprints (Tark v1, constrained by the pool)

| Subject (data label) | UI label | FULL | HALF | SECTION Mixed |
|---|---|---|---|---|
| Economy | "Economy" | 34 | 17 | 9 |
| Environment | "Environment" | 24 | 12 | 6 |
| Geography | "Geography" | 21 | 10 | 5 |
| History | "History & Culture" | 15 | 8 | 4 |
| Polity | "Polity" | 5 | 2 | 1 |
| General Studies | "General" | 1 | 1 | 0 |
| **Total** | | **100** | **50** | **25** |

Sectional papers may also be single-subject (25 questions from one subject). A subject is offered for single-subject sectionals only if the pool holds ≥ 50 items of it (today: Economy, Environment, Geography, History). Polity is not offered until the bank grows.

## 4. Question pool

Source: `server-lib/analytics/data/verified_pyqs_15yr.json`. Built by `scripts/build-exam-pool.ts` into the server-only module `server-lib/exam/data/gs1ExamPool.ts`.

**Why a filter at all (audited 2026-09-24 by the Orchestrator):** the file's `TARK_*` rows are 74% keyed "A" (placeholder keys); its 2024/2025 `db_*` rows contain non-UPSC items ("What is the name of the ion with a charge of -1?"); its 2020 rows mix genuine and fabricated items ("Which set is fully correct?"). Spot checks of 2011–2019 and 2021–2023 `db_*` rows matched real UPSC papers and keys.

Eligibility, normalisation, format detection and exact expected counts are specified in `TASK_059`. Expected result: **647 items** — Economy 251, Environment 156, Geography 133, History 90, Polity 14, General Studies 3.

**Known gap (shown to users, not hidden):** 14 Polity questions. Real papers carry roughly 15 per paper. Until a Polity PYQ import lands, papers carry fewer.

**Provenance copy** (admit card footnote, exact): "About this paper: questions come from UPSC Prelims GS Paper I, 2011–2023, as recorded in Tark's PYQ bank. We left out 2020, 2024 and 2025 because those records mixed in questions UPSC never set. Our bank is thin on Polity, so this paper has fewer Polity questions than a real one."

**Explanation label** (review, exact): "Explanation · written by Tark, not UPSC".

## 5. Architecture

```
src/components/Arena.tsx ──(launch)──▶ src/components/exam/ExamHall.tsx
                                         │  useExamSession (phases, clock, autosave, recovery)
                                         │  sheetReducer (pure rules)   examApi (fetchWithAuth)
                                         ▼
          /api/exam/{catalog,start,active,checkpoint,submit,attempts,result}
                                         │  server-lib/exam/handlers.ts
                                         │  assemble.ts · grading.ts · sanitize.ts · papers.ts · pool.ts · db.ts
                                         ▼
                     public.mock_attempts (Supabase, service-role writes only)
                     public.question_attempts (best-effort analytics rows)
```

Invariants (a contract that breaks one fails):
1. The client never receives `key`, `explanation`, `year` or `subject` for any item before the attempt is submitted.
2. Grading uses only the server-held pool and the attempt's stored `question_ids`. Client-sent question lists are ignored.
3. The deadline is server time. Client timers only display it.
4. `src/` never imports a value from `server-lib/` (type-only imports allowed only in `src/components/exam/types.ts`).
5. The drill flow (`useArenaSession.ts`, lock-and-reveal, its localStorage keys) is not modified by any Exam Hall contract.
6. All protected requests use `fetchWithAuth()`.

## 6. Server

### 6.1 Table `public.mock_attempts`
Specified verbatim in `TASK_062`. One row per sitting; a partial unique index enforces one `in_progress` attempt per user. RLS: users may `select` their own rows; no client writes.

### 6.2 Endpoints (all JSON; all except catalog require `Authorization: Bearer`)

| Method + path | Body / query | Success response |
|---|---|---|
| GET `/api/exam/catalog` | — | `{ papers, sectionSubjects, blueprints, poolSize, yearsCovered }` |
| POST `/api/exam/start` | `{ paperCode, subject?, rules, series }` | `StartResponse` |
| GET `/api/exam/active` | — | `{ active: ActiveAttempt \| null, finalized: SubmitResponse \| null }` |
| POST `/api/exam/checkpoint` | `{ attemptId, sheet }` | `{ ok: true, savedAt }` |
| POST `/api/exam/submit` | `{ attemptId, sheet, mode }` | `SubmitResponse` |
| GET `/api/exam/attempts` | — | `{ attempts: AttemptSummary[] }` |
| GET `/api/exam/result?attemptId=` | — | `SubmitResponse` |

Timing rules: checkpoints accepted until `deadline + 30 s`; a submitted sheet is graded if received by `deadline + 90 s`, otherwise the stored checkpoint is graded (`submitMode: 'recovered'`). An expired `in_progress` attempt is finalised from its checkpoint the next time the user calls `active`, `start`, `attempts`, or `submit`. Submit is idempotent.

Dev-only override: when `EXAM_DEV_DURATION_SECONDS` is set, `NODE_ENV !== 'production'` and `VERCEL` is unset, new attempts use that duration. Used by `TASK_075` only.

## 7. Client state

Phases: `'checking' | 'admit' | 'starting' | 'resume' | 'sitting' | 'pens-down' | 'submitting' | 'submit-error' | 'scorecard' | 'load-error'`.

Rules presets:
- **Exam-day rules** (default, persisted): tapping an option in the booklet **circles** it (rough work, not scored). Filling a bubble on the answer sheet commits. Ink is permanent: 5 s "lift the pen" grace to undo or change; after that, filling a second bubble in the row asks for confirmation and makes the row invalid.
- **Practice rules**: tapping an option bubbles it directly; bubbles can be erased or changed at any time.

Sheet rules, reducer actions, and exact edge cases: `TASK_064`. Clock maths and formatting: `TASK_064`. Autosave, recovery and submit orchestration: `TASK_066`.

## 8. Surfaces and tokens

The app shell stays: the left rail (auto-collapsed to 64 px while a paper is running, restored after) and the mobile two-row header. The Exam Hall renders inside `<main>`.

Scoped tokens live in `src/components/exam/exam.css` (imported once by `ExamHall.tsx`) on `.exam-hall`; the booklet theme is switched with `data-booklet="paper" | "night"`.

| Token | Paper (default) | Night | Use |
|---|---|---|---|
| `--eh-desk` | `#041228` | `#041228` | Area around the paper |
| `--eh-paper` | `#f7f2e6` | `#0c1f3f` | Booklet surface |
| `--eh-paper-edge` | `#e3d9c2` | `rgba(224,208,171,0.14)` | Booklet border, rules |
| `--eh-sheet` | `#f1ead8` | `#0a1a36` | Answer-sheet surface |
| `--eh-ink` | `#1a2130` | `#efe7d3` | Primary text on paper |
| `--eh-ink-soft` | `#475063` | `#b5c1d1` | Secondary text |
| `--eh-ink-faint` | `#6b7282` | `#8fa2bd` | Metadata, struck text |
| `--eh-print` | `rgba(7,46,99,0.62)` | `rgba(224,208,171,0.55)` | Answer-sheet print, bubble outlines |
| `--eh-print-faint` | `rgba(7,46,99,0.16)` | `rgba(224,208,171,0.14)` | Sheet rules, row bands |
| `--eh-bubble-ink` | `#111a2b` | `#e0d0ab` | Filled bubble |
| `--eh-bubble-letter` | `#f1ead8` | `#0a1a36` | Letter knocked out of a filled bubble |
| `--eh-pencil` | `#8a6a22` | `#e0d0ab` | Circle ring (rough work) |
| `--eh-pencil-text` | `#6f5418` | `#e0d0ab` | "Circled" labels |
| `--eh-flag` | `#b45309` | `#f59e0b` | Revisit flag |
| `--eh-warn` | `#b45309` | `#f59e0b` | Final-10-minute text on paper |
| `--eh-danger` | `#b91c1c` | `#f87171` | Invalid rows, wrong answers in review |
| `--eh-correct` | `#047857` | `#34d399` | Correct answers in review |

Chrome on the desk (exam bar, dialogs, scorecard) uses the app's existing semantic tokens (`bg-surface`, `bg-surface-elevated`, `border-border`, `text-primary`, `text-secondary`, `text-muted`, Chamber Gold `#e0d0ab` for the one primary action).

Typography: booklet and answer text `font-serif` (17 px / 1.65 desktop, 16 px mobile, max width 68ch); numbers, clock and marks `font-mono tabular-nums`; chrome `font-sans`.

Motion: bubble fill scales in over 120 ms; announcements slide down over 180 ms; nothing else animates. All of it is disabled under `prefers-reduced-motion`.

## 9. Admit slip and instructions (phase `admit`)

Layout: one centred paper card (`max-w-3xl`) on the desk. Sections top to bottom:

1. Eyebrow "Tark Exam Hall · Admit slip". Title = paper title. Subtitle "{n} questions · {duration} · Series {S}" where duration is "2 hours" / "1 hour" / "30 minutes".
2. Particulars grid (2 columns desktop, 1 mobile): "Candidate" {candidateName or "Candidate"} · "Roll No." {roll} · "Booklet series" {S} · "Hall clock" "09:30 – 11:30" (per paper) · "Marking" "+2 right · −0.66 wrong · 0 blank".
   Roll number: `TK` + 7 digits = FNV-1a 32-bit hash of userId, mod 10^7, zero-padded. It is a Tark number and looks like one.
3. "Rules for this sitting" segmented control: "Exam-day rules" | "Practice rules", with the one-line summaries:
   - Exam-day: "Circle in the booklet, commit on the answer sheet. Ink is permanent after 5 seconds."
   - Practice: "Tap an option to bubble it. You can erase and change answers."
4. "Instructions" ordered list (exact):
   1. "This booklet has {n} questions, each with four options. Choose the single best answer."
   2. "Only the answer sheet is scored. An answer counts when its bubble is filled."
   3. "A wrong answer costs 0.66 marks. A blank costs nothing. Two bubbles in one row count as a wrong answer."
   4. "The clock starts when you break the seal and keeps running if you close the tab. At {end} on the hall clock the sheet is collected automatically."
   5. "Scores, answers and explanations appear only after you hand in."
   Exam-day rules append: "Tap an option to circle it. Circles are rough work and are not scored." and "Fill a bubble to commit. You have 5 seconds to lift the pen; after that, a second bubble makes the row invalid."
5. Series encoding (exam-day rules only): label "Encode your booklet series"; four bubbles A–D styled like the answer sheet; helper "Your booklet is Series {S}. Fill the matching bubble. In the real exam, a wrong series code can void your answer sheet." A wrong bubble shows "That's not your series. Your booklet is Series {S}." and blocks the start button.
6. Options row: checkbox "Hall bell at time checks (sound)"; segmented "Booklet: Paper | Night"; checkbox "Full screen while I write".
7. Declaration checkbox (required): "I have read the instructions."
8. Buttons: primary "Break the seal and start" (disabled until declaration + correct series); secondary text button "Back to Arena".
9. Composition line from the catalog blueprint: "This paper: Economy 34 · Environment 24 · Geography 21 · History & Culture 15 · Polity 5 · General 1" (values per paper), then the provenance footnote from §4.

Break the seal → phase `starting` ("Distributing your booklet…") → `sitting`. Focus moves to the Question 1 heading.

## 10. Exam bar, hall clock and announcements (phase `sitting`)

Exam bar: sticky, `top-[104px] md:top-0` (matches the app's mobile header height), `z-30`, height 56 px desktop / 52 px mobile, desk-coloured (`bg-surface/95 backdrop-blur-sm border-b border-border`). Contents:
- Left: "GS Paper I" (semibold) + " · Full paper" (muted, hidden < sm) + chip "Series C".
- Centre: two stacked readouts, label above value: "Hall clock" / "10:14" and "Time left" / "1:15:52". Values `font-mono tabular-nums text-lg`. Colour `text-primary`; at ≤ 600 s left the time-left value turns `text-amber-400`; at ≤ 300 s `text-rose-400`. No animation.
- Right: tallies "46 bubbled" · "3 circled only" (exam-day only; amber when > 0) · "5 to revisit"; save status ("Saved" / "Saving…" / "Offline · kept on this device"); button "Answer sheet" (mobile only); button "Hand in" (outlined Chamber Gold); overflow menu "More" containing "Keyboard shortcuts (?)", "Hall bell: On/Off", "Booklet: Paper/Night", "Full screen".
- Mobile (< md): show only time left, tallies collapsed to "46/100", "Answer sheet", "Hand in", "More".

Time-left format: `H:MM:SS` when ≥ 3600 s, else `MM:SS`. Hall clock: `HH:MM` = 09:30 + floor(elapsed / 60) minutes.

Announcements (banner under the bar, `role="status"`, auto-hide after 8 s, dismissible "Dismiss"). Only thresholds below the paper duration fire, each once:
- 3600 s: "One hour left."
- 1800 s: "30 minutes left."
- 600 s: "10 minutes left. Only bubbled answers are scored." + when circled-only > 0: " {k} circled answers are not on your sheet yet."
- 300 s: "5 minutes left."
The 300 s announcement uses `aria-live="assertive"`. With "Hall bell" on, each announcement plays a two-tone chime (WebAudio: 880 Hz then 660 Hz, 0.25 s each, gain 0.12). The AudioContext is created on the "Break the seal" click.

## 11. Booklet (phase `sitting` and review)

Container: paper card `bg-[var(--eh-paper)] text-[var(--eh-ink)] border border-[var(--eh-paper-edge)] rounded-md shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.35)]`, padding `px-5 py-6 sm:px-10 sm:py-10`. Page marks: after every 5th question a centred rule with the page number "— {page} —" in `--eh-ink-faint` mono 11 px (page = ceil(n/5) + 1; page 1 is the cover).

Question block (`<article id="q-{n}" aria-labelledby="q-{n}-label" class="scroll-mt-[88px] md:scroll-mt-[72px]">`):
- Gutter number "{n}." `font-serif font-semibold` in a 2.5rem left gutter; heading text for screen readers "Question {n}" (visually hidden).
- Stem rendered with react-markdown + remark-gfm + rehype-sanitize: paragraphs `my-3`; ordered lists (numbered statements) `list-decimal pl-6 space-y-1.5 my-3`; tables `w-full my-4 text-[15px] border-collapse` with cells `border border-[var(--eh-paper-edge)] px-3 py-1.5 text-left`; bold stays bold.
- Options: 2×2 grid when every option is ≤ 28 characters, otherwise one column. Each option is a row: button `(a)` label + text (the whole row is the choose target, min height 44 px) and, at the right edge, a strike toggle (icon `Strikethrough` 16 px, 32×32 desktop / 44×44 touch, `aria-label="Strike out option a"` / "Restore option a", always visible at 45% opacity, 100% on hover/focus).
  - Circled (exam-day): the `(a)` label gets a 1.5 px `--eh-pencil` ring (rounded-full) and the text becomes `font-semibold`.
  - Bubbled (practice rules; also shown in exam-day when the sheet has this option): the label sits in a filled `--eh-bubble-ink` circle with `--eh-bubble-letter` text.
  - Struck: text `line-through` in `--eh-ink-faint`, opacity 55%.
- Tools row (below options, `text-xs`): confidence segmented control "Sure" | "50:50" | "Guess" (`role="radiogroup"`, clicking the active one clears it); "Revisit" toggle with a flag icon; right-aligned state text:
  - exam-day, circled, row blank: "Circled ({x}) · not on your sheet" in `--eh-pencil-text` + small button "Bubble it" (shortcut Enter).
  - bubbled: "On your sheet: ({x})"; within the 5 s grace also "Undo" (shortcut U).
  - invalid: "Invalid · two bubbles" in `--eh-danger`.
- Mobile only (< lg): an inline answer row under the tools: "Answer sheet" label + four bubbles (a)–(d) that act exactly like the sheet row for this question.

Review mode (scorecard): same block, not interactive. The correct option gets a 3 px left bar in `--eh-correct` and the tag "Correct answer"; the candidate's bubble gets "Your answer" (`--eh-correct` if right, `--eh-danger` if wrong); circles and strikes stay visible in their sitting styles at 60% opacity. A header line shows the verdict "+2.00" / "−0.66" / "0.00 · blank" / "−0.66 · invalid", then "UPSC {year} · {subject label} · {m}m {s}s on this question". Below: "Explanation · written by Tark, not UPSC" and the explanation markdown.

## 12. Answer sheet (OMR)

Desktop (≥ lg): right column `lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] overflow-y-auto`, width `minmax(300px, 360px)`, surface `--eh-sheet`, border `--eh-paper-edge`, radius 6 px.
Header: "ANSWER SHEET" (letter-spaced 0.14em, 11 px, `--eh-print`), then particulars on one line: "Roll {roll} · Series {S} · GS-I".
Grid: 2 columns (Q1–50, Q51–100 for FULL; Q1–25, Q26–50 for HALF; one column for SECTION). Each row 26 px: question number (mono 11 px, right-aligned, 26 px wide, a button that jumps the booklet to that question) + four bubbles (20 px circles, 1.25 px `--eh-print` outline, lowercase letter 10 px mono in `--eh-print`, 6 px gaps). A faint rule (`--eh-print-faint`) after every 5th row.
Row states:
- Filled bubble: background `--eh-bubble-ink`, letter `--eh-bubble-letter`, fill scales in over 120 ms.
- Invalid: both bubbles filled; the number is struck through in `--eh-danger` and the row gets `aria-invalid="true"`.
- Circled in booklet, row blank (exam-day): a 6 px `--eh-pencil` ring dot after the number.
- Revisit: a 10 px flag icon in `--eh-flag` after the number.
- Active question: row background `--eh-print-faint` and a 2 px left bar in `--eh-print`. The sheet auto-scrolls to keep the active row visible.
Legend (bottom): "Filled = answered" · "Ring = circled in booklet" · "Flag = revisit" · "Struck number = invalid".
Keyboard: the sheet is a single tab stop (roving tabindex). Up/Down move rows, Left/Right move bubbles, Space/Enter fills, Home/End jump to Q1/last.
Overwrite confirm (exam-day, after grace): an inline popover anchored to the row, `role="alertdialog"`: "Row {n} already has ({x}). A second bubble makes this answer invalid and it will be marked wrong (−0.66)." Buttons "Keep ({x})" (default focus) and "Add second bubble".
Tapping an already-filled bubble in exam-day rules does nothing and shows the hint "Ink is permanent. Practice rules allow erasing." under the sheet for 3 s.
Mobile (< lg): the sheet is a bottom sheet. Collapsed peek bar (56 px): "Answer sheet · 46/100 bubbled" + chevron. Expanded: 75vh, the same grid in one column of 5-row groups, close button "Close".

## 13. Hand-in, pens down, resume

Hand-in dialog (Modal): title "Hand in your answer sheet?"; stats grid "Bubbled {b}" · "Blank {n}" · "Circled, not bubbled {k}" (amber, with question chips that close the dialog and jump) · "To revisit {r}" (chips) · "Invalid rows {i}" (rose, only if > 0); line "{time left} left on the clock. You can keep working until {end}."; buttons "Keep working" (default focus) and "Hand in now".
Pens down (at 0 s): full-area overlay `role="alertdialog"`: "Time. Pens down." and "{end} on the hall clock. Your answer sheet is being collected." Inputs lock immediately; submit starts after 1.5 s.
Submitting: "Collecting your answer sheet…". Submit error: "We couldn't reach the server. Your answers are safe on this device and were last saved to your account at {hall time}." + button "Try again".
Resume (phase `resume`): "Your paper is still running" · "{paper title} · Series {S}. {time left} left on the clock. It kept running while you were away." · buttons "Return to the paper" (primary) and "Hand in now" (secondary, asks "Hand in with the answers saved so far?").
Collected while away (scorecard banner): "Time ran out while you were away. We collected your sheet as it was last saved."

## 14. Keyboard map (sitting)

Ignored when focus is in an input, textarea or contenteditable, or when Ctrl/Alt/Meta is held.

| Key | Action |
|---|---|
| `1`–`4` or `A`–`D` | Choose option on the active question (circle in exam-day, bubble in practice). Same key again clears the circle. |
| `Enter` | Exam-day: bubble the circled option of the active question. |
| `Shift` + `1`–`4` / `A`–`D` | Strike or restore that option |
| `S` / `F` / `G` | Confidence: Sure / 50:50 / Guess (toggle) |
| `R` | Toggle revisit flag |
| `N` or `J` | Next question |
| `P` or `K` | Previous question |
| `U` | Undo the last bubble (exam-day: within 5 s; practice: erase the active row) |
| `O` | Focus the answer sheet (desktop) / open it (mobile) |
| `?` | Keyboard shortcuts dialog |
| `Esc` | Close the open dialog, popover or sheet. Never ends the paper. |

## 15. Accessibility

Landmarks: booklet `<section aria-label="Question booklet">`, sheet `<aside aria-label="Answer sheet">`. Option buttons expose state via `aria-pressed` and an `aria-describedby` status ("circled", "struck out", "on your answer sheet"). Sheet rows are `role="radiogroup"` with `aria-label="Answer sheet, question {n}"`; bubbles are `role="radio"`. The clock is not announced every second; announcements go through §10. All states are distinguishable without colour (ring vs fill vs strike vs flag vs text). Touch targets ≥ 44 px on touch widths. Focus rings: `focus-visible:ring-2 ring-[#e0d0ab] ring-offset-2 ring-offset-[var(--eh-paper)]`.

## 16. Scorecard (phase `scorecard`)

Order and content (each metric carries an interpretation line, per the North Star):

1. **Header**: "Your answer sheet has been evaluated" · paper title · date · submit-mode banner (timeout: "Collected at {end} when time ran out."; recovered: §13 copy).
2. **Score hero**: net score `font-mono text-5xl` + " / {max}"; line "{c} right · {w} wrong · {i} invalid · {b} blank" (omit invalid when 0); chips "+{gross} earned" and "−{penalty} lost to negative marking". Interpretation (first matching rule):
   - penalty ≥ 15% of gross: "Negative marking took {penalty} marks, {pct}% of what you earned. The risk ledger below shows where."
   - blank ≥ 30% of questions: "You left {b} questions blank. The risk ledger shows which kinds were worth a try."
   - otherwise: "{acc}% of your attempted answers were right."
3. **Cut-off band** (FULL only): 0–200 axis; dots for official General cut-offs 2017–2025 from `src/components/exam/data/prelimsCutoffs.ts`, labelled by year; a Chamber Gold pin for the candidate's net score. Caption: "Official UPSC Prelims cut-offs, General category, GS Paper I. Reference only: each cut-off reflects that year's paper, not this one." Disclosure "All categories" opens the full verified table with source links. HALF/SECTION show instead: "Cut-off comparison is shown for full papers only."
4. **Risk ledger**: rows "Sure", "50:50", "Guess", "Not tagged"; columns "Attempted", "Right", "Wrong", "Accuracy", "Net marks", "Per answer". Verdict per row when attempted ≥ 5: per-answer ≥ +0.30 → "Worth attempting"; −0.10 to +0.29 → "Roughly break-even"; < −0.10 → "Costing you marks"; attempted < 5 → "Too few to judge". Second table by options struck (0/1/2/3), same columns. Explainer (exact): "A wrong answer costs a third of a right one. With four options a blind guess roughly breaks even; every option you can rule out tips the odds your way."
5. **Sheet discipline** (exam-day only): lines, each shown only when non-zero: "{k} answers circled in the booklet never reached your sheet. {kc} of them were right; bubbling them would have added {net} marks." where net = 2.00·kc − 0.66·(k − kc); when net ≤ 0 the second sentence reads "{kc} of them were right; bubbling them would have cost {abs(net)} marks, so leaving them blank was right." · "{t} answers changed while bubbling: {rw} right → wrong, {wr} wrong → right." · "{i} rows double-marked (−{marks})." · "You left the exam tab {n} times ({m}m {s}s)." All zero: "Clean sheet: every circled answer made it onto your answer sheet."
6. **Pace**: SVG step line of cumulative bubbled answers per 5-minute mark; dashed even-pace line (questions ÷ duration); x-axis labelled with hall-clock times every 30 min (every 10 min for SECTION). Interpretation: "You bubbled half the paper by {hall time}; even pace gets there at {hall time}." + "You handed in with {mm} minutes left." (timeout: "You used the full time."). `role="img"` with an `aria-label` summary and a visually hidden data table.
7. **Subjects**: table "Subject", "Questions", "Attempted", "Right", "Wrong", "Net", "Accuracy" (bar). Interpretation: strongest and weakest by net marks per question among subjects with ≥ 5 questions: "Strongest: {s} ({x} per question). Weakest: {s} ({y} per question)."
8. **Review booklet**: filter chips "All" · "Wrong" · "Blank" · "Invalid" · "Circled, not bubbled" · "Revisit" and a subject select; items rendered in review mode (§11).
9. **Next actions**: primary "Sit another full paper"; secondary "Practise {weakest subject}: 25 questions, 30 minutes" (only if that subject is offered for sectionals); text button "Back to Arena".

No percentile or rank in v1: the sample is too small to mean anything.

## 17. Arena lobby and app integration

Lobby (non-drill mode) replaces the current "DESIGN V3 TEST ARENA CARD" with, top to bottom:
1. Resume banner when `/api/exam/active` returns an active attempt: "Your paper is still running · {time left} left" + button "Return to the paper". When it returns `finalized`: "Your last paper was collected when time ran out." + button "See your result".
2. **Exam Hall card** (primary). Eyebrow "UPSC CSE Prelims · GS Paper I". Title "Sit the paper the way UPSC sets it". Body "One clock for the whole paper. Read in the booklet, bubble on the answer sheet, lose 0.66 for every wrong answer. Results only after you hand in." Paper choice (radio cards): "Full paper" "100 questions · 2 hours" (default) · "Half paper" "50 questions · 1 hour" · "Sectional" "25 questions · 30 minutes" + subject select ("Mixed" + offered subjects from the catalog). Primary button "Go to the exam hall". Trust line: "Real UPSC GS-I questions, 2011–2023 · scored on our server · your sheet saves as you write". Guests see the button "Sign in to sit a paper" and the line "Your answer sheet is saved to your account, so a closed tab never costs you the paper."
3. **Your papers**: last 5 submitted attempts ("{date} · {paper} · {net} / {max}" + "View"). Empty: "No papers yet. Your first full paper sets your baseline."
4. **Quick practice** (secondary): the existing Ranked Crucible and Training Ground entry points with the UPSC/SSC track toggle, restyled as two compact cards. Ranked copy must state the pacing the drill actually uses.

Removed: the decorative 100-cell palette (`lobbyPalette`, it rendered fake "answered" states).

App: rail `isExpanded` and main padding use `isRailExpanded && !isArenaQuizActive`; `onTestStatusChange(active, kind)` records `activeTestKind`; the navigation guard shows exam copy when the active test is an exam: title "Leave the exam hall?", subtitle "Your paper keeps running", body "The clock doesn't stop when you leave. Your answers are saved; come back to Arena to continue before time runs out.", buttons "Stay in the hall" / "Leave". Leaving an exam does not clear drill localStorage keys.

## 18. Out of scope for this batch (logged for later)

CSAT (Paper II) — no trustworthy GS-2 data (placeholder keys). Polity PYQ import. Exam-day rehearsal at the real 09:30 IST slot. Cohort percentile. Report-a-question channel. Leaderboard/CP credit for mocks. Bilingual (Hindi) booklet.

## 19. Contract map

| Contract | Implements |
|---|---|
| TASK_059 | §4 pool builder, server types |
| TASK_060 | §3 marking, §16 metrics — grading engine |
| TASK_061 | §3.1 blueprints, paper assembly, sheet sanitiser |
| TASK_062 | §6.1 migration + data access |
| TASK_063 | §6.2 endpoints + route wiring |
| TASK_064 | §7 client types, sheet reducer, clock/format |
| TASK_065 | §11 item layout helpers, API client, verified cut-off data |
| TASK_066 | §7 session hook |
| TASK_067 | §8 tokens, §11 booklet |
| TASK_068 | §12 answer sheet |
| TASK_069 | §10 exam bar + announcements |
| TASK_070 | §9 admit slip, §13 dialogs |
| TASK_071 | ExamHall composition, §14 keyboard |
| TASK_072 | §16 scorecard summary sections |
| TASK_073 | §16.8 review booklet |
| TASK_074 | §17 lobby + app integration |
| TASK_075 | End-to-end verification (after the migration is applied) |
