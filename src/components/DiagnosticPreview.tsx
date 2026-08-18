import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Brain, Sparkles, HelpCircle } from 'lucide-react';

interface SampleQuestion {
  id: string;
  subject: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    id: 'sample-1',
    subject: 'Indian Polity & Governance',
    question: 'With reference to the Anti-Defection Law (Tenth Schedule), consider the following statements:\n1. The law does not specify a time-frame within which the Presiding Officer must decide a disqualification plea.\n2. A nominated member becomes subject to disqualification if they join any political party after 6 months of taking seat.',
    options: [
      '1 only',
      '2 only',
      'Both 1 and 2',
      'Neither 1 nor 2'
    ],
    correctIndex: 2,
    explanation: 'Both statements are correct. The Supreme Court in Keisham Meghachandra Singh (2020) highlighted that the Tenth Schedule does not provide a statutory timeline for Speakers. Nominated members must join within 6 months; joining thereafter invites disqualification.'
  },
  {
    id: 'sample-2',
    subject: 'Economy & Monetary Policy',
    question: 'Which of the following measures by the Reserve Bank of India (RBI) would directly result in the expansion of money supply in the domestic economy?',
    options: [
      'Sale of government securities in the Open Market (OMO)',
      'Increase in the Cash Reserve Ratio (CRR)',
      'Purchase of foreign currency (USD) from commercial banks',
      'Increase in the Standing Deposit Facility (SDF) rate'
    ],
    correctIndex: 2,
    explanation: 'When RBI purchases foreign exchange from banks, it injects equivalent domestic currency (Rupees) into the banking system, directly expanding the monetary base (M0).'
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

  const isCorrect = selectedOption === q.correctIndex;

  return (
    <div className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-sm p-6 relative overflow-hidden backdrop-blur-sm shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#e0d0ab]" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#e0d0ab] font-bold">
            Interactive Diagnostic Preview
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 uppercase">
          {q.subject}
        </span>
      </div>

      {/* Question Text */}
      <motion.p
        key={q.id + '-question'}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs sm:text-sm text-zinc-200 font-sans leading-relaxed mb-5 whitespace-pre-line"
      >
        {q.question}
      </motion.p>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
        {q.options.map((opt, idx) => {
          let btnStyle = 'border-zinc-800/80 bg-zinc-900/30 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/60';
          let letterStyle = 'border-zinc-700 text-zinc-400 bg-zinc-800/60';

          if (hasAnswered) {
            if (idx === q.correctIndex) {
              btnStyle = 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300';
              letterStyle = 'border-emerald-500 text-emerald-300 bg-emerald-500/20';
            } else if (idx === selectedOption) {
              btnStyle = 'border-rose-500/60 bg-rose-500/10 text-rose-300';
              letterStyle = 'border-rose-500 text-rose-300 bg-rose-500/20';
            } else {
              btnStyle = 'border-zinc-900 bg-zinc-950/40 text-zinc-600 opacity-60';
            }
          }

          return (
            <motion.button
              key={idx}
              whileTap={!hasAnswered ? { scale: 0.98 } : {}}
              onClick={() => handleSelect(idx)}
              disabled={hasAnswered}
              className={`p-3 rounded-sm border text-left text-xs font-sans flex items-start gap-2.5 transition-all cursor-pointer ${btnStyle}`}
            >
              <span className={`w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 text-[10px] font-mono font-bold ${letterStyle}`}>
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
            className={`p-3.5 rounded-sm border mb-4 text-xs font-sans leading-relaxed ${
              isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold mb-1">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Correct (+2.00) &bull; Accurate Reasoning</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-400">Incorrect (-0.66) &bull; Conceptual Autopsy</span>
                </>
              )}
            </div>
            <p className="text-zinc-400">{q.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Footer Actions */}
      <div className="flex items-center justify-between gap-3 pt-2">
        {hasAnswered ? (
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#e0d0ab] hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try Next Question ({currentIndex + 1}/{SAMPLE_QUESTIONS.length})
          </button>
        ) : (
          <span className="text-[10px] font-mono text-zinc-500">
            Select an option to trigger zero-trust evaluation
          </span>
        )}

        <button
          onClick={onLaunchFullArena}
          className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e0d0ab] text-zinc-950 text-[10px] font-mono uppercase font-bold tracking-wider rounded-sm hover:bg-stone-100 transition-all cursor-pointer"
        >
          <span>Launch Full 10-Q Arena</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
