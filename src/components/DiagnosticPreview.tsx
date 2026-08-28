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
    year: 'UPSC CSE Prelims Standard',
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
    year: 'UPSC CSE Prelims Standard',
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
    year: 'UPSC CSE Prelims Standard',
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

  // Keyboard shortcut listener for A, B, C, D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasAnswered) {
        if (e.key === 'Enter' || e.key === ' ') {
          handleNext();
        }
        return;
      }
      const key = e.key.toUpperCase();
      if (key === 'A') handleSelect(0);
      else if (key === 'B') handleSelect(1);
      else if (key === 'C') handleSelect(2);
      else if (key === 'D') handleSelect(3);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasAnswered, currentIndex]);

  const isCorrect = selectedOption === q.correctIndex;

  return (
    <div className="w-full bg-[rgba(4,25,54,0.75)] backdrop-blur-xl border border-[rgba(19,108,153,0.5)] rounded-xs p-5 md:p-7 relative overflow-hidden shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)]">
      
      {/* Upper Category & Status Bar */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[rgba(19,108,153,0.35)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#0194a8] animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#0194a8]">
            {q.subject}
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#8fa2bd] tracking-wider">
          {q.year} &bull; Q{currentIndex + 1}/3
        </span>
      </div>

      {/* Question Text */}
      <motion.div
        key={q.id + '-question'}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-5"
      >
        <p className="text-xs sm:text-[13.5px] text-[#e8e0cf] font-serif leading-relaxed whitespace-pre-line">
          {q.question}
        </p>
      </motion.div>

      {/* 4 Interactive Option Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
        {q.options.map((opt, idx) => {
          let btnStyle = 'border-[rgba(19,108,153,0.35)] bg-[rgba(11,61,120,0.2)] text-[#9fb0c8] hover:border-[#0194a8] hover:bg-[rgba(11,61,120,0.4)] hover:text-[#e8e0cf]';
          let letterStyle = 'border-[rgba(19,108,153,0.5)] text-[#8fa2bd] bg-[rgba(4,25,54,0.6)]';

          if (hasAnswered) {
            if (idx === q.correctIndex) {
              btnStyle = 'border-[rgba(52,211,153,0.6)] bg-[rgba(52,211,153,0.15)] text-[#34d399] font-medium';
              letterStyle = 'border-[#34d399] text-[#34d399] bg-[rgba(52,211,153,0.25)]';
            } else if (idx === selectedOption) {
              btnStyle = 'border-[rgba(225,78,78,0.6)] bg-[rgba(225,78,78,0.15)] text-[#e14e4e] font-medium';
              letterStyle = 'border-[#e14e4e] text-[#e14e4e] bg-[rgba(225,78,78,0.25)]';
            } else {
              btnStyle = 'border-[rgba(19,108,153,0.15)] bg-[rgba(3,16,38,0.3)] text-[#5c6f8a] opacity-50';
              letterStyle = 'border-transparent text-[#5c6f8a] bg-transparent';
            }
          }

          return (
            <motion.button
              key={idx}
              whileTap={!hasAnswered ? { scale: 0.985 } : {}}
              onClick={() => handleSelect(idx)}
              disabled={hasAnswered}
              className={`p-3 rounded-xs border text-left text-xs font-sans flex items-start gap-2.5 transition-all cursor-pointer select-none ${btnStyle}`}
            >
              <span className={`w-5 h-5 rounded-xs border flex items-center justify-center shrink-0 text-[10px] font-mono font-bold transition-colors ${letterStyle}`}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="leading-snug pt-0.5">{opt}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Explanation & Autopsy Feedback Banner */}
      <AnimatePresence>
        {hasAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`p-4 rounded-xs border mb-4 text-xs font-sans leading-relaxed ${
              isCorrect
                ? 'bg-[rgba(52,211,153,0.1)] border-[rgba(52,211,153,0.4)] text-[#e8e0cf]'
                : 'bg-[rgba(225,78,78,0.1)] border-[rgba(225,78,78,0.4)] text-[#e8e0cf]'
            }`}
          >
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold mb-1.5">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
                  <span className="text-[#34d399]">CORRECT (+2.00) &bull; Conceptual Precision Confirmed</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-[#e14e4e]" />
                  <span className="text-[#e14e4e]">INCORRECT (-0.66) &bull; Examiner Trap Identified</span>
                </>
              )}
            </div>
            <p className="text-[#9fb0c8] font-sans text-xs leading-relaxed">{q.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Footer Actions */}
      <div className="flex items-center justify-between gap-3 pt-2">
        {hasAnswered ? (
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#e0d0ab] hover:underline cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Next Question ({currentIndex + 1}/3)</span>
          </button>
        ) : (
          <span className="text-[10.5px] font-mono text-[#8fa2bd]">
            Press keys <kbd className="px-1.5 py-0.5 rounded-xs bg-[rgba(3,16,38,0.8)] border border-[rgba(19,108,153,0.4)] text-[#e0d0ab]">A</kbd> <kbd className="px-1.5 py-0.5 rounded-xs bg-[rgba(3,16,38,0.8)] border border-[rgba(19,108,153,0.4)] text-[#e0d0ab]">B</kbd> <kbd className="px-1.5 py-0.5 rounded-xs bg-[rgba(3,16,38,0.8)] border border-[rgba(19,108,153,0.4)] text-[#e0d0ab]">C</kbd> <kbd className="px-1.5 py-0.5 rounded-xs bg-[rgba(3,16,38,0.8)] border border-[rgba(19,108,153,0.4)] text-[#e0d0ab]">D</kbd> or click to evaluate
          </span>
        )}

        <button
          onClick={onLaunchFullArena}
          className="group inline-flex items-center gap-2 px-3.5 py-2 bg-[#e0d0ab] text-[#072e63] text-xs font-mono uppercase font-bold tracking-wider rounded-xs hover:bg-white transition-all cursor-pointer shadow-md"
        >
          <span>Launch Full Arena</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
