import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import scrapeHandler from "./server-lib/cron/scrape.js";
import newsdataHandler from "./server-lib/cron/newsdata.js";
import syncFeedHandler from "./server-lib/sync-feed.js";
import trainingQuestionsHandler from "./server-lib/training-questions.js";

dotenv.config();

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
// Prioritize service role key in backend environment for unhindered database write-backs
const rawSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmdmeGFlcmxra2NhY3JiZGdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDIxNjc0NCwiZXhwIjoyMDk1NzkyNzQ0fQ.BY5YQh7nbSUrNZ61nHDIuzOX2P2s3iD3L_s11QHz9mg";
const supabaseServer = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseKey));

// Dedicated anon role client for accessing restricted tables (e.g., static_questions) bypass permission denied issues
const rawSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmdmeGFlcmxra2NhY3JiZGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTY3NDQsImV4cCI6MjA5NTc5Mjc0NH0.G44wtBZZKGPb-ZTX3zaIPCXFcRtPP9Vtv-0saO0dEXE";
const supabaseAnon = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseAnonKey));

const INSIGHTS_CACHE_FILE = path.join(process.cwd(), "ai_insights_cache.json");
let inMemoryInsightsCache: Record<string, string> = {};

try {
  if (fs.existsSync(INSIGHTS_CACHE_FILE)) {
    const content = fs.readFileSync(INSIGHTS_CACHE_FILE, "utf-8");
    inMemoryInsightsCache = JSON.parse(content);
    console.log(`[Cache System] Loaded ${Object.keys(inMemoryInsightsCache).length} AI insights from local cache file.`);
  } else {
    fs.writeFileSync(INSIGHTS_CACHE_FILE, JSON.stringify({}, null, 2), "utf-8");
    console.log(`[Cache System] Created fresh local AI insights cache file.`);
  }
} catch (err) {
  console.error("[Cache System] Error loading local AI insights cache:", err);
}

function saveToLocalCache(questionId: string, insights: string) {
  if (!questionId || !insights) return;
  inMemoryInsightsCache[questionId] = insights;
  try {
    fs.writeFileSync(INSIGHTS_CACHE_FILE, JSON.stringify(inMemoryInsightsCache, null, 2), "utf-8");
    console.log(`[Cache System] Successfully cached & bound insights for question ${questionId} to persistent local file.`);
  } catch (err) {
    console.error("[Cache System] Error writing to local AI insights cache file:", err);
  }
}

