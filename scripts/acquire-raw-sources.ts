import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

const ROOT_DIR = path.join(process.cwd(), '_raw_source_archive');
const MANIFEST_FILE = path.join(ROOT_DIR, 'MANIFEST.md');

const SOURCES = [
  { id: 'upsc-official-portal', folder: 'upsc-official-portal' },
  { id: 'concept-extraction-csv', folder: 'concept-extraction-csv' },
  { id: 'manjunath-study-material', folder: 'manjunath-study-material' },
  { id: 'upsc-json-dumps', folder: 'upsc-json-dumps' },
  { id: 'mrunal-html-vault', folder: 'mrunal-html-vault' },
  { id: 'selfstudyhistory-html-vault', folder: 'selfstudyhistory-html-vault' },
];

const manifestLog: string[] = [];

// Helper: Ensure directory exists
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper: HTTP GET request as Promise
function fetchUrl(url: string, asBuffer = false): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Antigravity-Acquisition-Bot/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, asBuffer).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url} - Status Code: ${res.statusCode}`));
        return;
      }
      
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(asBuffer ? buffer : buffer.toString('utf-8'));
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

async function fetchConceptExtraction() {
  const targetDir = path.join(ROOT_DIR, 'concept-extraction-csv');
  ensureDir(targetDir);
  console.log('[concept-extraction-csv] Fetching repository via GitHub API...');
  
  try {
    const repoApi = 'https://api.github.com/repos/hiranmayikolambe/Concept-Extraction-from-UPSC-Questions/contents/';
    const response = await fetchUrl(repoApi);
    const files = JSON.parse(response);
    let count = 0;
    
    for (const file of files) {
      if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        const fileContent = await fetchUrl(file.download_url, true);
        fs.writeFileSync(path.join(targetDir, file.name), fileContent);
        count++;
      }
    }
    manifestLog.push(`- **concept-extraction-csv**: SUCCESS - Downloaded ${count} CSV/Excel files from hiranmayikolambe repo via API.`);
  } catch (err: any) {
    console.error('[concept-extraction-csv] ERROR:', err.message);
    manifestLog.push(`- **concept-extraction-csv**: FAILED - ${err.message}`);
  }
}

async function fetchManjunath() {
  const targetDir = path.join(ROOT_DIR, 'manjunath-study-material');
  ensureDir(targetDir);
  console.log('[manjunath-study-material] Introspecting repository...');
  
  try {
    const repoApi = 'https://api.github.com/repos/manjunath5496/Books/contents';
    const response = await fetchUrl(repoApi);
    const items = JSON.parse(response);
    
    const relevantFolders = items
      .filter((item: any) => item.type === 'dir' && /upsc|prelims|mains|history|geography|polity/i.test(item.name))
      .map((item: any) => item.name);
      
    if (relevantFolders.length === 0) {
      manifestLog.push(`- **manjunath-study-material**: FAILED - No relevant folders (UPSC/Prelims/Mains) found in top-level directory.`);
      return;
    }
    
    console.log(`[manjunath-study-material] Found relevant folders: ${relevantFolders.join(', ')}`);
    console.log(`[manjunath-study-material] Executing sparse checkout...`);
    
    // Sparse clone
    const tmpDir = path.join(targetDir, 'tmp_clone');
    ensureDir(tmpDir);
    execSync(`git clone --depth=1 --filter=blob:none --no-checkout https://github.com/manjunath5496/Books.git "${tmpDir}"`, { stdio: 'inherit' });
    execSync(`git sparse-checkout set ${relevantFolders.map(f => `"${f}"`).join(' ')}`, { cwd: tmpDir, stdio: 'inherit' });
    execSync(`git checkout`, { cwd: tmpDir, stdio: 'inherit' });
    
    // Move out of tmp_clone and delete .git
    for (const folder of relevantFolders) {
      const src = path.join(tmpDir, folder);
      if (fs.existsSync(src)) {
        fs.cpSync(src, path.join(targetDir, folder), { recursive: true });
      }
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    
    manifestLog.push(`- **manjunath-study-material**: SUCCESS - Sparse checkout completed for folders: ${relevantFolders.join(', ')}`);
  } catch (err: any) {
    console.error('[manjunath-study-material] ERROR:', err.message);
    manifestLog.push(`- **manjunath-study-material**: FAILED - ${err.message}`);
  }
}

