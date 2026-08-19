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
  ShieldCheck,
} from 'lucide-react';

const ACCENT = '#e0d0ab';

// A per-bullet verified-source anchor (the "Naval Instrument" trust surface).
// Reveals the verbatim cited source sentence(s) on hover/focus — the evidence
// behind the claim. Renders nothing for ungrounded bullets (graceful).
function SourceAnchor({ claim }: { claim: VerifiedClaim }) {
  if (!claim?.quotes?.length) return null;
  return (
    <span className="relative inline-block group/src align-super">
      <button
        type="button"
        aria-label={`Source: ${claim.source}`}
        className="ml-0.5 inline-flex items-center text-[#e0d0ab]/70 hover:text-[#e0d0ab] focus:text-[#e0d0ab] outline-none cursor-help"
      >
        <ShieldCheck className="w-2.5 h-2.5" />
      </button>
      <span className="pointer-events-none absolute left-0 bottom-full z-30 mb-1.5 w-72 max-w-[80vw] origin-bottom-left scale-95 opacity-0 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/src:opacity-100 group-hover/src:scale-100 group-focus-within/src:opacity-100 group-focus-within/src:scale-100">
        <span className="block rounded-sm border border-zinc-700/80 bg-zinc-900 p-2.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)]">
          <span className="mb-1.5 flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-[#e0d0ab]/80">
            <ShieldCheck className="w-2.5 h-2.5" /> Grounded in {claim.source}
          </span>
          {claim.quotes.map((q, i) => (
            <span
              key={i}
              className="mb-1 block border-l-2 border-[#e0d0ab]/40 pl-2 text-[11px] italic leading-snug text-zinc-300 last:mb-0"
            >
              &ldquo;{q}&rdquo;
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

// ============================================================
// Types — the extended `summary` jsonb contract (P4/P5).
// `.bullets` stays primary; the rest is additive metadata.
// ============================================================
// A span-anchored, cite-or-drop verified claim (evidence-span ledger).
interface VerifiedClaim {
  text: string;
  spanIds: string[];
  quotes: string[]; // verbatim source sentences — the trust-UI hover payload
  facts: string[];
  claimType: 'numeric' | 'context';
  verified: boolean;
  source: string;
  url: string;
}
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
  claims?: VerifiedClaim[]; // additive — present when synthesis was span-grounded
  grounding?: number; // 0..1 fraction of bullets that passed the fact check
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

export default function DailyEdition({ userId }: DailyEditionProps) {
  const prefersReducedMotion = useReducedMotion();
  const today = useMemo(istToday, []);

  const [items, setItems] = useState<EditionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [readUrls, setReadUrls] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  // Quiz state
  const [quizOpen, setQuizOpen] = useState(false);
  const [mcqs, setMcqs] = useState<Mcq[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);

  const readKey = `tark_edition_read_${today}`;

  // Restore per-day read state (client-only; low-cortisol completion tracking).
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

  // ------------------------------------------------------------
  // Fetch today's edition: significance-ranked, finite.
  // Gracefully renders nothing until the P4 backend starts writing
  // `summary.significance` — so it never shows a broken/empty shell.
  // ------------------------------------------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const since = new Date(Date.now() - 30 * 3600 * 1000).toISOString();
        const { data, error } = await supabase
          .from('current_affairs')
          .select('*')
          .neq('source', 'PIB_Digest')
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

  const toggleRead = (url: string) => {
    const next = new Set(readUrls);
    next.has(url) ? next.delete(url) : next.add(url);
    persistRead(next);
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

  // Hidden entirely until there's a scored edition to show.
  if (loading || items.length === 0) return null;

  const doneCount = items.filter((i) => readUrls.has(i.url)).length;
  const allDone = doneCount === items.length;
  const minutes = readingMinutes(items);
  const quizCount = items.filter((i) => i.summary.has_quiz).length;

  return (
    <section className="mb-10 font-sans">
      {/* ---------- Masthead ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 bg-[#e0d0ab] text-zinc-950 text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Daily Edition
          </span>
          <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-zinc-500" />
            {new Date(today).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono text-zinc-500">
            {items.length} briefs &bull; ~{minutes} min
          </span>
          {quizCount > 0 && (
            <button
              onClick={openQuiz}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[#e0d0ab]/40 text-[#e0d0ab] text-[11px] font-semibold uppercase tracking-wider hover:bg-[#e0d0ab]/10 transition-colors cursor-pointer"
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              Test Today ({quizCount})
            </button>
          )}
        </div>
      </div>

      {/* ---------- Completion / progress ---------- */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            {allDone ? 'Edition complete' : `${doneCount} of ${items.length} read`}
          </span>
          {allDone && (
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Done for today
            </span>
          )}
        </div>
        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: allDone ? '#34d399' : ACCENT }}
            initial={false}
            animate={{ width: `${(doneCount / items.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
        </div>
      </div>

      {/* ---------- Ranked stories ---------- */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const s = item.summary;
          const isRead = readUrls.has(item.url);
          const corroboration = (s.cluster_size || (s.sources?.length ?? 1)) - 1;
          return (
            <motion.article
              key={item.url}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : idx * 0.03, type: 'spring', stiffness: 300, damping: 30 }}
              className={`group relative rounded-sm border p-5 transition-colors ${
                isRead
                  ? 'border-zinc-800/60 bg-zinc-950/40 opacity-60'
                  : 'border-zinc-800 bg-gradient-to-br from-zinc-900/50 via-zinc-900/30 to-zinc-950 hover:border-[#e0d0ab]/50'
              }`}
            >
              <div className="flex gap-4">
                {/* Rank + significance rail */}
                <div className="flex flex-col items-center pt-0.5 w-9 shrink-0">
                  <span className="font-mono text-lg font-bold text-[#e0d0ab] leading-none">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="mt-2 h-14 w-1 rounded-full bg-zinc-800 overflow-hidden flex flex-col justify-end" title={`Significance ${s.significance}`}>
                    <div className="w-full rounded-full" style={{ height: `${s.significance || 0}%`, background: ACCENT }} />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  {/* Meta badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="px-2 py-0.5 bg-zinc-800 text-[#e0d0ab] text-[9px] font-semibold uppercase tracking-wider rounded-sm border border-zinc-700">
                      {item.ministry}
                    </span>
                    <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">
                      {item.source}
                    </span>
                    {corroboration > 0 && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-semibold uppercase tracking-wider rounded-sm border border-emerald-500/20"
                        title={`Corroborated by ${s.sources?.join(', ')}`}
                      >
                        <Layers className="w-2.5 h-2.5" />+{corroboration} source{corroboration > 1 ? 's' : ''}
                      </span>
                    )}
                    {typeof s.grounding === 'number' && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#e0d0ab]/10 text-[#e0d0ab] text-[9px] font-semibold uppercase tracking-wider rounded-sm border border-[#e0d0ab]/20"
                        title={`${Math.round(s.grounding * 100)}% of bullets grounded in cited primary sources`}
                      >
                        <ShieldCheck className="w-2.5 h-2.5" />{Math.round(s.grounding * 100)}% grounded
                      </span>
                    )}
                    {(s.tags || []).slice(0, 3).map((t) => (
                      <span key={t} className="px-1.5 py-0.5 bg-[#e0d0ab]/10 text-[#e0d0ab] text-[9px] font-semibold uppercase tracking-wider rounded-sm">
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Headline */}
                  <h3 className="font-serif text-base sm:text-lg font-bold text-white leading-snug mb-2.5">
                    {item.headline}
                  </h3>

                  {/* Bullets — each carries a verified-source anchor when grounded */}
                  <div className="space-y-1.5 mb-3">
                    {(s.bullets || []).slice(0, 3).map((b, i) => {
                      const claim = (s.claims || []).find((c) => c.text === b);
                      return (
                        <div key={i} className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed">
                          <span className="text-[#e0d0ab] font-bold mt-0.5 select-none">&bull;</span>
                          <p>
                            {b}
                            {claim && <SourceAnchor claim={claim} />}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Prelims / Mains pointers */}
                  {(s.prelims || s.mains) && (
                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                      {s.prelims && (
                        <div className="flex-1 rounded-sm bg-zinc-900/60 border border-zinc-800 px-2.5 py-1.5">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-[#e0d0ab]/80 flex items-center gap-1 mb-0.5">
                            <Zap className="w-2.5 h-2.5" /> Prelims
                          </span>
                          <p className="text-[11px] text-zinc-400 leading-snug">{s.prelims}</p>
                        </div>
                      )}
                      {s.mains && (
                        <div className="flex-1 rounded-sm bg-zinc-900/60 border border-zinc-800 px-2.5 py-1.5">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-[#e0d0ab]/80 flex items-center gap-1 mb-0.5">
                            <ChevronRight className="w-2.5 h-2.5" /> Mains
                          </span>
                          <p className="text-[11px] text-zinc-400 leading-snug">{s.mains}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                    <button
                      onClick={() => toggleRead(item.url)}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        isRead ? 'text-emerald-400' : 'text-zinc-400 hover:text-[#e0d0ab]'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-sm border flex items-center justify-center ${isRead ? 'bg-emerald-400/20 border-emerald-400' : 'border-zinc-600'}`}>
                        {isRead && <Check className="w-3 h-3" />}
                      </span>
                      {isRead ? 'Read' : 'Mark read'}
                    </button>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#e0d0ab] hover:underline cursor-pointer"
                      >
                        Source <ArrowUpRight className="w-3 h-3" />
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
          className="mt-6 rounded-sm border border-emerald-500/30 bg-emerald-500/5 px-5 py-4 text-center"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
          <p className="font-serif text-sm text-white">You're caught up on today's affairs.</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Come back tomorrow for the next edition.</p>
        </motion.div>
      )}

      {/* ---------- Quiz modal ---------- */}
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
// Self-contained (practice only) — the ranked Arena remains the
// server-authoritative scorer; this is the briefs↔arena cross-link.
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={prefersReducedMotion ? undefined : { scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={prefersReducedMotion ? undefined : { scale: 0.96, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-sm border border-zinc-800 bg-zinc-950 p-6 font-sans shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <span className="px-2.5 py-1 bg-[#e0d0ab] text-zinc-950 text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm flex items-center gap-1.5">
            <BrainCircuit className="w-3 h-3" /> Daily Brief Quiz
          </span>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <p className="text-center text-zinc-500 text-sm py-10">Loading questions…</p>
        ) : mcqs.length === 0 ? (
          <p className="text-center text-zinc-500 text-sm py-10">No quiz available for today's edition yet.</p>
        ) : finished ? (
          <div className="text-center py-6">
            <p className="font-serif text-2xl text-white mb-1">
              {score}/{mcqs.length}
            </p>
            <p className="text-sm text-zinc-400 mb-5">
              {score === mcqs.length ? 'Flawless. Current affairs locked in.' : 'Review the briefs you missed and retry tomorrow.'}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-sm bg-[#e0d0ab] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-zinc-500">
                Q{idx + 1} / {mcqs.length}
              </span>
              <span className="text-[10px] font-mono text-[#e0d0ab]">Score {score}</span>
            </div>
            <p className="font-serif text-base text-white leading-snug mb-4">{q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correct_index;
                const isPicked = i === picked;
                let cls = 'border-zinc-700 hover:border-[#e0d0ab]/50 text-zinc-300';
                if (picked !== null) {
                  if (isCorrect) cls = 'border-emerald-500 bg-emerald-500/10 text-emerald-300';
                  else if (isPicked) cls = 'border-red-500 bg-red-500/10 text-red-300';
                  else cls = 'border-zinc-800 text-zinc-500';
                }
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={picked !== null}
                    className={`w-full text-left px-3.5 py-2.5 rounded-sm border text-xs transition-colors cursor-pointer ${cls}`}
                  >
                    <span className="font-mono text-[#e0d0ab] mr-2">{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 overflow-hidden">
                <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-900/60 border border-zinc-800 rounded-sm px-3 py-2">
                  {q.explanation}
                </p>
                <button
                  onClick={next}
                  className="mt-3 w-full px-4 py-2 rounded-sm bg-[#e0d0ab] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {idx + 1 >= mcqs.length ? 'See result' : 'Next question'}
                </button>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
