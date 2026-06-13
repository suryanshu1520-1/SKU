import { motion } from 'motion/react';
import { ArrowRight, Target, Brain, Shield, Sparkles } from 'lucide-react';

interface LandingProps {
  onNavigateArena: () => void;
  onNavigateTracker: () => void;
  onNavigateProfile: () => void;
  onNavigateManifesto?: () => void;
}

export default function Landing({ onNavigateArena, onNavigateTracker, onNavigateProfile, onNavigateManifesto }: LandingProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-stone-50 font-sans relative overflow-hidden">
      {/* Subtle background grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      <div className="w-full max-w-2xl z-10 flex flex-col items-center justify-center min-h-[80vh]">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-widest text-[#e0d0ab] drop-shadow-[0_0_15px_rgba(224,208,171,0.25)] mb-6 select-none">
            Tark 1.0 | तर्क 1.0
          </h1>
          <p className="text-zinc-400 text-sm md:text-base font-sans max-w-lg mx-auto leading-relaxed">
            Assess. Analyze. Track.
          </p>
        </motion.div>

        {/* Capability Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-12">
          <motion.button
            onClick={onNavigateArena}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-zinc-900/30 border border-zinc-800/60 p-6 rounded-sm hover:border-emerald-500/40 transition-all group cursor-pointer text-left hover:bg-zinc-900/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-zinc-800 rounded-sm group-hover:bg-emerald-500/10 transition-colors">
                <Brain className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-300 group-hover:text-emerald-300 transition-colors">
                Analytical Arena
              </h3>
            </div>
            <p className="text-zinc-500 text-xs leading-relaxed font-sans">
              Time-bound multi-subject assessments with real-time feedback, conceptual insights, and performance analytics. Each session tests your reasoning under pressure.
            </p>
          </motion.button>

          <motion.button
            onClick={onNavigateTracker}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-zinc-900/30 border border-zinc-800/60 p-6 rounded-sm hover:border-[#e0d0ab]/40 transition-all group cursor-pointer text-left hover:bg-zinc-900/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-zinc-800 rounded-sm group-hover:bg-[#e0d0ab]/10 transition-colors">
                <Shield className="w-5 h-5 text-[#e0d0ab]" />
              </div>
              <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-300 group-hover:text-[#e0d0ab] transition-colors">
                Policy Tracker
              </h3>
            </div>
            <p className="text-zinc-500 text-xs leading-relaxed font-sans">
              Curated administrative intelligence feed. Track high-signal policy briefs, ministry updates, and governance developments from verified press channels.
            </p>
          </motion.button>
        </div>

        {/* Main CTA - Read the Manifesto */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <button
            onClick={onNavigateManifesto}
            className="group inline-flex items-center gap-2 py-3 px-8 bg-[#e0d0ab] text-zinc-950 font-sans text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-stone-100 transition-all shadow-lg shadow-[#e0d0ab]/10 hover:shadow-[#e0d0ab]/20"
          >
            <Target className="w-4 h-4" />
            Read the Manifesto
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </motion.div>

        {/* Footer */}
        <div className="mt-12 text-center space-y-4">
          <p className="text-[10px] font-sans text-zinc-600 uppercase tracking-widest">
            TARK 1.0 IS AN AD-FREE INITIATIVE FOREVER.
          </p>
        </div>
      </div>
    </div>
  );
}