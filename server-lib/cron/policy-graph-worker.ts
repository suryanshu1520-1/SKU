/**
 * server-lib/cron/policy-graph-worker.ts
 *
 * Policy Ripple Radar Autonomous Graph Extractor (TASK_083 Workstream 6)
 *
 * Enforces the 5 Architectural Invariants:
 * 1. Master Syllabus Join Key: Joins to syllabus_nodes(id) and pyq_prelims(id).
 * 2. Concentric Ring Depth (0-3) vs. Chronological Sequence (step_order).
 *    Enforces UNIQUE (chain_id, dispatch_id) for idempotent retries.
 * 3. Normalized Entity Slugs & Examiner Operator Binding:
 *    Deduplicates on entity_slug (e.g. 'ENT_ISM') with aliases TEXT[].
 * 4. Context-Injected Chain Matching: Injects compact active chains directory
 *    into LLM prompt so real chain_id values are matched deterministically without pgvector.
 * 5. Edge Caching: Ensured via Cache-Control on /api/policy-radar.
 */

import "../load-env.js";
import { createClient } from "@supabase/supabase-js";
import { llmGenerate, llmAvailable } from "../llm.js";
import type { ExaminerOperatorType } from "../analytics/examiner_psyche.js";

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface ActiveChainDirectoryItem {
  chain_id: string;
  title: string;
  node_id: string;
  lead_driver: string;
}

export interface PolicyDispatchCandidate {
  id?: string;
  headline: string;
  ministry: string;
  summary?: any;
  url?: string;
  published_at?: string;
}

/**
 * Process a single policy dispatch into the Policy Ripple Radar graph.
 * Non-blocking, idempotent, and matches against active chains directory.
 */
