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

const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
if (!rawSupabaseUrl) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Supabase URL missing.");
const rawSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!rawSupabaseKey) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Secret missing.");
const supabaseServer = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseKey));

// Dedicated anon role client for accessing restricted tables (e.g., static_questions) bypass permission denied issues
const rawSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!rawSupabaseAnonKey) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Supabase Anon Key missing.");
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

const STATIC_FALLBACK_ANSWERS: Record<string, { correct_option: string; explanation: string }> = {
  static_1: { correct_option: 'B', explanation: 'Statement 1 is correct: Thermoluminescence dating measures trapped electrons released as light upon reheating, dating fired clay and terracotta. Statement 2 is incorrect: Stratigraphy is a relative dating method based on the Law of Superposition, not an absolute chronometric method. Statement 3 is correct: Dendrochronology analyzes annual tree ring patterns to establish exact calendar-year chronologies.' },
  static_2: { correct_option: 'B', explanation: 'Statement 1 is incorrect: Punch-marked coins of the ancient period were made of precious metals (primarily silver and copper) and had intrinsic commodity value. Statement 2 is correct: Indo-Greeks and Guptas pioneered regular die-struck circular coins carrying royal effigies, dates, and bilingual legends (Brahmi/Greek/Kharoshthi). Statement 3 is correct: Contemporary Indian coins are fiduciary tokens backed by state guarantee rather than metal scrap value.' },
  static_3: { correct_option: 'C', explanation: 'In Jain philosophy, jiva (conscious soul) permeates all matter in varying degrees. Entities are classified by the number of senses (indriyas): ekendriya (one-sensed beings including earth-bodied, water-bodied, fire-bodied, and air-bodied souls) to panchendriya (five-sensed beings).' },
  static_4: { correct_option: 'A', explanation: 'Dhanyakataka (identified with modern Dharanikota/Amaravati in the Guntur district of Andhra Pradesh, along the Krishna River) was the southern capital of the Satavahanas and a renowned citadel of the Mahasanghika school.' },
  static_5: { correct_option: 'B', explanation: 'Nirvana literally means \'blowing out\' or \'extinction\' (like a flame deprived of fuel). It represents the cessation of the fires of raga (passion/craving), dvesha (hatred/aversion), and moha (delusion/ignorance).' },
  static_6: { correct_option: 'B', explanation: 'Statement 1 is incorrect: Nagara temples feature cruciform square plans; stellate (star-shaped) plans are characteristic of Hoysala architecture. Statement 2 is correct: Dravida temples feature stepped pyramidal Vimanas and massive Gopurams. Statement 3 is correct: Vesara architecture synthesized North and South Indian idioms.' },
  static_7: { correct_option: 'B', explanation: 'In Minerva Mills (1980), affirming Kesavananda Bharati (1973), the Supreme Court ruled that a limited amending power is one of the basic features of the Constitution. Parliament cannot use Article 368 to expand that power into an absolute or unlimited power.' },
  static_8: { correct_option: 'B', explanation: 'Introduced in April 2022 under amended Section 17 of the RBI Act 1934, the Standing Deposit Facility (SDF) is an uncollateralized liquidity absorption window. Unlike Reverse Repo, it does not require RBI to pledge G-Sec collateral.' },
  static_9: { correct_option: 'B', explanation: 'The Wildlife (Protection) Amendment Act 2022 streamlined the 6 schedules into 4: Schedule I (highest protection animal species), Schedule II (lesser protection animal species), Schedule III (protected plant species), and Schedule IV (CITES specimens).' }
};

