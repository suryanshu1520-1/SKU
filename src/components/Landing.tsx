import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Target,
  Brain,
  Shield,
  Sparkles,
  CheckCircle2,
  Lock,
  Trophy,
  BookOpen,
  Globe,
  Swords,
  ChevronRight,
  Activity,
  Check,
  Radio,
  AlertOctagon,
  FileText,
  HelpCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import InteractiveBackground from './InteractiveBackground';
import DiagnosticPreview from './DiagnosticPreview';
import MobileLanding from './MobileLanding';
import AnimatedNavIcon, { NavIconId } from './AnimatedNavIcon';
import type { CandidatePreferences } from '../types';
import { calculateExamCountdown } from '../lib/candidatePreferences';

const navIdMap: Record<string, NavIconId> = {
  arena: 'arena',
  brief: 'tracker',
  observatory: 'observatory',
  canon: 'humanities',
};

interface LandingProps {
  onNavigateArena: () => void;
  onNavigateTracker: () => void;
  onNavigateProfile: () => void;
  onNavigateLibrary?: () => void;
  onNavigateHumanities?: () => void;
  onNavigateObservatory?: () => void;
  onNavigateManifesto?: () => void;
  onNavigateLegal?: (type: 'privacy' | 'terms' | 'refund') => void;
  candidatePreferences?: CandidatePreferences;
}

interface SeatCountData {
  max_capacity: number;
  claimed_seats: number;
  remaining_seats: number;
}

