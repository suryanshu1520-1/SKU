// Batch OCR for _raw_source_archive/upsc-study-material-raw/ via the jbarlow83/ocrmypdf Docker image.
// Reads raw scanned PDFs, writes searchable copies to a sibling *-ocr/ folder. Never touches the originals.
//
// Prereqs: Docker Desktop running (`docker ps` must succeed) and the image pulled:
//   docker pull jbarlow83/ocrmypdf
//
// Usage:
//   npx tsx scripts/ocr-batch-upsc-study-material.ts            (process all PDFs, skip ones already OCR'd)
//   npx tsx scripts/ocr-batch-upsc-study-material.ts --force     (re-OCR everything, overwrite existing output)
//   npx tsx scripts/ocr-batch-upsc-study-material.ts --limit=1   (process only the first N found, for smoke-testing)

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SRC_DIR = path.join(process.cwd(), '_raw_source_archive', 'upsc-study-material-raw');
const OUT_DIR = path.join(process.cwd(), '_raw_source_archive', 'upsc-study-material-ocr');
const MANIFEST_FILE = path.join(OUT_DIR, 'OCR_MANIFEST.md');
const IMAGE = 'jbarlow83/ocrmypdf';

const force = process.argv.includes('--force');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function checkDocker() {
  try {
    execSync('docker ps', { stdio: 'pipe' });
  } catch {
    console.error('Docker daemon is not reachable. Start Docker Desktop and retry.');
    process.exit(1);
  }
}

function toDockerPath(winPath: string): string {
  // Docker Desktop on Windows accepts native paths as volume sources; forward-slash them for safety.
  return winPath.replace(/\\/g, '/');
}

// Recursively find PDFs under SRC_DIR, returning paths relative to SRC_DIR (forward-slashed).
// Needed because extracted archives (e.g. the old #13 .rar, now unpacked into "22 Years CSAT/")
// land as subfolders, not flat files.
function findPdfsRecursive(dir: string, base: string = dir): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPdfsRecursive(fullPath, base));
    } else if (/\.pdf$/i.test(entry.name)) {
      results.push(path.relative(base, fullPath).replace(/\\/g, '/'));
    }
  }
  return results;
}

async function run() {
  checkDocker();
  ensureDir(OUT_DIR);

  const allFiles = findPdfsRecursive(SRC_DIR);
  const files = limit ? allFiles.slice(0, limit) : allFiles;
  console.log(`Found ${allFiles.length} PDFs under upsc-study-material-raw/ (recursive; non-PDF files like .rar are skipped).`);
  if (limit) console.log(`--limit=${limit} set: processing only ${files.length} of them.`);

  const log: string[] = [];
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const outPath = path.join(OUT_DIR, file);
    ensureDir(path.dirname(outPath));

    if (!force && fs.existsSync(outPath)) {
      console.log(`[skip] ${file} (already OCR'd, use --force to redo)`);
      skipped++;
      continue;
    }

    console.log(`[ocr] ${file}`);
    const cmd = [
      'docker run --rm',
      `-v "${toDockerPath(SRC_DIR)}:/input:ro"`,
      `-v "${toDockerPath(OUT_DIR)}:/output"`,
      IMAGE,
      '--skip-text',       // don't re-OCR pages that already have a text layer
      '--output-type pdf', // plain searchable PDF; skip PDF/A (Ghostscript pass bloats already-text files for no benefit)
      '--optimize 1',      // light optimization; skip 3 for batch speed
      '--jobs 4',          // Tesseract threads per file
      `"/input/${file}"`,
      `"/output/${file}"`,
    ].join(' ');

    try {
      execSync(cmd, { stdio: 'inherit' });
      ok++;
      log.push(`- **${file}**: SUCCESS`);
    } catch (err: any) {
      failed++;
      log.push(`- **${file}**: FAILED - ${err.message?.split('\n')[0] ?? 'unknown error'}`);
      console.error(`[fail] ${file}: ${err.message?.split('\n')[0]}`);
    }
  }

  const manifest = [
    '# OCR Batch Manifest — upsc-study-material',
    '',
    `Generated at: ${new Date().toISOString()}`,
    `Total PDFs found: ${files.length} | OCR'd: ${ok} | Skipped (already done): ${skipped} | Failed: ${failed}`,
    '',
    '## Per-file status',
    '',
    ...log,
  ].join('\n');

  fs.writeFileSync(MANIFEST_FILE, manifest);
  console.log(`\n=== OCR BATCH COMPLETE === ok=${ok} skipped=${skipped} failed=${failed}`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
