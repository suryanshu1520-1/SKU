import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Layers,
  Swords,
  BookOpen,
  Check,
  Target,
  Flame,
  Award
} from 'lucide-react';

interface OnboardingProps {
  userName: string;
  userEmail: string;
  onComplete: (profileData: CandidateProfile) => void;
  onSkip?: () => void;
}

export interface CandidateProfile {
  name: string;
  targetYear: string;
  focusPillars: string[];
  testMode: string;
  pledged: boolean;
}

const TARGET_YEARS = [
  { id: '2025', label: 'CSE 2025', desc: 'Final Sprint & High-Yield Precision', icon: Flame },
  { id: '2026', label: 'CSE 2026', desc: 'Comprehensive Foundation & Deep Mastery', icon: Target },
  { id: '2027', label: 'CSE 2027+', desc: 'Multi-Year Long Range Architecture', icon: Calendar },
  { id: 'state-psc', label: 'State PSCs', desc: 'State Civil Services Examination', icon: Award }
];

const GS_PILLARS = [
  { id: 'polity', label: 'Polity & Governance', code: 'GS-2', desc: 'Constitutional Law & Landmark Jurisprudence' },
  { id: 'economy', label: 'Economy & Finance', code: 'GS-3', desc: 'Monetary Corridors, Fiscal Policy & Trade' },
  { id: 'environment', label: 'Environment & Ecology', code: 'GS-3', desc: 'Biodiversity, Climate Summits & Wildlife Acts' },
  { id: 'history', label: 'Modern History & Art', code: 'GS-1', desc: 'Freedom Struggle, Temple Architecture & Culture' },
  { id: 'ethics', label: 'Ethics & Philosophy', code: 'GS-4', desc: 'Moral Thinkers, Integrity & Case Studies' },
  { id: 'security', label: 'Security & Tech', code: 'GS-3', desc: 'Border Management, AI & Defence Corridors' }
];

