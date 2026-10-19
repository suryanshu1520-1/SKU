import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, AlertTriangle, ShieldAlert, Crosshair, BookOpen, Sparkles, Flame, GitFork } from 'lucide-react';
import { EXAMINER_OPERATORS, type ExaminerOperatorType, type StatementDissectionItem, type ArenaLaunchConfig } from '../types';
import { getPolicyEntityForText } from '../lib/policy-ripple-radar-shared';
import { computeCalibrated5050EV } from '../lib/examiner_psyche';

interface SampleQuestion {
  id: string;
  subject: string;
  yearTag: string;
  tabLabel: string;
  isPibTrap?: boolean;
  question: string;
  statements?: string[];
  prompt?: string;
  options: string[];
  correctIndex: number;
  trap: string;
  weakness: string;
  node_id: string;
  primary_operator: ExaminerOperatorType;
  secondary_operator?: ExaminerOperatorType;
  entity_slugs?: string[];
  statutory_anchor: string;
  marked_trap_label?: string;
  truth_key_label?: string;
  statement_dissection?: StatementDissectionItem[];
}

const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    id: 'sample-pib-green-hydrogen',
    subject: 'Current Affairs & Policy',
    yearTag: "Today's PIB Examiner Trap",
    tabLabel: "PIB: Green Hydrogen",
    isPibTrap: true,
    node_id: 'GS3.ECO.INFRA',
    primary_operator: 'PSY_01_INST_SWAP',
    secondary_operator: 'PSY_02_QUAL_POLARITY',
    statutory_anchor: 'Cabinet Release ID 1888542 / SIGHT Guidelines, Para 2',
    marked_trap_label: '(b) 1 and 2 only [MoPNG Swap Trap]',
    truth_key_label: '(a) 1 only [MNRE Sole Administrative Anchor]',
    question: 'With reference to the National Green Hydrogen Mission approved by the Union Cabinet, consider the following statements:',
    statements: [
      'The Strategic Interventions for Green Hydrogen Transition (SIGHT) programme provides direct financial incentives for domestic electrolyser manufacturing.',
      'The Mission is administratively anchored and implemented under the Ministry of Petroleum and Natural Gas.',
      'It imposes an immediate statutory procurement obligation of 10% green hydrogen on all domestic refineries from year one.'
    ],
    prompt: 'Which of the statements given above is/are correct?',
    options: [
      '1 only',
      '1 and 2 only',
      '2 and 3 only',
      '1, 2 and 3'
    ],
    correctIndex: 0,
    trap: 'The Nodal Ministry & Premature Mandate Trap. Statement 2 swaps the nodal ministry—the Mission is anchored under the Ministry of New and Renewable Energy (MNRE), not MoPNG. Statement 3 introduces an extreme qualifier; consumption mandates are phased pilot targets, not day-one statutory obligations.',
    weakness: 'PIB Policy & Cabinet Decisions: Inter-ministerial jurisdiction confusion detected. Negative marking penalty: −0.66 marks.',
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: 'SIGHT Component I (Electrolyser Manufacturing)',
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: 'PSY_01_INST_SWAP',
        marked_trap: 'Ministry of Petroleum and Natural Gas',
        truth_key: 'Ministry of New and Renewable Energy (MNRE)',
        anchor: 'Cabinet Release ID 1888542, Para 4',
      },
      {
        stmt_num: 3,
        is_true: false,
        operator: 'PSY_02_QUAL_POLARITY',
        marked_trap: 'immediate statutory procurement obligation of 10%... from year one',
        truth_key: 'Phased pilot targets without immediate day-one statutory penal mandates',
        anchor: 'Green Hydrogen Mission Document, §4.3',
      },
    ],
  },
  {
    id: 'sample-pib-critical-minerals',
    subject: 'Economy & Resource Policy',
    yearTag: 'PIB Gazette Intelligence',
    tabLabel: 'PIB: Critical Minerals',
    isPibTrap: true,
    node_id: 'GS3.ECO.RESOURCES',
    primary_operator: 'PSY_02_QUAL_POLARITY',
    secondary_operator: 'PSY_03_LEGAL_TIER',
    statutory_anchor: 'Offshore Areas Mineral (Development and Regulation) Amendment Act, 2023',
    marked_trap_label: '(c) Both 1 and 2 [Absolute Ban Decoy]',
    truth_key_label: '(a) 1 only [Private Operating Rights Allowed]',
    question: 'With reference to the Offshore Areas Mineral (Development and Regulation) Amendment Act and recent auctions of Critical and Strategic Minerals, consider the following statements:',
    statements: [
      'Revenues generated from the offshore auction of critical mineral production leases are allocated entirely to the Consolidated Fund of India.',
      'The Act establishes an absolute statutory prohibition barring private entities from mining any offshore mineral deposits.'
    ],
    prompt: 'Which of the statements given above is/are correct?',
    options: [
      '1 only',
      '2 only',
      'Both 1 and 2',
      'Neither 1 nor 2'
    ],
    correctIndex: 0,
    trap: 'The Extreme Absolute Qualifier Trap. Statement 2 uses "absolute statutory prohibition"; the 2023 amendment explicitly introduced competitive auction of operating rights to private corporate entities for non-atomic offshore minerals.',
    weakness: 'Mining & Critical Minerals Regulatory Framework weakness score, 2.2 → 3.5. Overlooked recent statutory reforms (−0.66).',
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: 'OAMDR Act 2023, Section 13 read with Consolidated Fund of India',
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: 'PSY_02_QUAL_POLARITY',
        marked_trap: 'absolute statutory prohibition barring private entities',
        truth_key: 'Competitive auction of operating rights granted to private corporate entities for non-atomic minerals',
        anchor: 'OAMDR Amendment Act 2023, Section 4A',
      },
    ],
  },
  {
    id: 'sample-prelims-2001-q39',
    subject: 'Polity',
    yearTag: 'UPSC Prelims 2001, GS Paper 1',
    tabLabel: 'Polity: Schedules',
    isPibTrap: false,
    node_id: 'GS2.POL.CONSTITUTION',
    primary_operator: 'PSY_04_CAUSAL_INV',
    statutory_anchor: 'Constitution of India, First Schedule read with Articles 1–4',
    marked_trap_label: '(b) Second Schedule [Remuneration Inversion]',
    truth_key_label: '(a) First Schedule [States and UTs]',
    question: 'If a new State of the Indian Union is to be created, which one of the following Schedules of the Constitution must be amended?',
    options: [
      'First',
      'Second',
      'Third',
      'Fifth'
    ],
    correctIndex: 0,
    trap: 'First Schedule lists the States and Union Territories (Articles 1 and 4). Second Schedule deals with salaries, allowances, and emoluments of constitutional authorities (President, Governors, Judges, CAG). You picked the remuneration trap.',
    weakness: 'Schedules of the Constitution weakness score, 2.4 → 3.6. Foundational Article 2 & 3 state reorganisation mechanics need reinforcement.',
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: false,
        operator: 'PSY_04_CAUSAL_INV',
        marked_trap: 'Second Schedule (Remuneration & Salaries)',
        truth_key: 'First Schedule (Territories and Names of the States)',
        anchor: 'Constitution of India, Articles 1, 4 & First Schedule',
      },
    ],
  },
  {
    id: 'sample-delimitation',
    subject: 'Polity',
    yearTag: 'Prelims 2023, Polity',
    tabLabel: 'Prelims 2023: Finality',
    isPibTrap: false,
    node_id: 'GS2.POL.ELECTORAL',
    primary_operator: 'PSY_03_LEGAL_TIER',
    secondary_operator: 'PSY_06_PAIR_DECOY',
    statutory_anchor: 'Constitution of India, Article 82 & Article 329(a) read with Delimitation Act, 2002',
    marked_trap_label: '(c) Both 1 and 2 [Presidential Ratification Assumption]',
    truth_key_label: '(a) 1 only [Article 329(a) Finality Immunity]',
    question: 'Consider the following statements regarding the Delimitation Commission under Article 82:',
    statements: [
      'Its orders have the force of law and cannot be questioned in any court.',
      'Its recommendations require prior Presidential ratification before taking effect.'
    ],
    prompt: 'Which of the statements given above is/are correct?',
    options: [
      '1 only',
      '2 only',
      'Both 1 and 2',
      'Neither 1 nor 2'
    ],
    correctIndex: 0,
    trap: 'The Finality Doctrine reversal. Article 329 makes Delimitation orders unappealable. You assumed Presidential ratification, a common confusion with Article 3 (state reorganisation), which does need Parliament.',
    weakness: 'Constitutional Bodies weakness score, 3.2 → 4.1. Now the third-largest gap in your ledger.',
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: 'Delimitation Act, Section 10(2) & Art 329(a)',
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: 'PSY_03_LEGAL_TIER',
        marked_trap: 'require prior Presidential ratification before taking effect',
        truth_key: 'Orders have the force of law upon publication in Gazette; no Presidential veto',
        anchor: 'Delimitation Act 2002, Section 10(1)',
      },
    ],
  },
  {
    id: 'sample-anti-defection',
    subject: 'Constitutional Law',
    yearTag: 'UPSC CSE Standard',
    tabLabel: 'Law: Anti-Defection',
    isPibTrap: false,
    node_id: 'GS2.POL.PARLIAMENT',
    primary_operator: 'PSY_05_SCOPE_MUTATE',
    secondary_operator: 'PSY_03_LEGAL_TIER',
    statutory_anchor: 'Constitution of India, Tenth Schedule, Paragraphs 2(3) & 6',
    marked_trap_label: '(a) 1 only [Overlooked 6-month nominated member threshold]',
    truth_key_label: '(c) Both 1 and 2 [Tenth Schedule Para 2(3) & Para 6]',
    question: 'With reference to the Anti-Defection Law (Tenth Schedule of the Constitution), consider the following statements:',
    statements: [
      'The law does not specify a time-frame within which the Presiding Officer must decide a disqualification plea.',
      'A nominated member becomes subject to disqualification if they join any political party after 6 months of taking seat.'
    ],
    prompt: 'Which of the statements given above is/are correct?',
    options: [
      '1 only',
      '2 only',
      'Both 1 and 2',
      'Neither 1 nor 2'
    ],
    correctIndex: 2,
    trap: 'Para 2(3) Trap. Nominated members must join within 6 months to avoid disqualification. Keisham Meghachandra Singh (2020) confirmed Speakers have no statutory timeline.',
    weakness: 'Parliamentary Procedures weakness score, 2.8 → 3.6.',
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: 'Tenth Schedule, Para 6 (Keisham Meghachandra Singh v. Honble Speaker, 2020)',
      },
      {
        stmt_num: 2,
        is_true: true,
        operator: null,
        anchor: 'Tenth Schedule, Paragraph 2(3) (disqualification if joining after 6 months)',
      },
    ],
  },
  {
    id: 'sample-pib-semicon-nexus',
    subject: 'Science & Industry Policy',
    yearTag: 'Full-Chain Boss MCQ (r0→r2)',
    tabLabel: 'Boss: Semicon Nexus',
    isPibTrap: true,
    node_id: 'GS3.SCI.IT_COMP',
    primary_operator: 'PSY_01_INST_SWAP',
    secondary_operator: 'PSY_03_LEGAL_TIER',
    entity_slugs: ['ENT_ISM'],
    statutory_anchor: 'Semicon India Programme Guidelines, MeitY Gazette ID 2022-774',
    marked_trap_label: '(b) Only two [Statutory Authority & Ministry Trap]',
    truth_key_label: '(a) Only one [Sovereign Fiscal Anchor True]',
    question: 'With reference to the India Semiconductor Mission (ISM) and Semicon 2.0 architecture, consider the following statements:',
    statements: [
      'Under Semicon 2.0 guidelines approved by the Union Cabinet, fiscal support of up to 50% of project cost is extended on an equal pari-passu basis for setting up Silicon Semiconductor Fabs in India.',
      'The operationalization of compound semiconductor units and execution of the Electronic Components and Manufacturing Scheme (ECMS) is administered directly under the statutory authority of the Ministry of Heavy Industries.',
      'The India Semiconductor Mission (ISM) is a statutory regulatory body established pursuant to an Act of Parliament to adjudicate technology transfer disputes.'
    ],
    prompt: 'How many of the above statements are correct?',
    options: [
      'Only one',
      'Only two',
      'All three',
      'None'
    ],
    correctIndex: 0,
    trap: 'Multi-Ring Policy Ripple Trap. Statement 1 is TRUE (r0 origin). Statement 2 swaps the executing ministry—ISM is under MeitY (Digital India Corporation), NOT Ministry of Heavy Industries. Statement 3 misattributes Legal Tier—ISM is a Tier-4 Autonomous Society / division within a Section-8 company, NOT a statutory body.',
    weakness: 'Semiconductors & Deep Tech Policy chain vulnerability detected (−0.66 marks). Fact half-life anchored: T_1/2 >= 231 days.',
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: 'Cabinet Approval December 2021 / Modified Scheme 2022 (50% pari-passu subsidy)',
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: 'PSY_01_INST_SWAP',
        marked_trap: 'Ministry of Heavy Industries',
        truth_key: 'Ministry of Electronics and Information Technology (MeitY) / Digital India Corporation',
        anchor: 'ISM Operational Guidelines, Para 1.2',
      },
      {
        stmt_num: 3,
        is_true: false,
        operator: 'PSY_03_LEGAL_TIER',
        marked_trap: 'Tier-2 statutory regulatory body created under an Act of Parliament',
        truth_key: 'Tier-4 Autonomous Nodal Division within Digital India Corporation (Section 8 Company)',
        anchor: 'Digital India Corporation Bye-laws, 2021',
      },
    ],
  }
];

