import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Brain, Sparkles, HelpCircle } from 'lucide-react';

interface SampleQuestion {
  id: string;
  subject: string;
  year: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    id: 'sample-1',
    subject: 'Indian Polity & Constitutional Law',
    year: 'UPSC CSE Standard',
    question: 'With reference to the Anti-Defection Law (Tenth Schedule of the Constitution), consider the following statements:\n1. The law does not specify a time-frame within which the Presiding Officer must decide a disqualification plea.\n2. A nominated member becomes subject to disqualification if they join any political party after 6 months of taking seat.',
    options: [
      '1 only',
      '2 only',
      'Both 1 and 2',
      'Neither 1 nor 2'
    ],
    correctIndex: 2,
    explanation: 'Both statements are correct. The Supreme Court in Keisham Meghachandra Singh (2020) highlighted that the Tenth Schedule does not provide a statutory timeline for Speakers. Under Paragraph 2(3), nominated members must join within 6 months; joining thereafter attracts disqualification.'
  },
  {
    id: 'sample-2',
    subject: 'Macroeconomics & Monetary Policy',
    year: 'UPSC CSE Standard',
    question: 'Which of the following measures by the Reserve Bank of India (RBI) would directly result in the expansion of money supply (M3) in the domestic economy?',
    options: [
      'Sale of government securities in the Open Market Operations (OMO)',
      'Increase in the Cash Reserve Ratio (CRR)',
      'Purchase of foreign exchange (USD) from commercial banks',
      'Increase in the Standing Deposit Facility (SDF) rate'
    ],
    correctIndex: 2,
    explanation: 'When the RBI purchases foreign currency from banks, it injects equivalent Rupee liquidity into the banking system, directly expanding the Reserve Money (M0) base and broader money supply.'
  },
  {
    id: 'sample-3',
    subject: 'Environmental Ecology & Conservation',
    year: 'UPSC CSE Standard',
    question: 'Consider the following pairs of Protected Areas and their primary key species:\n1. Bhitarkanika National Park — Saltwater Crocodile\n2. Keibul Lamjao National Park — Brow-antlered Deer (Sangai)\n3. Silent Valley National Park — Lion-tailed Macaque',
    options: [
      '1 and 2 only',
      '2 and 3 only',
      '1 and 3 only',
      '1, 2 and 3'
    ],
    correctIndex: 3,
    explanation: 'All 3 pairs are correctly matched. Bhitarkanika is a stronghold for saltwater crocodiles. Keibul Lamjao (Loktak Lake, Manipur) is the world’s only floating sanctuary harboring Sangai deer. Silent Valley in Kerala protects the endangered Lion-tailed Macaque.'
  }
];

interface DiagnosticPreviewProps {
  onLaunchFullArena: () => void;
}

