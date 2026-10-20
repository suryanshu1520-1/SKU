import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { normUnicode } from "../../../server-lib/text/normalize.ts";
import {
  deriveMinistry,
  deriveMinistryDetailed,
  type PibMinistryEntry,
} from "../../../server-lib/cron/ingest/classify.ts";

test("normUnicode: preserves Devanagari matras and virama while stripping ZWJ/ZWNJ", () => {
  const withZWJ = "वाणिज्\u200Dय एवं उद्योग मंत्रालय";
  const withoutZWJ = "वाणिज्य एवं उद्योग मंत्रालय";

  const norm1 = normUnicode(withZWJ);
  const norm2 = normUnicode(withoutZWJ);

  // ZWJ variant matches regular form
  assert.equal(norm1, norm2);

  // Retains matra 'ा' (\u093E) and virama '्' (\u094D)
  assert.ok(norm1.includes("ा"), "Should retain Devanagari matra");
  assert.ok(norm1.includes("्"), "Should retain Devanagari virama");

  // Does not retain ZWJ (\u200D) or ZWNJ (\u200C)
  assert.ok(!norm1.includes("\u200D"), "Should strip ZWJ");
  assert.ok(!norm1.includes("\u200C"), "Should strip ZWNJ");
});

test("normUnicode: normalizes English with punctuation and extra spaces", () => {
  const res = normUnicode("Ministry of Commerce & Industry");
  assert.equal(res, "ministry of commerce industry");
});

test("deriveMinistryDetailed: maps >= 10 Hindi ministry headings to correct slugs", () => {
  const cases: Array<{ heading: string; expectedSlug: string; expectedEn: string }> = [
    {
      heading: "वाणिज्‍य एवं उद्योग मंत्रालय",
      expectedSlug: "ENT_MOCI",
      expectedEn: "Ministry of Commerce & Industry",
    },
    {
      heading: "वित्‍त मंत्रालय",
      expectedSlug: "ENT_MOF",
      expectedEn: "Ministry of Finance",
    },
    {
      heading: "गृह मंत्रालय",
      expectedSlug: "ENT_MHA",
      expectedEn: "Ministry of Home Affairs",
    },
    {
      heading: "रक्षा मंत्रालय",
      expectedSlug: "ENT_MOD",
      expectedEn: "Ministry of Defence",
    },
    {
      heading: "स्वास्थ्य एवं परिवार कल्याण मंत्रालय",
      expectedSlug: "ENT_MOHFW",
      expectedEn: "Ministry of Health and Family Welfare",
    },
    {
      heading: "पर्यावरण, वन एवं जलवायु परिवर्तन मंत्रालय",
      expectedSlug: "ENT_MOEFCC",
      expectedEn: "Ministry of Environment, Forest and Climate Change",
    },
    {
      heading: "विद्युत मंत्रालय",
      expectedSlug: "ENT_POWER",
      expectedEn: "Ministry of Power",
    },
    {
      heading: "इलेक्ट्रॉनिक्स और सूचना प्रौद्योगिकी मंत्रालय",
      expectedSlug: "ENT_MEITY",
      expectedEn: "Ministry of Electronics & IT",
    },
    {
      heading: "कृषि एवं किसान कल्याण मंत्रालय",
      expectedSlug: "ENT_MOAFW",
      expectedEn: "Ministry of Agriculture & Farmers Welfare",
    },
    {
      heading: "विदेश मंत्रालय",
      expectedSlug: "ENT_MEA",
      expectedEn: "Ministry of External Affairs",
    },
  ];

  assert.ok(cases.length >= 10, "Must test at least 10 Hindi ministries");

  for (const c of cases) {
    const res = deriveMinistryDetailed("Some generic body text", "Government of India", c.heading);
    assert.equal(res.ministry_source, "pib_heading", `Source should be pib_heading for ${c.heading}`);
    assert.equal(res.slug, c.expectedSlug, `Slug mismatch for ${c.heading}`);
    assert.equal(res.ministry, c.expectedEn, `Ministry mismatch for ${c.heading}`);

    // Wrapper function test
    const wrapperRes = deriveMinistry("Some generic body text", "Government of India", c.heading);
    assert.equal(wrapperRes, c.expectedEn);
  }
});

test("deriveMinistryDetailed: PRID 2325286 fixture yields pib_heading for Commerce & Industry", () => {
  const fixturePath = path.join(process.cwd(), "scripts", "tests", "fixtures", "pib", "2325286.html");
  assert.ok(fs.existsSync(fixturePath), `Fixture must exist at ${fixturePath}`);

  const html = fs.readFileSync(fixturePath, "utf-8");
  const $ = cheerio.load(html);
  const heading = $("#MinistryName, .MinistryNameSubhead").first().text().trim();

  assert.ok(heading.length > 0, "Heading must be extracted from fixture");
  assert.ok(heading.includes("वाणिज"), `Heading was: ${heading}`);

  const res = deriveMinistryDetailed("Body text without english clues", "Government of India", heading);
  assert.equal(res.ministry_source, "pib_heading");
  assert.equal(res.ministry, "Ministry of Commerce & Industry");
  assert.equal(res.slug, "ENT_MOCI");
});

test("deriveMinistryDetailed: matches Hindi alias in the first 200 chars of body", () => {
  const hindiBody = "विद्युत मंत्रालय ने आज ऊर्जा क्षेत्र में नई सुधार नीति की घोषणा की। इस नीति के तहत सभी राज्यों को लाभ मिलेगा।";
  const res = deriveMinistryDetailed(hindiBody, "Government of India", null);
  assert.equal(res.ministry_source, "hi_alias");
  assert.equal(res.ministry, "Ministry of Power");
  assert.equal(res.slug, "ENT_POWER");
});

test("deriveMinistryDetailed: matches English aliases and canonical entities", () => {
  const enBody = "The Ministry of Finance announced revised fiscal deficit targets for the current quarter.";
  const res = deriveMinistryDetailed(enBody, "Government of India", null);
  assert.equal(res.ministry_source, "en_alias");
  assert.equal(res.ministry, "Ministry of Finance");
  assert.equal(res.slug, "ENT_MOF");
});

test("deriveMinistryDetailed: falls back when no alias matches", () => {
  const genericBody = "A local weather report for northern plains during the winter harvest season.";
  const res = deriveMinistryDetailed(genericBody, "Government of India", null);
  assert.equal(res.ministry_source, "fallback");
  assert.equal(res.ministry, "Government of India");
});

test("pib-ministries.json: contains >= 50 entries and all have valid source_url", () => {
  const dataPath = path.join(process.cwd(), "server-lib", "cron", "ingest", "data", "pib-ministries.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  const entries: PibMinistryEntry[] = JSON.parse(raw);

  assert.ok(entries.length >= 50, `Expected >= 50 entries, got ${entries.length}`);

  for (const entry of entries) {
    assert.ok(entry.slug && entry.slug.startsWith("ENT_"), `Entry missing valid slug: ${JSON.stringify(entry)}`);
    assert.ok(entry.en && entry.en.length > 0, `Entry missing en name: ${JSON.stringify(entry)}`);
    assert.ok(Array.isArray(entry.hi) && entry.hi.length > 0, `Entry missing hi array: ${JSON.stringify(entry)}`);
    assert.ok(entry.source_url && entry.source_url.startsWith("https://pib.gov.in/"), `Entry invalid source_url: ${JSON.stringify(entry)}`);
  }
});
