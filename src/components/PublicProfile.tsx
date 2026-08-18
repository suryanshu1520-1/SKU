import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Loader2, Trophy, Award, TrendingUp, BookOpen } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import InfoTooltip from './InfoTooltip';
import { StatCard } from './shared';

interface PublicProfileProps {
  analystId: string;
  currentUserId: string;
  onClose: () => void;
}

interface DossierData {
  status: 'public' | 'private';
  name?: string;
  points?: number;
  trophies?: number;
  total_assessments?: number;
  average_accuracy?: number;
}

export default function PublicProfile({ analystId, currentUserId, onClose }: PublicProfileProps) {
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [dossierState, setDossierState] = useState<'LOADING' | 'EQUIVALENT_EXCHANGE_BLOCKED' | 'TARGET_PRIVATE' | 'PUBLIC_DOSSIER' | 'ERROR'>('LOADING');
  const [error, setError] = useState('');
  const [radarData, setRadarData] = useState<{ domain: string; accuracy: number }[]>([]);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchDossier() {
      setDossierState('LOADING');
      setError('');

      try {
        // Equivalent Exchange Check
        const { data: currentUserProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('is_public, membership_tier')
          .eq('user_id', currentUserId)
          .single();

        if (profileError) throw profileError;

        if (!currentUserProfile?.is_public) {
          if (!cancelled) setDossierState('EQUIVALENT_EXCHANGE_BLOCKED');
          return;
        }

        setIsPremium(currentUserProfile?.membership_tier === 'pro' || currentUserProfile?.membership_tier === 'premium');

        const { data, error: rpcError } = await supabase.rpc('get_analyst_dossier', {
          target_user_id: analystId,
        });

        if (cancelled) return;

        if (rpcError) {
          throw rpcError;
        }

        const dossierData = data as DossierData;

        if (dossierData.status === 'private') {
          setDossierState('TARGET_PRIVATE');
        } else {
          setDossierState('PUBLIC_DOSSIER');
          setDossier(dossierData);

          // Aggregate domain stats from quiz_sessions
          const { data: rawSessions } = await supabase
            .from('quiz_sessions')
            .select('subject_stats')
            .eq('user_id', analystId);

          if (rawSessions) {
            const domainStats: Record<string, { correct: number; total: number }> = {};
            rawSessions.forEach((session) => {
              if (session.subject_stats) {
                Object.entries(session.subject_stats).forEach(([domain, stats]: [string, any]) => {
                  if (!domainStats[domain]) domainStats[domain] = { correct: 0, total: 0 };
                  domainStats[domain].correct += stats.correct;
                  domainStats[domain].total += stats.total;
                });
              }
            });

            const aggregated = Object.entries(domainStats).map(([domain, stats]) => ({
              domain,
              accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
            }));

            setRadarData(aggregated);
          }
        }
      } catch (err: any) {
        console.error('[PublicProfile] Fetch error:', err);
        if (!cancelled) {
          setError(err.message || 'Failed to load analyst dossier');
          setDossierState('ERROR');
        }
      }
    }

    fetchDossier();

    return () => {
      cancelled = true;
    };
  }, [analystId, currentUserId]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-sm shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
          <h2 className="font-mono text-xs uppercase tracking-widest text-[#e0d0ab] font-bold">
            Analyst Dossier
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-stone-100 transition-colors cursor-pointer rounded-sm"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {dossierState === 'LOADING' && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin text-[#0194a8] mb-3" />
              <p className="text-xs font-mono uppercase tracking-wider">Decrypting analyst dossier...</p>
            </div>
          )}

          {dossierState === 'ERROR' && error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-10 h-10 text-rose-400 mb-3" />
              <p className="text-xs text-rose-400 font-sans">{error}</p>
              <p className="text-[10px] text-zinc-500 mt-2 font-mono">Unable to retrieve the requested record.</p>
            </div>
          )}

          {dossierState === 'EQUIVALENT_EXCHANGE_BLOCKED' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-12 h-12 text-[#0194a8] mb-4" />
              <p className="text-sm text-stone-200 font-sans leading-relaxed font-bold">
                Equivalent Exchange Enforced
              </p>
              <p className="text-xs text-zinc-400 font-sans mt-2 max-w-xs">
                You must make your own profile public in Profile Settings before viewing other contenders' telemetry.
              </p>
              <p className="text-[10px] text-[#e0d0ab] mt-4 uppercase tracking-wider font-mono">
                Fair play verified
              </p>
            </div>
          )}

          {dossierState === 'TARGET_PRIVATE' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-12 h-12 text-zinc-600 mb-4" />
              <p className="text-sm text-zinc-300 font-sans leading-relaxed font-bold">
                Classified Dossier
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-sans">
                This contender has configured their analytical history to remain private.
              </p>
            </div>
          )}

          {dossierState === 'PUBLIC_DOSSIER' && dossier && (
            <div className="space-y-6">
              {/* Identity Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm">
                  <Award className="w-6 h-6 text-[#e0d0ab]" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-white tracking-tight">
                    {dossier.name || 'Anonymous Candidate'}
                  </h3>
                  <p className="text-[10px] font-mono text-[#0194a8] mt-0.5 uppercase tracking-wider font-bold">
                    VERIFIED PUBLIC DOSSIER
                  </p>
                </div>
              </div>

              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Contender Points"
                  value={dossier.points ?? 0}
                  icon={Trophy}
                  accentColor="text-[#e0d0ab]"
                />
                <StatCard
                  label="Trophies"
                  value={dossier.trophies ?? 0}
                  icon={Award}
                  accentColor="text-[#e0d0ab]"
                />
                <StatCard
                  label="Assessments"
                  value={dossier.total_assessments ?? 0}
                  icon={BookOpen}
                  accentColor="text-stone-300"
                />
                <StatCard
                  label="Avg Accuracy"
                  value={dossier.average_accuracy != null ? `${dossier.average_accuracy}%` : 'N/A'}
                  icon={TrendingUp}
                  isNumeric={false}
                  accentColor={
                    (dossier.average_accuracy ?? 0) >= 70 ? 'text-emerald-400' : 'text-[#0194a8]'
                  }
                />
              </div>

              {/* Advanced Telemetry / Radar Chart Section */}
              <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-[#0194a8]" />
                  <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-stone-200">
                    Domain Mastery Radar
                  </h4>
                </div>

                {!isPremium ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/30 border border-zinc-800 rounded-sm text-center">
                    <Shield className="w-8 h-8 text-[#e0d0ab] mb-2.5" />
                    <p className="text-xs text-stone-200 font-sans font-bold uppercase tracking-widest">
                      Founders Club Clearance Required
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                      Domain telemetry and tactical skill radars are unlocked for active members.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-sm">
                    {radarData.length === 0 ? (
                      <div className="flex items-center justify-center py-10">
                        <p className="text-xs font-mono text-zinc-500 tracking-widest">
                          [ INSUFFICIENT DATA TO RENDER RADAR ]
                        </p>
                      </div>
                    ) : (
                      <div className="w-full">
                        <ResponsiveContainer width="100%" height={240}>
                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                            <PolarGrid stroke="#0194a8" strokeOpacity={0.25} />
                            <PolarAngleAxis
                              dataKey="domain"
                              tick={{ fill: '#c8b998', fontSize: 11, fontFamily: 'monospace' }}
                            />
                            <Radar
                              dataKey="accuracy"
                              stroke="#e0d0ab"
                              fill="#e0d0ab"
                              fillOpacity={0.35}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}