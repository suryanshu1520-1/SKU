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

let _supabaseAnon: ReturnType<typeof createClient> | null = null;
function getSupabaseAnon() {
  if (!_supabaseAnon) {
    const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const rawSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!rawSupabaseUrl || !rawSupabaseAnonKey) {
      throw new Error("CRITICAL_ENVIRONMENT_FAULT: Supabase URL or Anon Key missing.");
    }
    _supabaseAnon = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseAnonKey));
  }
  return _supabaseAnon;
}

export default async function handler(req: any, res: any) {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure it's a GET request
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const examTrack = (req.query.examTrack as string || 'upsc').toLowerCase();
    const pillarUpper = (req.query.pillar as string || '').toUpperCase();
    const rawTarget = ((req.query.subject as string) || (req.query.pillar as string) || '').trim();

    // ─── Current Affairs MCQ Integration ─────────────────────
    if (pillarUpper === 'CURRENT_AFFAIRS' || rawTarget.toLowerCase().includes('current_affairs') || rawTarget.toLowerCase().includes('current affairs')) {
      const { data: caData, error: caError } = await getSupabaseAnon()
        .from('current_affairs_mcqs')
        .select('id, headline, question, options, explanation, subject, edition_date, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (caError) {
        console.error("Error fetching current affairs mcqs:", caError);
        return res.status(500).json({ error: caError.message });
      }

      const formattedQuestions = (caData || []).map((row: any) => {
        const matrix: Record<string, string> = {};
        if (Array.isArray(row.options)) {
          const keys = ['A', 'B', 'C', 'D'];
          row.options.forEach((opt: string, idx: number) => {
            if (keys[idx]) matrix[keys[idx]] = opt;
          });
        } else if (row.options && typeof row.options === 'object') {
          Object.assign(matrix, row.options);
        }

        return {
          id: `ca_${row.id}`,
          exam_origin_tag: row.headline ? `Daily Intelligence (${row.edition_date || 'Today'})` : `Daily Current Affairs (${row.edition_date || 'Today'})`,
          subject_category: row.subject || 'Current Affairs',
          difficulty_level: 'intermediate',
          question_text: row.question,
          options_matrix: matrix,
          conceptual_explanation: row.explanation,
          ai_insights: row.explanation,
          is_generated: true,
          created_at: row.created_at
        };
      });

      return res.json({ questions: formattedQuestions });
    }

    let query = getSupabaseAnon().from('static_questions').select('id, exam_origin_tag, subject_category, difficulty_level, question_text, options_matrix, ai_insights, conceptual_explanation, is_generated, created_at');

    // Exam track segregation: UPSC and SSC CGL must never mix unless explicitly requested
    if (examTrack === 'ssc' || pillarUpper === 'SSC_CGL') {
      query = query.ilike('exam_origin_tag', 'SSC%');
    } else if (examTrack === 'upsc') {
      query = query.not('exam_origin_tag', 'ilike', 'SSC%');
    }

    // Syllabus Pillar-specific targeting or subject targeting
    if (pillarUpper === 'GS1' || pillarUpper.includes('HISTORICAL') || pillarUpper.includes('GS-1')) {
      query = query.in('subject_category', [
        'Ancient and Medieval Indian History',
        'Modern Indian History',
        'Art and Culture',
        'Geography',
        'History',
        'Geography & Agriculture'
      ]);
    } else if (pillarUpper === 'GS2' || pillarUpper.includes('POLITY') || pillarUpper.includes('GS-2')) {
      query = query.in('subject_category', [
        'Indian Polity',
        'Indian Polity & Governance',
        'World Affairs (International Relations)',
        'Polity'
      ]);
    } else if (pillarUpper === 'GS3' || pillarUpper.includes('MACROECONOMIC') || pillarUpper.includes('GS-3')) {
      query = query.in('subject_category', [
        'Indian Economy',
        'Environment',
        'Science and Technology',
        'Science & Technology',
        'Environment & Ecology',
        'Economics'
      ]);
    } else if (pillarUpper === 'STATIC_GK' || pillarUpper.includes('STATIC')) {
      query = query.or('subject_category.eq.Static GK,exam_origin_tag.ilike.Static GK%');
    } else if (pillarUpper === 'CSAT' || pillarUpper.includes('CSAT')) {
      query = query.or('subject_category.ilike.%CSAT%,exam_origin_tag.ilike.%CSAT%');
    } else if (rawTarget) {
      const lower = rawTarget.toLowerCase();
      if (lower.includes('history')) {
        query = query.in('subject_category', ['Modern Indian History', 'Ancient and Medieval Indian History', 'History', 'Art and Culture']);
      } else if (lower.includes('polity') || lower.includes('governance')) {
        query = query.in('subject_category', ['Indian Polity', 'Indian Polity & Governance', 'Polity']);
      } else if (lower.includes('economy') || lower.includes('economic')) {
        query = query.in('subject_category', ['Indian Economy', 'Economics']);
      } else if (lower.includes('environment') || lower.includes('ecology')) {
        query = query.in('subject_category', ['Environment', 'Environment & Ecology']);
      } else if (lower.includes('geography')) {
        query = query.in('subject_category', ['Geography', 'Geography & Agriculture']);
      } else if (lower.includes('science') || lower.includes('tech')) {
        query = query.in('subject_category', ['Science and Technology', 'Science & Technology']);
      } else if (lower.includes('art') || lower.includes('culture')) {
        query = query.in('subject_category', ['Art and Culture', 'Ancient and Medieval Indian History']);
      } else if (lower.includes('international') || lower === 'ir') {
        query = query.in('subject_category', ['World Affairs (International Relations)']);
      } else {
        query = query.ilike('subject_category', `%${rawTarget}%`);
      }
    }

    let { data, error } = await query.limit(500);

    // Fallback if specific pillar / subject query yielded too few
    if (!data || data.length === 0) {
      let fallbackQuery = getSupabaseAnon().from('static_questions').select('id, exam_origin_tag, subject_category, difficulty_level, question_text, options_matrix, ai_insights, conceptual_explanation, is_generated, created_at');
      if (examTrack === 'ssc') {
        fallbackQuery = fallbackQuery.ilike('exam_origin_tag', 'SSC%');
      } else {
        fallbackQuery = fallbackQuery.not('exam_origin_tag', 'ilike', 'SSC%');
      }
      const fallbackRes = await fallbackQuery.limit(100);
      data = fallbackRes.data || [];
    }

    if (error && (!data || data.length === 0)) {
      console.error("Error fetching static questions:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ questions: data || [] });
  } catch (err: any) {
    console.error("Questions fetch exception:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred while loading questions." });
  }
}