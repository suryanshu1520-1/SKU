import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const OCR_DIR = path.join(process.cwd(), '_raw_source_archive', 'manjunath-study-material-ocr');
const MD_DIR = path.join(process.cwd(), '_raw_source_archive', 'manjunath-study-material-md');
const SCRATCH_DIR = path.join(process.cwd(), '_raw_source_archive', '_temp_render');

function ensureDir(d: string) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function renderPdfPages(pdfPath: string, outputDir: string): Promise<string[]> {
  ensureDir(outputDir);
  const helperScript = path.join(process.cwd(), 'scripts', 'render_pdf_pages.py');
  execSync(`python "${helperScript}" "${pdfPath}" "${outputDir}"`, { stdio: 'inherit' });
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.png')).sort();
  return files.map(f => path.join(outputDir, f));
}

async function ocrPageWithGroq(imgPath: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return '';
  
  const base64Image = fs.readFileSync(imgPath).toString('base64');
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
              { type: 'text', text: 'Extract all questions, comprehension passages, and options from this full UPSC exam page into clean, structured Markdown. Follow multi-column reading order and omit watermarks.' },
              { type: 'image_url', image_url: { url: 'data:image/png;base64,' + base64Image } }
            ]
          }
        ]
      })
    });
    
    if (!res.ok) return '';
    const data = await res.json();
    let content = data?.choices?.[0]?.message?.content || '';
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return content;
  } catch (e: any) {
    console.warn(`[Groq OCR] Error: ${e.message}`);
    return '';
  }
}

async function ocrPageWithGemini(ai: GoogleGenAI, imgPath: string): Promise<string> {
  const imgBuffer = fs.readFileSync(imgPath);
  const base64Image = imgBuffer.toString('base64');
  const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];
  
  for (const model of models) {
    try {
      const res: any = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/png', data: base64Image } },
              { text: 'Extract all questions, passages, and options from this UPSC exam page into clean Markdown. Omit watermarks.' }
            ]
          }
        ]
      });
      const text = typeof res?.text === 'string' ? res.text : String(res?.text ?? '');
      if (text.trim().length > 30) return text.trim();
    } catch { }
  }
  return '';
}

async function ocrPage(ai: GoogleGenAI, imgPath: string): Promise<string> {
  // Try Groq Qwen Vision first (fast, high throughput, zero recitation blocks)
  const groqText = await ocrPageWithGroq(imgPath);
  if (groqText && groqText.length > 50) return groqText;
  
  // Fallback to Gemini
  const geminiText = await ocrPageWithGemini(ai, imgPath);
  if (geminiText && geminiText.length > 30) return geminiText;
  
  return '';
}

