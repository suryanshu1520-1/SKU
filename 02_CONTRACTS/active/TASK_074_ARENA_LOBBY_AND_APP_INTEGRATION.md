---
task_id: "TASK_074_ARENA_LOBBY_AND_APP_INTEGRATION"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 5000
  output_diff_max: 5000
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_054_ARENA_DECOMPOSITION_QUESTION_ZONE", "TASK_055_ARENA_QUESTION_ZONE_DOMINANCE", "TASK_058_A11Y_LANDMARKS_AND_KEYBOARD_SWEEP", "TASK_071_EXAM_HALL_COMPOSITION", "TASK_072_EXAM_SCORECARD_SUMMARY", "TASK_073_EXAM_REVIEW_BOOKLET"]
queue_gate: "HARD — do not begin until TASK_054, TASK_055 AND TASK_058 are physically present in 02_CONTRACTS/completed/ (Orchestrator-verified). All three are currently AWAITING_VERIFICATION and uncommitted, and this contract edits the files they changed (ArenaLobby.tsx, Arena.tsx, App.tsx). SOFT on TASK_071-073 (they only need to exist)."
blueprint: "strategy/design/exam-hall-blueprint.md §17 · visual target: mockup screen 'Lobby'"
---

# 0. Batch rules
Same as TASK_059 §0. Guardrail (UX execution handoff §guardrails 3): `useArenaSession.ts` and the drill lock-and-reveal flow are not edited. The drill preflight card (the `arenaConfig && arenaConfig.mode !== 'full_mock'` branch of `ArenaLobby`) is not edited.

# 1. High-Density Distilled Objective
Make the Exam Hall reachable and make it feel native to the app shell.
1. **Lobby.** The Arena lobby's default (non-drill) view becomes: a resume/finalised banner, the Exam Hall card (Full / Half / Sectional with subject), "Your papers", and "Quick practice" (the existing drills, unchanged in behaviour). The decorative fake 100-cell palette is removed. The drill copy that claims "20s Blitz" when the drill runs at 60 s is fixed.
2. **Arena.** Arena mounts a lazily loaded `ExamHall` for a launch.
3. **App.** The rail auto-collapses while any test is active. The navigation guard uses exam-specific copy that doesn't claim the paper will be discarded (it keeps running). Leaving an exam doesn't clear drill storage. The candidate name and a login callback reach the Arena.

