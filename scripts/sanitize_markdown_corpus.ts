import fs from 'fs';
import path from 'path';

const MD_DIR = path.join(process.cwd(), '_raw_source_archive', 'manjunath-study-material-md');
const INDEX_FILE = path.join(MD_DIR, 'INDEX.md');

function sanitizeText(content: string): string {
  let text = content;

  // Remove full think blocks
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  text = text.replace(/<\/?think>/gi, '');

  // Remove LLM internal conversational monologue / preamble lines
  const lines = text.split('\n');
  const cleanLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for LLM chatter patterns
    if (
      /^The user wants (me to|to)/i.test(trimmed) ||
      /^I need to (parse|extract|look|examine|transcribe)/i.test(trimmed) ||
      /^\*\*(Image|Page) \d+ Analysis:\*\*/i.test(trimmed) ||
      /^(Wait, I need|Let's look|Looking at the layout|Looking at Image|Option \([a-d]\) in Image)/i.test(trimmed) ||
      /^Scanned (with|by) CamScanner/i.test(trimmed) ||
      /^```$/i.test(trimmed) // stray backticks
    ) {
      continue; // skip preamble line
    }

    cleanLines.push(line);
  }

  text = cleanLines.join('\n');
  // Normalize consecutive blank lines
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim() + '\n';
}

function titleFromFilename(filename: string): string {
  const noExt = filename.replace(/\.md$/i, '');
  return noExt.replace(/^\d+_/, '').trim();
}

function isPastPaper(title: string): boolean {
  return /prelims|paper [ivx]+|solved paper|question paper/i.test(title);
}

function main() {
  if (!fs.existsSync(MD_DIR)) {
    console.error('MD_DIR not found:', MD_DIR);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MD_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'TRIAGE.md' && f !== 'INDEX.md')
    .sort();

  console.log(`Found ${files.length} Markdown files in corpus. Sanitizing and adding Obsidian frontmatter...`);

  const pastPapers: string[] = [];
  const studyGuides: string[] = [];

  for (const file of files) {
    const filePath = path.join(MD_DIR, file);
    let raw = fs.readFileSync(filePath, 'utf-8');
    
    // Strip existing frontmatter if any to rebuild cleanly
    if (raw.startsWith('---\n')) {
      const parts = raw.split('---\n');
      if (parts.length >= 3) {
        raw = parts.slice(2).join('---\n');
      }
    }

    const cleanBody = sanitizeText(raw);
    const title = titleFromFilename(file);
    const category = isPastPaper(title) ? 'past-paper' : 'study-guide';

    const frontmatter = [
      '---',
      `title: "${title.replace(/"/g, "'")}"`,
      'tags:',
      '  - upsc-study-material',
      '  - raw-source',
      `  - ${category}`,
      'type: study-material',
      'status: verified-clean',
      '---',
      '',
      '',
    ].join('\n');

    fs.writeFileSync(filePath, frontmatter + cleanBody, 'utf-8');
    console.log(`[OK] Sanitized & indexed: ${file} (${cleanBody.length} chars)`);

    (category === 'past-paper' ? pastPapers : studyGuides).push(file.replace(/\.md$/i, ''));
  }

  // Write Obsidian Index (Map of Content)
  const linkList = (names: string[]) =>
    names.length ? names.map((n) => `- [[${n}]]`).join('\n') : '_none yet_';

  const index = [
    '---',
    'tags:',
    '  - upsc-study-material',
    '  - raw-source',
    '  - moc',
    'type: index',
    'status: verified-clean',
    '---',
    '',
    '# UPSC Study Material — Obsidian Vault Index',
    '',
    `Curated UPSC Civil Services Study Material & Question Paper Corpus. Total documents: **${files.length}**.`,
    '',
    '## 📚 Official UPSC CSE Prelims Question Papers (PYQs)',
    '',
    linkList(pastPapers),
    '',
    '## 📖 Core Subject Compendiums & Study Guides',
    '',
    linkList(studyGuides),
    '',
  ].join('\n');

  fs.writeFileSync(INDEX_FILE, index, 'utf-8');
  console.log(`\n[SUCCESS] Wrote Obsidian MOC Index: ${INDEX_FILE}`);
  console.log(`- Past Papers indexed: ${pastPapers.length}`);
  console.log(`- Study Guides indexed: ${studyGuides.length}`);
}

main();
