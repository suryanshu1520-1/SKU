import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Brain,
  Shield,
  Sparkles,
  CheckCircle2,
  Globe,
  Swords,
  BookOpen,
  Layers,
  Target,
  ChevronDown,
  ExternalLink,
  Zap,
  Check
} from 'lucide-react';
import DiagnosticPreview from './DiagnosticPreview';

interface MobileLandingProps {
  onNavigateArena: () => void;
  onNavigateTracker: () => void;
  onNavigateProfile: () => void;
  onNavigateLibrary?: () => void;
  onNavigateHumanities?: () => void;
  onNavigateManifesto?: () => void;
  onNavigateLegal?: (type: 'privacy' | 'terms' | 'refund') => void;
  seatData: {
    max_capacity: number;
    claimed_seats: number;
    remaining_seats: number;
  } | null;
}

export default function MobileLanding({
  onNavigateArena,
  onNavigateTracker,
  onNavigateProfile,
  onNavigateLibrary,
  onNavigateHumanities,
  onNavigateManifesto,
  onNavigateLegal,
  seatData,
}: MobileLandingProps) {
  const [expandedEngine, setExpandedEngine] = useState<string | null>('arena');

  const engines = [
    {
      id: 'arena',
      title: 'The Test Arena',
      badge: 'Zero-Trust Mock Simulator',
      summary: 'Timed examination with +2.00 / -0.66 marking and AI conceptual autopsy.',
      details: 'Evaluates answers server-side with zero client leaks, identifying your exact cognitive blindspots before the UPSC examiner strikes.',
      action: onNavigateArena,
      cta: 'Launch Mock Arena',
      icon: Swords,
      color: '#34d399',
    },
    {
      id: 'brief',
      title: 'The Daily Brief',
      badge: 'Grounded Policy Signals',
      summary: '10 curated policy dispatches in a 4-minute read with 100% PIB citations.',
      details: 'Stop reading 150-page monthly pdf magazines. Get verified cabinet releases, policy metrics, and a daily 10-MCQ practice test.',
      action: onNavigateTracker,
      cta: 'Read Today’s Brief',
      icon: Globe,
      color: '#0194a8',
    },
    {
      id: 'canon',
      title: 'The Humanities Canon',
      badge: 'Verbatim Primary Texts',
      summary: 'Original philosophical excerpts from Ambedkar, Gandhi, and Kant.',
      details: 'Read verbatim primary passages with a multi-thinker Dialectic Bench for comparative synthesis in GS-4 ethics and mains essays.',
      action: onNavigateHumanities || onNavigateArena,
      cta: 'Enter Canon Chamber',
      icon: BookOpen,
      color: '#e0d0ab',
    },
    {
      id: 'pillars',
      title: 'Syllabus Pillars',
      badge: '25-Year Empirical Spine',
      summary: '6 GS subjects mapped against a quarter century of UPSC papers.',
      details: 'Explore interactive mind maps, static vault matrices, and examiner trap warnings for foolproof revision.',
      action: onNavigateLibrary || onNavigateArena,
      cta: 'Inspect Pillars',
      icon: Layers,
      color: '#c8b998',
    },
  ];

  return (
    <div className="w-full font-sans text-stone-100 pb-32 space-y-8">
      
      {/* ── 1. Top Scarcity Bar ── */}
      <div className="flex items-center justify-center pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[rgba(4,25,54,0.75)] border border-[rgba(19,108,153,0.45)] rounded-xs text-[11px] font-sans text-[#e8e0cf] shadow-md">
          <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse shrink-0" />
          <span className="text-[#8fa2bd]">Founders Club:</span>
          <span className="text-[#e0d0ab] font-semibold">
            {seatData ? `${seatData.max_capacity} Lifetime Seats` : '500 Lifetime Seats'}
          </span>
          <span className="text-[#8fa2bd]">&bull; 15-Min Lock</span>
        </div>
      </div>

      {/* ── 2. Mobile Hero Lockup ── */}
      <div className="text-center space-y-3.5 px-2">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#e0d0ab] leading-snug drop-shadow-[0_2px_16px_rgba(224,208,171,0.2)]">
          The Analytical Crucible for India&apos;s Toughest Exam.
        </h1>
        <p className="text-[#c8b998] text-[14.5px] font-sans leading-relaxed">
          One exam date. Infinite syllabus. Tark locates your cognitive blindspot before the UPSC examiner does.
        </p>
      </div>

      {/* ── 3. Touch-First Diagnostic Question ── */}
      <div className="w-full">
        <DiagnosticPreview onLaunchFullArena={onNavigateArena} />
      </div>

      {/* ── 4. The 4 Engines of Tark (Mobile Accordion Deck) ── */}
      <div className="space-y-3 px-1">
        <div className="text-left space-y-1 mb-2">
          <span className="text-xs font-sans font-medium text-[#0194a8]">Complete Architecture</span>
          <h2 className="font-serif text-xl font-bold text-[#e0d0ab]">Four Distinct Engines</h2>
        </div>

        {engines.map((eng) => {
          const isExpanded = expandedEngine === eng.id;
          const Icon = eng.icon;

          return (
            <div
              key={eng.id}
              className="bg-[rgba(4,25,54,0.7)] border border-[rgba(19,108,153,0.4)] rounded-xs overflow-hidden transition-all shadow-sm"
            >
              <div
                onClick={() => setExpandedEngine(isExpanded ? null : eng.id)}
                className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xs flex items-center justify-center shrink-0 border border-[rgba(224,208,171,0.3)] bg-[rgba(224,208,171,0.1)] text-[#e0d0ab]"
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-sm font-bold text-[#e8e0cf] truncate">
                        {eng.title}
                      </h3>
                      <span className="text-[9.5px] font-sans px-1.5 py-0.2 rounded-xs bg-[rgba(1,148,168,0.15)] text-[#0194a8] border border-[rgba(1,148,168,0.3)] shrink-0">
                        {eng.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#9fb0c8] font-sans truncate mt-0.5">
                      {eng.summary}
                    </p>
                  </div>
                </div>

                <ChevronDown
                  className={`w-4 h-4 text-[#8fa2bd] shrink-0 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180 text-[#e0d0ab]' : ''
                  }`}
                />
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden px-4 pb-4 pt-1 border-t border-[rgba(19,108,153,0.25)] space-y-3"
                  >
                    <p className="text-xs font-sans text-[#c8b998] leading-relaxed">
                      {eng.details}
                    </p>
                    <button
                      onClick={eng.action}
                      className="w-full py-2.5 px-4 rounded-xs bg-[rgba(224,208,171,0.15)] hover:bg-[#e0d0ab] border border-[rgba(224,208,171,0.4)] text-[#e0d0ab] hover:text-[#072e63] font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>{eng.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── 5. Mobile Comparison Card ── */}
      <div className="bg-[rgba(4,25,54,0.65)] border border-[rgba(19,108,153,0.4)] rounded-xs p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#e0d0ab]" />
          <h3 className="font-serif text-sm font-bold text-[#e0d0ab]">
            Zero-Trust Empirical Advantage
          </h3>
        </div>

        <div className="space-y-2.5 text-xs font-sans">
          <div className="flex items-start gap-2.5 p-2 rounded-xs bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.3)]">
            <Check className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#e8e0cf]">Server-Side Evaluation:</span>
              <p className="text-[#9fb0c8] text-[11.5px] mt-0.5">Answer keys never sent to browser; leak-proof scoring.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2 rounded-xs bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.3)]">
            <Check className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#e8e0cf]">100% Grounded PIB Citations:</span>
              <p className="text-[#9fb0c8] text-[11.5px] mt-0.5">Direct Gazette and Ministry references for every news brief.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2 rounded-xs bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.3)]">
            <Check className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#e8e0cf]">Verbatim Primary Canon:</span>
              <p className="text-[#9fb0c8] text-[11.5px] mt-0.5">Original words from Ambedkar, Gandhi, and Kant for GS-4.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. Manifesto Link & Footer ── */}
      <div className="text-center space-y-3 pt-2">
        <button
          onClick={onNavigateManifesto}
          className="inline-flex items-center gap-1.5 text-xs font-sans text-[#e0d0ab] hover:underline"
        >
          <Target className="w-3.5 h-3.5" />
          <span>Read The Tark Manifesto</span>
        </button>

        <div className="pt-4 border-t border-[rgba(19,108,153,0.3)] space-y-2 text-[11px] font-sans text-[#8fa2bd]">
          <p>No ads &bull; No affiliate links &bull; No sponsored content</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => onNavigateLegal?.('terms')} className="hover:text-[#e0d0ab]">Terms</button>
            <span>&bull;</span>
            <button onClick={() => onNavigateLegal?.('privacy')} className="hover:text-[#e0d0ab]">Privacy</button>
            <span>&bull;</span>
            <button onClick={() => onNavigateLegal?.('refund')} className="hover:text-[#e0d0ab]">Refunds</button>
          </div>
        </div>
      </div>

      {/* ── 7. Fixed Thumb Action Bar (Mobile Sticky Dock) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[rgba(4,25,54,0.95)] backdrop-blur-xl border-t border-[rgba(19,108,153,0.5)] p-3 px-4 shadow-[0_-8px_24px_rgba(0,0,0,0.6)] flex items-center gap-2.5">
        <button
          onClick={onNavigateArena}
          className="flex-1 py-3 px-4 bg-[#e0d0ab] hover:bg-white text-[#072e63] font-sans text-xs font-bold rounded-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Brain className="w-4 h-4" />
          <span>Enter Test Arena</span>
        </button>

        <button
          onClick={onNavigateTracker}
          className="py-3 px-3 bg-[rgba(11,61,120,0.4)] border border-[rgba(19,108,153,0.5)] text-[#e0d0ab] font-sans text-xs font-medium rounded-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
          title="Daily Brief"
        >
          <Globe className="w-4 h-4 text-[#0194a8]" />
          <span>Daily Brief</span>
        </button>
      </div>

    </div>
  );
}
