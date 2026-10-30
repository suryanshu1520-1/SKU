/**
 * server-lib/news/publication.ts
 *
 * Atomic Publication & Advisory-Locked Serialization Service (Phase 2).
 *
 * Implements strict transaction-scoped serialization:
 *   1. Locks the candidate episode bucket key (`pg_advisory_xact_lock`)
 *   2. Prevents race conditions between concurrent workers examining the same forum/actors/quarter
 *   3. Enforces evidence validation & India posture guardrails
 *   4. Commits immutable dispatch revision and updates public current_affairs projection
 */

import { createClient } from "@supabase/supabase-js";
import { validateDispatchEvidence, type IndiaPosture, type EvidenceQuote } from "./evidence.js";
import { classificationSummary } from '../../src/lib/article-classification.js';

function getServiceSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error("CRITICAL_ENVIRONMENT_FAULT: Supabase credentials missing");
  }
  return createClient(url, key);
}

export interface PublishDispatchParams {
  candidateBucketKey: string;
  acceptedMatchKey: string;
  actors: string[];
  institutionOrForum?: string | null;
  actionDomain: string;
  eventWindow: string;
  coverageScope: "india" | "international" | "cross_border" | "unclassified";
  developmentId: string;
  changeKind?: string;
  headline: string;
  bullets: string[];
  evidenceQuotes: EvidenceQuote[];
  sourceNormalizedText: string;
  declaredPosture?: IndiaPosture | string;
  idempotencyKey: string;
  publicUrl: string;
  source: string;
  ministry?: string;
  sourcePublishedAt?: string | null;
  extraSummaryFields?: Record<string, unknown>;
}

export interface PublishDispatchResult {
  ok: boolean;
  status: "published" | "idempotent_duplicate" | "validation_failed" | "error";
  storyId?: string;
  revisionNo?: number;
  revisionId?: string;
  articleId?: string;
  errors?: string[];
  errorMessage?: string;
}

/**
 * Atomically publishes an international event brief revision.
 */
export async function publishNewsDispatch(
  params: PublishDispatchParams
): Promise<PublishDispatchResult> {
  // 1. Run deterministic evidence and India-posture verification gate
  const validation = validateDispatchEvidence({
    headline: params.headline,
    bullets: params.bullets,
    quotes: params.evidenceQuotes,
    sourceNormalizedText: params.sourceNormalizedText,
    declaredPosture: params.declaredPosture,
  });

  if (!validation.isValid) {
    return {
      ok: false,
      status: "validation_failed",
      errors: validation.errors,
      errorMessage: `Evidence validation failed: ${validation.errors.join("; ")}`,
    };
  }

  const supabase = getServiceSupabase();

  // Build structured summary snapshot conforming to shared Tark article contract
  const summarySnapshot = classificationSummary({ source: params.source, ministry: params.ministry, headline: params.headline, summary: {
    ...(params.extraSummaryFields || {}),
    bullets: params.bullets,
    sources: [params.source],
    coverage_scope: params.coverageScope,
    india_posture: validation.resolvedPosture,
    source_published_at: params.sourcePublishedAt || null,
    provenance_v2: {
      schema_version: 1,
      method: "source_support_v2",
      quotes: params.evidenceQuotes,
    },
  } });
  summarySnapshot.coverage_scope = summarySnapshot.classification.coverage.scope;

  try {
    // 2. Invoke atomic advisory-locked RPC in PostgreSQL
    const { data, error } = await supabase.rpc("publish_news_dispatch_atomic", {
      p_candidate_bucket_key: params.candidateBucketKey,
      p_accepted_match_key: params.acceptedMatchKey,
      p_actors: params.actors,
      p_institution: params.institutionOrForum || null,
      p_action_domain: params.actionDomain,
      p_event_window: params.eventWindow,
      p_coverage_scope: summarySnapshot.classification.coverage.scope,
      p_development_id: params.developmentId,
      p_change_kind: params.changeKind || "initial_release",
      p_headline: params.headline,
      p_summary_snapshot: summarySnapshot,
      p_evidence_bundle: params.evidenceQuotes,
      p_india_posture: validation.resolvedPosture,
      p_idempotency_key: params.idempotencyKey,
      p_public_url: params.publicUrl,
      p_source: params.source,
      p_ministry: params.ministry || "International Affairs",
      p_source_published_at: params.sourcePublishedAt || null,
    });

    if (error) {
      console.error("[publication] publish_news_dispatch_atomic RPC error:", error);
      return {
        ok: false,
        status: "error",
        errorMessage: error.message,
      };
    }

    return {
      ok: true,
      status: data?.status || "published",
      storyId: data?.story_id,
      revisionNo: data?.revision_no,
      revisionId: data?.revision_id,
      articleId: data?.article_id,
    };
  } catch (err: any) {
    console.error("[publication] Exception during atomic publication:", err);
    return {
      ok: false,
      status: "error",
      errorMessage: err?.message || String(err),
    };
  }
}

