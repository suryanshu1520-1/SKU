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

// Lazy singleton. Reading env at CALL time (not module-load time) avoids a
// crash-on-import when this module is pulled in before dotenv.config() has run
// (ESM resolves imports before the importing file's body executes). Previously
// the module threw at import, taking the whole dev server down.
let _supabaseAnon: ReturnType<typeof createClient> | null = null;
function getSupabaseAnon() {
  if (_supabaseAnon) return _supabaseAnon;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://ixngfxaerlkkcacrbdgc.supabase.co";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmdmeGFlcmxra2NhY3JiZGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTY3NDQsImV4cCI6MjA5NTc5Mjc0NH0.G44wtBZZKGPb-ZTX3zaIPCXFcRtPP9Vtv-0saO0dEXE";
  _supabaseAnon = createClient(cleanEnvValue(url), cleanEnvValue(anonKey));
  return _supabaseAnon;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { subjects, count, userId, examTrack = 'upsc' } = req.body || {};

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: "Missing required field: subjects (non-empty array)" });
    }

    if (!count || count < 1) {
      return res.status(400).json({ error: "Missing required field: count (positive integer)" });
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing required field: userId" });
    }

    // Fetch previously attempted question IDs to exclude
    let seenIds: string[] = [];
    try {
      const { data: attemptedQuestions, error: attemptError } = await getSupabaseAnon()
        .from('question_attempts')
        .select('question_id')
        .eq('user_id', userId);

      if (!attemptError && attemptedQuestions && attemptedQuestions.length > 0) {
        seenIds = [...new Set(attemptedQuestions.map((a: any) => a.question_id))];
      }
    } catch (err) {
      console.warn("[training-questions] Failed to fetch attempt history:", err);
    }

    // Single query for all requested subjects
    let query = getSupabaseAnon()
      .from('static_questions')
      .select('*')
      .in('subject_category', subjects);

    if (examTrack.toLowerCase() === 'ssc') {
      query = query.ilike('exam_origin_tag', 'SSC%');
    } else if (examTrack.toLowerCase() === 'upsc') {
      query = query.not('exam_origin_tag', 'ilike', 'SSC%');
    }

    if (seenIds.length > 0) {
      query = query.not('id', 'in', `(${seenIds.join(',')})`);
    }

    // We fetch a larger pool and shuffle/slice on the server
    const { data, error } = await query.limit(count * 3 + 10);

    if (error) {
      console.warn(`[training-questions] Error fetching subjects:`, error);
      return res.status(500).json({ error: "Failed to fetch questions from the database." });
    }

    let allQuestions = data || [];
    let isBackfilled = false;

    // Shuffle the final set and return
    let finalQuestions = shuffleArray(allQuestions).slice(0, count);

    // Proactive backfill if the filtered subjects yield too few questions
    if (finalQuestions.length < count) {
      isBackfilled = true;
      const excludedIds = [...seenIds, ...finalQuestions.map((q: any) => q.id)];
      let backfillQuery = getSupabaseAnon()
        .from('static_questions')
        .select('*');

      if (examTrack.toLowerCase() === 'ssc') {
        backfillQuery = backfillQuery.ilike('exam_origin_tag', 'SSC%');
      } else if (examTrack.toLowerCase() === 'upsc') {
        backfillQuery = backfillQuery.not('exam_origin_tag', 'ilike', 'SSC%');
      }
        
      if (excludedIds.length > 0) {
        backfillQuery = backfillQuery.not('id', 'in', `(${excludedIds.join(',')})`);
      }
      
      const { data: backfillData } = await backfillQuery.limit((count - finalQuestions.length) * 2);
        
      if (backfillData) {
        finalQuestions = [...finalQuestions, ...shuffleArray(backfillData).slice(0, count - finalQuestions.length)];
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');

    return res.status(200).json({ questions: finalQuestions, isBackfilled });
    } catch (err: any) {
    console.error("[training-questions] Handler error:", err);
    return res.status(500).json({ error: err.message, stack: err.stack || "An unexpected error occurred." });
  }
}