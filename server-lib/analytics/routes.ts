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
} from "./examiner_psyche.js";
import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://ixngfxaerlkkcacrbdgc.supabase.co";
const rawSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(rawSupabaseUrl, rawSupabaseKey, {
  auth: { persistSession: false },
});

export const analyticsRouter = Router();

// 1. Complete Examiner Psyche Overview
analyticsRouter.get("/examiner-psyche/overview", async (_req: Request, res: Response) => {
  try {
    const data = await getExaminerPsycheOverview();
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
    const [nodeRes, analyticsRes, prelimsRes, mainsRes] = await Promise.all([
      supabase.from("syllabus_nodes").select("*").eq("id", nodeId).maybeSingle(),
      supabase.from("pyq_node_analytics").select("*").eq("node_id", nodeId).maybeSingle(),
      supabase.from("pyq_prelims").select("id, year, paper, question_num, stem, official_key, question_type").eq("node_id", nodeId).order("year", { ascending: false }).limit(20),
      supabase.from("pyq_mains").select("id, year, paper, question_num, marks, prompt, directive_verb, nature, rubric_level_1, rubric_level_2, rubric_level_3").eq("node_id", nodeId).order("year", { ascending: false }).limit(20),
    ]);

    res.json({
      success: true,
      data: {
        node: nodeRes.data,
        analytics: analyticsRes.data,
        prelimsQuestions: prelimsRes.data || [],
        mainsQuestions: mainsRes.data || [],
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
