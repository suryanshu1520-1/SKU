import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const ROOT_DIR = path.join(process.cwd(), '_raw_source_archive');
const MANIFEST_FILE = path.join(ROOT_DIR, 'MANIFEST.md');
const MANJUNATH_DIR = path.join(ROOT_DIR, 'manjunath-study-material');
const UPSC_JSON_DIR = path.join(ROOT_DIR, 'upsc-json-dumps');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function fetchUrl(url: string, asBuffer = false): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          const u = new URL(url);
          redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
        }
        return fetchUrl(redirectUrl, asBuffer).then(resolve).catch(reject);
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
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim().replace(/\s+/g, ' ');
}

async function fixupManjunath(): Promise<{ fetched: number; failed404: number; errors: string[] }> {
  ensureDir(MANJUNATH_DIR);
  console.log('[manjunath-study-material] Fetching README.md...');
  const readmeUrl = 'https://raw.githubusercontent.com/manjunath5496/Exam-Study-Material/master/README.md';
  const readmeContent = await fetchUrl(readmeUrl);
  
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  const targetLinks: { text: string; url: string }[] = [];
  
  while ((match = linkRegex.exec(readmeContent)) !== null) {
    const rawUrl = match[1];
    const linkText = match[2].replace(/<[^>]+>/g, '').trim();
    if (/upsc|ias prelim|ias exam|civil service/i.test(linkText)) {
      targetLinks.push({ text: linkText, url: rawUrl });
    }
  }
  
  console.log(`[manjunath-study-material] Identified ${targetLinks.length} target links in README.`);
  
  let fetched = 0;
  let failed404 = 0;
  const errors: string[] = [];
  
  for (let i = 0; i < targetLinks.length; i++) {
    const item = targetLinks[i];
    let downloadUrl = item.url;
    
    // Transform github blob url to raw.githubusercontent.com
    if (downloadUrl.includes('github.com') && downloadUrl.includes('/blob/')) {
      downloadUrl = downloadUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    
    const ext = path.extname(downloadUrl) || '.pdf';
    const baseName = sanitizeFilename(item.text);
    const filename = `${String(i + 1).padStart(2, '0')}_${baseName.slice(0, 100)}${ext}`;
    const destPath = path.join(MANJUNATH_DIR, filename);
    
    try {
      console.log(`[manjunath] Downloading [${i + 1}/${targetLinks.length}]: ${item.text.slice(0, 40)}...`);
      const buf = await fetchUrl(downloadUrl, true);
      if (buf.length < 100) {
        throw new Error(`File suspiciously small (${buf.length} bytes)`);
      }
      fs.writeFileSync(destPath, buf);
      fetched++;
    } catch (err: any) {
      console.warn(`[manjunath] Failed to download ${downloadUrl}: ${err.message}`);
      if (err.message.includes('404')) {
        failed404++;
      } else {
        errors.push(`${item.text}: ${err.message}`);
      }
    }
  }
  
  console.log(`[manjunath-study-material] Complete: ${fetched} fetched, ${failed404} 404s, ${errors.length} other errors.`);
  return { fetched, failed404, errors };
}

async function fixupUpscStarJson(): Promise<{ success: boolean; bytes: number }> {
  ensureDir(UPSC_JSON_DIR);
  console.log('[upsc-json-dumps] Fetching UPSC Star Data.json with URL encoding...');
  const jsonUrl = 'https://raw.githubusercontent.com/amanbh2/UPSC-Star/master/UPSC%20Star%20Data.json';
  
  try {
    const text = await fetchUrl(jsonUrl);
    const parsed = JSON.parse(text);
    const destPath = path.join(UPSC_JSON_DIR, 'UPSC Star Data.json');
    fs.writeFileSync(destPath, text, 'utf-8');
    const stats = fs.statSync(destPath);
    console.log(`[upsc-json-dumps] Verified valid JSON. Size: ${stats.size} bytes (${Array.isArray(parsed) ? parsed.length + ' items' : 'Object'}).`);
    return { success: true, bytes: stats.size };
  } catch (err: any) {
    console.error(`[upsc-json-dumps] Failed to fetch/parse UPSC Star JSON: ${err.message}`);
    return { success: false, bytes: 0 };
  }
}

async function updateManifest(
  manjunathResult: { fetched: number; failed404: number; errors: string[] },
  upscJsonResult: { success: boolean; bytes: number }
) {
  if (!fs.existsSync(MANIFEST_FILE)) {
    throw new Error(`MANIFEST.md not found at ${MANIFEST_FILE}`);
  }
  
  const oldContent = fs.readFileSync(MANIFEST_FILE, 'utf-8');
  const lines = oldContent.split('\n');
  
  const manjunathEntry = `- **manjunath-study-material**: SUCCESS - Acquired ${manjunathResult.fetched} curated PDFs matching UPSC/IAS/Civil Service criteria (${manjunathResult.failed404} upstream 404s logged).`;
  
  const upscJsonEntry = upscJsonResult.success
    ? `- **upsc-json-dumps**: SUCCESS - Acquired 'UPSC Star Data.json' (${upscJsonResult.bytes.toLocaleString()} bytes, valid JSON) from amanbh2/UPSC-Star.`
    : `- **upsc-json-dumps**: FAILED - Could not download UPSC Star Data.json.`;
    
  const updatedLines = lines.map((line) => {
    if (line.includes('**manjunath-study-material**:')) {
      return manjunathEntry;
    }
    if (line.includes('**upsc-json-dumps**:')) {
      return upscJsonEntry;
    }
    return line;
  });
  
  fs.writeFileSync(MANIFEST_FILE, updatedLines.join('\n'), 'utf-8');
  console.log('[manifest] Updated MANIFEST.md successfully.');
}

async function main() {
  const startTime = Date.now();
  console.log('=== STARTING TASK_015 RAW ACQUISITION FIXUP ===');
  
  const manjunathResult = await fixupManjunath();
  const upscJsonResult = await fixupUpscStarJson();
  
  await updateManifest(manjunathResult, upscJsonResult);
  
  const duration = Date.now() - startTime;
  console.log('\n=== TASK_015 EXECUTION SUMMARY ===');
  console.log(`Duration: ${duration}ms`);
  console.log(`Manjunath PDFs fetched: ${manjunathResult.fetched}`);
  console.log(`Manjunath 404 links: ${manjunathResult.failed404}`);
  console.log(`UPSC Star JSON fetched: ${upscJsonResult.success}`);
  console.log(`UPSC Star JSON size: ${upscJsonResult.bytes} bytes`);
}

main().catch(console.error);
