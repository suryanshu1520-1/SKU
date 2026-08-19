/**
 * server-lib/llm.ts
 * Multi-provider LLM abstraction for the ingestion / distillation pipeline.
 *
 * WHY THIS EXISTS: the previous pipeline died wholesale when a single Hugging
 * Face Gradio Space ran out of Inference-Provider credits (HTTP 402 → 503).
 * Every current-affairs path and the PIB aggregator depended on that one Space.
 * This layer removes that single point of failure: it tries providers in order
 * (Gemini primary, Groq fallback), each with its own model-fallback chain and
 * exponential backoff. One dead provider never stops ingestion.
 *
 * Providers self-disable when their API key is absent, so the module degrades
 * gracefully in environments where only some keys are configured. Model chains
 * are env-overridable (GEMINI_MODELS / GROQ_MODELS, comma-separated).
 *
 * See docs/news-intelligence-architecture.md (Phase 1).
 */

import { GoogleGenAI } from "@google/genai";

export type LlmResult = { text: string; provider: string; model: string } | null;

export type LlmParams = {
  /** Optional system / instruction preamble. */
  system?: string;
  /** The user prompt. */
  prompt: string;
  /** 0–1; defaults to 0.3 (deterministic-leaning, right for extraction). */
  temperature?: number;
  /** Hint that the model should return a JSON object. */
  json?: boolean;
};

function env(name: string): string | undefined {
  const p = (globalThis as any)?.process;
  return p && p.env ? (p.env[name] as string | undefined) : undefined;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetryable(err: any): boolean {
  const status = err?.status ?? err?.code;
  const msg = String(err?.message ?? "").toLowerCase();
  return (
    status === 429 || status === 500 || status === 503 ||
    msg.includes("429") || msg.includes("503") || msg.includes("overloaded") ||
    msg.includes("unavailable") || msg.includes("exhausted") || msg.includes("rate limit")
  );
}

// ============================================================
// Provider: Google Gemini (primary)
// ============================================================
const GEMINI_MODELS = (env("GEMINI_MODELS") || "gemini-2.5-flash,gemini-2.0-flash-lite")
  .split(",").map((s) => s.trim()).filter(Boolean);

async function geminiGenerate(params: LlmParams): Promise<LlmResult> {
  const key = env("GEMINI_API_KEY");
  if (!key) return null;

  const ai = new GoogleGenAI({ apiKey: key });
  const contents = params.prompt;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res: any = await ai.models.generateContent({
          model,
          contents,
          config: {
            temperature: params.temperature ?? 0.3,
            ...(params.system ? { systemInstruction: params.system } : {}),
            ...(params.json ? { responseMimeType: "application/json" } : {}),
          },
        });
        const text = typeof res?.text === "string" ? res.text : String(res?.text ?? "");
        if (text.trim()) return { text: text.trim(), provider: "gemini", model };
        break; // empty output → try next model
      } catch (err: any) {
        if (isRetryable(err) && attempt < 2) {
          await sleep(800 * Math.pow(2, attempt));
          continue;
        }
        break; // non-retryable or exhausted → try next model
      }
    }
  }
  return null;
}

// ============================================================
// Provider: Groq (fallback; OpenAI-compatible REST, no SDK needed)
// ============================================================
// Verified live 2026-08-19: the older llama-3.x Groq slugs now 404
// (model_not_found) on current accounts; the openai/gpt-oss-* models are the
// available free-tier chat models. Kept env-overridable via GROQ_MODELS.
const GROQ_MODELS = (env("GROQ_MODELS") || "openai/gpt-oss-120b,openai/gpt-oss-20b,llama-3.3-70b-versatile")
  .split(",").map((s) => s.trim()).filter(Boolean);

async function groqGenerate(params: LlmParams): Promise<LlmResult> {
  const key = env("GROQ_API_KEY");
  if (!key) return null;

  const messages = [
    ...(params.system ? [{ role: "system", content: params.system }] : []),
    { role: "user", content: params.prompt },
  ];

  for (const model of GROQ_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            messages,
            temperature: params.temperature ?? 0.3,
            ...(params.json ? { response_format: { type: "json_object" } } : {}),
          }),
          signal: AbortSignal.timeout(30_000),
        });

        if (!resp.ok) {
          if ((resp.status === 429 || resp.status >= 500) && attempt < 2) {
            await sleep(800 * Math.pow(2, attempt));
            continue;
          }
          break; // non-retryable → try next model
        }

        const data: any = await resp.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && String(text).trim()) {
          return { text: String(text).trim(), provider: "groq", model };
        }
        break;
      } catch {
        if (attempt < 2) {
          await sleep(800 * Math.pow(2, attempt));
          continue;
        }
        break;
      }
    }
  }
  return null;
}

// ============================================================
// Orchestrator
// ============================================================
const PROVIDERS: Array<(p: LlmParams) => Promise<LlmResult>> = [geminiGenerate, groqGenerate];

/** True if at least one provider has a configured API key. */
export function llmAvailable(): boolean {
  return Boolean(env("GEMINI_API_KEY") || env("GROQ_API_KEY"));
}

/**
 * Generate text, trying each provider in order until one succeeds.
 * Returns null only if every configured provider failed (or none are configured).
 */
export async function llmGenerate(params: LlmParams): Promise<LlmResult> {
  for (const provider of PROVIDERS) {
    try {
      const res = await provider(params);
      if (res && res.text) return res;
    } catch {
      // provider threw unexpectedly → fall through to the next one
    }
  }
  return null;
}
