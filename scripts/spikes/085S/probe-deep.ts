/**
 * scripts/spikes/085S/probe-deep.ts
 *
 * Second-stage deep probe for TASK_085S:
 * - indiacode.gov.in (migrated domain)
 * - sansad.in/ls/legislation/bills
 * - PRS single bill detail page
 * - Terms of use on PRS, RBI, Sansad, eGazette
 */

import { gotScraping } from "got-scraping";
import fs from "node:fs";
import path from "node:path";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchUrl(url: string, label: string) {
  console.log(`\nFetching ${label}: ${url}`);
  try {
    const res = await gotScraping({
      url,
      timeout: { request: 15000 },
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    console.log(`Status: ${res.statusCode}, Length: ${res.body.length}`);
    return { status: res.statusCode, body: res.body };
  } catch (err: any) {
    console.log(`Error ${label}: ${err.message}`);
    return { status: err.response?.statusCode || 0, error: err.message, body: err.response?.body || "" };
  }
}

async function run() {
  const outDir = path.join(process.cwd(), "scripts", "spikes", "085S", "out");

  const targets = [
    { label: "indiacode_gov_robots", url: "https://indiacode.gov.in/robots.txt" },
    { label: "indiacode_gov_home", url: "https://indiacode.gov.in" },
    { label: "sansad_ls_bills", url: "https://sansad.in/ls/legislation/bills" },
    { label: "prs_bill_sample", url: "https://prsindia.org/billtrack/the-disaster-management-amendment-bill-2024" },
    { label: "prs_terms", url: "https://prsindia.org/terms-of-use" },
    { label: "rbi_disclaimer", url: "https://www.rbi.org.in/Scripts/Disclaimer.aspx" },
  ];

  for (const t of targets) {
    const res = await fetchUrl(t.url, t.label);
    fs.writeFileSync(path.join(outDir, `${t.label}.txt`), res.body || "", "utf-8");
    await delay(5000);
  }

  console.log("\nDeep probe complete.");
}

run().catch(console.error);
