import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Check,
  X,
  Sparkles,
  ArrowRight,
  AlertCircle,
  FileText,
  Lock,
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
  // Candidate can toggle between 3 intuitive levels: 100%, 67%, 33%
  const [activeLevel, setActiveLevel] = useState<100 | 67 | 33>(
    grounding >= 0.85 ? 100 : grounding >= 0.5 ? 67 : 33
  );

  if (!isOpen) return null;

  const levelData = {
    100: {
      score: '100%',
      verified: 3,
      total: 3,
      tag: 'Fully Anchored',
      color: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.15)',
      summary: 'All 3 points found verbatim in the official government release.',
      claim1: { text: 'AIF financing facility expanded with ₹1 lakh crore outlay.', ok: true, source: 'PIB Span s2' },
      claim2: { text: '3% per annum interest subvention provided for loans up to ₹2 crore.', ok: true, source: 'PIB Span s5' },
      claim3: { text: 'Credit guarantee coverage available under CGTMSE scheme.', ok: true, source: 'PIB Span s8' },
    },
    67: {
      score: '67%',
      verified: 2,
      total: 3,
      tag: 'High Factual Density',
      color: '#06b6d4',
      bgGlow: 'rgba(6, 182, 212, 0.15)',
      summary: '2 points verified in official release; 1 hallucinated point dropped.',
      claim1: { text: 'AIF financing facility expanded with ₹1 lakh crore outlay.', ok: true, source: 'PIB Span s2' },
      claim2: { text: 'Projected to increase farmer incomes by 35% by 2027.', ok: false, reason: 'Dropped: "35%" figure was absent from official text.' },
      claim3: { text: 'Convergence permitted with existing Central Sector schemes.', ok: true, source: 'PIB Span s6' },
    },
    33: {
      score: '33%',
      verified: 1,
      total: 3,
      tag: 'Contested Alert',
      color: '#f59e0b',
      bgGlow: 'rgba(245, 158, 11, 0.15)',
      summary: 'Only 1 point verified; 2 unbacked claims intercepted and quarantined.',
      claim1: { text: 'Commerce Ministry launches initiative to decentralize exports.', ok: true, source: 'PIB Span s1' },
      claim2: { text: 'Allocated ₹50,000 crore dedicated grant for coastal corridors.', ok: false, reason: 'Dropped: Phantom allocation invented by web scraper.' },
      claim3: { text: 'Mandatory compliance deadline imposed on state export councils by Q3.', ok: false, reason: 'Dropped: Press release states scheme is voluntary.' },
    },
  }[activeLevel];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[650] flex items-center justify-center p-4 sm:p-6 font-sans">
        {/* Soft Minimal Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#020712]/80 backdrop-blur-xl"
        />

        {/* Clean, De-cluttered Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xl bg-[#040d1a] border border-white/10 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden font-sans z-10 p-6 sm:p-8 space-y-6"
        >
          {/* 1. Header (Clean & Direct) */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 flex items-center justify-center text-[#e0d0ab] shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-serif font-bold text-white tracking-tight">
                  How Grounding Works
                </h2>
                <p className="text-xs text-zinc-400">
                  Zero-hallucination verification for competitive exam prep.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2. The Core Logic (Intuitive Visual Formula) */}
          <div className="p-4 sm:p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Deterministic Mathematical Formula:</span>
              <div className="flex items-center gap-1.5">
                {[100, 67, 33].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setActiveLevel(lvl as any)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
                      activeLevel === lvl
                        ? 'bg-[#e0d0ab] text-[#051124] font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white bg-white/5'
                    }`}
                  >
                    {lvl}%
                  </button>
                ))}
              </div>
            </div>

            {/* Kinetic Fraction Row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-white">
                  {levelData.verified}
                </span>
                <span className="text-xs text-emerald-400 font-medium leading-tight">
                  Verified<br />Sentences
                </span>
                <span className="text-lg text-zinc-500 font-mono">÷</span>
                <span className="text-2xl sm:text-3xl font-mono font-bold text-zinc-400">
                  {levelData.total}
                </span>
                <span className="text-xs text-zinc-400 font-medium leading-tight">
                  Total<br />Claims
                </span>
              </div>

              <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                <span className="text-xs text-zinc-400">=</span>
                <motion.span
                  key={levelData.score}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl sm:text-3xl font-mono font-bold"
                  style={{ color: levelData.color }}
                >
                  {levelData.score}
                </motion.span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
                  style={{ backgroundColor: levelData.bgGlow, color: levelData.color }}
                >
                  {levelData.tag}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed pt-1">
              {levelData.summary}
            </p>
          </div>

          {/* 3. Live Sentence Verification (Real Exam Example) */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold block">
              Audited Propositions for this Brief:
            </span>

            <div className="space-y-2">
              {/* Claim 1 */}
              <div className="p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <p className="text-xs text-zinc-200 font-medium leading-relaxed">
                    {levelData.claim1.text}
                  </p>
                  <span className="text-[10px] font-mono text-emerald-400/90 block">
                    Verified in {levelData.claim1.source}
                  </span>
                </div>
              </div>

              {/* Claim 2 */}
              <div
                className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                  levelData.claim2.ok
                    ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                    : 'bg-rose-500/[0.05] border-rose-500/25'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    levelData.claim2.ok
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {levelData.claim2.ok ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    <X className="w-3 h-3 stroke-[3]" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <p
                    className={`text-xs leading-relaxed ${
                      levelData.claim2.ok
                        ? 'text-zinc-200 font-medium'
                        : 'text-zinc-400 line-through opacity-75'
                    }`}
                  >
                    {levelData.claim2.text}
                  </p>
                  <span
                    className={`text-[10px] font-mono block ${
                      levelData.claim2.ok ? 'text-emerald-400/90' : 'text-rose-400'
                    }`}
                  >
                    {levelData.claim2.ok
                      ? `Verified in ${levelData.claim2.source}`
                      : levelData.claim2.reason}
                  </span>
                </div>
              </div>

              {/* Claim 3 */}
              <div
                className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                  levelData.claim3.ok
                    ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                    : 'bg-rose-500/[0.05] border-rose-500/25'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    levelData.claim3.ok
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {levelData.claim3.ok ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    <X className="w-3 h-3 stroke-[3]" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <p
                    className={`text-xs leading-relaxed ${
                      levelData.claim3.ok
                        ? 'text-zinc-200 font-medium'
                        : 'text-zinc-400 line-through opacity-75'
                    }`}
                  >
                    {levelData.claim3.text}
                  </p>
                  <span
                    className={`text-[10px] font-mono block ${
                      levelData.claim3.ok ? 'text-emerald-400/90' : 'text-rose-400'
                    }`}
                  >
                    {levelData.claim3.ok
                      ? `Verified in ${levelData.claim3.source}`
                      : levelData.claim3.reason}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Why This Protects Your UPSC Prep (Minimal & High Impact) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1">
              <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider block">
                Generic AI Digests
              </span>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Hallucinates numbers &amp; deadlines. Swapping ₹15,000 Cr with ₹1,500 Cr causes -0.66 Prelims penalties.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20 space-y-1">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                Tark Grounded Wire
              </span>
              <p className="text-[11px] text-zinc-300 leading-snug">
                Auto-drops unbacked claims. Every number is verbatim verified and safe to cite in Mains GS papers.
              </p>
            </div>
          </div>

          {/* 5. Minimal Single-Action Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
            <span className="text-[10px] font-mono text-zinc-500">
              Protocol: <span className="text-[#e0d0ab]">live_cite_or_drop_v2</span>
            </span>

            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#e0d0ab] hover:bg-white text-[#051124] text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Understood
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
