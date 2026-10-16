import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

function getFallbackSnapshot() {
  try {
    const snapshotPath = path.resolve(process.cwd(), 'src/data/policy-radar-snapshot.json');
    if (fs.existsSync(snapshotPath)) {
      const raw = fs.readFileSync(snapshotPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[policy-radar] Snapshot read error:', err);
  }
  return { chains: [], entities: [] };
}

export default async function policyRadarHandler(req: Request, res: Response) {
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

    if (chainsErr || entitiesErr || !chainsData || chainsData.length === 0) {
      // Gracefully fall back to prebaked snapshot
      return res.status(200).json(getFallbackSnapshot());
    }

    // Format chains to conform with frontend Radar contract
    const formattedChains = chainsData.map((c: any) => {
      const sortedNodes = (c.policy_chain_nodes || []).sort(
        (a: any, b: any) => a.step_order - b.step_order
      );

      return {
        chain_id: c.chain_id,
        title: c.title,
        node_id: c.node_id,
        primary_pillar: c.primary_pillar,
        lead_driver: c.lead_driver,
        historical_twin_pyq_id: c.historical_twin_pyq_id,
        status: c.status,
        has_sync_debt: c.has_sync_debt,
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
    });
  } catch (err) {
    console.error('[policy-radar] Handler error:', err);
    return res.status(200).json(getFallbackSnapshot());
  }
}
