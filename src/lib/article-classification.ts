/** Shared, deterministic editorial classification. Stored tags/scopes are inputs to audit, never evidence. */
export const CLASSIFICATION_VERSION = 'article-classification-v2';
export type CoverageScope = 'india' | 'cross_border' | 'international' | 'unclassified';
export interface ClassificationInput {
  source?: string | null;
  ministry?: string | null;
  headline?: string | null;
  body?: string | null;
  tags?: string[] | null;
  node_id?: string | null;
  coverage_scope?: string | null;
  summary?: { bullets?: string[]; tags?: string[]; [key: string]: unknown } | null;
}
export interface ClassificationEvidence { basis: 'headline' | 'summary' | 'metadata'; quote: string; }
export interface SubjectMatch {
  id: string; paper: string; topic: string; nodeId: string;
  evidence: ClassificationEvidence[];
}
export interface ArticleClassification {
  version: string;
  coverage: { scope: CoverageScope; label: string; reason: string; evidence: ClassificationEvidence[] };
  primary: SubjectMatch | null;
  secondary: SubjectMatch[];
  needsReview: boolean;
  reviewReasons: string[];
}

const normalize = (value?: string | null) => (typeof value === 'string' ? value : '').normalize('NFKC').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
const INDIA = /\b(?:india|indians?|new delhi|union cabinet|union minister|central government|droupadi murmu|narendra modi|pm modi|piyush goyal|sarbananda sonowal)\b/i;
const DOMESTIC = /\b(?:rbi|reserve bank of india|sebi|icar|kvk|isro|iaf|spadex|nglv|gaganyaan|anganwadi|poshan|khet bachao|pm-kisan|lok sabha|rajya sabha|rupee|mandya|karnataka|mumbai|delhi|maharashtra|tamil nadu|kerala|gujarat|uttar pradesh|assam|bihar|punjab|rajasthan|odisha|madhya pradesh|west bengal|telangana|andhra pradesh|himachal pradesh|uttarakhand|chhattisgarh|jharkhand|goa|haryana|sikkim|arunachal pradesh|manipur|meghalaya|mizoram|nagaland|tripura|jammu|kashmir|ladakh|puducherry|chandigarh|lakshadweep|andaman|hyderabad|bengaluru|bangalore|chennai|kolkata|lucknow|amaravati|gurugram|indore|mysuru|nhrc|niti aayog|trai|epfo|upsc|cbic|cbdt)\b/i;
const FOREIGN = /\b(?:france|french|netherlands|dutch|liechtenstein|korea|korean|united states|united kingdom|britain|british|china|chinese|japan|japanese|russia|russian|ukraine|ukrainian|gaza|israel|israeli|pakistan|bangladesh|nepal|sri lanka|bhutan|maldives|myanmar|australia|australian|germany|german|singapore|uae|saudi arabia|iran|brazil|south africa|european union|european commission|european central bank|bank of england|federal reserve)\b/i;
// Case-sensitive: the pronoun “us” is not the United States.
const US_ACTOR = /\bU\.?S\.?(?:A\.?)?\b/;
const OTHER_FOREIGN = /\b(?:vietnam|vietnamese|indonesia|indonesian|malaysia|malaysian|thailand|thai|philippines|filipino|taiwan|taiwanese|egypt|egyptian|qatar|qatari|kuwait|oman|bahrain|turkey|turkiye|turkish|palestine|palestinian|afghanistan|afghan|canada|canadian|mexico|mexican|italy|italian|spain|spanish|sweden|swedish|switzerland|swiss|norway|norwegian|denmark|danish|finland|finnish|poland|polish|austria|austrian|belgium|belgian|portugal|portuguese|greece|greek|ireland|irish|new zealand|argentina|argentine|chile|peru|colombia|kenya|nigeria|ethiopia|ghana|tanzania|uganda|zambia|zimbabwe|mauritius|seychelles|madagascar|mozambique|botswana|angola|malawi|namibia|rwanda|sudan|somalia|libya|tunisia|morocco|algeria|uzbekistan|kazakhstan|kyrgyzstan|tajikistan|turkmenistan|mongolia|azerbaijan|armenia|georgia|belarus|serbia|croatia|hungary|romania|bulgaria|czechia|czech|slovakia|slovenia|estonia|latvia|lithuania|cuba|fiji|papua new guinea|timor-leste|cambodia|laos|brunei|nato)\b/i;
const hasForeignActor = (text: string) => FOREIGN.test(text) || OTHER_FOREIGN.test(text) || US_ACTOR.test(text);
const FORUM = /\b(?:brics|bimstec|quad|g20|g7|asean|admm[ -]plus|sco summit|united nations|un security council|unsc|wto|world trade organi[sz]ation|unesco|unicef|unhcr|world health organi[sz]ation|world bank|imf|cop\s?\d+)\b/i;
const RELATION = /\b(?:bilateral|multilateral|sign(?:s|ed)?|mou|memorandum|treaty|trade|invest\w*|invit\w*|exports?|imports?|partnership|cooperat\w*|joint (?:military|naval|exercise)|exercise|summit|forum|hosts?|hosted|visit\w*|meets?|meeting|talks|diplomac\w*|extradition|repatriation|smuggling|remittances|cross[- ]border|border|inscribed|heritage site)\b/i;
const FOREIGN_PARTICIPANTS = /\b(?:foreign (?:countries|delegates|partners)|global south countries|partner countries|international (?:delegates|partners|participants))\b/i;
const GLOBAL_SOURCE = /^(?:WTO|UN[ _]NEWS|WHO|IMF|WORLD BANK)$/i;
const OFFICIAL_SOURCE = /^(?:PIB|RBI|PRS|MEA|ISRO|SEBI)$/i;
const LABELS: Record<CoverageScope, string> = { india: 'India', cross_border: 'India & world', international: 'World', unclassified: 'Scope under review' };

