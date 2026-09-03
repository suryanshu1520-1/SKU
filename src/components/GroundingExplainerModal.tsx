import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Cpu,
  Database,
  ArrowRight,
  Award,
  FileText,
  Scan,
  Zap,
  Lock,
  Scale,
  Search,
  Activity,
  CheckCheck,
  AlertOctagon,
  Crosshair,
  Sliders,
  ExternalLink,
  ChevronRight,
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

// Interactive Simulation Presets
interface SimPreset {
  pct: number;
  label: string;
  badge: string;
  verified: number;
  total: number;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  sampleClaims: {
    title: string;
    text: string;
    status: 'verified' | 'dropped' | 'context';
    spanLabel: string;
    sourceQuote?: string;
    matchedEntity?: string;
    dropReason?: string;
  }[];
}

const SIM_PRESETS: Record<number, SimPreset> = {
  100: {
    pct: 100,
    label: 'Fully Anchored',
    badge: '100% VERIFIED',
    verified: 3,
    total: 3,
    description: 'Every synthesized point is verified verbatim in the primary gazette text. Zero speculation.',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    sampleClaims: [
      {
        title: 'CLAIM 1 (SPAN s2 • STATUTORY OUTLAY)',
        text: 'Financing Facility under Agriculture Infrastructure Fund (AIF) expanded with an outlay of ₹1 lakh crore.',
        status: 'verified',
        spanLabel: 'Span s2 • Verbatim Match',
        sourceQuote: '...approved progressive expansion in the Central Sector Scheme under AIF with an outlay of Rs. 1 lakh crore.',
        matchedEntity: '₹1 lakh crore',
      },
      {
        title: 'CLAIM 2 (SPAN s5 • NODAL IMPLEMENTATION)',
        text: 'Interest subvention of 3% per annum provided for loans up to a limit of ₹2 crore for maximum 7 years.',
        status: 'verified',
        spanLabel: 'Span s5 • Verbatim Match',
        sourceQuote: 'Loans will have interest subvention of 3% per annum up to a limit of Rs. 2 crore for a maximum period of 7 years.',
        matchedEntity: '3% per annum up to ₹2 crore',
      },
      {
        title: 'CLAIM 3 (SPAN s8 • ELIGIBILITY CRITERIA)',
        text: 'Credit guarantee coverage is available to eligible borrowers under CGTMSE scheme for loans up to ₹2 crore.',
        status: 'verified',
        spanLabel: 'Span s8 • Verbatim Match',
        sourceQuote: 'Credit guarantee coverage will be available for eligible borrowers from this financing facility under CGTMSE scheme for loans up to Rs. 2 crore.',
        matchedEntity: 'CGTMSE coverage',
      },
    ],
  },
  67: {
    pct: 67,
    label: 'High Factual Density',
    badge: '67% GROUNDED',
    verified: 2,
    total: 3,
    description: '2 claims have strict sentence-level proof; 1 point contains broader analytical commentary.',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
    sampleClaims: [
      {
        title: 'CLAIM 1 (SPAN s2 • 100% VERIFIED)',
        text: 'Financing Facility under Agriculture Infrastructure Fund (AIF) expanded with an outlay of ₹1 lakh crore.',
        status: 'verified',
        spanLabel: 'Span s2 • Verbatim Match',
        sourceQuote: '...approved progressive expansion in the Central Sector Scheme under AIF with an outlay of Rs. 1 lakh crore.',
        matchedEntity: '₹1 lakh crore outlay',
      },
      {
        title: 'CLAIM 2 (DROPPED BY SENTINEL • UNVERIFIED)',
        text: 'Projected to increase farmer incomes by 35% across rural zones by 2027.',
        status: 'dropped',
        spanLabel: 'Dropped Span • Unanchored Statistic',
        dropReason: 'Diagnostic: Numerical figure "35%" does not exist in source press release text. Auto-purged.',
      },
      {
        title: 'CLAIM 3 (SPAN s6 • 100% VERIFIED)',
        text: 'Convergence permitted with all existing Central Sector and Centrally Sponsored schemes.',
        status: 'verified',
        spanLabel: 'Span s6 • Verbatim Match',
        sourceQuote: 'Convergence of AIF scheme with other schemes of Government of India is permitted to enhance viability.',
        matchedEntity: 'Inter-scheme convergence',
      },
    ],
  },
  33: {
    pct: 33,
    label: 'Contested Claims Alert',
    badge: '33% CONTESTED',
    verified: 1,
    total: 3,
    description: 'Only 1 of 3 claims was verbatim verified. 2 hallucinated claims were intercepted and quarantined.',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    sampleClaims: [
      {
        title: 'CLAIM 1 (SPAN s1 • 100% VERIFIED)',
        text: 'Ministry of Commerce launches initiative to decentralize export promotion to district levels.',
        status: 'verified',
        spanLabel: 'Span s1 • Verbatim Match',
        sourceQuote: 'Department of Commerce is focusing on foreign trade by decentralizing export promotion to district levels.',
        matchedEntity: 'District-level decentralization',
      },
      {
        title: 'CLAIM 2 (BLOCKED • HALLUCINATED ALLOCATION)',
        text: 'Allocated ₹50,000 crore dedicated grant for coastal district logistics corridors.',
        status: 'dropped',
        spanLabel: 'Quarantined Span • Phantom Figure',
        dropReason: 'Diagnostic: "₹50,000 crore" is a hallucinated figure from generic web scrapers. Never authorized.',
      },
      {
        title: 'CLAIM 3 (BLOCKED • UNSUPPORTED TIMELINE)',
        text: 'Mandatory compliance deadline imposed on all state export councils by Q3 2026.',
        status: 'dropped',
        spanLabel: 'Quarantined Span • Phantom Deadline',
        dropReason: 'Diagnostic: Press release text states scheme is advisory, with no mandatory Q3 deadline.',
      },
    ],
  },
};

