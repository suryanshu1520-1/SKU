/**
 * Render + vision-OCR a scanned PDF page-by-page into structured JSON.
 *
 * Read-only with respect to sources. Writes only into the run's `renders/`,
 * `extracted/`, and `evidence/` directories. Never touches the master corpus,
 * runtime vault, Exam Hall pool, live tables, or learner results.
 *
 * Usage:
 *   npx tsx scripts/qbank/extract-pages.ts --pdf <path> --out <dir> --mode <paper|key> [--limit N] [--from N] [--force]
 *
 *   --pdf   path to the source PDF (relative to cwd)
 *   --out   run directory (e.g. _raw_source_archive/qbank-quality/pilot-2026-09-24)
 *   --mode  "paper" (question pages) or "key" (answer-key pages)
 *   --limit process at most N pages (default: all)
 *   --from  1-based starting page (default: 1)
 *   --force re-OCR pages that already have an extracted JSON
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const MODEL_FALLBACKS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.6-flash'];

const PAPER_PROMPT = [
  'You are transcribing a scanned page from a UPSC Civil Services Preliminary (General Studies) question paper.',
  'The page contains numbered questions, each with four options (A, B, C, D). Some pages contain a shared instruction or a comprehension passage before the questions.',
  'Transcribe EVERY question on this page into STRICT JSON. Preserve text exactly: spelling, punctuation, negation (NOT / except / incorrect), numbers, units, and the original option order (A, B, C, D).',
  'Do NOT answer the questions. Do NOT invent text you cannot read — mark unreadable words as [unreadable].',
  'Respond with ONLY this JSON shape (no markdown fences, no commentary):',
  '{ "questions": [ { "number": <int>, "english": "<stem>", "options": [ {"key":"a","text":"..."}, {"key":"b","text":"..."}, {"key":"c","text":"..."}, {"key":"d","text":"..."} ], "instructions": "<optional instruction text>" } ] }',
].join('\n');

const KEY_PROMPT = [
  'You are transcribing a scanned UPSC answer-key page. It lists question numbers and their correct answer letters (A/B/C/D), possibly for more than one booklet series.',
  'Extract the complete key into STRICT JSON. Preserve every question number and letter exactly.',
  'If a series is labelled (e.g. "Series A", "Series B"), record it; otherwise use "unknown".',
  'Respond with ONLY this JSON shape (no markdown fences, no commentary):',
  '{ "series": "<A|B|C|D|unknown>", "answers": [ {"number": <int>, "key": "<A|B|C|D>"} ] }',
].join('\n');

interface CliArgs {
  pdf: string;
  out: string;
  mode: 'paper' | 'key';
  limit: number;
  from: number;
  force: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const pdf = get('--pdf');
  const out = get('--out');
  const mode = get('--mode');
  if (!pdf || !out || !mode) {
    console.error('Missing --pdf, --out, or --mode. See header comment.');
    process.exit(1);
  }
  if (mode !== 'paper' && mode !== 'key') {
    console.error('--mode must be "paper" or "key"');
    process.exit(1);
  }
  return {
    pdf,
    out,
    mode,
    limit: get('--limit') ? parseInt(get('--limit')!, 10) : Infinity,
    from: get('--from') ? parseInt(get('--from')!, 10) : 1,
    force: argv.includes('--force'),
  };
}

function ensureDir(d: string) {
  fs.mkdirSync(d, { recursive: true });
}

function sha256(buf: Buffer): string {
  return require('crypto').createHash('sha256').update(buf).digest('hex');
}

function renderPages(pdfPath: string, rendersDir: string): string[] {
  ensureDir(rendersDir);
  const helper = path.join(process.cwd(), 'scripts', 'render_pdf_pages.py');
  execSync(`python "${helper}" "${pdfPath}" "${rendersDir}"`, { stdio: 'inherit' });
  return fs.readdirSync(rendersDir).filter((f) => f.endsWith('.png')).sort();
}

function extractJson(text: string): any {
  // Strip code fences and any prose around the JSON object.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no JSON object in response');
  return JSON.parse(text.slice(start, end + 1));
}

async function ocrPage(ai: GoogleGenAI, imgPath: string, prompt: string): Promise<{ text: string; model: string }> {
  const b64 = fs.readFileSync(imgPath).toString('base64');
  let lastErr = '';
  for (const model of MODEL_FALLBACKS) {
    try {
      const res: any = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/png', data: b64 } },
              { text: prompt },
            ],
          },
        ],
      });
      const text = typeof res?.text === 'string' ? res.text : String(res?.text ?? '');
      if (text.trim().length > 30) return { text: text.trim(), model };
    } catch (e: any) {
      lastErr = e?.message ?? String(e);
    }
  }
  throw new Error(`all models failed: ${lastErr}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required');

  const pdfName = path.basename(args.pdf).replace(/\.pdf$/i, '');
  const rendersDir = path.join(args.out, 'renders', pdfName);
  const extractedDir = path.join(args.out, 'extracted', pdfName);
  const evidencePath = path.join(args.out, 'evidence', `${pdfName}.pages.json`);
  ensureDir(extractedDir);
  ensureDir(path.dirname(evidencePath));

  const prompt = args.mode === 'key' ? KEY_PROMPT : PAPER_PROMPT;
  const ai = new GoogleGenAI({ apiKey });

  const renders = renderPages(args.pdf, rendersDir);
  const total = renders.length;
  const from = Math.max(1, args.from);
  const to = Math.min(total, from - 1 + args.limit);

  const evidence = fs.existsSync(evidencePath) ? JSON.parse(fs.readFileSync(evidencePath, 'utf8')) : { pages: [] };
  const byPage = new Map(evidence.pages.map((p: any) => [p.page, p]));

  const started = Date.now();
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (let p = from; p <= to; p++) {
    const pageNo = p;
    const outPath = path.join(extractedDir, `page_${String(pageNo).padStart(3, '0')}.json`);
    if (fs.existsSync(outPath) && !args.force) {
      console.log(`[skip] page ${pageNo} (already extracted)`);
      skipped++;
      continue;
    }
    const img = path.join(rendersDir, `page_${String(pageNo).padStart(3, '0')}.png`);
    if (!fs.existsSync(img)) {
      console.error(`[fail] page ${pageNo}: missing render ${img}`);
      failed++;
      continue;
    }
    try {
      const { text, model } = await ocrPage(ai, img, prompt);
      const parsed = extractJson(text);
      const rec = {
        page: pageNo,
        mode: args.mode,
        model,
        extracted_at: new Date().toISOString(),
        raw: text,
        parsed,
      };
      fs.writeFileSync(outPath, JSON.stringify(rec, null, 2), 'utf8');
      byPage.set(pageNo, {
        page: pageNo,
        model,
        extracted_at: rec.extracted_at,
        ok: true,
        bytes: Buffer.byteLength(text, 'utf8'),
      });
      console.log(`[ok] page ${pageNo} (${model}, ${Buffer.byteLength(text, 'utf8')} bytes)`);
      ok++;
    } catch (e: any) {
      byPage.set(pageNo, { page: pageNo, extracted_at: new Date().toISOString(), ok: false, error: e.message });
      console.error(`[fail] page ${pageNo}: ${e.message}`);
      failed++;
    }
  }

  evidence.pages = [...byPage.values()].sort((a: any, b: any) => a.page - b.page);
  evidence.pdf = args.pdf;
  evidence.mode = args.mode;
  evidence.total_pages = total;
  evidence.updated_at = new Date().toISOString();
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));

  console.log(`\n=== EXTRACT ${args.mode} ${pdfName} === ok=${ok} skipped=${skipped} failed=${failed} (pages ${from}-${to} of ${total}) elapsed=${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

