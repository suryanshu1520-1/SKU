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

const COOLDOWN_SECONDS = 300; // 5 minutes

// Lightweight per-feed sync: fetches the PIB RSS feed only, processes up to 3
// items with zero AI inference and zero deep scraping, completing in <5 seconds.
async function quickFeedSync(): Promise<{ processed: number; error: string | null }> {
  try {
    const feedUrl = 'https://pib.gov.in/RssFeed.aspx?PingID=1';
    console.log('[sync-feed][quick] Fetching PIB RSS feed...');
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/xml, text/xml, */*'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      console.warn(`[sync-feed][quick] PIB feed returned ${res.status}`);
      return { processed: 0, error: `PIB feed returned status ${res.status}` };
    }

    const xml = await res.text();
    if (!xml || xml.length < 100) {
      return { processed: 0, error: 'Empty or too-short PIB feed response' };
    }

    const items: Array<{ title: string; link: string; description: string; source: string }> = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    let limit = 0;

    while ((match = itemRegex.exec(xml)) !== null && limit < 3) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const descriptionMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);

      let title = titleMatch ? titleMatch[1].trim() : '';
      let link = linkMatch ? linkMatch[1].trim() : '';
      let description = descriptionMatch ? descriptionMatch[1].trim() : '';

      if (title && link) {
        title = title.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        link = link.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        description = description
          .replace(/<[^>]*>/g, '')
          .replace(/<!\[CDATA\[|\]\]>/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        items.push({ title, link, description: description.substring(0, 300), source: 'PIB' });
        limit++;
      }
    }

    console.log(`[sync-feed][quick] Parsed ${items.length} items from PIB feed`);

    // Exclusion keywords (zero AI cost pre-filter)
    const EXCLUDE_KEYWORDS = [
      'MURDER', 'RAPE', 'ACCIDENT', 'ASSAULT', 'ARRESTED', 'DIED', 'DEATH',
      'CELEBRITY', 'CINEMA', 'FILM', 'BOLLYWOOD', 'CRIME'
    ];

    let processed = 0;
    for (const article of items) {
      const checkText = (article.title + ' ' + article.description).toUpperCase();
      let excluded = false;
      for (const keyword of EXCLUDE_KEYWORDS) {
        if (checkText.includes(keyword)) { excluded = true; break; }
      }
      if (excluded) continue;

      // Check for existing duplicate
      const { data: existing } = await supabase
        .from('current_affairs')
        .select('id')
        .eq('url', article.link)
        .maybeSingle();

      if (existing) continue;

      // Deterministic ministry tagging (zero AI cost)
      let ministry = 'Government of India';
      const combined = (article.title + ' ' + article.description).toUpperCase();
      if (combined.includes('FINANCE') || combined.includes('ECONOMY') || combined.includes('BUDGET') || combined.includes('TAX')) {
        ministry = 'Ministry of Finance';
      } else if (combined.includes('DEFENCE') || combined.includes('DEFENSE') || combined.includes('MILITARY')) {
        ministry = 'Ministry of Defence';
      } else if (combined.includes('COMMERCE') || combined.includes('TRADE') || combined.includes('EXPORT') || combined.includes('IMPORT')) {
        ministry = 'Ministry of Commerce & Industry';
      } else if (combined.includes('CABINET') || combined.includes('GOVERNMENT') || combined.includes('PRIME MINISTER') || combined.includes('PMO')) {
        ministry = 'Union Cabinet';
      } else if (combined.includes('EDUCATION') || combined.includes('SCHOOL') || combined.includes('COLLEGE') || combined.includes('UNIVERSITY')) {
        ministry = 'Ministry of Education';
      } else if (combined.includes('HEALTH') || combined.includes('HOSPITAL') || combined.includes('MEDICAL') || combined.includes('AYUSH')) {
        ministry = 'Ministry of Health and Family Welfare';
      } else if (combined.includes('AGRICULTURE') || combined.includes('FARMER') || combined.includes('FARM')) {
        ministry = 'Ministry of Agriculture & Farmers Welfare';
      } else if (combined.includes('RAILWAY') || combined.includes('RAIL') || combined.includes('TRAIN')) {
        ministry = 'Ministry of Railways';
      } else if (combined.includes('POWER') || combined.includes('ENERGY') || combined.includes('ELECTRICITY') || combined.includes('RENEWABLE')) {
        ministry = 'Ministry of Power';
      } else if (combined.includes('HOME') || combined.includes('INTERNAL SECURITY') || combined.includes('POLICE')) {
        ministry = 'Ministry of Home Affairs';
      } else if (combined.includes('EXTERNAL') || combined.includes('FOREIGN') || combined.includes('DIPLOMATIC') || combined.includes('EMBASSY')) {
        ministry = 'Ministry of External Affairs';
      } else if (combined.includes('RBI') || combined.includes('RESERVE BANK') || combined.includes('MONETARY') || combined.includes('BANKING')) {
        ministry = 'Reserve Bank of India';
      }

      // Build a headline-based summary (no AI, no deep scrape)
      const bullets = [
        `PIB release: ${article.title}`,
        article.description
          ? `Context: ${article.description.substring(0, 200)}`
          : 'Latest administrative update from PIB.',
      ].filter(Boolean);

      const { error: upsertErr } = await supabase
        .from('current_affairs')
        .insert({
          source: 'PIB',
          ministry,
          headline: article.title,
          url: article.link,
          summary: { bullets },
          created_at: new Date().toISOString()
        });

      if (upsertErr) {
        console.error(`[sync-feed][quick] Upsert error for "${article.title.substring(0, 60)}":`, upsertErr);
      } else {
        processed++;
        console.log(`[sync-feed][quick] Ingested [${ministry}]: ${article.title.substring(0, 60)}`);
      }
    }

    return { processed, error: null };
  } catch (err: any) {
    console.error('[sync-feed][quick] Error:', err);
    return { processed: 0, error: err.message || 'Quick sync error' };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    // Step 1: Query the user's last_sync_timestamp
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('last_sync_timestamp')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('[sync-feed] Profile query error:', profileError);
      return res.status(500).json({ error: 'Failed to query sync cooldown state' });
    }

    if (profile) {
      const lastSync = new Date(profile.last_sync_timestamp).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - lastSync) / 1000);

      if (elapsed < COOLDOWN_SECONDS) {
        const remaining = COOLDOWN_SECONDS - elapsed;
        console.log(`[sync-feed] Cooldown active for user ${userId}: ${remaining}s remaining`);
        return res.status(429).json({
          status: 429,
          message: `Sync cooldown active. Available in ${remaining} seconds.`,
          remaining
        });
      }
    }

    // Step 2: Dispatch 202 Accepted immediately -- do not block the HTTP response
    res.status(202).json({
      status: 'processing',
      message: 'Policy extraction pipeline initiated in background.'
    });

    // Step 3: Execute lightweight quick sync in the background.
    // Vercel serverless functions maintain a grace period after response delivery,
    // allowing this brief <5s execution to complete before teardown.
    const syncResult = await quickFeedSync();

    // Step 4: Update the last_sync_timestamp regardless of sync outcome
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ last_sync_timestamp: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[sync-feed] Failed to update sync timestamp:', updateError);
    }

    console.log(`[sync-feed] Background sync complete: ${syncResult.processed} items ingested.`);

    if (syncResult.error) {
      console.warn(`[sync-feed] Background sync had error: ${syncResult.error}`);
    }
  } catch (err: any) {
    console.error('[sync-feed] Handler error:', err);
    // Response already sent (202) at this point -- no further action needed
  }
}