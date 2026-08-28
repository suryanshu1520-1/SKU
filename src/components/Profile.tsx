import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { QuizSession, SavedInsight } from '../types';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import {
  User,
  History,
  TrendingUp,
  LogOut,
  Award,
  Bookmark,
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
  Activity,
  Target,
  FileSpreadsheet,
  ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { EmptyState, SkeletonCard } from './shared';

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
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Membership tier & Public ledger
  const [membershipTier, setMembershipTier] = useState<string | null>(null);
  const [loadingTier, setLoadingTier] = useState(true);
  const [exportToast, setExportToast] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);

  // Bookmarks state
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [deletingInsightId, setDeletingInsightId] = useState<string | null>(null);

  // View mode for saved items
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
      const mode = h.subject_stats ? 'Ranked' : 'Training Ground';
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

  // Trajectory delta (last 3 vs overall)
  const trajectoryTrend = useMemo(() => {
    if (history.length < 2) return { label: 'Calibrating', delta: 0, positive: true };
    const recent = history.slice(0, Math.min(3, history.length));
    const recentAvg = Math.round(
      recent.reduce((acc, h) => {
        const tot = h.correct_count + h.incorrect_count + h.unattempted_count;
        return acc + (tot > 0 ? (h.correct_count / tot) * 100 : 0);
      }, 0) / recent.length
    );
    const diff = recentAvg - averageAccuracy;
    if (diff > 0) return { label: `+${diff}% Surge`, delta: diff, positive: true };
    if (diff < 0) return { label: `${diff}% Dip`, delta: diff, positive: false };
    return { label: 'Steady', delta: 0, positive: true };
  }, [history, averageAccuracy]);

  // Chart Time Series Data
  const chartData = useMemo(() => {
    return [...history]
      .reverse()
      .slice(-10)
      .map((h, idx) => {
        const tot = h.correct_count + h.incorrect_count + h.unattempted_count;
        const acc = tot > 0 ? Math.round((h.correct_count / tot) * 100) : 0;
        return {
          session: `§${idx + 1}`,
          accuracy: acc,
          correct: h.correct_count,
          date: new Date(h.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        };
      });
  }, [history]);

  // Precision distribution
  const precisionDistribution = useMemo(() => {
    if (history.length === 0) return { high: 0, moderate: 0, review: 0 };
    let high = 0;
    let moderate = 0;
    let review = 0;
    history.forEach((h) => {
      const tot = h.correct_count + h.incorrect_count + h.unattempted_count;
      const acc = tot > 0 ? (h.correct_count / tot) * 100 : 0;
      if (acc >= 70) high++;
      else if (acc >= 40) moderate++;
      else review++;
    });
    return {
      high: Math.round((high / history.length) * 100),
      moderate: Math.round((moderate / history.length) * 100),
      review: Math.round((review / history.length) * 100),
    };
  }, [history]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isPro = membershipTier === 'pro' || membershipTier === 'premium';
  const initialLetter = (localUserName || userEmail || 'C').charAt(0).toUpperCase();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 font-sans text-stone-100 pb-20">
      
      {/* ══════════════════════════════════════════════════════════════════
          1. COMPACT CANDIDATE DOSSIER & INTEGRATED TELEMETRY STRIP
          ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-[rgba(4,25,54,0.65)] backdrop-blur-md border border-[rgba(19,108,153,0.4)] rounded-xs overflow-hidden shadow-[0_8px_32px_-6px_rgba(0,0,0,0.45)]">
        
        {/* Upper Identity Bar */}
        <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-[rgba(19,108,153,0.3)]">
          <div className="flex items-center gap-4">
            
            {/* Monogram Seal */}
            <div className="relative w-12 h-12 rounded-xs bg-[rgba(224,208,171,0.12)] border border-[rgba(224,208,171,0.4)] flex items-center justify-center text-[#e0d0ab] shadow-inner shrink-0">
              <span className="font-serif font-bold text-lg">{initialLetter}</span>
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#34d399] border-2 border-[#041d40]" title="Active Candidate" />
            </div>

            {/* Name, Email & Tier Tag */}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                {editingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      className="px-2 py-0.5 bg-[rgba(3,16,38,0.9)] border border-[#e0d0ab] rounded-xs text-sm font-serif font-bold text-[#e0d0ab] focus:outline-none"
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
                      className="p-1 bg-[#e0d0ab] text-[#072e63] rounded-xs cursor-pointer hover:bg-white transition-colors"
                      title="Save Name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      className="p-1 bg-zinc-800 text-zinc-400 rounded-xs cursor-pointer hover:text-white"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="font-serif text-lg md:text-xl font-bold text-[#e8e0cf] tracking-tight">
                      {localUserName || 'Anonymous Candidate'}
                    </h1>
                    <button
                      onClick={() => {
                        setEditNameValue(localUserName);
                        setEditingName(true);
                        setTimeout(() => nameInputRef.current?.focus(), 50);
                      }}
                      className="p-1 text-[#8fa2bd] hover:text-[#e0d0ab] transition-colors cursor-pointer"
                      title="Edit display name"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Membership Badge */}
                {isPro ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-semibold uppercase tracking-wider bg-[rgba(224,208,171,0.12)] border border-[rgba(224,208,171,0.35)] text-[#e0d0ab]">
                    <Shield className="w-3 h-3 text-[#e0d0ab]" />
                    Founders Club
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-medium uppercase tracking-wider bg-[rgba(19,108,153,0.2)] border border-[rgba(19,108,153,0.4)] text-[#8fa2bd]">
                    <Award className="w-3 h-3 text-[#0194a8]" />
                    Candidate Ledger
                  </span>
                )}
              </div>

              <p className="text-[11.5px] font-mono text-[#8fa2bd] mt-0.5 truncate">{userEmail}</p>
            </div>
          </div>

          {/* Action Pills */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Visibility Toggle */}
            <button
              onClick={handleToggleVisibility}
              disabled={savingVisibility}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border text-xs font-mono transition-all cursor-pointer ${
                isPublic
                  ? 'bg-[rgba(52,211,153,0.1)] border-[rgba(52,211,153,0.4)] text-[#34d399] hover:bg-[rgba(52,211,153,0.2)]'
                  : 'bg-[rgba(11,61,120,0.25)] border-[rgba(19,108,153,0.4)] text-[#8fa2bd] hover:text-[#e8e0cf]'
              }`}
              title="Toggle public visibility on the cohort leaderboard"
            >
              {isPublic ? <Eye className="w-3.5 h-3.5 text-[#34d399]" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{isPublic ? 'Public Dossier' : 'Private Mode'}</span>
            </button>

            {/* CSV Export */}
            <button
              onClick={handleExportClick}
              disabled={history.length === 0 || loadingTier}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border text-xs font-mono transition-all cursor-pointer ${
                isPro
                  ? 'bg-[rgba(224,208,171,0.1)] border-[rgba(224,208,171,0.35)] text-[#e0d0ab] hover:bg-[#e0d0ab] hover:text-[#072e63]'
                  : 'bg-[rgba(11,61,120,0.25)] border-[rgba(19,108,153,0.4)] text-[#8fa2bd] hover:text-[#e8e0cf]'
              }`}
              title={isPro ? 'Export complete assessment history to CSV' : 'Export CSV (Founders Tier)'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isPro ? 'Export CSV' : 'Export CSV (Pro)'}</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(225,78,78,0.1)] hover:bg-[rgba(225,78,78,0.2)] border border-[rgba(225,78,78,0.3)] text-[#e14e4e] rounded-xs text-xs font-mono transition-all cursor-pointer"
              title="Sign out of current workstation session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Integrated 4-Metric Telemetry Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[rgba(19,108,153,0.25)] bg-[rgba(3,16,38,0.4)]">
          
          {/* Total Assessments */}
          <div className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8fa2bd] text-[11px] font-mono">
              <span>ASSESSMENTS</span>
              <Layers className="w-3.5 h-3.5 text-[#0194a8]" />
            </div>
            <div className="mt-2">
              <span className="font-serif text-2xl font-bold text-[#e0d0ab]">{totalAttempts}</span>
              <p className="text-[10px] font-mono text-[#8fa2bd] mt-0.5">Processed sessions</p>
            </div>
          </div>

          {/* Mean Accuracy */}
          <div className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8fa2bd] text-[11px] font-mono">
              <span>COHORT ACCURACY</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#34d399]" />
            </div>
            <div className="mt-2">
              <span className={`font-serif text-2xl font-bold ${averageAccuracy >= 70 ? 'text-[#34d399]' : 'text-[#0194a8]'}`}>
                {averageAccuracy}%
              </span>
              <p className="text-[10px] font-mono text-[#8fa2bd] mt-0.5">Weighted average</p>
            </div>
          </div>

          {/* Best Score */}
          <div className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8fa2bd] text-[11px] font-mono">
              <span>PEAK SCORE</span>
              <Award className="w-3.5 h-3.5 text-[#e0d0ab]" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-2xl font-bold text-[#e0d0ab]">{bestScore}</span>
                <span className="text-xs font-mono text-[#8fa2bd]">/ 25</span>
              </div>
              <p className="text-[10px] font-mono text-[#8fa2bd] mt-0.5">Highest single test</p>
            </div>
          </div>

          {/* Recent Momentum */}
          <div className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8fa2bd] text-[11px] font-mono">
              <span>MOMENTUM</span>
              <Sparkles className="w-3.5 h-3.5 text-[#e0d0ab]" />
            </div>
            <div className="mt-2">
              <span className={`font-serif text-xl font-bold ${trajectoryTrend.positive ? 'text-[#34d399]' : 'text-[#e14e4e]'}`}>
                {trajectoryTrend.label}
              </span>
              <p className="text-[10px] font-mono text-[#8fa2bd] mt-0.5">Last 3 tests vs mean</p>
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. TWO-COLUMN ANALYTICAL DECK
          ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visual Accuracy Telemetry (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Accuracy Trajectory Area Chart */}
          <div className="p-5 bg-[rgba(4,25,54,0.6)] backdrop-blur-md border border-[rgba(19,108,153,0.4)] rounded-xs flex-1 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-[rgba(19,108,153,0.3)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0194a8]" />
                  <h3 className="font-serif text-xs uppercase tracking-wider font-bold text-[#e0d0ab]">
                    Accuracy Trajectory
                  </h3>
                </div>
                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded-xs bg-[rgba(1,148,168,0.15)] border border-[rgba(1,148,168,0.35)] text-[#0194a8]">
                  Target: 80%
                </span>
              </div>

              {chartData.length > 1 ? (
                <div className="w-full h-44 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="profileAccGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0194a8" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#0194a8" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="session"
                        stroke="rgba(143,162,189,0.4)"
                        tick={{ fill: '#8fa2bd', fontSize: 9, fontFamily: 'monospace' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="rgba(143,162,189,0.4)"
                        tick={{ fill: '#8fa2bd', fontSize: 9, fontFamily: 'monospace' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#041d40',
                          borderColor: '#0194a8',
                          borderRadius: '2px',
                          fontSize: '11px',
                          color: '#e0d0ab',
                          fontFamily: 'monospace',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                        }}
                        formatter={(val: any) => [`${val}% Accuracy`, 'Score']}
                        labelFormatter={(lbl: any) => `Assessment ${lbl}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#0194a8"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#profileAccGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-[#8fa2bd]">
                  <Activity className="w-8 h-8 text-[rgba(19,108,153,0.5)] mb-2 animate-pulse" />
                  <p className="text-xs font-mono">Telemetry Requires &ge; 2 Assessment Sessions</p>
                </div>
              )}
            </div>

            {/* Precision Spectrum Ribbon */}
            <div className="mt-4 pt-3 border-t border-[rgba(19,108,153,0.25)] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#8fa2bd]">
                <span>PRECISION SPECTRUM</span>
                <span>{history.length} Logs</span>
              </div>
              <div className="w-full h-2 rounded-xs overflow-hidden flex bg-[rgba(3,16,38,0.8)] border border-[rgba(19,108,153,0.3)]">
                <div
                  style={{ width: `${precisionDistribution.high}%` }}
                  className="bg-[#34d399] transition-all duration-500"
                  title={`High Accuracy (≥70%): ${precisionDistribution.high}%`}
                />
                <div
                  style={{ width: `${precisionDistribution.moderate}%` }}
                  className="bg-[#0194a8] transition-all duration-500"
                  title={`Moderate (40-69%): ${precisionDistribution.moderate}%`}
                />
                <div
                  style={{ width: `${precisionDistribution.review}%` }}
                  className="bg-[#e14e4e] transition-all duration-500"
                  title={`Needs Review (<40%): ${precisionDistribution.review}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono text-[#8fa2bd]">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" /> ≥70%</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#0194a8]" /> 40–69%</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#e14e4e]" /> &lt;40%</span>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Saved Intelligence & Dispatches (7 cols) */}
        <div className="lg:col-span-7 bg-[rgba(4,25,54,0.6)] backdrop-blur-md border border-[rgba(19,108,153,0.4)] rounded-xs p-5 flex flex-col justify-between shadow-md">
          <div>
            {/* Header & Segmented Pill */}
            <div className="flex items-center justify-between gap-3 border-b border-[rgba(19,108,153,0.3)] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#e0d0ab]" />
                <h3 className="font-serif text-xs uppercase tracking-wider font-bold text-[#e0d0ab]">
                  Saved Vault
                </h3>
              </div>

              <div className="flex items-center p-0.5 bg-[rgba(3,16,38,0.8)] border border-[rgba(19,108,153,0.4)] rounded-xs font-mono text-[10px]">
                <button
                  onClick={() => setViewMode('insights')}
                  className={`px-2.5 py-1 rounded-xs transition-all cursor-pointer ${
                    viewMode === 'insights'
                      ? 'bg-[#e0d0ab] text-[#072e63] font-bold shadow-xs'
                      : 'text-[#8fa2bd] hover:text-[#e8e0cf]'
                  }`}
                >
                  Insights ({savedInsights.length})
                </button>
                <button
                  onClick={() => setViewMode('articles')}
                  className={`px-2.5 py-1 rounded-xs transition-all cursor-pointer ${
                    viewMode === 'articles'
                      ? 'bg-[#e0d0ab] text-[#072e63] font-bold shadow-xs'
                      : 'text-[#8fa2bd] hover:text-[#e8e0cf]'
                  }`}
                >
                  Dispatches ({savedArticles.length})
                </button>
              </div>
            </div>

            {/* Insights View */}
            {viewMode === 'insights' && (
              <div>
                {loadingSaved ? (
                  <div className="py-12 flex items-center justify-center text-[#8fa2bd] font-mono text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0194a8] mr-2" />
                    <span>Retrieving conceptual flashcards...</span>
                  </div>
                ) : savedInsights.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="No Insights Saved"
                    description="Click the bookmark icon on test autopsies to pin high-yield conceptual lessons here."
                  />
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {savedInsights.map((insight) => {
                      const isExpanded = expandedInsightId === insight.id;
                      const isDeleting = deletingInsightId === insight.id;

                      return (
                        <div
                          key={insight.id}
                          className="bg-[rgba(11,61,120,0.2)] border border-[rgba(19,108,153,0.35)] hover:border-[#0194a8]/60 rounded-xs p-3.5 transition-all"
                        >
                          <div
                            onClick={() => setExpandedInsightId(isExpanded ? null : insight.id)}
                            className="cursor-pointer space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-[#8fa2bd]">
                              <span className="text-[#0194a8]">CONCEPT FLASHCARD</span>
                              <span>{formatDate(insight.created_at)}</span>
                            </div>
                            <p className="text-xs font-serif text-[#e8e0cf] line-clamp-2 leading-relaxed">
                              {insight.question_text}
                            </p>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden pt-3 mt-3 border-t border-[rgba(19,108,153,0.3)]"
                              >
                                <div className="prose prose-invert prose-p:text-xs max-w-none text-[#9fb0c8] font-sans text-xs leading-relaxed">
                                  <Markdown rehypePlugins={[rehypeSanitize]}>{insight.insight_text}</Markdown>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[rgba(19,108,153,0.25)] text-xs font-mono">
                            <button
                              onClick={() => setExpandedInsightId(isExpanded ? null : insight.id)}
                              className="text-[#0194a8] hover:text-[#e0d0ab] flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                            >
                              <span>{isExpanded ? 'Collapse' : 'Read Full Insight'}</span>
                              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                            <button
                              onClick={() => deleteBookmark(insight.id)}
                              disabled={isDeleting}
                              className="text-[#8fa2bd] hover:text-[#e14e4e] transition-colors p-1 cursor-pointer"
                              title="Delete bookmark"
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

            {/* Articles View */}
            {viewMode === 'articles' && (
              <div>
                {loadingArticles ? (
                  <div className="py-12 flex items-center justify-center text-[#8fa2bd] font-mono text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0194a8] mr-2" />
                    <span>Retrieving saved dispatches...</span>
                  </div>
                ) : savedArticles.length === 0 ? (
                  <EmptyState
                    icon={Bookmark}
                    title="No Dispatches Saved"
                    description="Save official cabinet decisions and PIB releases from The Daily Brief."
                  />
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {savedArticles.map((saved) => {
                      const article = saved.current_affairs;
                      const isRemoving = removingArticleId === saved.id;

                      return (
                        <div
                          key={saved.id}
                          className="bg-[rgba(11,61,120,0.2)] border border-[rgba(19,108,153,0.35)] hover:border-[#0194a8]/60 rounded-xs p-3.5 transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap text-[9.5px] font-mono">
                              <span className="px-1.5 py-0.2 rounded-xs bg-[rgba(224,208,171,0.12)] border border-[rgba(224,208,171,0.35)] text-[#e0d0ab]">
                                {article.ministry}
                              </span>
                              <span className="text-[#8fa2bd]">{article.source}</span>
                            </div>
                            <h4 className="font-serif text-xs font-bold text-[#e8e0cf] leading-snug line-clamp-2">
                              {article.headline}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[rgba(19,108,153,0.25)] text-xs font-mono">
                            {article.url ? (
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0194a8] hover:text-[#e0d0ab] flex items-center gap-1 cursor-pointer text-[11px]"
                              >
                                <span>Gov Source</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : <span />}

                            <button
                              onClick={() => removeSavedArticle(saved.id)}
                              disabled={isRemoving}
                              className="text-[#8fa2bd] hover:text-[#e14e4e] transition-colors p-1 cursor-pointer"
                              title="Remove dispatch"
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
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. HISTORICAL ASSESSMENT LEDGER (COMPACT TABULAR VIEW)
          ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-[rgba(4,25,54,0.65)] backdrop-blur-md border border-[rgba(19,108,153,0.4)] rounded-xs p-5 shadow-md space-y-4">
        
        {/* Table Title Bar */}
        <div className="flex items-center justify-between border-b border-[rgba(19,108,153,0.3)] pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#e0d0ab]" />
            <h3 className="font-serif text-xs uppercase tracking-wider font-bold text-[#e0d0ab]">
              Historical Assessment Ledger
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-[rgba(11,61,120,0.4)] border border-[rgba(19,108,153,0.4)] text-[#8fa2bd]">
              {history.length} attempts
            </span>
          </div>

          <button
            onClick={handleExportClick}
            disabled={history.length === 0 || loadingTier}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-xs border transition-all cursor-pointer ${
              isPro
                ? 'bg-[rgba(52,211,153,0.12)] border-[rgba(52,211,153,0.4)] text-[#34d399] hover:bg-[#34d399] hover:text-[#041d40]'
                : 'bg-[rgba(11,61,120,0.3)] border-[rgba(19,108,153,0.4)] text-[#8fa2bd] hover:text-[#e8e0cf]'
            }`}
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>{isPro ? 'Export CSV' : 'Export CSV (Pro)'}</span>
          </button>
        </div>

        {/* Table Body */}
        {loading ? (
          <SkeletonCard variant="feed" count={3} />
        ) : errorMsg ? (
          <p className="text-xs text-[#e14e4e] font-mono py-4 text-center">{errorMsg}</p>
        ) : history.length === 0 ? (
          <EmptyState
            icon={History}
            title="No Prior Assessments Recorded"
            description="Take your first timed mock exam in the Test Arena to log your baseline."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="border-b border-[rgba(19,108,153,0.3)] text-[#8fa2bd] text-[10px] font-mono uppercase tracking-wider">
                  <th className="py-2.5 px-3">Session</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Distribution</th>
                  <th className="py-2.5 px-3 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(19,108,153,0.2)] text-xs">
                {history.map((attempt, index) => {
                  const totalCount = attempt.correct_count + attempt.incorrect_count + attempt.unattempted_count;
                  const maxPossible = totalCount > 0 ? totalCount : 25;
                  const ratio = Math.round((attempt.correct_count / maxPossible) * 100);
                  const isExcellent = ratio >= 70;
                  const isPass = ratio >= 40;

                  const correctPct = Math.round((attempt.correct_count / maxPossible) * 100);
                  const incorrectPct = Math.round((attempt.incorrect_count / maxPossible) * 100);
                  const unattemptedPct = 100 - correctPct - incorrectPct;

                  return (
                    <tr
                      key={attempt.id || index}
                      className="hover:bg-[rgba(11,61,120,0.25)] text-[#e8e0cf] transition-colors"
                    >
                      <td className="py-3 px-3 font-mono text-[#0194a8] text-[11px]">
                        AT-{attempt.id ? attempt.id.substring(0, 8).toUpperCase() : `LOG${history.length - index}`}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#8fa2bd] text-[11px]">
                        {formatDate(attempt.created_at)}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#8fa2bd] text-[11px]">
                        <span className="px-1.5 py-0.5 rounded-xs bg-[rgba(3,16,38,0.6)] border border-[rgba(19,108,153,0.3)]">
                          {attempt.subject_stats ? 'Ranked Arena' : 'Training Ground'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="w-24 h-1.5 rounded-full overflow-hidden flex bg-[rgba(3,16,38,0.8)] border border-[rgba(19,108,153,0.25)]" title={`Correct: ${attempt.correct_count}, Incorrect: ${attempt.incorrect_count}, Skipped: ${attempt.unattempted_count}`}>
                          <div style={{ width: `${correctPct}%` }} className="bg-[#34d399]" />
                          <div style={{ width: `${incorrectPct}%` }} className="bg-[#e14e4e]" />
                          <div style={{ width: `${unattemptedPct}%` }} className="bg-[#8fa2bd]" />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs font-mono font-bold text-[10px] uppercase ${
                            isExcellent
                              ? 'bg-[rgba(52,211,153,0.12)] text-[#34d399] border border-[rgba(52,211,153,0.35)]'
                              : isPass
                              ? 'bg-[rgba(1,148,168,0.15)] text-[#0194a8] border border-[rgba(1,148,168,0.35)]'
                              : 'bg-[rgba(225,78,78,0.12)] text-[#e14e4e] border border-[rgba(225,78,78,0.35)]'
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

      {/* Export Toast Notification */}
      <AnimatePresence>
        {exportToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-5 py-2.5 bg-[#041d40] border border-[#0194a8] rounded-xs shadow-2xl flex items-center gap-2 text-xs font-mono text-[#e0d0ab]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e0d0ab]" />
            <span>{exportToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}