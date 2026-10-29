/**
 * server-lib/news/coverage-classifier.ts
 *
 * Deterministic classifier for Tark news coverage scope:
 * - 'india': Domestic national policy, union ministries, state schemes, RBI, Supreme Court, domestic welfare.
 * - 'cross_border': India's bilateral agreements, MEA, treaties, joint military drills, foreign trade (FTAs), foreign MoUs.
 * - 'international': Pure global affairs, multilateral disputes, foreign elections/conflicts without direct India involvement.
 */

export type CoverageScope = 'india' | 'cross_border' | 'international';

const CROSS_BORDER_PATTERNS = [
  /\b(?:bilateral|mou with|agreement with|treaty with|protocol with)\b/i,
  /\b(?:free trade agreement|fta|cepa|ecta|tepa|preferential trade)\b/i,
  /\b(?:admm-plus|admm plus|quad leaders|quad summit|brics summit|sco summit|asean-india|bimstec|g20 presidency|g20 summit|east asia summit)\b/i,
  /\b(?:indo-pacific|chabahar|kaladan|imec corridor|instc)\b/i,
  /\b(?:india[ -](?:us|usa|china|russia|france|uk|japan|bangladesh|pakistan|nepal|sri lanka|uae|saudi|germany|australia|israel|iran|myanmar|brazil|south africa|bhutan|maldives|singapore))\b/i,
  /\b(?:external affairs|foreign minister|foreign secretary|diplomatic mission|ambassador to|high commissioner|consulate general)\b/i,
  /\b(?:line of actual control|lac disengagement|loc ceasefire|border peace)\b/i,
  /\b(?:extradition treaty|mutual legal assistance|bilateral maritime|naval exercise|joint military exercise)\b/i,
  /\b(?:foreign direct investment policy|fdi norms|cross-border payments|cross-border remittances|currency swap agreement)\b/i,
  /\b(?:russian oil imports|french navy|france sign|japan-india|us-india|india-eu)\b/i,
];

const INTERNATIONAL_PATTERNS = [
  /\b(?:us fed(?:eral reserve)?|wall street|pentagon|white house)\b/i,
  /\b(?:us presidential election|donald trump|joe biden|kamala harris|us congress)\b/i,
  /\b(?:israel-hamas|gaza ceasefire|hezbollah|lebanon strike|rafah|middle east conflict)\b/i,
  /\b(?:ukraine war|russia-ukraine war|vladimir putin|volodymyr zelenskyy|kyiv)\b/i,
  /\b(?:taiwan strait|south china sea tensions|beijing warns)\b/i,
  /\b(?:european central bank|ecb rate|bank of england|bank of japan rate|bundesbank)\b/i,
  /\b(?:united nations general assembly|un security council resolution|unhcr|unicef global)\b/i,
  /\b(?:wto dispute settlement body|wto panel report|appellate body)\b/i,
];

const INDIA_INDICATORS = [
  /\b(?:india|indian|union cabinet|prime minister narendra modi|shri narendra modi|cabinet approves|pib|rbi|reserve bank of india)\b/i,
  /\b(?:delhi|mumbai|karnataka|mandya|gujarat|uttar pradesh|maharashtra|tamil nadu|kerala|bihar|assam|punjab|haryana|odisha|rajasthan|west bengal|madhya pradesh)\b/i,
  /\b(?:lok sabha|rajya sabha|parliament of india|supreme court of india|high court of|niti aayog|sebi|cci|trai|irda|epfo|esic)\b/i,
  /\b(?:isro|spadex|nglv|gaganyaan|drdo|agniveer|vande bharat|khet bachao|soil health card|icar|kvk|rabi crop|kharif crop|msp|pm-kisan|jal jeevan|ayushman bharat)\b/i,
  /\b(?:g-sec|government securities|liquidity adjustment facility|repo rate|monetary policy committee|banking regulation act)\b/i,
];

export function determineCoverageScope(params: {
  source?: string | null;
  ministry?: string | null;
  headline?: string | null;
  body?: string | null;
  tags?: string[] | null;
}): CoverageScope {
  const source = (params.source || '').trim().toUpperCase();
  const ministry = (params.ministry || '').trim();
  const headline = (params.headline || '').trim();
  const body = (params.body || '').trim();
  const fullText = `${headline} ${body} ${ministry}`;

  // 1. MEA source or Ministry of External Affairs
  if (source === 'MEA' || /External Affairs/i.test(ministry)) {
    return 'cross_border';
  }

  // 2. Check for explicit Cross-Border bilateral / diplomatic markers
  for (const pattern of CROSS_BORDER_PATTERNS) {
    if (pattern.test(fullText)) {
      return 'cross_border';
    }
  }

  // 3. Multilateral or global sources (WTO, UN NEWS)
  if (source === 'WTO' || source === 'UN NEWS') {
    if (/\b(?:india|indian|new delhi)\b/i.test(fullText)) {
      return 'cross_border';
    }
    return 'international';
  }

  // 4. Pure International patterns (where India is not the primary actor)
  for (const pattern of INTERNATIONAL_PATTERNS) {
    if (pattern.test(fullText)) {
      // If there are explicit Indian domestic policy markers, prioritize cross_border or india
      const hasIndiaFocus = INDIA_INDICATORS.some((p) => p.test(fullText));
      if (!hasIndiaFocus) {
        return 'international';
      }
      return 'cross_border';
    }
  }

  // 5. Domestic authorities & sources (RBI, PRS, PIB, Union ministries)
  return 'india';
}

