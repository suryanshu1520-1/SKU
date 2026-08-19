/**
 * server-lib/cron/ingest/mcq.ts
 *
 * Tier 4 — MCQ Generation for top significance stories (P4 briefs ↔ arena bridge).
 *
 * Generates one UPSC Prelims-style analytical multiple choice question grounded
 * STRICTLY in the provided verified facts (no outside knowledge, no hallucinations).
 *
 * Output: 4 options, 1 correct index (0-3), detailed rationale, and subject domain.
 */

import { llmGenerate } from "../../llm.js";
import type { SourceLang } from "./types.js";

export type GeneratedMcq = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  subject: string;
};

const MCQ_SYSTEM = [
  "You are a Senior Question Designer for the UPSC Civil Services Preliminary Examination.",
  "Your job is to generate exactly ONE high-quality, conceptual, four-option multiple choice question (MCQ) based STRICTLY on the provided news dispatches and verified facts.",
  "",
  "CRITICAL INVARIANTS:",
  "1. ZERO FABRICATION: Every single statement in the question and options must be verifiable directly from the provided text.",
  "2. UPSC STYLE: Match the standard UPSC Prelims tone (analytical, clear, testing core statutory, economic, constitutional, or technical concepts).",
  "3. EXACTLY 4 OPTIONS: Provide exactly 4 options labelled conceptually in an array.",
  "4. ONE CORRECT ANSWER: Specify correct_index as an integer between 0 and 3.",
  "5. EXPLANATION: Write a clear 2-3 sentence explanation explaining why the correct option is right and others are incorrect.",
  "6. SUBJECT: Categorize into one of: 'Polity & Governance', 'Economy', 'Environment & Ecology', 'Science & Technology', 'International Relations', 'Social Justice & Schemes', 'Geography & Disaster Management'.",
  "",
  "Required JSON Schema:",
  "{",
  '  "question": "string (the complete UPSC-style question stem)",',
  '  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],',
  '  "correct_index": 0, // integer 0, 1, 2, or 3',
  '  "explanation": "string (succinct, fact-based explanation)",',
  '  "subject": "string (e.g. Economy, Polity & Governance)"',
  "}",
  "",
  "If the provided text is too brief, trivial, or lacks sufficient factual depth to construct a rigorous UPSC question, respond with: {\"relevance\": \"NULL\"} or NULL.",
].join("\n");

function parseJsonSafe(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```$/, "").trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Generate a grounded UPSC Prelims MCQ for a story.
 */
export async function generateMcq(params: {
  headline: string;
  bullets: string[];
  body?: string;
  lang?: SourceLang;
}): Promise<GeneratedMcq | null> {
  const { headline, bullets, body = "", lang = "en" } = params;

  const contentContext = [
    `Headline: ${headline}`,
    "Key Verified Facts:",
    ...bullets.map((b, i) => `${i + 1}. ${b}`),
    body ? `\nContext Body:\n${body.slice(0, 3000)}` : "",
  ].join("\n");

  const prompt = [
    lang === "hi"
      ? "The following policy briefing is from an Indian government notification. Generate the MCQ and all options strictly in English."
      : "",
    "Construct one UPSC Prelims MCQ based on the facts below:",
    "",
    contentContext,
  ].filter(Boolean).join("\n");

  let result;
  try {
    result = await llmGenerate({
      system: MCQ_SYSTEM,
      prompt,
      temperature: 0.25,
      json: true,
    });
  } catch (err: any) {
    console.error(`[ingest][mcq] LLM generation error: ${err?.message ?? err}`);
    return null;
  }

  if (!result || !result.text) {
    return null;
  }

  const raw = result.text.trim();
  const upper = raw.toUpperCase();
  if (upper === "NULL" || upper.startsWith("NULL") || upper.includes('"RELEVANCE": "NULL"')) {
    return null;
  }

  const parsed = parseJsonSafe(raw);
  if (!parsed || typeof parsed !== "object") {
    console.warn(`[ingest][mcq] Failed to parse JSON for: ${headline.slice(0, 50)}`);
    return null;
  }

  const question = typeof parsed.question === "string" ? parsed.question.trim() : "";
  const rawOptions = Array.isArray(parsed.options) ? parsed.options : [];
  const options = rawOptions.map((o: any) => String(o).trim()).filter(Boolean);
  const correct_index = Number(parsed.correct_index);
  const explanation = typeof parsed.explanation === "string" ? parsed.explanation.trim() : "";
  const subject = typeof parsed.subject === "string" && parsed.subject.trim()
    ? parsed.subject.trim()
    : "General Studies";

  // Validate strict shape
  if (!question || question.length < 15) {
    console.warn(`[ingest][mcq] Invalid question stem for: ${headline.slice(0, 40)}`);
    return null;
  }

  if (options.length !== 4) {
    console.warn(`[ingest][mcq] Invalid options count (${options.length}) for: ${headline.slice(0, 40)}`);
    return null;
  }

  if (!Number.isInteger(correct_index) || correct_index < 0 || correct_index > 3) {
    console.warn(`[ingest][mcq] Invalid correct_index (${correct_index}) for: ${headline.slice(0, 40)}`);
    return null;
  }

  if (!explanation || explanation.length < 10) {
    console.warn(`[ingest][mcq] Missing explanation for: ${headline.slice(0, 40)}`);
    return null;
  }

  console.log(`[ingest][mcq] Generated MCQ for "${headline.slice(0, 45)}" via ${result.provider}/${result.model}`);
  return {
    question,
    options,
    correct_index,
    explanation,
    subject,
  };
}
