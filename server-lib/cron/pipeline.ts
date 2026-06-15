import type { CronConfig } from "./config.js";
import { getLlama3Insight } from "./ai.js";
import { upsertCurrentAffairs } from "./db.js";

// ============================================================
// SAFE DATE PARSER (Eradicates "Invalid time value" crashes)
// ============================================================
function safeParseDate(raw: string | null | undefined): string {
  if (!raw) return new Date().toISOString();
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================
// CANONICAL MINISTRY ENTITIES (Deterministic, Zero API Cost)
// ============================================================
const CANONICAL_ENTITIES = [
  "Prime Minister's Office",
  "Cabinet Secretariat",
  "Ministry of Finance",
  "Ministry of Commerce & Industry",
  "Ministry of External Affairs",
  "Ministry of Defence",
  "Ministry of Home Affairs",
  "Ministry of Education",
  "Ministry of Health and Family Welfare",
  "Ministry of Agriculture & Farmers Welfare",
  "Ministry of Environment, Forest and Climate Change",
  "Ministry of Power",
  "Ministry of Railways",
  "Ministry of Road Transport & Highways",
  "Ministry of Information & Broadcasting",
  "Ministry of Coal",
  "Ministry of Petroleum & Natural Gas",
  "Ministry of Labour & Employment",
  "Ministry of Culture",
  "Ministry of Electronics & IT",
  "Ministry of Steel",
  "Ministry of New and Renewable Energy",
  "Ministry of Heavy Industries",
  "Ministry of Civil Aviation",
  "Ministry of Mines",
  "Ministry of Tourism",
  "Ministry of Textiles",
  "Ministry of Science & Technology",
  "Ministry of Jal Shakti",
  "Ministry of Rural Development",
  "Ministry of Panchayati Raj",
  "Ministry of Social Justice & Empowerment",
  "Ministry of Women and Child Development",
  "Ministry of Youth Affairs and Sports",
  "Ministry of Housing & Urban Affairs",
  "Ministry of Ports, Shipping and Waterways",
  "Ministry of Skill Development and Entrepreneurship",
  "Ministry of Fisheries, Animal Husbandry & Dairying",
  "Ministry of Consumer Affairs, Food & Public Distribution",
  "Ministry of Law and Justice",
  "Ministry of Corporate Affairs",
  "NITI Aayog",
  "Department of Space",
  "Department of Atomic Energy",
  "Election Commission",
  "Reserve Bank of India",
  "RBI",
];

const MINISTRY_ALIASES: Record<string, string[]> = {
  "Prime Minister's Office": ["PMO", "PM Office"],
  "Ministry of Finance": ["MOF", "Finance Ministry", "Finance"],
  "Ministry of Commerce & Industry": ["Commerce Ministry", "Commerce", "MOCI"],
  "Ministry of External Affairs": ["MEA", "External Affairs"],
  "Ministry of Defence": ["MOD", "Defence", "Defense"],
  "Ministry of Home Affairs": ["MHA", "Home Ministry"],
  "Ministry of Education": ["MOE", "Education Ministry", "MHRD"],
  "Ministry of Health and Family Welfare": ["MOHFW", "Health Ministry"],
  "Ministry of Agriculture & Farmers Welfare": ["MOAFW", "Agriculture"],
  "Ministry of Environment, Forest and Climate Change": ["MOEFCC", "Environment"],
  "Ministry of Power": ["Power Ministry"],
  "Ministry of Railways": ["Railway Ministry"],
  "Ministry of Electronics & IT": ["MEITY", "Electronics", "IT"],
  "Ministry of Information & Broadcasting": ["MIB", "I&B"],
  "NITI Aayog": ["NITI"],
  "Reserve Bank of India": ["RBI"],
};

// ============================================================
// POLICY KEYWORDS (Rule-based filtering, Zero API Cost)
// ============================================================
const POLICY_KEYWORDS = [
  'policy', 'ministry', 'government', 'cabinet', 'regulation', 'directive', 'scheme',
  'program', 'budget', 'act', 'bill', 'parliament', 'lok sabha', 'rajya sabha',
  'notification', 'circular', 'announcement', 'proposal', 'reform', 'initiative',
  'mandate', 'guideline', 'framework', 'strategy', 'roadmap', 'committee',
  'investment', 'allocation', 'fund', 'grant', 'subsidy', 'tax', 'tariff',
  'accord', 'treaty', 'agreement', 'mou', 'memorandum', 'rbi', 'reserve bank',
  'auction', 'rate', 'inflation', 'gdp', 'fiscal', 'monetary', 'economic', 'inflation',
  'interest rate', 'bond', 'rupee', 'exports', 'imports', 'trade'
];

const NOISE_KEYWORDS = [
  'cricket', 'sports', 'bollywood', 'actor', 'actress', 'movie', 'film',
  'celebrity', 'gossip', 'entertainment', 'marriage', 'divorce', 'crime',
  'murder', 'rape', 'accident', 'fire', 'flood', 'weather', 'weather forecast',
  'horoscope', 'astrology', 'viral', 'meme', 'tiktok', 'instagram'
];

// ============================================================
// TIER 1: EXCLUSION KEYWORDS (from scrape.ts, extended)
// ============================================================
const EXCLUDE_KEYWORDS = [
  'MURDER', 'RAPE', 'ACCIDENT', 'ASSAULT', 'ARRESTED', 'DIED', 'DEATH',
  'CREMATED', 'CELEBRITY', 'CINEMA', 'FILM', 'BOLLYWOOD', 'CRIME',
  'AQUAPLANING', 'OBITUARY', 'OBIT', 'FUNERAL', 'VIP PASS', 'CONCERT',
  'FESTIVAL', 'TRAFFIC JAM', 'ROAD CLOSURE', 'LOCAL', 'NEIGHBOURHOOD',
  'CELEBRATION', 'WEDDING', 'MARRIAGE', 'DROWN', 'SUICIDE', 'THEFT',
  'ROBBERY', 'KIDNAP', 'MOLESTATION', 'CORRUPTION CASE', 'SCAM',
  'SENSEX', 'NIFTY', 'MUTUAL FUND', 'D-STREET', 'WALL STREET',
  'STOCK MARKET', 'FLEXICAP', 'MULTICAP', 'EQUITY', 'LAWSUIT',
  'DATING APP', 'TWEETED', 'VIRAL',
];

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function extractMinistryDeterministic(text: string, source: string): string {
  const combined = `${text} ${source}`.toLowerCase();

  // First pass: exact matches
  for (const [ministry, aliases] of Object.entries(MINISTRY_ALIASES)) {
    for (const alias of aliases) {
      if (combined.includes(normalizeText(alias))) {
        return ministry;
      }
    }
  }

  // Second pass: canonical entities
  for (const ministry of CANONICAL_ENTITIES) {
    if (combined.includes(normalizeText(ministry))) {
      return ministry;
    }
  }

  // Fallback: generic government
  return "Government of India";
}

// ============================================================
// CONFIDENCE SCORER (Strict ≥ 50% threshold)
// ============================================================
function isPolicyRelevant(title: string, description: string, source: string): { is_policy: boolean; confidence: number } {
  const text = `${title} ${description} ${source}`.toLowerCase();

  // Check for noise keywords (rejection rules)
  for (const noise of NOISE_KEYWORDS) {
    if (text.includes(noise)) {
      // Unless also has strong policy indicators
      let policyScore = 0;
      for (const policy of POLICY_KEYWORDS) {
        if (text.includes(policy)) policyScore++;
      }
      if (policyScore < 2) {
        return { is_policy: false, confidence: 0 };
      }
    }
  }

  // Count policy keyword matches
  let policyScore = 0;
  for (const policy of POLICY_KEYWORDS) {
    if (text.includes(policy)) policyScore++;
  }

  // Title mentions ministry/government = high confidence
  if (title.toLowerCase().includes('ministry') || title.toLowerCase().includes('government') || title.toLowerCase().includes('india')) {
    policyScore += 3;
  }

  // If source is official channel = high confidence
  if (source.toLowerCase().includes('pib') || source.toLowerCase().includes('press') || source.toLowerCase().includes('government') || source.toLowerCase().includes('economic times') || source.toLowerCase().includes('livemint')) {
    policyScore += 2;
  }

  const confidence = Math.min(policyScore / 8, 1.0);
  // STRICT THRESHOLD: at least 50% confidence required
  const is_policy = confidence >= 0.5;

  return { is_policy, confidence };
}

// ============================================================
// RSS PARSER (Manual, Zero Dependencies)
// ============================================================
async function fetchRssFeed(url: string, sourceName: string): Promise<any[]> {
  try {
    console.log(`[pipeline][rss] Fetching from ${sourceName}...`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/xml, text/xml, */*'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      console.warn(`[pipeline][rss] Failed from ${sourceName} (${res.status})`);
      return [];
    }

    const xml = await res.text();
    if (!xml || xml.length < 100) return [];

    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    let limit = 0;

    while ((match = itemRegex.exec(xml)) !== null && limit < 25) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const descriptionMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || itemContent.match(/<pubdate>([\s\S]*?)<\/pubdate>/i);

      let title = titleMatch ? titleMatch[1].trim() : '';
      let link = linkMatch ? linkMatch[1].trim() : '';
      let description = descriptionMatch ? descriptionMatch[1].trim() : '';

      if (title && link) {
        // HTML entity decoding
        title = title
          .replace(/&/g, '&')
          .replace(/</g, '<')
          .replace(/>/g, '>')
          .replace(/"/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/'/g, "'")
          .replace(/<!\[CDATA\[|\]\]>/g, "")
          .trim();

        link = link.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
        description = description
          .replace(/<[^>]*>/g, '')
          .replace(/&/g, '&')
          .replace(/"/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/<!\[CDATA\[|\]\]>/g, "")
          .replace(/\s+/g, ' ')
          .trim();

        items.push({
          title,
          link,
          description: description.substring(0, 300),
          source: sourceName,
          pubDate: pubDateMatch ? pubDateMatch[1].trim() : null,
        });
        limit++;
      }
    }

    console.log(`[pipeline][rss] Got ${items.length} items from ${sourceName}`);
    return items;
  } catch (error) {
    console.warn(`[pipeline][rss] Error from ${sourceName}:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

// ============================================================
// ADVANCED ARTICLE SCRAPER (Better content extraction)
// ============================================================
async function scrapeArticleContent(url: string): Promise<{ title: string; content: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) return null;

    const html = await res.text();
    if (!html || html.length < 300) return null;

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().split('|')[0] : 'Unknown';

    let content = '';

    // Strategy 1: Look for common article containers
    const mainContentPatterns = [
      /<main[^>]*>([\s\S]{200,15000}?)<\/main>/i,
      /<article[^>]*>([\s\S]{200,15000}?)<\/article>/i,
      /<div[^>]*class=['"]content[^'"]*['"][^>]*>([\s\S]{200,15000}?)<\/div>/i,
      /<div[^>]*class=['"]article[^'"]*['"][^>]*>([\s\S]{200,15000}?)<\/div>/i,
      /<div[^>]*id=['"]content[^'"]*['"][^>]*>([\s\S]{200,15000}?)<\/div>/i,
      /<div[^>]*id=['"]article[^'"]*['"][^>]*>([\s\S]{200,15000}?)<\/div>/i,
    ];

    for (const pattern of mainContentPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        content = match[1];
        break;
      }
    }

    // Strategy 2: Extract ALL paragraphs if no container found
    if (!content || content.length < 200) {
      const paragraphMatches: string[] =
        html.match(/<p[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/p>/gi) || [];

      // Filter out very short paragraphs and remove common noise
      const filteredParagraphs = paragraphMatches
        .filter(
          (p) =>
            p.length > 50 &&
            !p.toLowerCase().includes("cookie") &&
            !p.toLowerCase().includes("advertisement")
        )
        .slice(0, 30);

      content = filteredParagraphs.join("\n");
    }

    // Clean HTML tags and entities
    content = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/'/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    if (content.length < 80) {
      return null;
    }

    return {
      title: title.substring(0, 200),
      content: content.substring(0, 3000)
    };
  } catch (error) {
    console.warn(`[pipeline][scrape] Failed:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

// ============================================================
// SOURCE TAGGER (URL-based source detection)
// ============================================================
function deriveSourceTag(url: string, fallbackSource: string): string {
  if (url.includes("livemint.com")) return "LIVEMINT";
  if (url.includes("economictimes.indiatimes")) return "ECONOMIC TIMES";
  if (url.includes("thehindu.com")) return "THE HINDU";
  if (url.includes("pib.gov.in")) return "PIB";
  if (url.includes("indianexpress.com")) return "INDIAN EXPRESS";
  if (url.includes("business-standard.com")) return "BUSINESS STANDARD";
  if (url.includes("rbi.org.in")) return "RBI";
  return fallbackSource;
}

// ============================================================
// SHARED PIPELINE CONFIG (defaults for pipeline.ts usage)
// ============================================================
function getDefaultCronConfig(): CronConfig {
  return {
    feeds: [],
    maxItemsPerFeed: 1,
    aiEndpointUrl: "https://sku1-meta-llama-llama-3-1-8b-instruct.hf.space/run/chat_fn",
    supabaseUrl: process.env.SUPABASE_URL ?? "https://ixngfxaerlkkcacrbdgc.supabase.co",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    timeoutMs: 20000,
    maxConcurrency: 1,
    browserHeaders: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/xml, text/xml, */*",
    },
  };
}

// ============================================================
// MAIN PIPELINE FUNCTION
// ============================================================
export async function runPolicyPipeline(): Promise<{
  status: string;
  processed_count: number;
  filtered_count: number;
  duplicate_count: number;
  error_count: number;
  total_fetched: number;
}> {
  console.log("[pipeline] Starting unified policy pipeline...");
  
  // Hard 55s timeout guard to prevent Vercel process kill
  const globalTimeout = AbortSignal.timeout(55000);
  let isTimedOut = false;
  globalTimeout.addEventListener('abort', () => {
    isTimedOut = true;
    console.warn("[pipeline] Global 55s timeout reached. Initiating graceful exit.");
  });

  // Build a shared CronConfig once for all getLlama3Insight calls
  const sharedConfig = getDefaultCronConfig();

  // 1. Fetch RSS feeds from multiple sources (extended with the two new URLs)
  const rssFeeds = [
    { url: 'https://pib.gov.in/RssFeed.aspx?PingID=1', name: 'PIB English National' },
    { url: 'https://www.thehindu.com/opinion/editorial/feeder/default.rss', name: 'The Hindu Editorials' },
    { url: 'https://www.thehindu.com/business/Economy/feeder/default.rss', name: 'The Hindu Macro-Economy' },
    { url: 'https://indianexpress.com/section/explained/feed/', name: 'Indian Express Explained' },
    { url: 'https://www.business-standard.com/rss/economy-policy-103.rss', name: 'Business Standard Economy & Policy' },
    { url: 'https://www.livemint.com/rss/economy', name: 'Livemint Economy' },
    { url: 'https://www.rbi.org.in/rss/PRs.xml', name: 'RBI Press Releases' }
  ];

  let allArticles: any[] = [];
  for (const feed of rssFeeds) {
    if (isTimedOut) break;
    const articles = await fetchRssFeed(feed.url, feed.name);
    allArticles = [...allArticles, ...articles];
    await sleep(1500);
  }

  console.log(`[pipeline] Total articles fetched: ${allArticles.length}`);

  if (allArticles.length === 0) {
    console.warn("[pipeline] No articles fetched from any RSS feed");
    return {
      status: "warning",
      processed_count: 0,
      filtered_count: 0,
      duplicate_count: 0,
      error_count: 0,
      total_fetched: 0
    };
  }

  // 2. Process articles with deduplication and filtering
  const processLimit = 15;
  let processedCount = 0;
  let filteredCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  const processedStore: any[] = [];

  for (const article of allArticles) {
    if (isTimedOut) {
      console.log(`[pipeline] Exiting early due to global timeout.`);
      break;
    }
    if (processedCount >= processLimit) {
      console.log(`[pipeline] Reached processing limit (${processLimit}). Stopping.`);
      break;
    }

    try {
      // ================================================================
      // TIER 1: HARD EXCLUSION KEYWORD FILTER (Zero AI cost pre-filter)
      // ================================================================
      const exclusionCheckText = (article.title + ' ' + (article.description || '')).toUpperCase();
      let isExcluded = false;
      for (const keyword of EXCLUDE_KEYWORDS) {
        if (exclusionCheckText.includes(keyword)) {
          console.warn("[pipeline] Tier-1 filtered (keyword match)", { keyword, title: article.title, url: article.link });
          isExcluded = true;
          break;
        }
      }
      if (isExcluded) {
        filteredCount++;
        continue;
      }
      // ================================================================

      // Check if already in database (early dedup to save AI calls)
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.SUPABASE_URL ?? "https://ixngfxaerlkkcacrbdgc.supabase.co";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
      const supabaseServer = createClient(supabaseUrl, supabaseKey);

      const { data: existing } = await supabaseServer
        .from('current_affairs')
        .select('id')
        .eq('url', article.link)
        .maybeSingle();

      if (existing) {
        duplicateCount++;
        continue;
      }

      // TIER 1.5: Confidence-based policy relevance check (rule-based, ZERO API COST)
      const policyCheck = isPolicyRelevant(article.title, article.description || '', article.source);

      if (!policyCheck.is_policy) {
        console.warn(`[pipeline] Confidence filter: ${article.title.substring(0, 60)} (confidence: ${(policyCheck.confidence * 100).toFixed(0)}%)`);
        filteredCount++;
        continue;
      }

      console.log(`[pipeline] Passing confidence threshold: ${article.title.substring(0, 60)} (${(policyCheck.confidence * 100).toFixed(0)}%)`);

      // Scrape full article content (improved extraction)
      const scraped = await scrapeArticleContent(article.link);
      if (!scraped || scraped.content.length < 80) {
        console.log(`[pipeline] Content extraction failed or too short, using fallback: ${article.title.substring(0, 60)}`);

        // Fail-soft: synthesize a headline-based description (from scrape.ts)
        const combinedText = "Headline: " + article.title;
        const aiInsight = await getLlama3Insight(combinedText, sharedConfig);

        if (!aiInsight || !aiInsight.text) {
          console.warn(`[pipeline] AI filtered (null) on fallback: ${article.title.substring(0, 60)}`);
          filteredCount++;
          continue;
        }

        const bulletsArray = aiInsight.text
          .split('\n')
          .map(line => line.replace(/^[-•*]\s*/, '').trim())
          .filter(line => line.length > 0);

        const sourceTag = deriveSourceTag(article.link, article.source);
        const ministry = extractMinistryDeterministic(article.title, article.source);

        const result = await upsertCurrentAffairs({
          source: sourceTag,
          ministry: ministry,
          headline: article.title,
          url: article.link,
          summary: { bullets: bulletsArray }
        });

        if (!result.ok) {
          console.error(`[pipeline] DB upsert failed (fallback path): ${result.errorMessage}`);
          errorCount++;
        } else {
          console.log(`[pipeline] ✓ Ingested [${ministry}] via fallback path`);
          processedStore.push({ ministry, headline: article.title, url: article.link });
          processedCount++;
        }

        await sleep(2000);
        continue;
      }

      // ================================================================
      // Use deterministic ministry detection
      // ================================================================
      const ministry = extractMinistryDeterministic(scraped.title + ' ' + scraped.content, article.source);

      // ================================================================
      // UNIFIED AI PIPELINE: Route through getLlama3Insight (ai.ts)
      // 100% reliance on Llama-3.1 — NO Gemini fallback
      // ================================================================
      const combinedText = scraped.title + ' ' + scraped.content;
      const aiInsight = await getLlama3Insight(combinedText, sharedConfig);

      if (!aiInsight || !aiInsight.text) {
        console.warn(`[pipeline] AI filtered (null): ${scraped.title.substring(0, 60)}`);
        filteredCount++;
        continue;
      }

      // Parse the normalized 3-bullet text into an array
      const bulletsArray = aiInsight.text
        .split('\n')
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(line => line.length > 0);

      // Derive source tag
      const sourceTag = deriveSourceTag(article.link, article.source);

      // Get safe published_at date
      const publishedAt = safeParseDate(article.pubDate);

      // ================================================================
      // DATABASE PAYLOAD — matches db.ts signature and frontend contract
      // { headline, url, source, ministry, published_at, summary: { bullets: [...] } }
      // ================================================================
      const result = await upsertCurrentAffairs({
        source: sourceTag,
        ministry: ministry,
        headline: scraped.title,
        url: article.link,
        summary: { bullets: bulletsArray }
      });

      if (!result.ok) {
        console.error(`[pipeline] DB upsert failed: ${result.errorMessage}`);
        errorCount++;
      } else {
        console.log(`[pipeline] ✓ Ingested [${ministry}] via unified pipeline`);
        processedStore.push({
          ministry,
          headline: scraped.title,
          url: article.link
        });
        processedCount++;
      }

      // Rate limiting
      await sleep(2000);
    } catch (itemError) {
      console.error(`[pipeline] Item failed:`, itemError instanceof Error ? itemError.message : String(itemError));
      errorCount++;
    }
  }

  console.log(`[pipeline] Summary: Processed: ${processedCount} | Filtered: ${filteredCount} | Duplicates: ${duplicateCount} | Errors: ${errorCount}`);

  return {
    status: "success",
    processed_count: processedCount,
    filtered_count: filteredCount,
    duplicate_count: duplicateCount,
    error_count: errorCount,
    total_fetched: allArticles.length,
  };
}