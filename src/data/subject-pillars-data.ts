/**
 * src/data/subject-pillars-data.ts
 *
 * Grounded UPSC General Studies Knowledge Pillars & Empirical Syllabus Core.
 * Derived from the systematic synthesis of:
 * - 25 Years of Official UPSC CSE Prelims & Mains Papers (2000–2025)
 * - 2nd Administrative Reforms Commission (ARC) Reports & Law Commission recommendations
 * - Economic Survey, Union Budget, and Supreme Court Landmark Judgments
 * - Topper Testimonials & Empirical High-Yield Scoring Blueprints
 */

export interface MindMapNode {
  id: string;
  title: string;
  subtitle: string;
  /**
   * 'branching': details are distinct categories/paths forking from one root question
   *   (e.g. "what are you amending?" -> 3 different majority thresholds). Not a procedure.
   * 'sequential': details are an ordered procedure where each step presumes the last
   *   (e.g. a 6-step resolution algorithm). Order and cumulativeness are the point.
   */
  structureType: 'branching' | 'sequential';
  /** For 'branching' only: the forking question the branches answer. */
  rootQuestion?: string;
  details: string[];
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

export interface SubjectPillar {
  id: string;
  code: string;
  paper: "GS1" | "GS2" | "GS3" | "GS4" | "CSAT";
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
}

export const SUBJECT_PILLARS: SubjectPillar[] = [
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
          "Simple Majority: Creation of new states (Art 2/3), abolition of Legislative Councils (Art 169), official language.",
          "Special Majority (Art 368): 2/3rd present & voting + majority of total membership (Fundamental Rights & DPSP).",
          "Special Majority + 50% State Ratification: Election of President, Union/State Judiciary, 7th Schedule, Art 368 itself."
        ]
      },
      {
        id: "mm-writs",
        title: "Constitutional Writs Matrix (Article 32 / 226)",
        subtitle: "Scope & Target Entity",
        structureType: "branching",
        rootQuestion: "Which writ fits the violation?",
        details: [
          "Habeas Corpus: Against both state authorities and private individuals for unlawful detention.",
          "Mandamus: Command to perform statutory public duty; NOT issued against President/Governor or private bodies.",
          "Prohibition & Certiorari: Issued against judicial & quasi-judicial bodies (Certiorari also against administrative acts).",
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
    ]
  },
  {
    id: "gs1-history-culture",
    code: "PILLAR_01",
    paper: "GS1",
    title: "History, Civilizations & Heritage",
    sanskritSubtitle: "इतिहास, कला एवं संस्कृति",
    shortDescription: "Ancient to modern Indian history, temple architecture schools, physical and economic geography systems, and contemporary Indian societal dynamics.",
    empiricalBasis: "History/Culture foundational concepts synthesized from standard syllabus resources (NCERT Fine Arts, Spectrum, Themes in Indian History), with Mains answer blueprints directly extracted and structured from the 2026 UPSC GS Paper 1 Mains faculty analysis.",
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
      }
    ],
    pyqEvidence: [
      {
        theme: "Ancient Literature, Inscriptions & Thinkers",
        frequencyLast10Years: 14,
        testabilityScore: "VERY HIGH",
        examinerTrap: "Pair-matching Buddhist vs Jain philosophers or conflating texts (e.g. Sangam works with Vedic literature).",
        recentYearAnchors: [2019, 2021, 2022, 2023, 2024]
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
              "questionTitle": "Analyse the significance of Ashokan inscriptions for reconstructing Mauryan history.",
              "marks": 10,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "Ashokan inscriptions, deciphered by James Prinsep in 1837 across Major and Minor Rock and Pillar Edicts, serve as direct epigraphical primary sources illuminating Mauryan polity, administrative boundaries, ideological statecraft, and diplomatic horizons.",
                      "bodyArguments": [
                              {
                                      "heading": "Reconstruction of Mauryan Polity & Administration",
                                      "points": [
                                              "Provides institutional evidence for specialized bureaucratic machinery including Rajukas (rural administrators), Mahamattas, and Dhamma Mahamattas appointed to enforce civic ethics.",
                                              "Details decentralized provincial governance structures with royal princes (Kumaras) posted as viceroys at Ujjayini, Taxila, and Tosali.",
                                              "Pillar Edict IV outlines judicial discretion and procedural timelines, including a three-day reprieve granted to condemned prisoners."
                                      ]
                              },
                              {
                                      "heading": "Ideological Statecraft & Territorial Delimitation",
                                      "points": [
                                              "Major Rock Edict XIII explicitly records the psychological watershed of the Kalinga War, marking the transition from Bherighosha (conquest by war) to Dhammaghosha (conquest by righteousness).",
                                              "Inscriptional distribution from Kandahar (bilingual Greek-Aramaic) and Shahbazgarhi (Kharosthi) to Maski and Brahmagiri (Brahmi) demarcates the imperial frontiers and multilingual linguistic policy.",
                                              "Major Rock Edict II documents external diplomatic outreach to contemporary Hellenistic kings (Antiochus II, Ptolemy II, Antigonus Gonatas) and south Indian neighbours (Cholas, Pandyas, Satyaputras)."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "Major Rock Edict XIII (Kalinga War)",
                              "Major Rock Edict II (Hellenistic Diplomacy)",
                              "Minor Rock Edict I (Maski/Gujarra - Devanampiya Piyadassi)",
                              "NCERT Class 12 Themes in Indian History Part 1"
                      ],
                      "balancedConclusion": "While epigraphs embody royal self-projection requiring critical collation with archaeological remains and foreign accounts (Megasthenes), they remain the foundational bedrock of Mauryan historical reconstruction."
              }
      },
      {
              "questionTitle": "The significance of Gandhian movements lay in the masses they mobilised. Elucidate.",
              "marks": 10,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "Gandhi transformed the Indian national movement from an elite-led constitutional agitation into a pan-Indian mass struggle by deploying universal cultural idioms, Satyagraha, and a multi-class Struggle-Truce-Struggle (S-T-S) architecture.",
                      "bodyArguments": [
                              {
                                      "heading": "Horizontal & Cross-Class Demographic Mobilisation",
                                      "points": [
                                              "Peasantry integration: Champaran (1917), Kheda (1918), and Bardoli (1928) organically fused agrarian grievances into the mainstream anti-imperialist campaign.",
                                              "Women's public emancipation: Large-scale picketing of foreign cloth and liquor shops during Non-Cooperation (1920–22) and Civil Disobedience (1930–34), with leaders like Sarojini Naidu at Dharasana.",
                                              "Working class and urban middle class: Resignation from government institutions, boycott of British courts and schools, and nationwide industrial strikes (hartals)."
                                      ]
                              },
                              {
                                      "heading": "Strategic Synthesis of Non-Violence & Constructive Program",
                                      "points": [
                                              "Constructive program (Khadi production, anti-untouchability work, Hindu-Muslim unity, basic education) sustained grassroots cadres during truce phases between mass movements.",
                                              "Choice of universal symbols like Salt during the 1930 Dandi March bridged regional, linguistic, and socio-economic divides into a shared anti-colonial consciousness."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "Non-Cooperation Movement (1920–22)",
                              "Civil Disobedience Movement (1930–34)",
                              "Quit India Movement (1942)",
                              "Bipan Chandra's 'India's Struggle for Independence'"
                      ],
                      "balancedConclusion": "Gandhi's ultimate contribution was psychological de-subjugation: eroding the perceived moral invincibility of the colonial state by mobilizing millions into non-violent civil resistance."
              }
      },
      {
              "questionTitle": "Discuss the impact of Macaulay’s Minute on colonial administration and education in India.",
              "marks": 10,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "Thomas Babington Macaulay’s Minute on Indian Education (February 1835), enacted under William Bentinck via the English Education Act 1835, resolved the Orientalist-Anglicist controversy by institutionalizing English-medium western education across colonial India.",
                      "bodyArguments": [
                              {
                                      "heading": "Impact on Colonial Administration",
                                      "points": [
                                              "Created a subordinate, English-literate clerical and administrative cadre ('Macaulay's children') that significantly reduced the fiscal overhead of British governance.",
                                              "Institutionalized English as the official language of administration and courts, displacing Persian and vernacular legal traditions.",
                                              "Strengthened colonial bureaucratic stability while alienating the administrative machinery from the vernacular-speaking rural populace."
                                      ]
                              },
                              {
                                      "heading": "Impact on Indian Education & Social Structure",
                                      "points": [
                                              "Implemented the 'Downward Filtration Theory', concentrating public funds on small elite classes with the failed expectation that education would trickle down.",
                                              "Neglected primary education, mass literacy, female education, and scientific/technical instruction in vernacular languages.",
                                              "Unintended dialectical consequence: Modern English education exposed Indians to Enlightenment ideals (liberty, democracy, rule of law), fostering early nationalist leadership (Raja Ram Mohan Roy, Dadabhai Naoroji)."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "Macaulay's Minute (Feb 1835)",
                              "English Education Act 1835",
                              "Wood's Despatch (1854 - Magna Carta of Indian Education)"
                      ],
                      "balancedConclusion": "While designed to produce culturally submissive administrative subordinates, Macaulay's Minute inadvertently provided Indian nationalists with a common lingua franca and critical tools to challenge colonial legitimacy."
              }
      },
      {
              "questionTitle": "Vijayanagara architecture exemplifies the amalgamation of past traditions with contemporary practices. Elucidate with examples.",
              "marks": 10,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "Vijayanagara architecture (14th–16th century CE) represents a synthesis of classical South Indian idioms (Chola, Chalukya, Hoysala, Pandya) with contemporary Indo-Islamic military and secular design techniques.",
                      "bodyArguments": [
                              {
                                      "heading": "Inherited Classical Dravidian & Deccan Traditions",
                                      "points": [
                                              "Chola/Pandya legacy: Monumental gateway towers (Raya Gopurams) and massive prakara enclosures surrounding the sacred complexes.",
                                              "Chalukya/Hoysala legacy: Elaborately carved soapstone/granite pillared halls (Kalyana Mandapas) and dynamic animal friezes (leaping yalis, war horses).",
                                              "Integration of monolithic stone architecture, exemplified by the iconic Stone Chariot (Garuda Shrine) at the Vittala Temple complex in Hampi."
                                      ]
                              },
                              {
                                      "heading": "Contemporary Indo-Islamic & Military Amalgamation",
                                      "points": [
                                              "Secular royal architecture incorporated Islamic arches, domes, vaults, and plasterwork into structures like the Lotus Mahal and the Elephant Stables.",
                                              "Advanced fortification techniques combining massive dry-stone masonry with hydraulic water channels and aqueducts (Kamalapuram tank)."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "Virupaksha Temple (Hampi)",
                              "Vittala Temple Complex (Musical Pillars & Stone Chariot)",
                              "Lotus Mahal & Elephant Stables (Indo-Islamic secular synthesis)",
                              "UNESCO World Heritage Site at Hampi"
                      ],
                      "balancedConclusion": "Vijayanagara architecture was an open, adaptive architectural idiom that preserved sacred Dravidian traditions while pragmatically absorbing Deccan Sultanate civic innovations."
              }
      },
      {
              "questionTitle": "Linguistic reorganisation of Indian states was driven by popular pressure from below. Comment.",
              "marks": 10,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "While the central leadership initially feared linguistic states would jeopardize national integrity, the reorganisation of Indian states (1953–1956) was fundamentally impelled by intense popular democratic movements from below.",
                      "bodyArguments": [
                              {
                                      "heading": "Elite Hesitation vs Bottom-Up Mass Agitations",
                                      "points": [
                                              "Official bodies (Dhar Commission 1948 and JVP Committee 1949) advised postponing linguistic division due to partition trauma and fear of balkanization.",
                                              "Potti Sreeramulu's 58-day fast unto death (1952) and subsequent mass unrest in Andhra forced the immediate creation of Andhra State (1953) for Telugu speakers.",
                                              "Samyukta Maharashtra Samiti and Mahagujarat Movement exerted grassroots pressure against the bilingual Bombay State, culminating in the creation of Maharashtra and Gujarat (1960).",
                                              "Punjabi Suba movement mobilized Sikh and Punjabi-speaking peasantry, eventually leading to the tripartite division into Punjab, Haryana, and Himachal Pradesh (1966)."
                                      ]
                              },
                              {
                                      "heading": "Democratic Accommodation & Nation-Building",
                                      "points": [
                                              "States Reorganisation Act 1956 institutionalized language as the rational administrative boundary without compromising national unity.",
                                              "Reorganisation democratized state governance by making administration accessible in citizens' mother tongues."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "Dhar Commission (1948)",
                              "JVP Committee (1949)",
                              "Fazal Ali Commission / States Reorganisation Commission (1953)",
                              "States Reorganisation Act 1956 & 7th Constitutional Amendment Act 1956"
                      ],
                      "balancedConclusion": "Far from balkanizing India, linguistic reorganisation fulfilled popular democratic aspirations, demonstrating that regional linguistic identities strengthen rather than weaken Indian federalism."
              }
      },
      {
              "questionTitle": "The model of planned economy was adopted in India to address the regional imbalances left behind by colonial rule. Comment.",
              "marks": 15,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "Colonial economic policy created acute spatial disparities by developing coastal enclave ports (Bombay, Calcutta, Madras) for raw material extraction while leaving the hinterland impoverished. Post-independence centralized planning was explicitly structured to redress this structural imbalance.",
                      "bodyArguments": [
                              {
                                      "heading": "Colonial Enclave Economy & Structural Distortions",
                                      "points": [
                                              "British infrastructure investments (railways, port connectivity) catered strictly to colonial export corridors, creating resource-drained hinterlands across central and eastern India.",
                                              "Disparate land revenue systems (Permanent Settlement vs Ryotwari) deepened regional agrarian vulnerability and agrarian debt."
                                      ]
                              },
                              {
                                      "heading": "Planned Economy Interventions (Mahalanobis Heavy Industrialization)",
                                      "points": [
                                              "Second Five-Year Plan located public sector heavy industries in backward, tribal, and mineral-rich regions (Bhilai, Rourkela, Durgapur, Bokaro steel plants).",
                                              "Establishment of major river valley multi-purpose projects (Bhakra Nangal, Damodar Valley Corporation, Hirakud) to distribute irrigation and hydroelectric power across agrarian belts.",
                                              "Industrial Licensing Policy (IDRA 1951) mandated concessions, tax holidays, and capital subsidies to incentivize private manufacturing in backward districts."
                                      ]
                              },
                              {
                                      "heading": "Critical Appraisal & Unintended Divergences",
                                      "points": [
                                              "Freight Equalization Policy (1952) neutralized the natural locational advantage of mineral-rich eastern states (Bihar, Bengal, Odisha) while benefiting coastal manufacturing hubs.",
                                              "The Green Revolution (Third Plan onwards) disproportionately benefited fertile, irrigated north-western regions (Punjab, Haryana, Western UP), exacerbating inter-regional agricultural divides."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "Industrial Policy Resolution 1948 & 1956",
                              "Freight Equalization Policy (1952)",
                              "Industries (Development and Regulation) Act 1951 (IDRA)",
                              "NITI Aayog Aspirational Districts Programme (Modern continuum)"
                      ],
                      "balancedConclusion": "While planned public investments laid the industrial backbone in underdeveloped interiors, policy instruments like freight equalization and unequal agricultural modernization reproduced fresh regional imbalances that persist today."
              }
      },
      {
              "questionTitle": "What is the Fujiwhara effect? Discuss its impact on the movement and intensity of tropical cyclones.",
              "marks": 10,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "The Fujiwhara effect, formulated by Japanese meteorologist Sakuhei Fujiwhara (1921), describes the binary aerodynamic interaction between two concurrent cyclonic vortices spinning in the same direction within approximately 1,400 km of each other.",
                      "bodyArguments": [
                              {
                                      "heading": "Physical Mechanism & Interaction Dynamics",
                                      "points": [
                                              "Vortices begin orbiting cyclonically around a common central barycentre (counter-clockwise in the Northern Hemisphere).",
                                              "Distance-dependent outcomes: Mutual orbiting (1000–1400 km), track deflection and elongation, or complete binary merger (coalescence into a larger mega-cyclone if under ~300 km)."
                                      ]
                              },
                              {
                                      "heading": "Impact on Movement, Track & Forecast Intensity",
                                      "points": [
                                              "Disrupts standard steering trade winds, producing erratic, looping, and unpredictable landfall trajectories.",
                                              "Intensity changes: Asymmetric wind shear may weaken the smaller storm, or mutual moisture feeding can intensify storm surge and prolonged torrential precipitation.",
                                              "Real-world meteorological benchmarks: Cyclone Seroja and Cyclone Odette (2021, Australian basin), and Storms Noru and Kulap (2017, Western Pacific)."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "Sakuhei Fujiwhara Binary Interaction Model (1921)",
                              "Cyclone Seroja & Odette Case Study (2021)",
                              "IMD / WMO Tropical Cyclone Forecasting Protocols"
                      ],
                      "balancedConclusion": "Under accelerating climate change and warmer sea surface temperatures, binary cyclone occurrences are increasing, demanding high-resolution satellite tracking and dynamic numerical weather prediction models."
              }
      },
      {
              "questionTitle": "Tundra regions are ecologically fragile but economically important. Examine this statement critically.",
              "marks": 10,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "The Tundra biome—spanning high-latitude Arctic regions across Siberia, Northern Canada, and Scandinavia—is characterized by extreme permafrost, low biodiversity, and fragile ecological equilibrium alongside colossal fossil and mineral wealth.",
                      "bodyArguments": [
                              {
                                      "heading": "Ecological Fragility & Climate Feedback Loops",
                                      "points": [
                                              "Ultra-short growing seasons and slow soil pedogenesis mean biome recovery from anthropogenic disruption takes centuries.",
                                              "Permafrost thawing triggers massive methane and carbon release (Arctic Amplification), accelerating global warming feedback loops.",
                                              "Vulnerable trophic food chains: Lichen-moss-reindeer-polar predator dependencies are severely disrupted by habitat fragmentation."
                                      ]
                              },
                              {
                                      "heading": "Strategic & Geo-Economic Importance",
                                      "points": [
                                              "Houses vast unexploited hydrocarbon deposits (estimated 30% of undiscovered global natural gas, 13% of oil per USGS) and critical rare earth minerals (nickel at Norilsk, diamonds).",
                                              "Opening of the Northern Sea Route (NSR) drastically cuts maritime transit distance between Europe and Asia compared to the Suez Canal."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "Arctic Council Environmental Mandates",
                              "UNCLOS High Seas & Continental Shelf Regimes",
                              "India's Arctic Policy (2022) - 'Building a Partnership for Sustainable Development'",
                              "IPCC Special Report on the Ocean and Cryosphere in a Changing Climate"
                      ],
                      "balancedConclusion": "Sustainable Arctic governance requires reconciling sovereign economic extraction with strict multilateral environmental moratoriums to prevent irreversible destabilization of the global cryosphere."
              }
      },
      {
              "questionTitle": "Discuss the role of aeolian processes in desertification and land degradation.",
              "marks": 10,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "Aeolian processes—the erosion, transportation, and deposition of sediment by wind action—act as primary physical geomorphic drivers of desertification in arid, semi-arid, and sub-humid ecosystems.",
                      "bodyArguments": [
                              {
                                      "heading": "Aeolian Mechanics of Degradation",
                                      "points": [
                                              "Deflation: Stripping of nutrient-rich topsoil and organic humus, leaving behind barren stony desert pavements (Reg/Hamada).",
                                              "Saltation & Abrasion: High-velocity sand grains bouncing across ground level pulverize soil crusts and damage stabilizing natural vegetation.",
                                              "Dune Encroachment: Mobilization and lateral migration of shifting barchans smother fertile agricultural fields, irrigation canals, and rural settlements."
                                      ]
                              },
                              {
                                      "heading": "Anthropogenic Acceleration & Ecological Impact",
                                      "points": [
                                              "Overgrazing, deforestation, groundwater depletion, and unscientific mining in the Aravallis dismantle natural vegetative windbreaks, expanding Thar desertification eastwards.",
                                              "Global parallels: Desertification dynamics across the African Sahel and the China Loess Plateau."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "UN Convention to Combat Desertification (UNCCD - Bonn Challenge)",
                              "ISRO Desertification and Land Degradation Atlas of India (2021)",
                              "National Action Programme to Combat Desertification (MoEFCC)"
                      ],
                      "balancedConclusion": "Halting aeolian desertification necessitates nature-based landscape engineering, including the Great Green Wall shelterbelts, sand-dune stabilization using xerophytic vegetation, and community pasture management."
              }
      },
      {
              "questionTitle": "Water resources are both an asset and a source of conflict in South Asia. Examine with examples.",
              "marks": 10,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "South Asia’s Himalayan river basins (Indus, Ganga, Brahmaputra) sustain over 1.8 billion people as vital agrarian and economic lifelines, yet asymmetrical geographic position, seasonal variability, and geopolitical mistrust turn them into chronic flashpoints.",
                      "bodyArguments": [
                              {
                                      "heading": "Water as a Shared Regional Asset",
                                      "points": [
                                              "Himalayan rivers support extensive irrigation systems (Punjab, Gangetic Plain, Indus basin), ensuring regional food security.",
                                              "Vast hydroelectric potential: Bhutan-India bilateral hydropower cooperation (Chukha, Tala, Mangdechhu) acts as a clean energy model."
                                      ]
                              },
                              {
                                      "heading": "Dimensions of Hydrological Conflict & Tension",
                                      "points": [
                                              "India-Pakistan: Tensions over run-of-the-river projects (Kishanganga, Ratle) within the framework of the Indus Waters Treaty (1960).",
                                              "India-Bangladesh: Lean-season discharge disputes over the Teesta River and barrage operations at Farakka.",
                                              "China upper-riparian dominance: Dam construction on the Yarlung Tsangpo (Brahmaputra) raises downstream water-diversion and siltation anxieties in India and Bangladesh."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "Indus Waters Treaty (1960)",
                              "Ganga Water Treaty (1996 - India-Bangladesh)",
                              "UN Convention on the Law of the Non-Navigational Uses of International Watercourses (1997)"
                      ],
                      "balancedConclusion": "Transitioning from zero-sum water security to integrated basin-wide river governance and institutional data sharing is essential for long-term South Asian geopolitical stability."
              }
      },
      {
              "questionTitle": "Compare the Loo, Chinook and Foehn winds with respect to their regions of prevalence, nature and climatic impact.",
              "marks": 15,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "Local winds are meso-scale atmospheric phenomena induced by regional pressure gradients, topographical barriers, and adiabatic heating. Loo, Chinook, and Foehn represent three distinct warm local wind regimes with profound socio-economic impacts.",
                      "bodyArguments": [
                              {
                                      "heading": "Regions of Prevalence & Physical Nature",
                                      "points": [
                                              "Loo: Hot, dry, dust-laden summer wind originating from the Thar desert blowing across the Indo-Gangetic Plains (May–June; temperatures 45°C–50°C).",
                                              "Chinook: Warm, dry katabatic/foehn-type wind descending the eastern leeward slopes of the Rocky Mountains in North America (Canada & USA).",
                                              "Foehn: Warm, dry leeward descending wind blowing down the northern valleys of the European Alps (Switzerland, Austria, Germany)."
                                      ]
                              },
                              {
                                      "heading": "Adiabatic Thermodynamics vs Advection",
                                      "points": [
                                              "Chinook and Foehn operate on the Orographic Adiabatic Lapse Rate: Moist air ascends windward (cooling at DALR/SALR), loses moisture, and descends leeward, warming rapidly at the Dry Adiabatic Lapse Rate (10°C/km).",
                                              "Loo operates primarily via continental advective heating over sun-baked arid landmasses without significant orographic descent."
                                      ]
                              },
                              {
                                      "heading": "Climatic & Socio-Agrarian Impacts",
                                      "points": [
                                              "Loo causes severe heatstroke, desiccation of soils, and crop wilting in northern India.",
                                              "Chinook acts as a 'Snow Eater', rapidly melting snow cover, opening winter pastures for livestock grazing in North American prairies.",
                                              "Foehn accelerates early spring snowmelt, facilitates viticulture (grape ripening) in Alpine valleys, but increases avalanche risks."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "Adiabatic Thermodynamics & Lapse Rate Principles",
                              "NCERT Class 11 Fundamentals of Physical Geography (Atmospheric Circulation)",
                              "IMD Heatwave Protocols & Criteria"
                      ],
                      "balancedConclusion": "While Chinook and Foehn confer agrarian benefits through winter snow clearance and valley warming, the Loo is an extreme climatic hazard requiring proactive heat-action urban governance."
              }
      },
      {
              "questionTitle": "Analyse the role of satellite-based technologies in achieving climate-smart agriculture and food security.",
              "marks": 15,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "Climate-Smart Agriculture (CSA)—anchored on sustainable productivity, climate adaptation, and GHG mitigation—relies fundamentally on space-borne Earth Observation (EO), Global Navigation Satellite Systems (GNSS), and GIS data streams.",
                      "bodyArguments": [
                              {
                                      "heading": "Earth Observation & Precision Agro-Advisories",
                                      "points": [
                                              "Crop health and yield estimation using multispectral vegetation indices (NDVI, NDWI) through satellites like Resourcesat and Sentinel.",
                                              "Soil moisture and drought surveillance: Radar altimetry and synthetic aperture radar (SAR - NISAR/RISAT) enable real-time drought tracking regardless of cloud cover.",
                                              "Precision irrigation: Thermal imaging guides variable-rate water application, minimizing groundwater over-extraction."
                                      ]
                              },
                              {
                                      "heading": "Direct Reinforcement of National Food Security",
                                      "points": [
                                              "Availability: Timely agro-meteorological forecasting (monsoon onset, dry spells, cyclone tracks via INSAT-3D) mitigates crop loss.",
                                              "Access & Stability: Satellite-based acreage estimation under PM Fasal Bima Yojana (PMFBY) ensures swift, dispute-free crop insurance claims.",
                                              "Supply chain optimization: Geo-tagging of warehousing infrastructure (PM Gati Shakti) minimizes post-harvest logistical leakages."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "FAO Climate-Smart Agriculture Framework",
                              "PM Fasal Bima Yojana (CROPIC satellite assessment)",
                              "ISRO FASAL (Forecasting Agricultural Output using Space, Agro-meteorology and Land-based observations)",
                              "CHAMAN (Horticulture Assessment via Space Tech)"
                      ],
                      "balancedConclusion": "Integrating satellite remote sensing with ground-level IoT sensors, AI analytics, and Krishi Vigyan Kendras is crucial for democratizing precision agriculture down to small and marginal farmers."
              }
      },
      {
              "questionTitle": "The centre of global trade is gradually shifting from the Atlantic region to the Indo-Pacific region. Examine.",
              "marks": 15,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "The geo-economic center of gravity is decisively pivoting from the transatlantic axis (North America–Western Europe) to the Indo-Pacific mega-corridor, driven by demographic expansion, industrial manufacturing dominance, and vital maritime trade routes.",
                      "bodyArguments": [
                              {
                                      "heading": "Drivers of the Indo-Pacific Geo-Economic Shift",
                                      "points": [
                                              "Concentration of global output: The Indo-Pacific accounts for over 60% of global GDP and two-thirds of global economic growth (led by China, India, ASEAN, Japan).",
                                              "Critical maritime chokepoints: Malacca, Sunda, Lombok straits and the Bab-el-Mandeb handle over 50% of global container traffic and two-thirds of maritime oil trade.",
                                              "Mega-regional trade agreements: Regional Comprehensive Economic Partnership (RCEP), CPTPP, and Indo-Pacific Economic Framework (IPEF)."
                                      ]
                              },
                              {
                                      "heading": "Counter-Perspectives: Enduring Atlantic Dominance",
                                      "points": [
                                              "High-value technological and financial supremacy: Transatlantic trade maintains dominance in services trade, intellectual property, capital depth, and US Dollar hegemony.",
                                              "Geopolitical friction in Indo-Pacific: Supply chain fragility, South China Sea territorial disputes, Taiwan Strait tensions, and non-traditional security threats (piracy, militarization)."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "UNCTAD Review of Maritime Transport",
                              "UNCLOS Freedom of Navigation Principles",
                              "IPEF (Indo-Pacific Economic Framework for Prosperity)",
                              "India's Indo-Pacific Oceans Initiative (IPOI)"
                      ],
                      "balancedConclusion": "While the Indo-Pacific leads in physical merchandise and manufacturing throughput, a multipolar trade architecture demands open sea lines of communication and rules-based maritime order."
              }
      },
      {
              "questionTitle": "Analyse the major drivers of human-induced land use changes in India and their geographical consequences.",
              "marks": 15,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "Rapid population expansion, urbanization, and industrialization have drastically altered India's land-use matrix, converting forests, wetlands, and arable pastures into built infrastructure with severe ecological consequences.",
                      "bodyArguments": [
                              {
                                      "heading": "Major Anthropogenic Drivers",
                                      "points": [
                                              "Unplanned urban sprawl and peri-urban expansion converting prime agricultural fringes into residential and industrial complexes.",
                                              "Linear infrastructure development (expressways, dedicated freight corridors, railway expansions) causing severe forest fragmentation.",
                                              "Agricultural intensification: Incursion into fragile forest borders and wetland reclamation for monoculture cropping.",
                                              "Open-cast mining and quarrying across central and eastern tribal forested belts (Jharkhand, Odisha, Chhattisgarh)."
                                      ]
                              },
                              {
                                      "heading": "Severe Geographical & Environmental Consequences",
                                      "points": [
                                              "Hydrological disruption: Encroachment of urban floodplains and water bodies (wetlands in Chennai, Bengaluru lakes) leading to recurrent urban flooding.",
                                              "Accelerated land degradation and soil erosion: Loss of forest root networks triggering slope instability and catastrophic landslides in Western Ghats and Himalayas.",
                                              "Microclimate modification: Proliferation of Urban Heat Islands (UHI) with localized thermal distress.",
                                              "Escalation of Human-Wildlife Conflict due to fragmentation of traditional wildlife corridors (elephant and tiger habitats)."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "ISRO Land Use / Land Cover (LULC) Atlas",
                              "National Land Use Policy Guidelines",
                              "Wetlands (Conservation and Management) Rules 2017",
                              "National Disaster Management Authority (NDMA) Urban Flood Guidelines"
                      ],
                      "balancedConclusion": "Reversing land degradation requires enforcing spatial zoning master plans, scientific catchment management, and integrating the Land Degradation Neutrality (LDN) framework into regional infrastructure planning."
              }
      },
      {
              "questionTitle": "Unity in diversity remains the defining feature of Indian society despite the challenges from communalism and regionalism. Comment.",
              "marks": 10,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "India’s 'Unity in Diversity' is not an artificial homogeneity but an evolving composite cultural mosaic (Ganga-Jamuni tehzeeb) sustained by constitutional accommodation despite recurring communal and sub-national tensions.",
                      "bodyArguments": [
                              {
                                      "heading": "Divisive Stresses: Communalism & Regionalism",
                                      "points": [
                                              "Communalism: Majoritarian-minoritarian polarization, competitive identity politics, and social media radicalization threaten social harmony.",
                                              "Regionalism: Son-of-the-soil agitations, interstate river disputes (Cauvery), and linguistic chauvinism challenging interstate migrant mobility."
                                      ]
                              },
                              {
                                      "heading": "Structural Pillars of Enduring Unity",
                                      "points": [
                                              "Constitutional secularism and fundamental rights (Articles 14, 19, 25–30) provide structural protection to minority languages and faiths.",
                                              "Economic interdependence: Pan-Indian supply chains, internal migrant labor mobility, and unified GST market architecture.",
                                              "Cultural cross-fertilization: Universal celebration of diverse festivals, cinema, cuisine, and national sports unifying popular consciousness."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "Constitutional Preamble (Unity and Integrity of the Nation)",
                              "Articles 15, 16, 29, 30 & 51A(e) (Composite Culture)",
                              "Inter-State Council (Article 263)",
                              "NCERT Class 12 'Understanding Indian Society'"
                      ],
                      "balancedConclusion": "Unity in diversity endures because Indian federalism accommodates regional and linguistic pluralism within a flexible constitutional democracy rather than enforcing forced assimilation."
              }
      },
      {
              "questionTitle": "How do you understand disability? Substantiate the need for inclusive policy framework in India in this regard.",
              "marks": 10,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "Disability has evolved from the traditional medical/charity model (locating pathology within the individual) to the rights-based social model, which recognizes disability as the outcome of societal, structural, and attitudinal barriers.",
                      "bodyArguments": [
                              {
                                      "heading": "Conceptual Transition to the Rights-Based Social Model",
                                      "points": [
                                              "Under the social model, a physical impairment becomes a 'disability' only when society fails to provide accessible built infrastructure, inclusive education, and equal employment.",
                                              "Emphasizes universal design, reasonable accommodation, and institutional autonomy over paternalistic medical charity."
                                      ]
                              },
                              {
                                      "heading": "Imperatives for an Inclusive Policy Framework",
                                      "points": [
                                              "Infrastructural accessibility: Eliminating physical barriers in public transport, government offices, and digital interfaces under Sugamya Bharat Abhiyan.",
                                              "Economic inclusion: Overcoming low formal workforce participation of Persons with Disabilities (PwDs) through quota enforcement and assistive technology subsidies.",
                                              "Intersectionality: Addressing the compounded vulnerability of disabled women and rural PwDs lacking access to early diagnostic intervention."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "UN Convention on the Rights of Persons with Disabilities (UNCRPD)",
                              "Rights of Persons with Disabilities Act 2016 (RPwD Act - 21 recognized disabilities)",
                              "Accessible India Campaign (Sugamya Bharat Abhiyan)"
                      ],
                      "balancedConclusion": "Building an inclusive society requires moving beyond legislative compliance to universal accessibility, assistive digital infrastructure, and dismantling social stigma."
              }
      },
      {
              "questionTitle": "Do you think digital technology promotes social empowerment? Explain with examples.",
              "marks": 10,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "Digital technology acts as a double-edged equalizer: democratizing information, public service delivery, and market access, while simultaneously risking the entrenchment of existing social stratification due to digital divides.",
                      "bodyArguments": [
                              {
                                      "heading": "Empowerment Across Socio-Economic Spheres",
                                      "points": [
                                              "Financial inclusion: The JAM Trinity (Jan Dhan-Aadhaar-Mobile) and UPI eliminated predatory intermediaries, delivering direct benefit transfers (DBT) to marginalized households.",
                                              "Gender and livelihood empowerment: Rural self-help group women utilizing micro-e-commerce platforms and digital literacy under PM-GDISHA.",
                                              "Democratic accountability: Digital portals (RTI online, CPGRAMS, DigiLocker) enabling citizens to demand transparent administrative service delivery."
                                      ]
                              },
                              {
                                      "heading": "Constraints & Compounded Inequalities",
                                      "points": [
                                              "The Digital Divide: Glaring disparities in smartphone ownership and high-speed broadband between urban elites and rural/female demographics.",
                                              "Technological exclusion: Biometric authentication failures and digital illiteracy leading to wrongful denial of welfare entitlements (PDS ration)."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "Digital India Programme",
                              "PM Gramin Digital Saksharta Abhiyan (PMGDISHA)",
                              "National Digital Health Mission (NDHM)",
                              "CPGRAMS Grievance Redressal Architecture"
                      ],
                      "balancedConclusion": "Digital technology is a powerful catalyst for empowerment only when accompanied by robust public digital infrastructure, vernacular digital interfaces, and universal data privacy protections."
              }
      },
      {
              "questionTitle": "Is caste disappearing in urban India? Illustrate your answer with examples.",
              "marks": 15,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "While urbanization and modern capitalist markets have weakened the ritualistic and occupational rigidities of caste (purity-pollution in public spaces), caste has mutated into new secular, political, and socio-economic networks in urban India.",
                      "bodyArguments": [
                              {
                                      "heading": "Spheres of Ritual Attenuation & Urban Anonymity",
                                      "points": [
                                              "Public transport, modern workplaces (IT/corporate sectors), malls, and eateries enforce secular civic interactions, dismantling traditional untouchability and commensality taboos.",
                                              "Meritocratic education and diversified service-sector jobs weaken hereditary caste-based occupations."
                                      ]
                              },
                              {
                                      "heading": "Spheres of Structural Mutation & Resilience",
                                      "points": [
                                              "Endogamy persistence: Matrimonial preferences remain strictly caste-aligned, with modern digital matrimonial websites formalizing sub-caste matching.",
                                              "Residential segregation: Urban housing markets and rental discrimination create segregated caste enclaves in metropolitan centers.",
                                              "Caste capital and networks: Informal hiring networks and elite educational/corporate circles continue to operate on social and cultural capital (caste-based nepotism).",
                                              "Electoral and political consolidation: Urban caste associations (sabhas) mobilize as lobbying pressure groups for political representation and economic benefits."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "Protection of Civil Rights Act 1955",
                              "Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act 1989",
                              "Articles 15, 16 & 17 of the Constitution of India",
                              "M.N. Srinivas (Dominant Caste / Sanskritization) & Sukhadeo Thorat (Caste & Market Discrimination)"
                      ],
                      "balancedConclusion": "Caste in urban India is not disappearing; it is shedding its traditional ritualistic form and reconstituting itself as modern socio-economic networks, residential clustering, and electoral voting blocs."
              }
      },
      {
              "questionTitle": "Critically examine the challenges of demographic transition in contemporary India.",
              "marks": 15,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "India is experiencing a complex demographic transition: national Total Fertility Rate (TFR) has dropped to 2.0 (below replacement level of 2.1), presenting a closing window of demographic dividend alongside stark regional divergence and accelerating geriatric challenges.",
                      "bodyArguments": [
                              {
                                      "heading": "The Demographic Dividend: Window vs Disaster Risk",
                                      "points": [
                                              "With over 65% of the population in the working-age bracket (15–59 years), India possesses a vital economic opportunity until ~2040.",
                                              "Jobless growth and skill deficit: The India Skills Report highlights that nearly 50% of graduates remain unemployable, converting the dividend into social unrest without formal job creation."
                                      ]
                              },
                              {
                                      "heading": "Regional Demographic Divergence (North vs South)",
                                      "points": [
                                              "Southern and Western states (Kerala TFR ~1.5, Tamil Nadu ~1.6) are experiencing rapid population ageing, labor shortages, and rising geriatric burdens.",
                                              "Northern states (Bihar TFR ~2.98, UP ~2.35) have young, expanding populations requiring massive investments in primary education and healthcare.",
                                              "Federal and political friction: Impending delimitation of parliamentary constituencies creates anxieties over political representation between demographically prudent southern states and populous northern states."
                                      ]
                              },
                              {
                                      "heading": "Emerging Geriatric Care & Feminization of Ageing",
                                      "points": [
                                              "Elderly population is projected to reach over 20% by 2050, accompanied by inadequate public pension coverage, specialized geriatric healthcare deficit, and vulnerable elderly widows."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "National Family Health Survey (NFHS-5 Data)",
                              "Periodic Labour Force Survey (PLFS)",
                              "Maintenance and Welfare of Parents and Senior Citizens Act 2007",
                              "Economic Survey Demographic Projections"
                      ],
                      "balancedConclusion": "Harnessing the demographic dividend requires simultaneous investment in female labor force participation, vocational skilling, universal social security pensions, and amicable federal accommodation."
              }
      },
      {
              "questionTitle": "Evaluate the impact of globalisation on Indian youth with reference to social, political, economic and cultural spheres.",
              "marks": 15,
              "yearContext": "2026 UPSC GS1 Mains (Real Paper)",
              "structure": {
                      "introduction": "Globalisation—facilitated by trade liberalization, digital telecommunications, and transnational mobility—has profoundly reshaped the aspirations, lifestyles, and challenges of India's 350+ million youth cohort across multiple dimensions.",
                      "bodyArguments": [
                              {
                                      "heading": "Economic & Employment Sphere",
                                      "points": [
                                              "Positive: Proliferation of IT/ITES, startup ecosystems, fintech innovations, and global remote employment opportunities.",
                                              "Negative: Rise of precarious gig-economy work lacking formal social security, high youth underemployment, and vulnerability to global economic shocks."
                                      ]
                              },
                              {
                                      "heading": "Social & Familial Sphere",
                                      "points": [
                                              "Positive: Greater individual agency, delayed marriage age, rising female educational mobility, and inter-caste marriages in urban areas.",
                                              "Negative: Erosion of joint family support systems, rising mental health stressors, social isolation, and youth substance abuse issues."
                                      ]
                              },
                              {
                                      "heading": "Cultural & Lifestyle Sphere",
                                      "points": [
                                              "Hybridization / 'Glocalization': Synthesis of global pop-culture (OTT media, fashion, global cuisine) with local cultural expressions (fusion arts, yoga revival).",
                                              "Consumerism vs cultural alienation: Hyper-consumerist lifestyle aspirations colliding with real socio-economic constraints."
                                      ]
                              },
                              {
                                      "heading": "Political & Civic Engagement",
                                      "points": [
                                              "Positive: Digital civic activism, climate consciousness, and global solidarity movements mobilized via social media platforms.",
                                              "Negative: Susceptibility to online echo chambers, identity radicalization, and spread of misinformation."
                                      ]
                              }
                      ],
                      "statutoryAnchors": [
                              "National Youth Policy 2014 / Draft National Youth Policy",
                              "NITI Aayog 'Booster Shots' for Gig Economy Report",
                              "Mental Healthcare Act 2017",
                              "NCERT Class 12 'Social Change and Development in India'"
                      ],
                      "balancedConclusion": "Maximizing the benefits of globalisation for Indian youth requires building ethical digital resilience, accessible mental health support systems, and equitable quality employment avenues."
              }
      }
    ]
  },
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
      border: "rgba(16, 185, 129, 0.3)",
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
          "Ceiling: MSF (Marginal Standing Facility) — Emergency penal borrowing window.",
          "Middle: Policy Repo Rate — Core signaling rate for commercial borrowing.",
          "Floor: SDF (Standing Deposit Facility) — Uncollateralized excess liquidity absorption."
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
    ]
  },
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
  }
];
