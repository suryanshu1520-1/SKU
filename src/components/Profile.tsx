import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import type { QuizSession, SavedInsight } from '../types';
import Markdown from 'react-markdown';
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
  Calendar,
  Award,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  BookOpen,
  Pencil,
  Check,
  X,
  Download,
  Crown,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';
import InfoTooltip from './InfoTooltip';

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

  // Membership tier for export gating
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

  // View mode toggle: insights vs articles
  const [viewMode, setViewMode] = useState<'insights' | 'articles'>('insights');

  // Saved articles state (Policy Tracker bookmarks)
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [removingArticleId, setRemovingArticleId] = useState<string | null>(null);

  // Fetch membership tier and is_public status on mount
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
        console.warn("Failed to fetch profile data:", err);
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
      console.warn("Failed to update profile visibility:", err);
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

  useEffect(() => {
    async function fetchQuizHistory() {
      const identifier = userId || userEmail;
      if (!identifier) return;
      setLoading(true);
      setErrorMsg('');

      try {
        let queryVal = identifier;
        
        // If identifier is an email but we also have a valid session with a UUID, let's query with the UUID!
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && queryVal === userEmail) {
          queryVal = session.user.id;
        }

        // Query from quiz_sessions instead of arena_sessions (fixes Requirement D)
        const { data, error } = await supabase
          .from('quiz_sessions')
          .select('*')
          .eq('user_id', queryVal);

        if (error) {
          // Fallback with the other identifier
          const fallbackVal = queryVal === session?.user?.id ? userEmail : session?.user?.id;
          if (fallbackVal) {
            const { data: fbData, error: fbError } = await supabase
              .from('quiz_sessions')
              .select('*')
              .eq('user_id', fallbackVal);
            
            if (!fbError && fbData) {
              const sorted = [...fbData].sort((a, b) => {
                const dateA = new Date(a.created_at || 0).getTime();
                const dateB = new Date(b.created_at || 0).getTime();
                return dateB - dateA;
              });
              setHistory(sorted as QuizSession[]);
              return;
            }
          }
          throw error;
        }

        if (data) {
          // Sort descending by date
          const sorted = [...data].sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
          });
          setHistory(sorted as QuizSession[]);
        }
      } catch (err: any) {
        console.error("Error loading quiz history:", err);
        setErrorMsg("Failed to synchronize with your attempt record hierarchy.");
      } finally {
        setLoading(false);
      }
    }

    fetchQuizHistory();
  }, [userEmail, userId]);

  // Fetch saved insights (Requirement A - Bookmark Engine)
  useEffect(() => {
    if (!userId) return;
    setLoadingSaved(true);
    fetch(`/api/bookmark?userId=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.bookmarks) {
          setSavedInsights(data.bookmarks);
        }
      })
      .catch(err => console.warn("Failed to fetch saved insights:", err))
      .finally(() => setLoadingSaved(false));
  }, [userId]);

  // Fetch saved articles when viewMode changes to 'articles'
  useEffect(() => {
    if (!userId || viewMode !== 'articles') return;
    (async () => {
      setLoadingArticles(true);
      try {
        const { data, error } = await supabase
          .from('saved_articles')
          .select(`
            id,
            article_id,
            created_at,
            current_affairs!inner (
              id,
              headline,
              url,
              source,
              ministry,
              created_at
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn("Failed to fetch saved articles:", error);
          return;
        }

        if (data) {
          setSavedArticles(data as unknown as SavedArticle[]);
        }
      } catch (err) {
        console.warn("Error fetching saved articles:", err);
      } finally {
        setLoadingArticles(false);
      }
    })();
  }, [userId, viewMode]);

  // Derived stats
  const totalAttempts = history.length;
  const lastAttempt = history[0] || null;
  const averageCorrect = totalAttempts > 0 
    ? (history.reduce((sum, item) => sum + (item.correct_count || 0), 0) / totalAttempts).toFixed(1)
    : '0.0';

  const bestScore = totalAttempts > 0
    ? Math.max(...history.map(item => item.correct_count || 0))
    : 0;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Recent';
    }
  };

  // Delete bookmark handler (for insights)
  const deleteBookmark = async (insightId: string) => {
    setDeletingInsightId(insightId);
    try {
      // Find the insight to get its question_id
      const insight = savedInsights.find(s => s.id === insightId);
      if (!insight) return;

      const res = await fetch('/api/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          questionId: insight.question_id,
          action: 'delete',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedInsights(prev => prev.filter(s => s.id !== insightId));
        if (expandedInsightId === insightId) {
          setExpandedInsightId(null);
        }
      }
    } catch (err) {
      console.error("Delete bookmark error:", err);
    } finally {
      setDeletingInsightId(null);
    }
  };

  // Remove saved article
  const removeSavedArticle = async (savedArticleId: string) => {
    setRemovingArticleId(savedArticleId);
    try {
      const { error } = await supabase
        .from('saved_articles')
        .delete()
        .eq('id', savedArticleId)
        .eq('user_id', userId);

      if (error) throw error;

      setSavedArticles(prev => prev.filter(a => a.id !== savedArticleId));
    } catch (err) {
      console.error("Failed to remove saved article:", err);
    } finally {
      setRemovingArticleId(null);
    }
  };

  // Toggle expand insight card
  const toggleExpand = (id: string) => {
    setExpandedInsightId(prev => prev === id ? null : id);
  };

  // CSV Export utility
  const exportToCSV = () => {
    if (!history || history.length === 0) return;
    const headers = "Date,Correct,Incorrect,Unattempted,Total Time (s),Percentile\n";
    const rows = history.map(s => {
      const date = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : 'N/A';
      return `${date},${s.correct_count},${s.incorrect_count},${s.unattempted_count},${s.total_time_seconds},${s.percentile}`;
    }).join("\n");
    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tark_Diagnostic_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportClick = () => {
    if (membershipTier === 'premium') {
      exportToCSV();
    } else {
      setExportToast('Upgrade to Founders Club to export diagnostic data.');
    }
  };

  return (
    <div className="min-h-[85vh] bg-zinc-950 text-stone-100 p-4 md:p-8 max-w-6xl mx-auto flex flex-col gap-8 font-sans animate-fade-in">
      
      {/* Upper Grid: Profile info, Last Quiz, Averages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div id="profile-info-card" className="bg-zinc-900/30 border border-zinc-800 p-6 flex flex-col justify-between rounded-sm">
          <div>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
              <div className="p-2.5 bg-zinc-800 rounded-sm">
                <User className="w-5 h-5 text-[#e0d0ab]" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-xs uppercase tracking-widest text-zinc-400">Account Identity</h3>
                <p className="text-stone-300 text-[10px] font-mono leading-none mt-0.5">AUTHENTICATED</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="block text-[9px] uppercase tracking-widest text-[#e0d0ab]/70 font-bold mb-1">CANDIDATE NAME</span>
                  {!editingName && (
                    <button
                      onClick={() => {
                        setEditNameValue(localUserName);
                        setEditingName(true);
                        setNameError('');
                        setTimeout(() => nameInputRef.current?.focus(), 50);
                      }}
                      className="p-1 text-zinc-600 hover:text-[#e0d0ab] transition-colors"
                      title="Edit display name"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Escape') {
                          setEditingName(false);
                          setNameError('');
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!editNameValue.trim()) {
                            setNameError('Name cannot be empty');
                            return;
                          }
                          setSavingName(true);
                          setNameError('');
                          try {
                            const { error } = await supabase.auth.updateUser({ data: { name: editNameValue.trim() } });
                            if (error) throw error;
                            setLocalUserName(editNameValue.trim());
                            setEditingName(false);
                          } catch (err: any) {
                            setNameError(err.message || 'Failed to update name');
                          } finally {
                            setSavingName(false);
                          }
                        }
                      }}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-sm px-3 py-1.5 text-sm text-stone-50 font-bold focus:outline-none focus:ring-1 focus:ring-[#e0d0ab]/50"
                    />
                    <button
                      onClick={async () => {
                        if (!editNameValue.trim()) {
                          setNameError('Name cannot be empty');
                          return;
                        }
                        setSavingName(true);
                        setNameError('');
                        try {
                          const { error } = await supabase.auth.updateUser({ data: { name: editNameValue.trim() } });
                          if (error) throw error;
                          setLocalUserName(editNameValue.trim());
                          setEditingName(false);
                        } catch (err: any) {
                          setNameError(err.message || 'Failed to update name');
                        } finally {
                          setSavingName(false);
                        }
                      }}
                      disabled={savingName}
                      className="p-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
                      title="Save"
                    >
                      {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingName(false);
                        setNameError('');
                      }}
                      disabled={savingName}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors disabled:opacity-40"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xl font-bold text-stone-50 tracking-tight">{localUserName || "Anonymous Professional"}</p>
                )}
                {nameError && (
                  <p className="text-[10px] text-rose-400 mt-1">{nameError}</p>
                )}
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-widest text-zinc-500 font-medium mb-1">EMAIL ADDRESS</span>
                <p className="text-sm text-zinc-300 font-mono select-all truncate">{userEmail}</p>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-widest text-zinc-500 font-medium mb-1">MEMBERSHIP</span>
                {loadingTier ? (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 text-zinc-500 rounded-sm text-[10px] uppercase font-bold tracking-widest border border-zinc-800/40">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading...
                  </div>
                ) : membershipTier === 'premium' ? (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 text-cyan-400 font-semibold rounded-sm text-[10px] uppercase tracking-widest border border-cyan-500/30 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse">
                    <Crown className="w-3.5 h-3.5" />
                    Premium Member
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#e0d0ab]/10 text-[#e0d0ab] rounded-sm text-[10px] uppercase font-bold tracking-widest border border-[#e0d0ab]/20">
                    <Award className="w-3.5 h-3.5" />
                    Standard Candidate
                  </div>
                )}
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-widest text-zinc-500 font-medium mb-1">PROFILE VISIBILITY</span>
                <button
                  onClick={handleToggleVisibility}
                  disabled={savingVisibility}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider border transition-all ${
                    isPublic
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-zinc-900/50 text-zinc-500 border-zinc-800/60 hover:border-zinc-700/60'
                  } disabled:opacity-40 cursor-pointer`}
                >
                  <span className="flex items-center gap-2">
                    {savingVisibility ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isPublic ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                    {isPublic ? 'Make Profile Private' : 'Make Profile Public'}
                  </span>
                  <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-sm ${
                    isPublic
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {isPublic ? 'PUBLIC' : 'PRIVATE'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="mt-8 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-stone-200 hover:border-zinc-700 transition-all rounded-sm text-xs font-semibold uppercase tracking-wider"
            id="logout-button"
          >
            <LogOut className="w-4 h-4" />
            Terminate Session
          </button>
        </div>

        {/* Last Quiz Score Panel */}
        <div id="last-quiz-score-card" className="bg-zinc-900/30 border border-zinc-800 p-6 flex flex-col justify-between rounded-sm">
          <div>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
              <div className="p-2.5 bg-zinc-800 rounded-sm">
                <Clock className="w-5 h-5 text-[#e0d0ab]" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-xs uppercase tracking-widest text-zinc-400">Tactical Baseline</h3>
                <p className="text-stone-300 text-[10px] font-mono leading-none mt-0.5">LAST ATTEMPT</p>
              </div>
            </div>

            {lastAttempt ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900/50 border border-zinc-800/60 p-3 rounded-sm">
                    <span className="block text-[9px] uppercase tracking-widest text-zinc-500 mb-1">CORRECT</span>
                    <p className="text-3xl font-mono font-bold text-emerald-400">{lastAttempt.correct_count}</p>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800/60 p-3 rounded-sm">
                    <span className="block text-[9px] uppercase tracking-widest text-zinc-500 mb-1">INCORRECT</span>
                    <p className="text-3xl font-mono font-bold text-rose-400">{lastAttempt.incorrect_count}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/40 border border-zinc-800/80 rounded-sm">
                  <span className="text-xs text-zinc-400">Unanswered</span>
                  <span className="text-sm font-mono font-bold text-zinc-300">{lastAttempt.unattempted_count}</span>
                </div>
                
                <p className="text-[10px] font-mono text-zinc-500 text-right">
                  Recorded: {formatDate(lastAttempt.created_at)}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-500">
                <AlertCircle className="w-8 h-8 opacity-40 mb-3" />
                <p className="text-xs">No attempts registered for this account.</p>
                <p className="text-[10px] uppercase tracking-wider text-[#e0d0ab] mt-2 font-semibold">Ready to begin initial assessment.</p>
              </div>
            )}
          </div>
        </div>

        {/* Global Averages Panel */}
        <div id="average-stats-card" className="bg-zinc-900/30 border border-zinc-800 p-6 flex flex-col justify-between rounded-sm">
          <div>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
              <div className="p-2.5 bg-zinc-800 rounded-sm">
                <TrendingUp className="w-5 h-5 text-[#e0d0ab]" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-xs uppercase tracking-widest text-zinc-400">Performance Summary</h3>
                <p className="text-stone-300 text-[10px] font-mono leading-none mt-0.5">AGGREGATED ANALYTICS</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-zinc-800/40">
                <span className="text-xs text-zinc-400">Total Attempts</span>
                <span className="text-sm font-mono font-bold text-stone-100">{totalAttempts}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-800/40">
                <span className="text-xs text-zinc-400 inline-flex items-center gap-1.5">
                  Mean Score
                  <InfoTooltip text="Earn 25 CP per Vanguard Assessment by breaching the 80% accuracy threshold." />
                </span>
                <span className="text-sm font-mono font-bold text-emerald-400">{averageCorrect} <span className="text-[10px] text-zinc-500">/ 25</span></span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-800/40">
                <span className="text-xs text-zinc-400">Best Score</span>
                <span className="text-sm font-mono font-bold text-[#e0d0ab]">{bestScore} <span className="text-[10px] text-zinc-500">/ 25</span></span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-sm text-[10px] leading-relaxed text-zinc-500">
            Analytics aggregated from real-time database transactions.
          </div>
        </div>
      </div>

      {/* Saved Information Section - moved ABOVE Previous Attempts */}
      <div id="saved-information-section" className="bg-zinc-900/10 border border-zinc-800 p-6 rounded-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4.5 h-4.5 text-[#e0d0ab]" />
            <h3 className="font-sans font-bold text-xs uppercase tracking-widest text-zinc-400">Saved Information</h3>
            {viewMode === 'insights' && savedInsights.length > 0 && (
              <span className="text-[10px] font-mono text-zinc-500 ml-2">
                ({savedInsights.length})
              </span>
            )}
            {viewMode === 'articles' && savedArticles.length > 0 && (
              <span className="text-[10px] font-mono text-zinc-500 ml-2">
                ({savedArticles.length})
              </span>
            )}
          </div>
        </div>

        {/* View Mode Toggle - Animated Pill */}
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex bg-zinc-900/60 border border-zinc-800 rounded-full p-0.5">
            <div
              className={`absolute top-0.5 bottom-0.5 w-1/2 bg-[#e0d0ab] rounded-full transition-transform duration-300 ease-in-out ${
                viewMode === 'articles' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
            <button
              onClick={() => setViewMode('insights')}
              className="relative z-10 px-4 py-1.5 text-[10px] font-sans font-bold uppercase tracking-widest rounded-full transition-colors duration-200 cursor-pointer"
              style={{
                color: viewMode === 'insights' ? '#072e63' : '#a1a1aa'
              }}
            >
              Saved Insights
            </button>
            <button
              onClick={() => setViewMode('articles')}
              className="relative z-10 px-4 py-1.5 text-[10px] font-sans font-bold uppercase tracking-widest rounded-full transition-colors duration-200 cursor-pointer"
              style={{
                color: viewMode === 'articles' ? '#072e63' : '#a1a1aa'
              }}
            >
              Saved Articles
            </button>
          </div>
        </div>

        {/* Saved Insights View */}
        {viewMode === 'insights' && (
          <>
            {loadingSaved ? (
              <div className="py-12 flex items-center justify-center text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="animate-pulse text-xs font-mono">LOADING SAVED INSIGHTS...</span>
              </div>
            ) : savedInsights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-600">
                <BookOpen className="w-10 h-10 opacity-30 mb-3" />
                <p className="text-xs">No insights bookmarked yet.</p>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-tighter">
                  Complete quiz questions and use the bookmark button to save AI-driven conceptual insights.
                </p>
              </div>
            ) : (
              <div className={`grid grid-cols-1 ${expandedInsightId ? '' : 'md:grid-cols-2'} gap-4`}>
                {savedInsights.map((insight) => {
                  const isExpanded = expandedInsightId === insight.id;
                  const isDeleting = deletingInsightId === insight.id;

                  return (
                    <motion.div
                      key={insight.id}
                      layout
                      className="bg-zinc-900/40 border border-zinc-800/70 rounded-sm overflow-hidden transition-all hover:border-zinc-700/80"
                    >
                      {/* Card Header - Always visible */}
                      <div
                        onClick={() => toggleExpand(insight.id)}
                        className="p-4 cursor-pointer flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-sans text-stone-200 leading-relaxed h-auto">
                            {insight.question_text}
                          </p>
                          <p className="text-[9px] font-mono text-zinc-500 mt-2">
                            Saved: {formatDate(insight.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBookmark(insight.id);
                            }}
                            disabled={isDeleting}
                            className="p-1.5 rounded-sm text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-30"
                            title="Remove bookmark"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(insight.id);
                            }}
                            className="p-1.5 rounded-sm text-zinc-500 hover:text-[#e0d0ab] hover:bg-[#e0d0ab]/5 transition-all"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Flashcard Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-0 border-t border-zinc-800/50">
                              <div className="mt-3 p-4 bg-zinc-900/60 border border-zinc-800/60 rounded-sm">
                                <h4 className="font-sans font-bold text-[9px] uppercase tracking-widest text-[#e0d0ab]/70 mb-3">
                                  CONCEPTUAL INSIGHT - FLASHCARD
                                </h4>
                                <div className="prose prose-invert prose-p:text-sm prose-li:text-sm prose-p:leading-relaxed prose-li:leading-relaxed max-w-none text-stone-300 font-serif">
                                  <Markdown>{insight.insight_text}</Markdown>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Saved Articles View */}
        {viewMode === 'articles' && (
          <>
            {loadingArticles ? (
              <div className="py-12 flex items-center justify-center text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="animate-pulse text-xs font-mono">LOADING SAVED ARTICLES...</span>
              </div>
            ) : savedArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-600">
                <BookOpen className="w-10 h-10 opacity-30 mb-3" />
                <p className="text-xs">No articles bookmarked yet.</p>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-tighter">
                  Browse the Policy Tracker feed and bookmark articles to build your dossier.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedArticles.map((saved) => {
                  const article = saved.current_affairs;
                  const isRemoving = removingArticleId === saved.id;

                  return (
                    <div
                      key={saved.id}
                      className="flex items-center justify-between gap-4 p-4 bg-zinc-900/30 border border-zinc-800/60 rounded-sm hover:bg-zinc-900/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="px-1.5 py-0.5 text-[8px] uppercase tracking-wider font-sans font-semibold bg-zinc-900 text-[#e0d0ab] rounded-sm border border-zinc-800">
                            {article.ministry}
                          </span>
                          <span className="text-[8px] font-mono text-zinc-500">
                            {article.source}
                          </span>
                        </div>
                        <p className="text-xs font-sans font-semibold text-stone-200 truncate">
                          {article.headline}
                        </p>
                        <p className="text-[9px] font-mono text-zinc-500 mt-1">
                          Saved: {formatDate(saved.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {article.url && (
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-zinc-500 hover:text-[#e0d0ab] hover:bg-[#e0d0ab]/5 transition-all rounded-sm"
                            title="Open original article"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => removeSavedArticle(saved.id)}
                          disabled={isRemoving}
                          className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all rounded-sm disabled:opacity-30 cursor-pointer"
                          title="Remove bookmark"
                        >
                          {isRemoving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Lower Section: Previous Attempts */}
      <div id="quiz-history-section" className="bg-zinc-900/10 border border-zinc-800 p-6 rounded-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <History className="w-4.5 h-4.5 text-[#e0d0ab]" />
            <h3 className="font-sans font-bold text-xs uppercase tracking-widest text-zinc-400">Previous Attempts</h3>
          </div>
          {/* CSV Export Button */}
          <button
            onClick={handleExportClick}
            disabled={history.length === 0 || loadingTier}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest rounded-sm border transition-all ${
              membershipTier === 'premium'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer'
                : 'bg-zinc-900/30 text-zinc-600 border-zinc-800/40 opacity-50 cursor-not-allowed'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={membershipTier === 'premium' ? 'Export CSV' : 'Upgrade to Founders Club to export'}
          >
            <Download className="w-3 h-3" />
            {membershipTier === 'premium' ? 'Export CSV' : 'Export Locked'}
            {membershipTier === 'premium' && <Crown className="w-3 h-3 text-emerald-400" />}
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-zinc-500">
            <span className="animate-pulse text-xs font-mono">LOADING ATTEMPTS...</span>
          </div>
        ) : errorMsg ? (
          <div className="py-8 text-center text-rose-400 text-xs font-sans">
            {errorMsg}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-600">
            <Inbox className="w-10 h-10 opacity-30 mb-3" />
            <p className="text-xs">No prior attempts recorded for this account.</p>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-tighter">Enter the Test Arena to register your first record.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 text-[9px] uppercase tracking-widest font-bold">
                  <th className="py-3 px-4 sticky top-0 bg-zinc-950">ATTEMPT ID</th>
                  <th className="py-3 px-4 sticky top-0 bg-zinc-950">DATE</th>
                  <th className="py-3 px-4 sticky top-0 bg-zinc-950">SCORE</th>
                  <th className="py-3 px-4 sticky top-0 bg-zinc-950">ACCURACY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-xs">
                {history.map((attempt, index) => {
                  const totalCount = (attempt.correct_count || 0) + (attempt.incorrect_count || 0) + (attempt.unattempted_count || 0);
                  const maxPossible = totalCount > 0 ? totalCount : 25;
                  const ratio = ((attempt.correct_count / maxPossible) * 100).toFixed(0);
                  const isExcellent = Number(ratio) >= 70;
                  const isPass = Number(ratio) >= 40;

                  return (
                    <tr key={attempt.id || index} className="hover:bg-zinc-900/30 text-stone-300 transition-colors">
                      <td className="py-4 px-4 font-mono text-zinc-500 text-[10px]/none uppercase">
                        AT-{attempt.id ? attempt.id.substring(0, 8) : `LOG${history.length - index}`}
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-zinc-400">
                        {formatDate(attempt.created_at)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-stone-100 font-bold">{attempt.correct_count}</span>
                          <span className="text-zinc-600 font-mono">/</span>
                          <span className="text-zinc-500 font-mono text-[10px]">{maxPossible}</span>
                          <span className="text-[10px] text-zinc-500 font-mono ml-1">({ratio}%)</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm ${
                          isExcellent
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isPass
                              ? 'bg-amber-500/10 text-[#e0d0ab] border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {isExcellent ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : isPass ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {isExcellent ? 'ADVANCED' : isPass ? 'ADEQUATE' : 'MARGINAL'}
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
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 bg-zinc-900 border border-zinc-700/60 rounded-sm shadow-2xl"
          >
            <p className="text-xs text-stone-200 font-sans whitespace-nowrap">
              {exportToast}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}