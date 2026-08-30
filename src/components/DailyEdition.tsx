import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Sparkles,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  Zap,
  X,
  BrainCircuit,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  BookOpen,
  LayoutList,
  Rows3
} from 'lucide-react';
import {
  SourceAnchor,
  GroundingBadge,
  ContestedCard,
  type VerifiedClaim,
  type ContestedClaim,
} from './TrustUI';

const GOLD = '#e0d0ab';
const MUTED_GOLD = '#c8b998';

// ============================================================
// Types — the extended `summary` jsonb contract (P4/P5).
// `.bullets` stays primary; the rest is additive metadata.
// ============================================================
interface EditionSummary {
  bullets: string[];
  significance?: number;
  tags?: string[];
  prelims?: string;
  mains?: string;
  sources?: string[];
  cluster_size?: number;
  edition_date?: string;
  has_quiz?: boolean;
  claims?: VerifiedClaim[];
  grounding?: number;
  verification_method?: 'live_cite_or_drop_v1';
  contested?: ContestedClaim;
}

interface EditionItem {
  id?: string;
  source: string;
  ministry: string;
  headline: string;
  url: string;
  summary: EditionSummary;
  created_at?: string;
}

interface Mcq {
  id: string;
  affair_url: string;
  headline: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  subject: string;
}

interface DailyEditionProps {
  userId: string;
  compactModeDefault?: boolean;
  onOpenArenaQuiz?: () => void;
}

// Max stories in a finite daily edition (low-cortisol: completable, not infinite).
const EDITION_CAP = 10;

