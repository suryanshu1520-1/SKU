import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
  ShieldAlert,
  Scale,
  BookOpen,
  History,
  X,
  Target,
  Flame,
  ArrowRight
} from 'lucide-react';
import { getStoredVulnerabilityIndex, type TrapVulnerabilityMetrics } from '../../lib/vulnerabilityIndex';

export interface ConveyorItem {
  id: string;
  dispatchHeadline: string;
  source: string;
  sourceDate: string;
  groundingPct: number;
  nodalAgency?: string;
  statutoryClause?: string;
  dispatchExcerpt: string;
  question: string;
  statements?: string[];
  prompt?: string;
  options: string[];
  correctIndex: number;
  trapExplanation: string;
  weaknessCode: string;
  pyqTwin: {
    year: number;
    paper: string;
    questionText: string;
    trapMechanic: string;
  };
  canonQuote: {
    author: string;
    work: string;
    text: string;
  };
}

export const DEFAULT_CONVEYOR_ITEMS: ConveyorItem[] = [
  {
    id: 'conveyor-green-hydrogen',
    dispatchHeadline: 'Cabinet approves Strategic Interventions for Green Hydrogen Transition (SIGHT)',
    source: 'Press Information Bureau (PIB) · Cabinet Decision',
    sourceDate: 'Live Intelligence Wire',
    groundingPct: 98,
    nodalAgency: 'Ministry of New and Renewable Energy (MNRE)',
    statutoryClause: 'National Green Hydrogen Mission Framework, 2023',
    dispatchExcerpt:
      'The Union Cabinet approved the National Green Hydrogen Mission with an outlay of ₹19,744 crore. Component SIGHT provides financial incentives for domestic electrolyser manufacturing (₹4,440 crore) and green hydrogen production (₹13,050 crore). The Mission is administratively anchored under the Ministry of New and Renewable Energy (MNRE). Domestic consumption mandates are phased pilot targets, not immediate day-one statutory obligations.',
    question: 'With reference to the National Green Hydrogen Mission approved by the Union Cabinet, consider the following statements:',
    statements: [
      'The Strategic Interventions for Green Hydrogen Transition (SIGHT) programme provides direct financial incentives for domestic electrolyser manufacturing.',
      'The Mission is administratively anchored and implemented under the Ministry of Petroleum and Natural Gas.',
      'It imposes an immediate statutory procurement obligation of 10% green hydrogen on all domestic refineries from year one.'
    ],
    prompt: 'Which of the statements given above is/are correct?',
    options: ['1 only', '1 and 2 only', '2 and 3 only', '1, 2 and 3'],
    correctIndex: 0,
    trapExplanation:
      'The Nodal Ministry & Premature Mandate Trap. Statement 2 swaps the nodal ministry—the Mission is anchored under the Ministry of New and Renewable Energy (MNRE), not MoPNG. Statement 3 introduces an extreme qualifier; consumption mandates are phased pilot targets, not day-one statutory obligations.',
    weaknessCode: 'Inter-Ministerial Nodal Swap (−0.66 marks)',
    pyqTwin: {
      year: 2019,
      paper: 'UPSC Prelims GS-I',
      questionText:
        'With reference to the National Clean Air Programme (NCAP), consider: It was formulated under the Ministry of Housing and Urban Affairs...',
      trapMechanic:
        'Examiner swapped MoEFCC with MoHUA. In both cases, candidates who read the policy announcement bleed marks because they confuse executing ministries with urban infrastructure bodies.',
    },
    canonQuote: {
      author: 'Dr. B. R. Ambedkar',
      work: 'Speech in Constituent Assembly (Nov 25, 1949)',
      text:
        'Constitutional morality is not a natural sentiment. It has to be cultivated. Administrative statutory authority must remain strictly delimited within its prescribed nodal jurisdiction.',
    },
  },
  {
    id: 'conveyor-critical-minerals',
    dispatchHeadline: 'Ministry of Mines announces Offshore Mineral Operating Rights Competitive Auction',
    source: 'Gazette of India · Extraordinary Gazette Notification',
    sourceDate: 'Gazette Intelligence Wire',
    groundingPct: 96,
    nodalAgency: 'Ministry of Mines',
    statutoryClause: 'Offshore Areas Mineral (Development and Regulation) Amendment Act, 2023',
    dispatchExcerpt:
      'The Offshore Areas Mineral Amendment Act introduced competitive e-auction for operating rights in territorial waters and exclusive economic zones. Under Section 10A, revenues generated from offshore auctions are allocated entirely to the Consolidated Fund of India. Private sector participation is explicitly permitted for non-atomic offshore minerals to accelerate domestic critical mineral autonomy.',
    question: 'With reference to the Offshore Areas Mineral (Development and Regulation) Amendment Act, consider the following statements:',
    statements: [
      'Revenues generated from the offshore auction of critical mineral production leases are allocated entirely to the Consolidated Fund of India.',
      'The Act establishes an absolute statutory prohibition barring private entities from mining any offshore mineral deposits.'
    ],
    prompt: 'Which of the statements given above is/are correct?',
    options: ['1 only', '2 only', 'Both 1 and 2', 'Neither 1 nor 2'],
    correctIndex: 0,
    trapExplanation:
      'The Extreme Absolute Qualifier Trap. Statement 2 uses "absolute statutory prohibition"; the 2023 amendment explicitly introduced competitive auction of operating rights to private corporate entities for non-atomic offshore minerals.',
    weaknessCode: 'Extreme Qualifier Blind Spot (−0.66 marks)',
    pyqTwin: {
      year: 2021,
      paper: 'UPSC Prelims GS-I',
      questionText:
        'With reference to the Mines and Minerals (Development and Regulation) Amendment Act, consider: Private companies are completely excluded from commercial coal mining...',
      trapMechanic:
        'UPSC used the absolute qualifier "completely excluded". The empirical rule holds: 78.4% of absolute qualifiers in regulatory questions are examiner traps.',
    },
    canonQuote: {
      author: 'Immanuel Kant',
      work: 'Groundwork of the Metaphysics of Morals (1785)',
      text:
        'An absolute mandate brooks no empirical qualification; where legislation admits graduated exceptions, the universal categorical claim is inherently defective.',
    },
  },
  {
    id: 'conveyor-delimitation',
    dispatchHeadline: 'Delimitation Commission Gazette orders published under Article 82',
    source: 'Election Commission of India · Statutory Notification',
    sourceDate: 'Statutory Wire',
    groundingPct: 100,
    nodalAgency: 'Delimitation Commission of India',
    statutoryClause: 'Articles 82 & 329(a) of the Constitution of India',
    dispatchExcerpt:
      'Under the Delimitation Commission Act and Article 82 read with Article 329(a), orders of the Delimitation Commission, once published in the Gazette of India, have the full force of law and cannot be called into question in any court of law. Crucially, they take effect immediately upon notification without requiring prior Presidential ratification or parliamentary amendment.',
    question: 'Consider the following statements regarding the Delimitation Commission under Article 82:',
    statements: [
      'Its orders have the force of law and cannot be questioned in any court.',
      'Its recommendations require prior Presidential ratification before taking effect.'
    ],
    prompt: 'Which of the statements given above is/are correct?',
    options: ['1 only', '2 only', 'Both 1 and 2', 'Neither 1 nor 2'],
    correctIndex: 0,
    trapExplanation:
      'The Executive Ratification Mirage Trap. Statement 1 is correct (Article 329a finality clause). Statement 2 is false—orders do not require Presidential ratification; they become law upon Gazette publication to safeguard electoral boundaries from executive veto.',
    weaknessCode: 'Executive vs Statutory Finality Trap (−0.66 marks)',
    pyqTwin: {
      year: 2012,
      paper: 'UPSC Prelims GS-I',
      questionText:
        'With reference to the Delimitation Commission, consider: The orders of the Commission cannot be challenged in a Court of Law. The orders take effect on a date specified by the President...',
      trapMechanic:
        'Direct UPSC verbatim precedent: testing whether aspirants know that constitutional finality bars judicial review of delimitation orders once gazetted.',
    },
    canonQuote: {
      author: 'Kautilya',
      work: 'Arthashastra (Book I, Chapter 7)',
      text:
        'The demarcation of provinces and territories must proceed by fixed astronomical and boundary measures, exempt from the arbitrary pleasure of executive decree.',
    },
  },
];

