import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

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
}

const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    id: 'sample-pib-green-hydrogen',
    subject: 'Current Affairs & Policy',
    yearTag: "Today's PIB Examiner Trap",
    tabLabel: "PIB: Green Hydrogen",
    isPibTrap: true,
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
    weakness: 'PIB Policy & Cabinet Decisions: Inter-ministerial jurisdiction confusion detected. Negative marking penalty: −0.66 marks.'
  },
  {
    id: 'sample-pib-critical-minerals',
    subject: 'Economy & Resource Policy',
    yearTag: 'PIB Gazette Intelligence',
    tabLabel: 'PIB: Critical Minerals',
    isPibTrap: true,
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
    weakness: 'Mining & Critical Minerals Regulatory Framework weakness score, 2.2 → 3.5. Overlooked recent statutory reforms (−0.66).'
  },
  {
    id: 'sample-prelims-2001-q39',
    subject: 'Polity',
    yearTag: 'UPSC Prelims 2001, GS Paper 1',
    tabLabel: 'Polity: Schedules',
    isPibTrap: false,
    question: 'If a new State of the Indian Union is to be created, which one of the following Schedules of the Constitution must be amended?',
    options: [
      'First',
      'Second',
      'Third',
      'Fifth'
    ],
    correctIndex: 0,
    trap: 'First Schedule lists the States and Union Territories (Articles 1 and 4). Second Schedule deals with salaries, allowances, and emoluments of constitutional authorities (President, Governors, Judges, CAG). You picked the remuneration trap.',
    weakness: 'Schedules of the Constitution weakness score, 2.4 → 3.6. Foundational Article 2 & 3 state reorganisation mechanics need reinforcement.'
  },
  {
    id: 'sample-delimitation',
    subject: 'Polity',
    yearTag: 'Prelims 2023, Polity',
    tabLabel: 'Prelims 2023: Finality',
    isPibTrap: false,
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
    weakness: 'Constitutional Bodies weakness score, 3.2 → 4.1. Now the third-largest gap in your ledger.'
  },
  {
    id: 'sample-anti-defection',
    subject: 'Constitutional Law',
    yearTag: 'UPSC CSE Standard',
    tabLabel: 'Law: Anti-Defection',
    isPibTrap: false,
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
    weakness: 'Parliamentary Procedures weakness score, 2.8 → 3.6.'
  }
];

const TRAP_DEFAULTS = [1, 2, 1, 2, 0];

interface DiagnosticPreviewProps {
  onLaunchFullArena: () => void;
}

