import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const envFile = path.join(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseKey = '';
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].replace(/["']/g, '');
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = trimmed.split('=')[1].replace(/["']/g, '');
    if (!supabaseKey && trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = trimmed.split('=')[1].replace(/["']/g, '');
  }
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeSubject(raw: string): string {
  const s = (raw || '').toLowerCase();
  if (s.includes('polity') || s.includes('governance') || s.includes('constitution')) return 'Polity';
  if (s.includes('economy') || s.includes('economic') || s.includes('finance')) return 'Economy';
  if (s.includes('environment') || s.includes('ecology') || s.includes('biodiversity') || s.includes('wildlife')) return 'Environment';
  if (s.includes('geography') || s.includes('agriculture')) return 'Geography';
  if (s.includes('history') || s.includes('culture') || s.includes('ancient') || s.includes('medieval')) return 'History';
  if (s.includes('science') || s.includes('tech')) return 'Science';
  if (s.includes('csat') || s.includes('comprehension') || s.includes('reasoning') || s.includes('quant')) return 'CSAT';
  return 'General Studies';
}

function normalizeCognitiveType(stem: string): string {
  const lower = stem.toLowerCase();
  if (lower.includes('which of the statements') || lower.includes('consider the following statements')) return 'Multi-Statement';
  if (lower.includes('which one of the following is correct') || lower.includes('which one of the following correctly')) return 'Direct Elimination';
  if (lower.includes('matched') || lower.includes('pair') || lower.includes('correctly matched')) return 'Paired Matching';
  if (lower.includes('passage') || lower.includes('assumption') || lower.includes('inference')) return 'Analytical Reasoning';
  return 'Conceptual Analysis';
}

async function main() {
  console.log("Fetching static_questions from Supabase...");
  const { data: dbData, error } = await supabase
    .from('static_questions')
    .select('id, exam_origin_tag, subject_category, question_text, options_matrix, correct_option, conceptual_explanation, ai_insights')
    .limit(3000);

  if (error) throw error;
  console.log(`Fetched ${dbData?.length || 0} rows from static_questions.`);

  const unified: any[] = [];
  const seenStems = new Set<string>();

  // 1. Ingest clean DB questions
  if (dbData) {
    for (const row of dbData) {
      const yearMatch = row.exam_origin_tag?.match(/20\d{2}/);
      const year = yearMatch ? parseInt(yearMatch[0]) : 2020;
      
      let matrix: Record<string, string> = {};
      if (typeof row.options_matrix === 'string') {
        try { matrix = JSON.parse(row.options_matrix); } catch {}
      } else if (row.options_matrix && typeof row.options_matrix === 'object') {
        matrix = row.options_matrix;
      }

      const optVals = Object.values(matrix);
      if (optVals.length < 4) continue;
      const isDummy = optVals.some((v: any) => typeof v === 'string' && /^\(?[a-d]\)?\s*option\s+[a-d]$/i.test(v.trim()));
      if (isDummy) continue;

      const normStem = row.question_text?.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 80);
      if (!normStem || seenStems.has(normStem)) continue;
      seenStems.add(normStem);

      const optionsArr = ['A', 'B', 'C', 'D'].map((k) => `(${k.toLowerCase()}) ${matrix[k] || matrix[k.toLowerCase()] || ''}`);

      const normSubj = normalizeSubject(row.subject_category || '');

      unified.push({
        id: `db_${row.id}`,
        year,
        paper: 'GS-1',
        stage: 'Prelims',
        subject: normSubj,
        era: year >= 2020 ? '2020-2025' : year >= 2015 ? '2015-2019' : '2011-2014',
        stem: row.question_text,
        options: optionsArr,
        correctKey: (row.correct_option || 'C').trim().toUpperCase(),
        cognitiveType: normalizeCognitiveType(row.question_text || ''),
        wordCount: row.question_text?.split(/\s+/).length || 50,
        trapAnalysis: row.conceptual_explanation || row.ai_insights || 'Authentic UPSC CSE Prelims question analysis.',
        qualifiers: { extreme: [], contingent: [] },
      });
    }
  }

  // 2. Ingest clean master PYQs
  const pMaster = path.join(process.cwd(), 'server-lib', 'analytics', 'data', 'master_7841_pyqs.json');
  if (fs.existsSync(pMaster)) {
    const masterData = JSON.parse(fs.readFileSync(pMaster, 'utf8'));
    for (const item of masterData) {
      if (!Array.isArray(item.options) || item.options.length < 4) continue;
      const isDummy = item.options.some((o: string) => /^\(?[a-d]\)?\s*Option\s+[A-D]$/i.test(o.trim()));
      if (isDummy) continue;

      const normStem = item.stem?.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 80);
      if (!normStem || seenStems.has(normStem)) continue;
      seenStems.add(normStem);

      const year = item.year || 2015;
      item.subject = normalizeSubject(item.subject || '');
      item.era = year >= 2020 ? '2020-2025' : year >= 2015 ? '2015-2019' : year >= 2011 ? '2011-2014' : '2000-2010';
      unified.push(item);
    }
  }

  // Sort descending by year (most recent first: 2025, 2024, 2023, ...)
  unified.sort((a, b) => b.year - a.year);

  console.log(`\nGenerated unified verified PYQ vault with ${unified.length} total questions.`);
  const recent15 = unified.filter((q) => q.year >= 2011);
  console.log(`Last 15 Years (2011–2025): ${recent15.length} questions.`);

  const outPath = path.join(process.cwd(), 'server-lib', 'analytics', 'data', 'verified_pyqs_15yr.json');
  fs.writeFileSync(outPath, JSON.stringify(unified, null, 2), 'utf8');
  console.log(`Saved to ${outPath}`);
}

main().catch(console.error);
