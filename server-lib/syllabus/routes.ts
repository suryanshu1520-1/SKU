/**
 * server-lib/syllabus/routes.ts
 *
 * Versioned Read Endpoints for Syllabus Graph, Question References & Practice History.
 * Implements the 5 core contracts specified in docs/library/study-library-audit-and-plan.md.
 */

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { authenticateBearer } from "../auth/middleware.js";
import {
  CANONICAL_NODE_IDS,
  STUDY_RESOURCE_MAPPINGS,
  isValidCanonicalNodeId,
  getResourcesForCanonicalNode,
} from "../../src/lib/syllabus-mapping.js";
import { STUDY_SUBJECTS, STUDY_RESOURCES } from "../../src/lib/study-library.js";
import { isCleanPrelimsRow } from "../analytics/examiner_psyche.js";

function cleanEnv(val?: string): string {
  if (!val) return "";
  let cleaned = val.trim();
  while (cleaned.startsWith('"') || cleaned.startsWith("'")) cleaned = cleaned.substring(1);
  while (cleaned.endsWith('"') || cleaned.endsWith("'")) cleaned = cleaned.substring(0, cleaned.length - 1);
  return cleaned.trim();
}

let supabaseInstance: any = null;
function getSupabase() {
  if (!supabaseInstance) {
    const url = cleanEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
    const key = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
    if (!url || !key) throw new Error("Supabase credentials missing for syllabus routes");
    supabaseInstance = createClient(url, key, { auth: { persistSession: false } });
  }
  return supabaseInstance;
}

export const syllabusRouter = Router();

