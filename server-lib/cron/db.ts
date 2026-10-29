import { createClient } from "@supabase/supabase-js";
import { llmGenerate } from "../llm.js";

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

export async function upsertCurrentAffairs(params: {
  source: string;
  headline: string;
  url: string;
  ministry: string;
  summary: { bullets: string[]; prelims?: string; mains?: string; [k: string]: unknown };
  published_at?: string;
  primary_operator?: string;
  node_id?: string | null;
  source_published_at?: string | null;
  coverage_scope?: string;
}): Promise<{ ok: boolean; id?: string; errorMessage?: string }> {
  let { source, headline, url, ministry, summary, published_at, primary_operator, node_id, source_published_at, coverage_scope } = params;

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

  const nowIso = new Date().toISOString();

  // Thread source_published_at into summary metadata if provided
  if (source_published_at && !summary.source_published_at) {
    summary.source_published_at = source_published_at;
  }

  // Preserve immutable created_at and original published_at on updates
  let createdAtToUse = nowIso;
  let publishedAtToUse = published_at || nowIso;

  try {
    const { data: existing } = await supabase
      .from("current_affairs")
      .select("id, created_at, published_at")
      .eq("url", url)
      .maybeSingle();

    if (existing) {
      if (existing.created_at) createdAtToUse = existing.created_at;
      if (existing.published_at && !published_at) publishedAtToUse = existing.published_at;
    }
  } catch (lookupErr: any) {
    console.warn(`[db][upsertCurrentAffairs] existing row lookup error for ${url}:`, lookupErr?.message ?? lookupErr);
  }

  const row: Record<string, any> = {
    source,
    headline,
    summary, // { bullets: string[] } — matches frontend contract
    url,
    ministry,
    published_at: publishedAtToUse,
    created_at: createdAtToUse,
  };
  if (primary_operator) {
    row.primary_operator = primary_operator;
  }
  if (node_id) {
    row.node_id = node_id;
  }
  if (coverage_scope) {
    row.coverage_scope = coverage_scope;
  }

  try {
    const { data, error } = await supabase
      .from("current_affairs")
      .upsert([row], { onConflict: "url" })
      .select("id")
      .single();

    if (error) return { ok: false, errorMessage: error.message };
    return { ok: true, id: data?.id };
  } catch (e: any) {
    return { ok: false, errorMessage: e?.message ?? String(e) };
  }
}

export async function upsertPibDigest(params: {
  title: string;
  date: string;
  content: string;
  url: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl) return { ok: false, errorMessage: "CRITICAL_ENVIRONMENT_FAULT: Supabase URL missing" };

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const formattedDate = params.date.includes("T") ? params.date.split("T")[0] : params.date;

  const row = {
    title: params.title,
    date: formattedDate,
    content: params.content,
    url: params.url,
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from("pib_digests")
      .upsert([row], { onConflict: "url" });

    if (error) return { ok: false, errorMessage: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, errorMessage: e?.message ?? String(e) };
  }
}