/**
 * src/lib/policy-ripple-radar-shared.ts
 *
 * Unified Cross-Room Telemetry:
 * 1. Policy Ripple Linking & Deep Links (Alt + 2 -> Alt + 6)
 * 2. 5-Tier Legal Authority Registry Lookup (BAY_02 Dissection)
 * 3. Empirical Volcano Node Radar (V_j) Detection & Telemetry
 */

import { CANONICAL_RIPPLE_CHAINS, type RippleChain, type EntityRecord } from '../components/observatory/policy-ripple-data';

export interface VolcanoNodeTelemetry {
  node_id: string;
  title: string;
  paper: string;
  last_tested_year: number | null;
  years_dormant: number;
  recurrence_interval_avg: number;
  news_count_2026: number;
  volcano_index: number;
  volcano_status: 'ERUPTING' | 'HEATING' | 'STABLE';
}

export const CANONICAL_VOLCANO_BASELINES: Record<string, VolcanoNodeTelemetry> = {
  'GS3.ECO.EXTERNAL': {
    node_id: 'GS3.ECO.EXTERNAL',
    title: 'External Sector, BoP, Rupee Internationalization & FOREX',
    paper: 'GS3',
    last_tested_year: 2013,
    years_dormant: 13,
    recurrence_interval_avg: 1.5,
    news_count_2026: 18,
    volcano_index: 30.13,
    volcano_status: 'ERUPTING',
  },
  'GS2.IR.BILATERAL': {
    node_id: 'GS2.IR.BILATERAL',
    title: 'Bilateral & Regional Groupings (Quad, I2U2, IMEC & Critical Corridors)',
    paper: 'GS2',
    last_tested_year: 2014,
    years_dormant: 12,
    recurrence_interval_avg: 1.5,
    news_count_2026: 15,
    volcano_index: 28.53,
    volcano_status: 'ERUPTING',
  },
  'GS3.SCI.IT_COMP': {
    node_id: 'GS3.SCI.IT_COMP',
    title: 'Semiconductors, Quantum Computing & AI Infrastructure',
    paper: 'GS3',
    last_tested_year: 2018,
    years_dormant: 8,
    recurrence_interval_avg: 2.0,
    news_count_2026: 14,
    volcano_index: 13.38,
    volcano_status: 'ERUPTING',
  },
  'GS3.ENV.POLLUTION': {
    node_id: 'GS3.ENV.POLLUTION',
    title: 'Circular Economy, E-Waste & Industrial Effluent Compliance',
    paper: 'GS3',
    last_tested_year: 2019,
    years_dormant: 7,
    recurrence_interval_avg: 2.2,
    news_count_2026: 11,
    volcano_index: 10.12,
    volcano_status: 'ERUPTING',
  },
  'GS3.DEF.MODERN': {
    node_id: 'GS3.DEF.MODERN',
    title: 'Defense Indigenization, DAP 2026 & Defense Export Corridors',
    paper: 'GS3',
    last_tested_year: 2017,
    years_dormant: 9,
    recurrence_interval_avg: 2.8,
    news_count_2026: 8,
    volcano_index: 9.11,
    volcano_status: 'ERUPTING',
  },
  'GS3.AGRI.MSP': {
    node_id: 'GS3.AGRI.MSP',
    title: 'Agri-Cooperative Federalism & MSP Dynamic Pricing Architecture',
    paper: 'GS3',
    last_tested_year: 2020,
    years_dormant: 6,
    recurrence_interval_avg: 2.5,
    news_count_2026: 9,
    volcano_index: 7.07,
    volcano_status: 'HEATING',
  },
  'GS3.ECO.MONETARY': {
    node_id: 'GS3.ECO.MONETARY',
    title: 'RBI Liquidity Framework, VRRR Auctions & Inflation Targeting',
    paper: 'GS3',
    last_tested_year: 2021,
    years_dormant: 5,
    recurrence_interval_avg: 2.5,
    news_count_2026: 10,
    volcano_index: 6.09,
    volcano_status: 'HEATING',
  },
  'GS3.ENV.RENEWABLE': {
    node_id: 'GS3.ENV.RENEWABLE',
    title: 'National Green Hydrogen Mission (SIGHT) & Electrolyser PLI',
    paper: 'GS3',
    last_tested_year: 2021,
    years_dormant: 5,
    recurrence_interval_avg: 2.5,
    news_count_2026: 9,
    volcano_index: 5.99,
    volcano_status: 'HEATING',
  },
  'GS3.INFRA.LOGISTICS': {
    node_id: 'GS3.INFRA.LOGISTICS',
    title: 'PM GatiShakti National Master Plan & Unified Logistics Portal (ULIP)',
    paper: 'GS3',
    last_tested_year: 2022,
    years_dormant: 4,
    recurrence_interval_avg: 2.4,
    news_count_2026: 8,
    volcano_index: 4.72,
    volcano_status: 'HEATING',
  },
  'GS2.SOCJ.HEALTH': {
    node_id: 'GS2.SOCJ.HEALTH',
    title: 'AYUSH Integration, Pharmacopoeia Commission & Universal Health',
    paper: 'GS2',
    last_tested_year: 2022,
    years_dormant: 4,
    recurrence_interval_avg: 2.5,
    news_count_2026: 7,
    volcano_index: 4.34,
    volcano_status: 'HEATING',
  },
};