async function fetchUpscJsonDumps() {
  const targetDir = path.join(ROOT_DIR, 'upsc-json-dumps');
  ensureDir(targetDir);
  console.log('[upsc-json-dumps] Fetching JSON dumps...');
  
  try {
    const repoApi = 'https://api.github.com/repos/Shabber10/ALL-PYQ-Papers/contents';
    const response = await fetchUrl(repoApi);
    const items = JSON.parse(response);
    
    let count = 0;
    for (const item of items) {
      if (item.name.endsWith('.json') || item.name.endsWith('.csv') || item.name.endsWith('.pdf')) {
        // limit to a few files
        if (count >= 5) break;
        const fileContent = await fetchUrl(item.download_url, true);
        fs.writeFileSync(path.join(targetDir, item.name), fileContent);
        count++;
      }
    }
    
    if (count > 0) {
      manifestLog.push(`- **upsc-json-dumps**: SUCCESS - Downloaded ${count} files from Shabber10/ALL-PYQ-Papers.`);
    } else {
      manifestLog.push(`- **upsc-json-dumps**: FAILED - No JSON/CSV/PDF files found in repo root.`);
    }
  } catch (err: any) {
    console.error('[upsc-json-dumps] ERROR:', err.message);
    manifestLog.push(`- **upsc-json-dumps**: FAILED - ${err.message}`);
  }
}