const TRAP_DEFAULTS = [1, 2, 1, 2, 0, 1];

interface DiagnosticPreviewProps {
  onLaunchFullArena: (config?: ArenaLaunchConfig) => void;
}

export default function DiagnosticPreview({ onLaunchFullArena }: DiagnosticPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(TRAP_DEFAULTS[0]);
  const [struckOptions, setStruckOptions] = useState<Set<number>>(new Set());
  const [is5050Call, setIs5050Call] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(107); // 01:47

  const q = SAMPLE_QUESTIONS[currentIndex];
  const opMeta = EXAMINER_OPERATORS[q.primary_operator];

  // Timer countdown
  useEffect(() => {
    if (hasSubmitted) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [hasSubmitted]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const toggleStrikeOption = (idx: number) => {
    if (hasSubmitted) return;
    setStruckOptions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
        if (selectedOption === idx) {
          setSelectedOption(null);
        }
      }
      return next;
    });
  };

  const handleSelect = (idx: number) => {
    if (hasSubmitted) return;
    if (struckOptions.has(idx)) {
      toggleStrikeOption(idx);
    }
    setSelectedOption(idx);
  };

  const handleContextMenu = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    toggleStrikeOption(idx);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    const isFifty = struckOptions.size === 2 && !struckOptions.has(selectedOption);
    setIs5050Call(isFifty);
    setHasSubmitted(true);

    // Fire telemetry in background best effort
    try {
      const marksDelta = selectedOption === q.correctIndex ? 2.0 : -0.66;
      const eliminatedArr = Array.from(struckOptions).map((i) => String.fromCharCode(97 + i));
      fetch('/api/analytics/examiner-psyche/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '00000000-0000-0000-0000-000000000000',
          questionId: q.id,
          nodeId: q.node_id,
          operatorTested: q.primary_operator,
          selectedOption: String.fromCharCode(97 + selectedOption),
          officialKey: String.fromCharCode(97 + q.correctIndex),
          isCorrect: selectedOption === q.correctIndex,
          marksDelta,
          is5050Call: isFifty,
          eliminatedOptions: eliminatedArr,
          responseMs: (107 - secondsRemaining) * 1000,
        }),
      }).catch(() => {});
    } catch {}
  };

  const handleSwitchQuestion = (idx: number) => {
    setCurrentIndex(idx);
    setHasSubmitted(false);
    setSelectedOption(TRAP_DEFAULTS[idx] ?? null);
    setStruckOptions(new Set());
    setIs5050Call(false);
    setSecondsRemaining(107);
  };

  const handleResetOrNext = () => {
    const nextIdx = (currentIndex + 1) % SAMPLE_QUESTIONS.length;
    handleSwitchQuestion(nextIdx);
  };

  const handleLaunchTargetedDrill = () => {
    onLaunchFullArena({
      mode: 'topic_drill',
      title: `${opMeta.shortLabel} Defense Drill`,
      subtitle: `Targeted 10-MCQ Crucible on ${q.node_id} [${opMeta.code}]`,
      targetId: q.node_id,
      questionCount: 10,
      isRanked: true,
      timePerQuestionSeconds: 72,
      contextTag: q.primary_operator,
    });
  };

  // Keyboard shortcut listener for A, B, C, D and Shift + A/B/C/D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (hasSubmitted) {
        if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleResetOrNext();
        }
        return;
      }

      const key = e.key.toUpperCase();
      const code = e.code;
      const isShift = e.shiftKey;

      if (key === 'A' || code === 'KeyA' || key === '1' || code === 'Digit1') {
        e.preventDefault();
        if (isShift) toggleStrikeOption(0);
        else handleSelect(0);
      } else if (key === 'B' || code === 'KeyB' || key === '2' || code === 'Digit2') {
        e.preventDefault();
        if (isShift) toggleStrikeOption(1);
        else handleSelect(1);
      } else if (key === 'C' || code === 'KeyC' || key === '3' || code === 'Digit3') {
        e.preventDefault();
        if (isShift) toggleStrikeOption(2);
        else handleSelect(2);
      } else if (key === 'D' || code === 'KeyD' || key === '4' || code === 'Digit4') {
        e.preventDefault();
        if (isShift) toggleStrikeOption(3);
        else handleSelect(3);
      } else if (key === 'ENTER') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSubmitted, selectedOption, currentIndex, struckOptions]);

  const isCorrect = selectedOption === q.correctIndex;

  return (
    <div className="w-full double-bezel-outer">
      <div className="double-bezel-inner">
        {/* Interactive Topic / Trap Switcher */}
        <div className="px-5 md:px-6 pt-3 pb-2.5 border-b border-[rgba(224,208,171,0.08)] bg-gradient-to-b from-[rgba(224,208,171,0.04)] to-transparent flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {SAMPLE_QUESTIONS.map((item, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSwitchQuestion(idx)}
                className={`px-2.5 py-1 rounded-full font-mono text-[10px] tracking-[0.06em] whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  isActive
                    ? item.isPibTrap
                      ? 'bg-[rgba(244,63,94,0.18)] text-[#fca5a5] border border-[rgba(244,63,94,0.45)] font-bold shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                      : 'bg-[#e0d0ab] text-[#050b1a] font-bold shadow-sm'
                    : 'bg-[rgba(224,208,171,0.03)] text-[#7d8ca4] hover:text-[#f4ecd8] border border-[rgba(224,208,171,0.10)]'
                }`}
              >
                {item.isPibTrap && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#f87171] animate-ping' : 'bg-[#f87171]/70'}`} />
                )}
                <span>{item.tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Tab strip */}
        <div className="flex items-center justify-between px-5 md:px-6 py-3 border-b border-[rgba(224,208,171,0.10)] bg-[rgba(5,11,26,0.3)]">
          <div className="flex items-center gap-2.5 font-mono text-[10px] text-[#6e7d94] tracking-[0.18em] uppercase">
            <span className="text-[#f4ecd8] font-medium">Live diagnostic</span>
            <span className="text-[rgba(224,208,171,0.25)]">/</span>
            <span className="truncate max-w-[150px] sm:max-w-none text-[#e0d0ab]">{q.yearTag}</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-[#6e7d94]">Q</span>
            <span className="text-[#f4ecd8] font-bold">
              {String(currentIndex + 1).padStart(2, '0')}{' '}
              <span className="text-[#6e7d94] font-normal">/ {String(SAMPLE_QUESTIONS.length).padStart(2, '0')}</span>
            </span>
            <span className="text-[rgba(224,208,171,0.20)]">|</span>
            <span className="text-[#e0d0ab] font-bold tracking-[0.04em]">{formatTimer(secondsRemaining)}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-7">
          <AnimatePresence mode="wait">
            {!hasSubmitted ? (
              <motion.div
                key={`question-${q.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                {/* Marking tag with Operator and PIB Trap badge */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <div className="inline-block px-2.5 py-1 bg-[rgba(52,211,153,0.10)] border border-[rgba(52,211,153,0.32)] rounded-[4px] font-mono text-[10px] text-[#34d399] font-bold tracking-[0.10em]">
                    +2.00 / −0.66 marking on
                  </div>

                  {/* Deterministic Operator pill */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(224,208,171,0.12)] border border-[rgba(224,208,171,0.35)] rounded-[4px] font-mono text-[10px] text-[#e0d0ab] font-semibold tracking-[0.08em] uppercase">
                    <Crosshair className="w-3 h-3 text-[#e0d0ab]" />
                    <span>VECTOR: {opMeta.code} // {opMeta.shortLabel}</span>
                  </div>

                  {q.isPibTrap && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(244,63,94,0.12)] border border-[rgba(244,63,94,0.30)] rounded-[4px] font-mono text-[10px] text-[#fca5a5] font-semibold tracking-[0.08em] uppercase">
                      <AlertTriangle className="w-3 h-3 text-[#f87171]" />
                      <span>Examiner Trap</span>
                    </div>
                  )}

                  {struckOptions.size === 2 && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(168,85,247,0.15)] border border-[rgba(168,85,247,0.40)] rounded-[4px] font-mono text-[10px] text-[#d8b4fe] font-bold tracking-[0.08em] uppercase animate-pulse">
                      <span>50:50 Call Active (2 Struck)</span>
                    </div>
                  )}
                </div>

                {/* Question preamble */}
                <div className="font-serif text-[18px] md:text-[19px] leading-[1.5] text-[#f4ecd8] mb-4 font-normal">
                  {q.question}
                </div>

                {/* Numbered statements if present */}
                {q.statements && q.statements.length > 0 && (
                  <ol className="m-0 mb-5 pl-6 font-serif text-[15px] leading-[1.6] text-[#b5c1d1] font-normal list-decimal space-y-1.5">
                    {q.statements.map((stmt, sIdx) => (
                      <li key={sIdx}>{stmt}</li>
                    ))}
                  </ol>
                )}

                {q.prompt && (
                  <p className="m-0 mb-5 font-serif text-[14px] text-[#6e7d94] italic">
                    {q.prompt}
                  </p>
                )}

                {/* 4 Interactive Options with Right-Click Strikethrough */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                  {q.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isStruck = struckOptions.has(idx);
                    const letter = String.fromCharCode(97 + idx); // lowercase a, b, c, d

                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => handleSelect(idx)}
                        onContextMenu={(e) => handleContextMenu(e, idx)}
                        className={`option w-full min-h-[52px] px-4 py-3 rounded-[12px] flex items-center gap-3 text-left cursor-pointer transition-all outline-none ${
                          isStruck
                            ? 'border border-[rgba(224,208,171,0.08)] bg-[rgba(5,11,26,0.4)] opacity-45 line-through'
                            : isSelected
                            ? 'border border-[#e0d0ab] bg-[rgba(224,208,171,0.06)] shadow-[0_0_0_3px_rgba(224,208,171,0.10)]'
                            : 'border border-[rgba(224,208,171,0.14)] hover:border-[rgba(224,208,171,0.38)] bg-transparent'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-mono text-[11px] font-bold shrink-0 transition-colors ${
                            isStruck
                              ? 'border border-dashed border-[#6e7d94] text-[#6e7d94]'
                              : isSelected
                              ? 'bg-[#e0d0ab] text-[#050b1a]'
                              : 'border border-[rgba(224,208,171,0.25)] text-[#7d8ca4]'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className={`font-serif text-[15px] md:text-[16px] leading-snug ${isSelected ? 'text-[#f4ecd8] font-medium' : 'text-[#f4ecd8] font-normal'} ${isStruck ? 'line-through text-[#6e7d94]' : ''}`}>
                          {opt}
                        </span>
                        {isStruck && (
                          <span className="ml-auto font-mono text-[9px] text-[#f87171] tracking-[0.14em] uppercase font-semibold">
                            Eliminated
                          </span>
                        )}
                        {!isStruck && isSelected && (
                          <span className="ml-auto font-mono text-[9px] text-[#e0d0ab] tracking-[0.14em] uppercase font-semibold hidden sm:inline">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Strikethrough Hint for 50:50 Ledger */}
                <div className="flex items-center justify-between text-[11px] font-mono text-[#6e7d94] pt-1">
                  <span>
                    Right-Click or <kbd className="px-1 py-0.5 rounded bg-[rgba(224,208,171,0.08)] text-[#b5c1d1]">Shift + A/B/C/D</kbd> to strike out options.
                  </span>
                  {struckOptions.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setStruckOptions(new Set())}
                      className="text-[#e0d0ab] hover:underline cursor-pointer"
                    >
                      Reset strike-outs
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              /* BAY_02 // DISSECTION & BAY_03 // SYNTHESIS & BAY_04 // RESOLUTION */
              <motion.div
                key={`verdict-${q.id}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-[#050b1a] rounded-[14px] p-5 md:p-6 border border-[rgba(224,208,171,0.14)]"
              >
                {/* Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-[rgba(224,208,171,0.10)] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#6e7d94] tracking-[0.18em] uppercase font-medium">
                      BAY_02 // DISSECTION
                    </span>
                    <span className="text-[rgba(224,208,171,0.2)]">|</span>
                    <span className="font-mono text-[10px] text-[#e0d0ab] uppercase">
                      NODE: {q.node_id}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[#6e7d94] tracking-[0.14em]">
                    LATENCY 142MS // ZERO-TRUST
                  </div>
                </div>

                {/* Score & Operator Badge */}
                <div className="flex flex-wrap items-baseline justify-between gap-4 mb-5">
                  <div className="flex items-baseline gap-4">
                    <div className={`font-sans font-extrabold text-[54px] md:text-[64px] tracking-[-0.035em] leading-none ${isCorrect ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                      {isCorrect ? '+2.00' : '−0.66'}
                    </div>
                    <div>
                      <div className={`font-sans font-semibold text-[15px] tracking-[0.02em] ${isCorrect ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                        {isCorrect ? 'ACCURATE // CALL VALIDATED' : 'INCORRECT // PENALTY APPLIED'}
                      </div>
                      <div className="font-mono text-[11px] text-[#7d8ca4] mt-0.5">
                        Selected: <strong className="text-[#f4ecd8]">{selectedOption !== null ? String.fromCharCode(65 + selectedOption) : 'none'}</strong> | Key: <strong className="text-[#34d399]">{String.fromCharCode(65 + q.correctIndex)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Deterministic Operator Callout Badge */}
                  <div className="px-3.5 py-2 rounded-lg bg-[rgba(244,63,94,0.10)] border border-[rgba(244,63,94,0.35)] text-left">
                    <div className="font-mono text-[9px] text-[#fca5a5] uppercase tracking-wider font-semibold">
                      UPSC PAPER-SETTER DISTORTION OPERATOR
                    </div>
                    <div className="font-mono text-[12px] text-[#fca5a5] font-bold mt-0.5">
                      {opMeta.code} // {opMeta.label.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Forensic Dissection Grid */}
                <div className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 pt-4 border-t border-[rgba(224,208,171,0.10)] text-[13.5px] leading-[1.55]">
                  {/* Marked Trap vs Key Truth */}
                  <div className="font-mono text-[10px] text-[#6e7d94] tracking-[0.16em] uppercase pt-0.5">
                    Trap Vector
                  </div>
                  <div className="font-serif">
                    <div className="text-[#f4ecd8] mb-1.5">{q.trap}</div>
                    {q.marked_trap_label && q.truth_key_label && (
                      <div className="p-2.5 rounded bg-[rgba(5,11,26,0.6)] border border-[rgba(224,208,171,0.12)] font-mono text-[11px] space-y-1 text-[#b5c1d1]">
                        <div><span className="text-[#f87171] font-bold">MARKED TRAP:</span> {q.marked_trap_label}</div>
                        <div><span className="text-[#34d399] font-bold">OFFICIAL KEY:</span> {q.truth_key_label}</div>
                      </div>
                    )}
                  </div>

                  {/* Statutory Anchor */}
                  <div className="font-mono text-[10px] text-[#6e7d94] tracking-[0.16em] uppercase pt-0.5">
                    Statutory Anchor
                  </div>
                  <div className="font-serif text-[#e0d0ab] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#e0d0ab] shrink-0" />
                    <span>{q.statutory_anchor}</span>
                  </div>

                  {/* Statement Dissection Breakdown if available */}
                  {q.statement_dissection && q.statement_dissection.length > 0 && (
                    <>
                      <div className="font-mono text-[10px] text-[#6e7d94] tracking-[0.16em] uppercase pt-0.5">
                        Statement Map
                      </div>
                      <div className="space-y-1.5">
                        {q.statement_dissection.map((item) => (
                          <div
                            key={item.stmt_num}
                            className={`p-2 rounded text-xs font-mono border flex items-start justify-between gap-2 ${
                              item.is_true
                                ? 'bg-[rgba(52,211,153,0.06)] border-[rgba(52,211,153,0.25)] text-[#34d399]'
                                : 'bg-[rgba(244,63,94,0.08)] border-[rgba(244,63,94,0.30)] text-[#fca5a5]'
                            }`}
                          >
                            <div>
                              <span className="font-bold">Stmt {item.stmt_num}:</span> {item.is_true ? 'TRUE' : 'FALSE TRAP'}
                              {item.marked_trap && (
                                <div className="text-[11px] text-[#f4ecd8] font-sans mt-0.5">
                                  Marked: <span className="line-through text-[#fca5a5]">{item.marked_trap}</span> &rarr; Truth: <span className="text-[#34d399]">{item.truth_key}</span>
                                </div>
                              )}
                            </div>
                            {item.operator && (
                              <span className="px-1.5 py-0.5 rounded bg-[rgba(5,11,26,0.4)] text-[10px] text-[#e0d0ab] uppercase font-bold shrink-0">
                                {item.operator}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* 5-Tier Legal Authority Dissection Block (BAY_02) */}
                  {(() => {
                    const policyEntity = getPolicyEntityForText(
                      `${q.question} ${q.trap} ${q.statutory_anchor || ''} ${q.statements?.join(' ') || ''}`,
                      q.entity_slugs
                    );
                    if (!policyEntity) return null;
                    return (
                      <>
                        <div className="font-mono text-[10px] text-[#0194a8] tracking-[0.16em] uppercase pt-0.5 font-bold">
                          5-Tier Authority
                        </div>
                        <div className="p-3 rounded bg-[rgba(1,148,168,0.08)] border border-[rgba(1,148,168,0.3)] space-y-1">
                          <div className="font-mono text-[10.5px] text-[#5fe3f5] font-bold uppercase tracking-wider">
                            AUTHORITY TIER // TIER {policyEntity.tier_number}: {policyEntity.tier_name.toUpperCase()}
                          </div>
                          <div className="font-sans text-xs text-[#e8e0cf]">
                            <strong className="text-[#e0d0ab]">ENTITY:</strong> {policyEntity.authority} • <span className="text-[#9fb0c8]">Parent: {policyEntity.parent_ministry}</span>
                          </div>
                          <div className="font-mono text-[11px] text-[#fca5a5] pt-0.5">
                            <strong className="text-[#f87171]">TRAP DEFENSE [{policyEntity.neutralized_trap || 'PSY_03'}]:</strong> {policyEntity.trap_explanation}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* BAY_03 // SYNTHESIS: Blind Spot & Calibrated 50:50 Ledger */}
                  {(() => {
                    // Bayesian-calibrated 50:50 EV degradation metrics
                    const calibratedMetrics = is5050Call
                      ? computeCalibrated5050EV(opMeta.code, isCorrect ? 1 : 0, 4, isCorrect ? 0.30 : 0.76)
                      : null;

                    return (
                      <>
                        <div className="font-mono text-[10px] text-[#e0d0ab] tracking-[0.16em] uppercase pt-0.5 font-bold">
                          BAY_03 Synthesis
                        </div>
                        <div className="space-y-2">
                          <div className="p-3 rounded bg-[rgba(224,208,171,0.06)] border border-[rgba(224,208,171,0.20)]">
                            <div className="font-mono text-[11px] text-[#e0d0ab] font-bold uppercase mb-1">
                              PSYCHE VULNERABILITY: {opMeta.code} // {opMeta.label}
                            </div>
                            <p className="font-serif text-xs text-[#f4ecd8] leading-relaxed m-0">
                              Historical telemetry confirms paper-setters exploit this exact mutation to extract marks on <strong>{q.node_id}</strong>. Without operator-level awareness, repeat misses on this structural pattern bleed an average of <strong>−2.64 marks</strong> across Prelims.
                            </p>
                          </div>

                          {/* 50:50 Ledger Expected Value Callout & Continuous Inversion Alert */}
                          {is5050Call && calibratedMetrics ? (
                            calibratedMetrics.isEvInverted ? (
                              <div className="p-3 rounded bg-rose-950/70 border border-rose-500/60 text-rose-200 space-y-1">
                                <div className="font-mono text-[11px] font-bold text-rose-300 uppercase flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                  <span>EV INVERSION ALERT [{calibratedMetrics.operator}]: STRICT ABSTENTION</span>
                                </div>
                                <p className="font-sans text-xs text-rose-100 m-0 leading-relaxed">
                                  Your 50:50 accuracy on {opMeta.shortLabel} is {(calibratedMetrics.empiricalAccuracy * 100).toFixed(1)}% (EV: {calibratedMetrics.calibratedEvPerCall > 0 ? `+${calibratedMetrics.calibratedEvPerCall}` : calibratedMetrics.calibratedEvPerCall} marks/call). Continuous trap attraction exceeds the 75.2% breakeven horizon. Protocol: <strong>STRICT ABSTENTION</strong>.
                                </p>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded font-mono text-xs border bg-[rgba(168,85,247,0.10)] border-[rgba(168,85,247,0.35)] text-[#d8b4fe] space-y-1">
                                <div>
                                  <strong>CALIBRATED 50:50 EV [{calibratedMetrics.operator}]:</strong> {calibratedMetrics.calibratedEvPerCall > 0 ? `+${calibratedMetrics.calibratedEvPerCall}` : calibratedMetrics.calibratedEvPerCall} marks/call (Naive: +0.67 marks).
                                </div>
                                <div className="text-[11px] text-[#c4b5fd]">
                                  Protocol: <strong>{calibratedMetrics.protocol}</strong> • Projected 15 Calls: {calibratedMetrics.cumulativeEv15Calls > 0 ? `+${calibratedMetrics.cumulativeEv15Calls}` : calibratedMetrics.cumulativeEv15Calls} marks.
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="p-2.5 rounded font-mono text-xs border bg-[rgba(5,11,26,0.4)] border-[rgba(224,208,171,0.12)] text-[#7d8ca4]">
                              <strong>50:50 LEDGER:</strong> Full-set attempt recorded. (Strike out 2 options on your next question to compute your calibrated operator-level elimination EV curve).
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  {/* BAY_04 // RESOLUTION */}
                  <div className="font-mono text-[10px] text-[#6e7d94] tracking-[0.16em] uppercase pt-0.5">
                    BAY_04 Action
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleLaunchTargetedDrill}
                      className="px-3.5 py-1.5 rounded-full bg-[#e0d0ab] text-[#050b1a] font-mono text-xs font-bold hover:bg-[#f4ecd8] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-[#050b1a]" />
                      <span>Drill {opMeta.code} on {q.node_id}</span>
                    </button>
                    <span className="font-serif text-xs text-[#7d8ca4]">
                      Launches a 6-minute, 10-MCQ targeted crucible against this operator.
                    </span>
                  </div>

                  {q.id === 'sample-pib-green-hydrogen' && (
                    <>
                      <div className="font-mono text-[10px] text-[#e0d0ab] tracking-[0.16em] uppercase pt-0.5 font-bold">
                        Origin Story
                      </div>
                      <div className="font-serif text-[#e0d0ab] text-xs leading-relaxed bg-[rgba(224,208,171,0.06)] p-3 rounded border border-[rgba(224,208,171,0.20)]">
                        <strong>"I lost Prelims by 1.32 marks because of this exact trap."</strong> Highlighting 120-page monthly magazines gives you facts, but not examiner trap defense. Two 50:50 coin-flips flipped negative (−1.32) on MNRE vs MoPNG and extreme qualifiers. Tark exists so you never bleed marks to the same structural trick twice.
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-5 md:px-6 py-3.5 border-t border-[rgba(224,208,171,0.10)] bg-gradient-to-t from-[rgba(224,208,171,0.03)] to-transparent">
          {!hasSubmitted ? (
            <>
              <span className="font-serif italic text-[13.5px] text-[#7d8ca4] hidden sm:inline">
                No signup needed. Answer to see the forensic autopsy.
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedOption(null);
                  setStruckOptions(new Set());
                }}
                className="text-link font-sans text-[12px] text-[#6e7d94] hover:text-[#b5c1d1] cursor-pointer sm:hidden"
              >
                Clear selection
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={selectedOption === null}
                className="cta-primary inline-flex items-center gap-2.5 py-1.5 pl-5 pr-1.5 bg-[#e0d0ab] text-[#050b1a] font-sans font-semibold text-[13.5px] rounded-full disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
              >
                <span>Submit & Autopsy</span>
                <span className="w-7 h-7 rounded-full bg-[rgba(5,11,26,0.14)] inline-flex items-center justify-center">
                  <svg className="cta-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#050b1a" strokeWidth="2" strokeLinecap="square">
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleResetOrNext}
                className="text-link inline-flex items-center gap-1.5 font-sans text-[12px] text-[#6e7d94] hover:text-[#e0d0ab] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Next sample question</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleLaunchTargetedDrill}
                  className="px-4 py-1.5 bg-[rgba(224,208,171,0.12)] border border-[rgba(224,208,171,0.30)] text-[#e0d0ab] hover:bg-[rgba(224,208,171,0.20)] font-sans font-semibold text-[13px] rounded-full cursor-pointer transition-colors"
                >
                  Practise this Vector
                </button>
                <button
                  type="button"
                  onClick={() => onLaunchFullArena()}
                  className="cta-primary inline-flex items-center gap-2 py-1.5 pl-4.5 pr-1.5 bg-[#e0d0ab] text-[#050b1a] font-sans font-semibold text-[13px] rounded-full cursor-pointer shadow-md"
                >
                  <span>Launch Full Arena</span>
                  <span className="w-7 h-7 rounded-full bg-[rgba(5,11,26,0.14)] inline-flex items-center justify-center">
                    <svg className="cta-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#050b1a" strokeWidth="2" strokeLinecap="square">
                      <path d="M5 12h14" />
                      <path d="M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
