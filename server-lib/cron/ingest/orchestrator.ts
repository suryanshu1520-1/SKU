/**
 * server-lib/cron/ingest/orchestrator.ts
 *
 * The ONE ingestion path, now in three tiers:
 *
 *   Tier 1 GATHER     discover → dedup(url) → extract → no-text gate → Candidate
 *   Tier 2 CLUSTER    embed → in-memory cosine → Story{sources[]}, authority lead
 *                     + cross-run dedup vs recently-stored stories
 *   Tier 3 SYNTHESIZE synthesize ONCE per story (from the lead) → upsert
 *
 * Hard rules (unchanged from P2):
 *   - No-text-no-story gate — never synthesize from a headline.
 *   - One classifier, one synthesis path, one DB contract.
 *   - Every source reports success/failure to source_reputation.
 *
 * P3 keeps the current_affairs frontend contract intact — clustering's win is
 * fewer duplicate cards + the authoritative version winning. Persisting the
 * full sources[] array / embeddings is deferred to the P5 schema migration.
 */

import { createClient } from "@supabase/supabase-js";
import { getSources } from "./sources.js";
import { synthesizeStructured, synthesizeGrounded, type StructuredSynthesis, type GroundedSynthesis } from "./synthesize.js";
import type { VerifiedClaim } from "./verify.js";
import { gateEvent, defaultResolveActor } from "../../policy/events.ts";
import { buildIndex, resolve, aliasVariants, type ResolverIndex, type AliasRow } from "../../policy/resolve.ts";
import { enqueueReview } from "../../policy/review-queue.ts";
import { deriveMinistry, isExcluded, isEphemeralTrivia, policyConfidence } from "./classify.js";
import { getEmbedder, cosine } from "./embeddings.js";
import { clusterCandidates, makeStory, storyCentroid, embedText } from "./cluster.js";
import { scoreStory } from "./significance.js";
import { findContestedClaims } from "./contested.js";
import { generateMcq } from "./mcq.js";
import { upsertMcq } from "./mcq-db.js";
import { upsertCurrentAffairs, upsertPibDigest } from "../db.js";
import { callUpdateSourceReputation } from "../../internal/reputation.js";
import { llmAvailable } from "../../llm.js";
import { processDispatchIntoPolicyGraph, runPolicyGraphWorker } from "../policy-graph-worker.js";
import { rebuildLineage } from "../policy-lineage-worker.js";
import { assignNode } from "../../policy/node-assign.ts";
import {
  startIngestRun,
  finishIngestRun,
  recordVerifiedClaims,
  recordIngestDecision,
} from "./rebase.js";
import type {
  Candidate,
  IngestOptions,
  IngestResult,
  SourceAdapter,
  SourceStat,
} from "./types.js";

const DEFAULTS = {
  maxItemsPerSource: 8,
  maxTotalItems: 24,
  timeBudgetMs: 50_000,
  minBodyChars: 400,
  respectReputation: false,
};

function sb() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Supabase URL missing");
  return createClient(url, key);
}

let cachedProgramIndex: ResolverIndex | null = null;
let lastProgramFetch = 0;

async function getProgramResolver(client: ReturnType<typeof sb>): Promise<(m: string) => string | null> {
  const now = Date.now();
  if (!cachedProgramIndex || now - lastProgramFetch > 60_000) {
    try {
      const { data } = await client.from("policy_programs").select("program_slug, name, aliases");
      const rows: AliasRow[] = [];
      if (Array.isArray(data)) {
        for (const p of data) {
          const names = [p.name, ...(Array.isArray(p.aliases) ? p.aliases : [])];
          for (const name of names) {
            if (!name) continue;
            for (const v of aliasVariants(name)) {
              rows.push({ alias_norm: v, entity_slug: p.program_slug });
            }
          }
        }
      }
      cachedProgramIndex = buildIndex(rows);
      lastProgramFetch = now;
    } catch {
      if (!cachedProgramIndex) cachedProgramIndex = buildIndex([]);
    }
  }

  return (mention: string) => {
    if (!cachedProgramIndex) return null;
    const res = resolve(mention, cachedProgramIndex);
    return res.status === "resolved" ? res.slug : null;
  };
}

