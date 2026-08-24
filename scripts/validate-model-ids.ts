/**
 * scripts/validate-model-ids.ts
 *
 * Validates all model IDs referenced across the codebase against provider APIs (WS-0.3).
 * Fails loudly with non-zero exit code if any model ID 404s, is not found, or fails auth.
 */

import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

const GEMINI_EMBED_MODELS = [
  "gemini-embedding-001",
];

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

async function validateGeminiModels(apiKey: string) {
  console.log("\n--- Validating Gemini Models ---");
  const ai = new GoogleGenAI({ apiKey });
  let failures = 0;

  for (const model of GEMINI_MODELS) {
    try {
      const res: any = await ai.models.generateContent({
        model,
        contents: "ping",
        config: { maxOutputTokens: 5 },
      });
      const text = typeof res?.text === "string" ? res.text : String(res?.text ?? "");
      console.log(`[PASS] Gemini Gen Model '${model}' -> response received (${text.length} chars)`);
    } catch (err: any) {
      console.error(`[FAIL] Gemini Gen Model '${model}' failed: ${err?.message || err}`);
      failures++;
    }
  }

  for (const model of GEMINI_EMBED_MODELS) {
    try {
      const res: any = await ai.models.embedContent({
        model,
        contents: "test probe",
        config: { taskType: "SEMANTIC_SIMILARITY", outputDimensionality: 768 },
      });
      const values = res?.embeddings?.[0]?.values ?? res?.embedding?.values ?? [];
      if (!values.length) {
        throw new Error("Empty embedding returned");
      }
      console.log(`[PASS] Gemini Embed Model '${model}' -> vector dim ${values.length}`);
    } catch (err: any) {
      console.error(`[FAIL] Gemini Embed Model '${model}' failed: ${err?.message || err}`);
      failures++;
    }
  }

  return failures;
}

async function validateGroqModels(apiKey: string) {
  console.log("\n--- Validating Groq Models ---");
  let failures = 0;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }

      const json: any = await res.json();
      const content = json.choices?.[0]?.message?.content || "";
      console.log(`[PASS] Groq Model '${model}' -> response received (${content.length} chars)`);
    } catch (err: any) {
      console.error(`[FAIL] Groq Model '${model}' failed: ${err?.message || err}`);
      failures++;
    }
  }

  return failures;
}

async function main() {
  console.log("=== Starting Model ID Validation Suite ===");
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!geminiKey && !groqKey) {
    console.warn("[SKIP] Neither GEMINI_API_KEY nor GROQ_API_KEY provided in environment. Skipping live probes.");
    process.exit(0);
  }

  let totalFailures = 0;

  if (geminiKey) {
    totalFailures += await validateGeminiModels(geminiKey);
  } else {
    console.log("[SKIP] GEMINI_API_KEY not found in environment.");
  }

  if (groqKey) {
    totalFailures += await validateGroqModels(groqKey);
  } else {
    console.log("[SKIP] GROQ_API_KEY not found in environment.");
  }

  console.log(`\n=== Validation Finished: ${totalFailures} failures ===`);
  if (totalFailures > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal validation harness error:", err);
  process.exit(1);
});
