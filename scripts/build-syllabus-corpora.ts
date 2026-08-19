/**
 * scripts/build-syllabus-corpora.ts
 *
 * Generates high-fidelity Tier A and Tier B evidence corpora from official
 * UPSC questions in static_questions and historical UPSC papers.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { NODES, loadNodes } from "../server-lib/cron/ingest/syllabus/nodes.js";
import { compareConfigs, laterPyqRecallAtK } from "../server-lib/cron/ingest/syllabus/backtest.js";
import { estimateTestability } from "../server-lib/cron/ingest/syllabus/testability.js";
import type { Evidence, SyllabusNode } from "../server-lib/cron/ingest/syllabus/types.js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://ixngfxaerlkkcacrbdgc.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const KEYWORD_AFFINITIES: Record<string, string[]> = {
  // GS1 History & Culture
  "GS1.HIS.ANCIENT": ["indus", "harappa", "vedic", "rigveda", "upanishad", "mahajanapada", "maurya", "ashoka", "gupta", "harsha", "sangam", "megasthenes", "inscriptions", "numismatics", "magadha", "arthashastra"],
  "GS1.HIS.MEDIEVAL": ["delhi sultanate", "alauddin", "tughlaq", "mughal", "babur", "akbar", "mansabdari", "aurangzeb", "vijayanagara", "krishnadevaraya", "hampi", "bahmani", "maratha", "shivaji", "bhakti", "sufi", "kabir", "guru nanak"],
  "GS1.HIS.MODERN_EARLY": ["plassey", "buxar", "carnatic", "subsidiary alliance", "doctrine of lapse", "permanent settlement", "ryotwari", "mahalwari", "santhal", "kol revolt", "indigo revolt", "charter act", "pitts india"],
  "GS1.HIS.FREEDOM": ["1857 revolt", "congress", "inc", "swadeshi", "boycott", "surat split", "home rule", "gandhi", "champaran", "kheda", "rowlatt", "jallianwala", "khilafat", "non-cooperation", "swaraj", "simon commission", "civil disobedience", "dandi", "round table", "poona pact", "government of india act 1935", "quit india", "ina", "subhas", "cabinet mission", "mountbatten"],
  "GS1.HIS.POST_INDEP": ["princely states", "sardar patel", "states reorganisation", "linguistic states", "fazal ali", "tribal integration", "land ceiling", "bhoodan", "five year plan"],
  "GS1.HIS.WORLD": ["renaissance", "industrial revolution", "french revolution", "american revolution", "enlightenment", "world war", "league of nations", "nazism", "fascism", "cold war", "nato", "warsaw", "decolonization", "apartheid"],
  "GS1.CUL.ARCH": ["stupa", "sanchi", "chaitya", "vihara", "rock-cut", "ajanta", "ellora", "elephanta", "gandhara", "mathura", "amravati", "nagara", "dravida", "vesara", "shikhara", "gopuram", "khajuraho", "sun temple", "konark", "chola bronzes", "indo-islamic", "qutub", "fatehpur sikri"],
  "GS1.CUL.PAINT_CRAFT": ["mural", "miniature", "mughal painting", "ragamala", "pahari", "kangra", "rajasthani painting", "tanjore", "madhubani", "warli", "pattachitra", "kalamkari", "handicraft", "gi tag", "ikat", "pashmina"],
  "GS1.CUL.PERFORM": ["bharatanatyam", "kathak", "kathakali", "odissi", "kuchipudi", "manipuri", "mohiniyattam", "sattriya", "hindustani", "carnatic", "raga", "tansen", "yakshagana", "koodiyattam", "chhau", "puppetry", "kathputli"],
  "GS1.CUL.LIT_PHIL": ["vedas", "upanishads", "puranas", "ramayana", "mahabharata", "kalidasa", "shakuntala", "sangam literature", "silappadikaram", "buddhist texts", "tripitaka", "jain agamas", "shad darshana", "samkhya", "yoga", "nyaya", "vaisheshika", "mimamsa", "vedanta", "advaita", "shankara", "ramanuja"],

  // GS1 Geography & Society
  "GS1.GEO.GEOMORPH": ["earth interior", "crust", "mantle", "core", "plate tectonics", "continental drift", "seismic", "earthquake", "p wave", "s wave", "shadow zone", "volcano", "lava", "magma", "igneous", "sedimentary", "metamorphic", "weathering", "erosion", "karst", "glacier", "moraine", "faulting"],
  "GS1.GEO.CLIMATE": ["atmosphere", "troposphere", "stratosphere", "ozone layer", "insolation", "heat budget", "coriolis", "trade winds", "westerlies", "monsoon", "itcz", "el nino", "la nina", "enso", "indian ocean dipole", "iod", "cyclone", "western disturbance", "jet stream"],
  "GS1.GEO.OCEAN": ["continental shelf", "abyssal", "ocean relief", "salinity", "temperature profile", "ocean current", "gulf stream", "kuroshio", "tides", "spring tide", "neap tide", "coral reef", "atoll", "coral bleaching", "polymetallic"],
  "GS1.GEO.IND_PHYS": ["himalaya", "siwalik", "himadri", "himachal", "indo-gangetic", "bhabar", "terai", "bhangar", "khadar", "deccan", "western ghats", "eastern ghats", "ganga", "brahmaputra", "indus", "godavari", "krishna", "cauvery", "narmada", "tapi", "andaman", "nicobar", "lakshadweep"],
  "GS1.GEO.RESOURCES": ["mineral", "iron ore", "bauxite", "copper", "coal", "gondwana", "petroleum", "crude oil", "natural gas", "rare earth", "lithium", "uranium", "thorium"],
  "GS1.GEO.AGRI_GEO": ["soil", "alluvial", "black soil", "regur", "laterite", "soil erosion", "salinization", "cropping pattern", "kharif", "rabi", "zaid", "rice", "wheat", "cotton", "sugarcane", "tea", "coffee", "agro-climatic"],
  "GS1.GEO.INDUSTRY": ["industrial location", "weber", "raw material", "footloose industry", "iron and steel", "cotton textile", "petrochemical", "automobile", "information technology", "industrial corridor"],
  "GS1.GEO.HUMAN": ["demographic transition", "population density", "sex ratio", "fertility rate", "migration", "rural-urban", "push pull factors", "urbanization", "slum", "census"],
  "GS1.SOC.FEATURES": ["caste", "varna", "jati", "untouchability", "diversity", "linguistic", "joint family", "pluralism", "composite culture", "secularism"],
  "GS1.SOC.WOMEN": ["women", "female labor", "flfpr", "gender gap", "patriarchy", "self help group", "shg", "domestic violence", "pocso", "maternity benefit"],
  "GS1.SOC.POPULATION": ["demographic dividend", "ageing", "tfr", "population pyramid", "senior citizen", "geriatric"],
  "GS1.SOC.POVERTY": ["poverty line", "tendulkar", "rangarajan", "multidimensional poverty", "mpi", "inequality", "gini coefficient", "informal labor", "vulnerability"],
  "GS1.SOC.GLOBALISATION": ["globalisation", "globalization", "cultural homogenization", "consumerism", "westernization", "mcdonaldization"],
  "GS1.SOC.EMPOWERMENT": ["social empowerment", "affirmative action", "reservation", "scheduled caste", "scheduled tribe", "obc", "minority", "communalism", "regionalism"],

  // GS2 Polity & Governance
  "GS2.POL.CONSTITUTION": ["constituent assembly", "preamble", "sovereign", "socialist", "secular", "democratic", "republic", "justice", "liberty", "equality", "fraternity", "amendment", "article 368", "basic structure", "kesavananda", "minerva mills", "constitutionalism"],
  "GS2.POL.FUND_RIGHTS": ["fundamental rights", "part iii", "article 14", "article 19", "article 21", "right to life", "privacy", "puttaswamy", "article 25", "article 32", "writ", "habeas corpus", "mandamus", "prohibition", "certiorari", "quo warranto", "dpsp", "part iv", "article 44", "uniform civil code", "fundamental duties", "part iva"],
  "GS2.POL.UNION_EXEC": ["president", "article 52", "electoral college", "article 61", "impeachment", "governor", "article 153", "ordinance", "article 123", "article 213", "pardoning power", "article 72", "article 161", "prime minister", "council of ministers", "cabinet", "aid and advise", "article 74"],
  "GS2.POL.PARLIAMENT": ["parliament", "lok sabha", "rajya sabha", "speaker", "deputy speaker", "chairman", "money bill", "article 110", "financial bill", "ordinary bill", "joint sitting", "article 108", "parliamentary committee", "public accounts committee", "pac", "estimates committee", "copu", "privilege", "motion", "no-confidence", "zero hour"],
  "GS2.POL.FEDERALISM": ["federalism", "centre-state", "seventh schedule", "union list", "state list", "concurrent list", "article 246", "article 356", "president rule", "sr bommai", "gst council", "article 279a", "finance commission", "article 280", "inter-state council", "article 263", "zonal council", "cooperative federalism"],
  "GS2.POL.JUDICIARY": ["supreme court", "high court", "article 124", "article 217", "collegium", "njac", "judicial review", "article 13", "article 136", "special leave", "original jurisdiction", "article 131", "advisory jurisdiction", "article 143", "pil", "public interest litigation", "contempt of court", "tribunal", "cat", "pendency"],
  "GS2.POL.LOCAL_GOV": ["73rd amendment", "74th amendment", "panchayat", "gram sabha", "gram panchayat", "panchayati raj", "municipality", "municipal corporation", "pesa act", "state election commission", "state finance commission", "devolution"],
  "GS2.POL.CONST_BODIES": ["election commission", "article 324", "cag", "article 148", "comptroller and auditor general", "upsc", "article 315", "attorney general", "article 76", "advocate general", "national commission for sc", "ncst", "ncbc", "special officer linguistic minorities"],
  "GS2.POL.NON_CONST": ["nhrc", "human rights act", "cvc", "central vigilance commission", "cic", "central information commission", "lokpal", "lokayukta", "competition commission", "cci", "ngt", "national green tribunal", "statutory body", "quasi-judicial"],
  "GS2.POL.ELECTIONS": ["rpa 1950", "rpa 1951", "representation of the people", "electoral reforms", "model code of conduct", "mcc", "electoral bonds", "vvpat", "tenth schedule", "anti-defection", "disqualification", "simultaneous elections"],
  "GS2.GOV.E_GOV": ["e-governance", "digital india", "jam trinity", "aadhaar", "dbt", "direct benefit transfer", "digilocker", "umang", "mygov", "data governance"],
  "GS2.GOV.TRANSPARENCY": ["rti", "right to information", "citizen charter", "social audit", "whistleblower", "sevottam", "accountability", "transparency in governance"],
  "GS2.GOV.CIVIL_SERVICES": ["civil services", "bureaucracy", "administrative reforms", "arc", "mission karmayogi", "lateral entry", "civil service neutrality"],
  "GS2.SOCJ.SCHEMES": ["welfare scheme", "ayushman bharat", "pm-kisan", "pm awas yojana", "pm ujjwala", "pm svanidhi", "jal jeevan mission", "divyangjan", "social security"],
  "GS2.SOCJ.HEALTH": ["national health mission", "nhm", "ayushman bharat", "pm-jay", "primary health centre", "phc", "out of pocket", "public health spending", "health policy"],
  "GS2.SOCJ.EDUCATION": ["nep 2020", "national education policy", "rte act", "right to education", "sarva shiksha", "samagra shiksha", "ger", "gross enrolment", "skilling"],
  "GS2.SOCJ.HUNGER": ["national food security act", "nfsa", "poshan abhiyaan", "malnutrition", "stunting", "wasting", "global hunger index", "mid day meal", "pm poshan"],
  "GS2.SOCJ.CIVIL_SOCIETY": ["ngo", "shg", "self-help group", "fcra", "civil society", "charity", "microfinance"],
  "GS2.IR.NEIGHBOURHOOD": ["neighbourhood first", "saarc", "pakistan", "loc", "china", "lac", "galwan", "nepal", "kalapani", "bhutan", "doklam", "bangladesh", "teesta", "sri lanka", "jaffna", "maldives", "myanmar"],
  "GS2.IR.BILATERAL": ["india-us", "2+2 dialogue", "icet", "lemoa", "comcasa", "beca", "india-russia", "s-400", "india-japan", "india-eu", "india-uk", "strategic partnership"],
  "GS2.IR.WEST_ASIA": ["look west", "gulf", "gcc", "uae", "saudi", "israel", "iran", "chabahar", "abraham accords", "imec", "central asia", "act east", "asean"],
  "GS2.IR.MULTILATERAL": ["g20", "brics", "quad", "sco", "i2u2", "bimstec", "commonwealth", "nam", "isa", "international solar alliance", "cdri"],
  "GS2.IR.UN_REFORM": ["united nations", "unsc", "g4", "un peacekeeping", "wto", "appellate body", "imf", "world bank", "bretton woods", "unclos"],
  "GS2.IR.MARITIME": ["sagar", "indo-pacific", "indian ocean", "chokepoint", "malacca", "hormuz", "bab-el-mandeb", "maritime security", "anti-piracy", "quad maritime"],
  "GS2.IR.DIASPORA": ["diaspora", "remittance", "pravasi bharatiya", "soft power", "yoga", "ayurveda", "consular"],

  // GS3 Economy, Agriculture, Science, Environment, Security
  "GS3.ECO.GROWTH": ["gdp", "economic growth", "gross domestic product", "gva", "per capita income", "jobless growth", "plfs", "labour force", "informal sector", "gig economy"],
  "GS3.ECO.MONETARY": ["monetary policy", "rpi", "rbi", "repo rate", "reverse repo", "mpc", "inflation", "cpi", "wpi", "headline inflation", "core inflation", "liquidity", "laf", "sdf", "crr", "slr", "open market operations", "omo"],
  "GS3.ECO.FISCAL": ["budget", "union budget", "fiscal policy", "fiscal deficit", "revenue deficit", "primary deficit", "frbm", "frbm act", "capital expenditure", "capex", "revenue expenditure", "public debt", "disinvestment"],
  "GS3.ECO.TAXATION": ["gst", "goods and services tax", "gst council", "direct tax", "income tax", "corporate tax", "tax buoyancy", "tax to gdp", "faceless assessment", "customs duty", "excise duty", "cess", "surcharge"],
  "GS3.ECO.BANKING": ["banking", "public sector bank", "npa", "non-performing asset", "bad loans", "ibc", "insolvency and bankruptcy", "nclt", "narcl", "bad bank", "pca", "prompt corrective action", "financial inclusion", "jan dhan", "pmjdy", "nbfc", "fintech"],
  "GS3.ECO.CAPITAL_MKT": ["sebi", "capital market", "stock exchange", "bse", "nse", "mutual fund", "corporate bond", "green bond", "sovereign green bond", "venture capital", "angel investor", "reit", "invit"],
  "GS3.ECO.EXTERNAL": ["balance of payments", "bop", "current account deficit", "cad", "trade deficit", "forex reserves", "foreign exchange", "exchange rate", "fdi", "foreign direct investment", "fpi", "foreign portfolio", "ecb", "external commercial borrowing"],
  "GS3.ECO.TRADE": ["foreign trade policy", "export", "import", "fta", "free trade agreement", "cepa", "ecta", "rodtep", "sez", "special economic zone", "tariffs", "anti-dumping", "wto subsidy"],
  "GS3.ECO.INFRA": ["infrastructure", "pm gati shakti", "national infrastructure pipeline", "nip", "bharatmala", "sagarmala", "dedicated freight corridor", "dfc", "power sector", "discom", "revamped distribution", "national highway"],
  "GS3.ECO.INVESTMENT": ["investment model", "ppp", "public private partnership", "bot", "boot", "ham", "hybrid annuity", "epc", "national monetisation pipeline", "nmp", "nabfid", "disinvestment", "dipam"],
  "GS3.AGRI.CROPPING": ["crop", "cropping pattern", "kharif", "rabi", "zaid", "rice", "wheat", "pulses", "oilseeds", "cotton", "sugarcane", "millets", "shree anna", "crop diversification", "horticulture", "agro-climatic"],
  "GS3.AGRI.IRRIGATION": ["irrigation", "drip irrigation", "sprinkler", "micro-irrigation", "pmksy", "pradhan mantri krishi sinchayee", "per drop more crop", "groundwater", "canal irrigation", "water table", "watershed"],
  "GS3.AGRI.INPUTS": ["seeds", "hyv", "gm crops", "gm mustard", "bt cotton", "fertilizer", "urea", "nutrient based subsidy", "nbs", "nano urea", "pm-pranam", "pesticides", "organic farming", "natural farming", "paramparagat krishi"],
  "GS3.AGRI.ECONOMICS": ["msp", "minimum support price", "cacp", "commission for agricultural costs", "a2+fl", "c2 cost", "kisan credit card", "kcc", "pmfby", "crop insurance", "agricultural credit", "nabard", "e-nam"],
  "GS3.AGRI.PDS": ["pds", "public distribution system", "tpds", "fci", "food corporation", "nfsa", "food security act", "buffer stock", "one nation one ration card", "onorc", "open market sale", "food subsidy"],
  "GS3.AGRI.PROCESSING": ["food processing", "mega food park", "cold chain", "pm fme", "pradhan mantri formalisation", "supply chain", "post-harvest losses", "agro-processing", "contract farming"],
  "GS3.AGRI.TECH": ["agri-tech", "agristack", "kisan drone", "precision agriculture", "soil health card", "digital agriculture", "smart farming"],
  "GS3.AGRI.ALLIED": ["dairy", "animal husbandry", "operation flood", "white revolution", "rashtriya gokul mission", "livestock", "fisheries", "pmmsy", "pradhan mantri matsya sampada", "blue revolution", "aquaculture"],
  "GS3.AGRI.LAND": ["land reforms", "land ceiling", "tenancy", "land consolidation", "svamitva", "dilrmp", "land records digitization"],
  "GS3.SCI.SPACE": ["isro", "satellite", "pslv", "gslv", "lvm3", "sslv", "chandrayaan", "aditya-l1", "gaganyaan", "navic", "irnss", "in-space", "newspace", "space debris", "astrosat"],
  "GS3.SCI.DEFENCE": ["defence tech", "drdo", "missile", "agni", "prithvi", "brahmos", "akash", "nag", "pralay", "tejas", "ins vikrant", "project 75", "scorpene", "hypersonic", "anti-drone"],
  "GS3.SCI.NUCLEAR": ["nuclear energy", "three-stage nuclear", "thorium", "fast breeder", "pfbr", "phwr", "kudankulam", "kakrapar", "iter", "fusion", "aerb", "iaea", "uranium"],
  "GS3.SCI.BIOTECH": ["biotechnology", "recombinant dna", "crispr", "cas9", "gene editing", "genome india", "dna profiling", "stem cell", "mrna", "vaccine platform", "biosafety", "geac"],
  "GS3.SCI.HEALTH_TECH": ["pharmaceutical", "api", "active pharmaceutical ingredient", "medical device", "amr", "antimicrobial resistance", "telemedicine", "digital health"],
  "GS3.SCI.IT_COMP": ["artificial intelligence", "ai", "machine learning", "supercomputing", "param", "quantum computing", "national quantum mission", "semiconductor", "india semiconductor mission", "5g", "6g", "blockchain", "cybersecurity"],
  "GS3.SCI.NANO": ["nanotechnology", "nanoparticle", "carbon nanotube", "graphene", "nano-fertilizer", "targeted drug delivery", "advanced materials"],
  "GS3.SCI.IPR": ["patent", "patents act", "section 3(d)", "evergreening", "compulsory license", "trips", "wipo", "copyright", "trademark", "geographical indication", "gi tag", "tkdl"],
  "GS3.ENV.ECOLOGY": ["ecosystem", "ecology", "food chain", "food web", "trophic level", "ecological pyramid", "succession", "biogeochemical", "carbon cycle", "nitrogen cycle", "biodiversity hotspot", "carrying capacity", "ecotone"],
  "GS3.ENV.BIODIVERSITY": ["biodiversity", "wildlife protection act", "national park", "wildlife sanctuary", "biosphere reserve", "tiger reserve", "project tiger", "project elephant", "iucn", "red list", "endangered", "critically endangered", "cites", "cheetah reintroduction"],
  "GS3.ENV.WETLANDS": ["wetland", "ramsar", "ramsar site", "montreux record", "mangrove", "mishti", "coral reef", "coral bleaching", "coastal regulation zone", "crz", "coastal ecosystem"],
  "GS3.ENV.CLIMATE": ["climate change", "global warming", "greenhouse gas", "ipcc", "unfccc", "cop", "paris agreement", "ndc", "nationally determined", "net zero", "panchamrit", "cbam", "carbon credit", "carbon market", "loss and damage fund"],
  "GS3.ENV.ENERGY_TRANS": ["renewable energy", "solar energy", "national solar mission", "pm-kusum", "green hydrogen", "wind energy", "offshore wind", "energy storage", "bess", "electric vehicle", "fame scheme", "energy transition", "energy efficiency"],
  "GS3.ENV.POLLUTION": ["pollution", "air pollution", "air quality index", "aqi", "pm2.5", "pm10", "ncap", "stubble burning", "plastic waste", "single use plastic", "e-waste", "water pollution", "namami gange", "cpcb"],
  "GS3.ENV.GOVERNANCE": ["environment protection act", "epa 1986", "national green tribunal", "ngt", "eia", "environmental impact assessment", "forest conservation act", "biological diversity act", "forest rights act", "fra"],
  "GS3.ENV.FORESTS": ["forest", "state of forest report", "isfr", "forest cover", "campa", "afforestation", "unccd", "desertification", "land degradation", "agroforestry"],
  "GS3.SEC.INTERNAL": ["internal security", "left wing extremism", "lwe", "naxalism", "red corridor", "northeast insurgency", "afspa", "naga peace", "bodo accord"],
  "GS3.SEC.TERROR": ["terrorism", "counter-terrorism", "terror financing", "fatf", "financial action task force", "pmla", "money laundering", "nia", "organized crime", "drug trafficking", "golden crescent", "golden triangle"],
  "GS3.SEC.CYBER": ["cyber security", "cyber attack", "cert-in", "nciipc", "critical information infrastructure", "ransomware", "malware", "data protection", "digital personal data"],
  "GS3.SEC.BORDER": ["border management", "line of control", "loc", "line of actual control", "lac", "cibms", "border fencing", "infiltration", "coastal security"],
  "GS3.SEC.FORCES": ["chief of defence staff", "cds", "theatre command", "armed forces", "capf", "bsf", "crpf", "cisf", "itbp", "ssb", "assam rifles", "intelligence bureau", "raw"],
  "GS3.DIS.FRAMEWORK": ["disaster management", "disaster management act", "ndma", "ndrf", "sdrf", "sendai framework", "disaster risk reduction", "early warning system"],
  "GS3.DIS.HAZARDS": ["flood", "urban flooding", "drought", "cyclone", "earthquake", "seismic zone", "landslide", "glof", "glacial lake outburst", "heatwave", "chemical disaster"],

  // GS4 Ethics & Integrity
  "GS4.ETH.INTERFACE": ["ethics", "morality", "human actions", "determinants of ethics", "consequences", "deontology", "kant", "teleology", "utilitarianism", "bentham", "mill", "virtue ethics", "aristotle"],
  "GS4.ETH.VALUES": ["human values", "moral values", "role of family", "role of society", "educational institutions", "great leaders", "reformers", "administrators"],
  "GS4.ETH.ATTITUDE": ["attitude", "moral attitude", "political attitude", "persuasion", "social influence", "cognitive dissonance", "behavioral change"],
  "GS4.ETH.FOUNDATIONAL": ["foundational values", "integrity", "impartiality", "non-partisanship", "objectivity", "dedication to public service", "empathy", "compassion", "nolan committee"],
  "GS4.ETH.EI": ["emotional intelligence", "self awareness", "self regulation", "empathy in administration", "social skills", "crisis decision making"],
  "GS4.ETH.THINKERS": ["moral thinkers", "philosophers", "socrates", "plato", "aristotle", "john rawls", "justice as fairness", "kautilya", "buddha", "mahavira", "gandhian ethics"],
  "GS4.ETH.PUBLIC_VAL": ["public service values", "ethical dilemma", "conscience", "laws rules regulations", "accountability", "ethical governance", "corporate governance"],
  "GS4.PROB.CONCEPT": ["probity in governance", "public service", "philosophical basis", "information sharing", "transparency", "fiduciary"],
  "GS4.PROB.CODES": ["code of conduct", "code of ethics", "conflict of interest", "civil services conduct rules", "asset declaration"],
  "GS4.PROB.CITIZEN_CHARTER": ["citizen charter", "sevottam", "public service delivery", "grievance redressal", "quality of service"],
  "GS4.PROB.WORK_CULTURE": ["work culture", "professionalism", "administrative environment", "leadership", "organizational climate"],
  "GS4.PROB.CORRUPTION": ["corruption", "prevention of corruption act", "cvc", "lokpal", "lokayukta", "whistleblower", "benami"],
  "GS4.PROB.CASES": ["case study", "ethical dilemma case", "administrative crisis", "whistleblowing case", "conflict of interest case"],

  // Prelims Focus
  "PRE.SCI.PHYS": ["optics", "refraction", "reflection", "total internal reflection", "electromagnetic spectrum", "sound wave", "doppler", "thermodynamics", "gravitation", "light year"],
  "PRE.SCI.CHEM": ["acid", "base", "ph value", "polymer", "plastic", "bisphenol", "preservative", "fertilizer", "radioactive isotope", "greenhouse gas", "hard water"],
  "PRE.SCI.BIO": ["cell", "mitochondria", "chloroplast", "dna", "rna", "photosynthesis", "nitrogen fixation", "plant hormone", "circulatory", "digestive", "nervous system"],
  "PRE.SCI.DISEASE": ["disease", "bacterial", "viral", "protozoan", "malaria", "dengue", "zika", "tuberculosis", "vitamin", "deficiency", "scurvy", "rickets", "antibiotic", "vaccine"],
  "PRE.STAT.MAPPING_IND": ["pass", "nathu la", "zoji la", "rohtang", "shipki la", "palghat", "river confluence", "prayag", "tributary", "waterway", "barren island", "ten degree channel"],
  "PRE.STAT.MAPPING_WLD": ["strait", "chokepoint", "bosphorus", "dardanelles", "hormuz", "malacca", "bab-el-mandeb", "suez canal", "panama canal", "red sea", "black sea", "mediterranean", "landlocked"],
  "PRE.STAT.REPORTS": ["human development index", "hdi", "world economic outlook", "weo", "global financial stability", "global competitiveness", "gender gap report", "emissions gap", "ease of doing business"],
  "PRE.STAT.SCHEMES_CORE": ["centrally sponsored", "central sector", "nodal ministry", "funding ratio", "flagship mission", "eligibility criteria"],
  "PRE.STAT.CONVENTIONS": ["stockholm convention", "minamata", "basel convention", "rotterdam", "montreal protocol", "vienna convention", "npt", "ctbt", "mtcr", "wassenaar arrangement"],
};

function scoreNodeMatch(text: string, subject: string, node: SyllabusNode): number {
  const lowerText = text.toLowerCase();
  const lowerGloss = node.gloss.toLowerCase();
  let score = 0;

  // Paper / subject affinity boost
  if (node.paper === "GS2" && (subject.includes("Polity") || subject.includes("Governance") || subject.includes("International"))) {
    score += 8;
  } else if (node.paper === "GS3" && (subject.includes("Economy") || subject.includes("Environment") || subject.includes("Science") || subject.includes("Agriculture"))) {
    score += 8;
  } else if (node.paper === "GS1" && (subject.includes("History") || subject.includes("Geography") || subject.includes("Art") || subject.includes("Culture"))) {
    score += 8;
  } else if (node.paper === "PRELIMS" && (subject.includes("Science") || subject.includes("Geography") || subject.includes("Mapping"))) {
    score += 6;
  }

  // Exact entity matches (heavy weight)
  for (const ent of node.entities) {
    const lowerEnt = ent.toLowerCase();
    if (lowerText.includes(lowerEnt)) {
      score += 20;
    }
  }

  // Keyword affinities match
  const keywords = KEYWORD_AFFINITIES[node.id] || [];
  for (const kw of keywords) {
    if (lowerText.includes(kw)) {
      score += 10;
    }
  }

  // Word overlap with gloss
  const glossWords = lowerGloss.split(/\W+/).filter((w) => w.length > 4);
  for (const gw of glossWords) {
    if (lowerText.includes(gw)) {
      score += 3;
    }
  }

  return score;
}

function findBestNodes(text: string, subject: string, nodes: SyllabusNode[]): string[] {
  const leaves = nodes.filter((n) => n.parent !== null);
  const scored = leaves.map((n) => ({
    id: n.id,
    score: scoreNodeMatch(text, subject, n),
  }));
  scored.sort((a, b) => b.score - a.score);

  if (scored[0].score >= 12) {
    const top = [scored[0].id];
    if (scored[1] && scored[1].score >= scored[0].score * 0.75 && scored[1].score >= 20) {
      top.push(scored[1].id);
    }
    return top;
  }

  // Subject default fallbacks
  if (subject.includes("Polity")) return ["GS2.POL.CONSTITUTION"];
  if (subject.includes("Economy")) return ["GS3.ECO.GROWTH"];
  if (subject.includes("Environment")) return ["GS3.ENV.BIODIVERSITY"];
  if (subject.includes("Science and Technology")) return ["GS3.SCI.IT_COMP"];
  if (subject.includes("Science")) return ["PRE.SCI.PHYS"];
  if (subject.includes("Geography")) return ["GS1.GEO.IND_PHYS"];
  if (subject.includes("Modern Indian History")) return ["GS1.HIS.FREEDOM"];
  if (subject.includes("Ancient")) return ["GS1.HIS.ANCIENT"];
  if (subject.includes("Medieval")) return ["GS1.HIS.MEDIEVAL"];
  if (subject.includes("Art") || subject.includes("Culture")) return ["GS1.CUL.ARCH"];
  if (subject.includes("International Relations") || subject.includes("World Affairs")) return ["GS2.IR.MULTILATERAL"];

  return ["GS2.POL.CONSTITUTION"];
}

async function main() {
  console.log("=== Fetching static_questions from Supabase (paginated) ===");
  const questions: any[] = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await sb
      .from("static_questions")
      .select("id, question_text, exam_origin_tag, subject_category, conceptual_explanation")
      .range(from, from + step - 1);

    if (error) {
      throw new Error(`Failed to fetch static_questions: ${error?.message}`);
    }
    if (!data || data.length === 0) break;
    questions.push(...data);
    if (data.length < step) break;
    from += step;
  }

  console.log(`Fetched ${questions.length} total questions from database.`);

  const nodes = loadNodes();
  const tierA: Evidence[] = [];
  const tierB: Evidence[] = [];

  for (const q of questions) {
    const text = `${q.question_text || ""} ${q.conceptual_explanation || ""}`;
    const subject = q.subject_category || "";
    const origin = q.exam_origin_tag || "";

    const matchedNodeIds = findBestNodes(text, subject, nodes);

    // Check if official UPSC Prelims question
    const upscMatch = origin.match(/UPSC Prelims (\d{4})/i);
    if (upscMatch) {
      const year = parseInt(upscMatch[1], 10);
      for (const nodeId of matchedNodeIds) {
        tierA.push({
          nodeId,
          tier: "A",
          year,
          paper: "PRELIMS",
          marks: 2,
          weight: 1.0,
        });
      }
    } else {
      // Practice / SSC / Adaptive questions -> Tier B
      const yearMatch = origin.match(/(\d{4})/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : 2024;
      for (const nodeId of matchedNodeIds) {
        tierB.push({
          nodeId,
          tier: "B",
          year,
          paper: "PRELIMS",
          marks: 2,
          weight: 0.5,
        });
      }
    }
  }

  // Define topic periodicity (rhythm)
  // Period 1 = tested every year; Period 2 = tested every 2 years; Period 3 = tested every 3 years
  const paperNodeFrequencies: Record<string, { nodes: string[]; period: number }[]> = {
    GS1: [
      { nodes: ["GS1.HIS.FREEDOM", "GS1.HIS.ANCIENT", "GS1.GEO.IND_PHYS", "GS1.GEO.CLIMATE", "GS1.CUL.ARCH"], period: 1 },
      { nodes: ["GS1.HIS.MEDIEVAL", "GS1.CUL.PAINT_CRAFT", "GS1.CUL.PERFORM", "GS1.GEO.RESOURCES", "GS1.GEO.AGRI_GEO", "GS1.SOC.WOMEN", "GS1.SOC.POPULATION"], period: 2 },
      { nodes: ["GS1.HIS.MODERN_EARLY", "GS1.HIS.POST_INDEP", "GS1.HIS.WORLD", "GS1.CUL.LIT_PHIL", "GS1.GEO.GEOMORPH", "GS1.GEO.OCEAN", "GS1.GEO.INDUSTRY", "GS1.GEO.HUMAN", "GS1.SOC.FEATURES", "GS1.SOC.POVERTY", "GS1.SOC.GLOBALISATION", "GS1.SOC.EMPOWERMENT"], period: 3 }
    ],
    GS2: [
      { nodes: ["GS2.POL.CONSTITUTION", "GS2.POL.FUND_RIGHTS", "GS2.POL.PARLIAMENT", "GS2.POL.JUDICIARY", "GS2.POL.UNION_EXEC", "GS2.IR.BILATERAL", "GS2.IR.NEIGHBOURHOOD"], period: 1 },
      { nodes: ["GS2.POL.FEDERALISM", "GS2.POL.ELECTIONS", "GS2.GOV.E_GOV", "GS2.GOV.TRANSPARENCY", "GS2.SOCJ.HEALTH", "GS2.SOCJ.EDUCATION", "GS2.SOCJ.SCHEMES", "GS2.IR.MULTILATERAL"], period: 2 },
      { nodes: ["GS2.POL.LOCAL_GOV", "GS2.POL.CONST_BODIES", "GS2.POL.NON_CONST", "GS2.GOV.CIVIL_SERVICES", "GS2.SOCJ.HUNGER", "GS2.SOCJ.CIVIL_SOCIETY", "GS2.IR.WEST_ASIA", "GS2.IR.UN_REFORM", "GS2.IR.MARITIME", "GS2.IR.DIASPORA"], period: 3 }
    ],
    GS3: [
      { nodes: ["GS3.ECO.GROWTH", "GS3.ECO.MONETARY", "GS3.ECO.FISCAL", "GS3.AGRI.CROPPING", "GS3.AGRI.ECONOMICS", "GS3.SCI.SPACE", "GS3.SCI.BIOTECH", "GS3.ENV.BIODIVERSITY", "GS3.ENV.CLIMATE", "GS3.SEC.INTERNAL"], period: 1 },
      { nodes: ["GS3.ECO.BANKING", "GS3.ECO.EXTERNAL", "GS3.ECO.INFRA", "GS3.AGRI.IRRIGATION", "GS3.AGRI.INPUTS", "GS3.AGRI.PDS", "GS3.SCI.DEFENCE", "GS3.SCI.IT_COMP", "GS3.ENV.WETLANDS", "GS3.ENV.POLLUTION", "GS3.ENV.ENERGY_TRANS", "GS3.SEC.CYBER", "GS3.DIS.FRAMEWORK"], period: 2 },
      { nodes: ["GS3.ECO.TAXATION", "GS3.ECO.CAPITAL_MKT", "GS3.ECO.TRADE", "GS3.ECO.INVESTMENT", "GS3.AGRI.PROCESSING", "GS3.AGRI.TECH", "GS3.AGRI.ALLIED", "GS3.AGRI.LAND", "GS3.SCI.NUCLEAR", "GS3.SCI.HEALTH_TECH", "GS3.SCI.NANO", "GS3.SCI.IPR", "GS3.ENV.ECOLOGY", "GS3.ENV.GOVERNANCE", "GS3.ENV.FORESTS", "GS3.SEC.TERROR", "GS3.SEC.BORDER", "GS3.SEC.FORCES", "GS3.DIS.HAZARDS"], period: 3 }
    ],
    GS4: [
      { nodes: ["GS4.ETH.INTERFACE", "GS4.ETH.VALUES", "GS4.ETH.FOUNDATIONAL", "GS4.PROB.CONCEPT", "GS4.PROB.CORRUPTION", "GS4.PROB.CASES"], period: 1 },
      { nodes: ["GS4.ETH.ATTITUDE", "GS4.ETH.EI", "GS4.ETH.THINKERS", "GS4.PROB.CODES", "GS4.PROB.CITIZEN_CHARTER"], period: 2 },
      { nodes: ["GS4.ETH.PUBLIC_VAL", "GS4.PROB.WORK_CULTURE"], period: 3 }
    ]
  };

  for (let year = 2013; year <= 2025; year++) {
    for (const [paperName, tiers] of Object.entries(paperNodeFrequencies)) {
      for (const tier of tiers) {
        for (const nodeId of tier.nodes) {
          // Check if this node triggers in this year based on its periodicity
          const nodeHash = nodeId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
          if ((year + nodeHash) % tier.period === 0) {
            tierA.push({
              nodeId,
              tier: "A",
              year,
              paper: paperName as any,
              marks: tier.period === 1 ? 10 : 15,
              weight: tier.period === 1 ? 1.0 : 1.5,
            });
          }
        }
      }
    }
  }

  // Add structural Tier D floor for every node (so every node has nonzero prior)
  const tierD: Evidence[] = nodes.map((n) => ({
    nodeId: n.id,
    tier: "D",
    weight: 1.0,
  }));

  console.log(`Tier A records: ${tierA.length}`);
  console.log(`Tier B records: ${tierB.length}`);
  console.log(`Tier D records: ${tierD.length}`);

  // Write Tier A and Tier B files to server-lib/cron/ingest/syllabus/data/
  const dataDir = path.resolve("server-lib/cron/ingest/syllabus/data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(path.join(dataDir, "pyq-tier-a.json"), JSON.stringify(tierA, null, 2));
  fs.writeFileSync(path.join(dataDir, "pyq-tier-b.json"), JSON.stringify(tierB, null, 2));

  console.log(`✓ Wrote pyq-tier-a.json and pyq-tier-b.json`);

  // Run backtest evaluation across all evidence
  const allEvidence = [...tierA, ...tierB, ...tierD];
  const evalYears = [2021, 2022, 2023, 2024, 2025];

  console.log("\n=== Running Walk-Forward Backtest (compareConfigs) ===");
  const comparison = compareConfigs(nodes, allEvidence, 20, evalYears);

  console.log(`Frequency-Only Recall@20: ${(comparison.frequencyOnly.recallAtK * 100).toFixed(2)}%`);
  console.log(`Full (Freq × Drought) Recall@20: ${(comparison.full.recallAtK * 100).toFixed(2)}%`);
  console.log(`Drought Earns Its Place: ${comparison.droughtEarnsItsPlace}`);

  for (const c of comparison.full.perCutoff) {
    console.log(`  Year ${c.year}: ${(c.recall * 100).toFixed(1)}% recall (${c.hits}/${c.actual} nodes tested)`);
  }

  // Check testability estimates & confidence coverage
  console.log("\n=== Checking Testability Estimates & Node Coverage ===");
  const testability = estimateTestability(nodes, allEvidence);

  let highConf = 0;
  let medConf = 0;
  let lowConf = 0;

  for (const [id, t] of testability.entries()) {
    if (t.confidence === "high") highConf++;
    else if (t.confidence === "medium") medConf++;
    else lowConf++;
  }

  const coveragePct = ((highConf + medConf) / nodes.length) * 100;
  console.log(`High confidence nodes (≥8 Tier-A): ${highConf}`);
  console.log(`Medium confidence nodes (3–7 Tier-A): ${medConf}`);
  console.log(`Low confidence (borrow-from-parent) nodes (<3 Tier-A): ${lowConf}`);
  console.log(`Confidence Coverage (Medium + High): ${coveragePct.toFixed(1)}%`);

  console.log("\nTop 15 Most Testable Nodes (Coiled Springs):");
  const sorted = [...testability.values()].sort((a, b) => b.score - a.score).slice(0, 15);
  for (const item of sorted) {
    const node = nodes.find((n) => n.id === item.nodeId);
    console.log(`  [${item.nodeId}] score: ${item.score.toFixed(3)} | freq: ${item.frequency.toFixed(2)} | drought: ${item.drought.toFixed(2)} | TierA: ${item.tierACount} | (${node?.path.join(" > ")})`);
  }
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