export default function DiagnosticPreview({ onLaunchFullArena }: DiagnosticPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(TRAP_DEFAULTS[0]); // Default to Option B to illustrate the Nodal Ministry trap
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(107); // 01:47

  const q = SAMPLE_QUESTIONS[currentIndex];

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

  const handleSelect = (idx: number) => {
    if (hasSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setHasSubmitted(true);
  };

  const handleSwitchQuestion = (idx: number) => {
    setCurrentIndex(idx);
    setHasSubmitted(false);
    setSelectedOption(TRAP_DEFAULTS[idx] ?? null);
    setSecondsRemaining(107);
  };

  const handleResetOrNext = () => {
    const nextIdx = (currentIndex + 1) % SAMPLE_QUESTIONS.length;
    handleSwitchQuestion(nextIdx);
  };

  // Keyboard shortcut listener for A, B, C, D and 1, 2, 3, 4
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

      if (key === 'A' || code === 'KeyA' || key === '1' || code === 'Digit1') {
        e.preventDefault();
        handleSelect(0);
      } else if (key === 'B' || code === 'KeyB' || key === '2' || code === 'Digit2') {
        e.preventDefault();
        handleSelect(1);
      } else if (key === 'C' || code === 'KeyC' || key === '3' || code === 'Digit3') {
        e.preventDefault();
        handleSelect(2);
      } else if (key === 'D' || code === 'KeyD' || key === '4' || code === 'Digit4') {
        e.preventDefault();
        handleSelect(3);
      } else if (key === 'ENTER') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSubmitted, selectedOption, currentIndex]);

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
                {/* Marking tag with PIB Trap badge */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="inline-block px-2.5 py-1 bg-[rgba(52,211,153,0.10)] border border-[rgba(52,211,153,0.32)] rounded-[4px] font-mono text-[10px] text-[#34d399] font-bold tracking-[0.10em]">
                    +2.00 / −0.66 marking on
                  </div>
                  {q.isPibTrap && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(244,63,94,0.12)] border border-[rgba(244,63,94,0.30)] rounded-[4px] font-mono text-[10px] text-[#fca5a5] font-semibold tracking-[0.08em] uppercase">
                      <AlertTriangle className="w-3 h-3 text-[#f87171]" />
                      <span>Examiner Trap</span>
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

                {/* 4 Interactive Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const letter = String.fromCharCode(97 + idx); // lowercase a, b, c, d

                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => handleSelect(idx)}
                        className={`option w-full min-h-[52px] px-4 py-3 rounded-[12px] flex items-center gap-3 text-left cursor-pointer transition-all outline-none ${
                          isSelected
                            ? 'border border-[#e0d0ab] bg-[rgba(224,208,171,0.06)] shadow-[0_0_0_3px_rgba(224,208,171,0.10)]'
                            : 'border border-[rgba(224,208,171,0.14)] hover:border-[rgba(224,208,171,0.38)] bg-transparent'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-mono text-[11px] font-bold shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#e0d0ab] text-[#050b1a]'
                              : 'border border-[rgba(224,208,171,0.25)] text-[#7d8ca4]'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className={`font-serif text-[15px] md:text-[16px] leading-snug ${isSelected ? 'text-[#f4ecd8] font-medium' : 'text-[#f4ecd8] font-normal'}`}>
                          {opt}
                        </span>
                        {isSelected && (
                          <span className="ml-auto font-mono text-[9px] text-[#e0d0ab] tracking-[0.14em] uppercase font-semibold hidden sm:inline">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              /* Verdict Autopsy Card */
              <motion.div
                key={`verdict-${q.id}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-[#050b1a] rounded-[14px] p-5 md:p-6 border border-[rgba(224,208,171,0.14)]"
              >
                <div className="flex items-center justify-between pb-3.5 border-b border-[rgba(224,208,171,0.10)] mb-4">
                  <div className="font-mono text-[11px] text-[#6e7d94] tracking-[0.18em] uppercase font-medium">
                    Verdict received
                  </div>
                  <div className="font-mono text-[11px] text-[#6e7d94] tracking-[0.14em]">
                    latency 178ms
                  </div>
                </div>

                <div className="flex items-baseline gap-4 mb-4">
                  <div className={`font-sans font-extrabold text-[54px] md:text-[64px] tracking-[-0.035em] leading-none ${isCorrect ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                    {isCorrect ? '+2.00' : '−0.66'}
                  </div>
                  <div className={`font-sans font-semibold text-[15px] tracking-[0.02em] ${isCorrect ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                    {isCorrect ? 'ACCURATE' : 'INCORRECT'}
                  </div>
                </div>

                <div className="font-serif text-[16px] leading-[1.6] text-[#f4ecd8] mb-4 font-normal">
                  You selected{' '}
                  <strong className="text-[#e0d0ab]">
                    {selectedOption !== null ? `${String.fromCharCode(65 + selectedOption)} (${q.options[selectedOption]})` : 'none'}
                  </strong>
                  . The correct answer was{' '}
                  <strong className="text-[#34d399]">
                    {String.fromCharCode(65 + q.correctIndex)} ({q.options[q.correctIndex]})
                  </strong>
                  .
                </div>

                <div className="grid grid-cols-[90px_1fr] gap-x-4 gap-y-3 pt-4 border-t border-[rgba(224,208,171,0.10)] text-[13.5px] leading-[1.55]">
                  <div className="font-mono text-[10px] text-[#6e7d94] tracking-[0.16em] uppercase pt-0.5">
                    Trap
                  </div>
                  <div className="font-serif text-[#f4ecd8]">
                    {q.trap}
                  </div>

                  <div className="font-mono text-[10px] text-[#6e7d94] tracking-[0.16em] uppercase pt-0.5">
                    Risk Ledger
                  </div>
                  <div className={`font-serif ${isCorrect ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                    {isCorrect
                      ? 'Confident call validated (+2.00). Positive yield recorded in your risk profile.'
                      : '50:50 instinct failed (−0.66). Risk Ledger records net mark bleed when guessing between split options.'}
                  </div>

                  <div className="font-mono text-[10px] text-[#6e7d94] tracking-[0.16em] uppercase pt-0.5">
                    Weakness
                  </div>
                  <div className="font-serif text-[#f4ecd8]">
                    {q.weakness}
                  </div>

                  <div className="font-mono text-[10px] text-[#6e7d94] tracking-[0.16em] uppercase pt-0.5">
                    Action
                  </div>
                  <div className="font-serif text-[#e0d0ab]">
                    Targeted practice queued in Arena.
                  </div>
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
                No signup needed. Answer to see the verdict.
              </span>
              <button
                type="button"
                onClick={() => setSelectedOption(null)}
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
                <span>Submit</span>
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

              <button
                type="button"
                onClick={onLaunchFullArena}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
