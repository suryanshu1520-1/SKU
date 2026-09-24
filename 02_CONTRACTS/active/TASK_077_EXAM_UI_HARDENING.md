---
task_id: "TASK_077_EXAM_UI_HARDENING"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 6000
  output_diff_max: 5000
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_076_EXAM_SESSION_HARDENING"]
queue_gate: "SOFT — run after TASK_076 (both edit ExamHall.tsx). Re-anchor every line with view_file first; TASK_076 will have shifted ExamHall.tsx."
blueprint: "strategy/design/exam-hall-blueprint.md §11, §12, §14, §15"
---

# 0. Batch rules
Same as TASK_059 §0. Several of these defects come from the Orchestrator's own TASK_067/068/071 specs, which asked for state colours to be added on top of a base colour and for both sheet instances to be mounted. The rules below supersede those specs.

# 1. High-Density Distilled Objective
Fix the UI defects the Orchestrator's review found and confirmed:
- in full screen the booklet can't scroll (blocker);
- under exam-day rules, Enter is swallowed on every focused button;
- the double-bubble popover can't be driven by keyboard, is clipped in the right column, and on mobile is cancelled by a hidden duplicate answer sheet;
- `O` doesn't reach the sheet;
- bubbled and circled option labels lose their colour to a conflicting base class (≈2.2:1 contrast);
- a smooth scroll can leave the wrong question active.

# 2. Transcluded Context References
- `src/components/exam/ExamHall.tsx`:
  - `:86-101` (full-screen request inside try/catch; its promise is unhandled)
  - `:127-140, 183-195` (IntersectionObserver; `goTo`)
  - `:294-299` (keyboard `enabled`)
  - `:354-366` (`handleKeyboardFocusSheet` focuses an `<aside>` that has no tabIndex)
  - `:658-693` (the desktop panel sits in a `hidden lg:block` aside **and** `OmrBottomSheet` is always mounted, so two `OmrSheet` instances exist at once)
- `src/components/exam/useExamKeyboard.ts:80-89`: Enter calls `preventDefault()` and `onTransfer()` for any focused element except form fields.
- `src/components/exam/OmrSheet.tsx`:
  - `:63-72` (document pointerdown → `onCancelDouble` in **every** instance)
  - `:115-131` (the grid `onKeyDown` takes Space/Enter from any child, including popover buttons)
  - `:176-181` (row number: `text-[var(--eh-print)]` plus a conditional `text-[var(--eh-danger)]`)
  - `:240-250` (popover `absolute z-20 left-8 top-7 w-64` inside the scrolling panel)
  - `:371` (bottom sheet)
