import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { REPO_ROOT } from '../../qbank/final/run-dir.js';
import { acquireAll } from '../../qbank/final/acquire.js';
import type { CensusRow } from '../../qbank/final/census.js';
import type { PoliteFetchOptions, PoliteFetchResult } from '../../qbank/final/http.js';

function createTempRunDir(): string {
  const dir = path.join(
    REPO_ROOT,
    '_raw_source_archive',
    'qbank-quality',
    `test-acq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

test('(a) An HTML body served as a PDF -> failed:not_pdf, and no file is written', async () => {
  const tempDir = createTempRunDir();

  const fakeRow: CensusRow = {
    document_id: 'visionias:2020-GS-1:solution:en',
    publisher: 'visionias',
    stage: 'Prelims',
    year: 2020,
    paper: 'GS-1',
    role: 'solution',
    language: 'en',
    title: 'Test Paper',
    listing_url: 'https://example.com/listing',
    landing_url: 'https://example.com/landing',
    pdf_url: 'https://cdn.visionias.in/bad.pdf',
    robots_ok: true,
  };

  const fakeFetcher = async (url: string): Promise<PoliteFetchResult> => {
    return {
      status: 200,
      headers: { 'content-type': 'text/html' },
      body: Buffer.from('<html><body>Not a PDF</body></html>' + ' '.repeat(1100)),
      finalUrl: url,
      requestedAt: new Date().toISOString(),
    };
  };

  const report = await acquireAll({
    runDir: tempDir,
    census: { generated_at: new Date().toISOString(), rows: [fakeRow] },
    fetcher: fakeFetcher,
  });

  assert.equal(report.failed, 1);
  assert.equal(report.downloaded, 0);
  assert.equal(report.failures.length, 1);
  assert.equal(report.failures[0].reason, 'not_pdf');

  // Verify no pdf is written in sources/visionias
  const visionDir = path.join(tempDir, 'sources', 'visionias');
  if (fs.existsSync(visionDir)) {
    const files = fs.readdirSync(visionDir);
    assert.equal(files.length, 0);
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('(b) Two rows returning identical bytes -> one file, and the second row has duplicate_of', async () => {
  const tempDir = createTempRunDir();

  const row1: CensusRow = {
    document_id: 'visionias:2021-GS-1:solution:en',
    publisher: 'visionias',
    stage: 'Prelims',
    year: 2021,
    paper: 'GS-1',
    role: 'solution',
    language: 'en',
    title: 'Paper 1',
    listing_url: 'https://example.com/listing',
    landing_url: 'https://example.com/landing1',
    pdf_url: 'https://cdn.visionias.in/file1.pdf',
    robots_ok: true,
  };

  const row2: CensusRow = {
    document_id: 'visionias:2022-GS-1:solution:en',
    publisher: 'visionias',
    stage: 'Prelims',
    year: 2022,
    paper: 'GS-1',
    role: 'solution',
    language: 'en',
    title: 'Paper 2',
    listing_url: 'https://example.com/listing',
    landing_url: 'https://example.com/landing2',
    pdf_url: 'https://cdn.visionias.in/file2.pdf',
    robots_ok: true,
  };

  const identicalBytes = Buffer.from('%PDF-1.4\nIdentical mock PDF document content\n' + 'X'.repeat(1200));

  const fakeFetcher = async (url: string): Promise<PoliteFetchResult> => {
    return {
      status: 200,
      headers: { 'content-type': 'application/pdf' },
      body: identicalBytes,
      finalUrl: url,
      requestedAt: new Date().toISOString(),
    };
  };

  const report = await acquireAll({
    runDir: tempDir,
    census: { generated_at: new Date().toISOString(), rows: [row1, row2] },
    fetcher: fakeFetcher,
  });

  assert.equal(report.downloaded, 1);
  assert.equal(report.duplicates, 1);
  assert.equal(report.failed, 0);

  const visionDir = path.join(tempDir, 'sources', 'visionias');
  const files = fs.readdirSync(visionDir);
  assert.equal(files.length, 1);

  // Check log for duplicate_of
  const logFile = path.join(tempDir, 'manifest', 'acquisition.jsonl');
  const lines = fs.readFileSync(logFile, 'utf-8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  assert.equal(lines.length, 2);
  const logRow2 = JSON.parse(lines[1]);
  assert.equal(logRow2.duplicate_of, 'visionias:2021-GS-1:solution:en');

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("(c) A rerun with a stored etag -> the fetcher receives If-None-Match, returns 304, row is not_modified, file mtime unchanged", async () => {
  const tempDir = createTempRunDir();

  const row: CensusRow = {
    document_id: 'rau:2023-Essay:paper:bi',
    publisher: 'rau',
    stage: 'Mains',
    year: 2023,
    paper: 'Essay',
    role: 'paper',
    language: 'bi',
    title: 'Rau Essay 2023',
    listing_url: 'https://example.com/listing',
    landing_url: 'https://example.com/landing',
    pdf_url: 'https://compass.rauias.com/essay.pdf',
    robots_ok: true,
  };

  const pdfBytes = Buffer.from('%PDF-1.5\nInitial Rau Essay content\n' + 'Y'.repeat(1200));
  let conditionalSent: PoliteFetchOptions['conditional'] = undefined;

  // Run 1: initial download
  const fetcher1 = async (url: string, opts?: PoliteFetchOptions): Promise<PoliteFetchResult> => {
    conditionalSent = opts?.conditional;
    return {
      status: 200,
      headers: { etag: '"etag-12345"', 'last-modified': 'Wed, 21 Oct 2026 10:00:00 GMT' },
      body: pdfBytes,
      finalUrl: url,
      requestedAt: new Date().toISOString(),
    };
  };

  const rep1 = await acquireAll({
    runDir: tempDir,
    census: { generated_at: new Date().toISOString(), rows: [row] },
    fetcher: fetcher1,
  });
  assert.equal(rep1.downloaded, 1);

  const targetFile = path.join(
    tempDir,
    'sources',
    'rau',
    `${crypto.createHash('sha256').update(pdfBytes).digest('hex')}.pdf`
  );
  assert.ok(fs.existsSync(targetFile));
  const mtime1 = fs.statSync(targetFile).mtimeMs;

  // Run 2: conditional 304
  const fetcher2 = async (url: string, opts?: PoliteFetchOptions): Promise<PoliteFetchResult> => {
    conditionalSent = opts?.conditional;
    assert.equal(opts?.conditional?.etag, '"etag-12345"');
    return {
      status: 304,
      headers: {},
      body: Buffer.alloc(0),
      finalUrl: url,
      requestedAt: new Date().toISOString(),
    };
  };

  const rep2 = await acquireAll({
    runDir: tempDir,
    census: { generated_at: new Date().toISOString(), rows: [row] },
    fetcher: fetcher2,
  });

  assert.equal(rep2.downloaded, 0);
  assert.equal(rep2.not_modified, 1);
  assert.equal(rep2.failed, 0);

  const mtime2 = fs.statSync(targetFile).mtimeMs;
  assert.equal(mtime1, mtime2);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('(d) A rerun returning changed bytes with 200 -> a new SHA-256 file, and previous_sha256 is set', async () => {
  const tempDir = createTempRunDir();

  const row: CensusRow = {
    document_id: 'visionias:2024-GS-1:solution:en',
    publisher: 'visionias',
    stage: 'Prelims',
    year: 2024,
    paper: 'GS-1',
    role: 'solution',
    language: 'en',
    title: 'Paper 2024',
    listing_url: 'https://example.com/listing',
    landing_url: 'https://example.com/landing',
    pdf_url: 'https://cdn.visionias.in/2024.pdf',
    robots_ok: true,
  };

  const bytesV1 = Buffer.from('%PDF-1.4\nVersion 1 bytes\n' + 'A'.repeat(1200));
  const shaV1 = crypto.createHash('sha256').update(bytesV1).digest('hex');

  const bytesV2 = Buffer.from('%PDF-1.4\nVersion 2 updated bytes\n' + 'B'.repeat(1200));
  const shaV2 = crypto.createHash('sha256').update(bytesV2).digest('hex');

  // Run 1
  await acquireAll({
    runDir: tempDir,
    census: { generated_at: new Date().toISOString(), rows: [row] },
    fetcher: async (url) => ({
      status: 200,
      headers: { etag: '"v1"' },
      body: bytesV1,
      finalUrl: url,
      requestedAt: new Date().toISOString(),
    }),
  });

  const fileV1 = path.join(tempDir, 'sources', 'visionias', `${shaV1}.pdf`);
  assert.ok(fs.existsSync(fileV1));

  // Run 2 returning changed bytes
  const rep2 = await acquireAll({
    runDir: tempDir,
    census: { generated_at: new Date().toISOString(), rows: [row] },
    fetcher: async (url) => ({
      status: 200,
      headers: { etag: '"v2"' },
      body: bytesV2,
      finalUrl: url,
      requestedAt: new Date().toISOString(),
    }),
  });

  assert.equal(rep2.downloaded, 1);
  const fileV2 = path.join(tempDir, 'sources', 'visionias', `${shaV2}.pdf`);
  assert.ok(fs.existsSync(fileV2));
  assert.ok(fs.existsSync(fileV1)); // V1 must still exist (immutable bronze)

  const logFile = path.join(tempDir, 'manifest', 'acquisition.jsonl');
  const lines = fs.readFileSync(logFile, 'utf-8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  assert.equal(lines.length, 2);
  const latestLog = JSON.parse(lines[1]);
  assert.equal(latestLog.sha256, shaV2);
  assert.equal(latestLog.previous_sha256, shaV1);

  fs.rmSync(tempDir, { recursive: true, force: true });
});
