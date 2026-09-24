/**
 * Reconcile extracted paper + key pages into canonical QuestionRecords.
 *
 * Read-only w.r.t. sources and the master corpus. Writes only into the run's
 * canonical/, conflicts/, and reports/ directories.
 *
 * Usage:
 *   npx tsx scripts/qbank/reconcile-paper.ts --run <runDir> --year 2019 --paper GS-1 --series A
 */
import fs from 'fs';
import path from 'path';
import {
  buildCanonicalId,
  collectDiscrepancies,
  deriveEligibility,
  validateQuestionRecord,
} from '../../server-lib/qbank/validators.js';
import type {
  EvidenceRef,
  KeyAssertion,
  PaperManifest,
  QuestionRecord,
  SourceDocument,
} from '../../server-lib/qbank/types.js';

const DEVANAGARI = /[\u0900-\u097F]/;

function parseArgs(argv: string[]) {
  const get = (f: string) => {
    const i = argv.indexOf(f);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const run = get('--run');
  const year = get('--year');
  const paper = get('--paper');
  const series = get('--series');
  if (!run || !year || !paper || !series) {
    console.error('Missing --run, --year, --paper, or --series');
    process.exit(1);
  }
  return { run, year: parseInt(year, 10), paper, series: series.toUpperCase() };
}

function isHindi(text: string): boolean {
  return DEVANAGARI.test(text ?? '');
}

function loadReceipt(run: string, name: string): any {
  const p = path.join(run, `${name}-receipt.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function toSourceDocument(receipt: any, documentId: string, sourceStatus: SourceDocument['source_status']): SourceDocument {
  return {
    document_id: documentId,
    url: receipt.url || receipt.resolved_url,
    sha256: receipt.sha256,
    bytes: receipt.bytes,
    pages: receipt.pages,
    retrieved_at: receipt.retrieved_at,
    source_status: sourceStatus,
    chain_of_origin: receipt.source_status,
  };
}

function loadKeyMaps(run: string): { series: string; map: Map<number, string> }[] {
  const dir = path.join(run, 'extracted', 'key-mirror');
  const seriesList: { series: string; map: Map<number, string> }[] = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const map = new Map<number, string>();
    for (const a of d.parsed.answers ?? []) map.set(a.number, String(a.key).toUpperCase());
    seriesList.push({ series: String(d.parsed.series).toUpperCase(), map });
  }
  return seriesList;
}

function loadPaperQuestions(run: string): Map<number, { en?: any; hi?: any; enPage?: number; hiPage?: number }> {
  const dir = path.join(run, 'extracted', 'paper-mirror');
  const byQn = new Map<number, { en?: any; hi?: any; enPage?: number; hiPage?: number }>();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const pageNo = parseInt(f.match(/page_(\d+)\.json/)![1], 10);
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const q of d.parsed.questions ?? []) {
      const n = q.number;
      if (!Number.isInteger(n) || n < 1 || n > 200) continue;
      const entry = byQn.get(n) ?? {};
      if (isHindi(q.english ?? '')) {
        entry.hi = q;
        entry.hiPage = pageNo;
      } else {
        entry.en = q;
        entry.enPage = pageNo;
      }
      byQn.set(n, entry);
    }
  }
  return byQn;
}

function optionsArray(q: any): { key: 'a' | 'b' | 'c' | 'd'; text: string }[] {
  const out: { key: 'a' | 'b' | 'c' | 'd'; text: string }[] = [];
  for (const o of q.options ?? []) {
    const k = String(o.key).toLowerCase();
    if (['a', 'b', 'c', 'd'].includes(k)) out.push({ key: k as any, text: o.text ?? '' });
  }
  return out;
}

function buildRecord(
  qn: number,
  lang: 'en' | 'hi',
  q: any,
  pageNo: number,
  paperDoc: SourceDocument,
  keyDoc: SourceDocument,
  keyAssertion: KeyAssertion,
  year: number,
  paper: string,
  series: string,
): QuestionRecord {
  const evidence: EvidenceRef[] = [
    {
      source_document_id: paperDoc.document_id,
      source_url: paperDoc.url,
      sha256: paperDoc.sha256,
      retrieved_at: paperDoc.retrieved_at,
      page: pageNo,
      language: lang,
      extraction_method: 'vision-ocr-gemini-3.1-flash-lite',
      extraction_version: '1',
    },
  ];

  const key: KeyAssertion = { ...keyAssertion };
  if (key.source_ref) evidence.push(key.source_ref);

  const identity = {
    exam: 'UPSC_CSE' as const,
    stage: 'Prelims' as const,
    year,
    paper: paper as any,
    booklet_series: series as any,
    language: lang,
    question_number: qn,
  };

  const record: QuestionRecord = {
    canonical_id: buildCanonicalId(identity),
    identity,
    text: {
      stem: q.english ?? '',
      options: optionsArray(q),
      statements: null,
      passage: null,
    },
    key,
    explanation: { provenance: 'none', review_state: 'unreviewed' },
    classification: { review_state: 'unreviewed' },
    evidence,
    status: 'complete',
    discrepancies: [],
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  record.discrepancies = collectDiscrepancies(record);
  record.eligibility = deriveEligibility(record);
  return record;
}

async function main() {
  const { run, year, paper, series } = parseArgs(process.argv.slice(2));

  const paperReceipt = loadReceipt(run, 'paper-mirror');
  const keyReceipt = loadReceipt(run, 'key-mirror');
  const paperDoc = toSourceDocument(paperReceipt, 'paper-mirror-2019-gs1', 'secondary-hosted');
  const keyDoc = toSourceDocument(keyReceipt, 'key-mirror-2019-gs1', 'secondary-hosted');

  const keySeries = loadKeyMaps(run);
  const targetKey = keySeries.find((k) => k.series === series);
  if (!targetKey) {
    console.error(`Series ${series} not found in key pages. Found: ${keySeries.map((k) => k.series).join(', ')}`);
    process.exit(1);
  }

  const byQn = loadPaperQuestions(run);

  const keyEvidence: EvidenceRef = {
    source_document_id: keyDoc.document_id,
    source_url: keyDoc.url,
    sha256: keyDoc.sha256,
    retrieved_at: keyDoc.retrieved_at,
    page: 1,
    language: 'en',
    extraction_method: 'vision-ocr-gemini-3.1-flash-lite',
    extraction_version: '1',
  };

  const keyAssertion: KeyAssertion = {
    authority: 'secondary-claimed',
    source_ref: keyEvidence,
    paper_series_join:
      'Secondary-hosted scan of the UPSC 2019 GS-I answer key. forumias.com and lotusarise.com serve byte-identical copies (sha256 2e530aab...) — a SINGLE source, not independent corroboration. Series A verified against known Q1 answer (option d = correct). Official upsc.gov.in host fetch pending (HTTP 403).',
  };

  const enRecords: QuestionRecord[] = [];
  const hiRecords: QuestionRecord[] = [];
  const conflicts: any[] = [];
  const missing: number[] = [];

  for (let qn = 1; qn <= 100; qn++) {
    const entry = byQn.get(qn);
    if (!entry || !entry.en) {
      missing.push(qn);
      continue;
    }
    const keyLetter = targetKey.map.get(qn);
    if (!keyLetter) {
      conflicts.push({ question_number: qn, reason: 'key_missing_for_series', series });
      continue;
    }
    const ka: KeyAssertion = { ...keyAssertion, key: keyLetter.toLowerCase() as any };
    enRecords.push(buildRecord(qn, 'en', entry.en, entry.enPage!, paperDoc, keyDoc, ka, year, paper, series));
    if (entry.hi) {
      hiRecords.push(buildRecord(qn, 'hi', entry.hi, entry.hiPage!, paperDoc, keyDoc, ka, year, paper, series));
    }
  }

  // Detect anomalies: question numbers seen on multiple pages.
  const pageOfQn = new Map<number, Set<number>>();
  const dir = path.join(run, 'extracted', 'paper-mirror');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const pageNo = parseInt(f.match(/page_(\d+)\.json/)![1], 10);
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const q of d.parsed.questions ?? []) {
      if (!Number.isInteger(q.number) || q.number < 1 || q.number > 100) continue;
      const s = pageOfQn.get(q.number) ?? new Set<number>();
      s.add(pageNo);
      pageOfQn.set(q.number, s);
    }
  }
  for (const [qn, pages] of pageOfQn) {
    if (pages.size > 2) conflicts.push({ question_number: qn, reason: 'appears_on_many_pages', pages: [...pages] });
  }

  // Validate.
  const invalid = [...enRecords, ...hiRecords].filter((r) => !validateQuestionRecord(r).ok);

  const canonicalDir = path.join(run, 'canonical');
  const conflictsDir = path.join(run, 'conflicts');
  const reportsDir = path.join(run, 'reports');
  fs.mkdirSync(canonicalDir, { recursive: true });
  fs.mkdirSync(conflictsDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(path.join(canonicalDir, `2019_${paper.replace('-', '')}_en.json`), JSON.stringify(enRecords, null, 2));
  fs.writeFileSync(path.join(canonicalDir, `2019_${paper.replace('-', '')}_hi.json`), JSON.stringify(hiRecords, null, 2));
  fs.writeFileSync(path.join(conflictsDir, 'exceptions.json'), JSON.stringify({ missing, conflicts, invalid: invalid.map((r) => ({ id: r.canonical_id, errors: validateQuestionRecord(r).errors })) }, null, 2));

  const accounted = enRecords.map((r) => r.identity.question_number).sort((a, b) => a - b);
  const manifest: PaperManifest = {
    exam: 'UPSC_CSE',
    stage: 'Prelims',
    year,
    paper: paper as any,
    booklet_series: series as any,
    language: 'en',
    source_documents: [paperDoc],
    key_documents: [keyDoc],
    coverage: { expected: Array.from({ length: 100 }, (_, i) => i + 1), accounted, unresolved: missing },
    key_status: {
      official: 0,
      provisional: 0,
      secondary: accounted.length,
      unavailable: missing.length,
      withdrawn: 0,
    },
  };

  const report = {
    year,
    paper,
    series,
    expected_slots: 100,
    english_accounted: enRecords.length,
    hindi_accounted: hiRecords.length,
    missing_english: missing,
    key_authority: keyAssertion.authority,
    key_source: keyDoc.url,
    conflicts_count: conflicts.length,
    invalid_records: invalid.length,
    scored_count: enRecords.filter((r) => r.eligibility.scored).length,
    reference_only_count: enRecords.filter((r) => r.eligibility.reference_only).length,
    generated_at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(reportsDir, 'coverage.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(run, 'manifest.json'), JSON.stringify({ ...manifest, generated_at: report.generated_at }, null, 2));

  console.log(JSON.stringify(report, null, 2));
  if (conflicts.length) console.log('CONFLICTS:', JSON.stringify(conflicts, null, 2));
  if (invalid.length) console.log('INVALID RECORDS:', invalid.map((r) => r.canonical_id));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


