import { createClient } from "@supabase/supabase-js";

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
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmdmeGFlcmxra2NhY3JiZGdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDIxNjc0NCwiZXhwIjoyMDk1NzkyNzQ0fQ.BY5YQh7nbSUrNZ61nHDIuzOX2P2s3iD3L_s11QHz9mg";

const supabase = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawServiceKey));

interface AnswerMap {
  [questionId: string]: string;
}

interface TimeoutMap {
  [questionId: string]: boolean;
}

interface TimeSpentMap {
  [questionId: string]: number;
}

interface QuestionRef {
  id: string | number;
  subject_category?: string;
  correct_option?: string;
}

interface SubjectStats {
  [subject: string]: { correct: number; total: number };
}

interface SubmitPayload {
  userId: string;
  answers: AnswerMap;
  timeouts: TimeoutMap;
  timeSpentMap: TimeSpentMap;
  questions: QuestionRef[];
  subjectStats: SubjectStats;
  totalTimeSeconds: number;
  isRanked?: boolean;
}

export default async function handler(req: any, res: any) {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload: SubmitPayload = req.body;

    if (!payload.userId || !payload.questions || !payload.answers) {
      return res.status(400).json({ error: "Missing required fields: userId, questions, answers" });
    }

    // 1. Compute session-level stats from the payload
    const totalQuestions = payload.questions.length;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    const questionAttemptRows: Array<{
      session_id: string;
      user_id: string;
      question_id: string;
      selected_option: string | null;
      is_correct: boolean | null;
      time_spent_seconds: number;
      subject_category: string | null;
    }> = [];

    for (const q of payload.questions) {
      const qId = String(q.id);
      const selected = payload.answers[q.id] || payload.answers[String(q.id)] || null;
      const isTimeout = !!payload.timeouts[q.id] || !!payload.timeouts[String(q.id)];
      const timeSpent = payload.timeSpentMap[q.id] || payload.timeSpentMap[String(q.id)] || 0;
      const correctOpt = q.correct_option?.trim() || '';

      let isCorrect: boolean | null = null;

      if (!selected && !isTimeout) {
        unattemptedCount += 1;
        isCorrect = null;
      } else if (selected === correctOpt) {
        correctCount += 1;
        isCorrect = true;
      } else if (selected && selected !== correctOpt) {
        incorrectCount += 1;
        isCorrect = false;
      } else if (isTimeout && !selected) {
        unattemptedCount += 1;
        isCorrect = null;
      } else {
        unattemptedCount += 1;
      }

      questionAttemptRows.push({
        session_id: '', // will be filled after session insert
        user_id: payload.userId,
        question_id: qId,
        selected_option: selected,
        is_correct: isCorrect,
        time_spent_seconds: timeSpent,
        subject_category: q.subject_category || null,
      });
    }

    // Ensure totals add up
    if (correctCount + incorrectCount + unattemptedCount !== totalQuestions) {
      const accounted = correctCount + incorrectCount + unattemptedCount;
      const diff = totalQuestions - accounted;
      if (diff > 0) {
        unattemptedCount += diff;
      }
    }

    // 2. Compute percentile BEFORE inserting the session
    let computedPercentile: number = 0;
    const { data: pData, error: pError } = await supabase.rpc('get_user_percentile', {
      target_score: correctCount,
    });
    if (!pError && pData !== null) {
      computedPercentile = Number(pData);
    } else {
      console.warn("Percentile fetch warning (expected on first session):", pError);
    }

    // 3. Insert quiz_session with correct_count / incorrect_count naming, pre-computed percentile, and is_ranked
    const isRanked = payload.isRanked !== undefined ? payload.isRanked : true;
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id: payload.userId,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        unattempted_count: unattemptedCount,
        total_time_seconds: payload.totalTimeSeconds || 0,
        subject_stats: payload.subjectStats || {},
        percentile: computedPercentile,
        is_ranked: isRanked,
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error("CRITICAL SUBMISSION DB ERROR:", sessionError);
      return res.status(500).json({ error: "Database error", details: sessionError.message });
    }

    const sessionId = session.id;

    // 4. Batch insert question_attempts with the session_id
    const attemptRowsWithSession = questionAttemptRows.map(row => ({
      ...row,
      session_id: sessionId,
    }));

    const { error: attemptsError } = await supabase
      .from('question_attempts')
      .insert(attemptRowsWithSession);

    if (attemptsError) {
      console.error("CRITICAL SUBMISSION DB ERROR:", attemptsError);
      return res.status(500).json({ error: "Database error", details: attemptsError.message });
    }

    // 5. Return success
    return res.status(200).json({
      sessionId,
      percentile: computedPercentile,
      stats: {
        correct: correctCount,
        incorrect: incorrectCount,
        unattempted: unattemptedCount,
        totalTimeSeconds: payload.totalTimeSeconds || 0,
        subjectStats: payload.subjectStats || {},
      },
    });
  } catch (err: any) {
    console.error("CRITICAL SUBMISSION DB ERROR:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
}