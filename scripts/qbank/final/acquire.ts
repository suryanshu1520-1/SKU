import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendJsonl,
  assertRunDirSafe,
  ensureLayout,
  getRunDir,
  writeJsonAtomic,
} from './run-dir.js';
import {
  politeFetch,
  requestLog,
  type PoliteFetchOptions,
  type PoliteFetchResult,
  type RequestLogEntry,
} from './http.js';
import type { CensusReport, CensusRow } from './census.js';

export interface AcquisitionRow {
  document_id: string;
  url: string;
  final_url: string;
  http_status: number;
  etag?: string | null;
  last_modified?: string | null;
  bytes: number;
  sha256?: string;
  retrieved_at: string;
  path?: string;
  status: 'ok' | 'not_modified' | 'failed';
  duplicate_of?: string;
  previous_sha256?: string;
  error?: string;
}

export interface AcquireReport {
  downloaded: number;
  not_modified: number;
  duplicates: number;
  failed: number;
  total_bytes: number;
  failures: Array<{ document_id: string; reason: string }>;
  min_interval_ms_by_host: Record<string, number>;
}

export interface AcquireOptions {
  census?: { generated_at: string; rows: CensusRow[] };
  runDir?: string;
  fetcher?: (url: string, options?: PoliteFetchOptions) => Promise<PoliteFetchResult>;
  now?: () => number;
  dryRun?: boolean;
}

function sleepSync(ms: number): void {
  const buf = new SharedArrayBuffer(4);
  const arr = new Int32Array(buf);
  Atomics.wait(arr, 0, 0, ms);
}

function renameWithRetry(src: string, dest: string): void {
  let attempts = 0;
  while (true) {
    try {
      fs.renameSync(src, dest);
      break;
    } catch (err: any) {
      if ((err?.code === 'EPERM' || err?.code === 'EBUSY') && attempts < 3) {
        attempts++;
        sleepSync(500);
        continue;
      }
      try {
        if (fs.existsSync(src)) fs.unlinkSync(src);
      } catch {
        // ignore
      }
      throw err;
    }
  }
}

export function computeMinIntervalsByHost(log: RequestLogEntry[]): Record<string, number> {
  const intervals: Record<string, number> = {};
  const startsByHost: Record<string, number[]> = {};

  for (const entry of log) {
    if (!startsByHost[entry.host]) {
      startsByHost[entry.host] = [];
    }
    startsByHost[entry.host].push(entry.startedAt);
  }

  for (const [host, starts] of Object.entries(startsByHost)) {
    if (starts.length < 2) {
      intervals[host] = 3000;
      continue;
    }
    let minDiff = Infinity;
    for (let i = 1; i < starts.length; i++) {
      const diff = starts[i] - starts[i - 1];
      if (diff < minDiff) minDiff = diff;
    }
    intervals[host] = minDiff === Infinity ? 3000 : minDiff;
  }

  return intervals;
}