export const CANONICAL_5_TIER_ENTITIES: Record<string, {
  slug: string;
  authority: string;
  aliases: string[];
  parent_ministry: string;
  tier_number: number;
  tier_name: string;
  parent_statute_or_article: string;
  neutralized_trap: string;
  trap_explanation: string;
}> = {
  ENT_ISM: {
    slug: 'ENT_ISM',
    authority: 'India Semiconductor Mission (ISM)',
    aliases: ['ISM', 'India Semiconductor Mission'],
    parent_ministry: 'MeitY (Digital India Corporation)',
    tier_number: 4,
    tier_name: 'Autonomous Society / Nodal Division',
    parent_statute_or_article: 'Section 8 Company division (DIC)',
    neutralized_trap: 'PSY_03_LEGAL_TIER',
    trap_explanation: 'Created via Executive Administrative Division within Digital India Corporation, NOT an Act of Parliament.',
  },
  ENT_NFRA: {
    slug: 'ENT_NFRA',
    authority: 'National Financial Reporting Authority (NFRA)',
    aliases: ['NFRA', 'National Financial Reporting Authority'],
    parent_ministry: 'Ministry of Corporate Affairs (MCA)',
    tier_number: 2,
    tier_name: 'Statutory Regulatory Authority',
    parent_statute_or_article: 'Companies Act, 2013 §132',
    neutralized_trap: 'PSY_03_LEGAL_TIER',
    trap_explanation: 'Established pursuant to Section 132 of the Companies Act, 2013, NOT an executive advisory board.',
  },
  ENT_ECI: {
    slug: 'ENT_ECI',
    authority: 'Election Commission of India (ECI)',
    aliases: ['ECI', 'Election Commission of India'],
    parent_ministry: 'Ministry of Law and Justice (Independent Constitutional Organ)',
    tier_number: 1,
    tier_name: 'Constitutional Body',
    parent_statute_or_article: 'Constitution of India, Article 324',
    neutralized_trap: 'PSY_03_LEGAL_TIER',
    trap_explanation: 'Derives direct constitutional mandate under Article 324, NOT created by parliamentary statute.',
  },
  ENT_CAQM: {
    slug: 'ENT_CAQM',
    authority: 'Commission for Air Quality Management (CAQM)',
    aliases: ['CAQM', 'Commission for Air Quality Management'],
    parent_ministry: 'Ministry of Environment, Forest and Climate Change (MoEFCC)',
    tier_number: 2,
    tier_name: 'Statutory Commission',
    parent_statute_or_article: 'CAQM in NCR and Adjoining Areas Act, 2021',
    neutralized_trap: 'PSY_03_LEGAL_TIER',
    trap_explanation: 'Statutory authority replacing EPCA via Commission for Air Quality Management in NCR Act, 2021.',
  },
  ENT_RBI: {
    slug: 'ENT_RBI',
    authority: 'Reserve Bank of India (RBI)',
    aliases: ['RBI', 'Reserve Bank of India'],
    parent_ministry: 'Ministry of Finance',
    tier_number: 2,
    tier_name: 'Statutory Central Bank',
    parent_statute_or_article: 'Reserve Bank of India Act, 1934',
    neutralized_trap: 'PSY_03_LEGAL_TIER',
    trap_explanation: 'Created by the Reserve Bank of India Act, 1934; central banking powers derive from statute, not Article 280.',
  },
  ENT_SIDM: {
    slug: 'ENT_SIDM',
    authority: 'Society of Indian Defence Manufacturers (SIDM)',
    aliases: ['SIDM', 'Society of Indian Defence Manufacturers'],
    parent_ministry: 'Department of Defence Production (Liaison)',
    tier_number: 4,
    tier_name: 'Non-Statutory Registered Society / Apex Industry Body',
    parent_statute_or_article: 'Societies Registration Act, 1860',
    neutralized_trap: 'PSY_03_LEGAL_TIER',
    trap_explanation: 'Autonomous registered industry association, NOT a statutory defense procurement regulator.',
  },
  ENT_CDSCO: {
    slug: 'ENT_CDSCO',
    authority: 'Central Drugs Standard Control Organisation (CDSCO)',
    aliases: ['CDSCO', 'Central Drugs Standard Control Organisation'],
    parent_ministry: 'Ministry of Health and Family Welfare',
    tier_number: 2,
    tier_name: 'Statutory Regulator',
    parent_statute_or_article: 'Drugs and Cosmetics Act, 1940',
    neutralized_trap: 'PSY_03_LEGAL_TIER',
    trap_explanation: 'Operates as the national regulatory authority under the Drugs and Cosmetics Act, 1940.',
  },
  ENT_NPCI: {
    slug: 'ENT_NPCI',
    authority: 'National Payments Corporation of India (NPCI)',
    aliases: ['NPCI', 'National Payments Corporation of India'],
    parent_ministry: 'Reserve Bank of India / Ministry of Finance',
    tier_number: 4,
    tier_name: 'Section-8 Not-for-Profit Company',
    parent_statute_or_article: 'Payment and Settlement Systems Act, 2007 / Companies Act',
    neutralized_trap: 'PSY_03_LEGAL_TIER',
    trap_explanation: 'Registered as a Section 8 not-for-profit company initiated by RBI & IBA, NOT a statutory regulator.',
  },
};

