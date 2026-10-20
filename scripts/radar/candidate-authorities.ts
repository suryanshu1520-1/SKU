/**
 * scripts/radar/candidate-authorities.ts
 *
 * Scans the last 90 days of current_affairs records to identify frequent organisation mentions.
 * Read-only discovery tool.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

export async function getCandidateAuthorities(): Promise<Record<string, number>> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL / VITE_SUPABASE_URL is required");
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("current_affairs")
    .select("headline, summary, ministry")
    .gte("published_at", ninetyDaysAgo)
    .limit(400);

  if (error) {
    throw new Error(`DB query failed: ${error.message}`);
  }

  const freq: Record<string, number> = {};

  const orgPatterns = [
    /\b(?:Ministry of [A-Z][a-z]+(?: [A-Z][a-z]+)*(?: & [A-Z][a-z]+)?)\b/g,
    /\b(?:Department of [A-Z][a-z]+(?: [A-Z][a-z]+)*)\b/g,
    /\b(?:Reserve Bank of India|RBI|SEBI|TRAI|CCI|IRDAI|NITI Aayog|ISRO|DRDO|ECI|UPSC|CAG|Textiles Committee|FSSAI|UIDAI|NHRC|CVC|CIC|CBDT|CBIC|EPFO|ESIC|NABARD|SIDBI|BEE|CPCB|CSIR|ICMR|ICAR)\b/g,
  ];

  for (const row of rows || []) {
    const text = [
      row.headline || "",
      row.ministry || "",
      Array.isArray(row.summary?.bullets) ? row.summary.bullets.join(" ") : "",
    ].join(" ");

    for (const pat of orgPatterns) {
      const matches = text.match(pat);
      if (matches) {
        for (const m of matches) {
          const norm = m.trim();
          freq[norm] = (freq[norm] || 0) + 1;
        }
      }
    }
  }

  return freq;
}

if (process.argv[1]?.endsWith("candidate-authorities.ts") || process.argv[1]?.endsWith("candidate-authorities.js")) {
  getCandidateAuthorities()
    .then((freq) => {
      const sorted = Object.entries(freq).sort(([, a], [, b]) => b - a);
      console.log(`Found ${sorted.length} candidate mentions:`);
      for (const [k, v] of sorted.slice(0, 50)) {
        console.log(`  ${k.padEnd(50)}: ${v}`);
      }
    })
    .catch((err) => {
      console.error("Error:", err);
      process.exit(1);
    });
}
