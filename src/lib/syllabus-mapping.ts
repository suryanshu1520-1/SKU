/**
 * src/lib/syllabus-mapping.ts
 *
 * Canonical Syllabus Taxonomy & Versioned Study Resource Mapping Registry.
 *
 * Reconciles editorial study resources (notes, exam-notes, maps, references, answers)
 * with the 137 canonical UPSC syllabus nodes in `syllabus_nodes`.
 *
 * Features:
 * - Versioned 1:1, 1:N (junction), and cross-paper mappings
 * - Legacy alias resolution without rewriting stored resource IDs
 * - Known-node validation and reverse indexing
 * - Zero external runtime dependencies (works in client, server, and worker runtimes)
 */

export interface CanonicalNodeRef {
  id: string;
  paper: 'GS1' | 'GS2' | 'GS3' | 'GS4' | 'PRELIMS' | 'CSAT' | 'ESSAY';
  title: string;
}

export type ResourceRelationType = 'primary' | 'secondary' | 'cross_paper' | 'prerequisite';

export interface ResourceNodeMapping {
  nodeId: string;
  relationType: ResourceRelationType;
  mappingBasis: string;
}

export interface ResourceMappingEntry {
  resourceId: string;
  mappingVersion: string;
  mappings: ResourceNodeMapping[];
  reviewerStatus: 'reviewed' | 'provisional' | 'deprecated';
}

/**
 * All 137 Canonical Syllabus Nodes recognized in the active database taxonomy.
 */
