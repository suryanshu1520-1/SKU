import '../../../server-lib/load-env.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GS1_EXAM_POOL } from '../../../server-lib/exam/data/gs1ExamPool.js';
import type { QuestionRecord } from '../../../server-lib/qbank/types.js';
import { assertRunDirSafe, getRunDir, writeJsonAtomic } from './run-dir.js';

export interface KeyDisagreement {
  pool_id: string;
  canonical_id: string;
  pool_key: string;
  canonical_key: string | null;
  canonical_authority: string;
}

export interface ParityReport {
  matched: number;
  unmatched: number;
  key_disagreements: KeyDisagreement[];
}

export function tokenize(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) || [];
  return new Set(words);
}

export function jaccard(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function getStemCandidates(q: QuestionRecord): string[] {
  const candidates: string[] = [q.text.stem];

  const stmts = (q.text.statements || [])
    .map((s: any) => (typeof s === 'string' ? s : s.text || ''))
    .join(' ');
  const instrs = (q.text.instruction_refs || [])
    .map((s: any) => (typeof s === 'string' ? s : s.text || ''))
    .join(' ');
  const passage = q.text.passage || '';

  if (stmts || instrs || passage) {
    candidates.push([q.text.stem, stmts, instrs, passage].filter(Boolean).join(' '));
  }
  return candidates;
}

export async function runParity(options: { runDir?: string } = {}): Promise<ParityReport> {
  const rDir = options.runDir || getRunDir();
  assertRunDirSafe(rDir);

  const canonicalDir = path.join(rDir, 'canonical');
  const releasePreviewDir = path.join(rDir, 'release-preview');
  fs.mkdirSync(releasePreviewDir, { recursive: true });

  let questionsFile = path.join(canonicalDir, 'questions.jsonl');
  if (!fs.existsSync(questionsFile)) {
    questionsFile = path.join(canonicalDir, 'questions.preview.jsonl');
  }

  if (!fs.existsSync(questionsFile)) {
    throw new Error(`Canonical questions file not found in ${canonicalDir}`);
  }

  const canonicalQuestions: QuestionRecord[] = [];
  const lines = fs.readFileSync(questionsFile, 'utf-8').split('\n');
  for (const line of lines) {
    if (line.trim()) {
      canonicalQuestions.push(JSON.parse(line));
    }
  }

  // Index canonical questions by year
  const canonicalByYear = new Map<number, QuestionRecord[]>();
  for (const q of canonicalQuestions) {
    const year = q.identity?.year;
    if (year) {
      if (!canonicalByYear.has(year)) {
        canonicalByYear.set(year, []);
      }
      canonicalByYear.get(year)!.push(q);
    }
  }

  let matched = 0;
  let unmatched = 0;
  const key_disagreements: KeyDisagreement[] = [];

  for (const item of GS1_EXAM_POOL) {
    const yearQuestions = canonicalByYear.get(item.year) || [];
    const itemTokens = tokenize(item.stem);

    let bestSimilarity = 0;
    let bestMatch: QuestionRecord | null = null;

    for (const q of yearQuestions) {
      const candidates = getStemCandidates(q);
      for (const candidateText of candidates) {
        const candidateTokens = tokenize(candidateText);
        const sim = jaccard(itemTokens, candidateTokens);
        if (sim > bestSimilarity) {
          bestSimilarity = sim;
          bestMatch = q;
        }
      }
    }

    if (bestSimilarity >= 0.85 && bestMatch) {
      matched++;
      const poolKey = (item.key || '').trim().toLowerCase();
      const canonicalKey = (bestMatch.key?.key || '').trim().toLowerCase();

      if (poolKey && canonicalKey && poolKey !== canonicalKey) {
        key_disagreements.push({
          pool_id: item.id,
          canonical_id: bestMatch.canonical_id,
          pool_key: item.key,
          canonical_key: bestMatch.key?.key || null,
          canonical_authority: bestMatch.key?.authority || 'unknown',
        });
      }
    } else {
      unmatched++;
    }
  }

  // Sort key disagreements deterministically
  key_disagreements.sort((a, b) => a.pool_id.localeCompare(b.pool_id));

  const report: ParityReport = {
    matched,
    unmatched,
    key_disagreements,
  };

  const outputPath = path.join(releasePreviewDir, 'parity-legacy.json');
  writeJsonAtomic(outputPath, report);

  console.log(`Legacy pool parity summary:`);
  console.log(`- Matched: ${matched}`);
  console.log(`- Unmatched: ${unmatched}`);
  console.log(`- Key Disagreements: ${key_disagreements.length}`);
  console.log(`Report written to ${outputPath}`);

  return report;
}

const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith('parity.ts') || process.argv[1].endsWith('parity.js'));

if (isMainModule) {
  runParity().catch((err) => {
    console.error('Parity check failed:', err.message);
    process.exit(1);
  });
}