- `src/components/exam/BookletItem.tsx:147-154` (review label) and `:200-212` (sitting label): a base `text-[var(--eh-ink-soft)]` is combined with the state's `text-[var(--eh-bubble-letter)]` / `text-[var(--eh-ink)]`. The built CSS emits ink-soft later, so it wins.
- `src/components/exam/ShortcutsDialog.tsx` (no element takes focus on open).
- `src/components/exam/ExamBar.tsx` (the More menu's open state is local).

# 2.5 Scope fence
Modify: `ExamHall.tsx`, `useExamKeyboard.ts`, `OmrSheet.tsx`, `BookletItem.tsx`, `ShortcutsDialog.tsx`, `ExamBar.tsx`, `exam.css` (all under `src/components/exam/`). Nothing else.

# 3. Required changes
**U1 — Full screen scrolls (BLOCKER).**
- Append to `exam.css`:
  - `.exam-hall:fullscreen { overflow-y: auto; background: var(--eh-desk); padding-inline: 16px; }`
  - `.exam-hall:fullscreen::backdrop { background: var(--eh-desk); }`
  - `.exam-hall:fullscreen .eh-exam-bar { top: 0 !important; }`
- `ExamBar`'s `<header>` gains the class `eh-exam-bar`.

**U2 — Full-screen promises handled.** Replace the try/catch-only calls with `rootRef.current?.requestFullscreen?.()?.catch(() => {})` and `document.exitFullscreen?.()?.catch(() => {})`.

**U3 — Enter only where it means "bubble this".**
- In `useExamKeyboard`, Enter calls `onTransfer` only when the event target is `document.body`, a booklet `ARTICLE`, or an element with `data-eh-choose="1"`. In every other case, return **without** `preventDefault`, so buttons, menu items and pills activate natively.
- `BookletItem` adds `data-eh-choose="1"` to each option choose button.
- `ExamBar` gains an optional prop `onMenuOpenChange?: (open: boolean) => void`, called whenever its More menu opens or closes. ExamHall tracks `menuOpen` and adds `!menuOpen` to the keyboard `enabled` condition.

**U4 — Popover keys belong to the popover.** The first statement of `OmrSheet`'s grid `onKeyDown` is: `if ((e.target as HTMLElement).closest('[role="alertdialog"]')) return;`.

**U5 — One answer sheet at a time; the mobile confirmation is visible.**
- Add `useIsDesktop()` to `ExamHall.tsx` (module scope): a `matchMedia('(min-width: 1024px)')` state with a change listener, SSR-safe, defaulting to `window.innerWidth >= 1024`.
- Render the desktop `aside` and its `OmrSheet variant="panel"` **only** when `isDesktop`. Render `OmrBottomSheet` **only** when `!isDesktop`.
- On mobile, when `session.sheetState.pendingDouble` becomes non-null, set the active question to its `qid` and open the bottom sheet so the popover is on screen.

**U6 — `O` reaches the sheet.**
- Desktop: `asideRef.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus()`.
- Mobile: open the bottom sheet. Use a ref on the aside, not a document query.

**U7 — Exactly one colour class per state.**
- `BookletItem` label (sitting and review): the base string carries no `text-` colour. Append exactly one of:
  - bubbled → `bg-[var(--eh-bubble-ink)] text-[var(--eh-bubble-letter)]`
  - circled → `shadow-[0_0_0_1.5px_var(--eh-pencil)] text-[var(--eh-ink)] font-semibold`
  - otherwise → `text-[var(--eh-ink-soft)]`
- Apply the same rule to any other element in `BookletItem`/`OmrSheet` that pairs a base colour with a state colour. The `OmrSheet` row number becomes `isInvalid ? 'line-through text-[var(--eh-danger)]' : 'text-[var(--eh-print)]'`.

**U8 — Popover never clipped.**
- In the `panel` variant, rows in the **second** column anchor the popover with `right-1` (not `left-8`). First-column and `sheet`-variant rows keep `left-8`.
- Width becomes `w-60`.

**U9 — Programmatic scrolls don't retarget.**
- `goTo()` sets `suppressObserverUntilRef.current = Date.now() + 900` before scrolling.
- The IntersectionObserver callback returns early while `Date.now() < suppressObserverUntilRef.current`.
- `goTo` sets the active question explicitly.

**U10 — Bottom sheet returns focus.** Closing `OmrBottomSheet` (button or Escape) returns focus to the peek-bar button (ref). Remove the `transition-transform` class that never animates.

**U11 — Performance.**
- Wrap `OmrSheet` in `React.memo`.
- Replace the per-row `items.findIndex(...)` with a `useMemo` `Map<qid, index>`.
- Keep every callback ExamHall passes to it stable (`useCallback`).
- Hoist `BookletItem`'s inline react-markdown `components` objects to module-level constants.

**U12 — Shortcuts dialog takes focus.** `ShortcutsDialog` renders a "Close" button with `autoFocus` at the end of its content → `onClose`.

# 4. Mandatory Tool Chain & Execution Path
1. `view_file` every anchor in §2 (after TASK_076's changes).
2. `multi_replace_file_content` each file per §3.
3. `run_command` `npm run lint`, `npm run build`, `npm run test:exam`.

# 5. Deterministic Acceptance Criteria
1. `npm run lint`, `npm run build` and `npm run test:exam` exit 0.
2. `grep_search` `exam.css` for `:fullscreen` → ≥ 3 matches; `ExamBar.tsx` for `eh-exam-bar` → 1.
3. `grep_search` `useExamKeyboard.ts` for `data-eh-choose|ehChoose` → ≥ 1; `BookletItem.tsx` for `data-eh-choose="1"` → 1.
4. `grep_search` `OmrSheet.tsx` for `closest('[role="alertdialog"]')` → 1; for `findIndex` → 0; for `memo(` → ≥ 1.
5. `grep_search` `ExamHall.tsx` for `useIsDesktop` → ≥ 2; for `suppressObserverUntilRef` → ≥ 3; for `querySelector('aside` → 0.
6. No className literal in `BookletItem.tsx` or `OmrSheet.tsx` contains two `text-[var(--eh-` colour utilities in the same string. The receipt pastes the raw output of `grep_search` for `text-\[var\(--eh-[a-z-]+\)\][^'"\`]*text-\[var\(--eh-` over both files: expected 0 matches.
7. The receipt lists U1–U12 with the exact line numbers changed.
8. Hard boundary respected.

# 6. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: {}
fix_line_map: {}
criterion_greps: {}
files_modified: []
```