export default async function handler(req: any, res: any) {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question, answer, questionId } = req.body || {};

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  if (!token) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing authorization token." });
  }

  const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "User identification required." });
  }
  const userId = user.id;

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
    let dbQuestion: any = null;
    let correctOption: string | undefined = undefined;
    let effectiveAnswer = answer;

    // Handle static fallback questions
    if (questionId && STATIC_FALLBACK_ANSWERS[questionId]) {
      const staticItem = STATIC_FALLBACK_ANSWERS[questionId];
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      return res.status(200).json({
        explanation: staticItem.explanation,
        correct_option: staticItem.correct_option
      });
    }

    // Handle current affairs MCQs
    if (questionId && String(questionId).startsWith('ca_')) {
      const rawCaId = String(questionId).replace(/^ca_/, '');
      try {
        const { data: caRow, error: caErr } = await supabaseAnon
          .from('current_affairs_mcqs')
          .select('id, question, options, correct_index, explanation, subject')
          .eq('id', rawCaId)
          .maybeSingle();

        if (!caErr && caRow) {
          const keys = ['A', 'B', 'C', 'D'];
          const correctOpt = keys[caRow.correct_index] || 'A';
          res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
          return res.status(200).json({
            explanation: caRow.explanation || 'Daily current affairs factual and conceptual distillation.',
            correct_option: correctOpt
          });
        }
      } catch (caEx) {
        console.warn("Current affairs explanation fetch error:", caEx);
      }
    }

    // Step 1: Query the database first for question metadata and correct option
    if (questionId) {
      try {
        const { data, error } = await supabaseAnon
          .from('static_questions')
          .select('id, correct_option, options_matrix, ai_insights, conceptual_explanation, is_generated')
          .eq('id', questionId)
          .maybeSingle();

        if (!error && data) {
          dbQuestion = data;
          correctOption = data.correct_option?.trim();
          if (correctOption && data.options_matrix) {
            const matrix = typeof data.options_matrix === 'string' ? JSON.parse(data.options_matrix) : data.options_matrix;
            if (matrix && matrix[correctOption]) {
              effectiveAnswer = matrix[correctOption];
            }
          }
        }
      } catch (dbErr) {
        console.warn("Vercel Supabase query-first cache error:", dbErr);
      }
    }

    if (dbQuestion && dbQuestion.ai_insights) {
      // ─── LEDGER INCREMENT: Cache HIT path ───────────────
      try {
        await incrementInsightLedger(userId);
      } catch (incErr) {
        console.error("[ledger] Failed to increment on DB cache hit:", incErr);
      }
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      return res.status(200).json({
        explanation: dbQuestion.ai_insights,
        correct_option: correctOption
      });
    }

    // Handlers for fallback if AI fails or key is missing
    const handleFallback = async () => {
      if (dbQuestion && dbQuestion.conceptual_explanation) {
        // Fallback conceptual explanations are static content — do NOT increment ledger
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.status(200).json({
          explanation: dbQuestion.conceptual_explanation,
          correct_option: correctOption
        });
      }
      return res.status(200).json({
        explanation: "- Detailed AI insights are currently throttled or unavailable.\n- Please refer to core textbook materials or consult reference sources for this topic.",
        correct_option: correctOption
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
      contents: `You are an expert academic tutor. Provide a conceptual explanation for the following question and its correct answer.\nQuestion: ${question}\nCorrect Answer: ${effectiveAnswer || 'Standard Solution'}\n\nRequirement: Provide 2-3 insightful bullet points with highly credible information about the subject matter. Mention potential credible sources or origin of the concept if applicable. Be extremely concise. Format strictly in markdown without introductory fluff.`,
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
    return res.status(200).json({
      explanation: generatedInsights,
      correct_option: correctOption
    });
  } catch (error: any) {
    console.error("Gemini API Error (explanation):", error);
    // NOTE: No ledger increment here — user is NOT charged for failed operations
    if (questionId) {
      try {
        const { data: dbQuestion } = await supabaseServer
          .from('static_questions')
          .select('correct_option, conceptual_explanation')
          .eq('id', questionId)
          .maybeSingle();

        if (dbQuestion && dbQuestion.conceptual_explanation) {
          return res.status(200).json({
            explanation: dbQuestion.conceptual_explanation,
            correct_option: dbQuestion.correct_option?.trim()
          });
        }
      } catch (e) {}
    }
    
    return res.status(200).json({
      explanation: "- Detailed AI insights are currently throttled or unavailable due to high demand.\n- Please refer to your offline studies or standard reference materials for details."
    });
  }
}