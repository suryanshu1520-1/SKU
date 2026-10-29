/**
 * scripts/tests/international-phase2.test.ts
 *
 * Phase 2 Durable Pipeline Test Suite:
 *   1. Canonical Episode Bucket Key & Bilateral Instrument Disjointness (Bilateral Boilerplate Defense)
 *   2. Deterministic Head + Operative-Salience Windowing (Preambles vs Operative Clauses)
 *   3. Deterministic India Posture Verifier (UPSC Prelims Trap Guardrails)
 *   4. Verbatim Quote Verification & Evidence Integrity
 *   5. Conditional Fetch Fast-Path & Host Boundaries
 */

import test from 'node:test';
import assert from 'node:assert';
import {
  computeCandidateBucketKey,
  checkInstrumentDisjointness,
  computeAcceptedMatchKey,
  normalizeActorCode,
  normalizeForum,
  getQuarterString,
} from '../../server-lib/news/identity.js';
import {
  windowDocumentBySalience,
  scoreParagraphSalience,
  splitParagraphs,
} from '../../server-lib/news/salience-window.js';
import {
  verifyIndiaPosture,
  verifyQuoteInSource,
  validateDispatchEvidence,
} from '../../server-lib/news/evidence.js';
import { sha256 } from '../../server-lib/news/worker.js';
import {
  DOMESTIC_BASELINE_FIXTURES,
  INTERNATIONAL_CANDIDATE_FIXTURES,
  UPSC_TRAP_FIXTURES,
} from './fixtures/international-fixtures.js';

// ============================================================
// 1. Canonical Episode Bucket Key & Bilateral Boilerplate Defense
// ============================================================
test('Identity & Disjointness — Bilateral Boilerplate Defense', async (t) => {
  await t.test('computeCandidateBucketKey derives deterministic sorted key with quarter', () => {
    const key1 = computeCandidateBucketKey({
      actors: ['India', 'France'],
      institutionOrForum: null,
      actionDomain: 'MARITIME_SECURITY',
      eventDate: '2026-10-28T10:00:00.000Z',
    });
    // Actors sorted: 'FR+IN', default forum: 'BILATERAL', Quarter: '2026_Q4'
    assert.strictEqual(key1, 'FR+IN:BILATERAL:MARITIME_SECURITY:2026_Q4');

    const key2 = computeCandidateBucketKey({
      actors: ['France', 'India'], // Reversed order must yield identical key
      institutionOrForum: '',
      actionDomain: 'maritime_security',
      eventDate: new Date('2026-10-15'),
    });
    assert.strictEqual(key1, key2, 'Bucket key must be invariant to actor ordering and case');

    const wtoKey = computeCandidateBucketKey({
      actors: ['India', 'United States'],
      institutionOrForum: 'World Trade Organization',
      actionDomain: 'TARIFF_DISPUTE',
      eventDate: '2026-02-10T00:00:00.000Z',
    });
    assert.strictEqual(wtoKey, 'IN+US:WTO:TARIFF_DISPUTE:2026_Q1');
  });

  await t.test('Hard Instrument Disjointness Gate prevents false merges on distinct sectoral MoUs', () => {
    // Case 1: Two separate MoUs signed during the exact same state visit
    const maritimeLogistics = ['MARITIME_LOGISTICS_AGREEMENT'];
    const spacePayloadMoU = ['SPACE_PAYLOAD_MOU'];

    const isDisjoint = checkInstrumentDisjointness(maritimeLogistics, spacePayloadMoU);
    assert.strictEqual(
      isDisjoint,
      true,
      'Distinct bilateral MoUs must be strictly disjoint to prevent false merges'
    );

    // Case 2: Two distinct WTO dispute settlement cases
    const ds541 = ['WTO_DS541'];
    const ds602 = ['WTO_DS602'];
    assert.strictEqual(
      checkInstrumentDisjointness(ds541, ds602),
      true,
      'Distinct WTO dispute numbers must be disjoint'
    );

    // Case 3: Same treaty / instrument (e.g. signature vs ratification of the same treaty)
    const treatySig = ['BBNJ_TREATY'];
    const treatyRat = ['BBNJ_TREATY'];
    assert.strictEqual(
      checkInstrumentDisjointness(treatySig, treatyRat),
      false,
      'Identical instruments are NOT disjoint and can advance the same episode'
    );

    // Case 4: No instruments specified
    assert.strictEqual(checkInstrumentDisjointness([], []), false);
  });

  await t.test('computeAcceptedMatchKey incorporates bucket and instrument', () => {
    const matchKey = computeAcceptedMatchKey({
      candidateBucketKey: 'FR+IN:BILATERAL:MARITIME_SECURITY:2026_Q4',
      primaryInstrument: 'MARITIME_LOGISTICS_AGREEMENT',
      specificEventSlug: 'paris-logistics-accord',
    });
    assert.strictEqual(
      matchKey,
      'FR+IN:BILATERAL:MARITIME_SECURITY:2026_Q4:MARITIME_LOGISTICS_AGREEMENT:paris-logistics-accord'
    );
  });
});

