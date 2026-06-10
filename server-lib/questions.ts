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

export default async function handler(req: any, res: any) {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle only GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Extract optional userId for no-repeat logic
    const userId: string | undefined = req.query?.userId;

    // Build the base query
    let query = supabaseAnon
      .from('static_questions')
      .select('*')
      .limit(500);

    // If userId is provided, exclude previously seen questions
    if (userId) {
      // Fetch distinct question_ids that this user has already attempted
      const { data: attemptedQuestions, error: attemptError } = await supabaseAnon
        .from('question_attempts')
        .select('question_id')
        .eq('user_id', userId);

      if (attemptError) {
        console.warn("Error fetching user attempt history for no-repeat filter:", attemptError);
        // Fall through: proceed without filtering
      } else if (attemptedQuestions && attemptedQuestions.length > 0) {
        const seenIds = [...new Set(attemptedQuestions.map(a => a.question_id))];
        // Only apply filter if we have seen questions and haven't exhausted the pool
        if (seenIds.length > 0) {
          query = query.not('id', 'in', `(${seenIds.join(',')})`);
        }
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching static questions via serverless route:", error);
      return res.status(500).json({ error: error.message, stack: error.stack });
    }

    // Set Cache-Control headers to make fetching ultra-fast and optimize serverless costs
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=1200, stale-while-revalidate=60');

    return res.status(200).json({ questions: data || [] });
  } catch (err: any) {
    console.error("Serverless questions fetch exception:", err);
    return res.status(500).json({ error: err.message, stack: err.stack || "An unexpected error occurred while loading questions." });
  }
}