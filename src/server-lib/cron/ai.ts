import { Client } from "@gradio/client";
import type { CronConfig } from "./config.js";

export type AiInsight = {
  text: string;
};

/**
 * STRICT 3-ELEMENT NORMALIZER
 * - Strips markdown bullet markers (-, *, •, #, ##)
 * - Removes section header lines (e.g. "Facts:", "Metrics:", "Outlays:")
 * - Flattens sub-bullets (indented lines) into their parent via "; "
 * - Forces output to exactly 3 elements joined by "\n"
 */
function normalizeToThreeBullets(raw: string): string {
  const s = raw.trim();
  if (!s) return "";

  const lines = s.split("\n").map((l) => l.trim()).filter(Boolean);

  const stripped = lines.map((line) =>
    line.replace(/^[-•*#]+\s+/, "").replace(/^#{1,6}\s+/, "").trim()
  ).filter(Boolean);

  const headerPattern = /^(Facts|Metrics|Outlays|Key Points|Summary|Details|Action Items|Background|Introduction|Conclusion|Overview|Highlights):?\s*$/i;
  const noHeaders = stripped.filter((line) => !headerPattern.test(line));

  const flattened: string[] = [];
  for (const line of noHeaders) {
    if (flattened.length > 0 && /^\s{2,}/.test(line)) {
      flattened[flattened.length - 1] += "; " + line.replace(/^\s{2,}/, "").trim();
    } else {
      flattened.push(line);
    }
  }

  while (flattened.length < 3) {
    flattened.push("Additional context pending.");
  }
  if (flattened.length > 3) {
    const extra = flattened.splice(2, flattened.length - 2);
    flattened[2] = extra.join("; ");
  }

  return flattened.join("\n");
}

function clampText(input: string, maxChars: number): string {
  return input.length <= maxChars ? input : input.slice(0, maxChars);
}

export async function getLlama3Insight(
  policyText: string,
  config: CronConfig
): Promise<AiInsight | null> {
  const promptText = [
    "You are a policy summarizer. Return exactly 3 compact standalone sentences, one per line.",
    "Do NOT use any markdown markers (-, *, •, #, ##, etc.). Do NOT use section headers like 'Facts:', 'Metrics:', 'Outlays:'.",
    "Each of the 3 lines must be a complete, information-dense sentence covering the policy content.",
    "",
    "Line 1: Core factual announcement or decision.",
    "Line 2: Quantitative metrics, fiscal figures, or scale.",
    "Line 3: Implementation details, timeline, or administrative context.",
    "",
    "FIRST, silently evaluate: does this content describe a systemic public administrative action, macro-economic shift, regulatory overhaul, or international trade agreement? If the content is about retail stock market advice, mutual funds, local accidents, corporate HR lawsuits, or celebrity news, return exactly the word: NULL. If YES, proceed with the 3-sentence summary as instructed above.",
    "",
    "Policy text:",
    clampText(policyText, 2000),
  ].join("\n");

  try {
    const client = await Client.connect("SKU1/meta-llama-Llama-3.1-8B-Instruct");
    
    const result = await client.predict("/chat_fn", {
      message: promptText
    });

    const aiResult = (result as any).data?.[0];
    
    if (!aiResult) {
      console.warn("[cron][ai] Gradio returned empty result");
      return null;
    }

    const rawText = typeof aiResult === "string" ? aiResult : JSON.stringify(aiResult);
    const trimmed = rawText.trim().toUpperCase();
    
    if (trimmed === "NULL" || trimmed.startsWith("NULL")) {
      console.warn("[cron][ai] AI returned NULL (self-classified as non-policy)");
      return null;
    }

    const text = normalizeToThreeBullets(rawText);
    
    if (text.length > 10) {
      return { text };
    }
  } catch (error: any) {
    console.error(`[cron][ai] Gradio connection failed: ${error.message}`);
  }
  
  return null;
}