// ============================================================
// 2. Deterministic Head + Operative-Salience Windowing
// ============================================================
test('Operative-Salience Windowing — Preamble vs Operative Clauses', async (t) => {
  // Construct a long synthetic diplomatic document:
  // - 1,500 chars of ceremonial welcoming preamble
  // - 5,000 chars of filler diplomatic pleasantries
  // - 2 substantive paragraphs with operative tariff and binding dispute rulings at character 7,500+
  const leadPreamble =
    'The Plenary Session of the ministerial delegations convened on 28 October 2026 at the Palais des Nations under the co-chairmanship of representatives. The delegations reaffirmed longstanding historical friendship, noted common cultural heritage, and expressed mutual goodwill before commencing formal institutional proceedings.';

  const filler1 =
    'Delegates enjoyed productive luncheon discussions and exchanged views on broad international cooperation, reiterating commitment to multilateral dialogue across various global forums. Warm congratulations were conveyed on recent commemorative milestones and reciprocal cultural exchanges.';

  const operativeClause1 =
    'Article IV: The Dispute Settlement Body hereby adopts the panel report in DS602. Contracting parties decide that countervailing tariffs exceeding 14.5% on specialty alloy steel shall be prohibited, with binding effect from 1 January 2027.';

  const operativeClause2 =
    'Article IX: Parties agree to establish an expedited conciliation mechanism with a strict deadline of December 2027. Under this protocol, sanctions are prohibited pending formal appellate review, and member states accord immediate tariff relief amounting to $350 million.';

  // Build a 10,000+ character document
  const fullDocument = [
    leadPreamble,
    filler1.repeat(20),
    operativeClause1,
    filler1.repeat(15),
    operativeClause2,
  ].join('\n\n');

  assert.ok(fullDocument.length > 8000, 'Test document must exceed typical 6,000 clamp');

  const windowResult = windowDocumentBySalience({
    documentId: 'doc-wto-2026',
    versionNo: 1,
    text: fullDocument,
    maxTotalChars: 3000,
    leadAnchorChars: 500,
  });

  await t.test('lead anchor is retained in windowed text', () => {
    assert.ok(
      windowResult.windowedText.includes('Plenary Session of the ministerial delegations'),
      'Opening lead anchor must be preserved'
    );
    assert.strictEqual(windowResult.spans[0].isLead, true);
  });

  await t.test('buried operative clauses are extracted despite being beyond 6,000 chars', () => {
    assert.ok(
      windowResult.windowedText.includes('Dispute Settlement Body hereby adopts the panel report in DS602'),
      'Operative clause 1 must be captured'
    );
    assert.ok(
      windowResult.windowedText.includes('Article IX: Parties agree to establish an expedited conciliation'),
      'Operative clause 2 must be captured'
    );
  });

  await t.test('omission markers [...] are inserted between non-contiguous blocks', () => {
    assert.ok(windowResult.omissionCount > 0, 'Omission count must be >= 1 for non-contiguous gaps');
    assert.ok(windowResult.windowedText.includes('[...]'), 'Windowed text must contain [...] markers');
  });

  await t.test('spans carry document-qualified span IDs', () => {
    for (const span of windowResult.spans) {
      assert.match(span.spanId, /^doc-wto-2026:v1:p\d+$/, 'Span ID must be document-qualified');
    }
  });
});