/**
 * Matches a dispatch candidate to an active Policy Ripple Chain.
 */
export function matchDispatchToPolicyChain(
  headline: string,
  ministry: string,
  summaryText?: string,
  explicitChainId?: string
): RippleChain | null {
  if (explicitChainId) {
    const direct = CANONICAL_RIPPLE_CHAINS.find((c) => c.chain_id === explicitChainId);
    if (direct) return direct;
  }

  const combined = `${headline} ${ministry} ${summaryText || ''}`.toLowerCase();

  for (const chain of CANONICAL_RIPPLE_CHAINS) {
    // Check keyword affinity
    if (chain.chain_id === 'CHAIN_01_SEMICON_NEXUS' && /\b(semicon|chip|fab|meity|ism|substrate|silicon)\b/i.test(combined)) {
      return chain;
    }
    if (chain.chain_id === 'CHAIN_02_CIRCULAR_EWASTE' && /\b(e-waste|circular economy|effluent|cpcb|recycling credit|caqm)\b/i.test(combined)) {
      return chain;
    }
    if (chain.chain_id === 'CHAIN_03_DEFENSE_EXPORT_SURGE' && /\b(defense|defence|indigenization|dap|positive indigenisation|sidm|weapon)\b/i.test(combined)) {
      return chain;
    }
    if (chain.chain_id === 'CHAIN_04_AGRI_MSP_COOP' && /\b(msp|cooperative|pacs|agriculture|ncdc|sugar|procurement)\b/i.test(combined)) {
      return chain;
    }
    if (chain.chain_id === 'CHAIN_05_MONETARY_LIQUIDITY_CORRIDOR' && /\b(vrrr|liquidity|rbi|repo|inflation target|forex)\b/i.test(combined)) {
      return chain;
    }
    if (chain.chain_id === 'CHAIN_06_GREEN_HYDROGEN_SIGHT' && /\b(hydrogen|sight|electrolyser|mnre|clean fuel|mopng)\b/i.test(combined)) {
      return chain;
    }
    if (chain.chain_id === 'CHAIN_07_GATISHAKTI_LOGISTICS' && /\b(gatishakti|ulip|logistics|freight|multimodal|ports)\b/i.test(combined)) {
      return chain;
    }
    if (chain.chain_id === 'CHAIN_08_AYUSH_UNIVERSAL_HEALTH' && /\b(ayush|unani|ayurveda|pharmacopoeia|universal health|who)\b/i.test(combined)) {
      return chain;
    }
    if (chain.chain_id === 'CHAIN_10_CRITICAL_MINERALS_OFFSHORE' && /\b(critical mineral|offshore|lithium|rare earth|deep sea mining)\b/i.test(combined)) {
      return chain;
    }
    if (chain.chain_id === 'CHAIN_11_DATA_PROTECTION_DPDP' && /\b(dpdp|data protection|consent manager|privacy)\b/i.test(combined)) {
      return chain;
    }
    if (chain.chain_id === 'CHAIN_15_SPACE_COMMERCIALIZATION' && /\b(in-space|isro|nsil|commercial satellite|space policy)\b/i.test(combined)) {
      return chain;
    }
  }

  return null;
}

