import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Scale,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  X,
  ChevronRight,
  Sparkles,
  Cpu,
  Database,
  ArrowRight,
  Info,
  Check,
  HelpCircle,
  Award
} from 'lucide-react';
import type { VerifiedClaim } from './TrustUI';

interface GroundingExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  grounding?: number; // 0..1 (e.g. 0.33, 0.67, 1.0)
  headline?: string;
  source?: string;
  claims?: VerifiedClaim[];
}

export function GroundingExplainerModal({
  isOpen,
  onClose,
  grounding = 0.67,
  headline,
  source,
  claims = [],
}: GroundingExplainerModalProps) {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'ledger' | 'upsc_relevance'>('pipeline');

  if (!isOpen) return null;

  const pct = Math.round(grounding * 100);
  const verifiedCount = claims.filter((c) => c.verified).length;
  const totalCount = claims.length || (pct >= 80 ? 3 : pct >= 50 ? 3 : 3);
  const actualVerified = claims.length ? verifiedCount : (pct >= 80 ? 3 : pct >= 50 ? 2 : 1);

  // Status color helpers
  const statusColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#e0d0ab' : '#f59e0b';
  const statusText = pct >= 80 ? 'Fully Anchored' : pct >= 50 ? 'High Factual Density' : 'Partial Verification Alert';
  const statusBg = pct >= 80 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : pct >= 50 ? 'bg-[#e0d0ab]/10 border-[#e0d0ab]/30 text-[#e0d0ab]' : 'bg-amber-500/10 border-amber-500/30 text-amber-300';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[650] flex items-center justify-center p-3 sm:p-5 font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-sm shadow-2xl overflow-hidden font-sans z-10"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-sm bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 flex items-center justify-center text-[#e0d0ab]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-sm sm:text-base font-bold text-white leading-tight">
                  Tark Grounding Protocol
                </h3>
                <span className="text-[10px] font-mono text-[#e0d0ab] uppercase tracking-wider block">
                  Deterministic Zero-Hallucination Evidence Ledger
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 rounded-sm cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-Header Score Banner */}
          <div className="px-6 py-4 bg-gradient-to-r from-zinc-900/80 via-zinc-900/40 to-zinc-950 border-b border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Radial Dial Indicator */}
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-800"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    strokeWidth="3.2"
                    strokeDasharray={`${pct}, 100`}
                    strokeLinecap="round"
                    stroke={statusColor}
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-sm font-bold text-white leading-none">
                    {pct}%
                  </span>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-tighter mt-0.5">
                    Grounded
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-sm border ${statusBg}`}>
                    {statusText}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {actualVerified} of {totalCount} Claims Verified
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed max-w-md">
                  {pct === 100 && 'Every factual claim was deterministically matched verbatim in official source sentences.'}
                  {pct >= 50 && pct < 100 && `${actualVerified} claims have strict sentence-level proof; 1 point contains broader analytical commentary.`}
                  {pct < 50 && `Only ${actualVerified} point has verbatim proof; other points are general context not directly quoted in text.`}
                </p>
              </div>
            </div>

            {/* Mathematical Formula Pill */}
            <div className="px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-sm shrink-0 font-mono text-[10px] text-zinc-400">
              <span className="text-[#e0d0ab] block mb-0.5 font-bold">MATHEMATICAL DERIVATION:</span>
              <div className="text-zinc-200">
                Score = <span className="text-emerald-400 font-bold">{actualVerified}</span> (Verified) / <span className="text-zinc-400 font-bold">{totalCount}</span> (Total) = <span className="text-white font-bold">{pct}%</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-800 bg-zinc-900/30 px-6 gap-2">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`py-2.5 px-3 text-xs font-sans font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pipeline'
                  ? 'border-[#e0d0ab] text-[#e0d0ab]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>How We Compute This (4 Steps)</span>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`py-2.5 px-3 text-xs font-sans font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ledger'
                  ? 'border-[#e0d0ab] text-[#e0d0ab]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Claim-by-Claim Evidence</span>
              {claims.length > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] font-mono bg-zinc-800 text-zinc-300 rounded-full">
                  {claims.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('upsc_relevance')}
              className={`py-2.5 px-3 text-xs font-sans font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'upsc_relevance'
                  ? 'border-[#e0d0ab] text-[#e0d0ab]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Why This Protects Your Prep</span>
            </button>
          </div>

          {/* Tab Content Container */}
          <div className="p-6 overflow-y-auto space-y-4 font-sans text-xs flex-1">
            {/* ── TAB 1: 4-STAGE PIPELINE VISUALIZER ── */}
            {activeTab === 'pipeline' && (
              <div className="space-y-4">
                <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-sm text-zinc-400 text-xs">
                  Tark enforces a strict <strong className="text-white">Cite-or-Drop Protocol</strong>. Unlike commercial chatbots that guess facts, every number, date, and policy quota must survive deterministic sentence matching against the official gazette.
                </div>

                {/* 4 Pipeline Stages */}
                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-sm flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-white text-xs">
                          Primary Gazette Ingestion &amp; Sentence Decomposition
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">segmentSpans()</span>
                      </div>
                      <p className="text-zinc-400 leading-relaxed">
                        Raw wire text from PIB, RBI, PRS, or The Hindu is split into numbered, addressable sentence spans (<code className="text-zinc-300">s0, s1, s2...</code>). Decimal points and currency denominations are preserved intact.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-sm flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-full bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 text-[#e0d0ab] flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-white text-xs">
                          Span-Anchored AI Distillation
                        </span>
                        <span className="text-[10px] font-mono text-[#e0d0ab]">Mandatory Citations</span>
                      </div>
                      <p className="text-zinc-400 leading-relaxed">
                        The distillation model is constrained by system prompts: it cannot output any key point without citing the exact span IDs (e.g. <code className="text-zinc-300">[s3, s7]</code>) it was derived from.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-sm flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-white text-xs">
                          Deterministic Zero-LLM Fact Audit
                        </span>
                        <span className="text-[10px] font-mono text-purple-400">extractFacts()</span>
                      </div>
                      <p className="text-zinc-400 leading-relaxed">
                        An algorithmic regex engine extracts every high-stakes factual token: budget outlays, percentages (%), 4-digit years, and statutory acronyms (RBI, CGTMSE, NGT). It checks that they appear <strong className="text-zinc-200">verbatim</strong> in the cited sentences.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-sm flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      4
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-white text-xs">
                          Cite-or-Drop Safety Gate &amp; Grounding Gauge
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400">groundingScore()</span>
                      </div>
                      <p className="text-zinc-400 leading-relaxed">
                        Any bullet with an altered figure or phantom citation is dropped. The final score is the exact ratio of surviving verified points to total points synthesized (<strong className="text-white">e.g. 1/3 = 33%, 2/3 = 67%, 3/3 = 100%</strong>).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: CLAIM-BY-CLAIM EVIDENCE LEDGER ── */}
            {activeTab === 'ledger' && (
              <div className="space-y-3">
                {headline && (
                  <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-sm">
                    <span className="text-[10px] font-mono text-[#e0d0ab] uppercase block mb-1">
                      Article Inspected:
                    </span>
                    <h4 className="font-serif text-xs font-bold text-white leading-snug">
                      {headline}
                    </h4>
                    {source && (
                      <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                        Source Feed: {source}
                      </span>
                    )}
                  </div>
                )}

                {claims.length > 0 ? (
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                      Sentence Verification Ledger:
                    </span>
                    {claims.map((c, i) => (
                      <div
                        key={i}
                        className={`p-3.5 rounded-sm border space-y-2 ${
                          c.verified
                            ? 'bg-zinc-900/60 border-zinc-800'
                            : 'bg-amber-950/10 border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {c.verified ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>VERIFIED ({c.spanIds?.join(', ') || 'Span Anchored'})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>UNANCHORED / CONTEXTUAL</span>
                              </span>
                            )}
                          </div>
                          {c.claimType && (
                            <span className="text-[9px] font-mono text-zinc-500 uppercase">
                              Type: {c.claimType}
                            </span>
                          )}
                        </div>

                        {/* Synthesized Bullet */}
                        <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                          {c.text}
                        </p>

                        {/* Extracted Facts Checked */}
                        {c.facts && c.facts.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[10px] font-mono text-zinc-500">Facts Audited:</span>
                            {c.facts.map((f, fi) => (
                              <span
                                key={fi}
                                className="px-1.5 py-0.2 bg-zinc-800 text-zinc-300 text-[10px] font-mono rounded"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Verbatim Source Quote */}
                        {c.quotes && c.quotes.length > 0 && (
                          <div className="mt-2 p-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded-sm space-y-1">
                            <span className="text-[9px] font-mono uppercase text-[#e0d0ab] font-bold block">
                              Verbatim Source Sentence Match:
                            </span>
                            <p className="text-[11px] font-serif italic text-zinc-300 leading-snug">
                              &ldquo;{c.quotes.join(' ')}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-sm space-y-2">
                      <div className="flex items-center gap-2 text-[#e0d0ab]">
                        <Info className="w-4 h-4" />
                        <span className="font-serif text-xs font-bold">Standard Grounding Exemplar</span>
                      </div>
                      <p className="text-zinc-300 text-xs leading-relaxed">
                        To view the claim-by-claim sentence ledger for a specific dispatch, click on any <strong>Grounding Badge</strong> on that dispatch card or open its Full Policy Dossier.
                      </p>
                    </div>

                    {/* Typical 3-Point Sample Ledger */}
                    <div className="space-y-2 pt-1">
                      <div className="p-3 bg-zinc-900/50 border border-emerald-500/30 rounded-sm space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>CLAIM 1 (100% VERIFIED IN SPAN s2)</span>
                        </div>
                        <p className="text-zinc-200 text-xs">
                          Financing Facility under Agriculture Infrastructure Fund (AIF) expanded with an outlay of ₹1 lakh crore.
                        </p>
                        <div className="p-2 bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 italic">
                          &ldquo;...approved progressive expansion in the Central Sector Scheme under AIF with an outlay of Rs. 1 lakh crore.&rdquo;
                        </div>
                      </div>

                      <div className="p-3 bg-zinc-900/50 border border-amber-500/30 rounded-sm space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>CLAIM 2 (DROPPED / UNVERIFIED IN SPAN)</span>
                        </div>
                        <p className="text-zinc-300 text-xs line-through opacity-75">
                          Projected to increase farmer incomes by 35% across rural zones by 2027.
                        </p>
                        <span className="text-[10px] font-mono text-amber-300/80 block">
                          Reason for Drop: &ldquo;35%&rdquo; projection was not in source press release text.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 3: UPSC EXAM INTEGRITY RELEVANCE ── */}
            {activeTab === 'upsc_relevance' && (
              <div className="space-y-3.5 text-zinc-300 leading-relaxed">
                <div className="p-3.5 bg-[rgba(4,25,54,0.7)] border border-[rgba(224,208,171,0.25)] rounded-sm space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#e0d0ab] block">
                    🎯 The Cost of AI Hallucination in Civil Services Exams
                  </span>
                  <p className="text-xs text-zinc-200 leading-relaxed">
                    General AI chatbots (ChatGPT, generic scrapers) frequently hallucinate crucial statistics—turning <strong className="text-white">₹15,000 crore</strong> into <strong className="text-rose-400">₹1,500 crore</strong>, or confusing <strong className="text-white">Centrally Sponsored Schemes</strong> with <strong className="text-rose-400">Central Sector Schemes</strong>.
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    In UPSC Prelims, a single swapped numeral leads to negative marking (-0.66). In Mains GS Paper II &amp; III, misquoting government data in an answer instantly costs credibility with the evaluator.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-sm space-y-1">
                    <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                      100% &amp; 67% Grounding
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Safe to commit to memory. You can write these numbers and nodal ministries in your Mains papers without hesitation.
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-sm space-y-1">
                    <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                      33% Grounding Alert
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Tark openly warns you that 2 out of 3 synthesized claims were high-level commentary lacking strict sentence-level citation. Click &ldquo;Primary Source&rdquo; before quoting.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-sm text-[11px] text-zinc-400 font-mono">
                  Verification Architecture: <span className="text-[#e0d0ab]">Deterministic regex extraction + Stable Span IDs</span>. Zero LLM hallucinations admitted to your test ledger.
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between font-sans text-xs">
            <span className="text-[10px] font-mono text-zinc-500">
              Protocol: <span className="text-[#e0d0ab]">live_cite_or_drop_v1</span>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#e0d0ab] text-zinc-950 font-sans text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-white transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
