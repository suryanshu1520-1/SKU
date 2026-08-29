/**
 * server-lib/analytics/pyq_explorer.ts
 *
 * In-memory sub-millisecond query engine across all 7,841 authentic UPSC CSE questions (2000–2025).
 */

import fs from 'fs';
import path from 'path';

export interface PYQItem {
  id: string;
  year: number;
  paper: string;
  stage: string;
  subject: string;
  era: string;
  stem: string;
  options: string[];
  correctKey: string;
  cognitiveType: string;
  wordCount: number;
  trapAnalysis: string;
  qualifiers: {
    extreme: string[];
    contingent: string[];
  };
}

export interface PYQQueryParams {
  q?: string;
  subject?: string;
  era?: string;
  cognitiveType?: string;
  stage?: string;
  page?: number;
  limit?: number;
}

export interface PYQSliceStats {
  pctA: string;
  pctB: string;
  pctC: string;
  pctD: string;
  avgWords: number;
}

export interface PYQQueryResult {
  success: boolean;
  total: number;
  page: number;
  totalPages: number;
  sliceStats: PYQSliceStats;
  data: PYQItem[];
}

let cachedCorpus: PYQItem[] | null = null;

function loadCorpus(): PYQItem[] {
  if (cachedCorpus) return cachedCorpus;

  try {
    const possiblePaths = [
      path.join(process.cwd(), 'server-lib', 'analytics', 'data', 'master_7841_pyqs.json'),
      path.join(process.cwd(), 'dist', 'master_7841_pyqs.json'),
      path.join(__dirname, 'data', 'master_7841_pyqs.json'),
      path.join(__dirname, '..', 'analytics', 'data', 'master_7841_pyqs.json'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        cachedCorpus = JSON.parse(raw);
        return cachedCorpus!;
      }
    }

    // Fallback if file not found in path
    cachedCorpus = [];
    return cachedCorpus;
  } catch (err) {
    console.error('Error loading master 7841 PYQ corpus:', err);
    return [];
  }
}

export function queryMasterPYQs(params: PYQQueryParams): PYQQueryResult {
  const corpus = loadCorpus();
  const searchQ = (params.q || '').trim().toLowerCase();
  const subjectFilter = (params.subject || 'All').trim().toLowerCase();
  const eraFilter = (params.era || 'All').trim();
  const cognitiveFilter = (params.cognitiveType || 'All').trim().toLowerCase();
  const stageFilter = (params.stage || 'All').trim().toLowerCase();
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));

  const filtered = corpus.filter((item) => {
    // Subject filter
    if (subjectFilter !== 'all') {
      if (!item.subject.toLowerCase().includes(subjectFilter)) {
        return false;
      }
    }

    // Era filter
    if (eraFilter !== 'All') {
      if (item.era !== eraFilter) {
        return false;
      }
    }

    // Stage filter
    if (stageFilter !== 'all') {
      if (item.stage.toLowerCase() !== stageFilter) {
        return false;
      }
    }

    // Cognitive Type filter
    if (cognitiveFilter !== 'all') {
      if (!item.cognitiveType.toLowerCase().includes(cognitiveFilter)) {
        return false;
      }
    }

    // Full text search query
    if (searchQ) {
      const inStem = item.stem.toLowerCase().includes(searchQ);
      const inTrap = item.trapAnalysis.toLowerCase().includes(searchQ);
      const inSubject = item.subject.toLowerCase().includes(searchQ);
      const inCog = item.cognitiveType.toLowerCase().includes(searchQ);
      const inOpts = item.options.some((opt) => opt.toLowerCase().includes(searchQ));
      if (!inStem && !inTrap && !inSubject && !inCog && !inOpts) {
        return false;
      }
    }

    return true;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;

  // Calculate live slice stats
  const keyCounts = { A: 0, B: 0, C: 0, D: 0 };
  let totalWords = 0;
  for (const item of filtered) {
    const k = item.correctKey.toUpperCase() as 'A' | 'B' | 'C' | 'D';
    if (keyCounts[k] !== undefined) keyCounts[k]++;
    totalWords += item.wordCount;
  }

  const safeTotal = total || 1;
  const sliceStats: PYQSliceStats = {
    pctA: ((keyCounts.A / safeTotal) * 100).toFixed(1),
    pctB: ((keyCounts.B / safeTotal) * 100).toFixed(1),
    pctC: ((keyCounts.C / safeTotal) * 100).toFixed(1),
    pctD: ((keyCounts.D / safeTotal) * 100).toFixed(1),
    avgWords: Math.round(totalWords / safeTotal),
  };

  // Slice for pagination
  const startIndex = (page - 1) * limit;
  const paginatedData = filtered.slice(startIndex, startIndex + limit);

  return {
    success: true,
    total,
    page,
    totalPages,
    sliceStats,
    data: paginatedData,
  };
}
