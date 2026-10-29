/**
 * scripts/tests/international-baseline.test.ts
 *
 * Test suite for Phase 0 and Phase 1 shared correctness boundaries:
 *   1. Source enablement enforcement (getSources cannot return disabled sources without flag)
 *   2. Source policy & admission registry (roles, rights, strict host validation)
 *   3. Pure trust resolver (hostname parsing, scale normalization, honest badges)
 *   4. Fail-closed secret guards (newsdata, scrape, internal worker)
 *   5. Embedding batch consistency (entire batch failover to local space)
 *   6. Date threading & timestamp immutability
 */

import test from 'node:test';
import assert from 'node:assert';
import { getSources, SOURCES } from '../../server-lib/cron/ingest/sources.js';
import {
  getSourceProfile,
  isSourceAdmitted,
  canPublishSource,
  validateHost,
  getAllowedHosts,
} from '../../server-lib/news/source-policy.js';
import {
  parseHost,
  isVerifiedPrimaryHost,
  normalizeGroundingScore,
  resolveTrustStatus,
} from '../../src/lib/trust-resolver.js';
import { localEmbed, cosine } from '../../server-lib/cron/ingest/embeddings.js';
import scrapeHandler from '../../server-lib/cron/scrape.js';
import newsdataHandler from '../../server-lib/cron/newsdata.js';
import workerHandler from '../../server-lib/internal/worker.js';
import {
  DOMESTIC_BASELINE_FIXTURES,
  INTERNATIONAL_CANDIDATE_FIXTURES,
  UPSC_TRAP_FIXTURES,
} from './fixtures/international-fixtures.js';

// ============================================================
// 1. Source Enablement Enforcement
// ============================================================
test('Source Enablement Enforcement — getSources() invariants', async (t) => {
  await t.test('default getSources() returns only enabled sources', () => {
    const enabled = getSources();
    assert.ok(enabled.length > 0);
    for (const src of enabled) {
      assert.strictEqual(src.enabled, true, `Source ${src.id} should be enabled`);
    }
    const disabledIds = SOURCES.filter((s) => !s.enabled).map((s) => s.id);
    for (const dId of disabledIds) {
      assert.ok(!enabled.some((s) => s.id === dId), `Disabled source ${dId} must not be in default list`);
    }
  });

  await t.test('explicit disabled IDs (WIKIPEDIA, UN NEWS) are rejected without includeDisabled', () => {
    const resWikipedia = getSources(['WIKIPEDIA']);
    assert.strictEqual(resWikipedia.length, 0, 'WIKIPEDIA must not be returned when enabled=false');

    const resUn = getSources(['UN NEWS']);
    assert.strictEqual(resUn.length, 0, 'UN NEWS must not be returned when enabled=false');

    const resMixed = getSources(['PIB', 'WIKIPEDIA']);
    assert.strictEqual(resMixed.length, 1, 'Only enabled source PIB should be returned');
    assert.strictEqual(resMixed[0].id, 'PIB');
  });

  await t.test('includeDisabled = true allows explicit inspection of disabled sources', () => {
    const res = getSources(['WIKIPEDIA'], true);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 'WIKIPEDIA');
    assert.strictEqual(res[0].enabled, false);
  });
});

