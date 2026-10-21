export interface RadarNode {
  ring_depth?: number;
  step_order?: number;
  ministry?: string;
  action?: string;
  dispatch_id?: string;
  pib_url?: string | null;
  provenance?: 'seed' | 'observed' | string;
  [key: string]: any;
}

export interface RadarCoverage {
  observed_nodes: number;
  hidden_seed_nodes: number;
  chains_shown: number;
  generated_at: string;
}

export interface RadarPayloadInputV1 {
  chains: any[];
  entities: any[];
  volcanoRows: any[];
  bossMcqs: any[];
}

export interface RadarPayloadV1 {
  status: 'ok' | 'unavailable';
  updated_at: string;
  total_chains: number;
  total_entities: number;
  chains: any[];
  entities: any[];
  topVolcanoNodes: any[];
  coverage: RadarCoverage;
}

/**
 * Checks if a node qualifies as an observed, source-backed node.
 * Must have provenance !== 'seed', a non-null pib_url, and must not have a synthetic DISP_ ID.
 */
export function isObservedNode(node: RadarNode | null | undefined): boolean {
  if (!node) return false;
  if (node.provenance === 'seed') return false;
  if (!node.pib_url || typeof node.pib_url !== 'string' || node.pib_url.trim().length === 0) {
    return false;
  }
  if (typeof node.dispatch_id === 'string' && node.dispatch_id.startsWith('DISP_')) {
    return false;
  }
  if (node.provenance !== undefined && node.provenance !== 'observed') {
    return false;
  }
  return true;
}

// What a boss MCQ may show before the candidate answers. An allowlist on purpose: the raw
// current_affairs_mcqs row carries the answer key (correct_index, explanation, statement_dissection,
// statutory_anchor, operators), and answers may only leave the server through
// POST /api/policy-radar/v2/boss-mcq/:id/check.
const PUBLIC_BOSS_MCQ_FIELDS = [
  'id', 'chain_id', 'program_slug', 'question', 'options', 'headline', 'subject', 'edition_date',
] as const;

export function publicBossMcq(row: any): Record<string, any> | null {
  if (!row || typeof row !== 'object') return null;
  const out: Record<string, any> = {};
  for (const key of PUBLIC_BOSS_MCQ_FIELDS) {
    if (row[key] !== undefined) out[key] = row[key];
  }
  return out;
}

/**
 * Builds the v1 Radar payload strictly from observed, source-backed data:
 * - Drops synthetic/seeded nodes
 * - Drops chains that have zero kept nodes
 * - Uses only DB volcano rows (zero baseline padding)
 * - Returns boss_mcq (answer fields stripped) or null unless the MCQ row exists in bossMcqs
 * - Includes coverage statistics
 */