async function processPolicyEventsForDispatch(params: {
  dispatchId: string;
  sourceUrl: string;
  publishedAt: string | null;
  nodeId: string | null;
  grounded: GroundedSynthesis | null;
  ingestRunId?: string;
  sourceId: string;
}): Promise<{ storedCount: number; hadError: boolean }> {
  const { dispatchId, sourceUrl, publishedAt, nodeId, grounded, ingestRunId, sourceId } = params;
  const frames = grounded?.policy_events ?? [];
  const spans = grounded?.spans ?? [];

  if (!frames.length || !spans.length) {
    return { storedCount: 0, hadError: false };
  }

  const client = sb();
  const resolveProgram = await getProgramResolver(client);
  let storedCount = 0;
  let hadError = false;

  for (let seq = 0; seq < frames.length; seq++) {
    const frame = frames[seq];
    const actorRes = defaultResolveActor(frame.actor);

    let reviewId: number | null = null;
    if (actorRes.status !== "resolved") {
      const citedQuote =
        (frame.spans || [])
          .map((idx) => spans[idx]?.text)
          .filter(Boolean)
          .join(" ") || frame.summary;
      try {
        const rev = await enqueueReview(frame.actor, citedQuote, sourceUrl, actorRes);
        if (rev.ok && rev.id) {
          reviewId = rev.id;
        }
      } catch (revErr) {
        console.warn(`[ingest][events] Review enqueue warning:`, revErr);
      }
    }

    const gate = gateEvent(frame, spans, {
      dispatchId,
      seq,
      sourceUrl,
      releaseDate: publishedAt,
      ingestedAt: new Date().toISOString(),
      resolveActor: () => actorRes,
      resolveProgram,
      extractorVersion: "events_v1",
      reviewId,
      nodeId,
    });

    if (!gate.ok) {
      if (ingestRunId) {
        const reason = "reason" in gate ? gate.reason : "unknown";
        void recordIngestDecision({
          ingestRunId,
          sourceId,
          candidateUrl: sourceUrl,
          candidateFingerprint: `${sourceUrl}#event${seq}`,
          decision: "excluded",
          reasonCode: `event_${reason}`,
        });
      }
      continue;
    }

    try {
      if (gate.autoProgram) {
        await client
          .from("policy_programs")
          .upsert([gate.autoProgram], { onConflict: "program_slug" });
      }

      const { ring_depth: _rd, ...insertPayload } = gate.row;
      const { error: eventErr } = await client
        .from("policy_events")
        .upsert([insertPayload], { onConflict: "dispatch_id,event_seq" });

      if (eventErr) {
        console.error(`[ingest][events] Failed to insert policy event:`, eventErr.message);
        hadError = true;
      } else {
        storedCount++;
      }
    } catch (persistErr) {
      console.error(`[ingest][events] Exception persisting policy event:`, persistErr);
      hadError = true;
    }
  }

  return { storedCount, hadError };
}

/** Exponential-backoff gate, mirroring the sync-feed dispatcher's logic. */
async function reputationEligible(
  client: ReturnType<typeof sb>,
  ids: string[]
): Promise<Set<string>> {
  const eligible = new Set(ids);
  try {
    const { data } = await client
      .from("source_reputation")
      .select("source_id, fail_count, last_failure_at")
      .in("source_id", ids);
    for (const row of data ?? []) {
      const fails = row.fail_count ?? 0;
      if (fails > 0 && row.last_failure_at) {
        const cooldown = Math.min(5 * 60 * 1000 * Math.pow(2, fails - 1), 86_400_000);
        if (Date.now() - new Date(row.last_failure_at).getTime() < cooldown) {
          eligible.delete(row.source_id);
          console.log(`[ingest] backing off volatile source: ${row.source_id}`);
        }
      }
    }
  } catch (err: any) {
    console.warn(`[ingest] reputation lookup failed (open by default): ${err?.message ?? err}`);
  }
  return eligible;
}

