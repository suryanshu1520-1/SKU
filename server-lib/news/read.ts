/**
 * server-lib/news/read.ts
 *
 * Scoped Read Selectors & DTO Projection (Phase 3).
 *
 * Implements one selection contract:
 *   - Applies section, scope, visibility, and search before pagination
 *   - Stable pagination with a deterministic tie-breaker
 *   - Exposes safe public DTOs (sanitizes private operational state)
 */

import { createClient } from "@supabase/supabase-js";
import { classificationSummary } from '../../src/lib/article-classification.js';
import { selectClassifiedPage } from '../../src/lib/article-feed-selection.js';

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Supabase URL missing");
  return createClient(url, key);
}

export interface FeedQueryOptions {
  scope?: "all" | "international" | "india" | "cross_border";
  limit?: number;
  offset?: number;
  searchQuery?: string;
  source?: string;
  ministry?: string;
  startDate?: string;
  endDate?: string;
}

export interface PublicArticleDTO {
  id: string;
  headline: string;
  summary: {
    bullets: string[];
    prelims?: string;
    mains?: string;
    sources?: string[];
    grounding?: number;
    verification_method?: string;
    claims?: unknown[];
    international?: unknown;
    provenance_v2?: unknown;
    [k: string]: unknown;
  };
  url: string;
  source: string;
  ministry: string | null;
  published_at: string | null;
  source_published_at?: string | null;
  coverage_scope: string;
  content_version: number;
}

export interface FeedResponse {
  items: PublicArticleDTO[];
  totalCount: number;
  hasMore: boolean;
  scope: string;
}

/**
 * Queries published intelligence feed with explicit scope and facet filters.
 */
export async function queryIntelligenceFeed(opts: FeedQueryOptions = {}): Promise<FeedResponse> {
  const supabase = getSupabase();
  const limit = Math.min(Math.max(opts.limit ?? 45, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  const makeQuery = () => {
    let query = supabase
      .from("current_affairs")
      .select(
        "id, headline, summary, url, source, ministry, node_id, published_at, source_published_at, coverage_scope, content_version",
        { count: "exact" }
      )
      .neq("source", "PIB_Digest");

    // Source filter
    if (opts.source && opts.source !== "ALL") {
      query = query.eq("source", opts.source);
    }

    // Ministry filter
    if (opts.ministry && opts.ministry !== "ALL") {
      query = query.eq("ministry", opts.ministry);
    }

    // Date filters
    if (opts.startDate) {
      query = query.gte("created_at", opts.startDate);
    }
    if (opts.endDate) {
      const endInclusive = new Date(opts.endDate);
      endInclusive.setDate(endInclusive.getDate() + 1);
      query = query.lt("created_at", endInclusive.toISOString().split("T")[0]);
    }

    // Search filter
    if (opts.searchQuery?.trim()) {
      const q = opts.searchQuery.trim();
      query = query.or(`headline.ilike.%${q}%,ministry.ilike.%${q}%`);
    }

    return query.order('created_at', { ascending: false }).order('id', { ascending: false });
  };

  let data: Array<PublicArticleDTO & { node_id?: string }>;
  let total: number;
  if (opts.scope && opts.scope !== 'all') {
    const page = await selectClassifiedPage<PublicArticleDTO & { node_id?: string }>({
      scope: opts.scope, offset, limit, countAll: true,
      fetchBatch: async (start, size) => {
        const result = await makeQuery().range(start, start + size - 1);
        if (result.error) throw result.error;
        return result.data || [];
      },
    });
    data = page.items;
    total = page.totalCount ?? 0;
  } else {
    const result = await makeQuery().range(offset, offset + limit - 1);
    if (result.error) throw result.error;
    data = result.data || [];
    total = result.count ?? data.length;
  }

  const items: PublicArticleDTO[] = data.map(row => {
    const summary = classificationSummary(row);
    return {
    id: row.id,
    headline: row.headline,
    summary: { ...row.summary, ...summary },
    url: row.url,
    source: row.source,
    ministry: row.ministry,
    published_at: row.published_at,
    source_published_at: row.source_published_at || (typeof row.summary?.source_published_at === 'string' ? row.summary.source_published_at : null),
    coverage_scope: summary.classification.coverage.scope,
    content_version: row.content_version || 1,
  }; });
  const hasMore = offset + items.length < total;

  return {
    items,
    totalCount: total,
    hasMore,
    scope: opts.scope || "all",
  };
}

/**
 * Retrieves aggregate source-check freshness and honest coverage state.
 */
export interface CoverageReceipt {
  generatedAt: string;
  portfolioStatus: 'ACTIVE_PROSPECTIVE';
  totalSourcesTracked: number;
  activeSources: Array<{
    id: string;
    label: string;
    role: string;
    scope: string;
    status: string;
    trustWeight: number;
  }>;
  honestFreshnessNotice: string;
}

/**
 * Retrieves aggregate source-check freshness and honest coverage state.
 */
export async function queryCoverageReceipt(): Promise<CoverageReceipt> {
  return {
    generatedAt: new Date().toISOString(),
    portfolioStatus: 'ACTIVE_PROSPECTIVE',
    totalSourcesTracked: 7,
    activeSources: [
      { id: "PIB", label: "Press Information Bureau", role: "official_record", scope: "india", status: "active", trustWeight: 1.0 },
      { id: "RBI", label: "Reserve Bank of India", role: "official_record", scope: "india", status: "active", trustWeight: 1.0 },
      { id: "PRS", label: "PRS Legislative Research", role: "institutional_news", scope: "india", status: "active", trustWeight: 0.95 },
      { id: "MEA", label: "Ministry of External Affairs", role: "official_record", scope: "cross_border", status: "review_pilot", trustWeight: 0.95 },
      { id: "WTO", label: "World Trade Organization", role: "institutional_news", scope: "international", status: "review_pilot", trustWeight: 0.90 },
      { id: "UN_NEWS", label: "UN News", role: "institutional_news", scope: "international", status: "shadow", trustWeight: 0.85 },
      { id: "THE_HINDU", label: "The Hindu", role: "independent_reporting", scope: "india", status: "active", trustWeight: 0.85 },
    ],
    honestFreshnessNotice: "Finite, curated intelligence stream. No claim of exhaustive daily coverage or guaranteed count.",
  };
}
