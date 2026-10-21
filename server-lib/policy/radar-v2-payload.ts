/**
 * server-lib/policy/radar-v2-payload.ts
 *
 * Pure payload builder for Radar API v2.
 * Validates public events, guarantees evidence on every public item,
 * orders programs by latest event date, and tracks coverage & staleness.
 * TASK_085P
 */

import type {
  RadarV2,
  Program,
  LineageNode,
  Evidence,
  Coverage,
  NodeSignalV2,
  ProgramRipple,
} from "../../src/lib/policy-radar-v2-types.js";
import { compareEv, programParents, type Ev } from "./lineage.js";
import { formatChange, type FormatChangeInput } from "./mutation-format.js";
import { NODES } from "../cron/ingest/syllabus/nodes.js";

export interface RadarV2InputRows {
  programs?: any[];
  events?: any[];
  edges?: any[];
  gaps?: any[];
  mutations?: any[];
  nodeSignals?: any[];
  entities?: any[];
  bossMcqs?: any[];
  syllabusNodes?: any[];
}

export interface BuildRadarV2Options {
  staleAfterHours?: number;
  maxPrograms?: number;
}

function getValidEvidenceList(event: any): Evidence[] | null {
  if (!event || !event.evidence) return null;
  const list = Array.isArray(event.evidence) ? event.evidence : [event.evidence];
  if (list.length === 0) return null;

  const valid: Evidence[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") return null;
    const quote = typeof item.quote === "string" ? item.quote.trim() : "";
    const source_url =
      typeof item.source_url === "string" ? item.source_url.trim() : "";
    if (!quote || !source_url) {
      return null;
    }
    valid.push({
      quote,
      source_url,
      ...(item.span_id ? { span_id: item.span_id } : {}),
    });
  }

  return valid.length > 0 ? valid : null;
}

