/**
 * server-lib/cron/policy-graph-worker.ts
 *
 * Policy Ripple Radar Autonomous Graph Extractor (TASK_083 & TASK_084)
 *
 * Enforces the 6 Architectural Invariants:
 * 1. Master Syllabus Join Key: Joins to syllabus_nodes(id) and pyq_prelims(id).
 * 2. Concentric Ring Depth (0-3) vs. Chronological Sequence (step_order).
 *    Enforces UNIQUE (chain_id, dispatch_id) for idempotent retries.
 * 3. Normalized Entity Slugs & Examiner Operator Binding:
 *    Deduplicates on entity_slug (e.g. 'ENT_ISM') with aliases TEXT[].
 * 4. Context-Injected Chain Matching: Injects compact active chains directory
 *    into LLM prompt so real chain_id values are matched deterministically without pgvector.
 * 5. Quota Idempotency Guard: Enforces graph_processed_at on current_affairs so dispatches
 *    are never re-evaluated by LLM across worker cycles.
 * 6. Fact Half-Life Guardrail & Boss MCQ Synthesis: Auto-synthesizes 3-statement Boss MCQs
 *    (r0 Mandate + r1 PSY_01 Inst Swap + r2 PSY_03 Legal Tier) when chains reach >= 3 nodes.
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
  last_synthesized_node_count?: number;
  boss_mcq_id?: string;
}

export interface PolicyDispatchCandidate {
  id?: string;
  headline: string;
  ministry: string;
  summary?: any;
  url?: string;
  published_at?: string;
  graph_processed_at?: string;
}

export const CANONICAL_BOSS_MCQ_FALLBACKS: Record<string, any> = {
  CHAIN_01_SEMICON_NEXUS: {
    stem: "With reference to the India Semiconductor Mission (ISM) and Semicon 2.0 architecture, consider the following statements:",
    statements: [
      "1. Under Semicon 2.0 guidelines approved by the Union Cabinet, fiscal support of up to 50% of project cost is extended on an equal pari-passu basis for setting up Silicon Semiconductor Fabs in India.",
      "2. The operationalization of compound semiconductor units and execution of the Electronic Components and Manufacturing Scheme (ECMS) is administered directly under the statutory authority of the Ministry of Heavy Industries.",
      "3. The India Semiconductor Mission (ISM) is a statutory regulatory body established pursuant to an Act of Parliament to adjudicate technology transfer disputes."
    ],
    options: {
      a: "Only one",
      b: "Only two",
      c: "All three",
      d: "None"
    },
    official_key: "a",
    primary_operator: "PSY_01_INST_SWAP",
    secondary_operator: "PSY_03_LEGAL_TIER",
    claim_half_life_days: 231.0,
    statutory_anchor: "Cabinet Semicon 2.0 Approval / MeitY Notification ISM-2022/01",
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: "Sovereign Cabinet approval provides 50% capital subsidy on pari-passu basis for approved Silicon Fabs."
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: "PSY_01_INST_SWAP",
        marked_trap: "Ministry of Heavy Industries",
        truth_key: "Ministry of Electronics and Information Technology (MeitY) / Digital India Corporation",
        anchor: "ECMS and ISM are administered directly by MeitY, NOT Ministry of Heavy Industries."
      },
      {
        stmt_num: 3,
        is_true: false,
        operator: "PSY_03_LEGAL_TIER",
        marked_trap: "Tier-2 Statutory Regulatory Body pursuant to Act of Parliament",
        truth_key: "Tier-4 Autonomous Nodal Division / Society within Digital India Corporation",
        anchor: "ISM is an autonomous business division under Digital India Corporation (Section 8 company), NOT a statutory body established by Parliament."
      }
    ]
  },
  CHAIN_02_CIRCULAR_EWASTE: {
    stem: "With reference to the Extended Producer Responsibility (EPR) and Circular Economy framework for electrical and electronic equipment, consider the following statements:",
    statements: [
      "1. Under the E-Waste (Management) Rules, producers of electronic goods are mandated to achieve specified recycling targets through registered recyclers generating online EPR certificates.",
      "2. The centralized digital EPR portal for registering recycling certificates and monitoring trading compliance is managed directly by NITI Aayog.",
      "3. The Commission for Air Quality Management (CAQM) is an executive advisory committee constituted under an administrative order of the Ministry of Power."
    ],
    options: {
      a: "Only one",
      b: "Only two",
      c: "All three",
      d: "None"
    },
    official_key: "a",
    primary_operator: "PSY_01_INST_SWAP",
    secondary_operator: "PSY_03_LEGAL_TIER",
    claim_half_life_days: 231.0,
    statutory_anchor: "Environment (Protection) Act, 1986 / E-Waste (Management) Rules, 2022",
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: "E-Waste Rules 2022 introduce market-based EPR recycling credit trading system for registered producers."
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: "PSY_01_INST_SWAP",
        marked_trap: "NITI Aayog",
        truth_key: "Central Pollution Control Board (CPCB) / MoEFCC",
        anchor: "Centralized EPR portal and compliance enforcement is vested in CPCB under MoEFCC, NOT NITI Aayog."
      },
      {
        stmt_num: 3,
        is_true: false,
        operator: "PSY_03_LEGAL_TIER",
        marked_trap: "Executive advisory committee under Ministry of Power",
        truth_key: "Tier-2 Statutory Commission established by an Act of Parliament (CAQM Act, 2021)",
        anchor: "CAQM is a statutory body created by the Commission for Air Quality Management in NCR Act, 2021, NOT an executive advisory panel."
      }
    ]
  },
  CHAIN_03_DEFENSE_EXPORT_SURGE: {
    stem: "With reference to the Defense Indigenization and Defense Acquisition Procedure (DAP) architecture, consider the following statements:",
    statements: [
      "1. Under the Positive Indigenization Lists notified by the Ministry of Defense, embargoes are placed on the import of designated defense systems to promote domestic manufacturing.",
      "2. The issuance of industrial licenses for manufacturing defense aircraft, warships, and specialized combat equipment is regulated exclusively by the Ministry of Defense.",
      "3. The Society of Indian Defense Manufacturers (SIDM) is a statutory authority established by an Act of Parliament to set mandatory defense export quotas."
    ],
    options: {
      a: "Only one",
      b: "Only two",
      c: "All three",
      d: "None"
    },
    official_key: "a",
    primary_operator: "PSY_01_INST_SWAP",
    secondary_operator: "PSY_03_LEGAL_TIER",
    claim_half_life_days: 231.0,
    statutory_anchor: "Industries (Development & Regulation) Act, 1951 / DAP Guidelines",
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: "Defense Ministry notifications enforce progressive import bans across 500+ defense hardware items."
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: "PSY_01_INST_SWAP",
        marked_trap: "Ministry of Defense",
        truth_key: "Department for Promotion of Industry and Internal Trade (DPIIT) / Ministry of Commerce",
        anchor: "Defense industrial licensing is administered by DPIIT under IDRA 1951, in consultation with MoD."
      },
      {
        stmt_num: 3,
        is_true: false,
        operator: "PSY_03_LEGAL_TIER",
        marked_trap: "Tier-2 Statutory Authority established by Parliament",
        truth_key: "Tier-4 Apex Industry Association / Registered Society (non-statutory)",
        anchor: "SIDM is a non-governmental apex defense industry body, NOT a statutory commission created by Parliament."
      }
    ]
  }
};

/**
 * Auto-synthesizes a 3-statement Full-Chain Boss MCQ for a policy chain with >= 3 nodes.
 * Strictly adheres to Fact Half-Life Guardrail (T_1/2 >= 231 days).
 */
