import { createClient } from "@supabase/supabase-js";
import { queryMasterPYQs } from "./analytics/pyq_explorer.js";

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
    const count = Math.min(100, Math.max(1, parseInt((req.query.count as string) || (req.query.limit as string)) || 25));

    // ─── Current Affairs MCQ Integration ─────────────────────
    if (pillarUpper === 'CURRENT_AFFAIRS' || rawTarget.toLowerCase().includes('current_affairs') || rawTarget.toLowerCase().includes('current affairs')) {
      const { data: caData, error: caError } = await getSupabaseAnon()
        .from('current_affairs_mcqs')
        .select('id, headline, question, options, explanation, subject, edition_date, created_at')
        .order('created_at', { ascending: false })
        .limit(Math.max(count, 10));

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

      return res.json({ questions: formattedQuestions.slice(0, count) });
    }

    let query = getSupabaseAnon().from('static_questions').select('id, exam_origin_tag, subject_category, difficulty_level, question_text, options_matrix, ai_insights, conceptual_explanation, is_generated, created_at');

    // Exam track segregation: UPSC and SSC CGL must never mix unless explicitly requested
    if (examTrack === 'ssc' || pillarUpper === 'SSC_CGL') {
      query = query.ilike('exam_origin_tag', 'SSC%');
    } else if (examTrack === 'upsc') {
      query = query.not('exam_origin_tag', 'ilike', 'SSC%');
    }

    let mappedPyqSubject = 'All';

    // Syllabus Pillar-specific targeting or subject targeting
    if (pillarUpper === 'GS1' || pillarUpper.includes('HISTORICAL') || pillarUpper.includes('GS-1')) {
      mappedPyqSubject = 'History';
      query = query.in('subject_category', [
        'Ancient and Medieval Indian History',
        'Modern Indian History',
        'Art and Culture',
        'Geography',
        'History',
        'Geography & Agriculture'
      ]);
    } else if (pillarUpper === 'GS2' || pillarUpper.includes('POLITY') || pillarUpper.includes('GS-2')) {
      mappedPyqSubject = 'Polity';
      query = query.in('subject_category', [
        'Indian Polity',
        'Indian Polity & Governance',
        'World Affairs (International Relations)',
        'Polity'
      ]);
    } else if (pillarUpper === 'GS3' || pillarUpper.includes('MACROECONOMIC') || pillarUpper.includes('GS-3')) {
      mappedPyqSubject = 'Economy';
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
      mappedPyqSubject = 'CSAT';
      query = query.or('subject_category.ilike.%CSAT%,exam_origin_tag.ilike.%CSAT%');
    } else if (rawTarget) {
      const lower = rawTarget.toLowerCase();
      if (lower.includes('rights') || lower.includes('writs') || lower.includes('preamble') || lower.includes('panchayat') || lower.includes('amendment') || lower.includes('speaker') || lower.includes('judiciary') || lower.includes('polity') || lower.includes('governance')) {
        mappedPyqSubject = 'Polity';
        query = query.in('subject_category', ['Indian Polity', 'Indian Polity & Governance', 'Polity']);
      } else if (lower.includes('rbi') || lower.includes('liquidity') || lower.includes('repo') || lower.includes('monetary') || lower.includes('inflation') || lower.includes('gdp') || lower.includes('fiscal') || lower.includes('economy') || lower.includes('economic')) {
        mappedPyqSubject = 'Economy';
        query = query.in('subject_category', ['Indian Economy', 'Economics']);
      } else if (lower.includes('ramsar') || lower.includes('wetland') || lower.includes('wildlife') || lower.includes('biodiversity') || lower.includes('environment') || lower.includes('ecology')) {
        mappedPyqSubject = 'Environment';
        query = query.in('subject_category', ['Environment', 'Environment & Ecology']);
      } else if (lower.includes('history') || lower.includes('ancient') || lower.includes('medieval') || lower.includes('buddhism') || lower.includes('jainism') || lower.includes('temple')) {
        mappedPyqSubject = 'History';
        query = query.in('subject_category', ['Modern Indian History', 'Ancient and Medieval Indian History', 'History', 'Art and Culture']);
      } else if (lower.includes('geography') || lower.includes('river') || lower.includes('monsoon') || lower.includes('soil')) {
        mappedPyqSubject = 'Geography';
        query = query.in('subject_category', ['Geography', 'Geography & Agriculture']);
      } else if (lower.includes('science') || lower.includes('tech') || lower.includes('space') || lower.includes('biotech')) {
        mappedPyqSubject = 'Science';
        query = query.in('subject_category', ['Science and Technology', 'Science & Technology']);
      } else if (lower.includes('art') || lower.includes('culture')) {
        mappedPyqSubject = 'Art and Culture';
        query = query.in('subject_category', ['Art and Culture', 'Ancient and Medieval Indian History']);
      } else if (lower.includes('international') || lower === 'ir') {
        mappedPyqSubject = 'International Relations';
        query = query.in('subject_category', ['World Affairs (International Relations)']);
      } else {
        query = query.ilike('subject_category', `%${rawTarget}%`);
      }
    }

    let { data, error } = await query.limit(100);
    let finalQuestions: any[] = data || [];

    // If static questions don't meet the target count or if a specific topic was targeted,
    // supplement with verified questions from the 25-year PYQ corpus (master_7841_pyqs.json)
    if (finalQuestions.length < count) {
      try {
        const pyqRes = queryMasterPYQs({
          q: rawTarget || undefined,
          subject: mappedPyqSubject !== 'All' ? mappedPyqSubject : undefined,
          limit: Math.max(count * 2, 20),
        });

        if (pyqRes && pyqRes.data && pyqRes.data.length > 0) {
          const verifiedPyqs = pyqRes.data
            .filter((p) => {
              if (!Array.isArray(p.options) || p.options.length < 4) return false;
              // Exclude broken placeholder options e.g. "(a) Option A"
              return !p.options.some((opt) => /^\([a-d]\)\s*Option\s+[A-D]$/i.test(opt.trim()));
            })
            .map((p) => {
              const matrix: Record<string, string> = {};
              const keys = ['A', 'B', 'C', 'D'];
              p.options.forEach((opt, idx) => {
                if (keys[idx]) matrix[keys[idx]] = opt;
              });
              return {
                id: `pyq_${p.id}`,
                exam_origin_tag: `UPSC CSE ${p.year} Prelims`,
                subject_category: p.subject || 'General Studies',
                difficulty_level: 'intermediate',
                question_text: p.stem,
                options_matrix: matrix,
                ai_insights: p.trapAnalysis,
                conceptual_explanation: p.trapAnalysis,
                is_generated: false,
              };
            });

          finalQuestions = [...finalQuestions, ...verifiedPyqs];
        }
      } catch (pyqErr) {
        console.warn('PYQ supplement query error:', pyqErr);
      }
    }

    // Fallback if specific pillar / subject query yielded too few
    if (!finalQuestions || finalQuestions.length === 0) {
      let fallbackQuery = getSupabaseAnon().from('static_questions').select('id, exam_origin_tag, subject_category, difficulty_level, question_text, options_matrix, ai_insights, conceptual_explanation, is_generated, created_at');
      if (examTrack === 'ssc') {
        fallbackQuery = fallbackQuery.ilike('exam_origin_tag', 'SSC%');
      } else {
        fallbackQuery = fallbackQuery.not('exam_origin_tag', 'ilike', 'SSC%');
      }
      const fallbackRes = await fallbackQuery.limit(count);
      finalQuestions = fallbackRes.data || [];
    }

    if (error && (!finalQuestions || finalQuestions.length === 0)) {
      console.error("Error fetching static questions:", error);
      return res.status(500).json({ error: error.message });
    }

    // Shuffle and slice to the requested count
    const shuffled = [...finalQuestions].sort(() => 0.5 - Math.random());
    return res.json({ questions: shuffled.slice(0, count) });
  } catch (err: any) {
    console.error("Questions fetch exception:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred while loading questions." });
  }
}