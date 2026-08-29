/**
 * server-lib/analytics/routes.ts
 *
 * Express API routes for The Examiner Psyche & PYQ Deep Analytical Engine.
 */

import { Router, Request, Response } from "express";
import {
  getExaminerPsycheOverview,
  getParetoAndDroughtAnalysis,
  getQualifierTrapCorrelation,
  getFormatShiftTracking,
  getGs4AndEssayDialecticalAxes,
  getDirectiveVerbScoringMatrix,
  getLiveQuestionBankTrends,
  getSupabase,
  isCleanPrelimsRow,
} from "./examiner_psyche.js";
import { queryMasterPYQs } from "./pyq_explorer.js";
export const analyticsRouter = Router();

// Master 7,841 PYQ Intelligence Explorer Live Search Endpoint
analyticsRouter.get("/observatory/pyqs", async (req: Request, res: Response) => {
  try {
    const result = queryMasterPYQs({
      q: req.query.q as string,
      subject: req.query.subject as string,
      era: req.query.era as string,
      cognitiveType: req.query.cognitiveType as string,
      stage: req.query.stage as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 1. Complete Examiner Psyche Overview
analyticsRouter.get("/examiner-psyche/overview", async (_req: Request, res: Response) => {
  try {
    const data = await getExaminerPsycheOverview();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 1b. Live Question Bank Trends & Patterns
analyticsRouter.get("/examiner-psyche/trends", async (_req: Request, res: Response) => {
  try {
    const data = await getLiveQuestionBankTrends();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Pareto Distribution & Drought Detection
analyticsRouter.get("/examiner-psyche/pareto-drought", async (_req: Request, res: Response) => {
  try {
    const data = await getParetoAndDroughtAnalysis();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Qualifier Trap Correlation
analyticsRouter.get("/examiner-psyche/qualifier-traps", async (_req: Request, res: Response) => {
  try {
    const data = await getQualifierTrapCorrelation();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Structural Format Shifts
analyticsRouter.get("/examiner-psyche/format-shifts", async (_req: Request, res: Response) => {
  try {
    const data = await getFormatShiftTracking();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Dialectical Axes (GS-4 & Essay)
analyticsRouter.get("/examiner-psyche/dialectical-axes", async (_req: Request, res: Response) => {
  try {
    const data = await getGs4AndEssayDialecticalAxes();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Directive Verb Cognitive Rubrics
analyticsRouter.get("/examiner-psyche/directive-rubrics", async (_req: Request, res: Response) => {
  try {
    const data = await getDirectiveVerbScoringMatrix();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Node-Specific Deep Dive
analyticsRouter.get("/examiner-psyche/node/:nodeId", async (req: Request, res: Response) => {
  try {
    const nodeId = req.params.nodeId;
    const sb = getSupabase();
    const [nodeRes, analyticsRes, prelimsRes, mainsRes] = await Promise.all([
      sb.from("syllabus_nodes").select("*").eq("id", nodeId).maybeSingle(),
      sb.from("pyq_node_analytics").select("*").eq("node_id", nodeId).maybeSingle(),
      sb.from("pyq_prelims")
        .select("id, year, paper, question_num, stem, statements, options, official_key, question_type, qualifiers")
        .eq("node_id", nodeId)
        .order("year", { ascending: false })
        .limit(40),
      sb.from("pyq_mains")
        .select("id, year, paper, question_num, marks, prompt, directive_verb, nature, rubric_level_1, rubric_level_2, rubric_level_3, trigger_entity")
        .eq("node_id", nodeId)
        .order("year", { ascending: false })
        .limit(20),
    ]);

    let cleanPrelims: any[] = ((prelimsRes.data || []) as any[]).filter(isCleanPrelimsRow);

    // If direct node_id lookup yielded few or zero prelims, perform intelligent entity / keyword fallback
    const nodeData = nodeRes.data as any;
    if (cleanPrelims.length < 3 && nodeData) {
      const terms: string[] = [
        ...(nodeData.entities || []),
        nodeData.id ? nodeData.id.split('.').pop() : '',
      ].filter((t: any) => typeof t === 'string' && t.length >= 4);

      if (terms.length > 0) {
        // Query recent pyq_prelims matching node entities
        const { data: fallbackPrelims } = await sb
          .from("pyq_prelims")
          .select("id, year, paper, question_num, stem, statements, options, official_key, question_type, qualifiers")
          .ilike("stem", `%${terms[0]}%`)
          .order("year", { ascending: false })
          .limit(10);

        if (fallbackPrelims && fallbackPrelims.length > 0) {
          const cleanFallback = (fallbackPrelims as any[]).filter(isCleanPrelimsRow);
          const existingIds = new Set(cleanPrelims.map((p: any) => p.id));
          for (const fb of cleanFallback) {
            if (!existingIds.has((fb as any).id)) {
              cleanPrelims.push(fb);
              existingIds.add((fb as any).id);
            }
          }
        }
      }
    }


    // Sort to prioritize year diversity across distinct testing cycles (e.g. 2024, 2022, 2020, 2018, 2015, 2012, etc.)
    const yearBuckets = new Map<number, any[]>();
    for (const q of cleanPrelims) {
      const yr = q.year || 2024;
      if (!yearBuckets.has(yr)) yearBuckets.set(yr, []);
      yearBuckets.get(yr)!.push(q);
    }

    const diversePrelims: any[] = [];
    const sortedYears = Array.from(yearBuckets.keys()).sort((a, b) => b - a);

    // First pass: 1 question per distinct year
    for (const yr of sortedYears) {
      const qs = yearBuckets.get(yr)!;
      if (qs.length > 0) {
        diversePrelims.push(qs[0]);
      }
    }

    // Second pass: fill up to 8 questions with remaining items
    for (const yr of sortedYears) {
      if (diversePrelims.length >= 8) break;
      const qs = yearBuckets.get(yr)!;
      for (let i = 1; i < qs.length && diversePrelims.length < 8; i++) {
        diversePrelims.push(qs[i]);
      }
    }

    res.json({
      success: true,
      data: {
        node: nodeRes.data,
        analytics: analyticsRes.data,
        prelimsQuestions: diversePrelims,
        mainsQuestions: mainsRes.data || [],
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

