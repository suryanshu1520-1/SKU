import express from "express";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import rateLimit from "express-rate-limit";
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
const rawSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!rawSupabaseKey) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Secret missing.");
const supabaseServer = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseKey));

const rawSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!rawSupabaseAnonKey) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Secret missing.");
const supabaseAnon = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseAnonKey));

const app = express();
app.use(express.json());

// Rate limiter for registration endpoints
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

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

app.post("/api/auth/register/inline", registerLimiter, async (req: any, res: any) => {
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

    // Extract question IDs from the payload
    const questionIds = payload.questions.map((q: any) => String(q.id));

    // Fetch correct answers from the database — server-authoritative
    const { data: dbQuestions, error: fetchError } = await supabaseAnon
      .from('static_questions')
      .select('id, correct_option, subject_category')
      .in('id', questionIds);

    if (fetchError) {
      console.error("[submit-quiz-inline] Failed to fetch questions:", fetchError);
      return res.status(500).json({ error: "Failed to verify question answers." });
    }

    // Build a lookup map: questionId -> { correct_option, subject_category }
    const questionMap: Record<string, { correct_option: string; subject_category: string }> = {};
    for (const q of dbQuestions || []) {
      questionMap[String(q.id)] = {
        correct_option: (q.correct_option || '').trim(),
        subject_category: q.subject_category || 'CORE',
      };
    }

    // Compute scores server-side
    const totalQuestions = payload.questions.length;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let computedTotalTime = 0;
    const computedSubjectStats: Record<string, { correct: number; total: number }> = {};

    for (const q of payload.questions) {
      const qId = String(q.id);
      const selected = payload.answers[q.id] || payload.answers[String(q.id)] || null;
      const dbQuestion = questionMap[qId];
      const subject = dbQuestion?.subject_category || q.subject_category || 'CORE';
      const timeSpent = Math.min(60, Math.max(0, payload.timeSpentMap?.[q.id] || payload.timeSpentMap?.[String(q.id)] || 0));
      const isTimeout = !!payload.timeouts?.[q.id] || !!payload.timeouts?.[String(q.id)];

      if (!computedSubjectStats[subject]) {
        computedSubjectStats[subject] = { correct: 0, total: 0 };
      }
      computedSubjectStats[subject].total += 1;
      computedTotalTime += timeSpent;

      if (!selected && !isTimeout) {
        unattemptedCount += 1;
      } else if (dbQuestion && selected === dbQuestion.correct_option) {
        correctCount += 1;
        computedSubjectStats[subject].correct += 1;
      } else if (selected && selected !== dbQuestion?.correct_option) {
        incorrectCount += 1;
      } else if (isTimeout && !selected) {
        unattemptedCount += 1;
      } else {
        unattemptedCount += 1;
      }
    }

    // Ensure totals add up
    if (correctCount + incorrectCount + unattemptedCount !== totalQuestions) {
      const accounted = correctCount + incorrectCount + unattemptedCount;
      const diff = totalQuestions - accounted;
      if (diff > 0) unattemptedCount += diff;
    }

    // Compute percentile
    let computedPercentile = 0;
    const { data: pData, error: pError } = await supabaseServer.rpc('get_user_percentile', {
      target_score: correctCount,
    });
    if (!pError && pData !== null) {
      computedPercentile = Number(pData);
    }

    const isRanked = payload.isRanked !== undefined ? payload.isRanked : true;

    // Insert quiz session with server-computed values
    const { data: session, error: sessionError } = await supabaseServer
      .from('quiz_sessions')
      .insert({
        user_id: payload.userId,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        unattempted_count: unattemptedCount,
        total_time_seconds: computedTotalTime,
        subject_stats: computedSubjectStats,
        percentile: computedPercentile,
        is_ranked: isRanked,
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error("[submit-quiz-inline] Session insert error:", sessionError);
      return res.status(500).json({ error: "Failed to record session: " + sessionError.message });
    }

    const sessionId = session.id;

    // Batch insert question_attempts
    const attemptRows = payload.questions.map((q: any) => {
      const qId = String(q.id);
      const selected = payload.answers[q.id] || payload.answers[String(q.id)] || null;
      const dbQuestion = questionMap[qId];
      const isCorrect = selected ? (dbQuestion && selected === dbQuestion.correct_option) : null;
      const timeSpent = Math.min(60, Math.max(0, payload.timeSpentMap?.[q.id] || payload.timeSpentMap?.[String(q.id)] || 0));

      return {
        session_id: sessionId,
        user_id: payload.userId,
        question_id: qId,
        selected_option: selected,
        is_correct: isCorrect,
        time_spent_seconds: timeSpent,
        subject_category: dbQuestion?.subject_category || q.subject_category || null,
      };
    });

    const { error: attemptsError } = await supabaseServer
      .from('question_attempts')
      .insert(attemptRows);

    if (attemptsError) {
      console.error("[submit-quiz-inline] Attempts insert error:", attemptsError);
    }

    // If Vanguard (ranked), increment freemium quota
    if (isRanked) {
      const { error: rpcError } = await supabaseServer.rpc('increment_vanguard_count', {
        user_id_param: payload.userId,
      });
      if (rpcError) {
        console.error("[submit-quiz-inline] Failed to increment vanguard limit:", rpcError);
      }
    }

    return res.status(200).json({
      sessionId,
      percentile: computedPercentile,
      stats: {
        correct: correctCount,
        incorrect: incorrectCount,
        unattempted: unattemptedCount,
        totalTimeSeconds: computedTotalTime,
        subjectStats: computedSubjectStats,
      },
    });
  } catch (err: any) {
    console.error("[submit-quiz-inline] Exception:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
});

export default async function handler(req: any, res: any) {
  return app(req, res);
}