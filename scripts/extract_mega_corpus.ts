import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function extractAll() {
  console.log("--> Fetching all public.current_affairs (927 rows)...");
  let allCA: any[] = [];
  let page = 0;
  const pageSize = 1000;

  const { data: caRows, error: caErr } = await supabase
    .from('current_affairs')
    .select('*')
    .order('published_at', { ascending: true });

  if (caErr) {
    console.error("Error fetching current_affairs:", caErr);
  } else {
    allCA = caRows || [];
    console.log(`--> Retrieved ${allCA.length} rows from current_affairs.`);
  }

  console.log("--> Fetching pib_digests...");
  const { data: pibRows } = await supabase.from('pib_digests').select('*').order('date', { ascending: true });
  console.log(`--> Retrieved ${pibRows?.length || 0} rows from pib_digests.`);

  console.log("--> Fetching current_affairs_mcqs...");
  const { data: mcqRows } = await supabase.from('current_affairs_mcqs').select('*').order('created_at', { ascending: true });
  console.log(`--> Retrieved ${mcqRows?.length || 0} rows from current_affairs_mcqs.`);

  const megaCorpus = {
    extracted_at: new Date().toISOString(),
    current_affairs_articles: allCA,
    pib_digests: pibRows || [],
    current_affairs_mcqs: mcqRows || []
  };

  const outputPath = path.resolve(process.cwd(), 'scripts', 'data', 'mega_news_corpus_snapshot.json');
  fs.writeFileSync(outputPath, JSON.stringify(megaCorpus, null, 2), 'utf-8');
  console.log(`\nSuccessfully written mega-corpus to ${outputPath}`);
  console.log(`File size: ${(fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2)} MB`);
}

extractAll();
