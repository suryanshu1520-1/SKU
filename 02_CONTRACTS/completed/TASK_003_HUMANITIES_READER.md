---
task_id: "TASK_003_HUMANITIES_READER"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 3500
  thinking_budget_tokens: 3000
  output_diff_max: 2000
---

# 1. High-Density Distilled Objective
Build a standalone `HumanitiesReader` component that renders `humanities-canon.json` (from TASK_002) in the visual style of `StaticLibrary.tsx`, with each passage showing its PYQ-citation badges and a "pin" button that appends the passage to a local margin-rail list (in-memory only — no persistence, no backend call).

# 2. Transcluded Context References
- Visual/structural pattern: `src/components/StaticLibrary.tsx` (tabs, search/filter state, `lucide-react` icons, `motion/react` for transitions).
- Data source: `src/data/humanities-canon.json` + `src/types/humanities.ts` (TASK_002 output).
- Scope boundaries respected: No modifications to `App.tsx` or `StaticLibrary.tsx`, no extra canvas libraries.

# 3. Mandatory Tool Chain & Execution Path
1. `grep_search` → confirmed no existing `HumanitiesReader` component
2. `write_to_file` → `src/components/HumanitiesReader.tsx` (new)
3. `write_to_file` → `src/components/HumanitiesReader.test.tsx` (new)
4. `run_command` → `npm run lint:web` — exited `0`
5. `run_command` → `npx tsx --test src/components/HumanitiesReader.test.tsx` — exited `0`

# 4. Deterministic Acceptance Criteria
1. Renders each thinker's passages from JSON; each `isPlaceholder: true` passage visibly shows a "PLACEHOLDER" badge in UI.
2. Each passage displays its `pyqCitations` as badges (year + paper).
3. A "pin" affordance per passage adds it to `pinnedPassages` list rendered in a right-hand margin rail; clicking a pinned item scrolls/highlights it back in the main reading column.
4. Un-pinning removes it from rail; pin operation is idempotent.
5. No network calls, no new dependencies, no modification to `App.tsx` or `StaticLibrary.tsx`.
6. `tsc` clean, tests exit 0.

# 5. Antigravity Proof-of-Work Receipt

```yaml
telemetry:
  tools_invoked:
    - grep_search
    - write_to_file (src/components/HumanitiesReader.tsx)
    - write_to_file (src/components/HumanitiesReader.test.tsx)
    - run_command (npx tsx --test src/components/HumanitiesReader.test.tsx)
    - run_command (npm run lint:web)
  duration_ms: 1840
  exit_codes:
    test_suite: 0
    lint_web: 0
diff: |
  diff --git a/src/components/HumanitiesReader.tsx b/src/components/HumanitiesReader.tsx
  new file mode 100644
  --- /dev/null
  +++ b/src/components/HumanitiesReader.tsx
  @@ -0,0 +1,248 @@
  +import React, { useState, useRef } from 'react';
  +import { motion, AnimatePresence } from 'motion/react';
  +import { BookOpen, Pin, PinOff, Bookmark, Search, CheckCircle2 } from 'lucide-react';
  +import canonData from '../data/humanities-canon.json';
  +import type { HumanitiesCanon, Thinker, Passage, PyqCitation } from '../types/humanities';
  ...
```
