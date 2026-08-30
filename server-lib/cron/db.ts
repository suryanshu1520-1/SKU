import { createClient } from "@supabase/supabase-js";
import { llmGenerate } from "../llm.js";

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

export async function upsertCurrentAffairs(params: {
  source: string;
  headline: string;
  url: string;
  ministry: string;
  summary: { bullets: string[]; prelims?: string; mains?: string; [k: string]: unknown };
}): Promise<{ ok: boolean; errorMessage?: string }> {
  let { source, headline, url, ministry, summary } = params;

  // Auto-translate Hindi headlines into rich contextual English
  if (headline && DEVANAGARI_REGEX.test(headline)) {
    try {
      const summaryContext = `${Array.isArray(summary?.bullets) ? summary.bullets.join(" ") : ""} ${summary?.prelims || ""}`.trim();
      const prompt = `Translate and synthesize this Hindi government/PIB headline into a single, complete, crisp, authoritative English policy headline (10 to 20 words):
Headline: "${headline}"
Context: "${summaryContext.slice(0, 1000)}"
Output ONLY the clean translated English headline string without quotes or prefixes.`;

      const res = await llmGenerate({ prompt, temperature: 0.2, maxTokens: 2048 });
      if (res && res.text) {
        let clean = res.text.trim().replace(/^["']|["']$/g, "").replace(/^(Headline|Translated Headline|English Headline):\s*/i, "").trim();
        if (clean.length >= 10 && !DEVANAGARI_REGEX.test(clean)) {
          headline = clean;
        }
      }
    } catch {
      if (summary?.prelims) {
        const fallback = summary.prelims.split(".")[0].trim();
        if (fallback && !DEVANAGARI_REGEX.test(fallback)) {
          headline = fallback;
        }
      }
    }
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Supabase URL missing");

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const row = {
    source,
    headline,
    summary, // { bullets: string[] } — matches frontend contract
    url,
    ministry,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from("current_affairs")
      .upsert([row], { onConflict: "url" });

    if (error) return { ok: false, errorMessage: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, errorMessage: e?.message ?? String(e) };
  }
}