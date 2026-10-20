import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { buildRadarPayloadV1, v1FromV2 } from './policy/radar-payload.js';
import { buildRadarV2Payload } from './policy/radar-v2-payload.js';

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

export const CANONICAL_VOLCANO_BASELINES = [
  {
    node_id: 'GS3.ECO.EXTERNAL',
    title: 'External Sector, BoP, Rupee Internationalization & FOREX',
    paper: 'GS3',
    last_tested_year: 2013,
    years_dormant: 13,
    recurrence_interval_avg: 1.5,
    news_count_2026: 18,
    volcano_index: 30.13,
    volcano_status: 'ERUPTING' as const,
  },
  {
    node_id: 'GS2.IR.BILATERAL',
    title: 'Bilateral & Regional Groupings (Quad, I2U2, IMEC & Critical Corridors)',
    paper: 'GS2',
    last_tested_year: 2014,
    years_dormant: 12,
    recurrence_interval_avg: 1.5,
    news_count_2026: 15,
    volcano_index: 28.53,
    volcano_status: 'ERUPTING' as const,
  },
  {
    node_id: 'GS3.SCI.IT_COMP',
    title: 'Semiconductors, Quantum Computing & AI Infrastructure',
    paper: 'GS3',
    last_tested_year: 2018,
    years_dormant: 8,
    recurrence_interval_avg: 2.0,
    news_count_2026: 14,
    volcano_index: 13.38,
    volcano_status: 'ERUPTING' as const,
  },
  {
    node_id: 'GS3.ENV.POLLUTION',
    title: 'Circular Economy, E-Waste & Industrial Effluent Compliance',
    paper: 'GS3',
    last_tested_year: 2019,
    years_dormant: 7,
    recurrence_interval_avg: 2.2,
    news_count_2026: 11,
    volcano_index: 10.12,
    volcano_status: 'ERUPTING' as const,
  },
  {
    node_id: 'GS3.DEF.MODERN',
    title: 'Defense Indigenization, DAP 2026 & Defense Export Corridors',
    paper: 'GS3',
    last_tested_year: 2017,
    years_dormant: 9,
    recurrence_interval_avg: 2.8,
    news_count_2026: 8,
    volcano_index: 9.11,
    volcano_status: 'ERUPTING' as const,
  },
  {
    node_id: 'GS3.AGRI.MSP',
    title: 'Agri-Cooperative Federalism & MSP Dynamic Pricing Architecture',
    paper: 'GS3',
    last_tested_year: 2020,
    years_dormant: 6,
    recurrence_interval_avg: 2.5,
    news_count_2026: 9,
    volcano_index: 7.07,
    volcano_status: 'HEATING' as const,
  },
  {
    node_id: 'GS3.ECO.MONETARY',
    title: 'RBI Liquidity Framework, VRRR Auctions & Inflation Targeting',
    paper: 'GS3',
    last_tested_year: 2021,
    years_dormant: 5,
    recurrence_interval_avg: 2.5,
    news_count_2026: 10,
    volcano_index: 6.09,
    volcano_status: 'HEATING' as const,
  },
  {
    node_id: 'GS3.ENV.RENEWABLE',
    title: 'National Green Hydrogen Mission (SIGHT) & Electrolyser PLI',
    paper: 'GS3',
    last_tested_year: 2021,
    years_dormant: 5,
    recurrence_interval_avg: 2.5,
    news_count_2026: 9,
    volcano_index: 5.99,
    volcano_status: 'HEATING' as const,
  },
  {
    node_id: 'GS3.INFRA.LOGISTICS',
    title: 'PM GatiShakti National Master Plan & Unified Logistics Portal (ULIP)',
    paper: 'GS3',
    last_tested_year: 2022,
    years_dormant: 4,
    recurrence_interval_avg: 2.4,
    news_count_2026: 8,
    volcano_index: 4.72,
    volcano_status: 'HEATING' as const,
  },
  {
    node_id: 'GS2.SOCJ.HEALTH',
    title: 'AYUSH Integration, Pharmacopoeia Commission & Universal Health',
    paper: 'GS2',
    last_tested_year: 2022,
    years_dormant: 4,
    recurrence_interval_avg: 2.5,
    news_count_2026: 7,
    volcano_index: 4.34,
    volcano_status: 'HEATING' as const,
  },
];

