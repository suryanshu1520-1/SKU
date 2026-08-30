import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  History,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import {
  isRebasePatch,
  rebaseAcknowledgementKey,
  type RebasePatch,
  type RebasePatchItem,
} from '../lib/rebase';

interface RebaseEditionProps {
  userId: string;
  refreshKey: number;
  fallback: ReactNode;
  onOpenArenaQuiz?: () => void;
}

type Availability = 'loading' | 'ready' | 'unavailable';
type CompletionState = 'idle' | 'saving' | 'server' | 'device';

function formatIst(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function estimatedMinutes(items: RebasePatchItem[]): number {
  const words = items.reduce((total, item) => {
    const text = [item.previousText, item.currentText, item.reason].filter(Boolean).join(' ');
    return total + text.split(/\s+/).filter(Boolean).length;
  }, 0);
  return Math.max(1, Math.round(words / 180));
}

function actionCopy(item: RebasePatchItem): { eyebrow: string; button: string } {
  return item.action === 'replace'
    ? { eyebrow: 'Replace stale fact', button: 'Old fact replaced' }
    : { eyebrow: 'New exam obligation', button: 'Learned' };
}

export default function RebaseEdition({ userId, refreshKey, fallback, onOpenArenaQuiz }: RebaseEditionProps) {
  const prefersReducedMotion = useReducedMotion();
  const [availability, setAvailability] = useState<Availability>('loading');
  const [patch, setPatch] = useState<RebasePatch | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [completion, setCompletion] = useState<CompletionState>('idle');

  useEffect(() => {
    let alive = true;
    if (!userId || userId === 'guest') {
      setAvailability('unavailable');
      setPatch(null);
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        const response = await fetchWithAuth('/api/rebase');
        if (!response.ok) {
          if (alive) {
            setPatch(null);
            setAvailability('unavailable');
          }
          return;
        }
        const payload: unknown = await response.json();
        if (!isRebasePatch(payload)) {
          console.warn('[Rebase] rejected incomplete or unverified patch payload');
          if (alive) {
            setPatch(null);
            setAvailability('unavailable');
          }
          return;
        }
        if (alive) {
          setPatch(payload);
          setAvailability('ready');
          setCompletion('idle');
        }
      } catch {
        if (alive) {
          setPatch(null);
          setAvailability('unavailable');
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, refreshKey]);

  useEffect(() => {
    if (!patch) return;
    try {
      const raw = localStorage.getItem(rebaseAcknowledgementKey(userId, patch.patchId));
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        const validIds = new Set(patch.items.map((item) => item.mutationId));
        setAcknowledged(new Set(parsed.filter((id): id is string => typeof id === 'string' && validIds.has(id))));
      } else {
        setAcknowledged(new Set());
      }
    } catch {
      setAcknowledged(new Set());
    }
  }, [patch, userId]);

  const counts = useMemo(() => {
    if (!patch) return { learn: 0, replace: 0 };
    return { learn: patch.counts.learn, replace: patch.counts.replace };
  }, [patch]);

  if (availability !== 'ready' || !patch) return <>{fallback}</>;

  if (patch.status === 'degraded') {
    return (
      <>
        <div className="mb-6 rounded-sm border border-amber-500/30 bg-amber-500/5 px-4 py-3 font-sans flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-200">Rebase verification is incomplete.</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Tark will not advance your checkpoint while a source or ledger stage is degraded.
            </p>
          </div>
        </div>
        {fallback}
      </>
    );
  }

  const ackKey = rebaseAcknowledgementKey(userId, patch.patchId);
  const processedCount = patch.items.filter((item) => acknowledged.has(item.mutationId)).length;
  const allProcessed = processedCount === patch.items.length;
  const minutes = estimatedMinutes(patch.items);

  const acknowledge = (mutationId: string) => {
    const next = new Set(acknowledged);
    next.has(mutationId) ? next.delete(mutationId) : next.add(mutationId);
    setAcknowledged(next);
    try {
      localStorage.setItem(ackKey, JSON.stringify([...next]));
    } catch {
      // The server checkpoint remains authoritative; local persistence is best-effort.
    }
  };

  const confirmPatch = async () => {
    if ((!allProcessed && patch.status !== 'empty') || patch.hasMore || completion === 'saving') return;
    setCompletion('saving');
    const throughMutationId = patch.items.length
      ? patch.items[patch.items.length - 1].mutationId
      : null;
    try {
      const response = await fetchWithAuth('/api/rebase/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patchId: patch.patchId, throughMutationId }),
      });
      if (!response.ok) throw new Error('checkpoint update failed');
      setCompletion('server');
    } catch {
      setCompletion('device');
    }
  };

  if (patch.status === 'empty') {
    return (
      <section className="mb-10 rounded-sm border border-emerald-500/25 bg-emerald-500/5 p-5 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Tark Rebase</p>
              <h3 className="font-serif text-lg text-white mt-1">No verified knowledge changes.</h3>
              <p className="text-[11px] text-zinc-400 mt-1">Public record checked through {formatIst(patch.verifiedThrough)} IST.</p>
            </div>
          </div>
          <button
            onClick={confirmPatch}
            disabled={patch.hasMore || completion === 'saving' || completion === 'server'}
            className="px-4 py-2 rounded-sm bg-[#e0d0ab] text-zinc-950 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
          >
            {completion === 'saving' ? 'Saving…' : completion === 'server' ? 'Checkpoint saved' : 'Confirm checkpoint'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10 font-sans">
      <div className="rounded-sm border border-[#e0d0ab]/25 bg-gradient-to-br from-zinc-900/70 via-zinc-950 to-zinc-950 p-5 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#e0d0ab] text-zinc-950 text-[10px] font-bold uppercase tracking-[0.2em]">
                <Sparkles className="w-3 h-3" /> Tark Rebase
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Evidence verified through {formatIst(patch.verifiedThrough)} IST
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">What changed since your last checkpoint</h2>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-2xl">
              A minimal patch of new and replaced facts. Repeated coverage and unchanged values have been removed.
            </p>
          </div>
          <div className="flex flex-wrap lg:justify-end gap-2">
            {counts.replace > 0 && (
              <span className="px-2.5 py-1.5 rounded-sm border border-amber-500/25 bg-amber-500/10 text-amber-300 text-[10px] font-mono">
                Replace {counts.replace}
              </span>
            )}
            {counts.learn > 0 && (
              <span className="px-2.5 py-1.5 rounded-sm border border-[#e0d0ab]/25 bg-[#e0d0ab]/10 text-[#e0d0ab] text-[10px] font-mono">
                Learn {counts.learn}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm border border-zinc-800 bg-zinc-900 text-zinc-400 text-[10px] font-mono">
              <Clock className="w-3 h-3" /> ~{minutes} min
            </span>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-2">
            <span className="text-zinc-500">{processedCount} of {patch.items.length} changes processed</span>
            <span className={allProcessed ? 'text-emerald-400' : 'text-zinc-500'}>{allProcessed ? 'Patch ready to close' : 'Checkpoint open'}</span>
          </div>
          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              className="h-full bg-[#e0d0ab]"
              initial={false}
              animate={{ width: `${patch.items.length ? (processedCount / patch.items.length) * 100 : 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {patch.items.map((item, index) => {
          const done = acknowledged.has(item.mutationId);
          const copy = actionCopy(item);
          return (
            <motion.article
              key={item.mutationId}
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: done ? 0.58 : 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : index * 0.035 }}
              className={`rounded-sm border p-5 ${
                item.action === 'replace'
                  ? 'border-amber-500/25 bg-amber-950/10'
                  : 'border-zinc-800 bg-zinc-950/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className={`w-9 h-9 rounded-sm border flex items-center justify-center shrink-0 ${
                  item.action === 'replace'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-[#e0d0ab]/30 bg-[#e0d0ab]/10 text-[#e0d0ab]'
                }`}>
                  {item.action === 'replace' ? <RefreshCw className="w-4 h-4" /> : <History className="w-4 h-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-[9px] font-bold uppercase tracking-[0.18em] ${item.action === 'replace' ? 'text-amber-300' : 'text-[#e0d0ab]'}`}>
                      {copy.eyebrow}
                    </span>
                    {item.syllabus.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded-sm bg-zinc-900 text-zinc-500 text-[9px] uppercase tracking-wider">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h3 className="font-serif text-base text-white leading-snug mb-3">{item.story.headline}</h3>

                  {item.action === 'replace' ? (
                    <div className="space-y-2 mb-3">
                      <div className="rounded-sm border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                        <span className="text-[9px] uppercase tracking-wider text-zinc-600">Previous</span>
                        <p className="text-xs text-zinc-500 line-through mt-0.5">{item.previousText}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-amber-300">
                        <ArrowRight className="w-3 h-3" /> Replace with
                      </div>
                      <div className="rounded-sm border border-amber-500/25 bg-amber-500/5 px-3 py-2">
                        <p className="text-sm text-zinc-100 leading-relaxed">{item.currentText}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-200 leading-relaxed mb-3">{item.currentText}</p>
                  )}

                  <p className="text-[11px] text-zinc-500 mb-3">{item.reason}</p>

                  <details className="rounded-sm border border-zinc-800 bg-zinc-950/60 px-3 py-2 group">
                    <summary className="list-none cursor-pointer flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Inspect verified evidence</span>
                      <span className="font-mono text-zinc-600">{item.evidence.length} span{item.evidence.length === 1 ? '' : 's'}</span>
                    </summary>
                    <div className="mt-2 pt-2 border-t border-zinc-800 space-y-2">
                      {item.evidence.map((evidence, evidenceIndex) => (
                        <div key={`${evidence.url}:${evidenceIndex}`}>
                          <p className="border-l-2 border-emerald-500/40 pl-2 text-[11px] font-serif italic text-zinc-300 leading-relaxed">
                            &ldquo;{evidence.quote}&rdquo;
                          </p>
                          <a
                            href={evidence.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-mono text-[#e0d0ab] hover:underline"
                          >
                            {evidence.source} · {evidence.spanIds.join(', ')} <ArrowUpRight className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </details>

                  <div className="mt-3 pt-3 border-t border-zinc-800/70 flex items-center justify-between gap-3">
                    <span className="text-[9px] font-mono text-zinc-600">Observed {formatIst(item.observedAt)} IST</span>
                    <button
                      onClick={() => acknowledge(item.mutationId)}
                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${done ? 'text-emerald-400' : 'text-zinc-400 hover:text-[#e0d0ab]'}`}
                    >
                      <span className={`w-4 h-4 rounded-sm border flex items-center justify-center ${done ? 'border-emerald-400 bg-emerald-400/10' : 'border-zinc-600'}`}>
                        {done && <Check className="w-3 h-3" />}
                      </span>
                      {copy.button}
                    </button>
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {patch.hasMore && (
        <div className="mt-4 rounded-sm border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-[11px] text-amber-200">
          More verified mutations remain. Tark will not advance the checkpoint from a partial patch.
        </div>
      )}

      {(allProcessed || completion !== 'idle') && !patch.hasMore && (
        <div className="mt-5 rounded-sm border border-emerald-500/25 bg-emerald-500/5 px-5 py-4 text-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
          <p className="font-serif text-sm text-white">
            {completion === 'server'
              ? `You are current through ${formatIst(patch.verifiedThrough)} IST.`
              : completion === 'device'
              ? `Patch processed through ${formatIst(patch.verifiedThrough)} IST on this device.`
              : 'Every verified change in this patch has been processed.'}
          </p>
          {completion === 'device' && (
            <p className="text-[10px] text-amber-300 mt-1">The server checkpoint could not be advanced; your local progress is preserved.</p>
          )}
          {completion !== 'server' && (
            <button
              onClick={confirmPatch}
              disabled={completion === 'saving'}
              className="mt-3 px-4 py-2 rounded-sm bg-[#e0d0ab] text-zinc-950 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
            >
              {completion === 'saving' ? 'Saving checkpoint…' : 'Confirm rebase'}
            </button>
          )}
          {onOpenArenaQuiz && (
            <div className="mt-3">
              <button
                onClick={onOpenArenaQuiz}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm border border-[#e0d0ab]/40 bg-[#e0d0ab]/10 hover:bg-[#e0d0ab]/20 text-[#e0d0ab] text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Launch Today's Current Affairs Arena
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
