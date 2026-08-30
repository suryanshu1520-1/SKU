import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectNews() {
  console.log("=== INSPECTING BACKEND NEWS DATASET ===\n");

  const tables = [
    'pib_digests',
    'current_affairs_mcqs',
    'daily_editions',
    'verified_numeric_claims',
    'contested_claims',
    'ingest_runs',
    'news_articles',
    'curated_news'
  ];

  for (const tbl of tables) {
    try {
      const { count, error } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`Table [${tbl}]: Not present or Error: ${error.message}`);
        continue;
      }
      console.log(`Table [${tbl}]: Total Rows = ${count}`);

      // Sample 3 rows to see columns
      const { data: sample, error: sampleErr } = await supabase.from(tbl).select('*').limit(3);
      if (sample && sample.length > 0) {
        console.log(`  Columns in [${tbl}]:`, Object.keys(sample[0]));
        console.log(`  Sample 1 [${tbl}]:`, JSON.stringify(sample[0], null, 2).slice(0, 300) + '...');
      }
    } catch (e: any) {
      console.log(`Table [${tbl}] check failed:`, e.message);
    }
  }

  // Let's do deeper inspection of pib_digests & current_affairs_mcqs if they exist
  try {
    const { data: pibData, error: pibErr } = await supabase
      .from('pib_digests')
      .select('id, title, ministry, release_date, tags, created_at, text_length:content')
      .limit(500);

    if (pibData && pibData.length > 0) {
      console.log(`\n--- PIB Digests Deep Sample (${pibData.length} records) ---`);
      const ministries: Record<string, number> = {};
      const dates: string[] = [];
      pibData.forEach(d => {
        const m = d.ministry || 'Unknown';
        ministries[m] = (ministries[m] || 0) + 1;
        if (d.release_date) dates.push(d.release_date);
        else if (d.created_at) dates.push(d.created_at);
      });
      dates.sort();
      console.log(`  Date span: Earliest = ${dates[0]}, Latest = ${dates[dates.length - 1]}`);
      console.log(`  Top Ministries/Sources:`, Object.entries(ministries).sort((a,b) => b[1]-a[1]).slice(0, 10));
    }
  } catch (err: any) {
    console.log("PIB inspection error:", err.message);
  }

  try {
    const { data: caData, error: caErr } = await supabase
      .from('current_affairs_mcqs')
      .select('id, headline, subject, edition_date, created_at')
      .limit(500);

    if (caData && caData.length > 0) {
      console.log(`\n--- Current Affairs MCQs Deep Sample (${caData.length} records) ---`);
      const subjects: Record<string, number> = {};
      const dates: string[] = [];
      caData.forEach(d => {
        const s = d.subject || 'Unknown';
        subjects[s] = (subjects[s] || 0) + 1;
        if (d.edition_date) dates.push(d.edition_date);
        else if (d.created_at) dates.push(d.created_at);
      });
      dates.sort();
      console.log(`  Date span: Earliest = ${dates[0]}, Latest = ${dates[dates.length - 1]}`);
      console.log(`  Top Subjects:`, Object.entries(subjects).sort((a,b) => b[1]-a[1]).slice(0, 10));
    }
  } catch (err: any) {
    console.log("CA MCQ inspection error:", err.message);
  }
}

inspectNews();