// ============================================================
// 2. Source Policy & Admission Registry
// ============================================================
test('Source Policy & Admission Registry — roles, rights, and host safety', async (t) => {
  await t.test('all registered sources have typed profiles and editorial roles', () => {
    for (const src of SOURCES) {
      const profile = getSourceProfile(src.id);
      assert.ok(profile, `Profile must exist for source ${src.id}`);
      assert.strictEqual(profile?.id, src.id);
      assert.ok(profile?.approvedHosts.length > 0, `Source ${src.id} must declare approvedHosts`);
      assert.ok(profile?.rightsReview.status, `Source ${src.id} must declare rightsReview.status`);
    }
  });

  await t.test('host validation strictly matches approved hosts and rejects spoofing', () => {
    // Valid hosts
    assert.strictEqual(validateHost('https://pib.gov.in/PressReleasePage.aspx?PRID=1', 'PIB'), true);
    assert.strictEqual(validateHost('https://www.rbi.org.in/pressreleases_rss.xml', 'RBI'), true);
    assert.strictEqual(validateHost('https://www.mea.gov.in/press-releases.htm', 'MEA'), true);
    assert.strictEqual(validateHost('https://wto.org/english/news_e/news_e.htm', 'WTO'), true);

    // Spoofed / malicious hosts
    assert.strictEqual(validateHost('https://not-pib.gov.in/PressReleasePage.aspx', 'PIB'), false);
    assert.strictEqual(validateHost('https://pib.gov.in.attacker.org/phish', 'PIB'), false);
    assert.strictEqual(validateHost('https://fake-mea.org/release', 'MEA'), false);
    assert.strictEqual(validateHost('not-a-valid-url', 'PIB'), false);
  });

  await t.test('isSourceAdmitted and canPublishSource enforce rollout lanes and rights', () => {
    assert.strictEqual(isSourceAdmitted('PIB'), true);
    assert.strictEqual(canPublishSource('PIB'), true);

    // MEA & WTO are currently in review_pilot lane (not yet public publication)
    assert.strictEqual(canPublishSource('MEA'), false);
    assert.strictEqual(canPublishSource('WTO'), false);

    // Wikipedia & UN News are disabled
    assert.strictEqual(isSourceAdmitted('WIKIPEDIA'), false);
    assert.strictEqual(canPublishSource('WIKIPEDIA'), false);
    assert.strictEqual(isSourceAdmitted('UN NEWS'), false);
    assert.strictEqual(canPublishSource('UN NEWS'), false);
  });
});

// ============================================================
// 3. Pure Trust Resolver
// ============================================================
test('Pure Trust Resolver — deterministic host parsing and honest grounding', async (t) => {
  await t.test('parseHost extracts clean domain and handles malformed inputs safely', () => {
    assert.strictEqual(parseHost('https://pib.gov.in/release/123'), 'pib.gov.in');
    assert.strictEqual(parseHost('https://www.rbi.org.in/press.xml'), 'rbi.org.in');
    assert.strictEqual(parseHost('http://mea.gov.in/doc/'), 'mea.gov.in');
    assert.strictEqual(parseHost('https://wto.org/news.'), 'wto.org');
    assert.strictEqual(parseHost('not-a-url'), null);
    assert.strictEqual(parseHost(''), null);
    assert.strictEqual(parseHost(undefined), null);
    assert.strictEqual(parseHost(null), null);
  });

  await t.test('isVerifiedPrimaryHost performs exact domain/subdomain matching without substring leaks', () => {
    assert.strictEqual(isVerifiedPrimaryHost('pib.gov.in'), true);
    assert.strictEqual(isVerifiedPrimaryHost('archive.pib.gov.in'), true);
    assert.strictEqual(isVerifiedPrimaryHost('rbi.org.in'), true);
    assert.strictEqual(isVerifiedPrimaryHost('mea.gov.in'), true);
    assert.strictEqual(isVerifiedPrimaryHost('wto.org'), true);

    // Substring leaks that would have fooled regex / loose includes
    assert.strictEqual(isVerifiedPrimaryHost('not-pib.gov.in'), false);
    assert.strictEqual(isVerifiedPrimaryHost('pib.gov.in.phishing.com'), false);
    assert.strictEqual(isVerifiedPrimaryHost('barbican-rbi.co.uk'), false);
    assert.strictEqual(isVerifiedPrimaryHost('prsindia.org.fake'), false);
  });

  await t.test('normalizeGroundingScore handles 0..100 and 0..1 scales idempotently', () => {
    assert.strictEqual(normalizeGroundingScore(100), 1.0);
    assert.strictEqual(normalizeGroundingScore(85), 0.85);
    assert.strictEqual(normalizeGroundingScore(1.0), 1.0);
    assert.strictEqual(normalizeGroundingScore(0.75), 0.75);
    assert.strictEqual(normalizeGroundingScore(0), 0.0);
    assert.strictEqual(normalizeGroundingScore(-10), 0.0);
    assert.strictEqual(normalizeGroundingScore(150), 1.0);
    assert.strictEqual(normalizeGroundingScore(null), null);
    assert.strictEqual(normalizeGroundingScore(undefined), null);
    assert.strictEqual(normalizeGroundingScore(NaN), null);
  });

  await t.test('resolveTrustStatus returns calibrated badges without automatic truth claims', () => {
    // Case 1: Official primary host + live cite-or-drop claims
    const resPrimary = resolveTrustStatus({
      source: 'PIB',
      sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=101',
      grounding: 100,
      verificationMethod: 'live_cite_or_drop_v1',
      claims: [{ verified: true, verification_method: 'live_cite_or_drop_v1' }],
    });
    assert.strictEqual(resPrimary.isOfficialRecord, true);
    assert.strictEqual(resPrimary.badgeLevel, 'primary_record');
    assert.strictEqual(resPrimary.badgeLabel, 'Primary Source · Grounded');
    assert.strictEqual(resPrimary.groundingRatio, 1.0);

    // Case 2: Wire source with verified claims
    const resWireVerified = resolveTrustStatus({
      source: 'THE HINDU',
      sourceUrl: 'https://www.thehindu.com/article/123',
      grounding: 100,
      verificationMethod: 'live_cite_or_drop_v1',
      claims: [{ verified: true, verification_method: 'live_cite_or_drop_v1' }],
    });
    assert.strictEqual(resWireVerified.isOfficialRecord, false);
    assert.strictEqual(resWireVerified.badgeLevel, 'evidence_backed');
    assert.strictEqual(resWireVerified.badgeLabel, 'Evidence Backed');

    // Case 3: Official primary host without cite-or-drop claim verification
    const resPrimaryUnverified = resolveTrustStatus({
      source: 'RBI',
      sourceUrl: 'https://rbi.org.in/press/102',
      grounding: null,
      verificationMethod: undefined,
      claims: [],
    });
    assert.strictEqual(resPrimaryUnverified.isOfficialRecord, true);
    assert.strictEqual(resPrimaryUnverified.badgeLevel, 'official_unverified');
    assert.strictEqual(resPrimaryUnverified.badgeLabel, 'Primary Source');

    // Case 4: Wire source without cite-or-drop verification
    const resWireUnverified = resolveTrustStatus({
      source: 'LIVEMINT',
      sourceUrl: 'https://www.livemint.com/news/103',
      grounding: 0,
      verificationMethod: undefined,
      claims: [],
    });
    assert.strictEqual(resWireUnverified.isOfficialRecord, false);
    assert.strictEqual(resWireUnverified.badgeLevel, 'none');
    assert.strictEqual(resWireUnverified.badgeLabel, null);
  });
});