export const CANONICAL_NODE_IDS = new Set<string>([
  // CSAT (4 nodes)
  'CSAT.DATA', 'CSAT.QUAN', 'CSAT.RC', 'CSAT.REAS',

  // ESSAY (3 nodes)
  'ESSAY.ENV', 'ESSAY.PHIL', 'ESSAY.SOC',

  // GS1 (28 nodes)
  'GS1.CUL', 'GS1.CUL.ARCH', 'GS1.CUL.LIT_PHIL', 'GS1.CUL.PAINT_CRAFT', 'GS1.CUL.PERFORM',
  'GS1.GEO', 'GS1.GEO.AGRI_GEO', 'GS1.GEO.CLIMATE', 'GS1.GEO.GEOMORPH', 'GS1.GEO.HUMAN',
  'GS1.GEO.IND_PHYS', 'GS1.GEO.INDUSTRY', 'GS1.GEO.OCEAN', 'GS1.GEO.RESOURCES',
  'GS1.HIS', 'GS1.HIS.ANCIENT', 'GS1.HIS.FREEDOM', 'GS1.HIS.MEDIEVAL', 'GS1.HIS.MODERN_EARLY',
  'GS1.HIS.POST_INDEP', 'GS1.HIS.WORLD',
  'GS1.SOC', 'GS1.SOC.EMPOWERMENT', 'GS1.SOC.FEATURES', 'GS1.SOC.GLOBALISATION',
  'GS1.SOC.POPULATION', 'GS1.SOC.POVERTY', 'GS1.SOC.WOMEN',

  // GS2 (29 nodes)
  'GS2.GOV', 'GS2.GOV.CIVIL_SERVICES', 'GS2.GOV.E_GOV', 'GS2.GOV.TRANSPARENCY',
  'GS2.IR', 'GS2.IR.BILATERAL', 'GS2.IR.DIASPORA', 'GS2.IR.MARITIME', 'GS2.IR.MULTILATERAL',
  'GS2.IR.NEIGHBOURHOOD', 'GS2.IR.UN_REFORM', 'GS2.IR.WEST_ASIA',
  'GS2.POL', 'GS2.POL.CONST_BODIES', 'GS2.POL.CONSTITUTION', 'GS2.POL.ELECTIONS',
  'GS2.POL.FEDERALISM', 'GS2.POL.FUND_RIGHTS', 'GS2.POL.JUDICIARY', 'GS2.POL.LOCAL_GOV',
  'GS2.POL.NON_CONST', 'GS2.POL.PARLIAMENT', 'GS2.POL.UNION_EXEC',
  'GS2.SOCJ', 'GS2.SOCJ.CIVIL_SOCIETY', 'GS2.SOCJ.EDUCATION', 'GS2.SOCJ.HEALTH',
  'GS2.SOCJ.HUNGER', 'GS2.SOCJ.SCHEMES',

  // GS3 (47 nodes)
  'GS3.AGRI', 'GS3.AGRI.ALLIED', 'GS3.AGRI.CROPPING', 'GS3.AGRI.ECONOMICS', 'GS3.AGRI.INPUTS',
  'GS3.AGRI.IRRIGATION', 'GS3.AGRI.LAND', 'GS3.AGRI.PDS', 'GS3.AGRI.PROCESSING', 'GS3.AGRI.TECH',
  'GS3.DIS', 'GS3.DIS.FRAMEWORK', 'GS3.DIS.HAZARDS',
  'GS3.ECO', 'GS3.ECO.BANKING', 'GS3.ECO.CAPITAL_MKT', 'GS3.ECO.EXTERNAL', 'GS3.ECO.FISCAL',
  'GS3.ECO.GROWTH', 'GS3.ECO.INFRA', 'GS3.ECO.INVESTMENT', 'GS3.ECO.MONETARY', 'GS3.ECO.TAXATION',
  'GS3.ECO.TRADE',
  'GS3.ENV', 'GS3.ENV.BIODIVERSITY', 'GS3.ENV.CLIMATE', 'GS3.ENV.ECOLOGY', 'GS3.ENV.ENERGY_TRANS',
  'GS3.ENV.FORESTS', 'GS3.ENV.GOVERNANCE', 'GS3.ENV.POLLUTION', 'GS3.ENV.WETLANDS',
  'GS3.SCI', 'GS3.SCI.BIOTECH', 'GS3.SCI.DEFENCE', 'GS3.SCI.IPR', 'GS3.SCI.IT_COMP',
  'GS3.SCI.NANO', 'GS3.SCI.NUCLEAR', 'GS3.SCI.SPACE',
  'GS3.SEC', 'GS3.SEC.BORDER', 'GS3.SEC.CYBER', 'GS3.SEC.FORCES', 'GS3.SEC.INTERNAL', 'GS3.SEC.TERROR',

  // GS4 (15 nodes)
  'GS4.ETH', 'GS4.ETH.ATTITUDE', 'GS4.ETH.EI', 'GS4.ETH.FOUNDATIONAL', 'GS4.ETH.INTERFACE',
  'GS4.ETH.PUBLIC_VAL', 'GS4.ETH.THINKERS', 'GS4.ETH.VALUES',
  'GS4.PROB', 'GS4.PROB.CASES', 'GS4.PROB.CITIZEN_CHARTER', 'GS4.PROB.CODES', 'GS4.PROB.CONCEPT',
  'GS4.PROB.CORRUPTION', 'GS4.PROB.WORK_CULTURE',

  // PRELIMS (11 nodes)
  'PRE.SCI', 'PRE.SCI.BIO', 'PRE.SCI.CHEM', 'PRE.SCI.DISEASE', 'PRE.SCI.PHYS',
  'PRE.STAT', 'PRE.STAT.CONVENTIONS', 'PRE.STAT.MAPPING_IND', 'PRE.STAT.MAPPING_WLD',
  'PRE.STAT.REPORTS', 'PRE.STAT.SCHEMES_CORE',
]);

/**
 * Legacy tag alias map to resolve non-canonical tags found in historical code or static data.
 */
export const LEGACY_TAG_TO_CANONICAL: Record<string, string[]> = {
  'GS2.POL.INSTITUTIONS': ['GS2.POL.CONST_BODIES', 'GS2.POL.NON_CONST'],
  'GS1.CUL.PHILOSOPHY': ['GS1.CUL.LIT_PHIL', 'GS4.ETH.THINKERS'],
  'GS3.ECO.MONEY_BANK': ['GS3.ECO.MONETARY', 'GS3.ECO.BANKING'],
  'GS3.ECO.EXTERNAL_SECTOR': ['GS3.ECO.EXTERNAL'],
  'GS4.ETH.DIMENSIONS': ['GS4.ETH.INTERFACE'],
  'CSAT.REASONING': ['CSAT.RC'],
  'GS3.ENV.CONSERVATION': ['GS3.ENV.WETLANDS'],
  'GS3.ENV.PROTECTED': ['GS3.ENV.BIODIVERSITY'],
};

