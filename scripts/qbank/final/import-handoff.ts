import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendJsonl,
  assertRunDirSafe,
  ensureLayout,
  getRunDir,
  REPO_ROOT,
  stableStringify,
  writeJsonAtomic,
} from './run-dir.js';
import type {
  EvidenceRef,
  KeyAssertion,
  OptionKey,
  OptionText,
  PaperKind,
} from '../../../server-lib/qbank/types.js';

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (insideQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  const result: Record<string, string>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && !row[0].trim()) continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = c < row.length ? row[c] : '';
    }
    result.push(obj);
  }

  return result;
}

export interface ImportReport {
  keys: Record<
    string,
    {
      official_final: number;
      withdrawn: number;
      accepted_multi: number;
      total: number;
    }
  >;
  withdrawn_ids: string[];
  accepted_ids: string[];
  transcriptions: Record<
    string,
    {
      rows: number;
      imported: number;
      skipped_deleted: number;
      skipped_empty: number;
      skipped_not_proofread: number;
      missing_option: number;
    }
  >;
}

// tark_pyq_handoff/HANDOFF.md:55 declares proofread GS-I text exists only for 2021 Q1-16, 2024 and 2025.
export const PROOFREAD_SCOPE: Record<number, 'all' | { from: number; to: number }> = {
  2021: { from: 1, to: 16 },
  2024: 'all',
  2025: 'all',
};

