/**
 * server-lib/policy/tiers.ts
 *
 * Authority Registry Legal Tiers mapping.
 * TypeScript mirror of Postgres function public.tier_from_basis(k legal_basis_kind).
 *
 * Invariant: Legal tier is deterministically derived from legal basis, never an LLM opinion.
 */

export type LegalBasisKind =
  | "constitution_article"
  | "central_act"
  | "state_act"
  | "executive_order"
  | "society_registration"
  | "companies_act_section8"
  | "trust"
  | "companies_act_cpse";

export type TierNumber = 1 | 2 | 3 | 4 | 5;

export const TIER_FROM_BASIS: Record<LegalBasisKind, TierNumber> = {
  constitution_article: 1,
  central_act: 2,
  state_act: 2,
  executive_order: 3,
  society_registration: 4,
  companies_act_section8: 4,
  trust: 4,
  companies_act_cpse: 5,
};

export const TIER_NAME: Record<TierNumber, string> = {
  1: "Constitutional body",
  2: "Statutory body",
  3: "Executive / attached office",
  4: "Registered society / Section-8 / trust",
  5: "Public sector undertaking",
};

export function tierFromBasis(basis: LegalBasisKind): TierNumber {
  return TIER_FROM_BASIS[basis];
}

export function tierName(tier: TierNumber): string {
  return TIER_NAME[tier];
}
