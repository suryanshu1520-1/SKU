export interface RippleNode {
  ministry: string;
  action: string;
  ring_depth?: number; // 0: Origin, 1: Statutory/Rules, 2: Inter-Ministerial Execution, 3: Federal/Rollout
  step_order?: number;
  mutates_prior_fact?: boolean;
  examiner_operator?: string;
  dispatch_id?: string;
  pib_url?: string;
}

export interface RippleChain {
  chain_id: string;
  title: string;
  node_id?: string; // Foreign key into public.syllabus_nodes(id)
  primary_pillar: string;
  lead_driver: string;
  historical_twin_pyq_id?: string | null;
  has_sync_debt?: boolean;
  boss_mcq?: any;
  boss_mcq_id?: string;
  volcano_index?: number;
  volcano_status?: string;
  last_tested_year?: number;
  nodes_flow: RippleNode[];
  linked_dispatches: string[];
}

export interface EntityRecord {
  entity_slug?: string;
  authority: string;
  aliases?: string[];
  parent_ministry?: string;
  appearances_count: number;
  tier_number: number;
  tier_name: string;
  parent_statute_or_article?: string;
  tier_description: string;
  neutralized_trap: string;
  trap_explanation?: string;
}

export const TIERS = [
  'Constitutional bodies',
  'Statutory regulators',
  'Executive divisions',
  'Industry societies',
  'Public sector undertakings',
];