export default function DiagnosticPreview({ onLaunchFullArena }: DiagnosticPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const q = SAMPLE_QUESTIONS[currentIndex];

  const handleSelect = (idx: number) => {
    if (hasAnswered) return;
    setSelectedOption(idx);
    setHasAnswered(true);
  };

  const handleNext = () => {
    setSelectedOption(null);
    setHasAnswered(false);
    setCurrentIndex((prev) => (prev + 1) % SAMPLE_QUESTIONS.length);
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

      if (hasAnswered) {
        if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleNext();
        }
        return;
      }

      const key = e.key.toUpperCase();
      const code = e.code;

      if (key === 'A' || code === 'KeyA' || key === '1' || code === 'Digit1' || code === 'Numpad1') {
        e.preventDefault();
        handleSelect(0);
      } else if (key === 'B' || code === 'KeyB' || key === '2' || code === 'Digit2' || code === 'Numpad2') {
        e.preventDefault();
        handleSelect(1);
      } else if (key === 'C' || code === 'KeyC' || key === '3' || code === 'Digit3' || code === 'Numpad3') {
        e.preventDefault();
        handleSelect(2);
      } else if (key === 'D' || code === 'KeyD' || key === '4' || code === 'Digit4' || code === 'Numpad4') {
        e.preventDefault();
        handleSelect(3);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasAnswered, currentIndex]);

  const isCorrect = selectedOption === q.correctIndex;

  return (
    <div className="w-full bg-[rgba(4,25,54,0.75)] backdrop-blur-xl border border-[rgba(19,108,153,0.45)] rounded-xs p-6 md:p-8 relative overflow-hidden shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5)]">
      
      {/* Category Header */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[rgba(19,108,153,0.3)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#0194a8]" />
          <span className="font-sans text-xs font-medium text-[#0194a8]">
            {q.subject}
          </span>
        </div>
        <span className="font-sans text-xs text-[#8fa2bd]">
          {q.year} &bull; Question {currentIndex + 1} of {SAMPLE_QUESTIONS.length}
        </span>
      </div>

      {/* Question Text */}
      <motion.div
        key={q.id + '-question'}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-6"
      >
        <p className="text-[14.5px] sm:text-[15.5px] text-[#e8e0cf] font-serif leading-[1.65] whitespace-pre-line">
          {q.question}
        </p>
      </motion.div>

      {/* 4 Clean Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {q.options.map((opt, idx) => {
          let btnStyle = 'border-[rgba(19,108,153,0.35)] bg-[rgba(11,61,120,0.2)] text-[#c8b998] hover:border-[#0194a8] hover:bg-[rgba(11,61,120,0.35)] hover:text-[#e8e0cf]';
          let letterStyle = 'border-[rgba(19,108,153,0.4)] text-[#8fa2bd] bg-[rgba(4,25,54,0.6)]';

          if (hasAnswered) {
            if (idx === q.correctIndex) {
              btnStyle = 'border-[rgba(52,211,153,0.6)] bg-[rgba(52,211,153,0.15)] text-[#34d399] font-medium';
              letterStyle = 'border-[#34d399] text-[#34d399] bg-[rgba(52,211,153,0.25)]';
            } else if (idx === selectedOption) {
              btnStyle = 'border-[rgba(225,78,78,0.6)] bg-[rgba(225,78,78,0.15)] text-[#e14e4e] font-medium';
              letterStyle = 'border-[#e14e4e] text-[#e14e4e] bg-[rgba(225,78,78,0.25)]';
            } else {
              btnStyle = 'border-[rgba(19,108,153,0.15)] bg-[rgba(3,16,38,0.3)] text-[#5c6f8a] opacity-40';
              letterStyle = 'border-transparent text-[#5c6f8a] bg-transparent';
            }
          }

          return (
            <motion.button
              key={idx}
              whileTap={!hasAnswered ? { scale: 0.99 } : {}}
              onClick={() => handleSelect(idx)}
              disabled={hasAnswered}
              aria-label={`Option ${String.fromCharCode(65 + idx)}: ${opt}`}
              className={`p-3.5 rounded-xs border text-left text-[13.5px] font-sans flex items-start gap-3 transition-all cursor-pointer select-none ${btnStyle}`}
            >
              <span className={`w-5 h-5 rounded-xs border flex items-center justify-center shrink-0 text-xs font-mono font-bold transition-colors ${letterStyle}`}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="leading-snug pt-0.5">{opt}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Explanation Banner */}
      <AnimatePresence>
        {hasAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-4 rounded-xs border mb-5 text-[13px] font-sans leading-relaxed ${
              isCorrect
                ? 'bg-[rgba(52,211,153,0.1)] border-[rgba(52,211,153,0.4)] text-[#e8e0cf]'
                : 'bg-[rgba(225,78,78,0.1)] border-[rgba(225,78,78,0.4)] text-[#e8e0cf]'
            }`}
          >
            <div className="flex items-center gap-2 font-sans text-xs font-semibold mb-1.5">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
                  <span className="text-[#34d399]">Correct (+2.00) &bull; Accurate Reasoning</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-[#e14e4e]" />
                  <span className="text-[#e14e4e]">Incorrect (-0.66) &bull; Examiner Trap</span>
                </>
              )}
            </div>
            <p className="text-[#9fb0c8] font-sans text-xs leading-relaxed">{q.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Controls */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-[rgba(19,108,153,0.25)]">
        {hasAnswered ? (
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 text-xs font-sans text-[#e0d0ab] hover:underline cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Next Question ({currentIndex + 1}/3)</span>
          </button>
        ) : (
          <span className="text-xs font-sans text-[#8fa2bd]">
            Press keys A, B, C, D or click an option
          </span>
        )}

        <button
          onClick={onLaunchFullArena}
          className="group inline-flex items-center gap-2 px-4 py-2 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-sans font-semibold rounded-xs transition-all cursor-pointer shadow-md"
        >
          <span>Launch Full Arena</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
