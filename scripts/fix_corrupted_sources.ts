import fs from 'fs';
import path from 'path';

const MD_DIR = path.join(process.cwd(), '_raw_source_archive', 'manjunath-study-material-md');

function fixCorruptedSourceFiles() {
  const filesToFix = [
    '17_IAS Prelims 2019_ General Studies Paper II.md',
    '19_IAS Prelims 2018_ General Studies Paper II.md',
    '20_IAS Prelims 2016_ General Studies Paper I.md',
    '21_IAS Prelims 2016_ General Studies Paper II.md',
    '23_IAS Prelims 2015_ General Studies Paper II.md',
    '29_IAS Prelims 2012_ General Studies Paper I.md',
    '30_IAS Prelims 2012_ General Studies Paper II.md',
    '31_IAS Prelims 2012_ General Studies Paper II (X Series).md',
    '33_IAS Prelims 2009_ General Studies Paper.md'
  ];

  for (const filename of filesToFix) {
    const filePath = path.join(MD_DIR, filename);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf-8');
    const origLen = content.length;

    // 1. Specific fix for file 19 (leaked model reasoning)
    if (filename.includes('19_IAS Prelims 2018')) {
      content = content.replace(/1\.\s+\*\*Analyze the Images:\*\*[\s\S]*?2\.\s+\*\*Formulate the Output:\*\*[\s\S]*?(?=---|## Page 2)/i, '## Instructions\n\nOfficial UPSC CSAT General Studies Paper II Examination Booklet.\n\n');
      content = content.replace(/Analyze the Images[^\n]*/gi, '');
      content = content.replace(/Formulate the Output[^\n]*/gi, '');
    }

    // 2. Specific fix for file 30 & 31 (character corruption)
    content = content.replace(/Mauxtmuim Marks/gi, 'Maximum Marks');
    content = content.replace(/PAPER\s*-\s*TI\./gi, 'PAPER - II.');
    content = content.replace(/#NCOBE/gi, 'ENCODE');
    content = content.replace(/DO MOP\s*«rite\s*aaything/gi, 'DO NOT write anything');
    content = content.replace(/edueatien must be respected jin itself/gi, 'education must be respected in itself');
    content = content.replace(/adjoutiment\.\s*motion/gi, 'adjournment motion');
    content = content.replace(/—_—_a ww/gi, '');

    // 3. Option bracket normalization across all corrupted files
    // Fix fa) -> (a), fb) -> (b), fo) -> (c), (o) -> (c), etc.
    content = content.replace(/(?:^|\n|\s)fa\)\s*/g, '\n(a) ');
    content = content.replace(/(?:^|\n|\s)fb\)\s*/g, '\n(b) ');
    content = content.replace(/(?:^|\n|\s)fc\)\s*/g, '\n(c) ');
    content = content.replace(/(?:^|\n|\s)fd\)\s*/g, '\n(d) ');
    content = content.replace(/(?:^|\n|\s)fo\)\s*/g, '\n(c) ');
    content = content.replace(/(?:^|\n|\s)\(o\)\s*/g, '\n(c) ');
    content = content.replace(/(?:^|\n|\s)\(®\)\s*/g, '\n(b) ');
    content = content.replace(/(?:^|\n|\s)\{a\}\s*/g, '\n(a) ');
    content = content.replace(/(?:^|\n|\s)\{b\}\s*/g, '\n(b) ');
    content = content.replace(/(?:^|\n|\s)\{c\}\s*/g, '\n(c) ');
    content = content.replace(/(?:^|\n|\s)\{d\}\s*/g, '\n(d) ');
    content = content.replace(/(?:^|\n|\s)\{é\}\s*/g, '\n(c) ');
    content = content.replace(/(?:^|\n|\s)if\}\s*/g, '\n(b) ');
    content = content.replace(/(?:^|\n|\s)jt\s*/g, '\n(b) ');

    // 4. Remove standalone Devanagari KrutiDev noise lines
    const lines = content.split('\n');
    const cleanLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip pure KrutiDev mojibake lines
      if (/^(wadtarar|vaftaron|gfetrent|HyRRA|crften|Srren|tah|gyfer|aifemtfa|sReDe)\b/i.test(trimmed)) {
        continue;
      }
      if (/^[a-zA-Z\s]{1,4}[\u0900-\u097F]{4,}/.test(trimmed) && !trimmed.includes('##') && !trimmed.includes('(')) {
        continue;
      }
      cleanLines.push(line);
    }
    content = cleanLines.join('\n');

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`[FIXED] ${filename} (${origLen} -> ${content.length} chars)`);
  }
}

fixCorruptedSourceFiles();
console.log('All corrupted source files sanitized.');
