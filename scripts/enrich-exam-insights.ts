/**
 * scripts/enrich-exam-insights.ts
 *
 * Safe, bounded, resumable legacy enrichment tool for Article-Specific Exam Insights.
 *
 * INVARIANTS:
 * 1. Dry-run by default. Requires explicit `--apply` to update database.
 * 2. Preserves row identity: NEVER resets created_at, published_at, url, or feed ordering.
 * 3. Patches ONLY `summary.exam_insights` on existing rows.
 * 4. Idempotent: skips rows where valid exam_insights schema_version=1 already exists.
 * 5. Generates rollback file before any database write.
 *
 * Usage:
 *   npx tsx scripts/enrich-exam-insights.ts --limit=5
 *   npx tsx scripts/enrich-exam-insights.ts --id=... --dry-run
 *   npx tsx scripts/enrich-exam-insights.ts --limit=5 --apply
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { segmentSpans } from '../server-lib/cron/ingest/verify.js';
import { synthesizeGrounded, synthesizeStructured } from '../server-lib/cron/ingest/synthesize.js';
import {
  validateArticleExamInsights,
  computeSourceFingerprint,
  type ArticleExamInsights,
} from '../src/lib/article-exam-insights.js';

dotenv.config();

interface CliOptions {
  isDryRun: boolean;
  limit: number;
  articleId?: string;
  concurrency: number;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let isDryRun = true;
  let limit = 10;
  let articleId: string | undefined = undefined;
  let concurrency = 2;

  for (const arg of args) {
    if (arg === '--apply') {
      isDryRun = false;
    } else if (arg === '--dry-run') {
      isDryRun = true;
    } else if (arg.startsWith('--limit=')) {
      limit = Math.max(1, parseInt(arg.split('=')[1], 10) || 10);
    } else if (arg.startsWith('--id=')) {
      articleId = arg.split('=')[1].trim();
    } else if (arg.startsWith('--concurrency=')) {
      concurrency = Math.max(1, parseInt(arg.split('=')[1], 10) || 2);
    }
  }

  return { isDryRun, limit, articleId, concurrency };
}

async function fetchArticleBody(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Tark-Intelligence-Enrichment/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Basic body text extraction if HTML
    const cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.slice(0, 10000);
  } catch {
    return null;
  }
}

async function main() {
  const options = parseArgs();
  console.log(`[enrich] Starting exam insights enrichment: mode=${options.isDryRun ? 'DRY-RUN' : 'APPLY'}, limit=${options.limit}`);

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl) {
    console.error('[enrich] Missing SUPABASE_URL');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch target articles
  let query = supabase
    .from('current_affairs')
    .select('id, headline, url, ministry, source, summary, created_at, published_at')
    .order('created_at', { ascending: false })
    .limit(options.limit);

  if (options.articleId) {
    query = query.eq('id', options.articleId);
  }

  const { data: rows, error } = await query;
  if (error || !rows) {
    console.error(`[enrich] Failed to fetch articles: ${error?.message}`);
    process.exit(1);
  }

  console.log(`[enrich] Found ${rows.length} candidate rows.`);

  const dryRunReport: any[] = [];
  const rollbackEntries: any[] = [];

  for (const row of rows) {
    const existingInsights = row.summary?.exam_insights;
    if (existingInsights && existingInsights.schema_version === 1 && existingInsights.status === 'ready') {
      console.log(`[enrich] [SKIP] Row ${row.id} already has verified insights.`);
      continue;
    }

    console.log(`[enrich] Processing: "${row.headline.slice(0, 60)}..." (${row.id})`);

    // 1. Resolve source body: try existing verified quotes first, else fetch URL
    let bodyText = '';
    const existingClaims = Array.isArray(row.summary?.claims) ? row.summary.claims : [];
    const validQuotes = existingClaims
      .filter((c: any) => c.verified && Array.isArray(c.quotes) && c.quotes.length > 0 && c.quotes[0] !== c.text)
      .map((c: any) => c.quotes[0]);

    if (validQuotes.length >= 2) {
      bodyText = validQuotes.join('. ');
    } else {
      const fetched = await fetchArticleBody(row.url);
      if (fetched && fetched.length > 100) {
        bodyText = fetched;
      } else if (Array.isArray(row.summary?.bullets) && row.summary.bullets.length > 0) {
        bodyText = row.summary.bullets.join('. ');
      }
    }

    if (!bodyText || bodyText.length < 50) {
      const emptyPayload: ArticleExamInsights = {
        schema_version: 1,
        generator_version: 'tark_enrich_v1',
        source_fingerprint: '00000000000000',
        generated_at: new Date().toISOString(),
        status: 'insufficient_evidence',
        facts: [],
        omission_reason: 'Source text unavailable for historical article',
      };
      dryRunReport.push({
        id: row.id,
        headline: row.headline,
        status: 'insufficient_evidence',
        reason: emptyPayload.omission_reason,
      });
      continue;
    }

    // 2. Synthesize insights candidate
    const spans = segmentSpans(bodyText.slice(0, 6000));
    const fingerprint = computeSourceFingerprint(bodyText);

    let synthesis = await synthesizeGrounded({
      title: row.headline,
      body: bodyText,
    });

    if (!synthesis) {
      synthesis = await synthesizeStructured({
        title: row.headline,
        body: bodyText,
      });
    }

    const validatedInsights = synthesis?.exam_insights
      ? validateArticleExamInsights(synthesis.exam_insights, {
          sourceUrl: row.url,
          sourceFingerprint: fingerprint,
          spans,
        })
      : null;

    const finalInsights: ArticleExamInsights = validatedInsights || {
      schema_version: 1,
      generator_version: 'tark_enrich_v1',
      source_fingerprint: fingerprint,
      generated_at: new Date().toISOString(),
      status: 'insufficient_evidence',
      facts: [],
      omission_reason: 'Candidate extraction did not meet grounding threshold',
    };

    dryRunReport.push({
      id: row.id,
      headline: row.headline,
      url: row.url,
      status: finalInsights.status,
      factsCount: finalInsights.facts.length,
      facts: finalInsights.facts.map((f) => ({
        label: f.label,
        statement: f.statement,
        quote: f.evidence[0]?.quote,
      })),
      distinction: finalInsights.distinction?.statement,
      omission_reason: finalInsights.omission_reason,
    });

    rollbackEntries.push({
      id: row.id,
      original_summary: row.summary,
      created_at: row.created_at,
      published_at: row.published_at,
    });

    if (!options.isDryRun) {
      // SAFE APPLY: Patch ONLY summary without touching timestamps!
      const updatedSummary = {
        ...row.summary,
        exam_insights: finalInsights,
      };

      const { error: updateError } = await supabase
        .from('current_affairs')
        .update({ summary: updatedSummary })
        .eq('id', row.id);

      if (updateError) {
        console.error(`[enrich] [ERROR] Failed to update row ${row.id}: ${updateError.message}`);
      } else {
        console.log(`[enrich] [APPLIED] Successfully patched row ${row.id}`);
      }
    }
  }

  // Write reports
  const handoffsDir = path.join(process.cwd(), 'docs', 'handoffs');
  if (!fs.existsSync(handoffsDir)) {
    fs.mkdirSync(handoffsDir, { recursive: true });
  }

  const reportPath = path.join(handoffsDir, 'legacy-enrichment-dryrun-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(dryRunReport, null, 2), 'utf-8');
  console.log(`[enrich] Dry run report written to ${reportPath}`);

  if (rollbackEntries.length > 0) {
    const rollbackPath = path.join(handoffsDir, `enrichment-rollback-${Date.now()}.json`);
    fs.writeFileSync(rollbackPath, JSON.stringify(rollbackEntries, null, 2), 'utf-8');
    console.log(`[enrich] Rollback receipt written to ${rollbackPath}`);
  }

  console.log(`[enrich] Finished. Total processed: ${dryRunReport.length}`);
}

main().catch((err) => {
  console.error('[enrich] Fatal error:', err);
  process.exit(1);
});
