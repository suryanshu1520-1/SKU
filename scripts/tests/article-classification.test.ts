import test from 'node:test';
import assert from 'node:assert/strict';
import { articleIssuerLabel, classifyArticle, classificationSummary, type ClassificationInput } from '../../src/lib/article-classification.js';
import { matchesCoverageScope, selectClassifiedPage } from '../../src/lib/article-feed-selection.js';
import { deriveArticleSyllabusTag } from '../../src/lib/syllabus-tagger.js';
import { CANONICAL_NODE_IDS } from '../../src/lib/syllabus-mapping.js';

const cases: Array<{ name: string; input: ClassificationInput; scope: string; subject?: string | null }> = [
  { name: 'RBI bank directions override stale cross-border and IR labels', input: { source: 'RBI', headline: 'Directions under Section 35A of Banking Regulation Act – Lokapavani Mahila Sahakari Bank, Mandya', coverage_scope: 'cross_border', node_id: 'GS2.IR', summary: { tags: ['GS-II · International Relations'], bullets: ['RBI extended directions for three months.'] } }, scope: 'india', subject: 'banking' },
  { name: 'ICAR agriculture beats the generic health word', input: { source: 'PIB', headline: 'ICAR Scientists and KVK Experts Engage Delhi Farmers Under Khet Bachao Abhiyan to Promote Soil Health and Rabi Crop Management' }, scope: 'india', subject: 'agriculture' },
  { name: 'domestic green hydrogen standard', input: { source: 'PIB', headline: 'India establishes Green Hydrogen benchmarks capping emissions at 2 kg CO2' }, scope: 'india', subject: 'energy' },
  { name: 'domestic space achievement', input: { source: 'PIB', headline: 'India’s New Era of Space Technology: NGLV Approval and Historic SpaDeX Docking Milestone' }, scope: 'india', subject: 'space' },
  { name: 'heritage agreement keeps culture as its main subject', input: { source: 'PIB', headline: 'Ministry of Culture and Bibliothèque nationale de France Sign MoU to Strengthen India’s Manuscript Heritage Preservation', tags: ['GS-II · IR'], node_id: 'GS2.IR' }, scope: 'cross_border', subject: 'culture' },
  { name: 'bilateral commerce keeps its actual trade subject', input: { source: 'PIB', headline: 'Union Commerce Minister Piyush Goyal Holds Bilateral Trade and Investment Talks in the Netherlands' }, scope: 'cross_border', subject: 'trade' },
  { name: 'BRICS forum is IR rather than its Parliament House venue', input: { source: 'PIB', headline: 'India to Host the 12th BRICS Parliamentary Forum at Parliament House Complex Highlighting People-Centric Development' }, scope: 'cross_border', subject: 'ir' },
  { name: 'foreign event remains world despite an Indian consequence in the summary', input: { source: 'THE HINDU', headline: 'US Federal Reserve cuts rates amid slowing inflation', body: 'India’s exporters may benefit. India and the United States have bilateral trade ties.' }, scope: 'international' },
  { name: 'foreign bilateral event without India is world', input: { source: 'MEA', headline: 'France and Germany sign bilateral trade agreement' }, scope: 'international', subject: 'trade' },
  { name: 'WTO source is not Indian participation', input: { source: 'WTO', headline: 'Panel adopts report on steel countervailing duties', body: 'Members discussed international trade rules.' }, scope: 'international' },
  { name: 'a domestic MoU is not cross-border', input: { source: 'PIB', headline: 'ISRO and IIT Delhi sign MoU for space technology research' }, scope: 'india', subject: 'space' },
  { name: 'MEA recruitment is domestic administration', input: { source: 'MEA', ministry: 'Ministry of External Affairs', headline: 'Ministry announces recruitment rules for civil service posts' }, scope: 'india', subject: 'governance' },
  { name: 'UN mention in exam advice cannot change coverage', input: { source: 'PIB', headline: 'RBI issues banking rules for Mumbai cooperatives', summary: { bullets: ['RBI issued updated directions.'], tags: ['UN', 'International', 'GS2.IR'], mains: 'Link to United Nations and bilateral cooperation.' } }, scope: 'india', subject: 'banking' },
  { name: 'domestic headline beats foreign boilerplate in later summary', input: { source: 'PIB', headline: 'Delhi farmers adopt new soil health programme', body: 'Local farmers participated. France has bilateral trade links with India.' }, scope: 'india', subject: 'agriculture' },
  { name: 'a comparison with Brazil is not an international relationship', input: { source: 'INDIAN EXPRESS', headline: 'India’s push beyond E20 fuel and lessons it can take from Brazil', body: 'India is considering higher ethanol blends.' }, scope: 'india', subject: 'energy' },
  { name: 'rupee quotation in US dollars remains domestic finance', input: { source: 'THE HINDU', headline: 'Rupee declines against US dollar in early trade' }, scope: 'india' },
  { name: 'the pronoun us is not a country', input: { source: 'PIB', headline: 'India’s farmers show us how soil health improves crop yields' }, scope: 'india', subject: 'agriculture' },
  { name: 'IAF participation is an Indian international activity', input: { source: 'PIB', headline: 'IAF to participate in Exercise Pitch Black in Australia' }, scope: 'cross_border', subject: 'security' },
  { name: 'PM Modi is recognised without the expanded first name', input: { source: 'THE HINDU', headline: 'At SCO summit PM Modi champions diplomacy and sovereignty' }, scope: 'cross_border', subject: 'ir' },
  { name: 'generic title can use factual summary evidence', input: { source: 'PIB', headline: 'New partnership announced', body: 'India and Vietnam signed a bilateral treaty.' }, scope: 'cross_border', subject: 'ir' },
  { name: 'CCI acquisition is economics rather than the acquired company’s health sector', input: { source: 'PIB', headline: 'Competition Commission of India approves acquisition of Universal NutriScience', body: 'The company manufactures medicines for women’s health.' }, scope: 'india', subject: 'economy' },
  { name: 'negative policy boilerplate cannot produce an Economy tag', input: { source: 'THE HINDU', headline: 'Actors and musicians pay tribute to legendary singer S. Janaki', body: 'The Indian government did not implement any policy related to this content. The government did not introduce any fiscal policies.' }, scope: 'unclassified', subject: 'culture' },
  { name: 'unknown records stay unresolved even with inherited metadata', input: { source: 'UNKNOWN', headline: 'Latest update', coverage_scope: 'cross_border', node_id: 'GS2.IR', summary: { tags: ['GS-II · International Relations'] } }, scope: 'unclassified', subject: null },
  { name: 'empty official record is not invented as Governance', input: { source: 'PIB' }, scope: 'unclassified', subject: null },
];

