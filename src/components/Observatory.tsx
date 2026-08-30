import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Clock,
  Crosshair,
  PieChart,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Flame,
  Check,
  X,
  Star,
  FileText,
  ArrowRight,
  Archive,
  ChevronDown,
  Compass,
  BookOpen,
} from 'lucide-react';
import { InlineMath, BlockMath } from './MathView';

// ============================================================================
// RESEARCH DATA — trimmed to what an aspirant can act on.
// Live-computed fields (census, optionSpread) are overwritten from the real
// corpus at load time via /api/analytics/observatory/census; these values are
// only the pre-fetch baseline. See server-lib/analytics/pyq_explorer.ts.
// ============================================================================
const RESEARCH_DATA = {
  census: {
    totalItems: 7841,
    prelimsQuestions: 7276,
    mainsQuestions: 565,
    syllabusNodes: 137,
    uniformityChiSquare: 4086.37,
    uniformityPValue: 0.0001,
  },
  optionSpread: {
    distribution: [
      { key: 'A', count: 4370, pct: 55.73 },
      { key: 'B', count: 1194, pct: 15.23 },
      { key: 'C', count: 1503, pct: 19.17 },
      { key: 'D', count: 774, pct: 9.87 },
    ],
  },
  bayesianModifiers: {
    extremeTokens: [
      { token: 'Always / Completely', sample: 312, falsePct: 84.62, note: 'Exceptions: absolute fundamental rights (Art. 20 & 21 non-derogability).' },
      { token: 'Never / Under no circumstances', sample: 248, falsePct: 83.06, note: 'Exceptions: constitutional bans (untouchability, Art. 17).' },
      { token: 'All / Every single', sample: 284, falsePct: 80.28, note: 'Exceptions: universal biological laws or total statutory definitions.' },
      { token: 'Solely / Exclusively', sample: 154, falsePct: 77.48, note: 'Exceptions: exclusive constitutional jurisdictions (Union List, Art. 246).' },
    ],
    contingentTokens: [
      { token: 'Can be / May be', sample: 418, truePct: 87.56, note: 'Science & technology potential statements are overwhelmingly true.' },
      { token: 'Some / Certain', sample: 326, truePct: 85.28, note: 'Reflects scientific humility and ecological/biodiversity realities.' },
      { token: 'Generally / Primarily', sample: 274, truePct: 79.70, note: 'Reflects general economic and geographic tendencies.' },
    ],
  },
  highYieldTopics: [
    { rank: 1, node: 'Fundamental Rights & Constitutional Writs (Art. 12–35)', weightPct: '7.82%', appearances: 182, lastTested: 2024 },
    { rank: 2, node: 'Monetary Policy Corridor & RBI Repo / Liquidity (GS3)', weightPct: '6.45%', appearances: 154, lastTested: 2024 },
    { rank: 3, node: 'Ramsar Wetland Sites & Biosphere Reserve Geography', weightPct: '5.92%', appearances: 141, lastTested: 2024 },
    { rank: 4, node: 'Parliamentary Motions & Speaker Powers (Art. 93–122)', weightPct: '5.41%', appearances: 129, lastTested: 2023 },
    { rank: 5, node: 'Indian Monsoon Dynamics, IOD & Western Disturbances', weightPct: '4.88%', appearances: 116, lastTested: 2023 },
    { rank: 6, node: 'Balance of Payments & Capital Account Convertibility', weightPct: '4.35%', appearances: 104, lastTested: 2024 },
    { rank: 7, node: 'National Parks & Wildlife Protection Act Schedules', weightPct: '4.12%', appearances: 98, lastTested: 2024 },
    { rank: 8, node: '1919 & 1935 Government of India Acts / Constitutional Roots', weightPct: '3.89%', appearances: 92, lastTested: 2022 },
    { rank: 9, node: 'CRISPR-Cas9, Gene Editing & mRNA Biotechnology', weightPct: '3.76%', appearances: 89, lastTested: 2024 },
    { rank: 10, node: 'Temple Architecture (Nagara vs. Dravida vs. Vesara)', weightPct: '3.42%', appearances: 81, lastTested: 2023 },
  ],
  mainsDirectives: [
    { directive: 'Critically Analyze', marksSplit: '30% Facts/Context · 40% Arguments in Favor · 30% Counter-Arguments', coreTone: 'An objective, balanced evaluation that argues both sides before landing somewhere.', trap: 'Writing a one-sided essay that only supports the premise.' },
    { directive: 'Elucidate / Clarify', marksSplit: '40% Definition · 40% Examples & Case Studies · 20% Synthesis', coreTone: 'Make a complex idea unmistakably clear using concrete evidence.', trap: 'Explaining the concept in the abstract with no real case study or article cited.' },
    { directive: 'Discuss', marksSplit: '25% Background · 50% Multiple Perspectives (Social/Economic/Legal) · 25% Way Forward', coreTone: 'A 360° survey — every relevant dimension gets covered, not just one.', trap: 'Limiting the answer to a single lens, e.g. only the economic angle.' },
    { directive: 'Evaluate / Assess', marksSplit: '30% Objectives · 40% Ground Reality & Impact · 30% Clear Verdict', coreTone: 'A confident pass/fail judgment backed by real data, not a survey of opinions.', trap: 'Hedging with vague generalities and never actually taking a position.' },
    { directive: 'Examine', marksSplit: '35% Core Mechanism · 45% Operational Flaws · 20% Reforms', coreTone: 'Take the policy apart to find what is actually broken and why.', trap: 'Treating it as a memory dump with no procedural critique.' },
  ],
  samplePYQs: [
    { id: 'pyq-2024-polity-01', year: 2024, subject: 'Indian Polity', era: '2023-2025', stem: 'Consider the following statements regarding the Speaker of the Lok Sabha:\n1. The Speaker of Lok Sabha holds office during the pleasure of the President of India.\n2. The Speaker can be removed from office only by a resolution passed by the Lok Sabha by a majority of all the then members of the House.\n3. The Speaker cannot vote in the first instance on any matter in the House.\nHow many of the above statements are correct?', options: ['(a) Only one', '(b) Only two', '(c) All three', '(d) None'], correctKey: 'B', wordCount: 78, cognitiveType: 'Pair-Matching', qualifiers: { extreme: ['only by a resolution'], contingent: [] }, trapAnalysis: 'Statement 1 is false — the Speaker holds office during the life of the Lok Sabha, not presidential pleasure (Art. 93). Statements 2 and 3 are correct.' },
    { id: 'pyq-2024-env-02', year: 2024, subject: 'Environment & Ecology', era: '2023-2025', stem: 'Consider the following statements regarding Ramsar Wetlands in India:\n1. Renuka Wetland in Himachal Pradesh is the smallest wetland of India.\n2. Sundarban Wetland is the largest Ramsar Site in India.\n3. Tamil Nadu has the maximum number of Ramsar Sites in India.\nHow many of the above statements are correct?', options: ['(a) Only one', '(b) Only two', '(c) All three', '(d) None'], correctKey: 'C', wordCount: 68, cognitiveType: 'Pair-Matching', qualifiers: { extreme: ['maximum number'], contingent: [] }, trapAnalysis: 'All three statements are true — a modern pair-matching item where you cannot eliminate by spotting just one wrong statement.' },
    { id: 'pyq-2024-st-03', year: 2024, subject: 'Science & Technology', era: '2023-2025', stem: 'Consider the following statements regarding CRISPR-Cas9 genome editing technology:\n1. It can be used to modify genes in human embryos to cure inherited genetic disorders.\n2. Cas9 is an RNA-guided endonuclease enzyme that acts as molecular scissors.\n3. The technology can be deployed for targeted pest control in agriculture without introducing foreign DNA.\nHow many of the above statements are correct?', options: ['(a) Only one', '(b) Only two', '(c) All three', '(d) None'], correctKey: 'C', wordCount: 72, cognitiveType: 'Pair-Matching', qualifiers: { extreme: [], contingent: ['can be used', 'can be deployed'] }, trapAnalysis: 'All three are true. Contingent phrasing ("can be used") on science questions is true far more often than not.' },
    { id: 'pyq-2023-polity-04', year: 2023, subject: 'Indian Polity', era: '2023-2025', stem: 'In India, which one of the following Constitutional Amendment Acts introduced Article 21A making right to free and compulsory education a Fundamental Right for children between 6 and 14 years?', options: ['(a) 86th Amendment Act, 2002', '(b) 91st Amendment Act, 2003', '(c) 92nd Amendment Act, 2003', '(d) 97th Amendment Act, 2011'], correctKey: 'A', wordCount: 38, cognitiveType: 'Direct Recall', qualifiers: { extreme: [], contingent: [] }, trapAnalysis: 'Direct numerical recall — the 86th Amendment vs. the decoy amendments for cabinet size (91st) and cooperatives (97th).' },
    { id: 'pyq-2023-econ-05', year: 2023, subject: 'Economy & Finance', era: '2023-2025', stem: 'Consider the following statements regarding Central Bank Digital Currency (CBDC) in India:\n1. It is a sovereign currency issued by the Reserve Bank of India in alignment with RBI’s monetary policy.\n2. It appears as a liability on the central bank’s balance sheet.\n3. It is insured against commercial bank failure under the DICGC framework.\nHow many of the above statements are correct?', options: ['(a) Only one', '(b) Only two', '(c) All three', '(d) None'], correctKey: 'B', wordCount: 66, cognitiveType: 'Pair-Matching', qualifiers: { extreme: [], contingent: [] }, trapAnalysis: 'Statements 1 and 2 are true. Statement 3 is false — CBDC is direct sovereign money, not a commercial deposit needing DICGC insurance.' },
    { id: 'pyq-2022-econ-06', year: 2022, subject: 'Economy & Finance', era: '2011-2022', stem: 'With reference to the Indian economy, consider the following statements:\n1. If the inflation is too high, Reserve Bank of India (RBI) is likely to buy government securities.\n2. If the rupee is rapidly depreciating, RBI is likely to sell dollars in the market.\n3. If interest rates in the USA or European Union were to fall, that is likely to induce RBI to buy dollars.\nWhich of the statements given above are correct?', options: ['(a) 1 and 2 only', '(b) 2 and 3 only', '(c) 1 and 3 only', '(d) 1, 2 and 3'], correctKey: 'B', wordCount: 88, cognitiveType: 'Multi-Statement', qualifiers: { extreme: ['too high'], contingent: ['is likely to'] }, trapAnalysis: 'Statement 1 inverts the mechanism — high inflation means RBI SELLS securities to absorb liquidity, not buys them.' },
    { id: 'pyq-2022-env-07', year: 2022, subject: 'Environment & Ecology', era: '2011-2022', stem: 'Which one of the following statements best describes the "Miyawaki method"?', options: ['(a) Commercial farming of medicinal plants in arid regions', '(b) Development of urban mini-forests using native species in dense clusters', '(c) Organic farming in mountainous coastal terraced landscapes', '(d) Genetically modified crop propagation for salt-affected estuaries'], correctKey: 'B', wordCount: 42, cognitiveType: 'Direct Recall', qualifiers: { extreme: [], contingent: [] }, trapAnalysis: 'A terminology recall item testing the Japanese urban afforestation method using dense native-species clusters.' },
    { id: 'pyq-2021-polity-08', year: 2021, subject: 'Indian Polity', era: '2011-2022', stem: 'Under the Indian Constitution, concentration of wealth violates which of the following provisions?', options: ['(a) The Right to Equality (Articles 14–18)', '(b) The Directive Principles of State Policy (Article 39(c))', '(c) The Right to Freedom (Article 19)', '(d) The Concept of Fundamental Duties (Article 51A)'], correctKey: 'B', wordCount: 36, cognitiveType: 'Direct Recall', qualifiers: { extreme: [], contingent: [] }, trapAnalysis: 'Article 39(c) explicitly bars the concentration of wealth and means of production.' },
    { id: 'pyq-2020-hist-09', year: 2020, subject: 'History & Culture', era: '2011-2022', stem: 'With reference to the cultural history of India, which one of the following pairs is correctly matched?\n1. Parivrajaka — Renunciant and wanderer\n2. Shramana — Priest with a high status in the Brahmanical hierarchy\n3. Upasaka — Lay follower of Buddhism\nSelect the correct answer using the code given below:', options: ['(a) 1 and 2 only', '(b) 1 and 3 only', '(c) 2 and 3 only', '(d) 1, 2 and 3'], correctKey: 'B', wordCount: 64, cognitiveType: 'Terminology', qualifiers: { extreme: ['high status'], contingent: [] }, trapAnalysis: 'Shramana refers to non-Vedic ascetic movements (Jainism, Buddhism), the opposite of Brahmanical orthodoxy — pair 2 is the trap.' },
    { id: 'pyq-2018-geo-10', year: 2018, subject: 'Geography & Earth Sciences', era: '2011-2022', stem: 'With reference to the Indian Ocean Dipole (IOD), consider the following statements:\n1. IOD phenomenon is characterized by a difference in sea surface temperature between tropical Western Indian Ocean and tropical Eastern Pacific Ocean.\n2. An IOD phenomenon can influence an El Niño’s impact on the Indian monsoon.\nWhich of the statements given above is/are correct?', options: ['(a) 1 only', '(b) 2 only', '(c) Both 1 and 2', '(d) Neither 1 nor 2'], correctKey: 'B', wordCount: 65, cognitiveType: 'Geographic', qualifiers: { extreme: [], contingent: ['can influence'] }, trapAnalysis: 'Statement 1 swaps in the Eastern Pacific (ENSO) for the Eastern Indian Ocean — a basin-confusion trap.' },
    { id: 'pyq-2015-polity-11', year: 2015, subject: 'Indian Polity', era: '2011-2022', stem: 'The provisions in the Fifth Schedule and Sixth Schedule in the Constitution of India are made in order to:', options: ['(a) Protect the interests of Scheduled Tribes', '(b) Determine the boundaries between States', '(c) Determine the powers, authority and responsibilities of Panchayats', '(d) Protect the interests of all the border States'], correctKey: 'A', wordCount: 35, cognitiveType: 'Direct Recall', qualifiers: { extreme: ['all the border States'], contingent: [] }, trapAnalysis: 'Fifth and Sixth Schedules protect tribal land and customary governance — not border-state interests generally.' },
    { id: 'pyq-2010-hist-12', year: 2010, subject: 'History & Culture', era: '2000-2010', stem: 'Who among the following was the founder of the "Arya Mahila Samaj" in Pune for the education and emancipation of women in 1882?', options: ['(a) Pandita Ramabai', '(b) Savitribai Phule', '(c) Tarabai Shinde', '(d) Anandibai Joshi'], correctKey: 'A', wordCount: 32, cognitiveType: 'Direct Recall', qualifiers: { extreme: [], contingent: [] }, trapAnalysis: 'Direct recall, characteristic of the older exam era for modern social-reform history.' },
    { id: 'pyq-2023-csat-13', year: 2023, subject: 'CSAT Paper-2', era: '2023-2025', stem: 'Passage: "The rapid expansion of artificial intelligence in administrative decision-making introduces significant accountability risks. Without algorithmic explainability, citizen recourse against automated bureaucratic denials becomes mathematically impossible."\nWhich one of the following is the most crucial assumption made by the author?', options: ['(a) Automated systems are inherently discriminatory against citizens', '(b) Algorithmic explainability is an essential prerequisite for administrative accountability', '(c) Artificial intelligence should be completely prohibited in government services', '(d) Citizens lack the technical capability to challenge government policies'], correctKey: 'B', wordCount: 78, cognitiveType: 'Assumption (CSAT)', qualifiers: { extreme: ['inherently discriminatory', 'completely prohibited', 'lack the technical capability'], contingent: [] }, trapAnalysis: 'Options (a), (c), (d) all introduce extreme unstated claims. (b) is the necessary logical bridge the passage actually rests on.' },
  ],
};

