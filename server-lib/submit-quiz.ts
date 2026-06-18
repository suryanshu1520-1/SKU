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
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!rawServiceKey) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Secret missing.");

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

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  
  if (!token) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing authorization token." });
  }
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid or expired token." });
  }

  try {
    const payload: SubmitPayload = req.body;
    // Override payload.userId with the securely resolved user.id
    payload.userId = user.id;

    if (!payload.userId || !payload.questions || !payload.answers) {
      return res.status(400).json({ error: "Missing required fields: userId, questions, answers" });
    }

    // 1. Compute session-level stats from the payload
    const totalQuestions = payload.questions.length;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let computedTotalTime = 0;
    const computedSubjectStats: Record<string, { correct: number; total: number }> = {};

    const questionAttemptRows: Array<{
      session_id: string;
      user_id: string;
      question_id: string;
      selected_option: string | null;
      is_correct: boolean | null;
      time_spent_seconds: number;
      subject_category: string | null;
    }> = [];

    // 0. Fetch correct answers from DB to prevent client spoofing
    const questionIds = payload.questions.map(q => q.id);
    const { data: dbQuestions, error: dbError } = await supabase
      .from('static_questions')
      .select('id, correct_option, subject_category')
      .in('id', questionIds);

    if (dbError) {
      console.error("DB Error fetching static questions:", dbError);
      return res.status(500).json({ error: "Failed to verify questions against database." });
    }

    const questionMap = new Map(dbQuestions?.map(q => [String(q.id), q]) || []);

    for (const q of payload.questions) {
      const qId = String(q.id);
      const dbQ = questionMap.get(qId);
      
      const selected = payload.answers[q.id] || payload.answers[String(q.id)] || null;
      const isTimeout = !!payload.timeouts[q.id] || !!payload.timeouts[String(q.id)];
      const timeSpent = Math.min(60, Math.max(0, payload.timeSpentMap[q.id] || payload.timeSpentMap[String(q.id)] || 0));
      
      // Use DB subject_category or fallback
      const subject = dbQ?.subject_category || q.subject_category || 'CORE';

      if (!computedSubjectStats[subject]) {
        computedSubjectStats[subject] = { correct: 0, total: 0 };
      }
      computedSubjectStats[subject].total += 1;
      computedTotalTime += timeSpent;
      
      // Securely grab correct_option from DB
      const correctOpt = dbQ?.correct_option?.trim() || '';

      let isCorrect: boolean | null = null;

      if (!selected && !isTimeout) {
        unattemptedCount += 1;
        isCorrect = null;
      } else if (selected === correctOpt) {
        correctCount += 1;
        computedSubjectStats[subject].correct += 1;
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
        subject_category: subject,
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

    const isRanked = payload.isRanked !== undefined ? payload.isRanked : true;

    // 2. Compute percentile BEFORE inserting the session (ONLY IF RANKED)
    let computedPercentile: number = 0;
    if (isRanked) {
      const { data: pData, error: pError } = await supabase.rpc('get_user_percentile', {
        target_score: correctCount,
      });
      if (!pError && pData !== null) {
        computedPercentile = Number(pData);
      } else {
        console.warn("Percentile fetch warning (expected on first session):", pError);
      }
    }

    // 3. Insert into the appropriate session table
    let sessionId = '';
    if (isRanked) {
      const { data: session, error: sessionError } = await supabase
        .from('quiz_sessions')
        .insert({
          user_id: payload.userId,
          correct_count: correctCount,
          incorrect_count: incorrectCount,
          unattempted_count: unattemptedCount,
          total_time_seconds: computedTotalTime,
          subject_stats: computedSubjectStats,
          percentile: computedPercentile,
          is_ranked: true,
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error("CRITICAL SUBMISSION DB ERROR:", sessionError);
        return res.status(500).json({ error: "Database error", details: sessionError.message });
      }
      sessionId = session.id;
    } else {
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .insert({
          user_id: payload.userId,
          correct_count: correctCount,
          incorrect_count: incorrectCount,
          unattempted_count: unattemptedCount,
          total_time_seconds: computedTotalTime,
          subject_stats: computedSubjectStats,
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error("CRITICAL SUBMISSION DB ERROR:", sessionError);
        return res.status(500).json({ error: "Database error", details: sessionError.message });
      }
      sessionId = session.id;
    }

    // 4. Batch insert question_attempts with the session_id
    const attemptRowsWithSession = questionAttemptRows.map(row => ({
      ...row,
      session_id: sessionId,
    }));

    // Question attempts aren't strictly linked via foreign key to training_sessions in the schema yet,
    // but the session_id will correspond to a training_sessions UUID.
    const { error: attemptsError } = await supabase
      .from('question_attempts')
      .insert(attemptRowsWithSession);

    if (attemptsError) {
      console.error("CRITICAL SUBMISSION DB ERROR:", attemptsError);
      return res.status(500).json({ error: "Database error", details: attemptsError.message });
    }

    // 4.5 If Vanguard (ranked), increment the user's freemium quota consumption
    if (isRanked) {
      const { error: rpcError } = await supabase.rpc('increment_vanguard_count', {
        user_id_param: payload.userId,
      });
      if (rpcError) {
        console.error("Failed to increment vanguard limit, but saving quiz anyway:", rpcError);
      }
    }

    // 5. Return success
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
    console.error("CRITICAL SUBMISSION DB ERROR:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
}