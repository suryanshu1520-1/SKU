import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import {
  assertRunDirSafe,
  ensureLayout,
  getRunDir,
  writeJsonAtomic,
} from './run-dir.js';
import { politeFetch, robotsAllowed } from './http.js';
import type { PaperKind } from '../../../server-lib/qbank/types.js';

export interface CensusRow {
  document_id: string;
  publisher: 'visionias' | 'rau';
  stage: 'Prelims' | 'Mains';
  year: number;
  paper: PaperKind;
  role: 'solution' | 'paper';
  language: 'en' | 'hi' | 'bi';
  title: string;
  listing_url: string;
  landing_url: string;
  pdf_url?: string;
  landing_snapshot_sha256?: string;
  robots_ok: boolean;
  skip_reason?: string;
}

export interface CensusCounts {
  total: number;
  visionias_total: number;
  visionias_english_prelims: number;
  visionias_english_prelims_gs1: number;
  visionias_english_prelims_gs2: number;
  visionias_english_mains: number;
  visionias_hindi: number;
  raus_total: number;
  raus_mains: number;
}

export interface CensusReport {
  counts: CensusCounts;
  extras: CensusRow[];
  errors: string[];
}

export interface CensusOptions {
  runDir?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const VISIONIAS_LISTING_URL = 'https://www.visionias.in/resources/upsc-paper-solution/';
const RAU_LISTING_URL = 'https://compass.rauias.com/upsc-mains/10-years-paper/';

export function parseVisionCard(
  cardText: string,
  type: string,
  cardEl?: cheerio.Cheerio<cheerio.AnyNode>
): {
  year: number;
  lang: 'en' | 'hi';
  stage: 'Prelims' | 'Mains';
  paper: PaperKind;
  title: string;
} {
  const lines = cardText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let title = lines[0] || '';
  if ((!title || lines.length <= 1) && cardEl) {
    const heading = cardEl.find('h1, h2, h3, h4, h5, h6, .title').first();
    if (heading.length && heading.text().trim()) {
      title = heading.text().trim();
    }
  }

  const yearMatch = cardText.match(/Year\s*(\d{4})/);
  if (!yearMatch) {
    throw new Error(`Could not find year in card: ${cardText.slice(0, 100)}`);
  }
  const year = Number(yearMatch[1]);

  let lang: 'en' | 'hi';
  if (/HINDI/i.test(cardText)) {
    lang = 'hi';
  } else if (/ENGLISH/i.test(cardText)) {
    lang = 'en';
  } else {
    throw new Error(`Could not find ENGLISH/HINDI language in card: ${cardText.slice(0, 100)}`);
  }

  let stage: 'Prelims' | 'Mains';
  if (type === 'prelims_sol') {
    stage = 'Prelims';
    if (!/prelims/i.test(cardText)) {
      throw new Error(`type prelims_sol does not agree with card text: ${cardText.slice(0, 100)}`);
    }
  } else if (type === 'mains_sol') {
    stage = 'Mains';
    if (!/mains/i.test(cardText)) {
      throw new Error(`type mains_sol does not agree with card text: ${cardText.slice(0, 100)}`);
    }
  } else {
    throw new Error(`Unknown type ${type}`);
  }

  let paper: PaperKind;
  if (stage === 'Prelims') {
    if (/CSAT|Paper\s*II\b/i.test(cardText)) {
      paper = 'GS-2';
    } else if (/GS|General Studies/i.test(cardText)) {
      paper = 'GS-1';
    } else {
      throw new Error(`Could not determine Prelims paper kind from card: ${cardText.slice(0, 100)}`);
    }
  } else {
    if (/Essay/i.test(cardText)) {
      paper = 'Essay';
    } else if (/GS\s*Paper\s*IV\b/i.test(cardText)) {
      paper = 'GS-M4';
    } else if (/GS\s*Paper\s*III\b/i.test(cardText)) {
      paper = 'GS-M3';
    } else if (/GS\s*Paper\s*II\b/i.test(cardText)) {
      paper = 'GS-M2';
    } else if (/GS\s*Paper\s*I\b/i.test(cardText)) {
      paper = 'GS-M1';
    } else {
      throw new Error(`Could not determine Mains paper kind from card: ${cardText.slice(0, 100)}`);
    }
  }

  return { year, lang, stage, paper, title };
}

export function extractVisionPdfUrl(htmlText: string): string {
  const lines = htmlText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;
    const m = trimmed.match(/^const\s+pdfPath\s*=\s*'([^']+\.pdf)'/);
    if (m) {
      const url = m[1];
      if (!url.startsWith('https://cdn.visionias.in/')) {
        throw new Error(`PDF URL does not start with https://cdn.visionias.in/: ${url}`);
      }
      return url;
    }
  }
  throw new Error('Could not find active const pdfPath line in HTML');
}

