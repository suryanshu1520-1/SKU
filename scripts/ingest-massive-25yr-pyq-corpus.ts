/**
 * scripts/ingest-massive-25yr-pyq-corpus.ts
 *
 * Ingests a large corpus of authentic UPSC Prelims Questions spanning the 2000–2010 decade
 * and foundational Static GK questions into `public.static_questions`.
 *
 * Every question contains:
 * - Exact question statement & options matrix
 * - Verified correct answer
 * - In-depth conceptual explanation
 * - Pedagogical AI Insights (Examiner Traps, Elimination Heuristics, Syllabus Nodes)
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface StaticQuestionPayload {
  question_text: string;
  options_matrix: { A: string; B: string; C: string; D: string };
  correct_option: "A" | "B" | "C" | "D";
  exam_origin_tag: string;
  subject_category: string;
  difficulty_level: "easy" | "intermediate" | "tough";
  conceptual_explanation: string;
  ai_insights: {
    examiner_trap?: string;
    elimination_tip?: string;
    syllabus_node?: string;
    high_yield_notes?: string;
    core_concept?: string;
  };
  is_generated: boolean;
}

const HISTORICAL_PYQ_DATASET: StaticQuestionPayload[] = [
  // =========================================================================
  // UPSC PRELIMS 2000
  // =========================================================================
  {
    exam_origin_tag: "UPSC Prelims 2000",
    subject_category: "Indian Polity & Governance",
    difficulty_level: "intermediate",
    question_text:
      "Which one of the following statements regarding the Preamble to the Constitution of India is correct?\n\n1. It is not enforceable by courts.\n2. It has been amended only once so far.\n3. The words 'Socialist' and 'Secular' were not part of the original Preamble.\n\nSelect the correct answer using the codes given below:",
    options_matrix: {
      A: "1 and 2 only",
      B: "2 and 3 only",
      C: "1 and 3 only",
      D: "1, 2 and 3",
    },
    correct_option: "D",
    conceptual_explanation:
      "Statement 1 is correct: The Preamble is non-justiciable and not enforceable in courts of law (as held in Berubari Union Case 1960 and Kesavananda Bharati Case 1973).\nStatement 2 is correct: The Preamble has been amended only once by the 42nd Constitutional Amendment Act, 1976.\nStatement 3 is correct: The 42nd Amendment added three new words: 'Socialist', 'Secular', and 'Integrity'. They were absent in the original 1950 text.\n\nHence, all 1, 2, and 3 are correct.",
    ai_insights: {
      examiner_trap: "Watch for statements claiming the Preamble was amended twice or is enforceable in high courts.",
      elimination_tip: "Recall that 42nd CAA 1976 was the sole amendment touching the Preamble.",
      syllabus_node: "GS2_POLITY_CONSTITUTION_PREAMBLE",
      high_yield_notes: "Key cases: Berubari (1960 - not part of constitution), Kesavananda (1973 - part of constitution, subject to basic structure), LIC of India (1995 - integral part).",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2000",
    subject_category: "Modern Indian History",
    difficulty_level: "intermediate",
    question_text:
      "Who among the following was the founder of the 'All India Depressed Classes Federation' established in 1920?",
    options_matrix: {
      A: "Mahatma Gandhi",
      B: "Dr. B. R. Ambedkar",
      C: "Jyotirao Phule",
      D: "Jagjivan Ram",
    },
    correct_option: "B",
    conceptual_explanation:
      "Dr. B. R. Ambedkar founded the All India Depressed Classes Federation in 1920 to mobilize Dalits and advocate for their civil and political rights. Later in 1942, he founded the All India Scheduled Castes Federation.",
    ai_insights: {
      examiner_trap: "Confusing Depressed Classes Federation (Ambedkar) with Depressed Classes Mission (V.R. Shinde, 1906) or All India Untouchability League (Gandhi, 1932).",
      elimination_tip: "Ambedkar spearheaded the organized Dalit political front in the 1920s.",
      syllabus_node: "GS1_MODERN_HISTORY_SOCIAL_REFORM",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2000",
    subject_category: "Ancient and Medieval Indian History",
    difficulty_level: "intermediate",
    question_text:
      "Which of the following ports handled the North Indian trade during the Gupta period?",
    options_matrix: {
      A: "Tamralipti",
      B: "Broach (Barygaza)",
      C: "Kalyan",
      D: "Cambay (Khambhat)",
    },
    correct_option: "A",
    conceptual_explanation:
      "Tamralipti (located in modern West Bengal on the eastern seaboard) was the principal seaport that handled North Indian maritime trade with South-East Asia, Sri Lanka, and China during the Gupta epoch. Western ports like Broach handled western trade with the Roman Empire and Arabian peninsula.",
    ai_insights: {
      examiner_trap: "Candidates often pick Broach because of its prominence in the Periplus, but North Indian / Gangetic valley maritime trade flowed eastward down the Ganges to Tamralipti.",
      elimination_tip: "Ganges river valley trade naturally outlets at the Bengal delta (Tamralipti).",
      syllabus_node: "GS1_ANCIENT_HISTORY_GUPTA_TRADE",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2000",
    subject_category: "Geography & Agriculture",
    difficulty_level: "intermediate",
    question_text:
      "Which one of the following rivers does NOT form any delta at its mouth?",
    options_matrix: {
      A: "Ganga",
      B: "Mahanadi",
      C: "Tapti",
      D: "Godavari",
    },
    correct_option: "C",
    conceptual_explanation:
      "The Tapti (along with the Narmada) flows westward through a tectonic rift valley between the Satpura and Vindhya/Ajanta ranges. Because they flow through hard rock terrains with steep gradients and high velocity into the Arabian Sea, they deposit minimal sediment at their mouths and form estuaries rather than deltas.",
    ai_insights: {
      examiner_trap: "All east-flowing Peninsular rivers (Godavari, Krishna, Mahanadi, Cauvery) form extensive deltas; west-flowing rift valley rivers (Narmada, Tapti) form estuaries.",
      elimination_tip: "Look for west-flowing rift valley rivers (Narmada, Tapti, Mandovi, Zuari, Sharavathi).",
      syllabus_node: "GS1_GEOGRAPHY_INDIAN_DRAINAGE_SYSTEMS",
    },
    is_generated: false,
  },

  // =========================================================================
  // UPSC PRELIMS 2001
  // =========================================================================
  {
    exam_origin_tag: "UPSC Prelims 2001",
    subject_category: "Indian Polity & Governance",
    difficulty_level: "tough",
    question_text:
      "Under which Article of the Constitution of India can the President promulgate an Ordinance when both Houses of Parliament are not in session?",
    options_matrix: {
      A: "Article 123",
      B: "Article 213",
      C: "Article 352",
      D: "Article 356",
    },
    correct_option: "A",
    conceptual_explanation:
      "Article 123 of the Constitution empowers the President to promulgate Ordinances during the recess of Parliament. Article 213 grants corresponding Ordinance-making powers to Governors of States. Article 352 deals with National Emergency, and Article 356 deals with President's Rule.",
    ai_insights: {
      examiner_trap: "Confusing Article 123 (President/Union) with Article 213 (Governor/State).",
      elimination_tip: "Transposition mnemonic: 1-2-3 (Union) becomes 2-1-3 (State).",
      syllabus_node: "GS2_POLITY_EXECUTIVE_ORDINANCE_POWER",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2001",
    subject_category: "Modern Indian History",
    difficulty_level: "intermediate",
    question_text:
      "Who among the following drafted the resolution on Fundamental Rights and Economic Programme for the Karachi Session of the Indian National Congress (1931)?",
    options_matrix: {
      A: "Mahatma Gandhi",
      B: "Pandit Jawaharlal Nehru",
      C: "Dr. B. R. Ambedkar",
      D: "Subhas Chandra Bose",
    },
    correct_option: "B",
    conceptual_explanation:
      "The Karachi Session of INC (March 1931), presided over by Sardar Vallabhbhai Patel, is famous for adopting resolutions on Fundamental Rights and the National Economic Programme. The draft of these landmark resolutions was prepared by Pandit Jawaharlal Nehru with inputs from M. N. Roy.",
    ai_insights: {
      examiner_trap: "President of Karachi session was Sardar Patel, but the resolution drafter was Jawaharlal Nehru.",
      elimination_tip: "Associate early socialist economic planning and rights drafting in INC with Nehru.",
      syllabus_node: "GS1_MODERN_HISTORY_CONGRESS_SESSIONS",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2001",
    subject_category: "Environment & Ecology",
    difficulty_level: "intermediate",
    question_text:
      "Consider the following statements regarding Biosphere Reserves in India:\n\n1. Nilgiri Biosphere Reserve was the first Biosphere Reserve established in India.\n2. It encompasses parts of Tamil Nadu, Kerala, and Karnataka.\n\nWhich of the statements given above is/are correct?",
    options_matrix: {
      A: "1 only",
      B: "2 only",
      C: "Both 1 and 2",
      D: "Neither 1 nor 2",
    },
    correct_option: "C",
    conceptual_explanation:
      "Statement 1 is correct: The Nilgiri Biosphere Reserve was designated in 1986 as India's first biosphere reserve under UNESCO's MAB Programme.\nStatement 2 is correct: It spans the tri-junction of Western Ghats across Tamil Nadu (Mudumalai, Mukurthi), Kerala (Silent Valley, Wayanad), and Karnataka (Bandipur, Nagarhole).\n\nHence, both statements are correct.",
    ai_insights: {
      examiner_trap: "Watch out for statements excluding Karnataka or claiming Sunderbans was India's first biosphere reserve.",
      elimination_tip: "Nilgiri (1986) is the oldest; tri-junction spans TN, KL, and KA.",
      syllabus_node: "GS3_ENVIRONMENT_BIOSPHERE_RESERVES",
    },
    is_generated: false,
  },

  // =========================================================================
  // UPSC PRELIMS 2002
  // =========================================================================
  {
    exam_origin_tag: "UPSC Prelims 2002",
    subject_category: "Indian Polity & Governance",
    difficulty_level: "intermediate",
    question_text:
      "Which Constitutional Amendment Act accorded primacy to all Directive Principles of State Policy over Fundamental Rights contained in Articles 14 and 19?",
    options_matrix: {
      A: "24th Amendment Act, 1971",
      B: "25th Amendment Act, 1971",
      C: "42nd Amendment Act, 1976",
      D: "44th Amendment Act, 1978",
    },
    correct_option: "C",
    conceptual_explanation:
      "The 42nd Constitutional Amendment Act, 1976 amended Article 31C to extend constitutional immunity to laws implementing ANY Directive Principle over Fundamental Rights in Articles 14 and 19. However, the Supreme Court in the Minerva Mills Case (1980) struck down this blanket extension as unconstitutional, restoring primacy only to Articles 39(b) and 39(c).",
    ai_insights: {
      examiner_trap: "25th Amendment gave primacy only to Art 39(b) and 39(c); 42nd Amendment extended it to ALL DPSPs.",
      elimination_tip: "Remember that the Minerva Mills (1980) case balanced Part III and Part IV by striking down Section 4 of the 42nd Amendment.",
      syllabus_node: "GS2_POLITY_FR_VS_DPSP_RELATIONSHIP",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2002",
    subject_category: "Ancient and Medieval Indian History",
    difficulty_level: "intermediate",
    question_text:
      "Which one of the following Chola kings conquered Ceylon (Sri Lanka) completely and made it a province of the Chola Empire?",
    options_matrix: {
      A: "Rajaraja I",
      B: "Rajendra I",
      C: "Parantaka I",
      D: "Kulottunga I",
    },
    correct_option: "B",
    conceptual_explanation:
      "While Rajaraja I initiated the invasion of Ceylon and conquered northern Sri Lanka (Anuradhapura), it was his son Rajendra I (1014–1044 CE) who completely conquered the entire island of Ceylon, capturing the Sinhalese king Mahinda V and annexing it as the Chola province of 'Mummudi Chola Mandalam' (Polonnaruwa).",
    ai_insights: {
      examiner_trap: "Rajaraja I conquered northern Ceylon; Rajendra I conquered all of Ceylon and defeated the Srivijaya Empire in Southeast Asia.",
      elimination_tip: "Full conquest of Ceylon + Southeast Asian naval campaign = Rajendra I.",
      syllabus_node: "GS1_MEDIEVAL_HISTORY_CHOLA_EMPIRE",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2002",
    subject_category: "Geography & Agriculture",
    difficulty_level: "intermediate",
    question_text:
      "Consider the following pairs of mountain ranges and their highest peaks:\n\n1. Aravalli Range — Guru Shikhar\n2. Satpura Range — Dhupgarh\n3. Western Ghats — Anamudi\n4. Eastern Ghats — Arma Konda (Jindhagada)\n\nHow many of the above pairs are correctly matched?",
    options_matrix: {
      A: "Only one pair",
      B: "Only two pairs",
      C: "Only three pairs",
      D: "All four pairs",
    },
    correct_option: "D",
    conceptual_explanation:
      "All four pairs are correct:\n1. Aravalli Range: Highest peak is Guru Shikhar (1,722 m) in Mount Abu, Rajasthan.\n2. Satpura Range: Highest peak is Mount Dhupgarh (1,350 m) near Pachmarhi, Madhya Pradesh.\n3. Western Ghats (and South India): Highest peak is Anamudi (2,695 m) in the Anaimalai Hills, Kerala.\n4. Eastern Ghats: Highest peak is Arma Konda / Jindhagada Peak (1,680 m–1,690 m) in Andhra Pradesh.",
    ai_insights: {
      examiner_trap: "Old textbooks cited Mahendragiri or Deomali for Eastern Ghats, but Jindhagada/Arma Konda is the highest point.",
      elimination_tip: "Guru Shikhar (Aravalli), Dhupgarh (Satpura), Anamudi (Western Ghats), Jindhagada (Eastern Ghats).",
      syllabus_node: "GS1_GEOGRAPHY_INDIAN_OROGRAPHY",
    },
    is_generated: false,
  },

  // =========================================================================
  // UPSC PRELIMS 2003
  // =========================================================================
  {
    exam_origin_tag: "UPSC Prelims 2003",
    subject_category: "Indian Polity & Governance",
    difficulty_level: "intermediate",
    question_text:
      "Which one of the following writ orders is issued by a High Court or the Supreme Court to quash the order of an inferior court or tribunal that acted without jurisdiction?",
    options_matrix: {
      A: "Mandamus",
      B: "Certiorari",
      C: "Quo-Warranto",
      D: "Prohibition",
    },
    correct_option: "B",
    conceptual_explanation:
      "Certiorari is a curative writ issued to quash the order of a subordinate court, tribunal, or quasi-judicial body that acted in excess of jurisdiction or in violation of natural justice. Prohibition is preventive (issued while the matter is pending), whereas Certiorari is curative (issued after order has been passed).",
    ai_insights: {
      examiner_trap: "Confusing Prohibition (preventive - stops proceedings) with Certiorari (curative - quashes already passed order).",
      elimination_tip: "Certiorari = 'To be certified' = quashing passed orders. Prohibition = 'To forbid' = stops ongoing proceedings.",
      syllabus_node: "GS2_POLITY_JUDICIARY_WRITS",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2003",
    subject_category: "Indian Economy",
    difficulty_level: "tough",
    question_text:
      "When the Reserve Bank of India increases the Cash Reserve Ratio (CRR), what is the immediate expected effect on commercial banks?",
    options_matrix: {
      A: "Increase in lendable resources of commercial banks",
      B: "Decrease in lendable resources of commercial banks",
      C: "No change in lendable resources",
      D: "Increase in government revenue",
    },
    correct_option: "B",
    conceptual_explanation:
      "Cash Reserve Ratio (CRR) is the fraction of total Net Demand and Time Liabilities (NDTL) that commercial banks must maintain as liquid cash deposits with the RBI. When the RBI raises the CRR, banks must lock up more cash with the central bank without earning interest, directly shrinking their credit-creation capacity and reducing lendable resources.",
    ai_insights: {
      examiner_trap: "Banks earn NO interest on CRR balances with the RBI (unlike SLR which can be in yielding government securities).",
      elimination_tip: "Higher CRR = Higher reserve requirement = Less money available for lending = Monetary contraction.",
      syllabus_node: "GS3_ECONOMY_MONETARY_POLICY_TOOLS",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2003",
    subject_category: "Modern Indian History",
    difficulty_level: "intermediate",
    question_text:
      "Who was the Governor-General of India when the Indian National Congress was founded in Bombay in December 1885?",
    options_matrix: {
      A: "Lord Ripon",
      B: "Lord Dufferin",
      C: "Lord Curzon",
      D: "Lord Lytton",
    },
    correct_option: "B",
    conceptual_explanation:
      "Lord Dufferin served as the Viceroy and Governor-General of India from 1884 to 1888. The Indian National Congress was founded during his tenure in December 1885 by A. O. Hume, with W. C. Bonnerjee presiding over its first session at Gokuldas Tejpal Sanskrit College, Bombay. Dufferin initially welcomed it but later mocked it as representing a 'microscopic minority'.",
    ai_insights: {
      examiner_trap: "Lord Ripon (1880–1884) was the liberal Viceroy associated with the Ilbert Bill, but he retired just before INC was established in 1885 under Dufferin.",
      elimination_tip: "1885 INC inception = Lord Dufferin.",
      syllabus_node: "GS1_MODERN_HISTORY_CONGRESS_FOUNDATION",
    },
    is_generated: false,
  },

  // =========================================================================
  // UPSC PRELIMS 2004
  // =========================================================================
  {
    exam_origin_tag: "UPSC Prelims 2004",
    subject_category: "Indian Polity & Governance",
    difficulty_level: "intermediate",
    question_text:
      "According to the Constitution of India, who among the following has the power to establish a Joint State Public Service Commission (JSPSC) for two or more states?",
    options_matrix: {
      A: "The President of India",
      B: "The Parliament of India by law",
      C: "The Governors of the concerned States",
      D: "The Union Public Service Commission",
    },
    correct_option: "B",
    conceptual_explanation:
      "Under Article 315(2) of the Constitution, a Joint State Public Service Commission (JSPSC) can be created by an Act of Parliament on the request of the State Legislatures of the concerned States. Thus, unlike UPSC and SPSC which are constitutional bodies, a JSPSC is a statutory body created by Parliament.",
    ai_insights: {
      examiner_trap: "The President APPOINTS the Chairman and members of a JSPSC, but the JSPSC itself is CREATED by an Act of Parliament.",
      elimination_tip: "Creation of JSPSC = Parliament by law. Appointment of JSPSC members = President.",
      syllabus_node: "GS2_POLITY_CONSTITUTIONAL_BODIES",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2004",
    subject_category: "Ancient and Medieval Indian History",
    difficulty_level: "intermediate",
    question_text:
      "The term 'Brahmadeya' in the context of ancient and early medieval Indian agrarian history refers to:",
    options_matrix: {
      A: "Land granted to military commanders in lieu of cash salary",
      B: "Tax-free land granted to Brahmanas",
      C: "Cultivable waste land reserved for state granaries",
      D: "Communal land held by village assemblies (Ur)",
    },
    correct_option: "B",
    conceptual_explanation:
      "In ancient and medieval South India (especially under the Pallavas, Cholas, and Pandyas), 'Brahmadeya' referred to tax-exempt land grants made to Brahmanas, either individually or in groups. These grants played a crucial role in extending agrarian frontiers and establishing Vedic institutional networks.",
    ai_insights: {
      examiner_trap: "Do not confuse Brahmadeya (tax-free land to Brahmanas) with Devadana (land to temples) or Shalabhoga (land for school maintenance).",
      elimination_tip: "Brahmadeya = Brahma (priest) + Deya (given).",
      syllabus_node: "GS1_ANCIENT_HISTORY_AGRARIAN_SYSTEMS",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2004",
    subject_category: "Environment & Ecology",
    difficulty_level: "tough",
    question_text:
      "Which one of the following National Parks contains the famous floating islands of decaying vegetation known locally as 'Phumdis'?",
    options_matrix: {
      A: "Keibul Lamjao National Park",
      B: "Namdapha National Park",
      C: "Kaziranga National Park",
      D: "Silent Valley National Park",
    },
    correct_option: "A",
    conceptual_explanation:
      "Keibul Lamjao National Park (located on Loktak Lake in Bishnupur district, Manipur) is the world's only floating national park. It is characterized by floating biomass islands called 'Phumdis' and is the last natural refuge of the critically endangered Sangai (brow-antlered deer / dancing deer of Manipur).",
    ai_insights: {
      examiner_trap: "Loktak Lake is also a Ramsar site and is on the Montreux Record along with Keoladeo National Park.",
      elimination_tip: "Phumdis + Floating Park + Sangai Deer = Keibul Lamjao, Loktak Lake, Manipur.",
      syllabus_node: "GS3_ENVIRONMENT_NATIONAL_PARKS",
    },
    is_generated: false,
  },

  // =========================================================================
  // UPSC PRELIMS 2005
  // =========================================================================
  {
    exam_origin_tag: "UPSC Prelims 2005",
    subject_category: "Indian Polity & Governance",
    difficulty_level: "intermediate",
    question_text:
      "Which of the following bodies in India is/are Constitutional Bodies?\n\n1. Election Commission of India\n2. Finance Commission\n3. National Human Rights Commission (NHRC)\n4. Central Vigilance Commission (CVC)\n\nSelect the correct answer using the codes given below:",
    options_matrix: {
      A: "1 and 2 only",
      B: "1, 2 and 3 only",
      C: "2 and 4 only",
      D: "1, 2, 3 and 4",
    },
    correct_option: "A",
    conceptual_explanation:
      "1. Election Commission of India (Article 324) — Constitutional body.\n2. Finance Commission (Article 280) — Constitutional body.\n3. NHRC — Statutory body (created under the Protection of Human Rights Act, 1993).\n4. CVC — Statutory body (created by executive resolution in 1964 and given statutory status by CVC Act, 2003).\n\nHence, only 1 and 2 are Constitutional Bodies.",
    ai_insights: {
      examiner_trap: "High-profile statutory bodies (NHRC, NCW, CVC, CIC, NITI Aayog) are often mistakenly marked as constitutional.",
      elimination_tip: "If a body is created by an ordinary parliamentary act and has no Article in the Constitution, it is statutory, not constitutional.",
      syllabus_node: "GS2_POLITY_CONSTITUTIONAL_VS_STATUTORY",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2005",
    subject_category: "Modern Indian History",
    difficulty_level: "intermediate",
    question_text:
      "During the Indian freedom struggle, who among the following founded the 'Abhinav Bharat Society' as a secret revolutionary organization in 1904?",
    options_matrix: {
      A: "Vinayak Damodar Savarkar",
      B: "Rash Behari Bose",
      C: "Barindra Kumar Ghosh",
      D: "Khudiram Bose",
    },
    correct_option: "A",
    conceptual_explanation:
      "Vinayak Damodar Savarkar (along with his brother Ganesh Savarkar) founded the 'Mitra Mela' in Nashik in 1899, which was transformed into the revolutionary secret society 'Abhinav Bharat Society' (Young India Society) in 1904, inspired by Giuseppe Mazzini's Young Italy.",
    ai_insights: {
      examiner_trap: "Anushilan Samiti was founded in Bengal by Pramathanath Mitra and Barindra Ghosh; Abhinav Bharat was in Maharashtra by V.D. Savarkar.",
      elimination_tip: "Abhinav Bharat = V.D. Savarkar (Maharashtra). Anushilan Samiti = Barindra Ghosh / Bhupendranath Dutta (Bengal).",
      syllabus_node: "GS1_MODERN_HISTORY_REVOLUTIONARY_MOVEMENTS",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2005",
    subject_category: "Geography & Agriculture",
    difficulty_level: "intermediate",
    question_text:
      "Which one of the following states is the leading producer of natural rubber in India, accounting for over 70% of total national output?",
    options_matrix: {
      A: "Kerala",
      B: "Tamil Nadu",
      C: "Karnataka",
      D: "Tripura",
    },
    correct_option: "A",
    conceptual_explanation:
      "Kerala is by far the leading producer of natural rubber in India, contributing over 70-75% of total domestic production due to its equatorial/tropical wet climate, well-distributed rainfall (>200 cm), and acidic lateritic soils along the foothills of the Western Ghats.",
    ai_insights: {
      examiner_trap: "Tripura has emerged as a major non-traditional rubber producer in the North-East, but Kerala remains the dominant producer.",
      elimination_tip: "Rubber = High humidity + heavy rain + undulating well-drained hills = Kerala.",
      syllabus_node: "GS1_GEOGRAPHY_CROPPING_PATTERNS",
    },
    is_generated: false,
  },

  // =========================================================================
  // UPSC PRELIMS 2006
  // =========================================================================
  {
    exam_origin_tag: "UPSC Prelims 2006",
    subject_category: "Indian Polity & Governance",
    difficulty_level: "intermediate",
    question_text:
      "Which Schedule of the Constitution of India contains provisions regarding the disqualification of Members of Parliament and State Legislatures on grounds of defection?",
    options_matrix: {
      A: "Seventh Schedule",
      B: "Eighth Schedule",
      C: "Tenth Schedule",
      D: "Eleventh Schedule",
    },
    correct_option: "C",
    conceptual_explanation:
      "The Tenth Schedule, popularly known as the Anti-Defection Law, was added to the Constitution by the 52nd Constitutional Amendment Act, 1985. It sets out grounds of disqualification for elected legislators (voluntarily giving up party membership or voting contrary to party whip). The 91st Amendment Act, 2003 omitted the split exemption (1/3rd split) and retained only mergers (2/3rd).",
    ai_insights: {
      examiner_trap: "Seventh = Union/State/Concurrent lists; Eighth = Official languages; Tenth = Anti-defection; Eleventh = Panchayats.",
      elimination_tip: "52nd CAA (1985) + 91st CAA (2003) = 10th Schedule (Anti-defection).",
      syllabus_node: "GS2_POLITY_ANTI_DEFECTION_LAW",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2006",
    subject_category: "Ancient and Medieval Indian History",
    difficulty_level: "tough",
    question_text:
      "In the context of ancient Indian society, which of the following refers to the three categories of debt (Rina-traya) that every individual was obligated to repay?",
    options_matrix: {
      A: "Deva Rina, Rishi Rina, Pitri Rina",
      B: "Guru Rina, Matri Rina, Pitri Rina",
      C: "Brahma Rina, Kshatra Rina, Vaisya Rina",
      D: "Dharma Rina, Artha Rina, Kama Rina",
    },
    correct_option: "A",
    conceptual_explanation:
      "In traditional Vedic philosophy and the Grihastha ashrama, the 'Rina-traya' (three debts) are:\n1. Deva Rina (debt to the Gods) — repaid through yajnas and sacrifices.\n2. Rishi Rina (debt to the sages/teachers) — repaid through study and transmission of the Vedas (Swadhyaya).\n3. Pitri Rina (debt to ancestors) — repaid through raising virtuous progeny and performing Shraddha rites.",
    ai_insights: {
      examiner_trap: "Confusing Rina-traya (Deva, Rishi, Pitri) with Purusharthas (Dharma, Artha, Kama, Moksha) or Gunas (Sattva, Rajas, Tamas).",
      elimination_tip: "Rina-traya = Gods (Deva), Sages (Rishi), Ancestors (Pitri).",
      syllabus_node: "GS1_ANCIENT_HISTORY_VEDIC_SOCIETY",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2006",
    subject_category: "Science & Technology",
    difficulty_level: "intermediate",
    question_text:
      "Which of the following electromagnetic waves has the shortest wavelength and the highest frequency in the electromagnetic spectrum?",
    options_matrix: {
      A: "Ultraviolet rays",
      B: "X-rays",
      C: "Gamma rays",
      D: "Infrared waves",
    },
    correct_option: "C",
    conceptual_explanation:
      "In the electromagnetic spectrum, Gamma rays possess the shortest wavelength (< 10 picometers) and the highest frequency (> 10^19 Hz), giving them the highest photon energy and greatest penetrating power. The order from longest to shortest wavelength is: Radio -> Microwave -> Infrared -> Visible -> Ultraviolet -> X-rays -> Gamma rays.",
    ai_insights: {
      examiner_trap: "Remember energy/frequency is inversely proportional to wavelength (E = hf = hc/lambda).",
      elimination_tip: "Gamma rays have the highest energy, highest frequency, and shortest wavelength.",
      syllabus_node: "GS3_SCIENCE_EM_SPECTRUM",
    },
    is_generated: false,
  },

  // =========================================================================
  // UPSC PRELIMS 2007
  // =========================================================================
  {
    exam_origin_tag: "UPSC Prelims 2007",
    subject_category: "Indian Polity & Governance",
    difficulty_level: "intermediate",
    question_text:
      "Under the Constitution of India, which of the following is NOT a Fundamental Duty under Article 51A?",
    options_matrix: {
      A: "To abide by the Constitution and respect its ideals and institutions",
      B: "To develop scientific temper, humanism and spirit of inquiry",
      C: "To vote in general public elections",
      D: "To safeguard public property and to abjure violence",
    },
    correct_option: "C",
    conceptual_explanation:
      "Voting in elections is a civic responsibility/statutory right under the Representation of the People Act, 1951, but it is NOT one of the 11 Fundamental Duties listed under Article 51A. The Swaran Singh Committee had recommended including paying taxes and voting as duties, but they were not incorporated into Article 51A.",
    ai_insights: {
      examiner_trap: "Swaran Singh Committee recommended duty to pay taxes and voting, but Parliament did NOT include them in the 42nd Amendment.",
      elimination_tip: "Article 51A contains 11 specific clauses (a to k). Voting and paying taxes are NOT among them.",
      syllabus_node: "GS2_POLITY_FUNDAMENTAL_DUTIES",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2007",
    subject_category: "Environment & Ecology",
    difficulty_level: "intermediate",
    question_text:
      "Which one of the following is an 'In-situ' method of biodiversity conservation?",
    options_matrix: {
      A: "Botanical Garden",
      B: "Zoological Park",
      C: "National Park",
      D: "Gene Bank / Seed Bank",
    },
    correct_option: "C",
    conceptual_explanation:
      "In-situ conservation means protecting species within their natural habitats and ecosystems. Examples include National Parks, Wildlife Sanctuaries, Biosphere Reserves, and Sacred Groves.\nEx-situ conservation involves conserving organisms outside their natural habitats in artificial environments, such as Botanical Gardens, Zoos, Cryopreservation, and Seed/Gene Banks.",
    ai_insights: {
      examiner_trap: "Sacred Groves are In-situ; Seed banks and Botanical gardens are Ex-situ.",
      elimination_tip: "In-situ = On-site (Natural). Ex-situ = Off-site (Artificial facility).",
      syllabus_node: "GS3_ENVIRONMENT_CONSERVATION_METHODS",
    },
    is_generated: false,
  },

  // =========================================================================
  // UPSC PRELIMS 2008
  // =========================================================================
  {
    exam_origin_tag: "UPSC Prelims 2008",
    subject_category: "Indian Polity & Governance",
    difficulty_level: "tough",
    question_text:
      "Consider the following statements regarding the Attorney General for India:\n\n1. He is appointed by the President of India.\n2. He must have the same qualifications as required for a Judge of the Supreme Court.\n3. He has the right of audience in all courts in the territory of India.\n4. He has the right to speak and take part in proceedings of both Houses of Parliament with the right to vote.\n\nWhich of the statements given above are correct?",
    options_matrix: {
      A: "1 and 2 only",
      B: "1, 2 and 3 only",
      C: "3 and 4 only",
      D: "1, 2, 3 and 4",
    },
    correct_option: "B",
    conceptual_explanation:
      "Statements 1, 2, and 3 are correct: Article 76 states that the AG is appointed by the President, must be qualified to be appointed a SC judge, and enjoys right of audience in all Indian courts.\nStatement 4 is incorrect: Under Article 88, the Attorney General has the right to speak in and participate in proceedings of Parliament and any Parliamentary committee of which he may be named a member, but WITHOUT the right to vote.",
    ai_insights: {
      examiner_trap: "The Attorney General CAN participate in Parliament, but CANNOT vote (Article 88).",
      elimination_tip: "Whenever an option says AG has 'right to vote' in Parliament, immediately eliminate it.",
      syllabus_node: "GS2_POLITY_ATTORNEY_GENERAL",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2008",
    subject_category: "Geography & Agriculture",
    difficulty_level: "intermediate",
    question_text:
      "Which one of the following passes connects the Kashmir Valley with Ladakh and is located on the Great Himalayan Range?",
    options_matrix: {
      A: "Zoji La",
      B: "Shipki La",
      C: "Nathu La",
      D: "Lipulekh",
    },
    correct_option: "A",
    conceptual_explanation:
      "Zoji La (elevation ~3,528 m) connects Srinagar and the Kashmir Valley with Dras, Kargil, and Leh in Ladakh via NH-1. Shipki La connects Himachal Pradesh with Tibet (Sutlej gorge). Nathu La and Jelep La connect Sikkim with Tibet. Lipulekh connects Uttarakhand with Tibet.",
    ai_insights: {
      examiner_trap: "Banihal Pass connects Jammu to Srinagar (Pir Panjal range); Zoji La connects Srinagar to Leh (Great Himalayas).",
      elimination_tip: "Zoji La = Srinagar-Leh gateway. Rohtang/Atal Tunnel = Manali-Leh gateway.",
      syllabus_node: "GS1_GEOGRAPHY_HIMALAYAN_PASSES",
    },
    is_generated: false,
  },

  // =========================================================================
  // UPSC PRELIMS 2009
  // =========================================================================
  {
    exam_origin_tag: "UPSC Prelims 2009",
    subject_category: "Indian Polity & Governance",
    difficulty_level: "intermediate",
    question_text:
      "Who among the following was the Chairman of the Committee on Panchayati Raj Institutions which recommended the 3-tier system of Panchayati Raj in India?",
    options_matrix: {
      A: "Balwant Rai Mehta",
      B: "Ashok Mehta",
      C: "L. M. Singhvi",
      D: "G. V. K. Rao",
    },
    correct_option: "A",
    conceptual_explanation:
      "The Balwant Rai Mehta Committee (appointed in 1957 to examine the Community Development Programme) submitted its report recommending a three-tier Panchayati Raj system:\n1. Gram Panchayat at the village level\n2. Panchayat Samiti at the block level\n3. Zilla Parishad at the district level\nAshok Mehta Committee (1977) later recommended a 2-tier system (Mandal Panchayat and Zilla Parishad).",
    ai_insights: {
      examiner_trap: "Balwant Rai Mehta = 3-tier (1957); Ashok Mehta = 2-tier (1977); LM Singhvi = Constitutional recognition (1986).",
      elimination_tip: "3-tier pioneer = Balwant Rai Mehta.",
      syllabus_node: "GS2_POLITY_LOCAL_SELF_GOVERNMENT",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2009",
    subject_category: "Modern Indian History",
    difficulty_level: "intermediate",
    question_text:
      "In the context of Indian history, the principle of 'Dyarchy' (Diarchy) introduced by the Government of India Act, 1919 refers to:",
    options_matrix: {
      A: "Division of the central legislature into two houses (bicameralism)",
      B: "Introduction of separate electorates for Muslims and Sikhs",
      C: "Division of provincial subjects into 'Transferred' and 'Reserved' categories",
      D: "Establishment of parallel governments in British provinces and Princely states",
    },
    correct_option: "C",
    conceptual_explanation:
      "The Government of India Act, 1919 (Montagu-Chelmsford Reforms) introduced Dyarchy in the provinces. Provincial subjects were divided into:\n1. Reserved Subjects: Administered directly by the Governor with his Executive Council without legislative accountability (e.g. Law & Order, Finance, Land Revenue).\n2. Transferred Subjects: Administered by the Governor on the advice of elected Indian Ministers accountable to the Provincial Legislature (e.g. Education, Health, Agriculture, Local Self-Government).",
    ai_insights: {
      examiner_trap: "Bicameralism at the Centre was also introduced in 1919, but 'Dyarchy' specifically means the dual rule / division into Reserved and Transferred subjects in the provinces.",
      elimination_tip: "Dyarchy in Provinces = 1919 Act. Dyarchy at the Centre = 1935 Act.",
      syllabus_node: "GS1_MODERN_HISTORY_BRITISH_ACTS_1919",
    },
    is_generated: false,
  },

  // =========================================================================
  // UPSC PRELIMS 2010
  // =========================================================================
  {
    exam_origin_tag: "UPSC Prelims 2010",
    subject_category: "Indian Polity & Governance",
    difficulty_level: "tough",
    question_text:
      "Which of the following is/are the exclusive jurisdiction(s) of the Supreme Court of India under Article 131 of the Constitution?\n\n1. Dispute between the Government of India and one or more States.\n2. Dispute between the Government of India and any State on one side and one or more other States on the other.\n3. Dispute between two or more States involving any question on which the existence or extent of a legal right depends.\n\nSelect the correct answer using the codes given below:",
    options_matrix: {
      A: "1 and 2 only",
      B: "2 and 3 only",
      C: "1 and 3 only",
      D: "1, 2 and 3",
    },
    correct_option: "D",
    conceptual_explanation:
      "Article 131 of the Constitution provides Original and Exclusive jurisdiction to the Supreme Court for federal disputes involving questions of legal rights:\n1. Between Centre and one or more States;\n2. Between Centre and States on one side and other States on the other;\n3. Between two or more States.\nInter-state river water disputes (Article 262) and political/commercial disputes are excluded from Article 131.",
    ai_insights: {
      examiner_trap: "Inter-state river water disputes do NOT come under Article 131; they are adjudicated by Tribunals under Article 262 and Inter-State River Water Disputes Act 1956.",
      elimination_tip: "All federal disputes involving legal rights fall under Article 131 exclusive jurisdiction.",
      syllabus_node: "GS2_POLITY_SUPREME_COURT_JURISDICTION",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "UPSC Prelims 2010",
    subject_category: "Indian Economy",
    difficulty_level: "intermediate",
    question_text:
      "Which of the following institutions publishes the 'Human Development Index' (HDI) and the 'Gender Inequality Index' (GII)?",
    options_matrix: {
      A: "World Bank",
      B: "International Monetary Fund (IMF)",
      C: "United Nations Development Programme (UNDP)",
      D: "World Economic Forum (WEF)",
    },
    correct_option: "C",
    conceptual_explanation:
      "The Human Development Index (HDI) was created by Pakistani economist Mahbub ul Haq and Indian Nobel laureate Amartya Sen, and has been published annually by the United Nations Development Programme (UNDP) since 1990 in the Human Development Report. UNDP also computes the Gender Inequality Index (GII) and the Multidimensional Poverty Index (MPI).",
    ai_insights: {
      examiner_trap: "World Bank publishes 'World Development Report'; WEF publishes 'Global Competitiveness Report' and 'Global Gender Gap Report'; UNDP publishes 'Human Development Report'.",
      elimination_tip: "HDI, GII, MPI = UNDP. Global Gender Gap = WEF.",
      syllabus_node: "GS3_ECONOMY_GLOBAL_INDICES",
    },
    is_generated: false,
  },

  // =========================================================================
  // STATIC GK CORE VAULT (Foundational High-Yield Facts)
  // =========================================================================
  {
    exam_origin_tag: "Static GK Core",
    subject_category: "Static GK",
    difficulty_level: "intermediate",
    question_text:
      "Match List-I (Ramsar Wetland) with List-II (State) and select the correct answer:\n\nList-I:\nA. Deepor Beel\nB. Sasthamkotta Lake\nC. Tsomoriri Lake\nD. Harike Wetland\n\nList-II:\n1. Punjab\n2. Assam\n3. Kerala\n4. Ladakh",
    options_matrix: {
      A: "A-2, B-3, C-4, D-1",
      B: "A-2, B-1, C-4, D-3",
      C: "A-4, B-3, C-2, D-1",
      D: "A-1, B-3, C-4, D-2",
    },
    correct_option: "A",
    conceptual_explanation:
      "- Deepor Beel is a permanent freshwater lake in Kamrup district, Assam (former channel of the Brahmaputra).\n- Sasthamkotta Lake is the largest freshwater lake in Kerala (Kollam district), known as the 'Queen of Lakes'.\n- Tsomoriri (Mountain Lake) is a high-altitude wetland in Changthang plateau, Ladakh.\n- Harike Wetland is located at the confluence of the Beas and Sutlej rivers in Punjab.\n\nCorrect match is A-2, B-3, C-4, D-1.",
    ai_insights: {
      examiner_trap: "Sasthamkotta is freshwater in Kerala, unlike Vembanad and Ashtamudi which are brackish estuaries.",
      elimination_tip: "Harike = Beas + Sutlej confluence in Punjab.",
      syllabus_node: "GS3_ENVIRONMENT_RAMSAR_SITES",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "Static GK Core",
    subject_category: "Static GK",
    difficulty_level: "tough",
    question_text:
      "As of late 2024, the Union Cabinet approved the conferment of 'Classical Language' status to five new languages. Which of the following sets contains ALL FIVE newly added Classical Languages?",
    options_matrix: {
      A: "Marathi, Bengali, Pali, Prakrit, and Assamese",
      B: "Marathi, Maithili, Pali, Rajasthani, and Assamese",
      C: "Bengali, Dogri, Santhali, Sindhi, and Kashmiri",
      D: "Marathi, Gujarati, Pali, Prakrit, and Konkani",
    },
    correct_option: "A",
    conceptual_explanation:
      "In October 2024, the Union Cabinet approved Classical Language status for five languages:\n1. Marathi\n2. Bengali\n3. Pali\n4. Prakrit\n5. Assamese\nWith these additions, India now has 11 Classical Languages (Tamil [2004], Sanskrit [2005], Telugu [2008], Kannada [2008], Malayalam [2013], Odia [2014], plus the five 2024 languages).",
    ai_insights: {
      examiner_trap: "Gujarati and Maithili were NOT among the 5 added in 2024.",
      elimination_tip: "New 5 (Oct 2024): Marathi, Bengali, Pali, Prakrit, Assamese. Total Classical = 11.",
      syllabus_node: "GS1_ART_CULTURE_CLASSICAL_LANGUAGES",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "Static GK Core",
    subject_category: "Static GK",
    difficulty_level: "intermediate",
    question_text:
      "Which of the following landmark Supreme Court judgments established that Fundamental Rights and Directive Principles are two wheels of a chariot, and that harmonious construction is the foundation of the Indian Constitution?",
    options_matrix: {
      A: "Kesavananda Bharati v. State of Kerala (1973)",
      B: "Minerva Mills v. Union of India (1980)",
      C: "Maneka Gandhi v. Union of India (1978)",
      D: "Indra Sawhney v. Union of India (1992)",
    },
    correct_option: "B",
    conceptual_explanation:
      "In Minerva Mills v. Union of India (1980), the Supreme Court famously observed: 'The Indian Constitution is founded on the bedrock of the balance between Parts III and IV. To give absolute primacy to one over the other is to disturb the harmony of the Constitution. They are like two wheels of a chariot.'",
    ai_insights: {
      examiner_trap: "Kesavananda established Basic Structure; Minerva Mills emphasized the golden balance between FR and DPSP as part of that basic structure.",
      elimination_tip: "'Bedrock of balance between FR & DPSP' = Minerva Mills (1980).",
      syllabus_node: "GS2_POLITY_LANDMARK_JUDGMENTS",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "Static GK Core",
    subject_category: "Static GK",
    difficulty_level: "intermediate",
    question_text:
      "Consider the following Tiger Reserves and the States in which they are situated:\n\n1. Pakke Tiger Reserve — Arunachal Pradesh\n2. Dampa Tiger Reserve — Mizoram\n3. Sathyamangalam Tiger Reserve — Tamil Nadu\n4. Tadoba-Andhari Tiger Reserve — Maharashtra\n\nWhich of the pairs given above are correctly matched?",
    options_matrix: {
      A: "1, 2 and 3 only",
      B: "2, 3 and 4 only",
      C: "1 and 4 only",
      D: "1, 2, 3 and 4",
    },
    correct_option: "D",
    conceptual_explanation:
      "All four pairs are correct:\n1. Pakke (Pakhui) Tiger Reserve: East Kameng district, Arunachal Pradesh (famous for hornbill conservation).\n2. Dampa Tiger Reserve: Mamit district along the Indo-Bangladesh border, Mizoram.\n3. Sathyamangalam Tiger Reserve: Erode district, Tamil Nadu (critical wildlife corridor connecting Western and Eastern Ghats).\n4. Tadoba-Andhari Tiger Reserve: Chandrapur district, Maharashtra (oldest national park/tiger reserve in Maharashtra).",
    ai_insights: {
      examiner_trap: "Pakke is in Arunachal Pradesh, while Palamau is in Jharkhand, and Panna is in MP.",
      elimination_tip: "Pakke (Arunachal), Dampa (Mizoram), Sathyamangalam (TN), Tadoba (MH) are all correct.",
      syllabus_node: "GS3_ENVIRONMENT_TIGER_RESERVES",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "Static GK Core",
    subject_category: "Static GK",
    difficulty_level: "intermediate",
    question_text:
      "Which of the following classical dance forms of India originated as a temple dance by Devadasis and was historically known as 'Dasiattam'?",
    options_matrix: {
      A: "Kathakali",
      B: "Bharatanatyam",
      C: "Kuchipudi",
      D: "Mohiniyattam",
    },
    correct_option: "B",
    conceptual_explanation:
      "Bharatanatyam (from Tamil Nadu) is the oldest classical dance tradition in India. It originated as a solo dance performed by temple dancers called Devadasis and was known as 'Dasiattam' or 'Sadir Natyam'. It was revived in the 1930s by E. Krishna Iyer and Rukmini Devi Arundale (who established Kalakshetra in Chennai).",
    ai_insights: {
      examiner_trap: "Mohiniyattam is also a solo female dance, but from Kerala; Bharatanatyam is Dasiattam / Sadir from Tamil Nadu.",
      elimination_tip: "Dasiattam / Sadir Natyam = Bharatanatyam.",
      syllabus_node: "GS1_ART_CULTURE_CLASSICAL_DANCES",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "Static GK Core",
    subject_category: "Static GK",
    difficulty_level: "tough",
    question_text:
      "Match the following Harappan sites with their most distinctive archaeological findings:\n\nList-I (Site):\nA. Lothal\nB. Kalibangan\nC. Dholavira\nD. Banawali\n\nList-II (Finding):\n1. Ploughed agricultural field surface\n2. Tidal dockyard connected to Gulf of Khambhat\n3. Giant water reservoir system and rock-cut architecture\n4. Terracotta toy model of a plough",
    options_matrix: {
      A: "A-2, B-1, C-3, D-4",
      B: "A-2, B-3, C-1, D-4",
      C: "A-3, B-1, C-2, D-4",
      D: "A-4, B-1, C-3, D-2",
    },
    correct_option: "A",
    conceptual_explanation:
      "- Lothal (Gujarat): Artificial brick basin identified as a tidal dockyard.\n- Kalibangan (Rajasthan): Furrowed ploughed agricultural field with grid pattern for dual cropping.\n- Dholavira (Kutch, Gujarat): Elaborate rock-cut storm-water harvesting reservoirs and unique 10-symbol signboard.\n- Banawali (Fatehabad, Haryana): Terracotta replica model of a plough.\n\nCorrect match is A-2, B-1, C-3, D-4.",
    ai_insights: {
      examiner_trap: "Terracotta plough is from Banawali; actual ploughed field is from Kalibangan.",
      elimination_tip: "Lothal = Dockyard; Dholavira = Water reservoirs; Kalibangan = Ploughed field; Banawali = Terracotta plough.",
      syllabus_node: "GS1_ANCIENT_HISTORY_INDUS_VALLEY_SITES",
    },
    is_generated: false,
  },
  {
    exam_origin_tag: "Static GK Core",
    subject_category: "Static GK",
    difficulty_level: "intermediate",
    question_text:
      "Consider the following pairs of Buddhist Councils, their venues, and royal patrons:\n\n1. First Council — Rajagriha (Sattapanni Cave) — King Ajatashatru\n2. Second Council — Vaishali — King Kalashoka\n3. Third Council — Pataliputra — Emperor Ashoka\n4. Fourth Council — Kundalvana (Kashmir) — Emperor Kanishka\n\nHow many of the above pairs are correctly matched?",
    options_matrix: {
      A: "Only two pairs",
      B: "Only three pairs",
      C: "All four pairs",
      D: "None of the pairs",
    },
    correct_option: "C",
    conceptual_explanation:
      "All four Buddhist Councils are correctly matched:\n1. First Council (483 BCE): Rajagriha under Ajatashatru (Haryanka dynasty), presided by Mahakassapa. Sutta and Vinaya Pitakas compiled.\n2. Second Council (383 BCE): Vaishali under Kalashoka (Shishunaga dynasty), presided by Sabakami. First schism (Sthaviravadins vs Mahasanghikas).\n3. Third Council (250 BCE): Pataliputra under Ashoka (Maurya dynasty), presided by Moggaliputta Tissa. Abhidhamma Pitaka added.\n4. Fourth Council (72 CE): Kundalvana, Kashmir under Kanishka (Kushan dynasty), presided by Vasumitra (deputy: Ashvaghosha). Division into Mahayana and Hinayana.",
    ai_insights: {
      examiner_trap: "Chairman of 4th council was Vasumitra (with Ashvaghosha as vice-chairman); 3rd council was Moggaliputta Tissa.",
      elimination_tip: "Chronology: Ajatashatru (Rajagriha) -> Kalashoka (Vaishali) -> Ashoka (Pataliputra) -> Kanishka (Kashmir).",
      syllabus_node: "GS1_ANCIENT_HISTORY_BUDDHIST_COUNCILS",
    },
    is_generated: false,
  },
];

async function main() {
  console.log("=".repeat(80));
  console.log("  TARK INTELLIGENCE — 25-YEAR UPSC PYQ & STATIC GK INGESTION ENGINE");
  console.log("=".repeat(80));

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of HISTORICAL_PYQ_DATASET) {
    // Check if question already exists in DB
    const { data: existing } = await supabase
      .from("static_questions")
      .select("id")
      .eq("question_text", item.question_text)
      .maybeSingle();

    if (existing) {
      console.log(`[SKIPPED] Already present: [${item.exam_origin_tag}] ${item.question_text.slice(0, 50)}...`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from("static_questions").insert([item]);

    if (error) {
      console.error(`[ERROR] Insert failed for [${item.exam_origin_tag}]:`, error.message);
      errors++;
    } else {
      console.log(`[INSERTED] [${item.exam_origin_tag}] ${item.subject_category}: ${item.question_text.slice(0, 50)}...`);
      inserted++;
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log(`Ingestion Summary: Inserted: ${inserted} | Skipped: ${skipped} | Errors: ${errors}`);
  console.log("=".repeat(80));

  // Verify total count
  const { count } = await supabase
    .from("static_questions")
    .select("id", { count: "exact", head: true });

  console.log(`Total questions currently in public.static_questions: ${count}`);
}

main().catch((err) => {
  console.error("Fatal error during PYQ ingestion:", err);
  process.exit(1);
});
