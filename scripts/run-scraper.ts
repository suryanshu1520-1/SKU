import { gotScraping } from "got-scraping";
import * as cheerio from "cheerio";
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
        
        try {
          // Initial GET request via got-scraping
          const requestOptions: any = {
            url: itemUrl,
            headerGeneratorOptions: {
              browsers: [{ name: 'chrome', minVersion: 115 }],
              devices: ['desktop'],
              locales: ['en-US', 'en'],
              operatingSystems: ['windows', 'linux']
            },
            timeout: { request: 30000 }
          };

          if (process.env.PROXY_URL) {
            requestOptions.proxyUrl = process.env.PROXY_URL;
          }

          let response = await gotScraping(requestOptions);
          let html = response.body;

          // ASP.NET ViewState / Postback handling for .aspx pages (e.g. PIB)
          if (itemUrl.includes('.aspx') && itemUrl.includes('pib.gov.in')) {
            console.log(`[scraper-daemon] ASP.NET page detected, checking for ViewState...`);
            let $ = cheerio.load(html);
            const viewState = $('#__VIEWSTATE').val() as string;
            const viewStateGenerator = $('#__VIEWSTATEGENERATOR').val() as string;
            const eventValidation = $('#__EVENTVALIDATION').val() as string;
            
            if (viewState) {
               console.log(`[scraper-daemon] ViewState found. Executing ASP.NET POST...`);
               const cookies = response.headers['set-cookie'];
               
               const postOptions: any = {
                 url: itemUrl,
                 method: 'POST',
                 headerGeneratorOptions: requestOptions.headerGeneratorOptions,
                 form: {
                    __VIEWSTATE: viewState,
                    __VIEWSTATEGENERATOR: viewStateGenerator || '',
                    __EVENTVALIDATION: eventValidation || ''
                 },
                 timeout: { request: 30000 }
               };

               if (cookies) {
                 postOptions.headers = { 'Cookie': cookies.join('; ') };
               }
               if (process.env.PROXY_URL) {
                 postOptions.proxyUrl = process.env.PROXY_URL;
               }

               response = await gotScraping(postOptions);
               html = response.body;
            }
          }

          const $ = cheerio.load(html);

          // Aggressive DOM pruning with Cheerio
          const selectorsToRemove = [
            'nav', 'header', 'footer', 'aside', '.sidebar', 'script', 'style', 
            '.social-share', '.ad-banner', '.ads', 'iframe', 'form', '.newsletter', 
            '.cookie-banner', '#comments', '.comments', '.related-articles',
            'noscript', 'svg', 'img', 'video', 'audio', '.menu', '#menu',
            '[class*="banner"]', '[id*="banner"]', '[class*="ad-"]', '[id*="ad-"]', 
            '[class*="social"]', '[class*="share"]', '[class*="widget"]', '[class*="promo"]'
          ];
          
          $(selectorsToRemove.join(', ')).remove();

          // Extract main content semantic HTML
          let contentHtml = '';
          const mainContainers = ['article', 'main', '.release-text', '.content-area', '#content', 'body'];
          
          for (const selector of mainContainers) {
            const el = $(selector);
            if (el.length > 0) {
              contentHtml = el.html() || '';
              if (contentHtml.length > 200) {
                 break;
              }
            }
          }

          if (!contentHtml || contentHtml.length < 50) {
            console.warn(`[scraper-daemon] Failed to extract meaningful HTML for ${itemUrl}`);
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
        }
      }
    } catch (feedErr: any) {
      console.error(`[scraper-daemon] Feed error for ${feedUrl}: ${feedErr.message}`);
      errorCount++;
    }
  }

  console.log(`[scraper-daemon] Finished. Processed: ${processedCount}, Filtered: ${filteredCount}, Errors: ${errorCount}`);
  
  // Force exit to ensure GitHub Actions runner terminates successfully despite dangling WebSocket connections from Gradio
  process.exit(0);
}

run().catch(err => {
  console.error("[scraper-daemon] Fatal error:", err);
  process.exit(1);
});
