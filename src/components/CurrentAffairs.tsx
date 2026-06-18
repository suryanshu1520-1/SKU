import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Filter, RotateCcw, BookOpen, Inbox, RefreshCw, CheckCircle2, AlertCircle, Calendar, Bookmark, X, Share2, Sun, Moon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

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

interface PibDigestItem {
  id: string;
  title: string;
  date: string;
  content: string;
  url: string;
  created_at: string;
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
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;

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

  // PIB Digest modal state
  const [showPibModal, setShowPibModal] = useState(false);
  const [pibDigests, setPibDigests] = useState<PibDigestItem[]>([]);
  const [activeDigestIndex, setActiveDigestIndex] = useState(0);

  const [isLightMode, setIsLightMode] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    const progress = maxScroll > 0 ? (target.scrollTop / maxScroll) * 100 : 0;
    setScrollProgress(progress);
  };

  // Fetch PIB digests when modal is opened
  useEffect(() => {
    if (!showPibModal) return;
    (async () => {
      const { data } = await supabase
        .from('pib_digests')
        .select('*')
        .order('date', { ascending: false });
      if (data) {
        setPibDigests(data);
        setActiveDigestIndex(0);
      }
    })();
  }, [showPibModal]);

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
          setSavedArticleIds(prev => {
            const next = new Set(data.map(row => row.article_id));
            // Preserve optimistically saving items
            savingArticleIds.forEach(id => {
              if (prev.has(id)) next.add(id);
              else next.delete(id);
            });
            return next;
          });
        }
      } catch (err) {
        console.warn("Error fetching saved article IDs:", err);
      }
    })();
  }, [userId, savingArticleIds]);

  // Distinct fetch helper - conditionally applies date and category filters to the Supabase query
  const fetchPolicyData = async (
    showSkeleton = true, 
    filterStartDate?: string, 
    filterEndDate?: string, 
    pageIndex = 0,
    filterMinistry = 'ALL',
    filterSource = 'ALL'
  ) => {
    if (showSkeleton && pageIndex === 0) setLoading(true);
    setErrorMsg('');
    try {
      let query = supabase
        .from('current_affairs')
        .select('*')
        .neq('source', 'PIB_Digest');

      if (filterMinistry !== 'ALL') {
        query = query.eq('ministry', filterMinistry);
      }
      
      if (filterSource !== 'ALL') {
        query = query.eq('source', filterSource);
      }

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

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await query.order('created_at', { ascending: false }).range(from, to);

      if (error) {
        throw error;
      }

      if (data) {
        if (pageIndex === 0) {
          setItems(data);
        } else {
          setItems(prev => [...prev, ...data]);
        }
        
        setHasMore(data.length === PAGE_SIZE);

        // Extract unique ministries and sources for the filters
        const uniqueMinistries = Array.from(new Set(data.map((item: any) => item.ministry).filter(Boolean))) as string[];
        const uniqueSources = Array.from(new Set(data.map((item: any) => item.source).filter(Boolean))) as string[];

        if (pageIndex === 0) {
          if (filterMinistry === 'ALL' && filterSource === 'ALL' && !filterStartDate && !filterEndDate) {
            // Only overwrite filters if we are doing an unfiltered fetch, otherwise we lose options
            setMinistries(uniqueMinistries.sort());
            setSources(uniqueSources.sort());
          }
        } else {
          setMinistries(prev => Array.from(new Set([...prev, ...uniqueMinistries])).sort());
          setSources(prev => Array.from(new Set([...prev, ...uniqueSources])).sort());
        }
      }
    } catch (err: any) {
      console.error("Error fetching current affairs:", err);
      setErrorMsg(err.message || "Failed to load policy tracking feed.");
    } finally {
      if (pageIndex === 0 || showSkeleton) setLoading(false);
    }
  };

  // Re-fetch when date filters, category filters, or page changes
  useEffect(() => {
    fetchPolicyData(true, startDate || undefined, endDate || undefined, page, selectedMinistry, selectedSource);
  }, [startDate, endDate, page, selectedMinistry, selectedSource]);

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

  // Use server-filtered items directly
  const filteredItems = items;

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
              onClick={() => {
                setSelectedMinistry('ALL');
                setSelectedSource('ALL');
                setStartDate('');
                setEndDate('');
                setPage(0);
              }}
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
              className={`w-full text-left px-2.5 py-2 text-xs font-sans transition-colors rounded-sm flex items-center justify-between cursor-pointer ${selectedMinistry === 'ALL'
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
                  className={`w-full text-left px-2.5 py-2 text-xs font-sans transition-colors rounded-sm flex items-center justify-between cursor-pointer ${selectedMinistry === min
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
                onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                className="w-full px-2.5 py-1.5 text-[11px] font-sans bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#e0d0ab]/50 focus:border-[#e0d0ab]/50 [color-scheme:dark]"
              />
            </div>
            <div>
              <span className="block text-[8px] font-mono text-zinc-600 uppercase tracking-wider mb-1">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                className="w-full px-2.5 py-1.5 text-[11px] font-sans bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#e0d0ab]/50 focus:border-[#e0d0ab]/50 [color-scheme:dark]"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setPage(0);
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
              className={`w-full text-left px-2.5 py-2 text-xs font-sans transition-colors rounded-sm flex items-center justify-between cursor-pointer ${selectedSource === 'ALL'
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
                  className={`w-full text-left px-2.5 py-2 text-xs font-sans transition-colors rounded-sm flex items-center justify-between cursor-pointer ${selectedSource === src
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

        {/* PIB Digest Trigger Button */}
        <div className="mt-8 pt-6 border-t border-zinc-900">
          <button
            onClick={() => setShowPibModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 hover:border-[#e0d0ab]/50 text-stone-300 hover:text-[#e0d0ab] rounded-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#e0d0ab]/50 shadow-sm cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-sans font-bold tracking-wider uppercase">PIB Digests</span>
          </button>
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
            {/* Passive Auto-Sync Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-zinc-600 select-none">
              <RefreshCw className="w-3 h-3 opacity-50" />
              <span>Autonomously synced 3x daily</span>
            </div>

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
            <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">
              No daily updates ingested under these parameters. The system autonomously synchronizes the latest high-signal press items 3 times a day. Check back later.
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
                        className={`inline-flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider transition-colors cursor-pointer ${isSaved
                            ? 'text-emerald-400 hover:text-emerald-300'
                            : 'text-zinc-500 hover:text-[#e0d0ab]'
                          } disabled:opacity-50`}
                        title={isSaved ? 'Remove bookmark' : 'Bookmark this article'}
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 transition-all ${isSaved ? 'fill-emerald-500 text-emerald-500' : 'text-current'
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

        {/* Deep Archive Pagination */}
        {!loading && hasMore && filteredItems.length > 0 && (
          <div className="flex justify-center mt-12 mb-8 border-t border-zinc-900 pt-12">
            <button
              onClick={() => setPage(prev => prev + 1)}
              className="px-8 py-4 bg-zinc-950 border-2 border-zinc-800 text-stone-300 font-sans font-bold text-xs uppercase tracking-[0.2em] hover:bg-zinc-900 hover:border-[#e0d0ab] hover:text-[#e0d0ab] transition-all cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            >
              [ Retrieve Older Dispatches ]
            </button>
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
        {/* PIB Digest Modal */}
        <AnimatePresence>
          {showPibModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPibModal(false)}
              className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-surface text-on-surface rounded-sm shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden ${isLightMode ? 'light-theme' : ''}`}
              >
                {/* Masthead Bar */}
                <div className="flex-shrink-0 flex flex-col border-b border-primary-container/20 bg-surface-dim relative">
                  <div className="flex items-center justify-between px-6 py-3">
                    <span className="font-mono text-sm font-bold tracking-[0.25em] uppercase text-on-surface">
                      CIVIL INTEL PIB
                    </span>
                    <div className="flex items-center gap-5">
                      <span className="font-mono text-[10px] tracking-widest uppercase text-primary-container/70 hidden sm:inline-block">
                        {pibDigests.length > 0 ? `${activeDigestIndex + 1} / ${pibDigests.length}` : ''}
                      </span>
                      <button
                        onClick={() => setIsLightMode(!isLightMode)}
                        className="text-primary-container/60 hover:text-on-surface transition-colors cursor-pointer"
                        aria-label="Toggle Theme"
                      >
                        {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                      </button>
                      <button className="text-primary-container/60 hover:text-on-surface transition-colors cursor-pointer" aria-label="Share">
                        <Share2 size={16} />
                      </button>
                      <button
                        onClick={() => setShowPibModal(false)}
                        className="font-mono text-xs font-bold tracking-widest text-primary-container/60 hover:text-on-surface transition-colors cursor-pointer"
                        aria-label="Close PIB Digest"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {/* Reading Progress Bar */}
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary-container/10">
                    <div
                      className="h-full bg-primary transition-all duration-150 ease-out"
                      style={{ width: `${scrollProgress}%` }}
                    />
                  </div>
                </div>

                {/* Scrollable Body */}
                <div className="overflow-y-auto flex-1 custom-scrollbar" onScroll={handleScroll}>
                  {pibDigests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center">
                      <Inbox className="w-8 h-8 text-primary-container/30 mb-4" />
                      <p className="text-primary-container/50 font-sans text-sm tracking-widest uppercase">
                        No digests available yet.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Hero Header */}
                      <div className="px-8 pt-10 pb-6 text-center border-b border-primary-container/10">
                        <p className="font-mono text-[10px] font-medium tracking-[0.15em] uppercase text-primary-container mb-4">
                          Press Information Bureau
                          {pibDigests[activeDigestIndex]?.date && (
                            <>
                              {' | '}
                              {new Date(pibDigests[activeDigestIndex].date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              }).toUpperCase()}
                            </>
                          )}
                        </p>
                        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-on-surface mb-8 max-w-3xl mx-auto">
                          {pibDigests[activeDigestIndex]?.title || 'PIB Digest'}
                        </h2>
                        <div className="h-[2px] w-full max-w-xl mx-auto bg-primary-container/40 mb-1" />
                        <div className="h-px w-full max-w-xl mx-auto bg-primary-container/15" />
                      </div>

                      {/* Markdown Body */}
                      <div className="px-8 py-10 w-full">
                        <div className="multi-column text-on-surface-variant first-p-drop-cap">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeSanitize]}
                            components={{
                              p: ({ node, ...props }) => <p className="font-serif text-[16px] leading-[1.7] mb-5 text-justify" {...props} />,
                              h1: ({ node, ...props }) => <h1 className="font-serif text-[24px] font-bold text-primary border-b border-primary-container/30 pb-2 mb-4 mt-8 break-inside-avoid" {...props} />,
                              h2: ({ node, ...props }) => <h2 className="font-serif text-[20px] font-bold text-primary border-b border-primary-container/20 pb-2 mb-4 mt-6 break-inside-avoid" {...props} />,
                              h3: ({ node, ...props }) => <h3 className="font-serif text-[18px] font-bold text-on-surface mb-3 mt-6 break-inside-avoid" {...props} />,
                              h4: ({ node, ...props }) => <h4 className="font-serif text-[16px] font-bold text-on-surface mb-2 mt-4 break-inside-avoid" {...props} />,
                              ul: ({ node, ...props }) => <ul className="font-serif list-square pl-5 mb-6 mt-2 text-[15px] leading-[1.7]" {...props} />,
                              ol: ({ node, ...props }) => <ol className="font-serif list-decimal pl-5 mb-6 mt-2 text-[15px] leading-[1.7]" {...props} />,
                              li: ({ node, ...props }) => <li className="mb-2 pl-1" {...props} />,
                              strong: ({ node, ...props }) => <strong className="text-primary font-semibold" {...props} />,
                              blockquote: ({ node, ...props }) => <blockquote className="font-serif border-l-[3px] border-primary-container/50 pl-4 py-1 italic my-6 text-on-surface-variant break-inside-avoid" {...props} />,
                              table: ({ node, ...props }) => <div className="overflow-x-auto w-full mb-8 border border-primary-container/30 break-inside-avoid shadow-sm"><table className="w-full font-mono text-[11px] md:text-[12px] border-collapse bg-surface-dim/30" {...props} /></div>,
                              thead: ({ node, ...props }) => <thead className="bg-surface-container-highest" {...props} />,
                              th: ({ node, ...props }) => <th className="font-mono text-primary-container font-bold uppercase tracking-widest border border-primary-container/30 p-3 text-left" {...props} />,
                              td: ({ node, ...props }) => <td className="font-mono border border-primary-container/20 p-3" {...props} />,
                            }}
                          >
                            {pibDigests[activeDigestIndex]?.content || 'No content available.'}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Navigation Dock */}
                <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-t border-primary-container/20 bg-surface-dim">
                  <button
                    onClick={() => setActiveDigestIndex(Math.max(0, activeDigestIndex - 1))}
                    disabled={activeDigestIndex === 0}
                    className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase text-primary-container hover:text-on-surface transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                  >
                    [ PREV ]
                  </button>
                  <div className="font-mono text-[10px] text-primary-container/50 tracking-widest">
                    EDITION {activeDigestIndex + 1} OF {pibDigests.length}
                  </div>
                  <button
                    onClick={() => setActiveDigestIndex(Math.min(pibDigests.length - 1, activeDigestIndex + 1))}
                    disabled={activeDigestIndex === pibDigests.length - 1}
                    className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase text-primary-container hover:text-on-surface transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                  >
                    [ NEXT ]
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}