import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function fetchTable(tableName: string, selectFields = '*'): Promise<any[]> {
  const allRows: any[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectFields)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error(`Error fetching ${tableName}:`, error.message);
      break;
    }

    if (data && data.length > 0) {
      allRows.push(...data);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`✓ Fetched ${allRows.length} rows from [${tableName}]`);
  return allRows;
}

async function exportAll() {
  console.log("=== EXPORTING DATABASE FOR 5-ENGINE SIMULATION SUITE ===");
  const startTime = Date.now();

  const [
    currentAffairs,
    pibDigests,
    currentAffairsMcqs,
    pyqPrelims,
    syllabusNodes,
    pyqNodeAnalytics,
    questionAttempts,
    newsIngestDecisions,
    newsIngestRuns,
    newsClaims,
    newsClaimMutations
  ] = await Promise.all([
    fetchTable('current_affairs'),
    fetchTable('pib_digests'),
    fetchTable('current_affairs_mcqs'),
    fetchTable('pyq_prelims'),
    fetchTable('syllabus_nodes'),
    fetchTable('pyq_node_analytics'),
    fetchTable('question_attempts'),
    fetchTable('news_ingest_decisions'),
    fetchTable('news_ingest_runs'),
    fetchTable('news_claims'),
    fetchTable('news_claim_mutations')
  ]);

  const snapshot = {
    exported_at: new Date().toISOString(),
    counts: {
      current_affairs: currentAffairs.length,
      pib_digests: pibDigests.length,
      current_affairs_mcqs: currentAffairsMcqs.length,
      pyq_prelims: pyqPrelims.length,
      syllabus_nodes: syllabusNodes.length,
      pyq_node_analytics: pyqNodeAnalytics.length,
      question_attempts: questionAttempts.length,
      news_ingest_decisions: newsIngestDecisions.length,
      news_ingest_runs: newsIngestRuns.length,
      news_claims: newsClaims.length,
      news_claim_mutations: newsClaimMutations.length
    },
    current_affairs: currentAffairs,
    pib_digests: pibDigests,
    current_affairs_mcqs: currentAffairsMcqs,
    pyq_prelims: pyqPrelims,
    syllabus_nodes: syllabusNodes,
    pyq_node_analytics: pyqNodeAnalytics,
    question_attempts: questionAttempts,
    news_ingest_decisions: newsIngestDecisions,
    news_ingest_runs: newsIngestRuns,
    news_claims: newsClaims,
    news_claim_mutations: newsClaimMutations
  };

  const outPath = path.join(process.cwd(), 'scripts', 'data', 'simulations', 'db_snapshot.json');
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`\nAll tables saved successfully to ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Export completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
}

exportAll().catch(err => {
  console.error("Export failed:", err);
  process.exit(1);
});
