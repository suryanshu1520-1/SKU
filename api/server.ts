import express from "express";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import bookmarkHandler from "../server-lib/bookmark.js";
import explanationHandler from "../server-lib/explanation.js";
import insightsHandler from "../server-lib/insights.js";
import questionsHandler from "../server-lib/questions.js";
import submitQuizHandler from "../server-lib/submit-quiz.js";
import syncFeedHandler from "../server-lib/sync-feed.js";
import trainingQuestionsHandler from "../server-lib/training-questions.js";
import registerHandler from "../server-lib/auth/register.js";
import scrapeHandler from "../server-lib/cron/scrape.js";
import internalWorkerHandler from "../server-lib/internal/worker.js";
import newsdataHandler from "../server-lib/cron/newsdata.js";
import resetLeaderboardHandler from "../server-lib/cron/reset-leaderboard.js";
import createRazorpayOrderHandler from "../server-lib/create-razorpay-order.js";
import verifyPaymentHandler from "../server-lib/verify-payment.js";

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
const rawSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmdmeGFlcmxra2NhY3JiZGdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDIxNjc0NCwiZXhwIjoyMDk1NzkyNzQ0fQ.BY5YQh7nbSUrNZ61nHDIuzOX2P2s3iD3L_s11QHz9mg";
const supabaseServer = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseKey));

const rawSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmdmeGFlcmxra2NhY3JiZGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTY3NDQsImV4cCI6MjA5NTc5Mjc0NH0.G44wtBZZKGPb-ZTX3zaIPCXFcRtPP9Vtv-0saO0dEXE";
const supabaseAnon = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseAnonKey));

const app = express();
app.use(express.json());

// Mount route handlers
app.get("/api/cron/scrape", scrapeHandler);
app.post("/api/cron/scrape", scrapeHandler);
app.get("/api/cron/newsdata", newsdataHandler);
app.post("/api/cron/newsdata", newsdataHandler);
app.get("/api/cron/reset-leaderboard", resetLeaderboardHandler);
app.post("/api/cron/reset-leaderboard", resetLeaderboardHandler);

app.all("/api/bookmark", bookmarkHandler);
app.post("/api/explanation", explanationHandler);
app.post("/api/insights", insightsHandler);
app.get("/api/questions", questionsHandler);
app.post("/api/submit-quiz", submitQuizHandler);
app.post("/api/sync-feed", syncFeedHandler);
app.get("/api/internal/worker", internalWorkerHandler);
app.post("/api/training-questions", trainingQuestionsHandler);
app.post("/api/auth/register", registerHandler);
app.post("/api/create-razorpay-order", createRazorpayOrderHandler);
app.post("/api/verify-payment", verifyPaymentHandler);

// Inline API routes
app.get("/api/questions/inline", async (req: any, res: any) => {
  try {
    const { data, error } = await supabaseAnon
      .from('static_questions')
      .select('*')
      .limit(500);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ questions: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
});

app.post("/api/auth/register/inline", async (req: any, res: any) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
  try {
    const emailLower = email.toLowerCase().trim();
    const { data, error } = await supabaseServer.auth.admin.createUser({
      email: emailLower, password: password, email_confirm: true,
      user_metadata: { name: name || emailLower.split('@')[0] }
    });
    if (error) return res.status(422).json({ error: error.message });
    return res.json({ success: true, user: { id: data.user?.id, email: data.user?.email, name: data.user?.user_metadata?.name } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
});

app.post("/api/insights/inline", async (req: any, res: any) => {
  const { stats } = req.body;
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ 
        insights: {
          overallInsights: "### AI-Guided Performance Diagnostics\n\n- **Priority Mastery Target:** Based on your diagnostic telemetry, your primary focus should be the subject with the lowest correct-response ratio.\n- **Cognitive Pacing & Accuracy:** Your current answering speed is well-calibrated, but risk-aversion on complex protocols must be minimized.\n- **Pacing Control:** Try allocating a hard threshold of 45 seconds per question.",
          subjectInsights: {}
        }
      });
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are an expert tutor. Provide analysis based on: ${JSON.stringify(stats, null, 2)}. Provide up to 3 bullet points.
      
You MUST return your response as a JSON object with exactly two keys:
1. "overallInsights": A markdown string containing the 3 bullet points.
2. "subjectInsights": An object mapping each subject name to a 1-2 sentence personalized feedback string based on their missed questions.

Return ONLY valid JSON.`,
    });
    
    try {
      let text = response.text.trim();
      if (text.startsWith('\`\`\`json')) text = text.slice(7);
      if (text.startsWith('\`\`\`')) text = text.slice(3);
      if (text.endsWith('\`\`\`')) text = text.slice(0, -3);
      const parsed = JSON.parse(text);
      return res.json({ insights: parsed });
    } catch (parseErr) {
      return res.json({ insights: { overallInsights: response.text, subjectInsights: {} } });
    }
  } catch (error: any) {
    return res.json({ insights: { overallInsights: "AI insights temporarily unavailable.", subjectInsights: {} } });
  }
});

app.post("/api/explanation/inline", async (req: any, res: any) => {
  const { question, answer } = req.body;
  try {
    if (!process.env.GEMINI_API_KEY) return res.json({ explanation: "AI explanation unavailable." });
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Explain this question and answer:\nQuestion: ${question}\nAnswer: ${answer}\n\n2-3 bullet points.`,
    });
    return res.json({ explanation: response.text });
  } catch (error: any) {
    return res.json({ explanation: "AI explanation temporarily unavailable." });
  }
});

app.post("/api/submit-quiz/inline", async (req: any, res: any) => {
  try {
    const payload = req.body;
    if (!payload.userId || !payload.questions || !payload.answers) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const totalQuestions = payload.questions.length;
    let correctCount = 0, incorrectCount = 0, unattemptedCount = 0;
    for (const q of payload.questions) {
      const selected = payload.answers[q.id] || payload.answers[String(q.id)] || null;
      const correctOpt = q.correct_option?.trim() || '';
      if (!selected) { unattemptedCount++; }
      else if (selected === correctOpt) { correctCount++; }
      else { incorrectCount++; }
    }
    const isRanked = payload.isRanked !== undefined ? payload.isRanked : true;
    const { data: session, error: sessionError } = await supabaseServer.from('quiz_sessions').insert({
      user_id: payload.userId, correct_count: correctCount, incorrect_count: incorrectCount,
      unattempted_count: unattemptedCount, total_time_seconds: payload.totalTimeSeconds || 0,
      subject_stats: payload.subjectStats || {}, percentile: 0, is_ranked: isRanked,
    }).select('id').single();
    if (sessionError) return res.status(500).json({ error: "Failed to record session: " + sessionError.message });
    return res.status(200).json({ sessionId: session.id, stats: { correct: correctCount, incorrect: incorrectCount, unattempted: unattemptedCount } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
});

export default async function handler(req: any, res: any) {
  return app(req, res);
}