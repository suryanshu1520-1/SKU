import { chromium } from "playwright";
import TurndownService from "turndown";
import { getCronConfig } from "../server-lib/cron/config.js";
import { fetchAndParseRssFeed } from "../server-lib/cron/rss.js";
import { getLlama3Insight } from "../server-lib/cron/ai.js";
import { upsertCurrentAffairs } from "../server-lib/cron/db.js";

function getStr(val: any): string {
  if (typeof val === "string") return val;
  if (!val) return "";
  if (typeof val === "object") {
    if (val._text) return String(val._text);
    if (val["#text"]) return String(val["#text"]);
    if (val._cdata) return String(val._cdata);
    if (val.content) return String(val.content);
    if (val.href) return String(val.href);
    if (val["$t"]) return String(val["$t"]);
    if (val._value) return String(val._value);
    if (val.$value) return String(val.$value);
  }
  if (Array.isArray(val) && val.length > 0) return getStr(val[0]);
  return "";
}

async function run() {
  const config = getCronConfig();
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });

  console.log("[scraper-daemon] Booting Playwright Chromium instance...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
    }
  });

  let processedCount = 0;
  let filteredCount = 0;
  let errorCount = 0;

  for (const feedUrl of config.feeds) {
    try {
      console.log(`[scraper-daemon] Processing feed: ${feedUrl}`);
      const items = await fetchAndParseRssFeed(feedUrl, config) || [];
      const toProcess = items.slice(0, config.maxItemsPerFeed);

      for (const item of toProcess) {
        const itemUrl = getStr(item.link);
        const itemTitle = getStr(item.title);

        if (!itemUrl || !itemTitle) continue;

        // Hard exclusion keywords
        const EXCLUDE_KEYWORDS = [
          'MURDER', 'RAPE', 'ACCIDENT', 'ASSAULT', 'ARRESTED', 'DIED', 'DEATH',
          'CREMATED', 'CELEBRITY', 'CINEMA', 'FILM', 'BOLLYWOOD', 'CRIME',
          'AQUAPLANING', 'OBITUARY', 'OBIT', 'FUNERAL', 'VIP PASS', 'CONCERT',
          'FESTIVAL', 'TRAFFIC JAM', 'ROAD CLOSURE', 'LOCAL', 'NEIGHBOURHOOD',
          'CELEBRATION', 'WEDDING', 'MARRIAGE', 'DROWN', 'SUICIDE', 'THEFT',
          'ROBBERY', 'KIDNAP', 'MOLESTATION', 'CORRUPTION CASE', 'SCAM',
        ];

        let isExcluded = false;
        const exclusionCheckText = itemTitle.toUpperCase();
        for (const keyword of EXCLUDE_KEYWORDS) {
          if (exclusionCheckText.includes(keyword)) {
            isExcluded = true;
            break;
          }
        }
        if (isExcluded) {
          console.warn(`[scraper-daemon] Excluded via keywords: ${itemTitle}`);
          filteredCount++;
          continue;
        }

        console.log(`[scraper-daemon] Scraping: ${itemUrl}`);
        const page = await context.newPage();
        
        try {
          // Robust navigation for JS challenged sites like PIB
          await page.goto(itemUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          
          // If it's PIB, wait a bit longer for ASP.NET ViewState or JS redirect
          if (itemUrl.includes('pib.gov.in')) {
            console.log(`[scraper-daemon] PIB detected, waiting for network idle...`);
            try {
              await page.waitForLoadState('networkidle', { timeout: 15000 });
            } catch (e) {
               console.warn(`[scraper-daemon] PIB networkidle timeout, continuing...`);
            }
            
            try {
              await page.waitForSelector('.release-text, .ReleaseId, #content, .content-area', { state: 'attached', timeout: 10000 });
            } catch (e) {
               console.warn(`[scraper-daemon] PIB specific selector wait failed, using current DOM.`);
            }
          } else {
             // For standard sites, wait a short moment for dynamic content
             await page.waitForTimeout(2000);
          }

          // Aggressive DOM pruning
          await page.evaluate(() => {
            const selectorsToRemove = [
              'nav', 'header', 'footer', 'aside', '.sidebar', 'script', 'style', 
              '.social-share', '.ad-banner', '.ads', 'iframe', 'form', '.newsletter', 
              '.cookie-banner', '#comments', '.comments', '.related-articles',
              'noscript', 'svg', 'img', 'video', 'audio', '.menu', '#menu'
            ];
            
            document.querySelectorAll(selectorsToRemove.join(', ')).forEach(el => el.remove());
            
            // Further targeted pruning for typical Indian news sites
            document.querySelectorAll('[class*="banner"], [id*="banner"], [class*="ad-"], [id*="ad-"], [class*="social"], [class*="share"], [class*="widget"], [class*="promo"]').forEach(el => el.remove());
          });

          // Extract main content semantic HTML
          let contentHtml = '';
          const mainContainers = ['article', 'main', '.release-text', '.content-area', '#content', 'body'];
          
          for (const selector of mainContainers) {
            const el = await page.$(selector);
            if (el) {
              contentHtml = await el.innerHTML();
              if (contentHtml.length > 200) {
                 break;
              }
            }
          }

          if (!contentHtml || contentHtml.length < 50) {
            console.warn(`[scraper-daemon] Failed to extract meaningful HTML for ${itemUrl}`);
            await page.close();
            filteredCount++;
            continue;
          }

          // Convert pristine semantic HTML to clean Markdown
          const markdownPayload = turndownService.turndown(contentHtml).trim();
          
          // Fallback if the extracted markdown is too short
          const finalDescription = markdownPayload.length > 50 ? markdownPayload : itemTitle;

          // Ask Llama to analyze the clean Markdown payload
          const aiInsight = await getLlama3Insight(finalDescription, config);

          if (!aiInsight || !aiInsight.text) {
            console.warn(`[scraper-daemon] AI returned null (no insight) for ${itemUrl}`);
            filteredCount++;
            await page.close();
            continue;
          }

          // Generate Tags
          let sourceTag = "RSS";
          if (itemUrl.includes("livemint.com")) sourceTag = "LIVEMINT";
          else if (itemUrl.includes("economictimes.indiatimes")) sourceTag = "ECONOMIC TIMES";
          else if (itemUrl.includes("thehindu.com")) sourceTag = "THE HINDU";
          else if (itemUrl.includes("pib.gov.in")) sourceTag = "PIB";

          let ministryTag = "GENERAL";
          const textToSearch = (itemTitle + " " + finalDescription).toUpperCase();
          if (textToSearch.includes("FINANCE") || textToSearch.includes("ECONOMY") || textToSearch.includes("DEFICIT") || textToSearch.includes("GOLD") || textToSearch.includes("BANK")) {
              ministryTag = "MINISTRY OF FINANCE";
          } else if (textToSearch.includes("COMMERCE") || textToSearch.includes("TRADE") || textToSearch.includes("EXPORT") || textToSearch.includes("OIL")) {
              ministryTag = "MINISTRY OF COMMERCE AND INDUSTRY";
          } else if (textToSearch.includes("EARTH SCIENCES") || textToSearch.includes("WEATHER") || textToSearch.includes("SOLAR") || textToSearch.includes("RENEWABLE")) {
              ministryTag = "MINISTRY OF EARTH SCIENCES";
          } else if (textToSearch.includes("CABINET") || textToSearch.includes("GOVT") || textToSearch.includes("GOVERNMENT")) {
              ministryTag = "UNION CABINET";
          }

          const insightText = typeof aiInsight.text === "string" ? aiInsight.text : "";
          const bulletsArray = insightText
            .split('\n')
            .map(line => typeof line === "string" ? line.replace(/^[-•*]\s*/, '').trim() : "")
            .filter(line => line.length > 0);

          await upsertCurrentAffairs({
            headline: itemTitle,
            url: itemUrl,
            source: sourceTag,
            ministry: ministryTag,
            summary: { bullets: bulletsArray }
          });

          console.log(`[scraper-daemon] Successfully ingested: ${itemTitle}`);
          processedCount++;
          
        } catch (pageErr: any) {
          console.error(`[scraper-daemon] Page error for ${itemUrl}: ${pageErr.message}`);
          errorCount++;
        } finally {
          await page.close();
        }
      }
    } catch (feedErr: any) {
      console.error(`[scraper-daemon] Feed error for ${feedUrl}: ${feedErr.message}`);
      errorCount++;
    }
  }

  await browser.close();
  console.log(`[scraper-daemon] Finished. Processed: ${processedCount}, Filtered: ${filteredCount}, Errors: ${errorCount}`);
}

run().catch(err => {
  console.error("[scraper-daemon] Fatal error:", err);
  process.exit(1);
});
