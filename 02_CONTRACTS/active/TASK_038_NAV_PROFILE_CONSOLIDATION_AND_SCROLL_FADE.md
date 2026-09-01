---
task_id: "TASK_038_NAV_PROFILE_CONSOLIDATION_AND_SCROLL_FADE"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 4500
  thinking_budget_tokens: 1800
  output_diff_max: 1800
depends_on: []
queue_gate: "NONE — independent of every other contract in this batch, safe to chain freely. Closes the residual gap from TASK_026 (VERIFIED_PARTIAL, completed/) which merged 7 orphaned components but left VerticalNavRail's Profile button hardcoded."
---

# 1. High-Density Distilled Objective
1. Consolidate `VerticalNavRail.tsx` Profile button to use `PROFILE_NAV_ITEM` imported from `src/lib/navItems.ts` (matching sibling button markup and hotkey badges).
2. Add trailing edge scroll-fade mask affordance on horizontal mobile pill navigation in `App.tsx:392`.

# 2. Transcluded Context References
- `src/lib/navItems.ts:35-43` — `PROFILE_NAV_ITEM` source of truth.
- `src/components/VerticalNavRail.tsx:26,219-246` — Profile button consolidation.
- `src/App.tsx:392` — mobile scroll-fade mask.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on `navItems.ts`, `VerticalNavRail.tsx`, and `App.tsx`.
2. `replace_file_content` — import `PROFILE_NAV_ITEM` in `VerticalNavRail.tsx` and render with hotkey badge.
3. `replace_file_content` — add `WebkitMaskImage`/`maskImage` linear-gradient mask to `App.tsx:392`.
4. `run_command` — `npm run lint:web`, `npm run build`.

# 4. Deterministic Acceptance Criteria
1. `VerticalNavRail.tsx` uses `PROFILE_NAV_ITEM` from `navItems.ts` with no duplicate hardcoded copy.
2. Profile button renders matching hotkey badge and active indicator edge.
3. Mobile nav displays subtle scroll-fade gradient affordance.
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
  duration_ms: 2100
  exit_codes:
    lint_web: 0
    build: 0
diff: |
  --- a/src/components/VerticalNavRail.tsx
  +++ b/src/components/VerticalNavRail.tsx
  @@ -26,1 +26,1 @@
  -import { NAV_ITEMS, NavItem, NavTab } from '../lib/navItems';
  +import { NAV_ITEMS, PROFILE_NAV_ITEM, NavItem, NavTab } from '../lib/navItems';
  @@ -219,27 +219,39 @@
  -          {userEmail && (
  -            <button
  -              onClick={() => onNavigateTab('profile')}
  -              title="Profile & History"
  +          {userEmail && (() => {
  +            const ProfileIcon = PROFILE_NAV_ITEM.icon;
  +            const active = !isLanding && activeTab === 'profile';
  +            return (
  +              <button
  +                onClick={() => onNavigateTab('profile')}
  +                title={`${PROFILE_NAV_ITEM.label} (Alt+${PROFILE_NAV_ITEM.hotkey})`}
  --- a/src/App.tsx
  +++ b/src/App.tsx
  @@ -392,1 +392,9 @@
  -            <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
  +            <nav
  +              className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0"
  +              style={{
  +                scrollbarWidth: 'none',
  +                msOverflowStyle: 'none',
  +                WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)',
  +                maskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)',
  +              }}
  +            >
```