export async function acquireAll(options?: AcquireOptions): Promise<AcquireReport> {
  const runDir = options?.runDir || getRunDir();
  assertRunDirSafe(runDir);
  ensureLayout(runDir);

  const fetcher = options?.fetcher || politeFetch;
  const now = options?.now || (() => Date.now());

  // Load census if not provided
  let census = options?.census;
  if (!census) {
    const censusPath = path.join(runDir, 'manifest', 'census.json');
    if (!fs.existsSync(censusPath)) {
      throw new Error(`manifest/census.json does not exist. Run qbank:census first.`);
    }
    census = JSON.parse(fs.readFileSync(censusPath, 'utf-8'));
  }

  // Filter rows without skip_reason, sort by document_id
  const targetRows = (census?.rows || [])
    .filter((r) => !r.skip_reason && r.pdf_url)
    .sort((a, b) => a.document_id.localeCompare(b.document_id));

  if (options?.dryRun) {
    console.log(`[acquire:dry-run] Planned downloads (${targetRows.length} documents):`);
    for (const r of targetRows) {
      console.log(`  ${r.document_id} -> ${r.pdf_url}`);
    }
    return {
      downloaded: 0,
      not_modified: 0,
      duplicates: 0,
      failed: 0,
      total_bytes: 0,
      failures: [],
      min_interval_ms_by_host: {},
    };
  }

  // Load acquisition history from acquisition.jsonl
  const logFile = path.join(runDir, 'manifest', 'acquisition.jsonl');
  const latestByDocId = new Map<string, AcquisitionRow>();
  const docIdBySha = new Map<string, string>();

  if (fs.existsSync(logFile)) {
    const lines = fs.readFileSync(logFile, 'utf-8').split(/\r?\n/).filter((l) => l.trim().length > 0);
    for (const line of lines) {
      try {
        const row = JSON.parse(line) as AcquisitionRow;
        latestByDocId.set(row.document_id, row);
        if (
          row.sha256 &&
          (row.status === 'ok' || row.status === 'not_modified') &&
          !docIdBySha.has(row.sha256)
        ) {
          docIdBySha.set(row.sha256, row.document_id);
        }
      } catch {
        // ignore parse error
      }
    }
  }

  let downloadedCount = 0;
  let notModifiedCount = 0;
  let duplicatesCount = 0;
  let failedCount = 0;
  let totalBytes = 0;
  const failures: Array<{ document_id: string; reason: string }> = [];

  const initialLogLength = requestLog.length;

  for (let i = 0; i < targetRows.length; i++) {
    const row = targetRows[i];
    const prev = latestByDocId.get(row.document_id);
    const existingFile = prev?.path ? path.join(runDir, prev.path) : null;
    const hasValidPrev =
      prev &&
      (prev.status === 'ok' || prev.status === 'not_modified') &&
      existingFile &&
      fs.existsSync(existingFile);

    if (hasValidPrev) {
      // Previously fetched -> send conditional request
      const conditional: { etag?: string | null; lastModified?: string | null } = {};
      if (prev.etag) conditional.etag = prev.etag;
      if (prev.last_modified) conditional.lastModified = prev.last_modified;

      let res: PoliteFetchResult;
      try {
        res = await fetcher(row.pdf_url!, {
          conditional,
          runDir,
          now,
        });
      } catch (err: any) {
        failedCount++;
        const reason = err.message || 'fetch_error';
        failures.push({ document_id: row.document_id, reason });
        appendJsonl(logFile, {
          document_id: row.document_id,
          url: row.pdf_url!,
          final_url: row.pdf_url!,
          http_status: 0,
          bytes: 0,
          retrieved_at: new Date(now()).toISOString(),
          status: 'failed',
          error: reason,
        });
        continue;
      }

      if (res.status === 304) {
        // Not modified
        notModifiedCount++;
        totalBytes += prev.bytes;
        const acqRow: AcquisitionRow = {
          document_id: row.document_id,
          url: row.pdf_url!,
          final_url: res.finalUrl,
          http_status: 304,
          etag: res.headers['etag'] || prev.etag || null,
          last_modified: res.headers['last-modified'] || prev.last_modified || null,
          bytes: prev.bytes,
          sha256: prev.sha256,
          retrieved_at: res.requestedAt,
          path: prev.path,
          status: 'not_modified',
        };
        appendJsonl(logFile, acqRow);
        latestByDocId.set(row.document_id, acqRow);
        continue;
      }

      // If status 200, fall through to process as new download
      if (res.status === 200) {
        // Process new download with previous_sha256 detection
        if (res.body.length <= 1000) {
          failedCount++;
          const reason = 'too_small';
          failures.push({ document_id: row.document_id, reason });
          appendJsonl(logFile, {
            document_id: row.document_id,
            url: row.pdf_url!,
            final_url: res.finalUrl,
            http_status: res.status,
            bytes: res.body.length,
            retrieved_at: res.requestedAt,
            status: 'failed',
            error: reason,
          });
          continue;
        }

        const magic = res.body.subarray(0, 5).toString('ascii');
        if (magic !== '%PDF-') {
          failedCount++;
          const reason = 'not_pdf';
          failures.push({ document_id: row.document_id, reason });
          appendJsonl(logFile, {
            document_id: row.document_id,
            url: row.pdf_url!,
            final_url: res.finalUrl,
            http_status: res.status,
            bytes: res.body.length,
            retrieved_at: res.requestedAt,
            status: 'failed',
            error: reason,
          });
          continue;
        }

        const sha256 = crypto.createHash('sha256').update(res.body).digest('hex');
        const previous_sha256 = prev.sha256 && prev.sha256 !== sha256 ? prev.sha256 : undefined;

        const tmpPart = path.join(runDir, 'sources', '.tmp', `${sha256}.part`);
        fs.mkdirSync(path.dirname(tmpPart), { recursive: true });
        fs.writeFileSync(tmpPart, res.body);

        const targetFile = path.join(runDir, 'sources', row.publisher, `${sha256}.pdf`);
        fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        if (!fs.existsSync(targetFile)) {
          renameWithRetry(tmpPart, targetFile);
        } else {
          try {
            if (fs.existsSync(tmpPart)) fs.unlinkSync(tmpPart);
          } catch {
            // ignore
          }
        }

        const relPath = path.relative(runDir, targetFile).replace(/\\/g, '/');
        let duplicate_of: string | undefined;
        if (docIdBySha.has(sha256) && docIdBySha.get(sha256) !== row.document_id) {
          duplicate_of = docIdBySha.get(sha256);
          duplicatesCount++;
        } else {
          docIdBySha.set(sha256, row.document_id);
          downloadedCount++;
        }

        totalBytes += res.body.length;

        const acqRow: AcquisitionRow = {
          document_id: row.document_id,
          url: row.pdf_url!,
          final_url: res.finalUrl,
          http_status: res.status,
          etag: res.headers['etag'] || null,
          last_modified: res.headers['last-modified'] || null,
          bytes: res.body.length,
          sha256,
          retrieved_at: res.requestedAt,
          path: relPath,
          status: 'ok',
          ...(duplicate_of ? { duplicate_of } : {}),
          ...(previous_sha256 ? { previous_sha256 } : {}),
        };

        appendJsonl(logFile, acqRow);
        latestByDocId.set(row.document_id, acqRow);
        continue;
      }

      // Any other status on conditional fetch
      failedCount++;
      const reason = `http_${res.status}`;
      failures.push({ document_id: row.document_id, reason });
      appendJsonl(logFile, {
        document_id: row.document_id,
        url: row.pdf_url!,
        final_url: res.finalUrl,
        http_status: res.status,
        bytes: res.body.length,
        retrieved_at: res.requestedAt,
        status: 'failed',
        error: reason,
      });
      continue;
    }

    // New download
    console.log(`[acquire] Downloading (${i + 1}/${targetRows.length}): ${row.document_id}`);
    let res: PoliteFetchResult;
    try {
      res = await fetcher(row.pdf_url!, {
        runDir,
        now,
      });
    } catch (err: any) {
      failedCount++;
      const reason = err.message || 'fetch_error';
      failures.push({ document_id: row.document_id, reason });
      appendJsonl(logFile, {
        document_id: row.document_id,
        url: row.pdf_url!,
        final_url: row.pdf_url!,
        http_status: 0,
        bytes: 0,
        retrieved_at: new Date(now()).toISOString(),
        status: 'failed',
        error: reason,
      });
      continue;
    }

    if (res.status !== 200) {
      failedCount++;
      const reason = `http_${res.status}`;
      failures.push({ document_id: row.document_id, reason });
      appendJsonl(logFile, {
        document_id: row.document_id,
        url: row.pdf_url!,
        final_url: res.finalUrl,
        http_status: res.status,
        bytes: res.body.length,
        retrieved_at: res.requestedAt,
        status: 'failed',
        error: reason,
      });
      continue;
    }

    if (res.body.length <= 1000) {
      failedCount++;
      const reason = 'too_small';
      failures.push({ document_id: row.document_id, reason });
      appendJsonl(logFile, {
        document_id: row.document_id,
        url: row.pdf_url!,
        final_url: res.finalUrl,
        http_status: res.status,
        bytes: res.body.length,
        retrieved_at: res.requestedAt,
        status: 'failed',
        error: reason,
      });
      continue;
    }

    const magic = res.body.subarray(0, 5).toString('ascii');
    if (magic !== '%PDF-') {
      failedCount++;
      const reason = 'not_pdf';
      failures.push({ document_id: row.document_id, reason });
      appendJsonl(logFile, {
        document_id: row.document_id,
        url: row.pdf_url!,
        final_url: res.finalUrl,
        http_status: res.status,
        bytes: res.body.length,
        retrieved_at: res.requestedAt,
        status: 'failed',
        error: reason,
      });
      continue;
    }

    const sha256 = crypto.createHash('sha256').update(res.body).digest('hex');

    const tmpPart = path.join(runDir, 'sources', '.tmp', `${sha256}.part`);
    fs.mkdirSync(path.dirname(tmpPart), { recursive: true });
    fs.writeFileSync(tmpPart, res.body);

    const targetFile = path.join(runDir, 'sources', row.publisher, `${sha256}.pdf`);
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    if (!fs.existsSync(targetFile)) {
      renameWithRetry(tmpPart, targetFile);
    } else {
      try {
        if (fs.existsSync(tmpPart)) fs.unlinkSync(tmpPart);
      } catch {
        // ignore
      }
    }

    const relPath = path.relative(runDir, targetFile).replace(/\\/g, '/');
    let duplicate_of: string | undefined;
    if (docIdBySha.has(sha256)) {
      duplicate_of = docIdBySha.get(sha256);
      duplicatesCount++;
    } else {
      docIdBySha.set(sha256, row.document_id);
      downloadedCount++;
    }

    totalBytes += res.body.length;

    const acqRow: AcquisitionRow = {
      document_id: row.document_id,
      url: row.pdf_url!,
      final_url: res.finalUrl,
      http_status: res.status,
      etag: res.headers['etag'] || null,
      last_modified: res.headers['last-modified'] || null,
      bytes: res.body.length,
      sha256,
      retrieved_at: res.requestedAt,
      path: relPath,
      status: 'ok',
      ...(duplicate_of ? { duplicate_of } : {}),
    };

    appendJsonl(logFile, acqRow);
    latestByDocId.set(row.document_id, acqRow);
  }

  // Calculate min_interval_ms_by_host from new requests made during this run
  const runLog = requestLog.slice(initialLogLength);
  const minIntervals = computeMinIntervalsByHost(runLog.length > 0 ? runLog : requestLog);

  const report: AcquireReport = {
    downloaded: downloadedCount,
    not_modified: notModifiedCount,
    duplicates: duplicatesCount,
    failed: failedCount,
    total_bytes: totalBytes,
    failures,
    min_interval_ms_by_host: minIntervals,
  };

  const reportFile = path.join(runDir, 'reports', 'acquire.json');
  writeJsonAtomic(reportFile, report);

  return report;
}

// CLI entry point
const isMain =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
    fileURLToPath(import.meta.url) === path.resolve(process.argv[1] + '.ts') ||
    process.argv[1].endsWith('acquire.ts'));

if (isMain) {
  const dryRun = process.argv.includes('--dry-run');
  acquireAll({ dryRun })
    .then((report) => {
      console.log('\n--- Acquisition Report ---');
      console.log(JSON.stringify(report, null, 2));
      if (report.failed > 0) {
        console.error(`\n[FATAL] ${report.failed} documents failed to acquire.`);
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n[FATAL] Unhandled acquire error:', err);
      process.exit(1);
    });
}
