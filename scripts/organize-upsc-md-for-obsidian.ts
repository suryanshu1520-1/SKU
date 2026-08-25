// Adds Obsidian-friendly YAML frontmatter to each converted markdown file under
// _raw_source_archive/<MD_DIR_NAME>/, and (re)generates an INDEX.md note linking to all of them.
// Idempotent and safe to re-run as more files land from the docling batch job.
//
// Usage: npx tsx scripts/organize-upsc-md-for-obsidian.ts

import fs from 'fs';
import path from 'path';

// NOTE: still pointing at the manjunath-named folder because it's actively bind-mounted by a
// running docling batch job at the time this was written. Update to 'upsc-study-material-md'
// once that job finishes and the folder is renamed.
const MD_DIR_NAME = 'manjunath-study-material-md';
const MD_DIR = path.join(process.cwd(), '_raw_source_archive', MD_DIR_NAME);
const INDEX_FILE = path.join(MD_DIR, 'INDEX.md');

function titleFromFilename(filename: string): string {
  const noExt = filename.replace(/\.md$/i, '');
  return noExt.replace(/^\d+_/, '').trim();
}

function isPastPaper(title: string): boolean {
  return /prelims|paper [ivx]+|nda exam|solved paper|question paper/i.test(title);
}

function hasFrontmatter(content: string): boolean {
  return content.startsWith('---\n');
}

function run() {
  if (!fs.existsSync(MD_DIR)) {
    console.error(`Not found: ${MD_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MD_DIR)
    .filter((f) => f.toLowerCase().endsWith('.md') && f !== 'INDEX.md')
    .sort();

  const pastPapers: string[] = [];
  const studyGuides: string[] = [];

  for (const file of files) {
    const filePath = path.join(MD_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const title = titleFromFilename(file);
    const category = isPastPaper(title) ? 'past-paper' : 'study-guide';

    if (!hasFrontmatter(content)) {
      const frontmatter = [
        '---',
        `title: "${title.replace(/"/g, "'")}"`,
        'tags:',
        '  - upsc-study-material',
        '  - raw-source',
        `  - ${category}`,
        'type: study-material',
        'status: raw-conversion',
        '---',
        '',
        '',
      ].join('\n');
      fs.writeFileSync(filePath, frontmatter + content);
      console.log(`[frontmatter added] ${file}`);
    } else {
      console.log(`[skip] ${file} (already has frontmatter)`);
    }

    (category === 'past-paper' ? pastPapers : studyGuides).push(file.replace(/\.md$/i, ''));
  }

  const linkList = (names: string[]) =>
    names.length ? names.map((n) => `- [[${n}]]`).join('\n') : '_none yet_';

  const index = [
    '---',
    'tags:',
    '  - upsc-study-material',
    '  - raw-source',
    '  - moc',
    '---',
    '',
    '# UPSC Study Material — Index',
    '',
    `Raw-converted study material (OCR'd PDF → Markdown via Docling). Unprocessed/unreviewed — not yet promoted into the curated [[03_MEMORY/knowledge|Subject Knowledge Vault]]. ${files.length} document(s) converted so far.`,
    '',
    '## Past Papers / PYQs',
    '',
    linkList(pastPapers),
    '',
    '## Study Guides & Reference',
    '',
    linkList(studyGuides),
    '',
  ].join('\n');

  fs.writeFileSync(INDEX_FILE, index);
  console.log(`\nIndex written: ${INDEX_FILE}`);
  console.log(`${pastPapers.length} past papers, ${studyGuides.length} study guides.`);
}

run();
