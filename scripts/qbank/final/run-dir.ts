import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// REPO_ROOT is three directories above this file (scripts/qbank/final -> scripts/qbank -> scripts -> REPO_ROOT)
export const REPO_ROOT = path.resolve(__dirname, '../../..');

export class RunDirNotIgnoredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RunDirNotIgnoredError';
  }
}

export function getRunDir(): string {
  if (process.env.QBANK_RUN_DIR && process.env.QBANK_RUN_DIR.trim().length > 0) {
    return path.resolve(process.env.QBANK_RUN_DIR.trim());
  }
  return path.join(REPO_ROOT, '_raw_source_archive', 'qbank-quality', 'final-2026-10');
}

export function assertRunDirSafe(dir: string): void {
  const resolvedDir = path.resolve(dir);
  const resolvedRepo = path.resolve(REPO_ROOT);
  const relative = path.relative(resolvedRepo, resolvedDir);
  const isInside = !relative.startsWith('..') && !path.isAbsolute(relative);

  if (isInside) {
    const probePath = path.join(resolvedDir, '__probe__.pdf');
    const result = spawnSync('git', ['check-ignore', '-q', probePath], {
      cwd: resolvedRepo,
      stdio: 'ignore',
    });
    if (result.status !== 0) {
      throw new RunDirNotIgnoredError(
        `Run directory is inside git repository but not gitignored: ${resolvedDir}`
      );
    }
  }
}

export function ensureLayout(dir: string): void {
  const subdirs = [
    'manifest/robots',
    'sources/html',
    'sources/visionias',
    'sources/rau',
    'sources/.tmp',
    'profiles',
    'extracted',
    'occurrences/visionias',
    'occurrences/handoff',
    'mains',
    'keys/official',
    'crops',
    'conflicts',
    'canonical',
    'reports',
    'release-preview',
  ];

  for (const sub of subdirs) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }
}

function sortKeysRecursively(val: unknown): unknown {
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(sortKeysRecursively);
  }
  const obj = val as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();
  for (const k of keys) {
    sorted[k] = sortKeysRecursively(obj[k]);
  }
  return sorted;
}

export function stableStringify(v: unknown, indent?: number | string): string {
  const sorted = sortKeysRecursively(v);
  return JSON.stringify(sorted, null, indent);
}

function sleepSync(ms: number): void {
  const buf = new SharedArrayBuffer(4);
  const arr = new Int32Array(buf);
  Atomics.wait(arr, 0, 0, ms);
}

export function writeJsonAtomic(file: string, v: unknown): void {
  const content = stableStringify(v, 2) + '\n';
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });

  const tmpPath = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, content, 'utf-8');

  let attempts = 0;
  while (true) {
    try {
      fs.renameSync(tmpPath, file);
      break;
    } catch (err: any) {
      if ((err?.code === 'EPERM' || err?.code === 'EBUSY') && attempts < 3) {
        attempts++;
        sleepSync(500);
        continue;
      }
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {
        // ignore cleanup error
      }
      throw err;
    }
  }
}

export function appendJsonl(file: string, row: unknown): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const line = stableStringify(row) + '\n';
  fs.appendFileSync(file, line, 'utf-8');
}