/**
 * Complete Mapping Registry for all 52 Study Resources in Tark.
 * Version: v1.0 (Audited 2026-10-21)
 */
export const STUDY_RESOURCE_MAPPINGS: Record<string, ResourceMappingEntry> = {
  // =========================================================================
  // GS2 - Polity & Governance (12 Resources)
  // =========================================================================
  'gs2-polity:note:GS2.POL.CONSTITUTION': {
    resourceId: 'gs2-polity:note:GS2.POL.CONSTITUTION',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS2.POL.CONSTITUTION', relationType: 'primary', mappingBasis: 'Direct canonical match: Basic structure doctrine, amendment process, Preamble' },
    ],
  },
  'gs2-polity:note:GS2.POL.FEDERALISM': {
    resourceId: 'gs2-polity:note:GS2.POL.FEDERALISM',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS2.POL.FEDERALISM', relationType: 'primary', mappingBasis: 'Direct canonical match: Centre-state relations, Seventh Schedule, Article 356' },
    ],
  },
  'gs2-polity:note:GS2.POL.PARLIAMENT': {
    resourceId: 'gs2-polity:note:GS2.POL.PARLIAMENT',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS2.POL.PARLIAMENT', relationType: 'primary', mappingBasis: 'Direct canonical match: Parliamentary proceedings, committees (PAC, Estimates, COPU)' },
    ],
  },
  'gs2-polity:note:GS2.POL.INSTITUTIONS': {
    resourceId: 'gs2-polity:note:GS2.POL.INSTITUTIONS',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS2.POL.CONST_BODIES', relationType: 'primary', mappingBasis: 'Covers constitutional bodies: ECI, CAG, UPSC, Finance Commission' },
      { nodeId: 'GS2.POL.NON_CONST', relationType: 'secondary', mappingBasis: 'Covers statutory/quasi-judicial bodies: NHRC, CVC, CIC, Lokpal, NGT' },
    ],
  },
  'gs2-polity:exam-note:1': {
    resourceId: 'gs2-polity:exam-note:1',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS2.POL.CONSTITUTION', relationType: 'primary', mappingBasis: 'Preamble values and constitutional framework' },
      { nodeId: 'GS2.POL.FUND_RIGHTS', relationType: 'secondary', mappingBasis: 'Part III Fundamental Rights and writ review interplay' },
    ],
  },
  'gs2-polity:exam-note:2': {
    resourceId: 'gs2-polity:exam-note:2',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS2.POL.UNION_EXEC', relationType: 'primary', mappingBasis: 'Governor constitutional role, discretionary powers, Article 200/201 bills reservation' },
    ],
  },
  'gs2-polity:exam-note:3': {
    resourceId: 'gs2-polity:exam-note:3',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS2.POL.PARLIAMENT', relationType: 'primary', mappingBasis: 'Article 110 Money Bills, Speaker certification, bicameral power distribution' },
    ],
  },
  'gs2-polity:map:mm-amendment': {
    resourceId: 'gs2-polity:map:mm-amendment',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS2.POL.CONSTITUTION', relationType: 'primary', mappingBasis: 'Article 368 amendment procedures: simple, special, and federal ratification' },
    ],
  },
  'gs2-polity:map:mm-writs': {
    resourceId: 'gs2-polity:map:mm-writs',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS2.POL.FUND_RIGHTS', relationType: 'primary', mappingBasis: 'Article 32 & Article 226 constitutional prerogative writs' },
    ],
  },
  'gs2-polity:reference:pol-sc-landmarks': {
    resourceId: 'gs2-polity:reference:pol-sc-landmarks',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS2.POL.JUDICIARY', relationType: 'primary', mappingBasis: 'Supreme Court jurisprudence, judicial review, landmark benches' },
      { nodeId: 'GS2.POL.CONSTITUTION', relationType: 'secondary', mappingBasis: 'Basic structure evolution from Shankari Prasad to Kesavananda and Minerva Mills' },
    ],
  },
  'gs2-polity:reference:pol-const-vs-statutory': {
    resourceId: 'gs2-polity:reference:pol-const-vs-statutory',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS2.POL.CONST_BODIES', relationType: 'primary', mappingBasis: 'Direct matrix comparison of constitutional bodies' },
      { nodeId: 'GS2.POL.NON_CONST', relationType: 'secondary', mappingBasis: 'Direct matrix comparison of statutory/executive bodies' },
    ],
  },
  'gs2-polity:answer:1': {
    resourceId: 'gs2-polity:answer:1',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS2.POL.PARLIAMENT', relationType: 'primary', mappingBasis: 'Parliamentary sovereignty analysis' },
      { nodeId: 'GS2.POL.JUDICIARY', relationType: 'secondary', mappingBasis: 'Judicial supremacy and review synthesis' },
    ],
  },

  // =========================================================================
  // GS1 - History & Culture (12 Resources)
  // =========================================================================
  'gs1-history-culture:note:GS1.CUL.ARCH': {
    resourceId: 'gs1-history-culture:note:GS1.CUL.ARCH',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.CUL.ARCH', relationType: 'primary', mappingBasis: 'Temple styles: Nagara, Dravida, and Vesara architecture' },
    ],
  },
  'gs1-history-culture:note:GS1.HIS.FREEDOM': {
    resourceId: 'gs1-history-culture:note:GS1.HIS.FREEDOM',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.HIS.FREEDOM', relationType: 'primary', mappingBasis: 'Gandhian movements: NCM, CDM, QIM, and Swadeshi phase' },
    ],
  },
  'gs1-history-culture:note:GS1.CUL.PHILOSOPHY': {
    resourceId: 'gs1-history-culture:note:GS1.CUL.PHILOSOPHY',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.CUL.LIT_PHIL', relationType: 'primary', mappingBasis: 'Buddhism, Jainism, Shramana traditions, and ancient philosophies' },
      { nodeId: 'GS4.ETH.THINKERS', relationType: 'cross_paper', mappingBasis: 'Moral philosophy foundations (Mahavira, Buddha ethical codes)' },
    ],
  },
  'gs1-history-culture:exam-note:1': {
    resourceId: 'gs1-history-culture:exam-note:1',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.HIS.ANCIENT', relationType: 'primary', mappingBasis: 'Ancient epigraphy, rock edicts, and historical sources' },
      { nodeId: 'GS1.CUL.LIT_PHIL', relationType: 'secondary', mappingBasis: 'Ancient philosophical and literary texts' },
    ],
  },
  'gs1-history-culture:exam-note:2': {
    resourceId: 'gs1-history-culture:exam-note:2',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.HIS.ANCIENT', relationType: 'primary', mappingBasis: 'Indus Valley Civilisation, urban layout, craft centers, Lothal dockyard' },
    ],
  },
  'gs1-history-culture:map:mm-temples': {
    resourceId: 'gs1-history-culture:map:mm-temples',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.CUL.ARCH', relationType: 'primary', mappingBasis: 'Comparative morphological map of Nagara vs Dravida components' },
    ],
  },
  'gs1-history-culture:map:mm-freedom-phases': {
    resourceId: 'gs1-history-culture:map:mm-freedom-phases',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.HIS.FREEDOM', relationType: 'primary', mappingBasis: 'Sequential phases of national struggle from 1915 to 1947' },
    ],
  },
  'gs1-history-culture:reference:his-classical-dances': {
    resourceId: 'gs1-history-culture:reference:his-classical-dances',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.CUL.PERFORM', relationType: 'primary', mappingBasis: 'Sangeet Natak Akademi classical dance forms and performing arts' },
    ],
  },
  'gs1-history-culture:reference:his-harappan-sites': {
    resourceId: 'gs1-history-culture:reference:his-harappan-sites',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.HIS.ANCIENT', relationType: 'primary', mappingBasis: 'IVC archaeological sites, findings, and geographic distribution' },
    ],
  },
  'gs1-history-culture:reference:his-buddhist-councils': {
    resourceId: 'gs1-history-culture:reference:his-buddhist-councils',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.CUL.LIT_PHIL', relationType: 'primary', mappingBasis: 'Four Buddhist Councils, patron kings, presiding monks, and doctrinal canons' },
    ],
  },
  'gs1-history-culture:answer:1': {
    resourceId: 'gs1-history-culture:answer:1',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.CUL.ARCH', relationType: 'primary', mappingBasis: 'Nagara and Dravida architectural comparative answer outline' },
    ],
  },
  'gs1-history-culture:answer:2': {
    resourceId: 'gs1-history-culture:answer:2',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.HIS.ANCIENT', relationType: 'primary', mappingBasis: 'Ashokan major rock edicts and pillar edicts historical significance' },
    ],
  },

  // =========================================================================
  // GS3 - Economy & Technology (9 Resources)
  // =========================================================================
  'gs3-economy-infra:note:GS3.ECO.MONEY_BANK': {
    resourceId: 'gs3-economy-infra:note:GS3.ECO.MONEY_BANK',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ECO.MONETARY', relationType: 'primary', mappingBasis: 'Monetary policy framework, MPC, repo, SDF, MSF liquidity management' },
      { nodeId: 'GS3.ECO.BANKING', relationType: 'secondary', mappingBasis: 'Banking sector operations, statutory reserves (CRR, SLR), transmission' },
    ],
  },
  'gs3-economy-infra:note:GS3.SCI.NUCLEAR': {
    resourceId: 'gs3-economy-infra:note:GS3.SCI.NUCLEAR',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.SCI.NUCLEAR', relationType: 'primary', mappingBasis: 'Homi Bhabha three-stage nuclear power programme, thorium utilization' },
    ],
  },
  'gs3-economy-infra:note:GS3.ECO.EXTERNAL_SECTOR': {
    resourceId: 'gs3-economy-infra:note:GS3.ECO.EXTERNAL_SECTOR',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ECO.EXTERNAL', relationType: 'primary', mappingBasis: 'Balance of payments, current vs capital account, forex reserves, exchange rate' },
    ],
  },
  'gs3-economy-infra:exam-note:1': {
    resourceId: 'gs3-economy-infra:exam-note:1',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ECO.MONETARY', relationType: 'primary', mappingBasis: 'Monetary aggregates (M1, M3), Standing Deposit Facility, inflation targeting' },
    ],
  },
  'gs3-economy-infra:exam-note:2': {
    resourceId: 'gs3-economy-infra:exam-note:2',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ECO.BANKING', relationType: 'primary', mappingBasis: 'Priority Sector Lending (PSL) categories, targets for domestic/foreign banks' },
    ],
  },
  'gs3-economy-infra:map:mm-laf': {
    resourceId: 'gs3-economy-infra:map:mm-laf',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ECO.MONETARY', relationType: 'primary', mappingBasis: 'RBI Liquidity Adjustment Facility (LAF) corridor: SDF floor, Repo policy, MSF ceiling' },
    ],
  },
  'gs3-economy-infra:map:mm-nuclear': {
    resourceId: 'gs3-economy-infra:map:mm-nuclear',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.SCI.NUCLEAR', relationType: 'primary', mappingBasis: 'Stage 1 PHWR natural uranium -> Stage 2 FBR plutonium -> Stage 3 AHWR thorium' },
    ],
  },
  'gs3-economy-infra:reference:eco-reports-publishers': {
    resourceId: 'gs3-economy-infra:reference:eco-reports-publishers',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ECO.EXTERNAL', relationType: 'primary', mappingBasis: 'Multilateral reports on trade, investment, and global finance' },
      { nodeId: 'GS3.ECO.GROWTH', relationType: 'secondary', mappingBasis: 'Global economic indices and domestic economic growth reports' },
    ],
  },
  'gs3-economy-infra:answer:1': {
    resourceId: 'gs3-economy-infra:answer:1',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ECO.MONETARY', relationType: 'primary', mappingBasis: 'Standing Deposit Facility uncollateralized liquidity absorption analysis' },
    ],
  },

  // =========================================================================
  // GS4 - Ethics & Integrity (5 Resources)
  // =========================================================================
  'gs4-ethics-probity:note:GS4.ETH.DIMENSIONS': {
    resourceId: 'gs4-ethics-probity:note:GS4.ETH.DIMENSIONS',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS4.ETH.INTERFACE', relationType: 'primary', mappingBasis: 'Ethics and human actions: deontology, consequentialism, virtue ethics' },
    ],
  },
  'gs4-ethics-probity:note:GS4.ETH.EI': {
    resourceId: 'gs4-ethics-probity:note:GS4.ETH.EI',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS4.ETH.EI', relationType: 'primary', mappingBasis: 'Emotional intelligence concepts, self-regulation, empathy in civil administration' },
    ],
  },
  'gs4-ethics-probity:exam-note:1': {
    resourceId: 'gs4-ethics-probity:exam-note:1',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS4.ETH.PUBLIC_VAL', relationType: 'primary', mappingBasis: 'Ethical dilemmas in administrative discretion, law vs conscience' },
      { nodeId: 'GS4.PROB.CASES', relationType: 'secondary', mappingBasis: 'Practical case study resolution principles' },
    ],
  },
  'gs4-ethics-probity:map:mm-case-study': {
    resourceId: 'gs4-ethics-probity:map:mm-case-study',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS4.PROB.CASES', relationType: 'primary', mappingBasis: 'Methodological framework for solving ethics case studies' },
    ],
  },
  'gs4-ethics-probity:answer:1': {
    resourceId: 'gs4-ethics-probity:answer:1',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS4.ETH.INTERFACE', relationType: 'primary', mappingBasis: 'Kantian categorical imperative vs legal compliance in administration' },
      { nodeId: 'GS4.ETH.THINKERS', relationType: 'secondary', mappingBasis: 'Moral philosophy of Immanuel Kant' },
    ],
  },

  // =========================================================================
  // CSAT - Reasoning & Comprehension (3 Resources)
  // =========================================================================
  'csat-analytical-core:note:CSAT.REASONING': {
    resourceId: 'csat-analytical-core:note:CSAT.REASONING',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'CSAT.RC', relationType: 'primary', mappingBasis: 'Reading comprehension critical assumptions, inferences, and authorial intent' },
    ],
  },
  'csat-analytical-core:exam-note:1': {
    resourceId: 'csat-analytical-core:exam-note:1',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'CSAT.QUAN', relationType: 'primary', mappingBasis: 'Number theory, divisibility rules, remainders, and permutations & combinations' },
    ],
  },
  'csat-analytical-core:map:mm-rc-rules': {
    resourceId: 'csat-analytical-core:map:mm-rc-rules',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'CSAT.RC', relationType: 'primary', mappingBasis: 'Systematic elimination rules for Reading Comprehension passages' },
    ],
  },

  // =========================================================================
  // Static Reference Vault (11 Resources)
  // =========================================================================
  'static-gk-vault:note:GS3.ENV.CONSERVATION': {
    resourceId: 'static-gk-vault:note:GS3.ENV.CONSERVATION',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ENV.WETLANDS', relationType: 'primary', mappingBasis: 'Ramsar Convention criteria, Montreux Record sites (Keoladeo, Loktak)' },
    ],
  },
  'static-gk-vault:note:GS3.ENV.PROTECTED': {
    resourceId: 'static-gk-vault:note:GS3.ENV.PROTECTED',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ENV.BIODIVERSITY', relationType: 'primary', mappingBasis: 'Wildlife Protection Act 1972 protected areas (National Parks, Sanctuaries)' },
    ],
  },
  'static-gk-vault:exam-note:1': {
    resourceId: 'static-gk-vault:exam-note:1',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.GEO.IND_PHYS', relationType: 'primary', mappingBasis: 'Himalayan mountain passes, strategic straits, and geographical confluences' },
    ],
  },
  'static-gk-vault:exam-note:2': {
    resourceId: 'static-gk-vault:exam-note:2',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ENV.WETLANDS', relationType: 'primary', mappingBasis: 'Indian Ramsar sites river basins and hydro-ecological associations' },
      { nodeId: 'GS3.ENV.BIODIVERSITY', relationType: 'secondary', mappingBasis: 'Endemic and endangered wetland fauna' },
    ],
  },
  'static-gk-vault:map:mm-env-treaties': {
    resourceId: 'static-gk-vault:map:mm-env-treaties',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ENV.GOVERNANCE', relationType: 'primary', mappingBasis: 'Multilateral environmental conventions (UNFCCC, CBD, UNCCD, Ramsar, CITES)' },
    ],
  },
  'static-gk-vault:reference:stat-ramsar-matrix': {
    resourceId: 'static-gk-vault:reference:stat-ramsar-matrix',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ENV.WETLANDS', relationType: 'primary', mappingBasis: 'Complete tabular matrix of Indian Ramsar wetlands and states' },
    ],
  },
  'static-gk-vault:reference:stat-passes-matrix': {
    resourceId: 'static-gk-vault:reference:stat-passes-matrix',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.GEO.IND_PHYS', relationType: 'primary', mappingBasis: 'Tabular matrix of Himalayan passes, states, and connectivity routes' },
    ],
  },
  'static-gk-vault:reference:stat-classical-languages': {
    resourceId: 'static-gk-vault:reference:stat-classical-languages',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS1.CUL.LIT_PHIL', relationType: 'primary', mappingBasis: 'Official criteria and designated classical languages of India' },
    ],
  },
  'static-gk-vault:reference:stat-const-amendments': {
    resourceId: 'static-gk-vault:reference:stat-const-amendments',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS2.POL.CONSTITUTION', relationType: 'primary', mappingBasis: 'Major constitutional amendment acts summary table' },
    ],
  },
  'static-gk-vault:reference:stat-biosphere-reserves': {
    resourceId: 'static-gk-vault:reference:stat-biosphere-reserves',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ENV.BIODIVERSITY', relationType: 'primary', mappingBasis: 'UNESCO World Network of Biosphere Reserves in India matrix' },
    ],
  },
  'static-gk-vault:answer:1': {
    resourceId: 'static-gk-vault:answer:1',
    mappingVersion: 'v1.0',
    reviewerStatus: 'reviewed',
    mappings: [
      { nodeId: 'GS3.ENV.WETLANDS', relationType: 'primary', mappingBasis: 'Role of Ramsar network in water security and ecological resilience outline' },
    ],
  },
};

