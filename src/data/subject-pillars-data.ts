/**
 * src/data/subject-pillars-data.ts
 *
 * Grounded UPSC General Studies Knowledge Pillars & Empirical Syllabus Core.
 * Derived from the systematic synthesis of:
 * - 25 Years of Official UPSC CSE Prelims & Mains Papers (2000–2025)
 * - 2nd Administrative Reforms Commission (ARC) Reports & Law Commission recommendations
 * - Economic Survey, Union Budget, and Supreme Court Landmark Judgments
 * - High-Yield Static GK Master Data Matrices (Ramsar, Tiger Reserves, Passes, Classical Arts, Treaties)
 */

export interface MindMapNode {
  id: string;
  title: string;
  subtitle: string;
  /**
   * 'branching': details are distinct categories/paths forking from one root question
   *   (e.g. "what are you amending?" -> 3 different majority thresholds).
   * 'sequential': details are an ordered procedure where each step presumes the last
   *   (e.g. a 6-step resolution algorithm).
   */
  structureType: 'branching' | 'sequential';
  /** For 'branching' only: the forking question the branches answer. */
  rootQuestion?: string;
  details: string[];
  /**
   * Optional, same length/order as `details` — a worked illustration of
   * that step. Labeled as illustrative in the UI, not attributed to a
   * specific real paper, unless the text itself cites one.
   */
  examples?: string[];
}

export interface MainsBlueprint {
  questionTitle: string;
  marks: 10 | 15;
  yearContext: string;
  structure: {
    introduction: string;
    bodyArguments: { heading: string; points: string[] }[];
    statutoryAnchors: string[];
    balancedConclusion: string;
  };
}

export interface PyqEvidenceStat {
  theme: string;
  frequencyLast10Years: number;
  testabilityScore: "VERY HIGH" | "HIGH" | "MEDIUM";
  examinerTrap: string;
  recentYearAnchors: number[];
}

export interface StaticFactMatrix {
  id: string;
  title: string;
  category: string;
  headers: string[];
  rows: string[][];
  highYieldTip: string;
}

export interface SubjectPillar {
  id: string;
  code: string;
  paper: "GS1" | "GS2" | "GS3" | "GS4" | "CSAT" | "STATIC_GK";
  title: string;
  sanskritSubtitle: string;
  shortDescription: string;
  empiricalBasis: string;
  colorTheme: {
    primary: string;
    border: string;
    bgGlow: string;
    text: string;
  };
  keyMetrics: {
    totalMarksWeight: string;
    prelimsAvgQuestions: string;
    pyqCoverageYears: string;
  };
  foundationalConcepts: {
    title: string;
    syllabusTag: string;
    coreTheory: string;
    criticalProvisions: string[];
    examinerPerspective: string;
  }[];
  mindMaps: MindMapNode[];
  pyqEvidence: PyqEvidenceStat[];
  mainsBlueprints: MainsBlueprint[];
  staticMatrices?: StaticFactMatrix[];
}