export default function Landing({
  onNavigateArena,
  onNavigateTracker,
  onNavigateProfile,
  onNavigateLibrary,
  onNavigateHumanities,
  onNavigateObservatory,
  onNavigateManifesto,
  onNavigateLegal,
  candidatePreferences,
}: LandingProps) {
  const [seatData, setSeatData] = useState<SeatCountData | null>(null);
  const [activeFeatureTab, setActiveFeatureTab] = useState<'arena' | 'brief' | 'observatory' | 'canon'>('arena');
  const [hoveredFeatureTab, setHoveredFeatureTab] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSeats() {
      try {
        const { data, error } = await supabase.rpc('get_available_seat_count');
        if (!error && data) {
          setSeatData(data as SeatCountData);
        }
      } catch (e) {
        console.warn('Could not load live seat count:', e);
      }
    }
    fetchSeats();
  }, []);

  const countdown = calculateExamCountdown(candidatePreferences?.targetYear || '2026');

  const features = [
    {
      id: 'arena' as const,
      label: 'The Test Arena',
      tagline: 'Zero-Trust Exam Crucible',
      title: 'Real Exam Simulation & AI Mistake Analysis',
      subtitle: 'Timed recall under authentic UPSC prelims pressure (+2.00 / -0.66 marking).',
      description: 'Generic mock portals evaluate answers on the client where keys leak, and give vague PDF solutions. Tark evaluates your test immediately on the server and provides an AI mistake breakdown that pinpoints exactly why you fell for the examiner\'s trap.',
      highlights: [
        'Strict +2.00 / -0.66 negative marking simulation',
        'Instant cognitive trap & distracter diagnosis',
        'Zero-trust server evaluation with atomic state locking'
      ],
      cta: 'Start Mock Exam',
      icon: Swords,
      action: onNavigateArena,
      color: '#34d399'
    },
    {
      id: 'brief' as const,
      label: 'The Daily Brief',
      tagline: '100% Grounded Intelligence',
      title: 'Daily PIB & Policy Distillation (4-Min Read)',
      subtitle: '10 curated policy dispatches delivered daily with verified government citations.',
      description: 'Stop drowning in 150-page monthly coaching compilations stuffed with unverified opinions. Tark distills daily PIB releases, Cabinet decisions, and Ministry notifications into 10 high-yield briefs with sentence-level government citations and a daily 10-question practice drill.',
      highlights: [
        '10 daily distilled policy dispatches in under 4 minutes',
        'Sentence-level official PIB & Hindu Gazette citations',
        'Zero-hallucination Cite-or-Drop factual verification'
      ],
      cta: "Read Today's Brief",
      icon: Globe,
      action: onNavigateTracker,
      color: '#0194a8'
    },
    {
      id: 'observatory' as const,
      label: 'The Observatory',
      tagline: '25-Year Strategic Intelligence',
      title: '25-Year Question Vault & Elimination Math',
      subtitle: '7,841 authentic UPSC questions, real attempt risk math, and high-yield topic patterns.',
      description: 'Search the complete quarter-century question bank with verified explanations. Calculate your expected score and cutoff safety margin with our 50:50 guessing simulator, and master the 25 topics that yield over 75% of all Prelims marks.',
      highlights: [
        '7,841 verified questions mapped across 2000–2025',
        'Empirical 50:50 elimination expected-value model',
        'High-yield topic matrix showing where 75%+ marks originate'
      ],
      cta: 'Explore Question Vault',
      icon: Radio,
      action: onNavigateObservatory || onNavigateArena,
      color: '#e0d0ab'
    },
    {
      id: 'canon' as const,
      label: 'Primary Thinkers',
      tagline: 'GS-4 Ethics & Philosophy',
      title: 'Primary Thinkers & Ethics Reading Room',
      subtitle: 'Read the original writings of thinkers the UPSC repeatedly quotes in GS-4 and Essay.',
      description: 'Secondary coaching summaries flatten deep philosophical ideas into generic bullet points. Read verbatim original writings from Dr. B. R. Ambedkar, Mahatma Gandhi, and Immanuel Kant, with a side-by-side comparison tool to enrich your Mains essays and ethics answers.',
      highlights: [
        'Verbatim original writings from primary philosophical texts',
        'Side-by-side concept comparison across schools of thought',
        'Directly applicable quotes for GS-4 case studies & Essay'
      ],
      cta: 'Open Reading Room',
      icon: BookOpen,
      action: onNavigateHumanities || onNavigateArena,
      color: '#e0d0ab'
    },
  ];

  const activeFeature = features.find((f) => f.id === activeFeatureTab) || features[0];
  const ActiveIcon = activeFeature.icon;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 md:pt-20 pb-20 px-3 sm:px-4 md:px-8 text-stone-100 font-sans relative overflow-x-hidden selection:bg-[#e0d0ab] selection:text-[#072e63]">
      
      {/* Background Interactive Constellation Grid */}
      <InteractiveBackground />

      {/* ── Dedicated Mobile-First Landing Experience (< md) ── */}
      <div className="w-full md:hidden z-10">
        <MobileLanding
          onNavigateArena={onNavigateArena}
          onNavigateTracker={onNavigateTracker}
          onNavigateProfile={onNavigateProfile}
          onNavigateLibrary={onNavigateLibrary}
          onNavigateHumanities={onNavigateHumanities}
          onNavigateManifesto={onNavigateManifesto}
          onNavigateLegal={onNavigateLegal}
          seatData={seatData}
          candidatePreferences={candidatePreferences}
        />
      </div>

      {/* ── Desktop Widescreen Layout (md and above) ── */}
      <div className="hidden md:flex w-full max-w-5xl z-10 flex-col items-center justify-start space-y-16 mt-4">
        
        {/* ══════════════════════════════════════════════════════════════════
            1. HERO & CALM, HIGH-READABILITY HEADLINE
            ══════════════════════════════════════════════════════════════════ */}
        <div className="w-full flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
          
          {/* ── De-cluttered Single-Surface Telemetry Capsule ── */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-1.5 rounded-full bg-[rgba(4,25,54,0.75)] border border-[rgba(19,108,153,0.45)] backdrop-blur-md text-xs shadow-[0_4px_20px_rgba(3,16,38,0.5)]"
          >
            {/* Live Horizon Target */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse shrink-0" />
              <span className="font-semibold text-white font-sans">
                {countdown.label}
              </span>
              <span className="text-[#136c99]">&bull;</span>
              <span className="font-mono text-[#e0d0ab] font-medium">
                {countdown.daysRemaining} Days to Prelims
              </span>
            </div>

            <span className="text-[#136c99]/60 hidden sm:inline">&bull;</span>

            {/* Verified MCQs Base */}
            <div className="flex items-center gap-1.5 text-[#9fb0c8] font-sans">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399] shrink-0" />
              <span>4,150+ Verified PYQs</span>
            </div>

            <span className="text-[#136c99]/60 hidden md:inline">&bull;</span>

            {/* Zero-Trust Architecture */}
            <div className="hidden md:flex items-center gap-1.5 text-[#8fa2bd] font-sans">
              <Shield className="w-3.5 h-3.5 text-[#0194a8] shrink-0" />
              <span className="text-[#e8e0cf] font-mono">Zero-Trust Scored</span>
            </div>
          </motion.div>

          {/* Hero Headline & Calm Lede */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#e0d0ab] drop-shadow-[0_4px_30px_rgba(224,208,171,0.22)] leading-[1.15]">
              The Analytical Crucible for India&apos;s Toughest Exam.
            </h1>
            <p className="text-[#c8b998] text-base sm:text-lg font-sans max-w-2xl mx-auto leading-relaxed">
              You have one exam date and a syllabus that never stops expanding. Somewhere in it is the topic that fails you. Tark exists to find it before the UPSC examiner does.
            </p>
          </motion.div>

          {/* Primary Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto pt-1"
          >
            <button
              onClick={onNavigateArena}
              className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 py-3 px-6 bg-[#e0d0ab] hover:bg-white text-[#072e63] font-sans text-sm font-semibold rounded-xs shadow-[0_4px_20px_rgba(224,208,171,0.25)] transition-all cursor-pointer"
            >
              <Brain className="w-4 h-4" />
              <span>Enter Test Arena</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={onNavigateTracker}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-5 bg-[rgba(4,25,54,0.6)] border border-[rgba(19,108,153,0.5)] hover:border-[#e0d0ab] text-[#e8e0cf] hover:text-[#e0d0ab] font-sans text-sm font-medium rounded-xs backdrop-blur-md transition-all cursor-pointer"
            >
              <Globe className="w-4 h-4 text-[#0194a8]" />
              <span>Explore The Daily Brief</span>
            </button>

            <button
              onClick={onNavigateManifesto}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 py-3 px-4 text-[#8fa2bd] hover:text-[#e0d0ab] font-sans text-sm font-medium transition-colors cursor-pointer"
            >
              <Target className="w-4 h-4" />
              <span>The Manifesto</span>
            </button>
          </motion.div>

        </div>

        {/* ══════════════════════════════════════════════════════════════════
            2. INTERACTIVE DIAGNOSTIC QUESTION
            ══════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-4xl mx-auto"
        >
          <DiagnosticPreview onLaunchFullArena={onNavigateArena} />
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════
            3. THE 4 ENGINES OF TARK (LIVING SHOWCASE)
            ══════════════════════════════════════════════════════════════════ */}
        <div className="w-full space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-1.5">
            <span className="font-sans text-xs font-medium text-[#0194a8]">
              Complete Architecture
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#e0d0ab] tracking-tight">
              Four Engines. Zero Superfluous Noise.
            </h2>
            <p className="text-sm text-[#9fb0c8] font-sans leading-relaxed">
              Everything built into Tark is engineered to replace scattered coaching materials with a singular, high-precision workstation.
            </p>
          </div>

          {/* Interactive Feature Segmented Switcher (Symmetrical 4-Engine Grid) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-[rgba(4,25,54,0.7)] p-1.5 rounded-md border border-[rgba(19,108,153,0.35)] backdrop-blur-md">
            {features.map((f) => {
              const active = activeFeatureTab === f.id;
              const isHovered = hoveredFeatureTab === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFeatureTab(f.id)}
                  onMouseEnter={() => setHoveredFeatureTab(f.id)}
                  onMouseLeave={() => setHoveredFeatureTab(null)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-md font-sans text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-[#e0d0ab] text-[#072e63] font-semibold shadow-md'
                      : 'text-[#8fa2bd] hover:text-[#e8e0cf] hover:bg-[rgba(11,61,120,0.3)]'
                  }`}
                >
                  <AnimatedNavIcon
                    id={navIdMap[f.id] || 'arena'}
                    isActive={active}
                    isHovered={isHovered}
                    size={16}
                    className="w-4 h-4 shrink-0"
                  />
                  <span className="truncate">{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Engine Living Showcase Card */}
          <div className="bg-[rgba(4,25,54,0.65)] backdrop-blur-xl border border-[rgba(19,108,153,0.45)] rounded-md p-6 md:p-8 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.5)]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left Column: Descriptive Value Propositions */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[rgba(11,61,120,0.4)] border border-[rgba(19,108,153,0.4)] text-[11px] font-mono text-[#0194a8]">
                    <span>{activeFeature.tagline}</span>
                  </div>

                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#e8e0cf] tracking-tight">
                    {activeFeature.title}
                  </h3>

                  <p className="text-sm font-sans text-[#9fb0c8] leading-relaxed">
                    {activeFeature.description}
                  </p>

                  {/* Highlight Cards (Rich, full labels with no truncations) */}
                  <div className="space-y-2 pt-1">
                    {activeFeature.highlights.map((h, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-sm bg-[rgba(11,61,120,0.2)] border border-[rgba(19,108,153,0.3)] font-sans text-xs text-[#e8e0cf] flex items-center gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />
                        <span className="leading-snug">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={activeFeature.action}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-sans font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer shadow-md"
                  >
                    <span>{activeFeature.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Column: Living Interactive Engine Preview */}
              <div className="lg:col-span-6 bg-[rgba(3,16,38,0.8)] border border-[rgba(19,108,153,0.4)] rounded-md p-5 flex flex-col justify-between shadow-inner">
                {/* Simulation Header */}
                <div className="flex items-center justify-between border-b border-[rgba(19,108,153,0.25)] pb-3">
                  <div className="flex items-center gap-2">
                    <ActiveIcon className="w-4 h-4 text-[#e0d0ab] shrink-0" />
                    <span className="font-mono text-xs font-semibold text-[#e0d0ab] uppercase tracking-wider">
                      Live Engine Preview &bull; {activeFeature.label}
                    </span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
                </div>

                {/* Dynamic Content Container */}
                <div className="py-4 flex-1 flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {/* ── 1. ARENA SIMULATION ── */}
                    {activeFeatureTab === 'arena' && (
                      <motion.div
                        key="arena-preview"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3.5"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono border-b border-[rgba(19,108,153,0.25)] pb-2">
                          <span className="text-[#e0d0ab] font-semibold flex items-center gap-1.5">
                            <Swords className="w-3.5 h-3.5 text-[#34d399]" />
                            UPSC Prelims GS-1 Simulation
                          </span>
                          <span className="text-[#34d399] font-bold">+2.00 / -0.66</span>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-serif text-[#f8fafc] leading-relaxed">
                            &ldquo;Consider the following statements regarding the Delimitation Commission under Article 82:&rdquo;
                          </p>
                          <div className="space-y-1.5 text-xs">
                            <div className="p-2.5 rounded-sm bg-[rgba(16,185,129,0.12)] border border-emerald-400/40 text-emerald-200 flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="leading-snug">1. Orders have the force of law and cannot be questioned in court (Art. 329).</span>
                            </div>
                            <div className="p-2.5 rounded-sm bg-[rgba(225,78,78,0.12)] border border-rose-400/40 text-rose-200 flex items-start gap-2">
                              <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <span className="leading-snug">2. Modifications permitted by Parliament. <strong className="text-rose-300 font-mono text-[10px] block mt-0.5">[Examiner Trap: Finality Doctrine]</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[rgba(19,108,153,0.25)] flex items-center justify-between text-[11px] font-mono text-[#8fa2bd]">
                          <span>Evaluation: Zero-Trust Server Lock</span>
                          <span className="text-emerald-400 font-semibold">Trap Diagnosed</span>
                        </div>
                      </motion.div>
                    )}

                    {/* ── 2. DAILY BRIEF SIMULATION ── */}
                    {activeFeatureTab === 'brief' && (
                      <motion.div
                        key="brief-preview"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3.5"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono border-b border-[rgba(19,108,153,0.25)] pb-2">
                          <span className="text-[#0194a8] font-semibold flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-[#0194a8]" />
                            PIB Delhi &bull; Official Gazette
                          </span>
                          <span className="px-2 py-0.5 rounded-xs bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 font-bold">100% Grounded</span>
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs font-serif font-bold text-[#f8fafc] leading-snug">
                            Expansion of Central Sector Scheme under Agriculture Infrastructure Fund (AIF)
                          </div>
                          <div className="p-2.5 rounded-sm bg-[rgba(11,61,120,0.3)] border border-[rgba(19,108,153,0.35)] text-xs text-[#cad5e2] space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#e0d0ab]">
                              <span>PIB Span s2 &bull; Cabinet Committee on Economic Affairs</span>
                            </div>
                            <p className="italic font-serif text-[11.5px] text-[#e8e0cf] leading-relaxed">
                              &ldquo;...progressive expansion with an outlay of <mark className="bg-[#0b3d78] text-[#e0d0ab] px-1 py-0.2 rounded font-bold not-italic">Rs. 1 lakh crore</mark> for post-harvest management infrastructure.&rdquo;
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[rgba(19,108,153,0.25)] flex items-center justify-between text-[11px] font-mono text-[#8fa2bd]">
                          <span>Cite-or-Drop: 0 Hallucinations</span>
                          <span className="text-[#e0d0ab]">10 Daily MCQs Ready</span>
                        </div>
                      </motion.div>
                    )}

                    {/* ── 3. OBSERVATORY SIMULATION ── */}
                    {activeFeatureTab === 'observatory' && (
                      <motion.div
                        key="observatory-preview"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3.5"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono border-b border-[rgba(19,108,153,0.25)] pb-2">
                          <span className="text-[#e0d0ab] font-semibold flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5 text-[#e0d0ab]" />
                            25-Year Empirical Vault
                          </span>
                          <span className="text-[#0194a8]">7,841 Questions</span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="p-2.5 rounded-sm bg-[rgba(4,25,54,0.7)] border border-[rgba(19,108,153,0.35)] space-y-2">
                            <div className="flex justify-between text-[11px] text-[#cad5e2]">
                              <span>High-Yield Topic Density (76% of Marks)</span>
                              <span className="font-mono text-[#e0d0ab]">25 Core Themes</span>
                            </div>
                            <div className="space-y-1.5">
                              <div>
                                <div className="flex items-center justify-between text-[10px] text-[#8fa2bd] mb-0.5">
                                  <span>Macroeconomics &amp; Fiscal Schemes</span>
                                  <span className="font-mono">22%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-[#041936] overflow-hidden">
                                  <div className="h-full bg-[#e0d0ab] w-[22%]" />
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between text-[10px] text-[#8fa2bd] mb-0.5">
                                  <span>Environment, Ecology &amp; Treaties</span>
                                  <span className="font-mono">19%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-[#041936] overflow-hidden">
                                  <div className="h-full bg-[#0194a8] w-[19%]" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-2 rounded-sm bg-[rgba(16,185,129,0.08)] border border-emerald-400/30 text-[11px] text-emerald-200">
                            <strong>50:50 Guessing Simulator:</strong> Expected Value = <span className="font-mono font-bold text-emerald-400">+0.67 marks</span> per 2-option elimination.
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[rgba(19,108,153,0.25)] flex items-center justify-between text-[11px] font-mono text-[#8fa2bd]">
                          <span>Vault: 2000 &ndash; 2025</span>
                          <span className="text-emerald-400 font-semibold">100% Verified Keys</span>
                        </div>
                      </motion.div>
                    )}

                    {/* ── 4. PRIMARY THINKERS SIMULATION ── */}
                    {activeFeatureTab === 'canon' && (
                      <motion.div
                        key="canon-preview"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3.5"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono border-b border-[rgba(19,108,153,0.25)] pb-2">
                          <span className="text-[#e0d0ab] font-semibold flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-[#e0d0ab]" />
                            Primary Philosophy Reading Room
                          </span>
                          <span className="text-[#8fa2bd]">GS-4 &amp; Essay</span>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[11px] font-mono text-[#0194a8] font-bold uppercase">
                            Dr. B.R. Ambedkar &bull; Annihilation of Caste (1936)
                          </div>
                          <blockquote className="p-3 rounded-sm bg-[rgba(11,61,120,0.25)] border-l-2 border-[#e0d0ab] text-xs font-serif italic text-[#f8fafc] leading-relaxed">
                            &ldquo;Constitutional morality is not a natural sentiment. It has to be cultivated. We must realize that our people have yet to learn it.&rdquo;
                          </blockquote>
                          <div className="p-2 rounded-xs bg-[rgba(4,25,54,0.7)] border border-[rgba(19,108,153,0.3)] text-[11px] text-[#9fb0c8]">
                            <strong className="text-[#e0d0ab]">Mains Application:</strong> Verbatim anchor for Constitutional Ethics &amp; Administrative Probity case studies.
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[rgba(19,108,153,0.25)] flex items-center justify-between text-[11px] font-mono text-[#8fa2bd]">
                          <span>Type: Verbatim Primary Text</span>
                          <span className="text-[#e0d0ab]">Mains High-Yield</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Simulation Static Meta Footer */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[rgba(19,108,153,0.25)] text-[11px] font-mono text-[#8fa2bd]">
                  <span>Engine Mode: Active Simulation</span>
                  <span className="text-[#34d399] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                    Interactive
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            4. EMPIRICAL COMPARISON MATRIX
            ══════════════════════════════════════════════════════════════════ */}
        <div className="w-full bg-[rgba(4,25,54,0.65)] backdrop-blur-md border border-[rgba(19,108,153,0.4)] rounded-xs p-6 md:p-8 space-y-6 shadow-md">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[rgba(19,108,153,0.3)] pb-4">
            <div>
              <span className="font-sans text-xs font-medium text-[#0194a8]">
                Engineered for High-Stakes Competitors
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#e0d0ab] tracking-tight mt-1">
                Tark vs Traditional Coaching
              </h3>
            </div>
            <span className="font-sans text-xs text-[#8fa2bd]">
              Empirical Comparison Matrix
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-[rgba(19,108,153,0.3)] font-sans text-xs text-[#8fa2bd]">
                  <th className="py-3 px-3">Evaluation Dimension</th>
                  <th className="py-3 px-3 text-[#e14e4e]">Traditional Coaching & Test Portals</th>
                  <th className="py-3 px-3 text-[#34d399]">Tark Analytical Engine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(19,108,153,0.2)] text-xs">
                <tr className="hover:bg-[rgba(11,61,120,0.2)] transition-colors">
                  <td className="py-3.5 px-3 font-sans text-[#e0d0ab] font-medium">Test Scoring & Integrity</td>
                  <td className="py-3.5 px-3 text-[#9fb0c8]">Client-side evaluation; inspect element reveals answers.</td>
                  <td className="py-3.5 px-3 text-[#e8e0cf] font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#34d399] shrink-0" />
                    Strict Zero-Trust server scoring & atomic locks.
                  </td>
                </tr>

                <tr className="hover:bg-[rgba(11,61,120,0.2)] transition-colors">
                  <td className="py-3.5 px-3 font-sans text-[#e0d0ab] font-medium">Current Affairs Pipeline</td>
                  <td className="py-3.5 px-3 text-[#9fb0c8]">150-page unverified monthly compilations with fluff.</td>
                  <td className="py-3.5 px-3 text-[#e8e0cf] font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#34d399] shrink-0" />
                    10 daily distilled dispatches with 100% grounded PIB citations.
                  </td>
                </tr>

                <tr className="hover:bg-[rgba(11,61,120,0.2)] transition-colors">
                  <td className="py-3.5 px-3 font-sans text-[#e0d0ab] font-medium">Philosophy & Ethics (GS-4)</td>
                  <td className="py-3.5 px-3 text-[#9fb0c8]">Second-hand coaching summaries prone to distortion and omissions.</td>
                  <td className="py-3.5 px-3 text-[#e8e0cf] font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#34d399] shrink-0" />
                    Direct primary texts (Ambedkar, Gandhi, Kant) with side-by-side analysis.
                  </td>
                </tr>

                <tr className="hover:bg-[rgba(11,61,120,0.2)] transition-colors">
                  <td className="py-3.5 px-3 font-sans text-[#e0d0ab] font-medium">PYQ Trend Analysis</td>
                  <td className="py-3.5 px-3 text-[#9fb0c8]">Static PDF question banks without statistical pattern recognition.</td>
                  <td className="py-3.5 px-3 text-[#e8e0cf] font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#34d399] shrink-0" />
                    25-year indexed question bank with 50:50 elimination expected-value model.
                  </td>
                </tr>

                <tr className="hover:bg-[rgba(11,61,120,0.2)] transition-colors">
                  <td className="py-3.5 px-3 font-sans text-[#e0d0ab] font-medium">Seat Transparency & Scarcity</td>
                  <td className="py-3.5 px-3 text-[#9fb0c8]">Fake &lsquo;limited time&rsquo; countdown clocks that reset every 24 hours.</td>
                  <td className="py-3.5 px-3 text-[#e8e0cf] font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#34d399] shrink-0" />
                    Strict 500-seat lifetime limit backed by Postgres row-level locks.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            5. FOUNDERS CLUB SEAT TRANSPARENCY
            ══════════════════════════════════════════════════════════════════ */}
        <div className="w-full bg-[rgba(4,25,54,0.65)] backdrop-blur-md border border-[rgba(19,108,153,0.4)] rounded-xs p-6 md:p-8 space-y-6 shadow-md text-center max-w-2xl mx-auto">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[rgba(11,61,120,0.35)] border border-[rgba(19,108,153,0.4)] rounded-xs text-xs font-mono text-[#e0d0ab]">
              <Lock className="w-3.5 h-3.5 text-[#34d399]" />
              <span>Cryptographically Enforced Scarcity</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#e0d0ab] tracking-tight">
              Founders Club: 500 Lifetime Founding Seats
            </h3>
            <p className="text-xs text-[#9fb0c8] font-sans max-w-lg mx-auto leading-relaxed">
              We do not run endless subscription churn. Tark offers exactly 500 lifetime seats with a 15-minute reservation hold. Once claimed, membership closes forever.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={onNavigateArena}
              className="w-full sm:w-auto px-6 py-3 bg-[#e0d0ab] hover:bg-white text-[#072e63] font-sans text-xs font-bold uppercase tracking-wider rounded-xs transition-colors shadow-md cursor-pointer"
            >
              Verify Platform in Test Arena
            </button>
            <button
              onClick={onNavigateManifesto}
              className="w-full sm:w-auto px-5 py-3 bg-[rgba(4,25,54,0.5)] border border-[rgba(19,108,153,0.4)] hover:border-[#e0d0ab] text-[#e8e0cf] hover:text-[#e0d0ab] font-sans text-xs font-medium rounded-xs transition-colors cursor-pointer"
            >
              Read The Manifesto
            </button>
          </div>
        </div>

        {/* Desktop Footer */}
        <footer className="w-full pt-8 pb-4 border-t border-[rgba(19,108,153,0.3)] flex flex-col sm:flex-row items-center justify-between text-xs text-[#8fa2bd] gap-4">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-[#e0d0ab] font-bold tracking-wider">TARK</span>
            <span>&bull;</span>
            <span>Zero-Trust Analytical Crucible</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onNavigateManifesto} className="hover:text-[#e0d0ab] transition-colors cursor-pointer">Manifesto</button>
            <span>&bull;</span>
            <button onClick={() => onNavigateLegal?.('privacy')} className="hover:text-[#e0d0ab] transition-colors cursor-pointer">Privacy Policy</button>
            <span>&bull;</span>
            <button onClick={() => onNavigateLegal?.('terms')} className="hover:text-[#e0d0ab] transition-colors cursor-pointer">Terms of Service</button>
            <span>&bull;</span>
            <button onClick={() => onNavigateLegal?.('refund')} className="hover:text-[#e0d0ab] transition-colors cursor-pointer">Refund Policy</button>
          </div>
        </footer>

      </div>

    </div>
  );
}