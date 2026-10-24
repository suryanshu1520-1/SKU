import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import {
  assertRunDirSafe,
  getRunDir,
  REPO_ROOT,
  RunDirNotIgnoredError,
} from '../../qbank/final/run-dir.js';
import {
  isAllowedByRules,
  parseRobotsTxt,
  politeFetch,
  requestLog,
  resetHttpState,
} from '../../qbank/final/http.js';
import {
  classifyRauPaper,
  extractVisionPdfUrl,
  parseVisionCard,
} from '../../qbank/final/census.js';

test('(a) VisionIAS card parsing: GS, CSAT, Mains Essay and GS Paper II/III, and a Hindi skip', () => {
  // GS-1
  const gs1Card = `
    UPSC GS Paper I Question Paper 2026 with Answer Key
    Year 2026
    ENGLISH
    Prelims
  `;
  const gs1 = parseVisionCard(gs1Card, 'prelims_sol');
  assert.equal(gs1.year, 2026);
  assert.equal(gs1.paper, 'GS-1');
  assert.equal(gs1.stage, 'Prelims');
  assert.equal(gs1.lang, 'en');

  // CSAT (GS-2)
  const csatCard = `
    CSAT Question Paper 2024
    Year 2024
    ENGLISH
    Prelims
  `;
  const csat = parseVisionCard(csatCard, 'prelims_sol');
  assert.equal(csat.year, 2024);
  assert.equal(csat.paper, 'GS-2');
  assert.equal(csat.stage, 'Prelims');
  assert.equal(csat.lang, 'en');

  // Mains Essay
  const essayCard = `
    UPSC Mains Essay Paper 2024
    Year 2024
    ENGLISH
    Mains
  `;
  const essay = parseVisionCard(essayCard, 'mains_sol');
  assert.equal(essay.year, 2024);
  assert.equal(essay.paper, 'Essay');
  assert.equal(essay.stage, 'Mains');

  // Mains GS Paper II & III
  const gs2Card = `
    UPSC Mains GS Paper II 2024
    Year 2024
    ENGLISH
    Mains
  `;
  const gs2 = parseVisionCard(gs2Card, 'mains_sol');
  assert.equal(gs2.paper, 'GS-M2');

  const gs3Card = `
    UPSC Mains GS Paper III 2024
    Year 2024
    ENGLISH
    Mains
  `;
  const gs3 = parseVisionCard(gs3Card, 'mains_sol');
  assert.equal(gs3.paper, 'GS-M3');

  // Hindi skip
  const hindiCard = `
    UPSC Mains GS Paper I 2024 Hindi
    Year 2024
    HINDI
    Mains
  `;
  const hindi = parseVisionCard(hindiCard, 'mains_sol');
  assert.equal(hindi.lang, 'hi');
});

test('(b) Script holding commented-out url followed by active const pdfPath yields new.pdf', () => {
  const html = `
    <html>
      <head>
        <script>
          //const url = 'https://cdn.visionias.in/x/old.pdf';
          const pdfPath = 'https://cdn.visionias.in/value_added_material/new.pdf'
          console.log(pdfPath);
        </script>
      </head>
    </html>
  `;
  const pdfUrl = extractVisionPdfUrl(html);
  assert.equal(pdfUrl, 'https://cdn.visionias.in/value_added_material/new.pdf');
});

test('(c) Rau Mains classification: ESSAY.pdf, Eassy_2020.pdf, GS-IV_2019.pdf, UPSC-Mains-2025-GS-paper-3.pdf', () => {
  assert.equal(classifyRauPaper('ESSAY.pdf'), 'Essay');
  assert.equal(classifyRauPaper('Eassy_2020.pdf'), 'Essay');
  assert.equal(classifyRauPaper('GS-IV_2019.pdf'), 'GS-M4');
  assert.equal(classifyRauPaper('UPSC-Mains-2025-GS-paper-3.pdf'), 'GS-M3');
});

test('(d) robots: Disallow: /resources/tab.php still allows /resources/material/?id=1', () => {
  const robotsTxt = `
User-agent: *
Disallow: /admin/
Disallow: https://beta.visionias.in/
Disallow: /resources/tab.php
Allow: /assets/
`;
  const rules = parseRobotsTxt(robotsTxt);
  assert.equal(isAllowedByRules('/resources/material/?id=1', rules), true);
  assert.equal(isAllowedByRules('/resources/tab.php', rules), false);
  assert.equal(isAllowedByRules('/admin/test', rules), false);
});

test('(e) assertRunDirSafe throws for non-ignored probe dir and passes for default run dir', () => {
  const defaultDir = getRunDir();
  assert.doesNotThrow(() => {
    assertRunDirSafe(defaultDir);
  });

  const nonIgnoredDir = path.join(REPO_ROOT, 'scripts', 'qbank', 'final', '__probe_dir__');
  assert.throws(
    () => {
      assertRunDirSafe(nonIgnoredDir);
    },
    (err: any) => err instanceof RunDirNotIgnoredError
  );
});

test('(f) Two politeFetch calls to one host start >= 3000 ms apart using injected sleep/now', async () => {
  resetHttpState();

  let virtualTime = 1000;
  const now = () => virtualTime;
  const sleep = async (ms: number) => {
    virtualTime += ms;
  };

  const fakeFetch: typeof fetch = async () => {
    return new Response('ok', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  };

  const p1 = politeFetch('https://example.com/one', {
    fetchImpl: fakeFetch,
    sleep,
    now,
  });
  const p2 = politeFetch('https://example.com/two', {
    fetchImpl: fakeFetch,
    sleep,
    now,
  });

  const [res1, res2] = await Promise.all([p1, p2]);
  assert.equal(res1.status, 200);
  assert.equal(res2.status, 200);

  assert.equal(requestLog.length, 2);
  const startDiff = requestLog[1].startedAt - requestLog[0].startedAt;
  assert.ok(startDiff >= 3000, `Expected startDiff >= 3000, got ${startDiff}`);
});
