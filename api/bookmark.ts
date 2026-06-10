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
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmdmeGFlcmxra2NhY3JiZGdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDIxNjc0NCwiZXhwIjoyMDk1NzkyNzQ0fQ.BY5YQh7nbSUrNZ61nHDIuzOX2P2s3iD3L_s11QHz9mg";

const supabase = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawServiceKey));

export default async function handler(req: any, res: any) {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ---- POST: Create or delete a bookmark (upsert logic) ----
    if (req.method === 'POST') {
      const { userId, questionId, questionText, insightText, action } = req.body || {};

      if (!userId || !questionId) {
        return res.status(400).json({ error: "Missing required fields: userId, questionId" });
      }

      // If action is 'delete', remove the bookmark
      if (action === 'delete') {
        const { error: deleteError } = await supabase
          .from('saved_insights')
          .delete()
          .eq('user_id', userId)
          .eq('question_id', questionId);

        if (deleteError) {
          console.error("Bookmark delete error:", deleteError);
          return res.status(500).json({ error: "Failed to remove bookmark: " + deleteError.message });
        }

        return res.status(200).json({ success: true, action: 'deleted' });
      }

      // Otherwise, upsert the bookmark (insert or update)
      if (!questionText || !insightText) {
        return res.status(400).json({ error: "Missing required fields for save: questionText, insightText" });
      }

      const { error: upsertError } = await supabase
        .from('saved_insights')
        .upsert({
          user_id: userId,
          question_id: questionId,
          question_text: questionText,
          insight_text: insightText,
        }, {
          onConflict: 'user_id, question_id',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error("Bookmark upsert error:", upsertError);
        return res.status(500).json({ error: "Failed to save bookmark: " + upsertError.message });
      }

      return res.status(200).json({ success: true, action: 'saved' });
    }

    // ---- GET: Fetch all bookmarks for a user ----
    if (req.method === 'GET') {
      const userId = req.query?.userId;

      if (!userId) {
        return res.status(400).json({ error: "Missing required query param: userId" });
      }

      const { data, error } = await supabase
        .from('saved_insights')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Bookmark fetch error:", error);
        return res.status(500).json({ error: "Failed to fetch bookmarks: " + error.message });
      }

      return res.status(200).json({ bookmarks: data || [] });
    }

    // ---- Fallback: reject other methods ----
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("Bookmark handler error:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
}