import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertOctagon,
  Award,
  Sparkles,
  FileText,
  RotateCcw,
} from 'lucide-react';
import type { VerifiedClaim } from './TrustUI';

interface GroundingExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  grounding?: number;
  headline?: string;
  source?: string;
  claims?: VerifiedClaim[];
}

export function GroundingExplainerModal({
  isOpen,
  onClose,
  grounding = 0.67,
}: GroundingExplainerModalProps) {
  // Step in the animated explanation: 1 -> 2 -> 3 -> 4
  const [step, setStep] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'animated' | 'summary'>('animated');

  if (!isOpen) return null;

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[650] flex items-center justify-center p-4 sm:p-6 font-sans">
        {/* Luminous Tark Chamber Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[rgba(3,16,38,0.78)] backdrop-blur-md"
        />

        {/* Tark Chamber Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-gradient-to-b from-[#072e63] via-[#041d40] to-[#041936] border border-[#136c99]/50 rounded-sm shadow-[0_25px_80px_rgba(4,29,64,0.7),0_0_40px_rgba(19,108,153,0.25)] overflow-hidden font-sans z-10 flex flex-col"
        >
          {/* ── 1. Header Bar ── */}
          <div className="px-6 py-4.5 border-b border-[#136c99]/40 flex items-center justify-between bg-[#041936]/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 flex items-center justify-center text-[#e0d0ab] shadow-inner">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-white leading-tight">
                  How Grounding Works
                </h3>
                <p className="text-xs text-[#9fb0c8]">
                  Zero-hallucination factual proof for civil services exam prep.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'animated' ? 'summary' : 'animated')}
                className="px-3 py-1 text-xs font-mono text-[#e0d0ab] hover:text-white bg-[#0b3d78]/40 hover:bg-[#0b3d78]/70 rounded-xs border border-[#136c99]/40 transition-colors cursor-pointer"
              >
                {viewMode === 'animated' ? 'View Summary' : 'Watch Story'}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-[#9fb0c8] hover:text-white transition-colors rounded-xs hover:bg-[#0b3d78]/50 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── 2. Progress Stepper Bar ── */}
          {viewMode === 'animated' && (
            <div className="px-6 pt-4 pb-2.5 border-b border-[#136c99]/30 bg-[#041936]/40">
              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { num: 1, label: '1. Raw Draft' },
                  { num: 2, label: '2. Source Scan' },
                  { num: 3, label: '3. Filter Gate' },
                  { num: 4, label: '4. 67% Score' },
                ].map((s) => (
                  <button
                    key={s.num}
                    onClick={() => setStep(s.num)}
                    className="flex flex-col gap-1.5 text-left cursor-pointer group"
                  >
                    <div className="w-full h-1.5 rounded-full bg-[#041936] border border-[#136c99]/30 overflow-hidden">
                      <motion.div
                        className="h-full bg-[#e0d0ab] shadow-[0_0_8px_#e0d0ab]"
                        initial={{ width: 0 }}
                        animate={{ width: step >= s.num ? '100%' : '0%' }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-mono transition-colors ${
                        step === s.num
                          ? 'text-[#e0d0ab] font-bold'
                          : step > s.num
                          ? 'text-white'
                          : 'text-[#8fa2bd]'
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── 3. Step Content Area (Luminous & Legible) ── */}
          <div className="p-6 sm:p-7 overflow-y-auto max-h-[62vh] space-y-5 flex-1">
            {viewMode === 'summary' ? (
              /* ── Direct Full Summary View ── */
              <div className="space-y-4">
                <div className="p-4 rounded-sm bg-[rgba(4,25,54,0.7)] border border-[rgba(19,108,153,0.45)] space-y-2">
                  <span className="text-xs font-mono font-bold text-[#e0d0ab] uppercase tracking-wider block">
                    Mathematical Proof Formula:
                  </span>
                  <div className="text-sm text-zinc-100">
                    <strong className="text-emerald-400 font-mono text-base">2 Verified Sentences</strong> ÷{' '}
                    <strong className="text-white font-mono text-base">3 Proposed Claims</strong> ={' '}
                    <strong className="text-[#e0d0ab] font-mono text-lg font-bold">67% Grounding Score</strong>
                  </div>
                  <p className="text-xs text-[#9fb0c8] leading-relaxed">
                    2 claims matched verbatim in the government gazette. 1 claim with an unbacked figure was purged.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <span className="text-xs font-mono text-[#9fb0c8] uppercase tracking-wider block">
                    Audited Propositions:
                  </span>

                  <div className="p-3.5 rounded-sm bg-[rgba(16,185,129,0.08)] border border-emerald-400/35 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Claim 1: VERIFIED VERBATIM (Span s2)</span>
                    </div>
                    <p className="text-sm text-white font-medium">
                      Financing Facility under AIF expanded with ₹1 lakh crore outlay.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-sm bg-[rgba(225,78,78,0.08)] border border-rose-400/35 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-rose-400 font-bold">
                      <AlertOctagon className="w-4 h-4" />
                      <span>Claim 2: DROPPED &amp; QUARANTINED</span>
                    </div>
                    <p className="text-sm text-zinc-300 line-through">
                      Projected to increase farmer incomes by 35% by 2027.
                    </p>
                    <span className="text-xs font-mono text-rose-300 block">
                      Reason: The &ldquo;35%&rdquo; statistic was absent from the official PIB press release text.
                    </span>
                  </div>

                  <div className="p-3.5 rounded-sm bg-[rgba(16,185,129,0.08)] border border-emerald-400/35 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Claim 3: VERIFIED VERBATIM (Span s6)</span>
                    </div>
                    <p className="text-sm text-white font-medium">
                      Convergence permitted with existing Central Sector schemes.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Animated Step-by-Step Walkthrough ── */
              <AnimatePresence mode="wait">
                {/* ── STEP 1: The Raw Draft ── */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div>
                      <span className="text-xs font-mono text-[#e0d0ab] font-bold uppercase tracking-wider block mb-1">
                        Step 1: The Raw Draft
                      </span>
                      <h4 className="text-lg font-serif font-bold text-white">
                        An AI model drafts 3 bullet points from today&apos;s news
                      </h4>
                      <p className="text-sm text-[#9fb0c8] mt-1 leading-relaxed">
                        Generic coaching apps publish AI output immediately without verification. But can you trust every number when preparing for UPSC?
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {[
                        { num: 1, text: 'AIF financing facility expanded with ₹1 lakh crore outlay.' },
                        { num: 2, text: 'Projected to increase farmer incomes by 35% across rural zones by 2027.' },
                        { num: 3, text: 'Convergence permitted with existing Central Sector schemes.' },
                      ].map((item) => (
                        <div
                          key={item.num}
                          className="p-3.5 rounded-sm bg-[rgba(4,25,54,0.7)] border border-[rgba(19,108,153,0.4)] flex items-start gap-3"
                        >
                          <span className="w-6 h-6 rounded-sm bg-[#0b3d78] text-[#e0d0ab] font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-[#136c99]/50">
                            {item.num}
                          </span>
                          <p className="text-sm text-white font-medium leading-relaxed">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-sm bg-[#0b3d78]/30 border border-[#e0d0ab]/30 text-xs text-[#e0d0ab] flex items-center gap-2">
                      <Search className="w-4 h-4 shrink-0 text-[#e0d0ab]" />
                      <span>Tark never publishes this draft until each bullet is tested against the official gazette.</span>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 2: The Source Scan ── */}
                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div>
                      <span className="text-xs font-mono text-[#0194a8] font-bold uppercase tracking-wider block mb-1">
                        Step 2: The Source Scan
                      </span>
                      <h4 className="text-lg font-serif font-bold text-white">
                        Every single sentence is scanned against the official release
                      </h4>
                      <p className="text-sm text-[#9fb0c8] mt-1 leading-relaxed">
                        Tark breaks the official PIB document into numbered sentences and runs an exact token match on all figures, schemes, and quotas.
                      </p>
                    </div>

                    <div className="p-4 rounded-sm bg-[rgba(4,25,54,0.85)] border border-[#136c99]/50 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between text-xs font-mono text-[#9fb0c8]">
                        <span className="flex items-center gap-1.5 text-[#e0d0ab] font-bold">
                          <FileText className="w-4 h-4 text-[#e0d0ab]" />
                          Primary Government Release (Span s2)
                        </span>
                        <span className="text-emerald-400 font-bold">100% Match Found</span>
                      </div>

                      <div className="p-3.5 rounded-sm bg-[rgba(16,185,129,0.1)] border border-emerald-400/40 text-sm font-serif italic text-emerald-100 leading-relaxed">
                        &ldquo;...approved progressive expansion in the Central Sector Scheme under AIF with an{' '}
                        <mark className="bg-emerald-400 text-[#041936] px-1.5 py-0.5 rounded font-bold not-italic">
                          outlay of Rs. 1 lakh crore
                        </mark>
                        .&rdquo;
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#9fb0c8] pt-1">
                        <span>Draft Claim: Outlay of ₹1 lakh crore</span>
                        <span className="font-mono text-emerald-400 font-bold">✓ Confirmed in Gazette</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#9fb0c8] leading-relaxed">
                      Now watch what happens when we scan Claim 2 in the next step...
                    </p>
                  </motion.div>
                )}

                {/* ── STEP 3: The Filter Gate ── */}
                {step === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div>
                      <span className="text-xs font-mono text-[#e0d0ab] font-bold uppercase tracking-wider block mb-1">
                        Step 3: The Cite-or-Drop Filter
                      </span>
                      <h4 className="text-lg font-serif font-bold text-white">
                        Verifying true facts &amp; purging hallucinated statistics
                      </h4>
                      <p className="text-sm text-[#9fb0c8] mt-1 leading-relaxed">
                        Notice how Claim 2 contained a fake &ldquo;35%&rdquo; figure. Tark intercepts it so you never write incorrect data in UPSC.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {/* Claim 1: Verified */}
                      <div className="p-3.5 rounded-sm bg-[rgba(16,185,129,0.08)] border border-emerald-400/35 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-sm bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-emerald-400 font-bold uppercase">
                              Claim 1 — Verified
                            </span>
                            <span className="text-[10px] font-mono text-[#8fa2bd]">PIB Span s2</span>
                          </div>
                          <p className="text-sm text-white font-medium">
                            AIF financing facility expanded with ₹1 lakh crore outlay.
                          </p>
                        </div>
                      </div>

                      {/* Claim 2: Hallucination Intercepted */}
                      <div className="p-3.5 rounded-sm bg-[rgba(225,78,78,0.08)] border border-rose-400/40 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-sm bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-rose-400 font-bold uppercase">
                              Claim 2 — Hallucination Intercepted &amp; Dropped
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300 line-through opacity-80">
                            Projected to increase farmer incomes by 35% by 2027.
                          </p>
                          <div className="p-2 rounded-xs bg-[rgba(4,25,54,0.9)] border border-rose-400/30 text-xs font-mono text-rose-300">
                            <strong>Interception Reason:</strong> The figure &ldquo;35%&rdquo; was invented by the AI and does not appear in the government text.
                          </div>
                        </div>
                      </div>

                      {/* Claim 3: Verified */}
                      <div className="p-3.5 rounded-sm bg-[rgba(16,185,129,0.08)] border border-emerald-400/35 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-sm bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-emerald-400 font-bold uppercase">
                              Claim 3 — Verified
                            </span>
                            <span className="text-[10px] font-mono text-[#8fa2bd]">PIB Span s6</span>
                          </div>
                          <p className="text-sm text-white font-medium">
                            Convergence permitted with existing Central Sector schemes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 4: The 67% Score & Exam Protection ── */}
                {step === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <div>
                      <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                        Step 4: The Mathematical Result
                      </span>
                      <h4 className="text-lg font-serif font-bold text-white">
                        2 out of 3 claims passed verification = 67% Grounded
                      </h4>
                      <p className="text-sm text-[#9fb0c8] mt-1 leading-relaxed">
                        This is why you see the <strong className="text-[#0194a8] font-mono">67% Grounded</strong> badge on this news card.
                      </p>
                    </div>

                    {/* Clean Score Card */}
                    <div className="p-5 rounded-sm bg-[rgba(4,25,54,0.85)] border border-[#136c99]/50 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-mono text-[#e0d0ab] uppercase tracking-wider font-bold">
                          Mathematical Grounding Index
                        </span>
                        <div className="text-base text-zinc-200">
                          <strong className="text-emerald-400 font-mono text-xl font-bold">2 Verified</strong> ÷{' '}
                          <strong className="text-zinc-300 font-mono text-xl font-bold">3 Total</strong> ={' '}
                          <strong className="text-[#e0d0ab] font-mono text-2xl font-bold">67%</strong>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-3 py-1 rounded-xs text-xs font-mono font-bold bg-[#0b3d78] text-[#e0d0ab] border border-[#136c99]/60">
                          High Factual Density
                        </span>
                      </div>
                    </div>

                    {/* UPSC Exam Guarantee */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-sm bg-[rgba(225,78,78,0.08)] border border-rose-400/30 space-y-1">
                        <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider block">
                          Without Grounding
                        </span>
                        <p className="text-xs text-[#9fb0c8] leading-relaxed">
                          Swapping ₹15,000 Cr with ₹1,500 Cr leads to <strong className="text-rose-300">-0.66 Prelims negative marks</strong>.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-sm bg-[rgba(16,185,129,0.08)] border border-emerald-400/30 space-y-1">
                        <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                          With Tark Grounding
                        </span>
                        <p className="text-xs text-zinc-200 leading-relaxed">
                          Every fact has a verbatim sentence citation. <strong className="text-emerald-300">Safe to quote in Mains GS papers</strong>.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* ── 4. Footer Actions ── */}
          <div className="px-6 py-4 border-t border-[#136c99]/40 flex items-center justify-between bg-[#041936]/80">
            {viewMode === 'animated' ? (
              <>
                <button
                  onClick={handlePrev}
                  disabled={step === 1}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-medium transition-colors ${
                    step === 1
                      ? 'text-zinc-600 cursor-not-allowed'
                      : 'text-[#9fb0c8] hover:text-white hover:bg-[#0b3d78]/40 cursor-pointer'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        step === i ? 'w-5 bg-[#e0d0ab]' : 'w-2 bg-[#136c99]/40 hover:bg-[#136c99]'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer shadow-sm"
                >
                  <span>{step === totalSteps ? 'Understood' : 'Next Step'}</span>
                  {step < totalSteps && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </>
            ) : (
              <div className="w-full flex items-center justify-between">
                <span className="text-xs font-mono text-[#9fb0c8]">
                  Protocol: <strong className="text-[#e0d0ab]">live_cite_or_drop_v2</strong>
                </span>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer shadow-sm"
                >
                  Understood
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
