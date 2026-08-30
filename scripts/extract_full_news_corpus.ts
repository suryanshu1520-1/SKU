import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function extractCorpus() {
  console.log("--> Pulling complete PIB Digests...");
  const { data: pibData, error: pibErr } = await supabase
    .from('pib_digests')
    .select('*')
    .order('date', { ascending: true });

  if (pibErr) {
    console.error("PIB extract error:", pibErr);
    process.exit(1);
  }

  console.log(`--> Pulled ${pibData?.length || 0} PIB digest entries.`);

  console.log("--> Pulling complete Current Affairs MCQs...");
  const { data: caData, error: caErr } = await supabase
    .from('current_affairs_mcqs')
    .select('*')
    .order('created_at', { ascending: true });

  if (caErr) {
    console.error("CA MCQs extract error:", caErr);
    process.exit(1);
  }

  console.log(`--> Pulled ${caData?.length || 0} Current Affairs entries.`);

  const outputDir = path.resolve(process.cwd(), 'scripts', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const corpusSnapshot = {
    extracted_at: new Date().toISOString(),
    pib_digests: pibData || [],
    current_affairs: caData || []
  };

  const outputPath = path.join(outputDir, 'news_corpus_snapshot.json');
  fs.writeFileSync(outputPath, JSON.stringify(corpusSnapshot, null, 2), 'utf-8');
  console.log(`\nSuccessfully saved complete corpus snapshot to: ${outputPath}`);
  console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
}

extractCorpus();
