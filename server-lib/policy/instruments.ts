/**
 * server-lib/policy/instruments.ts
 *
 * Instrument classes, deterministic rings, and evidence validation.
 * TypeScript mirror of Postgres function public.ring_of_instrument(i instrument_class).
 */

export type InstrumentClass =
  | "cabinet_approval"
  | "budget_announcement"
  | "executive_announcement"
  | "treaty_signed"
  | "bill_introduced"
  | "bill_passed"
  | "act_assented"
  | "ordinance_promulgated"
  | "rules_notified"
  | "regulation_issued"
  | "commencement_or_entry_into_force"
  | "guidelines_issued"
  | "institution_constituted"
  | "funds_released"
  | "tender_awarded"
  | "interagency_mou"
  | "state_rollout"
  | "project_commissioned"
  | "beneficiary_milestone"
  | "enforcement_action";

export type NonEventClass =
  | "review_meeting"
  | "visit_or_courtesy"
  | "campaign_or_awareness"
  | "award_or_ceremony"
  | "conference_or_seminar"
  | "other";

export type ProgramKind =
  | "scheme"
  | "mission"
  | "act"
  | "bill"
  | "treaty"
  | "regulation"
  | "policy";

export type RingDepth = 0 | 1 | 2 | 3;

export const RING_OF: Record<InstrumentClass, RingDepth> = {
  cabinet_approval: 0,
  budget_announcement: 0,
  executive_announcement: 0,
  treaty_signed: 0,
  bill_introduced: 1,
  bill_passed: 1,
  act_assented: 1,
  ordinance_promulgated: 1,
  rules_notified: 1,
  regulation_issued: 1,
  commencement_or_entry_into_force: 1,
  guidelines_issued: 2,
  institution_constituted: 2,
  funds_released: 2,
  tender_awarded: 2,
  interagency_mou: 2,
  state_rollout: 3,
  project_commissioned: 3,
  beneficiary_milestone: 3,
  enforcement_action: 3,
};

export const NON_EVENTS: readonly NonEventClass[] = [
  "review_meeting",
  "visit_or_courtesy",
  "campaign_or_awareness",
  "award_or_ceremony",
  "conference_or_seminar",
  "other",
] as const;

export interface EvidenceItem {
  span_id: string;
  quote: string;
  source_url: string;
}

/**
 * Enforces that evidence is a non-empty array where every element
 * has span_id, non-empty quote, and https:// source_url.
 */
export function assertEvidence(evidence: unknown): asserts evidence is EvidenceItem[] {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    throw new Error("Evidence must be a non-empty array");
  }
  for (const item of evidence) {
    if (!item || typeof item !== "object") {
      throw new Error("Evidence element must be an object");
    }
    const { span_id, quote, source_url } = item as Record<string, unknown>;
    if (typeof span_id !== "string" || !span_id.trim()) {
      throw new Error("Evidence item missing valid span_id");
    }
    if (typeof quote !== "string" || !quote.trim()) {
      throw new Error("Evidence item missing valid quote");
    }
    if (typeof source_url !== "string" || !source_url.startsWith("https://")) {
      throw new Error("Evidence item missing valid source_url starting with https://");
    }
  }
}

export function ringOfInstrument(instrument: InstrumentClass): RingDepth {
  return RING_OF[instrument];
}
