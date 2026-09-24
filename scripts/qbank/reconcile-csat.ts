/**
 * Reconcile the 2018 CSAT (GS-II) from NATIVE text extraction (no OCR).
 * The paper is a re-typeset source with diagrams embedded as images, so figures
 * and comprehension passages are flagged as unresolved, not fabricated.
 *
 * Usage:
 *   npx tsx scripts/qbank/reconcile-csat.ts --run <runDir>
 */
import fs from 'fs';
import path from 'path';
import {
  buildCanonicalId,
  collectDiscrepancies,
  deriveEligibility,
  validateQuestionRecord,
} from '../../server-lib/qbank/validators.js';
import type { EvidenceRef, KeyAssertion, QuestionRecord, SourceDocument } from '../../server-lib/qbank/types.js';

function loadJson(p: string): any {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function parseKeyPages(pages: any[]): Map<string, Map<number, string>> {
  const text = pages.map((p) => p.text).join('\n');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const seriesOrder = ['A', 'B', 'C', 'D'];
  const maps = new Map(seriesOrder.map((s) => [s, new Map<number, string>()]));

  // Find the header row that lists series.
  const headerIdx = lines.findIndex((l) => l === 'Q.No');
  if (headerIdx < 0) return maps;

  let i = headerIdx + 1;
  // The header is "Q.No / Series: A / Series: B / Series: C / Series: D". The
  // series labels may be split; skip until we hit the first numeric question.
  while (i < lines.length && !/^\d{1,3}$/.test(lines[i])) i++;

  while (i < lines.length) {
    const num = parseInt(lines[i], 10);
    if (!Number.isInteger(num)) { i++; continue; }
    const vals = lines.slice(i + 1, i + 5).map((l) => l.replace(/\s+/g, ' ').trim());
    seriesOrder.forEach((s, idx) => {
      const v = vals[idx] ?? '';
      const m = v.match(/^[A-D](?:\s*OR\s*[A-D])?$/);
      maps.get(s)!.set(num, m ? v : v.split(/\s/)[0]);
    });
    i += 5;
  }
  return maps;
}

function parsePaper(pages: any[]): { qn: number; stem: string; options: { key: string; text: string }[]; marks: string; page: number }[] {
  const out: any[] = [];
  for (const p of pages) {
    const text = p.text;
    // Each question: "N. <stem> ... a. <opt> b. <opt> c. <opt> d. <opt> (+x, -y)"
    const re = /^(\d{1,3})\.\s+([\s\S]*?)(?=^\d{1,3}\.\s+|\z)/gm;
    let m;
    while ((m = re.exec(text)) !== null) {
      const qn = parseInt(m[1], 10);
      if (qn < 1 || qn > 80) continue;
      const body = m[2];
      const optRe = /^([a-d])\.\s+([\s\S]*?)(?=^[a-d]\.\s|^\(\+|^\(\s*\+|\z)/gm;
      const options: { key: string; text: string }[] = [];
      let stem = body;
      let om;
      const optChunks: { key: string; text: string }[] = [];
      while ((om = optRe.exec(body)) !== null) {
        optChunks.push({ key: om[1].toLowerCase(), text: om[2].trim() });
      }
      if (optChunks.length) {
        const firstOptIdx = body.search(/^[a-d]\.\s/m);
        stem = firstOptIdx >= 0 ? body.slice(0, firstOptIdx).trim() : body.trim();
        options.push(...optChunks);
      } else {
        stem = body.trim();
      }
      const marksM = body.match(/\(?\s*\+([\d.]+)\s*,\s*-([\d.]+)\s*\)?/);
      out.push({ qn, stem: stem.trim(), options, marks: marksM ? `+${marksM[1]}, -${marksM[2]}` : '', page: p.page });
    }
  }
  // Deduplicate by question number (keep first occurrence).
  const seen = new Map<number, any>();
  for (const q of out) if (!seen.has(q.qn)) seen.set(q.qn, q);
  return [...seen.values()].sort((a, b) => a.qn - b.qn);
}

function main() {
  const runIdx = process.argv.indexOf('--run');
  const run = runIdx >= 0 ? process.argv[runIdx + 1] : process.argv[2];

  const keyPages = loadJson(path.join(run, 'extracted', 'key', 'pages.json'));
  const paperPages = loadJson(path.join(run, 'extracted', 'paper', 'pages.json'));

  const keyMaps = parseKeyPages(keyPages);
  const questions = parsePaper(paperPages);

  const seriesKeys = Object.fromEntries([...keyMaps.entries()].map(([s, m]) => [s, m]));
  const seriesList = Object.keys(seriesKeys).sort();

  // Source documents (re-typeset secondary source; figures are images).
  const paperReceipt = {
    url: 'https://cdn-images.prepp.in/public/image/UPSC_CSE_Prelims_Paper_2_CSAT_Question_Paper_June_03_2018__1f9299b2ccfca891be4ec980aaafd72f.pdf',
    sha256: 'c53ee2d92a470bad18d3b30db8312aa0b76e28c08f577b84ed8034f0ac038b2f',
    bytes: 5555879, pages: 137, retrieved_at: new Date().toISOString(),
  };
  const keyReceipt = {
    url: 'https://www.iasmind.com/wp-content/uploads/2018/06/UPSC-CSAT-2018-ANSWER-KEY.pdf',
    sha256: '5ed6b9f081e43ff37c69e45e808fd246a8715f2e4052886cf0538d12225a1cf7',
    bytes: 50207, pages: 4, retrieved_at: new Date().toISOString(),
  };
  const paperDoc: SourceDocument = { document_id: 'csat-2018-paper', ...paperReceipt, source_status: 'secondary-hosted', chain_of_origin: 're-typeset (prepp.in), not an official scan' };
  const keyDoc: SourceDocument = { document_id: 'csat-2018-key', ...keyReceipt, source_status: 'secondary-hosted', chain_of_origin: 'iasmind compiled 4-series key' };

  const FIGURE_RE = /\b(figure|diagram|pattern|graph|table|chart|matrix|image|pie ?chart|bar ?chart)\b/i;
  const PASSAGE_RE = /\b(passage|paragraph)\b/i;

  const records: QuestionRecord[] = [];
  const gaps: any[] = [];
  let figureCount = 0;
  let passageCount = 0;

  for (const q of questions) {
    const identity = {
      exam: 'UPSC_CSE' as const, stage: 'Prelims' as const, year: 2018,
      paper: 'GS-2' as const, language: 'en' as const, question_number: q.qn,
      // booklet_series intentionally omitted: re-typeset source, series unresolved.
    };
    const evidence: EvidenceRef[] = [{
      source_document_id: paperDoc.document_id, source_url: paperDoc.url, sha256: paperDoc.sha256,
      retrieved_at: paperDoc.retrieved_at, page: q.page, language: 'en',
      extraction_method: 'native-pdf-text', extraction_version: '1',
    }];
    const key: KeyAssertion = { authority: 'secondary-claimed', key: null, source_ref: undefined };

    const rec: QuestionRecord = {
      canonical_id: buildCanonicalId(identity),
      identity,
      text: { stem: q.stem, options: q.options as any, statements: null, passage: null },
      key,
      explanation: { provenance: 'none', review_state: 'unreviewed' },
      classification: { review_state: 'unreviewed' },
      evidence,
      status: 'incomplete',
      discrepancies: [],
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (PASSAGE_RE.test(q.stem)) { rec.discrepancies.push({ code: 'missing_passage', detail: 'comprehension passage not in text layer', question_number: q.qn }); passageCount++; }
    if (FIGURE_RE.test(q.stem)) { rec.discrepancies.push({ code: 'figure_unreadable', detail: 'figure/diagram is an image, absent from text layer', question_number: q.qn }); figureCount++; }
    rec.discrepancies.push({ code: 'series_unresolved', detail: 're-typeset source; booklet series not determinable from text', question_number: q.qn });
    rec.discrepancies.push({ code: 'key_unavailable', detail: 'key join blocked by unresolved series', question_number: q.qn });
    rec.discrepancies = rec.discrepancies.concat(collectDiscrepancies(rec));
    rec.eligibility = deriveEligibility(rec);
    records.push(rec);
  }

  const invalid = records.filter((r) => !validateQuestionRecord(r).ok);
  const canonicalDir = path.join(run, 'canonical');
  const reportsDir = path.join(run, 'reports');
  fs.mkdirSync(canonicalDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(path.join(canonicalDir, '2018_GS2_en.json'), JSON.stringify(records, null, 2));

  const report = {
    paper: '2018 CSAT (GS-II)',
    source_type: 're-typeset secondary (native text layer); diagrams are images',
    question_count: records.length,
    expected: 80,
    figure_unreadable: figureCount,
    missing_passage: passageCount,
    series_unresolved: records.length,
    key_series_available: seriesList,
    key_authority: 'secondary-claimed (4 series parsed natively)',
    key_ambiguities: detectAmbiguities(keyMaps),
    scored: records.filter((r) => r.eligibility.scored).length,
    reference_only: records.filter((r) => r.eligibility.reference_only).length,
    invalid_records: invalid.length,
    verdict: 'INSUFFICIENT for scored release — requires an official paper scan (figures) + series resolution before key join.',
    generated_at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(reportsDir, 'coverage.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

function detectAmbiguities(keyMaps: Map<string, Map<number, string>>): any[] {
  const amb: any[] = [];
  for (const [series, m] of keyMaps) {
    for (const [qn, v] of m) {
      if (/\sOR\s/i.test(v)) amb.push({ series, question_number: qn, value: v });
    }
  }
  return amb;
}

main();

