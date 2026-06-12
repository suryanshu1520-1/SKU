import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Filter, RotateCcw, BookOpen, Inbox, RefreshCw, CheckCircle2, AlertCircle, Calendar, Bookmark } from 'lucide-react';

interface CurrentAffairsItem {
  id?: string;
  source: string;
  ministry: string;
  headline: string;
  url: string;
  summary: {
    bullets: string[];
  };
  created_at?: string;
}

interface CurrentAffairsProps {
  userId: string;
}

export default function CurrentAffairs({ userId }: CurrentAffairsProps) {
  const [items, setItems] = useState<CurrentAffairsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [syncCooldown, setSyncCooldown] = useState(0);

  // Bookmark state
  const [savedArticleIds, setSavedArticleIds] = useState<Set<string>>(new Set());
  const [savingArticleIds, setSavingArticleIds] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState('');

  // Filtering States
  const [selectedMinistry, setSelectedMinistry] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateError, setDateError] = useState('');

  // Available filter options gathered from data
  const [ministries, setMinistries] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);

  // Background sync processing toast state
  const [showBackgroundToast, setShowBackgroundToast] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 4000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Auto-dismiss background sync toast
  useEffect(() => {
    if (!showBackgroundToast) return;
    const t = setTimeout(() => setShowBackgroundToast(false), 5000);
    return () => clearTimeout(t);
  }, [showBackgroundToast]);

  // Cooldown countdown interval
  useEffect(() => {
    if (syncCooldown <= 0) return;
    const interval = setInterval(() => {
      setSyncCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [syncCooldown]);

  // Fetch saved article IDs on mount
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('saved_articles')
          .select('article_id')
          .eq('user_id', userId);

        if (error) {
          console.warn("Failed to fetch saved articles:", error);
          return;
        }

        if (data) {
          setSavedArticleIds(new Set(data.map(row => row.article_id)));
        }
      } catch (err) {
        console.warn("Error fetching saved article IDs:", err);
      }
    })();
  }, [userId]);

  // Distinct fetch helper - conditionally applies date filters to the Supabase query
  const fetchPolicyData = async (showSkeleton = true, filterStartDate?: string, filterEndDate?: string) => {
    if (showSkeleton) setLoading(true);
    setErrorMsg('');
    try {
      let query = supabase
        .from('current_affairs')
        .select('*');

      // Apply server-side date filtering when dates are set
      if (filterStartDate) {
        query = query.gte('created_at', filterStartDate);
      }
      if (filterEndDate) {
        // Add one day so the end date is inclusive through midnight
        const endInclusive = new Date(filterEndDate);
        endInclusive.setDate(endInclusive.getDate() + 1);
        query = query.lt('created_at', endInclusive.toISOString().split('T')[0]);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setItems(data);

        // Extract unique ministries and sources for the filters
        const uniqueMinistries = Array.from(new Set(data.map((item: any) => item.ministry).filter(Boolean))) as string[];
        const uniqueSources = Array.from(new Set(data.map((item: any) => item.source).filter(Boolean))) as string[];

        setMinistries(uniqueMinistries.sort());
        setSources(uniqueSources.sort());
      }
    } catch (err: any) {
      console.error("Error fetching current affairs:", err);
      setErrorMsg(err.message || "Failed to load policy tracking feed.");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when date filters change
  useEffect(() => {
    fetchPolicyData(true, startDate || undefined, endDate || undefined);
  }, [startDate, endDate]);

  // Sync action trigger calling the cooldown-aware endpoint
  const handleSyncFeed = async () => {
    if (syncCooldown > 0 || syncing) return;
    setSyncing(true);
    setSyncSuccess(null);
    setErrorMsg('');
    try {
      const response = await fetch('/api/sync-feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();

      if (response.status === 429) {
        // Cooldown active
        const remaining = data.remaining || 300;
        setSyncCooldown(remaining);
        setErrorMsg(data.message || `Sync cooldown active. Please wait.`);
        return;
      }

      if (response.status === 202) {
        // Background ingestion dispatched -- do not block with spinner
        setShowBackgroundToast(true);
        setSyncSuccess(true);
        // Reload data after a short delay so ingested items appear
        setTimeout(() => fetchPolicyData(false), 10000);
        setTimeout(() => setSyncSuccess(null), 5000);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Server encountered an error while executing news extraction.');
      }

      setSyncSuccess(true);

      // Reload details bypassing heavy spinner
      await fetchPolicyData(false);

      setTimeout(() => {
        setSyncSuccess(null);
      }, 5000);

    } catch (err: any) {
      console.error("Manual policy sync exception:", err);
      setErrorMsg(err.message || "Could not reach news scraper service. Check connection.");
    } finally {
      setSyncing(false);
    }
  };

  // Bookmark toggle with optimistic UI
  const toggleBookmark = async (articleId: string) => {
    if (!articleId) return;

    const isSaved = savedArticleIds.has(articleId);

    // Resolve the actual auth UUID to ensure RLS compatibility
    let resolvedUserId = userId;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        resolvedUserId = session.user.id;
      }
    } catch {
      // Fall back to prop userId
    }

    // Optimistic toggle
    setSavedArticleIds(prev => {
      const next = new Set(prev);
      if (isSaved) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });

    setSavingArticleIds(prev => {
      const next = new Set(prev);
      next.add(articleId);
      return next;
    });

    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_articles')
          .delete()
          .eq('user_id', resolvedUserId)
          .eq('article_id', articleId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_articles')
          .insert({ user_id: resolvedUserId, article_id: articleId });

        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }

        // First-time save onboarding toast
        if (!localStorage.getItem('tark_first_save_seen')) {
          localStorage.setItem('tark_first_save_seen', 'true');
          setToastMsg('Saved! You can view your saved insights and articles in your Profile section.');
        }
      }
    } catch (err) {
      console.error("Bookmark toggle error:", err);
      // Revert optimistic update on error
      setSavedArticleIds(prev => {
        const next = new Set(prev);
        if (isSaved) {
          next.add(articleId);
        } else {
          next.delete(articleId);
        }
        return next;
      });
    } finally {
      setSavingArticleIds(prev => {
        const next = new Set(prev);
        next.delete(articleId);
        return next;
      });
    }
  };

  // Client-side ministry & source filters only -- date filtering is now server-side
  const filteredItems = items.filter(item => {
    const matchMinistry = selectedMinistry === 'ALL' || item.ministry === selectedMinistry;
    const matchSource = selectedSource === 'ALL' || item.source === selectedSource;
    return matchMinistry && matchSource;
  });

  const resetFilters = () => {
    setSelectedMinistry('ALL');
    setSelectedSource('ALL');
    setStartDate('');
    setEndDate('');
    setDateError('');
  };

  const formatCooldown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-stone-150 p-4 md:p-8 flex flex-col md:flex-row gap-6">

      {/* Sidebar Filters */}
      <div className="w-full md:w-64 shrink-0 bg-zinc-900/10 border border-zinc-900 p-6 self-start rounded-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <h3 className="font-sans font-semibold text-xs uppercase tracking-widest text-[#e0d0ab]">Filters</h3>
          </div>
          {(selectedMinistry !== 'ALL' || selectedSource !== 'ALL') && (
            <button
              onClick={resetFilters}
              className="text-[#e0d0ab] hover:text-white transition-colors flex items-center gap-1 text-[10px] uppercase font-mono tracking-wider cursor-pointer"
              id="reset-filters"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Ministry Filter */}
        <div className="mb-6">
          <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-2.5">
            Government Ministries
          </label>
          <div className="space-y-1 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
            <button
              onClick={() => setSelectedMinistry('ALL')}
              className={`w-full text-left px-2.5 py-2 text-xs font-sans transition-colors rounded-sm flex items-center justify-between cursor-pointer ${
                selectedMinistry === 'ALL'
                  ? 'bg-zinc-900 text-stone-150 font-medium border border-zinc-800'
                  : 'text-zinc-550 hover:text-stone-300 hover:bg-zinc-900/40'
              }`}
            >
              <span className="truncate">All Departments</span>
              <span className="text-[10px] opacity-60">({items.length})</span>
            </button>
            {ministries.map(min => {
              const count = items.filter(i => i.ministry === min).length;
              return (
                <button
                  key={min}
                  onClick={() => setSelectedMinistry(min)}
                  className={`w-full text-left px-2.5 py-2 text-xs font-sans transition-colors rounded-sm flex items-center justify-between cursor-pointer ${
                    selectedMinistry === min
                      ? 'bg-zinc-900 text-stone-150 font-medium border border-[#e0d0ab]/30'
                      : 'text-zinc-550 hover:text-stone-300 hover:bg-zinc-900/40'
                  }`}
                >
                  <span className="truncate" title={min}>{min}</span>
                  <span className="text-[10px] opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6">
          <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-2.5">
            <Calendar className="w-3 h-3 inline mr-1.5" />
            Date Range
          </label>
          <div className="space-y-2">
            <div>
              <span className="block text-[8px] font-mono text-zinc-600 uppercase tracking-wider mb-1">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] font-sans bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#e0d0ab]/50 focus:border-[#e0d0ab]/50 [color-scheme:dark]"
              />
            </div>
            <div>
              <span className="block text-[8px] font-mono text-zinc-600 uppercase tracking-wider mb-1">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] font-sans bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#e0d0ab]/50 focus:border-[#e0d0ab]/50 [color-scheme:dark]"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full text-left text-[9px] text-zinc-600 hover:text-rose-400 transition-colors font-mono uppercase tracking-wider pt-1"
              >
                Clear dates
              </button>
            )}
          </div>
        </div>

        {/* Source Filter */}
        <div>
          <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-2.5">
            Publication Source
          </label>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedSource('ALL')}
              className={`w-full text-left px-2.5 py-2 text-xs font-sans transition-colors rounded-sm flex items-center justify-between cursor-pointer ${
                selectedSource === 'ALL'
                  ? 'bg-zinc-900 text-stone-150 font-medium border border-zinc-800'
                  : 'text-zinc-550 hover:text-stone-300 hover:bg-zinc-900/40'
              }`}
            >
              <span>All Sources</span>
              <span className="text-[10px] opacity-60">({items.length})</span>
            </button>
            {sources.map(src => {
              const count = items.filter(i => i.source === src).length;
              return (
                <button
                  key={src}
                  onClick={() => setSelectedSource(src)}
                  className={`w-full text-left px-2.5 py-2 text-xs font-sans transition-colors rounded-sm flex items-center justify-between cursor-pointer ${
                    selectedSource === src
                      ? 'bg-zinc-900 text-stone-150 font-medium border border-[#e0d0ab]/30'
                      : 'text-zinc-550 hover:text-stone-300 hover:bg-zinc-900/40'
                  }`}
                >
                  <span className="truncate">{src}</span>
                  <span className="text-[10px] opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Dashboard Feed */}
      <div className="flex-1 min-w-0">

        {/* Sleek Action Header banner */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-[11px] font-sans font-bold tracking-wider uppercase text-[#e0d0ab] rounded-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Administrative Intelligence Feed
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-sans font-bold tracking-tight text-white">Tark Current Affairs</h2>
            </div>
            <p className="text-zinc-500 text-xs font-sans">High-signal, verified policy briefs processed straight from administrative press channels.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Interactive Fetch Sync Control */}
            <button
              onClick={handleSyncFeed}
              disabled={syncing || syncCooldown > 0}
              className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-sm text-xs font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
                syncing
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed'
                  : syncCooldown > 0
                  ? 'bg-zinc-900 border-amber-800/50 text-amber-400 cursor-not-allowed'
                  : syncSuccess
                  ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400 hover:bg-emerald-950/40'
                  : 'bg-zinc-900 border-zinc-800 text-[#e0d0ab] hover:bg-zinc-850 hover:border-[#e0d0ab]/30 hover:text-stone-100'
              }`}
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Fetching Latest Dispatches...</span>
                </>
              ) : syncCooldown > 0 ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Available in {formatCooldown(syncCooldown)}</span>
                </>
              ) : syncSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Feeds Polished & Loaded</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Policy Feed</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-stone-200 text-xs font-sans bg-zinc-900/30 border border-zinc-900 px-3 py-2 rounded-sm select-none">
              <BookOpen className="w-3.5 h-3.5 text-[#e0d0ab]" />
              <span>Showing <strong className="text-[#e0d0ab] font-bold">{filteredItems.length}</strong> Polities</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-950/10 border border-rose-950/40 text-rose-400 text-xs rounded-sm flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h5 className="font-bold">Sync Error</h5>
              <p className="opacity-90 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {loading ? (
          /* Skeleton Feed */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-zinc-900/10 border border-zinc-905 p-6 space-y-4 rounded-sm animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-28 bg-zinc-900 rounded-sm"></div>
                  <div className="h-4 w-12 bg-zinc-900 rounded-sm"></div>
                </div>
                <div className="h-6 w-3/4 bg-zinc-900 rounded-sm"></div>
                <div className="space-y-2">
                  <div className="h-3.5 w-full bg-zinc-900/55 rounded-sm"></div>
                  <div className="h-3.5 w-5/6 bg-zinc-900/55 rounded-sm"></div>
                  <div className="h-3.5 w-4/5 bg-zinc-900/55 rounded-sm"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          /* Sleek Empty State */
          <div className="flex flex-col items-center justify-center p-14 border border-dashed border-zinc-850 text-center rounded-sm bg-zinc-900/5">
            <Inbox className="w-9 h-9 text-zinc-700 mb-4" />
            <h4 className="text-xs uppercase font-mono tracking-wider font-bold text-stone-200 mb-1">Policy brief index empty</h4>
            <p className="text-xs font-sans text-zinc-500 max-w-sm leading-relaxed">
              No daily updates ingested under these parameters. Click "Sync Policy Feed" above to clean the system and fetch the latest high-signal press items.
            </p>
          </div>
        ) : (
          /* Grid/List of Curated Items */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, idx) => {
                const bullets = item.summary?.bullets || [];
                const articleId = item.id || '';
                const isSaved = savedArticleIds.has(articleId);
                const isSaving = savingArticleIds.has(articleId);

                return (
                  <motion.div
                    key={item.id || idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="bg-zinc-900/15 hover:bg-zinc-900/35 border border-zinc-900 p-5 transition-all duration-300 ease-out rounded-sm hover:border-[#e0d0ab]/35 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.6)] flex flex-col justify-between group relative"
                  >
                    <div>
                      {/* Badge Meta Stack */}
                      <div className="flex items-center gap-2 mb-3.5 flex-wrap">
                        <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-sans font-semibold bg-zinc-900 text-[#e0d0ab] rounded-sm border border-zinc-800">
                          {item.ministry}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-sans font-semibold bg-zinc-950 text-zinc-400 rounded-sm border border-zinc-900">
                          {item.source}
                        </span>
                      </div>

                      {/* Headline PROMINENT */}
                      <h3 className="text-sm font-sans font-extrabold text-[#e0d0ab] group-hover:text-white transition-colors leading-snug tracking-tight mb-3">
                        {item.headline}
                      </h3>

                      {/* Curated SUMMARY - 3 Bullet policy summaries nicely spaced */}
                      {bullets.length > 0 && (
                        <div className="pl-3 border-l border-[#e0d0ab]/20 space-y-2 mb-5">
                          {bullets.map((bullet, bIdx) => (
                            <div key={bIdx} className="flex gap-2 text-[11px] text-stone-300 leading-relaxed font-sans">
                              <span className="text-[#e0d0ab] font-bold select-none">•</span>
                              <p>{bullet}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Footer: Bookmark + External Link */}
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-900/40">
                      {/* Bookmark Icon */}
                      <button
                        onClick={() => toggleBookmark(articleId)}
                        disabled={isSaving}
                        className={`inline-flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          isSaved
                            ? 'text-emerald-400 hover:text-emerald-300'
                            : 'text-zinc-500 hover:text-[#e0d0ab]'
                        } disabled:opacity-50`}
                        title={isSaved ? 'Remove bookmark' : 'Bookmark this article'}
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 transition-all ${
                            isSaved ? 'fill-emerald-500 text-emerald-500' : 'text-current'
                          }`}
                        />
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                      </button>

                      {/* External Link */}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-wider text-[#e0d0ab]/90 hover:text-white transition-colors cursor-pointer"
                        >
                          Access Original release
                          <ExternalLink className="w-3 h-3 text-[#e0d0ab]/90" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Toast Notifications */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 bg-zinc-900 border border-zinc-700/60 rounded-sm shadow-2xl"
            >
              <p className="text-xs text-stone-200 font-sans whitespace-nowrap">
                {toastMsg}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Background Sync Toast: shown when 202 Accepted returned */}
        <AnimatePresence>
          {showBackgroundToast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 bg-zinc-900 border border-emerald-800/60 rounded-sm shadow-2xl"
            >
              <p className="text-xs text-emerald-300 font-sans whitespace-nowrap flex items-center gap-2">
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                Extraction initialized. Updates will pop live in your ledger momentarily.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