/** Today's date in IST (UTC+5:30) as YYYY-MM-DD. */
function istToday(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60_000);
  return `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;
}

function readingMinutes(items: EditionItem[]): number {
  const words = items.reduce(
    (n, it) => n + (it.summary.bullets || []).join(' ').split(/\s+/).filter(Boolean).length,
    0
  );
  return Math.max(1, Math.round(words / 200));
}

function getCategoryColor(ministry: string, tags?: string[]): { bar: string; tagBg: string; tagColor: string } {
  const m = (ministry || '').toLowerCase();
  const t = (tags || []).join(' ').toLowerCase();

  if (m.includes('finance') || m.includes('commerce') || m.includes('economy') || t.includes('economy')) {
    return { bar: '#34d399', tagBg: 'rgba(52, 211, 153, 0.1)', tagColor: '#34d399' };
  }
  if (m.includes('environment') || m.includes('forest') || m.includes('climate') || m.includes('agriculture') || t.includes('agriculture')) {
    return { bar: '#e0d0ab', tagBg: 'rgba(224, 208, 171, 0.12)', tagColor: '#e0d0ab' };
  }
  if (m.includes('science') || m.includes('defence') || m.includes('isro') || m.includes('electronics') || t.includes('science')) {
    return { bar: '#0194a8', tagBg: 'rgba(1, 148, 168, 0.15)', tagColor: '#7fd4e0' };
  }
  if (m.includes('health') || m.includes('social') || m.includes('women') || m.includes('education')) {
    return { bar: '#a78bfa', tagBg: 'rgba(167, 139, 250, 0.12)', tagColor: '#c4b5fd' };
  }
  return { bar: '#0194a8', tagBg: 'rgba(1, 148, 168, 0.12)', tagColor: '#9fb0c8' };
}

export default function DailyEdition({ userId, compactModeDefault = false, onOpenArenaQuiz }: DailyEditionProps) {
  const prefersReducedMotion = useReducedMotion();
  const today = useMemo(istToday, []);

  const [items, setItems] = useState<EditionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [readUrls, setReadUrls] = useState<Set<string>>(new Set());
  const [isDensityCompact, setIsDensityCompact] = useState(compactModeDefault);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Quiz state
  const [quizOpen, setQuizOpen] = useState(false);
  const [mcqs, setMcqs] = useState<Mcq[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);

  const readKey = `tark_edition_read_${today}`;

  // Restore per-day read state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(readKey);
      if (raw) setReadUrls(new Set(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, [readKey]);

  const persistRead = useCallback(
    (next: Set<string>) => {
      setReadUrls(next);
      try {
        localStorage.setItem(readKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
    },
    [readKey]
  );

  // Fetch today's edition
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
        const { data, error } = await supabase
          .from('current_affairs')
          .select('*')
          .neq('source', 'PIB_Digest')
          .neq('source', 'PRS')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(120);
        if (error) throw error;
        if (!alive) return;

        const scored = (data || [])
          .filter((it: EditionItem) => typeof it.summary?.significance === 'number')
          .sort(
            (a: EditionItem, b: EditionItem) =>
              (b.summary.significance || 0) - (a.summary.significance || 0)
          )
          .slice(0, EDITION_CAP);
        setItems(scored);
      } catch (err) {
        console.error('[DailyEdition] fetch failed:', err);
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [today]);

  const toggleRead = (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(readUrls);
    next.has(url) ? next.delete(url) : next.add(url);
    persistRead(next);
  };

  const toggleCardExpand = (url: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const openQuiz = async () => {
    setQuizOpen(true);
    if (mcqs.length > 0) return;
    setQuizLoading(true);
    try {
      const urls = items.map((i) => i.url);
      const { data } = await supabase
        .from('current_affairs_mcqs')
        .select('*')
        .in('affair_url', urls);
      setMcqs((data as Mcq[]) || []);
    } catch (err) {
      console.error('[DailyEdition] quiz fetch failed:', err);
      setMcqs([]);
    } finally {
      setQuizLoading(false);
    }
  };

  if (loading || items.length === 0) return null;

  const doneCount = items.filter((i) => readUrls.has(i.url)).length;
  const allDone = doneCount === items.length;
  const minutes = readingMinutes(items);
  const quizCount = items.filter((i) => i.summary.has_quiz).length;

  return (
    <section className="mb-10 font-sans text-stone-100">
      {/* ── Masthead & Completion Bar ── */}
      <div className="p-4 sm:p-5 rounded-sm border border-[rgba(19,108,153,0.45)] bg-[rgba(4,25,54,0.6)] backdrop-blur-sm mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-1 bg-[#e0d0ab] text-[#072e63] text-[10px] font-mono font-bold uppercase tracking-[0.16em] rounded-xs flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3 h-3" />
              Daily Edition
            </span>
            <span className="text-[11.5px] font-mono text-[#9fb0c8] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0194a8]" />
              {new Date(today).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-zinc-600 hidden sm:inline">&bull;</span>
            <span className="text-[11.5px] font-mono text-[#8fa2bd]">
              {items.length} curated briefs &bull; ~{minutes} min
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Density Switcher */}
            <div className="flex items-center border border-[rgba(19,108,153,0.4)] rounded-xs bg-[rgba(3,18,42,0.6)] p-0.5">
              <button
                onClick={() => setIsDensityCompact(false)}
                title="Detailed View"
                className={`p-1.5 rounded-xs text-xs transition-colors cursor-pointer ${
                  !isDensityCompact ? 'bg-[#e0d0ab] text-[#072e63]' : 'text-[#8fa2bd] hover:text-[#e0d0ab]'
                }`}
              >
                <Rows3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsDensityCompact(true)}
                title="Compact Scannable View"
                className={`p-1.5 rounded-xs text-xs transition-colors cursor-pointer ${
                  isDensityCompact ? 'bg-[#e0d0ab] text-[#072e63]' : 'text-[#8fa2bd] hover:text-[#e0d0ab]'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
            </div>

            {quizCount > 0 && (
              <button
                onClick={openQuiz}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-[rgba(224,208,171,0.5)] text-[#e0d0ab] bg-[rgba(224,208,171,0.08)] hover:bg-[#e0d0ab] hover:text-[#072e63] text-[11px] font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer"
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>Test Today ({quizCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#8fa2bd]">
            <span>{allDone ? '✓ All 10 Briefs Completed' : `${doneCount} of ${items.length} read`}</span>
            <span>{Math.round((doneCount / items.length) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-[rgba(3,18,42,0.8)] rounded-full overflow-hidden border border-[rgba(19,108,153,0.3)]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: allDone ? '#34d399' : 'linear-gradient(90deg, #0194a8, #e0d0ab)' }}
              initial={false}
              animate={{ width: `${(doneCount / items.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            />
          </div>
        </div>
      </div>

      {/* ── Stories Feed ── */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const s = item.summary;
          const isRead = readUrls.has(item.url);
          const isCardExpanded = !isDensityCompact || expandedCards.has(item.url);
          const colors = getCategoryColor(item.ministry, s.tags);
          const corroboration = (s.cluster_size || (s.sources?.length ?? 1)) - 1;

          return (
            <motion.article
              key={item.url}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : idx * 0.025, duration: 0.25 }}
              className={`group relative rounded-xs border transition-all duration-200 overflow-hidden ${
                isRead
                  ? 'border-[rgba(19,108,153,0.3)] bg-[rgba(4,25,54,0.3)] opacity-70'
                  : 'border-[rgba(19,108,153,0.45)] bg-[rgba(4,25,54,0.55)] hover:border-[rgba(224,208,171,0.5)] hover:bg-[rgba(11,61,120,0.35)] shadow-sm'
              }`}
            >
              {/* Left Category Accent Strip */}
              <span
                className="absolute top-0 bottom-0 left-0 w-1"
                style={{ backgroundColor: colors.bar }}
              />

              <div className="p-4 sm:p-5 pl-4 sm:pl-6">
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-[#e0d0ab]">
                      §{String(idx + 1).padStart(2, '0')}
                    </span>
                    <span
                      className="px-2 py-0.5 text-[9.5px] font-mono font-semibold uppercase tracking-wider rounded-xs border border-[rgba(19,108,153,0.5)]"
                      style={{ background: 'rgba(3,18,42,0.6)', color: colors.tagColor }}
                    >
                      {item.ministry}
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#8fa2bd]">
                      {item.source}
                    </span>
                    {corroboration > 0 && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-300 text-[9px] font-mono font-semibold uppercase tracking-wider rounded-xs border border-emerald-500/25"
                        title={`Corroborated by ${s.sources?.join(', ')}`}
                      >
                        <Layers className="w-2.5 h-2.5" />+{corroboration} src
                      </span>
                    )}
                    <GroundingBadge grounding={s.grounding} verificationMethod={s.verification_method} />
                  </div>

                  {/* Syllabus tag chips */}
                  <div className="flex items-center gap-1">
                    {(s.tags || []).slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="hidden sm:inline-block px-1.5 py-0.5 bg-[rgba(224,208,171,0.08)] text-[#c8b998] text-[9px] font-mono uppercase tracking-wider rounded-xs border border-[rgba(224,208,171,0.2)]"
                      >
                        {t.replace(/GS PAPER \d:?/i, 'GS').slice(0, 28)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Headline */}
                <h3
                  onClick={() => isDensityCompact && toggleCardExpand(item.url)}
                  className={`font-serif font-bold text-[15px] sm:text-[16.5px] text-[#e8e0cf] group-hover:text-[#e0d0ab] transition-colors leading-[1.38] mb-2.5 ${
                    isDensityCompact ? 'cursor-pointer' : ''
                  }`}
                >
                  {item.headline}
                </h3>

                {/* Detailed Content (Always in standard view, collapsible in compact view) */}
                <AnimatePresence initial={false}>
                  {isCardExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {/* Bullets with Source Anchors */}
                      <div className="space-y-2 mb-3 pt-1">
                        {(s.bullets || []).slice(0, 3).map((b, i) => {
                          const claim = (s.claims || []).find((c) => c.text?.trim() === b?.trim()) || (s.claims || [])[i];
                          return (
                            <div key={i} className="flex items-start gap-2 text-[12.5px] sm:text-[13px] text-[#9fb0c8] leading-[1.65]">
                              <span className="text-[#0194a8] font-bold mt-0.5 select-none text-[11px]">&bull;</span>
                              <p className="flex-1 m-0">
                                {b}
                                {claim && <SourceAnchor claim={claim} />}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Contested claim card */}
                      <ContestedCard contested={s.contested} />

                      {/* Prelims & Mains Takeaway Tray */}
                      {(s.prelims || s.mains) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3.5 pt-1">
                          {s.prelims && (
                            <div className="rounded-xs bg-[rgba(3,18,42,0.55)] border border-[rgba(19,108,153,0.35)] px-3 py-2">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#e0d0ab] flex items-center gap-1.5 mb-1">
                                <Zap className="w-3 h-3 text-[#0194a8]" /> Prelims Takeaway
                              </span>
                              <p className="text-[11.5px] text-[#9fb0c8] leading-[1.55] m-0">{s.prelims}</p>
                            </div>
                          )}
                          {s.mains && (
                            <div className="rounded-xs bg-[rgba(3,18,42,0.55)] border border-[rgba(19,108,153,0.35)] px-3 py-2">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#e0d0ab] flex items-center gap-1.5 mb-1">
                                <ChevronRight className="w-3 h-3 text-[#0194a8]" /> Mains Dimension
                              </span>
                              <p className="text-[11.5px] text-[#9fb0c8] leading-[1.55] m-0">{s.mains}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[rgba(19,108,153,0.3)]">
                  <button
                    onClick={(e) => toggleRead(item.url, e)}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                      isRead ? 'text-emerald-400' : 'text-[#8fa2bd] hover:text-[#e0d0ab]'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-xs border flex items-center justify-center transition-all ${
                      isRead
                        ? 'bg-emerald-400/20 border-emerald-400'
                        : 'border-[rgba(19,108,153,0.6)] bg-[rgba(3,18,42,0.6)]'
                    }`}>
                      {isRead && <Check className="w-3 h-3 text-emerald-400" />}
                    </span>
                    <span>{isRead ? 'Completed' : 'Mark as Read'}</span>
                  </button>

                  <div className="flex items-center gap-3">
                    {isDensityCompact && (
                      <button
                        onClick={() => toggleCardExpand(item.url)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-[#8fa2bd] hover:text-[#e0d0ab] cursor-pointer"
                      >
                        <span>{isCardExpanded ? 'Collapse' : 'Expand'}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isCardExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}

                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-[#e0d0ab] hover:underline cursor-pointer"
                      >
                        <span>Primary Source</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {allDone && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-xs border border-emerald-500/35 bg-emerald-500/10 p-5 text-center"
        >
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <p className="font-serif text-base text-[#e8e0cf] m-0">You're caught up on today's complete edition.</p>
          <p className="text-[12px] text-[#9fb0c8] mt-1 m-0">Consolidate your retention by taking the daily current affairs test.</p>
          {quizCount > 0 && (
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={openQuiz}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-800/90 text-stone-200 border border-zinc-700 font-mono font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <BrainCircuit className="w-4 h-4 text-emerald-400" />
                Quick Review ({quizCount} MCQs)
              </button>
              {onOpenArenaQuiz && (
                <button
                  onClick={onOpenArenaQuiz}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#e0d0ab] text-[#072e63] font-mono font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-white transition-colors cursor-pointer shadow-sm"
                >
                  <Zap className="w-4 h-4 text-[#072e63]" />
                  Launch Timed Arena Battle
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Quiz Modal ── */}
      <AnimatePresence>
        {quizOpen && (
          <QuizModal
            mcqs={mcqs}
            loading={quizLoading}
            onClose={() => setQuizOpen(false)}
            prefersReducedMotion={!!prefersReducedMotion}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

// ============================================================
// Inline practice quiz built from today's auto-generated MCQs.
// ============================================================
function QuizModal({
  mcqs,
  loading,
  onClose,
  prefersReducedMotion,
}: {
  mcqs: Mcq[];
  loading: boolean;
  onClose: () => void;
  prefersReducedMotion: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = mcqs[idx];

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.correct_index) setScore((s) => s + 1);
  };
  const next = () => {
    if (idx + 1 >= mcqs.length) {
      setFinished(true);
    } else {
      setIdx((n) => n + 1);
      setPicked(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans"
    >
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
        className="w-full max-w-2xl rounded-xs border border-[rgba(19,108,153,0.5)] bg-[#072e63] p-6 shadow-2xl text-stone-100"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[rgba(19,108,153,0.4)]">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#e0d0ab] text-[#072e63] text-[9.5px] font-mono font-bold uppercase tracking-wider rounded-xs">
              Daily Quiz
            </span>
            {!finished && mcqs.length > 0 && (
              <span className="text-xs font-mono text-[#9fb0c8]">
                Question {idx + 1} of {mcqs.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xs text-[#8fa2bd] hover:text-[#e0d0ab] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-[#9fb0c8]">Loading questions…</div>
        ) : mcqs.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-[#8fa2bd]">
            No practice MCQs available for today's edition yet.
          </div>
        ) : finished ? (
          <div className="py-8 text-center">
            <h4 className="font-serif text-2xl font-bold text-[#e0d0ab] mb-2">Practice Session Finished</h4>
            <p className="text-sm text-[#9fb0c8] mb-6">
              You scored <strong className="text-emerald-400">{score}</strong> out of{' '}
              <strong>{mcqs.length}</strong> ({Math.round((score / mcqs.length) * 100)}%).
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xs bg-[#e0d0ab] text-[#072e63] text-xs font-mono font-bold uppercase tracking-wider hover:bg-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-2 text-[10.5px] font-mono text-[#0194a8] uppercase tracking-wider">
              {q.subject || 'General Studies'} &bull; From today's brief
            </div>
            <h4 className="font-serif text-base sm:text-lg font-semibold text-[#e8e0cf] mb-4 leading-snug">
              {q.question}
            </h4>

            <div className="space-y-2 mb-5">
              {q.options.map((opt, i) => {
                const isSelected = picked === i;
                const isCorrect = i === q.correct_index;
                let optStyle = 'border-[rgba(19,108,153,0.4)] bg-[rgba(3,18,42,0.5)] text-[#e8e0cf] hover:border-[#e0d0ab]/60';
                if (picked !== null) {
                  if (isCorrect) optStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-200';
                  else if (isSelected) optStyle = 'border-rose-500 bg-rose-500/15 text-rose-200';
                  else optStyle = 'border-zinc-800 bg-zinc-900/30 text-zinc-500';
                }
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={picked !== null}
                    className={`w-full text-left p-3 rounded-xs border text-xs sm:text-sm font-sans transition-colors flex items-start gap-2.5 cursor-pointer disabled:cursor-default ${optStyle}`}
                  >
                    <span className="font-mono text-xs font-bold shrink-0 opacity-70">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>

            {picked !== null && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xs bg-[rgba(3,18,42,0.6)] border border-[rgba(19,108,153,0.4)] text-xs text-[#9fb0c8] mb-4 leading-relaxed"
              >
                <strong className="text-[#e0d0ab] font-mono block mb-1">Explanation:</strong>
                {q.explanation}
              </motion.div>
            )}

            <div className="flex justify-end">
              <button
                onClick={next}
                disabled={picked === null}
                className="px-4 py-2 rounded-xs bg-[#e0d0ab] text-[#072e63] text-xs font-mono font-bold uppercase tracking-wider hover:bg-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {idx + 1 === mcqs.length ? 'See Results' : 'Next Question →'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
