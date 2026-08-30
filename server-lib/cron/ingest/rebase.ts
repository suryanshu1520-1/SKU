/**
 * server-lib/cron/ingest/rebase.ts
 *
 * Continuous Readiness (Tark Rebase v1) Ingestion Bridge
 *
 * Rules:
 *   - Only live, span-verified numeric facts pass to the mutation ledger.
 *   - Precision gates: verified === true, claimType === 'numeric', recognized entity (reject 'General'),
 *     recognized metric (reject 'general_metric'), reject unit === 'year', exactly 1 unambiguous value per key.
 *   - Canonical Key: v1|normalized-entity|metric|normalized-period|unit
 *   - Source body hashed with SHA-256 for deterministic provenance.
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  extractQuadsFromText,
  normalizeEntity,
  extractPeriod,
  extractUnit,
  parseNumericValue,
  type FactQuad,
} from "./contested.js";
import type { VerifiedClaim } from "./verify.js";

function cleanEnv(val: any): string {
  if (typeof val !== "string") return "";
  let c = val.trim();
  while (c.startsWith('"') || c.startsWith("'")) c = c.substring(1);
  while (c.endsWith('"') || c.endsWith("'")) c = c.substring(0, c.length - 1);
  return c.trim();
}

function getSupabase() {
  const url = cleanEnv(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "");
  const key = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  if (!url) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Supabase URL missing");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing for Rebase ingestion");
  return createClient(url, key);
}

/**
 * Generate canonical claim key.
 * Format: v1|normalized-entity|metric|normalized-period|unit
 */
export function canonicalClaimKey(quad: FactQuad): string {
  const normEntity = quad.entity.trim().toLowerCase().replace(/\s+/g, "_");
  const normMetric = quad.metric.trim().toLowerCase().replace(/\s+/g, "_");
  const normPeriod = quad.period.trim().toLowerCase().replace(/\s+/g, "_");
  const normUnit = quad.unit.trim().toLowerCase().replace(/\s+/g, "_");

  return `v1|${normEntity}|${normMetric}|${normPeriod}|${normUnit}`;
}

/**
 * Canonical SHA-256 hash of normalized numeric value.
 * Example: 6.50% and 6.5% normalize to "6.5" and produce identical hashes.
 */
export function normalizedValueHash(quad: FactQuad | { numericValue?: number; value?: string }): string {
  const num = quad.numericValue !== undefined ? quad.numericValue : parseNumericValue(quad.value || "");
  if (num === undefined || isNaN(num)) {
    throw new Error(`Cannot compute normalizedValueHash for non-numeric value: ${JSON.stringify(quad)}`);
  }
  // Canonical representation: strip trailing zeros from decimals
  const canonicalStr = String(Number(num.toFixed(8)).toString());
  return crypto.createHash("sha256").update(canonicalStr).digest("hex");
}

export interface RebaseContext {
  storyHeadline: string;
  storyUrl: string;
  sourceId: string;
  sourceUrl: string;
  sourceBody: string;
  syllabusTags?: string[];
  syllabusNodeId?: string | null;
}

export interface NumericObservation {
  canonicalKey: string;
  entity: string;
  metric: string;
  period: string;
  unit: string;
  claimText: string;
  valueText: string;
  numericValue: number;
  valueHash: string;
  evidenceQuote: string;
  evidenceSpanIds: string[];
  sourceId: string;
  sourceUrl: string;
  sourceBodySha256: string;
  storyHeadline: string;
  storyUrl: string;
  syllabusTags: string[];
  syllabusNodeId: string | null;
}

/**
 * Extract precision-gated numeric observations from a verified claim.
 */
export function deriveNumericObservations(
  claim: VerifiedClaim,
  context: RebaseContext
): { observations: NumericObservation[]; skippedAmbiguous: boolean } {
  // Precision Gate 1: Claim must be verified
  if (!claim.verified) return { observations: [], skippedAmbiguous: false };

  // Precision Gate 2: Claim type must be numeric
  if (claim.claimType !== "numeric") return { observations: [], skippedAmbiguous: false };

  // Precision Gate 3: Must have at least one quote and spanId
  if (!claim.quotes?.length || !claim.spanIds?.length) {
    return { observations: [], skippedAmbiguous: false };
  }

  // Extract quads
  const quads = extractQuadsFromText(
    claim.text,
    context.sourceId,
    context.sourceUrl,
    claim.quotes[0],
    context.storyHeadline
  );

  const sourceBodyHash = crypto
    .createHash("sha256")
    .update(context.sourceBody || claim.quotes[0] || "")
    .digest("hex");

  // Group by canonical key to detect ambiguity
  const keyToQuads = new Map<string, FactQuad[]>();

  for (const quad of quads) {
    // Precision Gate 4: Recognize entity (reject General)
    if (!quad.entity || quad.entity === "General") continue;

    // Precision Gate 5: Recognize metric (reject general_metric)
    if (!quad.metric || quad.metric === "general_metric") continue;

    // Precision Gate 6: Reject unit === 'year' in v1
    if (quad.unit === "year") continue;

    // Parse numeric value
    const num = quad.numericValue !== undefined ? quad.numericValue : parseNumericValue(quad.value);
    if (num === undefined || isNaN(num)) continue;

    quad.numericValue = num;

    const key = canonicalClaimKey(quad);
    const existing = keyToQuads.get(key) || [];
    existing.push(quad);
    keyToQuads.set(key, existing);
  }

  const observations: NumericObservation[] = [];
  let hasAmbiguous = false;

  for (const [key, qList] of keyToQuads.entries()) {
    // Unambiguity gate: distinct numeric values for same key within 1 claim => skip ambiguous
    const distinctVals = new Set(qList.map((q) => q.numericValue));
    if (distinctVals.size > 1) {
      hasAmbiguous = true;
      continue;
    }

    const first = qList[0];
    const hash = normalizedValueHash(first);

    observations.push({
      canonicalKey: key,
      entity: first.entity,
      metric: first.metric,
      period: first.period,
      unit: first.unit,
      claimText: claim.text,
      valueText: first.value,
      numericValue: first.numericValue!,
      valueHash: hash,
      evidenceQuote: claim.quotes[0],
      evidenceSpanIds: claim.spanIds,
      sourceId: context.sourceId,
      sourceUrl: context.sourceUrl,
      sourceBodySha256: sourceBodyHash,
      storyHeadline: context.storyHeadline,
      storyUrl: context.storyUrl,
      syllabusTags: context.syllabusTags || [],
      syllabusNodeId: context.syllabusNodeId || null,
    });
  }

  return { observations, skippedAmbiguous: hasAmbiguous };
}

