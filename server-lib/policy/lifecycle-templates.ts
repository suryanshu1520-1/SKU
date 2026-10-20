/**
 * server-lib/policy/lifecycle-templates.ts
 *
 * Configured lifecycle stage sequences by program kind.
 * TASK_085L
 */

import type { InstrumentClass, ProgramKind } from "./instruments.ts";

export const TEMPLATES: Record<ProgramKind, InstrumentClass[]> = {
  act: [
    "bill_introduced",
    "bill_passed",
    "act_assented",
    "commencement_or_entry_into_force",
    "rules_notified",
    "guidelines_issued",
  ],
  bill: [
    "bill_introduced",
    "bill_passed",
    "act_assented",
  ],
  scheme: [
    "cabinet_approval",
    "guidelines_issued",
    "funds_released",
    "state_rollout",
  ],
  mission: [
    "cabinet_approval",
    "guidelines_issued",
    "funds_released",
    "project_commissioned",
  ],
  treaty: [
    "treaty_signed",
    "commencement_or_entry_into_force",
    "regulation_issued",
  ],
  regulation: [
    "regulation_issued",
    "commencement_or_entry_into_force",
  ],
  policy: [
    "cabinet_approval",
    "guidelines_issued",
  ],
};
