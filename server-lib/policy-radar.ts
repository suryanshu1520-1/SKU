import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { CANONICAL_BOSS_MCQ_FALLBACKS } from './cron/policy-graph-worker.js';

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

function getFallbackSnapshot() {
  try {
    const snapshotPath = path.resolve(process.cwd(), 'src/data/policy-radar-snapshot.json');
    if (fs.existsSync(snapshotPath)) {
      const raw = fs.readFileSync(snapshotPath, 'utf-8');
      const data = JSON.parse(raw);
      return {
        ...data,
        topVolcanoNodes: CANONICAL_VOLCANO_BASELINES,
      };
    }
  } catch (err) {
    console.warn('[policy-radar] Snapshot read error:', err);
  }
  return { chains: [], entities: [], topVolcanoNodes: CANONICAL_VOLCANO_BASELINES };
}

export async function policyRadarHandler(req: Request, res: Response) {
  // Set Vercel Edge caching headers: 1 hour edge cache, 24 hours stale-while-revalidate
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Content-Type', 'application/json');

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(200).json(getFallbackSnapshot());
  }

  try {
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

    // 3. Fetch top volcano nodes
    const { data: volcanoRows } = await supabase
      .from('pyq_node_analytics')
      .select('node_id, last_tested_year, recurrence_interval_avg, news_count_2026, volcano_index, volcano_status, syllabus_nodes(paper, gloss)')
      .order('volcano_index', { ascending: false })
      .limit(15);

    // Build volcano lookup map
    const volcanoMap: Record<string, any> = {};
    const baselineMap: Record<string, any> = {};
    for (const b of CANONICAL_VOLCANO_BASELINES) {
      baselineMap[b.node_id] = b;
    }

    if (volcanoRows && volcanoRows.length > 0) {
      for (const v of volcanoRows) {
        const lastYear = v.last_tested_year || baselineMap[v.node_id]?.last_tested_year || 2018;
        volcanoMap[v.node_id] = {
          node_id: v.node_id,
          title: (v as any).syllabus_nodes?.gloss || baselineMap[v.node_id]?.title || v.node_id,
          paper: (v as any).syllabus_nodes?.paper || baselineMap[v.node_id]?.paper || 'GS3',
          last_tested_year: v.last_tested_year || baselineMap[v.node_id]?.last_tested_year || null,
          years_dormant: 2026 - Number(lastYear),
          recurrence_interval_avg: Number(v.recurrence_interval_avg) || baselineMap[v.node_id]?.recurrence_interval_avg || 2.5,
          news_count_2026: v.news_count_2026 || baselineMap[v.node_id]?.news_count_2026 || 0,
          volcano_index: Number(v.volcano_index) || baselineMap[v.node_id]?.volcano_index || 0,
          volcano_status: v.volcano_status || baselineMap[v.node_id]?.volcano_status || 'STABLE',
        };
      }
    }

    // Build synthesized topVolcanoNodes
    const topVolcanoNodes: any[] = [];
    const seenNodeIds = new Set<string>();

    for (const v of volcanoRows || []) {
      if (v.volcano_index > 0 && !seenNodeIds.has(v.node_id)) {
        seenNodeIds.add(v.node_id);
        topVolcanoNodes.push(volcanoMap[v.node_id]);
      }
    }

    for (const b of CANONICAL_VOLCANO_BASELINES) {
      if (!seenNodeIds.has(b.node_id)) {
        seenNodeIds.add(b.node_id);
        topVolcanoNodes.push(b);
      }
    }

    topVolcanoNodes.sort((a, b) => (b.volcano_index || 0) - (a.volcano_index || 0));

    // 4. Fetch boss MCQs
    const bossMcqIds = (chainsData || []).map((c: any) => c.boss_mcq_id).filter(Boolean);
    const bossMcqMap: Record<string, any> = {};
    if (bossMcqIds.length > 0) {
      const { data: mcqs } = await supabase
        .from('current_affairs_mcqs')
        .select('*')
        .in('id', bossMcqIds);
      if (mcqs) {
        for (const m of mcqs) {
          bossMcqMap[m.id] = m;
        }
      }
    }

    if (chainsErr || entitiesErr || !chainsData || chainsData.length === 0) {
      return res.status(200).json(getFallbackSnapshot());
    }

    // Format chains to conform with frontend Radar contract
    const formattedChains = chainsData.map((c: any) => {
      const sortedNodes = (c.policy_chain_nodes || []).sort(
        (a: any, b: any) => a.step_order - b.step_order
      );

      const vInfo = volcanoMap[c.node_id] || baselineMap[c.node_id] || null;
      const bossMcq = c.boss_mcq_id
        ? bossMcqMap[c.boss_mcq_id] || CANONICAL_BOSS_MCQ_FALLBACKS[c.chain_id] || null
        : CANONICAL_BOSS_MCQ_FALLBACKS[c.chain_id] || null;

      return {
        chain_id: c.chain_id,
        title: c.title,
        node_id: c.node_id,
        primary_pillar: c.primary_pillar,
        lead_driver: c.lead_driver,
        historical_twin_pyq_id: c.historical_twin_pyq_id,
        status: c.status,
        has_sync_debt: c.has_sync_debt,
        volcano_index: vInfo ? vInfo.volcano_index : 0,
        volcano_status: vInfo ? vInfo.volcano_status : 'STABLE',
        last_tested_year: vInfo ? vInfo.last_tested_year : null,
        boss_mcq: bossMcq,
        nodes_flow: sortedNodes.map((n: any) => ({
          ring_depth: n.ring_depth,
          step_order: n.step_order,
          ministry: n.ministry,
          action: n.action,
          mutates_prior_fact: n.mutates_prior_fact,
          dispatch_id: n.dispatch_id,
          pib_url: n.pib_url,
        })),
        linked_dispatches: sortedNodes
          .map((n: any) => n.dispatch_id)
          .filter(Boolean),
      };
    });

    return res.status(200).json({
      updated_at: new Date().toISOString(),
      total_chains: formattedChains.length,
      total_entities: (entitiesData || []).length,
      chains: formattedChains,
      entities: entitiesData || [],
      topVolcanoNodes: topVolcanoNodes.slice(0, 15),
    });
  } catch (err) {
    console.error('[policy-radar] Handler error:', err);
    return res.status(200).json(getFallbackSnapshot());
  }
}

export default policyRadarHandler;