/** Publisher identities outrank inherited ministry metadata on their own releases. */
export function articleIssuerLabel(input: Pick<ClassificationInput, 'source' | 'ministry'>): string {
  const issuer: Record<string, string> = { RBI: 'Reserve Bank of India', SEBI: 'Securities and Exchange Board of India', ISRO: 'Indian Space Research Organisation' };
  return issuer[normalize(input.source).toUpperCase()] || normalize(input.ministry);
}

function resolveCoverage(input: ClassificationInput, headline: string, body: string): ArticleClassification['coverage'] {
  const source = normalize(input.source);
  const evidence = (scope: CoverageScope, reason: string, text: string, basis: ClassificationEvidence['basis']) => ({
    scope, label: LABELS[scope], reason, evidence: text ? [{ basis, quote: text.slice(0, 220) }] : [],
  });
  const actorHeadline = headline.replace(/\b(?:US|U\.S\.|United States) dollar\w*/gi, 'dollar');
  const foreignHeadline = hasForeignActor(actorHeadline) || FORUM.test(actorHeadline);
  const indianHeadline = INDIA.test(headline) || DOMESTIC.test(headline);
  const indianRole = OFFICIAL_SOURCE.test(source) && /\b(?:president|prime minister|union|minister|ministry|cabinet|navy|army)\b/i.test(headline);
  // Foreign events stay foreign even when the summary adds an Indian economic consequence.
  if (foreignHeadline && !indianHeadline && !indianRole) {
    return evidence('international', 'The headline concerns a foreign actor or an international institution.', headline, 'headline');
  }
  if ((foreignHeadline && (RELATION.test(headline) || FORUM.test(headline)) || /\bcross[- ]border\b/i.test(headline)) && (indianHeadline || indianRole)) {
    return evidence('cross_border', 'The headline connects an Indian actor or institution with a foreign partner, forum or cross-border activity.', headline, 'headline');
  }
  // Consult the factual opening only when the headline does not already describe a domestic subject.
  const opening = body.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').slice(0, 600);
  const genericHeadline = !indianHeadline || /\b(?:mou|memorandum|agreement|visit|summit|partnership)\b/i.test(headline);
  if (genericHeadline && (hasForeignActor(opening) || FORUM.test(opening) || FOREIGN_PARTICIPANTS.test(opening)) && RELATION.test(`${headline} ${opening}`)
      && (INDIA.test(opening) || DOMESTIC.test(opening) || indianRole)) {
    return evidence('cross_border', 'The factual opening identifies Indian participation in an international relationship or activity.', opening, 'summary');
  }
  if (indianHeadline) return evidence('india', 'The headline describes an Indian policy, place or institution without an identified international relationship.', headline, 'headline');
  if (hasForeignActor(opening) || FORUM.test(opening) || (GLOBAL_SOURCE.test(source) && !!(headline || opening))) {
    return evidence('international', 'The available report concerns foreign or multilateral affairs without established Indian participation.', opening || headline, opening ? 'summary' : 'headline');
  }
  if (INDIA.test(opening) || DOMESTIC.test(opening)) return evidence('india', 'The factual opening identifies a domestic Indian development.', opening, 'summary');
  if (OFFICIAL_SOURCE.test(source) && headline) {
    return evidence('india', 'An Indian official publisher reports this development; the article identifies no foreign actor or international activity.', source, 'metadata');
  }
  return evidence('unclassified', 'There is not enough geographic evidence to assign coverage.', '', 'headline');
}

