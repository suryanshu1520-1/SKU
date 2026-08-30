/**
 * scripts/translate-pib-hindi-headlines.ts
 *
 * Scans `public.current_affairs` for any articles containing Hindi/Devanagari headlines
 * or raw truncated press release titles, and contextually translates them into
 * clean, high-impact, uniform, and accessible English policy headlines.
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { llmGenerate } from "../server-lib/llm.js";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface CurrentAffairsRow {
  id: string;
  source: string;
  ministry: string;
  headline: string;
  url: string;
  summary: any;
}

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

async function translateHeadlineContextually(row: CurrentAffairsRow): Promise<string> {
  const summaryBullets = Array.isArray(row.summary?.bullets) ? row.summary.bullets.join(" ") : "";
  const prelims = row.summary?.prelims || "";
  const mains = row.summary?.mains || "";
  const context = `${summaryBullets} ${prelims} ${mains}`.trim();

  const prompt = `You are the Lead Editorial Director of Tark (an analytical UPSC CSE policy intelligence platform).
We have an authentic Press Information Bureau (PIB) / Government release where the headline was ingested in raw Hindi or needs contextual translation.

Headline / Source Title: "${row.headline}"
Ministry / Department: "${row.ministry || "Government of India"}"
English Brief Context: "${context.slice(0, 1500)}"

Task:
Translate and synthesize the headline into a single, complete, crisp, authoritative, contextual ENGLISH headline (10 to 22 words) suitable for civil service aspirants and policy makers.

Rules:
1. Output ONLY the clean translated English headline string on a single line.
2. Do NOT output quotes, prefixes (like "Headline:"), markdown, or commentary.
3. Ensure the sentence is complete, grammatically sound, and conveys the full policy substance.
4. Correctly preserve all government schemes, bodies, and acronyms (e.g. MMDR Amendment Act, SAIL, BRICS, High Court Bench, PM-KISAN, SPMCIL).`;

  try {
    const res = await llmGenerate({
      prompt,
      temperature: 0.2,
      maxTokens: 4096, // generous tokens so Gemini thinking mode doesn't truncate the output
    });

    if (res && res.text) {
      let englishHeadline = res.text.trim().replace(/^["']|["']$/g, "").trim();
      englishHeadline = englishHeadline.replace(/^(Headline|Translated Headline|English Headline):\s*/i, "").trim();
      // Remove any trailing ellipsis or unfinished quotes
      englishHeadline = englishHeadline.replace(/["'\\]/g, "");

      if (englishHeadline.length >= 10 && !DEVANAGARI_REGEX.test(englishHeadline)) {
        return englishHeadline;
      }
    }
  } catch (err: any) {
    console.warn(`[translate] LLM translation error for ID ${row.id}: ${err?.message ?? err}`);
  }

  // Fallback: extract from prelims note
  if (row.summary?.prelims) {
    const firstSentence = row.summary.prelims.split(".")[0].trim();
    if (firstSentence && !DEVANAGARI_REGEX.test(firstSentence)) {
      return firstSentence;
    }
  }
  return row.headline;
}

async function main() {
  console.log("=".repeat(75));
  console.log("  TARK INTELLIGENCE — PIB HINDI HEADLINE TRANSLATION & UNIFICATION");
  console.log("=".repeat(75));

  // Query all rows from current_affairs
  const { data: rows, error } = await supabase
    .from("current_affairs")
    .select("id, source, ministry, headline, url, summary");

  if (error || !rows) {
    console.error("Failed to query current_affairs table:", error?.message);
    process.exit(1);
  }

  // Find rows with Devanagari characters or truncated short headlines from previous run
  const candidates = rows.filter((r) => {
    if (DEVANAGARI_REGEX.test(r.headline)) return true;
    // Check if previous run left a truncated title ending abruptly
    if (
      r.headline.endsWith("Convenes Hindi Advisory") ||
      r.headline.endsWith("MMDR Amendment Act") ||
      r.headline.endsWith("Welcomes Cabinet") ||
      r.headline.endsWith("Youth Delegates Visit") ||
      r.headline.endsWith("Chairs Review") ||
      r.headline.endsWith("Minorities Reviews") ||
      r.headline.endsWith("on India’s")
    ) {
      return true;
    }
    return false;
  });

  console.log(`Discovered ${candidates.length} articles requiring English contextual translation/refinement across ${rows.length} total records.`);

  if (candidates.length === 0) {
    console.log("All headlines are already clean, uniform English. No translation needed.");
    return;
  }

  let updatedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i];
    console.log(`\n[${i + 1}/${candidates.length}] Translating: "${row.headline.substring(0, 60)}..."`);

    const translatedHeadline = await translateHeadlineContextually(row);
    console.log(`  -> Translated English: "${translatedHeadline}"`);

    const { error: updateError } = await supabase
      .from("current_affairs")
      .update({ headline: translatedHeadline })
      .eq("id", row.id);

    if (updateError) {
      console.error(`  [FAILED] DB update failed for ID ${row.id}:`, updateError.message);
      failedCount++;
    } else {
      console.log(`  [UPDATED] Successfully updated record in DB.`);
      updatedCount++;
    }

    // Small rate-limit delay
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log("\n" + "=".repeat(75));
  console.log(`Translation cycle complete. Updated: ${updatedCount} | Failed: ${failedCount}`);
  console.log("=".repeat(75));

  // Verify remaining Hindi headlines
  const { data: remainingRows } = await supabase
    .from("current_affairs")
    .select("id, headline");

  const remainingHindi = (remainingRows || []).filter((r) => DEVANAGARI_REGEX.test(r.headline));
  console.log(`Remaining Hindi headlines in current_affairs: ${remainingHindi.length}`);
}

main().catch((err) => {
  console.error("Fatal error during translation:", err);
  process.exit(1);
});
