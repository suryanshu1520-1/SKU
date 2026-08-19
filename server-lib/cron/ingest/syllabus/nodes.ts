/**
 * server-lib/cron/ingest/syllabus/nodes.ts
 *
 * The syllabus node graph — comprehensive UPSC CSE General Studies taxonomy (~140 nodes).
 *
 * Structured as a 2-level hierarchy:
 *   Level 1: Domain roots (parent === null) — used as shrinkage anchors.
 *   Level 2: Leaf syllabus topics (parent === "<PAPER>.<DOMAIN>") — used for tagging,
 *            relevance gating, testability estimation, and coverage tracking.
 *
 * Id convention: "<PAPER>.<DOMAIN>[.<LEAF>]" — stable, hierarchical, readable.
 */

import type { Embedder } from "../embeddings.js";
import type { SyllabusNode } from "./types.js";

/** The text we embed for a node: gloss carries the meaning, entities anchor it. */
export function nodeText(n: SyllabusNode): string {
  return n.entities.length ? `${n.gloss} Key terms: ${n.entities.join(", ")}.` : n.gloss;
}

// ---------------------------------------------------------------------------
// Comprehensive UPSC Syllabus Node Graph (~140 nodes across GS1–4 & Prelims)
// ---------------------------------------------------------------------------
export const NODES: SyllabusNode[] = [
  // =========================================================================
  // ===== GS1 — History, Heritage, Geography, Society =======================
  // =========================================================================

  // --- GS1 History Domain ---
  { id: "GS1.HIS", paper: "GS1", parent: null, path: ["History & Heritage"],
    gloss: "Indian and world history: ancient, medieval, modern, freedom struggle, post-independence consolidation, and world history.",
    entities: ["freedom struggle", "modern history", "ancient India", "medieval India", "post-independence", "world history"] },
  { id: "GS1.HIS.ANCIENT", paper: "GS1", parent: "GS1.HIS", path: ["History & Heritage", "Ancient India"],
    gloss: "Prehistoric cultures, Indus Valley Civilization, Vedic period, Mahajanapadas, Mauryan Empire, Gupta period, Harshavardhana, Sangam literature, and early state formation.",
    entities: ["Indus Valley", "Harappa", "Vedic age", "Ashoka", "Mauryan empire", "Gupta dynasty", "Sangam period", "Magadha", "Inscriptions"] },
  { id: "GS1.HIS.MEDIEVAL", paper: "GS1", parent: "GS1.HIS", path: ["History & Heritage", "Medieval India"],
    gloss: "Delhi Sultanate, Vijayanagara Empire, Bahmani Sultanate, Mughal Empire, Maratha administration, Bhakti and Sufi movements.",
    entities: ["Delhi Sultanate", "Mughal Empire", "Vijayanagara", "Akbar", "Shivaji", "Bhakti movement", "Sufism", "Kabir", "Guru Nanak"] },
  { id: "GS1.HIS.MODERN_EARLY", paper: "GS1", parent: "GS1.HIS", path: ["History & Heritage", "Early Modern India (1757–1857)"],
    gloss: "European commercial penetration, British conquest of Bengal, Subsidiary Alliance, Doctrine of Lapse, early civil, tribal, and peasant rebellions.",
    entities: ["Battle of Plassey", "Battle of Buxar", "Subsidiary Alliance", "Doctrine of Lapse", "Santhal rebellion", "Permanent Settlement", "Ryotwari"] },
  { id: "GS1.HIS.FREEDOM", paper: "GS1", parent: "GS1.HIS", path: ["History & Heritage", "Freedom Struggle (1857–1947)"],
    gloss: "The Revolt of 1857, Indian National Congress foundation, Moderate and Extremist phases, Swadeshi movement, Home Rule, Gandhian mass movements, revolutionary activities, and partition.",
    entities: ["1857 Revolt", "INC", "Gandhi", "Non-Cooperation", "Civil Disobedience", "Quit India", "Subhas Chandra Bose", "INA", "Cabinet Mission"] },
  { id: "GS1.HIS.POST_INDEP", paper: "GS1", parent: "GS1.HIS", path: ["History & Heritage", "Post-Independence Consolidation"],
    gloss: "Integration of princely states, linguistic reorganization of states, tribal and regional consolidation, non-aligned foreign policy origins, and initial Five-Year Plans.",
    entities: ["States Reorganisation Act", "Sardar Patel", "Linguistic states", "Integration of states", "Nehruvian model", "Five Year Plans"] },
  { id: "GS1.HIS.WORLD", paper: "GS1", parent: "GS1.HIS", path: ["History & Heritage", "World History (18th Century Onward)"],
    gloss: "Industrial Revolution, American and French Revolutions, world wars, redrawal of national boundaries, colonization and decolonization, political philosophies like capitalism, socialism, and communism.",
    entities: ["Industrial Revolution", "French Revolution", "World War I", "World War II", "Cold War", "Decolonization", "Nazism", "Fascism", "Socialism"] },

  // --- GS1 Art & Culture Domain ---
  { id: "GS1.CUL", paper: "GS1", parent: null, path: ["Art, Culture & Architecture"],
    gloss: "Salient aspects of art forms, literature, and architecture from ancient to modern times.",
    entities: ["art and culture", "architecture", "classical dance", "sculpture", "literature", "UNESCO heritage"] },
  { id: "GS1.CUL.ARCH", paper: "GS1", parent: "GS1.CUL", path: ["Art, Culture & Architecture", "Indian Architecture & Sculptures"],
    gloss: "Rock-cut cave architecture, Stupas, Nagara, Dravida, and Vesara temple styles, Indo-Islamic monuments, colonial architecture, and Buddhist-Jain art schools.",
    entities: ["Nagara style", "Dravida style", "Vesara", "Ajanta caves", "Ellora", "Gandhara art", "Mathura school", "Chola bronzes", "Indo-Islamic"] },
  { id: "GS1.CUL.PAINT_CRAFT", paper: "GS1", parent: "GS1.CUL", path: ["Art, Culture & Architecture", "Paintings, Murals & Handicrafts"],
    gloss: "Mural paintings, miniature painting traditions (Mughal, Rajasthani, Pahari, Deccan), folk art forms, traditional textiles, and Geographical Indication handicrafts.",
    entities: ["Mural paintings", "Miniature paintings", "Madhubani", "Warli", "Pattachitra", "Kalamkari", "Pashmina", "GI tag crafts"] },
  { id: "GS1.CUL.PERFORM", paper: "GS1", parent: "GS1.CUL", path: ["Art, Culture & Architecture", "Performing Arts: Dance, Music & Theatre"],
    gloss: "Classical Indian dance forms, Sangeet Natak Akademi recognition, Hindustani and Carnatic classical music, folk theatre, puppetry, and martial art traditions.",
    entities: ["Bharatanatyam", "Kathak", "Kathakali", "Hindustani music", "Carnatic music", "Yakshagana", "Koodiyattam", "Puppetry traditions"] },
  { id: "GS1.CUL.LIT_PHIL", paper: "GS1", parent: "GS1.CUL", path: ["Art, Culture & Architecture", "Literature, Philosophy & Heritage"],
    gloss: "Vedic literature, Epics, Buddhist canonical texts, Sangam literature, Six Orthodox schools of Indian philosophy (Shad Darshana), and UNESCO World Heritage Sites.",
    entities: ["Vedas", "Upanishads", "Sangam poems", "Tripitaka", "Shad Darshana", "Advaita", "Classical languages", "UNESCO World Heritage"] },

  // --- GS1 Geography Domain ---
  { id: "GS1.GEO", paper: "GS1", parent: null, path: ["Geography of India & the World"],
    gloss: "Physical, physical-geographical, human, and economic geography of India and the world.",
    entities: ["physical geography", "geomorphology", "climatology", "oceanography", "resources", "mapping"] },
  { id: "GS1.GEO.GEOMORPH", paper: "GS1", parent: "GS1.GEO", path: ["Geography of India & the World", "Geomorphology & Earth Systems"],
    gloss: "Interior structure of the Earth, plate tectonics, continental drift, earthquakes, volcanism, rock cycles, weathering, erosion, and landform evolution.",
    entities: ["Plate tectonics", "Earthquakes", "Seismic waves", "Volcanoes", "Continental drift", "Folds and faults", "Karst topography"] },
  { id: "GS1.GEO.CLIMATE", paper: "GS1", parent: "GS1.GEO", path: ["Geography of India & the World", "Climatology & Atmospheric Phenomena"],
    gloss: "Atmospheric layers, heat budget, planetary wind systems, Indian monsoon mechanism, tropical and temperate cyclones, Western Disturbances, El Niño, La Niña, and IOD.",
    entities: ["Monsoon mechanism", "El Nino", "La Nina", "Indian Ocean Dipole", "Tropical cyclones", "Western Disturbances", "Jet streams"] },
  { id: "GS1.GEO.OCEAN", paper: "GS1", parent: "GS1.GEO", path: ["Geography of India & the World", "Oceanography & Marine Geography"],
    gloss: "Bottom relief of ocean basins, ocean temperature and salinity profiles, ocean currents, tides, coral reef ecosystems, and marine resources.",
    entities: ["Ocean currents", "Tides", "Coral bleaching", "Salinity", "Continental shelf", "Abyssal plain", "Polymetallic nodules"] },
  { id: "GS1.GEO.IND_PHYS", paper: "GS1", parent: "GS1.GEO", path: ["Geography of India & the World", "Indian Physical Geography & Drainage"],
    gloss: "Physiographic divisions of India: Himalayas, Northern Plains, Peninsular Plateau, Coastal Plains, Islands; drainage systems of Himalayan and Peninsular rivers.",
    entities: ["Himalayan ranges", "Indo-Gangetic plain", "Deccan plateau", "Western Ghats", "Eastern Ghats", "Ganga river basin", "Brahmaputra", "Godavari"] },
  { id: "GS1.GEO.RESOURCES", paper: "GS1", parent: "GS1.GEO", path: ["Geography of India & the World", "Natural Resources & Mineral Distribution"],
    gloss: "Distribution of key natural resources across the world including South Asia and India; metallic, non-metallic, fossil fuel, and critical mineral deposits.",
    entities: ["Critical minerals", "Rare earth elements", "Coal reserves", "Iron ore belts", "Bauxite", "Petroleum reserves", "Lithium reserves"] },
  { id: "GS1.GEO.AGRI_GEO", paper: "GS1", parent: "GS1.GEO", path: ["Geography of India & the World", "Agricultural Geography & Soils"],
    gloss: "Major soil types of India (Alluvial, Black, Red, Laterite), soil degradation and conservation, agro-climatic zones, and regional cropping patterns.",
    entities: ["Alluvial soil", "Black cotton soil", "Soil erosion", "Agro-climatic zones", "Cropping intensity", "Rainfed farming"] },
  { id: "GS1.GEO.INDUSTRY", paper: "GS1", parent: "GS1.GEO", path: ["Geography of India & the World", "Location of Primary, Secondary & Tertiary Industries"],
    gloss: "Factors governing the geographical location of primary, secondary, and tertiary industries in various parts of the world, including India (raw material, market, energy, transport).",
    entities: ["Industrial location", "Iron and steel industry", "Textile clusters", "Automobile hubs", "IT corridors", "Freight corridors"] },
  { id: "GS1.GEO.HUMAN", paper: "GS1", parent: "GS1.GEO", path: ["Geography of India & the World", "Human Geography & Urbanisation"],
    gloss: "Demographic transition model, population growth and spatial distribution, migration trends and drivers, urban settlement patterns, and smart city dynamics.",
    entities: ["Demographic transition", "Migration corridors", "Urban sprawl", "Urban heat islands", "Slums", "Metropolitan governance"] },

  // --- GS1 Society Domain ---
  { id: "GS1.SOC", paper: "GS1", parent: null, path: ["Indian Society & Demographics"],
    gloss: "Salient features of Indian society, diversity, women's empowerment, population dynamics, poverty, and urban issues.",
    entities: ["Indian society", "diversity", "women empowerment", "demography", "urbanization", "globalization", "secularism"] },
  { id: "GS1.SOC.FEATURES", paper: "GS1", parent: "GS1.SOC", path: ["Indian Society & Demographics", "Salient Features & Pluralism"],
    gloss: "Caste system and changes, linguistic and religious diversity, family structures, kinship systems, and the composite culture of India.",
    entities: ["Caste system", "Linguistic diversity", "Joint family", "Pluralism", "Secular fabric", "Cultural synthesis"] },
  { id: "GS1.SOC.WOMEN", paper: "GS1", parent: "GS1.SOC", path: ["Indian Society & Demographics", "Role of Women & Gender Equality"],
    gloss: "Women's social status, female labor force participation, gender pay gap, Self-Help Groups (SHGs), safety, and legal/constitutional safeguards for women.",
    entities: ["FLFPR", "Self-Help Groups", "Gender budgeting", "POCSO", "Domestic violence", "Women entrepreneurship"] },
  { id: "GS1.SOC.POPULATION", paper: "GS1", parent: "GS1.SOC", path: ["Indian Society & Demographics", "Demographic Dividend & Ageing"],
    gloss: "Population trends, Total Fertility Rate (TFR), demographic dividend vs disaster, geriatric care, elderly population vulnerabilities, and family welfare programmes.",
    entities: ["Demographic dividend", "Total Fertility Rate", "Ageing population", "NFHS survey", "Census data", "Geriatric care"] },
  { id: "GS1.SOC.POVERTY", paper: "GS1", parent: "GS1.SOC", path: ["Indian Society & Demographics", "Poverty & Multidimensional Deprivation"],
    gloss: "Poverty lines, Multidimensional Poverty Index (MPI), rural-urban disparities, malnutrition, informal sector vulnerabilities, and social exclusion.",
    entities: ["Multidimensional Poverty Index", "NITI Aayog MPI", "Informal economy", "Social exclusion", "Marginalization", "Slum dwellers"] },
  { id: "GS1.SOC.GLOBALISATION", paper: "GS1", parent: "GS1.SOC", path: ["Indian Society & Demographics", "Impact of Globalisation on Indian Society"],
    gloss: "Effects of globalization on traditional values, family institutions, food habits, youth culture, indigenous arts, and informal labor markets.",
    entities: ["Globalisation", "Cultural homogenization", "Glocalisation", "Consumerism", "Westernization", "Digital divide"] },
  { id: "GS1.SOC.EMPOWERMENT", paper: "GS1", parent: "GS1.SOC", path: ["Indian Society & Demographics", "Social Empowerment, Communalism & Regionalism"],
    gloss: "Empowerment of marginalized communities (SC, ST, OBC, minorities, LGBTQ+), regionalism, communalism, and secularism in Indian polity and society.",
    entities: ["Social empowerment", "Affirmative action", "Communalism", "Regionalism", "Secularism", "Minority rights"] },

  // =========================================================================
  // ===== GS2 — Polity, Governance, Social Justice, IR ======================
  // =========================================================================

  // --- GS2 Polity Domain ---
  { id: "GS2.POL", paper: "GS2", parent: null, path: ["Indian Polity & Constitution"],
    gloss: "Indian Constitution: historical underpinnings, evolution, features, amendments, significant provisions, and basic structure.",
    entities: ["Constitution", "polity", "Parliament", "Supreme Court", "federalism", "fundamental rights"] },
  { id: "GS2.POL.CONSTITUTION", paper: "GS2", parent: "GS2.POL", path: ["Indian Polity & Constitution", "Constitutional Framework & Preamble"],
    gloss: "Constituent Assembly debates, Preamble values, salient features of the Constitution, constitutional amendment procedure (Article 368), and the Basic Structure Doctrine.",
    entities: ["Preamble", "Article 368", "Basic structure doctrine", "Kesavananda Bharati", "Constituent Assembly", "Constitutionalism"] },
  { id: "GS2.POL.FUND_RIGHTS", paper: "GS2", parent: "GS2.POL", path: ["Indian Polity & Constitution", "Fundamental Rights, Duties & DPSP"],
    gloss: "Part III Fundamental Rights, judicial interpretation of Article 21, constitutional writs, Part IV Directive Principles of State Policy, and Part IVA Fundamental Duties.",
    entities: ["Article 21", "Right to Privacy", "Puttaswamy judgment", "Article 19", "Writs", "Habeas corpus", "DPSP", "Fundamental Duties"] },
  { id: "GS2.POL.UNION_EXEC", paper: "GS2", parent: "GS2.POL", path: ["Indian Polity & Constitution", "Union & State Executives"],
    gloss: "President of India, Vice-President, Prime Minister, Union Council of Ministers, Governor's constitutional role, ordinance-making powers (Article 123/213), and pardoning powers.",
    entities: ["President of India", "Governor", "Article 123", "Article 213", "Ordinance", "Pardoning power", "Article 72", "Discretionary powers"] },
  { id: "GS2.POL.PARLIAMENT", paper: "GS2", parent: "GS2.POL", path: ["Indian Polity & Constitution", "Parliament & State Legislatures"],
    gloss: "Structure, functioning, parliamentary proceedings, financial committees (PAC, Estimates, COPU), parliamentary privileges, and decline in parliamentary sittings.",
    entities: ["Lok Sabha", "Rajya Sabha", "Public Accounts Committee", "Parliamentary privilege", "Speaker", "Money Bill", "Anti-defection"] },
  { id: "GS2.POL.FEDERALISM", paper: "GS2", parent: "GS2.POL", path: ["Indian Polity & Constitution", "Federalism & Centre-State Relations"],
    gloss: "Seventh Schedule legislative distribution, administrative and financial relations, Article 356 President's rule, GST Council, Finance Commission, and Inter-State Council.",
    entities: ["Article 356", "Seventh Schedule", "GST Council", "Finance Commission", "Inter-State Council", "Cooperative federalism", "Fiscal federalism"] },
  { id: "GS2.POL.JUDICIARY", paper: "GS2", parent: "GS2.POL", path: ["Indian Polity & Constitution", "Judiciary, Collegium & Judicial Review"],
    gloss: "Supreme Court, High Courts, National Judicial Appointments Commission (NJAC), Collegium system, judicial independence, Public Interest Litigation (PIL), and judicial pendency.",
    entities: ["Supreme Court", "Collegium system", "Judicial review", "PIL", "Contempt of court", "Tribunals", "Judicial pendency"] },
  { id: "GS2.POL.LOCAL_GOV", paper: "GS2", parent: "GS2.POL", path: ["Indian Polity & Constitution", "Local Governance & Panchayati Raj"],
    gloss: "73rd and 74th Constitutional Amendments, Panchayati Raj Institutions (PRIs), Urban Local Bodies (ULBs), PESA Act 1996, and devolution of finances.",
    entities: ["73rd Amendment", "74th Amendment", "Panchayati Raj", "PESA Act", "State Finance Commission", "Gram Sabha", "Municipal corporation"] },
  { id: "GS2.POL.CONST_BODIES", paper: "GS2", parent: "GS2.POL", path: ["Indian Polity & Constitution", "Constitutional Bodies"],
    gloss: "Election Commission of India, Comptroller and Auditor General (CAG), Union Public Service Commission (UPSC), Finance Commission, and National Commissions for SCs/STs/OBCs.",
    entities: ["Election Commission", "CAG", "UPSC", "Article 280", "National Commission for SCs", "NCST", "NCBC"] },
  { id: "GS2.POL.NON_CONST", paper: "GS2", parent: "GS2.POL", path: ["Indian Polity & Constitution", "Statutory, Regulatory & Quasi-Judicial Bodies"],
    gloss: "National Human Rights Commission (NHRC), Central Vigilance Commission (CVC), Central Information Commission (CIC), Lokpal and Lokayuktas, Competition Commission, and NGT.",
    entities: ["NHRC", "CVC", "CIC", "Lokpal", "Lokayukta", "National Green Tribunal", "CCI", "Quasi-judicial"] },
  { id: "GS2.POL.ELECTIONS", paper: "GS2", parent: "GS2.POL", path: ["Indian Polity & Constitution", "Elections & Representation of the People Act"],
    gloss: "Representation of the People Act 1950 and 1951, electoral reforms, Model Code of Conduct, electoral bonds, political funding transparency, and decriminalization of politics.",
    entities: ["RPA 1951", "Electoral reforms", "Model Code of Conduct", "Electoral bonds", "VVPAT", "Simultaneous elections", "Tenth Schedule"] },

  // --- GS2 Governance Domain ---
  { id: "GS2.GOV", paper: "GS2", parent: null, path: ["Governance & Public Administration"],
    gloss: "Governance, public policy, transparency, accountability, e-governance, and citizen-centric administration.",
    entities: ["governance", "transparency", "e-governance", "citizen charter", "civil services", "administrative reforms"] },
  { id: "GS2.GOV.E_GOV", paper: "GS2", parent: "GS2.GOV", path: ["Governance & Public Administration", "E-Governance & Digital Delivery"],
    gloss: "Applications, models, successes and limitations of e-governance, digital public infrastructure, direct benefit transfer (DBT), DigiLocker, and cybersecurity in government.",
    entities: ["E-governance", "DBT", "JAM trinity", "DigiLocker", "UMANG", "Digital India", "Data governance"] },
  { id: "GS2.GOV.TRANSPARENCY", paper: "GS2", parent: "GS2.GOV", path: ["Governance & Public Administration", "Transparency, Accountability & RTI"],
    gloss: "Right to Information (RTI) Act, citizen charters, social audit, public accountability mechanisms, whistleblower protection, and Sevottam quality service delivery model.",
    entities: ["RTI Act", "Citizen charter", "Social audit", "Whistleblower", "Sevottam model", "Public accountability"] },
  { id: "GS2.GOV.CIVIL_SERVICES", paper: "GS2", parent: "GS2.GOV", path: ["Governance & Public Administration", "Role of Civil Services in Democracy"],
    gloss: "Bureaucracy, civil services neutrality, lateral entry reforms, Mission Karmayogi (capacity building), administrative efficiency, and integrity in public service.",
    entities: ["Civil services reforms", "Mission Karmayogi", "Lateral entry", "Bureaucratic neutrality", "ARC recommendations", "Public administration"] },

  // --- GS2 Social Justice Domain ---
  { id: "GS2.SOCJ", paper: "GS2", parent: null, path: ["Social Justice & Welfare"],
    gloss: "Welfare schemes for vulnerable sections, health, education, human resources, hunger and poverty eradication.",
    entities: ["social justice", "welfare schemes", "public health", "education", "nutrition", "vulnerable sections", "NGOs"] },
  { id: "GS2.SOCJ.SCHEMES", paper: "GS2", parent: "GS2.SOCJ", path: ["Social Justice & Welfare", "Welfare Schemes for Vulnerable Sections"],
    gloss: "Government welfare interventions for women, children, persons with disabilities, minorities, SCs/STs, senior citizens, and mechanism for performance evaluation.",
    entities: ["PM-KISAN", "Ayushman Bharat", "PMAY", "PM SVANidhi", "Divyangjan", "Vulnerable groups", "Social security"] },
  { id: "GS2.SOCJ.HEALTH", paper: "GS2", parent: "GS2.SOCJ", path: ["Social Justice & Welfare", "Healthcare & Public Health Architecture"],
    gloss: "National Health Mission, primary healthcare infrastructure, Ayushman Bharat PM-JAY, out-of-pocket health expenditure, communicable/non-communicable disease burden, and health budget.",
    entities: ["National Health Mission", "Ayushman Bharat", "PM-JAY", "Primary Health Centres", "Out of pocket expenditure", "Health policy"] },
  { id: "GS2.SOCJ.EDUCATION", paper: "GS2", parent: "GS2.SOCJ", path: ["Social Justice & Welfare", "Education, Skilling & Human Capital"],
    gloss: "National Education Policy (NEP 2020), Right to Education (RTE) Act, higher education reforms, skill development initiatives, gross enrollment ratio, and vocational training.",
    entities: ["NEP 2020", "RTE Act", "Gross Enrolment Ratio", "Skill India", "Samagra Shiksha", "Higher education", "Vocational training"] },
  { id: "GS2.SOCJ.HUNGER", paper: "GS2", parent: "GS2.SOCJ", path: ["Social Justice & Welfare", "Poverty, Hunger & Malnutrition"],
    gloss: "National Food Security Act (NFSA), POSHAN Abhiyaan, Global Hunger Index metrics, child stunting, wasting, anaemia, Targeted PDS, and mid-day meal scheme.",
    entities: ["POSHAN Abhiyaan", "NFSA 2013", "Global Hunger Index", "Child stunting", "Anaemia", "Targeted PDS", "PM POSHAN"] },
  { id: "GS2.SOCJ.CIVIL_SOCIETY", paper: "GS2", parent: "GS2.SOCJ", path: ["Social Justice & Welfare", "Role of NGOs, SHGs & Civil Society"],
    gloss: "Development processes, role of non-governmental organizations (NGOs), Self-Help Groups (SHGs), microfinance institutions, donors, charities, and FCRA regulations.",
    entities: ["NGOs", "SHGs", "FCRA regulations", "Civil society", "Microfinance", "Philanthropy", "Social enterprise"] },

  // --- GS2 International Relations Domain ---
  { id: "GS2.IR", paper: "GS2", parent: null, path: ["International Relations & Foreign Policy"],
    gloss: "India and its bilateral, regional and global groupings, agreements affecting India's interests, and Indian diaspora.",
    entities: ["international relations", "foreign policy", "bilateral", "multilateral", "neighbourhood", "diaspora", "UN"] },
  { id: "GS2.IR.NEIGHBOURHOOD", paper: "GS2", parent: "GS2.IR", path: ["International Relations & Foreign Policy", "India & Neighbourhood Relations"],
    gloss: "Neighbourhood First policy, bilateral relations and border issues with Pakistan, China (LAC), Nepal, Bhutan, Bangladesh, Sri Lanka, Maldives, and Myanmar.",
    entities: ["Neighbourhood First", "LAC dispute", "Indo-Pacific", "Indo-Nepal treaty", "India-Bangladesh ties", "Sri Lanka crisis", "Maldives ties"] },
  { id: "GS2.IR.BILATERAL", paper: "GS2", parent: "GS2.IR", path: ["International Relations & Foreign Policy", "Major Power Bilateral Partnerships"],
    gloss: "India's strategic partnerships with the United States, Russia, European Union, Japan, France, United Kingdom, Australia, and key emerging economies.",
    entities: ["India-US 2+2", "iCET", "India-Russia summit", "India-Japan strategic", "India-EU FTA", "Civil nuclear deal"] },
  { id: "GS2.IR.WEST_ASIA", paper: "GS2", parent: "GS2.IR", path: ["International Relations & Foreign Policy", "West Asia & Extended Neighbourhood"],
    gloss: "Look West and Act East policies, relations with Gulf Cooperation Council (GCC), Israel, Iran (Chabahar port), Central Asian republics, and ASEAN.",
    entities: ["Look West policy", "Act East", "Chabahar port", "IMEC corridor", "GCC", "ASEAN summit", "Abraham Accords"] },
  { id: "GS2.IR.MULTILATERAL", paper: "GS2", parent: "GS2.IR", path: ["International Relations & Foreign Policy", "Multilateral Groupings & Summitry"],
    gloss: "India's leadership and role in G20, BRICS, Shanghai Cooperation Organisation (SCO), Quad, I2U2, BIMSTEC, Commonwealth, and Non-Aligned Movement.",
    entities: ["G20", "BRICS expansion", "Quad", "SCO", "I2U2", "BIMSTEC", "International Solar Alliance"] },
  { id: "GS2.IR.UN_REFORM", paper: "GS2", parent: "GS2.IR", path: ["International Relations & Foreign Policy", "UN & Global Institutional Reforms"],
    gloss: "Reforms of the United Nations Security Council (UNSC G4 bid), WTO disputes and appellate body crisis, IMF/World Bank governance, and international climate finance treaties.",
    entities: ["UNSC reform", "G4 nations", "WTO dispute settlement", "Bretton Woods", "UN Peacekeeping", "UNCLOS"] },
  { id: "GS2.IR.MARITIME", paper: "GS2", parent: "GS2.IR", path: ["International Relations & Foreign Policy", "Maritime Strategy & Indian Ocean Region"],
    gloss: "SAGAR initiative (Security and Growth for All in the Region), Indo-Pacific Oceans Initiative, maritime chokepoints (Malacca, Hormuz, Bab-el-Mandeb), and anti-piracy.",
    entities: ["SAGAR doctrine", "Indo-Pacific", "Strait of Hormuz", "Malacca Strait", "Indian Ocean Commission", "Maritime security"] },
  { id: "GS2.IR.DIASPORA", paper: "GS2", parent: "GS2.IR", path: ["International Relations & Foreign Policy", "Indian Diaspora & Cultural Diplomacy"],
    gloss: "The global Indian diaspora in Gulf countries, North America, UK, Europe, remittance inflows, Pravasi Bharatiya Divas, and soft power diplomacy (Yoga, Ayurveda, Cinema).",
    entities: ["Indian diaspora", "Remittances", "Pravasi Bharatiya", "Soft power diplomacy", "Overseas Citizenship", "Consular protection"] },

  // =========================================================================
  // ===== GS3 — Economy, Agriculture, Science, Environment, Security =======
  // =========================================================================

  // --- GS3 Economy Domain ---
  { id: "GS3.ECO", paper: "GS3", parent: null, path: ["Indian Economy & Finance"],
    gloss: "Indian economy, macroeconomic growth, budgeting, public finance, monetary policy, banking, and infrastructure development.",
    entities: ["economy", "GDP", "monetary policy", "fiscal policy", "banking", "taxation", "infrastructure"] },
  { id: "GS3.ECO.GROWTH", paper: "GS3", parent: "GS3.ECO", path: ["Indian Economy & Finance", "Growth, Development & Employment"],
    gloss: "GDP growth trends, inclusive growth, formalization of economy, labour force participation, gig and platform economy, and demographic dividend utilization.",
    entities: ["GDP growth", "Inclusive growth", "Gig economy", "Labour reforms", "Periodic Labour Force Survey", "Job creation"] },
  { id: "GS3.ECO.MONETARY", paper: "GS3", parent: "GS3.ECO", path: ["Indian Economy & Finance", "Monetary Policy, RBI & Inflation"],
    gloss: "Reserve Bank of India Monetary Policy Committee (MPC), policy repo rate, CPI inflation targeting (4% +/- 2%), open market operations, and liquidity management.",
    entities: ["RBI", "Repo rate", "Monetary Policy Committee", "CPI inflation", "WPI", "Liquidity Adjustment Facility", "Standing Deposit Facility"] },
  { id: "GS3.ECO.FISCAL", paper: "GS3", parent: "GS3.ECO", path: ["Indian Economy & Finance", "Fiscal Policy, Budgeting & Deficits"],
    gloss: "Union Budget preparation, Revenue vs Capital expenditure, Fiscal Deficit targets, Revenue Deficit, FRBM Act provisions, and public debt sustainability.",
    entities: ["Union Budget", "Fiscal deficit", "FRBM Act", "Capital expenditure", "Revenue deficit", "Public debt", "Debt to GDP ratio"] },
  { id: "GS3.ECO.TAXATION", paper: "GS3", parent: "GS3.ECO", path: ["Indian Economy & Finance", "Direct & Indirect Tax Reforms"],
    gloss: "Goods and Services Tax (GST) structure, GST Council rulings, direct tax code reforms, corporate tax rationalization, faceless assessment, and tax buoyancy.",
    entities: ["GST", "Direct tax reforms", "Corporate tax", "Tax to GDP ratio", "Faceless assessment", "Advance Pricing Agreements"] },
  { id: "GS3.ECO.BANKING", paper: "GS3", parent: "GS3.ECO", path: ["Indian Economy & Finance", "Banking Sector, NPAs & Insolvency"],
    gloss: "Public Sector Banks health, Non-Performing Assets (NPAs), Insolvency and Bankruptcy Code (IBC), Prompt Corrective Action (PCA), NBFC regulation, and bad bank (NARCL).",
    entities: ["NPA", "Insolvency and Bankruptcy Code", "IBC", "NARCL", "Prompt Corrective Action", "NBFC", "Financial stability report"] },
  { id: "GS3.ECO.CAPITAL_MKT", paper: "GS3", parent: "GS3.ECO", path: ["Indian Economy & Finance", "Capital Markets & Financial Regulation"],
    gloss: "SEBI regulations, stock exchanges, corporate bonds market, sovereign green bonds, mutual funds, venture capital, and retail investor participation.",
    entities: ["SEBI", "Stock markets", "Green bonds", "Venture capital", "Corporate bond market", "REITs", "InvITs"] },
  { id: "GS3.ECO.EXTERNAL", paper: "GS3", parent: "GS3.ECO", path: ["Indian Economy & Finance", "External Sector & Foreign Investment"],
    gloss: "Balance of Payments, Current Account Deficit (CAD), Foreign Direct Investment (FDI) policy, Foreign Portfolio Investment (FPI), and forex reserves management.",
    entities: ["Balance of Payments", "Current Account Deficit", "Foreign Direct Investment", "FDI policy", "FPI", "Forex reserves"] },
  { id: "GS3.ECO.TRADE", paper: "GS3", parent: "GS3.ECO", path: ["Indian Economy & Finance", "Foreign Trade Policy & Export Logistics"],
    gloss: "Foreign Trade Policy, export promotion schemes (RoDTEP), Special Economic Zones (SEZs), Free Trade Agreements (FTAs), and WTO tariff disputes.",
    entities: ["Foreign Trade Policy", "Free Trade Agreement", "RoDTEP", "SEZ", "Export competitiveness", "WTO dispute"] },
  { id: "GS3.ECO.INFRA", paper: "GS3", parent: "GS3.ECO", path: ["Indian Economy & Finance", "Infrastructure: Energy, Ports, Roads, Rail"],
    gloss: "National Infrastructure Pipeline (NIP), PM Gati Shakti National Master Plan, Bharatmala, Sagarmala, Dedicated Freight Corridors, and energy grid expansion.",
    entities: ["PM Gati Shakti", "Bharatmala", "Sagarmala", "Dedicated Freight Corridor", "National Infrastructure Pipeline", "Power grid"] },
  { id: "GS3.ECO.INVESTMENT", paper: "GS3", parent: "GS3.ECO", path: ["Indian Economy & Finance", "Investment Models & PPPs"],
    gloss: "Public-Private Partnership (PPP) models (BOT, BOOT, HAM, EPC), National Monetisation Pipeline (NMP), Disinvestment policy, and infrastructure financing.",
    entities: ["Public Private Partnership", "Hybrid Annuity Model", "National Monetisation Pipeline", "Disinvestment", "DIPAM", "NaBFID"] },

  // --- GS3 Agriculture Domain ---
  { id: "GS3.AGRI", paper: "GS3", parent: null, path: ["Agriculture & Food Systems"],
    gloss: "Major crops, cropping patterns, irrigation, farm inputs, farm subsidies, minimum support prices, public distribution system, and food processing.",
    entities: ["agriculture", "cropping pattern", "irrigation", "MSP", "PDS", "food security", "food processing"] },
  { id: "GS3.AGRI.CROPPING", paper: "GS3", parent: "GS3.AGRI", path: ["Agriculture & Food Systems", "Cropping Patterns & Crop Diversification"],
    gloss: "Major agricultural crops (Kharif, Rabi, Zaid), cropping pattern shifts, crop diversification toward pulses, oilseeds, and coarse grains/millets (Shree Anna).",
    entities: ["Cropping pattern", "Millets", "Shree Anna", "Crop diversification", "Kharif crops", "Rabi crops", "Pulses production"] },
  { id: "GS3.AGRI.IRRIGATION", paper: "GS3", parent: "GS3.AGRI", path: ["Agriculture & Food Systems", "Irrigation Systems & Water Use Efficiency"],
    gloss: "Types of irrigation (canal, well, tank), micro-irrigation systems (drip and sprinkler), Pradhan Mantri Krishi Sinchayee Yojana (PMKSY), and command area development.",
    entities: ["PMKSY", "Micro-irrigation", "Drip irrigation", "Sprinkler irrigation", "Per Drop More Crop", "Groundwater irrigation"] },
  { id: "GS3.AGRI.INPUTS", paper: "GS3", parent: "GS3.AGRI", path: ["Agriculture & Food Systems", "Farm Inputs: Seeds, Fertilizers & Subsidies"],
    gloss: "High Yielding Variety (HYV) seeds, Genetically Modified (GM) crops, fertilizer subsidies (Nutrient Based Subsidy), PM PRANAM, nano-urea, and pesticide regulation.",
    entities: ["Nutrient Based Subsidy", "Nano urea", "PM-PRANAM", "GM mustard", "Bt cotton", "Organic farming", "Zero budget natural farming"] },
  { id: "GS3.AGRI.ECONOMICS", paper: "GS3", parent: "GS3.AGRI", path: ["Agriculture & Food Systems", "Agricultural Economics, MSP & Insurance"],
    gloss: "Minimum Support Price (MSP) fixation by CACP, cost concepts (A2+FL vs C2), institutional agricultural credit (Kisan Credit Card), and crop insurance (PMFBY).",
    entities: ["MSP", "CACP", "Kisan Credit Card", "PMFBY", "Crop insurance", "Agricultural credit", "e-NAM"] },
  { id: "GS3.AGRI.PDS", paper: "GS3", parent: "GS3.AGRI", path: ["Agriculture & Food Systems", "Public Distribution System & Buffer Norms"],
    gloss: "Food Corporation of India (FCI) procurement, Targeted Public Distribution System (TPDS), One Nation One Ration Card (ONORC), buffer stock norms, and open market sale scheme.",
    entities: ["Food Corporation of India", "TPDS", "One Nation One Ration Card", "Buffer stocks", "NFSA", "Food subsidy"] },
  { id: "GS3.AGRI.PROCESSING", paper: "GS3", parent: "GS3.AGRI", path: ["Agriculture & Food Systems", "Food Processing & Supply Chains"],
    gloss: "Scope and significance of food processing industry in India, upstream and downstream requirements, Mega Food Parks, cold chain infrastructure, and PM Formalisation of Micro food enterprises.",
    entities: ["Food processing", "Mega Food Parks", "Cold chain", "PM FME", "Post-harvest losses", "Supply chain management"] },
  { id: "GS3.AGRI.TECH", paper: "GS3", parent: "GS3.AGRI", path: ["Agriculture & Food Systems", "Digital Agriculture & Farm Tech"],
    gloss: "Digital Public Infrastructure in agriculture (Agristack), Kisan Drones, artificial intelligence in pest management, precision agriculture, and weather forecast integration.",
    entities: ["Agristack", "Kisan Drones", "Precision farming", "Digital agriculture", "Soil Health Card", "Agri-tech startups"] },
  { id: "GS3.AGRI.ALLIED", paper: "GS3", parent: "GS3.AGRI", path: ["Agriculture & Food Systems", "Allied Sectors: Dairy, Animal Husbandry & Fisheries"],
    gloss: "Dairy sector economics, Operation Flood, Rashtriya Gokul Mission, Blue Revolution, PM Matsya Sampada Yojana (PMMSY), and livestock disease eradication.",
    entities: ["PM Matsya Sampada Yojana", "Rashtriya Gokul Mission", "Blue Revolution", "Dairy sector", "Livestock census", "Aquaculture"] },
  { id: "GS3.AGRI.LAND", paper: "GS3", parent: "GS3.AGRI", path: ["Agriculture & Food Systems", "Land Reforms & Tenancy"],
    gloss: "Historical land reform measures, ceiling on land holdings, tenancy security, land consolidation, digitization of land records (DILRMP), and SVAMITVA scheme.",
    entities: ["Land reforms", "SVAMITVA scheme", "DILRMP", "Land records digitization", "Tenancy reforms", "Land pooling"] },

  // --- GS3 Science & Tech Domain ---
  { id: "GS3.SCI", paper: "GS3", parent: null, path: ["Science & Technology"],
    gloss: "Recent developments, applications and effects in everyday life, indigenization of technology, and intellectual property rights.",
    entities: ["science and technology", "ISRO", "defence technology", "biotechnology", "AI", "semiconductors", "nuclear energy"] },
  { id: "GS3.SCI.SPACE", paper: "GS3", parent: "GS3.SCI", path: ["Science & Technology", "Space Technology & Planetary Exploration"],
    gloss: "ISRO satellite programmes, launch vehicles (PSLV, GSLV Mk III/LVM3, SSLV), Chandrayaan, Aditya-L1, Gaganyaan manned mission, NavIC satellite navigation, and IN-SPACe space privatization.",
    entities: ["ISRO", "LVM3", "Chandrayaan", "Aditya-L1", "Gaganyaan", "NavIC", "IN-SPACe", "Small Satellite Launch Vehicle"] },
  { id: "GS3.SCI.DEFENCE", paper: "GS3", parent: "GS3.SCI", path: ["Science & Technology", "Defence Technology & Indigenisation"],
    gloss: "Missile systems (Agni, BrahMos, Akash, Pralay), indigenous aircraft carrier (INS Vikrant), Tejas fighter aircraft, submarine programmes (Project 75), and DRDO technologies.",
    entities: ["BrahMos", "Agni missile", "INS Vikrant", "Tejas aircraft", "DRDO", "Defence indigenisation", "Project 75"] },
  { id: "GS3.SCI.NUCLEAR", paper: "GS3", parent: "GS3.SCI", path: ["Science & Technology", "Nuclear Science & Energy"],
    gloss: "India's three-stage nuclear power programme, Fast Breeder Reactors (PFBR), Pressurised Heavy Water Reactors, ITER fusion project, civilian nuclear safety, and atomic minerals.",
    entities: ["Three-stage nuclear programme", "Thorium", "Fast Breeder Reactor", "Kudankulam", "ITER", "AERB", "Uranium enrichment"] },
  { id: "GS3.SCI.BIOTECH", paper: "GS3", parent: "GS3.SCI", path: ["Science & Technology", "Biotechnology & Genomics"],
    gloss: "Recombinant DNA technology, CRISPR-Cas9 genome editing, Genome India Project, DNA profiling, stem cell therapy, mRNA vaccine platforms, and biosafety protocols.",
    entities: ["CRISPR", "Gene editing", "Genome India Project", "mRNA vaccines", "Stem cells", "Biotechnology", "GEAC"] },
  { id: "GS3.SCI.IT_COMP", paper: "GS3", parent: "GS3.SCI", path: ["Science & Technology", "AI, Supercomputing & Quantum Tech"],
    gloss: "National Quantum Mission, National Supercomputing Mission (PARAM supercomputers), Artificial Intelligence regulations, generative AI, 5G/6G rollout, and semiconductor mission (India Semiconductor Mission).",
    entities: ["National Quantum Mission", "Artificial Intelligence", "India Semiconductor Mission", "Supercomputing", "Generative AI", "5G network"] },
  { id: "GS3.SCI.NANO", paper: "GS3", parent: "GS3.SCI", path: ["Science & Technology", "Nanotechnology & Advanced Materials"],
    gloss: "Applications of nanomaterials in medicine, water purification, agriculture (nano-fertilizers), carbon nanotubes, graphene, and smart composite materials.",
    entities: ["Nanotechnology", "Carbon nanotubes", "Graphene", "Nano fertilizers", "Targeted drug delivery", "Metamaterials"] },
  { id: "GS3.SCI.IPR", paper: "GS3", parent: "GS3.SCI", path: ["Science & Technology", "Intellectual Property Rights & Patents"],
    gloss: "Patents Act 1970, section 3(d) patent evergreening prevention, compulsory licensing, TRIPS agreement, Geographical Indications, Copyright, and Traditional Knowledge Digital Library (TKDL).",
    entities: ["Patent Act", "TRIPS agreement", "Compulsory licensing", "Section 3(d)", "Evergreening", "Geographical Indication", "TKDL"] },

  // --- GS3 Environment Domain ---
  { id: "GS3.ENV", paper: "GS3", parent: null, path: ["Environment, Ecology & Climate"],
    gloss: "Conservation, environmental pollution and degradation, environmental impact assessment, and climate change agreements.",
    entities: ["environment", "ecology", "biodiversity", "climate change", "Ramsar", "pollution", "renewables"] },
  { id: "GS3.ENV.ECOLOGY", paper: "GS3", parent: "GS3.ENV", path: ["Environment, Ecology & Climate", "Ecosystem Ecology & Biodiversity Hotspots"],
    gloss: "Trophic structure, ecological pyramids, ecological succession, biogeochemical cycles, biodiversity hotspots in India (Western Ghats, Indo-Burma, Himalayas, Sundaland).",
    entities: ["Ecological succession", "Trophic levels", "Biodiversity hotspots", "Western Ghats", "Biogeochemical cycles", "Carrying capacity"] },
  { id: "GS3.ENV.BIODIVERSITY", paper: "GS3", parent: "GS3.ENV", path: ["Environment, Ecology & Climate", "Wildlife Conservation & Protected Areas"],
    gloss: "Wildlife Protection Act 1972, National Parks, Wildlife Sanctuaries, Biosphere Reserves, Tiger Reserves, Project Tiger/Elephant, IUCN Red List categories, and CITES convention.",
    entities: ["Wildlife Protection Act", "Tiger Reserves", "Project Tiger", "Biosphere Reserves", "IUCN Red List", "CITES", "National Parks"] },
  { id: "GS3.ENV.WETLANDS", paper: "GS3", parent: "GS3.ENV", path: ["Environment, Ecology & Climate", "Wetlands, Mangroves & Coastal Ecology"],
    gloss: "Ramsar Convention on Wetlands, Montreux Record, Coastal Regulation Zone (CRZ) rules, mangrove conservation (MISHTI scheme), and coral reef conservation.",
    entities: ["Ramsar Convention", "Montreux Record", "Mangroves", "MISHTI scheme", "Coastal Regulation Zone", "Coral reefs"] },
  { id: "GS3.ENV.CLIMATE", paper: "GS3", parent: "GS3.ENV", path: ["Environment, Ecology & Climate", "Climate Change & UNFCCC Negotiations"],
    gloss: "UNFCCC COP negotiations, Paris Agreement Nationally Determined Contributions (NDCs), net-zero by 2070 target, Carbon Border Adjustment Mechanism (CBAM), and Loss & Damage Fund.",
    entities: ["UNFCCC", "COP summits", "Paris Agreement", "Net zero 2070", "Panchamrit", "CBAM", "Loss and Damage Fund", "Carbon credits"] },
  { id: "GS3.ENV.ENERGY_TRANS", paper: "GS3", parent: "GS3.ENV", path: ["Environment, Ecology & Climate", "Renewable Energy & Energy Transition"],
    gloss: "National Green Hydrogen Mission, National Solar Mission, PM KUSUM, wind energy, battery energy storage systems (BESS), nuclear power expansion, and electric mobility (FAME).",
    entities: ["Green Hydrogen Mission", "PM-KUSUM", "Solar energy", "Energy transition", "Electric vehicles", "Battery storage", "BESS"] },
  { id: "GS3.ENV.POLLUTION", paper: "GS3", parent: "GS3.ENV", path: ["Environment, Ecology & Climate", "Pollution Control & Waste Management"],
    gloss: "National Clean Air Programme (NCAP), Air Quality Index (AQI), Stubble burning management, Plastic Waste Management Rules (Single Use Plastic ban), E-Waste Rules, and water pollution abatement.",
    entities: ["Air Quality Index", "NCAP", "Stubble burning", "Single use plastic", "CPCB", "E-waste rules", "Namami Gange"] },
  { id: "GS3.ENV.GOVERNANCE", paper: "GS3", parent: "GS3.ENV", path: ["Environment, Ecology & Climate", "Environmental Laws & Impact Assessment"],
    gloss: "Environment Protection Act 1986, Forest Conservation Act 2023 amendment, Biological Diversity Act, National Green Tribunal (NGT) rulings, and Environmental Impact Assessment (EIA) process.",
    entities: ["Environment Protection Act", "National Green Tribunal", "NGT", "EIA notification", "Forest Conservation Act", "Biological Diversity Act"] },
  { id: "GS3.ENV.FORESTS", paper: "GS3", parent: "GS3.ENV", path: ["Environment, Ecology & Climate", "Forests, CAMPA & Land Degradation"],
    gloss: "India State of Forest Report (ISFR), Compensatory Afforestation Fund Management and Planning Authority (CAMPA), UNCCD land degradation neutrality, and community forest rights.",
    entities: ["State of Forest Report", "CAMPA fund", "Afforestation", "Land degradation neutrality", "Forest Rights Act", "Agroforestry"] },

  // --- GS3 Security Domain ---
  { id: "GS3.SEC", paper: "GS3", parent: null, path: ["Internal Security & Defence"],
    gloss: "Linkages between development and spread of extremism, role of external state and non-state actors, cyber security, money laundering, and border management.",
    entities: ["internal security", "Left Wing Extremism", "terrorism", "cyber security", "border management", "money laundering"] },
  { id: "GS3.SEC.INTERNAL", paper: "GS3", parent: "GS3.SEC", path: ["Internal Security & Defence", "Left-Wing Extremism & Northeast Insurgency"],
    gloss: "Left-Wing Extremism (Naxalism) security and development response (SAMBHAV), Northeast insurgent groups, peace accords, Armed Forces Special Powers Act (AFSPA) withdrawal dynamics.",
    entities: ["Left Wing Extremism", "Naxalism", "AFSPA", "Naga peace talks", "Bodo accord", "Internal security"] },
  { id: "GS3.SEC.TERROR", paper: "GS3", parent: "GS3.SEC", path: ["Internal Security & Defence", "Terrorism, Terror Financing & Organized Crime"],
    gloss: "Transnational terrorism, terror financing networks, Financial Action Task Force (FATF) grey/black lists, Prevention of Money Laundering Act (PMLA), and organized crime syndicates (drugs-arms nexus).",
    entities: ["FATF", "PMLA", "Terror financing", "NIA", "Money laundering", "Organized crime", "Golden Crescent", "Golden Triangle"] },
  { id: "GS3.SEC.CYBER", paper: "GS3", parent: "GS3.SEC", path: ["Internal Security & Defence", "Cyber Security & Critical Infrastructure"],
    gloss: "Cyber threats, critical information infrastructure protection (NCIIPC), CERT-In incident reporting mandates, darknet investigations, malware/ransomware attacks, and National Cyber Security Strategy.",
    entities: ["Cyber security", "CERT-In", "NCIIPC", "Ransomware", "Data protection", "Cyber warfare", "Critical infrastructure"] },
  { id: "GS3.SEC.BORDER", paper: "GS3", parent: "GS3.SEC", path: ["Internal Security & Defence", "Border Management & Coastal Security"],
    gloss: "Land border management (Line of Control, Line of Actual Control, Indo-Pak, Indo-Bangla borders), Comprehensive Integrated Border Management System (CIBMS), and multi-tier coastal security.",
    entities: ["CIBMS", "Border management", "Coastal security", "Line of Control", "Infiltration", "Border fencing", "Cross border smuggling"] },
  { id: "GS3.SEC.FORCES", paper: "GS3", parent: "GS3.SEC", path: ["Internal Security & Defence", "Security Forces & Higher Defence Organisation"],
    gloss: "Chief of Defence Staff (CDS) role, Theaterisation of Armed Forces, Central Armed Police Forces (BSF, CRPF, CISF, ITBP, SSB, Assam Rifles) roles and operational mandates.",
    entities: ["Chief of Defence Staff", "Theatre Commands", "CAPF", "BSF", "CRPF", "CISF", "Assam Rifles", "Defence reforms"] },

  // --- GS3 Disaster Management Domain ---
  { id: "GS3.DIS", paper: "GS3", parent: null, path: ["Disaster Management"],
    gloss: "Disaster and disaster management: institutional frameworks, hazard mitigation, early warning systems, and community resilience.",
    entities: ["disaster management", "NDMA", "Sendai framework", "cyclone warning", "earthquake", "floods", "resilience"] },
  { id: "GS3.DIS.FRAMEWORK", paper: "GS3", parent: "GS3.DIS", path: ["Disaster Management", "Institutional Architecture & Sendai Framework"],
    gloss: "Disaster Management Act 2005, National Disaster Management Authority (NDMA), NDRF operations, State/District disaster plans, and Sendai Framework for Disaster Risk Reduction (2015–2030).",
    entities: ["Disaster Management Act", "NDMA", "NDRF", "Sendai Framework", "Disaster risk reduction", "Early warning systems"] },
  { id: "GS3.DIS.HAZARDS", paper: "GS3", parent: "GS3.DIS", path: ["Disaster Management", "Specific Natural & Industrial Hazards"],
    gloss: "Mitigation and response mechanisms for floods, urban flooding, droughts, earthquakes, cyclones, Glacial Lake Outburst Floods (GLOF), landslides, and industrial/chemical disasters.",
    entities: ["Urban flooding", "GLOF", "Landslides", "Earthquake zones", "Cyclone preparedness", "Drought management", "Chemical disaster"] },

  // =========================================================================
  // ===== GS4 — Ethics, Integrity & Aptitude ================================
  // =========================================================================

  // --- GS4 Ethics Theory Domain ---
  { id: "GS4.ETH", paper: "GS4", parent: null, path: ["Ethics & Human Interface"],
    gloss: "Ethics and human interface, moral philosophy, attitude, emotional intelligence, and foundational values for civil service.",
    entities: ["ethics", "human values", "moral philosophy", "emotional intelligence", "aptitude", "civil services values"] },
  { id: "GS4.ETH.INTERFACE", paper: "GS4", parent: "GS4.ETH", path: ["Ethics & Human Interface", "Ethics in Human Actions & Dimensions"],
    gloss: "Essence, determinants and consequences of ethics in human actions; dimensions of ethics (deontology, teleology/utilitarianism, virtue ethics); ethics in private and public relationships.",
    entities: ["Deontology", "Utilitarianism", "Virtue ethics", "Kant", "Consequentialism", "Moral dilemma", "Ethics in public life"] },
  { id: "GS4.ETH.VALUES", paper: "GS4", parent: "GS4.ETH", path: ["Ethics & Human Interface", "Human Values & Role of Family and Society"],
    gloss: "Lessons from the lives and teachings of great leaders, reformers and administrators; role of family, society and educational institutions in inculcating values.",
    entities: ["Human values", "Moral education", "Role of family", "Socialization", "Values of reformers", "Empathy"] },
  { id: "GS4.ETH.ATTITUDE", paper: "GS4", parent: "GS4.ETH", path: ["Ethics & Human Interface", "Attitude & Behavioral Influence"],
    gloss: "Content, structure, function of attitude; its influence and relation with thought and behaviour; moral and political attitudes; social influence and persuasion techniques.",
    entities: ["Attitude formation", "Persuasion", "Cognitive dissonance", "Moral attitude", "Political attitude", "Behavioral change"] },
  { id: "GS4.ETH.FOUNDATIONAL", paper: "GS4", parent: "GS4.ETH", path: ["Ethics & Human Interface", "Foundational Values for Civil Service"],
    gloss: "Integrity, impartiality, non-partisanship, objectivity, dedication to public service, empathy, tolerance, and compassion towards weaker sections of society.",
    entities: ["Integrity", "Impartiality", "Non-partisanship", "Objectivity", "Compassion", "Dedication to public service", "Nolan Committee"] },
  { id: "GS4.ETH.EI", paper: "GS4", parent: "GS4.ETH", path: ["Ethics & Human Interface", "Emotional Intelligence in Governance"],
    gloss: "Concepts and components of emotional intelligence, their utilities and application in administration and governance; emotional self-regulation in crisis situations.",
    entities: ["Emotional intelligence", "Self-awareness", "Empathy in governance", "Crisis leadership", "Interpersonal skills", "Emotional regulation"] },
  { id: "GS4.ETH.THINKERS", paper: "GS4", parent: "GS4.ETH", path: ["Ethics & Human Interface", "Moral Thinkers & Philosophers"],
    gloss: "Contributions of moral thinkers and philosophers from India (Kautilya, Buddha, Mahavira, Kabir, Gandhi, Ambedkar) and the world (Socrates, Plato, Aristotle, Mill, Rawls).",
    entities: ["Gandhian ethics", "John Rawls", "Justice as fairness", "Aristotle", "Kautilya", "Ambedkar ethics", "Categorical imperative"] },
  { id: "GS4.ETH.PUBLIC_VAL", paper: "GS4", parent: "GS4.ETH", path: ["Ethics & Human Interface", "Public Service Values & Ethical Dilemmas"],
    gloss: "Ethical dilemmas in public administration, laws, rules, regulations and conscience as sources of ethical guidance; ethical accountability in governance.",
    entities: ["Ethical dilemma", "Conscience", "Rule of law", "Public interest", "Administrative discretion", "Ethical guidance"] },

  // --- GS4 Probity & Case Studies Domain ---
  { id: "GS4.PROB", paper: "GS4", parent: null, path: ["Probity in Governance & Case Studies"],
    gloss: "Concept of public service, probity in governance, codes of conduct, citizen charters, work culture, and practical case studies.",
    entities: ["probity in governance", "code of conduct", "anti-corruption", "citizen charter", "case studies", "whistleblowing"] },
  { id: "GS4.PROB.CONCEPT", paper: "GS4", parent: "GS4.PROB", path: ["Probity in Governance & Case Studies", "Concept of Public Service & Transparency"],
    gloss: "Philosophical basis of governance and probity, information sharing and transparency in government, Right to Information (RTI) usage, and fiduciary duty of public servants.",
    entities: ["Probity in governance", "Fiduciary duty", "Transparency in government", "Public trust", "Open government"] },
  { id: "GS4.PROB.CODES", paper: "GS4", parent: "GS4.PROB", path: ["Probity in Governance & Case Studies", "Codes of Ethics & Codes of Conduct"],
    gloss: "Distinction between Code of Ethics and Code of Conduct, Civil Services Conduct Rules, conflict of interest avoidance, and declaration of assets by public servants.",
    entities: ["Code of Ethics", "Code of Conduct", "Conflict of interest", "Civil services conduct rules", "Asset declaration"] },
  { id: "GS4.PROB.CITIZEN_CHARTER", paper: "GS4", parent: "GS4.PROB", path: ["Probity in Governance & Case Studies", "Citizen Charters & Quality Service Delivery"],
    gloss: "Citizen's Charters design, implementation bottlenecks, Sevottam quality management model, grievance redress mechanisms, and public service delivery benchmarks.",
    entities: ["Citizen charter", "Sevottam framework", "Public service delivery", "Grievance redressal", "Consumer satisfaction"] },
  { id: "GS4.PROB.WORK_CULTURE", paper: "GS4", parent: "GS4.PROB", path: ["Probity in Governance & Case Studies", "Work Culture & Administrative Leadership"],
    gloss: "Healthy organizational work culture in government departments, participatory decision-making, motivation of public personnel, and leadership in administrative crisis.",
    entities: ["Work culture", "Administrative leadership", "Professionalism", "Public office culture", "Moral leadership"] },
  { id: "GS4.PROB.CORRUPTION", paper: "GS4", parent: "GS4.PROB", path: ["Probity in Governance & Case Studies", "Anti-Corruption Measures & Whistleblowing"],
    gloss: "Challenges and roots of corruption, Prevention of Corruption Act, Central Vigilance Commission (CVC), Lokpal and Lokayuktas, Whistleblowers Protection Act, and asset forfeiture.",
    entities: ["Prevention of Corruption Act", "CVC", "Lokpal", "Lokayukta", "Whistleblower protection", "Benami transactions"] },
  { id: "GS4.PROB.CASES", paper: "GS4", parent: "GS4.PROB", path: ["Probity in Governance & Case Studies", "Case Studies on Administrative & Ethical Dilemmas"],
    gloss: "Application of ethical principles to practical case studies involving conflict of interest, political pressure, resource allocation, disaster relief, and law enforcement dilemmas.",
    entities: ["Ethical case study", "Administrative dilemma", "Law vs conscience", "Public vs private interest", "Whistleblowing case"] },

  // =========================================================================
  // ===== PRELIMS Focus Disciplines & Static Minutiae =======================
  // =========================================================================

  // --- Prelims General Science Domain ---
  { id: "PRE.SCI", paper: "PRELIMS", parent: null, path: ["General Science (Prelims)"],
    gloss: "General science concepts in Physics, Chemistry, Biology, and health basics frequently tested in UPSC Prelims.",
    entities: ["general science", "physics", "chemistry", "biology", "diseases", "vitamins"] },
  { id: "PRE.SCI.PHYS", paper: "PRELIMS", parent: "PRE.SCI", path: ["General Science (Prelims)", "Everyday Physics & Optics"],
    gloss: "Principles of light and optics (refraction, total internal reflection), electromagnetism, sound waves, mechanics, thermodynamics, and planetary motion basics.",
    entities: ["Total internal reflection", "Refraction", "Electromagnetic spectrum", "Doppler effect", "Thermodynamics", "Gravitational waves"] },
  { id: "PRE.SCI.CHEM", paper: "PRELIMS", parent: "PRE.SCI", path: ["General Science (Prelims)", "Chemistry in Daily Life"],
    gloss: "Acids and bases, polymers and plastics, food preservatives, chemical fertilizers, radioactive decay, greenhouse gas chemistry, and water treatment compounds.",
    entities: ["Acids and bases", "Polymers", "Bisphenol A", "Radioactive isotopes", "Chemical fertilizers", "Water fluoridation"] },
  { id: "PRE.SCI.BIO", paper: "PRELIMS", parent: "PRE.SCI", path: ["General Science (Prelims)", "Botany, Zoology & Cell Biology"],
    gloss: "Cell structure (plant vs animal), organelle functions, photosynthesis mechanism, nitrogen fixation, plant hormones, and human physiological organ systems.",
    entities: ["Plant cell vs animal cell", "Mitochondria", "Photosynthesis", "Nitrogen fixation", "Plant hormones", "Auxins", "Human circulatory system"] },
  { id: "PRE.SCI.DISEASE", paper: "PRELIMS", parent: "PRE.SCI", path: ["General Science (Prelims)", "Human Diseases, Nutrition & Vaccines"],
    gloss: "Bacterial, viral, protozoan, fungal diseases, vector-borne illnesses (Malaria, Dengue, Zika), vitamins and deficiency disorders, antibiotics, and vaccination immunology.",
    entities: ["Vitamins deficiency", "Vector borne diseases", "Zoonotic diseases", "Antibiotic resistance", "Antigens and antibodies", "Vaccines"] },

  // --- Prelims Static GK & Mapping Minutiae Domain ---
  { id: "PRE.STAT", paper: "PRELIMS", parent: null, path: ["Static GK, Mapping & Reports (Prelims)"],
    gloss: "High-yield factual minutiae: geographical mapping passes, world chokepoints, international reports/indices, and scheme eligibility.",
    entities: ["mapping", "mountain passes", "strait", "indices", "reports", "flagship schemes"] },
  { id: "PRE.STAT.MAPPING_IND", paper: "PRELIMS", parent: "PRE.STAT", path: ["Static GK, Mapping & Reports (Prelims)", "Indian Map, Passes & River Confluences"],
    gloss: "Himalayan and Western Ghats passes (Zoji La, Rohtang, Nathu La, Palghat), river origins and tributaries, national water waterways, island territories, and border states.",
    entities: ["Nathu La", "Zoji La", "Prayags", "River tributaries", "Barren Island", "Ten Degree Channel", "Border states"] },
  { id: "PRE.STAT.MAPPING_WLD", paper: "PRELIMS", parent: "PRE.STAT", path: ["Static GK, Mapping & Reports (Prelims)", "World Mapping, Straits & Seas"],
    gloss: "Major straits and chokepoints (Bosphorus, Dardanelles, Bab-el-Mandeb, Malacca), landlocked countries, Mediterranean borders, Red Sea littoral nations, and conflict locations.",
    entities: ["Strait of Hormuz", "Bab-el-Mandeb", "Red Sea border countries", "Black Sea", "Mediterranean Sea", "Landlocked countries"] },
  { id: "PRE.STAT.REPORTS", paper: "PRELIMS", parent: "PRE.STAT", path: ["Static GK, Mapping & Reports (Prelims)", "Global Reports & Multilateral Indices"],
    gloss: "Publishing bodies of major annual global reports: World Bank, IMF (World Economic Outlook, Global Financial Stability), UNDP (HDI), WEF (Global Competitiveness), UNEP, and Transparency International.",
    entities: ["Human Development Index", "World Economic Outlook", "Global Gender Gap Report", "Corruption Perceptions Index", "Emissions Gap Report"] },
  { id: "PRE.STAT.SCHEMES_CORE", paper: "PRELIMS", parent: "PRE.STAT", path: ["Static GK, Mapping & Reports (Prelims)", "Flagship Schemes Minutiae & Portals"],
    gloss: "Nodal ministries, funding ratios (Central Sector vs Centrally Sponsored), beneficiary criteria, and official portals of flagship national missions and centrally sponsored schemes.",
    entities: ["Central Sector scheme", "Centrally Sponsored Scheme", "Nodal ministry", "Funding pattern 60:40", "Target beneficiaries", "Mission mode"] },
  { id: "PRE.STAT.CONVENTIONS", paper: "PRELIMS", parent: "PRE.STAT", path: ["Static GK, Mapping & Reports (Prelims)", "International Conventions & Treaties"],
    gloss: "Environment conventions (Basel, Rotterdam, Stockholm, Minamata, Vienna/Montreal Protocol), disarmament treaties (NPT, CTBT), and international export control regimes (MTCR, Wassenaar, Australia Group).",
    entities: ["Stockholm Convention", "Minamata Convention", "Montreal Protocol", "Basel Convention", "Rotterdam Convention", "MTCR", "Wassenaar Arrangement"] },
];

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------
const BY_ID = new Map(NODES.map((n) => [n.id, n]));

export function loadNodes(): SyllabusNode[] {
  return NODES;
}

export function nodeById(id: string): SyllabusNode | undefined {
  return BY_ID.get(id);
}

export function childrenOf(id: string): SyllabusNode[] {
  return NODES.filter((n) => n.parent === id);
}

/** Domain (parent) nodes only — used as shrinkage anchors. */
export function domainNodes(): SyllabusNode[] {
  return NODES.filter((n) => n.parent === null);
}

/**
 * Populate node embeddings in place. Build-step helper: run once, then persist
 * to a static array so the daily pipeline never re-embeds the graph.
 * Node vectors MUST share the embedder's dim + taskType with item vectors
 * (SEMANTIC_SIMILARITY) so the relevance-gate cosines are comparable.
 */
export async function embedNodes(embedder: Embedder, nodes: SyllabusNode[] = NODES): Promise<void> {
  const vectors = await embedder.embed(nodes.map(nodeText));
  nodes.forEach((n, i) => {
    n.embedding = vectors[i];
  });
}
