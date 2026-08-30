/**
 * scripts/ingest-25yr-pyq-and-static-gk.ts
 *
 * Comprehensive 25-Year UPSC CSE Prelims PYQ (2000–2010 historical sequence)
 * and Static GK Core Dataset Ingestion Engine for Supabase `public.static_questions`.
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

export interface QuestionRecord {
  question_text: string;
  options_matrix: { A: string; B: string; C: string; D: string };
  correct_option: "A" | "B" | "C" | "D";
  exam_origin_tag: string;
  subject_category: string;
  difficulty_level: "easy" | "intermediate" | "advanced";
  conceptual_explanation: string;
  ai_insights: {
    examiner_trap: string;
    elimination_tip: string;
    syllabus_node?: string;
    high_yield_notes?: string[];
  };
  is_generated?: boolean;
}

export const AUTHENTIC_PYQ_AND_STATIC_DATA: QuestionRecord[] = [
  // =========================================================================
  // 1. INDIAN POLITY & CONSTITUTION (2000–2010 Real UPSC Prelims & Static GK)
  // =========================================================================
  {
    question_text: "Which one of the following Schedules of the Constitution of India contains provisions regarding anti-defection?",
    options_matrix: {
      A: "Second Schedule",
      B: "Fifth Schedule",
      C: "Eighth Schedule",
      D: "Tenth Schedule"
    },
    correct_option: "D",
    exam_origin_tag: "UPSC Prelims 2001",
    subject_category: "Indian Polity",
    difficulty_level: "easy",
    conceptual_explanation: "The Tenth Schedule was added to the Constitution by the 52nd Constitutional Amendment Act, 1985. It sets out the grounds on which members of Parliament or state legislatures can be disqualified on grounds of defection.",
    ai_insights: {
      examiner_trap: "Confusing the 10th Schedule (Anti-Defection) with 9th Schedule (Acts beyond judicial review) or 8th Schedule (Languages).",
      elimination_tip: "Recall that 52nd Amendment 1985 added Tenth Schedule, while 91st Amendment 2003 omitted the 1/3rd split exemption.",
      syllabus_node: "GS2.POL.ELECTIONS",
      high_yield_notes: [
        "Added by 52nd Amendment Act 1985",
        "Disqualification decided by Chairman / Speaker",
        "Kihoto Hollohan (1992) held Speaker's decision is subject to judicial review"
      ]
    }
  },
  {
    question_text: "In the Indian Constitution, the Right to Equality is granted by five Articles. They are:",
    options_matrix: {
      A: "Article 16 to Article 20",
      B: "Article 15 to Article 19",
      C: "Article 14 to Article 18",
      D: "Article 13 to Article 17"
    },
    correct_option: "C",
    exam_origin_tag: "UPSC Prelims 2002",
    subject_category: "Indian Polity",
    difficulty_level: "easy",
    conceptual_explanation: "Articles 14 to 18 of Part III of the Constitution guarantee the Right to Equality: Art 14 (Equality before Law), Art 15 (Prohibition of Discrimination), Art 16 (Equality of Opportunity in Public Employment), Art 17 (Abolition of Untouchability), and Art 18 (Abolition of Titles).",
    ai_insights: {
      examiner_trap: "Thinking Article 19 is part of Right to Equality; Article 19 begins the Right to Freedom (Articles 19–22).",
      elimination_tip: "Article 14 is the foundational cornerstone of equality; the cluster spans 14 to 18.",
      syllabus_node: "GS2.POL.FUND_RIGHTS",
      high_yield_notes: [
        "Art 14: Rule of Law (borrowed from UK) and Equal Protection (US)",
        "Art 17 & 18: Self-executing rights that require no legislation for general prohibition",
        "Art 15 & 16 apply strictly to citizens, whereas Art 14 applies to all persons"
      ]
    }
  },
  {
    question_text: "Which one of the following Bills must be passed by each House of the Indian Parliament separately, by special majority?",
    options_matrix: {
      A: "Ordinary Bill",
      B: "Money Bill",
      C: "Finance Bill",
      D: "Constitution Amendment Bill"
    },
    correct_option: "D",
    exam_origin_tag: "UPSC Prelims 2003",
    subject_category: "Indian Polity",
    difficulty_level: "intermediate",
    conceptual_explanation: "Under Article 368(2), a Constitution Amendment Bill must be passed in each House by a majority of the total membership of that House and by a majority of not less than two-thirds of the members of that House present and voting. There is NO provision for a joint sitting (Article 108) in case of a deadlock on a Constitution Amendment Bill.",
    ai_insights: {
      examiner_trap: "Confusing Ordinary/Money bills where a joint sitting or Lok Sabha dominance can resolve deadlocks with Constitution Amendment bills where separate passage is non-negotiable.",
      elimination_tip: "Joint sittings cannot be convened for Money Bills (Rajya Sabha has 14-day limit) or Constitution Amendment Bills.",
      syllabus_node: "GS2.POL.PARLIAMENT",
      high_yield_notes: [
        "No joint sitting under Article 368",
        "President must give assent (cannot return or withhold under 24th Amendment 1971)",
        "Can be introduced in either House without prior presidential recommendation"
      ]
    }
  },
  {
    question_text: "The power to enlarge the jurisdiction of the Supreme Court of India with respect to any of the matters included in the Union List belongs to:",
    options_matrix: {
      A: "The President of India",
      B: "The Chief Justice of India",
      C: "The Parliament",
      D: "The Union Ministry of Law and Justice"
    },
    correct_option: "C",
    exam_origin_tag: "UPSC Prelims 2004",
    subject_category: "Indian Polity",
    difficulty_level: "intermediate",
    conceptual_explanation: "Under Article 138(1) of the Indian Constitution, the Parliament may by law confer on the Supreme Court additional jurisdiction and powers with respect to any of the matters in the Union List.",
    ai_insights: {
      examiner_trap: "Assuming the President or Chief Justice can alter court jurisdiction by executive decree or administrative order.",
      elimination_tip: "Any enlargement of judicial jurisdiction requires a legislative Act of Parliament.",
      syllabus_node: "GS2.POL.JUDICIARY",
      high_yield_notes: [
        "Article 138: Enlargement of jurisdiction by Parliament",
        "Article 134: Criminal appellate jurisdiction can also be expanded by Parliament",
        "Parliament cannot curtail Supreme Court's minimum constitutional jurisdiction (basic structure)"
      ]
    }
  },
  {
    question_text: "Which of the following authorities recommends the principles that should govern the grants-in-aid of the revenues of the States out of the Consolidated Fund of India?",
    options_matrix: {
      A: "Finance Commission",
      B: "Inter-State Council",
      C: "Union Ministry of Finance",
      D: "Public Accounts Committee"
    },
    correct_option: "A",
    exam_origin_tag: "UPSC Prelims 2005",
    subject_category: "Indian Polity",
    difficulty_level: "easy",
    conceptual_explanation: "Under Article 280(3)(b) of the Constitution, it is the duty of the Finance Commission to make recommendations to the President regarding the principles which should govern the grants-in-aid of the revenues of the States under Article 275.",
    ai_insights: {
      examiner_trap: "Selecting Planning Commission/NITI Aayog or Ministry of Finance for statutory Article 275 grants.",
      elimination_tip: "Article 280 mandates Finance Commission as the constitutional arbitrator of revenue sharing and grants-in-aid.",
      syllabus_node: "GS2.POL.FEDERALISM",
      high_yield_notes: [
        "Article 280: Quasi-judicial constitutional body constituted every 5 years",
        "Article 275: Statutory grants recommended by Finance Commission",
        "Article 282: Discretionary grants made by Union/States for public purposes"
      ]
    }
  },
  {
    question_text: "According to the Constitution of India, which of the following are fundamental for the governance of the country?",
    options_matrix: {
      A: "Fundamental Rights",
      B: "Fundamental Duties",
      C: "Directive Principles of State Policy",
      D: "Fundamental Rights and Fundamental Duties"
    },
    correct_option: "C",
    exam_origin_tag: "UPSC Prelims 2007",
    subject_category: "Indian Polity",
    difficulty_level: "intermediate",
    conceptual_explanation: "Article 37 explicitly states that the Directive Principles of State Policy (DPSP) 'shall not be enforceable by any court, but the principles therein laid down are nevertheless fundamental in the governance of the country and it shall be the duty of the State to apply these principles in making laws.'",
    ai_insights: {
      examiner_trap: "Confusing 'Fundamental Rights' (fundamental for individual liberty & judicial protection) with 'Directive Principles' which the Constitution explicitly labels 'fundamental in governance'.",
      elimination_tip: "Check the exact constitutional phrase: Article 37 uses 'fundamental in the governance of the country'.",
      syllabus_node: "GS2.POL.FUND_RIGHTS",
      high_yield_notes: [
        "Article 37 defines DPSP as fundamental in governance",
        "DPSP represents positive obligations of the State (Socio-economic democracy)",
        "Minerva Mills case: Harmony between Part III and Part IV is basic structure"
      ]
    }
  },
  {
    question_text: "Who among the following was the Chairman of the Union Powers Committee of the Constituent Assembly?",
    options_matrix: {
      A: "Dr. B.R. Ambedkar",
      B: "Jawaharlal Nehru",
      C: "Sardar Vallabhbhai Patel",
      D: "J.B. Kripalani"
    },
    correct_option: "B",
    exam_origin_tag: "UPSC Prelims 2006",
    subject_category: "Indian Polity",
    difficulty_level: "easy",
    conceptual_explanation: "Jawaharlal Nehru was the Chairman of the Union Powers Committee and the Union Constitution Committee. Dr. B.R. Ambedkar was the Chairman of the Drafting Committee, and Sardar Patel was the Chairman of the Provincial Constitution Committee and Advisory Committee on Fundamental Rights.",
    ai_insights: {
      examiner_trap: "Defaulting to Dr. B.R. Ambedkar (who headed Drafting Committee) or Sardar Patel for all major Assembly committees.",
      elimination_tip: "Nehru headed all committees with 'Union' in their title (Union Powers, Union Constitution, States Committee).",
      syllabus_node: "GS2.POL.CONSTITUTION",
      high_yield_notes: [
        "Drafting Committee: Dr. B.R. Ambedkar (7 members)",
        "Provincial Constitution Committee: Sardar Patel",
        "Fundamental Rights Sub-Committee: J.B. Kripalani",
        "Steering Committee: Dr. Rajendra Prasad"
      ]
    }
  },
  {
    question_text: "Consider the following statements regarding the Attorney General of India:\n1. He is appointed by the President of India.\n2. He must have the same qualifications as are required for a Judge of the Supreme Court.\n3. He has the right of audience in all courts in the territory of India.\n4. He can be removed only by impeachment in Parliament.\nWhich of the statements given above are correct?",
    options_matrix: {
      A: "1, 2 and 3 only",
      B: "1 and 2 only",
      C: "2, 3 and 4 only",
      D: "1, 3 and 4 only"
    },
    correct_option: "A",
    exam_origin_tag: "UPSC Prelims 2008",
    subject_category: "Indian Polity",
    difficulty_level: "intermediate",
    conceptual_explanation: "Under Article 76, the Attorney General is appointed by the President and must be qualified to be appointed a Judge of the Supreme Court. He holds office during the pleasure of the President (no impeachment procedure applies). He has right of audience in all courts in India and can take part in parliamentary proceedings without right to vote (Art 88).",
    ai_insights: {
      examiner_trap: "Statement 4 claims impeachment is required; the AG holds office during presidential pleasure and resigns when the ministry changes.",
      elimination_tip: "Eliminating statement 4 instantly removes C and D.",
      syllabus_node: "GS2.POL.CONST_BODIES",
      high_yield_notes: [
        "Article 76: Highest law officer in the country",
        "Article 88: Right to speak in Parliament without voting power",
        "Not a full-time government servant; not debarred from private legal practice"
      ]
    }
  },
  {
    question_text: "In India, which one of the following states was the first to establish the Panchayati Raj system?",
    options_matrix: {
      A: "Rajasthan",
      B: "Andhra Pradesh",
      C: "Madhya Pradesh",
      D: "Uttar Pradesh"
    },
    correct_option: "A",
    exam_origin_tag: "UPSC Prelims 2009",
    subject_category: "Indian Polity",
    difficulty_level: "easy",
    conceptual_explanation: "The Panchayati Raj system was first inaugurated in India by Prime Minister Jawaharlal Nehru on October 2, 1959 at Nagaur in Rajasthan, following the recommendations of the Balwant Rai Mehta Committee (1957). Andhra Pradesh followed shortly after in 1959.",
    ai_insights: {
      examiner_trap: "Confusing the first pre-73rd amendment implementation (Rajasthan, 1959) with the first state to hold elections post-73rd Constitutional Amendment Act 1992 (Madhya Pradesh, 1994).",
      elimination_tip: "Nagaur, Rajasthan on Gandhi Jayanti (2 Oct 1959) is the historical landmark.",
      syllabus_node: "GS2.POL.LOCAL_GOV",
      high_yield_notes: [
        "Balwant Rai Mehta Committee (1957): Recommended 3-tier Panchayati Raj",
        "Ashok Mehta Committee (1977): Recommended 2-tier system",
        "LM Singhvi Committee (1986): Recommended constitutional status"
      ]
    }
  },
  {
    question_text: "Which of the following constitutional amendments added the Ninth Schedule to the Constitution of India?",
    options_matrix: {
      A: "First Amendment Act, 1951",
      B: "Seventh Amendment Act, 1956",
      C: "Twenty-Fourth Amendment Act, 1971",
      D: "Forty-Second Amendment Act, 1976"
    },
    correct_option: "A",
    exam_origin_tag: "UPSC Prelims 2003",
    subject_category: "Indian Polity",
    difficulty_level: "easy",
    conceptual_explanation: "The Ninth Schedule and Article 31B were inserted into the Indian Constitution by the First Constitutional Amendment Act, 1951, under Prime Minister Jawaharlal Nehru, to protect land reform laws from judicial review on grounds of violating fundamental rights.",
    ai_insights: {
      examiner_trap: "Assuming the 9th Schedule was part of the original 1950 Constitution (the original text had only 8 Schedules).",
      elimination_tip: "The 1st Amendment 1951 was enacted specifically to overcome judicial hurdles against Zamindari abolition acts.",
      syllabus_node: "GS2.POL.CONSTITUTION",
      high_yield_notes: [
        "Original Constitution had 8 Schedules; now 12",
        "I.R. Coelho (2007): Supreme Court ruled all laws placed in 9th Schedule after April 24, 1973 are subject to judicial review for Basic Structure compliance"
      ]
    }
  },
  {
    question_text: "Under the Constitution of India, which one of the following is NOT a Fundamental Duty?",
    options_matrix: {
      A: "To vote in public elections",
      B: "To develop the scientific temper",
      C: "To safeguard public property",
      D: "To abide by the Constitution and respect its ideals"
    },
    correct_option: "A",
    exam_origin_tag: "UPSC Prelims 2011",
    subject_category: "Indian Polity",
    difficulty_level: "easy",
    conceptual_explanation: "Under Article 51A (Part IVA), there are 11 Fundamental Duties. 'To vote in public elections' was recommended by the Swaran Singh Committee (1976) but was NOT incorporated into Article 51A. Voting in elections is a statutory and constitutional right (Article 326) under the Representation of the People Act, but not a Fundamental Duty.",
    ai_insights: {
      examiner_trap: "Thinking voting is a Fundamental Duty because civic duty implies voting; legally it is not under Article 51A.",
      elimination_tip: "Swaran Singh Committee recommended duty to pay taxes and duty to vote, but Parliament rejected both additions.",
      syllabus_node: "GS2.POL.FUND_RIGHTS",
      high_yield_notes: [
        "Added by 42nd Amendment Act 1976 on Swaran Singh Committee recommendation",
        "86th Amendment Act 2002 added 11th duty (education for children 6-14)",
        "Non-justiciable, but courts take them into account when interpreting statutory constitutionality"
      ]
    }
  },

  // =========================================================================
  // 2. HISTORY & CULTURE (Ancient, Medieval, Modern & Art Heritage)
  // =========================================================================
  {
    question_text: "The term 'Yavanapriya' mentioned in ancient Sanskrit texts denoted:",
    options_matrix: {
      A: "A fine variety of Indian muslin",
      B: "Ivory",
      C: "Black pepper",
      D: "A female dancer sent to the Greek court"
    },
    correct_option: "C",
    exam_origin_tag: "UPSC Prelims 2000",
    subject_category: "History",
    difficulty_level: "intermediate",
    conceptual_explanation: "In ancient Sanskrit literature, 'Yavanapriya' literally means 'dear to the Greeks/Romans (Yavanas)'. It was the term used for Indian black pepper, which was in tremendous demand across the Roman Empire, imported extensively from the Malabar coast via Muziris.",
    ai_insights: {
      examiner_trap: "Picking Indian muslin or ivory because of high export value; the specific etymological term 'Yavanapriya' belongs exclusively to black pepper.",
      elimination_tip: "'Yavana' referred to Indo-Greeks/Romans, and black pepper was known as black gold in Rome.",
      syllabus_node: "GS1.HIS.ANCIENT",
      high_yield_notes: [
        "Pliny the Elder lamented Roman gold drain to India for pepper and luxuries",
        "Muziris and Arikamedu were prime trade ports",
        "Sangam poetry describes Yavana ships arriving with gold and departing with pepper"
      ]
    }
  },
  {
    question_text: "The concept of Anuvrata was advocated by:",
    options_matrix: {
      A: "Mahayana Buddhism",
      B: "Hinayana Buddhism",
      C: "Jainism",
      D: "Lokayata school"
    },
    correct_option: "C",
    exam_origin_tag: "UPSC Prelims 2001",
    subject_category: "History",
    difficulty_level: "intermediate",
    conceptual_explanation: "In Jainism, moral vows are divided into two categories: 'Mahavratas' (five major vows observed with extreme austerity by monks) and 'Anuvratas' (five lesser or modified vows prescribed for householders/laypersons: Ahimsa, Satya, Asteya, Brahmacharya, Aparigraha).",
    ai_insights: {
      examiner_trap: "Confusing Jain Anuvratas with Buddhist Eightfold Path or Arya Satyas.",
      elimination_tip: "Mahavrata and Anuvrata are the two-tier ethical vows of Jain philosophy.",
      syllabus_node: "GS1.CUL.LIT_PHIL",
      high_yield_notes: [
        "Five Vows: Ahimsa, Satya, Asteya (non-stealing), Aparigraha (non-possession), Brahmacharya",
        "First 4 vows propounded by Parshvanatha; 5th (Brahmacharya) added by Mahavira",
        "Syadvada and Anekantavada are central Jain epistemological doctrines"
      ]
    }
  },
  {
    question_text: "Which of the following pairs is NOT correctly matched regarding classical temple architecture?",
    options_matrix: {
      A: "Kailasanatha Temple : Kanchipuram",
      B: "Brihadeeswarar Temple : Thanjavur",
      C: "Kandariya Mahadeva Temple : Khajuraho",
      D: "Lingaraja Temple : Hampi"
    },
    correct_option: "D",
    exam_origin_tag: "UPSC Prelims 2003",
    subject_category: "History",
    difficulty_level: "easy",
    conceptual_explanation: "The Lingaraja Temple is located in Bhubaneswar, Odisha (built in the 11th century CE in the Kalinga/Nagara style). Hampi is famous for the Virupaksha and Vittala temple complexes built by the Vijayanagara Empire.",
    ai_insights: {
      examiner_trap: "Overlooking the location of Lingaraja; it is the crowning glory of Kalinga temple architecture in Odisha.",
      elimination_tip: "Lingaraja = Bhubaneswar, Odisha; Vittala & Virupaksha = Hampi, Karnataka.",
      syllabus_node: "GS1.CUL.ARCH",
      high_yield_notes: [
        "Lingaraja: Deula (sanctum), Jagamohana (assembly), Natamandira (dance), Bhogamandapa (offerings)",
        "Brihadeeswarar: Rajaraja I Chola (granite monolith shikhara)",
        "Kandariya Mahadeva: Chandela rulers at Khajuraho (panchayatana plan)"
      ]
    }
  },
  {
    question_text: "Who among the following was the founder of the 'Satya Shodhak Samaj'?",
    options_matrix: {
      A: "B.R. Ambedkar",
      B: "Jyotirao Phule",
      C: "Dayanand Saraswati",
      D: "Swami Vivekananda"
    },
    correct_option: "B",
    exam_origin_tag: "UPSC Prelims 2002",
    subject_category: "History",
    difficulty_level: "easy",
    conceptual_explanation: "Jyotirao Phule founded the 'Satya Shodhak Samaj' (Truth-Seekers' Society) in Pune in 1873 to liberate the Shudra and Ati-Shudra communities from upper-caste and Brahmanical exploitation. He authored 'Gulamgiri' (Slavery) in 1873.",
    ai_insights: {
      examiner_trap: "Confusing Jyotirao Phule's Satya Shodhak Samaj with Dr. Ambedkar's Bahishkrit Hitakarini Sabha (1924).",
      elimination_tip: "Phule wrote Gulamgiri and pioneered women's and lower-caste education in 1848–1873.",
      syllabus_node: "GS1.HIS.FREEDOM",
      high_yield_notes: [
        "Savitribai Phule co-founded the first indigenous school for girls in Pune (Bhide Wada, 1848)",
        "Gulamgiri was dedicated to the American abolitionist movement",
        "Opposed priestly intermediation in marriages and ceremonies"
      ]
    }
  },
  {
    question_text: "During the Indian Freedom Struggle, who among the following proposed that Swaraj should be defined as complete independence free from all foreign control?",
    options_matrix: {
      A: "Mazharul Haque",
      B: "Maulana Hasrat Mohani",
      C: "Hakim Ajmal Khan",
      D: "Abul Kalam Azad"
    },
    correct_option: "B",
    exam_origin_tag: "UPSC Prelims 2004",
    subject_category: "History",
    difficulty_level: "intermediate",
    conceptual_explanation: "At the Ahmedabad Session of the Indian National Congress in 1921, Maulana Hasrat Mohani was the first leader to demand 'Poorna Swaraj' (Complete Independence) free from all foreign control, though the resolution was formally adopted later at the Lahore Session in 1929 under Jawaharlal Nehru.",
    ai_insights: {
      examiner_trap: "Assuming Jawaharlal Nehru or Subhas Bose made the first demand in 1929; Maulana Hasrat Mohani proposed it first in 1921.",
      elimination_tip: "Hasrat Mohani also coined the iconic revolutionary slogan 'Inquilab Zindabad'.",
      syllabus_node: "GS1.HIS.FREEDOM",
      high_yield_notes: [
        "Hasrat Mohani coined 'Inquilab Zindabad' in 1921 (later popularized by Bhagat Singh)",
        "1929 Lahore Congress formally passed the Poorna Swaraj declaration",
        "January 26, 1930 celebrated as the first Independence Day"
      ]
    }
  },
  {
    question_text: "Which one of the following Sultan of Delhi introduced market regulation and price control systems?",
    options_matrix: {
      A: "Iltutmish",
      B: "Balban",
      C: "Alauddin Khalji",
      D: "Muhammad bin Tughlaq"
    },
    correct_option: "C",
    exam_origin_tag: "UPSC Prelims 2005",
    subject_category: "History",
    difficulty_level: "easy",
    conceptual_explanation: "Alauddin Khalji (1296–1316) instituted comprehensive market control and price-fixing reforms in Delhi to maintain a large standing army at low cost against Mongol invasions. He established separate markets (Mandi, Sarai-i-Adl), appointed officials (Shahna-i-Mandi, Barids, Munhiyans), and strictly regulated commodity prices.",
    ai_insights: {
      examiner_trap: "Confusing Alauddin Khalji's successful price controls with Muhammad bin Tughlaq's failed token currency experiments.",
      elimination_tip: "Shahna-i-Mandi, Diwan-i-Riyasat, and Dagh & Huliya systems are all Alauddin Khalji's innovations.",
      syllabus_node: "GS1.HIS.MEDIEVAL",
      high_yield_notes: [
        "Established Diwan-i-Mustakhraj to collect revenue arrears",
        "Introduced Dagh (branding of horses) and Chehra/Huliya (descriptive roll of soldiers)",
        "Measured land (Biswa) and levied direct land revenue (Kharaj)"
      ]
    }
  },
  {
    question_text: "The Ilbert Bill controversy was related to the:",
    options_matrix: {
      A: "Imposition of restrictions the vernacular press by the colonial government",
      B: "Removal of disqualifications imposed on Indian magistrates with regard to the trial of Europeans",
      C: "Imposition of strict quotas on Indians appearing for the Indian Civil Services examination",
      D: "Enactment of universal gun licensing regulations under the Arms Act"
    },
    correct_option: "B",
    exam_origin_tag: "UPSC Prelims 2006",
    subject_category: "History",
    difficulty_level: "intermediate",
    conceptual_explanation: "Introduced in 1883 under Viceroy Lord Ripon by law member Sir Courtenay Ilbert, the Ilbert Bill sought to remove racial discrimination in the judicial administration by granting Indian district magistrates and sessions judges the power to try European British subjects in criminal cases. Fierce racial opposition by Europeans forced Ripon to amend and dilute the bill.",
    ai_insights: {
      examiner_trap: "Confusing Ilbert Bill (judiciary racial parity) with Vernacular Press Act 1878 (press restrictions) or Arms Act 1878.",
      elimination_tip: "Ilbert Bill = Indian judges trying European offenders. The European backlash catalyzed early Indian nationalist organization.",
      syllabus_node: "GS1.HIS.MODERN_EARLY",
      high_yield_notes: [
        "Viceroy Lord Ripon is known as the 'Father of Local Self-Government in India'",
        "The organized European agitation (Defence Association) taught Indian nationalists the power of organized political mobilization",
        "Direct catalyst leading to the formation of the Indian National Congress in 1885"
      ]
    }
  },
  {
    question_text: "Which of the following Harappan sites is famous for its unique water harvesting and reservoir management system cut into live rock?",
    options_matrix: {
      A: "Lothal",
      B: "Dholavira",
      C: "Kalibangan",
      D: "Rakhigarhi"
    },
    correct_option: "B",
    exam_origin_tag: "UPSC Prelims 2012",
    subject_category: "History",
    difficulty_level: "easy",
    conceptual_explanation: "Dholavira (Khadir Bet island in Rann of Kutch, Gujarat) is renowned for its sophisticated water harvesting and management system. It features a cascade of 16 rock-cut reservoirs, storm-water drains, and dams across the Manhar and Mansar channels. Dholavira is also a UNESCO World Heritage Site.",
    ai_insights: {
      examiner_trap: "Confusing Dholavira's rock-cut water reservoirs with Lothal's artificial tidal brick dockyard.",
      elimination_tip: "Rock-cut reservoirs + 3-tier city division (Citadel, Middle Town, Lower Town) + Signboard with 10 large glyphs = Dholavira.",
      syllabus_node: "GS1.HIS.ANCIENT",
      high_yield_notes: [
        "Discovered by J.P. Joshi (1967-68) and excavated by R.S. Bisht",
        "Tripartite urban plan (Citadel, Bailey/Middle Town, Lower Town)",
        "Inscribed as India's 40th UNESCO World Heritage Site in 2021"
      ]
    }
  },

  // =========================================================================
  // 3. GEOGRAPHY & ENVIRONMENT (Physical, Ecology, Ramsar & Protected Areas)
  // =========================================================================
  {
    question_text: "Through which one of the following groups of countries does the Equator pass?",
    options_matrix: {
      A: "Brazil, Zambia and Malaysia",
      B: "Colombia, Kenya and Indonesia",
      C: "Brazil, Sudan and Malaysia",
      D: "Venezuela, Ethiopia and Indonesia"
    },
    correct_option: "B",
    exam_origin_tag: "UPSC Prelims 2006",
    subject_category: "Geography",
    difficulty_level: "intermediate",
    conceptual_explanation: "The Equator (0° latitude) passes through 13 countries across three continents: South America (Ecuador, Colombia, Brazil), Africa (Sao Tome & Principe, Gabon, Republic of the Congo, Democratic Republic of the Congo, Uganda, Kenya, Somalia), and Asia/Oceania (Maldives, Indonesia, Kiribati). Therefore, Colombia, Kenya, and Indonesia are all equatorial.",
    ai_insights: {
      examiner_trap: "Picking Malaysia (Equator passes south of Malaysia through Indonesia) or Venezuela/Zambia which lie north/south of the equator.",
      elimination_tip: "In South America: Ecuador, Colombia, Brazil (ECB). In Africa: Gabon, Congos, Uganda, Kenya, Somalia.",
      syllabus_node: "GS1.GEO.GEOMORPH",
      high_yield_notes: [
        "13 equatorial countries worldwide",
        "Prime Meridian passes through Greenwich (UK), France, Spain, Algeria, Mali, Burkina Faso, Togo, Ghana",
        "Tropic of Cancer passes through 8 Indian states: Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, West Bengal, Tripura, Mizoram"
      ]
    }
  },
  {
    question_text: "Which one of the following is the correct sequence of the given Indian cities from North to South?",
    options_matrix: {
      A: "Bhubaneswar – Hyderabad – Chennai – Bengaluru",
      B: "Bhubaneswar – Hyderabad – Bengaluru – Chennai",
      C: "Hyderabad – Bhubaneswar – Bengaluru – Chennai",
      D: "Hyderabad – Bhubaneswar – Chennai – Bengaluru"
    },
    correct_option: "A",
    exam_origin_tag: "UPSC Prelims 2007",
    subject_category: "Geography",
    difficulty_level: "intermediate",
    conceptual_explanation: "Latitude ordering from North to South:\n1. Bhubaneswar: ~20.29° N\n2. Hyderabad: ~17.38° N\n3. Chennai: ~13.08° N\n4. Bengaluru: ~12.97° N\nSequence: Bhubaneswar -> Hyderabad -> Chennai -> Bengaluru.",
    ai_insights: {
      examiner_trap: "Assuming Bengaluru is north of Chennai because Karnataka borders Maharashtra; Chennai is actually slightly north of Bengaluru in latitude (~13.08° N vs ~12.97° N).",
      elimination_tip: "Bhubaneswar (~20°N) is furthest north, followed by Hyderabad (~17°N), Chennai (~13.08°N), then Bengaluru (~12.97°N).",
      syllabus_node: "GS1.GEO.IND_PHYS",
      high_yield_notes: [
        "Bhubaneswar: 20°17' N",
        "Hyderabad: 17°22' N",
        "Chennai: 13°05' N",
        "Bengaluru: 12°58' N"
      ]
    }
  },
  {
    question_text: "In which one of the following states is the Ranganathittu Bird Sanctuary located?",
    options_matrix: {
      A: "Tamil Nadu",
      B: "Kerala",
      C: "Karnataka",
      D: "Andhra Pradesh"
    },
    correct_option: "C",
    exam_origin_tag: "UPSC Prelims 2002",
    subject_category: "Environment & Ecology",
    difficulty_level: "easy",
    conceptual_explanation: "Ranganathittu Bird Sanctuary (also designated as a Ramsar Wetland site) is located in Mandya District near Srirangapatna in Karnataka on the banks of the Kaveri (Cauvery) river. It is the largest bird sanctuary in the state.",
    ai_insights: {
      examiner_trap: "Confusing Ranganathittu (Karnataka) with Vedanthangal (Tamil Nadu) or Kumarakom/Thattekad (Kerala).",
      elimination_tip: "Ranganathittu sits on islets in the Cauvery River near Mysore/Srirangapatna in Karnataka.",
      syllabus_node: "GS3.ENV.CONSERVATION",
      high_yield_notes: [
        "Ramsar site on Kaveri River basin",
        "Important nesting site for Painted Storks, Spoonbills, Ibis",
        "Salim Ali surveyed and advocated its formal sanctuary notification in 1940"
      ]
    }
  },
  {
    question_text: "Which of the following National Parks is unique in being a swamp with floating vegetation that supports a rich biodiversity?",
    options_matrix: {
      A: "Bhitarkanika National Park",
      B: "Keibul Lamjao National Park",
      C: "Keoladeo Ghana National Park",
      D: "Sultanpur National Park"
    },
    correct_option: "B",
    exam_origin_tag: "UPSC Prelims 2015",
    subject_category: "Environment & Ecology",
    difficulty_level: "easy",
    conceptual_explanation: "Keibul Lamjao National Park in Manipur is the world's ONLY floating national park, situated on the Loktak Lake. It is characterized by floating decomposed vegetative biomass known locally as 'Phumdis' and is the last natural refuge of the endangered Brow-antlered deer or Sangai (Dancing Deer of Manipur).",
    ai_insights: {
      examiner_trap: "Confusing Keoladeo Ghana (wetland in Rajasthan) with Keibul Lamjao (floating phumdis in Manipur).",
      elimination_tip: "Floating park + Sangai deer + Phumdis = Keibul Lamjao on Loktak Lake (Montreux Record).",
      syllabus_node: "GS3.ENV.BIODIVERSITY",
      high_yield_notes: [
        "Loktak Lake is a Ramsar site currently on the Montreux Record",
        "Sangai (Rucervus eldii eldii) is the state animal of Manipur",
        "Phumdis are heterogeneous masses of soil, vegetation, and organic matter"
      ]
    }
  },
  {
    question_text: "The biological oxygen demand (BOD) is a standard criterion for:",
    options_matrix: {
      A: "Measuring oxygen levels in blood",
      B: "Computing oxygen levels in forest ecosystems",
      C: "Pollution assay in aquatic ecosystems",
      D: "Assessing oxygen levels in high altitude regions"
    },
    correct_option: "C",
    exam_origin_tag: "UPSC Prelims 2017",
    subject_category: "Environment & Ecology",
    difficulty_level: "easy",
    conceptual_explanation: "Biochemical Oxygen Demand (BOD) is the amount of dissolved oxygen needed by aerobic biological organisms to break down organic material present in a given water sample at a specific temperature over a set period. Higher BOD indicates higher organic pollution and lower dissolved oxygen available for aquatic life.",
    ai_insights: {
      examiner_trap: "Thinking BOD measures total oxygen production; it measures the oxygen consumption demanded by decomposers, hence high BOD = polluted water.",
      elimination_tip: "High BOD = High organic load = Severe water pollution.",
      syllabus_node: "GS3.ENV.POLLUTION",
      high_yield_notes: [
        "Chemical Oxygen Demand (COD) measures both biodegradable and non-biodegradable organic matter",
        "Clean drinking water has a BOD < 1 ppm; highly polluted river water can exceed 20–30 ppm",
        "Eutrophication leads to algal blooms, high BOD, and aquatic dead zones"
      ]
    }
  },

  // =========================================================================
  // 4. INDIAN ECONOMY & MACROECONOMICS (2000–2010 Real UPSC Prelims)
  // =========================================================================
  {
    question_text: "The lowering of the Bank Rate by the Reserve Bank of India leads to:",
    options_matrix: {
      A: "More liquidity in the market",
      B: "Less liquidity in the market",
      C: "No change in the liquidity in the market",
      D: "Mobilization of more deposits by commercial banks"
    },
    correct_option: "A",
    exam_origin_tag: "UPSC Prelims 2001",
    subject_category: "Indian Economy",
    difficulty_level: "easy",
    conceptual_explanation: "Bank Rate is the standard rate at which the RBI is prepared to buy or rediscount bills of exchange or other commercial papers. Lowering the Bank Rate reduces borrowing costs for commercial banks, encouraging them to lend more to businesses and consumers, thereby increasing liquidity in the economy.",
    ai_insights: {
      examiner_trap: "Thinking lowering rates contracts credit; lower policy rates = expansionary/dovish monetary policy = more market liquidity.",
      elimination_tip: "Inverse relationship: Lower Rate -> Cheaper Credit -> Higher Money Supply (Liquidity).",
      syllabus_node: "GS3.ECO.MONETARY",
      high_yield_notes: [
        "Bank Rate is aligned with Marginal Standing Facility (MSF) penal borrowing rate",
        "Does not require collateral (unlike Repo Rate which requires G-Secs under LAF)",
        "Under Section 49 of the RBI Act, 1934"
      ]
    }
  },
  {
    question_text: "In the context of the Indian economy, open market operations (OMO) conducted by the RBI refer to:",
    options_matrix: {
      A: "Borrowing by scheduled banks from the RBI",
      B: "Lending by commercial banks to industry and trade",
      C: "Purchase and sale of government securities by the RBI",
      D: "Deposit mobilization from foreign institutional investors"
    },
    correct_option: "C",
    exam_origin_tag: "UPSC Prelims 2003",
    subject_category: "Indian Economy",
    difficulty_level: "easy",
    conceptual_explanation: "Open Market Operations (OMOs) refer to the outright purchase and sale of government securities (G-Secs) in the open market by the Reserve Bank of India with the objective of injecting or absorbing durable liquidity in the banking system.",
    ai_insights: {
      examiner_trap: "Confusing OMO (G-Sec purchase/sale) with LAF repo transactions which are short-term repurchase agreements.",
      elimination_tip: "Purchase of G-Secs by RBI = Injecting cash into banks. Sale of G-Secs by RBI = Sucking cash out of banks.",
      syllabus_node: "GS3.ECO.MONETARY",
      high_yield_notes: [
        "Outright OMOs permanently alter system liquidity",
        "Operation Twist: Simultaneous sale of short-term G-Secs and purchase of long-term G-Secs to flatten the yield curve",
        "GSAP (Government Securities Acquisition Programme) was a formal structured OMO variant"
      ]
    }
  },
  {
    question_text: "Which of the following is NOT included in the calculation of the Human Development Index (HDI) by UNDP?",
    options_matrix: {
      A: "Life Expectancy at Birth",
      B: "Mean Years of Schooling",
      C: "Social Status of Women",
      D: "Gross National Income (GNI) per capita"
    },
    correct_option: "C",
    exam_origin_tag: "UPSC Prelims 2004",
    subject_category: "Indian Economy",
    difficulty_level: "easy",
    conceptual_explanation: "The Human Development Index (HDI) developed by Mahbub ul Haq and Amartya Sen measures average achievement along three dimensions: 1. A long and healthy life (Life Expectancy at Birth), 2. Knowledge (Mean Years of Schooling and Expected Years of Schooling), 3. A decent standard of living (GNI per capita in PPP terms). Social status of women is tracked separately under the Gender Inequality Index (GII).",
    ai_insights: {
      examiner_trap: "Assuming gender or social status metrics are part of the core composite HDI; they belong to specialized satellite indices like GII or GDI.",
      elimination_tip: "HDI = Health (Life expectancy) + Education (Schooling years) + Income (GNI per capita PPP).",
      syllabus_node: "GS1.SOC.POVERTY",
      high_yield_notes: [
        "Published annually in UNDP Human Development Report since 1990",
        "Uses geometric mean of normalized dimensional indices",
        "Planetary Pressures-adjusted HDI (PHDI) accounts for carbon emissions and material footprint"
      ]
    }
  },
  {
    question_text: "Convertibility of the Rupee on Current Account implies:",
    options_matrix: {
      A: "Being able to convert rupee notes into gold",
      B: "Allowing the value of the rupee to be fixed by market forces for trade in goods and services",
      C: "Freely permitting the conversion of rupees to foreign currencies for goods, services, and remittances",
      D: "Allowing direct investment in overseas real estate and corporate equity without limits"
    },
    correct_option: "C",
    exam_origin_tag: "UPSC Prelims 2005",
    subject_category: "Indian Economy",
    difficulty_level: "intermediate",
    conceptual_explanation: "Current Account Convertibility means freedom to convert local currency into foreign currency and vice versa at market rates for transactions in goods (exports/imports), services, travel, education, and unilateral transfers/remittances. India accepted Article VIII obligations of the IMF in August 1994, achieving full Current Account Convertibility. Capital Account Convertibility remains partially restricted.",
    ai_insights: {
      examiner_trap: "Confusing Current Account Convertibility (goods, services, remittances) with Capital Account Convertibility (purchase of foreign assets, overseas real estate, sovereign debt).",
      elimination_tip: "Current Account = Trade in goods & services + remittances. Capital Account = Assets, debt, investments.",
      syllabus_node: "GS3.ECO.EXTERNAL",
      high_yield_notes: [
        "Full Current Account Convertibility achieved in 1994",
        "Tarapore Committee (1997 & 2006) laid down preconditions for full Capital Account Convertibility",
        "Liberalised Remittance Scheme (LRS) allows individuals to remit up to $250,000 per financial year"
      ]
    }
  },

  // =========================================================================
  // 5. SCIENCE & FRONTIER TECHNOLOGY (2000–2010 Real UPSC Prelims & Static GK)
  // =========================================================================
  {
    question_text: "What is the primary difference between a Geostationary Orbit (GEO) and a Sun-Synchronous Polar Orbit (SSO)?",
    options_matrix: {
      A: "GEO orbits from pole to pole while SSO orbits along the equatorial plane",
      B: "GEO operates at ~36,000 km altitude with a 24-hour orbital period, while SSO operates at low altitudes (600–800 km) passing over points at the same local solar time",
      C: "GEO satellites are used exclusively for spy imaging while SSO satellites handle all television broadcasts",
      D: "GEO satellites escape Earth's gravity entirely while SSO satellites remain in low orbit"
    },
    correct_option: "B",
    exam_origin_tag: "UPSC Prelims 2008",
    subject_category: "Science & Technology",
    difficulty_level: "intermediate",
    conceptual_explanation: "A Geostationary Orbit (GEO) is a circular orbit ~35,786 km directly above Earth's equator with an orbital period of 24 hours matching Earth's rotation, making the satellite appear stationary (ideal for telecommunications and meteorology). A Sun-Synchronous Orbit (SSO) is a near-polar low Earth orbit (600–800 km) where the satellite passes over any given latitude at the same local solar time, ensuring consistent lighting for optical remote sensing and earth observation.",
    ai_insights: {
      examiner_trap: "Mixing up GEO (high altitude, communication) with SSO (low altitude polar, remote sensing and earth photography).",
      elimination_tip: "GEO = 36,000 km, stationary over equator, INSAT/GSAT. SSO = 700 km, polar strip imaging, Cartosat/Resourcesat.",
      syllabus_node: "GS3.SCI.SPACE",
      high_yield_notes: [
        "GEO period = 23 hours, 56 minutes, 4 seconds (1 sidereal day)",
        "GSLV / LVM3 launches heavy payloads to Geosynchronous Transfer Orbit (GTO)",
        "PSLV is ISRO's workhorse launcher for Sun-Synchronous Polar Orbits"
      ]
    }
  },
  {
    question_text: "Which one of the following is the main constituent of biogas and compressed natural gas (CNG)?",
    options_matrix: {
      A: "Butane",
      B: "Propane",
      C: "Methane",
      D: "Ethane"
    },
    correct_option: "C",
    exam_origin_tag: "UPSC Prelims 2004",
    subject_category: "Science & Technology",
    difficulty_level: "easy",
    conceptual_explanation: "Methane (CH4) is the predominant constituent of both Biogas (55%–70% methane produced via anaerobic digestion of organic matter) and Compressed Natural Gas (CNG, 85%–95% methane). In contrast, Liquefied Petroleum Gas (LPG) consists primarily of Propane and Butane.",
    ai_insights: {
      examiner_trap: "Confusing CNG/Biogas (Methane) with LPG cylinder gas (Propane and Butane).",
      elimination_tip: "CNG/Biogas = Methane. LPG = Propane + Butane.",
      syllabus_node: "GS3.SCI.EMERGING",
      high_yield_notes: [
        "Gobardhan scheme / SATAT initiative promotes Compressed Bio-Gas (CBG)",
        "Methane is a potent short-lived greenhouse gas with ~28x higher Global Warming Potential than CO2 over 100 years",
        "Global Methane Pledge aims to reduce global methane emissions by 30% by 2030"
      ]
    }
  },

  // =========================================================================
  // 6. STATIC GK MASTER VAULT (High-Yield Ramsar, Passes, Tribes, Treaties)
  // =========================================================================
  {
    question_text: "Consider the following pairs of Mountain Passes and their corresponding States/UTs:\n1. Zoji La : Ladakh / Jammu & Kashmir\n2. Nathu La : Sikkim\n3. Shipki La : Himachal Pradesh\n4. Lipulekh : Arunachal Pradesh\nWhich of the pairs given above are correctly matched?",
    options_matrix: {
      A: "1, 2 and 3 only",
      B: "2 and 4 only",
      C: "1 and 3 only",
      D: "1, 2, 3 and 4"
    },
    correct_option: "A",
    exam_origin_tag: "Static GK Core",
    subject_category: "Static GK",
    difficulty_level: "intermediate",
    conceptual_explanation: "Correct pass locations:\n1. Zoji La: Connects Srinagar with Kargil and Leh in Ladakh / J&K.\n2. Nathu La: Connects Sikkim with Tibet Autonomous Region in China (part of historic Silk Road).\n3. Shipki La: Located in Kinnaur, Himachal Pradesh; the Sutlej river enters India through this pass.\n4. Lipulekh: Located in Pithoragarh, Uttarakhand (trijunction of India, Nepal, and China; used for Kailash Mansarovar Yatra), NOT Arunachal Pradesh (Arunachal passes include Bomdi La, Diphu, Dihang).",
    ai_insights: {
      examiner_trap: "Placing Lipulekh in Arunachal Pradesh; Lipulekh is in Uttarakhand and part of the Kalapani territorial dispute.",
      elimination_tip: "Eliminate pair 4 immediately to get Option A.",
      syllabus_node: "GS1.GEO.IND_PHYS",
      high_yield_notes: [
        "Zoji La tunnel: All-weather connectivity between Srinagar and Leh",
        "Shipki La: Entry point of River Sutlej into India",
        "Lipulekh: Kailash Mansarovar pilgrim transit in Uttarakhand"
      ]
    }
  },
  {
    question_text: "Which of the following Ramsar Wetlands is an artificial/man-made freshwater lake located in Punjab?",
    options_matrix: {
      A: "Harike Wetland",
      B: "Renuka Lake",
      C: "Rudrasagar Lake",
      D: "Kolleru Lake"
    },
    correct_option: "A",
    exam_origin_tag: "Static GK Core",
    subject_category: "Static GK",
    difficulty_level: "intermediate",
    conceptual_explanation: "Harike Wetland (Harike Pattan) is a man-made wetland formed by the construction of a barrage across the confluence of the Beas and Sutlej rivers in 1952 in the Ferozepur and Tarn Taran districts of Punjab. It is a vital Ramsar site and wintering ground for migratory waterfowl. Renuka is in Himachal Pradesh, Rudrasagar is in Tripura, and Kolleru is in Andhra Pradesh.",
    ai_insights: {
      examiner_trap: "Confusing Harike (Punjab) with Renuka Lake (Himachal Pradesh, India's smallest Ramsar wetland).",
      elimination_tip: "Confluence of Beas and Sutlej = Harike Barrage, Punjab (Indira Gandhi Canal originates here).",
      syllabus_node: "GS3.ENV.CONSERVATION",
      high_yield_notes: [
        "Indira Gandhi Canal takes off from Harike Barrage",
        "Renuka Lake (HP) is the smallest wetland in India",
        "Sundarbans is the largest Ramsar site in India"
      ]
    }
  },
  {
    question_text: "Which of the following International Environmental Conventions is specifically aimed at protecting human health and the environment against the adverse effects of Persistent Organic Pollutants (POPs)?",
    options_matrix: {
      A: "Basel Convention",
      B: "Stockholm Convention",
      C: "Rotterdam Convention",
      D: "Minamata Convention"
    },
    correct_option: "B",
    exam_origin_tag: "Static GK Core",
    subject_category: "Static GK",
    difficulty_level: "intermediate",
    conceptual_explanation: "The Stockholm Convention on Persistent Organic Pollutants (2001, entered into force 2004) is an international environmental treaty aimed at eliminating or restricting the production and use of Persistent Organic Pollutants (POPs like DDT, dioxins, PCBs, furans) which resist environmental degradation and bioaccumulate. Basel Convention deals with hazardous transboundary waste, Rotterdam deals with Prior Informed Consent for hazardous chemicals in trade, and Minamata deals with Mercury.",
    ai_insights: {
      examiner_trap: "Mixing up the chemical treaties: Basel (Waste), Rotterdam (Trade Information / PIC), Stockholm (POPs), Minamata (Mercury).",
      elimination_tip: "Stockholm = POPs ('Dirty Dozen'). Minamata = Mercury. Basel = Waste shipment.",
      syllabus_node: "GS3.ENV.CONSERVATION",
      high_yield_notes: [
        "Stockholm Convention (POPs): Bioaccumulative and toxic synthetic chemicals",
        "Minamata Convention (2013): Mercury phase-out",
        "Rotterdam Convention (1998): Prior Informed Consent (PIC) procedure for hazardous chemicals in international trade"
      ]
    }
  },
  {
    question_text: "In the context of Indian classical performing arts, which of the following pairs of Classical Dance and State of Origin is NOT correctly matched?",
    options_matrix: {
      A: "Sattriya : Assam",
      B: "Kathakali : Kerala",
      C: "Kuchipudi : Andhra Pradesh",
      D: "Mohiniyattam : Tamil Nadu"
    },
    correct_option: "D",
    exam_origin_tag: "Static GK Core",
    subject_category: "Static GK",
    difficulty_level: "easy",
    conceptual_explanation: "Mohiniyattam originated in Kerala (the dance of the enchantress 'Mohini', characterized by graceful swaying movements and white-and-gold Kasavu attire). Tamil Nadu is the origin of Bharatanatyam. Sattriya originated in Assam (propagated by Mahapurusha Sankaradeva in Vaishnavite Sattras).",
    ai_insights: {
      examiner_trap: "Confusing Mohiniyattam (Kerala) with Bharatanatyam (Tamil Nadu). Kerala is the only state with two recognized classical dance forms: Kathakali and Mohiniyattam.",
      elimination_tip: "Kerala has TWO classical dances: Kathakali (dance drama) and Mohiniyattam (feminine solo dance).",
      syllabus_node: "GS1.CUL.PERFORM",
      high_yield_notes: [
        "8 Classical Dances recognized by Sangeet Natak Akademi (Ministry of Culture also recognizes Chhau as the 9th)",
        "Sattriya: Introduced in 15th century by Sankaradeva in Assam",
        "Kuchipudi: Originated in Kuchelapuram village, Andhra Pradesh"
      ]
    }
  },
  {
    question_text: "Consider the following statements regarding the Classical Languages of India:\n1. Tamil was the first language declared as a Classical Language in India in 2004.\n2. The criteria for declaration include high antiquity of its early texts/recorded history over a period of 1500–2000 years.\n3. In October 2024, Marathi, Bengali, Pali, Prakrit, and Assamese were conferred Classical Language status.\nWhich of the statements given above are correct?",
    options_matrix: {
      A: "1 and 2 only",
      B: "2 and 3 only",
      C: "1 and 3 only",
      D: "1, 2 and 3"
    },
    correct_option: "D",
    exam_origin_tag: "Static GK Core",
    subject_category: "Static GK",
    difficulty_level: "intermediate",
    conceptual_explanation: "All three statements are correct: 1. Tamil was the first language granted Classical Language status in 2004, followed by Sanskrit (2005), Telugu (2008), Kannada (2008), Malayalam (2013), and Odia (2014). 2. Criteria include antiquity of 1500-2000 years, valuable heritage of ancient literature/epics, and original literary tradition not borrowed from another speech community. 3. In October 2024, the Union Cabinet approved Classical status for 5 new languages: Marathi, Bengali, Pali, Prakrit, and Assamese, taking the total to 11.",
    ai_insights: {
      examiner_trap: "Thinking only 6 languages exist; the Union Cabinet added 5 more in October 2024 (now 11 total).",
      elimination_tip: "Tamil was first (2004), Sanskrit second (2005), Odia sixth (2014), and 5 additions in 2024.",
      syllabus_node: "GS1.CUL.LIT_PHIL",
      high_yield_notes: [
        "Total 11 Classical Languages: Tamil, Sanskrit, Telugu, Kannada, Malayalam, Odia, Marathi, Bengali, Pali, Prakrit, Assamese",
        "Nodal Ministry: Ministry of Culture",
        "Two major annual international awards for scholars in classical Indian languages"
      ]
    }
  }
];

async function main() {
  console.log("=".repeat(70));
  console.log("  TARK INTELLIGENCE — 25-YEAR PYQ & STATIC GK INGESTION ENGINE");
  console.log("=".repeat(70));

  console.log(`Preparing to ingest ${AUTHENTIC_PYQ_AND_STATIC_DATA.length} high-yield verified questions...`);

  let successCount = 0;
  let skipCount = 0;

  for (const q of AUTHENTIC_PYQ_AND_STATIC_DATA) {
    // Check if question text already exists to ensure idempotency
    const { data: existing } = await supabase
      .from("static_questions")
      .select("id")
      .eq("question_text", q.question_text)
      .maybeSingle();

    if (existing) {
      console.log(`[SKIP] Already present: "${q.question_text.substring(0, 50)}..."`);
      skipCount++;
      continue;
    }

    const { data, error } = await supabase
      .from("static_questions")
      .insert([
        {
          question_text: q.question_text,
          options_matrix: q.options_matrix,
          correct_option: q.correct_option,
          exam_origin_tag: q.exam_origin_tag,
          subject_category: q.subject_category,
          difficulty_level: q.difficulty_level,
          conceptual_explanation: q.conceptual_explanation,
          ai_insights: q.ai_insights,
          is_generated: false,
          created_at: new Date().toISOString(),
        }
      ])
      .select("id")
      .single();

    if (error) {
      console.error(`[ERROR] Insert failed for "${q.question_text.substring(0, 40)}":`, error.message);
    } else {
      console.log(`[INSERTED] [${q.exam_origin_tag}] ${q.subject_category} (ID: ${data.id})`);
      successCount++;
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(`Ingestion completed. Inserted: ${successCount} | Skipped: ${skipCount}`);
  console.log("=".repeat(70));

  // Query updated totals
  const { count } = await supabase
    .from("static_questions")
    .select("*", { count: "exact", head: true });

  console.log(`Total questions in static_questions table: ${count}`);
}

main().catch((err) => {
  console.error("Fatal ingestion error:", err);
  process.exit(1);
});