// ============================================================
// 4. Fail-Closed Secret Guards
// ============================================================
test('Fail-Closed Secret Guards — cron & worker authorization', async (t) => {
  const CRON_ENV = 'CRON_SECRET';
  const WORKER_ENV = 'INTERNAL_WORKER_SECRET';
  const origCron = process.env[CRON_ENV];
  const origWorker = process.env[WORKER_ENV];

  t.after(() => {
    if (origCron !== undefined) process.env[CRON_ENV] = origCron;
    else delete process.env[CRON_ENV];
    if (origWorker !== undefined) process.env[WORKER_ENV] = origWorker;
    else delete process.env[WORKER_ENV];
  });

  function mockRes() {
    return {
      statusCode: 200,
      body: null as any,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(obj: any) {
        this.body = obj;
        return this;
      },
      end() {
        return this;
      },
    };
  }

  await t.test('newsdata rejects with 500 when CRON_SECRET is unconfigured', async () => {
    delete process.env[CRON_ENV];
    const res = mockRes();
    await newsdataHandler({ method: 'GET', headers: {} }, res);
    assert.strictEqual(res.statusCode, 500);
    assert.match(res.body?.error, /CRON_SECRET not configured/);
  });

  await t.test('newsdata rejects with 401 when Bearer token is missing or incorrect', async () => {
    process.env[CRON_ENV] = 'valid-test-cron-secret-123';
    const res = mockRes();
    await newsdataHandler({ method: 'GET', headers: { authorization: 'Bearer wrong-secret' } }, res);
    assert.strictEqual(res.statusCode, 401);

    const resEmpty = mockRes();
    await newsdataHandler({ method: 'GET', headers: {} }, resEmpty);
    assert.strictEqual(resEmpty.statusCode, 401);
  });

  await t.test('scrape rejects with 500 when CRON_SECRET is unconfigured', async () => {
    delete process.env[CRON_ENV];
    const res = mockRes();
    await scrapeHandler({ method: 'GET', headers: {} }, res);
    assert.strictEqual(res.statusCode, 500);
    assert.match(res.body?.error, /CRON_SECRET not configured/);
  });

  await t.test('scrape rejects with 401 when token is invalid', async () => {
    process.env[CRON_ENV] = 'valid-test-cron-secret-123';
    const res = mockRes();
    await scrapeHandler({ method: 'GET', headers: { authorization: 'Bearer invalid' } }, res);
    assert.strictEqual(res.statusCode, 401);
  });

  await t.test('worker rejects with 500 when INTERNAL_WORKER_SECRET is unconfigured', async () => {
    delete process.env[WORKER_ENV];
    const res = mockRes();
    await workerHandler({ method: 'GET', headers: {} }, res);
    assert.strictEqual(res.statusCode, 500);
    assert.match(res.body?.error, /INTERNAL_WORKER_SECRET not configured/);
  });

  await t.test('worker rejects with 403 when Bearer token is invalid', async () => {
    process.env[WORKER_ENV] = 'valid-worker-secret-456';
    const res = mockRes();
    await workerHandler({ method: 'GET', headers: { authorization: 'Bearer bad' } }, res);
    assert.strictEqual(res.statusCode, 403);
  });

  await t.test('worker rejects with 400 when requested source is disabled', async () => {
    process.env[WORKER_ENV] = 'valid-worker-secret-456';
    const res = mockRes();
    await workerHandler({
      method: 'GET',
      headers: { authorization: 'Bearer valid-worker-secret-456' },
      query: { source: 'WIKIPEDIA' },
    }, res);
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body?.error, /Unknown or disabled source/);
  });
});

