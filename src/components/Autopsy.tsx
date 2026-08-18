import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Loader2, Sparkles, Shield, Trophy, Clock, CheckCircle2, XCircle, HelpCircle, ArrowRight } from 'lucide-react';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { supabase } from '../lib/supabase';
import { AnimatedNumber, AccuracyBar, StatCard } from './shared';

interface AutopsyProps {
  stats: {
    correct: number;
    incorrect: number;
    unattempted: number;
    totalTimeSeconds?: number;
    subjectStats?: Record<string, { correct: number; total: number }>;
    isRanked?: boolean;
  };
  percentile: number;
  onNavigateManifesto?: () => void;
  onReturnToDashboard?: () => void;
  onDeployNext?: () => void;
}

export default function Autopsy({
  stats,
  percentile,
  onNavigateManifesto,
  onReturnToDashboard,
  onDeployNext,
}: AutopsyProps) {
  const [insights, setInsights] = useState<{ overallInsights?: string; subjectInsights?: Record<string, string> } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (Object.keys(stats.subjectStats || {}).length > 0) {
      setLoadingInsights(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        const token = session?.access_token || '';
        fetch('/api/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ stats }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.insights) setInsights(data.insights);
          })
          .catch((err) => console.error('Error fetching insights:', err))
          .finally(() => setLoadingInsights(false));
      });
    }
  }, [stats]);

  const total = stats.correct + stats.incorrect + stats.unattempted;
  const tts = stats.totalTimeSeconds || 0;
  const mins = Math.floor(tts / 60);
  const secs = tts % 60;
  const avgTime = total > 0 ? tts / total : 0;

  const isRanked = stats.isRanked === true;
  const accuracy = total > 0 ? stats.correct / total : 0;

  let cpEarned = 0;
  let cpCorrect = 0;
  let cpPenalty = 0;
  let cpBonus = 0;

  if (isRanked) {
    cpCorrect = stats.correct * 3;
    cpPenalty = stats.incorrect * 1;
    cpEarned = cpCorrect - cpPenalty;
    if (accuracy >= 0.8) {
      cpBonus = 15;
      cpEarned += 15;
    }
    if (cpEarned < 0) {
      cpEarned = 0;
    }
  }

  const isHighPerformer = percentile >= 75 || accuracy >= 0.7;

  return (
    <div className="min-h-screen text-stone-100 flex flex-col items-center p-4 sm:p-6 pb-24 relative overflow-hidden font-sans">
      
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/30 via-zinc-950 to-zinc-950 -z-10 pointer-events-none" />

      <motion.div
        initial={prefersReduced ? undefined : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl mt-8 sm:mt-16 space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#e0d0ab]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Session Autopsy & Diagnostics
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Performance Autopsy
          </h1>
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
            {isRanked ? 'Vanguard Competitive Protocol' : 'Unranked Diagnostics Arena'} &bull; {total} Questions Evaluated
          </p>
        </div>

        {/* 1. Headline Stats Grid (Animated Count-Up) */}
        <motion.div
          initial={prefersReduced ? undefined : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-3 gap-3 bg-zinc-900/30 border border-zinc-800 p-3 sm:p-4 rounded-sm"
        >
          <div className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-sm flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Correct</span>
            </div>
            <span className="text-3xl sm:text-4xl font-mono font-bold text-emerald-400">
              <AnimatedNumber value={stats.correct} />
            </span>
            <span className="text-[10px] font-mono text-zinc-500 mt-1">
              +{stats.correct * 2.0} Marks
            </span>
          </div>

          <div className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-sm flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold mb-1">
              <XCircle className="w-3.5 h-3.5" />
              <span>Incorrect</span>
            </div>
            <span className="text-3xl sm:text-4xl font-mono font-bold text-rose-400">
              <AnimatedNumber value={stats.incorrect} />
            </span>
            <span className="text-[10px] font-mono text-zinc-500 mt-1">
              -{(stats.incorrect * 0.66).toFixed(2)} Penalty
            </span>
          </div>

          <div className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-sm flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold mb-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Unattempted</span>
            </div>
            <span className="text-3xl sm:text-4xl font-mono font-bold text-zinc-300">
              <AnimatedNumber value={stats.unattempted} />
            </span>
            <span className="text-[10px] font-mono text-zinc-500 mt-1">
              0.00 Net
            </span>
          </div>
        </motion.div>

        {/* 2. Percentile Standing Banner */}
        <motion.div
          initial={prefersReduced ? undefined : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className={`p-6 sm:p-8 rounded-sm border text-center relative overflow-hidden backdrop-blur-sm ${
            isHighPerformer
              ? 'bg-gradient-to-b from-zinc-900/60 to-zinc-950 border-[#0194a8]/50 shadow-lg shadow-[#0194a8]/10'
              : 'bg-zinc-900/40 border-zinc-800'
          }`}
        >
          <div className="space-y-2 max-w-lg mx-auto">
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              Cohort Standing & Mastery Index
            </p>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
              Higher than{' '}
              <span className="text-[#e0d0ab] font-mono">
                <AnimatedNumber value={percentile} suffix="%" />
              </span>{' '}
              of candidate submissions.
            </h3>
            <p className="text-xs font-sans text-zinc-400 leading-relaxed pt-1">
              {percentile >= 80
                ? 'Exceptional precision. You have cleared the Vanguard benchmark for elite accuracy.'
                : percentile >= 50
                ? 'Competitive baseline achieved. Strengthening subject focus areas will accelerate percentile growth.'
                : 'Diagnostic completed. Review conceptual insights below to eliminate repeat errors.'}
            </p>
          </div>
        </motion.div>

        {/* 3. Contender Points Yield Breakdown (Ranked only) */}
        {isRanked && (
          <motion.div
            initial={prefersReduced ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="border border-[#e0d0ab]/30 bg-[#e0d0ab]/5 p-6 rounded-sm text-center space-y-4"
          >
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-[#e0d0ab]" />
              <h3 className="text-xs font-mono text-[#e0d0ab] uppercase tracking-widest font-bold">
                Contender Points Yield
              </h3>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10 py-2">
              <div className="flex flex-col items-center">
                <span className="text-xl sm:text-2xl font-mono text-emerald-400 font-bold">
                  <AnimatedNumber value={cpCorrect} prefix="+" />
                </span>
                <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest mt-1">
                  Correct (+3 CP)
                </span>
              </div>

              <span className="text-zinc-600 font-mono text-lg select-none">&minus;</span>

              <div className="flex flex-col items-center">
                <span className="text-xl sm:text-2xl font-mono text-rose-400 font-bold">
                  <AnimatedNumber value={cpPenalty} prefix="-" />
                </span>
                <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest mt-1">
                  Penalty (-1 CP)
                </span>
              </div>

              {cpBonus > 0 && (
                <>
                  <span className="text-zinc-600 font-mono text-lg select-none">+</span>
                  <div className="flex flex-col items-center">
                    <span className="text-xl sm:text-2xl font-mono text-[#e0d0ab] font-bold">
                      <AnimatedNumber value={cpBonus} prefix="+" />
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest mt-1">
                      80%+ Bonus
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-[#e0d0ab]/15 flex items-center justify-center gap-2">
              <span className="text-xs font-mono text-stone-300 uppercase tracking-wider">
                Total Net Yield:
              </span>
              <span className="text-2xl font-mono text-[#e0d0ab] font-bold">
                <AnimatedNumber value={cpEarned} /> CP
              </span>
            </div>
          </motion.div>
        )}

        {/* 4. Execution Telemetry & Detailed Subject Breakdown */}
        <motion.div
          initial={prefersReduced ? undefined : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8 rounded-sm space-y-8"
        >
          {/* Execution Time Telemetry */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0194a8]" />
              <h4 className="font-mono text-xs uppercase tracking-widest text-[#e0d0ab] font-bold">
                Execution Pace Telemetry
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-sm">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1">
                  Total Active Time
                </span>
                <span className="text-2xl font-mono font-bold text-stone-100">
                  {mins > 0 ? `${mins}m ` : ''}{secs.toFixed(1)}s
                </span>
              </div>

              <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-sm">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1">
                  Average Pace Per Query
                </span>
                <span className="text-2xl font-mono font-bold text-[#0194a8]">
                  {avgTime.toFixed(1)}s
                </span>
              </div>
            </div>
          </div>

          {/* Subject Area Accuracy Bars */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <h4 className="font-mono text-xs uppercase tracking-widest text-[#e0d0ab] font-bold">
                Domain Mastery Breakdown
              </h4>
              <span className="text-[10px] font-mono text-zinc-500">
                Sorted by Need of Focus
              </span>
            </div>

            {!stats.subjectStats || Object.keys(stats.subjectStats).length === 0 ? (
              <p className="text-xs font-mono text-zinc-500">
                No subject-level telemetry recorded for this assessment.
              </p>
            ) : (
              <div className="space-y-5">
                {Object.entries(stats.subjectStats)
                  .sort((a, b) => {
                    const percA = Math.round((a[1].correct / a[1].total) * 100);
                    const percB = Math.round((b[1].correct / b[1].total) * 100);
                    return percA - percB;
                  })
                  .map(([subj, data], sIdx) => {
                    const percentage = Math.round((data.correct / data.total) * 100);
                    return (
                      <AccuracyBar
                        key={subj}
                        label={subj}
                        accuracy={percentage}
                        correctCount={data.correct}
                        totalCount={data.total}
                        delay={sIdx * 0.1}
                      />
                    );
                  })}
              </div>
            )}
          </div>

          {/* Subjective AI Autopsy Feedback */}
          {(loadingInsights || insights) && (
            <div className="pt-6 border-t border-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#e0d0ab]" />
                <h4 className="font-mono text-xs uppercase tracking-widest text-[#e0d0ab] font-bold">
                  Conceptual Autopsy Synthesis
                </h4>
              </div>

              {loadingInsights ? (
                <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-mono py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0194a8]" />
                  <span>Synthesizing conceptual diagnostic feedback...</span>
                </div>
              ) : insights?.overallInsights ? (
                <div className="prose prose-invert prose-p:text-xs sm:prose-p:text-sm prose-li:text-xs sm:prose-li:text-sm prose-p:leading-relaxed max-w-none text-zinc-300 font-serif bg-zinc-950/60 p-5 rounded-sm border border-zinc-800/80">
                  <Markdown rehypePlugins={[rehypeSanitize]}>{insights.overallInsights}</Markdown>
                </div>
              ) : null}
            </div>
          )}
        </motion.div>

        {/* 5. Navigation Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={onReturnToDashboard}
            className="inline-flex items-center justify-center gap-2 py-3 px-8 bg-[#e0d0ab] hover:bg-stone-100 text-zinc-950 font-mono text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-md shadow-[#e0d0ab]/10 cursor-pointer"
          >
            Return to Dashboard
          </button>
          <button
            onClick={onDeployNext}
            className="inline-flex items-center justify-center gap-2 py-3 px-8 bg-zinc-900 hover:bg-zinc-800 text-stone-200 hover:text-[#e0d0ab] border border-zinc-800 hover:border-[#0194a8] font-mono text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#0194a8]" />
            <span>Deploy Next Protocol</span>
          </button>
        </div>

        {/* 6. Founders Club Invitation Card */}
        <div className="backdrop-blur-md bg-zinc-900/30 border border-zinc-800/80 rounded-sm p-6 sm:p-8 text-center space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-5 h-5 text-[#e0d0ab]" />
            <h3 className="font-serif text-lg font-bold text-white">
              Founders Club Clearance
            </h3>
          </div>
          <p className="text-xs font-sans text-zinc-400 leading-relaxed max-w-md mx-auto">
            Tark is an ad-free, zero-noise testing arena. Secure your lifetime Founders Seat to unlock global leaderboard telemetry, unlimited mock sessions, and direct access.
          </p>
          <button
            onClick={onNavigateManifesto}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-[#e0d0ab] hover:text-white border border-[#e0d0ab]/40 hover:border-[#e0d0ab] text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer"
          >
            <span>Review Founders Charter</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </motion.div>
    </div>
  );
}
