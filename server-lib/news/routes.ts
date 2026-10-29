/**
 * server-lib/news/routes.ts
 *
 * Scoped Intelligence & International News Router (Phase 3).
 *
 * Exposes:
 *   - GET /api/intelligence/feed     (Scoped search, filters, pagination)
 *   - GET /api/intelligence/coverage (Honest source freshness receipt)
 *   - GET /api/intelligence/article/:id
 *
 * Mounted identically in server.ts and api/server.ts to prevent routing drift.
 */

import { Router, type Request, type Response } from "express";
import { queryIntelligenceFeed, queryCoverageReceipt } from "./read.js";
import { createClient } from "@supabase/supabase-js";

export const intelligenceRouter = Router();

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
}

// 1. Scoped Intelligence Feed
intelligenceRouter.get("/feed", async (req: Request, res: Response) => {
  try {
    const scope = (req.query.scope as any) || "all";
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 45;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const searchQuery = req.query.q as string | undefined;
    const source = req.query.source as string | undefined;
    const ministry = req.query.ministry as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const result = await queryIntelligenceFeed({
      scope,
      limit,
      offset,
      searchQuery,
      source,
      ministry,
      startDate,
      endDate,
    });

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("[intelligenceRouter] /feed error:", err);
    return res.status(500).json({ error: "Failed to query intelligence feed", details: err?.message });
  }
});

// 2. Coverage Receipt (Declared Portfolio Freshness)
intelligenceRouter.get("/coverage", async (_req: Request, res: Response) => {
  try {
    const receipt = await queryCoverageReceipt();
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
    return res.status(200).json(receipt);
  } catch (err: any) {
    console.error("[intelligenceRouter] /coverage error:", err);
    return res.status(500).json({ error: "Failed to retrieve coverage receipt", details: err?.message });
  }
});

// 3. Single Article by ID or Slug
intelligenceRouter.get("/article/:id", async (req: Request, res: Response) => {
  const idOrSlug = req.params.id;
  if (!idOrSlug) {
    return res.status(400).json({ error: "Missing article id" });
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(404).json({ error: "Article not found" });
    }
    // Check by UUID
    let query = supabase.from("current_affairs").select("*");
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    if (isUuid) {
      query = query.eq("id", idOrSlug);
    } else {
      query = query.ilike("url", `%${idOrSlug}%`);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=1800");
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("[intelligenceRouter] /article/:id error:", err);
    return res.status(500).json({ error: "Failed to retrieve article", details: err?.message });
  }
});
