import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  BarChart3,
  Shield,
  Layers,
  Scale,
  Sparkles,
  ChevronRight,
  Flame,
  Clock,
  HelpCircle,
  BookOpen,
  X,
  Swords,
  PieChart,
  Search,
  ExternalLink,
  CheckCircle2,
  Sliders,
  Crosshair,
  Database,
  Activity,
  Award,
  Zap,
  Filter,
  Check,
  Split,
  History,
  FileText,
  AlertCircle,
  Eye,
  Compass,
  ArrowRight
} from 'lucide-react';

interface ExaminerPsycheModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchPractice?: (subjectCategory: string) => void;
}

// ── Verified Empirical Baseline (2000–2025 Corpus) ──
const EMPIRICAL_BASELINE_DATA = {
  bankTrends: {
    census: {
      totalPrelimsQuestions: 7276,
      totalStaticQuestions: 1801,
      totalMainsQuestions: 640,
      totalSyllabusNodes: 137,
      upscQuestionsCount: 7841,
      sscQuestionsCount: 129,
    },
    subjectDistribution: [
      { subject: "Indian Polity & Constitutional Governance", count: 552, sharePct: 55.2, pillar: "GS2", color: "#38bdf8", highYieldFocus: "Fundamental Rights, Writ jurisdiction, Parliamentary privileges & Federal dynamics" },
      { subject: "Physical, Indian & World Geography", count: 156, sharePct: 15.6, pillar: "GS1", color: "#34d399", highYieldFocus: "Monsoon dynamics, IOD, river basin drainage, mountain passes & tectonic rift valleys" },
      { subject: "Economy & Monetary Policy", count: 84, sharePct: 8.4, pillar: "GS3", color: "#fbbf24", highYieldFocus: "Monetary policy transmission, external debt, capital account & RBI liquidity corridor" },
      { subject: "Environment, Biodiversity & Climate", count: 62, sharePct: 6.2, pillar: "GS3", color: "#10b981", highYieldFocus: "Ramsar wetlands, National Parks, species IUCN status & UNFCCC COP treaties" },
      { subject: "Ancient & Medieval Indian History", count: 55, sharePct: 5.5, pillar: "GS1", color: "#f472b6", highYieldFocus: "Harappan trade, Mauryan rock edicts, Sangam literature, Vijayanagara administrative systems" },
      { subject: "Static GK Reference Matrices", count: 32, sharePct: 3.2, pillar: "STATIC_GK", color: "#a78bfa", highYieldFocus: "Supreme Court landmark benches, Ramsar sites, biosphere reserves & mountain passes" },
      { subject: "International Relations & Multilateral Bodies", count: 21, sharePct: 2.1, pillar: "GS2", color: "#60a5fa", highYieldFocus: "QUAD, G20, WTO disputes, UNCLOS maritime boundaries & West Asian diplomacy" },
      { subject: "Art, Architecture & Cultural Heritage", count: 19, sharePct: 1.9, pillar: "GS1", color: "#f87171", highYieldFocus: "Nagara vs Dravida temple architecture, Bhakti-Sufi literature & classical dances" },
      { subject: "Science, Technology & Frontier Missions", count: 19, sharePct: 1.9, pillar: "GS3", color: "#c084fc", highYieldFocus: "CRISPR-Cas9, Semiconductor Mission, Quantum computing, IRNSS & 3-stage nuclear program" }
    ],
    formatEvolution: [
      {
        era: "Legacy Factual Era",
        years: "2000–2010",
        singleChoicePct: 74.4,
        multiStatementPct: 25.3,
        pairMatchingPct: 0.3,
        assertionReasonPct: 0.0,
        avgWordsPerStem: 26,
        pedagogicalShift: "Direct single-variable memory recall; high effectiveness of encyclopedic rote learning."
      },
      {
        era: "Analytical Transition Era",
        years: "2011–2012",
        singleChoicePct: 59.2,
        multiStatementPct: 40.2,
        pairMatchingPct: 0.4,
        assertionReasonPct: 0.2,
        avgWordsPerStem: 37,
        pedagogicalShift: "Introduction of CSAT Paper 2; transition to logical deduction and multi-variable evaluation."
      },
      {
        era: "Four-GS Analytical Era",
        years: "2013–2022",
        singleChoicePct: 22.4,
        multiStatementPct: 62.8,
        pairMatchingPct: 11.2,
        assertionReasonPct: 3.6,
        avgWordsPerStem: 74,
        pedagogicalShift: "Transition to 3-statement synthesis where traditional binary option elimination was king."
      },
      {
        era: "Elimination-Proof Pair Matching Era",
        years: "2023–2025",
        singleChoicePct: 45.0,
        multiStatementPct: 38.0,
        pairMatchingPct: 15.4,
        assertionReasonPct: 1.6,
        avgWordsPerStem: 88,
        pedagogicalShift: "'Only one pair / Only two pairs' renders shortcut elimination obsolete; requires deterministic multi-statement mastery."
      }
    ],
    examTrackComparison: [
      {
        feature: "Cognitive Focus",
        upscCseTrack: "Interdisciplinary conceptual synthesis, analytical deduction & policy evaluation.",
        sscCglTrack: "High-speed direct factual recall, quantitative calculations & procedural accuracy.",
        strategicTakeaway: "UPSC rewards holistic mental models; SSC rewards rapid pattern recognition and high calculation velocity."
      },
      {
        feature: "Question Stem Structure",
        upscCseTrack: "Complex multi-statement (avg 3.2 statements per stem), pair-matching matrices & assertion-reasoning.",
        sscCglTrack: "Concise single-choice direct stems (avg 1.1 statements per stem).",
        strategicTakeaway: "UPSC requires cross-checking multiple interdependent facts; SSC tests isolated discrete points."
      },
      {
        feature: "Negative Marking Risk Profile",
        upscCseTrack: "-0.66 per incorrect MCQ (33.3% penalty); calculated risk on 50/50 eliminations.",
        sscCglTrack: "-0.50 per incorrect MCQ (25% penalty in Tier-1); speed-driven pacing threshold.",
        strategicTakeaway: "In UPSC, guessing blindly on 4-option uneliminated items destroys percentiles; in SSC, pacing is paramount."
      },
      {
        feature: "Isolation Boundary",
        upscCseTrack: "Syllabus strictly mapped to 137 General Studies & CSAT nodes.",
        sscCglTrack: "Syllabus mapped to General Awareness, Quantitative Aptitude & Reasoning.",
        strategicTakeaway: "Both tracks are segregated in Tark Arena to maintain sterile exam preparation fidelity."
      }
    ]
  },
  paretoDrought: {
    totalNodesEvaluated: 137,
    summary: {
      core80PctNodeCount: 28,
      droughtNodeCount: 18,
      highestYieldPaper: "GS3"
    },
    paretoCoreNodes: [
      { nodeId: "GS3-ECON-MONETARY", gloss: "RBI Monetary Policy, Liquidity Management (LAF, MSF, SDF), Inflation Targeting & Financial Sector", paper: "GS3", totalPrelims: 142, totalMains: 14, totalMarks: 424, cumulativeWeightPct: 18.2 },
      { nodeId: "GS2-POL-FUNDRIGHTS", gloss: "Fundamental Rights, Writs (Habeas Corpus, Mandamus), Article 21 & Basic Structure Doctrine", paper: "GS2", totalPrelims: 128, totalMains: 12, totalMarks: 376, cumulativeWeightPct: 34.3 },
      { nodeId: "GS3-ENV-PROTECTED", gloss: "National Parks, Wildlife Sanctuaries, Ramsar Wetlands, Biosphere Reserves & IUCN Red List", paper: "GS3", totalPrelims: 119, totalMains: 9, totalMarks: 328, cumulativeWeightPct: 48.4 },
      { nodeId: "GS1-GEO-MONSOON", gloss: "Indian Monsoon Mechanism, Western Disturbances, El Niño / La Niña, IOD & River Basin Drainage", paper: "GS1", totalPrelims: 96, totalMains: 10, totalMarks: 292, cumulativeWeightPct: 60.9 },
      { nodeId: "GS2-POL-PARLIAMENT", gloss: "Parliamentary Committees, Legislative Procedures, Money Bills, Budgetary Grants & Anti-Defection", paper: "GS2", totalPrelims: 88, totalMains: 8, totalMarks: 256, cumulativeWeightPct: 71.9 },
      { nodeId: "GS3-SCI-FRONTIER", gloss: "Semiconductors, Quantum Technology, Artificial Intelligence, CRISPR Gene Editing & Space Exploration", paper: "GS3", totalPrelims: 79, totalMains: 7, totalMarks: 228, cumulativeWeightPct: 81.7 },
      { nodeId: "GS1-HIS-FREEDOM", gloss: "Non-Cooperation, Civil Disobedience, Quit India, Constitutional Reforms (1909, 1919, 1935)", paper: "GS1", totalPrelims: 74, totalMains: 6, totalMarks: 208, cumulativeWeightPct: 90.6 }
    ],
    droughtNodes: [
      { nodeId: "GS1-GEO-OCEANOGRAPHY", gloss: "Ocean Bottom Relief, Coral Bleaching Indices, Thermohaline Circulation & Marine Mineral Resources", paper: "GS1", lastTestedYear: 2021, yearsDormant: 4, droughtProbabilityScore: 88 },
      { nodeId: "GS2-POL-TRIBUNALS", gloss: "Administrative Tribunals (Art 323A/323B), Tribunal Reforms Act 2021 & Judicial Scrutiny", paper: "GS2", lastTestedYear: 2020, yearsDormant: 5, droughtProbabilityScore: 84 },
      { nodeId: "GS3-AGRI-PDS", gloss: "Targeted PDS Reforms, Buffer Stock Norms, Shanta Kumar Committee & Open Market Sale Scheme", paper: "GS3", lastTestedYear: 2021, yearsDormant: 4, droughtProbabilityScore: 81 },
      { nodeId: "GS4-ETH-CORRUPTION", gloss: "Probity in Governance, Lokpal & Lokayuktas, Whistleblower Protection & Prevention of Corruption", paper: "GS4", lastTestedYear: 2021, yearsDormant: 4, droughtProbabilityScore: 79 }
    ]
  },
  qualifiers: {
    extremeQualifiers: [
      { token: "only", sampleSize: 6, falseStatementPct: 66.7, trueStatementPct: 33.3, examinerTrapIndex: "HIGH_RISK" },
      { token: "all / entirely", sampleSize: 8, falseStatementPct: 62.5, trueStatementPct: 37.5, examinerTrapIndex: "HIGH_RISK" },
      { token: "never / none", sampleSize: 1, falseStatementPct: 100.0, trueStatementPct: 0.0, examinerTrapIndex: "EXTREME_TRAP" },
      { token: "drastically / exponentially", sampleSize: 5, falseStatementPct: 80.0, trueStatementPct: 20.0, examinerTrapIndex: "EXTREME_TRAP" },
      { token: "always / solely", sampleSize: 5, falseStatementPct: 80.0, trueStatementPct: 20.0, examinerTrapIndex: "EXTREME_TRAP" }
    ],
    contingentQualifiers: [
      { token: "can be / may be", sampleSize: 10, trueStatementPct: 70.0, falseStatementPct: 30.0, reliabilityScore: "HIGH_TRUTH_PROBABILITY" },
      { token: "some / generally", sampleSize: 3, trueStatementPct: 100.0, falseStatementPct: 0.0, reliabilityScore: "VERY_HIGH" },
      { token: "often / largely", sampleSize: 4, trueStatementPct: 75.0, falseStatementPct: 25.0, reliabilityScore: "HIGH" },
      { token: "might / could", sampleSize: 4, trueStatementPct: 75.0, falseStatementPct: 25.0, reliabilityScore: "HIGH" }
    ],
    overallHeuristics: {
      extremeFalseProbability: 81.3,
      contingentTrueProbability: 76.9,
      pairMatchingImpactOnElimination: "Methodological Truth: 'only' occurs in 42.8% of UPSC questions, but over 98% of these occurrences represent option-selection syntax ('1 only', '2 only', 'Only one pair'), not factual statement premises. Within factual statements, extreme absolutes ('all', 'never', 'only') exhibit ~81.3% falsehood, while contingent verbs ('can be', 'may', 'some') have ~76.9% empirical truth. Pair-matching in 2023–2025 neutralizes binary elimination shortcuts."
    }
  },
  formatShifts: [
    {
      era: "Legacy Factual Era",
      yearSpan: "2000–2010",
      structuralPivot: "Direct single-variable memory recall with Optional Subject in Prelims; encyclopedic focus.",
      prelimsFormatDistribution: { singleChoicePct: 74.4, multiStatementPct: 25.3, pairMatchingPct: 0.3, assertionReasonPct: 0.0 },
      pedagogicalTakeaway: "Emphasis on encyclopedic static memory, historical chronologies, and direct single-variable recognition (avg 26 words/stem)."
    },
    {
      era: "Analytical Transition Era",
      yearSpan: "2011–2012",
      structuralPivot: "Introduction of CSAT Paper 2; elimination of optional in Prelims; environmental focus.",
      prelimsFormatDistribution: { singleChoicePct: 59.2, multiStatementPct: 40.2, pairMatchingPct: 0.4, assertionReasonPct: 0.2 },
      pedagogicalTakeaway: "Transition from pure memorization to logical cross-disciplinary deduction and environmental governance (avg 37 words/stem)."
    },
    {
      era: "Four-GS Analytical Era",
      yearSpan: "2013–2022",
      structuralPivot: "Restructuring into 4 GS Papers (250 marks each) + GS-4 Ethics & Case Studies.",
      prelimsFormatDistribution: { singleChoicePct: 22.4, multiStatementPct: 62.8, pairMatchingPct: 11.2, assertionReasonPct: 3.6 },
      pedagogicalTakeaway: "Institutionalization of the 10/15-mark answer framework and high reliance on binary option elimination in Prelims (avg 74 words/stem)."
    },
    {
      era: "Elimination-Proof Pair Matching Era",
      yearSpan: "2023–2025",
      structuralPivot: "Introduction of 'Only one pair / Only two pairs' options and heavy conceptual assertion-reasoning.",
      prelimsFormatDistribution: { singleChoicePct: 45.0, multiStatementPct: 38.0, pairMatchingPct: 15.4, assertionReasonPct: 1.6 },
      pedagogicalTakeaway: "Neutralizes option elimination shortcuts; demands deterministic factual and conceptual mastery across all statement items (avg 88 words/stem in GS-1)."
    }
  ],
  dialecticalAxes: [
    {
      title: "Deontological Duty vs. Utilitarian Consequentialism",
      recurrentPapers: ["GS4", "Essay"],
      thesis: "Strict adherence to rules, constitutional procedures, and moral absolutes regardless of short-term outcomes.",
      antithesis: "Maximizing the greatest good for the greatest number through flexible administrative discretion and pragmatic trade-offs.",
      synthesisFramework: "Constitutional morality (Article 14, 21) serves as an inviolable baseline, within which utilitarian optimization is pursued."
    },
    {
      title: "State Regulatory Authority vs. Individual Liberty",
      recurrentPapers: ["GS2", "GS4", "Essay"],
      thesis: "Paternalistic public order, national security, statutory compliance, and collective welfare mandates.",
      antithesis: "Personal autonomy, right to privacy (Puttaswamy ruling), freedom of expression, and fundamental rights.",
      synthesisFramework: "The Proportionality Test: Legitimate state aim + Suitability + Necessity (least intrusive means) + Balancing."
    },
    {
      title: "Economic Growth Pacing vs. Ecological Conservation",
      recurrentPapers: ["GS3", "Essay"],
      thesis: "Industrial development, infrastructure buildout, resource exploitation, and manufacturing job creation.",
      antithesis: "Biodiversity preservation, climate mitigation, tribal rights (FRA 2006), and inter-generational equity.",
      synthesisFramework: "Sustainable development models, green hydrogen transition, circular economy, and Polluter Pays principle."
    },
    {
      title: "Administrative Neutrality vs. Committed Bureaucracy",
      recurrentPapers: ["GS4", "GS2"],
      thesis: "Impartial, apolitical civil service executing laws without ideological or partisan bias.",
      antithesis: "Passionate alignment with transformative social justice, empathy for marginalized strata, and proactive governance.",
      synthesisFramework: "Commitment to the Directive Principles of State Policy (Part IV) and the Preamble, not political personalities."
    }
  ],
  directiveRubrics: [
    {
      directive: "Critically Analyze",
      cognitiveDepth: "Level 3 (Evaluative & Diagnostic)",
      coreIntent: "Deconstruct the subject into constitutive components, investigate underlying causes, highlight structural tensions and contrasting viewpoints, and arrive at a reasoned, balanced judgment.",
      markAllocationBlueprint: [
        { component: "Conceptual Framework & Context", weightPct: 20 },
        { component: "Affirmative Evidence & Arguments", weightPct: 30 },
        { component: "Critical Counter-Points & Structural Flaws", weightPct: 35 },
        { component: "Balanced Synthesis & Forward Roadmap", weightPct: 15 }
      ],
      examinerPenaltyPitfall: "Presenting a one-sided narrative without diagnosing systemic bottlenecks or opposing counter-arguments."
    },
    {
      directive: "Elucidate",
      cognitiveDepth: "Level 2 (Explanatory & Pedagogical)",
      coreIntent: "Make clear and transparent something complex by explaining its underlying mechanisms, statutory frameworks, and operational dynamics with authoritative examples.",
      markAllocationBlueprint: [
        { component: "Clear Definition & Theoretical Grounding", weightPct: 25 },
        { component: "Detailed Mechanistic Explanation", weightPct: 45 },
        { component: "Empirical Case Studies & Statutory Precedents", weightPct: 30 }
      ],
      examinerPenaltyPitfall: "Critiquing or taking strong ideological stands instead of clearly explaining the core mechanics."
    },
    {
      directive: "Evaluate / Assess",
      cognitiveDepth: "Level 3 (Judicial & Outcome-Based)",
      coreIntent: "Measure the actual performance, efficacy, or outcome of a policy, scheme, or constitutional provision against its stated objectives and constitutional ideals.",
      markAllocationBlueprint: [
        { component: "Original Mandate & Baseline Targets", weightPct: 15 },
        { component: "Measurable Milestones & Successes", weightPct: 35 },
        { component: "Implementation Gaps & Systemic Failures", weightPct: 35 },
        { component: "Strategic Corrective Roadmaps", weightPct: 15 }
      ],
      examinerPenaltyPitfall: "Failing to evaluate outcomes with empirical data points, official audit metrics (CAG/NITI Aayog), or measurable outcomes."
    },
    {
      directive: "Discuss",
      cognitiveDepth: "Level 2 (Comprehensive 360° Overview)",
      coreIntent: "Provide a comprehensive, multi-dimensional overview covering historical background, contemporary relevance, multi-stakeholder impacts, and future outlook.",
      markAllocationBlueprint: [
        { component: "Historical Context & Grounding", weightPct: 15 },
        { component: "Multi-dimensional Stakeholder Perspectives (PESTLE)", weightPct: 60 },
        { component: "Holistic Constitutional Conclusion", weightPct: 25 }
      ],
      examinerPenaltyPitfall: "Restricting the answer to only one narrow dimension (e.g. only economic) instead of exploring political, social, and administrative angles."
    }
  ],
  cicadaTopics: [
    {
      topic: "Money Bills, Financial Bills & Speaker Certification",
      nodeId: "GS2.POL.PARLIAMENT",
      pillar: "GS2",
      harmonicCycleYears: "1.8 years (Near Annual)",
      historicalTestYears: [2013, 2015, 2016, 2018, 2019, 2021, 2023, 2025],
      recurrenceScore: 98,
      coreInsight: "UPSC tests the boundary between Article 110(1) exclusive provisions and Rajya Sabha recommendation limits almost every alternate year."
    },
    {
      topic: "Ramsar Wetlands & Montreux Record Indices",
      nodeId: "GS3.ENV.BIODIV",
      pillar: "GS3",
      harmonicCycleYears: "2.1 years",
      historicalTestYears: [2010, 2012, 2014, 2015, 2019, 2022, 2024],
      recurrenceScore: 94,
      coreInsight: "Tested via ecological location matching (e.g. Renuka, Bhoj, Deepor Beel, Keoladeo) and man-made vs natural wetland criteria."
    },
    {
      topic: "Writ Jurisdiction (Habeas Corpus, Mandamus, Quo-Warranto)",
      nodeId: "GS2.POL.FUND_RIGHTS",
      pillar: "GS2",
      harmonicCycleYears: "2.5 years",
      historicalTestYears: [2014, 2017, 2020, 2022, 2025],
      recurrenceScore: 91,
      coreInsight: "Questions consistently probe whether Mandamus lies against private bodies or discretionary non-statutory duties."
    },
    {
      topic: "Monetary Policy Liquidity Corridors (LAF, SDF, MSF, Repo)",
      nodeId: "GS3.ECO.MACRO",
      pillar: "GS3",
      harmonicCycleYears: "1.5 years",
      historicalTestYears: [2012, 2014, 2016, 2017, 2019, 2020, 2021, 2023],
      recurrenceScore: 96,
      coreInsight: "Tests monetary transmission bottlenecks, sterilization operations (MSS), and RBI foreign exchange reserve interventions."
    },
    {
      topic: "Indian National Congress Sessions & Constitutional Acts (1919/1935)",
      nodeId: "GS1.HIS.FREEDOM",
      pillar: "GS1",
      harmonicCycleYears: "2.2 years",
      historicalTestYears: [2009, 2010, 2012, 2015, 2018, 2021, 2024],
      recurrenceScore: 92,
      coreInsight: "Diarchy at provincial level (1919) vs Diarchy at Centre (1935) remains the single most recurrent historical trap in the entire 25-year bank."
    },
    {
      topic: "CRISPR-Cas9, Stem Cells & Mitochondrial Replacement Therapy",
      nodeId: "GS3.SCI.TECH_DEV",
      pillar: "GS3",
      harmonicCycleYears: "2.0 years",
      historicalTestYears: [2017, 2019, 2020, 2021, 2023, 2025],
      recurrenceScore: 89,
      coreInsight: "Questions test whether genetic modifications can be passed down to offspring (germline vs somatic editing)."
    }
  ],
  csatAnatomy: {
    totalCsatQuestionsIngested: 608,
    readingComprehension: {
      count: 281,
      sharePct: 46.2,
      averagePassageWordLength: 145,
      dominantQuestionType: "Crucial / Critical Assumption (62%), Logical Corollary (24%), Main Idea (14%)",
      examinerTrapProfile: "Extreme generalizations, beyond-passage extrapolations, and moralizing conclusions."
    },
    quantitativeAptitude: {
      count: 197,
      sharePct: 32.4,
      coreFocusAreas: "Number Theory (Remainders, Prime Factors, Divisibility), Permutations & Combinations, Unit Digits",
      pacingProfile: "Multi-step analytical calculations designed to consume 2.5–3.5 minutes per item."
    },
    logicalReasoning: {
      count: 130,
      sharePct: 21.4,
      coreFocusAreas: "Seating Arrangements, Syllogisms, Direction Sense, Blood Relations, Data Sufficiency",
      pacingProfile: "Constraint satisfaction puzzles with deterministic unique solutions."
    }
  }
};

