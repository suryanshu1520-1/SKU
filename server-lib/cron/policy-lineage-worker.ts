/**
 * server-lib/cron/policy-lineage-worker.ts
 *
 * Deterministic policy lineage rebuild worker.
 * Replaces LLM graph matching when RADAR_V2=1.
 * TASK_085J
 */

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  programParents,
  explicitReferences,
  assertAcyclic,
  type Ev,
} from "../policy/lineage.ts";
import { predict } from "../policy/logreg.ts";
import { extractLinkFeatures } from "../policy/link-features.ts";
import { buildMutationEdges } from "../policy/mutation-format.ts";
import type { LinkModelConfig } from "../../scripts/radar/fit-link-model.ts";

function loadLinkModel(): LinkModelConfig | null {
  try {
    const p = new URL("../policy/link-model.json", import.meta.url);
    const content = fs.readFileSync(p, "utf-8");
    return JSON.parse(content) as LinkModelConfig;
  } catch {
    return null;
  }
}

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface RebuildLineageOptions {
  sinceHours?: number;
}

export interface RebuildLineageResult {
  ok: boolean;
  touchedPrograms: number;
  edgesBuilt: number;
  skippedPreCutover?: number;
  error?: string;
}

/**
 * Rebuilds deterministic lineage (IMPLEMENTS & REFERENCES) for touched programs.
 */
