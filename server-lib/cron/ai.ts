import { llmGenerate } from "../llm.js";
import type { CronConfig } from "./config.js"; // Kept the .js for Vercel ESM

export type AiInsight = {
  text: string;
};

/**
 * HONEST BULLET NORMALIZER
 * - Strips markdown bullet markers (-, *, •, #, ##)
 * - Removes section header lines (e.g. "Facts:", "Metrics:", "Outlays:")
 * - Flattens sub-bullets (indented lines) into their parent via "; "
 * - Returns 1–3 REAL bullets. It never pads to a fixed count with placeholder
 *   text — a story with one honest bullet is better than three where one is fake.
 *   (The previous version injected "Additional context pending." to force exactly
 *   three, which leaked fabricated bullets onto live cards. See
 *   docs/news-intelligence-architecture.md.)
 */
function normalizeBullets(raw: string): string {
  const s = raw.trim();
  if (!s) return "";

  const lines = s.split("\n").map((l) => l.trim()).filter(Boolean);

  // Phase 1: strip markdown bullet / heading markers from line starts
  const stripped = lines
    .map((line) => line.replace(/^[-•*]+\s+/, "").replace(/^#{1,6}\s+/, "").trim())
    .filter(Boolean);

  // Phase 2: drop lines that are purely a section header
  const headerPattern =
    /^(Facts|Metrics|Outlays|Key Points|Summary|Details|Action Items|Background|Introduction|Conclusion|Overview|Highlights):?\s*$/i;
  const noHeaders = stripped.filter((line) => !headerPattern.test(line));

  // Phase 3: flatten indented continuation lines into the previous bullet
  const flattened: string[] = [];
  for (const line of noHeaders) {
    if (flattened.length > 0 && /^\s{2,}/.test(line)) {
      flattened[flattened.length - 1] += "; " + line.replace(/^\s{2,}/, "").trim();
    } else {
      flattened.push(line);
    }
  }

  // Phase 4: cap at 3, but do NOT pad. Merge any surplus into the 3rd bullet
  // so nothing is lost, but never invent bullets to hit a count.
  if (flattened.length > 3) {
    const extra = flattened.splice(2, flattened.length - 2);
    flattened[2] = extra.join("; ");
  }

  return flattened.join("\n");
}

function clampText(input: string, maxChars: number): string {
  return input.length <= maxChars ? input : input.slice(0, maxChars);
}

const SYSTEM_PROMPT = [
  "You are a policy summarizer for UPSC/civil-services aspirants.",
  "Return 1 to 3 compact, standalone, information-dense sentences, one per line (prefer 3 only when the content genuinely supports it — never pad).",
  "Do NOT use any markdown markers (-, *, •, #, ##, etc.). Do NOT use section headers like 'Facts:', 'Metrics:', 'Outlays:'.",
  "When 3 lines are warranted: Line 1 = the core factual announcement or decision; Line 2 = quantitative metrics, fiscal figures, or scale; Line 3 = implementation details, timeline, or administrative context.",
  "FIRST, silently evaluate: does this content describe a systemic public administrative action, macro-economic shift, regulatory overhaul, or international agreement relevant to India? If it is retail stock advice, mutual-fund tips, local accidents, corporate HR lawsuits, or celebrity news, return exactly the word: NULL.",
].join("\n");

/**
 * Distill a policy/news item into honest, exam-relevant bullets.
 *
 * Now routed through the multi-provider llm.ts (Gemini → Groq) instead of the
 * dead Hugging Face Gradio Space. Same return contract as before so every
 * caller (pipeline.ts, scrape.ts, internal/worker.ts) works unchanged.
 * The `config` argument is retained for signature compatibility.
 */
export async function getLlama3Insight(
  policyText: string,
  _config: CronConfig
): Promise<AiInsight | null> {
  const prompt = ["Policy text:", clampText(policyText, 2000)].join("\n");

  try {
    const result = await llmGenerate({
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.3,
    });

    if (!result || !result.text) {
      console.warn("[cron][ai] All LLM providers returned empty/unavailable");
      return null;
    }

    const trimmed = result.text.trim().toUpperCase();

    // AI self-classification: non-policy content
    if (trimmed === "NULL" || trimmed.startsWith("NULL")) {
      console.warn("[cron][ai] AI returned NULL (self-classified as non-policy)");
      return null;
    }

    const text = normalizeBullets(result.text);

    if (text.length > 10) {
      console.log(`[cron][ai] Distilled via ${result.provider}/${result.model}`);
      return { text };
    }
  } catch (error: any) {
    console.error(`[cron][ai] LLM distillation failed: ${error?.message ?? String(error)}`);
  }

  return null;
}
