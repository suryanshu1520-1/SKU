import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Shield, Loader2, Award, X, Info } from 'lucide-react';

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
}

export default function Leaderboard({ onAnalystClick }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);

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

        if (fetchError) {
          throw fetchError;
        }

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
    return entry.name || 'Anonymous Analyst';
  };

  const renderPodiumStyle = (rank: number) => {
    if (rank === 1) return 'text-yellow-500/90';
    if (rank === 2) return 'text-zinc-400';
    if (rank === 3) return 'text-amber-700/80';
    return 'text-stone-100';
  };

  return (
    <div className="min-h-[85vh] bg-zinc-950 text-stone-100 p-4 md:p-8 max-w-4xl mx-auto flex flex-col gap-8 font-sans animate-fade-in">

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-zinc-800 rounded-sm">
            <Trophy className="w-5 h-5 text-[#e0d0ab]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-bold text-lg uppercase tracking-widest text-stone-100">
                Tark Vanguard
              </h1>
              <button
                onClick={() => setShowInfoModal(true)}
                className="p-1 text-zinc-500 hover:text-[#e0d0ab] transition-colors cursor-pointer"
                title="How leaderboard works"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] font-mono text-zinc-500 mt-0.5 leading-relaxed">
              Resets Sundays at 14:00 IST
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin mb-3" />
          <p className="text-xs font-mono uppercase tracking-wider">Loading contenders...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Shield className="w-10 h-10 text-rose-400/60 mb-3" />
          <p className="text-xs text-rose-400 font-sans">{error}</p>
          <p className="text-[10px] text-zinc-500 mt-2">Unable to retrieve the leaderboard.</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Shield className="w-12 h-12 text-zinc-700 mb-4" />
          <p className="text-sm text-zinc-400 font-sans leading-relaxed">
            The ledger is clean. Take an assessment to secure your rank.
          </p>
          <p className="text-[10px] text-zinc-600 mt-3 uppercase tracking-wider font-mono">
            A new week begins. Claim the Vanguard.
          </p>
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && !error && entries.length > 0 && (
        <div className="bg-zinc-900/10 border border-zinc-800 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[9px] uppercase tracking-widest font-bold">
                  <th className="py-3 px-4 w-12">RANK</th>
                  <th className="py-3 px-4">CONTENDER</th>
                  <th className="py-3 px-4 text-right">POINTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {entries.map((entry, index) => {
                  const rank = index + 1;
                  const pointColor = renderPodiumStyle(rank);
                  const showTrophy = entry.trophy_count > 0;

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-zinc-900/30 text-stone-300 transition-colors"
                    >
                      {/* Rank */}
                      <td className="py-4 px-4">
                        <span className={`font-mono font-bold text-sm ${pointColor}`}>
                          {rank}
                        </span>
                      </td>

                      {/* Contender Name + Trophy Accolades */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {entry.is_public ? (
                            <span
                              onClick={() => onAnalystClick(entry.user_id)}
                              className="text-sm text-stone-200 font-medium cursor-pointer hover:text-emerald-400 transition-colors"
                            >
                              {displayName(entry)}
                            </span>
                          ) : (
                            <span className="text-sm text-stone-200 font-medium inline-flex items-center gap-1.5">
                              {displayName(entry)}
                            </span>
                          )}
                          {showTrophy && (
                            <span className="inline-flex items-center gap-1 text-[#e0d0ab]">
                              <Trophy className="w-3.5 h-3.5 fill-[#e0d0ab]/20" />
                              {entry.trophy_count > 1 && (
                                <span className="text-[9px] font-mono text-zinc-400">
                                  x{entry.trophy_count}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Points */}
                      <td className="py-4 px-4 text-right">
                        <span className={`font-mono font-bold text-sm ${pointColor}`}>
                          {entry.contender_points}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer note */}
      {!loading && !error && entries.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
          <Award className="w-3 h-3" />
          Top contender each Sunday earns a trophy.
        </div>
      )}

      {/* Info Modal */}
      <AnimatePresence>
        {showInfoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowInfoModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-zinc-800 p-8 md:p-10 rounded-sm max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs uppercase tracking-widest font-bold text-stone-200">
                  Vanguard Leaderboard
                </h2>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="p-1 text-zinc-500 hover:text-stone-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed font-sans">
                <div className="bg-zinc-900/50 border border-zinc-800/60 p-4 rounded-sm">
                  <p className="font-bold text-[#e0d0ab] text-[10px] uppercase tracking-widest mb-2">
                    How Contender Points Work
                  </p>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span><strong>Tactical Yield System:</strong> Earn <strong>+3 CP</strong> for every correct answer, and lose <strong>-1 CP</strong> for every incorrect answer. Unattempted questions yield 0 CP.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span><strong>Vanguard Bonus:</strong> Score <strong>80% or higher</strong> in an assessment to earn a massive <strong>+15 CP bonus</strong>.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>Only <strong>ranked Vanguard Assessments</strong> award CP. Training Ground sessions do not count.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>The leaderboard <strong>resets every Sunday at 14:00 IST</strong>. All CP are reset to zero.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>The contender with the <strong>highest CP at reset</strong> earns the <strong>Vanguard Trophy</strong> and appears on the board with their trophy count.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>Multiple weeks of dominance are tracked via the trophy count.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowInfoModal(false)}
                className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 px-6 bg-[#e0d0ab] hover:bg-stone-100 text-zinc-950 font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-all"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}