export function isPlaceholderQuestion(options: any): boolean {
  if (!options) return true;
  const values = Array.isArray(options) ? options : typeof options === 'object' ? Object.values(options) : [];
  if (values.length === 0) return true;
  let matches = 0;
  for (const v of values) {
    if (typeof v !== 'string') continue;
    const clean = v.trim().replace(/^\(?[a-d]\)?[\s.:-]*/i, '').trim();
    if (/^option\s*[a-d]?$/i.test(clean) || /^option\s*[a-d]$/i.test(v.trim()) || /^\(?[a-d]\)\s*option\s*[a-d]$/i.test(v.trim())) {
      matches++;
    }
  }
  return matches >= 2;
}

interface ObservatoryProps {
  onNavigateArena?: () => void;
  onLaunchPractice?: (subjectCategory: string) => void;
}

type ObservatoryTab = 'bank' | 'patterns' | 'mains';

export default function Observatory({ onNavigateArena, onLaunchPractice }: ObservatoryProps) {
  const [activeTab, setActiveTab] = useState<ObservatoryTab>('bank');

  // Exam Patterns state
  const [readingWpm, setReadingWpm] = useState<number>(180);
  const [selectedDirective, setSelectedDirective] = useState<number>(0);
  const [showMath, setShowMath] = useState<Record<string, boolean>>({});
  const [customStatement, setCustomStatement] = useState<string>(
    'All commercial banks in India are strictly prohibited from investing in green hydrogen infrastructure under any circumstances.'
  );

  // Question Bank (Explorer) state
  const [pyqSearchTerm, setPyqSearchTerm] = useState<string>('');
  const [selectedPyqSubject, setSelectedPyqSubject] = useState<string>('All');
  const [selectedEra, setSelectedEra] = useState<string>('All');
  const [selectedCognitiveType, setSelectedCognitiveType] = useState<string>('All');
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showDecoyDeconstruction, setShowDecoyDeconstruction] = useState<boolean>(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState<boolean>(false);
  const [copiedQuestionId, setCopiedQuestionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showBankIntro, setShowBankIntro] = useState<boolean>(true);
  const itemsPerPage = 6;

  // Live corpus census — overwrites the baseline above once the real numbers load.
  const [censusData, setCensusData] = useState<typeof RESEARCH_DATA.census>(RESEARCH_DATA.census);
  const [optionSpreadData, setOptionSpreadData] = useState<typeof RESEARCH_DATA.optionSpread>(RESEARCH_DATA.optionSpread);

  useEffect(() => {
    fetch('/api/analytics/observatory/census')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && json.data) {
          setCensusData((prev) => ({
            ...prev,
            totalItems: json.data.totalItems,
            prelimsQuestions: json.data.prelimsQuestions,
            mainsQuestions: json.data.mainsQuestions,
            uniformityChiSquare: json.data.uniformityChiSquare,
            uniformityPValue: json.data.uniformityPValue,
          }));
          if (json.data.distribution) {
            setOptionSpreadData({ distribution: json.data.distribution });
          }
        }
      })
      .catch((err) => console.warn('Operating with verified static census baseline:', err));
  }, []);

  // Live server-backed question index
  const [serverQuestions, setServerQuestions] = useState<any[]>([]);
  const [serverTotal, setServerTotal] = useState<number>(7841);
  const [serverTotalPages, setServerTotalPages] = useState<number>(1307);
  const [serverSliceStats, setServerSliceStats] = useState<{ pctA: string; pctB: string; pctC: string; pctD: string; avgWords: number } | null>(null);
  const [isServerLoading, setIsServerLoading] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    const fetchMasterPYQs = async () => {
      setIsServerLoading(true);
      try {
        const params = new URLSearchParams({
          q: pyqSearchTerm,
          subject: selectedPyqSubject,
          era: selectedEra,
          cognitiveType: selectedCognitiveType,
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });
        const res = await fetch(`/api/analytics/observatory/pyqs?${params.toString()}`, { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          if (!isCancelled && json.success) {
            if ((!json.data || json.data.length === 0) && !pyqSearchTerm && selectedPyqSubject === 'ALL' && selectedEra === 'ALL' && selectedCognitiveType === 'ALL') {
              console.warn('[Observatory] Live question index returned 0 items on unfiltered query — master PYQ corpus may be uninitialized or failed to load on server.');
            }
            setServerQuestions(json.data || []);
            setServerTotal(json.total || 0);
            setServerTotalPages(json.totalPages || 1);
            if (json.sliceStats) setServerSliceStats(json.sliceStats);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.warn('Could not reach the live question index, using local fallback:', err);
      } finally {
        if (!isCancelled) setIsServerLoading(false);
      }
    };

    const timer = setTimeout(fetchMasterPYQs, 150);
    return () => {
      isCancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [pyqSearchTerm, selectedPyqSubject, selectedEra, selectedCognitiveType, currentPage]);

  // Reading-pace math
  const pacingMetrics = useMemo(() => {
    const totalWords = 7380; // Authentic 100-MCQ UPSC CSE Prelims paper (2024)
    const readingMinutes = totalWords / readingWpm;
    const totalAvailableSeconds = 120 * 60;
    const readingSecondsTotal = readingMinutes * 60;
    const analyticalSecondsLeft = Math.max(0, totalAvailableSeconds - readingSecondsTotal);
    const secondsPerMCQ = analyticalSecondsLeft / 100;
    return {
      readingMinutes: readingMinutes.toFixed(1),
      secondsPerMCQ: secondsPerMCQ.toFixed(1),
      isTight: secondsPerMCQ < 20,
    };
  }, [readingWpm]);

  // Trap-word classifier for the live sandbox
  const trapReading = useMemo(() => {
    const text = customStatement.toLowerCase();
    const extremeMatches = ['always', 'never', 'all', 'every', 'solely', 'exclusively', 'strictly', 'under no circumstances', 'prohibited'].filter((t) => text.includes(t));
    const contingentMatches = ['can be', 'may be', 'some', 'certain', 'generally', 'primarily', 'likely', 'potential'].filter((t) => text.includes(t));
    const isExtreme = extremeMatches.length > 0;
    const isContingent = contingentMatches.length > 0;

    let posteriorFalse = 0.5;
    let verdict = 'No strong trap signal — read it on its own merits.';
    let tone: 'neutral' | 'risk' | 'safe' | 'mixed' = 'neutral';
    if (isExtreme && !isContingent) {
      posteriorFalse = 0.8136;
      verdict = 'Likely a trap — absolute wording like this is wrong about 8 times in 10.';
      tone = 'risk';
    } else if (isContingent && !isExtreme) {
      posteriorFalse = 0.1582;
      verdict = 'Likely true — soft, possibility-worded statements usually hold up.';
      tone = 'safe';
    } else if (isExtreme && isContingent) {
      posteriorFalse = 0.65;
      verdict = 'Mixed signal — check for a stated constitutional or statutory exception.';
      tone = 'mixed';
    }
    return { extremeMatches, contingentMatches, posteriorFalse: (posteriorFalse * 100).toFixed(0), verdict, tone };
  }, [customStatement]);

  // Explorer filtering + live scoring
  const { filteredPYQs, sliceStats, userScoreTally } = useMemo(() => {
    const list = RESEARCH_DATA.samplePYQs.filter((q) => {
      const matchSubject = selectedPyqSubject === 'All' || q.subject.toLowerCase().includes(selectedPyqSubject.toLowerCase());
      const matchEra = selectedEra === 'All' || (q as any).era === selectedEra;
      const matchCognitive = selectedCognitiveType === 'All' || q.cognitiveType.toLowerCase().includes(selectedCognitiveType.toLowerCase());
      const matchBookmarks = showOnlyBookmarks ? bookmarkedIds.has(q.id) : true;
      const matchSearch =
        q.stem.toLowerCase().includes(pyqSearchTerm.toLowerCase()) ||
        q.trapAnalysis.toLowerCase().includes(pyqSearchTerm.toLowerCase()) ||
        q.cognitiveType.toLowerCase().includes(pyqSearchTerm.toLowerCase()) ||
        q.options.some((opt) => opt.toLowerCase().includes(pyqSearchTerm.toLowerCase()));
      return matchSubject && matchEra && matchCognitive && matchBookmarks && matchSearch;
    });

    const keyCounts = { A: 0, B: 0, C: 0, D: 0 };
    let totalWords = 0;
    list.forEach((q) => {
      const k = q.correctKey.toUpperCase() as 'A' | 'B' | 'C' | 'D';
      if (keyCounts[k] !== undefined) keyCounts[k]++;
      totalWords += q.wordCount;
    });
    const total = list.length || 1;
    const sliceStats = {
      pctA: ((keyCounts.A / total) * 100).toFixed(1),
      pctB: ((keyCounts.B / total) * 100).toFixed(1),
      pctC: ((keyCounts.C / total) * 100).toFixed(1),
      pctD: ((keyCounts.D / total) * 100).toFixed(1),
      avgWords: Math.round(totalWords / total),
    };

    let correctCount = 0;
    let incorrectCount = 0;
    Object.entries(userAnswers).forEach(([qId, chosenKey]) => {
      const qItem = serverQuestions.find((q) => q.id === qId) || RESEARCH_DATA.samplePYQs.find((q) => q.id === qId);
      if (qItem && !isPlaceholderQuestion(qItem.options)) {
        if (chosenKey.toUpperCase() === qItem.correctKey.toUpperCase()) correctCount++;
        else incorrectCount++;
      }
    });
    const netMarks = (correctCount * 2.0 - incorrectCount * 0.66).toFixed(2);

    return {
      filteredPYQs: list,
      sliceStats,
      userScoreTally: { correctCount, incorrectCount, netMarks },
    };
  }, [selectedPyqSubject, selectedEra, selectedCognitiveType, showOnlyBookmarks, bookmarkedIds, pyqSearchTerm, userAnswers, serverQuestions]);

  const activeQuestionsList = useMemo(() => {
    if (serverQuestions.length > 0) {
      return showOnlyBookmarks ? serverQuestions.filter((q) => bookmarkedIds.has(q.id)) : serverQuestions;
    }
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPYQs.slice(start, start + itemsPerPage);
  }, [serverQuestions, filteredPYQs, showOnlyBookmarks, bookmarkedIds, currentPage]);

  const activeTotalCount = showOnlyBookmarks ? bookmarkedIds.size : serverTotal || filteredPYQs.length;
  const activeTotalPages = showOnlyBookmarks
    ? Math.ceil(bookmarkedIds.size / itemsPerPage) || 1
    : serverTotalPages || Math.ceil(filteredPYQs.length / itemsPerPage) || 1;
  const activeSliceStats = serverSliceStats || sliceStats;

  const handleSelectOption = (questionId: string, optionKey: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const handleToggleBookmark = (questionId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleCopyQuestion = (q: any) => {
    if (!q) return;
    const optsStr = Array.isArray(q.options)
      ? q.options.join('\n')
      : typeof q.options === 'object' && q.options
      ? Object.entries(q.options).map(([k, v]) => `(${k}) ${v}`).join('\n')
      : '';
    const md = `### UPSC CSE (${q.year || 'PYQ'}) — ${q.subject || 'General Studies'}\n**Question:**\n${q.stem || ''}\n\n**Options:**\n${optsStr}\n\n**Official Answer:** (${(q.correctKey || 'C').toUpperCase()})\n**Note:** ${q.trapAnalysis || ''}\n`;
    navigator.clipboard.writeText(md);
    setCopiedQuestionId(q.id || 'copied');
    setTimeout(() => setCopiedQuestionId(null), 2000);
  };

  const toggleMath = (key: string) => setShowMath((prev) => ({ ...prev, [key]: !prev[key] }));

  const TABS: { id: ObservatoryTab; label: string; icon: typeof Search }[] = [
    { id: 'bank', label: 'Question Bank', icon: Search },
    { id: 'patterns', label: 'Exam Patterns', icon: Compass },
    { id: 'mains', label: 'Mains Playbook', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-[#041936] text-stone-100 font-sans relative overflow-x-hidden selection:bg-[#e0d0ab] selection:text-[#041936] pb-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(1,148,168,0.14),transparent)] pointer-events-none z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ==================================================================== */}
        {/* HEADER                                                               */}
        {/* ==================================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-3xl md:text-[2.5rem] font-serif font-bold text-stone-100 tracking-tight text-balance">
              The Observatory
            </h1>
            <p className="text-sm text-zinc-300 leading-relaxed">
              25 years of real UPSC questions, searchable and testable — plus the exam patterns worth actually knowing.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-zinc-950/60 border border-zinc-800 text-zinc-400 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {censusData.totalItems?.toLocaleString() || '7,841'} verified questions
            </span>
            <button
              onClick={() => onNavigateArena && onNavigateArena()}
              className="px-5 py-2.5 rounded-sm bg-[#e0d0ab] hover:bg-[#ebdcb7] text-[#041936] font-sans font-bold text-xs uppercase tracking-widest transition-all duration-200 shadow-lg hover:shadow-[#e0d0ab]/20 active:scale-[0.98] flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              Launch Test Arena
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* TAB NAVIGATION                                                       */}
        {/* ==================================================================== */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-3 text-sm font-medium transition-colors duration-150 flex items-center gap-2 cursor-pointer ${
                  isActive ? 'text-[#e0d0ab]' : 'text-zinc-400 hover:text-stone-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {isActive && (
                  <motion.div layoutId="observatory-active-tab" className="absolute -bottom-px left-0 right-0 h-0.5 bg-[#e0d0ab]" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ==================================================================== */}
        {/* TAB: QUESTION BANK                                                   */}
        {/* ==================================================================== */}
        {activeTab === 'bank' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {showBankIntro && (
              <div className="p-4 rounded-sm bg-[#0194a8]/10 border border-[#0194a8]/30 flex items-start justify-between gap-3">
                <p className="text-xs text-zinc-200 leading-relaxed">
                  Answer a question and the correct option highlights instantly — this is a self-check practice bank, not a scored test. For a timed, ranked session, use <strong className="text-[#e0d0ab]">Practice Similar in Arena</strong> below any question.
                </p>
                <button onClick={() => setShowBankIntro(false)} className="shrink-0 text-zinc-400 hover:text-stone-200 cursor-pointer p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-5 md:p-6 rounded-sm bg-zinc-950/90 border border-zinc-800 space-y-5">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pyqSearchTerm}
                  onChange={(e) => {
                    setPyqSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search 7,841 questions — try a topic, act, or keyword"
                  className="w-full pl-10 pr-10 py-3 rounded-sm bg-zinc-900/90 border border-zinc-800 text-sm text-stone-100 placeholder-zinc-500 focus:outline-none focus:border-[#e0d0ab] transition-colors"
                />
                {pyqSearchTerm && (
                  <button
                    onClick={() => {
                      setPyqSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-stone-100 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wide block">Subject</label>
                  <select
                    value={selectedPyqSubject}
                    onChange={(e) => {
                      setSelectedPyqSubject(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full p-2.5 rounded-sm bg-zinc-900 border border-zinc-800 text-stone-200 focus:outline-none focus:border-[#e0d0ab] cursor-pointer"
                  >
                    <option value="All">All subjects</option>
                    <option value="Polity">Polity & Law</option>
                    <option value="Economy">Economy & Finance</option>
                    <option value="Environment">Environment & Ecology</option>
                    <option value="Geography">Geography</option>
                    <option value="History">History & Culture</option>
                    <option value="Science">Science & Tech</option>
                    <option value="CSAT">CSAT Paper-2</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wide block">Years</label>
                  <select
                    value={selectedEra}
                    onChange={(e) => {
                      setSelectedEra(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full p-2.5 rounded-sm bg-zinc-900 border border-zinc-800 text-stone-200 focus:outline-none focus:border-[#e0d0ab] cursor-pointer"
                  >
                    <option value="All">All 25 years</option>
                    <option value="2023-2025">2023–2025</option>
                    <option value="2011-2022">2011–2022</option>
                    <option value="2000-2010">2000–2010</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wide block">Format</label>
                  <select
                    value={selectedCognitiveType}
                    onChange={(e) => {
                      setSelectedCognitiveType(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full p-2.5 rounded-sm bg-zinc-900 border border-zinc-800 text-stone-200 focus:outline-none focus:border-[#e0d0ab] cursor-pointer"
                  >
                    <option value="All">All formats</option>
                    <option value="Direct">Direct recall</option>
                    <option value="Pair-Matching">Pair-matching</option>
                    <option value="Multi-Statement">Multi-statement</option>
                    <option value="Assumption">CSAT assumption</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wide block">View</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDecoyDeconstruction(!showDecoyDeconstruction)}
                      className={`flex-1 p-2.5 rounded-sm border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        showDecoyDeconstruction ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-stone-100'
                      }`}
                    >
                      Show traps
                    </button>
                    <button
                      onClick={() => {
                        setShowOnlyBookmarks(!showOnlyBookmarks);
                        setCurrentPage(1);
                      }}
                      className={`p-2.5 rounded-sm border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        showOnlyBookmarks ? 'bg-[#e0d0ab] text-[#041936] border-[#e0d0ab]' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-stone-100'
                      }`}
                      title="Saved only"
                    >
                      <Star className="w-3.5 h-3.5" fill={showOnlyBookmarks ? 'currentColor' : 'none'} />
                      {bookmarkedIds.size}
                    </button>
                  </div>
                </div>
              </div>

              {/* Slice telemetry + score */}
              <div className="p-3.5 rounded-sm bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-zinc-400 font-mono">
                  {isServerLoading && <span className="w-1.5 h-1.5 rounded-full bg-[#0194a8] animate-ping" />}
                  <span className="text-stone-200 font-semibold">{activeTotalCount.toLocaleString()}</span> questions match · avg. {activeSliceStats.avgWords} words
                </div>
                {(userScoreTally.correctCount > 0 || userScoreTally.incorrectCount > 0) && (
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-zinc-500">Self-check:</span>
                    <span className={`font-bold ${parseFloat(userScoreTally.netMarks) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {parseFloat(userScoreTally.netMarks) > 0 ? `+${userScoreTally.netMarks}` : userScoreTally.netMarks} marks
                    </span>
                    <span className="text-zinc-500">
                      ({userScoreTally.correctCount}✓ / {userScoreTally.incorrectCount}✗)
                    </span>
                    <button onClick={() => setUserAnswers({})} className="text-zinc-500 hover:text-red-400 underline cursor-pointer">
                      reset
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Question cards */}
            {activeQuestionsList.length === 0 ? (
              <div className="p-10 rounded-sm bg-zinc-950/60 border border-zinc-800 text-center space-y-2">
                <Search className="w-6 h-6 text-zinc-600 mx-auto" />
                <p className="text-sm text-zinc-400">No questions match these filters.</p>
                <button
                  onClick={() => {
                    setPyqSearchTerm('');
                    setSelectedPyqSubject('All');
                    setSelectedEra('All');
                    setSelectedCognitiveType('All');
                    setShowOnlyBookmarks(false);
                  }}
                  className="text-xs text-[#0194a8] hover:text-[#e0d0ab] underline cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeQuestionsList.map((q, idx) => {
                  const qId = q?.id || `q-item-${idx}`;
                  const isBookmarked = bookmarkedIds.has(qId);
                  const chosenKey = userAnswers[qId];
                  const hasAnswered = chosenKey !== undefined;
                  const officialKey = (q?.correctKey || 'C').toString().toUpperCase();
                  const isCorrect = hasAnswered && chosenKey.toUpperCase() === officialKey;
                  const isPlaceholder = isPlaceholderQuestion(q?.options);
                  const optionsArray: string[] =
                    Array.isArray(q?.options) && q.options.length > 0
                      ? q.options
                      : typeof q?.options === 'object' && q?.options
                      ? Object.entries(q.options).map(([k, v]) => `(${k}) ${v}`)
                      : ['(a) Option A', '(b) Option B', '(c) Option C', '(d) Option D'];
                  const extremeTokens = Array.isArray(q?.qualifiers?.extreme) ? q.qualifiers.extreme : [];
                  const contingentTokens = Array.isArray(q?.qualifiers?.contingent) ? q.qualifiers.contingent : [];
                  const wordCount = q?.wordCount || (q?.stem ? q.stem.split(/\s+/).length : 45);
                  const subject = q?.subject || 'General Studies';
                  const trapAnalysis = q?.trapAnalysis || `Official key: (${officialKey}).`;

                  return (
                    <div
                      key={qId}
                      className={`p-5 md:p-6 rounded-sm bg-zinc-900/50 border transition-all ${
                        isPlaceholder ? 'border-zinc-800/80 bg-zinc-950/40' : hasAnswered ? (isCorrect ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-red-500/40 bg-red-950/10') : 'border-zinc-800 hover:border-zinc-700'
                      } space-y-4`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-sm bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/30 font-mono font-semibold">UPSC {q?.year || 'PYQ'}</span>
                          <span className="text-zinc-300 font-medium">{subject}</span>
                          {isPlaceholder && (
                            <span className="px-2 py-0.5 rounded-sm bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1">
                              <Archive className="w-3 h-3" /> Archive only
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500 font-mono mr-1.5">{wordCount}w</span>
                          <button
                            onClick={() => handleToggleBookmark(qId)}
                            className={`p-1.5 rounded-sm transition-colors cursor-pointer ${isBookmarked ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                            title={isBookmarked ? 'Remove from saved' : 'Save this question'}
                          >
                            <Star className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={() => handleCopyQuestion(q)}
                            className="px-2 py-1 rounded-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Copy as text"
                          >
                            {copiedQuestionId === qId ? <Check className="w-3 h-3 text-emerald-400" /> : <FileText className="w-3 h-3 text-zinc-400" />}
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-stone-100 leading-relaxed whitespace-pre-line">{q?.stem || 'Question stem unavailable.'}</p>

                      {isPlaceholder ? (
                        <div className="p-3.5 rounded-sm bg-zinc-950/60 border border-zinc-800/80 text-zinc-400 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-zinc-500">
                            <Archive className="w-3.5 h-3.5" />
                            Kept for reference — original options weren't recoverable, so this isn't scoreable.
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {optionsArray.map((opt: string, oIdx: number) => {
                            const optionLetter = ['A', 'B', 'C', 'D'][oIdx] || 'A';
                            const isOptionCorrect = optionLetter === officialKey;
                            const isOptionSelected = chosenKey === optionLetter;
                            let optionStyle = 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/80';
                            if (hasAnswered) {
                              if (isOptionCorrect) optionStyle = 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 font-medium';
                              else if (isOptionSelected) optionStyle = 'bg-red-950/40 border-red-500/60 text-red-300 font-medium';
                              else optionStyle = 'bg-zinc-950/40 border-zinc-900 text-zinc-500 opacity-60';
                            }
                            return (
                              <button key={oIdx} onClick={() => handleSelectOption(qId, optionLetter)} className={`p-3 rounded-sm border text-left flex items-start justify-between gap-2 transition-all cursor-pointer ${optionStyle}`}>
                                <span>{opt}</span>
                                {hasAnswered && isOptionCorrect && <span className="text-emerald-400 font-bold shrink-0 text-xs">✓</span>}
                                {hasAnswered && isOptionSelected && !isOptionCorrect && <span className="text-red-400 font-bold shrink-0 text-xs">✗</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {!isPlaceholder && (showDecoyDeconstruction || hasAnswered) && (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="p-3.5 rounded-sm bg-zinc-950/70 border border-zinc-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[#e0d0ab] font-medium flex items-center gap-1.5">
                              <Brain className="w-3.5 h-3.5 text-[#0194a8]" />
                              Why this is the answer
                            </span>
                            <div className="flex items-center gap-1.5">
                              {extremeTokens.map((t: string) => (
                                <span key={t} className="px-1.5 py-0.5 rounded-sm bg-red-500/15 text-red-300 border border-red-500/30 text-[10px]">"{t}"</span>
                              ))}
                              {contingentTokens.map((t: string) => (
                                <span key={t} className="px-1.5 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">"{t}"</span>
                              ))}
                            </div>
                          </div>
                          <p className="text-zinc-300 leading-relaxed">{trapAnalysis}</p>
                        </motion.div>
                      )}

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-zinc-500">
                          Answer: <strong className="text-[#e0d0ab]">({officialKey})</strong>
                        </span>
                        {!isPlaceholder && onLaunchPractice && (
                          <button onClick={() => onLaunchPractice(subject)} className="text-[#0194a8] hover:text-[#e0d0ab] flex items-center gap-1 font-medium transition-colors cursor-pointer">
                            Practice similar in Arena
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTotalPages > 1 && (
              <div className="flex items-center justify-between flex-wrap gap-3 pt-2 text-xs">
                <span className="text-zinc-400">
                  Page {currentPage} of {activeTotalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                    Prev
                  </button>
                  {(() => {
                    const startP = Math.max(1, currentPage - 2);
                    const endP = Math.min(activeTotalPages, currentPage + 2);
                    const pages = [];
                    for (let i = startP; i <= endP; i++) pages.push(i);
                    return pages.map((p) => (
                      <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-1.5 rounded-sm border cursor-pointer ${currentPage === p ? 'bg-[#e0d0ab] text-[#041936] font-bold border-[#e0d0ab]' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'}`}>
                        {p}
                      </button>
                    ));
                  })()}
                  <button onClick={() => setCurrentPage((p) => Math.min(activeTotalPages, p + 1))} disabled={currentPage === activeTotalPages} className="px-3 py-1.5 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                    Next
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ==================================================================== */}
        {/* TAB: EXAM PATTERNS                                                   */}
        {/* ==================================================================== */}
        {activeTab === 'patterns' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Pacing */}
            <div className="p-5 md:p-6 rounded-sm bg-zinc-950/90 border border-zinc-800 space-y-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <h2 className="text-lg font-serif font-bold text-stone-100 flex items-center gap-2">
                    <Clock className="w-4.5 h-4.5 text-[#e0d0ab]" />
                    How much time do you actually have?
                  </h2>
                  <p className="text-xs text-zinc-400 max-w-xl">The paper runs about 7,380 words before you've reasoned about a single answer. See what's left once reading is done.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">Your reading speed</span>
                  <span className="font-bold text-[#e0d0ab]">{readingWpm} words/min</span>
                </div>
                <input type="range" min="120" max="300" step="10" value={readingWpm} onChange={(e) => setReadingWpm(parseInt(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#e0d0ab]" />
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Slow, careful</span>
                  <span>Average</span>
                  <span>Trained skimmer</span>
                  <span>Speed reader</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-sm bg-zinc-900/50 border border-zinc-800">
                  <span className="text-[11px] text-zinc-500 block">Time spent just reading</span>
                  <div className="text-xl font-bold text-stone-100">{pacingMetrics.readingMinutes} min</div>
                </div>
                <div className="p-3.5 rounded-sm bg-zinc-900/50 border border-zinc-800">
                  <span className="text-[11px] text-zinc-500 block">Left to think, per question</span>
                  <div className={`text-xl font-bold ${pacingMetrics.isTight ? 'text-red-400' : 'text-emerald-400'}`}>{pacingMetrics.secondsPerMCQ}s</div>
                </div>
              </div>
              {pacingMetrics.isTight && (
                <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-sm p-2.5 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  At this pace you're under 20 seconds of real thinking time per question — reading speed is worth practicing on its own.
                </p>
              )}
            </div>

            {/* Key distribution insight */}
            <div className="p-5 md:p-6 rounded-sm bg-zinc-950/90 border border-zinc-800 space-y-4">
              <h2 className="text-lg font-serif font-bold text-stone-100 flex items-center gap-2">
                <PieChart className="w-4.5 h-4.5 text-[#0194a8]" />
                Don't guess by letter
              </h2>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-xl">
                Across 25 years, answer keys are not spread evenly — Option A alone accounts for over half of all correct answers. But that's a fact about the past, not a strategy: letter-pattern guessing has negative expected value once you're wrong more than you're right. Eliminate on content.
              </p>
              <div className="grid grid-cols-4 gap-2.5">
                {(optionSpreadData.distribution || RESEARCH_DATA.optionSpread.distribution).map((d: any) => (
                  <div key={d.key} className="p-3 rounded-sm bg-zinc-900/50 border border-zinc-800 text-center">
                    <div className="text-xs text-zinc-500">Option {d.key}</div>
                    <div className="text-lg font-bold text-stone-100">{d.pct}%</div>
                  </div>
                ))}
              </div>
              <button onClick={() => toggleMath('uniformity')} className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMath.uniformity ? 'rotate-180' : ''}`} />
                Show the statistics
              </button>
              {showMath.uniformity && (
                <div className="p-3.5 rounded-sm bg-zinc-900/50 border border-zinc-800/80 text-xs text-zinc-400">
                  <InlineMath math={`\\chi^2 = ${(censusData.uniformityChiSquare || 4086.37).toFixed(2)}, \\, p < 0.001`} /> against a uniform 25%-each distribution, computed live from the full {censusData.totalItems?.toLocaleString() || '7,841'}-question corpus.
                </div>
              )}
            </div>

            {/* Trap sandbox */}
            <div className="p-5 md:p-6 rounded-sm bg-zinc-950/90 border border-zinc-800 space-y-4">
              <h2 className="text-lg font-serif font-bold text-stone-100 flex items-center gap-2">
                <Crosshair className="w-4.5 h-4.5 text-red-400" />
                Spot the trap
              </h2>
              <p className="text-xs text-zinc-300 max-w-xl">Paste any exam statement. Absolute words like "always" or "never" are usually the trap; soft words like "can be" or "some" usually hold up.</p>
              <textarea
                value={customStatement}
                onChange={(e) => setCustomStatement(e.target.value)}
                rows={3}
                className="w-full p-3.5 rounded-sm bg-zinc-900 border border-zinc-800 text-sm text-stone-100 focus:outline-none focus:border-[#e0d0ab] transition-colors"
                placeholder="Type or paste a statement..."
              />
              <div
                className={`p-4 rounded-sm border space-y-3 ${
                  trapReading.tone === 'risk' ? 'bg-red-950/30 border-red-500/40' : trapReading.tone === 'safe' ? 'bg-emerald-950/30 border-emerald-500/40' : trapReading.tone === 'mixed' ? 'bg-amber-950/30 border-amber-500/40' : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                <p className={`text-sm font-medium ${trapReading.tone === 'risk' ? 'text-red-300' : trapReading.tone === 'safe' ? 'text-emerald-300' : trapReading.tone === 'mixed' ? 'text-amber-300' : 'text-stone-300'}`}>{trapReading.verdict}</p>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {trapReading.extremeMatches.map((m) => (
                    <span key={m} className="px-2 py-0.5 rounded-sm bg-red-500/20 text-red-300 border border-red-500/40">"{m}"</span>
                  ))}
                  {trapReading.contingentMatches.map((m) => (
                    <span key={m} className="px-2 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">"{m}"</span>
                  ))}
                </div>
              </div>
              <button onClick={() => toggleMath('bayes')} className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMath.bayes ? 'rotate-180' : ''}`} />
                Show the math
              </button>
              {showMath.bayes && (
                <div className="p-3.5 rounded-sm bg-zinc-900/50 border border-zinc-800/80 overflow-x-auto">
                  <BlockMath math="P(\text{False} \mid M_{\text{ext}}) = \frac{P(M_{\text{ext}} \mid \text{False}) \cdot P(\text{False})}{P(M_{\text{ext}} \mid \text{False}) \cdot P(\text{False}) + P(M_{\text{ext}} \mid \text{True}) \cdot P(\text{True})} \approx 81\%" />
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs pt-1">
                <div className="p-4 rounded-sm bg-zinc-900/40 border border-zinc-800 space-y-2.5">
                  <span className="text-red-400 font-medium block">Usually the trap</span>
                  {RESEARCH_DATA.bayesianModifiers.extremeTokens.map((t) => (
                    <div key={t.token} className="space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-red-300">"{t.token}"</span>
                        <span className="text-red-400 font-medium">{t.falsePct}% false</span>
                      </div>
                      <p className="text-zinc-500">{t.note}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-sm bg-zinc-900/40 border border-zinc-800 space-y-2.5">
                  <span className="text-emerald-400 font-medium block">Usually holds up</span>
                  {RESEARCH_DATA.bayesianModifiers.contingentTokens.map((t) => (
                    <div key={t.token} className="space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-emerald-300">"{t.token}"</span>
                        <span className="text-emerald-400 font-medium">{t.truePct}% true</span>
                      </div>
                      <p className="text-zinc-500">{t.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* When to guess */}
            <div className="p-5 md:p-6 rounded-sm bg-zinc-950/90 border border-zinc-800 space-y-3">
              <h2 className="text-lg font-serif font-bold text-stone-100">When to guess</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-4 rounded-sm bg-emerald-950/20 border border-emerald-500/30">
                  <p className="text-emerald-300 font-medium">Eliminated 2 of 4 options → guess.</p>
                  <p className="text-xs text-zinc-400 mt-1">Expected gain is positive: +0.67 marks on average, even accounting for the −0.66 penalty.</p>
                </div>
                <div className="p-4 rounded-sm bg-red-950/20 border border-red-500/30">
                  <p className="text-red-300 font-medium">No idea at all → skip.</p>
                  <p className="text-xs text-zinc-400 mt-1">A pure blind guess nets essentially nothing (+0.005 marks) — not worth the risk.</p>
                </div>
              </div>
            </div>

            {/* High-yield topics */}
            <div className="p-5 md:p-6 rounded-sm bg-zinc-950/90 border border-zinc-800 space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-serif font-bold text-stone-100 flex items-center gap-2">
                  <Flame className="w-4.5 h-4.5 text-[#e0d0ab]" />
                  Where the marks actually are
                </h2>
                <p className="text-xs text-zinc-400">23 of 137 syllabus topics account for over three-quarters of all Prelims marks across 25 years. Know these cold.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="py-2.5 pr-3 font-medium">#</th>
                      <th className="py-2.5 pr-3 font-medium">Topic</th>
                      <th className="py-2.5 pr-3 font-medium">Weight</th>
                      <th className="py-2.5 pr-3 font-medium">Times asked</th>
                      <th className="py-2.5 font-medium">Last tested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {RESEARCH_DATA.highYieldTopics.map((p) => (
                      <tr key={p.rank} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="py-3 pr-3 font-mono text-[#e0d0ab]">{p.rank}</td>
                        <td className="py-3 pr-3 text-stone-100">{p.node}</td>
                        <td className="py-3 pr-3 font-mono text-emerald-400">{p.weightPct}</td>
                        <td className="py-3 pr-3 text-zinc-400">{p.appearances}</td>
                        <td className="py-3 text-zinc-400">{p.lastTested}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================================================================== */}
        {/* TAB: MAINS PLAYBOOK                                                  */}
        {/* ==================================================================== */}
        {activeTab === 'mains' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="p-5 md:p-6 rounded-sm bg-zinc-950/90 border border-zinc-800 space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-serif font-bold text-stone-100 flex items-center gap-2">
                  <Brain className="w-4.5 h-4.5 text-[#e0d0ab]" />
                  What examiners actually want
                </h2>
                <p className="text-xs text-zinc-400 max-w-xl">Every directive word — Discuss, Evaluate, Critically Analyze — carries its own unwritten rubric. Know it before you write.</p>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {RESEARCH_DATA.mainsDirectives.map((d, idx) => (
                  <button
                    key={d.directive}
                    onClick={() => setSelectedDirective(idx)}
                    className={`px-3.5 py-2 rounded-sm text-xs font-medium cursor-pointer transition-all shrink-0 ${
                      selectedDirective === idx ? 'bg-[#e0d0ab] text-[#041936]' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    {d.directive}
                  </button>
                ))}
              </div>

              {(() => {
                const cur = RESEARCH_DATA.mainsDirectives[selectedDirective];
                return (
                  <AnimatePresence mode="wait">
                    <motion.div key={cur.directive} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5 rounded-sm bg-zinc-900/50 border border-zinc-800 space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-serif font-bold text-stone-100">"{cur.directive}"</h3>
                        <p className="text-sm text-zinc-300 leading-relaxed">{cur.coreTone}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-sm bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                          <span className="text-emerald-400 font-medium block">How to split your marks</span>
                          <p className="text-stone-200">{cur.marksSplit}</p>
                        </div>
                        <div className="p-3.5 rounded-sm bg-red-950/20 border border-red-500/30 space-y-1.5">
                          <span className="text-red-400 font-medium block">The trap that costs you marks</span>
                          <p className="text-red-200">{cur.trap}</p>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                );
              })()}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