export function buildRadarPayloadV1(input: RadarPayloadInputV1): RadarPayloadV1 {
  const { chains = [], entities = [], volcanoRows = [], bossMcqs = [] } = input;
  const now = new Date().toISOString();

  // 1. Build volcano map strictly from DB rows (no baselines)
  const volcanoMap: Record<string, any> = {};
  for (const v of volcanoRows || []) {
    if (!v || !v.node_id) continue;
    const lastYear = v.last_tested_year || 2018;
    volcanoMap[v.node_id] = {
      node_id: v.node_id,
      title: v.syllabus_nodes?.gloss || v.title || v.node_id,
      paper: v.syllabus_nodes?.paper || v.paper || 'GS3',
      last_tested_year: v.last_tested_year || null,
      years_dormant: 2026 - Number(lastYear),
      recurrence_interval_avg: Number(v.recurrence_interval_avg) || 2.5,
      news_count_2026: v.news_count_2026 || 0,
      volcano_index: Number(v.volcano_index) || 0,
      volcano_status: v.volcano_status || 'STABLE',
    };
  }

  // 2. Synthesize topVolcanoNodes strictly from DB rows
  const topVolcanoNodes: any[] = [];
  const seenNodeIds = new Set<string>();

  for (const v of volcanoRows || []) {
    if (v && v.node_id && v.volcano_index > 0 && !seenNodeIds.has(v.node_id)) {
      seenNodeIds.add(v.node_id);
      topVolcanoNodes.push(volcanoMap[v.node_id]);
    }
  }
  topVolcanoNodes.sort((a, b) => (b.volcano_index || 0) - (a.volcano_index || 0));

  // 3. Map boss MCQs strictly from provided rows
  const bossMcqMap: Record<string, any> = {};
  for (const m of bossMcqs || []) {
    if (m && m.id) {
      bossMcqMap[m.id] = publicBossMcq(m);
    }
  }

  // 4. Filter nodes and chains
  let totalObservedNodes = 0;
  let totalHiddenSeedNodes = 0;
  const formattedChains: any[] = [];

  for (const c of chains || []) {
    const rawNodes = c.policy_chain_nodes || [];
    const keptNodes: RadarNode[] = [];

    for (const n of rawNodes) {
      if (isObservedNode(n)) {
        keptNodes.push(n);
      } else {
        totalHiddenSeedNodes++;
      }
    }

    // Drop chains with zero observed nodes
    if (keptNodes.length === 0) {
      continue;
    }

    totalObservedNodes += keptNodes.length;

    const sortedNodes = keptNodes.sort(
      (a, b) => (Number(a.step_order) || 0) - (Number(b.step_order) || 0)
    );

    const vInfo = c.node_id ? volcanoMap[c.node_id] || null : null;
    const bossMcq = (c.boss_mcq_id && bossMcqMap[c.boss_mcq_id]) ? bossMcqMap[c.boss_mcq_id] : null;

    formattedChains.push({
      chain_id: c.chain_id,
      title: c.title,
      node_id: c.node_id,
      primary_pillar: c.primary_pillar,
      lead_driver: c.lead_driver,
      historical_twin_pyq_id: c.historical_twin_pyq_id,
      status: c.status,
      has_sync_debt: Boolean(c.has_sync_debt),
      volcano_index: vInfo ? vInfo.volcano_index : 0,
      volcano_status: vInfo ? vInfo.volcano_status : 'STABLE',
      last_tested_year: vInfo ? vInfo.last_tested_year : null,
      boss_mcq: bossMcq,
      nodes_flow: sortedNodes.map((n) => ({
        ring_depth: n.ring_depth,
        step_order: n.step_order,
        ministry: n.ministry,
        action: n.action,
        dispatch_id: n.dispatch_id,
        pib_url: n.pib_url,
        provenance: n.provenance || 'observed',
      })),
      linked_dispatches: sortedNodes
        .map((n) => n.dispatch_id)
        .filter(Boolean),
    });
  }

  return {
    status: 'ok',
    updated_at: now,
    total_chains: formattedChains.length,
    total_entities: (entities || []).length,
    chains: formattedChains,
    entities: entities || [],
    topVolcanoNodes: topVolcanoNodes.slice(0, 15),
    coverage: {
      observed_nodes: totalObservedNodes,
      hidden_seed_nodes: totalHiddenSeedNodes,
      chains_shown: formattedChains.length,
      generated_at: now,
    },
  };
}

/**
 * Adapter mapping RadarV2 payload to RadarPayloadV1 structure for legacy compatibility.
 * TASK_085P
 */
export function v1FromV2(payload: any): RadarPayloadV1 {
  const chains = (payload.programs || []).map((prog: any) => {
    const nodesFlow = (prog.nodes || []).map((n: any, idx: number) => ({
      ring_depth: n.ring,
      step_order: idx + 1,
      ministry: n.actor?.name || "",
      action: n.summary || n.instrument,
      dispatch_id: n.event_id,
      pib_url: n.evidence && n.evidence[0] ? n.evidence[0].source_url : null,
      provenance: "observed",
    }));

    return {
      chain_id: prog.slug,
      title: prog.name,
      node_id: prog.nodal,
      primary_pillar: prog.kind,
      lead_driver: prog.nodal,
      historical_twin_pyq_id: null,
      status: "active",
      has_sync_debt: false,
      volcano_index: 0,
      volcano_status: "STABLE",
      last_tested_year: null,
      boss_mcq: publicBossMcq(prog.boss_mcq),
      nodes_flow: nodesFlow,
      linked_dispatches: nodesFlow.map((n: any) => n.dispatch_id).filter(Boolean),
    };
  });

  const totalObservedNodes = (payload.programs || []).reduce(
    (acc: number, p: any) => acc + (p.nodes?.length || 0),
    0
  );

  return {
    status: payload.status === "unavailable" ? "unavailable" : "ok",
    updated_at: payload.coverage?.generated_at || new Date().toISOString(),
    total_chains: chains.length,
    total_entities: 0,
    chains,
    entities: [],
    topVolcanoNodes: (payload.node_signals || []).map((ns: any) => ({
      node_id: ns.node_id,
      title: ns.title,
      paper: "GS3",
      last_tested_year: null,
      years_dormant: 0,
      recurrence_interval_avg: 2.5,
      news_count: ns.x_recent,
      volcano_index: ns.score,
      volcano_status: ns.surging ? "ERUPTING" : "STABLE",
    })),
    coverage: {
      observed_nodes: totalObservedNodes,
      hidden_seed_nodes: 0,
      chains_shown: chains.length,
      generated_at: payload.coverage?.generated_at || new Date().toISOString(),
    },
  };
}

