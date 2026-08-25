import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const MD_DIR = path.join(process.cwd(), '_raw_source_archive', 'manjunath-study-material-md');
const OCR_DIR = path.join(process.cwd(), '_raw_source_archive', 'manjunath-study-material-ocr');

const WEAK_FILES = [
  { file: '17_IAS Prelims 2019_ General Studies Paper II.md', maxQ: 80 },
  { file: '19_IAS Prelims 2018_ General Studies Paper II.md', maxQ: 80 },
  { file: '20_IAS Prelims 2016_ General Studies Paper I.md', maxQ: 100 },
  { file: '21_IAS Prelims 2016_ General Studies Paper II.md', maxQ: 80 },
  { file: '23_IAS Prelims 2015_ General Studies Paper II.md', maxQ: 80 },
  { file: '25_IAS Prelims 2014_ General Studies Paper II.md', maxQ: 80 },
  { file: '26_IAS Prelims 2014_ General Studies Paper II (X Series).md', maxQ: 80 },
  { file: '28_IAS Prelims 2013_ General Studies Paper II.md', maxQ: 80 },
  { file: '29_IAS Prelims 2012_ General Studies Paper I.md', maxQ: 100 },
  { file: '30_IAS Prelims 2012_ General Studies Paper II.md', maxQ: 80 },
  { file: '31_IAS Prelims 2012_ General Studies Paper II (X Series).md', maxQ: 80 },
  { file: '33_IAS Prelims 2009_ General Studies Paper.md', maxQ: 150 },
];

function getPdfPages(pdfName: string): number {
  const pdfPath = path.join(OCR_DIR, pdfName);
  if (!fs.existsSync(pdfPath)) return 0;
  try {
    const out = execSync(`python -c "import fitz; doc=fitz.open('${pdfPath.replace(/\\/g, '/')}'); print(len(doc))"`, { encoding: 'utf-8' });
    return parseInt(out.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

function auditFile(item: { file: string; maxQ: number }) {
  const mdPath = path.join(MD_DIR, item.file);
  const pdfName = item.file.replace(/\.md$/, '.pdf');
  const content = fs.readFileSync(mdPath, 'utf-8');
  const pdfPages = getPdfPages(pdfName);

  const hasLeakedReasoning = /Analyze the Images|Formulate the Output|The user wants|I need to look|Wait, let me/i.test(content);
  const hasGarbledOcr = /Mauxtmuim|NCOBE|wadtarar|vaftaron|DO MOP|fo\)|fa\)|\\\(a\)|ff\}/i.test(content);
  
  let failureMode = 'other_genuine';
  if (hasLeakedReasoning && hasGarbledOcr) failureMode = 'both';
  else if (hasLeakedReasoning) failureMode = 'leaked_reasoning';
  else if (hasGarbledOcr) failureMode = 'garbled_ocr';

  // Check sample corruption
  const sampleExcerpt = content.split('\n').filter(l => l.trim().length > 10).slice(0, 10).join(' | ').slice(0, 180);

  return {
    file: item.file,
    pdfPages,
    maxQ: item.maxQ,
    hasLeakedReasoning,
    hasGarbledOcr,
    failureMode,
    sampleExcerpt
  };
}

const results = WEAK_FILES.map(auditFile);
console.log(JSON.stringify(results, null, 2));
