import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

dotenv.config();

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function main() {
  console.log("Fetching all 499 PIB digests from Supabase...");
  const allDigests: any[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await sb
      .from('pib_digests')
      .select('*')
      .order('date', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching pib_digests:", error);
      break;
    }
    if (data && data.length > 0) {
      allDigests.push(...data);
      if (data.length < PAGE_SIZE) hasMore = false;
      else from += PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  console.log(`Successfully fetched ${allDigests.length} PIB digests.`);
  
  // Inspect sample record
  if (allDigests.length > 0) {
    console.log("Sample columns:", Object.keys(allDigests[0]));
    console.log("Date range:", allDigests[0].date, "to", allDigests[allDigests.length - 1].date);
  }

  // Save to json file for deep processing
  const outPath = path.join(process.cwd(), 'scripts', 'data', 'simulations', 'all_pib_digests_499.json');
  fs.writeFileSync(outPath, JSON.stringify(allDigests, null, 2), 'utf-8');
  console.log(`Saved full dump to ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(console.error);