interface SubjectRule { id: string; paper: string; topic: string; nodeId: string; pattern: RegExp; priority?: number; }
const SUBJECTS: SubjectRule[] = [
  { id: 'culture', paper: 'GS-I', topic: 'Culture & heritage', nodeId: 'GS1.CUL', pattern: /\b(?:manuscripts?|heritage|museums?|archaeolog\w*|monuments?|biblioth[eè]que|classical (?:dance|music|language)|cultural preservation|singers?|musicians?|literature|literary|writers?|arts?|artisans?|cinema|films?)\b/i, priority: 2 },
  { id: 'history', paper: 'GS-I', topic: 'History', nodeId: 'GS1.HIS', pattern: /\b(?:freedom struggle|independence movement|independence|mountbatten|ancient|medieval|colonial|historical archives)\b/i },
  { id: 'geography', paper: 'GS-I', topic: 'Geography', nodeId: 'GS1.GEO', pattern: /\b(?:geomorph\w*|tectonic\w*|ocean currents?|monsoon|geological survey|glaciers?)\b/i },
  { id: 'banking', paper: 'GS-III', topic: 'Banking & regulation', nodeId: 'GS3.ECO.BANKING', pattern: /\b(?:banks?|banking|repo|monetary|liquidity|vrrr|nbfc|government securities|rbi|reserve bank)\b/i },
  { id: 'agriculture', paper: 'GS-III', topic: 'Agriculture & soil', nodeId: 'GS3.AGRI', pattern: /\b(?:farmers?|agricultur\w*|soil health|rabi|kharif|icar|kvk|khet bachao|pm-kisan|irrigation|crop\w*|msp)\b/i },
  { id: 'energy', paper: 'GS-III', topic: 'Energy transition', nodeId: 'GS3.ENV.ENERGY_TRANS', pattern: /\b(?:green hydrogen|renewable energy|solar energy|wind energy|electroly[sz]\w*|non-fossil|clean energy|energy transition|ethanol|e20 fuel|hydropower|biofuels?|wind.*power)\b/i, priority: 1 },
  { id: 'environment', paper: 'GS-III', topic: 'Environment & ecology', nodeId: 'GS3.ENV', pattern: /\b(?:biodiversity|wildlife|forest\w*|pollution|climate|wetlands?|carbon emissions?|carbon capture|ccus|decarboni[sz]\w*|net zero|e-waste|ecolog\w*|air quality|aqi|recycl\w*|sanitation|waste management)\b/i },
  { id: 'space', paper: 'GS-III', topic: 'Space & technology', nodeId: 'GS3.SCI.SPACE', pattern: /\b(?:isro|spadex|nglv|gaganyaan|satellites?|space docking|space technology|launch vehicle|lunar|chandrayaan)\b/i, priority: 1 },
  { id: 'technology', paper: 'GS-III', topic: 'Science & technology', nodeId: 'GS3.SCI', pattern: /\b(?:science|technolog\w*|ai|semiconductor\w*|quantum|artificial intelligence|biotechnolog\w*|nanotechnolog\w*|supercomput\w*|patents?|nuclear|fast breeder reactor)\b/i },
  { id: 'trade', paper: 'GS-III', topic: 'Trade & investment', nodeId: 'GS3.ECO.TRADE', pattern: /\b(?:trade|exports?|imports?|free trade agreement|fta|cepa|efta|tepa|tariffs?|supply chains?|shipbuilding|foreign direct investment)\b/i },
  { id: 'economy', paper: 'GS-III', topic: 'Economy & public finance', nodeId: 'GS3.ECO', pattern: /\b(?:fiscal|tax(?:es|ation|payers?)?|gdp|inflation|public finance|budget|disinvestment|economic growth|industrial production|economics?|competition commission|acquisitions?|mergers?|antitrust|manufactur\w*|msmes?|labour|labor|employment|provident fund|epfo|gigafactor\w*)\b/i },
  { id: 'infrastructure', paper: 'GS-III', topic: 'Infrastructure & transport', nodeId: 'GS3.ECO.INFRA', pattern: /\b(?:railways?|highways?|toll|infrastructure|shipping|ports?|freight|metro|urban development|housing project|telecom|trai)\b/i },
  { id: 'health', paper: 'GS-II', topic: 'Health & nutrition', nodeId: 'GS2.SOCJ.HEALTH', pattern: /\b(?:health\w*|hospitals?|cancer|vaccin\w*|nutrition|poshan|anganwadi|ayushman|disease\w*|maternal|pediatr\w*)\b/i },
  { id: 'education', paper: 'GS-II', topic: 'Education & research', nodeId: 'GS2.SOCJ.EDUCATION', pattern: /\b(?:education|schools?|universit\w*|scholarships?|fellowship|students?|literacy)\b/i },
  { id: 'welfare', paper: 'GS-II', topic: 'Social justice & welfare', nodeId: 'GS2.SOCJ', pattern: /\b(?:social justice|women|child development|tribal welfare|disabilit\w*|pensions?|social protection|senior citizens?|vayo abhyuday|marginali[sz]ed|sanitation workers?|esic|employees.*insurance)\b/i },
  { id: 'polity', paper: 'GS-II', topic: 'Polity & constitution', nodeId: 'GS2.POL', pattern: /\b(?:constitution\w*|parliament(?!\s+(?:house|complex))|supreme court|high court|elections?|electoral|voting|judiciary|federalism|fundamental rights|ordinance|human rights|human dignity|nhrc|article 370)\b/i },
  { id: 'governance', paper: 'GS-II', topic: 'Governance', nodeId: 'GS2.GOV', pattern: /\b(?:record management|administrative reform|accountability|public grievance|cpgrams|e-governance|civil service|public service|upsc|transparency|governance|official language|hindi consultative committee|urban systems|service delivery)\b/i },
  { id: 'security', paper: 'GS-III', topic: 'Defence & security', nodeId: 'GS3.SEC', pattern: /\b(?:defence|defense|military|naval|navy|army|iaf|missile\w*|terror\w*|cyber ?security|coast guard|border security|smuggling|narco\w*|ncb|drug network|meth|cannabis)\b/i },
  { id: 'disaster', paper: 'GS-III', topic: 'Disaster management', nodeId: 'GS3.DIS', pattern: /\b(?:cyclone\w*|disaster\w*|flood\w*|earthquake\w*|ndrf)\b/i },
  { id: 'ethics', paper: 'GS-IV', topic: 'Ethics & integrity', nodeId: 'GS4.ETH', pattern: /\b(?:ethical|ethics|integrity|conflict of interest|probity|moral philosophy)\b/i },
  { id: 'ir', paper: 'GS-II', topic: 'International relations', nodeId: 'GS2.IR', pattern: /\b(?:bilateral|multilateral|diplomac\w*|foreign policy|geopolit\w*|summit|parliamentary forum|extradition)\b/i, priority: -5 },
];