// ============================================================
// 3. UPSC Prelims Trap Guardrail & India Posture Verification
// ============================================================
test('UPSC Prelims Trap Guardrail — India Diplomatic Posture Verification', async (t) => {
  await t.test('TRAP: MEA release merely observes treaty -> blocks false party_signatory claim', () => {
    const trapFixture = UPSC_TRAP_FIXTURES.find((f) => f.id === 'mea-trap-non-party-observer')!;
    assert.ok(trapFixture);

    const verification = verifyIndiaPosture({
      declaredPosture: 'party_signatory', // Faulty claim
      headline: 'India joins the Global Plastic Pollution Treaty at INC-5 in Busan',
      bullets: ['India became a party to the new international treaty.'],
      quotes: [trapFixture.body],
    });

    assert.strictEqual(verification.isValid, false, 'False membership claim must fail verification');
    assert.strictEqual(verification.trapDetected, true, 'UPSC trap must be detected');
    assert.strictEqual(
      verification.resolvedPosture,
      'non_party_commentator',
      'Posture must be demoted to non_party_commentator'
    );
    assert.match(verification.reason, /UPSC Trap Guardrail/);
  });

  await t.test('AUTHENTIC: Co-occurring India entity and signing token passes party_signatory', () => {
    const meaBilateral = INTERNATIONAL_CANDIDATE_FIXTURES.find(
      (f) => f.id === 'mea-bilateral-maritime'
    )!;
    assert.ok(meaBilateral);

    const verification = verifyIndiaPosture({
      declaredPosture: 'party_signatory',
      headline: meaBilateral.title,
      bullets: ['India and France signed reciprocal logistics agreement in Paris.'],
      quotes: [meaBilateral.body],
    });

    assert.strictEqual(verification.isValid, true);
    assert.strictEqual(verification.trapDetected, false);
    assert.strictEqual(verification.resolvedPosture, 'party_signatory');
  });

  await t.test('IRRELEVANT: Multilateral development with no India role resolves to not_applicable', () => {
    const wtoFixture = INTERNATIONAL_CANDIDATE_FIXTURES.find(
      (f) => f.id === 'wto-ds-tariff-ruling'
    )!;
    assert.ok(wtoFixture);

    const verification = verifyIndiaPosture({
      declaredPosture: 'unverified',
      headline: wtoFixture.title,
      bullets: ['WTO Dispute Settlement Body adopts panel report on steel duties.'],
      quotes: [wtoFixture.body],
    });

    assert.strictEqual(verification.isValid, true);
    assert.strictEqual(verification.resolvedPosture, 'not_applicable');
  });
});

// ============================================================
// 4. Verbatim Quote Verification & Evidence Bundle Integrity
// ============================================================
test('Evidence Bundle Integrity — verbatim quote checking', async (t) => {
  const sourceText = `
    The Reserve Bank of India on Tuesday issued new directions regarding digital payment tokenization.
    Under the revised framework, card networks are required to facilitate co-badging by March 2027.
    Entities failing to comply shall face enforcement action under Section 45L of the RBI Act.
  `;

  await t.test('exact quote passes verification', () => {
    const validQuote = 'card networks are required to facilitate co-badging by March 2027.';
    assert.strictEqual(verifyQuoteInSource(validQuote, sourceText), true);
  });

  await t.test('fabricated or modified quote fails verification', () => {
    const fabricatedQuote = 'card networks must immediately stop all credit operations by March 2027.';
    assert.strictEqual(verifyQuoteInSource(fabricatedQuote, sourceText), false);
  });

  await t.test('validateDispatchEvidence returns comprehensive error list on failure', () => {
    const res = validateDispatchEvidence({
      headline: 'India signs digital tokenization treaty',
      bullets: ['India became signatory to international framework.'],
      quotes: [
        {
          spanId: 'doc1:v1:p1',
          quote: 'card networks are required to facilitate co-badging by March 2027.',
          sourceId: 'RBI',
        },
        {
          spanId: 'doc1:v1:p2',
          quote: 'This is a completely fabricated sentence not in the document.',
          sourceId: 'RBI',
        },
      ],
      sourceNormalizedText: sourceText,
      declaredPosture: 'party_signatory',
    });

    assert.strictEqual(res.isValid, false);
    assert.ok(res.errors.length >= 2, 'Must report both quote mismatch and India posture trap');
  });
});

// ============================================================
// 5. Hash & Fingerprint Integrity
// ============================================================
test('Hash & Fingerprint Integrity', async () => {
  const textA = 'Official communique from New Delhi';
  const textB = 'Official communique from New Delhi '; // trailing space

  const hashA = sha256(textA);
  const hashB = sha256(textB);

  assert.strictEqual(hashA.length, 64, 'SHA-256 must be 64-hex chars');
  assert.strictEqual(hashA, hashB, 'sha256 helper must trim input before hashing');
});
