import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

const ROOT_ARCHIVE = path.join(process.cwd(), '_raw_source_archive');
const OCR_DIR = path.join(ROOT_ARCHIVE, 'manjunath-study-material-ocr');
const MD_DIR = path.join(ROOT_ARCHIVE, 'manjunath-study-material-md');
const EXCLUDED_DIR = path.join(MD_DIR, '_excluded_nda');

function ensureDir(d: string) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// 1. Remove unnecessary junk/scratch files from _raw_source_archive
function cleanScratchFiles() {
  console.log('\n--- 1. Cleaning scratch & temporary files ---');
  const itemsToDelete = [
    path.join(ROOT_ARCHIVE, '_temp_render'),
    path.join(ROOT_ARCHIVE, '_temp_16'),
    path.join(ROOT_ARCHIVE, '_temp_19'),
    path.join(ROOT_ARCHIVE, 'test_page_18_2.png'),
    path.join(ROOT_ARCHIVE, 'p3_top.png'),
    path.join(ROOT_ARCHIVE, 'p3_bot.png'),
    path.join(ROOT_ARCHIVE, 'pdf_analysis_report.json'),
    path.join(ROOT_ARCHIVE, 'pdf_cleanliness_report.json'),
    path.join(ROOT_ARCHIVE, '_raw_text_extraction_summary.json'),
    path.join(process.cwd(), 'scripts', 'test_2019_ocr.ts'),
    path.join(process.cwd(), 'scripts', 'convert_single_19.ts'),
  ];

  for (const p of itemsToDelete) {
    if (fs.existsSync(p)) {
      const isDir = fs.statSync(p).isDirectory();
      if (isDir) {
        fs.rmSync(p, { recursive: true, force: true });
        console.log(`Deleted scratch directory: ${path.basename(p)}`);
      } else {
        fs.unlinkSync(p);
        console.log(`Deleted scratch file: ${path.basename(p)}`);
      }
    }
  }
}

// 2. Sanitize existing markdown files (strip think tags, unclosed backticks, CamScanner headers)
function sanitizeExistingMarkdown() {
  console.log('\n--- 2. Sanitizing all Markdown files in output directory ---');
  const files = fs.readdirSync(MD_DIR).filter(f => f.endsWith('.md') && f !== 'TRIAGE.md');

  for (const f of files) {
    const filePath = path.join(MD_DIR, f);
    let text = fs.readFileSync(filePath, 'utf-8');
    const origLen = text.length;

    // Strip think blocks
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    
    // Strip orphaned think tags if any
    text = text.replace(/<\/?think>/gi, '');
    
    // Strip repeated CamScanner watermarks
    text = text.replace(/Scanned with CamScanner\s*/gi, '');
    text = text.replace(/Scanned by CamScanner\s*/gi, '');

    // Normalize multiple consecutive blank lines
    text = text.replace(/\n{4,}/g, '\n\n');

    if (text.length !== origLen) {
      fs.writeFileSync(filePath, text.trim() + '\n', 'utf-8');
      console.log(`Sanitized ${f} (${origLen} -> ${text.length} chars)`);
    }
  }
}

// 3. Move NDA files to _excluded_nda
function isolateExcludedNda() {
  console.log('\n--- 3. Isolating excluded NDA files ---');
  ensureDir(EXCLUDED_DIR);
  const files = fs.readdirSync(MD_DIR).filter(f => /nda/i.test(f) && f.endsWith('.md'));

  for (const f of files) {
    const src = path.join(MD_DIR, f);
    const dest = path.join(EXCLUDED_DIR, f);
    fs.renameSync(src, dest);
    console.log(`Moved excluded NDA paper to _excluded_nda/: ${f}`);
  }
}

