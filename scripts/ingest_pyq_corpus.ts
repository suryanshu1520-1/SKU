import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ixngfxaerlkkcacrbdgc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required for ingestion.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const EXPORT_FILE = path.join(process.cwd(), '_raw_source_archive', 'pyq-extraction', 'verified_clean_export.json');

async function fetchAllRows(tableName: string, selectCols: string): Promise<any[]> {
  const allData: any[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectCols)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (data && data.length > 0) {
      allData.push(...data);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    } else {
      hasMore = false;
    }
  }
  return allData;
}

async function runIngestion(dryRun: boolean = false) {
  console.log(`=== Starting PYQ Database Ingestion (dryRun = ${dryRun}) ===`);
  
  const extractedQuestions: any[] = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf-8'));
  console.log(`Loaded ${extractedQuestions.length} extracted questions from export JSON.`);

  // 1. Fetch ALL existing pyq_prelims rows
  console.log('Fetching all existing pyq_prelims from live database...');
  const existingRows = await fetchAllRows('pyq_prelims', 'id, year, paper, question_num');
  const existingTuples = new Set(
    existingRows.map(r => `${r.year}_${r.paper}_${r.question_num}`)
  );
  console.log(`Found ${existingRows.length} total existing rows in pyq_prelims.`);

  // 2. Fetch valid syllabus_nodes
  const validNodes = await fetchAllRows('syllabus_nodes', 'id');
  const validNodeIds = new Set(validNodes.map(n => n.id));
  console.log(`Found ${validNodeIds.size} valid syllabus_nodes.`);

  // 3. Filter and sanitize rows to insert
  const toInsert: any[] = [];
  let skippedDuplicates = 0;
  let skippedCorrupted = 0;
  let mappedFallbackNodes = 0;

  for (const q of extractedQuestions) {
    const key = `${q.year}_${q.paper}_${q.question_num}`;
    if (existingTuples.has(key)) {
      skippedDuplicates++;
      continue;
    }

    // Quality gate: reject placeholder options or malformed stems
    const optValues = q.options ? Object.values(q.options) : [];
    const hasPlaceholder = optValues.some(v => typeof v === 'string' && /^option\s*[a-d]$/i.test(v.trim()));
    if (hasPlaceholder || !q.stem || q.stem.trim().length < 15 || optValues.length < 4) {
      skippedCorrupted++;
      continue;
    }

    let nodeId = q.node_id;
    if (!nodeId || !validNodeIds.has(nodeId)) {
      nodeId = q.paper === 'GS-2' ? 'CSAT.REAS' : 'PRE.STAT';
      mappedFallbackNodes++;
    }

    toInsert.push({
      id: q.id,
      year: q.year,
      paper: q.paper,
      question_num: q.question_num,
      question_type: q.question_type,
      stem: q.stem,
      statements: q.statements,
      options: q.options,
      official_key: q.official_key,
      node_id: nodeId,
      qualifiers: q.qualifiers,
      is_dropped: q.is_dropped || false
    });
  }

  console.log(`\nIngestion Plan:`);
  console.log(`- Net-New Rows to Insert: ${toInsert.length}`);
  console.log(`- Exact Duplicates Skipped: ${skippedDuplicates}`);
  console.log(`- Corrupted / Placeholder Questions Skipped: ${skippedCorrupted}`);
  console.log(`- Fallback Nodes Assigned (to satisfy NOT NULL): ${mappedFallbackNodes}`);

  if (dryRun) {
    console.log('\n[DRY RUN] No database writes were performed.');
    return;
  }

  // 4. Batch Insert in chunks of 50
  const CHUNK_SIZE = 50;
  let insertedCount = 0;

  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    const { error: insertErr } = await supabase
      .from('pyq_prelims')
      .upsert(chunk, { onConflict: 'id' });

    if (insertErr) {
      console.error(`Error inserting chunk ${i} - ${i + chunk.length}:`, insertErr);
      throw insertErr;
    }
    insertedCount += chunk.length;
    console.log(`Inserted ${insertedCount} / ${toInsert.length} questions...`);
  }

  console.log(`\n✅ Successfully ingested ${insertedCount} new PYQ questions into public.pyq_prelims.`);

  // 5. Update pyq_node_analytics
  console.log('\n=== Recomputing pyq_node_analytics ===');
  const allPrelims = await fetchAllRows('pyq_prelims', 'node_id, year');

  const nodeStats: Record<string, { count: number; maxYear: number }> = {};
  for (const p of allPrelims) {
    if (!p.node_id) continue;
    if (!nodeStats[p.node_id]) {
      nodeStats[p.node_id] = { count: 0, maxYear: p.year };
    }
    nodeStats[p.node_id].count++;
    if (p.year > nodeStats[p.node_id].maxYear) {
      nodeStats[p.node_id].maxYear = p.year;
    }
  }

  let analyticsUpdated = 0;
  for (const [nodeId, stat] of Object.entries(nodeStats)) {
    if (!validNodeIds.has(nodeId)) continue;
    const isDrought = stat.maxYear < 2021 || stat.count < 2;
    const recurrence = stat.count > 1 ? parseFloat(((stat.maxYear - 2000) / (stat.count - 1)).toFixed(2)) : 0;

    await supabase
      .from('pyq_node_analytics')
      .upsert({
        node_id: nodeId,
        total_prelims_count: stat.count,
        last_tested_year: stat.maxYear,
        is_drought_topic: isDrought,
        recurrence_interval_avg: recurrence
      }, { onConflict: 'node_id' });
    analyticsUpdated++;
  }

  console.log(`Updated analytics across ${analyticsUpdated} syllabus nodes.`);
  console.log('=== Ingestion & Synchronization Complete ===');
}

const isDryRun = process.argv.includes('--dry-run');
runIngestion(isDryRun).catch(console.error);