// ===========================================================================
// 1. GET /api/syllabus/catalog
// ===========================================================================
syllabusRouter.get("/catalog", async (req: Request, res: Response) => {
  res.set("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
  try {
    const paperFilter = typeof req.query.paper === "string" ? req.query.paper.toUpperCase() : undefined;
    const sb = getSupabase();

    let query = sb.from("syllabus_nodes").select("id, paper, parent, path, gloss");
    if (paperFilter) {
      query = query.eq("paper", paperFilter);
    }
    const { data: dbNodes, error: nodeErr } = await query;

    if (nodeErr) {
      return res.status(500).json({ success: false, error: "DATABASE_ERROR", message: nodeErr.message });
    }

    const nodesList = (dbNodes || []).map((n: any) => {
      const linked = getResourcesForCanonicalNode(n.id);
      return {
        id: n.id,
        paper: n.paper,
        parent: n.parent,
        path: n.path || [],
        gloss: n.gloss,
        resourceCount: linked.length,
      };
    });

    const subjects = STUDY_SUBJECTS.map((s) => {
      const resources = STUDY_RESOURCES.filter((r) => r.subjectId === s.id);
      return {
        id: s.id,
        title: s.title,
        badge: s.paperLabel,
        canonicalPapers: [s.paper],
        resourceCount: resources.length,
      };
    });

    res.json({
      success: true,
      version: "2026.10",
      dataVersion: "pyq-25yr-v2",
      computedAt: new Date().toISOString(),
      status: "available",
      subjects,
      nodes: nodesList,
      totalNodes: nodesList.length,
      mappingVersion: "v1.0",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: error.message });
  }
});

// ===========================================================================
// 2. GET /api/syllabus/nodes/:nodeId
// ===========================================================================
syllabusRouter.get("/nodes/:nodeId", async (req: Request, res: Response) => {
  const nodeId = req.params.nodeId;

  if (!isValidCanonicalNodeId(nodeId)) {
    return res.status(404).json({
      success: false,
      error: "UNKNOWN_NODE",
      message: `Node '${nodeId}' is not recognized in the canonical syllabus taxonomy.`,
    });
  }

  res.set("Cache-Control", "public, max-age=1800, s-maxage=1800, stale-while-revalidate=43200");
  try {
    const sb = getSupabase();
    const [nodeRes, analyticsRes, prelimsCountRes, mainsCountRes] = await Promise.all([
      sb.from("syllabus_nodes").select("*").eq("id", nodeId).maybeSingle(),
      sb.from("pyq_node_analytics").select("*").eq("node_id", nodeId).maybeSingle(),
      sb.from("pyq_prelims").select("id", { count: "exact", head: true }).eq("node_id", nodeId),
      sb.from("pyq_mains").select("id", { count: "exact", head: true }).eq("node_id", nodeId),
    ]);

    if (!nodeRes.data) {
      return res.status(404).json({
        success: false,
        error: "UNKNOWN_NODE",
        message: `Node '${nodeId}' not found in active database.`,
      });
    }

    const n = nodeRes.data;
    const a = analyticsRes.data || {};
    const linkedResources = getResourcesForCanonicalNode(nodeId).map(({ resourceId, relationType }) => {
      const resObj = STUDY_RESOURCES.find((r) => r.id === resourceId);
      return {
        resourceId,
        subjectId: resObj?.subjectId || "gs2-polity",
        title: resObj?.title || resourceId,
        kind: resObj?.kind || "note",
        relationType,
        sourceStatus: resObj?.sourceStatus || "editorial",
      };
    });

    res.json({
      success: true,
      version: "2026.10",
      dataVersion: "pyq-25yr-v2",
      computedAt: new Date().toISOString(),
      status: "available",
      node: {
        id: n.id,
        paper: n.paper,
        parent: n.parent,
        path: n.path || [],
        gloss: n.gloss,
        entities: n.entities || [],
      },
      metrics: {
        prelimsTotal: {
          value: prelimsCountRes.count ?? a.total_prelims_count ?? 0,
          observedCorpusYears: { from: 2001, to: 2025 },
          corpusName: "UPSC CSE Prelims 2001-2025 Master Corpus",
          isDirectNodeOnly: true,
        },
        mainsTotal: {
          value: mainsCountRes.count ?? a.total_mains_count ?? 0,
          observedYears: { from: 2019, to: 2024 },
        },
        lastTestedYear: a.last_tested_year ?? null,
        dominantOperator: a.dominant_operator ?? null,
        isDroughtTopic: Boolean(a.is_drought_topic),
        evidenceBasis: `Calculated from ${prelimsCountRes.count ?? 0} prelims questions mapped in active database.`,
      },
      resources: linkedResources,
      relationships: {
        parent: n.parent ? { id: n.parent, title: n.parent } : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: error.message });
  }
});

// ===========================================================================
// 3. GET /api/syllabus/nodes/:nodeId/questions
// ===========================================================================
syllabusRouter.get("/nodes/:nodeId/questions", async (req: Request, res: Response) => {
  const nodeId = req.params.nodeId;

  if (!isValidCanonicalNodeId(nodeId)) {
    return res.status(404).json({
      success: false,
      error: "UNKNOWN_NODE",
      message: `Node '${nodeId}' is not recognized in the canonical syllabus taxonomy.`,
    });
  }

  res.set("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
  try {
    const stage = req.query.stage === "mains" ? "mains" : "prelims";
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));
    const yearFrom = req.query.yearFrom ? parseInt(req.query.yearFrom as string, 10) : undefined;
    const yearTo = req.query.yearTo ? parseInt(req.query.yearTo as string, 10) : undefined;

    const sb = getSupabase();

    if (stage === "prelims") {
      let countQuery = sb
        .from("pyq_prelims")
        .select("id", { count: "exact", head: true })
        .eq("node_id", nodeId)
        .eq("is_dropped", false);

      if (yearFrom) countQuery = countQuery.gte("year", yearFrom);
      if (yearTo) countQuery = countQuery.lte("year", yearTo);

      const { count: totalItems, error: countErr } = await countQuery;
      if (countErr) {
        return res.status(500).json({ success: false, error: "DATABASE_ERROR", message: countErr.message });
      }

      const offset = (page - 1) * pageSize;
      let dataQuery = sb
        .from("pyq_prelims")
        .select("id, year, paper, question_num, stem, statements, options, question_type, qualifiers")
        .eq("node_id", nodeId)
        .eq("is_dropped", false);

      if (yearFrom) dataQuery = dataQuery.gte("year", yearFrom);
      if (yearTo) dataQuery = dataQuery.lte("year", yearTo);

      const { data: rows, error: dataErr } = await dataQuery
        .order("year", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (dataErr) {
        return res.status(500).json({ success: false, error: "DATABASE_ERROR", message: dataErr.message });
      }

      const cleanRows = (rows || []).filter(isCleanPrelimsRow);

      // Map questions preserving exam security (omit official_key from unattempted preview)
      const sanitized = cleanRows.map((q: any) => ({
        id: q.id,
        year: q.year,
        paper: q.paper,
        questionNum: q.question_num,
        stem: q.stem,
        statements: q.statements || [],
        options: q.options || [],
        questionType: q.question_type,
        qualifiers: q.qualifiers || [],
        sourceCorpus: "UPSC CSE Prelims Official Master Corpus",
      }));

      return res.json({
        success: true,
        version: "2026.10",
        dataVersion: "pyq-25yr-v2",
        computedAt: new Date().toISOString(),
        nodeId,
        stage: "prelims",
        pagination: {
          page,
          pageSize,
          totalItems: totalItems || 0,
          totalPages: Math.ceil((totalItems || 0) / pageSize),
        },
        eligibilityCriteria: {
          excludedDropped: true,
          excludedMalformed: true,
          isDirectNodeOnly: true,
        },
        questions: sanitized,
      });
    } else {
      // Mains questions
      let countQuery = sb
        .from("pyq_mains")
        .select("id", { count: "exact", head: true })
        .eq("node_id", nodeId);

      if (yearFrom) countQuery = countQuery.gte("year", yearFrom);
      if (yearTo) countQuery = countQuery.lte("year", yearTo);

      const { count: totalItems, error: countErr } = await countQuery;
      if (countErr) {
        return res.status(500).json({ success: false, error: "DATABASE_ERROR", message: countErr.message });
      }

      const offset = (page - 1) * pageSize;
      let dataQuery = sb
        .from("pyq_mains")
        .select("id, year, paper, question_num, marks, prompt, directive_verb, nature")
        .eq("node_id", nodeId);

      if (yearFrom) dataQuery = dataQuery.gte("year", yearFrom);
      if (yearTo) dataQuery = dataQuery.lte("year", yearTo);

      const { data: rows, error: dataErr } = await dataQuery
        .order("year", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (dataErr) {
        return res.status(500).json({ success: false, error: "DATABASE_ERROR", message: dataErr.message });
      }

      const sanitized = (rows || []).map((q: any) => ({
        id: q.id,
        year: q.year,
        paper: q.paper,
        questionNum: q.question_num,
        prompt: q.prompt,
        directiveVerb: q.directive_verb,
        marks: q.marks,
        nature: q.nature,
        sourceCorpus: "UPSC CSE Mains Official Master Corpus",
      }));

      return res.json({
        success: true,
        version: "2026.10",
        dataVersion: "pyq-25yr-v2",
        computedAt: new Date().toISOString(),
        nodeId,
        stage: "mains",
        pagination: {
          page,
          pageSize,
          totalItems: totalItems || 0,
          totalPages: Math.ceil((totalItems || 0) / pageSize),
        },
        eligibilityCriteria: {
          excludedDropped: true,
          excludedMalformed: true,
          isDirectNodeOnly: true,
        },
        questions: sanitized,
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: error.message });
  }
});

// ===========================================================================
// 4. GET /api/syllabus/nodes/:nodeId/articles
// ===========================================================================
syllabusRouter.get("/nodes/:nodeId/articles", async (req: Request, res: Response) => {
  const nodeId = req.params.nodeId;

  if (!isValidCanonicalNodeId(nodeId)) {
    return res.status(404).json({
      success: false,
      error: "UNKNOWN_NODE",
      message: `Node '${nodeId}' is not recognized in the canonical syllabus taxonomy.`,
    });
  }

  res.set("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=1800");
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(30, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
    const offset = (page - 1) * pageSize;

    const sb = getSupabase();

    // Query articles matching node_id
    const { data: rows, error, count } = await sb
      .from("current_affairs")
      .select("id, headline, published_at, source, summary, node_id", { count: "exact" })
      .eq("node_id", nodeId)
      .order("published_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return res.status(500).json({ success: false, error: "DATABASE_ERROR", message: error.message });
    }

    const articles = (rows || []).map((a: any) => {
      let summaryText = "";
      if (typeof a.summary === "string") {
        summaryText = a.summary;
      } else if (a.summary && Array.isArray(a.summary.bullets)) {
        summaryText = a.summary.bullets.join(" ");
      } else if (a.summary && typeof a.summary === "object") {
        summaryText = JSON.stringify(a.summary);
      }
      return {
        id: a.id,
        title: a.headline || "Untitled Current Affairs Brief",
        publishedAt: a.published_at,
        sourceName: a.source || "PIB",
        summary: summaryText ? summaryText.slice(0, 200) + "..." : "",
        route: `/intelligence/article-${a.id}`,
        relationType: "direct_syllabus_tag" as const,
      };
    });

    res.json({
      success: true,
      version: "2026.10",
      computedAt: new Date().toISOString(),
      nodeId,
      pagination: {
        page,
        pageSize,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
      articles,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: error.message });
  }
});

// ===========================================================================
// 5. GET /api/me/syllabus-progress (Handler export)
// ===========================================================================
export async function handleUserSyllabusProgress(req: Request, res: Response) {
  res.set("Cache-Control", "private, no-cache, no-store, must-revalidate");

  const { user, error: authError } = await authenticateBearer(req);
  if (authError || !user) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      message: authError || "Authentication required to view candidate practice history.",
    });
  }

  try {
    const sb = getSupabase();
    const { data: telemetry, error: tErr } = await sb
      .from("user_psyche_telemetry")
      .select("node_id, operator_tested, is_correct, marks_delta, is_50_50_call, created_at")
      .eq("user_id", user.id);

    if (tErr) {
      return res.status(500).json({ success: false, error: "DATABASE_ERROR", message: tErr.message });
    }

    const rows = telemetry || [];
    const hasSufficientHistory = rows.length >= 5;

    const nodeProgress: Record<string, { attempts: number; correct: number; accuracyPct: number; lastAttemptedAt: string }> = {};
    let totalCorrect = 0;

    for (const r of rows) {
      if (r.is_correct) totalCorrect++;
      const node = r.node_id || "UNCLASSIFIED";
      if (!nodeProgress[node]) {
        nodeProgress[node] = { attempts: 0, correct: 0, accuracyPct: 0, lastAttemptedAt: r.created_at };
      }
      nodeProgress[node].attempts++;
      if (r.is_correct) nodeProgress[node].correct++;
      nodeProgress[node].accuracyPct = Math.round((nodeProgress[node].correct / nodeProgress[node].attempts) * 100);
      if (new Date(r.created_at) > new Date(nodeProgress[node].lastAttemptedAt)) {
        nodeProgress[node].lastAttemptedAt = r.created_at;
      }
    }

    res.json({
      success: true,
      version: "2026.10",
      userId: user.id,
      computedAt: new Date().toISOString(),
      hasSufficientHistory,
      summary: {
        totalQuestionsAttempted: rows.length,
        totalCorrect,
        accuracyPct: rows.length > 0 ? Math.round((totalCorrect / rows.length) * 100) : 0,
        distinctNodesAttempted: Object.keys(nodeProgress).length,
      },
      nodeProgress,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: error.message });
  }
}
