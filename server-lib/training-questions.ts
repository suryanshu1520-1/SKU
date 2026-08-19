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
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Supabase anon key missing.");
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
    const { subjects, count, userId } = req.body || {};

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

    const S = subjects.length;
    const N = count;
    const base = Math.floor(N / S);
    let remainder = N % S;

    // Track per-subject fetch counts
    const subjectCounts: Record<string, number> = {};
    for (const subject of subjects) {
      let fetchCount = base;
      if (remainder > 0) {
        fetchCount += 1;
        remainder -= 1;
      }
      subjectCounts[subject] = fetchCount;
    }

    // Single query for all requested subjects
    let query = getSupabaseAnon()
      .from('static_questions')
      .select('*')
      .in('subject_category', subjects);

    if (seenIds.length > 0) {
      query = query.not('id', 'in', `(${seenIds.join(',')})`);
    }

    // We fetch a larger pool and shuffle/slice on the server
    const { data, error } = await query.limit(N * 3 + 10);

    if (error) {
      console.warn(`[training-questions] Error fetching subjects:`, error);
      return res.status(500).json({ error: "Failed to fetch questions from the database." });
    }

    let allQuestions = data || [];
    let isBackfilled = false;

    // Shuffle the final set and return
    let finalQuestions = shuffleArray(allQuestions).slice(0, N);

    // Proactive backfill if the filtered subjects yield too few questions
    if (finalQuestions.length < N) {
      isBackfilled = true;
      const excludedIds = [...seenIds, ...finalQuestions.map((q: any) => q.id)];
      let backfillQuery = getSupabaseAnon()
        .from('static_questions')
        .select('*');
        
      if (excludedIds.length > 0) {
        backfillQuery = backfillQuery.not('id', 'in', `(${excludedIds.join(',')})`);
      }
      
      const { data: backfillData, error: backfillError } = await backfillQuery.limit(N - finalQuestions.length);
        
      if (!backfillError && backfillData) {
        finalQuestions = [...finalQuestions, ...backfillData];
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');

    return res.status(200).json({ questions: finalQuestions, isBackfilled });
    } catch (err: any) {
    console.error("[training-questions] Handler error:", err);
    return res.status(500).json({ error: err.message, stack: err.stack || "An unexpected error occurred." });
  }
}