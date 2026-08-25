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
const rawSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmdmeGFlcmxra2NhY3JiZGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTY3NDQsImV4cCI6MjA5NTc5Mjc0NH0.G44wtBZZKGPb-ZTX3zaIPCXFcRtPP9Vtv-0saO0dEXE";

let _supabaseAnon: ReturnType<typeof createClient> | null = null;
function getSupabaseAnon() {
  if (!_supabaseAnon) {
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
    const pillar = (req.query.pillar as string || '').toUpperCase();
    const subject = req.query.subject as string;

    let query = getSupabaseAnon().from('static_questions').select('*');

    // Exam track segregation: UPSC and SSC CGL must never mix unless explicitly requested
    if (examTrack === 'ssc' || pillar === 'SSC_CGL') {
      query = query.ilike('exam_origin_tag', 'SSC%');
    } else if (examTrack === 'upsc') {
      query = query.not('exam_origin_tag', 'ilike', 'SSC%');
    }

    // Syllabus Pillar-specific targeting
    if (pillar === 'GS1' || pillar.includes('HISTORICAL') || pillar.includes('GS-1')) {
      query = query.in('subject_category', [
        'Ancient and Medieval Indian History',
        'Modern Indian History',
        'Art and Culture',
        'Geography',
        'History',
        'Geography & Agriculture'
      ]);
    } else if (pillar === 'GS2' || pillar.includes('POLITY') || pillar.includes('GS-2')) {
      query = query.in('subject_category', [
        'Indian Polity',
        'Indian Polity & Governance',
        'World Affairs (International Relations)',
        'Polity'
      ]);
    } else if (pillar === 'GS3' || pillar.includes('MACROECONOMIC') || pillar.includes('GS-3')) {
      query = query.in('subject_category', [
        'Indian Economy',
        'Environment',
        'Science and Technology',
        'Science & Technology',
        'Environment & Ecology',
        'Economics'
      ]);
    } else if (pillar === 'STATIC_GK' || pillar.includes('STATIC')) {
      query = query.or('subject_category.eq.Static GK,exam_origin_tag.ilike.Static GK%');
    } else if (pillar === 'CSAT' || pillar.includes('CSAT')) {
      query = query.or('subject_category.ilike.%CSAT%,exam_origin_tag.ilike.%CSAT%');
    } else if (subject) {
      query = query.ilike('subject_category', `%${subject}%`);
    }

    let { data, error } = await query.limit(500);

    // Fallback if specific pillar / subject query yielded too few
    if (!data || data.length === 0) {
      let fallbackQuery = getSupabaseAnon().from('static_questions').select('*');
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