export async function processDispatchIntoPolicyGraph(item: PolicyDispatchCandidate): Promise<{
  ok: boolean;
  matched: boolean;
  chain_id?: string;
  addedNodes?: number;
  reason?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, matched: false, reason: "NO_DB_CONNECTION" };
  }

  const dispatchId = item.id || item.url || item.headline;

  // 1. Check if this dispatch has already been linked to any chain
  let query = supabase.from("policy_chain_nodes").select("id");
  if (item.id && item.url) {
    query = query.or(`dispatch_id.eq.${item.id},pib_url.eq.${item.url}`);
  } else if (item.id) {
    query = query.eq("dispatch_id", item.id);
  } else if (item.url) {
    query = query.eq("pib_url", item.url);
  } else {
    query = query.eq("action", item.headline);
  }

  const { data: existingNode } = await query.maybeSingle();
  if (existingNode) {
    return { ok: true, matched: true, reason: "ALREADY_LINKED" };
  }

  if (!llmAvailable()) {
    return { ok: false, matched: false, reason: "LLM_UNAVAILABLE" };
  }

  // 2. Fetch active chains directory to inject into LLM prompt
  const { data: chains, error: chainsErr } = await supabase
    .from("policy_chains")
    .select("chain_id, title, node_id, lead_driver")
    .eq("status", "active");

  if (chainsErr || !chains || chains.length === 0) {
    return { ok: true, matched: false, reason: "NO_ACTIVE_CHAINS" };
  }

  const activeChainsDir = chains
    .map((c: ActiveChainDirectoryItem) => `[${c.chain_id}] "${c.title}" (Node: ${c.node_id}, Driver: ${c.lead_driver})`)
    .join("\n");

  const bullets = Array.isArray(item.summary?.bullets) ? item.summary.bullets.join("\n") : "";
  const prompt = `You are a Senior Policy Graph Analyst for the Indian Civil Services intelligence arena.

ACTIVE CHAINS DIRECTORY:
${activeChainsDir}

DISPATCH CANDIDATE:
Headline: ${item.headline}
Ministry/Authority: ${item.ministry}
Summary Bullets:
${bullets}

TASK:
1. Determine if this dispatch belongs to one of the ACTIVE CHAINS above as an inter-ministerial ripple or policy consequence.
2. If it matches an active chain, identify:
   - "matched_chain_id": Exactly one chain_id from the ACTIVE CHAINS DIRECTORY (or null if no match).
   - "ring_depth": Integer between 0 and 3:
       0: Sovereign Origin (Cabinet approval, PMO announcement, root policy trigger)
       1: Statutory/Rules (Act, Gazette notification, statutory amendment, formal rules)
       2: Nodal Execution (SPV operationalization, autonomous board guidelines, inter-ministerial execution)
       3: Rollout/Federal (State implementation, capex tenders, tariff adjustments, public delivery)
   - "action": Exactly 1 concise sentence (maximum 16 words) describing the specific administrative action taken.
   - "mutates_prior_fact": Boolean (true if this changes a prior outlay, timeline, or rule).
   - "entities": Array of public bodies/authorities mentioned, where each entity has:
       * "authority": Formal display name (e.g. "India Semiconductor Mission")
       * "entity_slug": Canonical UPPERCASE slug (e.g. "ENT_ISM", "ENT_NFRA", "ENT_RBI", "ENT_SEBI")
       * "aliases": Array of string aliases (e.g. ["ISM", "India Semiconductor Mission"])
       * "parent_ministry": Parent ministry name
       * "tier_number": 1 (Constitutional), 2 (Statutory), 3 (Executive), 4 (Section-8 Society), 5 (PSU)
       * "tier_name": Formal category name (e.g. "Statutory regulators", "Industry societies")
       * "parent_statute_or_article": Statutory Act or Constitutional Article anchor (e.g. "Companies Act, 2013 §132")
       * "tier_description": Brief 1-line description of authority type
       * "neutralized_trap": One of ["PSY_01_INST_SWAP", "PSY_02_QUAL_POLARITY", "PSY_03_LEGAL_TIER", "PSY_04_CAUSAL_INV", "PSY_05_SCOPE_MUTATE", "PSY_06_PAIR_DECOY", "PSY_07_TRUE_NON_CAUSAL"]
       * "trap_explanation": Exactly 1 sentence warning candidates against the examiner trap.

If the dispatch has NO causal linkage to any listed chain, return:
{ "match": false }

Return STRICT JSON matching:
{
  "match": boolean,
  "matched_chain_id"?: string,
  "ring_depth"?: number,
  "action"?: string,
  "mutates_prior_fact"?: boolean,
  "entities"?: Array<{
    "authority": string,
    "entity_slug": string,
    "aliases": string[],
    "parent_ministry": string,
    "tier_number": number,
    "tier_name": string,
    "parent_statute_or_article": string,
    "tier_description": string,
    "neutralized_trap": string,
    "trap_explanation": string
  }>
}`;

  try {
    const res = await llmGenerate({ prompt, temperature: 0.1, json: true });
    if (!res?.text) return { ok: true, matched: false };

    const parsed = JSON.parse(res.text);
    if (!parsed.match || !parsed.matched_chain_id) {
      return { ok: true, matched: false };
    }

    const targetChain = chains.find((c: any) => c.chain_id === parsed.matched_chain_id);
    if (!targetChain) {
      console.warn(`[policy-graph-worker] LLM returned non-existent chain_id: ${parsed.matched_chain_id}`);
      return { ok: true, matched: false, reason: "UNKNOWN_CHAIN_ID" };
    }

    const { count } = await supabase
      .from("policy_chain_nodes")
      .select("id", { count: "exact", head: true })
      .eq("chain_id", parsed.matched_chain_id);

    const stepOrder = (count || 0) + 1;
    const ringDepth = Math.max(0, Math.min(3, typeof parsed.ring_depth === "number" ? parsed.ring_depth : 2));

    const { error: nodeErr } = await supabase.from("policy_chain_nodes").insert({
      chain_id: parsed.matched_chain_id,
      ring_depth: ringDepth,
      step_order: stepOrder,
      ministry: item.ministry || "Government of India",
      action: parsed.action || item.headline,
      mutates_prior_fact: Boolean(parsed.mutates_prior_fact),
      dispatch_id: item.id || null,
      pib_url: item.url || null,
      published_at: item.published_at || new Date().toISOString(),
    });

    if (!nodeErr) {
      console.log(`[policy-graph-worker] Added ripple node to ${parsed.matched_chain_id} (Ring ${ringDepth}, Step ${stepOrder})`);

      if (parsed.mutates_prior_fact) {
        await supabase
          .from("policy_chains")
          .update({ has_sync_debt: true, updated_at: new Date().toISOString() })
          .eq("chain_id", parsed.matched_chain_id);
      }
    }

    // Process entities
    if (Array.isArray(parsed.entities)) {
      for (const ent of parsed.entities) {
        if (!ent.entity_slug || !ent.authority) continue;

        const { data: existingEnt } = await supabase
          .from("policy_entities")
          .select("id, appearances_count, aliases")
          .or(`entity_slug.eq.${ent.entity_slug},aliases.cs.{"${ent.authority}"}`)
          .maybeSingle();

        if (existingEnt) {
          const currentAliases: string[] = existingEnt.aliases || [];
          const mergedAliases = Array.from(new Set([...currentAliases, ...(ent.aliases || []), ent.authority]));
          await supabase
            .from("policy_entities")
            .update({
              appearances_count: (existingEnt.appearances_count || 1) + 1,
              aliases: mergedAliases,
              last_dispatch_id: item.id || null,
              last_seen_at: new Date().toISOString(),
            })
            .eq("id", existingEnt.id);
        } else {
          await supabase.from("policy_entities").insert({
            entity_slug: ent.entity_slug,
            authority: ent.authority,
            aliases: ent.aliases || [ent.authority],
            parent_ministry: ent.parent_ministry || item.ministry || "Central Government",
            appearances_count: 1,
            tier_number: Math.max(1, Math.min(5, ent.tier_number || 3)),
            tier_name: ent.tier_name || "Executive divisions",
            parent_statute_or_article: ent.parent_statute_or_article || null,
            tier_description: ent.tier_description || "Public administrative body",
            neutralized_trap: (ent.neutralized_trap as ExaminerOperatorType) || "PSY_03_LEGAL_TIER",
            trap_explanation: ent.trap_explanation || "Verify statutory vs executive origin.",
            last_dispatch_id: item.id || null,
            last_seen_at: new Date().toISOString(),
          });
        }
      }
    }

    return { ok: true, matched: true, chain_id: parsed.matched_chain_id, addedNodes: nodeErr ? 0 : 1 };
  } catch (err: any) {
    console.warn(`[policy-graph-worker] Error processing dispatch ${dispatchId}:`, err);
    return { ok: false, matched: false, reason: err?.message || String(err) };
  }
}

