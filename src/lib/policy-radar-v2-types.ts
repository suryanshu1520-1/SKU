/**
 * src/lib/policy-radar-v2-types.ts
 *
 * Radar API v2 shared contract types for client and server.
 * TASK_085P
 */

export interface Evidence {
  quote: string;
  source_url: string;
  span_id?: string;
}

export interface LineageActor {
  slug: string;
  name: string;
  tier: number | null;
  legal_basis_ref: string | null;
}

export interface LineageNode {
  event_id: string;
  event_date: string;
  date_source: 'release_meta' | 'span' | 'ingested';
  ring: 0 | 1 | 2 | 3;
  instrument: string;
  actor: LineageActor | null;
  summary: string;
  evidence: Evidence[];
  parent_event_id: string | null;
}

export type GapStatus =
  | 'complete'
  | 'on_track'
  | 'longer_than_usual'
  | 'no_estimate'
  | 'not_applicable';

export interface Gap {
  lastStage: string | null;
  lastDate: string | null;
  nextStage: string | null;
  elapsedDays: number | null;
  nObserved: number;
  medianDays: number | null;
  q25Days: number | null;
  status: GapStatus;
  sentence: string;
}

export interface Mutation {
  headline: string;
  effectiveAt: string | null;
  sources: Array<{ quote: string; url: string }>;
}

export interface ProgramBossMcq {
  id: string;
  question: string;
  options: string[];
  edition_date: string;
}

export interface ProgramRipple {
  direction: 'upstream' | 'downstream';
  other_program: string;
  other_name: string;
  anchor_kind: 'explicit_reference' | 'learned';
  p: number | null;
  evidence: Evidence;
}

export interface Program {
  slug: string;
  name: string;
  kind: string;
  nodal: string | null;
  nodes: LineageNode[];
  gap: Gap | null;
  mutations: Array<Mutation & { event_id: string }>;
  boss_mcq: ProgramBossMcq | null;
  ripples: ProgramRipple[];
}

export interface Coverage {
  events: number;
  programs: number;
  since: string | null;
  generated_at: string;
  last_event_at: string | null;
  dropped_no_evidence?: number;
}

export interface NodeSignal {
  node_id: string;
  x_recent: number;
  n_baseline: number;
  expected: number;
  p: number;
  score: number;
  surging: boolean;
  exam_weight: number;
  computed_at: string;
}

export type NodeSignalV2 = NodeSignal & { title: string };

export interface RadarV2 {
  status: 'ok' | 'paused' | 'stale' | 'unavailable';
  programs: Program[];
  node_signals: NodeSignalV2[];
  coverage: Coverage;
  version: 'v2';
}
