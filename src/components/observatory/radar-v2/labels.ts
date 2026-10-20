/**
 * src/components/observatory/radar-v2/labels.ts
 *
 * Exhaustive human-readable labels for policy lanes and instruments.
 * TASK_085Q
 */

import type { InstrumentClass } from "../../../../server-lib/policy/instruments.ts";

export const RING_LABEL = ["Mandate", "Law", "Execution", "Delivery"] as const;

export const INSTRUMENT_LABEL: Record<InstrumentClass, string> = {
  cabinet_approval: "Cabinet approved",
  budget_announcement: "Budget announcement",
  executive_announcement: "Executive announcement",
  treaty_signed: "Treaty signed",
  bill_introduced: "Bill introduced",
  bill_passed: "Bill passed",
  act_assented: "Act assented",
  ordinance_promulgated: "Ordinance promulgated",
  rules_notified: "Rules notified",
  regulation_issued: "Regulation issued",
  commencement_or_entry_into_force: "Came into force",
  guidelines_issued: "Guidelines issued",
  institution_constituted: "Institution constituted",
  funds_released: "Funds released",
  tender_awarded: "Tender awarded",
  interagency_mou: "Inter-agency MoU",
  state_rollout: "State rollout",
  project_commissioned: "Project commissioned",
  beneficiary_milestone: "Beneficiary milestone",
  enforcement_action: "Enforcement action",
} satisfies Record<InstrumentClass, string>;