// ============================================================
// Tier 1 — GATHER
// ============================================================
async function gatherSource(
  src: SourceAdapter,
  client: ReturnType<typeof sb>,
  opts: Required<IngestOptions>,
  budget: { deadline: number },
  result: IngestResult,
  out: Candidate[],
  runId: string | null = null
): Promise<void> {
  const stat: SourceStat = { discovered: 0, processed: 0, dropped: 0 };
  result.by_source[src.id] = stat;
  const started = Date.now();
  let sawSuccess = false;
  let taken = 0;

  try {
    const refs = await src.discover();
    stat.discovered = refs.length;
    result.total_discovered += refs.length;
    console.log(`[ingest] ${src.id}: discovered ${refs.length}`);

    const gate = src.minBodyChars ?? opts.minBodyChars;

    for (const ref of refs) {
      if (taken >= opts.maxItemsPerSource) break;
      if (Date.now() > budget.deadline) {
        console.warn("[ingest] gather: time budget reached");
        break;
      }
      if (!ref.url || !ref.title) continue;

      if (isEphemeralTrivia(ref.title, ref.body ?? "")) {
        if (runId) {
          void recordIngestDecision({
            ingestRunId: runId,
            sourceId: src.id,
            candidateUrl: ref.url,
            candidateFingerprint: `${src.id}:${ref.url}`,
            decision: "excluded",
            reasonCode: "REJECTED_EPHEMERAL_TRIVIA",
            metadata: { title: ref.title },
          });
        }
        result.filtered++;
        continue;
      }

      if (isExcluded(ref.title, ref.body ?? "")) {
        result.filtered++;
        continue;
      }

      // Early dedup vs DB — save extraction spend.
      const { data: existing } = await client
        .from("current_affairs")
        .select("id")
        .eq("url", ref.url)
        .maybeSingle();
      if (existing) {
        result.duplicates++;
        continue;
      }

      let extracted;
      try {
        extracted = await src.extract(ref);
      } catch (err: any) {
        console.warn(`[ingest] ${src.id} extract error: ${err?.message ?? err}`);
        result.errors++;
        continue;
      }
      const body = extracted?.body ?? "";
      const headline = extracted?.title || ref.title;

      if (src.preSummarized) {
        if (!body) {
          stat.dropped++;
          result.dropped_no_text++;
          continue;
        }
        sawSuccess = true;
        taken++;
        out.push({
          source: src.id, tier: src.tier, lang: src.lang, url: ref.url,
          headline, body, ministryHint: extracted?.ministryHint || ref.ministryHint, preSummarized: true,
          bullets: [body],
        });
        continue;
      }

      // THE NO-TEXT-NO-STORY GATE.
      if (body.length < gate) {
        console.log(`[ingest] ${src.id} dropped (body ${body.length} < ${gate}): ${headline.slice(0, 60)}`);
        stat.dropped++;
        result.dropped_no_text++;
        continue;
      }
      sawSuccess = true; // real text extracted → source-health success

      // Wire sources: relevance confidence (primary/world relevant by construction).
      if (src.tier === "wire" && policyConfidence(headline, body, src.id) < 0.5) {
        result.filtered++;
        continue;
      }

      taken++;
      out.push({
        source: src.id, tier: src.tier, lang: src.lang, url: ref.url,
        headline, body, ministryHint: extracted?.ministryHint || ref.ministryHint,
      });
    }
  } catch (err: any) {
    console.error(`[ingest] ${src.id} source failed: ${err?.message ?? err}`);
    result.errors++;
  } finally {
    await callUpdateSourceReputation(src.id, sawSuccess, Date.now() - started);
  }
}