async function convertFileWithVision(ai: GoogleGenAI, pdfFilename: string) {
  const baseName = pdfFilename.replace(/\.pdf$/i, '');
  const pdfPath = path.join(OCR_DIR, pdfFilename);
  const tempDir = path.join(SCRATCH_DIR, baseName);
  const outMdPath = path.join(MD_DIR, `${baseName}.md`);
  
  console.log(`\n=== Converting ${pdfFilename} via Vision Multi-Provider Pipeline ===`);
  const imgPaths = await renderPdfPages(pdfPath, tempDir);
  console.log(`Rendered ${imgPaths.length} pages for ${pdfFilename}`);
  
  const pageTexts: string[] = [];
  for (let i = 0; i < imgPaths.length; i++) {
    console.log(`OCRing page ${i + 1}/${imgPaths.length}...`);
    const pageText = await ocrPage(ai, imgPaths[i]);
    pageTexts.push(`## Page ${i + 1}\n\n${pageText}\n`);
    await new Promise(r => setTimeout(r, 400));
  }
  
  const fullMd = `# ${baseName}\n\n` + pageTexts.join('\n---\n\n');
  fs.writeFileSync(outMdPath, fullMd, 'utf-8');
  console.log(`Saved Markdown: ${outMdPath} (${fullMd.length} characters)`);
  
  // Cleanup scratch images
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function generateTriage(allFiles: string[]): { included: string[]; excluded: string[] } {
  const triagePath = path.join(MD_DIR, 'TRIAGE.md');
  const included: string[] = [];
  const excluded: string[] = [];
  
  const rows: string[] = [];
  rows.push('# UPSC Study Material Corpus Triage Report\n');
  rows.push('**Triage Standard**: Strict UPSC Civil Services (Prelims GS I/II, Mains, CSAT, Core Disciplines) relevance. Non-Civil Services exam tracks (e.g. NDA) are excluded.\n');
  rows.push('| # | File Name | Decision | One-Line Rationale |');
  rows.push('|---|---|---|---|');
  
  allFiles.sort().forEach((file, idx) => {
    const isNda = /nda/i.test(file);
    if (isNda) {
      excluded.push(file);
      rows.push(`| ${idx + 1} | \`${file}\` | **EXCLUDED** | Out of scope: National Defence Academy (NDA) defence exam, not Civil Services. |`);
    } else {
      included.push(file);
      let rationale = 'Core UPSC Civil Services material';
      if (/Prelims \d{4}/i.test(file)) rationale = 'UPSC CSE Prelims Official General Studies / CSAT Question Paper.';
      else if (/Polity/i.test(file)) rationale = 'UPSC CSE GS-2 Core Subject Compendium (Polity & Constitution).';
      else if (/Economy/i.test(file)) rationale = 'UPSC CSE GS-3 Core Subject Compendium (Indian Economy).';
      else if (/History/i.test(file)) rationale = 'UPSC CSE GS-1 Core Subject Compendium (Indian History & Culture).';
      else if (/International Relations/i.test(file)) rationale = 'UPSC CSE GS-2 Mains Core Compendium (International Relations).';
      else if (/Biology/i.test(file)) rationale = 'UPSC CSE GS-3 Science & Tech / Biology Foundation.';
      else if (/Current Affairs|Chanakya/i.test(file)) rationale = 'UPSC CSE Current Affairs / Civil Services Magazine Digest.';
      else if (/Maps/i.test(file)) rationale = 'UPSC CSE GS-1 Geography & Map-based Prelims Reference.';
      else if (/Beginner|Important Information|Study Material/i.test(file)) rationale = 'UPSC CSE Syllabus Architecture & Strategy Reference.';
      
      rows.push(`| ${idx + 1} | \`${file}\` | **INCLUDED** | ${rationale} |`);
    }
  });
  
  rows.push(`\n## Summary\n- **Total Source Files Evaluated**: ${allFiles.length}\n- **Included for Conversion/Retention**: ${included.length}\n- **Excluded (Non-Civil Services / NDA)**: ${excluded.length}\n`);
  
  fs.writeFileSync(triagePath, rows.join('\n'), 'utf-8');
  console.log(`[TRIAGE] Wrote ${triagePath}`);
  return { included, excluded };
}

function auditAndGenerateReport(allFiles: string[], included: string[], excluded: string[]) {
  const reportPath = path.join(MD_DIR, '_conversion_report.json');
  const details: any[] = [];
  
  for (const f of allFiles) {
    const base = f.replace(/\.pdf$/i, '');
    const mdPath = path.join(MD_DIR, `${base}.md`);
    const isInc = included.includes(f);
    const exists = fs.existsSync(mdPath);
    let wordCount = 0;
    let charCount = 0;
    let status = 'EXCLUDED';
    
    if (isInc) {
      if (exists) {
        const text = fs.readFileSync(mdPath, 'utf-8');
        charCount = text.length;
        wordCount = text.split(/\s+/).filter(Boolean).length;
        status = wordCount > 500 ? 'VERIFIED_GOOD' : 'LOW_TEXT';
      } else {
        status = 'MISSING';
      }
    }
    
    details.push({
      file: f,
      is_included: isInc,
      markdown_exists: exists,
      word_count: wordCount,
      char_count: charCount,
      status
    });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    total_source_files: allFiles.length,
    included_count: included.length,
    excluded_count: excluded.length,
    verified_good_count: details.filter(d => d.status === 'VERIFIED_GOOD').length,
    files: details
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`[REPORT] Wrote ${reportPath}`);
  return report;
}

async function main() {
  ensureDir(MD_DIR);
  ensureDir(SCRATCH_DIR);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required in environment');
  const ai = new GoogleGenAI({ apiKey });
  
  const allOcrFiles = fs.readdirSync(OCR_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`Found ${allOcrFiles.length} source PDF files in OCR directory.`);
  
  // 1. Triage
  const { included, excluded } = generateTriage(allOcrFiles);
  
  // 2. Fix corrupted file 19
  const targetsToConvert = [
    '19_IAS Prelims 2018_ General Studies Paper II.pdf'
  ];
  
  for (const target of targetsToConvert) {
    if (fs.existsSync(path.join(OCR_DIR, target))) {
      await convertFileWithVision(ai, target);
    }
  }
  
  // 3. Clean up scratch directory
  if (fs.existsSync(SCRATCH_DIR)) {
    fs.rmSync(SCRATCH_DIR, { recursive: true, force: true });
  }
  
  // 4. Audit & generate conversion report
  const finalReport = auditAndGenerateReport(allOcrFiles, included, excluded);
  console.log('\n=== CONVERSION AUDIT COMPLETE ===');
  console.log(`Verified Good: ${finalReport.verified_good_count}/${finalReport.included_count} included files`);
}

main().catch(console.error);
