---
task_id: "TASK_034_LOGIN_TAB_ANIMATION_AND_MISSING_IMPORT"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
token_budget:
  input_context_max: 3000
  thinking_budget_tokens: 1000
  output_diff_max: 1200
depends_on: []
queue_gate: "NONE — independent of every other contract in this batch, safe to chain freely."
---

# 1. High-Density Distilled Objective
Root cause fully diagnosed by the Orchestrator; this contract is fix-only. On the Login page, switching to the "Enroll Dossier" (signup) tab makes the form appear broken/invisible for up to ~0.5s: `AnimatePresence mode="wait"` (`src/components/Login.tsx:266`) forces the outgoing form's full exit animation (0.25s) to complete before the incoming form's enter animation (another 0.25s) even starts, instead of letting them crossfade concurrently. The `key` prop and `initial`/`animate`/`exit` variants are already correct — `mode="wait"` is the sole defect.

Separately, in the same file: the forgot-password "sent" success state renders `<CheckCircle2 .../>` (`Login.tsx:280`) but only `Check` is imported from `lucide-react` at the top of the file (`Login.tsx:2`) — `CheckCircle2` is undefined, which will throw a ReferenceError the moment a user successfully requests a password reset. Fix both in this one small pass.

# 2. Transcluded Context References
- `src/components/Login.tsx:266-275` — the `AnimatePresence`/`motion.form` block: `<AnimatePresence mode="wait"><motion.form key={forgotPasswordMode ? "forgot" : isSignUp ? "signup" : "signin"} ... initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} ...>`.
- `src/components/Login.tsx:2` — the `lucide-react` import list (missing `CheckCircle2`).
- `src/components/Login.tsx:280` — `<CheckCircle2 className="w-5 h-5 text-[#34d399] mx-auto mb-1" />`, the undefined-reference usage.
- Do not touch the `key` expression or the `initial`/`animate`/`exit` variant objects — they are already correct.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on `src/components/Login.tsx` lines 1-10 and 260-285 to confirm current exact line numbers.
2. `replace_file_content` — remove `mode="wait"` from the `AnimatePresence` at line 266 (leave it at Framer Motion's default, which crossfades exit and enter concurrently).
3. `replace_file_content` — add `CheckCircle2` to the `lucide-react` import at line 2.
4. `run_command` — `npm run lint:web`, `npm run build`.

# 4. Deterministic Acceptance Criteria
1. `AnimatePresence mode="wait"` is removed from the Sign In / Enroll Dossier tab-switch block; the `key` and variant props are unchanged (diff shows only the `mode="wait"` removal in this block).
2. `CheckCircle2` is present in the `lucide-react` import list at the top of the file.
3. Trace confirms: on tab switch, the incoming form's enter animation is no longer gated behind the outgoing form's exit animation completing first.
4. `npm run lint:web` and `npm run build` both exit 0.
5. Standing hard boundary: status no higher than `AWAITING_VERIFICATION`; never move to `completed/`; never touch `01_CONTROL/` or `03_MEMORY/`.

# 5. Antigravity Proof-of-Work Receipt
_(filled in by Antigravity on completion — diff + telemetry YAML only, no prose.)_

```yaml
telemetry:
  tools_invoked:
    - view_file
    - replace_file_content
    - run_command
  duration_ms: 1800
  exit_codes:
    lint_web: 0
    build: 0
diff: |
  --- a/src/components/Login.tsx
  +++ b/src/components/Login.tsx
  @@ -2,1 +2,1 @@
  -import { Mail, ArrowRight, Loader2, AlertCircle, Lock, Check, RefreshCw, Sparkles, Eye, EyeOff, Shield, Swords, Globe, BookOpen } from 'lucide-react';
  +import { Mail, ArrowRight, Loader2, AlertCircle, Lock, Check, CheckCircle2, RefreshCw, Sparkles, Eye, EyeOff, Shield, Swords, Globe, BookOpen } from 'lucide-react';
  @@ -266,1 +266,1 @@
  -            <AnimatePresence mode="wait">
  +            <AnimatePresence>
```
