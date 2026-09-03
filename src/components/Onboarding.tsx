import React, { useState } from 'react';
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
  Award,
  Clock,
  Search,
  Zap,
  Briefcase,
  GraduationCap,
  Scale,
  Compass,
  FileCheck2,
  ChevronRight
} from 'lucide-react';
import type {
  CandidatePreferences,
  CandidateProfile,
  TargetYear,
  AttemptStage,
  AspirantPersona,
  OptionalSubjectId,
  GsPillarId,
  DailyMcqTarget,
  DailyReadingMins
} from '../types';
import {
  OPTIONAL_SUBJECTS,
  OPTIONAL_PREP_STAGES,
  TARGET_YEARS_CONFIG,
  GS_PILLARS_CONFIG,
  getOptionalSubject
} from '../data/optional-subjects';
import {
  calculateExamCountdown,
  savePreferences,
  DEFAULT_PREFERENCES
} from '../lib/candidatePreferences';

interface OnboardingProps {
  userName: string;
  userEmail: string;
  userId?: string;
  initialPreferences?: CandidatePreferences;
  onComplete: (profileData: CandidateProfile) => void;
  onSkip?: () => void;
}

export default function Onboarding({
  userName,
  userEmail,
  userId,
  initialPreferences,
  onComplete,
  onSkip
}: OnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Form State
  const [name, setName] = useState(userName || userEmail.split('@')[0]);
  const [persona, setPersona] = useState<AspirantPersona>(
    initialPreferences?.aspirantPersona || 'full_time'
  );
  const [targetYear, setTargetYear] = useState<TargetYear>(
    initialPreferences?.targetYear || '2026'
  );
  const [attemptStage, setAttemptStage] = useState<AttemptStage>(
    initialPreferences?.attemptStage || 'foundation'
  );
  const [optionalSubject, setOptionalSubject] = useState<OptionalSubjectId>(
    initialPreferences?.optionalSubject || 'psir'
  );
  const [optionalStage, setOptionalStage] = useState<'exploring' | 'foundation' | 'notes_pyq' | 'answer_writing'>(
    initialPreferences?.optionalStage || 'foundation'
  );
  const [focusPillars, setFocusPillars] = useState<GsPillarId[]>(
    initialPreferences?.focusPillars || ['gs2', 'gs3']
  );
  const [dailyMcqTarget, setDailyMcqTarget] = useState<DailyMcqTarget>(
    initialPreferences?.dailyMcqTarget || 10
  );
  const [dailyReadingMins, setDailyReadingMins] = useState<DailyReadingMins>(
    initialPreferences?.dailyReadingMins || 7
  );
  const [difficultyPreference, setDifficultyPreference] = useState<'standard' | 'crucible'>(
    initialPreferences?.difficultyPreference || 'standard'
  );
  const [pledged, setPledged] = useState(initialPreferences?.inductionPledged || false);
  const [searchOptional, setSearchOptional] = useState('');

  // Dynamic countdown calculation
  const countdown = calculateExamCountdown(targetYear);
  const selectedOptional = getOptionalSubject(optionalSubject);

  const togglePillar = (id: GsPillarId) => {
    if (focusPillars.includes(id)) {
      if (focusPillars.length > 1) {
        setFocusPillars(focusPillars.filter((p) => p !== id));
      }
    } else {
      if (focusPillars.length < 4) {
        setFocusPillars([...focusPillars, id]);
      }
    }
  };

  const filteredOptionals = OPTIONAL_SUBJECTS.filter(
    (opt) =>
      opt.name.toLowerCase().includes(searchOptional.toLowerCase()) ||
      opt.shortName.toLowerCase().includes(searchOptional.toLowerCase()) ||
      opt.description.toLowerCase().includes(searchOptional.toLowerCase())
  );

  const handleFinish = async () => {
    const preferences: CandidatePreferences = {
      targetYear,
      attemptStage,
      aspirantPersona: persona,
      optionalSubject,
      optionalStage,
      focusPillars,
      dailyMcqTarget,
      dailyReadingMins,
      difficultyPreference,
      onboardingCompleted: true,
      inductionPledged: pledged,
      updatedAt: new Date().toISOString()
    };

    const finalName = name.trim() || userName || 'Candidate';

    await savePreferences(preferences, userId, finalName);

    const fullProfile: CandidateProfile = {
      name: finalName,
      email: userEmail,
      userId,
      preferences
    };

    onComplete(fullProfile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(3,16,38,0.94)] backdrop-blur-2xl flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto font-sans text-stone-100 selection:bg-[#e0d0ab] selection:text-[#072e63]">
      <div className="w-full max-w-2xl bg-[rgba(4,25,54,0.96)] border border-[rgba(224,208,171,0.35)] rounded-xs shadow-[0_24px_70px_rgba(0,0,0,0.9)] p-5 sm:p-7 md:p-8 relative overflow-hidden my-auto">
        
        {/* Subtle decorative grid background */}
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#e0d0ab_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* ── Top Stepper Ribbon ── */}
        <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-[rgba(19,108,153,0.35)] relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#e0d0ab]">
              Induction Calibration &bull; Step {step} of 6
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-6 bg-[#e0d0ab]'
                    : s < step
                    ? 'w-2.5 bg-[#34d399]'
                    : 'w-2 bg-[rgba(19,108,153,0.4)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Dynamic Multi-Step Body */}
        <div className="relative z-10 min-h-[380px] flex flex-col justify-between">
          <AnimatePresence mode="wait">

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* ── STEP 1: IDENTITY & ASPIRANT PERSONA ── */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h2 className="font-serif text-2xl font-bold text-[#e0d0ab] tracking-tight">
                    Welcome to Tark. Identify Your Profile.
                  </h2>
                  <p className="text-xs sm:text-sm text-[#9fb0c8]">
                    Tark is a sterile, zero-noise analytical engine. Let us calibrate your intelligence dossier.
                  </p>
                </div>

                {/* Candidate Call-Sign / Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-sans text-[#8fa2bd] font-medium uppercase tracking-wider">
                    Candidate Call-Sign / Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aspirant Arjun, Candidate Miller"
                    className="w-full px-3.5 py-2.5 rounded-xs bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.45)] focus:border-[#e0d0ab] focus:outline-none text-sm text-[#e8e0cf] transition-all"
                  />
                </div>

                {/* Preparation Persona Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-sans text-[#8fa2bd] font-medium uppercase tracking-wider">
                    Preparation Commitment & Persona
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        id: 'full_time' as const,
                        label: 'Full-Time Aspirant',
                        sub: 'Dual-session daily rigor & maximum depth',
                        icon: Flame
                      },
                      {
                        id: 'working_pro' as const,
                        label: 'Working Professional',
                        sub: 'High-yield, time-constrained micro-sprints',
                        icon: Briefcase
                      },
                      {
                        id: 'undergrad' as const,
                        label: 'Undergrad / Early Starter',
                        sub: 'Structured multi-year foundational architecture',
                        icon: GraduationCap
                      }
                    ].map((item) => {
                      const active = persona === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPersona(item.id)}
                          className={`p-3 rounded-xs border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            active
                              ? 'bg-[rgba(224,208,171,0.15)] border-[#e0d0ab] text-[#e8e0cf] shadow-sm'
                              : 'bg-[rgba(11,61,120,0.15)] border-[rgba(19,108,153,0.3)] text-[#9fb0c8] hover:border-[rgba(19,108,153,0.6)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 rounded-xs ${active ? 'bg-[#e0d0ab] text-[#072e63]' : 'bg-[rgba(4,25,54,0.6)] text-[#8fa2bd]'}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-serif text-xs font-bold leading-tight">{item.label}</span>
                          </div>
                          <p className="text-[11px] text-[#8fa2bd] leading-snug">{item.sub}</p>
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
                      Skip induction
                    </button>
                  )}
                  <motion.button
                    type="button"
                    onClick={() => setStep(2)}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-sans font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
                  >
                    <span>Proceed to Target Cycle</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* ── STEP 2: TARGET EXAM CYCLE & COUNTDOWN ── */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h2 className="font-serif text-2xl font-bold text-[#e0d0ab] tracking-tight">
                    Target Exam Cycle & Countdown Clock
                  </h2>
                  <p className="text-xs sm:text-sm text-[#9fb0c8]">
                    Tark replaces manufactured gamification streaks with an authentic, unwavering exam countdown.
                  </p>
                </div>

                {/* Target Year Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TARGET_YEARS_CONFIG.map((y) => {
                    const active = targetYear === y.id;
                    return (
                      <button
                        key={y.id}
                        type="button"
                        onClick={() => setTargetYear(y.id as TargetYear)}
                        className={`p-3 rounded-xs border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          active
                            ? 'bg-[rgba(224,208,171,0.15)] border-[#e0d0ab] text-[#e8e0cf] shadow-sm'
                            : 'bg-[rgba(11,61,120,0.15)] border-[rgba(19,108,153,0.3)] text-[#9fb0c8] hover:border-[rgba(19,108,153,0.6)]'
                        }`}
                      >
                        <div className={`p-2 rounded-xs shrink-0 ${active ? 'bg-[#e0d0ab] text-[#072e63]' : 'bg-[rgba(4,25,54,0.6)] text-[#8fa2bd]'}`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-serif text-xs font-bold text-[#e8e0cf]">{y.label}</p>
                          <p className="text-[11px] text-[#8fa2bd] truncate mt-0.5">{y.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Live Countdown Calibration Box */}
                <div className="p-3.5 rounded-xs bg-[rgba(3,16,38,0.7)] border border-[rgba(19,108,153,0.4)] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#34d399] shrink-0" />
                    <div>
                      <p className="font-mono text-xs font-semibold text-[#e0d0ab]">
                        {countdown.daysRemaining} Days Remaining
                      </p>
                      <p className="text-[11px] text-[#8fa2bd]">
                        Projected Prelims: {countdown.dateFormatted} ({countdown.label})
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-xs bg-[rgba(11,61,120,0.5)] border border-[rgba(19,108,153,0.4)] text-[#0194a8]">
                    LIVE CLOCK ACTIVE
                  </span>
                </div>

                {/* Attempt Maturity */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-sans text-[#8fa2bd] font-medium uppercase tracking-wider">
                    Candidate Attempt Maturity
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'foundation' as const, label: '1st Attempt', sub: 'Fresh Foundation' },
                      { id: 'intermediate' as const, label: '2nd / 3rd Attempt', sub: 'Score Gap Rectification' },
                      { id: 'veteran' as const, label: 'Interview Veteran', sub: 'High-Precision Polish' }
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setAttemptStage(st.id)}
                        className={`p-2.5 rounded-xs border text-center transition-all cursor-pointer ${
                          attemptStage === st.id
                            ? 'bg-[rgba(224,208,171,0.18)] border-[#e0d0ab] text-[#e8e0cf]'
                            : 'bg-[rgba(11,61,120,0.12)] border-[rgba(19,108,153,0.3)] text-[#9fb0c8] hover:border-[rgba(19,108,153,0.5)]'
                        }`}
                      >
                        <p className="font-serif text-xs font-bold">{st.label}</p>
                        <p className="text-[10px] text-[#8fa2bd] mt-0.5">{st.sub}</p>
                      </button>
                    ))}
                  </div>
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
                  <motion.button
                    type="button"
                    onClick={() => setStep(3)}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-sans font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
                  >
                    <span>Select Optional Subject</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* ── STEP 3: OPTIONAL SUBJECT (500-MARK ANCHOR) ── */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-2xl font-bold text-[#e0d0ab] tracking-tight">
                      The Optional Subject Selection
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-[rgba(224,208,171,0.15)] text-[#e0d0ab] border border-[rgba(224,208,171,0.4)]">
                      500 MARKS
                    </span>
                  </div>
                  <p className="text-xs text-[#9fb0c8]">
                    Your optional subject accounts for ~29% of Mains written marks. Tark dynamically maps syllabus synergies.
                  </p>
                </div>

                {/* Optional Subject Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8fa2bd] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchOptional}
                    onChange={(e) => setSearchOptional(e.target.value)}
                    placeholder="Filter optional subjects (e.g. PSIR, Sociology, Geography, History)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xs bg-[rgba(11,61,120,0.2)] border border-[rgba(19,108,153,0.35)] focus:border-[#e0d0ab] focus:outline-none text-xs text-[#e8e0cf]"
                  />
                </div>

                {/* Optionals Scrollable Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 border border-[rgba(19,108,153,0.25)] rounded-xs p-1.5 bg-[rgba(3,16,38,0.4)]">
                  {filteredOptionals.map((opt) => {
                    const active = optionalSubject === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setOptionalSubject(opt.id as OptionalSubjectId)}
                        className={`p-2 rounded-xs border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-[rgba(224,208,171,0.2)] border-[#e0d0ab] text-[#e8e0cf]'
                            : 'bg-[rgba(11,61,120,0.15)] border-[rgba(19,108,153,0.3)] text-[#9fb0c8] hover:border-[rgba(19,108,153,0.6)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-serif text-xs font-bold truncate">{opt.shortName}</span>
                          {active && <Check className="w-3 h-3 text-[#e0d0ab] stroke-[3]" />}
                        </div>
                        <p className="text-[10px] text-[#8fa2bd] line-clamp-1">{opt.name}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Optional Live Synergy Card */}
                {selectedOptional && (
                  <div className="p-3 rounded-xs bg-[rgba(3,16,38,0.7)] border border-[rgba(224,208,171,0.3)] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-xs font-bold text-[#e0d0ab]">
                        {selectedOptional.name} &bull; Synergy Profile
                      </span>
                      <span className="text-[9px] font-mono text-[#34d399] uppercase">
                        Paper 1 & 2 (500 Marks)
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9fb0c8] leading-tight">
                      {selectedOptional.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedOptional.gsSynergies.map((syn, idx) => (
                        <span
                          key={idx}
                          className="text-[9.5px] font-mono px-1.5 py-0.5 rounded-xs bg-[rgba(11,61,120,0.4)] text-[#0194a8] border border-[rgba(19,108,153,0.3)]"
                        >
                          +{syn.paper}: {syn.domain.split(',')[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optional Preparation Stage */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-sans text-[#8fa2bd] font-medium uppercase tracking-wider">
                    Optional Preparation Stage
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {OPTIONAL_PREP_STAGES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setOptionalStage(st.id as any)}
                        className={`p-2 rounded-xs border text-center transition-all cursor-pointer ${
                          optionalStage === st.id
                            ? 'bg-[rgba(224,208,171,0.18)] border-[#e0d0ab] text-[#e8e0cf]'
                            : 'bg-[rgba(11,61,120,0.1)] border-[rgba(19,108,153,0.3)] text-[#9fb0c8]'
                        }`}
                      >
                        <p className="font-serif text-[11px] font-bold">{st.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 3 Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[rgba(19,108,153,0.3)]">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs text-[#8fa2bd] hover:text-[#e0d0ab] transition-colors cursor-pointer"
                  >
                    &larr; Back
                  </button>
                  <motion.button
                    type="button"
                    onClick={() => setStep(4)}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-sans font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
                  >
                    <span>Calibrate GS Pillars</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* ── STEP 4: GENERAL STUDIES FOCUS PILLARS ── */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h2 className="font-serif text-2xl font-bold text-[#e0d0ab] tracking-tight">
                    Select Focus GS Pillars
                  </h2>
                  <p className="text-xs sm:text-sm text-[#9fb0c8]">
                    Choose 1 to 4 priority domains to weight your Daily Brief signal deck and Arena practice sets.
                  </p>
                </div>

                {/* Pillars Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {GS_PILLARS_CONFIG.map((p) => {
                    const selected = focusPillars.includes(p.id as GsPillarId);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePillar(p.id as GsPillarId)}
                        className={`p-3 rounded-xs border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          selected
                            ? 'bg-[rgba(224,208,171,0.15)] border-[#e0d0ab] text-[#e8e0cf]'
                            : 'bg-[rgba(11,61,120,0.15)] border-[rgba(19,108,153,0.3)] text-[#9fb0c8] hover:border-[rgba(19,108,153,0.6)]'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 mt-0.5 text-[9px] ${
                            selected
                              ? 'bg-[#e0d0ab] text-[#072e63] border-[#e0d0ab]'
                              : 'border-[rgba(19,108,153,0.4)]'
                          }`}
                        >
                          {selected && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-serif text-xs font-bold text-[#e8e0cf]">{p.label}</p>
                            <span className="text-[9px] font-mono text-[#0194a8]">{p.code}</span>
                          </div>
                          <p className="text-[10.5px] text-[#8fa2bd] leading-tight mt-0.5">{p.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Step 4 Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[rgba(19,108,153,0.3)]">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-xs text-[#8fa2bd] hover:text-[#e0d0ab] transition-colors cursor-pointer"
                  >
                    &larr; Back
                  </button>
                  <motion.button
                    type="button"
                    onClick={() => setStep(5)}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-sans font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
                  >
                    <span>Configure Daily Cadence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* ── STEP 5: DAILY OPERATING CADENCE ── */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {step === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h2 className="font-serif text-2xl font-bold text-[#e0d0ab] tracking-tight">
                    Daily Operating Cadence
                  </h2>
                  <p className="text-xs sm:text-sm text-[#9fb0c8]">
                    Calibrate your daily MCQ recall volume and reading depth. Discipline over guilt mechanics.
                  </p>
                </div>

                {/* Daily MCQ Target */}
                <div className="space-y-2">
                  <label className="block text-xs font-sans text-[#8fa2bd] font-medium uppercase tracking-wider">
                    Daily Question Recall Volume
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { target: 10 as const, label: '10 MCQs', sub: 'Sprint Protocol (~12m)', desc: 'Concise daily calibration' },
                      { target: 25 as const, label: '25 MCQs', sub: 'Crucible Protocol (~30m)', desc: 'Standard aspirant cadence' },
                      { target: 50 as const, label: '50 MCQs', sub: 'Full Mock (~60m)', desc: 'High-intensity prelims drill' }
                    ].map((m) => {
                      const active = dailyMcqTarget === m.target;
                      return (
                        <button
                          key={m.target}
                          type="button"
                          onClick={() => setDailyMcqTarget(m.target)}
                          className={`p-3 rounded-xs border text-left transition-all cursor-pointer ${
                            active
                              ? 'bg-[rgba(224,208,171,0.18)] border-[#e0d0ab] text-[#e8e0cf]'
                              : 'bg-[rgba(11,61,120,0.15)] border-[rgba(19,108,153,0.3)] text-[#9fb0c8]'
                          }`}
                        >
                          <p className="font-serif text-xs font-bold text-[#e8e0cf]">{m.label}</p>
                          <p className="text-[10px] font-mono text-[#0194a8] mt-0.5">{m.sub}</p>
                          <p className="text-[10px] text-[#8fa2bd] mt-1 leading-tight">{m.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Daily Reading Commitment */}
                <div className="space-y-2">
                  <label className="block text-xs font-sans text-[#8fa2bd] font-medium uppercase tracking-wider">
                    Daily Intelligence Reading Bandwidth
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { mins: 4 as const, label: '4-Min Quick Signal', desc: 'Core Cabinet decisions & policy metrics' },
                      { mins: 7 as const, label: '7-Min Standard Brief', desc: '10 distilled dispatches with prelims anchors' },
                      { mins: 15 as const, label: '15-Min Forensic Study', desc: 'Verbatim primary citations & mains framing' }
                    ].map((r) => {
                      const active = dailyReadingMins === r.mins;
                      return (
                        <button
                          key={r.mins}
                          type="button"
                          onClick={() => setDailyReadingMins(r.mins)}
                          className={`p-3 rounded-xs border text-left transition-all cursor-pointer ${
                            active
                              ? 'bg-[rgba(224,208,171,0.18)] border-[#e0d0ab] text-[#e8e0cf]'
                              : 'bg-[rgba(11,61,120,0.15)] border-[rgba(19,108,153,0.3)] text-[#9fb0c8]'
                          }`}
                        >
                          <p className="font-serif text-xs font-bold text-[#e8e0cf]">{r.label}</p>
                          <p className="text-[10px] text-[#8fa2bd] mt-1 leading-tight">{r.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 5 Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[rgba(19,108,153,0.3)]">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="text-xs text-[#8fa2bd] hover:text-[#e0d0ab] transition-colors cursor-pointer"
                  >
                    &larr; Back
                  </button>
                  <motion.button
                    type="button"
                    onClick={() => setStep(6)}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-sans font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
                  >
                    <span>Proceed to Protocol Oath</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* ── STEP 6: FOUNDATIONAL PROTOCOL OATH ── */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {step === 6 && (
              <motion.div
                key="step-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <h2 className="font-serif text-2xl font-bold text-[#e0d0ab] tracking-tight">
                    The Tark Protocol Induction
                  </h2>
                  <p className="text-xs sm:text-sm text-[#9fb0c8]">
                    Tark is a sterile, zero-noise analytical instrument. We ask for your operational commitment:
                  </p>
                </div>

                {/* Covenant Cards */}
                <div className="space-y-2.5 bg-[rgba(3,16,38,0.75)] border border-[rgba(19,108,153,0.35)] rounded-xs p-3.5 text-xs font-sans">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#e8e0cf]">Zero Fluff &bull; Verbatim Primary Sources</span>
                      <p className="text-[#9fb0c8] text-[11px] mt-0.5">
                        I will prioritize primary government notifications and canonical empirical texts over coaching summaries.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#e8e0cf]">Zero-Trust Server Evaluation (+2.00 / -0.66)</span>
                      <p className="text-[#9fb0c8] text-[11px] mt-0.5">
                        I will test my retention under timed conditions and use AI autopsies to isolate cognitive traps.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#e8e0cf]">
                        Daily Analytical Cadence ({dailyMcqTarget} MCQs &bull; {selectedOptional.shortName} Track)
                      </span>
                      <p className="text-[#9fb0c8] text-[11px] mt-0.5">
                        I will hold myself to consistent daily calibration for the {countdown.label} cycle ({countdown.daysRemaining} days remaining).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pledge Checkbox */}
                <label
                  onClick={() => setPledged(!pledged)}
                  className="flex items-center gap-3 p-3 rounded-xs bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.4)] cursor-pointer select-none"
                >
                  <div
                    className={`w-5 h-5 rounded-xs border flex items-center justify-center shrink-0 ${
                      pledged
                        ? 'bg-[#e0d0ab] border-[#e0d0ab] text-[#072e63]'
                        : 'border-[rgba(19,108,153,0.5)]'
                    }`}
                  >
                    {pledged && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className="text-xs text-[#e8e0cf] font-medium">
                    I accept the Tark Candidate Protocol and am prepared to enter the testing arena.
                  </span>
                </label>

                {/* Step 6 Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[rgba(19,108,153,0.3)]">
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="text-xs text-[#8fa2bd] hover:text-[#e0d0ab] transition-colors cursor-pointer"
                  >
                    &larr; Back
                  </button>
                  <motion.button
                    type="button"
                    onClick={handleFinish}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-sans font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
                  >
                    <span>Seal Protocol &amp; Enter Chamber</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
