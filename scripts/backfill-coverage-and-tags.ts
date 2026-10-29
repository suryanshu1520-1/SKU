/**
 * scripts/backfill-coverage-and-tags.ts
 *
 * Backfill script to classify and tag all 1,786+ articles in current_affairs:
 * 1. Sets exact coverage_scope ('india' | 'cross_border' | 'international')
 * 2. Backfills authentic UPSC syllabus tags and topic labels into summary.tags
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { determineCoverageScope, type CoverageScope } from "../server-lib/news/coverage-classifier.js";
import { deriveArticleSyllabusTag } from "../src/lib/syllabus-tagger.js";

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !key) {
    throw new Error("Missing Supabase credentials in environment");
  }
  return createClient(url, key);
}

async function main() {
  console.log("=== Tark Article Coverage & Syllabus Tag Backfill ===");
  const supabase = getSupabase();

  // Fetch all articles using pagination
  const articles: any[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("current_affairs")
      .select("id, source, ministry, headline, url, summary, node_id, coverage_scope")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Failed to fetch articles:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    articles.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`Fetched all ${articles.length} articles from current_affairs.`);

  const stats = {
    total: articles.length,
    india: 0,
    cross_border: 0,
    international: 0,
    tags_added: 0,
    updated: 0,
    errors: 0,
  };

  const BATCH_SIZE = 50;
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (art) => {
        const existingSummary = art.summary && typeof art.summary === "object" ? art.summary : { bullets: [] };
        const existingTags = Array.isArray(existingSummary.tags) ? existingSummary.tags : [];
        const bodyText = Array.isArray(existingSummary.bullets) ? existingSummary.bullets.join(" ") : "";

        // 1. Determine exact coverage scope
        const scope: CoverageScope = determineCoverageScope({
          source: art.source,
          ministry: art.ministry,
          headline: art.headline,
          body: bodyText,
          tags: existingTags,
        });

        stats[scope]++;

        // 2. Derive authentic UPSC syllabus tag
        const syllabusTag = deriveArticleSyllabusTag({
          source: art.source,
          ministry: art.ministry,
          headline: art.headline,
          tags: existingTags,
          node_id: art.node_id,
        });

        // 3. Ensure tags are present in summary
        let tagsToSave = existingTags;
        let summaryUpdated = false;

        if (existingTags.length === 0) {
          tagsToSave = [syllabusTag.badge, `${syllabusTag.paper}: ${syllabusTag.topic}`];
          summaryUpdated = true;
          stats.tags_added++;
        }

        const nextSummary = {
          ...existingSummary,
          tags: tagsToSave,
          syllabus_paper: syllabusTag.paper,
          syllabus_topic: syllabusTag.topic,
        };

        try {
          const { error: updateErr } = await supabase
            .from("current_affairs")
            .update({
              coverage_scope: scope,
              summary: nextSummary,
            })
            .eq("id", art.id);

          if (updateErr) {
            console.error(`Error updating article ${art.id}:`, updateErr.message);
            stats.errors++;
          } else {
            stats.updated++;
          }
        } catch (e: any) {
          console.error(`Exception updating article ${art.id}:`, e);
          stats.errors++;
        }
      })
    );

    if ((i + BATCH_SIZE) % 200 === 0 || i + BATCH_SIZE >= articles.length) {
      console.log(`Processed ${Math.min(i + BATCH_SIZE, articles.length)}/${articles.length}...`);
    }
  }

  console.log("\n================ BACKFILL COMPLETE ================");
  console.log(`Total Articles:       ${stats.total}`);
  console.log(`Classified 'india':   ${stats.india} (${((stats.india / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Classified 'cross_border': ${stats.cross_border} (${((stats.cross_border / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Classified 'international': ${stats.international} (${((stats.international / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Tags Backfilled:      ${stats.tags_added}`);
  console.log(`Updated Rows in DB:   ${stats.updated}`);
  console.log(`Errors:               ${stats.errors}`);
  console.log("===================================================\n");
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
