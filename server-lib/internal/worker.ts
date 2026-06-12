import { XMLParser } from "fast-xml-parser";
// @ts-ignore - got-scraping exports 'got' as a named export
import { got } from "got-scraping";
import { createClient } from "@supabase/supabase-js";
import { callUpdateSourceReputation } from "./reputation.js";
import { upsertCurrentAffairs } from "../cron/db.js";

// Clean env helper
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

// RSS feed URL lookup by source key
const SOURCE_FEEDS: Record<string, string> = {
  "PIB": "https://pib.gov.in/RssFeed.aspx?PingID=1",
  "ECONOMIC TIMES": "https://economictimes.indiatimes.com/news/economy/policy/rssfeeds/2142142220.cms",
  "LIVEMINT": "https://www.livemint.com/rss/economy",
  "THE HINDU": "https://www.thehindu.com/news/national/feeder/default.rss",
  "RBI": "https://www.rbi.org.in/rss/PRs.xml",
  "INDIAN EXPRESS": "https://indianexpress.com/section/explained/feed/",
  "BUSINESS STANDARD": "https://www.business-standard.com/rss/economy-policy-103.rss",
};

// Exclusion keywords (zero AI cost pre-filter)
const EXCLUDE_KEYWORDS = [
  'MURDER', 'RAPE', 'ACCIDENT', 'ASSAULT', 'ARRESTED', 'DIED', 'DEATH',
  'CELEBRITY', 'CINEMA', 'FILM', 'BOLLYWOOD', 'CRIME'
];

// Dynamically assign a ministry tag based on headline text
function deriveMinistryTag(text: string): string {
  const upper = text.toUpperCase();
  if (upper.includes('FINANCE') || upper.includes('ECONOMY') || upper.includes('BUDGET') || upper.includes('TAX')) return 'Ministry of Finance';
  if (upper.includes('DEFENCE') || upper.includes('DEFENSE') || upper.includes('MILITARY')) return 'Ministry of Defence';
  if (upper.includes('COMMERCE') || upper.includes('TRADE') || upper.includes('EXPORT') || upper.includes('IMPORT')) return 'Ministry of Commerce & Industry';
  if (upper.includes('CABINET') || upper.includes('GOVERNMENT') || upper.includes('PRIME MINISTER')) return 'Union Cabinet';
  if (upper.includes('EDUCATION') || upper.includes('SCHOOL') || upper.includes('COLLEGE')) return 'Ministry of Education';
  if (upper.includes('HEALTH') || upper.includes('HOSPITAL') || upper.includes('MEDICAL')) return 'Ministry of Health and Family Welfare';
  if (upper.includes('AGRICULTURE') || upper.includes('FARMER')) return 'Ministry of Agriculture & Farmers Welfare';
  if (upper.includes('RAILWAY') || upper.includes('RAIL') || upper.includes('TRAIN')) return 'Ministry of Railways';
  if (upper.includes('POWER') || upper.includes('ENERGY') || upper.includes('ELECTRICITY')) return 'Ministry of Power';
  if (upper.includes('HOME') || upper.includes('INTERNAL SECURITY')) return 'Ministry of Home Affairs';
  if (upper.includes('EXTERNAL') || upper.includes('FOREIGN') || upper.includes('DIPLOMATIC')) return 'Ministry of External Affairs';
  if (upper.includes('RBI') || upper.includes('RESERVE BANK') || upper.includes('MONETARY')) return 'Reserve Bank of India';
  return 'Government of India';
}

