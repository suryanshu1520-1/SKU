import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Loader2, Sparkles, Shield, Trophy, Clock, CheckCircle2, XCircle, HelpCircle, ArrowRight } from 'lucide-react';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { supabase } from '../lib/supabase';
import { fetchWithAuth } from '../lib/api';
import { AnimatedNumber, AccuracyBar, StatCard, ConceptInsightRenderer, MetricWithInterpretation } from './shared';

interface AutopsyProps {
  stats: {
    correct: number;
    incorrect: number;
    unattempted: number;
    totalTimeSeconds?: number;
    subjectStats?: Record<string, { correct: number; total: number }>;
    isRanked?: boolean;
    contextTag?: string;
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
      fetchWithAuth('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.insights) setInsights(data.insights);
        })
        .catch((err) => console.error('Error fetching insights:', err))
        .finally(() => setLoadingInsights(false));
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
    <div className="min-h-screen text-primary flex flex-col items-center p-4 sm:p-6 pb-24 relative overflow-hidden font-sans">
      
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-elevated/30 via-surface to-surface -z-10 pointer-events-none" />

      <motion.div
        initial={prefersReduced ? undefined : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl mt-8 sm:mt-16 space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-elevated border border-border rounded-sm text-[10px] font-sans font-medium uppercase tracking-wider text-[#e0d0ab]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Your results
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            {stats.contextTag || 'Test Review & Score Summary'}
          </h1>
          <p className="text-xs font-sans uppercase tracking-wider text-secondary">
            {isRanked ? 'Ranked test' : 'Practice test'} &bull; <span className="font-mono">{total}</span> Questions Evaluated
          </p>
        </div>

        {/* 1. Headline Stats Grid (Animated Count-Up with Interpretation Layer) */}
        <motion.div
          initial={prefersReduced ? undefined : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-elevated/30 border border-border p-3 sm:p-4 rounded-sm font-sans"
        >
          <MetricWithInterpretation
            label="Correct"
            value={stats.correct}
            icon={CheckCircle2}
            accentColor="text-emerald-400"
            subtext={`+${(stats.correct * 2.0).toFixed(1)} Marks`}
            interpretation={
              stats.correct === total && total > 0
                ? "Flawless accuracy across all evaluated questions."
                : stats.correct / Math.max(1, total) >= 0.7
                ? "Solid foundational accuracy on core domain questions."
                : "Foundational accuracy requires reinforcement across core concepts."
            }
            details={`+2.0 marks awarded per correct response. Gross marks: ${(stats.correct * 2.0).toFixed(1)}.`}
          />

          <MetricWithInterpretation
            label="Incorrect"
            value={stats.incorrect}
            icon={XCircle}
            accentColor="text-rose-400"
            subtext={`-${(stats.incorrect * 0.66).toFixed(2)} Penalty`}
            interpretation={
              stats.incorrect === 0
                ? "Zero negative penalties incurred during this test run."
                : stats.incorrect / Math.max(1, total) > 0.3
                ? "High error volume significantly penalizes net competitive score."
                : "Controlled mistake rate within permissible baseline margins."
            }
            details={`-0.66 marks deducted per incorrect attempt. Total penalty: ${(stats.incorrect * 0.66).toFixed(2)} marks.`}
          />

          <MetricWithInterpretation
            label="Unattempted"
            value={stats.unattempted}
            icon={HelpCircle}
            accentColor="text-primary"
            subtext="0.00 Net"
            interpretation={
              stats.unattempted === 0
                ? "Full attempt coverage — every question attempted."
                : stats.unattempted / Math.max(1, total) > 0.3
                ? "High omission rate protected marks but left scoring potential uncaptured."
                : "Selective omissions on uncertain items preserved net score."
            }
            details="0 marks deducted or gained for omitted questions. High omission rates can protect marks from negative penalties."
          />
        </motion.div>

        {/* 2. Percentile Standing / Training Ground Banner */}
        {isRanked ? (
          <motion.div
            initial={prefersReduced ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`p-6 sm:p-8 rounded-sm border text-center relative overflow-hidden backdrop-blur-sm ${
              isHighPerformer
                ? 'bg-gradient-to-b from-surface-elevated/60 to-surface border-[#0194a8]/50 shadow-lg shadow-[#0194a8]/10'
                : 'bg-surface-elevated/40 border-border'
            }`}
          >
            <div className="space-y-2 max-w-lg mx-auto font-sans">
              <p className="text-xs font-sans uppercase tracking-wider text-secondary font-medium">
                Where you stand
              </p>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                Higher than{' '}
                <span className="text-[#e0d0ab] font-mono">
                  <AnimatedNumber value={percentile} suffix="%" />
                </span>{' '}
                of candidate submissions.
              </h3>
              <p className="text-xs font-sans text-secondary leading-relaxed pt-1">
                {percentile >= 80
                  ? 'Exceptional precision. You have cleared the benchmark for top accuracy.'
                  : percentile >= 50
                  ? 'Competitive baseline achieved. Strengthening subject focus areas will accelerate percentile growth.'
                  : 'Diagnostic completed. Review conceptual insights below to eliminate repeat errors.'}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={prefersReduced ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="p-6 sm:p-8 rounded-sm border border-border bg-surface-elevated/40 text-center relative overflow-hidden backdrop-blur-sm"
          >
            <div className="space-y-2 max-w-lg mx-auto font-sans">
              <p className="text-xs font-sans uppercase tracking-wider text-[#0194a8] font-bold">
                Training Ground Diagnostic
              </p>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                Session Complete &bull;{' '}
                <span className="text-[#e0d0ab] font-mono">
                  {Math.round((stats.correct / Math.max(1, total)) * 100)}%
                </span>{' '}
                Accuracy
              </h3>
              <p className="text-xs font-sans text-secondary leading-relaxed pt-1">
                Unranked practice session. Conceptual telemetry has been evaluated and logged to your profile for subject-weakness tracking.
              </p>
            </div>
          </motion.div>
        )}

        {/* 3. Rank Points Yield Breakdown (Ranked only) */}
        {isRanked && (
          <motion.div
            initial={prefersReduced ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="border border-[#e0d0ab]/30 bg-[#e0d0ab]/5 p-6 rounded-sm text-center space-y-4 font-sans"
          >
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-[#e0d0ab]" />
              <h3 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab]">
                Rank Points Yield
              </h3>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10 py-2">
              <div className="flex flex-col items-center">
                <span className="text-xl sm:text-2xl font-mono text-emerald-400 font-bold">
                  <AnimatedNumber value={cpCorrect} prefix="+" />
                </span>
                <span className="text-[10px] font-sans text-secondary uppercase tracking-wider mt-1">
                  Correct (+3 CP)
                </span>
              </div>

              <span className="text-muted font-mono text-lg select-none">&minus;</span>

              <div className="flex flex-col items-center">
                <span className="text-xl sm:text-2xl font-mono text-rose-400 font-bold">
                  <AnimatedNumber value={cpPenalty} prefix="-" />
                </span>
                <span className="text-[10px] font-sans text-secondary uppercase tracking-wider mt-1">
                  Penalty (-1 CP)
                </span>
              </div>

              {cpBonus > 0 && (
                <>
                  <span className="text-muted font-mono text-lg select-none">+</span>
                  <div className="flex flex-col items-center">
                    <span className="text-xl sm:text-2xl font-mono text-[#e0d0ab] font-bold">
                      <AnimatedNumber value={cpBonus} prefix="+" />
                    </span>
                    <span className="text-[10px] font-sans text-secondary uppercase tracking-wider mt-1">
                      80%+ Bonus
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-[#e0d0ab]/15 flex items-center justify-center gap-2">
              <span className="text-xs font-sans text-primary uppercase tracking-wider">
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
          className="border border-border bg-surface-elevated/30 p-6 sm:p-8 rounded-sm space-y-8 font-sans"
        >
          {/* Execution Time Telemetry */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0194a8]" />
              <h4 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab]">
                Execution Pace Telemetry
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MetricWithInterpretation
                label="Total Active Time"
                value={`${mins > 0 ? `${mins}m ` : ''}${secs.toFixed(1)}s`}
                icon={Clock}
                accentColor="text-primary"
                interpretation={
                  tts < total * 30
                    ? "Rapid pacing indicates decisive question evaluation."
                    : tts <= total * 60
                    ? "Steady, measured pacing consistent with standard exam timing."
                    : "Deliberate pacing; review time allocation to avoid end-of-test pressure."
                }
                details={`Total duration spent actively reviewing and answering questions: ${tts.toFixed(1)} seconds.`}
              />

              <MetricWithInterpretation
                label="Average Pace Per Question"
                value={Number(avgTime.toFixed(1))}
                suffix="s"
                icon={Clock}
                accentColor="text-[#0194a8]"
                interpretation={
                  avgTime < 25
                    ? "Fast response velocity; verify answers are not rushed on complex stems."
                    : avgTime <= 45
                    ? "Optimal analytical velocity for competitive exam accuracy."
                    : "Extended deliberation per question; target 30-40s for optimal throughput."
                }
                details={`Calculated as total active time (${tts.toFixed(1)}s) divided by total questions evaluated (${total}).`}
              />
            </div>
          </div>

          {/* Subject Area Accuracy Bars */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab]">
                Domain Mastery Breakdown
              </h4>
              <span className="text-[10px] font-sans text-muted">
                Sorted by Need of Focus
              </span>
            </div>

            {!stats.subjectStats || Object.keys(stats.subjectStats).length === 0 ? (
              <p className="text-xs font-sans text-muted">
                No subject breakdown for this test.
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
                    const subjectNote = insights?.subjectInsights?.[subj];
                    const subjectInterpretation =
                      percentage >= 80
                        ? `${subj} accuracy is strong; focus on maintaining recall consistency.`
                        : percentage >= 50
                        ? `${subj} shows moderate competence, but key sub-topics remain inconsistent.`
                        : `${subj} requires targeted remediation to eliminate recurring conceptual traps.`;

                    return (
                      <div key={subj} className="space-y-1.5 p-3 bg-surface/50 border border-border/60 rounded-sm">
                        <AccuracyBar
                          label={subj}
                          accuracy={percentage}
                          correctCount={data.correct}
                          totalCount={data.total}
                          delay={sIdx * 0.1}
                        />
                        <p className="text-[11px] font-sans text-secondary leading-relaxed">
                          {subjectInterpretation}
                        </p>
                        {subjectNote && (
                          <div className="pl-2 border-l-2 border-[#0194a8]/40 text-[11px] font-sans text-primary italic">
                            {subjectNote}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Subjective AI Autopsy Feedback */}
          {(loadingInsights || insights) && (
            <div className="pt-6 border-t border-border space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#e0d0ab]" />
                <h4 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab]">
                  AI Mistake Breakdown & Insights
                </h4>
              </div>

              {loadingInsights ? (
                <div className="flex items-center gap-2.5 text-xs text-secondary font-sans py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0194a8]" />
                  <span>Analyzing your mistakes and examiner traps...</span>
                </div>
              ) : insights?.overallInsights ? (
                <div className="bg-surface/60 p-5 rounded-sm border border-border/80">
                  <ConceptInsightRenderer content={insights.overallInsights} showBadges={true} />
                </div>
              ) : null}
            </div>
          )}
        </motion.div>

        {/* 5. Navigation Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 font-sans">
          <button
            onClick={onReturnToDashboard}
            className="inline-flex items-center justify-center gap-2 py-3 px-8 bg-[#e0d0ab] hover:bg-primary text-surface font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-md shadow-[#e0d0ab]/10 cursor-pointer"
          >
            Return to Dashboard
          </button>
          <button
            onClick={onDeployNext}
            className="inline-flex items-center justify-center gap-2 py-3 px-8 bg-surface-elevated hover:bg-surface-elevated text-primary hover:text-[#e0d0ab] border border-border hover:border-[#0194a8] font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#0194a8]" />
            <span>Take Another Test</span>
          </button>
        </div>

        {/* 6. Founders Club Invitation Card */}
        <div className="backdrop-blur-md bg-surface-elevated/30 border border-border/80 rounded-sm p-6 sm:p-8 text-center space-y-4 relative overflow-hidden font-sans">
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-5 h-5 text-[#e0d0ab]" />
            <h3 className="font-serif text-lg font-bold text-white">
              Join the Founders Club
            </h3>
          </div>
          <p className="text-xs font-sans text-secondary leading-relaxed max-w-md mx-auto">
            Tark is an ad-free, zero-noise testing arena. Take a lifetime Founders Seat to unlock the global leaderboard, unlimited mock tests, and direct access to the team.
          </p>
          <button
            onClick={onNavigateManifesto}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-surface-elevated hover:bg-surface-elevated text-[#e0d0ab] hover:text-white border border-[#e0d0ab]/40 hover:border-[#e0d0ab] text-xs font-sans font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer"
          >
            <span>Review Founders Charter</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </motion.div>
    </div>
  );
}
