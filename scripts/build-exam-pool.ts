import fs from 'node:fs';
import path from 'node:path';
import { EXAM_SUBJECTS, type ExamSubject, type ItemFormat, type OptionKey, type PoolItem } from '../server-lib/exam/types.js';

interface RawPYQRow {
  id?: unknown;
  year?: unknown;
  paper?: unknown;
  stage?: unknown;
  subject?: unknown;
  options?: unknown;
  correctKey?: unknown;
  stem?: unknown;
  trapAnalysis?: unknown;
}

const inputPath = path.join(process.cwd(), 'server-lib', 'analytics', 'data', 'verified_pyqs_15yr.json');
const outputPath = path.join(process.cwd(), 'server-lib', 'exam', 'data', 'gs1ExamPool.ts');

const rawData: RawPYQRow[] = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const validSubjects = new Set<string>(EXAM_SUBJECTS);
const validKeys = new Set(['A', 'B', 'C', 'D']);
const seenDedupeKeys = new Set<string>();

const keptItems: PoolItem[] = [];

for (const row of rawData) {
  // Eligibility E1: String(row.id) starts with db_
  const idStr = String(row.id ?? '');
  if (!idStr.startsWith('db_')) continue;

  // E2: row.paper === 'GS-1' and row.stage === 'Prelims'
  if (row.paper !== 'GS-1' || row.stage !== 'Prelims') continue;

  // E3: Number.isInteger(row.year) and 2011 <= row.year <= 2023 and row.year !== 2020
  if (!Number.isInteger(row.year) || typeof row.year !== 'number') continue;
  if (row.year < 2011 || row.year > 2023 || row.year === 2020) continue;

  // E4: Array.isArray(row.options) with length exactly 4, and for k = 0..3 /^\(([a-d])\)\s+\S/.exec(row.options[k]) matches with capture === 'abcd'[k]
  if (!Array.isArray(row.options) || row.options.length !== 4) continue;
  let optionsValid = true;
  for (let k = 0; k < 4; k++) {
    const opt = row.options[k];
    if (typeof opt !== 'string') {
      optionsValid = false;
      break;
    }
    const match = /^\(([a-d])\)\s+\S/.exec(opt);
    if (!match || match[1] !== 'abcd'[k]) {
      optionsValid = false;
      break;
    }
  }
  if (!optionsValid) continue;

  // E5: String(row.correctKey ?? '').trim().toUpperCase() is one of A B C D
  const key = String(row.correctKey ?? '').trim().toUpperCase() as OptionKey;
  if (!validKeys.has(key)) continue;

  // E6: String(row.stem ?? '').trim().length >= 20
  const rawStem = String(row.stem ?? '').trim();
  if (rawStem.length < 20) continue;

  // E7: row.subject is one of the six EXAM_SUBJECTS
  if (typeof row.subject !== 'string' || !validSubjects.has(row.subject)) continue;

  // Normalisation:
  // stem: replace \r\n and lone \r with \n; strip trailing whitespace on every line (/[ \t]+$/gm); collapse 3+ consecutive \n to \n\n; .trim().
  const normStem = rawStem
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // options[k]: remove /^\([a-d]\)\s+/, then .trim().
  const normOptions = (row.options as string[]).map((opt) =>
    opt.replace(/^\([a-d]\)\s+/, '').trim()
  ) as [string, string, string, string];

  // key: String(row.correctKey).trim().toUpperCase()
  // explanation: String(row.trapAnalysis ?? '').trim()
  const explanation = String(row.trapAnalysis ?? '').trim();

  // Dedupe: key = stem.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 120); keep the first occurrence.
  const dedupeKey = normStem.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 120);
  if (seenDedupeKeys.has(dedupeKey)) continue;
  seenDedupeKeys.add(dedupeKey);

  // Format (evaluated on the normalised stem and options; first match wins):
  // 1. 'howmany': /\bhow many of the\b/i.test(stem) or /^(only one|only two|only three|all three|all four|none of the)\b/i.test(options[0])
  // 2. 'assertion': /\bStatement[- ]?I\b/.test(stem) && /\bStatement[- ]?II\b/.test(stem)
  // 3. 'pairs': /^\s*\|.*\|\s*$/m.test(stem) || /\bfollowing pairs\b/i.test(stem)
  // 4. 'statements': (stem.match(/^\s*\d{1,2}[.)]\s+\S/gm) ?? []).length >= 2
  // 5. 'single' otherwise
  let format: ItemFormat = 'single';
  if (
    /\bhow many of the\b/i.test(normStem) ||
    /^(only one|only two|only three|all three|all four|none of the)\b/i.test(normOptions[0])
  ) {
    format = 'howmany';
  } else if (/\bStatement[- ]?I\b/.test(normStem) && /\bStatement[- ]?II\b/.test(normStem)) {
    format = 'assertion';
  } else if (/^\s*\|.*\|\s*$/m.test(normStem) || /\bfollowing pairs\b/i.test(normStem)) {
    format = 'pairs';
  } else if ((normStem.match(/^\s*\d{1,2}[.)]\s+\S/gm) ?? []).length >= 2) {
    format = 'statements';
  }

  // Order of keys: id, year, subject, format, stem, options, key, explanation
  keptItems.push({
    id: idStr,
    year: row.year as number,
    subject: row.subject as ExamSubject,
    format,
    stem: normStem,
    options: normOptions,
    key,
    explanation,
  });
}

// Sort: by year ascending, then id ascending (plain < string comparison)
keptItems.sort((a, b) => {
  if (a.year !== b.year) return a.year - b.year;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
});

// Write output file
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const outputContent = `// GENERATED by scripts/build-exam-pool.ts. Do not edit by hand.
// Re-generate: npx tsx scripts/build-exam-pool.ts
import type { PoolItem } from '../types.js';

export const GS1_EXAM_POOL: readonly PoolItem[] = ${JSON.stringify(keptItems, null, 2)};
`;

fs.writeFileSync(outputPath, outputContent, 'utf8');

// Compute stats
const bySubject: Record<string, number> = {};
const byYear: Record<string, number> = {};
const byFormat: Record<string, number> = {};
const byKey: Record<string, number> = {};

for (const item of keptItems) {
  bySubject[item.subject] = (bySubject[item.subject] ?? 0) + 1;
  byYear[String(item.year)] = (byYear[String(item.year)] ?? 0) + 1;
  byFormat[item.format] = (byFormat[item.format] ?? 0) + 1;
  byKey[item.key] = (byKey[item.key] ?? 0) + 1;
}

const sortObj = (obj: Record<string, number>) => {
  const sorted: Record<string, number> = {};
  for (const k of Object.keys(obj).sort()) {
    sorted[k] = obj[k];
  }
  return sorted;
};

const stats = {
  total: keptItems.length,
  bySubject: sortObj(bySubject),
  byYear: sortObj(byYear),
  byFormat: sortObj(byFormat),
  byKey: sortObj(byKey),
  firstId: keptItems[0]?.id ?? null,
  lastId: keptItems[keptItems.length - 1]?.id ?? null,
};

console.log(JSON.stringify(stats));

if (keptItems.length === 0) {
  process.exit(1);
}