for (const fixture of cases) {
  test(fixture.name, () => {
    const result = classifyArticle(fixture.input);
    assert.equal(result.coverage.scope, fixture.scope);
    if (fixture.subject !== undefined) assert.equal(result.primary?.id ?? null, fixture.subject);
    for (const subject of [result.primary, ...result.secondary].filter(item => item !== null)) {
      assert.ok(CANONICAL_NODE_IDS.has(subject.nodeId), `Unknown canonical node: ${subject.nodeId}`);
      assert.ok(subject.evidence.length, 'Every suggested subject has a factual basis');
    }
  });
}

test('culture and geography stay separate, with IR retained as a secondary connection', () => {
  const result = classifyArticle(cases[4].input);
  assert.equal(result.primary?.paper, 'GS-I');
  assert.ok(result.secondary.some(subject => subject.id === 'ir'));
});

test('classification preserves historical tags and evidence without trusting them', () => {
  const input = cases[0].input;
  const before = JSON.stringify(input);
  const result = classificationSummary(input);
  assert.deepEqual(result.tags, input.summary?.tags);
  assert.deepEqual(result.bullets, input.summary?.bullets);
  assert.equal(JSON.stringify(input), before);
  assert.equal(result.syllabus_paper, 'GS-III');
  assert.equal(deriveArticleSyllabusTag(input)?.topic, result.syllabus_topic);
  assert.equal(deriveArticleSyllabusTag(cases.at(-1)!.input), null);
});

