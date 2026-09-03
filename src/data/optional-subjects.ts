/**
 * src/data/optional-subjects.ts
 *
 * Official UPSC Civil Services Examination Optional Subjects Master Registry.
 * In UPSC CSE Mains, the Optional Subject carries 500 marks across 2 papers (Paper 1 & Paper 2),
 * constituting ~28.6% of total Mains written marks.
 * 
 * Each optional subject is systematically mapped to:
 * - General Studies (GS1-GS4) synergies & syllabus overlap
 * - Key thematic keywords for current affairs cross-referencing
 * - Core pedagogical scope and high-yield Mains answer writing advice
 */

export interface OptionalSubject {
  id: string;
  name: string;
  shortName: string;
  code: string;
  paperCount: 2;
  totalMarks: 500;
  category: 'humanities' | 'social_sciences' | 'stem' | 'commerce' | 'literature' | 'other';
  description: string;
  paper1Focus: string;
  paper2Focus: string;
  gsSynergies: {
    paper: 'GS1' | 'GS2' | 'GS3' | 'GS4' | 'ESSAY' | 'CSAT';
    domain: string;
    overlapDegree: 'HIGH' | 'MEDIUM' | 'MODERATE';
    details: string;
  }[];
  newsKeywords: string[];
  mainsStrategyTip: string;
}

