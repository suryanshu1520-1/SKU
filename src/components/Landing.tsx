import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Target, Brain, Shield, Sparkles, CheckCircle2, Lock, Flame, Trophy, Compass, Layers, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import InteractiveBackground from './InteractiveBackground';
import TiltCard from './TiltCard';
import DiagnosticPreview from './DiagnosticPreview';
import SyllabusMatrix from './SyllabusMatrix';

interface LandingProps {
  onNavigateArena: () => void;
  onNavigateTracker: () => void;
  onNavigateProfile: () => void;
  onNavigateLibrary?: () => void;
  onNavigateManifesto?: () => void;
  onNavigateLegal?: (type: 'privacy' | 'terms' | 'refund') => void;
}

interface SeatCountData {
  max_capacity: number;
  claimed_seats: number;
  remaining_seats: number;
}

export default function Landing({ onNavigateArena, onNavigateTracker, onNavigateProfile, onNavigateLibrary, onNavigateManifesto, onNavigateLegal }: LandingProps) {
  const [seatData, setSeatData] = useState<SeatCountData | null>(null);

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-24 pb-16 px-4 md:px-8 bg-zinc-950 text-stone-50 font-sans relative overflow-x-hidden">
      
      {/* Interactive Constellation & Mouse Spotlight Canvas */}
      <InteractiveBackground />

      {/* Subtle background grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_70%,transparent_100%)] opacity-20 pointer-events-none z-0" />

      <div className="w-full max-w-5xl z-10 flex flex-col items-center justify-start space-y-12">
        
        {/* Provable Scarcity & Operational Status Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-2.5"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900/90 border border-zinc-800/80 rounded-sm text-[10px] font-sans uppercase tracking-widest text-zinc-300 backdrop-blur-md shadow-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>FOUNDERS CLUB:</span>
            <span className="text-[#e0d0ab] font-bold">
              {/* Don't broadcast "0 claimed" — it reads as no traction. Show the honest
                  cohort framing until claims are non-trivial, then the real count. */}
              {seatData
                ? (seatData.claimed_seats >= 25
                    ? `${seatData.claimed_seats} / ${seatData.max_capacity} Seats Claimed`
                    : `${seatData.max_capacity} Lifetime Founding Seats`)
                : '500 Lifetime Founding Seats'}
            </span>
            <span className="text-zinc-500 hidden sm:inline">&bull; 15-Min Lock &bull; Lifetime</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800/80 rounded-sm text-[10px] font-sans uppercase tracking-wider text-zinc-400 backdrop-blur-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>1,720+ Items Synced</span>
          </div>
        </motion.div>

        {/* Hero Section with Spatial Depth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto"
        >
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#e0d0ab] drop-shadow-[0_0_25px_rgba(224,208,171,0.2)] mb-4 select-none leading-tight">
            The War on Noise.
          </h1>
          <p className="text-xs sm:text-sm font-sans tracking-[0.35em] uppercase mb-6 text-[#e0d0ab]/80">
            Assess. Analyze. Track.
          </p>
          <p className="text-zinc-300 text-sm sm:text-base md:text-lg font-sans max-w-2xl mx-auto leading-relaxed">
            You have one exam date and a syllabus that never stops expanding. Somewhere in it is the topic that fails you. Tark exists to find it before the examiner does.
          </p>
        </motion.div>

        {/* Primary Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          {/* Primary CTA — button-in-button: trailing arrow nested in its own chip,
              spring cubic-bezier, tactile active-press. Kept in the brand's sharp
              rounded-sm geometry (not high-end's default pill) per shape-consistency. */}
          <button
            onClick={onNavigateArena}
            className="w-full sm:w-auto group inline-flex items-center justify-between gap-3 py-3 pl-6 pr-3 bg-[#e0d0ab] text-zinc-950 font-sans text-xs font-bold uppercase tracking-widest rounded-sm shadow-xl shadow-[#e0d0ab]/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[#e0d0ab]/25 active:scale-[0.98] cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Take a Diagnostic Test
            </span>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-sm bg-zinc-950/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:bg-zinc-950/15">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>

          <button
            onClick={onNavigateManifesto}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-6 border border-zinc-800 text-zinc-300 font-sans text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-zinc-900/60 hover:text-[#e0d0ab] hover:border-zinc-700 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] cursor-pointer backdrop-blur-sm"
          >
            <Target className="w-4 h-4" />
            Read the Manifesto
          </button>
        </motion.div>

        {/* Interactive Diagnostic Preview Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-3xl"
        >
          <DiagnosticPreview onLaunchFullArena={onNavigateArena} />
        </motion.div>

        {/* 3D Interactive Capability Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <TiltCard
            onClick={onNavigateArena}
            className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-sm hover:border-emerald-500/40 transition-all cursor-pointer group backdrop-blur-md"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-zinc-800/80 rounded-sm group-hover:bg-emerald-500/10 transition-colors">
                <Brain className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold tracking-tight text-zinc-100 group-hover:text-emerald-300 transition-colors">
                  The Arena & Autopsy
                </h3>
                <span className="text-[10px] font-sans text-zinc-500">+2.00 / -0.66 marking</span>
              </div>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed font-sans mb-4">
              Timed examination arena testing recall under authentic exam pressure. Concludes with an AI-driven conceptual autopsy.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-sans group-hover:translate-x-1 transition-transform">
              <span>Enter Arena</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </TiltCard>

          <TiltCard
            onClick={onNavigateTracker}
            className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-sm hover:border-[#e0d0ab]/40 transition-all cursor-pointer group backdrop-blur-md"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-zinc-800/80 rounded-sm group-hover:bg-[#e0d0ab]/10 transition-colors">
                <Shield className="w-5 h-5 text-[#e0d0ab]" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold tracking-tight text-zinc-100 group-hover:text-[#e0d0ab] transition-colors">
                  The Daily Brief
                </h3>
                <span className="text-[10px] font-sans text-zinc-500">PIB & policy dispatches</span>
              </div>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed font-sans mb-4">
              Every PIB release and cabinet dispatch distilled into high-yield, 4-minute analytical briefs. Filter by ministry.
            </p>
            <div className="flex items-center gap-2 text-[#e0d0ab] text-xs font-sans group-hover:translate-x-1 transition-transform">
              <span>Explore Intelligence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </TiltCard>

          <TiltCard
            onClick={onNavigateLibrary ? onNavigateLibrary : onNavigateArena}
            className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-sm hover:border-[#e0d0ab]/40 transition-all cursor-pointer group backdrop-blur-md"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-zinc-800/80 rounded-sm group-hover:bg-[#e0d0ab]/10 transition-colors">
                <Layers className="w-5 h-5 text-[#e0d0ab]" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold tracking-tight text-zinc-100 group-hover:text-[#e0d0ab] transition-colors">
                  Syllabus Pillars
                </h3>
                <span className="text-[10px] font-sans text-zinc-500">25-Year Empirical Spine</span>
              </div>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed font-sans mb-4">
              Constitutional jurisprudence, temple architecture, monetary corridors, and moral philosophy mapped against 25 years of UPSC papers.
            </p>
            <div className="flex items-center gap-2 text-[#e0d0ab] text-xs font-sans group-hover:translate-x-1 transition-transform">
              <span>Inspect Pillars</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </TiltCard>
        </div>

        {/* Syllabus Matrix Visualizer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="w-full"
        >
          <SyllabusMatrix onSelectDomain={() => {}} />
        </motion.div>

        {/* Proof Section - Zero-Trust Integrity */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="w-full bg-zinc-900/20 border border-zinc-800/60 p-6 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left backdrop-blur-sm shadow-xl"
        >
          <div className="space-y-1">
            <h4 className="text-xs font-sans font-bold uppercase tracking-wider text-[#e0d0ab]">
              No Guesswork. Zero Client-Side Answer Trust.
            </h4>
            <p className="text-zinc-400 text-xs font-sans max-w-xl">
              1,720+ UPSC & State PSC standard items. Server-evaluated scoring ensures answer keys remain hidden until test completion. Double-spend prevention locks seat reservations atomically.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-emerald-400 font-sans text-xs font-semibold px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Integrity Verified</span>
          </div>
        </motion.div>

        {/* Footer & Pledges */}
        <div className="w-full pt-8 text-center space-y-4 border-t border-zinc-900">
          <p className="text-[11px] font-sans text-zinc-400 uppercase tracking-widest">
            No ads. No affiliate links. No sponsored content. Ever.
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] font-sans text-zinc-400 uppercase tracking-wider">
            <button onClick={() => onNavigateLegal?.('terms')} className="hover:text-[#e0d0ab] transition-colors cursor-pointer">Terms</button>
            <span>&bull;</span>
            <button onClick={() => onNavigateLegal?.('privacy')} className="hover:text-[#e0d0ab] transition-colors cursor-pointer">Privacy Policy</button>
            <span>&bull;</span>
            <button onClick={() => onNavigateLegal?.('refund')} className="hover:text-[#e0d0ab] transition-colors cursor-pointer">Refunds</button>
          </div>
        </div>

      </div>
    </div>
  );
}