export default function Onboarding({ userName, userEmail, onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(userName || userEmail.split('@')[0]);
  const [targetYear, setTargetYear] = useState('2025');
  const [focusPillars, setFocusPillars] = useState<string[]>(['polity', 'economy', 'environment']);
  const [testMode, setTestMode] = useState('arena');
  const [pledged, setPledged] = useState(false);

  const togglePillar = (id: string) => {
    if (focusPillars.includes(id)) {
      if (focusPillars.length > 1) {
        setFocusPillars(focusPillars.filter(p => p !== id));
      }
    } else {
      if (focusPillars.length < 4) {
        setFocusPillars([...focusPillars, id]);
      }
    }
  };

  const handleFinish = () => {
    const profile: CandidateProfile = {
      name: name.trim() || userName,
      targetYear,
      focusPillars,
      testMode,
      pledged
    };
    localStorage.setItem('tark_candidate_profile', JSON.stringify(profile));
    localStorage.setItem('tark_onboarding_completed', 'true');
    onComplete(profile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(3,16,38,0.92)] backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto font-sans text-stone-100 selection:bg-[#e0d0ab] selection:text-[#072e63]">
      <div className="w-full max-w-xl bg-[rgba(4,25,54,0.95)] border border-[rgba(224,208,171,0.35)] rounded-xs shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-6 md:p-8 relative overflow-hidden">
        
        {/* Top Stepper Ribbon */}
        <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-[rgba(19,108,153,0.3)]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest text-[#e0d0ab]">
              Candidate Induction &bull; Step {step} of 3
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-6 bg-[#e0d0ab]'
                    : s < step
                    ? 'w-3 bg-[#34d399]'
                    : 'w-3 bg-[rgba(19,108,153,0.4)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Dynamic Multi-Step Body */}
        <AnimatePresence mode="wait">
          {/* ── STEP 1: CANDIDATE IDENTITY & TARGET YEAR ── */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div className="space-y-1">
                <h2 className="font-serif text-2xl font-bold text-[#e0d0ab]">
                  Welcome to Tark, Candidate.
                </h2>
                <p className="text-xs sm:text-sm text-[#9fb0c8]">
                  Let&apos;s calibrate your intelligence dossier for high-stakes preparation.
                </p>
              </div>

              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-sans text-[#8fa2bd] font-medium">
                  Candidate Name or Call-Sign
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Inspector Miller, Aspirant Arjun"
                  className="w-full px-3.5 py-2.5 rounded-xs bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.4)] focus:border-[#e0d0ab] focus:outline-none text-sm text-[#e8e0cf] transition-all"
                />
              </div>

              {/* Target Year Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-sans text-[#8fa2bd] font-medium">
                  Target UPSC CSE Cycle
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TARGET_YEARS.map((y) => {
                    const active = targetYear === y.id;
                    const Icon = y.icon;
                    return (
                      <button
                        key={y.id}
                        type="button"
                        onClick={() => setTargetYear(y.id)}
                        className={`p-3 rounded-xs border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          active
                            ? 'bg-[rgba(224,208,171,0.15)] border-[#e0d0ab] text-[#e8e0cf] shadow-sm'
                            : 'bg-[rgba(11,61,120,0.15)] border-[rgba(19,108,153,0.3)] text-[#9fb0c8] hover:border-[rgba(19,108,153,0.6)]'
                        }`}
                      >
                        <div className={`p-2 rounded-xs shrink-0 ${active ? 'bg-[#e0d0ab] text-[#072e63]' : 'bg-[rgba(4,25,54,0.6)] text-[#8fa2bd]'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-serif text-xs font-bold">{y.label}</p>
                          <p className="text-[11px] text-[#8fa2bd] truncate mt-0.5">{y.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[rgba(19,108,153,0.3)]">
                {onSkip && (
                  <button
                    type="button"
                    onClick={onSkip}
                    className="text-xs text-[#8fa2bd] hover:text-[#e0d0ab] transition-colors cursor-pointer"
                  >
                    Skip setup
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-sans font-semibold rounded-xs transition-all cursor-pointer shadow-md"
                >
                  <span>Continue to Calibration</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: FOCUS PILLARS & DIAGNOSTIC MODE ── */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div className="space-y-1">
                <h2 className="font-serif text-2xl font-bold text-[#e0d0ab]">
                  Select Focus GS Pillars
                </h2>
                <p className="text-xs sm:text-sm text-[#9fb0c8]">
                  Choose up to 4 priority domains to customize your telemetry deck.
                </p>
              </div>

              {/* Pillars Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {GS_PILLARS.map((p) => {
                  const selected = focusPillars.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePillar(p.id)}
                      className={`p-3 rounded-xs border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        selected
                          ? 'bg-[rgba(224,208,171,0.15)] border-[#e0d0ab] text-[#e8e0cf]'
                          : 'bg-[rgba(11,61,120,0.15)] border-[rgba(19,108,153,0.3)] text-[#9fb0c8] hover:border-[rgba(19,108,153,0.6)]'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 mt-0.5 text-[9px] ${selected ? 'bg-[#e0d0ab] text-[#072e63] border-[#e0d0ab]' : 'border-[rgba(19,108,153,0.4)]'}`}>
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-serif text-xs font-bold">{p.label}</p>
                          <span className="text-[9px] font-mono text-[#0194a8]">{p.code}</span>
                        </div>
                        <p className="text-[10.5px] text-[#8fa2bd] leading-tight mt-0.5">{p.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[rgba(19,108,153,0.3)]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-[#8fa2bd] hover:text-[#e0d0ab] transition-colors cursor-pointer"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-sans font-semibold rounded-xs transition-all cursor-pointer shadow-md"
                >
                  <span>Continue to Protocol Oath</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: FOUNDATIONAL PROTOCOL OATH ── */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div className="space-y-1">
                <h2 className="font-serif text-2xl font-bold text-[#e0d0ab]">
                  The Tark Protocol Induction
                </h2>
                <p className="text-xs sm:text-sm text-[#9fb0c8]">
                  Tark is a sterile, zero-noise analytical engine. We ask for your commitment:
                </p>
              </div>

              <div className="space-y-3 bg-[rgba(3,16,38,0.7)] border border-[rgba(19,108,153,0.35)] rounded-xs p-4 text-xs font-sans">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#e8e0cf]">Zero Fluff &bull; Primary Sources First</span>
                    <p className="text-[#9fb0c8] text-[11.5px] mt-0.5">I will prioritize primary government dispatches and verbatim canonical texts over second-hand summaries.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#e8e0cf]">Zero-Trust Server Evaluation</span>
                    <p className="text-[#9fb0c8] text-[11.5px] mt-0.5">I will test my retention under timed conditions (+2.00 / -0.66) and use AI autopsies to eliminate examiner traps.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#e8e0cf]">Daily Intelligence Discipline</span>
                    <p className="text-[#9fb0c8] text-[11.5px] mt-0.5">10 daily dispatches and 10 questions every single day to compound analytical momentum.</p>
                  </div>
                </div>
              </div>

              {/* Pledge Checkbox */}
              <label
                onClick={() => setPledged(!pledged)}
                className="flex items-center gap-3 p-3 rounded-xs bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.4)] cursor-pointer select-none"
              >
                <div className={`w-5 h-5 rounded-xs border flex items-center justify-center shrink-0 ${pledged ? 'bg-[#e0d0ab] border-[#e0d0ab] text-[#072e63]' : 'border-[rgba(19,108,153,0.5)]'}`}>
                  {pledged && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span className="text-xs text-[#e8e0cf] font-medium">
                  I accept the Tark Candidate Protocol and am ready to enter the testing arena.
                </span>
              </label>

              {/* Step 3 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[rgba(19,108,153,0.3)]">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs text-[#8fa2bd] hover:text-[#e0d0ab] transition-colors cursor-pointer"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-sans font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer shadow-lg"
                >
                  <span>Seal Protocol & Enter Chamber</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
