import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { X, Shield, Loader2, Trophy, Award, TrendingUp, BookOpen } from 'lucide-react';
import InfoTooltip from './InfoTooltip';

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

  useEffect(() => {
    let cancelled = false;

    async function fetchDossier() {
      setDossierState('LOADING');
      setError('');

      try {
        // Equivalent Exchange Check
        const { data: currentUserProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('is_public')
          .eq('user_id', currentUserId)
          .single();

        if (profileError) throw profileError;

        if (!currentUserProfile?.is_public) {
          if (!cancelled) setDossierState('EQUIVALENT_EXCHANGE_BLOCKED');
          return;
        }

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
          
          // Log raw payload
          const { data: rawSessions } = await supabase
            .from('quiz_sessions')
            .select('*')
            .eq('user_id', analystId);
            
          if (rawSessions) {
            console.log("Raw Payload:", rawSessions.map(s => ({
              total_questions: s.correct_count + s.incorrect_count + s.unattempted_count,
              score: s.correct_count,
              mode: s.subject_stats ? 'Vanguard' : 'Training'
            })));
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
  }, [analystId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-lg mx-4 bg-zinc-950/95 border border-zinc-800 rounded-sm shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="font-sans font-bold text-xs uppercase tracking-widest text-stone-100">
            Analyst Dossier
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-stone-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {dossierState === 'LOADING' && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin mb-3" />
              <p className="text-xs font-mono uppercase tracking-wider">Decrypting dossier...</p>
            </div>
          )}

          {dossierState === 'ERROR' && error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-10 h-10 text-rose-400/60 mb-3" />
              <p className="text-xs text-rose-400 font-sans">{error}</p>
              <p className="text-[10px] text-zinc-500 mt-2">Unable to retrieve the dossier.</p>
            </div>
          )}

          {dossierState === 'EQUIVALENT_EXCHANGE_BLOCKED' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-12 h-12 text-rose-500/60 mb-4" />
              <p className="text-sm text-stone-200 font-sans leading-relaxed font-bold">
                CLASSIFIED: You must make your own telemetry public to view competitor dossiers.
              </p>
              <p className="text-[10px] text-zinc-500 mt-3 uppercase tracking-wider font-mono">
                Equivalent Exchange Enforced
              </p>
            </div>
          )}

          {dossierState === 'TARGET_PRIVATE' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-sm text-zinc-400 font-sans leading-relaxed">
                This analyst's dossier is classified.
              </p>
              <p className="text-[10px] text-zinc-600 mt-3 uppercase tracking-wider font-mono">
                Operator went dark
              </p>
            </div>
          )}

          {dossierState === 'PUBLIC_DOSSIER' && dossier && (
            <div className="space-y-6">
              {/* Identity Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                <div className="p-2.5 bg-zinc-800 rounded-sm">
                  <Award className="w-5 h-5 text-[#e0d0ab]" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-stone-100 tracking-tight">
                    {dossier.name || 'Classified'}
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">
                    PUBLIC ANALYST PROFILE
                  </p>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800/60 p-4 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-3.5 h-3.5 text-[#e0d0ab]" />
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                      Contender Points
                    </span>
                    <InfoTooltip text="Earn 25 CP per Vanguard Assessment by breaching the 80% accuracy threshold." />
                  </div>
                  <p className="text-2xl font-mono font-bold text-stone-100">
                    {dossier.points ?? 0}
                  </p>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800/60 p-4 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-3.5 h-3.5 text-[#e0d0ab]" />
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                      Trophies
                    </span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-stone-100">
                    {dossier.trophies ?? 0}
                  </p>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800/60 p-4 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-3.5 h-3.5 text-[#e0d0ab]" />
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                      Total Assessments
                    </span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-stone-100">
                    {dossier.total_assessments ?? 0}
                  </p>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800/60 p-4 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-[#e0d0ab]" />
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                      Avg Accuracy
                    </span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-emerald-400">
                    {dossier.average_accuracy != null ? `${dossier.average_accuracy}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}