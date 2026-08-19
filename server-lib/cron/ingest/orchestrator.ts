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
import { synthesizeStructured } from "./synthesize.js";
import { deriveMinistry, isExcluded, policyConfidence } from "./classify.js";
import { getEmbedder, cosine } from "./embeddings.js";
import { clusterCandidates, makeStory, storyCentroid, embedText } from "./cluster.js";
import { scoreStory } from "./significance.js";
import { generateMcq } from "./mcq.js";
import { upsertMcq } from "./mcq-db.js";
import { upsertCurrentAffairs } from "../db.js";
import { callUpdateSourceReputation } from "../../internal/reputation.js";
import { llmAvailable } from "../../llm.js";
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
  const url = process.env.SUPABASE_URL ?? "https://ixngfxaerlkkcacrbdgc.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, key);
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
  out: Candidate[]
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
          headline, body, ministryHint: ref.ministryHint, preSummarized: true,
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
        headline, body, ministryHint: ref.ministryHint,
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

  const deadline = Date.now() + opts.timeBudgetMs;

  // ---------- Tier 1: GATHER ----------
  const candidates: Candidate[] = [];
  for (const src of sources) {
    if (Date.now() > deadline) break;
    await gatherSource(src, client, opts, { deadline }, result, candidates);
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
        if (cosine(sc, sv) >= embedder.threshold) { dupe = true; break; }
      }
      if (dupe) {
        result.cross_run_duplicates += story.members.length;
        console.log(`[ingest] cross-run dupe dropped: ${story.lead.headline.slice(0, 60)}`);
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

    if (lead.preSummarized && lead.bullets?.length) {
      bullets = lead.bullets;
      tags = lead.tier === "world" ? ["GS2 International Relations"] : ["GS2 Governance"];
    } else {
      const structured = await synthesizeStructured({
        title: lead.headline,
        body: lead.body,
        lang: lead.lang,
      });
      if (!structured || !structured.bullets.length || !structured.tags.length) {
        result.filtered++;
        continue;
      }
      bullets = structured.bullets;
      tags = structured.tags;
      prelims = structured.prelims;
      mains = structured.mains;
    }

    const finalSignificance = scoreStory(story, { tags });

    const ministry = deriveMinistry(
      `${lead.headline} ${lead.body.slice(0, 400)}`,
      lead.ministryHint ?? (lead.tier === "world" ? "International Affairs" : "Government of India")
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
    };

    const upsert = await upsertCurrentAffairs({
      source: lead.source,
      ministry,
      headline: lead.headline,
      url: lead.url,
      summary,
    });

    if (!upsert.ok) {
      console.error(`[ingest] ${lead.source} upsert failed: ${upsert.errorMessage}`);
      result.errors++;
    } else {
      result.processed++;
      remaining--;
      (result.by_source[lead.source] ??= { discovered: 0, processed: 0, dropped: 0 }).processed++;
      const co = story.sources.length > 1 ? ` (+${story.sources.length - 1}: ${story.sources.slice(1).join(",")})` : "";
      const quizTag = hasQuiz ? " [MCQ ✓]" : "";
      console.log(`[ingest] ✓ (Sig:${significance}) ${lead.source} [${ministry}] ${lead.headline.slice(0, 50)}${co}${quizTag}`);
    }
  }

  if (result.errors > 0 && result.processed === 0) result.status = "warning";
  console.log(
    `[ingest] done — processed:${result.processed} merged:${result.clustered_merged} ` +
      `cross_run_dupes:${result.cross_run_duplicates} dropped_no_text:${result.dropped_no_text} ` +
      `filtered:${result.filtered} url_dupes:${result.duplicates} errors:${result.errors} ` +
      `discovered:${result.total_discovered} embed:${result.embed_mode}`
  );
  return result;
}

