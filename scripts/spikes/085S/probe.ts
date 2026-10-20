/**
 * scripts/spikes/085S/probe.ts
 *
 * One-off probe script for TASK_085S primary law sources investigation.
 * Polite probes using got-scraping (>= 5s between requests to the same host).
 */

import { gotScraping } from "got-scraping";
import fs from "node:fs";
import path from "node:path";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function probeUrl(url: string, label: string) {
  console.log(`\n--- Probing ${label}: ${url} ---`);
  try {
    const res = await gotScraping({
      url,
      timeout: { request: 15000 },
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    console.log(`Status: ${res.statusCode}`);
    console.log(`Content-Type: ${res.headers["content-type"]}`);
    console.log(`Body length: ${res.body.length} bytes`);
    return {
      status: res.statusCode,
      headers: res.headers,
      body: res.body,
    };
  } catch (err: any) {
    console.log(`Error probing ${label}: ${err.message}`);
    return {
      status: err.response?.statusCode || 0,
      error: err.message,
      body: err.response?.body || "",
    };
  }
}

async function run() {
  const outDir = path.join(process.cwd(), "scripts", "spikes", "085S", "out");
  fs.mkdirSync(outDir, { recursive: true });

  const targets = [
    { label: "prs_robots", url: "https://prsindia.org/robots.txt" },
    { label: "prs_billtrack", url: "https://prsindia.org/billtrack" },
    { label: "sansad_robots", url: "https://sansad.in/robots.txt" },
    { label: "sansad_home", url: "https://sansad.in" },
    { label: "egazette_robots", url: "https://egazette.gov.in/robots.txt" },
    { label: "egazette_home", url: "https://egazette.gov.in" },
    { label: "indiacode_robots", url: "https://www.indiacode.nic.in/robots.txt" },
    { label: "indiacode_home", url: "https://www.indiacode.nic.in" },
    { label: "rbi_robots", url: "https://www.rbi.org.in/robots.txt" },
    { label: "rbi_notifications", url: "https://www.rbi.org.in/Scripts/NotificationUser.aspx" },
  ];

  const results: Record<string, any> = {};

  for (const t of targets) {
    const res = await probeUrl(t.url, t.label);
    results[t.label] = {
      status: res.status,
      bodyPreview: (res.body || "").slice(0, 1000),
      bodyLen: (res.body || "").length,
    };
    fs.writeFileSync(path.join(outDir, `${t.label}.txt`), res.body || "", "utf-8");
    // Respect politeness: wait 5s before next request
    await delay(5000);
  }

  fs.writeFileSync(
    path.join(outDir, "summary.json"),
    JSON.stringify(results, null, 2),
    "utf-8"
  );
  console.log("\nProbe complete. Summaries saved in scripts/spikes/085S/out/");
}

run().catch(console.error);
