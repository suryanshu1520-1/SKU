/**
 * scripts/spikes/085S/parse-samples.ts
 *
 * Extracts 5 structured sample records for PRS, RBI, and eGazette from probed HTML.
 * Generates docs/radar/primary-law-sources.samples.json.
 */

import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const outDir = path.join(process.cwd(), "scripts", "spikes", "085S", "out");
const docsDir = path.join(process.cwd(), "docs", "radar");
fs.mkdirSync(docsDir, { recursive: true });

interface ParsedRecord {
  title: string;
  date: string;
  instrument_class: string;
  issuing_authority: string;
  stable_url: string;
  identifier: string;
}

interface SourceSamples {
  source_name: string;
  source_url: string;
  extraction_method: {
    container_selector: string;
    field_selectors: Record<string, string>;
  };
  sample_count: number;
  records: ParsedRecord[];
}

function parsePRS(): SourceSamples {
  const html = fs.readFileSync(path.join(outDir, "prs_billtrack.txt"), "utf-8");
  const $ = cheerio.load(html);

  const rawBills: { title: string; href: string; status: string }[] = [];
  $("table tr, .views-row").each((_, el) => {
    const link = $(el).find("a[href*='/billtrack/']").first();
    const title = link.text().trim();
    const href = link.attr("href");
    if (!title || !href || href === "/billtrack") return;

    const rowText = $(el).text().replace(/\s+/g, " ").trim();
    const statusMatch = rowText.match(/(Passed|Rules|Introduced|In Committee|Withdrawn|Pending)/i);
    const status = statusMatch ? statusMatch[1] : "Tracked";

    rawBills.push({
      title,
      href: href.startsWith("http") ? href : `https://prsindia.org${href}`,
      status
    });
  });

  const records: ParsedRecord[] = rawBills.slice(0, 5).map((b) => {
    const slug = b.href.split("/billtrack/")[1] || "";
    let instrumentClass = "bill_passed";
    if (b.status.toLowerCase() === "rules") instrumentClass = "rules_notified";
    else if (b.status.toLowerCase() === "introduced") instrumentClass = "bill_introduced";

    return {
      title: b.title,
      date: "2026", // Detailed date sits on bill detail page
      instrument_class: instrumentClass,
      issuing_authority: "Parliament of India",
      stable_url: b.href,
      identifier: slug,
    };
  });

  return {
    source_name: "PRS Legislative Research (Bill Track)",
    source_url: "https://prsindia.org/billtrack",
    extraction_method: {
      container_selector: "table tr, .views-row",
      field_selectors: {
        title: "a[href*='/billtrack/']",
        stable_url: "a[href*='/billtrack/'] (href attribute)",
        status: "Regex /(Passed|Rules|Introduced|In Committee)/ on container text",
        identifier: "Slug derived from URL path /billtrack/<slug>",
      },
    },
    sample_count: records.length,
    records,
  };
}

