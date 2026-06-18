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
const rawSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!rawSupabaseAnonKey) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Secret missing.");

const supabaseAnon = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseAnonKey));

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
    const { data, error } = await supabaseAnon
      .from('static_questions')
      .select('*')
      .limit(500);

    if (error) {
      console.error("Error fetching static questions:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ questions: data || [] });
  } catch (err: any) {
    console.error("Questions fetch exception:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred while loading questions." });
  }
}