/**
 * Start a new news ingest run row.
 */
export async function startIngestRun(options: {
  pipelineVersion?: string;
  requestedSources?: string[];
}): Promise<string> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("news_ingest_runs")
    .insert({
      pipeline_version: options.pipelineVersion || "rebase-v1",
      requested_sources: options.requestedSources || [],
      status: "running",
      result: {},
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to start news ingest run: ${error?.message || "unknown error"}`);
  }

  return data.id;
}

/**
 * Complete a news ingest run with final status and summary.
 */
export async function finishIngestRun(
  runId: string,
  result: {
    status: "success" | "degraded" | "warning" | "failed";
    resultData?: Record<string, any>;
  }
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("news_ingest_runs")
    .update({
      completed_at: new Date().toISOString(),
      status: result.status,
      result: result.resultData || {},
    })
    .eq("id", runId);

  if (error) {
    console.error(`[rebase] Error finishing ingest run ${runId}:`, error);
  }
}

/**
 * Record verified numeric claims to the ledger using atomic RPC.
 */
export async function recordVerifiedClaims(
  claims: VerifiedClaim[],
  context: RebaseContext,
  ingestRunId: string
): Promise<{
  eligible: number;
  mutations: number;
  unchanged: number;
  skippedAmbiguous: number;
  errors: number;
  recordedMutations: Array<{ mutationId: string; action: string; claimId: string }>;
}> {
  const stats = {
    eligible: 0,
    mutations: 0,
    unchanged: 0,
    skippedAmbiguous: 0,
    errors: 0,
    recordedMutations: [] as Array<{ mutationId: string; action: string; claimId: string }>,
  };

  const sb = getSupabase();

  for (const claim of claims) {
    const { observations, skippedAmbiguous } = deriveNumericObservations(claim, context);
    if (skippedAmbiguous) stats.skippedAmbiguous++;

    for (const obs of observations) {
      stats.eligible++;
      try {
        const { data, error } = await sb.rpc("record_verified_numeric_claim", {
          p_ingest_run_id: ingestRunId,
          p_canonical_key: obs.canonicalKey,
          p_entity: obs.entity,
          p_metric: obs.metric,
          p_period: obs.period,
          p_unit: obs.unit,
          p_syllabus_node_id: obs.syllabusNodeId,
          p_syllabus_tags: obs.syllabusTags,
          p_claim_text: obs.claimText,
          p_value_text: obs.valueText,
          p_numeric_value: obs.numericValue,
          p_value_hash: obs.valueHash,
          p_evidence_quote: obs.evidenceQuote,
          p_evidence_span_ids: obs.evidenceSpanIds,
          p_source_id: obs.sourceId,
          p_source_url: obs.sourceUrl,
          p_source_body_sha256: obs.sourceBodySha256,
          p_story_headline: obs.storyHeadline,
          p_story_url: obs.storyUrl,
        });

        if (error) {
          console.error(`[rebase] RPC error recording claim ${obs.canonicalKey}:`, error);
          stats.errors++;
          continue;
        }

        const res = Array.isArray(data) ? data[0] : data;
        if (res?.changed) {
          stats.mutations++;
          stats.recordedMutations.push({
            mutationId: res.mutation_id,
            action: res.action,
            claimId: res.claim_id,
          });
        } else {
          stats.unchanged++;
        }
      } catch (err) {
        console.error(`[rebase] Exception recording claim ${obs.canonicalKey}:`, err);
        stats.errors++;
      }
    }
  }

  return stats;
}

/**
 * Record a Proof-of-Omission decision in news_ingest_decisions.
 */
export async function recordIngestDecision(decision: {
  ingestRunId: string;
  sourceId: string;
  candidateUrl?: string;
  candidateFingerprint: string;
  decision: "included" | "dropped_no_text" | "excluded" | "duplicate" | "clustered" | "unsupported" | "budget_omission" | "failed";
  reasonCode: string;
  claimId?: string | null;
  mutationId?: string | null;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const sb = getSupabase();
    await sb.from("news_ingest_decisions").insert({
      ingest_run_id: decision.ingestRunId,
      source_id: decision.sourceId,
      candidate_url: decision.candidateUrl || null,
      candidate_fingerprint: decision.candidateFingerprint,
      decision: decision.decision,
      reason_code: decision.reasonCode,
      claim_id: decision.claimId || null,
      mutation_id: decision.mutationId || null,
      metadata: decision.metadata || {},
    });
  } catch (err) {
    console.warn(`[rebase] Non-fatal error recording decision for ${decision.candidateFingerprint}:`, err);
  }
}