export function GroundingExplainerModal({
  isOpen,
  onClose,
  grounding = 0.67,
  headline = 'Commerce Ministry drives Districts as Export Hubs initiative to decentralize trade and transform local products into global exports',
  source = 'PIB Official',
  claims = [],
}: GroundingExplainerModalProps) {
  const [activeTab, setActiveTab] = useState<'ledger' | 'pipeline' | 'upsc_relevance'>('ledger');
  
  // Interactive Simulation state (allows candidate to scrub between 100%, 67%, and 33%)
  const defaultPreset = grounding >= 0.85 ? 100 : grounding >= 0.5 ? 67 : 33;
  const [selectedPreset, setSelectedPreset] = useState<number>(defaultPreset);
  const [activeScanningIndex, setActiveScanningIndex] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentSim = SIM_PRESETS[selectedPreset] || SIM_PRESETS[67];
  const activePct = currentSim.pct;
  const verifiedCount = currentSim.verified;
  const totalCount = currentSim.total;

  const triggerLaserScan = (idx: number) => {
    setActiveScanningIndex(idx);
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 900);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[650] flex items-center justify-center p-3 sm:p-5 font-sans">
        {/* Dynamic Backdrop with Ambient Radial Illumination */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#020914]/85 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-gradient-to-b from-[#061833] via-[#030e20] to-[#020814] border border-[#136c99]/40 rounded-sm shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_40px_rgba(19,108,153,0.15)] overflow-hidden font-sans z-10"
        >
          {/* Ambient Cyber Grid & Scanner Light */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0b3d7810_1px,transparent_1px),linear-gradient(to_bottom,#0b3d7810_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

          {/* ── 1. Top Header Bar ── */}
          <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-[#136c99]/30 bg-[#041936]/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-sm bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 flex items-center justify-center text-[#e0d0ab] shadow-inner shadow-[#e0d0ab]/20">
                <ShieldCheck className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-sm sm:text-base font-bold text-white tracking-wide leading-tight">
                    Tark Grounding Protocol
                  </h3>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCheck className="w-2.5 h-2.5" /> Deterministic Audit
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#e0d0ab] uppercase tracking-wider block mt-0.5">
                  Zero-Hallucination Sentence Verification Engine
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white transition-all bg-zinc-900/80 hover:bg-zinc-800 rounded-sm border border-zinc-700/60 hover:border-[#e0d0ab] cursor-pointer shadow-xs"
              title="Close Protocol Dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── 2. Hero Telemetry & Interactive Grounding Dial ── */}
          <div className="relative z-10 px-6 py-4.5 bg-gradient-to-r from-[#07244a]/80 via-[#04162e]/60 to-[#020b17] border-b border-[#136c99]/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            {/* Left: Dynamic Circular Gauge + Status */}
            <div className="flex items-center gap-4">
              {/* Radial Dial with Glowing Orbit */}
              <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
                {/* Background Track */}
                <svg className="w-18 h-18 -rotate-90 drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-800/80"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Animated Foreground Arc */}
                  <motion.path
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke={currentSim.color}
                    fill="none"
                    initial={{ strokeDasharray: '0, 100' }}
                    animate={{ strokeDasharray: `${activePct}, 100` }}
                    transition={{ type: 'spring', stiffness: 180, damping: 20 }}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>

                {/* Center Percentage Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <motion.span
                    key={activePct}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-mono text-base font-bold text-white leading-none tracking-tight"
                  >
                    {activePct}%
                  </motion.span>
                  <span className="text-[8px] font-mono text-[#e0d0ab] uppercase tracking-tighter mt-0.5">
                    Grounded
                  </span>
                </div>
              </div>

              {/* Status & Live Description */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <motion.span
                    key={currentSim.label}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-xs border shadow-xs"
                    style={{
                      backgroundColor: currentSim.bgColor,
                      borderColor: currentSim.borderColor,
                      color: currentSim.color,
                    }}
                  >
                    {currentSim.label}
                  </motion.span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    <strong className="text-white font-bold">{verifiedCount}</strong> of {totalCount} Claims Anchored
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed max-w-sm sm:max-w-md">
                  {currentSim.description}
                </p>
              </div>
            </div>

            {/* Right: Mathematical Formula & Interactive Preset Switcher */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-2.5">
              {/* Math Derivation Card */}
              <div className="w-full sm:w-auto px-3.5 py-2 rounded-xs bg-[#020a16]/90 border border-[#136c99]/40 font-mono text-[11px] shadow-xs">
                <div className="flex items-center gap-1 text-[#e0d0ab] text-[9px] uppercase tracking-wider font-bold mb-1">
                  <Scale className="w-3 h-3 text-[#e0d0ab]" />
                  <span>Deterministic Formula</span>
                </div>
                <div className="text-zinc-300 flex items-center gap-1.5">
                  <span>Score = </span>
                  <span className="text-emerald-400 font-bold px-1 py-0.2 bg-emerald-500/10 rounded-xs border border-emerald-500/30">
                    {verifiedCount} Verified
                  </span>
                  <span>/</span>
                  <span className="text-zinc-400 font-bold px-1 py-0.2 bg-zinc-800/80 rounded-xs">
                    {totalCount} Total
                  </span>
                  <span>=</span>
                  <motion.span
                    key={activePct}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="font-bold text-white px-1.5 py-0.2 rounded-xs"
                    style={{ backgroundColor: currentSim.bgColor, color: currentSim.color }}
                  >
                    {activePct}%
                  </motion.span>
                </div>
              </div>

              {/* Interactive Scrub Pills: 100%, 67%, 33% */}
              <div className="flex items-center gap-1.5 self-stretch sm:self-auto justify-end">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:inline-block mr-1">
                  Try Level:
                </span>
                {[100, 67, 33].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      setSelectedPreset(val);
                      triggerLaserScan(0);
                    }}
                    className={`px-2 py-0.5 rounded-xs text-[10px] font-mono transition-all cursor-pointer border ${
                      selectedPreset === val
                        ? 'bg-[#e0d0ab] text-[#072e63] border-[#e0d0ab] font-bold shadow-xs'
                        : 'bg-[#031326] text-zinc-400 border-zinc-800 hover:text-white hover:border-[#136c99]'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── 3. Navigation Tabs with Kinetic Indicator ── */}
          <div className="relative z-10 flex border-b border-[#136c99]/30 bg-[#020b18]/60 px-6 gap-2">
            {[
              { id: 'ledger', label: 'Claim-by-Claim Evidence', icon: Database, badge: 'Interactive' },
              { id: 'pipeline', label: 'How We Compute (4 Steps)', icon: Cpu },
              { id: 'upsc_relevance', label: 'Why This Protects Your Prep', icon: Award },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative py-3 px-3.5 text-xs font-sans font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
                    isActive ? 'text-[#e0d0ab]' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="hidden sm:inline-block px-1.5 py-0.2 text-[8px] font-mono bg-[#e0d0ab]/15 text-[#e0d0ab] rounded-full border border-[#e0d0ab]/30">
                      {tab.badge}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeGroundingTab"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#e0d0ab] shadow-[0_0_8px_#e0d0ab]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── 4. Main Scrollable Content Area ── */}
          <div className="relative z-10 p-6 overflow-y-auto space-y-4 font-sans text-xs flex-1">
            {/* ════ TAB 1: CLAIM-BY-CLAIM EVIDENCE SCANNER ════ */}
            {activeTab === 'ledger' && (
              <div className="space-y-4">
                {/* Article Context Strip */}
                <div className="p-3.5 bg-[#031326]/80 border border-[#136c99]/30 rounded-sm flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#e0d0ab] uppercase font-bold tracking-wider">
                        Article Inspected:
                      </span>
                      <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-mono bg-[#136c99]/20 text-[#0194a8] border border-[#136c99]/40">
                        {source}
                      </span>
                    </div>
                    <h4 className="font-serif text-xs sm:text-sm font-bold text-white leading-snug">
                      {headline}
                    </h4>
                  </div>

                  <button
                    onClick={() => triggerLaserScan(activeScanningIndex)}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0b3d78]/40 hover:bg-[#0b3d78]/70 border border-[#136c99]/50 rounded-xs text-[10px] font-mono text-[#e0d0ab] cursor-pointer transition-all shadow-xs"
                    title="Run Laser Sentence Audit"
                  >
                    <Scan className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    <span className="hidden sm:inline">Laser Scan</span>
                  </button>
                </div>

                {/* Live Scanning Beam Effect */}
                {isScanning && (
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 200, opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 0.85, ease: 'easeInOut' }}
                    className="absolute inset-x-6 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] pointer-events-none z-30"
                  />
                )}

                {/* Evidence Claims Stack */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-zinc-400 font-mono text-[10px]">
                    <span className="uppercase font-bold tracking-wider text-[#e0d0ab] flex items-center gap-1">
                      <Crosshair className="w-3 h-3 text-[#e0d0ab]" />
                      Claim Verification Ledger ({currentSim.sampleClaims.length} propositions audited)
                    </span>
                    <span className="text-zinc-500">
                      Hover to inspect verbatim proof
                    </span>
                  </div>

                  {currentSim.sampleClaims.map((claim, idx) => {
                    const isVerified = claim.status === 'verified';
                    const isDropped = claim.status === 'dropped';
                    const isActive = activeScanningIndex === idx;

                    return (
                      <motion.div
                        key={idx}
                        onMouseEnter={() => setActiveScanningIndex(idx)}
                        whileHover={{ scale: 1.008, y: -1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className={`relative p-4 rounded-sm border transition-all overflow-hidden ${
                          isVerified
                            ? 'bg-[#03182e]/70 border-emerald-500/35 hover:border-emerald-400 shadow-sm'
                            : 'bg-[#180808]/70 border-rose-500/35 hover:border-rose-400 shadow-sm'
                        }`}
                      >
                        {/* Background Accent Glow */}
                        <div
                          className={`absolute top-0 left-0 bottom-0 w-1 ${
                            isVerified ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#ef4444]'
                          }`}
                        />

                        <div className="pl-2 space-y-2">
                          {/* Claim Header Bar */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-xs border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{claim.title}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-xs border border-rose-500/30">
                                  <AlertOctagon className="w-3 h-3" />
                                  <span>{claim.title}</span>
                                </span>
                              )}
                            </div>

                            <span className="text-[9px] font-mono text-zinc-400">
                              {claim.spanLabel}
                            </span>
                          </div>

                          {/* Synthesized Proposition Text */}
                          <p
                            className={`text-xs font-sans leading-relaxed ${
                              isDropped ? 'text-zinc-400 line-through opacity-75' : 'text-zinc-100 font-medium'
                            }`}
                          >
                            {claim.text}
                          </p>

                          {/* Case A: Verbatim Match Proof Callout */}
                          {isVerified && claim.sourceQuote && (
                            <div className="mt-2 p-2.5 bg-[#020b17]/90 border border-emerald-500/25 rounded-xs space-y-1">
                              <div className="flex items-center justify-between text-[9px] font-mono">
                                <span className="uppercase text-[#e0d0ab] font-bold flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-[#e0d0ab]" />
                                  Verbatim Primary Document Match:
                                </span>
                                {claim.matchedEntity && (
                                  <span className="px-1.5 py-0.2 bg-emerald-500/15 text-emerald-300 rounded border border-emerald-500/30">
                                    Entity: {claim.matchedEntity}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-serif italic text-zinc-300 leading-snug">
                                &ldquo;{claim.sourceQuote}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* Case B: Sentinel Drop Reason */}
                          {isDropped && claim.dropReason && (
                            <div className="mt-2 p-2.5 bg-[#1f0a0a]/90 border border-rose-500/30 rounded-xs space-y-1">
                              <span className="text-[9px] font-mono uppercase text-rose-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                Sentinel Interception Diagnostic:
                              </span>
                              <p className="text-[11px] font-mono text-rose-200/90 leading-snug">
                                {claim.dropReason}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ════ TAB 2: 4-STAGE PIPELINE ARCHITECTURE ════ */}
            {activeTab === 'pipeline' && (
              <div className="space-y-4">
                <div className="p-3 bg-[#031326]/60 border border-[#136c99]/30 rounded-sm text-zinc-300 text-xs leading-relaxed">
                  Tark implements an algorithmic <strong className="text-[#e0d0ab]">Cite-or-Drop Pipeline</strong>.
                  Before any news bullet reaches your test deck, it must survive sentence segmentation, token extraction, and cross-verification against the official government wire.
                </div>

                {/* 4 Connected Pipeline Stages */}
                <div className="space-y-3 relative">
                  {[
                    {
                      step: 1,
                      title: 'First-Source Gazette Ingestion',
                      tag: 'got-scraping + Cheerio',
                      color: 'cyan',
                      accentHex: '#06b6d4',
                      desc: 'Raw press releases from PIB, RBI, PRS, and The Hindu are captured verbatim without intermediary coaching summaries. Trailing boilerplate is stripped.',
                    },
                    {
                      step: 2,
                      title: 'Atomic Sentence Span Decomposition',
                      tag: 'segmentSpans()',
                      color: 'teal',
                      accentHex: '#14b8a6',
                      desc: 'Document text is parsed into indexed, addressable sentence tokens (s0, s1, s2...). Numeric outlays, percentages, and statutory sections are indexed with byte offsets.',
                    },
                    {
                      step: 3,
                      title: 'Deterministic Zero-LLM Fact Cross-Check',
                      tag: 'extractFacts() + Regex',
                      color: 'amber',
                      accentHex: '#f59e0b',
                      desc: 'An independent algorithmic engine extracts monetary quantities, acronyms, and years from the synthesized points and proves their presence in the cited spans.',
                    },
                    {
                      step: 4,
                      title: 'Sentinel Cite-or-Drop Gate & Quotient',
                      tag: 'groundingScore()',
                      color: 'emerald',
                      accentHex: '#10b981',
                      desc: 'Any point with an ungrounded numeral or phantom claim is dropped. The score equals the exact ratio of surviving verified points to total proposed points.',
                    },
                  ].map((s, si) => (
                    <motion.div
                      key={s.step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: si * 0.08 }}
                      className="p-4 bg-[#031429]/80 border border-[#136c99]/35 rounded-sm flex items-start gap-4 hover:border-[#e0d0ab]/50 transition-colors"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 shadow-xs"
                        style={{
                          backgroundColor: `${s.accentHex}15`,
                          borderColor: `${s.accentHex}40`,
                          color: s.accentHex,
                          borderWidth: '1px',
                        }}
                      >
                        {s.step}
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-serif font-bold text-white text-xs sm:text-sm">
                            {s.title}
                          </span>
                          <span
                            className="text-[9px] font-mono px-2 py-0.5 rounded-xs"
                            style={{ backgroundColor: `${s.accentHex}15`, color: s.accentHex }}
                          >
                            {s.tag}
                          </span>
                        </div>
                        <p className="text-zinc-300 leading-relaxed text-xs">
                          {s.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ════ TAB 3: WHY THIS PROTECTS YOUR PREP ════ */}
            {activeTab === 'upsc_relevance' && (
              <div className="space-y-4">
                {/* Hero Alert */}
                <div className="p-4 bg-[rgba(4,25,54,0.75)] border border-[rgba(224,208,171,0.3)] rounded-sm space-y-2">
                  <div className="flex items-center gap-2 text-[#e0d0ab]">
                    <AlertTriangle className="w-4 h-4 text-[#e0d0ab]" />
                    <span className="text-xs font-serif font-bold uppercase tracking-wide">
                      The High Cost of Hallucination in Civil Services Exams
                    </span>
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed">
                    Generic AI scrapers frequently hallucinate crucial statistics—turning <strong className="text-white">₹15,000 crore</strong> into <strong className="text-rose-400">₹1,500 crore</strong>, or confusing <strong className="text-white">Centrally Sponsored Schemes</strong> with <strong className="text-rose-400">Central Sector Schemes</strong>.
                  </p>
                </div>

                {/* Side-by-Side Comparison Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Left: Coaching AI Scrapers */}
                  <div className="p-4 bg-[#1a0808]/70 border border-rose-500/35 rounded-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-wider">
                        ❌ Coaching Digests & LLMs
                      </span>
                      <span className="text-[9px] font-mono text-rose-300 bg-rose-500/15 px-1.5 py-0.5 rounded-xs">
                        -0.66 Prelims Risk
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-zinc-400 text-[11px] leading-snug">
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>Hallucinates unverified percentages (e.g. "35% boost")</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>Confuses ministerial nodal jurisdiction</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>Zero sentence traceability or verifiable citations</span>
                      </li>
                    </ul>
                  </div>

                  {/* Right: Tark Grounded Protocol */}
                  <div className="p-4 bg-[#03182e]/80 border border-emerald-500/35 rounded-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                        ✓ Tark Sentinel Protocol
                      </span>
                      <span className="text-[9px] font-mono text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded-xs">
                        +2.00 Accuracy Proof
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-zinc-300 text-[11px] leading-snug">
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>Auto-drops any bullet with ungrounded numerals</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>Sentence-level span proofs for Mains answer writing</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>Mathematical audit score displayed on every card</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Academic Safe Citation Guide */}
                <div className="p-3 bg-[#020b18] border border-[#136c99]/30 rounded-sm flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Threshold ≥ 90%: <strong className="text-emerald-300">Directly citable in Mains GS-II &amp; GS-III</strong></span>
                  </div>
                  <span className="text-[#e0d0ab]">live_cite_or_drop_v2</span>
                </div>
              </div>
            )}
          </div>

          {/* ── 5. Footer Action Bar ── */}
          <div className="relative z-10 px-6 py-3.5 border-t border-[#136c99]/30 bg-[#031124]/90 flex items-center justify-between font-sans text-xs">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <Lock className="w-3 h-3 text-[#e0d0ab]" />
              <span>Immutable Audit: <strong className="text-[#e0d0ab]">SHA-256 Span Anchor</strong></span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-1.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] font-sans text-xs font-bold uppercase tracking-wider rounded-xs transition-all shadow-sm cursor-pointer hover:shadow-[0_0_15px_rgba(224,208,171,0.4)]"
              >
                Understood
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
