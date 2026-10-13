import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  return createClient(cleanEnvValue(url), cleanEnvValue(key));
}

export function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function escapeXml(unsafe: string): string {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function formatDate(isoString?: string | null): string {
  if (!isoString) return new Date().toISOString().split('T')[0];
  try {
    return new Date(isoString).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

let mainSitemapCache: { xml: string; timestamp: number } | null = null;
let newsSitemapCache: { xml: string; timestamp: number } | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour for full sitemap
const NEWS_CACHE_DURATION_MS = 15 * 60 * 1000; // 15 mins for fast-moving Google News

export async function generateMainSitemap(): Promise<string> {
  const now = Date.now();
  if (mainSitemapCache && (now - mainSitemapCache.timestamp < CACHE_DURATION_MS)) {
    return mainSitemapCache.xml;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const urls: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [
    { loc: 'https://tark.live/', lastmod: todayStr, changefreq: 'daily', priority: '1.0' },
    { loc: 'https://tark.live/intelligence', lastmod: todayStr, changefreq: 'hourly', priority: '0.95' },
    { loc: 'https://tark.live/daily-edition', lastmod: todayStr, changefreq: 'daily', priority: '0.9' },
    { loc: 'https://tark.live/prs', lastmod: todayStr, changefreq: 'weekly', priority: '0.85' },
    { loc: 'https://tark.live/arena', lastmod: todayStr, changefreq: 'daily', priority: '0.9' },
    { loc: 'https://tark.live/observatory', lastmod: todayStr, changefreq: 'weekly', priority: '0.8' },
    { loc: 'https://tark.live/humanities', lastmod: todayStr, changefreq: 'monthly', priority: '0.75' },
    { loc: 'https://tark.live/leaderboard', lastmod: todayStr, changefreq: 'hourly', priority: '0.7' },
    { loc: 'https://tark.live/manifesto', lastmod: todayStr, changefreq: 'monthly', priority: '0.6' },
  ];

  // 1. Add PRS Vault Dossiers
  try {
    const prsPath = path.resolve(process.cwd(), 'src/data/prs-vault-dossiers.json');
    if (fs.existsSync(prsPath)) {
      const prsRaw = fs.readFileSync(prsPath, 'utf-8');
      const prsItems = JSON.parse(prsRaw);
      if (Array.isArray(prsItems)) {
        for (const item of prsItems) {
          if (item.id) {
            urls.push({
              loc: `https://tark.live/prs/${encodeURIComponent(item.id)}`,
              lastmod: formatDate(item.created_at),
              changefreq: 'monthly',
              priority: '0.85',
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[sitemap] Failed to load PRS vault dossiers:', err);
  }

  // 2. Query Supabase for Dynamic Current Affairs & Policy Briefs
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: articles, error } = await supabase
        .from('current_affairs')
        .select('id, headline, published_at, created_at, source')
        .neq('source', 'PIB_Digest')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (!error && articles) {
        for (const art of articles) {
          if (art.id && art.headline) {
            const slug = slugify(art.headline);
            const dateStr = formatDate(art.published_at || art.created_at);
            urls.push({
              loc: `https://tark.live/intelligence/${slug}?id=${encodeURIComponent(art.id)}`,
              lastmod: dateStr,
              changefreq: 'weekly',
              priority: '0.8',
            });
          }
        }
      }
    } catch (err) {
      console.warn('[sitemap] Supabase current affairs query error:', err);
    }

    // 3. Query PIB Digests for daily edition archives
    try {
      const { data: digests, error } = await supabase
        .from('pib_digests')
        .select('date, created_at')
        .order('date', { ascending: false })
        .limit(120);

      if (!error && digests) {
        for (const dig of digests) {
          if (dig.date) {
            urls.push({
              loc: `https://tark.live/daily-edition/${encodeURIComponent(dig.date)}`,
              lastmod: formatDate(dig.created_at || dig.date),
              changefreq: 'monthly',
              priority: '0.75',
            });
          }
        }
      }
    } catch (err) {
      console.warn('[sitemap] Supabase pib_digests query error:', err);
    }
  }

  const seenLocs = new Set<string>();
  const uniqueUrls: typeof urls = [];
  for (const u of urls) {
    if (!seenLocs.has(u.loc)) {
      seenLocs.add(u.loc);
      uniqueUrls.push(u);
    }
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const u of uniqueUrls) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(u.loc)}</loc>\n`;
    xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
    xml += `    <priority>${u.priority}</priority>\n`;
    xml += `  </url>\n`;
  }
  xml += `</urlset>\n`;

  mainSitemapCache = { xml, timestamp: now };
  return xml;
}

export async function generateNewsSitemap(): Promise<string> {
  const now = Date.now();
  if (newsSitemapCache && (now - newsSitemapCache.timestamp < NEWS_CACHE_DURATION_MS)) {
    return newsSitemapCache.xml;
  }

  const supabase = getSupabaseClient();
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  let items: { loc: string; title: string; pubDate: string }[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('current_affairs')
        .select('id, headline, published_at, created_at')
        .gte('created_at', twoDaysAgo)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        for (const art of data) {
          if (art.id && art.headline) {
            const slug = slugify(art.headline);
            const pubDate = new Date(art.published_at || art.created_at || Date.now()).toISOString();
            items.push({
              loc: `https://tark.live/intelligence/${slug}?id=${encodeURIComponent(art.id)}`,
              title: art.headline,
              pubDate,
            });
          }
        }
      }
    } catch (err) {
      console.warn('[news-sitemap] Failed to fetch recent articles:', err);
    }
  }

  const seenNews = new Set<string>();
  const uniqueItems: typeof items = [];
  for (const item of items) {
    if (!seenNews.has(item.loc)) {
      seenNews.add(item.loc);
      uniqueItems.push(item);
    }
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n`;

  for (const item of uniqueItems) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(item.loc)}</loc>\n`;
    xml += `    <news:news>\n`;
    xml += `      <news:publication>\n`;
    xml += `        <news:name>Tark Daily Intelligence</news:name>\n`;
    xml += `        <news:language>en</news:language>\n`;
    xml += `      </news:publication>\n`;
    xml += `      <news:publication_date>${item.pubDate}</news:publication_date>\n`;
    xml += `      <news:title>${escapeXml(item.title)}</news:title>\n`;
    xml += `    </news:news>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;

  newsSitemapCache = { xml, timestamp: now };
  return xml;
}