/**
 * Resolves Volcano Node telemetry for a syllabus node, dispatch headline, or ministry.
 */
export function getVolcanoTelemetryForNode(
  nodeId?: string,
  headline?: string,
  ministry?: string
): VolcanoNodeTelemetry | null {
  if (nodeId && CANONICAL_VOLCANO_BASELINES[nodeId]) {
    return CANONICAL_VOLCANO_BASELINES[nodeId];
  }

  const text = `${headline || ''} ${ministry || ''}`.toLowerCase();

  if (/\b(bop|balance of payments|forex|external debt|rupee internationalization|cad)\b/i.test(text)) {
    return CANONICAL_VOLCANO_BASELINES['GS3.ECO.EXTERNAL'];
  }
  if (/\b(bilateral|quad|i2u2|imec|free trade agreement|fta|border corridor)\b/i.test(text)) {
    return CANONICAL_VOLCANO_BASELINES['GS2.IR.BILATERAL'];
  }
  if (/\b(semiconductor|ism|chip|quantum|computing|ai compute)\b/i.test(text)) {
    return CANONICAL_VOLCANO_BASELINES['GS3.SCI.IT_COMP'];
  }
  if (/\b(circular economy|e-waste|caqm|stubble|pollution abatement)\b/i.test(text)) {
    return CANONICAL_VOLCANO_BASELINES['GS3.ENV.POLLUTION'];
  }
  if (/\b(defense indigenization|dap|defense export|sidm)\b/i.test(text)) {
    return CANONICAL_VOLCANO_BASELINES['GS3.DEF.MODERN'];
  }

  return {
    node_id: nodeId || 'GENERAL',
    title: headline || 'General Syllabus Node',
    paper: 'GS',
    last_tested_year: 2024,
    years_dormant: 2,
    recurrence_interval_avg: 2.5,
    news_count_2026: 0,
    volcano_index: 0,
    volcano_status: 'STABLE',
  };
}