export const SUBJECT_PILLARS: SubjectPillar[] = [
  // =========================================================================
  // PILLAR 1: GS2 — Constitutional Architecture & Governance
  // =========================================================================
  {
    id: "gs2-polity",
    code: "PILLAR_02",
    paper: "GS2",
    title: "Constitutional Architecture & Governance",
    sanskritSubtitle: "संविधान एवं राजव्यवस्था",
    shortDescription: "Sovereign constitutionalism, fundamental rights, judicial doctrines, federal friction matrices, and parliamentary procedures.",
    empiricalBasis: "Empirically mapped against 240+ questions across 2000–2025 Prelims and GS Paper 2 Mains papers, Supreme Court Constitutional Bench rulings, and Sarkaria/Punchhi Commission reports.",
    colorTheme: {
      primary: "#e0d0ab",
      border: "rgba(224, 208, 171, 0.3)",
      bgGlow: "rgba(224, 208, 171, 0.08)",
      text: "#ebdcb7"
    },
    keyMetrics: {
      totalMarksWeight: "250 Marks (Mains GS2)",
      prelimsAvgQuestions: "15–18 Questions / Year",
      pyqCoverageYears: "2000–2025 (25 Years)"
    },
    foundationalConcepts: [
      {
        title: "Basic Structure Doctrine & Judicial Review",
        syllabusTag: "GS2.POL.CONSTITUTION",
        coreTheory: "The Constitution is not an ordinary statute; Parliament's amending power under Article 368 is limited. In Kesavananda Bharati (1973), the Supreme Court ruled that amending power cannot alter the constitutional identity, including supremacy of the Constitution, rule of law, independence of the judiciary, and federalism.",
        criticalProvisions: [
          "Article 13(2): Laws inconsistent with or in derogation of Fundamental Rights are void.",
          "Article 32 & 226: Supreme Court & High Court writ jurisdictions for fundamental rights enforcement.",
          "Minerva Mills (1980): Limited amending power is itself a basic feature of the Constitution.",
          "I.R. Coelho (2007): 9th Schedule laws post-April 24, 1973 are open to judicial review."
        ],
        examinerPerspective: "UPSC tests the boundary between Parliamentary Sovereignty (UK model) vs Judicial Supremacy (US model), and how India harmonizes both via 'Procedure Established by Law' and 'Due Process of Law' (Maneka Gandhi, 1978)."
      },
      {
        title: "Centre-State Asymmetries & Federal Dynamics",
        syllabusTag: "GS2.POL.FEDERALISM",
        coreTheory: "Indian federalism is 'holding together' rather than 'coming together' (K.C. Wheare's Quasi-Federal model). Inter-state friction operates across legislative (7th Schedule), administrative (Articles 256, 257, 356), and financial (GST Council Article 279A, Finance Commission Article 280) vectors.",
        criticalProvisions: [
          "Article 246 & 7th Schedule: Union, State, and Concurrent Lists with Union residuary powers (Art 248).",
          "Article 356 & S.R. Bommai (1994): President's Rule is subject to judicial review; floor test is mandatory.",
          "Article 263: Inter-State Council as an institutional platform for cooperative federalism.",
          "Article 279A: GST Council as a constitutional joint forum for fiscal federalism."
        ],
        examinerPerspective: "Examiners consistently target asymmetric provisions (Article 371 series), Governor's discretionary powers (Article 163), and conditional central devolution."
      },
      {
        title: "Parliamentary Committees & Executive Accountability",
        syllabusTag: "GS2.POL.PARLIAMENT",
        coreTheory: "Parliament is too large and busy to scrutinize every legislative clause and expenditure detail directly. Standing and Select Committees act as non-partisan institutional watchdogs ensuring continuous legislative oversight over executive bureaucracy.",
        criticalProvisions: [
          "Public Accounts Committee (PAC): Examines CAG audit reports; chaired by an Opposition member by convention.",
          "Estimates Committee: Largest committee (30 members, all from Lok Sabha); examines economy in government expenditure.",
          "Committee on Public Undertakings (COPU): 22 members (15 LS + 7 RS); oversees PSU performance.",
          "Department-related Parliamentary Standing Committees (DRSCs): 24 committees scrutinizing ministerial demands for grants."
        ],
        examinerPerspective: "UPSC frequently examines why Ministers cannot be members of financial committees, and tests the exact membership split between Lok Sabha and Rajya Sabha."
      },
      {
        title: "Constitutional, Statutory & Regulatory Bodies",
        syllabusTag: "GS2.POL.INSTITUTIONS",
        coreTheory: "Governance in India relies on institutional independence. Constitutional bodies derive power directly from Articles of the Constitution (ECI Art 324, CAG Art 148, UPSC Art 315, Finance Commission Art 280), whereas Statutory bodies are created by Acts of Parliament (NHRC, CVC, CIC, NGT, CCI, SEBI).",
        criticalProvisions: [
          "Security of Tenure: Judges, CAG, CEC removed only via impeachment-like presidential order (Art 124(4)).",
          "Charged on Consolidated Fund of India: Salaries of SC Judges, CAG, UPSC Chairman not voted upon by Parliament.",
          "Statutory Quasi-Judicial Authorities: NGT Act 2010 (applies principles of natural justice and sustainable development)."
        ],
        examinerPerspective: "Examiners test the appointment collegiums (e.g. Chief Election Commissioner Act 2023, Lokpal Act 2013, CBI Director selection committee under CVC Act)."
      }
    ],
    mindMaps: [
      {
        id: "mm-amendment",
        title: "Constitutional Amendment Taxonomy (Article 368)",
        subtitle: "Three-tier amendment pathway",
        structureType: "branching",
        rootQuestion: "What provision is being amended?",
        details: [
          "Simple Majority: Creation of new states (Art 2/3), abolition of Legislative Councils (Art 169), official language, 5th/6th Schedule rules.",
          "Special Majority (Art 368): 2/3rd present & voting + majority of total membership (Fundamental Rights & DPSP).",
          "Special Majority + 50% State Ratification: Election of President, Union/State Judiciary, 7th Schedule lists, Art 368 itself."
        ]
      },
      {
        id: "mm-writs",
        title: "Constitutional Writs Matrix (Article 32 / 226)",
        subtitle: "Scope & Target Entity",
        structureType: "branching",
        rootQuestion: "Which writ fits the violation?",
        details: [
          "Habeas Corpus: Against both state authorities and private individuals for unlawful bodily detention.",
          "Mandamus: Command to perform statutory public duty; NOT issued against President/Governor, private entities, or discretionary acts.",
          "Prohibition & Certiorari: Issued against judicial & quasi-judicial bodies (Certiorari also quashes executive quasi-judicial orders).",
          "Quo-Warranto: Challenges illegal usurpation of a substantive public office created by statute/Constitution."
        ]
      }
    ],
    pyqEvidence: [
      {
        theme: "Preamble & Fundamental Rights Interplay",
        frequencyLast10Years: 12,
        testabilityScore: "VERY HIGH",
        examinerTrap: "Confusing whether Preamble is a source of power (it is NOT) or legally enforceable (it is non-justiciable).",
        recentYearAnchors: [2020, 2021, 2023, 2024]
      },
      {
        theme: "Governor's Discretionary Powers & Bills Reservation",
        frequencyLast10Years: 9,
        testabilityScore: "HIGH",
        examinerTrap: "Assuming Governor has unbounded timeline to assent to bills (addressed in 2023 Punjab & Telangana SC judgments).",
        recentYearAnchors: [2018, 2019, 2022, 2023]
      },
      {
        theme: "Money Bill Certification & Bicameral Powers",
        frequencyLast10Years: 8,
        testabilityScore: "HIGH",
        examinerTrap: "Speaker's certification under Art 110 is subject to judicial review if it is colourable exercise of power.",
        recentYearAnchors: [2018, 2019, 2023, 2024]
      }
    ],
    mainsBlueprints: [
      {
        questionTitle: "'The Indian Constitution balances Parliamentary Sovereignty with Judicial Supremacy.' Critically analyze.",
        marks: 10,
        yearContext: "Mains GS2 Benchmark",
        structure: {
          introduction: "Define the constitutional synthesis: Unlike British absolute legislative supremacy and American judicial supremacy, the Indian Constitution establishes a midpoint with written constitutional supremacy.",
          bodyArguments: [
            {
              heading: "Parliamentary Competence",
              points: [
                "Power to amend Constitution under Art 368 and legislate on Union/Concurrent lists.",
                "Representative mandate of executive accountability through Lok Sabha (Art 75(3))."
              ]
            },
            {
              heading: "Judicial Restraints & Review",
              points: [
                "Power to strike down unconstitutional statutes under Art 13, 32, and 136.",
                "Inviolable perimeter guarded by Kesavananda Bharati Basic Structure doctrine."
              ]
            }
          ],
          statutoryAnchors: ["Article 13", "Article 124", "Article 368", "Kesavananda Bharati (1973)", "Minerva Mills (1980)"],
          balancedConclusion: "Conclude that both organs operate not in conflict but under mutual constitutional checks, preserving democratic stability without majoritarian tyranny."
        }
      }
    ],
    staticMatrices: [
      {
        id: "pol-sc-landmarks",
        title: "Landmark Supreme Court Judgments for Prelims & Mains",
        category: "Constitutional Jurisprudence",
        headers: ["Case Law", "Year", "Core Doctrine / Finding", "Constitutional Anchor"],
        rows: [
          ["Kesavananda Bharati", "1973", "Propounded Basic Structure Doctrine; limited Article 368 amending power", "Art 368 & Art 13"],
          ["Maneka Gandhi", "1978", "Expanded Article 21 to include 'Due Process of Law' (Fair, Just, Reasonable)", "Article 21 & Art 14"],
          ["Minerva Mills", "1980", "Harmony between Fundamental Rights and DPSP is a basic feature", "Art 31C, Art 14, 368"],
          ["S.R. Bommai", "1994", "President's Rule under Art 356 subject to judicial review; floor test mandatory", "Article 356"],
          ["I.R. Coelho", "2007", "Ninth Schedule laws post-April 24, 1973 are open to judicial review", "Article 31B & 9th Sched"],
          ["K.S. Puttaswamy", "2017", "Right to Privacy declared an intrinsic Fundamental Right under Article 21", "Article 21 & Part III"],
          ["Indra Sawhney", "1992", "Upheld 27% OBC reservation; introduced 50% vertical ceiling and creamy layer", "Art 16(4)"],
          ["Navtej Singh Johar", "2018", "Decriminalized Section 377 IPC; constitutional morality over majoritarian views", "Art 14, 15, 19, 21"],
          ["EWS Ruling (Janki Janhit)", "2022", "Upheld 103rd Amendment (10% EWS reservation) breaching 50% ceiling", "Art 15(6) & 16(6)"],
          ["Electoral Bonds Verdict", "2024", "Struck down Electoral Bonds Scheme as violative of voter's Right to Information", "Article 19(1)(a)"]
        ],
        highYieldTip: "UPSC tests how landmark judgments transformed statutory interpretations from formalistic procedures into substantive rights."
      },
      {
        id: "pol-const-vs-statutory",
        title: "Constitutional vs Statutory Bodies Comparative Matrix",
        category: "Institutional Framework",
        headers: ["Body Name", "Status", "Parent Authority / Act", "Removal / Independence Mechanism"],
        rows: [
          ["Election Commission of India", "Constitutional", "Article 324", "CEC removed like SC Judge; conditions of service cannot be varied to disadvantage"],
          ["Comptroller & Auditor General", "Constitutional", "Article 148", "Removed like SC Judge; ineligible for further office under Union/State"],
          ["Union Public Service Commission", "Constitutional", "Article 315–323", "Chairman removed by President after SC enquiry on misbehavior (Art 317)"],
          ["Finance Commission", "Constitutional", "Article 280", "Constituted every 5 years; quasi-judicial advisory body on fiscal devolution"],
          ["National Human Rights Commission", "Statutory", "Protection of Human Rights Act 1993", "Appointed on recommendation of 6-member committee; recommendatory powers"],
          ["Central Vigilance Commission", "Statutory", "CVC Act 2003", "Superintends CBI investigations under Prevention of Corruption Act"],
          ["National Green Tribunal", "Statutory", "NGT Act 2010", "Chaired by retired SC Judge/CJ of HC; 6-month statutory case disposal mandate"],
          ["NITI Aayog", "Non-Constitutional / Non-Statutory", "Cabinet Resolution (1 Jan 2015)", "Think-tank fostering cooperative & competitive federalism; no financial allocation powers"]
        ],
        highYieldTip: "NITI Aayog is neither constitutional nor statutory; it was created by an executive resolution."
      }
    ]
  },

  // =========================================================================
  // PILLAR 2: GS1 — History, Civilizations & Heritage
  // =========================================================================
  {
    id: "gs1-history-culture",
    code: "PILLAR_01",
    paper: "GS1",
    title: "History, Civilizations & Heritage",
    sanskritSubtitle: "इतिहास, कला एवं संस्कृति",
    shortDescription: "Ancient to modern Indian history, temple architecture schools, physical and economic geography systems, and contemporary Indian societal dynamics.",
    empiricalBasis: "History/Culture foundational concepts synthesized from standard syllabus resources (NCERT Fine Arts, Spectrum, Themes in Indian History), with Mains answer blueprints directly extracted and structured from official UPSC GS Paper 1 Mains faculty analysis.",
    colorTheme: {
      primary: "#f59e0b",
      border: "rgba(245, 158, 11, 0.3)",
      bgGlow: "rgba(245, 158, 11, 0.08)",
      text: "#fbbf24"
    },
    keyMetrics: {
      totalMarksWeight: "250 Marks (Mains GS1)",
      prelimsAvgQuestions: "14–16 Questions / Year",
      pyqCoverageYears: "2000–2025 (25 Years)"
    },
    foundationalConcepts: [
      {
        title: "Temple Architecture Evolution: Nagara vs Dravida vs Vesara",
        syllabusTag: "GS1.CUL.ARCH",
        coreTheory: "Indian temple architecture evolved from Gupta-era flat-roof shrines into three grand structural styles. Nagara (North) features curvilinear Shikhara, square Sanctum, and absence of boundary walls. Dravida (South) features pyramidal Vimana, monumental Gopurams, pillared Mandapas, and temple water tanks. Vesara (Deccan) fuses both.",
        criticalProvisions: [
          "Nagara: Khajuraho (Kandariya Mahadeva), Sun Temple Konark, Odisha Rekha-Deula sub-school.",
          "Dravida: Brihadeeswarar Temple (Thanjavur - Chola), Shore Temple Mahabalipuram (Pallava).",
          "Vesara: Hoysala temples (Belur, Halebidu, Somanathapura - star-shaped stellate plans), Chalukyan temples at Badami and Aihole."
        ],
        examinerPerspective: "UPSC focuses on structural terminology (Amalaka, Kalasha, Antarala, Jagati, Garbhagriha) and distinguishing regional variants (Odisha, Solanki, Khajuraho)."
      },
      {
        title: "Gandhian Mass Mobilization & Strategic Phases (1915–1947)",
        syllabusTag: "GS1.HIS.FREEDOM",
        coreTheory: "The freedom struggle under Gandhi followed the 'Struggle-Truce-Struggle' (S-T-S) paradigm. Mass phases (Non-Cooperation 1920–22, Civil Disobedience 1930–34, Quit India 1942) alternated with constructive socio-economic programs (Khadi, anti-untouchability, village sanitation).",
        criticalProvisions: [
          "Non-Cooperation: Resignation from legislative councils, boycott of foreign cloth, surrender of titles, Tilak Swaraj Fund.",
          "Civil Disobedience: Dandi Salt March, breaking salt monopoly, non-payment of chowkidari tax, mobilization of women and business classes.",
          "Quit India: Immediate end to British rule, 'Do or Die' mantra, underground parallel governments (Balia, Tamluk, Satara)."
        ],
        examinerPerspective: "UPSC analyzes the ideological divergence between Moderates (Gokhale), Extremists (Tilak), Socialists (Nehru, Bose), and Revolutionaries (Bhagat Singh)."
      },
      {
        title: "Buddhism & Jainism: Heterodox Philosophies & Epistemology",
        syllabusTag: "GS1.CUL.PHILOSOPHY",
        coreTheory: "Both 6th century BCE heterodox movements rejected Vedic animal sacrifices and caste hierarchies. Buddhism propounded the Middle Path (Majjhima Patipada), Four Noble Truths, and Pratityasamutpada (Dependent Origination). Jainism advocated extreme asceticism, Anekantavada (multiplicity of viewpoints), and Syadvada (relativity of truth).",
        criticalProvisions: [
          "Buddhist Pitakas: Vinaya (monastic discipline), Sutta (sermons), Abhidhamma (metaphysical philosophy).",
          "Jain Canonical Texts: Agamas compiled at Valabhi; division into Digambaras (sky-clad) and Svetambaras (white-clad).",
          "Key Philosophical Schools: Madhyamaka (Nagarjuna - Shunyavada), Yogachara (Asanga & Vasubandhu)."
        ],
        examinerPerspective: "UPSC frequently tests Bodhisattvas (Avalokiteshvara, Maitreya, Manjushri) and pairs philosophical schools with their founders."
      }
    ],
    mindMaps: [
      {
        id: "mm-temples",
        title: "Temple Architectural Typology Matrix",
        subtitle: "North to South Styles",
        structureType: "branching",
        rootQuestion: "Which regional style built the temple?",
        details: [
          "Nagara: Curvilinear Shikhara, Amalaka crowning, raised plinth (Jagati), no boundary walls.",
          "Dravida: Stepped pyramidal Vimana, massive Gopurams, enclosed perimeter, Kalyana Mandapas.",
          "Vesara / Hoysala: Stellate (star-shaped) ground plan, soapstone carvings, multi-tiered friezes."
        ]
      },
      {
        id: "mm-freedom-phases",
        title: "Chronological Sequence of Gandhian Mass Movements",
        subtitle: "Struggle-Truce-Struggle (S-T-S) Trajectory",
        structureType: "sequential",
        details: [
          "1917–1918: Regional Experiments (Champaran Satyagraha, Ahmedabad Mill Strike, Kheda Satyagraha).",
          "1919–1922: Rowlatt Satyagraha, Khilafat & All-India Non-Cooperation Movement (Chauri Chaura truce).",
          "1930–1934: Dandi Salt March & Civil Disobedience Movement (Gandhi-Irwin Pact & Round Table Conferences).",
          "1940–1942: Individual Satyagraha (Vinoba Bhave, Nehru) leading into Quit India Movement ('Do or Die')."
        ]
      }
    ],
    pyqEvidence: [
      {
        theme: "Ancient Literature, Inscriptions & Thinkers",
        frequencyLast10Years: 14,
        testabilityScore: "VERY HIGH",
        examinerTrap: "Pair-matching Buddhist vs Jain philosophers or conflating texts (e.g. Sangam works with Vedic literature).",
        recentYearAnchors: [2019, 2021, 2022, 2023, 2024]
      },
      {
        theme: "Harappan Urbanism, Crafts & Maritime Trade",
        frequencyLast10Years: 8,
        testabilityScore: "HIGH",
        examinerTrap: "Assuming iron or horses were widespread in Mature Harappan culture (both are absent/controversial).",
        recentYearAnchors: [2018, 2019, 2021, 2023]
      }
    ],
    mainsBlueprints: [
      {
        questionTitle: "Highlight the central differences between the Nagara and Dravida styles of temple architecture.",
        marks: 10,
        yearContext: "Mains GS1 Benchmark",
        structure: {
          introduction: "Briefly trace how Gupta flat-roof shrines evolved into regional monumental idioms across North and South India.",
          bodyArguments: [
            {
              heading: "Structural Differences",
              points: [
                "Shikhara (Nagara curvilinear) vs Vimana (Dravida stepped pyramid).",
                "Boundary walls & Gopurams (absent in Nagara, central monumental entrance in Dravida).",
                "Water tank (Pushkarani) integrated inside Dravida temple enclosure."
              ]
            }
          ],
          statutoryAnchors: ["NCERT Class 11 Fine Arts", "UNESCO World Heritage Chola & Hoysala Sites"],
          balancedConclusion: "Conclude that both styles reflect profound regional mastery of sacred geometry, culminating in the composite Vesara traditions."
        }
      },
      {
        questionTitle: "Analyse the significance of Ashokan inscriptions for reconstructing Mauryan history.",
        marks: 10,
        yearContext: "2026 UPSC GS1 Mains (Real Paper)",
        structure: {
          introduction: "Ashokan inscriptions, deciphered by James Prinsep in 1837 across Major and Minor Rock and Pillar Edicts, serve as direct epigraphical primary sources illuminating Mauryan polity, administrative boundaries, ideological statecraft, and diplomatic horizons.",
          bodyArguments: [
            {
              heading: "Reconstruction of Mauryan Polity & Administration",
              points: [
                "Provides institutional evidence for specialized bureaucratic machinery including Rajukas (rural administrators), Mahamattas, and Dhamma Mahamattas appointed to enforce civic ethics.",
                "Details decentralized provincial governance structures with royal princes (Kumaras) posted as viceroys at Ujjayini, Taxila, and Tosali.",
                "Pillar Edict IV outlines judicial discretion and procedural timelines, including a three-day reprieve granted to condemned prisoners."
              ]
            },
            {
              heading: "Ideological Statecraft & Territorial Delimitation",
              points: [
                "Major Rock Edict XIII explicitly records the psychological watershed of the Kalinga War, marking the transition from Bherighosha (conquest by war) to Dhammaghosha (conquest by righteousness).",
                "Inscriptional distribution from Kandahar (bilingual Greek-Aramaic) and Shahbazgarhi (Kharosthi) to Maski and Brahmagiri (Brahmi) demarcates the imperial frontiers and multilingual linguistic policy.",
                "Major Rock Edict II documents external diplomatic outreach to contemporary Hellenistic kings (Antiochus II, Ptolemy II, Antigonus Gonatas) and south Indian neighbours (Cholas, Pandyas, Satyaputras)."
              ]
            }
          ],
          statutoryAnchors: [
            "Major Rock Edict XIII (Kalinga War)",
            "Major Rock Edict II (Hellenistic Diplomacy)",
            "Minor Rock Edict I (Maski/Gujarra - Devanampiya Piyadassi)",
            "NCERT Class 12 Themes in Indian History Part 1"
          ],
          balancedConclusion: "While epigraphs embody royal self-projection requiring critical collation with archaeological remains and foreign accounts (Megasthenes), they remain the foundational bedrock of Mauryan historical reconstruction."
        }
      }
    ],
    staticMatrices: [
      {
        id: "his-classical-dances",
        title: "Classical Indian Dances & Origin Roots (Sangeet Natak Akademi)",
        category: "Art & Culture",
        headers: ["Dance Form", "State of Origin", "Key Distinctive Characteristics", "Pioneering Revivers"],
        rows: [
          ["Bharatanatyam", "Tamil Nadu", "Ekaharya solo presentation, fire element (Abhinaya), alarippu to tillana", "Rukmini Devi Arundale, E. Krishna Iyer"],
          ["Kathakali", "Kerala", "Dance-drama, sky element, elaborate facial makeup (Aharya) with green (paccha)/red (katti) faces", "Vallathol Narayana Menon (Kalamandalam)"],
          ["Mohiniyattam", "Kerala", "Dance of enchantress, air element, Lasya dominance, white-and-gold Kasavu saree", "Kalyanikutty Amma, Swathi Thirunal"],
          ["Kuchipudi", "Andhra Pradesh", "Earth element, Tarangam (dancing on brass plate), vachika abhinaya (speaking dialogues)", "Siddhendra Yogi, Vedantam Lakshminarayana"],
          ["Odissi", "Odisha", "Water element, Tribhanga posture, chowk stance, Mahari and Gotipua origins", "Kelucharan Mohapatra, Sanjukta Panigrahi"],
          ["Kathak", "Uttar Pradesh", "Storytellers (Kathakars), chakkars (pirouettes), jugalbandi with tabla, Lucknow & Jaipur gharanas", "Birju Maharaj, Sitara Devi"],
          ["Sattriya", "Assam", "15th-century Vaishnavite monastic tradition in Sattras, Borgeet musical grounding", "Mahapurusha Sankaradeva"],
          ["Manipuri", "Manipur", "Jagoi & Cholom, Raslila (Radha-Krishna devotion), Pung Cholom drum dance, tubular Kumil skirt", "Guru Bipin Singh, Rabindranath Tagore"]
        ],
        highYieldTip: "Kerala is the ONLY state with two classical dances (Kathakali and Mohiniyattam). Ministry of Culture also recognizes Chhau as the 9th classical form."
      },
      {
        id: "his-harappan-sites",
        title: "Major Indus Valley / Harappan Archaeological Sites",
        category: "Ancient Archaeology",
        headers: ["Site Name", "Location / River Basin", "Key Unique Archaeological Findings", "Excavator"],
        rows: [
          ["Harappa", "Punjab (Pakistan) / Ravi", "Granaries in 2 rows of six, working floors, coffin burials (R-37), stone lingam/yoni", "Daya Ram Sahni (1921)"],
          ["Mohenjo-daro", "Sindh (Pakistan) / Indus", "The Great Bath, Great Granary, Bronze Dancing Girl, Priest-King steatite statue", "R. D. Banerji (1922)"],
          ["Lothal", "Gujarat (India) / Bhogavo", "Tidal Dockyard connected to Gulf of Khambhat, double burial, rice husk, bead factory", "S. R. Rao (1954)"],
          ["Dholavira", "Gujarat (India) / Rann of Kutch", "Giant stone water reservoirs, 3-tier city planning (Citadel, Middle, Lower), 10-sign signboard", "R. S. Bisht (1990)"],
          ["Kalibangan", "Rajasthan (India) / Ghaggar", "Ploughed agricultural field surface, fire altars (Yajna kunds), camel bones, wooden furrow", "A. Ghosh & B. B. Lal"],
          ["Banawali", "Haryana (India) / Ghaggar-Hakra", "Terracotta replica model of a plough, high radial street planning, barley grains", "R. S. Bisht (1974)"],
          ["Rakhigarhi", "Haryana (India) / Drishadvati", "Largest Harappan site in the subcontinent, DNA extraction studies, lapidary workshop", "Amarendra Nath / Vasant Shinde"],
          ["Chanhu-daro", "Sindh (Pakistan) / Indus", "Only Harappan city without a Citadel, industrial bead-making factory, inkpot, lipsticks", "N. G. Majumdar (1931)"]
        ],
        highYieldTip: "Dholavira is unique for its 3-tier city division (all other cities had 2 tiers: Citadel and Lower Town) and stone masonry reservoirs."
      },
      {
        id: "his-buddhist-councils",
        title: "Ancient Buddhist Councils & Canons",
        category: "Ancient Religious History",
        headers: ["Council", "Year / Venue", "Royal Patron & Dynasty", "President", "Key Canonical Outcome"],
        rows: [
          ["1st Council", "483 BCE / Rajagriha (Sattapanni Cave)", "King Ajatashatru (Haryanka)", "Mahakassapa", "Compilation of Sutta Pitaka (by Ananda) and Vinaya Pitaka (by Upali)"],
          ["2nd Council", "383 BCE / Vaishali", "King Kalashoka (Shishunaga)", "Sabakami", "First major ideological split into Sthaviravadins (Elders) and Mahasanghikas"],
          ["3rd Council", "250 BCE / Pataliputra", "Emperor Ashoka (Maurya)", "Moggaliputta Tissa", "Compilation of Abhidhamma Pitaka; expulsion of heretics; dispatch of Dhamma missions abroad"],
          ["4th Council", "72 CE / Kundalvana (Kashmir)", "Emperor Kanishka (Kushan)", "Vasumitra (Vice: Ashvaghosha)", "Formal division of Buddhism into Mahayana (Great Vehicle) and Hinayana/Theravada; Mahavibhasha compiled"]
        ],
        highYieldTip: "Remember the royal patron chronology: Ajatashatru -> Kalashoka -> Ashoka -> Kanishka (AK-AK)."
      }
    ]
  },

  // =========================================================================
  // PILLAR 3: GS3 — Macroeconomic Systems & Technology
  // =========================================================================
  {
    id: "gs3-economy-infra",
    code: "PILLAR_03",
    paper: "GS3",
    title: "Macroeconomic Systems & Technology",
    sanskritSubtitle: "अर्थव्यवस्था, विज्ञान एवं प्रौद्योगिकी",
    shortDescription: "Monetary policy transmission, fiscal consolidation, banking asset quality, agri-value chains, and frontier space-tech.",
    empiricalBasis: "Formulated through rigorous analysis of RBI Monetary Policy reports, Economic Surveys, Union Budget structures, and ISRO/DRDO technical blueprints.",
    colorTheme: {
      primary: "#10b981",
      border: "rgba(168, 85, 247, 0.3)",
      bgGlow: "rgba(16, 185, 129, 0.08)",
      text: "#34d399"
    },
    keyMetrics: {
      totalMarksWeight: "250 Marks (Mains GS3)",
      prelimsAvgQuestions: "16–20 Questions / Year",
      pyqCoverageYears: "2000–2025 (25 Years)"
    },
    foundationalConcepts: [
      {
        title: "Liquidity Management & RBI Monetary Architecture",
        syllabusTag: "GS3.ECO.MONEY_BANK",
        coreTheory: "The RBI operates flexible inflation targeting (4% +/- 2% CPI) under the RBI Act 1934. The Liquidity Adjustment Facility (LAF) corridor consists of the Marginal Standing Facility (MSF) at the ceiling, Policy Repo Rate in the middle, and Standing Deposit Facility (SDF) at the floor.",
        criticalProvisions: [
          "Standing Deposit Facility (SDF): Absorbs uncollateralized liquidity, preventing shortage of G-Secs.",
          "Insolvency and Bankruptcy Code (IBC) 2016: Creditor-in-control model with 330-day resolution timeline.",
          "FRBM Act 2003: Fiscal deficit glide paths, escape clause (national security, disaster, structural reform)."
        ],
        examinerPerspective: "Examiners test the exact transmission mechanism from Repo cuts to commercial lending rates, bond yields, and capital flight."
      },
      {
        title: "India's Three-Stage Nuclear Power Architecture",
        syllabusTag: "GS3.SCI.NUCLEAR",
        coreTheory: "Formulated by Dr. Homi J. Bhabha to exploit India's vast domestic Thorium reserves (Monazite sands of Kerala) while compensating for scarce natural Uranium.",
        criticalProvisions: [
          "Stage 1: Pressurised Heavy Water Reactors (PHWRs) fueled by Natural Uranium (U-238) with Heavy Water (D2O) as moderator/coolant; generates Plutonium-239.",
          "Stage 2: Fast Breeder Reactors (FBRs, e.g. Kalpakkam PFBR) fueled by Pu-239 with liquid sodium coolant; breeds U-233 from Thorium-232 blankets.",
          "Stage 3: Advanced Heavy Water Reactors (AHWRs) fueled by self-sustaining Thorium-232 / Uranium-233 fuel cycles."
        ],
        examinerPerspective: "UPSC tests why Thorium cannot be used directly in Stage 1 (it is fertile, not fissile; it must be converted into fissile U-233 in an FBR)."
      },
      {
        title: "Balance of Payments (BoP) & Exchange Rate Dynamics",
        syllabusTag: "GS3.ECO.EXTERNAL_SECTOR",
        coreTheory: "BoP records all economic transactions between residents and the rest of the world. Current Account tracks visible trade (merchandise trade deficit) and invisibles (services exports, remittances, income). Capital Account tracks FDI, FPI, External Commercial Borrowings (ECB), and banking capital.",
        criticalProvisions: [
          "Current Account Deficit (CAD): Financed by Capital Account surpluses; high CAD increases currency vulnerability.",
          "Real Effective Exchange Rate (REER): Trade-weighted, inflation-adjusted exchange rate measuring export competitiveness.",
          "Liberalised Remittance Scheme (LRS): Resident individuals can remit up to $250,000 per financial year."
        ],
        examinerPerspective: "UPSC tests the twin-deficit hypothesis (Fiscal Deficit + Current Account Deficit) and how currency depreciation impacts inflation."
      }
    ],
    mindMaps: [
      {
        id: "mm-laf",
        title: "RBI LAF Corridor Architecture",
        subtitle: "Floor to Ceiling",
        structureType: "branching",
        rootQuestion: "Where does the facility sit in the corridor?",
        details: [
          "Ceiling: MSF (Marginal Standing Facility) — Emergency penal borrowing window (Repo + 25 bps).",
          "Middle: Policy Repo Rate — Core benchmark signaling rate for commercial borrowing.",
          "Floor: SDF (Standing Deposit Facility) — Uncollateralized excess liquidity absorption (Repo - 25 bps)."
        ]
      },
      {
        id: "mm-nuclear",
        title: "Three-Stage Nuclear Fuel Cycle Transition",
        subtitle: "Sequential Breeding Pathway",
        structureType: "sequential",
        details: [
          "Stage 1 (PHWR): Natural Uranium (U-238 + 0.7% U-235) generates electricity + byproduct Plutonium-239.",
          "Stage 2 (FBR / Kalpakkam): Plutonium-239 fuel core surrounded by Thorium-232 blanket transmutes into fissile Uranium-233.",
          "Stage 3 (Thorium AHWR): Abundant domestic Thorium-232 sustained by bred Uranium-233 delivers centuries of sovereign clean baseload power."
        ]
      }
    ],
    pyqEvidence: [
      {
        theme: "Money Supply, SDF & Inflation Dynamics",
        frequencyLast10Years: 16,
        testabilityScore: "VERY HIGH",
        examinerTrap: "Assuming SDF requires G-Sec collateral (it is specifically uncollateralized).",
        recentYearAnchors: [2018, 2020, 2022, 2023, 2024]
      },
      {
        theme: "Priority Sector Lending (PSL) & Sub-targets",
        frequencyLast10Years: 10,
        testabilityScore: "HIGH",
        examinerTrap: "Assuming foreign banks with <20 branches have identical sub-targets for agriculture (they do not).",
        recentYearAnchors: [2017, 2019, 2021, 2023]
      }
    ],
    mainsBlueprints: [
      {
        questionTitle: "How does the Standing Deposit Facility (SDF) strengthen RBI's monetary policy toolkit without draining collateral assets?",
        marks: 10,
        yearContext: "Mains GS3 Benchmark",
        structure: {
          introduction: "Define SDF introduced in 2022 as an uncollateralized liquidity absorption window under section 17 of RBI Act.",
          bodyArguments: [
            {
              heading: "Collateral Preservation",
              points: [
                "Reverse Repo required RBI to transfer sovereign G-Secs to commercial banks.",
                "SDF absorbs limitless excess liquidity without encumbering RBI's securities portfolio."
              ]
            }
          ],
          statutoryAnchors: ["RBI Act 1934 Section 17", "Economic Survey Financial Intermediation chapter"],
          balancedConclusion: "SDF enhances monetary operational flexibility while sterilizing liquidity surges during high capital inflows or currency demonetization."
        }
      }
    ],
    staticMatrices: [
      {
        id: "eco-reports-publishers",
        title: "Major Global Economic & Development Reports",
        category: "Global Institutional Indices",
        headers: ["Report Name", "Publishing Institution", "Primary Economic Metrics Tracked"],
        rows: [
          ["World Economic Outlook (WEO)", "International Monetary Fund (IMF)", "Global GDP growth projections, inflation forecasts, fiscal deficits"],
          ["Global Financial Stability Report", "International Monetary Fund (IMF)", "Systemic financial risks, sovereign debt vulnerabilities, banking buffers"],
          ["Global Economic Prospects (GEP)", "World Bank", "Emerging market growth trajectories, structural trade dynamics"],
          ["Human Development Report (HDR)", "UNDP", "HDI, Inequality-adjusted HDI (IHDI), Gender Inequality Index, MPI"],
          ["Global Competitiveness Report", "World Economic Forum (WEF)", "Productivity drivers, institutional quality, business dynamism"],
          ["World Investment Report", "UNCTAD", "Foreign Direct Investment (FDI) inflows/outflows, transnational corporations"],
          ["Global Gender Gap Report", "World Economic Forum (WEF)", "Economic participation, educational attainment, health, political empowerment"],
          ["Ease of Doing Business (Discontinued)", "World Bank", "Business regulations, property registration, contract enforcement"]
        ],
        highYieldTip: "Direct match: IMF publishes World Economic Outlook & Global Financial Stability Report; World Bank publishes Global Economic Prospects."
      }
    ]
  },

  // =========================================================================
  // PILLAR 4: GS4 — Moral Philosophy & Administrative Probity
  // =========================================================================
  {
    id: "gs4-ethics-probity",
    code: "PILLAR_04",
    paper: "GS4",
    title: "Moral Philosophy & Administrative Probity",
    sanskritSubtitle: "नीतिशास्त्र, सत्यनिष्ठा एवं अभिरुचि",
    shortDescription: "Deontological vs teleological ethics, emotional intelligence, Nolan principles, and structural case-study resolution algorithms.",
    empiricalBasis: "Anchored in 2nd Administrative Reforms Commission Report No. 4 (Ethics in Governance), Harvard Public Policy case models, and 12 years of GS4 Mains questions (2013–2024).",
    colorTheme: {
      primary: "#a855f7",
      border: "rgba(168, 85, 247, 0.3)",
      bgGlow: "rgba(168, 85, 247, 0.08)",
      text: "#c084fc"
    },
    keyMetrics: {
      totalMarksWeight: "250 Marks (Mains GS4)",
      prelimsAvgQuestions: "Foundational for Decision Making",
      pyqCoverageYears: "2013–2024 (12 Years)"
    },
    foundationalConcepts: [
      {
        title: "Kantian Deontology vs Utilitarianism in Public Policy",
        syllabusTag: "GS4.ETH.DIMENSIONS",
        coreTheory: "Deontology (Kant) asserts that actions are intrinsically right or wrong based on moral duty (Categorical Imperative) — treating humanity never merely as a means, but always as an end. Utilitarianism (Bentham/Mill) evaluates actions strictly by their consequences (greatest good for greatest number).",
        criticalProvisions: [
          "Nolan Committee 7 Principles of Public Life: Selflessness, Integrity, Objectivity, Accountability, Openness, Honesty, Leadership.",
          "2nd ARC Report No. 4: Recommends citizen-centric governance, whistleblower protection, and code of ethics.",
          "Conflict of Interest: Direct pecuniary interest vs perceived bias in administrative discretion."
        ],
        examinerPerspective: "UPSC case studies deliberately place Duty/Law in direct tension with Compassion/Public Sentiment, requiring candidates to balance statutory compliance with humanitarian equity."
      },
      {
        title: "Emotional Intelligence & Administrative Crisis Management",
        syllabusTag: "GS4.ETH.EI",
        coreTheory: "Emotional Intelligence (Daniel Goleman model: Self-Awareness, Self-Regulation, Motivation, Empathy, Social Skills) enables civil servants to manage personal stress, defuse communal/mob tensions, and deliver empathetic public service without losing objectivity.",
        criticalProvisions: [
          "Cognitive Dissonance (Festinger): Tension between personal moral beliefs and official statutory duties.",
          "Empathy vs Sympathy: Active cognitive perspective-taking leading to policy action vs passive emotional pity.",
          "Moral Hazard in Administration: Reckless risk-taking when shielded from consequences."
        ],
        examinerPerspective: "Examiners evaluate whether candidates apply EI tools to resolve real-world bureaucratic gridlock and crisis negotiations."
      }
    ],
    mindMaps: [
      {
        id: "mm-case-study",
        title: "6-Step Ethical Case Study Resolution Algorithm",
        subtitle: "Decision Engine",
        structureType: "sequential",
        details: [
          "Step 1: Identify key stakeholders (immediate victims, administration, public, state).",
          "Step 2: Pinpoint ethical dilemmas (Law vs Equity, Secrecy vs Transparency, Loyalty vs Integrity).",
          "Step 3: Enumerate options (Action A, Action B, Action C) with pros & cons for each.",
          "Step 4: Evaluate against Constitutional values and statutory mandates.",
          "Step 5: Select the optimal course of action with clear ethical justification.",
          "Step 6: Outline long-term systemic preventive measures."
        ]
      }
    ],
    pyqEvidence: [
      {
        theme: "Ethical Dilemmas in Administrative Discretion",
        frequencyLast10Years: 24,
        testabilityScore: "VERY HIGH",
        examinerTrap: "Offering naive emotional reactions instead of structurally sound, legally compliant administrative resolutions.",
        recentYearAnchors: [2017, 2019, 2021, 2022, 2023, 2024]
      }
    ],
    mainsBlueprints: [
      {
        questionTitle: "'In law, a man is guilty when he violates the rights of others. In ethics, he is guilty if he only thinks of doing so.' (Immanuel Kant) Explain in the context of public administration.",
        marks: 10,
        yearContext: "Mains GS4 Benchmark",
        structure: {
          introduction: "Differentiate legality (external compliance enforced by sanction) from morality (internal purity of intention and conscience).",
          bodyArguments: [
            {
              heading: "Legality vs Ethics in Administration",
              points: [
                "An action may be legal (within statutory rules) but unethical (exploiting loopholes for private gain).",
                "Civil servants possess vast discretionary powers where laws are silent; internal moral compass (Probity) must govern."
              ]
            }
          ],
          statutoryAnchors: ["2nd ARC Report 4", "Nolan Principles", "Civil Services Conduct Rules 1964"],
          balancedConclusion: "A truly ethical civil servant aligns external legality with internal moral integrity to build enduring public trust."
        }
      }
    ]
  },

  // =========================================================================
  // PILLAR 5: CSAT — Analytical Reasoning & Aptitude Core
  // =========================================================================
  {
    id: "csat-analytical-core",
    code: "PILLAR_05",
    paper: "CSAT",
    title: "Analytical Reasoning & Aptitude Core",
    sanskritSubtitle: "तर्कशक्ति एवं योग्यता",
    shortDescription: "Critical reading comprehension assumptions, number systems, permutations & combinations, and analytical deduction protocols.",
    empiricalBasis: "Reverse-engineered from all CSAT Paper II papers from 2014 to 2024 to decode UPSC's qualifying elimination thresholds.",
    colorTheme: {
      primary: "#38bdf8",
      border: "rgba(56, 189, 248, 0.3)",
      bgGlow: "rgba(56, 189, 248, 0.08)",
      text: "#7dd3fc"
    },
    keyMetrics: {
      totalMarksWeight: "200 Marks (33% Qualifying)",
      prelimsAvgQuestions: "80 Questions / 2 Hours",
      pyqCoverageYears: "2014–2024 (11 Years)"
    },
    foundationalConcepts: [
      {
        title: "Reading Comprehension: Crucial Assumption vs Logical Inference",
        syllabusTag: "CSAT.REASONING",
        coreTheory: "An 'Assumption' is an unstated prerequisite the author must believe for the argument to hold. An 'Inference' is a logical consequence directly deducible from the stated premises. 'Crucial Message' is the core normative takeaway.",
        criticalProvisions: [
          "Negation Test for Assumptions: If negating the statement collapses the author's central claim, it is a valid assumption.",
          "Extreme Qualifier Rule: Options with 'always', 'never', 'solely', 'completely' are overwhelmingly false unless explicitly stated in the passage.",
          "Divisibility Rules: Divisibility by 9 (sum of digits), 11 (alternating sum), unit digit cyclicities."
        ],
        examinerPerspective: "UPSC deliberately inserts plausible real-world facts into options that are NOT supported by the text of the passage to penalize unwarranted extrapolation."
      }
    ],
    mindMaps: [
      {
        id: "mm-rc-rules",
        title: "CSAT Reading Comprehension Elimination Rules",
        subtitle: "3-Step Filter",
        structureType: "sequential",
        details: [
          "Rule 1: Reject options with external true facts that lack passage textual support.",
          "Rule 2: Apply Negation Test for 'Crucial Assumption' questions.",
          "Rule 3: Beware of narrow vs broad scoping errors in 'Most Rational Implication'."
        ],
        examples: [
          "Illustrative: passage is about a village's drinking-water shortage. An option reads 'Rainwater harvesting is the most cost-effective solution to water scarcity' — true in the real world, but if the passage never raises rainwater harvesting, it's unsupported by THIS passage and must be rejected.",
          "Illustrative: passage argues a policy will succeed 'because people will change their behaviour once informed.' Negate a candidate assumption — 'people act rationally when given accurate information' — if the argument collapses without it, that's the crucial assumption.",
          "Illustrative: passage describes rising temperatures in one metro city. An option concluding 'India's climate is warming everywhere' broadens a local observation into a national claim — the most RATIONAL implication stays inside the passage's actual scope."
        ]
      }
    ],
    pyqEvidence: [
      {
        theme: "Number Theory, Remainders & P&C",
        frequencyLast10Years: 32,
        testabilityScore: "VERY HIGH",
        examinerTrap: "Over-calculating instead of using remainder theorems, cyclicity, or modular arithmetic shortcuts.",
        recentYearAnchors: [2021, 2022, 2023, 2024]
      }
    ],
    mainsBlueprints: [
      {
        questionTitle: "CSAT Empirical Qualifying Strategy: Maximizing High-Confidence Accuracy over Blind Volume",
        marks: 10,
        yearContext: "CSAT Strategy Diagnostic",
        structure: {
          introduction: "With CSAT pass marks locked at 66/200 (33%), attempting 45–50 high-confidence questions with 85%+ accuracy yields guaranteed qualification without penalty leakage.",
          bodyArguments: [
            {
              heading: "Order of Execution",
              points: [
                "Passage cluster 1: Short 1-question reading comprehension passages.",
                "Analytical reasoning & syllogisms (100% deterministic score).",
                "Selective quant: Divisibility, unit digits, linear arrangements."
              ]
            }
          ],
          statutoryAnchors: ["UPSC Examination Gazette Regulations"],
          balancedConclusion: "Focus on zero-guessing discipline to comfortably clear the 33% gate."
        }
      }
    ]
  },

  // =========================================================================
  // PILLAR 6: STATIC GK VAULT — High-Yield Memory & Elimination Engine
  // =========================================================================
  {
    id: "static-gk-vault",
    code: "PILLAR_06",
    paper: "STATIC_GK",
    title: "Static Knowledge Vault & High-Yield Fact Engine",
    sanskritSubtitle: "स्थिर ज्ञान एवं तथ्य मंजूषा",
    shortDescription: "Curated, high-probability static knowledge repository: Ramsar wetlands, Tiger reserves, Mountain passes, Oceanic straits, Classical languages, and International conventions.",
    empiricalBasis: "Reverse-engineered across 25 years of UPSC Prelims pattern matrices where direct match-the-following and statement elimination depend on deterministic static factual recall.",
    colorTheme: {
      primary: "#ec4899",
      border: "rgba(236, 72, 153, 0.3)",
      bgGlow: "rgba(236, 72, 153, 0.08)",
      text: "#f472b6"
    },
    keyMetrics: {
      totalMarksWeight: "35–45 Marks in Prelims",
      prelimsAvgQuestions: "18–22 Questions / Year",
      pyqCoverageYears: "2000–2025 (25 Years)"
    },
    foundationalConcepts: [
      {
        title: "Ramsar Convention & Montreux Record Architecture",
        syllabusTag: "GS3.ENV.CONSERVATION",
        coreTheory: "The Ramsar Convention (Iran, 1971) provides the international framework for wetland conservation. The Montreux Record is a register of wetland sites on the List of Wetlands of International Importance where changes in ecological character have occurred, are occurring, or are likely to occur as a result of technological developments, pollution or other human interference.",
        criticalProvisions: [
          "India currently has 2 sites on Montreux Record: Keoladeo National Park (Rajasthan) and Loktak Lake (Manipur).",
          "Chilika Lake (Odisha) was placed on the Montreux Record in 1993 but removed in 2002 after successful ecological restoration (first in Asia).",
          "Sundarbans is the largest Ramsar site in India; Renuka Wetland (Himachal Pradesh) is the smallest.",
          "Tamil Nadu has the highest number of Ramsar sites in India (16 sites)."
        ],
        examinerPerspective: "UPSC frequently tests which Indian wetlands are on the Montreux Record vs which were removed, and pairs wetlands with their feeder river systems."
      },
      {
        title: "Protected Planet Architecture: National Parks vs Sanctuaries vs Biosphere Reserves",
        syllabusTag: "GS3.ENV.PROTECTED",
        coreTheory: "India's protected area network is governed by the Wildlife (Protection) Act, 1972 (amended 2022) and UNESCO Man and the Biosphere (MAB) Program.",
        criticalProvisions: [
          "National Park: Highest level of statutory protection; no human habitation or grazing of livestock is permitted.",
          "Wildlife Sanctuary: Certain rights (like grazing by local cattle) may be permitted by the Chief Wildlife Warden.",
          "Biosphere Reserve: Large landscape ecosystem with 3 zones: Core (strictly protected), Buffer (research and education), Transition (sustainable human settlements).",
          "Project Tiger (1973): Core-buffer strategy; National Tiger Conservation Authority (NTCA) has statutory status under Section 38V of WPA 1972."
        ],
        examinerPerspective: "Examiners test whether a national park can be created by state government decree without central clearance, and test rivers flowing through specific iconic national parks (e.g. Ramganga through Jim Corbett, Dihing through Dehing Patkai)."
      }
    ],
    mindMaps: [
      {
        id: "mm-env-treaties",
        title: "Multilateral Environmental Agreements (MEA) Taxonomy",
        subtitle: "Thematic Treaties",
        structureType: "branching",
        rootQuestion: "What ecological domain does the treaty govern?",
        details: [
          "Biodiversity & Habitat: CBD (Rio 1992), CITES (1973, wildlife trade), CMS (Bonn 1979, migratory species), Ramsar (1971, wetlands).",
          "Climate & Atmosphere: UNFCCC (1992), Kyoto Protocol (1997, common but differentiated), Paris Agreement (2015, NDC framework).",
          "Chemicals & Hazardous Waste: Basel (1989, transboundary waste), Rotterdam (1998, prior informed consent), Stockholm (2001, POPs), Minamata (2013, mercury).",
          "Ozone Depletion: Vienna Convention (1985), Montreal Protocol (1987, ODS phase-out), Kigali Amendment (2016, HFC phase-down)."
        ]
      },
      {
        id: "mm-pa-hierarchy",
        title: "Protected Area Legal Escalation Hierarchy",
        subtitle: "WPA 1972 Statutory Tiers",
        structureType: "sequential",
        details: [
          "Tier 1: Community Reserve — Declared on private/community land where community has volunteered to conserve wildlife.",
          "Tier 2: Conservation Reserve — Declared on government land adjacent to National Parks/Sanctuaries acting as corridors.",
          "Tier 3: Wildlife Sanctuary — Substantial statutory protection; regulated human grazing and forest rights permitted.",
          "Tier 4: National Park — Absolute protection; zero livestock grazing, zero commercial exploitation, boundary changes require NBWL approval.",
          "Tier 5: Biosphere Reserve (MAB) — Trans-landscape zoning integrating core reserves, buffer zones, and sustainable human transition belts."
        ]
      }
    ],
    pyqEvidence: [
      {
        theme: "Mountain Passes, Straits & Geographical Confluences",
        frequencyLast10Years: 15,
        testabilityScore: "VERY HIGH",
        examinerTrap: "Mixing up Himalayan passes between Ladakh, Himachal, Uttarakhand, and Sikkim (e.g., placing Lipulekh in Arunachal).",
        recentYearAnchors: [2018, 2020, 2022, 2023, 2024]
      },
      {
        theme: "Ramsar Sites, Rivers & Unique Wildlife Associations",
        frequencyLast10Years: 18,
        testabilityScore: "VERY HIGH",
        examinerTrap: "Confusing artificially impounded wetlands (Harike) with natural ox-bow lakes (Kanwar Lake, Bihar) or tectonic lakes (Wular, J&K).",
        recentYearAnchors: [2019, 2021, 2022, 2023, 2024]
      }
    ],
    mainsBlueprints: [
      {
        questionTitle: "Examine the role of the Ramsar Wetland network in drought resilience and municipal water security in India.",
        marks: 10,
        yearContext: "Mains GS3 Benchmark",
        structure: {
          introduction: "Define wetlands as hydrological kidneys: nature-based infrastructure that regulates seasonal runoff, recharges aquifers, and buffers flood peaks.",
          bodyArguments: [
            {
              heading: "Groundwater Recharge & Flood Mitigation",
              points: [
                "Spongy peat and wetland soil retain monsoon torrents, preventing flash urban inundations (e.g. Deepor Beel, Pallikaranai).",
                "Sub-surface percolation feeds unconfined aquifers, sustaining agrarian wells during lean dry seasons."
              ]
            },
            {
              heading: "Ecological & Socio-Economic Assets",
              points: [
                "Nutrient filtering and heavy metal sequestration by aquatic macrophytes.",
                "Ecotourism and inland fishery livelihoods for indigenous fishing communities."
              ]
            }
          ],
          statutoryAnchors: ["Wetlands (Conservation and Management) Rules 2017", "Amrit Dharohar Scheme", "Ramsar Convention"],
          balancedConclusion: "Wetland conservation must transition from isolated gazetted notifications to integrated basin-wide urban catchment planning."
        }
      }
    ],
    staticMatrices: [
      {
        id: "stat-ramsar-matrix",
        title: "High-Frequency Indian Ramsar Wetlands Matrix",
        category: "Wetlands & Ecology",
        headers: ["Wetland Site", "State", "Type & Feeder River", "Ecological / High-Yield Significance"],
        rows: [
          ["Loktak Lake", "Manipur", "Natural freshwater lake", "Only floating lake in the world; houses Keibul Lamjao floating park & Sangai Deer; on Montreux Record"],
          ["Keoladeo Ghana", "Rajasthan", "Man-made wetland (Gambhir & Banganga rivers)", "Wintering ground for rare Siberian Crane; on Montreux Record"],
          ["Chilika Lake", "Odisha", "Brackish coastal lagoon (Daya River)", "First Ramsar site in India (1981); Irrawaddy Dolphin habitat; removed from Montreux Record in 2002"],
          ["Harike Wetland", "Punjab", "Man-made reservoir (Beas & Sutlej confluence)", "Indira Gandhi Canal originates here; vital wintering ground for migratory birds"],
          ["Wular Lake", "Jammu & Kashmir", "Tectonic freshwater lake (Jhelum River)", "Largest freshwater lake in India with associated deltaic marshes"],
          ["Renuka Lake", "Himachal Pradesh", "Natural freshwater wetland with springs", "Smallest Ramsar wetland in India; religious sanctuary with captive lion safari"],
          ["Sundarbans", "West Bengal", "Tidal mangrove estuarine complex", "Largest Ramsar site in India; Royal Bengal Tiger, estuarine crocodile, mangrove ecosystem"],
          ["Kanwar (Kabar) Taal", "Bihar", "Oxbow lake (Burhi Gandak river)", "Largest freshwater oxbow lake in Asia; crucial central Asian flyway stopover"],
          ["Ashtamudi Lake", "Kerala", "Estuarine palm-shaped wetland (Kallada river)", "Gateway to Kerala backwaters; critical habitat for marine finfishes"],
          ["Vembanad-Kol", "Kerala", "Coastal brackish wetland fed by 10 rivers", "Longest lake in India; Nehru Trophy Boat Race; covers Pampa & Periyar basins"]
        ],
        highYieldTip: "Loktak and Keoladeo are the ONLY 2 Indian sites currently on the Montreux Record. Chilika was removed after restoration."
      },
      {
        id: "stat-passes-matrix",
        title: "Strategic Mountain Passes of India Matrix",
        category: "Physiographic Geography",
        headers: ["Pass Name", "State / UT", "Route / Connectivity", "Strategic Significance"],
        rows: [
          ["Zoji La", "Ladakh / J&K", "Connects Srinagar with Kargil & Leh", "Vital lifeline across Great Himalayas; Zoji La tunnel provides all-weather link"],
          ["Banihal Pass (Jawahar Tunnel)", "Jammu & Kashmir", "Connects Jammu with Srinagar valley", "Crosses the Pir Panjal range in outer Himalayas"],
          ["Rohtang Pass", "Himachal Pradesh", "Connects Kullu Valley with Lahaul & Spiti", "Crosses Pir Panjal; bypassed by the Atal Tunnel at 3,000m altitude"],
          ["Shipki La", "Himachal Pradesh", "Connects Kinnaur with Tibet (China)", "The Sutlej River enters India from Tibet through this gorge"],
          ["Lipulekh", "Uttarakhand", "Trijunction of India, Nepal and Tibet", "Primary overland route for the Kailash Mansarovar Yatra pilgrimage"],
          ["Nathu La", "Sikkim", "Connects Sikkim with Chumbi Valley (Tibet)", "Branch of historic Silk Route; reopened for border trade in 2006"],
          ["Jelep La", "Sikkim", "Connects Sikkim with Lhasa via Chumbi Valley", "Formed by the Teesta River stream incision"],
          ["Bomdi La", "Arunachal Pradesh", "Connects western Arunachal (Tawang) with Lhasa", "Key strategic transit pass in the Eastern Himalayas"],
          ["Diphu Pass", "Arunachal Pradesh", "Trijunction of India, China, and Myanmar", "Strategic border crossing on the McMahon Line"],
          ["Palghat (Palakkad) Gap", "Kerala / Tamil Nadu", "Connects Palakkad with Coimbatore", "Major geological break in the Western Ghats between Nilgiri and Anaimalai hills"],
          ["Thal Ghat (Kasara Ghat)", "Maharashtra", "Connects Mumbai with Nashik and North India", "Traversed by major central railway and NH-3 across Sahyadris"],
          ["Bhor Ghat", "Maharashtra", "Connects Mumbai with Pune and Deccan plateau", "Historic trade route across Sahyadri mountain range"]
        ],
        highYieldTip: "River Sutlej enters India through Shipki La. Kailash Mansarovar pilgrims transit via Lipulekh (Uttarakhand) and Nathu La (Sikkim)."
      },
      {
        id: "stat-classical-languages",
        title: "All 11 Classical Languages of India",
        category: "Art, Culture & Literature",
        headers: ["Language", "Year Conferred", "Language Family", "Historical & Literary Antiquity"],
        rows: [
          ["Tamil", "2004", "Dravidian", "Sangam literature (Tolkappiyam, Silappadikaram), 2000+ years of continuous corpus"],
          ["Sanskrit", "2005", "Indo-Aryan", "Vedas, Upanishads, Epics (Ramayana, Mahabharata), Panini's Ashtadhyayi"],
          ["Telugu", "2008", "Dravidian", "Nannaya's Andhra Mahabharatam, Gatha Saptashati references (1st century CE)"],
          ["Kannada", "2008", "Dravidian", "Kavirajamarga (9th century CE), Halmidi inscription (450 CE), Vachana literature"],
          ["Malayalam", "2013", "Dravidian", "Ramacharitam, Manipravalam literature, ancient coastal trade epigraphs"],
          ["Odia", "2014", "Indo-Aryan", "Kharavela's Hathigumpha inscription (1st century BCE), Charyapada Buddhist poems"],
          ["Marathi", "2024", "Indo-Aryan", "Mukundaraj's Vivekasindhu, Dnyaneshwari (13th century), Mahanubhava literature"],
          ["Bengali", "2024", "Indo-Aryan", "Charyapada manuscripts (8th–12th century), Mangal-Kavya, Gaudiya Vaishnavism"],
          ["Pali", "2024", "Middle Indo-Aryan (Prakrit)", "Tipitaka canonical Buddhist scripture, Mahavamsa, Milinda Panha"],
          ["Prakrit", "2024", "Middle Indo-Aryan", "Ashokan Edicts, Jain canonical Agamas, Hala's Gaha Sattasai"],
          ["Assamese", "2024", "Indo-Aryan", "Charyapada antecedents, Sankaradeva's Borgeet & Ankiya Naat, Buranjis"]
        ],
        highYieldTip: "The Union Cabinet expanded the Classical Languages list from 6 to 11 in October 2024 by adding Marathi, Bengali, Pali, Prakrit, and Assamese."
      },
      {
        id: "stat-const-amendments",
        title: "Landmark Constitutional Amendments Matrix",
        category: "Constitutional Milestones",
        headers: ["Amendment Act", "Year", "Major Constitutional Alterations", "Key Purpose / Impact"],
        rows: [
          ["1st Amendment", "1951", "Added 9th Schedule & Article 31A/31B; added reasonable restrictions to Art 19(1)(a)", "Shielded Zamindari land reforms from judicial fundamental rights challenges"],
          ["7th Amendment", "1956", "Abolished Part A, B, C, D states; created 14 States & 6 UTs; common High Courts", "Implemented States Reorganisation Commission (Fazal Ali) recommendations"],
          ["24th Amendment", "1971", "Affirmed Parliament's power to amend any part of Constitution including Part III", "Made presidential assent mandatory for Constitution Amendment Bills"],
          ["42nd Amendment", "1976", "'Mini Constitution': Added Socialist, Secular, Integrity to Preamble; Part IVA (Duties)", "Shifted 5 subjects to Concurrent List; curtailed judicial review powers (later curtailed)"],
          ["44th Amendment", "1978", "Removed Right to Property from Part III; replaced 'internal disturbance' with 'armed rebellion'", "Restored checks on Emergency (Art 352); mandated written cabinet recommendation"],
          ["52nd Amendment", "1985", "Added Tenth Schedule (Anti-Defection Law)", "Disqualified defecting legislators to curb political floor-crossing ('Aaya Ram Gaya Ram')"],
          ["73rd & 74th Amendments", "1992", "Added Part IX (11th Schedule, 29 subjects) & Part IXA (12th Schedule, 18 subjects)", "Conferred constitutional status on Panchayati Raj Institutions and Urban Local Bodies"],
          ["86th Amendment", "2002", "Inserted Article 21A (Right to Free & Compulsory Education); added Art 51A(k)", "Made elementary education a Fundamental Right for children aged 6–14 years"],
          ["91st Amendment", "2003", "Capped Council of Ministers at 15% of Lok Sabha/Assembly; omitted 1/3rd defection split", "Prevented jumbo cabinets and closed defection loophole"],
          ["101st Amendment", "2016", "Introduced Goods and Services Tax (GST); created GST Council (Article 279A)", "Replaced multiple indirect taxes with nationwide unified destination-based tax"],
          ["103rd Amendment", "2019", "Introduced 10% EWS reservation in public employment & education (Art 15(6), 16(6))", "Allowed economic status as sole criteria for affirmative action"],
          ["106th Amendment", "2023", "Nari Shakti Vandan Adhiniyam: 33% reservation for women in Lok Sabha & State Assemblies", "Inserted Articles 330A, 332A, 334A for 15-year women's legislative representation"]
        ],
        highYieldTip: "42nd Amendment was enacted during Emergency; 44th Amendment reversed its authoritarian provisions. 106th Amendment is the Women's Reservation Act."
      },
      {
        id: "stat-biosphere-reserves",
        title: "Key Biosphere Reserves of India & Core Fauna",
        category: "Ecology & Conservation",
        headers: ["Biosphere Reserve", "State / UT", "UNESCO MAB Status", "Key Iconic Fauna & Flora"],
        rows: [
          ["Nilgiri", "Tamil Nadu, Kerala, Karnataka", "Included (2000)", "Nilgiri Tahr, Lion-tailed Macaque, Shola grassland ecosystem"],
          ["Gulf of Mannar", "Tamil Nadu", "Included (2001)", "Dugong (Sea Cow), Sea cucumber, Coral reefs, Seagrass meadows"],
          ["Sundarbans", "West Bengal", "Included (2001)", "Royal Bengal Tiger, Estuarine crocodile, Mangrove delta forests"],
          ["Nanda Devi", "Uttarakhand", "Included (2004)", "Snow Leopard, Himalayan Musk Deer, Valley of Flowers alpine meadows"],
          ["Nokrek", "Meghalaya (Garo Hills)", "Included (2009)", "Red Panda, Asian Elephant, Citrus indica (mother gene of citrus)"],
          ["Pachmarhi", "Madhya Pradesh", "Included (2009)", "Giant Flying Squirrel, Chinkara, Teak and Sal forest transition"],
          ["Similipal", "Odisha (Mayurbhanj)", "Included (2009)", "Tiger, Elephant, Gaur, Mugger crocodile, Khadia tribal communities"],
          ["Achanakmar-Amarkantak", "Madhya Pradesh & Chhattisgarh", "Included (2012)", "Four-horned antelope (Chousingha), source of Narmada & Son rivers"],
          ["Great Nicobar", "Andaman & Nicobar Islands", "Included (2013)", "Saltwater Crocodile, Giant Robber Crab, Nicobar Megapode, Shompen tribe"],
          ["Agasthyamala", "Kerala & Tamil Nadu", "Included (2016)", "Asian Elephant, Nilgiri Tahr, Kanikaran tribal medicinal plant knowledge"],
          ["Khangchendzonga", "Sikkim", "Included (2018)", "Snow Leopard, Red Panda, Musk Deer, High-altitude glacial lakes"],
          ["Panna", "Madhya Pradesh", "Included (2020)", "Tiger, Chital, Chinkara, Sambhar, Sloth bear, Ken river ecosystem"]
        ],
        highYieldTip: "India has 18 designated Biosphere Reserves, out of which 12 are part of the UNESCO World Network of Biosphere Reserves (WNBR). Panna is the 12th WNBR site."
      }
    ]
  }
];