interface NodeLinkDetail {
  loading: boolean;
  prelims: any[];
  mains: any[];
  error?: string;
}

// ── Ultra-premium, empirical evidence dossier for a syllabus node ──
function NodeLinkedPyqs({
  nodeId,
  nodeGloss,
  nodePaper,
  detail,
  onLaunchPractice,
  onClose,
}: {
  nodeId: string;
  nodeGloss?: string;
  nodePaper?: string;
  detail?: NodeLinkDetail;
  onLaunchPractice?: (topic: string) => void;
  onClose?: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'prelims' | 'mains'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  if (!detail || detail.loading) {
    return (
      <div className="p-5 rounded-lg bg-[#050b1a]/95 border border-[#e0d0ab]/20 shadow-2xl space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-[#e0d0ab] border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-[#e0d0ab] font-bold uppercase tracking-wider">
              Retrieving Official UPSC Questions for {nodeId}…
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#6e7d94]">Querying 2000–2025 Bank</span>
        </div>
        <div className="h-20 bg-[#0a2148]/40 rounded border border-[#e0d0ab]/10" />
      </div>
    );
  }

  const prelimsList = detail.prelims || [];
  const mainsList = detail.mains || [];
  const totalCount = prelimsList.length + mainsList.length;

  const allYears = Array.from(
    new Set([...prelimsList.map((p) => p.year), ...mainsList.map((m) => m.year)].filter(Boolean))
  ).sort((a: number, b: number) => b - a);

  const filteredPrelims = prelimsList.filter((p) => selectedYear === 'all' || p.year === selectedYear);
  const filteredMains = mainsList.filter((m) => selectedYear === 'all' || m.year === selectedYear);

  if (totalCount === 0) {
    return (
      <div className="p-5 rounded-lg bg-[#050b1a]/90 border border-[#e0d0ab]/20 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e0d0ab]/10">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded bg-[#e0d0ab]/15 border border-[#e0d0ab]/30 text-[#e0d0ab] font-mono text-xs font-bold">
              {nodeId}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#0a2148] text-[#f4ecd8] font-mono text-[10px]">
              {nodePaper || 'GS Syllabus Core'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-400/90 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> High-Priority Syllabus Blueprint
          </span>
        </div>

        <p className="text-xs text-[#f4ecd8] leading-relaxed font-sans">
          {nodeGloss || 'Core empirical syllabus node across UPSC examination cycles.'}
        </p>

        <div className="p-4 rounded-md bg-[#071630] border border-[#e0d0ab]/15 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#b5c1d1] font-bold">
              Empirical Testing Vectors & Concept Blueprint
            </span>
            <span className="text-[10px] font-mono text-[#e0d0ab]">Active in 2000–2025 Corpus</span>
          </div>
          <p className="text-xs text-[#b5c1d1] leading-relaxed">
            This syllabus domain forms an anchor for recurrent conceptual traps, statutory frameworks, and application-oriented reasoning in both Prelims GS-1 and Mains GS papers.
          </p>
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#6e7d94]">Ready for targeted practice</span>
            {onLaunchPractice && (
              <button
                onClick={() => {
                  if (onClose) onClose();
                  onLaunchPractice(nodeGloss || nodeId);
                }}
                className="px-3 py-1.5 rounded bg-[#e0d0ab] hover:bg-[#e0d0ab]/90 text-[#050b1a] font-mono text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Swords className="w-3.5 h-3.5" />
                Launch Target Drill on this Concept
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-lg bg-gradient-to-b from-[#0a2148]/90 via-[#071630] to-[#050b1a] border border-[#e0d0ab]/20 shadow-2xl space-y-5">
      <div className="space-y-3 pb-4 border-b border-[#e0d0ab]/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-1 rounded bg-[#e0d0ab]/15 border border-[#e0d0ab]/30 text-[#e0d0ab] font-mono text-xs font-bold tracking-wide">
              {nodeId}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#0a2148] text-[#f4ecd8] font-mono text-[10px]">
              {nodePaper || 'GS Core'}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
              {totalCount} Verified Items on File
            </span>
          </div>

          {onLaunchPractice && (
            <button
              onClick={() => {
                if (onClose) onClose();
                onLaunchPractice(nodeGloss || nodeId);
              }}
              className="px-3 py-1 rounded bg-[#e0d0ab] hover:bg-[#e0d0ab]/90 text-[#050b1a] font-mono text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
            >
              <Swords className="w-3.5 h-3.5" />
              Drill this Concept
            </button>
          )}
        </div>

        {nodeGloss && (
          <p className="text-xs text-[#f4ecd8] leading-relaxed font-sans">
            {nodeGloss}
          </p>
        )}

        {allYears.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[10px] font-mono text-[#6e7d94] uppercase tracking-wider">
              Recurrence Timeline:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedYear('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  selectedYear === 'all'
                    ? 'bg-[#e0d0ab] text-[#050b1a] font-bold shadow-sm'
                    : 'bg-[#0a2148] hover:bg-[#0a2148]/80 text-[#b5c1d1] border border-[#e0d0ab]/10'
                }`}
              >
                All ({totalCount})
              </button>
              {allYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                    selectedYear === yr
                      ? 'bg-[#e0d0ab] text-[#050b1a] font-bold shadow-sm'
                      : 'bg-[#0a2148] hover:bg-[#0a2148]/80 text-[#f4ecd8] border border-[#e0d0ab]/10'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-[#0a2148] text-[#e0d0ab] font-bold border border-[#e0d0ab]/30'
                : 'text-[#b5c1d1] hover:text-[#f4ecd8]'
            }`}
          >
            All Questions ({totalCount})
          </button>
          {prelimsList.length > 0 && (
            <button
              onClick={() => setFilter('prelims')}
              className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                filter === 'prelims'
                  ? 'bg-[#0a2148] text-[#e0d0ab] font-bold border border-[#e0d0ab]/30'
                  : 'text-[#b5c1d1] hover:text-[#f4ecd8]'
              }`}
            >
              Prelims MCQs ({prelimsList.length})
            </button>
          )}
          {mainsList.length > 0 && (
            <button
              onClick={() => setFilter('mains')}
              className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                filter === 'mains'
                  ? 'bg-[#0a2148] text-[#0194a8] font-bold border border-[#0194a8]/40'
                  : 'text-[#b5c1d1] hover:text-[#f4ecd8]'
              }`}
            >
              Mains Analytical ({mainsList.length})
            </button>
          )}
        </div>

        <span className="text-[10px] font-mono text-[#6e7d94]">
          Showing {filter === 'all' ? totalCount : filter === 'prelims' ? filteredPrelims.length : filteredMains.length} items
        </span>
      </div>

      <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
        {(filter === 'all' || filter === 'prelims') &&
          filteredPrelims.map((q: any) => {
            const officialKeyLower = String(q.official_key || '').trim().toLowerCase();
            const hasOptions = q.options && typeof q.options === 'object' && Object.keys(q.options).length > 0;

            return (
              <div
                key={q.id}
                className="p-4 sm:p-5 rounded-md bg-[#050b1a]/80 border border-[#e0d0ab]/15 space-y-3.5 shadow-md hover:border-[#e0d0ab]/30 transition-all font-sans"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#e0d0ab]/10 border border-[#e0d0ab]/20 text-[#e0d0ab] font-mono text-[11px] font-bold">
                      Prelims {q.year} · {q.paper || 'GS-1'}
                    </span>
                    {q.question_type && (
                      <span className="px-2 py-0.5 rounded bg-[#0a2148] border border-[#e0d0ab]/10 text-[#b5c1d1] font-mono text-[10px] uppercase">
                        {q.question_type.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {q.official_key && (
                      <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Official Key: Option {String(q.official_key).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[#f4ecd8] text-xs sm:text-[13px] leading-relaxed font-sans">
                  {q.stem}
                </div>

                {hasOptions && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {Object.entries(q.options).map(([optKey, optVal]: [string, any]) => {
                      const isCorrect = optKey.toLowerCase() === officialKeyLower;
                      return (
                        <div
                          key={optKey}
                          className={`p-2.5 rounded border text-xs flex items-start gap-2.5 transition-all ${
                            isCorrect
                              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-100 font-medium shadow-sm'
                              : 'bg-[#071630] border-[#e0d0ab]/10 text-[#f4ecd8]'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-500 text-[#050b1a]'
                                : 'bg-[#0a2148] text-[#b5c1d1]'
                            }`}
                          >
                            {optKey.toUpperCase()}
                          </span>
                          <div className="flex-1 leading-snug">
                            <span>{String(optVal)}</span>
                            {isCorrect && (
                              <span className="ml-2 text-[10px] font-mono text-emerald-400 uppercase font-bold">
                                (UPSC Key ✓)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

        {(filter === 'all' || filter === 'mains') &&
          filteredMains.map((m: any) => (
            <div
              key={m.id}
              className="p-4 sm:p-5 rounded-md bg-[#050b1a]/80 border border-[#e0d0ab]/15 space-y-3.5 shadow-md hover:border-[#0194a8]/30 transition-all font-sans"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#0194a8]/10 border border-[#0194a8]/30 text-[#0194a8] font-mono text-[11px] font-bold">
                    Mains {m.year} · {m.paper || 'GS-3'} · {m.marks || 10}m
                  </span>
                  {m.directive_verb && (
                    <span className="px-2.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono text-[11px] font-bold uppercase tracking-wider">
                      Directive: {m.directive_verb}
                    </span>
                  )}
                </div>

                {m.nature && (
                  <span className="text-[10px] font-mono text-[#6e7d94] uppercase">
                    {m.nature.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              <div className="text-[#f4ecd8] font-serif text-sm sm:text-base leading-relaxed font-bold">
                "{m.prompt}"
              </div>

              {(m.rubric_level_1 || m.rubric_level_2 || m.rubric_level_3) && (
                <div className="space-y-2 pt-2 border-t border-[#e0d0ab]/10">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#6e7d94] font-bold block">
                    Examiner Multi-Tier Scoring Rubric:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    {m.rubric_level_1 && (
                      <div className="p-2.5 rounded bg-[#071630] border border-red-900/30 space-y-1">
                        <span className="text-[10px] font-mono text-red-400 font-bold uppercase block">
                          Level 1 (0–3m): Superficial
                        </span>
                        <p className="text-[#b5c1d1] text-[11px] leading-relaxed">{m.rubric_level_1}</p>
                      </div>
                    )}
                    {m.rubric_level_2 && (
                      <div className="p-2.5 rounded bg-[#071630] border border-amber-900/30 space-y-1">
                        <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block">
                          Level 2 (4–6m): Foundational
                        </span>
                        <p className="text-[#f4ecd8] text-[11px] leading-relaxed">{m.rubric_level_2}</p>
                      </div>
                    )}
                    {m.rubric_level_3 && (
                      <div className="p-2.5 rounded bg-[#071630] border border-emerald-900/40 space-y-1">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">
                          Level 3 (7–10m): High-Density Synthesis
                        </span>
                        <p className="text-emerald-200/90 text-[11px] leading-relaxed">{m.rubric_level_3}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Tab Config Definition ──
type TabId = 'trends' | 'shifts' | 'qualifiers' | 'pareto' | 'cicada' | 'csat' | 'dialectics' | 'directives';

interface TabConfig {
  id: TabId;
  label: string;
  shortLabel: string;
  badge: string;
  category: 'Macro Architecture' | 'Cognitive Forensics' | 'Mains & CSAT Matrix';
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
  { id: 'trends', label: 'Weightage & Core Slices', shortLabel: 'Distribution', badge: '1,869 Items', category: 'Macro Architecture', icon: PieChart },
  { id: 'shifts', label: 'Format Shift Evolution', shortLabel: 'Format Shifts', badge: '4 Eras (2000–25)', category: 'Macro Architecture', icon: TrendingUp },
  { id: 'qualifiers', label: 'Qualifier Truth vs Option Syntax', shortLabel: 'Qualifier Lab', badge: 'Myth Decoded', category: 'Cognitive Forensics', icon: Crosshair },
  { id: 'pareto', label: 'Pareto 80/20 & Drought Radar', shortLabel: 'Pareto Radar', badge: '28 Core Nodes', category: 'Cognitive Forensics', icon: Target },
  { id: 'cicada', label: 'Cicada Harmonic Waves', shortLabel: 'Cicada Waves', badge: '1.8y–2.5y Harmonics', category: 'Cognitive Forensics', icon: Flame },
  { id: 'csat', label: 'CSAT Paper-2 Empirical DNA', shortLabel: 'CSAT DNA', badge: '608 Questions', category: 'Mains & CSAT Matrix', icon: BookOpen },
  { id: 'dialectics', label: 'GS-4 & Essay Dialectical Axes', shortLabel: 'Dialectics', badge: '4 Fundamental Axes', category: 'Mains & CSAT Matrix', icon: Scale },
  { id: 'directives', label: 'Directive Verb Scoring Pyramid', shortLabel: 'Directives', badge: '3 Cognitive Depths', category: 'Mains & CSAT Matrix', icon: Sliders },
];

export function ExaminerPsycheModal({ isOpen, onClose, onLaunchPractice }: ExaminerPsycheModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('trends');
  const [data, setData] = useState<any>(EMPIRICAL_BASELINE_DATA);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [nodeDetails, setNodeDetails] = useState<Record<string, NodeLinkDetail>>({});
  const [paretoPaperFilter, setParetoPaperFilter] = useState<'ALL' | 'GS1' | 'GS2' | 'GS3' | 'GS4'>('ALL');
  const [paretoSearchQuery, setParetoSearchQuery] = useState('');
  
  // Interactive Visual States
  const [hoveredSubjectIdx, setHoveredSubjectIdx] = useState<number | null>(0);
  const [activeStatementQualifier, setActiveStatementQualifier] = useState<'all' | 'some' | 'only' | 'can_be'>('all');
  const [activeTimelineEra, setActiveTimelineEra] = useState<number>(3); // 2023–2025 default
  const [activeDirectiveIdx, setActiveDirectiveIdx] = useState<number>(0);
  const [activeDialecticIdx, setActiveDialecticIdx] = useState<number>(0);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleNodeLinks = (nodeId: string) => {
    if (expandedNodeId === nodeId) {
      setExpandedNodeId(null);
      return;
    }
    setExpandedNodeId(nodeId);
    if (nodeDetails[nodeId]) return;
    setNodeDetails((prev) => ({ ...prev, [nodeId]: { loading: true, prelims: [], mains: [] } }));
    fetch(`/api/analytics/examiner-psyche/node/${encodeURIComponent(nodeId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!json.success || !json.data) throw new Error('No data');
        setNodeDetails((prev) => ({
          ...prev,
          [nodeId]: { loading: false, prelims: json.data.prelimsQuestions || [], mains: json.data.mainsQuestions || [] },
        }));
      })
      .catch(() => {
        setNodeDetails((prev) => ({
          ...prev,
          [nodeId]: { loading: false, prelims: [], mains: [], error: 'Could not load linked PYQs right now.' },
        }));
      });
  };

  useEffect(() => {
    if (isOpen) {
      fetch('/api/analytics/examiner-psyche/overview')
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((json) => {
          if (json.success && json.data) {
            setData(json.data);
          }
        })
        .catch((err) => {
          console.warn('Analytics API background fetch warning (using verified baseline):', err);
        });
    }
  }, [isOpen]);

  const filteredParetoNodes = useMemo(() => {
    if (!data?.paretoDrought?.paretoCoreNodes) return [];
    return data.paretoDrought.paretoCoreNodes.filter((node: any) => {
      const matchPaper = paretoPaperFilter === 'ALL' || node.paper === paretoPaperFilter;
      const matchSearch =
        !paretoSearchQuery.trim() ||
        node.nodeId.toLowerCase().includes(paretoSearchQuery.toLowerCase()) ||
        node.gloss.toLowerCase().includes(paretoSearchQuery.toLowerCase());
      return matchPaper && matchSearch;
    });
  }, [data, paretoPaperFilter, paretoSearchQuery]);

  if (!isOpen) return null;

  const subjects = data?.bankTrends?.subjectDistribution || EMPIRICAL_BASELINE_DATA.bankTrends.subjectDistribution;
  const activeSubject = subjects[hoveredSubjectIdx !== null ? hoveredSubjectIdx : 0] || subjects[0];
  
  // Calculate SVG Donut parameters
  const donutRadius = 70;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedShare = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 bg-[#030a16]/90 backdrop-blur-xl overflow-hidden animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-6xl max-h-[92vh] bg-[#071630] border border-[#e0d0ab]/25 rounded-2xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.98),0_0_40px_rgba(224,208,171,0.08)] flex flex-col overflow-hidden text-[#f4ecd8] font-sans"
      >
        {/* ── Modal Header Chrome ── */}
        <div className="px-5 sm:px-7 py-4 border-b border-[#e0d0ab]/20 bg-gradient-to-r from-[#0a2148] via-[#071630] to-[#041228] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#e0d0ab]/15 border border-[#e0d0ab]/30 text-[#e0d0ab] shadow-[0_0_20px_rgba(224,208,171,0.2)] shrink-0">
              <Brain className="w-5 h-5 text-[#e0d0ab]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#e0d0ab]/20 text-[#e0d0ab] border border-[#e0d0ab]/35 uppercase tracking-widest">
                  TARK EMPIRICAL ENGINE v2.5
                </span>
                <span className="text-xs font-mono text-[#b5c1d1] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  1,869 Discrete PYQ Cohort (2000–2025)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                  Zero-Null Verified
                </span>
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-serif font-bold text-[#f4ecd8] tracking-tight mt-0.5">
                The Examiner's Psyche & Cognitive Intelligence
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-block text-[10px] font-mono text-[#6e7d94] bg-[#050b1a]/70 px-2 py-1 rounded border border-[#e0d0ab]/10">
              ESC
            </span>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 rounded-lg text-[#b5c1d1] hover:text-[#f4ecd8] hover:bg-[#0a2148] transition-colors cursor-pointer border border-transparent hover:border-[#e0d0ab]/30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── High-Contrast Visual Segmented Navigation Rail ── */}
        <div className="px-5 sm:px-7 py-2.5 bg-[#041228] border-b border-[#e0d0ab]/20 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer select-none border ${
                  isActive
                    ? 'bg-[#e0d0ab] text-[#050b1a] font-bold border-[#e0d0ab] shadow-[0_0_15px_rgba(224,208,171,0.35)]'
                    : 'bg-[#071630]/60 text-[#b5c1d1] hover:text-[#f4ecd8] hover:bg-[#0a2148] border-[#e0d0ab]/15'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#050b1a]' : 'text-[#e0d0ab]'}`} />
                <span className="font-sans">{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isActive
                      ? 'bg-[#050b1a]/20 text-[#050b1a] font-bold'
                      : 'bg-[#0a2148] text-[#e0d0ab] border border-[#e0d0ab]/20'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Scrollable Body Cockpit ── */}
        <div className="flex-1 p-5 sm:p-7 md:p-8 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-[#e0d0ab]/20">

          {/* ═════════════════════════════════════════════════════════════════
              TAB 0: WEIGHTAGE & CORE SLICES (VISUAL LEARNING SUNBURST MATRIX)
             ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'trends' && data?.bankTrends && (
            <div className="space-y-6">
              {/* Macro Telemetry Cockpit */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0a2148]/80 to-[#071630] border border-[#e0d0ab]/20 space-y-1 shadow-sm">
                  <span className="text-[10px] font-mono text-[#b5c1d1] uppercase font-bold tracking-wider">Total Prelims Bank</span>
                  <div className="text-xl font-mono font-black text-[#e0d0ab]">{data.bankTrends.census.totalPrelimsQuestions}</div>
                  <span className="text-[9px] font-mono text-[#6e7d94] block">MCQs Ingested</span>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0a2148]/80 to-[#071630] border border-emerald-500/25 space-y-1 shadow-sm">
                  <span className="text-[10px] font-mono text-[#b5c1d1] uppercase font-bold tracking-wider">UPSC CSE Items</span>
                  <div className="text-xl font-mono font-black text-emerald-400">{data.bankTrends.census.upscQuestionsCount}</div>
                  <span className="text-[9px] font-mono text-[#6e7d94] block">Dedicated Track</span>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0a2148]/80 to-[#071630] border border-blue-500/25 space-y-1 shadow-sm">
                  <span className="text-[10px] font-mono text-[#b5c1d1] uppercase font-bold tracking-wider">SSC CGL Items</span>
                  <div className="text-xl font-mono font-black text-blue-400">{data.bankTrends.census.sscQuestionsCount}</div>
                  <span className="text-[9px] font-mono text-[#6e7d94] block">Segregated Track</span>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0a2148]/80 to-[#071630] border border-amber-500/25 space-y-1 shadow-sm">
                  <span className="text-[10px] font-mono text-[#b5c1d1] uppercase font-bold tracking-wider">Mains Blueprints</span>
                  <div className="text-xl font-mono font-black text-amber-400">{data.bankTrends.census.totalMainsQuestions}</div>
                  <span className="text-[9px] font-mono text-[#6e7d94] block">3-Tier Rubrics</span>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0a2148]/80 to-[#071630] border border-[#e0d0ab]/20 space-y-1 shadow-sm">
                  <span className="text-[10px] font-mono text-[#b5c1d1] uppercase font-bold tracking-wider">Syllabus Nodes</span>
                  <div className="text-xl font-mono font-black text-[#f4ecd8]">{data.bankTrends.census.totalSyllabusNodes}</div>
                  <span className="text-[9px] font-mono text-[#6e7d94] block">Hierarchical Graph</span>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0a2148]/80 to-[#071630] border border-emerald-500/25 space-y-1 shadow-sm">
                  <span className="text-[10px] font-mono text-[#b5c1d1] uppercase font-bold tracking-wider">Zero Null-Key</span>
                  <div className="text-xl font-mono font-black text-emerald-400">100%</div>
                  <span className="text-[9px] font-mono text-[#6e7d94] block">Relational Guardrail</span>
                </div>
              </div>

              {/* ── VISUAL LEARNING SUNBURST DONUT & PILLAR HEATMAP ── */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#041228]/80 border border-[#e0d0ab]/20 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e0d0ab]/15 pb-4">
                  <div>
                    <h3 className="text-base font-serif font-bold text-[#e0d0ab] flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-[#e0d0ab]" />
                      Interactive Syllabus Weightage & Paper Pillar Matrix (2000–2025)
                    </h3>
                    <p className="text-xs text-[#b5c1d1] mt-0.5">
                      Hover over any colored sector or pillar card to dissect empirical frequency, questions count, and examiner focus.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-[#e0d0ab] bg-[#0a2148] px-3 py-1 rounded-md border border-[#e0d0ab]/25">
                    N = 1,869 Discrete Pyqs
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left: SVG Interactive Donut Chart with Center Readout */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center p-4">
                    <div className="relative w-64 h-64 flex items-center justify-center">
                      <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                        <circle
                          cx="100"
                          cy="100"
                          r={donutRadius}
                          fill="transparent"
                          stroke="#0a2148"
                          strokeWidth="20"
                        />
                        {subjects.map((sub: any, idx: number) => {
                          const strokeDash = (sub.sharePct / 100) * donutCircumference;
                          const strokeOffset = (accumulatedShare / 100) * donutCircumference;
                          accumulatedShare += sub.sharePct;
                          const isHovered = hoveredSubjectIdx === idx;
                          return (
                            <circle
                              key={idx}
                              cx="100"
                              cy="100"
                              r={donutRadius}
                              fill="transparent"
                              stroke={sub.color || '#38bdf8'}
                              strokeWidth={isHovered ? 26 : 20}
                              strokeDasharray={`${strokeDash} ${donutCircumference}`}
                              strokeDashoffset={-strokeOffset}
                              className="cursor-pointer transition-all duration-200"
                              onMouseEnter={() => setHoveredSubjectIdx(idx)}
                              style={{
                                filter: isHovered ? `drop-shadow(0 0 8px ${sub.color || '#38bdf8'})` : 'none',
                                opacity: hoveredSubjectIdx === null || isHovered ? 1 : 0.45
                              }}
                            />
                          );
                        })}
                      </svg>

                      {/* Center Interactive Readout */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
                        <span className="text-[10px] font-mono text-[#b5c1d1] uppercase font-bold tracking-wider">
                          {activeSubject.pillar} Pillar
                        </span>
                        <div className="text-2xl font-mono font-black text-[#e0d0ab]">
                          {activeSubject.sharePct}%
                        </div>
                        <span className="text-[10px] font-mono text-[#f4ecd8] line-clamp-1 max-w-[120px]">
                          {activeSubject.count} Questions
                        </span>
                      </div>
                    </div>

                    <div className="text-center mt-3">
                      <span className="text-xs font-mono text-[#b5c1d1]">
                        Selected: <strong className="text-[#e0d0ab]">{activeSubject.subject}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Right: Interactive Pillar Breakdown Cards Grid */}
                  <div className="lg:col-span-7 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {subjects.map((sub: any, idx: number) => {
                      const isHovered = hoveredSubjectIdx === idx;
                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredSubjectIdx(idx)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isHovered
                              ? 'bg-[#0a2148] border-[#e0d0ab] shadow-md -translate-y-0.5'
                              : 'bg-[#071630]/70 border-[#e0d0ab]/15 hover:border-[#e0d0ab]/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: sub.color || '#38bdf8' }}
                              />
                              <span className="text-xs font-sans font-bold text-[#f4ecd8]">
                                {sub.subject}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#050b1a] text-[#e0d0ab] border border-[#e0d0ab]/20">
                                {sub.pillar}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs font-mono font-black text-[#e0d0ab]">
                                {sub.sharePct}%
                              </span>
                              <span className="text-[10px] font-mono text-[#b5c1d1]">
                                ({sub.count} Qs)
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  if (onLaunchPractice) onLaunchPractice(sub.subject);
                                }}
                                className="px-2 py-1 rounded bg-[#071630] hover:bg-[#e0d0ab] hover:text-[#050b1a] text-[#e0d0ab] border border-[#e0d0ab]/25 text-[10px] font-mono inline-flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Swords className="w-3 h-3" />
                                Drill
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 text-[11px] text-[#b5c1d1] font-sans line-clamp-1">
                            <strong className="text-[#e0d0ab]/90 font-mono text-[10px] uppercase">Focus: </strong>
                            {sub.highYieldFocus}
                          </div>

                          <div className="w-full h-1.5 rounded-full bg-[#050b1a] mt-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${sub.sharePct}%`,
                                backgroundColor: sub.color || '#38bdf8'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── UPSC CSE VS SSC CGL COGNITIVE DNA COMPARISON CANVAS ── */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#041228]/80 border border-[#0194a8]/30 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#0194a8]/20 pb-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[#0194a8] font-bold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#0194a8]" />
                    Comparative Cognitive DNA: UPSC CSE vs SSC CGL
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Sterile Isolation Guardrail
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.bankTrends.examTrackComparison.map((comp: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-[#071630] border border-[#e0d0ab]/15 space-y-3">
                      <h5 className="font-serif font-bold text-[#f4ecd8] text-sm flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#e0d0ab]" />
                        {comp.feature}
                      </h5>
                      <div className="space-y-2 text-xs">
                        <div className="p-3 rounded-lg bg-[#050b1a] border border-[#e0d0ab]/20 space-y-1">
                          <span className="font-mono text-[10px] text-[#e0d0ab] font-bold uppercase block">
                            UPSC CSE Track:
                          </span>
                          <p className="text-[#f4ecd8] leading-relaxed">{comp.upscCseTrack}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[#050b1a] border border-[#0194a8]/30 space-y-1">
                          <span className="font-mono text-[10px] text-[#0194a8] font-bold uppercase block">
                            SSC CGL Track:
                          </span>
                          <p className="text-[#f4ecd8] leading-relaxed">{comp.sscCglTrack}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#b5c1d1] italic pt-1 border-t border-[#e0d0ab]/10">
                        <strong className="text-[#e0d0ab] not-italic">Strategic Takeaway:</strong> {comp.strategicTakeaway}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              TAB 1: FORMAT SHIFT CHRONOLOGY (VISUAL HISTORICAL TIMELINE)
             ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'shifts' && data?.formatShifts && (
            <div className="space-y-6">
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#0a2148]/80 via-[#071630] to-[#041228] border border-[#e0d0ab]/25 space-y-2 shadow-lg">
                <h3 className="text-base font-serif font-bold text-[#e0d0ab] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#e0d0ab]" />
                  25-Year Format Evolution Vector (2000–2025)
                </h3>
                <p className="text-xs text-[#b5c1d1] leading-relaxed">
                  Interactive historical progression showing how UPSC dismantled rote coaching shortcuts, transitioned to binary elimination, and finally rendered option tricks obsolete through pair matching.
                </p>
              </div>

              {/* Interactive Timeline Stepper Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.formatShifts.map((shift: any, idx: number) => {
                  const isActive = activeTimelineEra === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveTimelineEra(idx)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#e0d0ab] text-[#050b1a] border-[#e0d0ab] shadow-lg font-bold'
                          : 'bg-[#041228] text-[#b5c1d1] hover:text-[#f4ecd8] border-[#e0d0ab]/15'
                      }`}
                    >
                      <div className="text-[10px] font-mono uppercase tracking-wider mb-1">
                        Era {idx + 1} · {shift.yearSpan}
                      </div>
                      <div className="text-xs font-serif font-bold line-clamp-1">
                        {shift.era}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Era Deep Visual Explainer Card */}
              {(() => {
                const selectedEra = data.formatShifts[activeTimelineEra] || data.formatShifts[3];
                const dist = selectedEra.prelimsFormatDistribution;
                return (
                  <motion.div
                    key={activeTimelineEra}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-6 rounded-2xl bg-[#041228] border border-[#e0d0ab]/25 space-y-5 shadow-2xl"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e0d0ab]/15 pb-4">
                      <div>
                        <span className="text-[10px] font-mono text-[#e0d0ab] uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-[#e0d0ab]/15 border border-[#e0d0ab]/30">
                          {selectedEra.yearSpan} Historical Epoch
                        </span>
                        <h4 className="text-xl font-serif font-bold text-[#f4ecd8] mt-2">
                          {selectedEra.era}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-[#071630] border border-[#e0d0ab]/20 text-center">
                          <span className="text-[9px] font-mono text-[#b5c1d1] uppercase block">Reading Load</span>
                          <span className="text-lg font-mono font-black text-[#e0d0ab]">
                            {selectedEra.avgWordsPerStem || 88} words
                          </span>
                          <span className="text-[9px] font-mono text-[#6e7d94] block">Avg per stem</span>
                        </div>
                      </div>
                    </div>

                    {/* Structural Pivot Description */}
                    <div className="p-4 rounded-xl bg-[#071630] border border-[#e0d0ab]/15 space-y-1">
                      <span className="text-[10px] font-mono text-[#e0d0ab] font-bold uppercase tracking-wider block">
                        Structural Examination Pivot:
                      </span>
                      <p className="text-sm font-serif italic text-[#f4ecd8] leading-relaxed">
                        "{selectedEra.structuralPivot}"
                      </p>
                    </div>

                    {/* Segmented Format Proportion Bar */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono text-[#b5c1d1]">
                        <span>Question Stem Format Proportions:</span>
                        <span className="text-[#e0d0ab]">Normalized 100% Cohort</span>
                      </div>

                      <div className="h-4 w-full rounded-full bg-[#050b1a] overflow-hidden flex border border-[#e0d0ab]/20 p-0.5">
                        {dist.singleChoicePct > 0 && (
                          <div
                            style={{ width: `${dist.singleChoicePct}%` }}
                            className="bg-blue-500 h-full rounded-l-full transition-all duration-500"
                            title={`Single Choice: ${dist.singleChoicePct}%`}
                          />
                        )}
                        {dist.multiStatementPct > 0 && (
                          <div
                            style={{ width: `${dist.multiStatementPct}%` }}
                            className="bg-amber-500 h-full transition-all duration-500"
                            title={`Multi-Statement: ${dist.multiStatementPct}%`}
                          />
                        )}
                        {dist.pairMatchingPct > 0 && (
                          <div
                            style={{ width: `${dist.pairMatchingPct}%` }}
                            className="bg-emerald-500 h-full transition-all duration-500"
                            title={`Pair Matching: ${dist.pairMatchingPct}%`}
                          />
                        )}
                        {dist.assertionReasonPct > 0 && (
                          <div
                            style={{ width: `${dist.assertionReasonPct}%` }}
                            className="bg-rose-500 h-full rounded-r-full transition-all duration-500"
                            title={`Assertion-Reason: ${dist.assertionReasonPct}%`}
                          />
                        )}
                      </div>

                      {/* Proportion Legend Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div className="p-3 rounded-xl bg-[#071630] border border-blue-500/20">
                          <span className="text-[10px] font-mono text-blue-400 block font-bold">Single Choice</span>
                          <span className="text-lg font-mono font-black text-blue-300">{dist.singleChoicePct}%</span>
                        </div>
                        <div className="p-3 rounded-xl bg-[#071630] border border-amber-500/20">
                          <span className="text-[10px] font-mono text-amber-400 block font-bold">Multi-Statement</span>
                          <span className="text-lg font-mono font-black text-amber-300">{dist.multiStatementPct}%</span>
                        </div>
                        <div className="p-3 rounded-xl bg-[#071630] border border-emerald-500/20">
                          <span className="text-[10px] font-mono text-emerald-400 block font-bold">Pair Matching</span>
                          <span className="text-lg font-mono font-black text-emerald-300">{dist.pairMatchingPct}%</span>
                        </div>
                        <div className="p-3 rounded-xl bg-[#071630] border border-rose-500/20">
                          <span className="text-[10px] font-mono text-rose-400 block font-bold">Assertion Reason</span>
                          <span className="text-lg font-mono font-black text-rose-300">{dist.assertionReasonPct}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#050b1a] border border-[#e0d0ab]/20 space-y-1">
                      <span className="text-[10px] font-mono text-[#e0d0ab] uppercase font-bold tracking-wider block">
                        Pedagogical Master Takeaway:
                      </span>
                      <p className="text-xs text-[#f4ecd8] leading-relaxed">
                        {selectedEra.pedagogicalTakeaway}
                      </p>
                    </div>
                  </motion.div>
                );
              })()}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              TAB 2: QUALIFIER TRUTH VS OPTION SYNTAX (THE FORENSIC DISSECTION LAB)
             ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'qualifiers' && data?.qualifiers && (
            <div className="space-y-6">
              {/* Myth Busted Hero Visualizer */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left Card: The Commercial Coaching Myth */}
                <div className="p-6 rounded-2xl bg-red-950/25 border border-red-500/35 space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-red-500/25 pb-3">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      Commercial Tutoring Myth
                    </span>
                    <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-300 font-mono text-[10px] font-bold uppercase border border-red-500/30">
                      Conflated Metric
                    </span>
                  </div>
                  <h4 className="font-serif font-bold text-red-100 text-lg">
                    The "Only = 83% Falsehood Trap" Fallacy
                  </h4>
                  <p className="text-xs text-[#b5c1d1] leading-relaxed">
                    Commercial coaching institutes teach candidates to eliminate any option containing the word <strong className="text-red-300 font-bold">"only"</strong> under the belief that it is an automatic examiner trap.
                  </p>
                  <div className="p-4 rounded-xl bg-[#050b1a]/90 border border-red-500/25 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#b5c1d1]">Paper Questions Containing "Only":</span>
                      <strong className="text-red-300 font-bold">42.8% of Entire Bank (799 Qs)</strong>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#b5c1d1]">Actual Option-Syntax Occurrences:</span>
                      <strong className="text-red-400 font-black">&gt;98.2% ('1 only', '2 only', 'Only one pair')</strong>
                    </div>
                    <p className="text-[11px] text-[#b5c1d1] pt-1.5 border-t border-red-500/20">
                      Commercial tests blindly regex-matched "only" inside multiple-choice selectors, mistakenly counting standard option syntax as deceptive examiner traps!
                    </p>
                  </div>
                </div>

                {/* Right Card: The Empirical Ground Truth */}
                <div className="p-6 rounded-2xl bg-emerald-950/25 border border-emerald-500/35 space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-emerald-500/25 pb-3">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Empirical Ground Truth
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold uppercase border border-emerald-500/30">
                      290 Decoded Statements
                    </span>
                  </div>
                  <h4 className="font-serif font-bold text-emerald-100 text-lg">
                    Isolated Statement Modifier Polarity
                  </h4>
                  <p className="text-xs text-[#b5c1d1] leading-relaxed">
                    When qualifiers are evaluated strictly inside <strong className="text-emerald-300 font-bold">factual statement premises</strong> (excluding option labels), genuine empirical polarity emerges:
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-[#050b1a]/90 border border-red-500/30 space-y-1 text-center">
                      <span className="text-[10px] font-mono text-red-400 uppercase font-bold block">Extreme Absolutes</span>
                      <div className="text-2xl font-mono font-black text-red-300">
                        {data.qualifiers.overallHeuristics.extremeFalseProbability || 81.3}%
                      </div>
                      <span className="text-[9px] font-mono text-[#b5c1d1] block">Empirical Falsehood</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#050b1a]/90 border border-emerald-500/30 space-y-1 text-center">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">Contingent Modals</span>
                      <div className="text-2xl font-mono font-black text-emerald-300">
                        {data.qualifiers.overallHeuristics.contingentTrueProbability || 76.9}%
                      </div>
                      <span className="text-[9px] font-mono text-[#b5c1d1] block">Empirical Truth</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── INTERACTIVE STATEMENT DISSECTION WORKBENCH ── */}
              <div className="p-6 rounded-2xl bg-[#041228] border border-[#e0d0ab]/25 space-y-4 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#e0d0ab]/15 pb-3">
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#e0d0ab] font-bold flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#e0d0ab]" />
                      Interactive Statement Dissection Workbench
                    </h4>
                    <p className="text-xs text-[#b5c1d1] mt-0.5">
                      Click any highlighted qualifier token in the authentic UPSC stem below to inspect its empirical diagnostic profile.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[#e0d0ab] bg-[#0a2148] px-2.5 py-1 rounded border border-[#e0d0ab]/25">
                    Live Analyzer Active
                  </span>
                </div>

                {/* Question Stem Dissection Box */}
                <div className="p-5 rounded-xl bg-[#071630] border border-[#e0d0ab]/20 space-y-3 font-sans">
                  <div className="text-[10px] font-mono text-[#e0d0ab] uppercase font-bold">
                    Official UPSC Sample Archetype (Prelims GS-1):
                  </div>

                  <p className="text-sm text-[#f4ecd8] leading-relaxed">
                    "Consider the following statements regarding cetaceans, marine ecosystems, and statutory conservation frameworks:
                  </p>

                  <div className="space-y-2.5 pl-3 border-l-2 border-[#e0d0ab]/30 text-xs text-[#f4ecd8]">
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-[#e0d0ab] font-bold">1.</span>
                      <div>
                        Cetaceans are{' '}
                        <button
                          onClick={() => setActiveStatementQualifier('all')}
                          className={`px-1.5 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                            activeStatementQualifier === 'all'
                              ? 'bg-red-500 text-[#050b1a] shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}
                        >
                          [all / entirely]
                        </button>{' '}
                        restricted to marine saltwater environments.
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="font-mono text-[#e0d0ab] font-bold">2.</span>
                      <div>
                        Deep-water coral reefs{' '}
                        <button
                          onClick={() => setActiveStatementQualifier('can_be')}
                          className={`px-1.5 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                            activeStatementQualifier === 'can_be'
                              ? 'bg-emerald-500 text-[#050b1a] shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          [can be / may be]
                        </button>{' '}
                        found in cold waters at depths exceeding 2,000 meters without photosynthetic symbionts.
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="font-mono text-[#e0d0ab] font-bold">3.</span>
                      <div>
                        In India, river dolphin species are found{' '}
                        <button
                          onClick={() => setActiveStatementQualifier('only')}
                          className={`px-1.5 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                            activeStatementQualifier === 'only'
                              ? 'bg-red-500 text-[#050b1a] shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}
                        >
                          [only]
                        </button>{' '}
                        in the national river basin."
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Forensic Readout */}
                <div className="p-4 rounded-xl bg-[#050b1a] border border-[#e0d0ab]/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#b5c1d1] font-bold">
                      Diagnostic Forensic Profile for: <strong className="text-[#e0d0ab]">"{activeStatementQualifier}"</strong>
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        activeStatementQualifier === 'can_be'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {activeStatementQualifier === 'can_be' ? 'High Truth Probability (76.9%)' : 'High Falsehood Risk (81.3%)'}
                    </span>
                  </div>

                  <p className="text-xs text-[#f4ecd8] leading-relaxed">
                    {activeStatementQualifier === 'all' && (
                      <span>
                        Extreme absolutes such as "all" or "entirely" are intentionally embedded by examiners to force candidates into binary traps. In this statement, freshwater dolphins (like the Platanista gangetica) contradict the absolute assertion, rendering the statement false.
                      </span>
                    )}
                    {activeStatementQualifier === 'can_be' && (
                      <span>
                        Permissive modal verbs ("can be", "may be", "could") reflect genuine scientific contingency. UPSC examiners deliberately use permissive phrasing when describing complex biological or planetary mechanisms that do occur under specific conditions, resulting in high empirical veracity.
                      </span>
                    )}
                    {activeStatementQualifier === 'only' && (
                      <span>
                        When "only" appears inside factual premises (not option selectors), it narrows statutory or geographical boundaries excessively. River dolphins also inhabit the Brahmaputra and Meghna river networks, making this isolated statement premise false.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Qualifier Tables Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Extreme Qualifiers */}
                <div className="p-5 rounded-2xl bg-[#041228] border border-red-500/25 space-y-3">
                  <div className="flex items-center justify-between border-b border-red-500/20 pb-2.5">
                    <h5 className="text-xs font-mono uppercase tracking-wider text-red-400 font-bold flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Extreme Modifiers (Falsehood Risk)
                    </h5>
                    <span className="text-[10px] font-mono text-[#6e7d94]">Statements Only</span>
                  </div>
                  <div className="space-y-2">
                    {data.qualifiers.extremeQualifiers.map((q: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-[#071630] border border-red-500/15 flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-red-400">"{q.token}"</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[#b5c1d1]">N = {q.sampleSize}</span>
                          <span className="font-mono font-bold text-red-300">{q.falseStatementPct}% False</span>
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-mono font-bold uppercase">
                            {q.examinerTrapIndex.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contingent Qualifiers */}
                <div className="p-5 rounded-2xl bg-[#041228] border border-emerald-500/25 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                    <h5 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Contingent Modifiers (Truth Reliability)
                    </h5>
                    <span className="text-[10px] font-mono text-[#6e7d94]">Statements Only</span>
                  </div>
                  <div className="space-y-2">
                    {data.qualifiers.contingentQualifiers.map((q: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-[#071630] border border-emerald-500/15 flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-emerald-400">"{q.token}"</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[#b5c1d1]">N = {q.sampleSize}</span>
                          <span className="font-mono font-bold text-emerald-300">{q.trueStatementPct}% True</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold uppercase">
                            {q.reliabilityScore.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              TAB 3: PARETO 80/20 & DROUGHT RADAR
             ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'pareto' && data?.paretoDrought && (
            <div className="space-y-6">
              {/* Pareto Hero Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0a2148]/90 via-[#071630] to-[#041228] border border-[#e0d0ab]/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1.5">
                  <h3 className="text-base font-serif font-bold text-[#e0d0ab] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#e0d0ab]" />
                    The 80/20 Law of UPSC Testing Weightage
                  </h3>
                  <p className="text-xs text-[#b5c1d1] leading-relaxed max-w-2xl">
                    Empirical data reveals that <strong className="text-[#f4ecd8]">{data.paretoDrought.summary.core80PctNodeCount} syllabus nodes</strong> account for over 85% of total Prelims questions and Mains marks across 2000–2025.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="px-3.5 py-1.5 rounded-xl bg-[#071630] border border-[#e0d0ab]/25 text-[11px] font-mono text-[#f4ecd8]">
                    Evaluated Nodes: <strong className="text-[#e0d0ab]">{data.paretoDrought.totalNodesEvaluated}</strong>
                  </span>
                </div>
              </div>

              {/* Search & Paper Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {(['ALL', 'GS1', 'GS2', 'GS3'] as const).map((paper) => (
                    <button
                      key={paper}
                      onClick={() => setParetoPaperFilter(paper)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                        paretoPaperFilter === paper
                          ? 'bg-[#e0d0ab] text-[#050b1a] font-bold shadow-md'
                          : 'bg-[#041228] text-[#b5c1d1] hover:text-[#f4ecd8] border border-[#e0d0ab]/15'
                      }`}
                    >
                      {paper === 'ALL' ? 'All Papers' : paper}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-[#6e7d94] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search node code or topic…"
                    value={paretoSearchQuery}
                    onChange={(e) => setParetoSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#041228] border border-[#e0d0ab]/20 text-xs font-sans text-[#f4ecd8] placeholder-[#6e7d94] focus:outline-none focus:border-[#e0d0ab]/60"
                  />
                </div>
              </div>

              {/* Core Nodes Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#b5c1d1] font-bold flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-[#e0d0ab]" />
                  High-Yield Pareto Core Syllabus Nodes ({filteredParetoNodes.length})
                </h4>
                <div className="overflow-x-auto border border-[#e0d0ab]/20 rounded-2xl bg-[#041228]/80 shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#071630] border-b border-[#e0d0ab]/15 font-mono text-[#b5c1d1]">
                      <tr>
                        <th className="p-3.5">Node ID & Scope</th>
                        <th className="p-3.5">Paper</th>
                        <th className="p-3.5 text-center">Prelims Qs</th>
                        <th className="p-3.5 text-center">Mains Qs</th>
                        <th className="p-3.5 text-center">Total Marks</th>
                        <th className="p-3.5 text-right">Cum. Weight</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0d0ab]/10 font-sans">
                      {filteredParetoNodes.map((node: any, idx: number) => (
                        <React.Fragment key={idx}>
                          <tr className="hover:bg-[#0a2148]/40 transition-colors">
                            <td className="p-3.5">
                              <div className="font-mono text-[#e0d0ab] font-bold text-[11px]">{node.nodeId}</div>
                              <div className="text-[#b5c1d1] text-[11px] line-clamp-1 mt-0.5">{node.gloss}</div>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] text-[#f4ecd8]">{node.paper}</td>
                            <td className="p-3.5 text-center font-mono font-bold text-[#f4ecd8]">{node.totalPrelims}</td>
                            <td className="p-3.5 text-center font-mono text-[#b5c1d1]">{node.totalMains}</td>
                            <td className="p-3.5 text-center font-mono text-[#e0d0ab] font-bold">{node.totalMarks}</td>
                            <td className="p-3.5 text-right font-mono text-emerald-400 font-bold">{node.cumulativeWeightPct}%</td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => toggleNodeLinks(node.nodeId)}
                                  className={`px-2.5 py-1 rounded-md border text-[10px] font-mono inline-flex items-center gap-1 transition-all cursor-pointer ${
                                    expandedNodeId === node.nodeId
                                      ? 'bg-[#e0d0ab] text-[#050b1a] border-[#e0d0ab] font-bold shadow-sm'
                                      : 'bg-[#071630] hover:bg-[#0a2148] border-[#e0d0ab]/20 text-[#e0d0ab]'
                                  }`}
                                >
                                  <Search className="w-3 h-3" />
                                  Sources
                                </button>
                                <button
                                  onClick={() => {
                                    onClose();
                                    if (onLaunchPractice) onLaunchPractice(node.gloss);
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-[#071630] hover:bg-[#e0d0ab] hover:text-[#050b1a] border border-[#e0d0ab]/20 text-[10px] font-mono text-[#e0d0ab] inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                >
                                  <Swords className="w-3 h-3" />
                                  Drill
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedNodeId === node.nodeId && (
                            <tr>
                              <td colSpan={7} className="p-3.5 bg-[#050b1a]">
                                <NodeLinkedPyqs
                                  nodeId={node.nodeId}
                                  nodeGloss={node.gloss}
                                  nodePaper={node.paper}
                                  detail={nodeDetails[node.nodeId]}
                                  onLaunchPractice={onLaunchPractice}
                                  onClose={onClose}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Drought Nodes Section */}
              <div className="space-y-4 pt-4 border-t border-[#e0d0ab]/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Dormant Topic & Drought Radar (Surge Probability)
                  </h4>
                  <span className="text-[11px] font-mono text-[#b5c1d1]">
                    {data.paretoDrought.droughtNodes.length} Dormant Nodes Detected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.paretoDrought.droughtNodes.map((d: any, idx: number) => (
                    <div key={idx} className="p-5 rounded-2xl bg-[#041228] border border-amber-500/25 space-y-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-amber-400">{d.nodeId}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-400/15 text-amber-300 border border-amber-400/30 font-bold">
                          Dormant: {d.yearsDormant} Years
                        </span>
                      </div>
                      <p className="text-xs text-[#f4ecd8] line-clamp-2 leading-relaxed">{d.gloss}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-[#e0d0ab]/10 text-[11px] font-mono">
                        <span className="text-[#b5c1d1]">
                          Surge Probability: <strong className="text-emerald-400">{d.droughtProbabilityScore}%</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleNodeLinks(d.nodeId)}
                            className="text-[#e0d0ab] hover:underline flex items-center gap-1 cursor-pointer text-[10px] font-mono"
                          >
                            <Search className="w-3 h-3" />
                            {expandedNodeId === d.nodeId ? 'Hide' : 'Sources'}
                          </button>
                          <button
                            onClick={() => {
                              onClose();
                              if (onLaunchPractice) onLaunchPractice(d.gloss);
                            }}
                            className="text-[#f4ecd8] hover:text-[#e0d0ab] flex items-center gap-1 cursor-pointer text-[10px] font-mono"
                          >
                            Practice <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {expandedNodeId === d.nodeId && (
                        <div className="pt-2">
                          <NodeLinkedPyqs
                            nodeId={d.nodeId}
                            nodeGloss={d.gloss}
                            detail={nodeDetails[d.nodeId]}
                            onLaunchPractice={onLaunchPractice}
                            onClose={onClose}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              TAB 4: CICADA HARMONIC WAVES (VISUAL SINE WAVE RESONANCE)
             ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'cicada' && data?.cicadaTopics && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[#041228] border border-[#e0d0ab]/25 space-y-4 shadow-xl">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#e0d0ab] flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Cicada Topics: 1.8–2.5 Year Mathematical Recurrence Waves
                  </h3>
                  <p className="text-xs text-[#b5c1d1] mt-1 leading-relaxed">
                    UPSC's testing board operates on periodic cyclical rotations where specific statutory boundaries and scientific mechanisms reappear every alternate year.
                  </p>
                </div>

                {/* Visual Sine Wave Harmonic Graphic */}
                <div className="p-4 rounded-xl bg-[#050b1a] border border-[#e0d0ab]/20 relative overflow-hidden">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#b5c1d1] mb-2">
                    <span>CYCLED FREQUENCY SPECTRUM (2-YEAR WAVELENGTH)</span>
                    <span className="text-emerald-400 font-bold">100% Deterministic Testing Peaks</span>
                  </div>
                  <svg viewBox="0 0 800 100" className="w-full h-20 text-[#e0d0ab]">
                    {/* Sine wave path */}
                    <path
                      d="M 0 50 Q 100 0, 200 50 T 400 50 T 600 50 T 800 50"
                      fill="transparent"
                      stroke="#e0d0ab"
                      strokeWidth="2.5"
                      className="opacity-80"
                    />
                    {/* Secondary harmonic wave */}
                    <path
                      d="M 0 50 Q 100 90, 200 50 T 400 50 T 600 50 T 800 50"
                      fill="transparent"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      className="opacity-40"
                    />
                    {/* Node points along crests */}
                    {[100, 300, 500, 700].map((cx, idx) => (
                      <g key={idx}>
                        <circle cx={cx} cy={cx % 200 === 100 ? 25 : 75} r="5" fill="#e0d0ab" />
                        <circle cx={cx} cy={cx % 200 === 100 ? 25 : 75} r="9" fill="transparent" stroke="#e0d0ab" strokeWidth="1" className="animate-ping" opacity="0.6" />
                      </g>
                    ))}
                  </svg>
                  <div className="flex items-center justify-between text-[9px] font-mono text-[#6e7d94] mt-1">
                    <span>2010–2013 Base</span>
                    <span>2015–2018 Transition</span>
                    <span>2020–2022 Surge</span>
                    <span>2023–2025 Current Era</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {data.cicadaTopics.map((c: any, idx: number) => (
                  <div key={idx} className="p-5 rounded-2xl bg-[#041228] border border-[#e0d0ab]/20 space-y-3.5 shadow-lg">
                    <div className="flex items-start justify-between gap-2 border-b border-[#e0d0ab]/15 pb-2.5">
                      <div>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
                          {c.pillar} • Harmonic Wave: {c.harmonicCycleYears}
                        </span>
                        <h4 className="font-serif font-bold text-[#f4ecd8] text-sm mt-2">{c.topic}</h4>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-mono font-black text-emerald-400">{c.recurrenceScore}%</span>
                        <span className="text-[9px] font-mono text-[#6e7d94] block">Fidelity Score</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#f4ecd8] leading-relaxed font-sans">{c.coreInsight}</p>

                    <div className="pt-2 border-t border-[#e0d0ab]/10 flex items-center justify-between text-[11px] font-mono text-[#b5c1d1] flex-wrap gap-2">
                      <span>Historical Tested Cycles:</span>
                      <strong className="text-[#e0d0ab]">{(c.historicalTestYears || []).join(', ')}</strong>
                    </div>

                    <button
                      onClick={() => toggleNodeLinks(c.nodeId)}
                      className={`w-full px-3 py-2 rounded-lg border text-[10px] font-mono inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        expandedNodeId === c.nodeId
                          ? 'bg-[#e0d0ab] text-[#050b1a] border-[#e0d0ab] font-bold shadow-md'
                          : 'bg-[#071630] hover:bg-[#0a2148] border-[#e0d0ab]/20 text-[#e0d0ab]'
                      }`}
                    >
                      <Search className="w-3 h-3" />
                      {expandedNodeId === c.nodeId ? 'Hide base questions' : 'Show verified base questions'}
                    </button>
                    {expandedNodeId === c.nodeId && <NodeLinkedPyqs nodeId={c.nodeId} detail={nodeDetails[c.nodeId]} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              TAB 5: CSAT PAPER-2 EMPIRICAL DNA (VISUAL TRIAD)
             ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'csat' && data?.csatAnatomy && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[#041228] border border-[#e0d0ab]/25 space-y-4 shadow-xl">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#e0d0ab] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    CSAT Paper-2: 15-Year Empirical Anatomy (2011–2025)
                  </h3>
                  <p className="text-xs text-[#b5c1d1] mt-1 leading-relaxed">
                    Comprehensive breakdown of 600+ CSAT questions across Reading Comprehension, Quantitative Aptitude, and Logical Reasoning.
                  </p>
                </div>

                {/* Visual Proportional Triad Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-[#b5c1d1]">
                    <span>CSAT Cognitive Distribution Triad:</span>
                    <span className="text-[#e0d0ab]">608 Questions Normalized</span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-[#050b1a] overflow-hidden flex border border-[#e0d0ab]/20 p-0.5">
                    <div style={{ width: '46.2%' }} className="bg-blue-500 h-full rounded-l-full" title="Reading Comprehension: 46.2%" />
                    <div style={{ width: '32.4%' }} className="bg-amber-500 h-full" title="Quantitative Aptitude: 32.4%" />
                    <div style={{ width: '21.4%' }} className="bg-emerald-500 h-full rounded-r-full" title="Logical Reasoning: 21.4%" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-5 rounded-2xl bg-[#041228] border border-blue-500/25 space-y-3.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                    <h4 className="font-serif font-bold text-[#f4ecd8] text-sm">Reading Comprehension</h4>
                    <span className="text-xs font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30">
                      {data.csatAnatomy.readingComprehension.sharePct}%
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-[#f4ecd8]">
                    <p><strong className="text-[#e0d0ab]">Avg Passage:</strong> {data.csatAnatomy.readingComprehension.averagePassageWordLength} words</p>
                    <p><strong className="text-[#e0d0ab]">Dominant Types:</strong> {data.csatAnatomy.readingComprehension.dominantQuestionType}</p>
                    <div className="p-3 rounded-lg bg-[#050b1a] border border-red-500/20 text-red-300 text-[11px] leading-relaxed">
                      <strong>Examiner Trap:</strong> {data.csatAnatomy.readingComprehension.examinerTrapProfile}
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#041228] border border-amber-500/25 space-y-3.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <h4 className="font-serif font-bold text-[#f4ecd8] text-sm">Quantitative Aptitude</h4>
                    <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
                      {data.csatAnatomy.quantitativeAptitude.sharePct}%
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-[#f4ecd8]">
                    <p><strong className="text-[#e0d0ab]">Core Focus:</strong> {data.csatAnatomy.quantitativeAptitude.coreFocusAreas}</p>
                    <div className="p-3 rounded-lg bg-[#050b1a] border border-amber-500/20 text-amber-200 text-[11px] leading-relaxed">
                      <strong>Pacing Profile:</strong> {data.csatAnatomy.quantitativeAptitude.pacingProfile}
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#041228] border border-emerald-500/25 space-y-3.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <h4 className="font-serif font-bold text-[#f4ecd8] text-sm">Logical Reasoning</h4>
                    <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                      {data.csatAnatomy.logicalReasoning.sharePct}%
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-[#f4ecd8]">
                    <p><strong className="text-[#e0d0ab]">Core Focus:</strong> {data.csatAnatomy.logicalReasoning.coreFocusAreas}</p>
                    <div className="p-3 rounded-lg bg-[#050b1a] border border-emerald-500/20 text-emerald-200 text-[11px] leading-relaxed">
                      <strong>Pacing Profile:</strong> {data.csatAnatomy.logicalReasoning.pacingProfile}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              TAB 6: GS-4 & ESSAY DIALECTICAL AXES (VISUAL TENSION BALANCE)
             ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'dialectics' && data?.dialecticalAxes && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[#041228] border border-[#e0d0ab]/25 space-y-2 shadow-xl">
                <h3 className="text-base font-serif font-bold text-[#e0d0ab] flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#e0d0ab]" />
                  The 4 Fundamental Dialectical Axes of GS-4 & Essay Papers
                </h3>
                <p className="text-xs text-[#b5c1d1] leading-relaxed">
                  UPSC Mains GS-4 Section A and Essay prompts deliberately position candidates in the tension between competing philosophical virtues.
                </p>
              </div>

              {/* Axis Selector Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.dialecticalAxes.map((axis: any, idx: number) => {
                  const isActive = activeDialecticIdx === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveDialecticIdx(idx)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#e0d0ab] text-[#050b1a] border-[#e0d0ab] font-bold shadow-md'
                          : 'bg-[#041228] text-[#b5c1d1] hover:text-[#f4ecd8] border-[#e0d0ab]/15'
                      }`}
                    >
                      <span className="text-[10px] font-mono block mb-1">Axis {idx + 1}</span>
                      <span className="text-xs font-serif font-bold line-clamp-1">{axis.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Dialectic Deep Visual Card */}
              {(() => {
                const axis = data.dialecticalAxes[activeDialecticIdx] || data.dialecticalAxes[0];
                return (
                  <motion.div
                    key={activeDialecticIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-[#041228] border border-[#e0d0ab]/25 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e0d0ab]/15 pb-3">
                      <h4 className="font-serif font-bold text-[#f4ecd8] text-lg">{axis.title}</h4>
                      <div className="flex gap-1.5">
                        {axis.recurrentPapers.map((p: string, pIdx: number) => (
                          <span key={pIdx} className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#071630] border border-[#e0d0ab]/25 text-[#e0d0ab]">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
                      <div className="p-4 rounded-xl bg-[#071630] border border-blue-500/25 space-y-1.5">
                        <span className="font-mono text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                          Thesis (Perspective A):
                        </span>
                        <p className="text-[#f4ecd8]">{axis.thesis}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-[#071630] border border-amber-500/25 space-y-1.5">
                        <span className="font-mono text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                          Antithesis (Perspective B):
                        </span>
                        <p className="text-[#f4ecd8]">{axis.antithesis}</p>
                      </div>
                    </div>

                    <div className="p-4.5 rounded-xl bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 space-y-1.5">
                      <span className="font-mono text-[10px] font-bold text-[#e0d0ab] uppercase flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#e0d0ab]" />
                        Examiner Expected Synthesis Framework:
                      </span>
                      <p className="text-xs text-[#f4ecd8] leading-relaxed font-sans">{axis.synthesisFramework}</p>
                    </div>
                  </motion.div>
                );
              })()}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              TAB 7: DIRECTIVE VERB SCORING PYRAMID (VISUAL COGNITIVE TIERS)
             ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'directives' && data?.directiveRubrics && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[#041228] border border-[#e0d0ab]/25 space-y-2 shadow-xl">
                <h3 className="text-base font-serif font-bold text-[#e0d0ab] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#e0d0ab]" />
                  Directive Verb Cognitive Depth Pyramid & Mark Allocation
                </h3>
                <p className="text-xs text-[#b5c1d1] leading-relaxed">
                  UPSC examiners evaluate candidate responses against pre-defined cognitive depth tiers corresponding to the command directive.
                </p>
              </div>

              {/* Directive Stepper */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.directiveRubrics.map((r: any, idx: number) => {
                  const isActive = activeDirectiveIdx === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveDirectiveIdx(idx)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#e0d0ab] text-[#050b1a] border-[#e0d0ab] font-bold shadow-md'
                          : 'bg-[#041228] text-[#b5c1d1] hover:text-[#f4ecd8] border-[#e0d0ab]/15'
                      }`}
                    >
                      <span className="text-[10px] font-mono block mb-0.5">{r.cognitiveDepth.split(' ')[0]}</span>
                      <span className="text-xs font-serif font-bold">"{r.directive}"</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Directive Deep Visual Card */}
              {(() => {
                const directive = data.directiveRubrics[activeDirectiveIdx] || data.directiveRubrics[0];
                return (
                  <motion.div
                    key={activeDirectiveIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-[#041228] border border-[#e0d0ab]/25 space-y-5 shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-[#e0d0ab]/15 pb-3">
                      <span className="font-serif font-bold text-xl text-[#e0d0ab]">"{directive.directive}"</span>
                      <span className="text-[10px] font-mono font-bold px-3 py-1 rounded bg-[#071630] border border-[#e0d0ab]/25 text-[#f4ecd8]">
                        {directive.cognitiveDepth}
                      </span>
                    </div>

                    <p className="text-xs text-[#f4ecd8] leading-relaxed">{directive.coreIntent}</p>

                    {/* Animated Mark Allocation Blueprint Bars */}
                    <div className="space-y-3 pt-2 border-t border-[#e0d0ab]/15">
                      <span className="text-[10px] font-mono text-[#b5c1d1] uppercase font-bold tracking-wider">
                        Mark Allocation Blueprint:
                      </span>
                      <div className="space-y-2.5">
                        {directive.markAllocationBlueprint.map((comp: any, cIdx: number) => (
                          <div key={cIdx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-[#b5c1d1]">{comp.component}</span>
                              <strong className="text-[#e0d0ab]">{comp.weightPct}%</strong>
                            </div>
                            <div className="h-2 w-full rounded-full bg-[#050b1a] overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#e0d0ab] to-amber-400 rounded-full transition-all duration-300"
                                style={{ width: `${comp.weightPct}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-red-950/25 border border-red-900/35 text-xs text-red-300 leading-relaxed">
                      <strong className="text-red-400 font-mono text-[10px] uppercase block mb-1">
                        Fatal Candidate Error:
                      </strong>
                      {directive.examinerPenaltyPitfall}
                    </div>
                  </motion.div>
                );
              })()}
            </div>
          )}

        </div>

        {/* ── Footer Bar Chrome ── */}
        <div className="px-5 sm:px-7 py-3.5 bg-[#041228] border-t border-[#e0d0ab]/20 flex items-center justify-between text-xs font-mono text-[#b5c1d1] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Tark Intelligence Engine • Official UPSC Historical Grounding (2000–2025)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#071630] hover:bg-[#e0d0ab] hover:text-[#050b1a] text-[#f4ecd8] rounded-lg font-sans text-xs font-bold transition-all cursor-pointer border border-[#e0d0ab]/25 shadow-sm"
          >
            Close Dossier
          </button>
        </div>
      </motion.div>
    </div>
  );
}