/**
 * Scans text or entity slugs to match against the 5-Tier Legal Authority Registry.
 */
export function getPolicyEntityForText(text: string, entitySlugs?: string[]) {
  if (Array.isArray(entitySlugs) && entitySlugs.length > 0) {
    for (const slug of entitySlugs) {
      if (CANONICAL_5_TIER_ENTITIES[slug]) {
        return CANONICAL_5_TIER_ENTITIES[slug];
      }
    }
  }

  const upper = text.toUpperCase();
  for (const ent of Object.values(CANONICAL_5_TIER_ENTITIES)) {
    for (const alias of ent.aliases) {
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(upper)) {
        return ent;
      }
    }
  }

  return null;
}

export interface BossMcqDefinition {
  stem: string;
  statements: string[];
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  official_key: 'a' | 'b' | 'c' | 'd';
  primary_operator: string;
  secondary_operator: string;
  claim_half_life_days: number;
  statutory_anchor: string;
  statement_dissection: Array<{
    stmt_num: number;
    is_true: boolean;
    operator: string | null;
    anchor?: string;
    marked_trap?: string;
    truth_key?: string;
  }>;
}

export const CANONICAL_BOSS_MCQ_FALLBACKS: Record<string, BossMcqDefinition> = {
  CHAIN_01_SEMICON_NEXUS: {
    stem: "With reference to the India Semiconductor Mission (ISM) and Semicon 2.0 architecture, consider the following statements:",
    statements: [
      "1. Under Semicon 2.0 guidelines approved by the Union Cabinet, fiscal support of up to 50% of project cost is extended on an equal pari-passu basis for setting up Silicon Semiconductor Fabs in India.",
      "2. The operationalization of compound semiconductor units and execution of the Electronic Components and Manufacturing Scheme (ECMS) is administered directly under the statutory authority of the Ministry of Heavy Industries.",
      "3. The India Semiconductor Mission (ISM) is a statutory regulatory body established pursuant to an Act of Parliament to adjudicate technology transfer disputes."
    ],
    options: {
      a: "Only one",
      b: "Only two",
      c: "All three",
      d: "None"
    },
    official_key: "a",
    primary_operator: "PSY_01_INST_SWAP",
    secondary_operator: "PSY_03_LEGAL_TIER",
    claim_half_life_days: 231.0,
    statutory_anchor: "Cabinet Semicon 2.0 Approval / MeitY Notification ISM-2022/01",
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: "Sovereign Cabinet approval provides 50% capital subsidy on pari-passu basis for approved Silicon Fabs."
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: "PSY_01_INST_SWAP",
        marked_trap: "Ministry of Heavy Industries",
        truth_key: "Ministry of Electronics and Information Technology (MeitY) / Digital India Corporation",
        anchor: "ECMS and ISM are administered directly by MeitY, NOT Ministry of Heavy Industries."
      },
      {
        stmt_num: 3,
        is_true: false,
        operator: "PSY_03_LEGAL_TIER",
        marked_trap: "Tier-2 Statutory Regulatory Body pursuant to Act of Parliament",
        truth_key: "Tier-4 Autonomous Nodal Division / Society within Digital India Corporation",
        anchor: "ISM is an autonomous business division under Digital India Corporation (Section 8 company), NOT a statutory body established by Parliament."
      }
    ]
  },
  CHAIN_02_CIRCULAR_EWASTE: {
    stem: "With reference to the Extended Producer Responsibility (EPR) and Circular Economy framework for electrical and electronic equipment, consider the following statements:",
    statements: [
      "1. Under the E-Waste (Management) Rules, producers of electronic goods are mandated to achieve specified recycling targets through registered recyclers generating online EPR certificates.",
      "2. The centralized digital EPR portal for registering recycling certificates and monitoring trading compliance is managed directly by NITI Aayog.",
      "3. The Commission for Air Quality Management (CAQM) is an executive advisory committee constituted under an administrative order of the Ministry of Power."
    ],
    options: {
      a: "Only one",
      b: "Only two",
      c: "All three",
      d: "None"
    },
    official_key: "a",
    primary_operator: "PSY_01_INST_SWAP",
    secondary_operator: "PSY_03_LEGAL_TIER",
    claim_half_life_days: 231.0,
    statutory_anchor: "Environment (Protection) Act, 1986 / E-Waste (Management) Rules, 2022",
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: "E-Waste Rules 2022 introduce market-based EPR recycling credit trading system for registered producers."
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: "PSY_01_INST_SWAP",
        marked_trap: "NITI Aayog",
        truth_key: "Central Pollution Control Board (CPCB) / MoEFCC",
        anchor: "Centralized EPR portal and compliance enforcement is vested in CPCB under MoEFCC, NOT NITI Aayog."
      },
      {
        stmt_num: 3,
        is_true: false,
        operator: "PSY_03_LEGAL_TIER",
        marked_trap: "Executive advisory committee under Ministry of Power",
        truth_key: "Tier-2 Statutory Commission established by an Act of Parliament (CAQM Act, 2021)",
        anchor: "CAQM is a statutory body created by the Commission for Air Quality Management in NCR Act, 2021, NOT an executive advisory panel."
      }
    ]
  },
  CHAIN_03_DEFENSE_EXPORT_SURGE: {
    stem: "With reference to the Defense Indigenization and Defense Acquisition Procedure (DAP) architecture, consider the following statements:",
    statements: [
      "1. Under the Positive Indigenization Lists notified by the Ministry of Defense, embargoes are placed on the import of designated defense systems to promote domestic manufacturing.",
      "2. The issuance of industrial licenses for manufacturing defense aircraft, warships, and specialized combat equipment is regulated exclusively by the Ministry of Defense.",
      "3. The Society of Indian Defense Manufacturers (SIDM) is a statutory authority established by an Act of Parliament to set mandatory defense export quotas."
    ],
    options: {
      a: "Only one",
      b: "Only two",
      c: "All three",
      d: "None"
    },
    official_key: "a",
    primary_operator: "PSY_01_INST_SWAP",
    secondary_operator: "PSY_03_LEGAL_TIER",
    claim_half_life_days: 231.0,
    statutory_anchor: "Industries (Development & Regulation) Act, 1951 / DAP Guidelines",
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: "Defense Ministry notifications enforce progressive import bans across 500+ defense hardware items."
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: "PSY_01_INST_SWAP",
        marked_trap: "Ministry of Defense",
        truth_key: "Department for Promotion of Industry and Internal Trade (DPIIT) / Ministry of Commerce",
        anchor: "Defense industrial licensing is administered by DPIIT under IDRA 1951, in consultation with MoD."
      },
      {
        stmt_num: 3,
        is_true: false,
        operator: "PSY_03_LEGAL_TIER",
        marked_trap: "Tier-2 Statutory Authority established by Parliament",
        truth_key: "Tier-4 Apex Industry Association / Registered Society (non-statutory)",
        anchor: "SIDM is a non-governmental apex defense industry body, NOT a statutory commission created by Parliament."
      }
    ]
  }
};

export function getBossMcqForChain(chain: RippleChain | { chain_id: string; boss_mcq?: any }): BossMcqDefinition | null {
  if (chain && 'boss_mcq' in chain && chain.boss_mcq) {
    return chain.boss_mcq as BossMcqDefinition;
  }
  if (chain?.chain_id && CANONICAL_BOSS_MCQ_FALLBACKS[chain.chain_id]) {
    return CANONICAL_BOSS_MCQ_FALLBACKS[chain.chain_id];
  }
  return CANONICAL_BOSS_MCQ_FALLBACKS['CHAIN_01_SEMICON_NEXUS'] || null;
}