export async function runPolicyGraphWorker(options: { maxDispatches?: number } = {}) {
  const limit = options.maxDispatches || 15;
  const supabase = getSupabase();

  if (!supabase) {
    console.warn("[policy-graph-worker] Supabase service role key unavailable. Aborting graph update.");
    return { ok: false, reason: "NO_DB_CONNECTION" };
  }

  console.log("[policy-graph-worker] Starting Policy Ripple Radar graph worker...");

  const { data: dispatches, error: dispErr } = await supabase
    .from("current_affairs")
    .select("id, headline, ministry, summary, url, published_at")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (dispErr || !dispatches || dispatches.length === 0) {
    console.log("[policy-graph-worker] No candidate dispatches available for ripple extraction.");
    return { ok: true, processed: 0, addedNodes: 0 };
  }

  let addedNodes = 0;
  for (const item of dispatches) {
    try {
      const res = await processDispatchIntoPolicyGraph(item);
      if (res.addedNodes) addedNodes += res.addedNodes;
    } catch (err) {
      console.warn(`[policy-graph-worker] Non-fatal error processing ${item.id}:`, err);
    }
  }

  console.log(`[policy-graph-worker] Cycle complete: processed ${dispatches.length} dispatches, added ${addedNodes} nodes.`);
  return { ok: true, processed: dispatches.length, addedNodes };
}

if (process.argv[1]?.includes("policy-graph-worker")) {
  runPolicyGraphWorker()
    .then((res) => {
      console.log("[policy-graph-worker] Finished with result:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[policy-graph-worker] Uncaught fatal error:", err);
      process.exit(1);
    });
}