/**
 * Get the canonical node mappings for a given study resource ID.
 */
export function getCanonicalNodesForResource(resourceId: string): ResourceNodeMapping[] {
  const entry = STUDY_RESOURCE_MAPPINGS[resourceId];
  return entry ? entry.mappings : [];
}

/**
 * Check if a node ID is a recognized canonical syllabus node.
 */
export function isValidCanonicalNodeId(nodeId: string): boolean {
  return CANONICAL_NODE_IDS.has(nodeId);
}

/**
 * Resolve a legacy or emitted tag to its canonical node ID(s).
 * If the tag is already canonical, returns [tag].
 * If the tag has a legacy alias, returns the canonical targets.
 * If unknown, returns [].
 */
export function resolveLegacyTagToCanonical(tag: string): string[] {
  if (LEGACY_TAG_TO_CANONICAL[tag]) {
    return LEGACY_TAG_TO_CANONICAL[tag];
  }
  if (CANONICAL_NODE_IDS.has(tag)) {
    return [tag];
  }
  return [];
}

/**
 * Reverse lookup: Find all study resource IDs that map to a canonical node ID.
 */
export function getResourcesForCanonicalNode(nodeId: string): Array<{ resourceId: string; relationType: ResourceRelationType }> {
  const matches: Array<{ resourceId: string; relationType: ResourceRelationType }> = [];
  for (const [resId, entry] of Object.entries(STUDY_RESOURCE_MAPPINGS)) {
    for (const m of entry.mappings) {
      if (m.nodeId === nodeId) {
        matches.push({ resourceId: resId, relationType: m.relationType });
      }
    }
  }
  return matches;
}
