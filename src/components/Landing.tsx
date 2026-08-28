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
  Layers,
  BookOpen,
  Globe,
  Swords,
  ChevronRight,
  Activity,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import InteractiveBackground from './InteractiveBackground';
import DiagnosticPreview from './DiagnosticPreview';
import MobileLanding from './MobileLanding';

interface LandingProps {
  onNavigateArena: () => void;
  onNavigateTracker: () => void;
  onNavigateProfile: () => void;
  onNavigateLibrary?: () => void;
  onNavigateHumanities?: () => void;
  onNavigateManifesto?: () => void;
  onNavigateLegal?: (type: 'privacy' | 'terms' | 'refund') => void;
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
  onNavigateManifesto,
  onNavigateLegal,
}: LandingProps) {
  const [seatData, setSeatData] = useState<SeatCountData | null>(null);
  const [activeFeatureTab, setActiveFeatureTab] = useState<'arena' | 'brief' | 'canon' | 'pillars'>('arena');

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

  const features = [
    {
      id: 'arena' as const,
      label: 'The Test Arena',
      title: 'High-Stakes Examination & Zero-Trust AI Autopsies',
      subtitle: 'Timed recall under authentic UPSC prelims pressure (+2.00 / -0.66 marking).',
      description: 'Generic mock test series leak answer keys to client browsers and provide static PDF keys. Tark evaluates all 50 questions server-side and immediately deploys an AI conceptual autopsy that locates your cognitive trap before the examiner does.',
      metrics: ['4,150+ Discrete MCQs', 'Server-Evaluated Scoring', 'Cognitive Trap Isolation'],
      cta: 'Launch Mock Arena',
      icon: Swords,
      action: onNavigateArena,
      color: '#34d399'
    },
    {
      id: 'brief' as const,
      label: 'The Daily Brief',
      title: 'Signal Deck & Distilled Cabinet Policy Intelligence',
      subtitle: '10 curated policy signals delivered daily in a 4-minute finite read.',
      description: 'Stop drowning in 150-page generic monthly magazines. Tark distills daily PIB releases, Cabinet Committee decisions, and Ministry notifications into 10 high-yield briefs with 100% verifiable government citations and a daily 10-MCQ test.',
      metrics: ['10 Daily Policy Signals', '100% Grounded Citations', 'Daily Practice 10-MCQs'],
      cta: 'Explore Daily Brief',
      icon: Globe,
      action: onNavigateTracker,
      color: '#0194a8'
    },
    {
      id: 'canon' as const,
      label: 'The Humanities Canon',
      title: 'Verbatim Primary Sources & Dialectic Bench',
      subtitle: 'Read the original words of thinkers the UPSC examiner repeatedly returns to.',
      description: 'Secondary coaching summaries butcher philosophical nuance. Sit in a monastic reading chamber with verbatim primary excerpts from Dr. B. R. Ambedkar, Mahatma Gandhi, and Immanuel Kant, with an interactive Dialectic Bench for comparative synthesis.',
      metrics: ['Verbatim Primary Excerpts', 'Dialectic Comparison Bench', 'Vector Engraved Portraits'],
      cta: 'Enter Canon Chamber',
      icon: BookOpen,
      action: onNavigateHumanities || onNavigateArena,
      color: '#e0d0ab'
    },
    {
      id: 'pillars' as const,
      label: 'Syllabus Pillars',
      title: '25-Year Empirical Spine & Static Vault Matrices',
      subtitle: 'Constitutional jurisprudence, macroeconomic corridors, and environmental frontiers.',
      description: 'Master the high-yield static syllabus mapped directly against a quarter century of UPSC CSE papers. Explore interactive branching mind maps, 10-year PYQ evidence matrices, and high-risk examiner trap warnings.',
      metrics: ['6 GS Subject Pillars', '25-Year PYQ Mapping', 'Examiner Trap Warnings'],
      cta: 'Inspect Syllabus Pillars',
      icon: Layers,
      action: onNavigateLibrary || onNavigateArena,
      color: '#c8b998'
    }
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
        />
      </div>

      {/* ── Desktop Widescreen Layout (md and above) ── */}
      <div className="hidden md:flex w-full max-w-5xl z-10 flex-col items-center justify-start space-y-16 mt-4">
        
        {/* ══════════════════════════════════════════════════════════════════
            1. HERO & CALM, HIGH-READABILITY HEADLINE
            ══════════════════════════════════════════════════════════════════ */}
        <div className="w-full flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
          
          {/* Status Pill */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-2.5"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[rgba(4,25,54,0.7)] border border-[rgba(19,108,153,0.4)] rounded-xs text-xs font-sans text-[#e8e0cf] backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
              <span className="text-[#8fa2bd]">Founders Club:</span>
              <span className="text-[#e0d0ab] font-medium">
                {seatData
                  ? (seatData.claimed_seats >= 25
                      ? `${seatData.claimed_seats} / ${seatData.max_capacity} Seats Claimed`
                      : `${seatData.max_capacity} Lifetime Founding Seats`)
                  : '500 Lifetime Founding Seats'}
              </span>
              <span className="text-[#8fa2bd] hidden sm:inline">&bull; 15-Min Lock</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[rgba(4,25,54,0.5)] border border-[rgba(19,108,153,0.35)] rounded-xs text-xs font-sans text-[#8fa2bd] backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399]" />
              <span>4,150+ Verified MCQs</span>
            </div>
          </motion.div>

          {/* Hero Headline & Calm Lede */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#e0d0ab] drop-shadow-[0_4px_30px_rgba(224,208,171,0.22)] leading-[1.15]">
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

          {/* Interactive Feature Segmented Switcher */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-[rgba(4,25,54,0.7)] p-1.5 rounded-xs border border-[rgba(19,108,153,0.35)] backdrop-blur-md">
            {features.map((f) => {
              const active = activeFeatureTab === f.id;
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFeatureTab(f.id)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xs font-sans text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-[#e0d0ab] text-[#072e63] font-semibold shadow-md'
                      : 'text-[#8fa2bd] hover:text-[#e8e0cf] hover:bg-[rgba(11,61,120,0.3)]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Engine Card */}
          <div className="bg-[rgba(4,25,54,0.65)] backdrop-blur-xl border border-[rgba(19,108,153,0.45)] rounded-xs p-6 md:p-8 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.5)]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-7 space-y-4">
                <span className="font-sans text-xs font-medium text-[#0194a8]">
                  {activeFeature.subtitle}
                </span>

                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#e8e0cf] tracking-tight">
                  {activeFeature.title}
                </h3>

                <p className="text-sm font-sans text-[#9fb0c8] leading-relaxed">
                  {activeFeature.description}
                </p>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {activeFeature.metrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xs bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.35)] font-sans text-xs text-[#e0d0ab] flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399] shrink-0" />
                      <span className="truncate">{m}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    onClick={activeFeature.action}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[rgba(224,208,171,0.12)] hover:bg-[#e0d0ab] border border-[rgba(224,208,171,0.4)] text-[#e0d0ab] hover:text-[#072e63] text-xs font-sans font-semibold rounded-xs transition-all cursor-pointer shadow-md"
                  >
                    <span>{activeFeature.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Graphical Visual Anchor */}
              <div className="lg:col-span-5 bg-[rgba(3,16,38,0.7)] border border-[rgba(19,108,153,0.35)] rounded-xs p-6 flex flex-col justify-between min-h-[240px]">
                <div className="flex items-center justify-between border-b border-[rgba(19,108,153,0.25)] pb-3">
                  <div className="flex items-center gap-2">
                    <ActiveIcon className="w-4 h-4 text-[#e0d0ab]" />
                    <span className="font-sans text-xs font-semibold text-[#e0d0ab]">
                      Live Engine Simulation
                    </span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
                </div>

                <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-xs bg-[rgba(224,208,171,0.1)] border border-[rgba(224,208,171,0.3)] flex items-center justify-center text-[#e0d0ab]">
                    <ActiveIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-serif text-sm font-bold text-[#e8e0cf]">{activeFeature.title}</p>
                    <p className="font-sans text-xs text-[#8fa2bd]">Zero Lag &bull; Instant Evaluation</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[rgba(19,108,153,0.25)] text-xs font-sans text-[#8fa2bd]">
                  <span>Latency: 12ms</span>
                  <span>Grounding: 100%</span>
                  <span className="text-[#34d399]">Active</span>
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
                  <td className="py-3.5 px-3 text-[#9fb0c8]">Second-hand summaries prone to distortion and errors.</td>
                  <td className="py-3.5 px-3 text-[#e8e0cf] font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#34d399] shrink-0" />
                    Verbatim primary canon texts with dialectic bench.
                  </td>
                </tr>

                <tr className="hover:bg-[rgba(11,61,120,0.2)] transition-colors">
                  <td className="py-3.5 px-3 font-sans text-[#e0d0ab] font-medium">Autopsy & Diagnostic Logic</td>
                  <td className="py-3.5 px-3 text-[#9fb0c8]">Static PDF answer keys with generic explanations.</td>
                  <td className="py-3.5 px-3 text-[#e8e0cf] font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#34d399] shrink-0" />
                    AI-powered cognitive autopsy isolating examiner traps.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════════
            5. FOUNDERS CLUB ACCESS BANNER
            ══════════════════════════════════════════════════════════════════ */}
        <div className="w-full bg-gradient-to-r from-[rgba(11,61,120,0.45)] via-[rgba(4,25,54,0.7)] to-[rgba(11,61,120,0.45)] border border-[rgba(224,208,171,0.35)] rounded-xs p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.6)]">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs bg-[rgba(224,208,171,0.12)] border border-[rgba(224,208,171,0.35)] text-[#e0d0ab] font-sans text-xs font-medium">
              <Shield className="w-3.5 h-3.5 text-[#e0d0ab]" />
              Founders Club Lifetime Access
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#e8e0cf]">
              Claim Your Lifetime Analytical Seat
            </h3>
            <p className="text-xs font-sans text-[#9fb0c8] max-w-xl">
              Strictly limited to 500 lifetime seats. Guaranteed access to all future question banks, AI autopsy models, and syllabus matrices.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onNavigateArena}
              className="px-6 py-2.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] font-sans text-sm font-semibold rounded-xs shadow-lg transition-all cursor-pointer"
            >
              Enter Arena Now &rarr;
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            6. FOOTER & ZERO-NOISE PLEDGE
            ══════════════════════════════════════════════════════════════════ */}
        <footer className="w-full pt-8 pb-4 text-center space-y-4 border-t border-[rgba(19,108,153,0.3)]">
          <p className="text-xs font-sans text-[#8fa2bd]">
            No ads &bull; No affiliate links &bull; No sponsored content &bull; Pure analytical intelligence
          </p>
          <div className="flex items-center justify-center gap-4 text-xs font-sans text-[#8fa2bd]">
            <button onClick={() => onNavigateLegal?.('terms')} className="hover:text-[#e0d0ab] transition-colors cursor-pointer">Terms of Service</button>
            <span>&bull;</span>
            <button onClick={() => onNavigateLegal?.('privacy')} className="hover:text-[#e0d0ab] transition-colors cursor-pointer">Privacy Policy</button>
            <span>&bull;</span>
            <button onClick={() => onNavigateLegal?.('refund')} className="hover:text-[#e0d0ab] transition-colors cursor-pointer">Refund Policy</button>
          </div>
        </footer>

      </div>
    </div>
  );
}