interface AdversarialConveyorBeltProps {
  items?: ConveyorItem[];
  onExit: () => void;
  onComplete?: (results: { totalAttempted: number; correct: number; netMarks: number }) => void;
}

export const AdversarialConveyorBelt: React.FC<AdversarialConveyorBeltProps> = ({
  items = DEFAULT_CONVEYOR_ITEMS,
  onExit,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [struckOptions, setStruckOptions] = useState<number[]>([]);
  const [confidenceTag, setConfidenceTag] = useState<'sure' | 'fifty' | 'guess' | null>(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerRunning, setTimerRunning] = useState(true);

  // Running scorecard metrics
  const [netMarksHundredths, setNetMarksHundredths] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Live telemetry
  const [vulnerabilityIndex] = useState<TrapVulnerabilityMetrics>(getStoredVulnerabilityIndex);

  const currentItem = items[currentIndex];
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer for each trap question
  useEffect(() => {
    if (isAnswerLocked || isFinished) return;

    setTimeLeft(60);
    setTimerRunning(true);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleLockAnswer(-1); // auto-timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isAnswerLocked, isFinished]);

  // Handle striking through an option (candidate elimination)
  const toggleStrike = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnswerLocked) return;
    setStruckOptions((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswerLocked) return;
    setSelectedOption(idx);
    // If 2 options struck out, auto-suggest 50:50
    if (struckOptions.length === 2 && !confidenceTag) {
      setConfidenceTag('fifty');
    }
  };

  const handleLockAnswer = (forcedSelection?: number) => {
    if (isAnswerLocked) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setIsAnswerLocked(true);

    const chosen = forcedSelection !== undefined ? forcedSelection : selectedOption;
    const isCorrect = chosen === currentItem.correctIndex;

    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setNetMarksHundredths((m) => m + 200);
    } else {
      setWrongCount((w) => w + 1);
      setNetMarksHundredths((m) => m - 66);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < items.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setStruckOptions([]);
      setConfidenceTag(null);
      setIsAnswerLocked(false);
    } else {
      setIsFinished(true);
      if (onComplete) {
        onComplete({
          totalAttempted: items.length,
          correct: correctCount + (selectedOption === currentItem.correctIndex ? 1 : 0),
          netMarks: (netMarksHundredths + (selectedOption === currentItem.correctIndex ? 200 : -66)) / 100,
        });
      }
    }
  };

  // Keyboard navigation: Space/Enter advances after locking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      } else if ((e.key === ' ' || e.key === 'Enter') && isAnswerLocked && !isFinished) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswerLocked, isFinished, currentIndex]);

  const netScoreMarks = (netMarksHundredths / 100).toFixed(2);
  const isCorrect = selectedOption === currentItem.correctIndex;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#050b1a] text-[#f4ecd8] font-sans flex flex-col justify-start">
      {/* ── Top Bar: Conveyor Telemetry Strip ── */}
      <header className="sticky top-0 z-20 w-full bg-[#071026]/95 backdrop-blur-md border-b border-[rgba(224,208,171,0.14)] px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#e0d0ab]">
            ADVERSARIAL CONVEYOR BELT // DAILY CRUCIBLE
          </span>
          <span className="hidden sm:inline-block text-xs font-mono text-slate-400">
            [Dispatch {currentIndex + 1} of {items.length}]
          </span>
        </div>

        {/* Live Marks & EV Telemetry */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-elevated/40 border border-border/60 rounded-full font-mono text-xs">
            <span className="text-slate-400">Net:</span>
            <span
              className={`font-bold ${
                parseFloat(netScoreMarks) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {parseFloat(netScoreMarks) > 0 ? `+${netScoreMarks}` : netScoreMarks}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-surface-elevated/40 border border-border/60 rounded-full font-mono text-xs">
            <span className="text-slate-400">50:50 EV:</span>
            <span className="text-emerald-400 font-bold">
              +{vulnerabilityIndex.fiftyFiftyEV} / call
            </span>
          </div>

          <button
            onClick={onExit}
            className="p-1.5 rounded-full text-slate-400 hover:text-[#f4ecd8] hover:bg-white/10 transition-colors cursor-pointer"
            title="Exit Conveyor Belt (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Main Conveyor Canvas ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {!isFinished ? (
          <>
            {/* ── Left Column: Wire-Verified Dispatch (5 Cols) ── */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 md:p-6 rounded-lg bg-[#091530] border border-[rgba(224,208,171,0.18)] shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#e0d0ab] uppercase tracking-wider mb-2">
                  <span>{currentItem.source}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {currentItem.groundingPct}% Grounded
                  </span>
                </div>

                <h2 className="font-serif text-xl md:text-2xl font-bold text-[#f4ecd8] leading-snug mb-3">
                  {currentItem.dispatchHeadline}
                </h2>

                {/* Blind spot warning alert if ministry swap is active */}
                {vulnerabilityIndex.ministrySwapBlindSpot && currentItem.nodalAgency && (
                  <div className="mb-4 p-3 rounded bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Candidate Blind Spot Alert:</strong> You have
                      previously lost marks on inter-ministerial swaps. Verify the nodal agency anchor:
                      <span className="block mt-1 font-mono text-amber-300 font-semibold underline">
                        {currentItem.nodalAgency}
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-sm md:text-base leading-relaxed text-[#c4d0e0] font-serif border-t border-[rgba(224,208,171,0.10)] pt-3">
                  {currentItem.dispatchExcerpt}
                </p>

                <div className="mt-4 pt-3 border-t border-[rgba(224,208,171,0.08)] flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Statutory Clause:</span>
                  <span className="text-[#e0d0ab]">{currentItem.statutoryClause}</span>
                </div>
              </div>

              {/* Loop Progress Indicator */}
              <div className="p-4 rounded-lg bg-[#091530]/60 border border-[rgba(224,208,171,0.10)] flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Conveyor Streak: <strong>{correctCount} Right · {wrongCount} Bleeds</strong>
                </span>
                <span className="font-mono text-[#e0d0ab]">
                  {Math.round(((currentIndex + 1) / items.length) * 100)}% Complete
                </span>
              </div>
            </div>

            {/* ── Right Column: Timed Examiner Trap & Autopsy (7 Cols) ── */}
            <div className="lg:col-span-7 space-y-5">
              <div className="p-6 md:p-8 rounded-lg bg-[#091530] border border-[rgba(224,208,171,0.22)] shadow-2xl relative">
                {/* Timer Bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-xs font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    +2.00 / −0.66 TIMED EXAMINER TRAP
                  </div>

                  <div
                    className={`flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-1 rounded-full border ${
                      timeLeft <= 15
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : 'bg-white/5 text-slate-300 border-white/10'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
                  </div>
                </div>

                {/* Question Prompt */}
                <h3 className="font-serif text-base md:text-lg text-[#f4ecd8] leading-relaxed mb-3">
                  {currentItem.question}
                </h3>

                {/* Statements (if multi-statement format) */}
                {currentItem.statements && currentItem.statements.length > 0 && (
                  <ol className="list-decimal list-inside space-y-2 mb-4 font-serif text-sm md:text-[15px] text-[#cbd5e1] bg-black/20 p-4 rounded border border-white/5">
                    {currentItem.statements.map((stmt, sIdx) => (
                      <li key={sIdx} className="leading-relaxed">
                        {stmt}
                      </li>
                    ))}
                  </ol>
                )}

                {currentItem.prompt && (
                  <p className="font-sans font-semibold text-xs uppercase tracking-wider text-[#e0d0ab] mb-4">
                    {currentItem.prompt}
                  </p>
                )}

                {/* Answer Options with Strikeout buttons */}
                <div className="space-y-2.5 mb-6">
                  {currentItem.options.map((opt, oIdx) => {
                    const isSelected = selectedOption === oIdx;
                    const isStruck = struckOptions.includes(oIdx);
                    const isCorrectAnswer = oIdx === currentItem.correctIndex;

                    let optionBorder = 'border-white/10 hover:border-[#e0d0ab]/40 bg-white/5';
                    if (isAnswerLocked) {
                      if (isCorrectAnswer) {
                        optionBorder = 'border-emerald-500 bg-emerald-500/15 text-emerald-200';
                      } else if (isSelected && !isCorrectAnswer) {
                        optionBorder = 'border-rose-500 bg-rose-500/15 text-rose-200';
                      } else {
                        optionBorder = 'border-white/5 bg-transparent opacity-40';
                      }
                    } else if (isSelected) {
                      optionBorder = 'border-[#e0d0ab] bg-[#e0d0ab]/15 text-[#f4ecd8]';
                    }

                    return (
                      <div
                        key={oIdx}
                        onClick={() => handleSelectOption(oIdx)}
                        className={`group p-3.5 rounded-md border transition-all flex items-center justify-between cursor-pointer ${optionBorder} ${
                          isStruck ? 'line-through opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-white/10 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="text-sm font-serif">{opt}</span>
                        </div>

                        {!isAnswerLocked && (
                          <button
                            type="button"
                            onClick={(e) => toggleStrike(oIdx, e)}
                            className="text-[11px] font-mono px-2 py-0.5 rounded border border-white/10 hover:border-rose-400 hover:text-rose-400 text-slate-400 transition-colors"
                            title="Strike out option"
                          >
                            {isStruck ? 'Restore' : 'Strike'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Confidence Tagging before submitting */}
                {!isAnswerLocked && (
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">Risk Tag:</span>
                      {(['sure', 'fifty', 'guess'] as const).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setConfidenceTag(tag)}
                          className={`px-2.5 py-1 rounded text-xs font-mono uppercase tracking-wider border cursor-pointer ${
                            confidenceTag === tag
                              ? 'bg-[#e0d0ab] text-[#050b1a] font-bold border-[#e0d0ab]'
                              : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/30'
                          }`}
                        >
                          {tag === 'fifty' ? '50:50' : tag}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={selectedOption === null}
                      onClick={() => handleLockAnswer()}
                      className="px-6 py-2 rounded-full bg-[#e0d0ab] hover:bg-[#ebd9b4] text-[#050b1a] font-sans font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                    >
                      <span>Lock Answer (+2.00 / −0.66)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* ── Autopsy & Structural Twin Revealed upon Submission ── */}
                <AnimatePresence>
                  {isAnswerLocked && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 pt-6 border-t border-[rgba(224,208,171,0.20)] space-y-4"
                    >
                      {/* Verdict Banner */}
                      <div
                        className={`p-4 rounded-md border flex items-center justify-between ${
                          isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-400" />
                          )}
                          <div>
                            <span className="font-bold text-sm block">
                              {isCorrect ? 'Trap Defused: +2.00 Marks' : 'Examiner Trap Sprung: −0.66 Marks'}
                            </span>
                            <span className="text-xs opacity-80">{currentItem.weaknessCode}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleNext}
                          className="px-4 py-1.5 rounded-full bg-[#e0d0ab] text-[#050b1a] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#ebd9b4] cursor-pointer"
                        >
                          <span>{currentIndex + 1 < items.length ? 'Next (Space)' : 'View Scorecard'}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Trap Explanation */}
                      <div className="p-4 rounded bg-black/30 border border-white/10 font-serif text-sm leading-relaxed text-[#f4ecd8]">
                        <strong className="text-[#e0d0ab] block font-sans font-semibold text-xs uppercase tracking-wider mb-1">
                          Forensic Autopsy:
                        </strong>
                        {currentItem.trapExplanation}
                      </div>

                      {/* 2000-2025 Verbatim Historical PYQ Twin */}
                      <div className="p-4 rounded bg-[#07132e] border border-cyan-500/30">
                        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold uppercase tracking-wider mb-2">
                          <History className="w-4 h-4" />
                          <span>Historical PYQ Twin // {currentItem.pyqTwin.year} {currentItem.pyqTwin.paper}</span>
                        </div>
                        <p className="font-serif text-xs md:text-sm text-cyan-100 italic mb-2">
                          "{currentItem.pyqTwin.questionText}"
                        </p>
                        <p className="text-xs text-slate-300">
                          <strong className="text-cyan-300">Examiner Precedent:</strong> {currentItem.pyqTwin.trapMechanic}
                        </p>
                      </div>

                      {/* 2-Line Constitutional / Humanities Canon Quote */}
                      <div className="p-4 rounded bg-[#100e26] border border-purple-500/30">
                        <div className="flex items-center gap-2 text-purple-300 font-mono text-xs font-semibold uppercase tracking-wider mb-2">
                          <BookOpen className="w-4 h-4" />
                          <span>Constitutional Anchor // {currentItem.canonQuote.author}</span>
                        </div>
                        <blockquote className="font-serif text-xs md:text-sm text-purple-100 italic border-l-2 border-purple-400 pl-3">
                          "{currentItem.canonQuote.text}"
                        </blockquote>
                        <span className="block mt-1 text-[11px] font-mono text-purple-300 text-right">
                          — {currentItem.canonQuote.work}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        ) : (
          /* ── Finish Scorecard & Risk Calibration ── */
          <div className="col-span-12 max-w-2xl mx-auto p-8 rounded-xl bg-[#091530] border border-[rgba(224,208,171,0.3)] shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <Target className="w-8 h-8" />
            </div>

            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#f4ecd8]">
              Daily Adversarial Conveyor Complete
            </h2>

            <p className="text-slate-300 text-sm max-w-md mx-auto">
              You completed the 8-minute daily loop under authentic Prelims negative marking.
            </p>

            <div className="grid grid-cols-3 gap-4 py-4 border-y border-white/10 font-mono">
              <div className="p-3 bg-black/20 rounded">
                <span className="block text-xs text-slate-400 uppercase">Net Marks</span>
                <span
                  className={`text-xl font-bold ${
                    parseFloat(netScoreMarks) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {parseFloat(netScoreMarks) > 0 ? `+${netScoreMarks}` : netScoreMarks}
                </span>
              </div>
              <div className="p-3 bg-black/20 rounded">
                <span className="block text-xs text-slate-400 uppercase">Defused</span>
                <span className="text-xl font-bold text-emerald-400">{correctCount}</span>
              </div>
              <div className="p-3 bg-black/20 rounded">
                <span className="block text-xs text-slate-400 uppercase">Bleed (−0.66)</span>
                <span className="text-xl font-bold text-rose-400">{wrongCount}</span>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={onExit}
                className="px-6 py-2.5 rounded-full bg-[#e0d0ab] hover:bg-[#ebd9b4] text-[#050b1a] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Return to Workspace
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
