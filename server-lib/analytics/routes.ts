/**
 * server-lib/analytics/routes.ts
 *
 * Express API routes for The Examiner Psyche & PYQ Deep Analytical Engine.
 */

import { Router, Request, Response } from "express";
import { authenticateBearer } from "../auth/middleware.js";
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
  getNodePsycheProfile,
  getUserPsycheAutopsy,
  getTargetOperatorForDailyBrief,
  recordPsycheTelemetry,
} from "./examiner_psyche.js";
import { queryMasterPYQs, getCorpusCensus } from "./pyq_explorer.js";
export const analyticsRouter = Router();

// Master 7,841 PYQ Live Corpus Census & Distribution Endpoint
analyticsRouter.get("/observatory/census", async (_req: Request, res: Response) => {
  try {
    const data = getCorpusCensus();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Master 7,841 PYQ Intelligence Explorer Live Search Endpoint
analyticsRouter.get("/observatory/pyqs", async (req: Request, res: Response) => {
  try {
    const result = queryMasterPYQs({
      q: req.query.q as string,
      subject: req.query.subject as string,
      era: req.query.era as string,
      cognitiveType: req.query.cognitiveType as string,
      stage: req.query.stage as string,
      quality: (req.query.quality as any) || 'verified',
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

// 8. Examiner's Psyche Node Profile (TASK_080)
analyticsRouter.get("/examiner-psyche/node-profile/:nodeId", async (req: Request, res: Response) => {
  try {
    const data = await getNodePsycheProfile(req.params.nodeId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Examiner's Psyche User Autopsy & 50:50 Ledger (TASK_080)
analyticsRouter.get("/examiner-psyche/user-autopsy/:userId", async (req: Request, res: Response) => {
  try {
    const { user, error } = await authenticateBearer(req);
    if (error || !user) {
      return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: error || "Authentication required" });
    }
    if (user.id !== req.params.userId) {
      return res.status(403).json({ success: false, error: "FORBIDDEN", message: "Cannot access autopsy of another candidate." });
    }
    const data = await getUserPsycheAutopsy(user.id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

analyticsRouter.get("/examiner-psyche/me/autopsy", async (req: Request, res: Response) => {
  try {
    const { user, error } = await authenticateBearer(req);
    if (error || !user) {
      return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: error || "Authentication required" });
    }
    const data = await getUserPsycheAutopsy(user.id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Target Operator for Daily Brief (TASK_080)
analyticsRouter.get("/examiner-psyche/target-operator/:nodeId", async (req: Request, res: Response) => {
  try {
    const operator = await getTargetOperatorForDailyBrief(req.params.nodeId);
    res.json({ success: true, data: { nodeId: req.params.nodeId, targetOperator: operator } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. User Psyche Telemetry Ingestion (TASK_080)
analyticsRouter.post("/examiner-psyche/telemetry", async (req: Request, res: Response) => {
  try {
    const { user, error: authError } = await authenticateBearer(req);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: authError || "Authentication required" });
    }

    const {
      questionId,
      nodeId,
      operatorTested,
      selectedOption,
      is5050Call,
      eliminatedOptions,
      responseMs,
    } = req.body;

    if (!questionId || !nodeId || !operatorTested || !selectedOption) {
      return res.status(400).json({ success: false, error: "Missing required telemetry fields: questionId, nodeId, operatorTested, selectedOption" });
    }

    // Operational Invariant #2: Quiz scoring and answers are validated strictly server-side.
    const sb = getSupabase();
    const { data: rawQuestion, error: qErr } = await sb
      .from("pyq_prelims")
      .select("id, official_key, node_id")
      .eq("id", questionId)
      .maybeSingle();

    const question = rawQuestion as { id: string; official_key: string | null; node_id: string | null } | null;

    if (qErr || !question || !question.official_key) {
      return res.status(400).json({ success: false, error: "Invalid question ID or missing official answer key" });
    }

    const cleanSelected = String(selectedOption).trim().toLowerCase();
    const cleanOfficialKey = String(question.official_key).trim().toLowerCase();
    const isCorrect = cleanSelected === cleanOfficialKey;
    const marksDelta = isCorrect ? 2.0 : -0.66;

    await recordPsycheTelemetry({
      userId: user.id, // Strictly derived from authenticated session
      questionId,
      nodeId: question.node_id || nodeId,
      operatorTested,
      selectedOption: cleanSelected,
      officialKey: cleanOfficialKey,
      isCorrect,
      marksDelta,
      is5050Call: Boolean(is5050Call),
      eliminatedOptions: Array.isArray(eliminatedOptions) ? eliminatedOptions : [],
      responseMs: typeof responseMs === "number" ? responseMs : undefined,
    });

    res.json({ success: true, isCorrect, marksDelta });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