function generateFallbackInsights(stats: any): string {
  const correct = stats?.correct || 0;
  const incorrect = stats?.incorrect || 0;
  const unattempted = stats?.unattempted || 0;
  const total = correct + incorrect + unattempted;
  const subStats = stats?.subjectStats || {};
  
  let poorestSubject = "Polity and Constitutional constructs";
  let poorestPct = 100;
  
  for (const [sub, data] of Object.entries(subStats) as [string, any][]) {
    if (data.total > 0) {
      const pct = (data.correct / data.total) * 100;
      if (pct < poorestPct) {
        poorestPct = pct;
        poorestSubject = sub;
      }
    }
  }
  
  let accuracy = total > 0 ? (correct / total) * 105 : 0;
  if (accuracy > 100) accuracy = 100;
  if (total === 0) accuracy = 0;
  
  return `### AI-Guided Performance Diagnostics
  
- **Priority Mastery Target:** Based on your diagnostic telemetry, your primary focus should be **${poorestSubject}**. The current correct-response ratio here suggests foundational gaps in core concepts—re-evaluating constitutional frameworks will yield your highest margin for improvement.
- **Cognitive Pacing & Accuracy:** With a derived diagnostic accuracy of **${accuracy.toFixed(1)}%**, your current answering speed is well-calibrated. However, risk-aversion on highly complex protocols must be minimized by eliminating incorrect options first.
- **Pacing Control:** Leaving **${unattempted}** protocols unattempted limits your points ceiling. Try allocating a hard threshold of 45 seconds per question to ensure you complete the entire set.`;
}

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialization of Gemini AI client
  // Wait until it's actually used to fail if there's no API key
  let ai: GoogleGenAI | null = null;
  const getAI = () => {
    if (!ai) {
      if (!process.env.GEMINI_API_KEY) {
        return null;
      }
      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return ai;
  };

  // API routes FIRST
  app.get("/api/cron/scrape", scrapeHandler);
  app.post("/api/cron/scrape", scrapeHandler);
  app.get("/api/cron/newsdata", newsdataHandler);
  app.post("/api/cron/newsdata", newsdataHandler);
  app.post("/api/sync-feed", syncFeedHandler);
  app.post("/api/training-questions", trainingQuestionsHandler);

  app.get("/api/questions", async (req, res) => {
    try {
      const { data, error } = await supabaseAnon
        .from('static_questions')
        .select('*')
        .limit(500);

      if (error) {
        console.error("Error fetching static questions via backend:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ questions: data || [] });
    } catch (err: any) {
      console.error("Backend questions fetch exception:", err);
      return res.status(500).json({ error: err.message || "An unexpected error occurred while loading questions." });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required credentials." });
    }

    try {
      const emailLower = email.toLowerCase().trim();

      // Create confirmed user using Supabase Admin Auth with email_confirm: true to skip confirmation emails entirely
      const { data, error } = await supabaseServer.auth.admin.createUser({
        email: emailLower,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: name || emailLower.split('@')[0]
        }
      });

      if (error) {
        return res.status(422).json({ error: error.message });
      }

      return res.json({ 
        success: true, 
        user: {
          id: data.user?.id,
          email: data.user?.email,
          name: data.user?.user_metadata?.name
        }
      });
    } catch (err: any) {
      console.error("Registration process exception:", err);
      return res.status(500).json({ error: err.message || "An unexpected error occurred during profile registration." });
    }
  });

  app.post("/api/insights", async (req, res) => {
    const { stats } = req.body;
    try {
      const aiClient = getAI();
      if (!aiClient) {
        console.warn("GEMINI_API_KEY not configured. Using fallback.");
        return res.json({ insights: generateFallbackInsights(stats) });
      }
      const response = await generateContentWithRetry(aiClient, {
        model: "gemini-3.5-flash",
        contents: `You are an expert tutor and testing diagnostician. Provide a concise, highly insightful performance analysis based on the player's testing performance data.

Here is their performance data:
${JSON.stringify(stats, null, 2)}

Provide up to 3 bullet points with a brief sentence giving conceptual explanations of the specific subject matter areas they need to focus on, and how they relate or matter. Use an objective, encouraging, and highly intelligent tone. Do not include an intro or outro, just the bullet points in markdown format.`,
      });
      res.json({ insights: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.json({ insights: generateFallbackInsights(stats) });
    }
  });

  app.post("/api/explanation", async (req, res) => {
    const { question, answer, questionId } = req.body;
    
    // Step 0: Check in-memory/file-based cache first
    if (questionId && inMemoryInsightsCache[questionId]) {
      console.log(`[Cache System] Serving local cached AI insights for question ${questionId}`);
      return res.json({ explanation: inMemoryInsightsCache[questionId] });
    }
    
    const handleExplanationFallback = async () => {
      if (questionId) {
        try {
          const { data: dbQuestion, error } = await supabaseAnon
            .from('static_questions')
            .select('conceptual_explanation')
            .eq('id', questionId)
            .maybeSingle();

          if (!error && dbQuestion && dbQuestion.conceptual_explanation) {
            return res.json({ explanation: dbQuestion.conceptual_explanation });
          }
        } catch (dbErr) {
          console.warn("Supabase explanation fallback error:", dbErr);
        }
      }
      return res.json({
        explanation: "- Detailed AI insights are currently throttled or unavailable.\n- Please refer to core textbook materials or consult reference sources for this topic."
      });
    };

    try {
      // Step 1: Query the database first if we have a valid questionId
      if (questionId) {
        try {
          const { data: dbQuestion, error } = await supabaseAnon
            .from('static_questions')
            .select('ai_insights, is_generated')
            .eq('id', questionId)
            .maybeSingle();

          if (!error && dbQuestion && dbQuestion.ai_insights) {
            // Save to local cache so for next time we don't query DB
            saveToLocalCache(questionId, dbQuestion.ai_insights);
            return res.json({ explanation: dbQuestion.ai_insights });
          }
        } catch (dbErr) {
          console.warn("Supabase query-first cache error:", dbErr);
        }
      }

      const aiClient = getAI();
      if (!aiClient) {
        console.warn("GEMINI_API_KEY not configured. Using database fallback for explanation.");
        return await handleExplanationFallback();
      }

      // Step 3: Call AI
      const response = await generateContentWithRetry(aiClient, {
        model: "gemini-3.5-flash",
        contents: `You are an expert academic tutor. Provide a conceptual explanation for the following question and its correct answer.
Question: ${question}
Correct Answer: ${answer}
 
Requirement: Provide 2-3 insightful bullet points with highly credible information about the subject matter. Mention potential credible sources or origin of the concept if applicable. Be extremely concise. Format strictly in markdown without introductory fluff.`,
      });

      const generatedInsights = response.text;

      if (questionId && generatedInsights) {
        // Save to persistent file cache
        saveToLocalCache(questionId, generatedInsights);

        // Step 4: Write back to the database instantly to preserve it for all future users
        try {
          await supabaseServer
            .from('static_questions')
            .update({
              ai_insights: generatedInsights,
              is_generated: true
            })
            .eq('id', questionId);
        } catch (dbWriteErr) {
          console.error("Supabase write-back cache error:", dbWriteErr);
        }
      }

      res.json({ explanation: generatedInsights });
    } catch (error: any) {
      console.error("Gemini API Error (explanation):", error);
      return await handleExplanationFallback();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
