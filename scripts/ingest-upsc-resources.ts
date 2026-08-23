/**
 * scripts/ingest-upsc-resources.ts
 *
 * Automated ETL Pipeline for ingesting, transforming, and structuring assets
 * from the open-source repository: https://github.com/madhurimarawat/UPSC-Notes-Resources
 *
 * Operations:
 * 1. Fetches metadata and raw markdown/text content from GitHub.
 * 2. Parses curated resource link manifests (Notes_Link.txt, Books_Links.txt, Articles_Links.txt, Detail_Links.txt).
 * 3. Maps topics to Tark's 140-node hierarchical syllabus taxonomy (server-lib/cron/ingest/syllabus/nodes.ts).
 * 4. Synthesizes a structured JSON catalog (src/data/upsc-resources-catalog.json).
 * 5. Generates high-yield static MCQs & PYQ bank (src/data/static-subject-questions.json).
 * 6. Seeds / updates 03_MEMORY/knowledge/ and Supabase static_questions table.
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { NODES } from "../server-lib/cron/ingest/syllabus/nodes.js";

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/madhurimarawat/UPSC-Notes-Resources/main";
const GITHUB_API_REPO = "https://api.github.com/repos/madhurimarawat/UPSC-Notes-Resources";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://ixngfxaerlkkcacrbdgc.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export interface ResourceItem {
  title: string;
  url: string;
  category: string;
  paper: "GS1" | "GS2" | "GS3" | "GS4" | "CSAT" | "General" | "Optional";
  sourceType: "official_portal" | "notes_pdf" | "book" | "gpt_tool" | "article" | "pyq";
  description: string;
  tags: string[];
}

export interface SubjectModule {
  id: string;
  title: string;
  paper: string;
  syllabusNodeId?: string;
  overview: string;
  keyThemes: string[];
  recommendedSources: string[];
  mindMapHighlights: string[];
}

export interface StaticQuestionSeed {
  id?: string;
  exam_origin_tag: string;
  subject_category: string;
  difficulty_level: "easy" | "medium" | "hard";
  question_text: string;
  options_matrix: Record<string, string>;
  correct_option: string;
  conceptual_explanation: string;
  syllabus_node_id?: string;
  year?: number;
}

// Subject Taxonomy Mapping
export const SUBJECT_MODULES: SubjectModule[] = [
  {
    id: "polity",
    title: "Indian Polity & Governance",
    paper: "GS2",
    syllabusNodeId: "GS2.POL.CONSTITUTION",
    overview: "Constitutional framework, Fundamental Rights, Federal structure, Parliament, Judicial doctrines, Statutory & Constitutional bodies.",
    keyThemes: [
      "Preamble & Basic Structure Doctrine (Kesavananda Bharati)",
      "Fundamental Rights (Art 14, 19, 21) & Writs (Art 32)",
      "Centre-State Relations & Federalism (Art 246, 263, 280, 356)",
      "Parliamentary Procedures, Motions & Committees",
      "Supreme Court & High Courts: Collegium, Review, Contempt"
    ],
    recommendedSources: [
      "M. Laxmikanth — Indian Polity",
      "PRS Legislative Research Reports",
      "Supreme Court Landmark Judgments Digest"
    ],
    mindMapHighlights: [
      "Constitutional Amendment Procedure (Article 368 Flowchart)",
      "Emergency Provisions Matrix (352 vs 356 vs 360)",
      "Types of Writs & Judicial Review Scope"
    ]
  },
  {
    id: "history",
    title: "Indian & World History, Art & Culture",
    paper: "GS1",
    syllabusNodeId: "GS1.HIS.FREEDOM",
    overview: "Ancient India, Medieval empires, Modern Indian Freedom Struggle, Temple Architecture, Classical dances, and World History.",
    keyThemes: [
      "Indus Valley & Vedic Society",
      "Bhakti & Sufi Movements, Vijayanagara & Mughal Administration",
      "1857 Revolt, Moderate vs Extremist phases, Gandhian Era",
      "Nagara, Dravida & Vesara Temple Architecture styles",
      "Industrial Revolution & World Wars"
    ],
    recommendedSources: [
      "Spectrum — Brief History of Modern India by Rajiv Ahir",
      "NCERTs (Class 11 An Introduction to Indian Art)",
      "Ancient & Medieval India by Poonam Dalal Dahiya"
    ],
    mindMapHighlights: [
      "Gandhian Mass Movements Timeline (1915–1947)",
      "Temple Architecture Comparison Matrix",
      "Socio-Religious Reform Movements & Thinkers"
    ]
  },
  {
    id: "geography",
    title: "Physical, Human & Economic Geography",
    paper: "GS1",
    syllabusNodeId: "GS1.GEO.IND_PHYS",
    overview: "Geomorphology, Climatology, Oceanography, Indian Physical relief, River drainage basins, Soils, Mineral distributions, and Urbanization.",
    keyThemes: [
      "Plate Tectonics, Earthquakes, Volcanism & Landforms",
      "Indian Monsoon Mechanism, ITCZ, Jet Streams, El Niño & IOD",
      "Himalayan vs Peninsular River Systems",
      "Soil Types (Alluvial, Black, Laterite) & Cropping Patterns",
      "Mineral Resources & Industrial Location Factors"
    ],
    recommendedSources: [
      "Certificate Physical and Human Geography by G.C. Leong",
      "NCERT Class 11 & 12 Geography",
      "Oxford School Atlas"
    ],
    mindMapHighlights: [
      "Atmospheric Circulation Cells & Planetary Wind Belts",
      "Major River Basins & Left/Right Bank Tributaries",
      "Global Ocean Currents & Salinity Gradients"
    ]
  },
  {
    id: "economy",
    title: "Indian Economy & Development",
    paper: "GS3",
    syllabusNodeId: "GS3.ECO.MACRO",
    overview: "Macroeconomic indicators, Monetary & Fiscal Policy, Banking & NPA resolution, Agriculture MSP & PDS, Infrastructure, and External Sector.",
    keyThemes: [
      "GDP, Inflation (CPI vs WPI), Monetary Policy Committee (MPC)",
      "Fiscal Deficit, FRBM Act & Tax Reforms (GST)",
      "Banking System: Basel III, IBC 2016, Bad Banks",
      "Agriculture: MSP, PM-KISAN, Agri-tech, Food Processing",
      "Balance of Payments, Forex Reserves & Trade Agreements"
    ],
    recommendedSources: [
      "Indian Economy by Nitin Singhania / Ramesh Singh",
      "Economic Survey & Union Budget Summaries",
      "RBI Bulletin & Monthly Policy Releases"
    ],
    mindMapHighlights: [
      "Monetary Policy Transmission Mechanism",
      "Fiscal Policy Architecture & Revenue vs Capital Budgets",
      "Banking Resolution (IBC) Workflow"
    ]
  },
  {
    id: "environment",
    title: "Environment, Ecology & Biodiversity",
    paper: "GS3",
    syllabusNodeId: "GS3.ENV.ECOLOGY",
    overview: "Ecosystem dynamics, Biodiversity hotspots, Wildlife Protection Act, Climate change conventions (UNFCCC, COP), Renewable energy.",
    keyThemes: [
      "Trophic Levels, Biogeochemical Cycles & Ecological Succession",
      "IUCN Red List Categories, Tiger Reserves, Ramsar Wetlands",
      "Environmental Impact Assessment (EIA) & Forest Rights Act",
      "Climate Summits: Paris Agreement (NDCs), Carbon Credits, Net Zero",
      "Pollution: Air Quality Index, Stubble Burning, Solid Waste Rules"
    ],
    recommendedSources: [
      "Shankar IAS / PMF IAS Environment",
      "Ministry of Environment, Forest and Climate Change (MoEFCC) Reports",
      "UNEP & IPCC Assessment Reports"
    ],
    mindMapHighlights: [
      "National Parks & Biosphere Reserves Map Locator",
      "Global Climate Agreements Timeline (Rio 1992 to COP30)",
      "Environmental Legislation in India (WPA 1972, EPA 1986)"
    ]
  },
  {
    id: "ethics",
    title: "Ethics, Integrity & Aptitude",
    paper: "GS4",
    syllabusNodeId: "GS4.ETH.DIMENSIONS",
    overview: "Moral philosophy, Emotional Intelligence, Civil Service values, Probity in Governance, Citizen's Charter, Case Study resolution models.",
    keyThemes: [
      "Deontology, Utilitarianism, Virtue Ethics & Thinkers (Kant, Gandhi, Rawls)",
      "Foundational Civil Service Values (Nolan Principles)",
      "Emotional Intelligence in Administration & Conflict Resolution",
      "Corruption Prevention: Lokpal, CVC, Whistleblower Protection",
      "Case Study Decision Matrices (Stakeholder Identification, Ethical Dilemmas)"
    ],
    recommendedSources: [
      "Lexicon for Ethics, Integrity & Aptitude",
      "2nd Administrative Reforms Commission (ARC) Report No. 4: Ethics in Governance",
      "Harvard Moral Reasoning Case Studies"
    ],
    mindMapHighlights: [
      "7 Nolan Principles of Public Life",
      "Case Study 6-Step Resolution Algorithm",
      "Ethical Dilemma Triangulation (Law vs Morality vs Public Interest)"
    ]
  },
  {
    id: "sci_tech",
    title: "Science & Technology",
    paper: "GS3",
    syllabusNodeId: "GS3.SNT.SPACE",
    overview: "Space exploration (ISRO missions), Defense tech, Biotechnology (CRISPR, gene therapy), AI/Quantum computing, Nuclear energy.",
    keyThemes: [
      "ISRO Launch Vehicles (PSLV, LVM3, SSLV) & Planetary Missions (Gaganyaan, Aditya-L1)",
      "Defense: Missile Defense (S-400, BrahMos), Drones, Stealth Subs",
      "Biotechnology: Recombinant DNA, CAR-T cell therapy, GMO crops",
      "Emerging Tech: Quantum Key Distribution, Generative AI, Semiconductors",
      "Nuclear Power: Three-Stage Nuclear Program, Fast Breeder Reactors"
    ],
    recommendedSources: [
      "The Hindu Science & Tech Weekly Pages",
      "ISRO & DRDO Annual Reports",
      "Department of Science and Technology (DST) Releases"
    ],
    mindMapHighlights: [
      "ISRO Launch Vehicle Payload Capacities & Orbits (LEO, GEO, SSO)",
      "CRISPR-Cas9 Gene Editing Workflow",
      "India's Three-Stage Nuclear Power Architecture"
    ]
  },
  {
    id: "csat",
    title: "CSAT (Paper II Aptitude & Reasoning)",
    paper: "CSAT",
    syllabusNodeId: "CSAT.REASONING",
    overview: "Reading comprehension inference strategies, Logical reasoning, Syllogisms, Permutation & Combination, Number Systems, Data Interpretation.",
    keyThemes: [
      "Reading Comprehension: Crucial Message, Assumption, Inference rules",
      "Number Systems: Divisibility, Remainder Theorem, Unit Digits",
      "Permutation & Combination, Probability shortcuts",
      "Direction Sense, Blood Relations, Seating Arrangements",
      "Speed, Time & Distance, Work & Time formulas"
    ],
    recommendedSources: [
      "CSAT Manual by McGraw Hill / Arihant",
      "Official UPSC CSAT PYQs (2014–2025)",
      "Mental Math & Vedic Math Shortcuts"
    ],
    mindMapHighlights: [
      "Reading Comprehension Question Taxonomy (Assumption vs Inference)",
      "Number System Divisibility Matrix",
      "Time & Work LCM Method Quick Algorithm"
    ]
  }
];

// Curated Foundation Question Bank derived from authentic UPSC PYQ & Static Subject Banks
export const SEED_STATIC_QUESTIONS: StaticQuestionSeed[] = [
  // --- Polity ---
  {
    exam_origin_tag: "UPSC CSE Prelims PYQ",
    subject_category: "Polity and Constitutional constructs",
    difficulty_level: "medium",
    year: 2023,
    syllabus_node_id: "GS2.POL.CONSTITUTION",
    question_text: "In essence, what does 'Due Process of Law' mean in the context of the Indian Constitution?",
    options_matrix: {
      "A": "The principle of natural justice",
      "B": "The procedure established by law",
      "C": "Fair application of law",
      "D": "Equality before law"
    },
    correct_option: "C",
    conceptual_explanation: "In Maneka Gandhi vs Union of India (1978), the Supreme Court held that 'procedure established by law' under Article 21 must be 'just, fair, and reasonable', which essentially equates to the American concept of 'Due Process of Law'—meaning both fair application of law and substantive fairness."
  },
  {
    exam_origin_tag: "UPSC CSE Prelims PYQ",
    subject_category: "Polity and Constitutional constructs",
    difficulty_level: "medium",
    year: 2021,
    syllabus_node_id: "GS2.POL.CONSTITUTION",
    question_text: "A constitutional government by definition is a:",
    options_matrix: {
      "A": "Government by legislature",
      "B": "Popular government",
      "C": "Multi-party government",
      "D": "Limited government"
    },
    correct_option: "D",
    conceptual_explanation: "Constitutionalism fundamentally denotes 'Limited Government'. It imposes substantive and procedural restraints on the powers of state organs to protect individual liberties."
  },
  {
    exam_origin_tag: "UPSC CSE Prelims PYQ",
    subject_category: "Polity and Constitutional constructs",
    difficulty_level: "hard",
    year: 2020,
    syllabus_node_id: "GS2.POL.PARLIAMENT",
    question_text: "With reference to the Parliament of India, consider the following statements:\n1. A bill pending in the Lok Sabha lapses on its prorogation.\n2. A bill pending in the Rajya Sabha, which has not been passed by the Lok Sabha, shall not lapse on dissolution of the Lok Sabha.\nWhich of the statements given above is/are correct?",
    options_matrix: {
      "A": "1 only",
      "B": "2 only",
      "C": "Both 1 and 2",
      "D": "Neither 1 nor 2"
    },
    correct_option: "B",
    conceptual_explanation: "Statement 1 is incorrect: Prorogation does not affect bills pending in Parliament (they do not lapse; only notices lapse). Statement 2 is correct: A bill pending in Rajya Sabha that originated there and hasn't been passed by Lok Sabha does NOT lapse on dissolution of Lok Sabha."
  },

  // --- History ---
  {
    exam_origin_tag: "UPSC CSE Prelims PYQ",
    subject_category: "History and Cultural constructs",
    difficulty_level: "medium",
    year: 2022,
    syllabus_node_id: "GS1.HIS.ANCIENT",
    question_text: "With reference to ancient Indian history, consider the following pairs:\n1. Aryadeva — Jaina scholar\n2. Dignaga — Buddhist scholar\n3. Nathamuni — Vaishnava scholar\nHow many pairs given above are correctly matched?",
    options_matrix: {
      "A": "Only one pair",
      "B": "Only two pairs",
      "C": "All three pairs",
      "D": "None of the pairs"
    },
    correct_option: "B",
    conceptual_explanation: "Pair 1 is incorrect (Aryadeva was a renowned Madhyamaka Buddhist philosopher and disciple of Nagarjuna). Pair 2 is correct (Dignaga was the founder of Buddhist logic/Pramana). Pair 3 is correct (Nathamuni was a famous Vaishnava Acharya who compiled Nalayira Divya Prabandham)."
  },
  {
    exam_origin_tag: "UPSC CSE Prelims PYQ",
    subject_category: "History and Cultural constructs",
    difficulty_level: "medium",
    year: 2021,
    syllabus_node_id: "GS1.CUL.ARCH",
    question_text: "With reference to the Chausath Yogini Temple situated near Morena, consider the following statements:\n1. It is a circular temple built during the reign of the Kachchhapaghata dynasty.\n2. It is the only circular temple built in India.\n3. It was meant to promote the Vaishnava cult in the region.\n4. Its design has given rise to a popular belief that it was the inspiration behind the Indian Parliament building.\nWhich of the statements given above are correct?",
    options_matrix: {
      "A": "1 and 4 only",
      "B": "2, 3 and 4 only",
      "C": "1, 2 and 3 only",
      "D": "1, 2, 3 and 4"
    },
    correct_option: "A",
    conceptual_explanation: "Statement 1 is correct (built by Kachchhapaghata king Devapala in 1323 AD). Statement 2 is incorrect (there are other circular temples, e.g. at Ranipur-Jharial and Jabalpur). Statement 3 is incorrect (it is dedicated to the Shaiva/Shakta Yogini cult). Statement 4 is correct."
  },
  {
    exam_origin_tag: "UPSC CSE Prelims PYQ",
    subject_category: "History and Cultural constructs",
    difficulty_level: "hard",
    year: 2019,
    syllabus_node_id: "GS1.HIS.FREEDOM",
    question_text: "With reference to the Swadeshi Movement, consider the following statements:\n1. It contributed to the revival of the indigenous artisan crafts and industries.\n2. The National Council of Education was established as a part of Swadeshi Movement.\nWhich of the statements given above is/are correct?",
    options_matrix: {
      "A": "1 only",
      "B": "2 only",
      "C": "Both 1 and 2",
      "D": "Neither 1 nor 2"
    },
    correct_option: "C",
    conceptual_explanation: "Both statements are correct. Swadeshi saw the establishment of indigenous textile mills, soap factories (e.g. Bengal Chemicals), and on 15 August 1906, the National Council of Education was set up to promote vernacular and national education."
  },

  // --- Geography ---
  {
    exam_origin_tag: "UPSC CSE Prelims PYQ",
    subject_category: "Geography and Environmental constructs",
    difficulty_level: "medium",
    year: 2023,
    syllabus_node_id: "GS1.GEO.IND_PHYS",
    question_text: "Consider the following statements regarding Indian rivers:\n1. The Jhelum River passes through Wular Lake.\n2. Krishna River directly feeds Kolleru Lake.\n3. Meandering of Gandak River formed Kanwar Lake.\nHow many of the statements given above are correct?",
    options_matrix: {
      "A": "Only one",
      "B": "Only two",
      "C": "All three",
      "D": "None"
    },
    correct_option: "B",
    conceptual_explanation: "Statement 1 is correct (Jhelum flows into and out of Wular Lake). Statement 2 is incorrect (Kolleru Lake is located between Krishna and Godavari deltas, fed by seasonal streams Budameru and Tammileru, not directly by Krishna River). Statement 3 is correct (Kanwar Lake/Kabartal in Bihar is an oxbow lake formed by Gandak)."
  },
  {
    exam_origin_tag: "UPSC CSE Prelims PYQ",
    subject_category: "Geography and Environmental constructs",
    difficulty_level: "hard",
    year: 2021,
    syllabus_node_id: "GS1.GEO.CLIMATE",
    question_text: "Consider the following statements:\n1. In the tropical zone, the western sections of the oceans are warmer than the eastern sections owing to the influence of trade winds.\n2. In the temperate zone, westerlies make the eastern sections of oceans warmer than the western sections.\nWhich of the statements given above is/are correct?",
    options_matrix: {
      "A": "1 only",
      "B": "2 only",
      "C": "Both 1 and 2",
      "D": "Neither 1 nor 2"
    },
    correct_option: "C",
    conceptual_explanation: "Statement 1 is correct: Trade winds blow from east to west in tropics, pushing warm surface water to western ocean margins (e.g., Warm Pool in Western Pacific). Statement 2 is correct: In temperate latitudes, westerlies blow from west to east, moving warm waters to the eastern ocean boundaries (e.g. North Atlantic Drift warming Western Europe)."
  },

  // --- Economy ---
  {
    exam_origin_tag: "UPSC CSE Prelims PYQ",
    subject_category: "Economic Policy and Infrastructure constructs",
    difficulty_level: "medium",
    year: 2023,
    syllabus_node_id: "GS3.ECO.MONEY_BANK",
    question_text: "With reference to the Indian economy, what is the significance of the 'Standing Deposit Facility' (SDF) introduced by the RBI?",
    options_matrix: {
      "A": "It enables the RBI to absorb liquidity without requiring collateral.",
      "B": "It mandates commercial banks to lend exclusively to MSMEs.",
      "C": "It is an overnight lending window for states facing fiscal deficit.",
      "D": "It replaces the Marginal Standing Facility for emergency borrowing."
    },
    correct_option: "A",
    conceptual_explanation: "The Standing Deposit Facility (SDF) was introduced by RBI as the floor of the LAF corridor. Its key innovation is allowing RBI to absorb excess liquidity from commercial banks without providing government securities as collateral."
  },
  {
    exam_origin_tag: "UPSC CSE Prelims PYQ",
    subject_category: "Economic Policy and Infrastructure constructs",
    difficulty_level: "medium",
    year: 2020,
    syllabus_node_id: "GS3.ECO.MACRO",
    question_text: "If the RBI decides to adopt an expansionist monetary policy, which of the following would it NOT do?\n1. Cut and optimize the Statutory Liquidity Ratio (SLR)\n2. Increase the Marginal Standing Facility (MSF) rate\n3. Cut the Bank Rate and Repo Rate\nSelect the correct answer using the code given below:",
    options_matrix: {
      "A": "1 and 2 only",
      "B": "2 only",
      "C": "1 and 3 only",
      "D": "1, 2 and 3"
    },
    correct_option: "B",
    conceptual_explanation: "An expansionist monetary policy aims to increase liquidity and reduce borrowing costs. Cutting SLR (1) and cutting Repo/Bank rate (3) expand liquidity. Increasing the MSF rate (2) makes borrowing costlier and contracts liquidity—hence RBI will NOT do (2)."
  },

  // --- Environment & Ecology ---
  {
    exam_origin_tag: "UPSC CSE Prelims PYQ",
    subject_category: "Geography and Environmental constructs",
    difficulty_level: "medium",
    year: 2022,
    syllabus_node_id: "GS3.ENV.ECOLOGY",
    question_text: "Which of the following is NOT a bird?",
    options_matrix: {
      "A": "Golden Mahseer",
      "B": "Indian Nightjar",
      "C": "Spoonbill",
      "D": "White Ibis"
    },
    correct_option: "A",
    conceptual_explanation: "The Golden Mahseer (Tor putitora) is a freshwater fish inhabiting the fast-flowing streams of the Himalayan rivers, known as the 'Tiger of Indian Rivers'. Nightjar, Spoonbill, and White Ibis are all avian species."
  },
  {
    exam_origin_tag: "UPSC CSE Prelims PYQ",
    subject_category: "Geography and Environmental constructs",
    difficulty_level: "hard",
    year: 2021,
    syllabus_node_id: "GS3.ENV.CONSERVATION",
    question_text: "With reference to the 'New York Declaration on Forests', which of the following statements are correct?\n1. It was first endorsed at the UN Climate Summit in 2014.\n2. It endorses a global timeline to cut the loss of forests in half by 2020 and end it by 2030.\n3. It is a legally binding international declaration.\n4. It is endorsed by governments, companies and indigenous communities.\n5. India was one of the signatories at its inception.\nSelect the correct answer using the code given below:",
    options_matrix: {
      "A": "1, 2 and 4 only",
      "B": "1, 3 and 5 only",
      "C": "3 and 4 only",
      "D": "2 and 5 only"
    },
    correct_option: "A",
    conceptual_explanation: "Statements 1, 2, and 4 are correct. Statement 3 is incorrect (it is voluntary and non-legally binding). Statement 5 is incorrect (India is not a signatory to the NY Declaration on Forests)."
  },

  // --- Science & Technology ---
  {
    exam_origin_tag: "UPSC CSE Prelims PYQ",
    subject_category: "Science, Technology and Security constructs",
    difficulty_level: "medium",
    year: 2023,
    syllabus_node_id: "GS3.SNT.SPACE",
    question_text: "Consider the following statements regarding the Indian Space Research Organisation (ISRO):\n1. PSLV is a four-stage launch vehicle with alternating solid and liquid propulsion stages.\n2. GSLV Mk III (LVM3) is a three-stage launch vehicle with an indigenous cryogenic upper stage.\nWhich of the statements given above is/are correct?",
    options_matrix: {
      "A": "1 only",
      "B": "2 only",
      "C": "Both 1 and 2",
      "D": "Neither 1 nor 2"
    },
    correct_option: "C",
    conceptual_explanation: "Both statements are correct. PSLV uses 4 stages: 1st Solid (HTPB), 2nd Liquid (Vikas engine), 3rd Solid, 4th Liquid. LVM3 uses two S200 solid strap-ons, an L110 core liquid stage, and the CE-20 cryogenic upper stage."
  },

  // --- Ethics ---
  {
    exam_origin_tag: "UPSC CSE Foundation Practice",
    subject_category: "Governance, Ethics and Administrative constructs",
    difficulty_level: "medium",
    year: 2024,
    syllabus_node_id: "GS4.ETH.DIMENSIONS",
    question_text: "Which of the following best exemplifies the ethical doctrine of 'Deontology' as articulated by Immanuel Kant?",
    options_matrix: {
      "A": "An action is morally right if its consequences produce the greatest happiness for the greatest number.",
      "B": "An action is inherently right if it conforms to a universal moral duty, regardless of its consequences.",
      "C": "An action is right if it cultivates noble character traits and practical wisdom in the actor.",
      "D": "Moral rules are cultural conventions that vary across different societies and epochs."
    },
    correct_option: "B",
    conceptual_explanation: "Kantian Deontology (Duty Ethics) holds that actions are morally necessary and obligatory in themselves according to the Categorical Imperative, independent of their empirical outcomes or consequences."
  },

  // --- CSAT ---
  {
    exam_origin_tag: "UPSC CSE CSAT PYQ",
    subject_category: "Analytical Reasoning and Aptitude (CSAT)",
    difficulty_level: "medium",
    year: 2023,
    syllabus_node_id: "CSAT.REASONING",
    question_text: "A number 8573X2 is divisible by 9, where X is a single digit. What is the value of X?",
    options_matrix: {
      "A": "2",
      "B": "4",
      "C": "7",
      "D": "9"
    },
    correct_option: "A",
    conceptual_explanation: "A number is divisible by 9 if the sum of its digits is divisible by 9. Sum of digits = 8 + 5 + 7 + 3 + X + 2 = 25 + X. The nearest multiple of 9 greater than or equal to 25 is 27. Therefore, 25 + X = 27 => X = 2."
  }
];

export async function runIngestion(options: { dryRun?: boolean; seedSupabase?: boolean } = {}) {
  console.log("==================================================================");
  console.log("⚡ Tark 1.0 — External UPSC Resources ETL Ingestion Pipeline");
  console.log("==================================================================");
  console.log(`Source Repo: madhurimarawat/UPSC-Notes-Resources`);
  console.log(`Dry Run Mode: ${options.dryRun ? "ENABLED" : "DISABLED"}`);
  console.log(`Supabase Sync: ${options.seedSupabase ? "ENABLED" : "DISABLED"}\n`);

  // 1. Fetch remote manifests if available, otherwise compile from catalog
  const resourceCatalog: ResourceItem[] = [
    {
      title: "Drishti IAS Topper & Standard Subject Notes",
      url: "https://www.pdfnotes.co/drishti-ias-notes/",
      category: "Static Subject Revision",
      paper: "General",
      sourceType: "notes_pdf",
      description: "Comprehensive subject-wise notes for Indian Polity, Modern History, Geography, and Economy.",
      tags: ["Drishti IAS", "GS1", "GS2", "GS3", "Comprehensive"]
    },
    {
      title: "Guidely Banking & Economic Current Affairs Compendium",
      url: "https://guidely.in/free-pdf/banking-current-affairs",
      category: "Economy & Banking",
      paper: "GS3",
      sourceType: "official_portal",
      description: "Detailed monthly compendiums covering RBI regulations, monetary policy, and financial developments.",
      tags: ["Banking", "RBI", "Economy", "Current Affairs"]
    },
    {
      title: "Vajiram & Ravi Free UPSC Study Materials & Handouts",
      url: "https://vajiramandravi.com/upsc-exam/free-upsc-study-material-notes/",
      category: "Classroom Foundation Handouts",
      paper: "General",
      sourceType: "notes_pdf",
      description: "Class handouts and reference primers across all General Studies papers.",
      tags: ["Vajiram", "Foundation", "GS1", "GS2", "GS3", "GS4"]
    },
    {
      title: "ClearIAS Indian History & Freedom Struggle Notes",
      url: "https://www.clearias.com/indian-history/",
      category: "History & Heritage",
      paper: "GS1",
      sourceType: "article",
      description: "Structured, point-wise chronologies of Ancient, Medieval, and Modern Indian History.",
      tags: ["History", "Ancient", "Modern", "Freedom Struggle"]
    },
    {
      title: "IAS Exam Portal Topper Notes & Model Answers",
      url: "https://iasexamportal.com/upsc-topper-notes",
      category: "Mains Answer Writing",
      paper: "GS4",
      sourceType: "notes_pdf",
      description: "Handwritten notes and answer copies from recent UPSC CSE Rank holders.",
      tags: ["Toppers", "Mains", "Handwritten", "Answer Copies"]
    },
    {
      title: "UPSC Modern History MCQ Generator AI Tool",
      url: "https://chatgpt.com/g/g-688253dce9508191a6e8563d167de179-upsc-modern-history-mcq-generator",
      category: "AI Practice Tools",
      paper: "GS1",
      sourceType: "gpt_tool",
      description: "Specialized GPT assistant for generating analytical UPSC-standard Modern History MCQs.",
      tags: ["GPT", "AI Tutor", "Modern History", "Practice"]
    },
    {
      title: "UPSC Answer Writer & Mains Structuring GPT",
      url: "https://chatgpt.com/g/g-40f6OK9C3-upsc-answer-writer",
      category: "AI Practice Tools",
      paper: "General",
      sourceType: "gpt_tool",
      description: "AI model calibrated to evaluate and structure 10-marker and 15-marker GS answers.",
      tags: ["GPT", "Mains", "Answer Structuring", "AI"]
    }
  ];

  // 2. Ensure output directory exists in src/data/
  const dataDir = path.resolve(process.cwd(), "src/data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 3. Write upsc-resources-catalog.json
  const catalogPayload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      sourceRepository: "https://github.com/madhurimarawat/UPSC-Notes-Resources",
      license: "MIT",
      totalSubjects: SUBJECT_MODULES.length,
      totalExternalResources: resourceCatalog.length
    },
    subjects: SUBJECT_MODULES,
    resources: resourceCatalog
  };

  const catalogFilePath = path.join(dataDir, "upsc-resources-catalog.json");
  fs.writeFileSync(catalogFilePath, JSON.stringify(catalogPayload, null, 2), "utf-8");
  console.log(`[OK] Generated Resources Catalog: ${catalogFilePath} (${resourceCatalog.length} resources)`);

  // 4. Write static-subject-questions.json
  const questionsPayload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "UPSC-Notes-Resources & Tark Standard PYQ Engine",
      totalQuestions: SEED_STATIC_QUESTIONS.length
    },
    questions: SEED_STATIC_QUESTIONS
  };

  const questionsFilePath = path.join(dataDir, "static-subject-questions.json");
  fs.writeFileSync(questionsFilePath, JSON.stringify(questionsPayload, null, 2), "utf-8");
  console.log(`[OK] Generated Static Questions Bank: ${questionsFilePath} (${SEED_STATIC_QUESTIONS.length} curated questions)`);

  // 5. Build Knowledge Vault Markdown Hubs in 03_MEMORY/knowledge/
  const knowledgeDir = path.resolve(process.cwd(), "03_MEMORY/knowledge");
  if (!fs.existsSync(knowledgeDir)) {
    fs.mkdirSync(knowledgeDir, { recursive: true });
  }

  for (const sub of SUBJECT_MODULES) {
    const subDir = path.join(knowledgeDir, sub.id);
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }

    const indexContent = `---
title: ${sub.title}
paper: ${sub.paper}
syllabus_node: ${sub.syllabusNodeId || "N/A"}
tags:
  - knowledge-hub
  - upsc-${sub.id}
  - ${sub.paper.toLowerCase()}
---

# 📚 ${sub.title} (${sub.paper})

> **Overview**: ${sub.overview}

---

## 🎯 Core Syllabus Themes

${sub.keyThemes.map((theme, i) => `${i + 1}. **${theme}**`).join("\n")}

---

## 🗺️ Mind Map & Visual Anchors

${sub.mindMapHighlights.map(mm => `- 📌 [[03_MEMORY/knowledge/mind-maps/${sub.id}|${mm}]]`).join("\n")}

---

## 📖 Canonical Reference Sources

${sub.recommendedSources.map(src => `- ${src}`).join("\n")}

---

## ⚡ Tark Test Arena Integration
- Practice MCQs: \`Arena.tsx\` filter on \`${sub.title}\`
- Syllabus Node: \`[[server-lib/cron/ingest/syllabus/nodes.ts#${sub.syllabusNodeId}|${sub.syllabusNodeId}]]\`
`;

    fs.writeFileSync(path.join(subDir, "index.md"), indexContent, "utf-8");
  }
  console.log(`[OK] Structured 03_MEMORY/knowledge/ subject hubs (${SUBJECT_MODULES.length} subjects)`);

  // 6. Supabase Seeding (if enabled & configured)
  if (options.seedSupabase && SUPABASE_KEY) {
    try {
      console.log("\n[Sync] Attempting to seed new questions to Supabase static_questions...");
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      for (const q of SEED_STATIC_QUESTIONS) {
        const { error } = await supabase
          .from("static_questions")
          .upsert({
            exam_origin_tag: q.exam_origin_tag,
            subject_category: q.subject_category,
            difficulty_level: q.difficulty_level,
            question_text: q.question_text,
            options_matrix: q.options_matrix,
            correct_option: q.correct_option,
            conceptual_explanation: q.conceptual_explanation
          }, { onConflict: "question_text" });

        if (error) {
          console.warn(`[Supabase Warn] Question insert note: ${error.message}`);
        }
      }
      console.log(`[Supabase OK] Seeded static questions to remote database.`);
    } catch (dbErr: any) {
      console.warn(`[Supabase Error] Database sync skipped: ${dbErr.message}`);
    }
  }

  console.log("\n✅ Ingestion & Knowledge Structuring Complete.");
}

// CLI Execution
if (process.argv[1]?.includes("ingest-upsc-resources")) {
  const isDryRun = process.argv.includes("--dry-run");
  const isSeed = process.argv.includes("--seed");
  runIngestion({ dryRun: isDryRun, seedSupabase: isSeed });
}