async function fetchMrunal() {
  const targetDir = path.join(ROOT_DIR, 'mrunal-html-vault');
  ensureDir(targetDir);
  console.log('[mrunal-html-vault] Performing bounded crawl of mrunal.org...');
  
  try {
    const startUrl = 'https://mrunal.org/prelims';
    const html = await fetchUrl(startUrl);
    fs.writeFileSync(path.join(targetDir, 'prelims_home.html'), html);
    
    // Find up to 5 topic links to crawl
    const linksMatch = html.match(/href=["'](https:\/\/mrunal\.org\/[^"']+)["']/g) || [];
    const uniqueLinks = [...new Set(linksMatch.map(l => l.replace(/href=["']|["']/g, '')))]
      .filter(l => l.includes('/prelims') || l.includes('/mains'))
      .slice(0, 10);
      
    let count = 1;
    for (let i = 0; i < uniqueLinks.length; i++) {
      try {
        const linkHtml = await fetchUrl(uniqueLinks[i]);
        fs.writeFileSync(path.join(targetDir, `mrunal_page_${i+1}.html`), linkHtml);
        count++;
      } catch (e) { }
    }
    
    manifestLog.push(`- **mrunal-html-vault**: SUCCESS - Bounded crawl completed. Fetched ${count} pages (Cap: 10).`);
  } catch (err: any) {
    console.error('[mrunal-html-vault] ERROR:', err.message);
    manifestLog.push(`- **mrunal-html-vault**: FAILED - ${err.message}`);
  }
}

async function fetchSelfStudyHistory() {
  const targetDir = path.join(ROOT_DIR, 'selfstudyhistory-html-vault');
  ensureDir(targetDir);
  console.log('[selfstudyhistory-html-vault] Performing bounded crawl of selfstudyhistory.com...');
  
  try {
    const startUrl = 'https://selfstudyhistory.com';
    const html = await fetchUrl(startUrl);
    fs.writeFileSync(path.join(targetDir, 'home.html'), html);
    
    // Find up to 10 links
    const linksMatch = html.match(/href=["'](https:\/\/selfstudyhistory\.com\/[^"']+)["']/g) || [];
    const uniqueLinks = [...new Set(linksMatch.map(l => l.replace(/href=["']|["']/g, '')))]
      .filter(l => !l.includes('wp-content'))
      .slice(0, 10);
      
    let count = 1;
    for (let i = 0; i < uniqueLinks.length; i++) {
      try {
        const linkHtml = await fetchUrl(uniqueLinks[i]);
        fs.writeFileSync(path.join(targetDir, `ssh_page_${i+1}.html`), linkHtml);
        count++;
      } catch (e) { }
    }
    
    manifestLog.push(`- **selfstudyhistory-html-vault**: SUCCESS - Bounded crawl completed. Fetched ${count} pages (Cap: 10).`);
  } catch (err: any) {
    console.error('[selfstudyhistory-html-vault] ERROR:', err.message);
    manifestLog.push(`- **selfstudyhistory-html-vault**: FAILED - ${err.message}`);
  }
}

async function fetchUpscOfficialPortal() {
  const targetDir = path.join(ROOT_DIR, 'upsc-official-portal');
  ensureDir(targetDir);
  console.log('[upsc-official-portal] Fetching from UPSC archives...');
  
  try {
    const startUrl = 'https://www.upsc.gov.in/examinations/previous-question-papers/archives';
    
    // Use curl for fetching HTML to bypass simple node http blocks
    let html = '';
    try {
      html = execSync(`curl -sL "${startUrl}" -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"`).toString('utf-8');
    } catch(e) {
      console.warn('curl failed, trying node fetchUrl');
      html = await fetchUrl(startUrl);
    }
    
    fs.writeFileSync(path.join(targetDir, 'upsc_archives_index.html'), html);
    
    // Simple regex to find PDF links
    const pdfLinksMatch = html.match(/href=["']([^"']+\.pdf)["']/ig) || [];
    const uniquePdfLinks = [...new Set(pdfLinksMatch.map(l => l.replace(/href=["']|["']/g, '')))].slice(0, 5); // cap at 5 PDFs to save bandwidth/time
    
    let count = 0;
    for (let i = 0; i < uniquePdfLinks.length; i++) {
      let pdfUrl = uniquePdfLinks[i];
      if (pdfUrl.startsWith('/')) {
        pdfUrl = 'https://www.upsc.gov.in' + pdfUrl;
      }
      try {
        const pdfContent = await fetchUrl(pdfUrl, true);
        const fileName = pdfUrl.split('/').pop() || `upsc_doc_${i}.pdf`;
        fs.writeFileSync(path.join(targetDir, fileName), pdfContent);
        count++;
      } catch (e: any) {
        console.error(`[upsc-official-portal] Failed to fetch PDF ${pdfUrl}: ${e.message}`);
      }
    }
    
    if (count > 0 || html.length > 0) {
      manifestLog.push(`- **upsc-official-portal**: SUCCESS - Bounded fetch completed. Fetched index and ${count} PDFs (Cap: 5 PDFs).`);
    } else {
      manifestLog.push(`- **upsc-official-portal**: FAILED - Could not extract content from UPSC portal.`);
    }
  } catch (err: any) {
    console.error('[upsc-official-portal] ERROR:', err.message);
    manifestLog.push(`- **upsc-official-portal**: FAILED - ${err.message}`);
  }
}

async function run() {
  ensureDir(ROOT_DIR);
  
  for (const source of SOURCES) {
    ensureDir(path.join(ROOT_DIR, source.folder));
  }
  
  await fetchConceptExtraction();
  await fetchManjunath();
  await fetchUpscJsonDumps();
  await fetchMrunal();
  await fetchSelfStudyHistory();
  await fetchUpscOfficialPortal();
  
  const manifestContent = `# Raw Source Archive Manifest\n\nGenerated at: ${new Date().toISOString()}\n\n## Source Status\n\n${manifestLog.join('\n')}\n`;
  fs.writeFileSync(MANIFEST_FILE, manifestContent);
  
  console.log('\n=== ACQUISITION COMPLETED ===');
  console.log(manifestContent);
}

run().catch(console.error);