export function importHandoff(options?: { runDir?: string; handoffDir?: string }): ImportReport {
  const runDir = options?.runDir || getRunDir();
  assertRunDirSafe(runDir);
  ensureLayout(runDir);

  const handoffDir = options?.handoffDir || path.join(REPO_ROOT, 'tark_pyq_handoff', 'data');

  const requiredFiles = [
    'official_keys_seriesA_2020_2024.csv',
    'cse2021_gs1_seriesA_questions.csv',
    'cse2022_gs1_seriesA_questions.csv',
    'cse2024_gs1_seriesA_questions.csv',
    'cse2025_gs1_seriesA_questions.csv',
  ];

  for (const file of requiredFiles) {
    const fullPath = path.join(handoffDir, file);
    if (!fs.existsSync(fullPath)) {
      console.error(`[FATAL] Missing required input file: ${fullPath}`);
      process.exit(1);
    }
  }

  // 1. Process Keys
  const keysCsvPath = path.join(handoffDir, 'official_keys_seriesA_2020_2024.csv');
  const keysCsvText = fs.readFileSync(keysCsvPath, 'utf-8');
  const keyRows = parseCsv(keysCsvText);

  const keysBySlug: Record<string, Record<string, KeyAssertion>> = {};
  const docRefsBySlug: Record<string, Map<string, Omit<EvidenceRef, 'page' | 'region'>>> = {};
  const withdrawn_ids: string[] = [];
  const accepted_ids: string[] = [];
  const keyStatsPerSlug: ImportReport['keys'] = {};

  for (const row of keyRows) {
    const rowId = row.id?.trim() || '';
    const year = row.year?.trim() || '';
    const rawPaper = row.paper?.trim() || '';
    const paper = rawPaper === 'GS1' ? 'GS-1' : rawPaper === 'GS2' ? 'GS-2' : rawPaper;
    const slug = `${year}-${paper}`;
    const qnum = row.qnum?.trim() || '';
    const itemStatus = row.item_status?.trim() || '';
    const officialKey = row.official_key?.trim() || '';
    const note = row.note?.trim() || '';

    if (!keyStatsPerSlug[slug]) {
      keyStatsPerSlug[slug] = {
        official_final: 0,
        withdrawn: 0,
        accepted_multi: 0,
        total: 0,
      };
      keysBySlug[slug] = {};
      docRefsBySlug[slug] = new Map();
    }

    const dateMatch = (row.source_tier || '').match(/\d{4}-\d{2}-\d{2}/);
    const retrieved_at = dateMatch ? dateMatch[0] : '2026-09-28';

    const source_ref: EvidenceRef = {
      source_document_id: `upsc:${slug}:key:en`,
      source_url: `https://www.upsc.gov.in/sites/default/files/${row.official_filename?.trim()}`,
      sha256: row.file_sha256?.trim() || '',
      retrieved_at,
      page: Number(row.page),
      region: `Q${qnum} cell`,
      language: 'en',
      extraction_method: 'visual_read+glyph_clustering (tark_pyq_handoff)',
      extraction_version: 'handoff-2026-09',
      adjudication: row.verification?.trim(),
    };

    const paper_series_join = `Series A, as printed on UPSC key ${row.official_filename?.trim()}`;

    // Document without page and region
    const { page: _p, region: _r, ...docWithoutPageRegion } = source_ref;
    docRefsBySlug[slug].set(source_ref.sha256, docWithoutPageRegion);

    let assertion: KeyAssertion;

    if (itemStatus === 'scored') {
      const lowerKey = officialKey.toLowerCase();
      if (!['a', 'b', 'c', 'd'].includes(lowerKey)) {
        console.error(`[FATAL] Invalid official_key '${officialKey}' in scored row ${rowId}`);
        process.exit(1);
      }
      assertion = {
        authority: 'official-final',
        key: lowerKey as OptionKey,
        source_ref,
        paper_series_join,
      };
      keyStatsPerSlug[slug].official_final++;
    } else if (itemStatus === 'dropped') {
      assertion = {
        authority: 'withdrawn',
        key: null,
        source_ref,
        paper_series_join,
      };
      keyStatsPerSlug[slug].withdrawn++;
      withdrawn_ids.push(rowId);
    } else if (itemStatus === 'two_answers_accepted') {
      const uniqueLetters = Array.from(
        new Set(officialKey.toUpperCase().match(/[A-D]/g) || [])
      );
      let letters: string[] = [];
      if (uniqueLetters.length === 2) {
        letters = uniqueLetters;
      } else {
        const m = note.match(/\b([A-D])\s*(?:or|and|\/|,)\s*([A-D])\b/i);
        if (m) {
          letters = [m[1].toUpperCase(), m[2].toUpperCase()];
        } else {
          console.error(
            `[FATAL] Could not find 2 accepted letters for two_answers_accepted row ${rowId}`
          );
          process.exit(1);
        }
      }

      letters.sort();
      const accepted_keys = letters.map((l) => l.toLowerCase() as OptionKey);
      assertion = {
        authority: 'official-final',
        key: accepted_keys[0],
        accepted_keys,
        source_ref,
        paper_series_join,
      };
      keyStatsPerSlug[slug].official_final++;
      keyStatsPerSlug[slug].accepted_multi++;
      accepted_ids.push(rowId);
    } else {
      console.error(`[FATAL] Unknown item_status '${itemStatus}' in row ${rowId}`);
      process.exit(1);
    }

    keyStatsPerSlug[slug].total++;
    keysBySlug[slug][qnum] = assertion;
  }

  // Write keys/official/<slug>.json
  const keysOfficialDir = path.join(runDir, 'keys', 'official');
  fs.mkdirSync(keysOfficialDir, { recursive: true });

  for (const slug of Object.keys(keysBySlug).sort()) {
    const slugKeys = keysBySlug[slug];
    const docs = Array.from(docRefsBySlug[slug].values());
    const payload = {
      paper_slug: slug,
      series: {
        A: slugKeys,
      },
      documents: docs,
      method: 'tark_pyq_handoff import',
    };
    writeJsonAtomic(path.join(keysOfficialDir, `${slug}.json`), payload);
  }

  // 2. Process Transcriptions
  const transcriptionFiles: Array<{ yr: string; file: string }> = [
    { yr: '2021', file: 'cse2021_gs1_seriesA_questions.csv' },
    { yr: '2022', file: 'cse2022_gs1_seriesA_questions.csv' },
    { yr: '2024', file: 'cse2024_gs1_seriesA_questions.csv' },
    { yr: '2025', file: 'cse2025_gs1_seriesA_questions.csv' },
  ];

  const transcriptionsStats: ImportReport['transcriptions'] = {};
  const handoffOccurrencesDir = path.join(runDir, 'occurrences', 'handoff');
  fs.mkdirSync(handoffOccurrencesDir, { recursive: true });

  for (const { yr, file } of transcriptionFiles) {
    const slug = `${yr}-GS-1`;
    const csvPath = path.join(handoffDir, file);
    const csvText = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCsv(csvText);

    let importedCount = 0;
    let skippedDeletedCount = 0;
    let skippedEmptyCount = 0;
    let skippedNotProofreadCount = 0;
    let missingOptionCount = 0;

    const envelopes: any[] = [];

    for (const row of rows) {
      const qnum = Number(row.qnum);
      const rowYear = Number(row.year);
      const scope = PROOFREAD_SCOPE[rowYear];
      let inScope = false;
      if (scope === 'all') {
        inScope = true;
      } else if (scope && typeof scope === 'object') {
        inScope = qnum >= scope.from && qnum <= scope.to;
      }
      if (!inScope) {
        skippedNotProofreadCount++;
        continue;
      }

      const df = (row.deleted_flag || '').trim().toLowerCase();
      const isDeleted = df === 'true' || df === '1' || df === 'yes';
      if (isDeleted) {
        skippedDeletedCount++;
        continue;
      }

      const qText = row.question_text ?? '';
      if (!qText.trim()) {
        skippedEmptyCount++;
        continue;
      }

      importedCount++;

      let statements: string[] | null = null;
      if (row.items_json && row.items_json.trim()) {
        try {
          const parsed = JSON.parse(row.items_json);
          if (
            Array.isArray(parsed) &&
            parsed.length >= 2 &&
            parsed.every((x) => typeof x === 'string')
          ) {
            statements = parsed;
          }
        } catch {
          // ignore
        }
      }

      const options: OptionText[] = [
        { key: 'a', text: row.option_a ?? '' },
        { key: 'b', text: row.option_b ?? '' },
        { key: 'c', text: row.option_c ?? '' },
        { key: 'd', text: row.option_d ?? '' },
      ];

      const warnings: string[] = [];
      if (options.some((o) => !o.text.trim())) {
        warnings.push('missing_option');
        missingOptionCount++;
      }

      const page = Number(row.page);

      const evidence: EvidenceRef = {
        source_document_id: `handoff:${slug}:transcription:en`,
        source_url: row.source_url?.trim() || '',
        sha256: row.file_sha256?.trim() || '',
        retrieved_at: '2026-09-28',
        page,
        region: `Q${qnum}`,
        language: 'en',
        extraction_method: 'tesseract-ocr(2 passes)+visual-proofread (tark_pyq_handoff)',
        extraction_version: 'handoff-2026-09',
      };

      const envelope = {
        occurrence: {
          occurrence_id: `handoff:${slug}:transcription:en_p${page}_q${qnum}`,
          canonical_id: null,
          identity: {
            exam: 'UPSC_CSE',
            stage: 'Prelims',
            year: Number(row.year),
            paper: 'GS-1',
            booklet_series: 'A',
            language: 'en',
            question_number: qnum,
          },
          text: {
            stem: qText,
            statements,
            passage: null,
            options,
            figures: null,
            instruction_refs: null,
          },
          evidence,
        },
        explanation_claim: null,
        annotations: null,
        parse: {
          warnings,
        },
      };

      envelopes.push(envelope);
    }

    // Sort by qnum
    envelopes.sort(
      (a, b) =>
        a.occurrence.identity.question_number -
        b.occurrence.identity.question_number
    );

    const outJsonl = path.join(handoffOccurrencesDir, `${slug}.jsonl`);
    if (envelopes.length === 0) {
      if (fs.existsSync(outJsonl)) {
        fs.unlinkSync(outJsonl);
      }
    } else {
      const tmpPath = `${outJsonl}.tmp.${Date.now()}`;
      fs.writeFileSync(
        tmpPath,
        envelopes.map((env) => stableStringify(env)).join('\n') + '\n',
        'utf-8'
      );
      fs.renameSync(tmpPath, outJsonl);
    }

    transcriptionsStats[slug] = {
      rows: rows.length,
      imported: importedCount,
      skipped_deleted: skippedDeletedCount,
      skipped_empty: skippedEmptyCount,
      skipped_not_proofread: skippedNotProofreadCount,
      missing_option: missingOptionCount,
    };
  }

  const report: ImportReport = {
    keys: keyStatsPerSlug,
    withdrawn_ids,
    accepted_ids,
    transcriptions: transcriptionsStats,
  };

  const reportPath = path.join(runDir, 'reports', 'import-handoff.json');
  writeJsonAtomic(reportPath, report);

  return report;
}

// CLI entry point
const isMain =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
    fileURLToPath(import.meta.url) === path.resolve(process.argv[1] + '.ts') ||
    process.argv[1].endsWith('import-handoff.ts'));

if (isMain) {
  try {
    const rep = importHandoff();
    console.log('\n--- Import Handoff Report ---');
    console.log(stableStringify(rep, 2));
    process.exit(0);
  } catch (err) {
    console.error('\n[FATAL] Error importing handoff:', err);
    process.exit(1);
  }
}