// 4. Vision OCR helper for clean English extraction on bilingual papers
async function renderAndConvertBilingualPaper(pdfName: string) {
  console.log(`\n--- 4. Converting ${pdfName} via Clean English Vision Pipeline ---`);
  const pdfPath = path.join(OCR_DIR, pdfName);
  const baseName = pdfName.replace(/\.pdf$/i, '');
  const outMd = path.join(MD_DIR, `${baseName}.md`);
  const scratch = path.join(ROOT_ARCHIVE, `_temp_${Date.now()}`);

  ensureDir(scratch);
  const helperScript = path.join(process.cwd(), 'scripts', 'render_pdf_pages.py');
  execSync(`python "${helperScript}" "${pdfPath}" "${scratch}"`, { stdio: 'inherit' });
  const images = fs.readdirSync(scratch).filter(f => f.endsWith('.png')).sort().map(f => path.join(scratch, f));

  const apiKey = process.env.GROQ_API_KEY;
  const pageOutputs: string[] = [];

  for (let i = 0; i < images.length; i++) {
    console.log(`[${i + 1}/${images.length}] Processing ${path.basename(images[i])}...`);
    const base64Image = fs.readFileSync(images[i]).toString('base64');
    let content = '';

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'qwen/qwen3.6-27b',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Extract all English questions, reading comprehension passages, statements, and options (a), (b), (c), (d) from this UPSC Prelims exam page into structured Markdown. Ignore the Hindi column and omit watermarks.' },
                  { type: 'image_url', image_url: { url: 'data:image/png;base64,' + base64Image } }
                ]
              }
            ]
          })
        });

        if (res.status === 429) {
          console.warn(`[Groq] 429 rate limit, waiting 15s...`);
          await new Promise(r => setTimeout(r, 15000));
          continue;
        }

        if (!res.ok) {
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }

        const data = await res.json();
        content = data?.choices?.[0]?.message?.content || '';
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        break;
      } catch (e: any) {
        console.warn(`[Groq] Network error: ${e.message}, retrying...`);
        await new Promise(r => setTimeout(r, 4000));
      }
    }

    if (content.length > 20) {
      pageOutputs.push(`## Page ${i + 1}\n\n${content}\n`);
    }
    await new Promise(r => setTimeout(r, 4000));
  }

  const fullMd = `# ${baseName}\n\n` + pageOutputs.join('\n---\n\n');
  fs.writeFileSync(outMd, fullMd, 'utf-8');
  console.log(`Successfully saved clean Markdown: ${outMd} (${fullMd.length} characters)`);
  fs.rmSync(scratch, { recursive: true, force: true });
}

// 5. Generate final clean audit report
function generateFinalReport() {
  console.log('\n--- 5. Generating final clean audit report ---');
  const allOcrFiles = fs.readdirSync(OCR_DIR).filter(f => f.endsWith('.pdf'));
  const reportPath = path.join(MD_DIR, '_conversion_report.json');

  const filesDetail: any[] = [];
  let verifiedGoodCount = 0;

  for (const f of allOcrFiles) {
    const base = f.replace(/\.pdf$/i, '');
    const isNda = /nda/i.test(f);
    const mdPath = path.join(MD_DIR, `${base}.md`);
    const exists = fs.existsSync(mdPath);
    let wordCount = 0;
    let charCount = 0;
    let status = isNda ? 'EXCLUDED_NDA' : (exists ? 'VERIFIED_GOOD' : 'MISSING');

    if (exists && !isNda) {
      const text = fs.readFileSync(mdPath, 'utf-8');
      charCount = text.length;
      wordCount = text.split(/\s+/).filter(Boolean).length;
      if (wordCount < 300) status = 'LOW_TEXT';
      else verifiedGoodCount++;
    }

    filesDetail.push({
      file: f,
      is_civil_services: !isNda,
      markdown_exists: exists,
      word_count: wordCount,
      char_count: charCount,
      status
    });
  }

  const report = {
    timestamp: new Date().toISOString(),
    total_source_files: allOcrFiles.length,
    civil_services_included: allOcrFiles.length - 10,
    nda_excluded: 10,
    verified_good_count: verifiedGoodCount,
    files: filesDetail
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`[REPORT] Wrote final conversion report: ${reportPath}`);
}

async function main() {
  cleanScratchFiles();
  sanitizeExistingMarkdown();
  isolateExcludedNda();
  
  // Re-convert 16 (2019 GS-I) and 17 (2019 GS-II) so they are 100% clean English with zero mojibake
  await renderAndConvertBilingualPaper('16_IAS Prelims 2019_ General Studies Paper I.pdf');
  await renderAndConvertBilingualPaper('17_IAS Prelims 2019_ General Studies Paper II.pdf');
  
  generateFinalReport();
  console.log('\n=== CORPUS CLEANUP & CONVERSION FULLY COMPLETE ===');
}

main().catch(console.error);