// ============================================================
// Tier 2 — cross-run dedup helper
// ============================================================
async function recentStoredTexts(client: ReturnType<typeof sb>): Promise<string[]> {
  try {
    const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    const { data } = await client
      .from("current_affairs")
      .select("headline, summary, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(150);
    return (data ?? []).map((r: any) => {
      const bullets = Array.isArray(r.summary?.bullets) ? r.summary.bullets.join(" ") : "";
      return `${r.headline}. ${bullets.slice(0, 280)}`;
    });
  } catch (err: any) {
    console.warn(`[ingest] recent-story fetch failed: ${err?.message ?? err}`);
    return [];
  }
}

// ============================================================
// runIngest
// ============================================================
export async function runIngest(options: IngestOptions = {}): Promise<IngestResult> {
  const opts: Required<IngestOptions> = {
    sources: options.sources ?? [],
    maxItemsPerSource: options.maxItemsPerSource ?? DEFAULTS.maxItemsPerSource,
    maxTotalItems: options.maxTotalItems ?? DEFAULTS.maxTotalItems,
    timeBudgetMs: options.timeBudgetMs ?? DEFAULTS.timeBudgetMs,
    respectReputation: options.respectReputation ?? DEFAULTS.respectReputation,
    minBodyChars: options.minBodyChars ?? DEFAULTS.minBodyChars,
  };

  const result: IngestResult = {
    status: "success",
    processed: 0,
    dropped_no_text: 0,
    filtered: 0,
    duplicates: 0,
    clustered_merged: 0,
    cross_run_duplicates: 0,
    errors: 0,
    total_discovered: 0,
    by_source: {},
  };

  if (!llmAvailable()) {
    console.warn("[ingest] No LLM key (GEMINI_API_KEY / GROQ_API_KEY). Only pre-summarized sources will yield stories.");
    result.status = "degraded";
  }

  const client = sb();
  let sources = getSources(opts.sources.length ? opts.sources : undefined);
  if (opts.respectReputation) {
    const eligible = await reputationEligible(client, sources.map((s) => s.id));
    sources = sources.filter((s) => eligible.has(s.id));
  }
  console.log(`[ingest] starting — sources: ${sources.map((s) => s.id).join(", ")}`);

  let runId: string | null = null;
  try {
    runId = await startIngestRun({
      pipelineVersion: "rebase-v1",
      requestedSources: sources.map((s) => s.id),
    });
    result.ingest_run_id = runId;
  } catch (err: any) {
    console.warn(`[ingest] Non-fatal: could not create news_ingest_run row: ${err?.message ?? err}`);
  }

  const deadline = Date.now() + opts.timeBudgetMs;

  try {
    // ---------- Tier 1: GATHER ----------
    const candidates: Candidate[] = [];
    for (const src of sources) {
      if (Date.now() > deadline) break;
      await gatherSource(src, client, opts, { deadline }, result, candidates, runId);
    }
    console.log(`[ingest] gathered ${candidates.length} candidates`);

    if (candidates.length === 0) {
      console.log("[ingest] nothing to cluster — done");
      return result;
    }

    // ---------- Tier 2: CLUSTER ----------
    const embedder = getEmbedder();
    result.embed_mode = embedder.mode;
    const vectors = await embedder.embed(candidates.map(embedText));
    const groups = clusterCandidates(candidates, vectors, embedder.threshold);
    let stories = groups.map((g) => makeStory(candidates, g));
    result.clustered_merged = candidates.length - stories.length;
    console.log(`[ingest] clustered ${candidates.length} → ${stories.length} stories (${embedder.mode}, merged ${result.clustered_merged})`);

    // Cross-run dedup against recently-stored stories.
    const storedTexts = await recentStoredTexts(client);
    if (storedTexts.length > 0) {
      const storedVecs = await embedder.embed(storedTexts);
      const kept = [];
      for (const story of stories) {
        const sc = storyCentroid(story, candidates, vectors);
        let dupe = false;
        for (const sv of storedVecs) {
          if (cosine(sc, sv) >= embedder.threshold) {
            // Rebase Fact-Aware Dedup: check if story carries a recognized fact
            // If it carries a recognized numeric fact quad, conservatively retain to allow value change verification
            const isPrimary = story.lead.tier === "primary";
            if (!isPrimary) {
              dupe = true;
              break;
            }
          }
        }
        if (dupe) {
          result.cross_run_duplicates += story.members.length;
          console.log(`[ingest] cross-run dupe dropped: ${story.lead.headline.slice(0, 60)}`);
          if (runId) {
            void recordIngestDecision({
              ingestRunId: runId,
              sourceId: story.lead.source,
              candidateUrl: story.lead.url,
              candidateFingerprint: story.lead.url,
              decision: "duplicate",
              reasonCode: "cross_run_semantic_duplicate",
            });
          }
        } else {
          kept.push(story);
        }
      }
      stories = kept;
    }

    // ---------- Tier 3: SYNTHESIZE + UPSERT (ranked by significance) ----------
    // Compute edition_date in IST (UTC+5:30)
    const nowUtc = Date.now();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const editionDate = new Date(nowUtc + istOffsetMs).toISOString().slice(0, 10);

    // Score each story and sort descending by significance
    const scoredStories = stories.map((s) => ({
      story: s,
      significance: scoreStory(s),
      cluster_size: s.sources.length,
    }));
    scoredStories.sort((a, b) => b.significance - a.significance);

    let remaining = opts.maxTotalItems;
    let mcqCount = 0;
    const MAX_MCQS_PER_RUN = 8;

    for (const item of scoredStories) {
      if (remaining <= 0 || Date.now() > deadline) break;
      const { story, significance, cluster_size } = item;
      const lead = story.lead;

      let bullets: string[] = [];
      let tags: string[] = [];
      let prelims = "";
      let mains = "";
      let structuredData: StructuredSynthesis | null = null;
      let claims: Array<VerifiedClaim & { source: string; url: string; verification_method?: string }> = [];
      let grounding: number | undefined;
      let groundedResult: GroundedSynthesis | null = null;

      if (lead.preSummarized && lead.bullets?.length) {
        bullets = lead.bullets;
        tags = lead.tier === "world" ? ["GS2 International Relations"] : ["GS2 Governance"];
      } else {
        // Cite-or-drop first; fall back to ungrounded structured so the edition is
        // never starved when a source resists span-anchoring.
        const grounded = await synthesizeGrounded({
          title: lead.headline,
          body: lead.body,
          lang: lead.lang,
        });
        groundedResult = grounded;
        const structured =
          grounded ??
          (await synthesizeStructured({
            title: lead.headline,
            body: lead.body,
            lang: lead.lang,
          }));
        if (!structured || !structured.bullets.length || !structured.tags.length) {
          result.filtered++;
          if (runId) {
            void recordIngestDecision({
              ingestRunId: runId,
              sourceId: lead.source,
              candidateUrl: lead.url,
              candidateFingerprint: lead.url,
              decision: "unsupported",
              reasonCode: "synthesis_filtering_failed",
            });
          }
          continue;
        }
        structuredData = structured;
        bullets = structured.bullets;
        tags = structured.tags;
        prelims = structured.prelims;
        mains = structured.mains;
        if (grounded) {
          // Source passed cite-or-drop: only publish bullets that passed verification
          const verifiedClaims = grounded.claims.filter((c) => c.verified);
          if (verifiedClaims.length < bullets.length) {
            bullets = verifiedClaims.map((c) => c.text);
          }
          if (bullets.length === 0) {
            result.filtered++;
            continue;
          }
          claims = verifiedClaims.map((c) => ({
            ...c,
            source: lead.source,
            url: lead.url,
            verification_method: "live_cite_or_drop_v1",
          }));
          grounding = 100;
        } else {
          // Grounding failed or ungrounded fallback: DO NOT manufacture fake self-quoting claims
          claims = [];
          grounding = 0;
        }
      }

      const finalSignificance = scoreStory(story, { tags });

      const ministry = deriveMinistry(
        `${lead.headline} ${lead.body.slice(0, 400)}`,
        lead.tier === "world" ? "International Affairs" : "Government of India",
        lead.ministryHint
      );

      // Top K=8 significance non-preSummarized stories get MCQs
      let hasQuiz = false;
      if (mcqCount < MAX_MCQS_PER_RUN && !lead.preSummarized) {
        try {
          const mcq = await generateMcq({
            headline: lead.headline,
            bullets,
            body: lead.body,
            lang: lead.lang,
          });
          if (mcq) {
            const mcqUpsert = await upsertMcq({
              affair_url: lead.url,
              headline: lead.headline,
              question: mcq.question,
              options: mcq.options,
              correct_index: mcq.correct_index,
              explanation: mcq.explanation,
              subject: mcq.subject,
              edition_date: editionDate,
            });
            if (mcqUpsert.ok) {
              hasQuiz = true;
              mcqCount++;
            } else {
              console.warn(`[ingest] MCQ DB upsert failed for ${lead.url}: ${mcqUpsert.errorMessage}`);
            }
          }
        } catch (err: any) {
          console.warn(`[ingest] MCQ generation error for ${lead.headline.slice(0, 40)}: ${err?.message ?? err}`);
        }
      }

      const contested = findContestedClaims(story);

      // Build enriched summary payload conforming to the shared contract
      const summary = {
        bullets,
        significance: finalSignificance,
        tags,
        prelims,
        mains,
        sources: story.sources,
        cluster_size,
        edition_date: editionDate,
        has_quiz: hasQuiz,
        ...(structuredData?.revision_targets ? { revision_targets: structuredData.revision_targets } : {}),
        ...(structuredData?.thematic_pillars ? { thematic_pillars: structuredData.thematic_pillars } : {}),
        ...(structuredData?.mains_analysis ? { mains_analysis: structuredData.mains_analysis } : {}),
        ...(structuredData?.static_linkages ? { static_linkages: structuredData.static_linkages } : {}),
        ...(structuredData?.prelims_trap_radar ? { prelims_trap_radar: structuredData.prelims_trap_radar } : {}),
        ...(structuredData?.prelims_relevance ? { prelims_relevance: structuredData.prelims_relevance } : {}),
        ...(structuredData?.mains_relevance ? { mains_relevance: structuredData.mains_relevance } : {}),
        ...(structuredData?.exam_insights ? { exam_insights: structuredData.exam_insights } : {}),
        // Evidence-span ledger: span-anchored, cite-or-drop claims +
        // the per-brief grounding gauge. Present only when grounding succeeded.
        ...(claims.length ? { claims, verification_method: "live_cite_or_drop_v1" } : {}),
        ...(grounding !== undefined ? { grounding } : {}),
        ...(contested ? { contested } : {}),
      };

      const nodeAssignment = assignNode({
        headline: lead.headline,
        bullets,
        tags,
      });

      const upsert = await upsertCurrentAffairs({
        source: lead.source,
        ministry,
        headline: lead.headline,
        url: lead.url,
        summary,
        node_id: nodeAssignment.nodeId,
      });

      if (!upsert.ok) {
        console.error(`[ingest] ${lead.source} upsert failed: ${upsert.errorMessage}`);
        result.errors++;
        if (runId) {
          void recordIngestDecision({
            ingestRunId: runId,
            sourceId: lead.source,
            candidateUrl: lead.url,
            candidateFingerprint: lead.url,
            decision: "failed",
            reasonCode: `db_upsert_error: ${upsert.errorMessage}`,
          });
        }
      } else {
        result.processed++;
        remaining--;
        (result.by_source[lead.source] ??= { discovered: 0, processed: 0, dropped: 0 }).processed++;
        const co = story.sources.length > 1 ? ` (+${story.sources.length - 1}: ${story.sources.slice(1).join(",")})` : "";
        const quizTag = hasQuiz ? " [MCQ ✓]" : "";
        console.log(`[ingest] ✓ (Sig:${significance}) ${lead.source} [${ministry}] ${lead.headline.slice(0, 50)}${co}${quizTag}`);

        // If official government release from PIB, format and persist into pib_digests table
        if (lead.source === "PIB") {
          try {
            const pibMarkdown = formatPibDossierMarkdown({
              headline: lead.headline,
              tags,
              bullets,
              revision_targets: structuredData?.revision_targets,
              prelims_trap_radar: structuredData?.prelims_trap_radar,
              mains_analysis: structuredData?.mains_analysis,
              static_linkages: structuredData?.static_linkages,
            });

            void upsertPibDigest({
              title: `PIB Policy Dossier: ${lead.headline}`,
              date: editionDate,
              content: pibMarkdown,
              url: lead.url,
            });
            console.log(`[ingest] synchronized PIB Policy Dossier to pib_digests for: ${lead.headline.slice(0, 50)}`);
          } catch (pibErr: any) {
            console.warn(`[ingest] PIB digest sync warning: ${pibErr?.message ?? pibErr}`);
          }
        }

        // Policy Ripple Radar extraction
        if (upsert.id) {
          let eventOutcome = { storedCount: 0, hadError: false };
          try {
            eventOutcome = await processPolicyEventsForDispatch({
              dispatchId: upsert.id,
              sourceUrl: lead.url,
              publishedAt: editionDate || null,
              nodeId: nodeAssignment.nodeId,
              grounded: groundedResult,
              ingestRunId: runId,
              sourceId: lead.source,
            });
          } catch (evErr) {
            console.warn(`[ingest][events] Processing exception:`, evErr);
            eventOutcome.hadError = true;
          }

          if (process.env.RADAR_V2 === "1") {
            try {
              const client = sb();
              if (eventOutcome.hadError) {
                await client
                  .from("current_affairs")
                  .update({
                    graph_status: "failed",
                    graph_attempts: 1,
                  })
                  .eq("id", upsert.id);
              } else if (eventOutcome.storedCount >= 1) {
                await client
                  .from("current_affairs")
                  .update({
                    graph_status: "linked",
                    graph_processed_at: new Date().toISOString(),
                  })
                  .eq("id", upsert.id);
              } else {
                await client
                  .from("current_affairs")
                  .update({
                    graph_status: "no_event",
                    graph_processed_at: new Date().toISOString(),
                  })
                  .eq("id", upsert.id);
              }
            } catch (statusErr) {
              console.warn(`[ingest] Failed to update graph_status:`, statusErr);
            }
          } else {
            // Non-blocking Policy Ripple Radar extraction (legacy V1)
            try {
              await processDispatchIntoPolicyGraph({
                id: upsert.id,
                headline: lead.headline,
                ministry,
                summary,
                url: lead.url,
                published_at: new Date().toISOString(),
              });
            } catch (graphErr) {
              console.warn(`[ingest] Policy graph extraction hiccup:`, graphErr);
            }
          }
        }

        if (runId) {
          void recordIngestDecision({
            ingestRunId: runId,
            sourceId: lead.source,
            candidateUrl: lead.url,
            candidateFingerprint: lead.url,
            decision: "included",
            reasonCode: "scored_and_upserted",
          });

          // Record live, in-memory verified claims to Rebase ledger
          if (claims.length > 0) {
            try {
              const rebaseStats = await recordVerifiedClaims(
                claims,
                {
                  storyHeadline: lead.headline,
                  storyUrl: lead.url,
                  sourceId: lead.source,
                  sourceUrl: lead.url,
                  sourceBody: lead.body,
                  syllabusTags: tags,
                  syllabusNodeId: null,
                },
                runId
              );

              result.rebase_eligible = (result.rebase_eligible || 0) + rebaseStats.eligible;
              result.rebase_mutations = (result.rebase_mutations || 0) + rebaseStats.mutations;
              result.rebase_unchanged = (result.rebase_unchanged || 0) + rebaseStats.unchanged;
              result.rebase_skipped_ambiguous = (result.rebase_skipped_ambiguous || 0) + rebaseStats.skippedAmbiguous;
              result.rebase_errors = (result.rebase_errors || 0) + rebaseStats.errors;
            } catch (rErr) {
              console.warn(`[ingest] Non-fatal Rebase ledger write error:`, rErr);
              result.rebase_errors = (result.rebase_errors || 0) + 1;
            }
          }
        }
      }
    }
  } finally {
    if (result.errors > 0 && result.processed === 0) result.status = "warning";
    if (runId) {
      await finishIngestRun(runId, {
        status: result.status === "degraded" ? "degraded" : result.errors > 0 && result.processed === 0 ? "failed" : "success",
        resultData: result,
      });
    }

    // Trigger Policy Ripple Radar worker batch update
    if (process.env.RADAR_V2 === "1") {
      try {
        await rebuildLineage({ sinceHours: 72 });
      } catch (lineageErr) {
        console.warn("[ingest] Policy lineage rebuild hiccup:", lineageErr);
      }
    } else {
      try {
        await runPolicyGraphWorker({ maxDispatches: 10 });
      } catch (graphCycleErr) {
        console.warn("[ingest] Policy graph worker cycle hiccup:", graphCycleErr);
      }
    }
  }

  console.log(
    `[ingest] done — processed:${result.processed} merged:${result.clustered_merged} ` +
      `cross_run_dupes:${result.cross_run_duplicates} dropped_no_text:${result.dropped_no_text} ` +
      `filtered:${result.filtered} url_dupes:${result.duplicates} errors:${result.errors} ` +
      `discovered:${result.total_discovered} embed:${result.embed_mode} ` +
      `rebase_mutations:${result.rebase_mutations || 0}`
  );
  return result;
}

/**
 * Formats a high-density, authoritative Policy Intelligence Dossier in Markdown
 * for the dedicated PIB Dossier viewer and archive.
 */
function formatPibDossierMarkdown(params: {
  headline: string;
  tags: string[];
  bullets: string[];
  revision_targets?: any;
  prelims_trap_radar?: string;
  mains_analysis?: any;
  static_linkages?: any[];
}): string {
  const { headline, tags, bullets, revision_targets, prelims_trap_radar, mains_analysis, static_linkages } = params;
  const sections: string[] = [];

  sections.push(`### ${headline}`);
  sections.push(`**Syllabus Mapping:** ${tags.join(" · ")}`);

  // Sovereign Mandate / Executive Intent
  if (bullets.length > 0) {
    sections.push(`> ${bullets[0]}`);
  }

  // Key Quantitative Data Matrix
  const tableRows: string[] = [];
  if (revision_targets?.nodal_body) {
    tableRows.push(`| **Nodal Authority** | ${revision_targets.nodal_body} |`);
  }
  if (revision_targets?.statutory_legal) {
    tableRows.push(`| **Statutory / Legal Basis** | ${revision_targets.statutory_legal} |`);
  }
  if (revision_targets?.data_metric) {
    tableRows.push(`| **Target Data / Fiscal Metric** | ${revision_targets.data_metric} |`);
  }
  if (tableRows.length > 0) {
    sections.push(
      ["| Parameter | Policy Specification |", "| --- | --- |", ...tableRows].join("\n")
    );
  }

  // Prelims Trap Radar
  if (prelims_trap_radar) {
    sections.push(`**🎯 Prelims Trap Radar**\n- ${prelims_trap_radar}`);
  }

  // Mains 360 Dimensions
  if (mains_analysis && (mains_analysis.context || mains_analysis.core_implications || mains_analysis.way_forward)) {
    const mainsBullets: string[] = [];
    if (mains_analysis.context) mainsBullets.push(`- **Context & Origin:** ${mains_analysis.context}`);
    if (mains_analysis.core_implications) mainsBullets.push(`- **Core Implications & Trade-offs:** ${mains_analysis.core_implications}`);
    if (mains_analysis.way_forward) mainsBullets.push(`- **Strategic Way Forward:** ${mains_analysis.way_forward}`);
    sections.push(`**🏛️ Mains Analytical Dimensions**\n${mainsBullets.join("\n")}`);
  }

  // Static Linkages
  if (static_linkages && static_linkages.length > 0) {
    const staticBullets = static_linkages.map((s) => `- **${s.concept}:** ${s.textbook_context}`);
    sections.push(`**📚 Static Textbook Linkages**\n${staticBullets.join("\n")}`);
  }

  return sections.join("\n\n");
}


