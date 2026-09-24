---
task_id: "TASK_075_EXAM_HALL_E2E_VERIFICATION"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 6500
  thinking_budget_tokens: 3000
  output_diff_max: 3000
batch: "EXAM_HALL_2026_09_24"
depends_on: ["TASK_059_EXAM_POOL_BUILD", "TASK_060_EXAM_GRADING_ENGINE", "TASK_061_EXAM_PAPER_ASSEMBLY_AND_SANITIZER", "TASK_062_MOCK_ATTEMPTS_MIGRATION_AND_DB", "TASK_063_EXAM_API_HANDLERS_AND_ROUTES", "TASK_064_EXAM_CLIENT_STATE_CORE", "TASK_065_EXAM_CLIENT_API_LAYOUT_AND_CUTOFFS", "TASK_066_EXAM_SESSION_HOOK", "TASK_067_EXAM_BOOKLET_UI", "TASK_068_EXAM_OMR_SHEET_UI", "TASK_069_EXAM_BAR_AND_ANNOUNCEMENTS", "TASK_070_EXAM_ADMIT_AND_DIALOGS", "TASK_071_EXAM_HALL_COMPOSITION", "TASK_072_EXAM_SCORECARD_SUMMARY", "TASK_073_EXAM_REVIEW_BOOKLET", "TASK_074_ARENA_LOBBY_AND_APP_INTEGRATION", "TASK_076_EXAM_SESSION_HARDENING", "TASK_077_EXAM_UI_HARDENING"]
queue_gate: "HARD — lives in pending/ on purpose. The Orchestrator promotes it to active/ only after (1) TASK_059-074, TASK_076 and TASK_077 are in completed/ and (2) the mock_attempts migration has been applied by a human to the Supabase project the local .env points at. Both are Orchestrator/human actions; do not do either yourself."
migration_applied: false
blueprint: "strategy/design/exam-hall-blueprint.md (whole) · visual target: strategy/design/exam-hall-mockup.html"
---

# 0. Batch rules
Same as TASK_059 §0. Verification only: **no source edits**. If something fails, record it in the receipt and set `ESCALATED`-worthy findings for the Orchestrator. Do not fix it yourself.
- **Auth:** use a browser profile that is already signed in to Tark. If it is not signed in, STOP and report `BLOCKED_NO_SESSION`. Never create an account and never type a password.

# 1. High-Density Distilled Objective
Prove the Exam Hall works end-to-end in a real browser against a real database, on a 2-minute dev paper:
- start, circle, bubble, lift-the-pen replace, double-mark;
- strike, tag and flag;
- reload mid-paper and resume with state intact;
- auto-collect at time, then the scorecard and review;
- no answer key or explanation reaches the client before submission;
- the mobile layout holds.

# 2. Transcluded Context References
- Blueprint §5 invariants, §7, §9–§17.
- `server-lib/exam/handlers.ts`: `resolveDuration` honours `EXAM_DEV_DURATION_SECONDS` only outside production.
- Mockup screens for visual comparison.

# 2.5 Scope fence
Create: `02_CONTRACTS/pending/../active/` artefacts only (screenshots/recording paths listed in the receipt). Modify: nothing.

