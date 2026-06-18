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

export default async function handler(req: any, res: any) {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure it's a POST or GET request
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ---- POST: Create or delete a bookmark (upsert logic) ----
    if (req.method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/, '').trim();
      
      if (!token) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing authorization token." });
      }
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid or expired token." });
      }
      
      const userId = user.id;
      const { questionId, questionText, insightText, action } = req.body || {};

      if (!questionId) {
        return res.status(400).json({ error: "Missing required field: questionId" });
      }

      if (action === 'remove') {
        const { error: deleteError } = await supabase
          .from('saved_insights')
          .delete()
          .eq('user_id', userId)
          .eq('question_id', String(questionId));

        if (deleteError) {
          console.error("[bookmark] Delete error:", deleteError);
          return res.status(500).json({ error: deleteError.message });
        }

        return res.status(200).json({ bookmarked: false });
      } else {
        const { data: existing, error: checkError } = await supabase
          .from('saved_insights')
          .select('id')
          .eq('user_id', userId)
          .eq('question_id', String(questionId))
          .maybeSingle();

        if (checkError) {
          console.error("[bookmark] Check error:", checkError);
          return res.status(500).json({ error: checkError.message });
        }

        if (existing) {
          const { error: deleteError } = await supabase
            .from('saved_insights')
            .delete()
            .eq('id', existing.id);

          if (deleteError) {
            console.error("[bookmark] Delete error on toggle:", deleteError);
            return res.status(500).json({ error: deleteError.message });
          }

          return res.status(200).json({ bookmarked: false });
        }

        const { error: insertError } = await supabase
          .from('saved_insights')
          .insert({
            user_id: userId,
            question_id: String(questionId),
            question_text: questionText || 'Untitled Question',
            insight_text: insightText || '',
          });

        if (insertError) {
          console.error("[bookmark] Insert error:", insertError);
          return res.status(500).json({ error: insertError.message });
        }

        return res.status(200).json({ bookmarked: true });
      }
    }

    // ---- GET: Fetch all bookmarks for a user ----
    if (req.method === 'GET') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/, '').trim();
      
      if (!token) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing authorization token." });
      }
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid or expired token." });
      }
      
      const userId = user.id;

      const { data, error } = await supabase
        .from('saved_insights')
        .select('*')
        .eq('user_id', userId);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }
  } catch (err: any) {
    console.error("[bookmark] Exception:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
}