export const OPTIONAL_SUBJECTS: OptionalSubject[] = [
  {
    id: 'psir',
    name: 'Political Science & International Relations (PSIR)',
    shortName: 'PSIR',
    code: 'PSIR-01',
    paperCount: 2,
    totalMarks: 500,
    category: 'social_sciences',
    description: 'Political theory, Western & Indian political thought, Indian nationalism, Constitution, and Global dynamics.',
    paper1Focus: 'Political Theory, Justice, Liberty, Equality, Indian Political Thought, Indian National Movement & Constitution.',
    paper2Focus: 'Comparative Politics, International Order, Nuclear Doctrine, Foreign Policy of Major Powers & India’s Bilateral Engagements.',
    gsSynergies: [
      {
        paper: 'GS2',
        domain: 'Polity, Governance, Judiciary & International Relations',
        overlapDegree: 'HIGH',
        details: 'Almost 80% direct overlap with GS-2 syllabus (Indian Constitution, Federalism, Writs, Treaties, Regional groupings like Quad/Brics).'
      },
      {
        paper: 'GS4',
        domain: 'Moral Thinkers & Political Ethics',
        overlapDegree: 'HIGH',
        details: 'Political philosophers (Plato, Aristotle, Mill, Rawls, Gandhi, Ambedkar) directly supply theoretical anchors for GS-4 case studies.'
      },
      {
        paper: 'ESSAY',
        domain: 'Democracy, Sovereignty, Global Geopolitics & Rights',
        overlapDegree: 'HIGH',
        details: 'Theoretical depth provides structured conceptual frames for philosophical and socio-political essays.'
      }
    ],
    newsKeywords: [
      'Bilateral', 'Foreign Policy', 'Diplomacy', 'Treaty', 'Summit', 'United Nations',
      'Supreme Court', 'Constitution', 'Governor', 'Federalism', 'Ordinance', 'Geopolitics',
      'Quad', 'BRICS', 'G20', 'SCO', 'WTO', 'Security Council', 'Disarmament', 'Neighbourhood First'
    ],
    mainsStrategyTip: 'Use empirical current affairs from Daily Brief as real-time case examples in Paper 2 Part B, and ground GS-2 answers with theoretical scholars (e.g. Granville Austin, Suhas Palshikar).'
  },
  {
    id: 'sociology',
    name: 'Sociology',
    shortName: 'Sociology',
    code: 'SOC-02',
    paperCount: 2,
    totalMarks: 500,
    category: 'social_sciences',
    description: 'Sociological theories (Marx, Weber, Durkheim, Mead), social stratification, religion, kinship, and Indian society dynamics.',
    paper1Focus: 'Sociological Thinkers, Positivism, Stratification, Work and Economic Life, Politics & Society, Kinship Systems.',
    paper2Focus: 'Introducing Indian Society, Caste & Class, Agrarian Transformation, Industrialization, Social Movements, Population & Women.',
    gsSynergies: [
      {
        paper: 'GS1',
        domain: 'Indian Society, Social Diversity, Women & Urbanization',
        overlapDegree: 'HIGH',
        details: 'Over 90% overlap with GS-1 Society section: Communalism, Regionalism, Secularism, Caste dynamics, and Globalization effects.'
      },
      {
        paper: 'GS2',
        domain: 'Social Justice, Welfare Schemes & Vulnerable Sections',
        overlapDegree: 'HIGH',
        details: 'Direct synergy with welfare policies for SCs, STs, OBCs, Minorities, Elderly, and Women.'
      },
      {
        paper: 'GS4',
        domain: 'Social Conditioning, Values & Attitude Formation',
        overlapDegree: 'MEDIUM',
        details: 'In-depth grasp of sociological conditioning aids answers on moral socialization and ethical persuasion.'
      }
    ],
    newsKeywords: [
      'Caste', 'Tribe', 'Women', 'Child', 'Social Justice', 'Census', 'Urbanization',
      'Migration', 'Informal Economy', 'Agrarian Distress', 'Inequality', 'Welfare',
      'Self Help Groups', 'Poverty', 'Demographic Dividend', 'Reservation', 'Empowerment'
    ],
    mainsStrategyTip: 'Always substantiate GS-1 Society questions with empirical sociological studies (M.N. Srinivas, Andre Beteille, Yogendra Singh) and latest NSSO/NFHS data.'
  },
  {
    id: 'geography',
    name: 'Geography',
    shortName: 'Geography',
    code: 'GEO-03',
    paperCount: 2,
    totalMarks: 500,
    category: 'social_sciences',
    description: 'Physical geography, geomorphology, climatology, oceanography, biogeography, human geography, and comprehensive geography of India.',
    paper1Focus: 'Geomorphology, Climatology, Oceanography, Soil/Vegetation, Perspectives in Human Geography, Population & Settlement.',
    paper2Focus: 'Physical Setting of India, River Basins, Monsoons, Resources, Agriculture, Industry, Transport, Regional Development, Contemporary Issues.',
    gsSynergies: [
      {
        paper: 'GS1',
        domain: 'Physical Geography, Geophysical Phenomena & Resource Distribution',
        overlapDegree: 'HIGH',
        details: 'Covers 100% of GS-1 Geography: Earthquakes, Tsunamis, Cyclones, Global resource locations, and Critical geographical features.'
      },
      {
        paper: 'GS3',
        domain: 'Agriculture, Cropping Patterns, Irrigation & Disaster Management',
        overlapDegree: 'HIGH',
        details: 'Major synergy with GS-3 agricultural patterns, water resources, food processing corridors, and Sendai Framework disaster policies.'
      },
      {
        paper: 'GS3',
        domain: 'Environment, Ecology & Climate Change',
        overlapDegree: 'HIGH',
        details: 'Biogeography and climate models provide deep analytical grounding for environmental questions.'
      }
    ],
    newsKeywords: [
      'Monsoon', 'El Nino', 'La Nina', 'Cyclone', 'Earthquake', 'River Basin', 'Dam',
      'Irrigation', 'Cropping Pattern', 'Drought', 'Flood', 'Disaster Management',
      'Urban Flooding', 'Glacial Lake Outburst', 'Renewable Energy', 'Mineral Reserves', 'Critical Minerals'
    ],
    mainsStrategyTip: 'Integrate schematic maps, flow diagrams, and spatial data into both GS-1 and GS-3 papers. In Geography Paper 2, cite recent infrastructure projects and river interlinking corridors.'
  },
  {
    id: 'pub_ad',
    name: 'Public Administration',
    shortName: 'Public Admin',
    code: 'PUB-04',
    paperCount: 2,
    totalMarks: 500,
    category: 'social_sciences',
    description: 'Administrative theories, public policy, civil service accountability, financial administration, and Indian administrative system.',
    paper1Focus: 'Administrative Thinkers (Taylor, Fayol, Weber, Simon, Riggs), Organizations, Accountability, Administrative Law, Comparative Pub Ad.',
    paper2Focus: 'Evolution of Indian Admin, Union Govt, State & District Admin, Civil Services, Law & Order Admin, 2nd ARC Recommendations.',
    gsSynergies: [
      {
        paper: 'GS2',
        domain: 'Governance, Transparency, Citizen Charters & E-Governance',
        overlapDegree: 'HIGH',
        details: 'Covers over 75% of GS-2 Governance: Role of civil services in democracy, regulatory commissions, and administrative accountability.'
      },
      {
        paper: 'GS4',
        domain: 'Probity in Governance, Ethical Code of Conduct & ARC Reports',
        overlapDegree: 'HIGH',
        details: '2nd ARC 4th Report (Ethics in Governance) is the foundational curriculum for both Pub Ad and GS-4.'
      },
      {
        paper: 'GS3',
        domain: 'Government Budgeting & Public Financial Management',
        overlapDegree: 'MEDIUM',
        details: 'Budget cycle, performance budgeting, and fiscal accountability mechanisms.'
      }
    ],
    newsKeywords: [
      'Cabinet', 'Civil Services', 'UPSC', 'Governance', 'E-Governance', 'Administrative Reforms',
      'ARC', 'Lokpal', 'CVC', 'CBI', 'Police Reforms', 'Citizen Charter', 'Mission Karmayogi',
      'Discretionary Power', 'Lateral Entry', 'District Magistrate', 'Gram Panchayat', 'Municipal'
    ],
    mainsStrategyTip: 'Cross-fertilize Paper 1 theoretical frameworks (Riggs, Simon, New Public Management) into Paper 2 Indian administration answers, and quote 2nd ARC committee recommendations profusely in GS-2.'
  },
  {
    id: 'history',
    name: 'History',
    shortName: 'History',
    code: 'HIS-05',
    paperCount: 2,
    totalMarks: 500,
    category: 'humanities',
    description: 'Ancient, Medieval, and Modern Indian history, freedom struggle, post-independence consolidation, and world history.',
    paper1Focus: 'Sources, Archaeological Evidence, Indus Civilization, Vedic Age, Mauryas, Guptas, Cholas, Delhi Sultanate, Mughals & Marathas.',
    paper2Focus: 'European Penetration, British Raj, Economic Impact, Resistance Movements, Gandhi, Freedom Struggle, Post-Independence, World History.',
    gsSynergies: [
      {
        paper: 'GS1',
        domain: 'Art, Architecture, Modern Freedom Movement & World History',
        overlapDegree: 'HIGH',
        details: 'Covers 100% of GS-1 History, Art, Architecture, Temple styles, Freedom struggle stages, and Post-Independence reorganization.'
      },
      {
        paper: 'ESSAY',
        domain: 'Historical Analogies, Civilization & Ideological Evolutions',
        overlapDegree: 'MEDIUM',
        details: 'Historical precedents and civilizational narratives elevate essay introductions and conclusions.'
      }
    ],
    newsKeywords: [
      'Archaeology', 'Excavation', 'Inscription', 'ASI', 'Monuments', 'Temple Architecture',
      'Heritage', 'Freedom Fighter', 'Tribal Uprising', 'Colonial Legacy', 'Constitution Assembly Debates'
    ],
    mainsStrategyTip: 'Master chronological continuity vs. disruption in historiography. For GS-1, focus heavily on socio-economic and cultural facets rather than purely political dynasties.'
  },
  {
    id: 'anthropology',
    name: 'Anthropology',
    shortName: 'Anthropology',
    code: 'ANTH-06',
    paperCount: 2,
    totalMarks: 500,
    category: 'social_sciences',
    description: 'Physical anthropology, human genetics, primate evolution, socio-cultural anthropology, linguistic anthropology, and Indian tribal society.',
    paper1Focus: 'Evolution, Human Genetics, Race & Racism, Marriage, Family, Kinship, Religion, Anthropological Theories & Fieldwork Methods.',
    paper2Focus: 'Indian Culture & Civilization, Caste System, Tribal India, Scheduled Areas (5th/6th Schedules), Tribal Development & Forest Rights.',
    gsSynergies: [
      {
        paper: 'GS1',
        domain: 'Indian Society, Social Structure & Tribal Demographics',
        overlapDegree: 'HIGH',
        details: 'Deep overlap on tribal issues, social stratification, linguistic diversity, and primitive vulnerability.'
      },
      {
        paper: 'GS2',
        domain: 'Tribal Welfare, 5th/6th Schedules, FRA 2006 & PESA Act',
        overlapDegree: 'HIGH',
        details: 'Direct statutory and constitutional overlap with Schedule V/VI administration and NCST recommendations.'
      },
      {
        paper: 'GS3',
        domain: 'Genetics, Human Genome Project & Biotechnology',
        overlapDegree: 'MEDIUM',
        details: 'Physical anthropology provides foundational grasp of DNA sequencing, CRISPR, and forensic genetics.'
      }
    ],
    newsKeywords: [
      'Tribal', 'PVTG', 'Forest Rights Act', 'PESA', 'Fifth Schedule', 'Sixth Schedule',
      'NCST', 'DNA', 'Genomics', 'Indus Valley DNA', 'Indigenous Rights', 'Ethnography'
    ],
    mainsStrategyTip: 'Include clear biological diagrams and ethnographic case studies (Elwin, Ghurye, Roy Burman) in both papers. Use PESA/FRA ground realities in GS-2 welfare answers.'
  },
  {
    id: 'economics',
    name: 'Economics',
    shortName: 'Economics',
    code: 'ECO-07',
    paperCount: 2,
    totalMarks: 500,
    category: 'social_sciences',
    description: 'Advanced microeconomics, macroeconomics, monetary policy, public finance, international trade, and Indian economic planning.',
    paper1Focus: 'Consumer & Producer Theory, Keynesian vs Monetarist Models, Money & Banking, International Trade Models, Development Economics.',
    paper2Focus: 'Post-Independence Indian Economy, Planning, LPG Reforms, Agriculture MSP, Industrial Policy, Monetary & Fiscal Policies, External Sector.',
    gsSynergies: [
      {
        paper: 'GS3',
        domain: 'Indian Economy, Budgeting, Banking, Agriculture & Infrastructure',
        overlapDegree: 'HIGH',
        details: 'Covers over 85% of GS-3 Economy: Monetary Policy Committee, SDF, Fiscal Deficit, MSP formula, and External trade balance.'
      },
      {
        paper: 'GS2',
        domain: 'Poverty Alleviation, Multidimensional Poverty & Welfare Economics',
        overlapDegree: 'MEDIUM',
        details: 'Theoretical models (Sen, Bhagwati, Stiglitz) provide rigorous economic framing for social justice questions.'
      }
    ],
    newsKeywords: [
      'RBI', 'Repo Rate', 'Inflation', 'CPI', 'WPI', 'Fiscal Deficit', 'GDP', 'Budget',
      'Economic Survey', 'NITI Aayog', 'Disinvestment', 'GST', 'Current Account Deficit',
      'Foreign Exchange', 'MSP', 'FDI', 'Rupee', 'Banking NPA', 'IBC'
    ],
    mainsStrategyTip: 'Always incorporate Economic Survey data curves and mathematical intuition into GS-3 answers. In Optional Paper 2, connect macroeconomic models to field-level welfare programs.'
  },
  {
    id: 'philosophy',
    name: 'Philosophy',
    shortName: 'Philosophy',
    code: 'PHIL-08',
    paperCount: 2,
    totalMarks: 500,
    category: 'humanities',
    description: 'Western philosophy (Plato to Wittgenstein), Classical Indian philosophy (Astika & Nastika schools), Socio-political philosophy, and Religious philosophy.',
    paper1Focus: 'Indian Philosophy (Carvaka, Jainism, Buddhism, Nyaya, Vaisesika, Sankhya, Yoga, Mimamsa, Vedanta), Western Philosophy (Rationalism, Empiricism, Kant, Hegel).',
    paper2Focus: 'Socio-Political Philosophy (Justice, Equality, Sovereignty, Human Rights, Gender, Caste), Philosophy of Religion (God, Evil, Immortality, Religious Pluralism).',
    gsSynergies: [
      {
        paper: 'GS4',
        domain: 'Ethics, Integrity, Moral Thinkers & Meta-Ethics',
        overlapDegree: 'HIGH',
        details: 'Direct theoretical foundation for GS-4: Deontology, Utilitarianism, Virtue Ethics, Nishkama Karma, and Epistemic humility.'
      },
      {
        paper: 'ESSAY',
        domain: 'Abstract & Philosophical Essay Prompts',
        overlapDegree: 'HIGH',
        details: 'Equips candidates to deconstruct ambiguous, quote-based essay topics with multi-layered philosophical argumentation.'
      }
    ],
    newsKeywords: [
      'Ethics', 'Moral', 'Justice', 'Secularism', 'Religious Harmony', 'Euthanasia',
      'Artificial Intelligence Ethics', 'Human Rights', 'Free Speech', 'Liberty'
    ],
    mainsStrategyTip: 'Precision of terminology is critical. Contrast Indian and Western perspectives (e.g. Kantian duty vs. Gita’s Nishkama Karma) when answering GS-4 case studies.'
  },
  {
    id: 'law',
    name: 'Law',
    shortName: 'Law',
    code: 'LAW-09',
    paperCount: 2,
    totalMarks: 500,
    category: 'social_sciences',
    description: 'Constitutional and administrative law, international law, law of crimes, law of torts, contracts, and contemporary legal developments.',
    paper1Focus: 'Constitutional Law, Fundamental Rights, Separation of Powers, Judicial Review, International Law, Treaties, State Jurisdiction & Law of the Sea.',
    paper2Focus: 'Law of Crimes (IPC/BNS), Law of Torts, Consumer Protection, Contracts & Mercantile Law, Contemporary Legal Developments (Cyber Law, IP).',
    gsSynergies: [
      {
        paper: 'GS2',
        domain: 'Constitution, Judiciary, Statutory Bodies & International Treaties',
        overlapDegree: 'HIGH',
        details: 'Unmatched synergy with GS-2: Landmark Supreme Court verdicts, Article 32/226, Basic Structure doctrine, and UNCLOS maritime law.'
      },
      {
        paper: 'GS3',
        domain: 'Cyber Law, Environmental Protection Acts & IPR Law',
        overlapDegree: 'MEDIUM',
        details: 'Covers IT Act provisions, Wildlife Protection Act amendments, and Patent/TRIPS regulations.'
      }
    ],
    newsKeywords: [
      'Supreme Court', 'High Court', 'Collegium', 'Verdict', 'Judicial Review', 'Writs',
      'Constitutional Bench', 'Fundamental Rights', 'Criminal Code', 'BNS', 'BNSS', 'BSA',
      'Extradition', 'UNCLOS', 'ICJ', 'Bail', 'Defamation', 'Arbitration'
    ],
    mainsStrategyTip: 'Always cite recent 3-judge or Constitution Bench Supreme Court cases with accurate citations in GS-2 to establish definitive statutory authority.'
  },
  {
    id: 'commerce',
    name: 'Commerce & Accountancy',
    shortName: 'Commerce',
    code: 'COM-10',
    paperCount: 2,
    totalMarks: 500,
    category: 'commerce',
    description: 'Financial accounting, cost accounting, taxation, auditing, financial management, financial institutions, and organizational behavior.',
    paper1Focus: 'Corporate Accounting, Costing, Auditing Standards, Income Tax Act, GST, Financial Management, Capital Budgeting, Risk & Return.',
    paper2Focus: 'Organization Theory, Organization Behaviour, Human Resource Management, Industrial Relations & Labor Laws.',
    gsSynergies: [
      {
        paper: 'GS3',
        domain: 'Corporate Governance, Financial Markets, Taxation & Banking',
        overlapDegree: 'HIGH',
        details: 'Covers corporate debt, SEBI regulations, capital markets, direct/indirect tax reforms, and NPA management.'
      },
      {
        paper: 'GS2',
        domain: 'Labor Codes, Social Security & Industrial Dispute Resolution',
        overlapDegree: 'MEDIUM',
        details: 'The 4 New Labor Codes and dispute mechanisms overlap with industrial legislation.'
      }
    ],
    newsKeywords: [
      'SEBI', 'RBI', 'GST Council', 'Corporate Governance', 'Auditing', 'Insolvency',
      'IBC', 'Capital Market', 'IPO', 'Labor Codes', 'EPFO', 'Direct Tax', 'Income Tax'
    ],
    mainsStrategyTip: 'Use accounting clarity and corporate governance frameworks (Kotak Committee, Cadbury Report) to enrich GS-3 economics answers.'
  },
  {
    id: 'mathematics',
    name: 'Mathematics / STEM',
    shortName: 'Mathematics',
    code: 'MATH-11',
    paperCount: 2,
    totalMarks: 500,
    category: 'stem',
    description: 'Linear algebra, calculus, analytic geometry, ODEs, statics, dynamics, vector analysis, real analysis, complex analysis, PDEs, mechanics.',
    paper1Focus: 'Linear Algebra, Calculus, 3D Geometry, Ordinary Differential Equations, Vector Analysis, Statics and Dynamics.',
    paper2Focus: 'Algebra, Real Analysis, Complex Analysis, Linear Programming, Partial Differential Equations, Numerical Analysis, Fluid Dynamics.',
    gsSynergies: [
      {
        paper: 'CSAT',
        domain: 'Quantitative Aptitude, Number Systems & Permutations',
        overlapDegree: 'HIGH',
        details: 'Ensures effortless qualification (>120+ marks) in CSAT Paper 2 with zero additional preparation.'
      },
      {
        paper: 'GS3',
        domain: 'Science & Technology, Space Mechanics & Quantum Computing',
        overlapDegree: 'MEDIUM',
        details: 'Analytical mathematical intuition aids deep comprehension of satellite orbits, cryptography, and computing architectures.'
      }
    ],
    newsKeywords: [
      'Algorithm', 'Quantum Computing', 'Cryptography', 'Mathematical Modeling', 'Space Orbits', 'AI Tech'
    ],
    mainsStrategyTip: 'Mathematics offers objective, high-scoring certainty in Mains. Balance preparation time strictly so GS1–GS4 answer-writing practice receives sufficient daily quota.'
  },
  {
    id: 'literature',
    name: 'Literature of Languages (Hindi / Sanskrit / Regional)',
    shortName: 'Literature',
    code: 'LIT-12',
    paperCount: 2,
    totalMarks: 500,
    category: 'literature',
    description: 'History of language, grammatical evolution, dialectical variations, canonical poetry, prose, drama, and literary criticism.',
    paper1Focus: 'Linguistic Evolution, History of Literature, Major Literary Movements, Periods & Schools of Thought.',
    paper2Focus: 'Textual Analysis of Prescribed Canonical Works, Poetics, Rasa Theory, Structural Critiques & Social Reflection.',
    gsSynergies: [
      {
        paper: 'GS1',
        domain: 'Art, Culture, Ancient & Medieval Literature & Bhakti Movement',
        overlapDegree: 'HIGH',
        details: 'Direct overlap with GS-1 culture, Bhakti-Sufi literature (Kabir, Tulsidas, Surdas), and Classical linguistics.'
      },
      {
        paper: 'ESSAY',
        domain: 'Expressive Richness, Metaphorical Nuance & Philosophical Quotes',
        overlapDegree: 'HIGH',
        details: 'Exceptional literary fluency elevates rhetorical punch and emotional resonance in Mains essays.'
      }
    ],
    newsKeywords: [
      'Sahitya Akademi', 'Classical Language', 'Bhakti', 'Manuscript', 'Cultural Heritage', 'Linguistics'
    ],
    mainsStrategyTip: 'Connect historical literary texts to contemporary socio-cultural dilemmas in Paper 2, and use poetic couplets strategically to conclude high-scoring essays.'
  },
  {
    id: 'other',
    name: 'Other Specialized Optional Subject',
    shortName: 'Specialized',
    code: 'OPT-OTH',
    paperCount: 2,
    totalMarks: 500,
    category: 'other',
    description: 'Agriculture, Medical Science, Animal Husbandry, Civil / Electrical / Mechanical Engineering, Psychology, Botany, Zoology, Geology, etc.',
    paper1Focus: 'Core discipline fundamentals, principles, and theoretical frameworks.',
    paper2Focus: 'Applied Indian context, contemporary practices, case applications, and practical problem-solving.',
    gsSynergies: [
      {
        paper: 'GS3',
        domain: 'Domain-Specific Science, Agriculture or Technology',
        overlapDegree: 'HIGH',
        details: 'Agriculture, Engineering and Medical Science directly anchor specialized GS-3 science, farming, and health topics.'
      }
    ],
    newsKeywords: [
      'Agriculture', 'Medical Science', 'Engineering', 'Infrastructure', 'Healthcare', 'Biotechnology'
    ],
    mainsStrategyTip: 'Leverage specialized technical domain depth to provide uniquely authoritative solutions in GS-3 and ethics case studies.'
  }
];

