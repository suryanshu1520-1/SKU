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
const rawSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmdmeGFlcmxra2NhY3JiZGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTY3NDQsImV4cCI6MjA5NTc5Mjc0NH0.G44wtBZZKGPb-ZTX3zaIPCXFcRtPP9Vtv-0saO0dEXE";

const supabaseAnon = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseAnonKey));

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
      const { data: attemptedQuestions, error: attemptError } = await supabaseAnon
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

    // Fetch questions per subject
    let allQuestions: any[] = [];
    const subjectFetchResults: Record<string, any[]> = {};
    let deficit = 0;

    for (const subject of subjects) {
      const fetchCount = subjectCounts[subject];
      let query = supabaseAnon
        .from('static_questions')
        .select('*')
        .eq('subject_category', subject);

      if (seenIds.length > 0) {
        query = query.not('id', 'in', `(${seenIds.join(',')})`);
      }

      const { data, error } = await query.limit(fetchCount + 5); // extra buffer for dedup

      if (error) {
        console.warn(`[training-questions] Error fetching subject "${subject}":`, error);
        continue;
      }

      const fetched = (data || []).slice(0, fetchCount);
      subjectFetchResults[subject] = fetched;

      if (fetched.length < fetchCount) {
        deficit += fetchCount - fetched.length;
      }

      allQuestions = [...allQuestions, ...fetched];
    }

    // Backfill deficit from any subject that has extra questions
    if (deficit > 0 && subjects.length > 1) {
      const subjectsWithExtra = subjects.filter(s => {
        const fetched = subjectFetchResults[s] || [];
        const target = subjectCounts[s];
        return fetched.length >= target;
      });

      if (subjectsWithExtra.length > 0) {
        for (const subject of shuffleArray(subjectsWithExtra)) {
          if (deficit <= 0) break;
          let query = supabaseAnon
            .from('static_questions')
            .select('*')
            .eq('subject_category', subject);

          if (seenIds.length > 0) {
            query = query.not('id', 'in', `(${seenIds.join(',')})`);
          }

          const alreadyFetchedIds = new Set(allQuestions.map((q: any) => q.id));
          const { data } = await query.limit(deficit + 5);

          if (data) {
            const fresh = data.filter((q: any) => !alreadyFetchedIds.has(q.id)).slice(0, deficit);
            allQuestions = [...allQuestions, ...fresh];
            deficit -= fresh.length;
          }
        }
      }
    }

    // Shuffle the final set and return
    const finalQuestions = shuffleArray(allQuestions).slice(0, N);

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');

    return res.status(200).json({ questions: finalQuestions });
  } catch (err: any) {
    console.error("[training-questions] Handler error:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
}