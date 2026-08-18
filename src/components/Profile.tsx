import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { QuizSession, SavedInsight } from '../types';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import {
  User,
  History,
  Clock,
  TrendingUp,
  LogOut,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Inbox,
  Award,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  BookOpen,
  Pencil,
  Check,
  X,
  Download,
  Shield,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import InfoTooltip from './InfoTooltip';
import { StatCard, EmptyState, SkeletonCard } from './shared';

interface ProfileProps {
  userEmail: string;
  userId?: string;
  userName: string;
  onLogout: () => void;
}

interface SavedArticle {
  id: string;
  article_id: string;
  created_at: string;
  current_affairs: {
    id: string;
    headline: string;
    url: string;
    source: string;
    ministry: string;
    created_at: string;
  };
}

export default function Profile({ userEmail, userId, userName, onLogout }: ProfileProps) {
  const [history, setHistory] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [localUserName, setLocalUserName] = useState(userName);
  const [nameError, setNameError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Membership tier
  const [membershipTier, setMembershipTier] = useState<string | null>(null);
  const [loadingTier, setLoadingTier] = useState(true);
  const [exportToast, setExportToast] = useState('');

  // Privacy toggle state
  const [isPublic, setIsPublic] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);

  // Bookmark / Saved Insights State
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [deletingInsightId, setDeletingInsightId] = useState<string | null>(null);

  // View mode toggle
  const [viewMode, setViewMode] = useState<'insights' | 'articles'>('insights');

  // Saved articles state
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [removingArticleId, setRemovingArticleId] = useState<string | null>(null);

  const prefersReduced = useReducedMotion();

  // Fetch membership tier and is_public status
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase
            .from('user_profiles')
            .select('membership_tier, is_public')
            .eq('user_id', session.user.id)
            .maybeSingle();
          if (data) {
            setMembershipTier(data.membership_tier);
            setIsPublic(data.is_public ?? false);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch profile data:', err);
      } finally {
        setLoadingTier(false);
      }
    })();
  }, [userId]);

  // Privacy toggle handler
  const handleToggleVisibility = async () => {
    if (!userId || savingVisibility) return;
    setSavingVisibility(true);
    try {
      const newValue = !isPublic;
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_public: newValue })
        .eq('user_id', userId);
      if (error) throw error;
      setIsPublic(newValue);
    } catch (err) {
      console.warn('Failed to update profile visibility:', err);
    } finally {
      setSavingVisibility(false);
    }
  };

  // Auto-dismiss export toast
  useEffect(() => {
    if (!exportToast) return;
    const t = setTimeout(() => setExportToast(''), 3000);
    return () => clearTimeout(t);
  }, [exportToast]);

  // Fetch Quiz History
  useEffect(() => {
    async function fetchQuizHistory() {
      const identifier = userId || userEmail;
      if (!identifier) return;
      setLoading(true);
      setErrorMsg('');

      try {
        let query = supabase
          .from('quiz_sessions')
          .select('*')
          .order('created_at', { ascending: false });

        if (userId) {
          query = query.eq('user_id', userId);
        } else {
          query = query.eq('user_email', userEmail);
        }

        const { data, error } = await query;
        if (error) throw error;
        setHistory(data || []);
      } catch (err: any) {
        console.error('Failed to fetch history:', err);
        setErrorMsg('Failed to load session history.');
      } finally {
        setLoading(false);
      }
    }

    fetchQuizHistory();
  }, [userId, userEmail]);

  // Fetch Saved Insights
  const fetchSavedInsights = async () => {
    if (!userId) return;
    setLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from('saved_insights')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedInsights(data || []);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  // Fetch Saved Articles
  const fetchSavedArticles = async () => {
    if (!userId) return;
    setLoadingArticles(true);
    try {
      const { data, error } = await supabase
        .from('saved_articles')
        .select('id, article_id, created_at, current_affairs(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const validArticles = (data || []).filter((item: any) => item.current_affairs != null) as SavedArticle[];
      setSavedArticles(validArticles);
    } catch (err) {
      console.error('Error fetching saved articles:', err);
    } finally {
      setLoadingArticles(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'insights') fetchSavedInsights();
    else if (viewMode === 'articles') fetchSavedArticles();
  }, [userId, viewMode]);

  // Delete Bookmark
  const deleteBookmark = async (insightId: string) => {
    setDeletingInsightId(insightId);
    try {
      const { error } = await supabase.from('saved_insights').delete().eq('id', insightId);
      if (error) throw error;
      setSavedInsights((prev) => prev.filter((item) => item.id !== insightId));
    } catch (err) {
      console.error('Error deleting bookmark:', err);
    } finally {
      setDeletingInsightId(null);
    }
  };

  // Remove Saved Article
  const removeSavedArticle = async (savedId: string) => {
    setRemovingArticleId(savedId);
    try {
      const { error } = await supabase.from('saved_articles').delete().eq('id', savedId);
      if (error) throw error;
      setSavedArticles((prev) => prev.filter((item) => item.id !== savedId));
    } catch (err) {
      console.error('Error removing saved article:', err);
    } finally {
      setRemovingArticleId(null);
    }
  };

  // CSV Export
  const handleExportClick = () => {
    const isPro = membershipTier === 'pro' || membershipTier === 'premium';
    if (!isPro) {
      setExportToast('Upgrade to Founders Club to export full CSV analytical logs.');
      return;
    }
    if (history.length === 0) return;

    const headers = ['Attempt ID', 'Date', 'Correct', 'Incorrect', 'Unattempted', 'Total', 'Accuracy %', 'Mode'];
    const rows = history.map((h, i) => {
      const total = h.correct_count + h.incorrect_count + h.unattempted_count;
      const acc = total > 0 ? ((h.correct_count / total) * 100).toFixed(1) : '0';
      const mode = h.subject_stats ? 'Vanguard Ranked' : 'Training Ground';
      return [
        h.id || `LOG-${i + 1}`,
        new Date(h.created_at).toISOString(),
        h.correct_count,
        h.incorrect_count,
        h.unattempted_count,
        total,
        acc,
        mode,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tark-analytics-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportToast('Analytical history exported to CSV.');
  };

  // Computed Aggregates
  const totalAttempts = history.length;
  const lastAttempt = history[0] || null;

  const averageAccuracy = useMemo(() => {
    if (history.length === 0) return 0;
    const totalAccuracy = history.reduce((acc, h) => {
      const tot = h.correct_count + h.incorrect_count + h.unattempted_count;
      return acc + (tot > 0 ? (h.correct_count / tot) * 100 : 0);
    }, 0);
    return Math.round(totalAccuracy / history.length);
  }, [history]);

  const bestScore = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.max(...history.map((h) => h.correct_count));
  }, [history]);

  // Chart Time Series Data
  const chartData = useMemo(() => {
    return [...history]
      .reverse()
      .slice(-12)
      .map((h, idx) => {
        const tot = h.correct_count + h.incorrect_count + h.unattempted_count;
        const acc = tot > 0 ? Math.round((h.correct_count / tot) * 100) : 0;
        return {
          session: `#${idx + 1}`,
          accuracy: acc,
          correct: h.correct_count,
          date: new Date(h.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        };
      });
  }, [history]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isPro = membershipTier === 'pro' || membershipTier === 'premium';

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 font-sans pb-24 text-stone-100">
      
      {/* 1. Header Profile Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-zinc-900/30 border border-zinc-800 rounded-sm backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm">
            <User className="w-8 h-8 text-[#e0d0ab]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    className="px-2 py-1 bg-zinc-950 border border-zinc-700 rounded-sm text-sm font-bold text-white focus:outline-none focus:border-[#e0d0ab]"
                  />
                  <button
                    onClick={async () => {
                      if (!editNameValue.trim()) return;
                      setSavingName(true);
                      try {
                        const { error } = await supabase.auth.updateUser({ data: { name: editNameValue.trim() } });
                        if (!error) {
                          setLocalUserName(editNameValue.trim());
                          setEditingName(false);
                        }
                      } finally {
                        setSavingName(false);
                      }
                    }}
                    className="p-1.5 bg-[#e0d0ab] text-zinc-950 rounded-sm cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="p-1.5 bg-zinc-800 text-zinc-400 rounded-sm cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-xl sm:text-2xl font-bold text-white">
                    {localUserName || 'Anonymous Candidate'}
                  </h1>
                  <button
                    onClick={() => {
                      setEditNameValue(localUserName);
                      setEditingName(true);
                      setTimeout(() => nameInputRef.current?.focus(), 50);
                    }}
                    className="p-1 text-zinc-500 hover:text-[#e0d0ab] transition-colors cursor-pointer"
                    title="Edit display name"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs font-mono text-zinc-400 mt-0.5">{userEmail}</p>
          </div>
        </div>

        {/* Action Pills: Tier Badge + Privacy Toggle + Logout */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Membership Badge */}
          {isPro ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e0d0ab]/15 border border-[#e0d0ab]/40 text-[#e0d0ab] rounded-sm text-xs font-mono font-bold uppercase tracking-wider shadow-sm shadow-[#e0d0ab]/10">
              <Shield className="w-3.5 h-3.5 text-[#e0d0ab]" />
              <span>Founders Club</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-sm text-xs font-mono uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-zinc-500" />
              <span>Standard Tier</span>
            </div>
          )}

          {/* Visibility Toggle */}
          <button
            onClick={handleToggleVisibility}
            disabled={savingVisibility}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-mono font-medium transition-all cursor-pointer ${
              isPublic
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-stone-200'
            }`}
            title="Toggle public telemetry sharing on Vanguard Leaderboard"
          >
            {isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isPublic ? 'Public Ledger' : 'Private'}</span>
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-rose-950/30 border border-zinc-800 hover:border-rose-700/50 text-zinc-400 hover:text-rose-300 rounded-sm text-xs font-mono transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* 2. Top-Level Analytical Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Assessments"
          value={totalAttempts}
          icon={Layers}
          accentColor="text-stone-100"
          subtext="Processed quiz sessions"
          delay={0.05}
        />
        <StatCard
          label="Cohort Mean Accuracy"
          value={averageAccuracy}
          suffix="%"
          icon={TrendingUp}
          accentColor={averageAccuracy >= 70 ? 'text-emerald-400' : 'text-[#0194a8]'}
          subtext="Average accuracy across attempts"
          delay={0.1}
        />
        <StatCard
          label="Peak Query Yield"
          value={bestScore}
          suffix=" / 25"
          icon={Award}
          accentColor="text-[#e0d0ab]"
          subtext="Highest single-session score"
          delay={0.15}
        />
      </div>

      {/* 3. Performance Trend AreaChart */}
      {chartData.length > 1 && (
        <motion.div
          initial={prefersReduced ? undefined : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-sm space-y-4 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0194a8]" />
              <h3 className="font-mono text-xs uppercase tracking-widest text-[#e0d0ab] font-bold">
                Accuracy Trajectory (Last {chartData.length} Attempts)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              Benchmark Target: 80% Vanguard
            </span>
          </div>

          <div className="w-full h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0194a8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0194a8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="session" stroke="#52525b" tick={{ fill: '#a69a7f', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis domain={[0, 100]} stroke="#52525b" tick={{ fill: '#a69a7f', fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#072e63', borderColor: '#0194a8', borderRadius: '2px', fontSize: '11px', color: '#e0d0ab', fontFamily: 'monospace' }}
                  formatter={(val: any) => [`${val}% Accuracy`, 'Score']}
                  labelFormatter={(lbl: any) => `Session ${lbl}`}
                />
                <Area type="monotone" dataKey="accuracy" stroke="#0194a8" strokeWidth={2} fillOpacity={1} fill="url(#colorAcc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* 4. Bookmarks Section (Saved Insights & Articles) */}
      <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#e0d0ab]" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-[#e0d0ab] font-bold">
              Candidate Knowledge Dossier
            </h3>
          </div>

          {/* View Mode Toggle Pill */}
          <div className="flex items-center gap-1.5 p-0.5 bg-zinc-900 border border-zinc-800 rounded-sm self-start sm:self-auto">
            <button
              onClick={() => setViewMode('insights')}
              className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                viewMode === 'insights'
                  ? 'bg-[#e0d0ab] text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-stone-200'
              }`}
            >
              Saved Insights ({savedInsights.length})
            </button>
            <button
              onClick={() => setViewMode('articles')}
              className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                viewMode === 'articles'
                  ? 'bg-[#e0d0ab] text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-stone-200'
              }`}
            >
              Saved Dispatches ({savedArticles.length})
            </button>
          </div>
        </div>

        {/* Insights View */}
        {viewMode === 'insights' && (
          <div>
            {loadingSaved ? (
              <div className="py-8 flex items-center justify-center text-zinc-500 font-mono text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#0194a8] mr-2" />
                <span>Loading saved conceptual flashcards...</span>
              </div>
            ) : savedInsights.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No Insights Bookmarked"
                description="During mock test autopsies, click the bookmark icon on conceptual feedback to save high-yield flashcards here."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedInsights.map((insight) => {
                  const isExpanded = expandedInsightId === insight.id;
                  const isDeleting = deletingInsightId === insight.id;

                  return (
                    <motion.div
                      key={insight.id}
                      className="bg-zinc-900/40 border border-zinc-800 hover:border-[#0194a8]/50 rounded-sm p-4 flex flex-col justify-between transition-all"
                    >
                      <div
                        onClick={() => setExpandedInsightId(isExpanded ? null : insight.id)}
                        className="cursor-pointer space-y-2"
                      >
                        <p className="text-xs font-sans text-stone-200 leading-relaxed line-clamp-2">
                          {insight.question_text}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-500">
                          Saved on {formatDate(insight.created_at)}
                        </p>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden pt-3 mt-3 border-t border-zinc-800"
                          >
                            <div className="prose prose-invert prose-p:text-xs prose-li:text-xs max-w-none text-zinc-300 font-serif">
                              <Markdown rehypePlugins={[rehypeSanitize]}>{insight.insight_text}</Markdown>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-800/60 text-xs font-mono">
                        <button
                          onClick={() => setExpandedInsightId(isExpanded ? null : insight.id)}
                          className="text-[#0194a8] hover:text-[#e0d0ab] transition-colors cursor-pointer"
                        >
                          {isExpanded ? 'Collapse Flashcard' : 'Read Insight'}
                        </button>
                        <button
                          onClick={() => deleteBookmark(insight.id)}
                          disabled={isDeleting}
                          className="text-zinc-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                          title="Delete bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Articles View */}
        {viewMode === 'articles' && (
          <div>
            {loadingArticles ? (
              <div className="py-8 flex items-center justify-center text-zinc-500 font-mono text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#0194a8] mr-2" />
                <span>Loading saved policy signals...</span>
              </div>
            ) : savedArticles.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No Dispatches Bookmarked"
                description="Browse The Daily Brief and save important cabinet releases and policy dispatches to your ledger."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedArticles.map((saved) => {
                  const article = saved.current_affairs;
                  const isRemoving = removingArticleId === saved.id;

                  return (
                    <div
                      key={saved.id}
                      className="p-4 bg-zinc-900/40 border border-zinc-800 hover:border-[#0194a8]/50 rounded-sm flex flex-col justify-between transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 text-[9px] font-mono uppercase font-bold bg-zinc-900 text-[#e0d0ab] border border-zinc-800 rounded-sm">
                            {article.ministry}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500">
                            {article.source}
                          </span>
                        </div>
                        <h4 className="font-serif text-xs font-bold text-stone-100 leading-snug line-clamp-2">
                          {article.headline}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-800/60 text-xs font-mono">
                        {article.url ? (
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0194a8] hover:text-[#e0d0ab] flex items-center gap-1 cursor-pointer"
                          >
                            <span>Gov Source</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : <span />}

                        <button
                          onClick={() => removeSavedArticle(saved.id)}
                          disabled={isRemoving}
                          className="text-zinc-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                          title="Remove bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Previous Attempts Table */}
      <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#e0d0ab]" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-[#e0d0ab] font-bold">
              Historical Assessment Ledger ({history.length})
            </h3>
          </div>

          <button
            onClick={handleExportClick}
            disabled={history.length === 0 || loadingTier}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-sm border transition-all cursor-pointer ${
              isPro
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Download className="w-3 h-3" />
            <span>{isPro ? 'Export CSV' : 'Export CSV (Pro)'}</span>
          </button>
        </div>

        {loading ? (
          <SkeletonCard variant="feed" count={3} />
        ) : errorMsg ? (
          <p className="text-xs text-rose-400 font-mono py-4 text-center">{errorMsg}</p>
        ) : history.length === 0 ? (
          <EmptyState
            icon={History}
            title="No Prior Assessments Recorded"
            description="Take your first timed mock exam in the Arena to log your baseline."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] font-mono uppercase tracking-widest font-bold">
                  <th className="py-3 px-4">Session ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {history.map((attempt, index) => {
                  const totalCount = attempt.correct_count + attempt.incorrect_count + attempt.unattempted_count;
                  const maxPossible = totalCount > 0 ? totalCount : 25;
                  const ratio = Math.round((attempt.correct_count / maxPossible) * 100);
                  const isExcellent = ratio >= 70;
                  const isPass = ratio >= 40;

                  return (
                    <tr key={attempt.id || index} className="hover:bg-zinc-900/40 text-stone-300 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-zinc-500 text-[11px] uppercase">
                        AT-{attempt.id ? attempt.id.substring(0, 8) : `LOG${history.length - index}`}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                        {formatDate(attempt.created_at)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                        {attempt.subject_stats ? 'Vanguard Ranked' : 'Training Ground'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono font-bold text-[10px] uppercase ${
                            isExcellent
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : isPass
                              ? 'bg-[#0194a8]/10 text-[#0194a8] border border-[#0194a8]/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {attempt.correct_count}/{maxPossible} ({ratio}%)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Toast */}
      <AnimatePresence>
        {exportToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 bg-zinc-900 border border-zinc-700/80 rounded-sm shadow-2xl"
          >
            <p className="text-xs text-stone-200 font-sans whitespace-nowrap">{exportToast}</p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}