export default async function handler(req: any, res: any) {
  console.log(`[Worker] Received request for source: ${req.query.source}`);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const sourceKey: string | undefined = req.query?.source;

  // Authenticate via Authorization header
  const workerSecret = process.env.INTERNAL_WORKER_SECRET || '';
  if (req.headers.authorization !== `Bearer ${workerSecret}`) {
    console.error(`[Worker] Auth failed! Received: ${req.headers.authorization}`);
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!sourceKey) {
    return res.status(400).json({ error: 'Missing required query parameter: source' });
  }

  const normalizedSource = sourceKey.toUpperCase();
  const feedUrl = SOURCE_FEEDS[normalizedSource];

  if (!feedUrl) {
    // Record failure for unknown source
    await callUpdateSourceReputation(normalizedSource, false, Date.now() - startTime);
    return res.status(400).json({ error: `Unknown source: ${sourceKey}. Supported sources: ${Object.keys(SOURCE_FEEDS).join(', ')}` });
  }

  try {
    console.log(`[internal/worker] Processing source=${normalizedSource} url=${feedUrl}`);

    // Fetch RSS XML using got-scraping with granular timeouts and single retry
    const response = await got.get(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/xml, text/xml, */*',
      },
      timeout: {
        lookup: 1000,
        connect: 2000,
        secureConnect: 2000,
        response: 4000,
        read: 5000,
      },
      retry: {
        limit: 1,
      },
      responseType: 'text',
    });

    const xml = response.body;
    if (!xml || xml.length < 100) {
      const latency = Date.now() - startTime;
      await callUpdateSourceReputation(normalizedSource, false, latency);
      return res.status(502).json({ error: 'Empty or too-short RSS feed response', latency });
    }

    // Parse RSS XML with fast-xml-parser
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name) => name === 'item' || name === 'entry',
    });
    const parsed = parser.parse(xml);

    // Extract items (RSS 2.0: rss.channel.item, Atom: feed.entry)
    const channel = parsed?.rss?.channel || parsed?.feed;
    let items: any[] = channel?.item || channel?.entry || [];

    if (!Array.isArray(items)) {
      items = items ? [items] : [];
    }

    // Limit to first 3 items for this isolated run
    const processLimit = 3;
    const toProcess = items.slice(0, processLimit);

    let processed = 0;
    let filtered = 0;
    let duplicates = 0;

    const supabaseUrl = process.env.SUPABASE_URL || "https://ixngfxaerlkkcacrbdgc.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    for (const item of toProcess) {
      // Extract fields (RSS uses title/link, Atom uses title/link with href)
      const title = typeof item.title === 'string' ? item.title : item.title?.['#text'] || item.title?._text || '';
      let link = '';
      if (typeof item.link === 'string') {
        link = item.link;
      } else if (item.link?.['@_href']) {
        link = item.link['@_href'];
      } else if (item.link?._text) {
        link = item.link._text;
      }

      if (!title || !link) continue;

      // Exclusion keyword filter
      const description = typeof item.description === 'string' ? item.description : item.description?.['#text'] || item.contentSnippet || title;
      const checkText = (title + ' ' + description).toUpperCase();
      let excluded = false;
      for (const keyword of EXCLUDE_KEYWORDS) {
        if (checkText.includes(keyword)) { excluded = true; break; }
      }
      if (excluded) {
        filtered++;
        continue;
      }

      // Dedup check
      const { data: existing } = await supabase
        .from('current_affairs')
        .select('id')
        .eq('url', link)
        .maybeSingle();

      if (existing) {
        duplicates++;
        continue;
      }

      // Build summary bullets from title + description
      const cleanTitle = title.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      const cleanDesc = typeof description === 'string'
        ? description.replace(/<[^>]*>/g, '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/\s+/g, ' ').trim()
        : '';

      const bullets: string[] = [`${normalizedSource} release: ${cleanTitle}`];
      if (cleanDesc) {
        bullets.push(`Context: ${cleanDesc.substring(0, 200)}`);
      }

      const ministry = deriveMinistryTag(cleanTitle + ' ' + cleanDesc);

      const { error: upsertErr } = await supabase
        .from('current_affairs')
        .insert({
          source: normalizedSource,
          ministry,
          headline: cleanTitle,
          url: link,
          summary: { bullets },
          created_at: new Date().toISOString()
        });

      if (upsertErr) {
        console.error(`[internal/worker] Upsert error for "${cleanTitle.substring(0, 60)}":`, upsertErr);
      } else {
        processed++;
        console.log(`[internal/worker] Ingested [${ministry}]: ${cleanTitle.substring(0, 60)}`);
      }
    }

    const latency = Date.now() - startTime;
    await callUpdateSourceReputation(normalizedSource, true, latency);

    return res.status(200).json({
      status: 'success',
      source: normalizedSource,
      processed,
      filtered,
      duplicates,
      total_fetched: items.length,
      latency_ms: latency,
    });

  } catch (err: any) {
    const latency = Date.now() - startTime;
    await callUpdateSourceReputation(normalizedSource, false, latency);

    console.error(`[Worker] CRITICAL FAILURE for ${req.query.source}:`, err);
    return res.status(500).json({ error: 'Scraping failed', details: err.message });
  }
}