export function classifyArticle(input: ClassificationInput): ArticleClassification {
  const headline = normalize(input.headline);
  // Only factual bullets are evidence; exam advice, old tags, and ministry boilerplate cannot turn a domestic event into diplomacy.
  const bullets = Array.isArray(input.summary?.bullets) ? input.summary.bullets.filter(item => typeof item === 'string').slice(0, 2) : [];
  const rawBody = normalize(input.body ?? bullets.join(' ')).slice(0, 1600);
  const boilerplate = /\b(?:government (?:did|does|has) not (?:implement|introduce)|no (?:new |specific )?(?:policy|legislative|fiscal) (?:changes?|measures?))\b/i;
  const body = rawBody.split(/(?<=[.!?])\s+/).filter(sentence => !boilerplate.test(sentence)).join(' ');
  const coverage = resolveCoverage(input, headline, body);
  const ranked = SUBJECTS.map(rule => {
    const evidence: ClassificationEvidence[] = [];
    const headlineMatch = headline.match(rule.pattern);
    const bodyMatch = body.match(rule.pattern);
    if (headlineMatch) evidence.push({ basis: 'headline', quote: headlineMatch[0] });
    if (bodyMatch) evidence.push({ basis: 'summary', quote: bodyMatch[0] });
    let score = (headlineMatch ? 12 : 0) + (bodyMatch ? 3 : 0);
    // An older taxonomy node is corroboration, never stronger than article text.
    if (input.node_id === rule.nodeId || input.node_id?.startsWith(`${rule.nodeId}.`)) score += 1;
    if (rule.id === 'banking' && input.source?.toUpperCase() === 'RBI') score += 1;
    if (rule.id === 'governance' && /official language|hindi consultative committee/i.test(headline)) score += 5;
    return { rule, evidence, score: score ? Math.max(1, score + (rule.priority || 0)) : 0 };
  }).filter(candidate => candidate.evidence.length > 0 && candidate.score > 0).sort((a, b) => b.score - a.score);
  const toMatch = (candidate: typeof ranked[number]): SubjectMatch => ({ id: candidate.rule.id, paper: candidate.rule.paper, topic: candidate.rule.topic, nodeId: candidate.rule.nodeId, evidence: candidate.evidence });
  const primary = ranked[0] ? toMatch(ranked[0]) : null;
  const secondary = ranked.slice(1).filter(candidate => candidate.score >= 7 && !primary?.nodeId.startsWith(`${candidate.rule.nodeId}.`)).slice(0, 2).map(toMatch);
  // Geography and subject are independent: a heritage agreement remains Culture, with IR as a secondary connection.
  if (coverage.scope === 'cross_border' && primary?.id !== 'ir' && !secondary.some(match => match.id === 'ir') && RELATION.test(`${headline} ${body}`)) {
    secondary.push({ id: 'ir', paper: 'GS-II', topic: 'International relations', nodeId: 'GS2.IR', evidence: coverage.evidence });
  }
  const reviewReasons = [
    ...(!primary ? ['No supported syllabus subject was identified.'] : []),
    ...(primary && !primary.evidence.some(item => item.basis === 'headline') ? ['Subject inferred from summary; editorial review recommended.'] : []),
    ...(coverage.scope === 'unclassified' ? ['Geographic scope is unresolved.'] : []),
    ...(boilerplate.test(rawBody) ? ['Generic negative policy boilerplate was excluded from the evidence.'] : []),
    ...(input.source?.toUpperCase() === 'RBI' && input.ministry && !/reserve bank|finance|government of india|^general$/i.test(input.ministry) ? ['Stored ministry conflicts with the RBI publisher identity.'] : []),
  ];
  return { version: CLASSIFICATION_VERSION, coverage, primary, secondary: secondary.slice(0, 2), needsReview: reviewReasons.length > 0, reviewReasons };
}

export function isInternationalArticle(input: ClassificationInput): boolean {
  const scope = classifyArticle(input).coverage.scope;
  return scope === 'cross_border' || scope === 'international';
}

/** A safe additive summary patch. Historical tags, evidence and claims are retained for auditing. */
export function classificationSummary(input: ClassificationInput) {
  const result = classifyArticle(input);
  return { ...(input.summary || {}), classification: result, syllabus_paper: result.primary?.paper || null, syllabus_topic: result.primary?.topic || null };
}
