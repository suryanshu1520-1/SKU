import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

function cleanEnvValue(val: any): string {
  if (typeof val !== 'string') return '';
  let cleaned = val.trim();
  while (cleaned.startsWith('"') || cleaned.startsWith("'")) {
    cleaned = cleaned.substring(1);
  }
  while (cleaned.endsWith('"') || cleaned.endsWith("'")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }
  return cleaned.trim();
}

const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://ixngfxaerlkkcacrbdgc.supabase.co";
const rawSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!rawSupabaseKey) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Secret missing.");
const supabaseServer = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseKey));

// Dedicated anon role client for accessing restricted tables (e.g., static_questions) bypass permission denied issues
const rawSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!rawSupabaseAnonKey) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Secret missing.");
const supabaseAnon = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseAnonKey));

// File-based cache removed for Vercel serverless compatibility.


async function generateContentWithRetry(aiClient: any, params: any, maxRetries = 3, initialDelay = 1000) {
  let attempt = 0;
  const originalModel = params.model || "gemini-3.5-flash";
  const modelsToTry = [originalModel, "gemini-3.1-flash-lite"];

  for (const modelName of modelsToTry) {
    attempt = 0;
    while (attempt < maxRetries) {
      try {
        const payload = { ...params, model: modelName };
        return await aiClient.models.generateContent(payload);
      } catch (error: any) {
        attempt++;
        const isRetryable = error.status === 429 || error.status === 503 || 
                            error.message?.includes('429') || error.message?.includes('503') ||
                            error.message?.toLowerCase().includes('unavailable') ||
                            error.message?.toLowerCase().includes('demand') ||
                            error.message?.toLowerCase().includes('resource_exhausted') ||
                            error.message?.toLowerCase().includes('exhausted');
        if (isRetryable) {
          if (attempt < maxRetries) {
            const delay = initialDelay * Math.pow(2, attempt - 1);
            console.log(`[info] Gemini API experiencing high traffic on ${modelName}. Re-attempting in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else if (modelName !== modelsToTry[modelsToTry.length - 1]) {
            console.log(`[info] ${modelName} retries exhausted due to high traffic. Switching fallback to ${modelsToTry[modelsToTry.length - 1]}...`);
            break;
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }
  }
}

/**
 * Increment the user's insights_consumed ledger via SECURITY DEFINER RPC.
 * Uses supabaseServer (service_role) to bypass RLS entirely.
 * Returns the new count on success, or throws on failure.
 */
async function incrementInsightLedger(userId: string): Promise<number> {
  const { data, error } = await supabaseServer.rpc('increment_insight_count', {
    user_id_param: userId,
  });

  if (error) {
    console.error("[ledger] increment_insight_count RPC failed:", error);
    throw new Error(`Ledger increment failed: ${error.message}`);
  }

  return data as number;
}

export default async function handler(req: any, res: any) {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question, answer, questionId, userId } = req.body || {};

  // ─── GUARD: userId is required ───────────────────────────────
  if (!userId) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "User identification required." });
  }

  // ─── PRE-FLIGHT: Tier & Autopsy Limit Check ─────────────────
  try {
    const { data: profile, error: profileError } = await supabaseServer
      .from('user_profiles')
      .select('membership_tier, ai_autopsies_used')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error("[ledger] Profile fetch error:", profileError);
    }

    if (profile && profile.membership_tier !== 'premium' && profile.ai_autopsies_used >= 15) {
      return res.status(403).json({
        error: "limit_reached",
        message: "Free tier autopsy limit exhausted. 15 of 15 AI autopsies used.",
        autopsiesUsed: profile.ai_autopsies_used,
      });
    }
  } catch (profileErr) {
    console.error("[ledger] Profile query exception:", profileErr);
    // Fail open — allow the request to proceed if we can't verify
  }

  // Local cache check removed for serverless compatibility.

  try {
    // Step 1: Query the database first
    if (questionId) {
      try {
        const { data: dbQuestion, error } = await supabaseAnon
          .from('static_questions')
          .select('ai_insights, is_generated')
          .eq('id', questionId)
          .maybeSingle();

        if (!error && dbQuestion && dbQuestion.ai_insights) {
          // ─── LEDGER INCREMENT: Cache HIT path ───────────────
          try {
            await incrementInsightLedger(userId);
          } catch (incErr) {
            console.error("[ledger] Failed to increment on DB cache hit:", incErr);
          }
          res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
          return res.status(200).json({ explanation: dbQuestion.ai_insights });
        }
      } catch (dbErr) {
        console.warn("Vercel Supabase query-first cache error:", dbErr);
      }
    }

    // Handlers for fallback if AI fails or key is missing
    const handleFallback = async () => {
      if (questionId) {
        try {
          const { data: dbQuestion, error } = await supabaseAnon
            .from('static_questions')
            .select('conceptual_explanation')
            .eq('id', questionId)
            .maybeSingle();

          if (!error && dbQuestion && dbQuestion.conceptual_explanation) {
            // Fallback conceptual explanations are static content — do NOT increment ledger
            res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
            return res.status(200).json({ explanation: dbQuestion.conceptual_explanation });
          }
        } catch (dbErr) {
          console.warn("Vercel Supabase query-first explanation fallback error:", dbErr);
        }
      }
      return res.status(200).json({
        explanation: "- Detailed AI insights are currently throttled or unavailable.\n- Please refer to core textbook materials or consult reference sources for this topic."
      });
    };

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined. Falling back to DB conceptual explanation.");
      return await handleFallback();
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: `You are an expert academic tutor. Provide a conceptual explanation for the following question and its correct answer.\nQuestion: ${question}\nCorrect Answer: ${answer}\n\nRequirement: Provide 2-3 insightful bullet points with highly credible information about the subject matter. Mention potential credible sources or origin of the concept if applicable. Be extremely concise. Format strictly in markdown without introductory fluff.`,
    });
    
    const generatedInsights = response.text;

    if (questionId && generatedInsights) {
      // Step 4: Write back to the database as best effort
      try {
        await supabaseServer
          .from('static_questions')
          .update({
            ai_insights: generatedInsights,
            is_generated: true
          })
          .eq('id', questionId);
      } catch (dbWriteErr) {
        console.error("Vercel Supabase write-back cache error:", dbWriteErr);
      }

      // ─── LEDGER INCREMENT: Gemini MISS → SUCCESS path ──────
      try {
        await incrementInsightLedger(userId);
      } catch (incErr) {
        console.error("[ledger] Failed to increment on Gemini success:", incErr);
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).json({ explanation: generatedInsights });
  } catch (error: any) {
    console.error("Gemini API Error (explanation):", error);
    // NOTE: No ledger increment here — user is NOT charged for failed operations
    try {
      if (questionId) {
        const { data: dbQuestion } = await supabaseServer
          .from('static_questions')
          .select('conceptual_explanation')
          .eq('id', questionId)
          .maybeSingle();

        if (dbQuestion && dbQuestion.conceptual_explanation) {
          return res.status(200).json({ explanation: dbQuestion.conceptual_explanation });
        }
      }
    } catch (e) {}
    
    return res.status(200).json({
      explanation: "- Detailed AI insights are currently throttled or unavailable due to high demand.\n- Please refer to your offline studies or standard reference materials for details."
    });
  }
}