export async function synthesizeChainBossMcq(chainId: string): Promise<{
  ok: boolean;
  mcqId?: string;
  reason?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: "NO_DB_CONNECTION" };

  // 1. Fetch chain details
  const { data: chain, error: chainErr } = await supabase
    .from("policy_chains")
    .select("chain_id, title, node_id, primary_pillar, lead_driver, boss_mcq_id, last_synthesized_node_count")
    .eq("chain_id", chainId)
    .single();

  if (chainErr || !chain) {
    return { ok: false, reason: "CHAIN_NOT_FOUND" };
  }

  // 2. Fetch chain nodes
  const { data: nodes, error: nodesErr } = await supabase
    .from("policy_chain_nodes")
    .select("ring_depth, step_order, ministry, action, mutates_prior_fact, dispatch_id")
    .eq("chain_id", chainId)
    .order("step_order", { ascending: true });

  if (nodesErr || !nodes || nodes.length < 3) {
    return { ok: false, reason: "INSUFFICIENT_NODES" };
  }

  // 3. Partition nodes by ring
  const r0Nodes = nodes.filter((n) => n.ring_depth === 0);
  const r1Nodes = nodes.filter((n) => n.ring_depth === 1);
  const r2Nodes = nodes.filter((n) => n.ring_depth >= 2);

  const r0Text = r0Nodes.map((n) => `[${n.ministry}] ${n.action}`).join("; ") || chain.lead_driver;
  const r1Text = r1Nodes.map((n) => `[${n.ministry}] ${n.action}`).join("; ") || "Statutory regulations and ministerial notifications.";
  const r2Text = r2Nodes.map((n) => `[Ring r${n.ring_depth} // ${n.ministry}] ${n.action}`).join("; ") || "Nodal implementation and institutional guidelines.";

  // 4. Fetch entities
  const { data: entities } = await supabase
    .from("policy_entities")
    .select("authority, entity_slug, parent_ministry, tier_number, tier_name, parent_statute_or_article, neutralized_trap, trap_explanation")
    .order("appearances_count", { ascending: false })
    .limit(10);

  const entitiesJson = JSON.stringify(entities || [], null, 2);

  let parsed: any = null;

  if (llmAvailable()) {
    const prompt = `You are the Tark Adversarial Paper-Setter for UPSC Civil Services Prelims.
Synthesize ONE 3-statement "Full-Chain Boss MCQ" integrating the multi-ministry policy chain below.

POLICY CHAIN CONTEXT:
- Chain ID: ${chain.chain_id} | Title: ${chain.title} | Syllabus Node: ${chain.node_id}
- Ring r0 (Sovereign Origin): ${r0Text}
- Ring r1 (Statutory / Regulatory Rules): ${r1Text}
- Ring r2/r3 (Institutional / Nodal Execution): ${r2Text}
- Linked Regulatory Entities (5-Tier Registry): ${entitiesJson}

STRICT ENGINEERING INVARIANTS (NON-NEGOTIABLE):
1. FACT HALF-LIFE GUARDRAIL (T_1/2 >= 231 DAYS):
   - NEVER test perishable monthly figures (monthly GST numbers, short-term bond yields, weekly forex reserves).
   - Anchor strictly to Constitutional/Statutory parentage (T_1/2 = 866.4 days) and Institutional Mandates/Scheme Architecture (T_1/2 = 231.0 days).
2. 3-STATEMENT MULTI-RING ARCHITECTURE:
   - Statement 1 (Ring r0 Anchor — TRUE): Test the core sovereign mandate, statutory objective, or structural eligibility from the Root Trigger (r0).
   - Statement 2 (Ring r1 Trap — FALSE via PSY_01_INST_SWAP): Swap the executing/nodal Ministry or Department across the ministries involved in this chain (e.g., swapping MeitY with Ministry of Heavy Industries or DPIIT).
   - Statement 3 (Ring r2 Trap — FALSE via PSY_03_LEGAL_TIER): Misattribute the Legal Tier of the primary authority in ${entitiesJson} (e.g., claiming a Tier-3 Executive Division or Tier-4 Autonomous Society is a Tier-2 Statutory Body created by an Act of Parliament).
3. OPTIONS FORMAT:
   - Provide standard UPSC pair-counting options:
     (a) Only one
     (b) Only two
     (c) All three
     (d) None

Return strictly valid JSON:
{
  "stem": "With reference to ${chain.title}, consider the following statements:",
  "statements": ["1. ...", "2. ...", "3. ..."],
  "options": {
    "a": "Only one",
    "b": "Only two",
    "c": "All three",
    "d": "None"
  },
  "official_key": "a",
  "primary_operator": "PSY_01_INST_SWAP",
  "secondary_operator": "PSY_03_LEGAL_TIER",
  "claim_half_life_days": 231.0,
  "statutory_anchor": "Exact Act / Gazette / PIB Release ID",
  "statement_dissection": [
    { "stmt_num": 1, "is_true": true, "operator": null, "anchor": "..." },
    { "stmt_num": 2, "is_true": false, "operator": "PSY_01_INST_SWAP", "marked_trap": "...", "truth_key": "...", "anchor": "..." },
    { "stmt_num": 3, "is_true": false, "operator": "PSY_03_LEGAL_TIER", "marked_trap": "...", "truth_key": "...", "anchor": "..." }
  ]
}`;

    try {
      const res = await llmGenerate({ prompt, temperature: 0.1, json: true });
      if (res?.text) {
        parsed = JSON.parse(res.text);
      }
    } catch (llmErr) {
      console.warn(`[policy-graph-worker] LLM Boss MCQ error for ${chain.chain_id}:`, llmErr);
    }
  }

  // Fallback to pre-authored canonical boss MCQ if LLM cold or unparseable
  if (!parsed || !parsed.stem || !Array.isArray(parsed.statements) || parsed.statements.length !== 3) {
    if (CANONICAL_BOSS_MCQ_FALLBACKS[chain.chain_id]) {
      parsed = CANONICAL_BOSS_MCQ_FALLBACKS[chain.chain_id];
    } else {
      return { ok: false, reason: "SYNTHESIS_FAILED_NO_FALLBACK" };
    }
  }

  const keyIndexMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
  const correctIndex = keyIndexMap[String(parsed.official_key).toLowerCase()] ?? 0;
  const fullQuestion = `${parsed.stem}\n\n${parsed.statements.join("\n")}`;
  const affairUrl = `boss_mcq://${chain.chain_id}`;
  const entitySlugs: string[] = (entities || []).map((e: any) => e.entity_slug);

  const explanation = Array.isArray(parsed.statement_dissection)
    ? parsed.statement_dissection
        .map(
          (d: any) =>
            `Statement ${d.stmt_num}: ${d.is_true ? "Correct" : "Incorrect"} (${d.operator || "Anchor"}). ${
              d.is_true ? d.anchor : `${d.marked_trap} -> Truth: ${d.truth_key}`
            }`
        )
        .join("\n\n")
    : "Boss MCQ statement autopsy complete.";

  const { data: upsertedMcq, error: mcqErr } = await supabase
    .from("current_affairs_mcqs")
    .upsert(
      {
        affair_url: affairUrl,
        headline: `FULL-CHAIN BOSS MCQ: ${chain.title}`,
        question: fullQuestion,
        options: parsed.options,
        correct_index: correctIndex,
        explanation: explanation,
        subject: chain.primary_pillar,
        node_id: chain.node_id,
        chain_id: chain.chain_id,
        is_boss_mcq: true,
        primary_operator: (parsed.primary_operator as ExaminerOperatorType) || "PSY_01_INST_SWAP",
        secondary_operator: (parsed.secondary_operator as ExaminerOperatorType) || "PSY_03_LEGAL_TIER",
        entity_slugs: entitySlugs,
        claim_half_life_days: Math.max(231.0, Number(parsed.claim_half_life_days) || 231.0),
        statement_dissection: parsed.statement_dissection,
        statutory_anchor: parsed.statutory_anchor || null,
        edition_date: new Date().toISOString().slice(0, 10),
      },
      { onConflict: "affair_url" }
    )
    .select("id")
    .single();

  if (mcqErr || !upsertedMcq) {
    console.warn(`[policy-graph-worker] Failed to upsert boss MCQ for ${chain.chain_id}:`, mcqErr);
    return { ok: false, reason: mcqErr?.message || "UPSERT_FAILED" };
  }

  // Update policy_chains
  await supabase
    .from("policy_chains")
    .update({
      boss_mcq_id: upsertedMcq.id,
      last_synthesized_node_count: nodes.length,
      updated_at: new Date().toISOString(),
    })
    .eq("chain_id", chain.chain_id);

  console.log(`[policy-graph-worker] Synthesized Boss MCQ ${upsertedMcq.id} for ${chain.chain_id}`);
  return { ok: true, mcqId: upsertedMcq.id };
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

  // 0. Quota Idempotency Guard: check graph_processed_at first
  if (item.id) {
    const { data: ca } = await supabase
      .from("current_affairs")
      .select("graph_processed_at, chain_id")
      .eq("id", item.id)
      .maybeSingle();

    if (ca?.graph_processed_at) {
      return { ok: true, matched: Boolean(ca.chain_id), chain_id: ca.chain_id || undefined, reason: "ALREADY_PROCESSED" };
    }
  }

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
    if (item.id) {
      await supabase
        .from("current_affairs")
        .update({ graph_processed_at: new Date().toISOString() })
        .eq("id", item.id);
    }
    return { ok: true, matched: true, reason: "ALREADY_LINKED" };
  }

  if (!llmAvailable()) {
    return { ok: false, matched: false, reason: "LLM_UNAVAILABLE" };
  }

  // 2. Fetch active chains directory to inject into LLM prompt
  const { data: chains, error: chainsErr } = await supabase
    .from("policy_chains")
    .select("chain_id, title, node_id, lead_driver, last_synthesized_node_count, boss_mcq_id")
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
    if (!res?.text) {
      if (item.id) {
        await supabase
          .from("current_affairs")
          .update({
            graph_processed_at: new Date().toISOString(),
            chain_id: null,
            ring_depth: null,
            entity_slugs: [],
          })
          .eq("id", item.id);
      }
      return { ok: true, matched: false };
    }

    const parsed = JSON.parse(res.text);
    if (!parsed.match || !parsed.matched_chain_id) {
      if (item.id) {
        await supabase
          .from("current_affairs")
          .update({
            graph_processed_at: new Date().toISOString(),
            chain_id: null,
            ring_depth: null,
            entity_slugs: [],
          })
          .eq("id", item.id);
      }
      return { ok: true, matched: false };
    }

    const targetChain = chains.find((c: any) => c.chain_id === parsed.matched_chain_id);
    if (!targetChain) {
      console.warn(`[policy-graph-worker] LLM returned non-existent chain_id: ${parsed.matched_chain_id}`);
      if (item.id) {
        await supabase
          .from("current_affairs")
          .update({
            graph_processed_at: new Date().toISOString(),
            chain_id: null,
            ring_depth: null,
            entity_slugs: [],
          })
          .eq("id", item.id);
      }
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
    const detectedEntitySlugs: string[] = [];
    if (Array.isArray(parsed.entities)) {
      for (const ent of parsed.entities) {
        if (!ent.entity_slug || !ent.authority) continue;
        detectedEntitySlugs.push(ent.entity_slug);

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

    // Mark current_affairs row as processed
    if (item.id) {
      await supabase
        .from("current_affairs")
        .update({
          graph_processed_at: new Date().toISOString(),
          chain_id: parsed.matched_chain_id,
          ring_depth: ringDepth,
          entity_slugs: detectedEntitySlugs,
        })
        .eq("id", item.id);
    }

    // Check if chain now has >= 3 nodes and needs Boss MCQ synthesis
    if (stepOrder >= 3 && stepOrder > (targetChain.last_synthesized_node_count || 0)) {
      try {
        await synthesizeChainBossMcq(parsed.matched_chain_id);
      } catch (bossErr) {
        console.warn(`[policy-graph-worker] Non-fatal Boss MCQ error for ${parsed.matched_chain_id}:`, bossErr);
      }
    }

    return { ok: true, matched: true, chain_id: parsed.matched_chain_id, addedNodes: nodeErr ? 0 : 1 };
  } catch (err: any) {
    console.warn(`[policy-graph-worker] Error processing dispatch ${dispatchId}:`, err);
    if (item.id) {
      await supabase
        .from("current_affairs")
        .update({
          graph_processed_at: new Date().toISOString(),
          chain_id: null,
          ring_depth: null,
          entity_slugs: [],
        })
        .eq("id", item.id);
    }
    return { ok: false, matched: false, reason: err?.message || String(err) };
  }
}

export async function runPolicyGraphWorker(options: { maxDispatches?: number } = {}) {
  const limit = options.maxDispatches || 10;
  const supabase = getSupabase();

  if (!supabase) {
    console.warn("[policy-graph-worker] Supabase service role key unavailable. Aborting graph update.");
    return { ok: false, reason: "NO_DB_CONNECTION" };
  }

  console.log("[policy-graph-worker] Starting Policy Ripple Radar graph worker...");

  // Query ONLY unprocessed dispatches to prevent duplicate LLM RPD burn
  const { data: dispatches, error: dispErr } = await supabase
    .from("current_affairs")
    .select("id, headline, ministry, summary, url, published_at")
    .is("graph_processed_at", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (dispErr || !dispatches || dispatches.length === 0) {
    console.log("[policy-graph-worker] No unprocessed candidate dispatches available for ripple extraction.");
    try {
      await supabase.rpc("recompute_volcano_indices");
    } catch (rpcErr) {
      console.warn("[policy-graph-worker] Volcano recompute error:", rpcErr);
    }
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

  // Live recalculation of Volcano Index across all 137 nodes
  try {
    await supabase.rpc("recompute_volcano_indices");
  } catch (rpcErr) {
    console.warn("[policy-graph-worker] Error in recompute_volcano_indices RPC:", rpcErr);
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
