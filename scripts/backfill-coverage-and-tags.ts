/** Read-only classification audit. Produces a reviewable plan; never updates the database. */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { classifyArticle, CLASSIFICATION_VERSION, type ClassificationInput, type CoverageScope } from '../src/lib/article-classification.js';

async function main() {
  config({ path: ['.env.local', '.env'], quiet: true });
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Read-only audit requires Supabase URL and public anon key.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const rows: Array<ClassificationInput & { id: string }> = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('current_affairs')
      .select('id,headline,source,ministry,summary,node_id,coverage_scope')
      .neq('source', 'PIB_Digest').order('id').range(offset, offset + 499);
    if (error) throw new Error(`Article read failed: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  const counts: Record<CoverageScope, number> = { india: 0, cross_border: 0, international: 0, unclassified: 0 };
  const articles = rows.map(row => {
    const proposed = classifyArticle(row);
    counts[proposed.coverage.scope]++;
    return { id: row.id, headline: row.headline, source: row.source, input: { ministry: row.ministry, bullets: row.summary?.bullets?.slice(0, 2) },
      previous: { coverage: row.coverage_scope, tags: row.summary?.tags || [], node: row.node_id }, proposed,
      scopeChanged: row.coverage_scope !== proposed.coverage.scope };
  });
  const report = { version: CLASSIFICATION_VERSION, generatedAt: new Date().toISOString(), readOnly: true,
    total: rows.length, counts, scopeChanges: articles.filter(row => row.scopeChanged).length,
    needsReview: articles.filter(row => row.proposed.needsReview).length, articles };
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/article-classification-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, articles: undefined, report: 'artifacts/article-classification-report.json' }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
