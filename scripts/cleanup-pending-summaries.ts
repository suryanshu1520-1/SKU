import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupPending() {
  console.log('[cleanup] Scanning current_affairs table for pending summaries...');
  const { data: rows, error } = await supabase
    .from('current_affairs')
    .select('id, url, headline, source, summary');

  if (error || !rows) {
    console.error('[cleanup] Failed to fetch current_affairs:', error);
    return;
  }

  const targetIds: string[] = [];
  const targetUrls: string[] = [];

  for (const row of rows) {
    const rawString = JSON.stringify(row).toLowerCase();
    const bullets: string[] = row.summary?.bullets || [];
    const hasPendingBullet = bullets.some((b) => b.toLowerCase().includes('summary pending') || b.toLowerCase().includes('pending summary'));

    if (rawString.includes('summary pending') || rawString.includes('pending summary') || hasPendingBullet) {
      targetIds.push(row.id);
      if (row.url) targetUrls.push(row.url);
      console.log(`[cleanup] Found pending article: [${row.id}] ${row.source} — "${row.headline}"`);
    }
  }

  console.log(`[cleanup] Total articles identified for deletion: ${targetIds.length}`);

  if (targetIds.length === 0) {
    console.log('[cleanup] No articles with pending summaries found.');
    return;
  }

  // 1. Delete associated MCQs if any reference these URLs
  if (targetUrls.length > 0) {
    const { error: mcqErr, count: mcqCount } = await supabase
      .from('current_affairs_mcqs')
      .delete({ count: 'exact' })
      .in('affair_url', targetUrls);

    if (mcqErr) {
      console.warn('[cleanup] Warning deleting associated MCQs:', mcqErr.message);
    } else {
      console.log(`[cleanup] Removed ${mcqCount || 0} associated MCQs.`);
    }
  }

  // 2. Delete associated saved_articles if any reference these IDs or URLs
  const { error: savedErr, count: savedCount } = await supabase
    .from('saved_articles')
    .delete({ count: 'exact' })
    .in('article_id', targetIds);

  if (savedErr) {
    console.warn('[cleanup] Warning deleting saved_articles references:', savedErr.message);
  } else {
    console.log(`[cleanup] Removed ${savedCount || 0} saved_articles bookmarks.`);
  }

  // 3. Delete from current_affairs
  const { error: deleteErr, count: deletedCount } = await supabase
    .from('current_affairs')
    .delete({ count: 'exact' })
    .in('id', targetIds);

  if (deleteErr) {
    console.error('[cleanup] Error deleting from current_affairs:', deleteErr);
  } else {
    console.log(`[cleanup] SUCCESS: Cleaned up ${deletedCount ?? targetIds.length} articles with "summary pending" from current_affairs.`);
  }
}

cleanupPending();
