import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Trophy, Shield, Loader2, Award, X, Info, Crown, Medal, Flame } from 'lucide-react';
import { Modal, EmptyState } from './shared';

interface LeaderboardEntry {
  id: string;
  name: string | null;
  contender_points: number;
  trophy_count: number;
  is_public: boolean;
  user_id: string;
}

interface LeaderboardProps {
  onAnalystClick: (userId: string) => void;
  currentUserId?: string;
}

export default function Leaderboard({ onAnalystClick, currentUserId }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      setLoading(true);
      setError('');

      try {
        const { data, error: fetchError } = await supabase
          .from('public_leaderboard')
          .select('*');

        if (cancelled) return;

        if (fetchError) throw fetchError;

        setEntries((data as LeaderboardEntry[]) || []);
      } catch (err: any) {
        console.error('[Leaderboard] Fetch error:', err);
        if (!cancelled) {
          setError(err.message || 'Failed to load leaderboard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLeaderboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = (entry: LeaderboardEntry): string => {
    return entry.name || 'Anonymous Candidate';
  };

  const top3 = entries.slice(0, 3);
  const regularEntries = entries.slice(3);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { color: 'text-[#e0d0ab] border-[#e0d0ab]/40 bg-[#e0d0ab]/10', label: '1ST', icon: Trophy };
    if (rank === 2) return { color: 'text-stone-300 border-stone-400/40 bg-stone-400/10', label: '2ND', icon: Medal };
    if (rank === 3) return { color: 'text-amber-500 border-amber-600/40 bg-amber-600/10', label: '3RD', icon: Medal };
    return { color: 'text-zinc-500 border-zinc-800 bg-zinc-900', label: `${rank}`, icon: null };
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 font-sans pb-24">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-6 font-sans">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#e0d0ab] animate-pulse" />
            <span className="text-[10px] font-sans uppercase tracking-wider text-[#e0d0ab] font-medium">
              This Week's Ranking
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Tark Rankings
          </h1>
          <p className="text-xs font-sans text-zinc-400 mt-1">
            Resets every Sunday at 14:00 IST &bull; scored server-side
          </p>
        </div>

        <button
          onClick={() => setShowInfoModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-[#0194a8] text-zinc-300 hover:text-[#e0d0ab] rounded-sm text-xs font-sans font-medium transition-all self-start sm:self-auto cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 text-[#0194a8]" />
          <span>Scoring Rules</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 font-sans">
          <Loader2 className="w-6 h-6 animate-spin text-[#0194a8] mb-3" />
          <p className="text-xs font-sans uppercase tracking-wider">Loading rankings...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 bg-rose-950/20 border border-rose-800/40 text-rose-300 rounded-sm text-center">
          <Shield className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <p className="text-xs font-sans font-bold">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && entries.length === 0 && (
        <EmptyState
          icon={Trophy}
          title="No rankings yet this week"
          description="A new assessment cycle has begun. Take a ranked test in the Arena to claim your spot."
        />
      )}

      {/* Podium & Leaderboard Content */}
      {!loading && !error && entries.length > 0 && (
        <div className="space-y-8 font-sans">
          
          {/* Top 3 Contender Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {top3.map((entry, idx) => {
                const rank = idx + 1;
                const badge = getRankBadge(rank);
                const isCurrentUser = currentUserId && entry.user_id === currentUserId;

                return (
                  <motion.div
                    key={entry.id}
                    initial={prefersReduced ? undefined : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.1 }}
                    whileHover={prefersReduced ? undefined : { y: -3 }}
                    onClick={() => onAnalystClick(entry.user_id)}
                    className={`relative p-5 rounded-sm border flex flex-col justify-between transition-all cursor-pointer backdrop-blur-sm ${
                      rank === 1
                        ? 'bg-gradient-to-b from-zinc-900/60 via-zinc-900/40 to-zinc-950 border-[#e0d0ab]/50 shadow-lg shadow-[#e0d0ab]/10 order-first sm:order-2 sm:-translate-y-2'
                        : rank === 2
                        ? 'bg-zinc-900/30 border-zinc-800 hover:border-stone-400/40 order-2 sm:order-1'
                        : 'bg-zinc-900/30 border-zinc-800 hover:border-amber-600/40 order-3'
                    } ${isCurrentUser ? 'ring-1 ring-[#0194a8]' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded-sm border text-[10px] font-sans font-bold ${badge.color}`}>
                        {badge.label}
                      </span>
                      {entry.trophy_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#e0d0ab]">
                          <Trophy className="w-3.5 h-3.5 fill-[#e0d0ab]/20" />
                          <span className="font-mono">{entry.trophy_count}</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-serif text-base font-bold text-stone-100 group-hover:text-[#e0d0ab] transition-colors truncate">
                        {displayName(entry)}
                      </h3>
                      <p className="text-[10px] font-sans text-zinc-500 uppercase tracking-wider">
                        {isCurrentUser ? 'You (Current Session)' : 'Ranked Aspirant'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-sans text-zinc-500 uppercase">Points</span>
                      <span className="font-mono text-xl font-bold text-[#e0d0ab]">
                        {entry.contender_points} CP
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Full Contender Ledger Table */}
          <div className="bg-zinc-900/20 border border-zinc-800 rounded-sm overflow-hidden backdrop-blur-sm">
            <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
              <h3 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab]">
                All Ranked Aspirants <span className="font-mono">({entries.length})</span>
              </h3>
              <span className="text-[10px] font-sans text-zinc-500">
                Click any row for full stats
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] font-sans uppercase tracking-wider font-bold">
                    <th className="py-3 px-5 w-16">Rank</th>
                    <th className="py-3 px-5">Candidate</th>
                    <th className="py-3 px-5 text-center">Trophies</th>
                    <th className="py-3 px-5 text-right">Rank Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans text-xs">
                  {entries.map((entry, index) => {
                    const rank = index + 1;
                    const isCurrentUser = currentUserId && entry.user_id === currentUserId;

                    return (
                      <motion.tr
                        key={entry.id}
                        initial={prefersReduced ? undefined : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
                        onClick={() => onAnalystClick(entry.user_id)}
                        className={`hover:bg-zinc-900/50 text-stone-300 transition-colors cursor-pointer group ${
                          isCurrentUser ? 'bg-[#0194a8]/10' : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-5 font-mono">
                          <span
                            className={`font-bold ${
                              rank === 1
                                ? 'text-[#e0d0ab]'
                                : rank === 2
                                ? 'text-stone-300'
                                : rank === 3
                                ? 'text-amber-500'
                                : 'text-zinc-500'
                            }`}
                          >
                            #{rank}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-stone-200 group-hover:text-[#e0d0ab] transition-colors">
                              {displayName(entry)}
                            </span>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.2 bg-[#0194a8]/20 border border-[#0194a8]/40 text-[#0194a8] text-[9px] font-sans font-bold uppercase rounded-sm">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Trophies */}
                        <td className="py-3.5 px-5 text-center">
                          {entry.trophy_count > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[#e0d0ab] font-mono text-xs">
                              <Trophy className="w-3.5 h-3.5 fill-[#e0d0ab]/20" />
                              <span>{entry.trophy_count}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-600 font-mono">&mdash;</span>
                          )}
                        </td>

                        {/* Points */}
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-stone-100 group-hover:text-[#e0d0ab] transition-colors">
                          {entry.contender_points} CP
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Scoring Rules Modal */}
      <Modal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="How Ranking & Points Work"
        subtitle="Zero-Trust Competitive Protocol Rules"
      >
        <div className="space-y-4 text-xs text-zinc-300 leading-relaxed font-sans">
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-sm space-y-3">
            <h4 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab]">
              Tactical Yield Calculations
            </h4>
            <ul className="space-y-2 text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold mt-0.5">&bull;</span>
                <span><strong>Correct Assessment Item:</strong> Earn <strong>+3 CP</strong> for every validated correct response.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold mt-0.5">&bull;</span>
                <span><strong>Incorrect Response Penalty:</strong> Incur <strong>-1 CP</strong> penalty for false submissions.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0194a8] font-bold mt-0.5">&bull;</span>
                <span><strong>Accuracy Bonus:</strong> Attain <strong>80% or higher accuracy</strong> to secure a <strong>+15 CP bonus</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#e0d0ab] font-bold mt-0.5">&bull;</span>
                <span><strong>Weekly Reset:</strong> Leaderboard resets every <strong>Sunday at 14:00 IST</strong>. Highest ranking candidate earns a permanent Trophy.</span>
              </li>
            </ul>
          </div>
        </div>
      </Modal>

    </div>
  );
}