test('weak summary-only subjects and excluded boilerplate are reviewable', () => {
  assert.ok(classifyArticle(cases[19].input).needsReview);
  assert.ok(classifyArticle(cases[21].input).reviewReasons.some(reason => reason.includes('boilerplate')));
});

test('scope facets do not accept legacy labels or unclassified rows', () => {
  assert.equal(matchesCoverageScope(cases[0].input, 'international'), false);
  assert.equal(matchesCoverageScope(cases[4].input, 'international'), true);
  assert.equal(matchesCoverageScope(cases[4].input, 'cross_border'), true);
  assert.equal(matchesCoverageScope(cases[8].input, 'cross_border'), false);
  assert.equal(matchesCoverageScope(cases[22].input, 'india'), false);
});

test('classification happens before pagination, including stale false negatives beyond a raw page', async () => {
  const records = [cases[0].input, cases[22].input, cases[4].input, cases[1].input, cases[8].input, cases[5].input];
  let calls = 0;
  const fetchBatch = async (offset: number, size: number) => { calls++; return records.slice(offset, offset + size); };
  const first = await selectClassifiedPage({ fetchBatch, scope: 'international', offset: 0, limit: 1, batchSize: 2 });
  assert.deepEqual(first.items, [records[2]]);
  assert.equal(first.hasMore, true);
  assert.ok(calls >= 3, 'Must scan past raw pages containing no matching stories');
  const second = await selectClassifiedPage({ fetchBatch, scope: 'international', offset: 1, limit: 2, batchSize: 2, countAll: true });
  assert.deepEqual(second.items, [records[4], records[5]]);
  assert.equal(second.hasMore, false);
  assert.equal(second.totalCount, 3);
  const none = await selectClassifiedPage({ fetchBatch, scope: 'international', offset: 3, limit: 2, batchSize: 2 });
  assert.deepEqual(none.items, []);
  assert.equal(none.hasMore, false);
});

test('live-feed actions outrank issuer names and incidental summary subjects', () => {
  const records = [
    { headline: 'Union Women and Child Development Minister Chairs Hindi Consultative Committee Meeting to Review Official Language Policy', subject: 'governance' },
    { headline: 'Prime Minister Outlines India’s Technological Ascendancy at Science, Technology and Innovation Conclave', body: 'A nuclear reactor achieved criticality. ISRO advanced space docking.', subject: 'technology' },
    { headline: 'NCB’s Operation Trident Dismantles International Narco-Cartel Across Northeast India', body: 'Raids uncovered narcotics and suspicious bank accounts.', subject: 'security' },
    { headline: 'Carbon Capture, Utilisation, and Storage: Driving Industrial Decarbonisation to Achieve India’s Net Zero Target', subject: 'environment' },
    { headline: 'ESIC Extends Amnesty Scheme Deadline Offering Relief for Legal Disputes', subject: 'welfare' },
  ];
  for (const record of records) assert.equal(classifyArticle({ source: 'PIB', ...record }).primary?.id, record.subject, record.headline);
  assert.equal(classifyArticle({ source: 'PIB', headline: 'Union Minister Sonowal Invites South Korean Giants to Invest in India’s Shipbuilding Sector' }).coverage.scope, 'cross_border');
});

test('an RBI release does not inherit an unrelated ministry as its issuer', () => {
  const input = { source: 'RBI', ministry: 'Ministry of Electronics & IT', headline: 'RBI issues banking directions' };
  assert.equal(articleIssuerLabel(input), 'Reserve Bank of India');
  assert.ok(classifyArticle(input).reviewReasons.some(reason => reason.includes('ministry conflicts')));
  assert.equal(input.ministry, 'Ministry of Electronics & IT');
});
