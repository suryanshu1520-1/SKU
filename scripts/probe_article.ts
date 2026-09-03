/**
 * scripts/probe_article.ts
 *
 * Developer & Ingestion Diagnostic Tool.
 * Probes any URL against both the Cheerio path and the Firecrawl clean markdown fallback.
 * Reports latency, extracted character count, paywall detection, and whether it passes Tark's 200-char gate.
 *
 * Usage:
 *   npx tsx scripts/probe_article.ts <url>
 *   npx tsx scripts/probe_article.ts https://www.thehindu.com/...
 */

import { fetchText, extractBody, extractFromUrl } from '../server-lib/cron/ingest/extract.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function probe(url: string) {
  if (!url || !url.startsWith('http')) {
    console.error('Usage: npx tsx scripts/probe_article.ts <url>');
    process.exit(1);
  }

  console.log('===============================================================');
  console.log(`PROBING URL: ${url}`);
  console.log('===============================================================\n');

  // --- 1. Primary Free Path (got-scraping + Cheerio) ---
  console.log('[1] Testing Primary Free Path (got-scraping + Cheerio)...');
  const t0 = Date.now();
  const html = await fetchText(url, 10_000);
  const cheerioBody = html ? extractBody(html, []) : '';
  const cheerioMs = Date.now() - t0;

  console.log(`    Status:        ${html ? 'HTTP Success' : 'Fetch Failed / Blocked'}`);
  console.log(`    HTML Size:     ${html ? `${html.length} bytes` : '0 bytes'}`);
  console.log(`    Body Chars:    ${cheerioBody.length}`);
  console.log(`    Latency:       ${cheerioMs}ms`);
  console.log(`    Gate Status:   ${cheerioBody.length >= 200 ? '✅ PASSED (>= 200 chars)' : '❌ THIN (< 200 chars, would trigger fallback)'}`);
  if (cheerioBody) {
    console.log(`    Snippet:       "${cheerioBody.slice(0, 150)}..."\n`);
  } else {
    console.log(`    Snippet:       (none)\n`);
  }

  // --- 2. End-to-End Pipeline (extractFromUrl with Firecrawl fallback) ---
  console.log('[2] Testing Full Pipeline (extractFromUrl)...');
  const t1 = Date.now();
  const finalBody = await extractFromUrl(url, [], 10_000);
  const totalMs = Date.now() - t1;

  const fallbackTriggered = cheerioBody.length < 200 && finalBody.length > cheerioBody.length;
  console.log(`    Final Body:    ${finalBody.length} chars`);
  console.log(`    Total Latency: ${totalMs}ms`);
  console.log(`    Fallback Used: ${fallbackTriggered ? '🔥 YES (Recovered via Firecrawl)' : '⚡ NO (Cheerio primary was sufficient)'}`);
  console.log(`    Ingest Verdict: ${finalBody.length >= 200 ? '✅ ACCEPTED by Tark' : '❌ DROPPED (No text)'}`);

  if (finalBody) {
    console.log(`\n--- Extracted Text Sample (First 400 chars) ---`);
    console.log(finalBody.slice(0, 400));
    console.log('-----------------------------------------------\n');
  }
}

const targetUrl = process.argv[2] || 'https://indianexpress.com/article/india/mha-himalayan-states-glof-snow-avalanche-preparedness-govind-mohan-10862145/';
probe(targetUrl).catch(console.error);