export const OPTIONAL_PREP_STAGES = [
  { id: 'exploring', label: 'Exploring & Finalizing', desc: 'Evaluating syllabus and comparing PYQ trends' },
  { id: 'foundation', label: 'Conceptual Foundation', desc: 'Active textbook & primary syllabus readings' },
  { id: 'notes_pyq', label: 'Notes Consolidation & PYQs', desc: 'Mapping standard notes against 10-year past questions' },
  { id: 'answer_writing', label: 'Answer Writing & Test Series', desc: 'Timed sectional answer practice & Mains simulation' }
] as const;

export const TARGET_YEARS_CONFIG = [
  { id: '2025', label: 'CSE 2025', desc: 'Final Sprint & High-Yield Precision', targetDate: '2025-05-25' },
  { id: '2026', label: 'CSE 2026', desc: 'Comprehensive Foundation & Deep Mastery', targetDate: '2026-05-24' },
  { id: '2027', label: 'CSE 2027+', desc: 'Multi-Year Long Range Architecture', targetDate: '2027-05-23' },
  { id: 'state-psc', label: 'State PSCs', desc: 'State Civil Services Examination', targetDate: '2026-09-15' }
] as const;

export const GS_PILLARS_CONFIG = [
  { id: 'gs1', code: 'GS-1', label: 'History & Geography', desc: 'Heritage, Art & Culture, Physical Geography, Indian Society' },
  { id: 'gs2', code: 'GS-2', label: 'Polity & Governance', desc: 'Constitutional Law, Governance, Social Justice, International Relations' },
  { id: 'gs3', code: 'GS-3', label: 'Economy & Ecology', desc: 'Macroeconomics, Agriculture, Science & Tech, Environment, Security' },
  { id: 'gs4', code: 'GS-4', label: 'Ethics & Integrity', desc: 'Moral Philosophers, Human Values, Administrative Probity, Case Studies' },
  { id: 'csat', code: 'CSAT', label: 'Aptitude & Reasoning', desc: 'Logical Deduction, Quantitative Comprehension, Data Sufficiency' }
] as const;

/**
 * Lookup helper for optional subject by ID
 */
export function getOptionalSubject(id: string): OptionalSubject {
  const found = OPTIONAL_SUBJECTS.find((s) => s.id === id);
  return found || OPTIONAL_SUBJECTS[0];
}

/**
 * Extract keywords associated with an optional subject
 */
export function getOptionalKeywords(id: string): string[] {
  const subject = getOptionalSubject(id);
  return subject ? subject.newsKeywords : [];
}
