/**
 * Read-only audit of the generated Exam Hall pool (server-lib/exam/data/gs1ExamPool.ts).
 * Does not modify the pool. Writes a report into the run's reports/ directory.
 *
 * Usage:
 *   npx tsx scripts/qbank/audit-exam-pool.ts --run <runDir>
 */
import fs from 'fs';
import path from 'path';
import { GS1_EXAM_POOL } from '../../server-lib/exam/data/gs1ExamPool.js';
import { isPlaceholderOption } from '../../server-lib/qbank/validators.js';

const PLACEHOLDER_OPTION = /Option\s*[A-Da-d]/i;

function main() {
  const runIdx = process.argv.indexOf('--run');
  const run = runIdx >= 0 ? process.argv[runIdx + 1] : undefined;
  const pool = GS1_EXAM_POOL as any[];

  const bySubject: Record<string, number> = {};
  const byYear: Record<string, number> = {};
  const byKey: Record<string, number> = {};
  const byPrefix: Record<string, number> = {};
  const defects: any[] = [];

  const subjects = ['Economy', 'Environment', 'Geography', 'History', 'Polity', 'General Studies'];

  for (const item of pool) {
    bySubject[item.subject] = (bySubject[item.subject] ?? 0) + 1;
    byYear[item.year] = (byYear[item.year] ?? 0) + 1;
    byKey[item.key] = (byKey[item.key] ?? 0) + 1;
    const prefix = String(item.id).split('_')[0];
    byPrefix[prefix] = (byPrefix[prefix] ?? 0) + 1;

    const issues: string[] = [];
    if (!item.stem || item.stem.trim().length === 0) issues.push('empty stem');
    if (!Array.isArray(item.options)) issues.push('no options array');
    else {
      if (item.options.length !== 4) issues.push(`${item.options.length} options`);
      if (item.options.some((o: string) => !o || o.trim().length === 0)) issues.push('empty option');
      if (item.options.some((o: string) => PLACEHOLDER_OPTION.test(o))) issues.push('placeholder option');
    }
    if (!['A', 'B', 'C', 'D'].includes(item.key)) issues.push(`bad key "${item.key}"`);
    if (!Number.isInteger(item.year) || item.year < 1990 || item.year > 2026) issues.push(`bad year "${item.year}"`);
    if (issues.length) defects.push({ id: item.id, year: item.year, subject: item.subject, issues });
  }

  // Cross-check 2019 items against the canonical Series A key (if available).
  const canonicalPath = run ? path.join(run, 'canonical', '2019_GS1_en.json') : null;
  const crosscheck: any[] = [];
  if (canonicalPath && fs.existsSync(canonicalPath)) {
    const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf8')) as any[];
    const keyByQn = new Map(canonical.map((r: any) => [r.identity.question_number, r.key.key]));
    for (const item of pool) {
      if (item.year !== 2019) continue;
      // The pool id is a db_ uuid; question number is not directly present. Match by stem prefix.
      const stemNorm = String(item.stem).toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
      const match = canonical.find((r: any) => r.text.stem.toLowerCase().replace(/\s+/g, ' ').startsWith(stemNorm.slice(0, 40)));
      if (match) {
        const poolKey = String(item.key).toLowerCase();
        const canonKey = String(keyByQn.get(match.identity.question_number)).toLowerCase();
        if (poolKey !== canonKey) {
          crosscheck.push({ id: item.id, qn: match.identity.question_number, pool_key: item.key, canonical_key: canonKey.toUpperCase(), stem: String(item.stem).slice(0, 60) });
        }
      }
    }
  }

  const report = {
    pool_size: pool.length,
    by_subject: bySubject,
    by_year: byYear,
    by_key: byKey,
    by_id_prefix: byPrefix,
    defect_count: defects.length,
    defects: defects.slice(0, 50),
    crosscheck_2019_mismatches: crosscheck.length,
    crosscheck_mismatches: crosscheck,
    generated_at: new Date().toISOString(),
  };

  if (run) {
    const reportsDir = path.join(run, 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(path.join(reportsDir, 'exam-hall-pool-audit.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify({ pool_size: report.pool_size, by_subject: bySubject, by_key: byKey, by_id_prefix: byPrefix, defect_count: report.defect_count, crosscheck_2019_mismatches: report.crosscheck_mismatches }, null, 2));
  console.log('unrepresented subjects:', subjects.filter((s) => !(s in bySubject)));
}

main();
