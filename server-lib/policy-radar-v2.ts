/**
 * server-lib/policy-radar-v2.ts
 *
 * Radar API v2 handlers:
 * - GET /api/policy-radar/v2
 * - GET /api/policy-radar/v2/by-dispatch?ids=<uuid,...>
 * - POST /api/policy-radar/v2/boss-mcq/:id/check
 * - GET /api/policy-radar/v2/authorities?slugs=<slug,...>
 * TASK_085P
 */

import fs from "node:fs";
import path from "node:path";
import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { buildRadarV2Payload } from "./policy/radar-v2-payload.ts";
import { isRadarPublic } from "./policy/radar-flags.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENTITY_SLUG_REGEX = /^ENT_[A-Z0-9_]{1,60}$/;

function getSupabaseClient() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key);
}

function getServiceRoleClient() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

function unavailablePayload(status: "unavailable" | "paused") {
  return {
    status,
    programs: [],
    node_signals: [],
    coverage: {
      events: 0,
      programs: 0,
      since: null,
      generated_at: new Date().toISOString(),
      last_event_at: null,
      dropped_no_evidence: 0,
    },
    version: "v2" as const,
  };
}

/**
 * GET /api/policy-radar/v2
 */
export async function radarV2Handler(req: Request, res: Response) {
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=900, stale-while-revalidate=3600"
  );

  try {
    if (process.env.NODE_ENV !== "production" && process.env.RADAR_V2_FIXTURE) {
      try {
        const fixturePath = path.resolve(process.cwd(), process.env.RADAR_V2_FIXTURE);
        if (fs.existsSync(fixturePath)) {
          const content = fs.readFileSync(fixturePath, "utf-8");
          const payload = JSON.parse(content);
          return res.status(200).json(payload);
        }
      } catch (err) {
        console.warn("[radar-v2] Failed to read fixture:", err);
      }
    }

    const isPublic = await isRadarPublic();
    if (!isPublic) {
      return res.status(200).json(unavailablePayload("paused"));
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(200).json(unavailablePayload("unavailable"));
    }

    const serviceClient = getServiceRoleClient();

    // Fetch v2 tables in parallel
    const [
      programsRes,
      eventsRes,
      edgesRes,
      gapsRes,
      mutationsRes,
      signalsRes,
      entitiesRes,
      bossMcqRes,
    ] = await Promise.all([
      supabase.from("policy_programs").select("*"),
      supabase.from("policy_events").select("*").eq("is_public", true),
      supabase.from("policy_edges").select("*"),
      supabase.from("program_gaps").select("*"),
      supabase.from("policy_fact_mutations_v").select("*"),
      supabase
        .from("node_signals")
        .select("*, syllabus_nodes(path, gloss)"),
      supabase.from("policy_entities").select("*"),
      serviceClient
        ? serviceClient
            .from("policy_boss_mcqs")
            .select("id, program_slug, question, options, edition_date")
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (programsRes.error || eventsRes.error) {
      console.warn(
        "[radar-v2] Error querying primary tables:",
        programsRes.error || eventsRes.error
      );
      return res.status(200).json(unavailablePayload("unavailable"));
    }

    const payload = buildRadarV2Payload(
      {
        programs: programsRes.data ?? [],
        events: eventsRes.data ?? [],
        edges: edgesRes.data ?? [],
        gaps: gapsRes.data ?? [],
        mutations: mutationsRes.data ?? [],
        nodeSignals: signalsRes.data ?? [],
        entities: entitiesRes.data ?? [],
        bossMcqs: bossMcqRes.data ?? [],
      },
      new Date()
    );

    return res.status(200).json(payload);
  } catch (err) {
    console.error("[radar-v2] Handler error:", err);
    return res.status(200).json(unavailablePayload("unavailable"));
  }
}

/**
 * GET /api/policy-radar/v2/by-dispatch?ids=<uuid,...>
 */
export async function radarV2ByDispatchHandler(req: Request, res: Response) {
  const idsParam = req.query.ids;
  if (typeof idsParam !== "string" || !idsParam.trim()) {
    return res.status(400).json({ error: "ids parameter required" });
  }

  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0 || ids.length > 50) {
    return res.status(400).json({ error: "Must provide between 1 and 50 ids" });
  }

  for (const id of ids) {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ error: `Invalid dispatch UUID: ${id}` });
    }
  }

  try {
    if (process.env.NODE_ENV !== "production" && process.env.RADAR_V2_FIXTURE) {
      try {
        const fixturePath = path.resolve(process.cwd(), process.env.RADAR_V2_FIXTURE);
        if (fs.existsSync(fixturePath)) {
          const content = fs.readFileSync(fixturePath, "utf-8");
          const payload = JSON.parse(content);
          if (payload && payload.by_dispatch) {
            const matched: Record<string, any> = {};
            for (const id of ids) {
              if (payload.by_dispatch[id]) {
                matched[id] = payload.by_dispatch[id];
              }
            }
            return res.status(200).json(matched);
          }
        }
      } catch (e) {
        console.warn("[radar-v2] Failed to read fixture in by-dispatch:", e);
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(200).json({});
    }

    const { data: events, error: evErr } = await supabase
      .from("policy_events")
      .select("dispatch_id, program_slug, ring_depth, instrument, evidence, is_public")
      .in("dispatch_id", ids)
      .eq("is_public", true);

    if (evErr || !events || events.length === 0) {
      return res.status(200).json({});
    }

    const progSlugs = Array.from(
      new Set(events.map((e: any) => e.program_slug).filter(Boolean))
    );

    const [progRes, gapRes] = await Promise.all([
      progSlugs.length > 0
        ? supabase
            .from("policy_programs")
            .select("program_slug, name")
            .in("program_slug", progSlugs)
        : Promise.resolve({ data: [] }),
      progSlugs.length > 0
        ? supabase
            .from("program_gaps")
            .select("program_slug, gap")
            .in("program_slug", progSlugs)
        : Promise.resolve({ data: [] }),
    ]);

    const progNames = new Map<string, string>();
    for (const p of (progRes.data ?? []) as any[]) {
      progNames.set(p.program_slug, p.name);
    }

    const gapSentences = new Map<string, string | null>();
    for (const g of (gapRes.data ?? []) as any[]) {
      const sentence = g.gap?.sentence ?? null;
      gapSentences.set(g.program_slug, sentence);
    }

    const result: Record<
      string,
      {
        program_slug: string;
        program_name: string;
        ring: number;
        instrument: string;
        gap_sentence: string | null;
        evidence: { quote: string; source_url: string; span_id?: string };
      }
    > = {};

    for (const ev of events) {
      const dId = ev.dispatch_id;
      if (!dId) continue;

      const evList = Array.isArray(ev.evidence) ? ev.evidence : [ev.evidence];
      const firstValid = evList.find(
        (x: any) =>
          x &&
          typeof x.quote === "string" &&
          x.quote.trim() &&
          typeof x.source_url === "string" &&
          x.source_url.trim()
      );

      if (!firstValid) continue;

      const pSlug = ev.program_slug;
      result[dId] = {
        program_slug: pSlug,
        program_name: progNames.get(pSlug) ?? pSlug,
        ring: ev.ring_depth ?? 0,
        instrument: ev.instrument ?? "executive_record",
        gap_sentence: gapSentences.get(pSlug) ?? null,
        evidence: {
          quote: firstValid.quote.trim(),
          source_url: firstValid.source_url.trim(),
          ...(firstValid.span_id ? { span_id: firstValid.span_id } : {}),
        },
      };
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[radar-v2] by-dispatch handler error:", err);
    return res.status(200).json({});
  }
}

/**
 * POST /api/policy-radar/v2/boss-mcq/:id/check
 */
export async function radarV2BossMcqCheckHandler(req: Request, res: Response) {
  const { choice } = req.body ?? {};
  if (typeof choice !== "number" || ![0, 1, 2, 3].includes(choice)) {
    return res
      .status(400)
      .json({ error: "Invalid choice. Must be 0, 1, 2, or 3" });
  }

  const id = req.params.id;
  if (!id || !UUID_REGEX.test(id)) {
    return res.status(404).json({ error: "MCQ not found" });
  }

  const serviceClient = getServiceRoleClient();
  if (!serviceClient) {
    return res
      .status(503)
      .json({ error: "Evaluation service role unavailable" });
  }

  try {
    const { data: row, error } = await serviceClient
      .from("policy_boss_mcqs")
      .select("correct_index, statement_dissection")
      .eq("id", id)
      .maybeSingle();

    if (error || !row) {
      return res.status(404).json({ error: "MCQ not found" });
    }

    return res.status(200).json({
      correct: choice === row.correct_index,
      correct_index: row.correct_index,
      dissection: row.statement_dissection,
    });
  } catch (err) {
    console.error("[radar-v2] Boss MCQ check error:", err);
    return res.status(500).json({ error: "Internal check error" });
  }
}

/**
 * GET /api/policy-radar/v2/authorities?slugs=<slug,...>
 */
export async function radarV2AuthoritiesHandler(req: Request, res: Response) {
  const slugsParam = req.query.slugs;
  if (typeof slugsParam !== "string" || !slugsParam.trim()) {
    return res.status(400).json({ error: "slugs parameter required" });
  }

  const slugs = slugsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (slugs.length === 0 || slugs.length > 20) {
    return res
      .status(400)
      .json({ error: "Must provide between 1 and 20 slugs" });
  }

  for (const s of slugs) {
    if (!ENTITY_SLUG_REGEX.test(s)) {
      return res.status(400).json({ error: `Invalid authority slug: ${s}` });
    }
  }

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(200).json([]);
    }

    const { data: rows, error } = await supabase
      .from("policy_entities")
      .select(
        "entity_slug, authority, tier_number, legal_basis_kind, legal_basis_ref, source_url"
      )
      .in("entity_slug", slugs)
      .eq("provenance", "registry");

    if (error || !rows) {
      return res.status(200).json([]);
    }

    const result = rows.map((r: any) => ({
      slug: r.entity_slug,
      authority: r.authority,
      tier_number: r.tier_number ?? null,
      legal_basis_kind: r.legal_basis_kind ?? null,
      legal_basis_ref: r.legal_basis_ref ?? null,
      source_url: r.source_url ?? null,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("[radar-v2] authorities handler error:", err);
    return res.status(200).json([]);
  }
}

export default radarV2Handler;
