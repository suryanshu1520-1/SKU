import type { CronConfig } from "./config.js";
import { getCronConfig } from "./config.js";
import { fetchAndParseRssFeed, extractArticleDescriptionFromUrl } from "./rss.js";
import { getLlama3Insight } from "./ai.js";
import { upsertCurrentAffairs } from "./db.js";
import { waitUntil } from "@vercel/functions";

// Helper to safely extract strings from unpredictable XML-to-JSON parser outputs
function getStr(val: any): string {
  if (typeof val === "string") return val;
  if (!val) return "";
  if (typeof val === "object") {
    if (val._text) return String(val._text);
    if (val["#text"]) return String(val["#text"]);
    if (val._cdata) return String(val._cdata);
    if (val.content) return String(val.content);
    if (val.href) return String(val.href); // Handles <link href="...">
    if (val["$t"]) return String(val["$t"]); // Google News XML style
    if (val._value) return String(val._value);
    if (val.$value) return String(val.$value);
  }
  if (Array.isArray(val) && val.length > 0) return getStr(val[0]);
  return "";
}

export default async function handler(req: any, res: any) {
  // CRON_SECRET validation
  const authHeader = req.headers['authorization'] || '';
  if (
    !authHeader.includes(`Bearer ${process.env.CRON_SECRET}`) &&
    req.query.cron_secret !== process.env.CRON_SECRET
  ) {
    if (res) return res.status(401).json({ error: "Unauthorized" });
    throw new Error("Unauthorized");
  }

  const config: CronConfig = getCronConfig();

  let processedCount = 0;
  let filteredCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  console.log("[cron][scrape] starting", {
    feedsCount: config.feeds?.length ?? 0,
    maxItemsPerFeed: config.maxItemsPerFeed,
    timeoutMs: config.timeoutMs,
  });

  for (const feedUrl of config.feeds) {
    try {
      console.log("[cron][scrape] fetching feed", { feedUrl });
      
      const items = await fetchAndParseRssFeed(feedUrl, config) || [];
      console.log("[cron][scrape] feed parsed", { feedUrl, itemsCount: items.length });

      const toProcess = items.slice(0, config.maxItemsPerFeed);

      for (const item of toProcess) {
        // Enforce strict string types before passing to any other function
        const itemUrl = getStr(item.link);
        const itemTitle = getStr(item.title);
        const fallbackDesc = getStr(item.contentSnippet);

        if (!itemUrl || !itemTitle) continue;

        // Safely extract and fallback
        const rawDescription = await extractArticleDescriptionFromUrl(itemUrl, fallbackDesc, config);
        let extractedDescription = typeof rawDescription === "string" ? rawDescription : "";

        // If both the HTML fetch AND the RSS snippet are empty/invalid,
        // synthesize a fallback description so the pipeline continues (Fail-Soft)
        if (!extractedDescription || extractedDescription.length < 10) {
            extractedDescription = "Headline: " + itemTitle;
            console.warn("[cron][scrape] Using headline fallback for item", { itemUrl, fallback: extractedDescription });
        }

        // ================================================================
        // TIER 1: HARD EXCLUSION KEYWORD FILTER (Zero AI cost pre-filter)
        // ================================================================
        const EXCLUDE_KEYWORDS = [
            'MURDER', 'RAPE', 'ACCIDENT', 'ASSAULT', 'ARRESTED', 'DIED', 'DEATH',
            'CREMATED', 'CELEBRITY', 'CINEMA', 'FILM', 'BOLLYWOOD', 'CRIME',
            'AQUAPLANING', 'OBITUARY', 'OBIT', 'FUNERAL', 'VIP PASS', 'CONCERT',
            'FESTIVAL', 'TRAFFIC JAM', 'ROAD CLOSURE', 'LOCAL', 'NEIGHBOURHOOD',
            'CELEBRATION', 'WEDDING', 'MARRIAGE', 'DROWN', 'SUICIDE', 'THEFT',
            'ROBBERY', 'KIDNAP', 'MOLESTATION', 'CORRUPTION CASE', 'SCAM',
        ];

        const exclusionCheckText = (itemTitle + ' ' + extractedDescription).toUpperCase();
        let isExcluded = false;
        for (const keyword of EXCLUDE_KEYWORDS) {
            if (exclusionCheckText.includes(keyword)) {
                console.warn("[cron][scrape] Tier-1 filtered (keyword match)", { keyword, itemTitle, itemUrl });
                isExcluded = true;
                break;
            }
        }
        if (isExcluded) {
            filteredCount++;
            continue;
        }
        // ================================================================

        try {
          const processItem = async () => {
            console.log("[cron][scrape] Sending to AI", { feedUrl, itemTitle, itemUrl });

            const aiInsight = await getLlama3Insight(extractedDescription, config);

            if (!aiInsight || !aiInsight.text) {
              console.warn("[cron][scrape] filtered: AI returned null (no insight)", { itemUrl });
              return;
            }

            // 1. DYNAMIC SOURCE TAGGING
            let sourceTag = "RSS";
            if (itemUrl.includes("livemint.com")) sourceTag = "LIVEMINT";
            else if (itemUrl.includes("economictimes.indiatimes")) sourceTag = "ECONOMIC TIMES";
            else if (itemUrl.includes("thehindu.com")) sourceTag = "THE HINDU";

            // 2. DYNAMIC MINISTRY TAGGING
            let ministryTag = "GENERAL";
            const textToSearch = (itemTitle + " " + extractedDescription).toUpperCase();
            
            if (textToSearch.includes("FINANCE") || textToSearch.includes("ECONOMY") || textToSearch.includes("DEFICIT") || textToSearch.includes("GOLD") || textToSearch.includes("BANK")) {
                ministryTag = "MINISTRY OF FINANCE";
            } else if (textToSearch.includes("COMMERCE") || textToSearch.includes("TRADE") || textToSearch.includes("EXPORT") || textToSearch.includes("OIL")) {
                ministryTag = "MINISTRY OF COMMERCE AND INDUSTRY";
            } else if (textToSearch.includes("EARTH SCIENCES") || textToSearch.includes("WEATHER") || textToSearch.includes("SOLAR") || textToSearch.includes("RENEWABLE")) {
                ministryTag = "MINISTRY OF EARTH SCIENCES";
            } else if (textToSearch.includes("CABINET") || textToSearch.includes("GOVT") || textToSearch.includes("GOVERNMENT")) {
                ministryTag = "UNION CABINET";
            }

            // 3. CLEAN BULLET POINT ARRAY MAPPING
            const insightText = typeof aiInsight.text === "string" ? aiInsight.text : "";
            const bulletsArray = insightText
              .split('\n')
              .map(line => typeof line === "string" ? line.replace(/^[-•*]\s*/, '').trim() : "")
              .filter(line => line.length > 0);

            // 4. DATABASE PAYLOAD
            await upsertCurrentAffairs({
              headline: itemTitle,
              url: itemUrl,
              source: sourceTag,
              ministry: ministryTag,
              summary: { bullets: bulletsArray }
            });
          };

          waitUntil(processItem().catch(err => {
            console.error("[cron][scrape] Error in background AI processing", itemUrl, err.message);
          }));
          
          processedCount++;
        } catch (itemErr: any) {
          console.error("[cron][scrape] Error processing individual item", itemUrl, itemErr.message);
          errorCount++;
        }
      }
    } catch (e: any) {
      console.error("[cron][scrape] Error processing feed", feedUrl, e.message);
      errorCount++;
    }
  }

  console.log("[cron][scrape] finished", { processedCount, filteredCount, duplicateCount, errorCount });

  if (res) {
    return res.status(200).json({ status: "success", processedCount, filteredCount, duplicateCount, errorCount });
  }
  return { status: "success", processedCount, filteredCount, duplicateCount, errorCount };
}