# 2. Transcluded Context References
Re-anchor every line with `view_file` first. These anchors are from the 2026-09-24 working tree, and verification of TASK_054/055/058 may shift them.
- `src/components/arena/ArenaLobby.tsx:8-27` (props), `:49-63` (`PALETTE_MARKED` / `lobbyPalette`, to delete), `:217-380` (non-drill branch: the pillar banner plus the "DESIGN V3 TEST ARENA CARD"), `:399-407` (the preflight modal's "Pacing" value, hard-coded "20s Per Question").
- `src/components/Arena.tsx:21-42` (`ArenaProps`), `:55-65` (`useArenaSession` call), `:69-93` (lobby render).
- `src/App.tsx:46` (`isArenaQuizActive`), `:188-202` (`handleConfirmAbandonNavigation`), `:459-474` (rail mount, `isExpanded={isRailExpanded}`), `:690-700` (non-landing `<main>` padding using `isRailExpanded`), `:807-826` (the `<Arena …>` mount, `onTestStatusChange={setIsArenaQuizActive}`), `:936-961` (the nav-abandon `Modal` copy).
- `src/components/exam/ExamHall.tsx` (default export, `ExamHallProps`), `lib/examApi.ts`, `lib/clock.ts` (`formatMarks`, `formatTimeLeft`, `secondsLeft`, `serverOffsetMs`), `types.ts` (`ExamLaunch`, `PAPER_SHORT_TITLES`, `SUBJECT_LABELS`, `AttemptSummary`, `ActiveResponse`, `CatalogResponse`, `SectionSubject`, `PaperCode`).
- Blueprint §17 (every string). Mockup `#screen-lobby` (`.resume`, `.hall-card`, `.papers`, `.paper-opt`, `.trust`, `.omr-motif`, `.yours`, `.quick`, `.qcard`, `.track`).

# 2.5 Scope fence
Modify: `src/components/arena/ArenaLobby.tsx`, `src/components/Arena.tsx`, `src/App.tsx`.
Create: nothing.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` all anchors in §2.
2. `multi_replace_file_content` `ArenaLobby.tsx` per §3.1.
3. `multi_replace_file_content` `Arena.tsx` per §3.2.
4. `multi_replace_file_content` `App.tsx` per §3.3.
5. `run_command` `npm run lint`, `npm run test`, `npm run build`.
6. `browser_subagent` against an isolated dev server (`$env:PORT='3107'; npm run dev`), **signed out**. Screenshot the Arena lobby at 1280×800 and at 390×844. Confirm the Exam Hall card and the "Sign in to sit a paper" button render, and that Quick practice still opens the drill preflight ("Before You Begin") and the Training Ground. Then stop the server you started.

## 3.1 `ArenaLobby.tsx`
- New props: `isGuest: boolean; onOpenExam: (launch: ExamLaunch) => void; onRequestLogin?: () => void;`.
- Delete `PALETTE_MARKED`, `lobbyPalette` and the 100-cell palette JSX.
- Data (non-drill branch only): a `useEffect` on mount calls `examApi.catalog()`, and when `!isGuest` also `examApi.active()` and `examApi.attempts()`, in parallel with `Promise.allSettled`. A rejected call hides its section silently; it never shows an error.
- Replace the non-drill branch's "DESIGN V3 TEST ARENA CARD" with, in order (keep the existing `targetPillar` banner above them untouched). Copy is exact:
  1. **Banner** (from `active`):
     - `active.active` → "Your paper is still running · {formatTimeLeft(seconds)} left" + button "Return to the paper" → `onOpenExam({ kind: 'resume' })`. Compute `seconds` once from `deadlineAt`/`serverNow`; no ticking needed.
     - `active.finalized` → "Your last paper was collected when time ran out." + button "See your result" → `onOpenExam({ kind: 'result', attemptId: finalized.result.attemptId })`.
     Style per the mockup's `.resume`.
  2. **Exam Hall card** (`section aria-labelledby`), style per `.hall-card`:
     - eyebrow with a 4-bubble motif (decorative, `aria-hidden`) and "UPSC CSE Prelims · GS Paper I";
     - `h2` "Sit the paper the way UPSC sets it";
     - body "One clock for the whole paper. Read in the booklet, bubble on the answer sheet, lose 0.66 for every wrong answer. Results only after you hand in.";
     - a `role="radiogroup"` of three radio cards: "Full paper" / "100 questions · 2 hours" (default), "Half paper" / "50 questions · 1 hour", "Sectional" / "25 questions · 30 minutes". The Sectional card holds a `<select id="exam-section-subject">`: "Mixed" plus `catalog.sectionSubjects` other than Mixed, labelled via `SUBJECT_LABELS`, with a `sr-only` label "Sectional subject". Selecting a subject selects the card.
     - Primary gold button: "Go to the exam hall" → `onOpenExam({ kind: 'new', paperCode, subject: paperCode === 'GS1_SECTION' ? subject : undefined })`. When `isGuest`, the button reads "Sign in to sit a paper" → `onRequestLogin?.()`, with the line "Your answer sheet is saved to your account, so a closed tab never costs you the paper."
     - Trust line (muted, `text-[12.5px]`): "Real UPSC GS-I questions, 2011–2023 · scored on our server · your sheet saves as you write".
  3. **Your papers** (only when `!isGuest` and attempts loaded): `h3` "Your papers" and a list of up to 5 rows. Each row is "{date en-IN, day + short month} · {PAPER_SHORT_TITLES[code]}{subject && subject !== 'Mixed' ? ' · ' + SUBJECT_LABELS[subject] : ''}", the score "{formatMarks(net)} / {max / 100}" (mono), and a "View" button → `onOpenExam({ kind: 'result', attemptId })`. With zero attempts: "No papers yet. Your first full paper sets your baseline."
  4. **Quick practice**: `h3` "Quick practice", the existing UPSC/SSC track toggle restyled compact (per `.track`), and two compact cards (per `.qcard`):
     - "Timed drill · ranked" / "25 mixed questions · {pace} · answer shown after each question" → `onBeginAssessment`, where `{pace}` is `pacingMode === 'blitz' ? '20 s each' : pacingMode === 'untimed' ? 'untimed' : '60 s each'`;
     - "Training ground" / "Pick subjects · 25, 35 or 50 questions · untimed" → `onTrainingGround`.
- Preflight modal: replace the hard-coded pacing value with `pacingMode === 'blitz' ? '20s per question' : pacingMode === 'untimed' ? 'Untimed' : '60s per question'`.

## 3.2 `Arena.tsx`
- `ArenaProps`: change `onTestStatusChange?: (isActive: boolean) => void` to `onTestStatusChange?: (isActive: boolean, kind?: 'drill' | 'exam') => void`. Add `candidateName?: string | null; onRequestLogin?: () => void;`. Pass `onTestStatusChange` to `useArenaSession` unchanged (a function with an optional second parameter is assignable).
- `const ExamHall = React.lazy(() => import('./exam/ExamHall'));` at module scope. State: `const [examLaunch, setExamLaunch] = React.useState<ExamLaunch | null>(null); const [examKey, setExamKey] = React.useState(0);`.
- Before render step 1 (the lobby), when `examLaunch` is set, return:
```tsx
<React.Suspense fallback={<div className="min-h-[50vh] grid place-items-center text-sm text-muted">Opening the exam hall…</div>}>
  <ExamHall
    key={examKey}
    launch={examLaunch}
    userId={userId}
    candidateName={candidateName ?? null}
    onExit={() => setExamLaunch(null)}
    onSittingChange={(active) => onTestStatusChange?.(active, 'exam')}
    onStartPaper={(paperCode, subject) => { setExamLaunch({ kind: 'new', paperCode, subject }); setExamKey((k) => k + 1); }}
  />
</React.Suspense>
```
- Pass to `ArenaLobby`: `isGuest={userId === 'guest'}`, `onOpenExam={(launch) => { setExamLaunch(launch); setExamKey((k) => k + 1); }}`, and `onRequestLogin={onRequestLogin}`.

## 3.3 `App.tsx`
- Add `const [activeTestKind, setActiveTestKind] = useState<'drill' | 'exam' | null>(null);` next to `isArenaQuizActive`.
- Change the Arena mount:
  - `onTestStatusChange={(active, kind) => { setIsArenaQuizActive(active); setActiveTestKind(active ? (kind ?? 'drill') : null); }}`
  - add `candidateName={userEmail ? userEmail.split('@')[0] : null}` and `onRequestLogin={() => setGameState('login')}`
  - add `setActiveTestKind(null)` wherever `setIsArenaQuizActive(false)` is called: `onReturnToDashboard` and `handleConfirmAbandonNavigation`.
- Rail and main: `const railExpanded = isRailExpanded && !isArenaQuizActive;`. Use it for `VerticalNavRail isExpanded` and for the **non-landing** `<main>` padding ternary. Do not persist it; the user's stored preference stays untouched.
- `handleConfirmAbandonNavigation`: wrap the three `localStorage.removeItem('tark_arena_…')` calls in `if (activeTestKind !== 'exam') { … }`.
- Nav-abandon `Modal` copy when `activeTestKind === 'exam'` (the drill copy stays as it is today):
  - title "Leave the exam hall?"
  - subtitle "Your paper keeps running"
  - body "The clock doesn't stop when you leave. Your answers are saved; come back to Arena to continue before time runs out."
  - buttons "Stay in the hall" (cancel) and "Leave" (confirm)

# 4. Deterministic Acceptance Criteria
1. `npm run lint`, `npm run test` and `npm run build` exit 0.
2. Run `git diff --stat -- src/components/arena src/components/Arena.tsx src/App.tsx` before and after your edits, and paste both outputs. The only new changes are in `ArenaLobby.tsx`, `Arena.tsx` and `App.tsx`. `git diff -- src/components/arena/useArenaSession.ts` shows nothing beyond what was already there before you started.
3. `grep_search` `ArenaLobby.tsx` for `lobbyPalette|PALETTE_MARKED|20s Per Question|20s Blitz` → 0 matches.
4. `grep_search` for each exact string: in `ArenaLobby.tsx` — `Sit the paper the way UPSC sets it`, `Go to the exam hall`, `Sign in to sit a paper`, `Your papers`, `No papers yet. Your first full paper sets your baseline.`, `Quick practice`, `Timed drill · ranked`, `Training ground`, `Return to the paper`, `See your result`, `Real UPSC GS-I questions, 2011–2023`; in `App.tsx` — `Leave the exam hall?`, `Your paper keeps running`, `Stay in the hall` → each ≥ 1.
5. `grep_search` `src/` for `import('./exam/ExamHall')` → 1 match in `Arena.tsx`. A static `import ExamHall` → 0 matches.
6. The `browser_subagent` screenshots (desktop and mobile, signed out) are attached. Quick practice's "Timed drill · ranked" still opens the "Before You Begin" modal.
7. Hard boundary respected; no server stopped that you did not start.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: {}
gate_check: "paste `Get-ChildItem 02_CONTRACTS/completed -Name | Select-String 'TASK_05[458]'` output here before starting"
criterion_2_diffstat: ""
criterion_3_grep_output: ""
criterion_4_string_hits: {}
screenshots: []
files_modified: []
```
