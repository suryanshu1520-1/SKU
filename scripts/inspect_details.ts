import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function main() {
  const { data: pibRows } = await supabase.from('pib_digests').select('id, title, date, created_at, content');
  console.log("PIB Digits Count:", pibRows?.length);
  if (pibRows) {
    pibRows.forEach(r => {
      console.log(`[${r.date}] ${r.title} (chars: ${r.content?.length || 0})`);
    });
  }

  const { data: caRows } = await supabase.from('current_affairs_mcqs').select('id, headline, subject, edition_date, created_at, affair_url');
  console.log("\nCA MCQs Count:", caRows?.length);
  const dates = [...new Set(caRows?.map(r => r.edition_date || r.created_at?.slice(0, 10)))].sort();
  console.log("Distinct Dates:", dates);
}

main();