export async function rebuildLineage(
  options: RebuildLineageOptions = {}
): Promise<RebuildLineageResult> {
  const { sinceHours = 72 } = options;
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, touchedPrograms: 0, edgesBuilt: 0, error: "Missing Supabase client" };
  }

  let skippedPreCutover = 0;

  // Pre-cutover skipping when RADAR_V2=1
  if (process.env.RADAR_V2 === "1" && process.env.RADAR_V2_SINCE) {
    try {
      const sinceDate = process.env.RADAR_V2_SINCE.trim();
      const { data, error } = await supabase
        .from("current_affairs")
        .update({ graph_status: "skipped" })
        .eq("graph_status", "pending")
        .lt("created_at", sinceDate)
        .select("id");

      if (!error && Array.isArray(data)) {
        skippedPreCutover = data.length;
      }
    } catch (skipErr) {
      console.warn("[lineage-worker] Warning skipping pre-cutover rows:", skipErr);
    }
  }

  const sinceIso = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString();

  // 1. Find programs touched within the window
  const { data: touchedEvents, error: touchedErr } = await supabase
    .from("policy_events")
    .select("program_slug")
    .eq("is_public", true)
    .not("program_slug", "is", null)
    .gte("created_at", sinceIso);

  if (touchedErr) {
    return { ok: false, touchedPrograms: 0, edgesBuilt: 0, error: touchedErr.message };
  }

  const touchedPrograms = Array.from(
    new Set((touchedEvents || []).map((e: any) => e.program_slug).filter(Boolean))
  ) as string[];

  if (touchedPrograms.length === 0) {
    return { ok: true, touchedPrograms: 0, edgesBuilt: 0, skippedPreCutover };
  }

  // 2. Load ALL public events for touched programs
  const { data: allProgramEvents, error: eventsErr } = await supabase
    .from("policy_events")
    .select("id, program_slug, ring_depth, event_date, created_at, evidence, actor_slug")
    .eq("is_public", true)
    .in("program_slug", touchedPrograms);

  if (eventsErr) {
    return { ok: false, touchedPrograms: touchedPrograms.length, edgesBuilt: 0, error: eventsErr.message };
  }

  // 3. Load aliases for all programs (for cross-program references)
  const { data: programRows, error: progErr } = await supabase
    .from("policy_programs")
    .select("program_slug, name, aliases, node_id");

  if (progErr) {
    return { ok: false, touchedPrograms: touchedPrograms.length, edgesBuilt: 0, error: progErr.message };
  }

  const aliasesByProgram = new Map<string, string[]>();
  const nodeByProgram = new Map<string, string | null>();
  for (const p of (programRows || []) as any[]) {
    const list = [p.name, ...(Array.isArray(p.aliases) ? p.aliases : [])].filter(Boolean);
    aliasesByProgram.set(p.program_slug, list);
    nodeByProgram.set(p.program_slug, p.node_id ?? null);
  }

  // 4. Map DB rows to pure Ev[]
  const byId = new Map<string, Ev>();
  const events: Ev[] = (allProgramEvents || []).map((row: any) => {
    const text = (Array.isArray(row.evidence) ? row.evidence : [])
      .map((e: any) => (typeof e?.quote === "string" ? e.quote : ""))
      .join(" ");

    const ev: Ev = {
      id: row.id,
      program: row.program_slug,
      ring: row.ring_depth,
      date: row.event_date,
      createdAt: row.created_at,
      text,
    };
    byId.set(ev.id, ev);
    return ev;
  });

  // 5. Compute deterministic edges
  const parents = programParents(events);
  const refs = explicitReferences(events, aliasesByProgram);

  type EdgeRow = {
    src_event: string;
    dst_event: string;
    edge_type: "IMPLEMENTS" | "REFERENCES" | "AMENDS";
    anchor_kind: "shared_program" | "explicit_reference" | "learned" | "fact_mutation";
    p: number | null;
    model_version: string;
  };

  const allEdges: EdgeRow[] = [];

  for (const [id, parentId] of parents.entries()) {
    if (parentId) {
      allEdges.push({
        src_event: parentId,
        dst_event: id,
        edge_type: "IMPLEMENTS",
        anchor_kind: "shared_program",
        p: null,
        model_version: "lineage_v1",
      });
    }
  }

  for (const ref of refs) {
    allEdges.push({
      src_event: ref.src,
      dst_event: ref.dst,
      edge_type: "REFERENCES",
      anchor_kind: "explicit_reference",
      p: null,
      model_version: "lineage_v1",
    });
  }

  // 5b. Mutation AMENDS edges from policy_fact_mutations_v
  try {
    const { data: mutationRows, error: mutErr } = await supabase
      .from("policy_fact_mutations_v")
      .select("mutation_id, action, src_event, dst_event")
      .not("src_event", "is", null)
      .not("dst_event", "is", null);

    if (!mutErr && mutationRows) {
      const { edges: mutationEdges } = buildMutationEdges(
        mutationRows as any,
        byId,
        (conflict) => {
          console.warn("[lineage-worker] mutation_order_conflict:", conflict);
        }
      );
      for (const me of mutationEdges) {
        allEdges.push(me);
      }
    }
  } catch (mutCatchErr) {
    console.warn("[lineage-worker] Non-fatal error loading fact mutations:", mutCatchErr);
  }

  // 6. Learned ripple edges (only when link-model passed AND RADAR_LINK_MODEL=1)
  const linkModel = loadLinkModel();
  if (linkModel?.passed && process.env.RADAR_LINK_MODEL === "1" && linkModel.tau !== null) {
    const tau = linkModel.tau;
    for (let i = 0; i < events.length; i++) {
      for (let j = 0; j < events.length; j++) {
        if (i === j) continue;
        const f = events[i];
        const e = events[j];
        if (f.date > e.date) continue;
        if (f.program && e.program && f.program === e.program) continue;

        const fRaw = (allProgramEvents || [])[i] as any;
        const eRaw = (allProgramEvents || [])[j] as any;
        const feats = extractLinkFeatures(
          {
            id: f.id,
            ring: f.ring,
            date: f.date,
            actor_slug: fRaw?.actor_slug ?? null,
            node_id: f.program ? (nodeByProgram.get(f.program) ?? null) : null,
          },
          {
            id: e.id,
            ring: e.ring,
            date: e.date,
            actor_slug: eRaw?.actor_slug ?? null,
            node_id: e.program ? (nodeByProgram.get(e.program) ?? null) : null,
          }
        );

        if (feats[0] === 1 || feats[1] === 1) {
          const prob = predict(linkModel.w, linkModel.b, feats);
          if (prob >= tau) {
            allEdges.push({
              src_event: f.id,
              dst_event: e.id,
              edge_type: "REFERENCES",
              anchor_kind: "learned",
              p: prob,
              model_version: linkModel.version || "link_v1",
            });
          }
        }
      }
    }
  }

  // Invariant verification: graph must be acyclic
  try {
    assertAcyclic(
      allEdges.map((e) => ({ src: e.src_event, dst: e.dst_event })),
      byId
    );
  } catch (cycleErr: any) {
    return {
      ok: false,
      touchedPrograms: touchedPrograms.length,
      edgesBuilt: 0,
      error: `Cycle assertion failed: ${cycleErr?.message ?? cycleErr}`,
    };
  }

  // 6. Per program replace edges using replace_program_edges RPC
  const eventProgramMap = new Map<string, string>();
  for (const ev of events) {
    if (ev.program) {
      eventProgramMap.set(ev.id, ev.program);
    }
  }

  for (const prog of touchedPrograms) {
    const programEdges = allEdges.filter(
      (e) => eventProgramMap.get(e.dst_event) === prog
    );

    const { error: rpcErr } = await supabase.rpc("replace_program_edges", {
      p_program: prog,
      p_edges: programEdges,
    });

    if (rpcErr) {
      console.warn(`[lineage-worker] Warning replacing edges for program ${prog}:`, rpcErr.message);
    }
  }

  return {
    ok: true,
    touchedPrograms: touchedPrograms.length,
    edgesBuilt: allEdges.length,
    skippedPreCutover,
  };
}