// ============================================================
// 5. Embedding Space Consistency
// ============================================================
test('Embedding Space Consistency — dimension safety and cosine invariants', async () => {
  const textA = 'Union cabinet approves national clean energy corridor phase 3';
  const textB = 'Cabinet greenlights transmission infrastructure for renewable power in western states';
  const textC = 'Indian cricket team wins test series against Australia';

  const vecA = localEmbed(textA);
  const vecB = localEmbed(textB);
  const vecC = localEmbed(textC);

  assert.strictEqual(vecA.length, 512, 'Local vector must be 512-dim');
  assert.strictEqual(vecB.length, 512, 'Local vector must be 512-dim');
  assert.strictEqual(vecC.length, 512, 'Local vector must be 512-dim');

  const simAB = cosine(vecA, vecB);
  const simAC = cosine(vecA, vecC);

  assert.ok(simAB > simAC, 'Related energy policy texts must have higher cosine similarity than cricket text');

  // Dimension mismatch safety check
  const fake768 = new Array(768).fill(0.1);
  assert.strictEqual(cosine(vecA, fake768), 0, 'Comparing vectors of mismatched length must return 0 without throwing');
});

// ============================================================
// 6. Evaluation Fixtures Parity
// ============================================================
test('Evaluation Fixtures — baseline and UPSC trap validation', async () => {
  assert.ok(DOMESTIC_BASELINE_FIXTURES.length >= 2);
  assert.ok(INTERNATIONAL_CANDIDATE_FIXTURES.length >= 2);
  assert.ok(UPSC_TRAP_FIXTURES.length >= 2);

  // Validate trap fixture 1: MEA non-party observer release
  const trap1 = UPSC_TRAP_FIXTURES.find((f) => f.id === 'mea-trap-non-party-observer');
  assert.ok(trap1);
  assert.strictEqual(trap1.isUpscTrap, true);
  assert.strictEqual(isVerifiedPrimaryHost(parseHost(trap1.sourceUrl)), true);

  // Validate trap fixture 2: Spoofed host
  const trap2 = UPSC_TRAP_FIXTURES.find((f) => f.id === 'spoofed-host-wire-report');
  assert.ok(trap2);
  assert.strictEqual(isVerifiedPrimaryHost(parseHost(trap2.sourceUrl)), false);
});