function parseRBI(): SourceSamples {
  const html = fs.readFileSync(path.join(outDir, "rbi_notifications.txt"), "utf-8");
  const $ = cheerio.load(html);

  const records: ParsedRecord[] = [];
  let currentDate = "Oct 2026";

  $("table.tablebg tr, table tr").each((_, tr) => {
    const text = $(tr).text().replace(/\s+/g, " ").trim();
    const dateMatch = text.match(/([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/);
    if (dateMatch) {
      currentDate = dateMatch[1];
    }

    const link = $(tr).find("a[href*='NotificationUser.aspx?Id=']").first();
    if (link.length > 0 && records.length < 5) {
      const title = link.text().trim();
      const href = link.attr("href") || "";
      const idMatch = href.match(/Id=(\d+)/);
      const notifId = idMatch ? idMatch[1] : "";

      records.push({
        title,
        date: currentDate,
        instrument_class: "regulation_issued",
        issuing_authority: "Reserve Bank of India",
        stable_url: `https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=${notifId}&Mode=0`,
        identifier: `RBI-NOTIF-${notifId}`,
      });
    }
  });

  return {
    source_name: "Reserve Bank of India (Notifications)",
    source_url: "https://www.rbi.org.in/Scripts/NotificationUser.aspx",
    extraction_method: {
      container_selector: "table.tablebg tr",
      field_selectors: {
        title: "a[href*='NotificationUser.aspx?Id=']",
        date: "Previous section header or tr text matching /([A-Z][a-z]{2}\\s+\\d{1,2},\\s+\\d{4})/",
        stable_url: "a (href with Id query param)",
        identifier: "Regex /Id=(\\d+)/ on link href",
      },
    },
    sample_count: records.length,
    records,
  };
}

function parseEGazette(): SourceSamples {
  const html = fs.readFileSync(path.join(outDir, "egazette_home.txt"), "utf-8");
  const $ = cheerio.load(html);

  const records: ParsedRecord[] = [];
  const seenIds = new Set<string>();

  $("table tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length >= 4 && records.length < 5) {
      const colTexts = tds.map((_, td) => $(td).text().trim().replace(/\s+/g, " ")).get();
      // Check if this row is an Extra-Ordinary or Weekly Gazette item
      // Structure: [Ministry, Subject, Publish Date, Gazette ID, Download Size]
      const ugidIndex = colTexts.findIndex((t) => /^CG-[A-Z]{2}-[EW]-\d{8}-\d+$/.test(t));
      if (ugidIndex >= 0) {
        const ugid = colTexts[ugidIndex];
        if (!seenIds.has(ugid)) {
          seenIds.add(ugid);
          const date = colTexts[ugidIndex - 1] || "";
          const subject = colTexts[ugidIndex - 2] || "";
          const ministry = colTexts[ugidIndex - 3] || "Government of India";

          records.push({
            title: subject,
            date,
            instrument_class: ugid.includes("-E-") ? "rules_notified" : "rules_notified",
            issuing_authority: ministry,
            stable_url: `https://egazette.gov.in/ (UGID: ${ugid})`,
            identifier: ugid,
          });
        }
      }
    }
  });


  return {
    source_name: "e-Gazette of India (Recent Gazettes)",
    source_url: "https://egazette.gov.in",
    extraction_method: {
      container_selector: "table tr with >= 4 td elements",
      field_selectors: {
        identifier: "td text matching /^CG-[A-Z]{2}-[EW]-\\d{8}-\\d+$/",
        date: "td preceding identifier (DD-MMM-YYYY)",
        title: "td preceding date (Gazette subject summary)",
        issuing_authority: "td preceding subject (Ministry name)",
        stable_url: "Direct UGID reference (PDF postback endpoint)",
      },
    },
    sample_count: records.length,
    records,
  };
}

const prsData = parsePRS();
const rbiData = parseRBI();
const egazetteData = parseEGazette();

const output = {
  schema_version: "1.0.0",
  generated_at: new Date().toISOString(),
  target_mapping_classes: [
    "bill_introduced",
    "bill_passed",
    "act_assented",
    "rules_notified",
    "regulation_issued",
    "commencement_or_entry_into_force"
  ],
  sources: {
    prs_legislative_research: prsData,
    reserve_bank_of_india: rbiData,
    egazette_of_india: egazetteData,
  },
  unparsed_sources: {
    sansad_in: {
      status: "UNPARSED_AT_HTTP_LAYER",
      reason: "Client-side rendered Next.js SPA with empty table placeholder in static HTML; requires headless browser or reverse-engineered internal REST API."
    },
    indiacode_nic_in: {
      status: "UNPARSED_AT_HTTP_LAYER",
      reason: "Legacy domain indiacode.nic.in redirects to indiacode.gov.in; new domain is an Angular SPA on DSpace 7 (<ds-app></ds-app>) with anti-scraping key-blocks; requires headless browser or DSpace REST API access."
    }
  }
};

const targetPath = path.join(docsDir, "primary-law-sources.samples.json");
fs.writeFileSync(targetPath, JSON.stringify(output, null, 2), "utf-8");
console.log(`Saved sample records to: ${targetPath}`);
console.log(`PRS count: ${prsData.records.length}, RBI count: ${rbiData.records.length}, eGazette count: ${egazetteData.records.length}`);