export function buildRadarV2Payload(
  rows: RadarV2InputRows,
  now: Date,
  opts?: BuildRadarV2Options
): RadarV2 {
  const staleAfterHours = opts?.staleAfterHours ?? 72;
  const maxPrograms = opts?.maxPrograms ?? 40;

  const rawPrograms = rows.programs ?? [];
  const rawEvents = rows.events ?? [];
  const rawEdges = rows.edges ?? [];
  const rawGaps = rows.gaps ?? [];
  const rawMutations = rows.mutations ?? [];
  const rawSignals = rows.nodeSignals ?? [];
  const rawEntities = rows.entities ?? [];
  const rawBossMcqs = rows.bossMcqs ?? [];

  // 1. Entities map
  const entitiesMap = new Map<string, any>();
  for (const ent of rawEntities) {
    const slug = ent.entity_slug ?? ent.slug;
    if (slug) {
      entitiesMap.set(slug, ent);
    }
  }

  // 2. Filter public events and validate evidence
  let droppedNoEvidence = 0;
  const validPublicEvents: Array<{ row: any; evidence: Evidence[]; ev: Ev }> = [];
  const eventsByProgram = new Map<
    string,
    Array<{ row: any; evidence: Evidence[]; ev: Ev }>
  >();

  for (const row of rawEvents) {
    const isPublic = row.is_public === true;
    if (!isPublic) {
      continue;
    }

    const validEv = getValidEvidenceList(row);
    if (!validEv) {
      droppedNoEvidence++;
      continue;
    }

    const progSlug = row.program_slug;
    if (!progSlug) {
      continue;
    }

    const ev: Ev = {
      id: row.id ?? row.event_id,
      program: progSlug,
      ring: (row.ring_depth ?? row.ring ?? 0) as 0 | 1 | 2 | 3,
      date: row.event_date,
      createdAt: row.created_at ?? row.event_date,
      text: row.summary ?? "",
    };

    const item = { row, evidence: validEv, ev };
    validPublicEvents.push(item);

    let list = eventsByProgram.get(progSlug);
    if (!list) {
      list = [];
      eventsByProgram.set(progSlug, list);
    }
    list.push(item);
  }

  // 3. Compute program lineage order and parents via compareEv & programParents
  const keptEventsById = new Map<string, { row: any; evidence: Evidence[]; ev: Ev }>();
  for (const item of validPublicEvents) {
    keptEventsById.set(item.ev.id, item);
  }

  const allPublicEvList = validPublicEvents.map((i) => i.ev);
  const parentMap = programParents(allPublicEvList);

  // 4. Programs lookup & latest date calculation
  const programsMap = new Map<string, any>();
  for (const p of rawPrograms) {
    const slug = p.program_slug ?? p.slug;
    if (slug) {
      programsMap.set(slug, p);
    }
  }

  const programSummaries: Array<{
    slug: string;
    latestDate: string;
    items: Array<{ row: any; evidence: Evidence[]; ev: Ev }>;
  }> = [];

  for (const [slug, items] of eventsByProgram.entries()) {
    if (items.length === 0) continue;
    // Sort items within program by compareEv
    items.sort((a, b) => compareEv(a.ev, b.ev));
    const latestDate = items[items.length - 1].ev.date;
    programSummaries.push({ slug, latestDate, items });
  }

  // Sort programs by latest event date desc, ties by slug asc
  programSummaries.sort((a, b) => {
    if (a.latestDate < b.latestDate) return 1;
    if (a.latestDate > b.latestDate) return -1;
    return a.slug.localeCompare(b.slug);
  });

  const topPrograms = programSummaries.slice(0, maxPrograms);

  // 5. Gaps map
  const gapsMap = new Map<string, any>();
  for (const g of rawGaps) {
    const slug = g.program_slug ?? g.slug;
    if (slug) {
      gapsMap.set(slug, g.gap ?? g);
    }
  }

  // 6. Boss MCQ map (only safe fields: id, question, options, edition_date)
  const bossMcqMap = new Map<
    string,
    { id: string; question: string; options: string[]; edition_date: string }
  >();
  for (const m of rawBossMcqs) {
    const pSlug = m.program_slug;
    if (pSlug && m.id && m.question && Array.isArray(m.options)) {
      bossMcqMap.set(pSlug, {
        id: m.id,
        question: m.question,
        options: m.options,
        edition_date: m.edition_date,
      });
    }
  }

  // 7. Mutations map
  const mutationsByProgram = new Map<
    string,
    Array<{ headline: string; effectiveAt: string | null; sources: Array<{ quote: string; url: string }>; event_id: string }>
  >();

  for (const m of rawMutations) {
    const pSlug = m.program_slug;
    const eventId = m.dst_event ?? m.event_id;
    if (!pSlug || !eventId) continue;

    const formatted = formatChange({
      metric: m.metric ?? "",
      unit: m.unit,
      prevValueText: m.prev_value_text,
      curValueText: m.cur_value_text,
      prev: m.prev,
      cur: m.cur,
      prevQuote: m.prev_quote,
      curQuote: m.cur_quote,
      prevUrl: m.prev_url,
      curUrl: m.cur_url,
      effectiveAt: m.effective_at ?? m.effectiveAt,
    });

    let list = mutationsByProgram.get(pSlug);
    if (!list) {
      list = [];
      mutationsByProgram.set(pSlug, list);
    }
    list.push({
      ...formatted,
      event_id: eventId,
    });
  }

  // 8. Edges for ripples
  // REFERENCES edges: src = last prior event of referenced prog, dst = referencing event
  // Upstream: dst is in X (X cites other)
  // Downstream: src is in X (other cites X)
  const ripplesByProgram = new Map<string, ProgramRipple[]>();

  for (const edge of rawEdges) {
    if (edge.edge_type !== "REFERENCES") continue;
    if (edge.anchor_kind === "learned" && (edge.p === null || edge.p === undefined)) {
      continue;
    }

    const srcItem = keptEventsById.get(edge.src_event);
    const dstItem = keptEventsById.get(edge.dst_event);
    if (!srcItem || !dstItem) continue;

    const srcProg = srcItem.ev.program;
    const dstProg = dstItem.ev.program;
    if (!srcProg || !dstProg || srcProg === dstProg) continue;

    // Upstream for dstProg
    let upList = ripplesByProgram.get(dstProg);
    if (!upList) {
      upList = [];
      ripplesByProgram.set(dstProg, upList);
    }
    const srcProgMeta = programsMap.get(srcProg);
    upList.push({
      direction: "upstream",
      other_program: srcProg,
      other_name: srcProgMeta?.name ?? srcProg,
      anchor_kind: edge.anchor_kind,
      p: edge.p ?? null,
      evidence: dstItem.evidence[0],
    });

    // Downstream for srcProg
    let downList = ripplesByProgram.get(srcProg);
    if (!downList) {
      downList = [];
      ripplesByProgram.set(srcProg, downList);
    }
    const dstProgMeta = programsMap.get(dstProg);
    downList.push({
      direction: "downstream",
      other_program: dstProg,
      other_name: dstProgMeta?.name ?? dstProg,
      anchor_kind: edge.anchor_kind,
      p: edge.p ?? null,
      evidence: dstItem.evidence[0],
    });
  }

  // 9. Build Program array
  const programs: Program[] = [];
  const keptEventsInPayload: Ev[] = [];

  for (const prog of topPrograms) {
    const pMeta = programsMap.get(prog.slug);
    const name = pMeta?.name ?? prog.slug;
    const kind = pMeta?.kind ?? "scheme";
    const nodal = pMeta?.nodal_authority_slug ?? pMeta?.nodal ?? null;

    const nodes: LineageNode[] = prog.items.map((item) => {
      keptEventsInPayload.push(item.ev);
      const actorSlug = item.row.actor_slug;
      let actor: LineageNode["actor"] = null;
      if (actorSlug) {
        const ent = entitiesMap.get(actorSlug);
        if (ent) {
          actor = {
            slug: ent.entity_slug ?? ent.slug ?? actorSlug,
            name: ent.authority ?? ent.name ?? actorSlug,
            tier: ent.tier_number ?? ent.tier ?? null,
            legal_basis_ref: ent.legal_basis_ref ?? null,
          };
        }
      }

      return {
        event_id: item.ev.id,
        event_date: item.ev.date,
        date_source: item.row.date_source ?? "release_meta",
        ring: item.ev.ring,
        instrument: item.row.instrument ?? "executive_record",
        actor,
        summary: item.ev.text,
        evidence: item.evidence,
        parent_event_id: parentMap.get(item.ev.id) ?? null,
      };
    });

    programs.push({
      slug: prog.slug,
      name,
      kind,
      nodal,
      nodes,
      gap: gapsMap.get(prog.slug) ?? null,
      mutations: mutationsByProgram.get(prog.slug) ?? [],
      boss_mcq: bossMcqMap.get(prog.slug) ?? null,
      ripples: ripplesByProgram.get(prog.slug) ?? [],
    });
  }

  // 10. Node signals with syllabus node title
  const syllabusPathMap = new Map<string, string[]>();
  for (const n of NODES) {
    syllabusPathMap.set(n.id, n.path);
  }
  for (const sn of rows.syllabusNodes ?? []) {
    if (sn?.id && sn?.path) {
      syllabusPathMap.set(sn.id, Array.isArray(sn.path) ? sn.path : [sn.path]);
    }
  }

  const node_signals: NodeSignalV2[] = rawSignals.map((sig) => {
    let title = sig.node_id;
    if (sig.syllabus_nodes?.path) {
      const p = sig.syllabus_nodes.path;
      title = Array.isArray(p) ? p[p.length - 1] : String(p);
    } else if (syllabusPathMap.has(sig.node_id)) {
      const p = syllabusPathMap.get(sig.node_id)!;
      title = p[p.length - 1];
    } else if (sig.title) {
      title = sig.title;
    }

    return {
      node_id: sig.node_id,
      x_recent: sig.x_recent ?? 0,
      n_baseline: sig.n_baseline ?? 0,
      expected: sig.expected ?? 0,
      p: sig.p ?? 1,
      score: sig.score ?? 0,
      surging: Boolean(sig.surging),
      exam_weight: sig.exam_weight ?? 0,
      computed_at: sig.computed_at ?? now.toISOString(),
      title,
    };
  });

  // 11. Coverage & Staleness
  let lastEventAt: string | null = null;
  let since: string | null = null;

  for (const ev of keptEventsInPayload) {
    if (!lastEventAt || ev.date > lastEventAt) {
      lastEventAt = ev.date;
    }
    if (!since || ev.date < since) {
      since = ev.date;
    }
  }

  const coverage: Coverage = {
    events: keptEventsInPayload.length,
    programs: programs.length,
    since,
    generated_at: now.toISOString(),
    last_event_at: lastEventAt,
    dropped_no_evidence: droppedNoEvidence,
  };

  let status: RadarV2["status"] = "ok";
  if (lastEventAt) {
    const lastDateMs = new Date(lastEventAt).getTime();
    const diffHours = (now.getTime() - lastDateMs) / (1000 * 3600);
    if (diffHours > staleAfterHours) {
      status = "stale";
    }
  }

  return {
    status,
    programs,
    node_signals,
    coverage,
    version: "v2",
  };
}