export function classifyRauPaper(filename: string): PaperKind {
  if (/ess?a?y|eassy/i.test(filename)) {
    return 'Essay';
  }
  if (/(?:GS|paper)[-_ ]?(IV|4)(?:\b|_)/i.test(filename)) {
    return 'GS-M4';
  }
  if (/(?:GS|paper)[-_ ]?(III|3)(?:\b|_)/i.test(filename)) {
    return 'GS-M3';
  }
  if (/(?:GS|paper)[-_ ]?(II|2)(?:\b|_)/i.test(filename)) {
    return 'GS-M2';
  }
  if (/(?:GS|paper)[-_ ]?(I|1)(?:\b|_)/i.test(filename)) {
    return 'GS-M1';
  }
  throw new Error(`Could not classify paper from Rau filename: ${filename}`);
}

export async function runCensus(options?: CensusOptions): Promise<CensusReport> {
  const runDir = options?.runDir || getRunDir();
  assertRunDirSafe(runDir);
  ensureLayout(runDir);

  const censusJsonPath = path.join(runDir, 'manifest', 'census.json');
  let generated_at = new Date().toISOString();
  const existingRowsMap = new Map<string, CensusRow>();

  if (fs.existsSync(censusJsonPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(censusJsonPath, 'utf-8'));
      if (existing?.generated_at) {
        generated_at = existing.generated_at;
      }
      if (Array.isArray(existing?.rows)) {
        for (const row of existing.rows) {
          if (row.document_id) {
            existingRowsMap.set(row.document_id, row);
          }
        }
      }
    } catch {
      // ignore read error
    }
  }

  const rows: CensusRow[] = [];
  const errors: string[] = [];

  // 1. VisionIAS listing
  console.log(`[census] Fetching VisionIAS listing: ${VISIONIAS_LISTING_URL}`);
  const visionListingRes = await politeFetch(VISIONIAS_LISTING_URL, {
    fetchImpl: options?.fetchImpl,
    sleep: options?.sleep,
    now: options?.now,
    runDir,
  });

  if (visionListingRes.status !== 200) {
    throw new Error(`Failed to fetch VisionIAS listing: status ${visionListingRes.status}`);
  }

  const visionListingSha = crypto
    .createHash('sha256')
    .update(visionListingRes.body)
    .digest('hex');
  const visionListingFile = path.join(runDir, 'sources', 'html', `${visionListingSha}.html`);
  if (!fs.existsSync(visionListingFile)) {
    fs.writeFileSync(visionListingFile, visionListingRes.body);
  }

  const $vision = cheerio.load(visionListingRes.body.toString('utf-8'));
  const visionLinks = $vision('a[href*="/resources/material"]');

  for (let i = 0; i < visionLinks.length; i++) {
    const el = visionLinks[i];
    const href = $vision(el).attr('href') || '';
    const hrefUrl = new URL(href, 'https://www.visionias.in');
    const id = hrefUrl.searchParams.get('id');
    const type = hrefUrl.searchParams.get('type');

    if (!id || !type) {
      errors.push(`Missing id or type in link: ${href}`);
      continue;
    }

    let cardEl = $vision(el).parent();
    while (cardEl.length && !/Year\s*\d{4}/.test(cardEl.text())) {
      cardEl = cardEl.parent();
    }
    if (!cardEl.length) {
      errors.push(`No card found for link: ${href}`);
      continue;
    }

    let parsedCard;
    try {
      parsedCard = parseVisionCard(cardEl.text(), type, cardEl);
    } catch (err: any) {
      errors.push(`Failed to parse VisionIAS card for ${href}: ${err.message}`);
      continue;
    }

    const { year, lang, stage, paper, title } = parsedCard;
    const role: 'solution' | 'paper' = stage === 'Prelims' ? 'solution' : 'paper';
    const document_id = `visionias:${year}-${paper}:${role}:${lang}`;
    const landing_url = `https://www.visionias.in/resources/material/?id=${id}&type=${type}`;

    if (lang === 'hi') {
      const robots_ok = await robotsAllowed(landing_url, {
        runDir,
        fetchImpl: options?.fetchImpl,
        sleep: options?.sleep,
        now: options?.now,
      });

      rows.push({
        document_id,
        publisher: 'visionias',
        stage,
        year,
        paper,
        role,
        language: 'hi',
        title,
        listing_url: VISIONIAS_LISTING_URL,
        landing_url,
        robots_ok,
        skip_reason: 'hindi_out_of_scope',
      });
      continue;
    }

    // English row -> fetch landing page
    console.log(`[census] Fetching VisionIAS landing (${i + 1}/${visionLinks.length}): ${landing_url}`);
    let landingHtml = '';
    let landingSha256 = '';

    const existingRow = existingRowsMap.get(document_id);
    const cachedFile = existingRow?.landing_snapshot_sha256
      ? path.join(runDir, 'sources', 'html', `${existingRow.landing_snapshot_sha256}.html`)
      : null;

    if (cachedFile && fs.existsSync(cachedFile)) {
      landingHtml = fs.readFileSync(cachedFile, 'utf-8');
      landingSha256 = existingRow!.landing_snapshot_sha256!;
    } else {
      const landingRes = await politeFetch(landing_url, {
        fetchImpl: options?.fetchImpl,
        sleep: options?.sleep,
        now: options?.now,
        runDir,
      });

      if (landingRes.status !== 200) {
        errors.push(`Failed to fetch landing page ${landing_url}: status ${landingRes.status}`);
        continue;
      }

      landingSha256 = crypto
        .createHash('sha256')
        .update(landingRes.body)
        .digest('hex');
      const landingFile = path.join(runDir, 'sources', 'html', `${landingSha256}.html`);
      if (!fs.existsSync(landingFile)) {
        fs.writeFileSync(landingFile, landingRes.body);
      }
      landingHtml = landingRes.body.toString('utf-8');
    }

    let pdf_url: string;
    try {
      pdf_url = extractVisionPdfUrl(landingHtml);
    } catch (err: any) {
      errors.push(`Failed to extract pdf_url for ${document_id}: ${err.message}`);
      continue;
    }

    const robots_ok = await robotsAllowed(pdf_url, {
      runDir,
      fetchImpl: options?.fetchImpl,
      sleep: options?.sleep,
      now: options?.now,
    });

    rows.push({
      document_id,
      publisher: 'visionias',
      stage,
      year,
      paper,
      role,
      language: 'en',
      title,
      listing_url: VISIONIAS_LISTING_URL,
      landing_url,
      pdf_url,
      landing_snapshot_sha256: landingSha256,
      robots_ok,
    });
  }

  // 2. Rau's listing
  console.log(`[census] Fetching Rau's listing: ${RAU_LISTING_URL}`);
  const rauListingRes = await politeFetch(RAU_LISTING_URL, {
    fetchImpl: options?.fetchImpl,
    sleep: options?.sleep,
    now: options?.now,
    runDir,
  });

  if (rauListingRes.status !== 200) {
    throw new Error(`Failed to fetch Rau's listing: status ${rauListingRes.status}`);
  }

  const rauListingSha = crypto
    .createHash('sha256')
    .update(rauListingRes.body)
    .digest('hex');
  const rauListingFile = path.join(runDir, 'sources', 'html', `${rauListingSha}.html`);
  if (!fs.existsSync(rauListingFile)) {
    fs.writeFileSync(rauListingFile, rauListingRes.body);
  }

  const $rau = cheerio.load(rauListingRes.body.toString('utf-8'));
  let currentRauYear: number | null = null;

  const rauElements = $rau('h2, a');
  for (let i = 0; i < rauElements.length; i++) {
    const el = rauElements[i];
    const tagName = (el as any).tagName
      ? (el as any).tagName.toLowerCase()
      : (el as any).name?.toLowerCase() || '';

    if (tagName === 'h2') {
      const text = $rau(el).text();
      const m = text.match(/UPSC Mains (\d{4})/);
      if (m) {
        currentRauYear = Number(m[1]);
      }
    } else if (tagName === 'a') {
      const href = $rau(el).attr('href') || '';
      if (href.endsWith('.pdf') && href.includes('/wp-content/uploads/')) {
        if (!currentRauYear) {
          errors.push(`Rau link encountered before any UPSC Mains YYYY heading: ${href}`);
          continue;
        }

        const filename = href.split('/').pop() || '';
        let paper: PaperKind;
        try {
          paper = classifyRauPaper(filename);
        } catch (err: any) {
          errors.push(`Failed to classify Rau paper for ${filename}: ${err.message}`);
          continue;
        }

        const document_id = `rau:${currentRauYear}-${paper}:paper:bi`;
        const title = $rau(el).text().trim() || `UPSC Mains ${currentRauYear} ${paper}`;

        const robots_ok = await robotsAllowed(href, {
          runDir,
          fetchImpl: options?.fetchImpl,
          sleep: options?.sleep,
          now: options?.now,
        });

        rows.push({
          document_id,
          publisher: 'rau',
          stage: 'Mains',
          year: currentRauYear,
          paper,
          role: 'paper',
          language: 'bi',
          title,
          listing_url: RAU_LISTING_URL,
          landing_url: RAU_LISTING_URL,
          pdf_url: href,
          landing_snapshot_sha256: rauListingSha,
          robots_ok,
        });
      }
    }
  }

  // 3. Sorting & Deduplication
  rows.sort((a, b) => a.document_id.localeCompare(b.document_id));

  const seenIds = new Set<string>();
  const duplicates: string[] = [];
  for (const r of rows) {
    if (seenIds.has(r.document_id)) {
      duplicates.push(r.document_id);
    }
    seenIds.add(r.document_id);
  }
  if (duplicates.length > 0) {
    errors.push(`Duplicate document_ids found: ${duplicates.join(', ')}`);
  }

  // 4. Assertions & Classification
  // Expected VisionIAS:
  // - English Prelims GS-1: 2011..2026 (16 years)
  // - English Prelims GS-2: 2017, 2020..2026 (8 years)
  // - English Mains: 2024 Essay, GS-M1, GS-M2, GS-M3 (4 papers)
  // - Hindi rows: must have skip_reason
  // Expected Rau's:
  // - {2013..2025} x {Essay, GS-M1, GS-M2, GS-M3, GS-M4} (65 items)

  const extras: CensusRow[] = [];

  const expectedVisionGs1Years = new Set<number>();
  for (let y = 2011; y <= 2026; y++) expectedVisionGs1Years.add(y);

  const expectedVisionGs2Years = new Set<number>([2017, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);
  const expectedVisionMainsPapers = new Set<string>(['Essay', 'GS-M1', 'GS-M2', 'GS-M3']);

  const foundVisionGs1Years = new Set<number>();
  const foundVisionGs2Years = new Set<number>();
  const foundVisionMainsPapers = new Set<string>();

  const expectedRauPairs = new Set<string>();
  for (let y = 2013; y <= 2025; y++) {
    for (const p of ['Essay', 'GS-M1', 'GS-M2', 'GS-M3', 'GS-M4']) {
      expectedRauPairs.add(`${y}:${p}`);
    }
  }
  const foundRauPairs = new Set<string>();

  let countVisionTotal = 0;
  let countVisionEnPrelims = 0;
  let countVisionEnGs1 = 0;
  let countVisionEnGs2 = 0;
  let countVisionEnMains = 0;
  let countVisionHindi = 0;
  let countRauTotal = 0;
  let countRauMains = 0;

  for (const r of rows) {
    if (r.publisher === 'visionias') {
      countVisionTotal++;
      if (r.language === 'hi') {
        countVisionHindi++;
        if (!r.skip_reason) {
          errors.push(`Hindi row missing skip_reason: ${r.document_id}`);
        }
      } else if (r.stage === 'Prelims') {
        countVisionEnPrelims++;
        if (r.paper === 'GS-1') {
          countVisionEnGs1++;
          foundVisionGs1Years.add(r.year);
          if (!expectedVisionGs1Years.has(r.year)) {
            extras.push(r);
          }
        } else if (r.paper === 'GS-2') {
          countVisionEnGs2++;
          foundVisionGs2Years.add(r.year);
          if (!expectedVisionGs2Years.has(r.year)) {
            extras.push(r);
          }
        }
      } else if (r.stage === 'Mains') {
        countVisionEnMains++;
        if (r.year === 2024) {
          foundVisionMainsPapers.add(r.paper);
          if (!expectedVisionMainsPapers.has(r.paper)) {
            extras.push(r);
          }
        } else {
          extras.push(r);
        }
      }
    } else if (r.publisher === 'rau') {
      countRauTotal++;
      if (r.stage === 'Mains') {
        countRauMains++;
      }
      const pairKey = `${r.year}:${r.paper}`;
      foundRauPairs.add(pairKey);
      if (!expectedRauPairs.has(pairKey)) {
        extras.push(r);
      }
    }
  }

  // Check shortfalls
  for (const y of expectedVisionGs1Years) {
    if (!foundVisionGs1Years.has(y)) {
      errors.push(`VisionIAS GS-1 missing expected year ${y}`);
    }
  }
  for (const y of expectedVisionGs2Years) {
    if (!foundVisionGs2Years.has(y)) {
      errors.push(`VisionIAS GS-2 missing expected year ${y}`);
    }
  }
  for (const p of expectedVisionMainsPapers) {
    if (!foundVisionMainsPapers.has(p)) {
      errors.push(`VisionIAS Mains 2024 missing expected paper ${p}`);
    }
  }
  for (const pair of expectedRauPairs) {
    if (!foundRauPairs.has(pair)) {
      errors.push(`Rau Mains missing expected item ${pair}`);
    }
  }

  if (countVisionTotal < 32) {
    errors.push(`VisionIAS total count shortfall: got ${countVisionTotal}, expected 32`);
  }
  if (countRauTotal < 65) {
    errors.push(`Rau total count shortfall: got ${countRauTotal}, expected 65`);
  }

  const counts: CensusCounts = {
    total: rows.length,
    visionias_total: countVisionTotal,
    visionias_english_prelims: countVisionEnPrelims,
    visionias_english_prelims_gs1: countVisionEnGs1,
    visionias_english_prelims_gs2: countVisionEnGs2,
    visionias_english_mains: countVisionEnMains,
    visionias_hindi: countVisionHindi,
    raus_total: countRauTotal,
    raus_mains: countRauMains,
  };

  const report: CensusReport = {
    counts,
    extras,
    errors,
  };

  // Write outputs
  const censusPayload = {
    generated_at,
    rows,
  };
  writeJsonAtomic(censusJsonPath, censusPayload);

  const reportPath = path.join(runDir, 'reports', 'census.json');
  writeJsonAtomic(reportPath, report);

  return report;
}

// CLI entry point
const isMain =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
    fileURLToPath(import.meta.url) === path.resolve(process.argv[1] + '.ts') ||
    process.argv[1].endsWith('census.ts'));

if (isMain) {
  runCensus()
    .then((report) => {
      console.log('\n--- Census Completed ---');
      console.log(JSON.stringify(report, null, 2));
      if (report.errors.length > 0) {
        console.error(`\n[FATAL] Census finished with ${report.errors.length} errors.`);
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n[FATAL] Unhandled census error:', err);
      process.exit(1);
    });
}