function unavailableResponse(res: Response) {
  const coverage = {
    observed_nodes: 0,
    hidden_seed_nodes: 0,
    chains_shown: 0,
    generated_at: new Date().toISOString(),
  };
  return res.status(200).json({
    status: 'unavailable',
    chains: [],
    entities: [],
    topVolcanoNodes: [],
    coverage,
  });
}

export async function policyRadarHandler(req: Request, res: Response) {
  // Set Vercel Edge caching headers: 1 hour edge cache, 24 hours stale-while-revalidate
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Content-Type', 'application/json');

  const supabase = getSupabaseClient();
  if (!supabase) {
    return unavailableResponse(res);
  }

  try {
    if (process.env.RADAR_V2 === '1') {
      const [programsRes, eventsRes, edgesRes, gapsRes, mutationsRes, signalsRes, entitiesRes] = await Promise.all([
        supabase.from('policy_programs').select('*'),
        supabase.from('policy_events').select('*').eq('is_public', true),
        supabase.from('policy_edges').select('*'),
        supabase.from('program_gaps').select('*'),
        supabase.from('policy_fact_mutations_v').select('*'),
        supabase.from('node_signals').select('*, syllabus_nodes(path, gloss)'),
        supabase.from('policy_entities').select('*'),
      ]);

      if (!programsRes.error && !eventsRes.error) {
        const v2 = buildRadarV2Payload({
          programs: programsRes.data ?? [],
          events: eventsRes.data ?? [],
          edges: edgesRes.data ?? [],
          gaps: gapsRes.data ?? [],
          mutations: mutationsRes.data ?? [],
          nodeSignals: signalsRes.data ?? [],
          entities: entitiesRes.data ?? [],
        }, new Date());
        return res.status(200).json(v1FromV2(v2));
      }
    }

    // 1. Fetch active chains with nodes ordered by step_order
    const { data: chainsData, error: chainsErr } = await supabase
      .from('policy_chains')
      .select('*, policy_chain_nodes(*)')
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    // 2. Fetch all verified entities ordered by tier and appearances
    const { data: entitiesData, error: entitiesErr } = await supabase
      .from('policy_entities')
      .select('*')
      .order('tier_number', { ascending: true })
      .order('appearances_count', { ascending: false });

    if (chainsErr || entitiesErr || !chainsData) {
      return unavailableResponse(res);
    }

    // 3. Fetch top volcano nodes
    const { data: volcanoRows } = await supabase
      .from('pyq_node_analytics')
      .select('node_id, last_tested_year, recurrence_interval_avg, news_count_2026, volcano_index, volcano_status, syllabus_nodes(paper, gloss)')
      .order('volcano_index', { ascending: false })
      .limit(15);

    // 4. Fetch boss MCQs
    const bossMcqIds = (chainsData || []).map((c: any) => c.boss_mcq_id).filter(Boolean);
    let bossMcqs: any[] = [];
    if (bossMcqIds.length > 0) {
      const { data: mcqs } = await supabase
        .from('current_affairs_mcqs')
        .select('*')
        .in('id', bossMcqIds);
      if (mcqs) {
        bossMcqs = mcqs;
      }
    }

    const payload = buildRadarPayloadV1({
      chains: chainsData,
      entities: entitiesData || [],
      volcanoRows: volcanoRows || [],
      bossMcqs,
    });

    return res.status(200).json(payload);
  } catch (err) {
    console.error('[policy-radar] Handler error:', err);
    return unavailableResponse(res);
  }
}

export default policyRadarHandler;