# 3. Mandatory Tool Chain & Execution Path
1. `run_command` `npm run test`, `npm run lint`, `npm run build`. All must exit 0.
2. Bundle leak check: `Select-String -Path dist/assets/*.js -Pattern 'GS1_EXAM_POOL','"explanation":','Most of the Tyagaraja Kritis'` → **zero matches**. Also `Select-String -Path dist/server.cjs -Pattern 'GS1_EXAM_POOL'` → ≥ 1 match (the pool must be in the server bundle).
3. Start an isolated server: `$env:PORT='3107'; $env:EXAM_DEV_DURATION_SECONDS='120'; npm run dev` (daemon).
4. `browser_subagent` at 1280×800 on `http://localhost:3107`, recording to `exam-hall-e2e.webp`:
   a. Arena → Exam Hall card → choose "Sectional", subject "Mixed" → "Go to the exam hall". Expect the admit slip with "25 questions".
   b. Keep "Exam-day rules". Fill a wrong series bubble → expect "That's not your series." Fill the right one → expect "Series {S} encoded." Tick "I have read the instructions." → "Break the seal and start".
   c. In the page console, verify items carry no key:
      `const k = Object.keys(localStorage).find(x => x.startsWith('sb-') && x.endsWith('-auth-token')); const t = JSON.parse(localStorage.getItem(k)).access_token; const j = await (await fetch('/api/exam/active', { headers: { Authorization: 'Bearer ' + t } })).json(); JSON.stringify({ n: j.active.paper.items.length, leak: j.active.paper.items.some(i => 'key' in i || 'explanation' in i || 'year' in i || 'subject' in i) })`
      → `{"n":25,"leak":false}`.
   d. Q1: click option (a) → state line "Circled (a) · not on your sheet". Press Enter → "On your sheet: (a)". Within 5 s fill bubble (c) on the sheet → row shows only (c). Wait 6 s, fill (d) → the popover "Row 1 already has (c)…" appears → "Add second bubble" → state "Invalid · two bubbles" and the struck row number.
   e. Q2: strike (b) (line-through). Tag "50:50". Q3: "Revisit" → the flag appears on the sheet row 3. Q4: circle (b) but do not bubble.
   f. Reload the page. Arena lobby → banner "Your paper is still running" → "Return to the paper" → resume prompt. **Wait 20 s on the resume prompt** (regression check for the resume-clock BLOCKER fixed in TASK_076), then click "Return to the paper". Expect Q1 still invalid, Q2's strike and tag, Q3's flag, Q4's circle. In the console, compare the shown time left to the server truth: `const a = (await (await fetch('/api/exam/active', { headers: { Authorization: 'Bearer ' + t } })).json()).active; Math.round((Date.parse(a.deadlineAt) - Date.parse(a.serverNow)) / 1000)`. It must be within ±2 s of the "Time left" read-out (use the token `t` from 4c). Paste both numbers.
   g. Open "Hand in" → expect "Circled, not bubbled 1" with chip "Q4", "Invalid rows 1" → "Keep working". Wait for the clock to hit 0 → expect "Time. Pens down." → then the scorecard.
   h. Scorecard: the banner "Collected at 09:32 when time ran out." (2-minute dev paper: hall end = 09:32). The net score equals `2.00 × right − 0.66 × (wrong + invalid)` using the displayed counts (show the arithmetic in the receipt). "Sheet discipline" lists the circled-not-bubbled line and "1 row double-marked (−0.66)." The review filter "Invalid" shows question 1 with "Correct answer" and "Your answer" tags and an explanation block labelled "Explanation · written by Tark, not UPSC". The cut-off band is replaced by "Cut-off comparison is shown for full papers only." (sectional).
   i. Navigate to Observatory mid-paper in a second quick sitting (start another sectional, then click a rail item) → the guard shows "Leave the exam hall?" → "Stay in the hall". Hand that paper in at once.
   j. Regression checks for TASK_076/077, in a fresh **Full** paper (the dev override also makes it 120 s):
      - Tick "Full screen while I write". After breaking the seal, press `N` six times: the booklet scrolls and question 7 is visible. Exit full screen with the browser; the paper keeps running.
      - Tab to "Hand in" and press Enter: the hand-in dialog opens (Enter is not swallowed). Close it with "Keep working".
      - Press `O`: focus lands on a bubble in the answer sheet. Bubble a row in the **second column** (Q51+), wait 6 s, press Space on another bubble in that row. The popover is fully visible inside the panel. Tab to "Add second bubble" and press Enter: the row becomes invalid.
      - Console check, where a bubbled option exists: `getComputedStyle(document.querySelector('article [data-eh-choose="1"] span')).color` for the bubbled option's label equals `rgb(241, 234, 216)` (Paper theme bubble-letter). Paste it.
   Hand this paper in.
5. `browser_subagent` at 390×844 (a fresh sectional). Also check: bubble an inline-row answer, wait 6 s, tap a different inline bubble. The bottom sheet opens by itself with the "Row n already has…" popover, and "Add second bubble" works by tap. Then confirm the exam bar is fully visible under the app header while scrolled, each question shows the inline "Answer sheet" row, and the peek bar opens the bottom sheet. Screenshot all three. Hand that paper in.
6. Keyboard-only pass (desktop, fresh sectional): Tab into the booklet; `1` circles, `Enter` bubbles, `Shift+2` strikes, `S` tags, `R` flags, `N`/`P` navigate, `?` opens shortcuts, and `Esc` closes shortcuts without ending the paper. Hand it in.
7. Stop the server you started.

# 4. Deterministic Acceptance Criteria
1. Step 1 commands exit 0; step 2 outputs exactly as stated (paste raw).
2. Step 4c prints `{"n":25,"leak":false}` (paste raw).
3. Every expectation in 4a–4i, 5 and 6 is observed. The receipt lists each sub-step as PASS or FAIL with a screenshot path.
4. The receipt includes the net-score arithmetic check from 4h.
5. No source file changed (`git status --short` before and after is identical apart from screenshot artefacts).
6. Hard boundary respected; only the server you started was stopped.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: {}
bundle_leak_check: ""
server_bundle_check: ""
step_4c_output: ""
steps: {}           # e.g. "4a": "PASS screenshots/4a.png"
net_score_arithmetic: ""
recording: ""
git_status_before: ""
git_status_after: ""
```
