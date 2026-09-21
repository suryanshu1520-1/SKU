import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Clock3,
  FileText,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import InteractiveBackground from './InteractiveBackground';
import type { CandidatePreferences } from '../types';
import { calculateExamCountdown } from '../lib/candidatePreferences';

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
  remaining_seats: number;
}

const steps = [
  { number: '01', title: 'Practice under pressure', body: 'Take focused, timed questions built around the way UPSC actually tests recall and judgment.' },
  { number: '02', title: 'Understand the mistake', body: 'See the trap behind every wrong answer instead of collecting another unexplained score.' },
  { number: '03', title: 'Return with a plan', body: 'Use your patterns to choose the next revision session with less guesswork.' },
];

const pillars = [
  { icon: Target, title: 'The Arena', body: 'Realistic mock exams with strict marking and instant review.', action: 'Start a mock', onClick: 'arena' },
  { icon: FileText, title: 'The Daily Brief', body: 'Four minutes of grounded, exam-relevant current affairs.', action: 'Read today', onClick: 'tracker' },
  { icon: BarChart3, title: 'The Observatory', body: 'Find the topics and habits that are quietly costing you marks.', action: 'View intelligence', onClick: 'observatory' },
];

export default function Landing({
  onNavigateArena,
  onNavigateTracker,
  onNavigateProfile,
  onNavigateObservatory,
  onNavigateManifesto,
  onNavigateLegal,
  candidatePreferences,
}: LandingProps) {
  const [seatData, setSeatData] = useState<SeatCountData | null>(null);
  const countdown = calculateExamCountdown(candidatePreferences?.targetYear || '2026');

  useEffect(() => {
    let active = true;
    supabase.rpc('get_available_seat_count').then(({ data }) => {
      if (active && data) setSeatData(data as SeatCountData);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const navigatePillar = (type: string) => {
    if (type === 'arena') onNavigateArena();
    if (type === 'tracker') onNavigateTracker();
    if (type === 'observatory') onNavigateObservatory?.();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07100f] text-[#f3f0e8] selection:bg-[#d6b36a] selection:text-[#101a16]">
      <InteractiveBackground />
      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 py-6">
          <button onClick={onNavigateManifesto} className="group flex items-center gap-3 text-left" aria-label="Open Tark manifesto">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[#d6b36a]/50 bg-[#d6b36a]/10 font-serif text-lg text-[#d6b36a]">T</span>
            <span>
              <span className="block font-serif text-lg tracking-wide text-[#f4ead3]">Tark</span>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-[#91a59a]">Preparation, with evidence</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onNavigateProfile} className="hidden rounded-full px-4 py-2 text-sm text-[#b5c3ba] transition hover:bg-white/5 hover:text-white sm:block">Sign in</button>
            <button onClick={onNavigateArena} className="rounded-full border border-[#d6b36a]/60 bg-[#d6b36a] px-4 py-2 text-sm font-semibold text-[#172019] transition hover:bg-[#f0d18e]">Start diagnostic</button>
          </div>
        </header>

        <section className="grid items-center gap-14 pb-24 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-32 lg:pt-24">
          <div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-7 flex flex-wrap items-center gap-3 text-xs text-[#9cac9f]">
              <span className="flex items-center gap-2 rounded-full border border-[#89b69e]/25 bg-[#89b69e]/10 px-3 py-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#89d0a8]" />{countdown.daysRemaining} days to Prelims</span>
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#89b69e]" />Verified question bank</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="max-w-3xl font-serif text-5xl leading-[1.05] tracking-[-0.04em] text-[#f4ead3] sm:text-6xl lg:text-7xl">
              Prepare with a <em className="text-[#d6b36a]">clearer signal.</em>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }} className="mt-7 max-w-xl text-lg leading-8 text-[#adbbb2]">
              Tark helps serious UPSC aspirants turn practice into progress. Test yourself, understand the mistake, and know what to study next.
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={onNavigateArena} className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#d6b36a] px-6 py-3.5 font-semibold text-[#172019] shadow-[0_12px_35px_rgba(214,179,106,0.18)] transition hover:-translate-y-0.5 hover:bg-[#f0d18e]">
                Take the diagnostic <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>
              <button onClick={onNavigateTracker} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm text-[#d5ded7] transition hover:border-white/35 hover:bg-white/5"><Play className="h-4 w-4" /> See how it works</button>
            </motion.div>
            <p className="mt-4 text-xs text-[#788b80]">No commitment. Start with one focused session.</p>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.18 }} className="relative">
            <div className="absolute -inset-8 rounded-full bg-[#d6b36a]/5 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#101d18]/90 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="text-[11px] uppercase tracking-[0.22em] text-[#84998c]">Your next session</p><h2 className="mt-2 font-serif text-2xl text-[#f4ead3]">Find your starting point</h2></div><Sparkles className="h-5 w-5 text-[#d6b36a]" /></div>
              <div className="py-7"><p className="text-sm leading-6 text-[#aebdb3]">A 20-question diagnostic reveals your current accuracy, speed, and most expensive blind spots.</p><div className="mt-6 grid grid-cols-3 gap-2"><div className="rounded-xl bg-white/5 p-3"><Clock3 className="h-4 w-4 text-[#89b69e]" /><p className="mt-3 text-lg font-semibold text-white">25</p><p className="text-[11px] text-[#879a8e]">minutes</p></div><div className="rounded-xl bg-white/5 p-3"><Target className="h-4 w-4 text-[#d6b36a]" /><p className="mt-3 text-lg font-semibold text-white">20</p><p className="text-[11px] text-[#879a8e]">questions</p></div><div className="rounded-xl bg-white/5 p-3"><TrendingUp className="h-4 w-4 text-[#89b69e]" /><p className="mt-3 text-lg font-semibold text-white">1</p><p className="text-[11px] text-[#879a8e]">clear next step</p></div></div></div>
              <button onClick={onNavigateArena} className="flex w-full items-center justify-between rounded-xl border border-[#d6b36a]/30 bg-[#d6b36a]/10 px-4 py-3 text-left text-sm text-[#f0d18e] transition hover:bg-[#d6b36a]/20"><span>Begin your diagnostic</span><ArrowRight className="h-4 w-4" /></button>
            </div>
          </motion.div>
        </section>

        <section className="border-y border-white/10 py-8"><div className="grid gap-6 text-sm text-[#aebdb3] sm:grid-cols-3"><div className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#89b69e]" /><span>Strict UPSC-style marking, not vanity scores.</span></div><div className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#89b69e]" /><span>Explanations that show why an option was tempting.</span></div><div className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#89b69e]" /><span>Recommendations grounded in your own patterns.</span></div></div></section>

        <section className="py-24"><div className="max-w-2xl"><p className="text-xs uppercase tracking-[0.24em] text-[#d6b36a]">The learning loop</p><h2 className="mt-4 font-serif text-4xl leading-tight text-[#f4ead3] sm:text-5xl">Replace scattered effort with a repeatable practice.</h2></div><div className="mt-14 grid gap-10 md:grid-cols-3">{steps.map((step) => <div key={step.number} className="border-t border-white/15 pt-5"><span className="font-mono text-xs text-[#d6b36a]">{step.number}</span><h3 className="mt-5 font-serif text-xl text-[#f4ead3]">{step.title}</h3><p className="mt-3 text-sm leading-7 text-[#91a59a]">{step.body}</p></div>)}</div></section>

        <section className="rounded-[2rem] border border-white/10 bg-[#0d1915]/80 p-6 sm:p-10"><div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end"><div><p className="text-xs uppercase tracking-[0.24em] text-[#d6b36a]">One system, three useful views</p><h2 className="mt-3 max-w-xl font-serif text-3xl text-[#f4ead3]">Everything you need to make the next session count.</h2></div><button onClick={onNavigateManifesto} className="inline-flex items-center gap-2 text-sm text-[#d6b36a] hover:text-[#f0d18e]">Read our approach <ArrowRight className="h-4 w-4" /></button></div><div className="mt-9 grid gap-3 md:grid-cols-3">{pillars.map(({ icon: Icon, title, body, action, onClick }) => <button key={title} onClick={() => navigatePillar(onClick)} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:-translate-y-1 hover:border-[#d6b36a]/40 hover:bg-white/[0.06]"><Icon className="h-5 w-5 text-[#89b69e]" /><h3 className="mt-7 font-serif text-xl text-[#f4ead3]">{title}</h3><p className="mt-2 min-h-14 text-sm leading-6 text-[#91a59a]">{body}</p><span className="mt-5 inline-flex items-center gap-2 text-sm text-[#d6b36a]">{action}<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span></button>)}</div></section>

        <footer className="flex flex-col gap-5 border-t border-white/10 py-10 text-xs text-[#788b80] sm:flex-row sm:items-center sm:justify-between"><div><p className="font-serif text-base text-[#c9d5cc]">Tark</p><p className="mt-1">A quieter, sharper way to prepare.</p></div><div className="flex flex-wrap gap-5"><button onClick={onNavigateLegal ? () => onNavigateLegal('privacy') : undefined} className="hover:text-white">Privacy</button><button onClick={onNavigateLegal ? () => onNavigateLegal('terms') : undefined} className="hover:text-white">Terms</button><span>{seatData ? `${seatData.remaining_seats} places available` : 'Built for focused preparation'}</span></div></footer>
      </div>
    </main>
  );
}
