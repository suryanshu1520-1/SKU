import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchWithAuth } from '../lib/api';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion, useMotionValue, useTransform, animate, type PanInfo } from 'motion/react';
import {
  ExternalLink,
  Filter,
  RotateCcw,
  BookOpen,
  Inbox,
  RefreshCw,
  Calendar,
  Bookmark,
  X,
  Share2,
  Sun,
  Moon,
  Search,
  SlidersHorizontal,
  Clock,
  Sparkles,
  Shield,
  Layers,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
  Zap,
  Scale
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import DailyEdition from './DailyEdition';
import RebaseEdition from './RebaseEdition';
import ContextActionRail, { ContextActionItem } from './ContextActionRail';
import prsVaultDossiers from '../data/prs-vault-dossiers.json';
import {
  SourceAnchor,
  GroundingBadge,
  ContestedCard,
  type VerifiedClaim,
  type ContestedClaim,
} from './TrustUI';

interface CurrentAffairsItem {
  id?: string;
  source: string;
  ministry: string;
  headline: string;
  url: string;
  summary: {
    bullets: string[];
    significance?: number;
    tags?: string[];
    prelims?: string;
    mains?: string;
    sources?: string[];
    cluster_size?: number;
    edition_date?: string;
    has_quiz?: boolean;
    claims?: VerifiedClaim[];
    grounding?: number;
    verification_method?: 'live_cite_or_drop_v1';
    contested?: ContestedClaim;
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

// Slide-and-fade variants for the PIB edition carousel, keyed by swipe/nav direction.
// Standard Framer Motion carousel pattern: each exiting child keeps the `custom` value
// it was rendered with, so it exits toward the side it came from.
const editionVariants = {
  enter: (direction: number) => ({ x: direction >= 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? -48 : 48, opacity: 0 }),
};

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Signals' },
  { id: 'Governance', label: 'Polity & Cabinet', keywords: ['Cabinet', 'Prime Minister', 'Home Affairs', 'Law', 'Personnel', 'Parliament', 'Governance'] },
  { id: 'Economy', label: 'Economy & RBI', keywords: ['Finance', 'Commerce', 'RBI', 'Corporate Affairs', 'NITI Aayog', 'Revenue', 'Economy'] },
  { id: 'SciTech', label: 'Science & Defence', keywords: ['Defence', 'Space', 'ISRO', 'Atomic Energy', 'Electronics', 'IT', 'Science', 'Technology'] },
  { id: 'Environment', label: 'Climate & Ecology', keywords: ['Environment', 'Forest', 'Climate', 'Renewable', 'Earth Sciences', 'Agriculture', 'Water'] },
  { id: 'Social', label: 'Social & Health', keywords: ['Health', 'Education', 'Social Justice', 'Women', 'Child', 'Tribal', 'Rural'] },
  { id: 'PRS', label: '⚖️ PRS Legislative Vault', isVault: true },
  { id: 'SAVED', label: '⭐ Saved Signals' },
];

const TOP_MINISTRIES = [
  'Ministry of Finance',
  'Ministry of Law and Justice',
  'Ministry of Electronics and Information Technology',
  'Ministry of Home Affairs',
  'Ministry of Defence',
  'Ministry of Environment, Forest and Climate Change',
  'Ministry of Health and Family Welfare',
  'Ministry of Commerce and Industry',
  'Ministry of Agriculture & Farmers Welfare',
  'Ministry of External Affairs',
];

export default function CurrentAffairs({ userId }: CurrentAffairsProps) {
  const [items, setItems] = useState<CurrentAffairsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [syncCooldown, setSyncCooldown] = useState(0);
  const [editionRefreshKey, setEditionRefreshKey] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 45;

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState('ALL');
  const [selectedMinistry, setSelectedMinistry] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [timePreset, setTimePreset] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');
  const [trustFilter, setTrustFilter] = useState<'ALL' | 'HIGH_GROUNDING' | 'CONTESTED'>('ALL');
  const [ministrySearch, setMinistrySearch] = useState<string>('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // View Mode: 'signals' (Signal Deck) vs 'edition' (Daily Edition)
  type BriefViewMode = 'signals' | 'edition';
  const [briefViewMode, setBriefViewMode] = useState<BriefViewMode>(() => {
    try {
      return (localStorage.getItem('tark_brief_view_mode') as BriefViewMode) || 'signals';
    } catch {
      return 'signals';
    }
  });
  const [showDailyEditionInline, setShowDailyEditionInline] = useState(false);

  const handleSelectViewMode = (mode: BriefViewMode) => {
    setBriefViewMode(mode);
    try {
      localStorage.setItem('tark_brief_view_mode', mode);
    } catch {
      /* ignore */
    }
  };

  const applyTimePreset = (preset: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM') => {
    setTimePreset(preset);
    const now = new Date();
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'WEEK') {
      const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(pastWeek.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'MONTH') {
      const pastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(pastMonth.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Available options
  const [ministries, setMinistries] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);

  // Bookmarking State
  const [savedArticleIds, setSavedArticleIds] = useState<Set<string>>(new Set());
  const [savingArticleIds, setSavingArticleIds] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState('');
  const [showBackgroundToast, setShowBackgroundToast] = useState(false);

  // Active Dossier Modal
  const [selectedDossier, setSelectedDossier] = useState<CurrentAffairsItem | null>(null);

  // PIB Digest Modal State
  const [showPibModal, setShowPibModal] = useState(false);
  const [pibDigests, setPibDigests] = useState<PibDigestItem[]>([]);
  const [activeDigestIndex, setActiveDigestIndex] = useState(0);
  const [isLightMode, setIsLightMode] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [dragDirection, setDragDirection] = useState(0); // -1 prev, 1 next, drives peek direction
  const editionDragX = useMotionValue(0);
  const readerBodyRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion = useReducedMotion();

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    const progress = maxScroll > 0 ? (target.scrollTop / maxScroll) * 100 : 0;
    setScrollProgress(progress);
  };

  // Navigate to a specific PIB edition with directional awareness (drives the peek-card lean)
  // and reset the reading-progress + scroll position of the new edition's body.
  const goToEdition = useCallback((nextIndex: number) => {
    setActiveDigestIndex((prev) => {
      const clamped = Math.max(0, Math.min(pibDigests.length - 1, nextIndex));
      if (clamped === prev) return prev;
      setDragDirection(clamped > prev ? 1 : -1);
      return clamped;
    });
    setScrollProgress(0);
    requestAnimationFrame(() => {
      readerBodyRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    });
  }, [pibDigests.length]);

  // Committed on drag release: a fast flick or a long-enough drag both count as a page turn.
  const handleEditionDragEnd = (_e: unknown, info: PanInfo) => {
    const SWIPE_DISTANCE = 90;
    const SWIPE_VELOCITY = 500;
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) {
      goToEdition(activeDigestIndex + 1);
    } else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) {
      goToEdition(activeDigestIndex - 1);
    } else {
      // Not enough commitment — spring back to center.
      animate(editionDragX, 0, { type: 'spring', stiffness: 400, damping: 40 });
    }
  };

  // Rough reading-time estimate for the active digest — reinforces "return on time" in-product.
  const activeDigestReadMinutes = useMemo(() => {
    const content = pibDigests[activeDigestIndex]?.content || '';
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }, [pibDigests, activeDigestIndex]);

  // Keyboard arrow navigation for the digest reader (desktop/accessibility —
  // the drag gesture above only serves touch/mouse-drag).
  useEffect(() => {
    if (!showPibModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToEdition(activeDigestIndex + 1);
      else if (e.key === 'ArrowLeft') goToEdition(activeDigestIndex - 1);
      else if (e.key === 'Escape') setShowPibModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPibModal, activeDigestIndex, goToEdition]);

  // Fetch PIB digests
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

  // Toast Auto-dismiss
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 4000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    if (!showBackgroundToast) return;
    const t = setTimeout(() => setShowBackgroundToast(false), 5000);
    return () => clearTimeout(t);
  }, [showBackgroundToast]);

  // Cooldown countdown
  useEffect(() => {
    if (syncCooldown <= 0) return;
    const interval = setInterval(() => {
      setSyncCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [syncCooldown]);

  // Fetch saved bookmarks
  useEffect(() => {
    if (!userId || userId === 'guest') return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('saved_articles')
          .select('article_id')
          .eq('user_id', userId);

        if (!error && data) {
          setSavedArticleIds(new Set(data.map((row) => row.article_id)));
        }
      } catch (err) {
        console.warn('Error fetching saved article IDs:', err);
      }
    })();
  }, [userId]);

  // Primary Data Fetcher
  const fetchPolicyData = async (
    showSkeleton = true,
    filterStartDate?: string,
    filterEndDate?: string,
    pageIndex = 0,
    filterMinistry = 'ALL',
    filterSource = 'ALL',
    categoryTab = activeCategoryTab
  ) => {
    if (showSkeleton && pageIndex === 0) setLoading(true);
    setErrorMsg('');
    try {
      let query = supabase
        .from('current_affairs')
        .select('*')
        .neq('source', 'PIB_Digest');

      if (categoryTab === 'PRS' || filterSource === 'PRS') {
        // Strictly fetch PRS Legislative Research items only
        query = query.eq('source', 'PRS');
      } else {
        // Daily current affairs feed NEVER contains PRS
        if (filterSource === 'ALL') {
          query = query.neq('source', 'PRS');
        } else {
          query = query.eq('source', filterSource);
        }
      }

      if (filterMinistry !== 'ALL') {
        query = query.eq('ministry', filterMinistry);
      }
      if (filterStartDate) {
        query = query.gte('created_at', filterStartDate);
      }
      if (filterEndDate) {
        const endInclusive = new Date(filterEndDate);
        endInclusive.setDate(endInclusive.getDate() + 1);
        query = query.lt('created_at', endInclusive.toISOString().split('T')[0]);
      }

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await query.order('created_at', { ascending: false }).range(from, to);

      if (error) throw error;

      if (data) {
        let finalData = data;
        if ((categoryTab === 'PRS' || filterSource === 'PRS') && pageIndex === 0) {
          const liveUrls = new Set(data.map((d: any) => d.url));
          const supplementary = (prsVaultDossiers as CurrentAffairsItem[]).filter(
            (item) => !liveUrls.has(item.url)
          );
          finalData = [...data, ...supplementary];
        }

        if (pageIndex === 0) {
          setItems(finalData);
        } else {
          setItems((prev) => [...prev, ...finalData]);
        }

        setHasMore(data.length === PAGE_SIZE);

        const uniqueMinistries = Array.from(new Set(finalData.map((item: any) => item.ministry).filter(Boolean))) as string[];
        const uniqueSources = Array.from(new Set(finalData.map((item: any) => item.source).filter(Boolean))) as string[];

        if (pageIndex === 0 && filterMinistry === 'ALL' && filterSource === 'ALL' && !filterStartDate && !filterEndDate) {
          setMinistries(uniqueMinistries.sort());
          setSources(uniqueSources.sort());
        } else {
          setMinistries((prev) => Array.from(new Set([...prev, ...uniqueMinistries])).sort());
          setSources((prev) => Array.from(new Set([...prev, ...uniqueSources])).sort());
        }
      }
    } catch (err: any) {
      console.error('Error fetching current affairs:', err);
      setErrorMsg(err.message || 'Failed to load policy tracking feed.');
    } finally {
      if (pageIndex === 0 || showSkeleton) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicyData(true, startDate || undefined, endDate || undefined, page, selectedMinistry, selectedSource, activeCategoryTab);
  }, [startDate, endDate, page, selectedMinistry, selectedSource, activeCategoryTab]);

  // Sync Feed Handler
  const handleSyncFeed = async () => {
    if (syncCooldown > 0 || syncing) return;
    if (!userId || userId === 'guest') {
      setErrorMsg('Please sign in to trigger live intelligence ingestion.');
      return;
    }
    setSyncing(true);
    setSyncSuccess(null);
    setErrorMsg('');
    try {
      const response = await fetchWithAuth('/api/sync-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (response.status === 401) {
        setErrorMsg('Please sign in to trigger live intelligence ingestion.');
        return;
      }
      if (response.status === 429) {
        setSyncCooldown(data.remaining || 300);
        setErrorMsg(data.message || 'Sync cooldown active.');
        return;
      }
      if (response.status === 202) {
        setShowBackgroundToast(true);
        setSyncSuccess(true);
        setTimeout(() => {
          void fetchPolicyData(false).finally(() => setEditionRefreshKey((key) => key + 1));
        }, 10000);
        setTimeout(() => setSyncSuccess(null), 5000);
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Sync error.');

      setSyncSuccess(true);
      await fetchPolicyData(false);
      setEditionRefreshKey((key) => key + 1);
      setTimeout(() => setSyncSuccess(null), 5000);
    } catch (err: any) {
      console.error('Manual sync error:', err);
      setErrorMsg(err.message || 'Scraper unreachable.');
    } finally {
      setSyncing(false);
    }
  };

  // Toggle Bookmark
  const toggleBookmark = async (articleId: string) => {
    if (!articleId) return;
    if (!userId || userId === 'guest') {
      setToastMsg('Please sign in to save intelligence briefs to your profile.');
      return;
    }

    const isSaved = savedArticleIds.has(articleId);
    let resolvedUserId = userId;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) resolvedUserId = session.user.id;
    } catch {
      // fallback
    }

    // Optimistic Update
    setSavedArticleIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(articleId);
      else next.add(articleId);
      return next;
    });

    setSavingArticleIds((prev) => new Set(prev).add(articleId));

    try {
      if (isSaved) {
        await supabase
          .from('saved_articles')
          .delete()
          .eq('user_id', resolvedUserId)
          .eq('article_id', articleId);
      } else {
        await supabase
          .from('saved_articles')
          .insert({ user_id: resolvedUserId, article_id: articleId });
        setToastMsg('Saved to your Profile Ledger.');
      }
    } catch (err) {
      console.error('Bookmark error:', err);
      setSavedArticleIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(articleId);
        else next.delete(articleId);
        return next;
      });
    } finally {
      setSavingArticleIds((prev) => {
        const next = new Set(prev);
        next.delete(articleId);
        return next;
      });
    }
  };

  // Filter & Search computation
  const displayedItems = useMemo(() => {
    let list = items;

    // 1. Category Tab / Saved Signals / PRS Vault Filtering
    if (activeCategoryTab === 'SAVED') {
      list = list.filter((item) => item.id && savedArticleIds.has(item.id));
    } else if (activeCategoryTab === 'PRS') {
      list = list.filter((item) => item.source === 'PRS');
    } else if (activeCategoryTab !== 'ALL') {
      const tab = CATEGORY_TABS.find((t) => t.id === activeCategoryTab);
      if (tab?.keywords) {
        list = list.filter((item) =>
          tab.keywords.some(
            (kw) =>
              item.ministry?.toLowerCase().includes(kw.toLowerCase()) ||
              item.headline?.toLowerCase().includes(kw.toLowerCase())
          )
        );
      }
    }

    // 2. Trust / Grounding Filter
    if (trustFilter === 'HIGH_GROUNDING') {
      list = list.filter((item) => (item.summary?.grounding ?? 0) >= 90);
    } else if (trustFilter === 'CONTESTED') {
      list = list.filter((item) => !!item.summary?.contested);
    }

    // 3. Source Filter
    if (selectedSource !== 'ALL') {
      list = list.filter((item) => item.source?.toUpperCase() === selectedSource.toUpperCase());
    }

    // 4. Ministry Filter
    if (selectedMinistry !== 'ALL') {
      list = list.filter((item) => item.ministry === selectedMinistry);
    }

    // 5. Search Query Filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.headline?.toLowerCase().includes(q) ||
          item.ministry?.toLowerCase().includes(q) ||
          item.source?.toLowerCase().includes(q) ||
          item.summary?.bullets?.some((b) => b.toLowerCase().includes(q))
      );
    }

    return list;
  }, [items, activeCategoryTab, searchQuery, trustFilter, selectedSource, selectedMinistry, savedArticleIds]);

  const leadItem = displayedItems[0] || null;
  const standardItems = displayedItems.slice(1);

  const activeFilterCount =
    (selectedMinistry !== 'ALL' ? 1 : 0) +
    (selectedSource !== 'ALL' ? 1 : 0) +
    (timePreset !== 'ALL' ? 1 : 0) +
    (trustFilter !== 'ALL' ? 1 : 0) +
    (activeCategoryTab !== 'ALL' ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedMinistry('ALL');
    setSelectedSource('ALL');
    setTimePreset('ALL');
    setTrustFilter('ALL');
    setStartDate('');
    setEndDate('');
    setActiveCategoryTab('ALL');
    setSearchQuery('');
    setMinistrySearch('');
    setPage(0);
  };

  // Contextual Page Action Bar items (Sleek Vertical Sub-bar)
  const contextActions: ContextActionItem[] = [
    {
      id: 'prs',
      label: 'PRS Legislative Vault',
      shortLabel: 'PRS',
      icon: Scale,
      isActive: activeCategoryTab === 'PRS',
      accentColor: 'purple',
      onClick: () => {
        setActiveCategoryTab('PRS');
        setSelectedSource('PRS');
      },
      tooltip: 'Open Statutory Acts & Parliamentary Bills (PRS Vault)',
    },
    {
      id: 'pib',
      label: 'PIB Daily Digest',
      shortLabel: 'PIB',
      icon: BookOpen,
      onClick: () => setShowPibModal(true),
      tooltip: 'Open PIB Daily Digest Reader',
    },
    {
      id: 'signals',
      label: 'Signal Deck Feed',
      shortLabel: 'Deck',
      icon: Zap,
      isActive: briefViewMode === 'signals',
      accentColor: 'gold',
      onClick: () => handleSelectViewMode('signals'),
      tooltip: 'Continuous Policy Dispatches Stream',
    },
    {
      id: 'edition',
      label: 'Daily Edition (10 Briefs)',
      shortLabel: 'Edition',
      icon: Sparkles,
      isActive: briefViewMode === 'edition',
      badge: 10,
      accentColor: 'cyan',
      onClick: () => handleSelectViewMode('edition'),
      tooltip: 'Finite Curated Daily Edition',
    },
    {
      id: 'filters',
      label: isFilterDrawerOpen ? 'Close Filter Hub' : 'Open Filter Hub',
      shortLabel: 'Filters',
      icon: SlidersHorizontal,
      isActive: isFilterDrawerOpen || activeFilterCount > 0,
      badge: activeFilterCount > 0 ? activeFilterCount : undefined,
      onClick: () => setIsFilterDrawerOpen(!isFilterDrawerOpen),
      tooltip: 'Toggle Intelligence Filters',
    },
    {
      id: 'saved',
      label: `Saved Signals (${savedArticleIds.size})`,
      shortLabel: 'Saved',
      icon: Bookmark,
      isActive: activeCategoryTab === 'SAVED',
      badge: savedArticleIds.size > 0 ? savedArticleIds.size : undefined,
      onClick: () => setActiveCategoryTab(activeCategoryTab === 'SAVED' ? 'ALL' : 'SAVED'),
      tooltip: 'Candidate Bookmarked Dispatches',
    },
  ];

  return (
    <div className="w-full min-h-screen text-stone-100 font-sans pb-24">
      
      {/* ── Editorial Masthead Header ── */}
      <div className="border-b border-zinc-800/80 pb-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-sans uppercase tracking-wider text-[#e0d0ab] font-medium">
                Autonomous Policy &amp; Governance Intelligence
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
              The Daily Brief <span className="font-serif font-normal text-[#e0d0ab] text-2xl sm:text-3xl">| दैनिक नीति संकेत</span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm font-sans mt-2 max-w-2xl leading-relaxed">
              Every press release, cabinet decision, and policy notification that matters, distilled into a few honest minutes for UPSC and State PSC prep.
            </p>
          </div>

          {/* Quick status badge & Mobile Actions */}
          <div className="flex items-center gap-2.5 shrink-0 font-sans flex-wrap">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(3,18,42,0.8)] border border-[rgba(19,108,153,0.4)] rounded-xs text-xs font-mono text-[#8fa2bd]">
              <span className="text-[#e0d0ab] font-bold">{items.length}</span> dispatches indexed
            </span>

            {/* Mobile / Tablet Compact Action Bar (< lg) */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => {
                  setActiveCategoryTab('PRS');
                  setSelectedSource('PRS');
                }}
                className={`px-3 py-1.5 rounded-xs text-xs font-mono font-bold transition-all border ${
                  activeCategoryTab === 'PRS'
                    ? 'bg-purple-950 border-[#c084fc] text-[#e0d0ab]'
                    : 'bg-zinc-900 border-purple-900 text-purple-300'
                }`}
              >
                ⚖️ PRS
              </button>
              <button
                onClick={() => setShowPibModal(true)}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xs text-xs font-sans cursor-pointer"
              >
                PIB
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Context Action Sub-Bar (Left) + Intelligence Stream (Right) ── */}
      <div className="flex items-start gap-6">
        {/* Shorter Vertical Action Rail (Docked Left, Sticky) */}
        <div className="hidden lg:block shrink-0 sticky top-24 z-30">
          <ContextActionRail
            activeTab="tracker"
            gameState="arena"
            customActions={contextActions}
          />
        </div>

        {/* Main Intelligence Stream Container */}
        <div className="flex-1 min-w-0">

      {/* ── Error Banner ── */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs rounded-sm flex items-start gap-3 font-sans">
          <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <div>
            <h5 className="font-bold">Sync Advisory</h5>
            <p className="opacity-90">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ── View Mode Switcher ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[rgba(19,108,153,0.35)]">
        <LayoutGroup id="brief-view-modes">
          <div className="flex items-center gap-1.5 p-1 bg-[rgba(3,18,42,0.7)] border border-[rgba(19,108,153,0.4)] rounded-xs">
            <button
              onClick={() => handleSelectViewMode('signals')}
              className={`relative px-3.5 py-1.5 rounded-xs text-xs font-mono font-medium transition-all cursor-pointer ${
                briefViewMode === 'signals' ? 'text-[#072e63] font-bold' : 'text-[#8fa2bd] hover:text-[#e0d0ab]'
              }`}
            >
              {briefViewMode === 'signals' && (
                <motion.span
                  layoutId="brief-view-mode-pill"
                  className="absolute inset-0 bg-[#e0d0ab] rounded-xs shadow-sm"
                  transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.45 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Signal Deck</span>
              </span>
            </button>

            <button
              onClick={() => handleSelectViewMode('edition')}
              className={`relative px-3.5 py-1.5 rounded-xs text-xs font-mono font-medium transition-all cursor-pointer ${
                briefViewMode === 'edition' ? 'text-[#072e63] font-bold' : 'text-[#8fa2bd] hover:text-[#e0d0ab]'
              }`}
            >
              {briefViewMode === 'edition' && (
                <motion.span
                  layoutId="brief-view-mode-pill"
                  className="absolute inset-0 bg-[#e0d0ab] rounded-xs shadow-sm"
                  transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.45 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Daily Edition (10 Briefs)</span>
              </span>
            </button>
          </div>
        </LayoutGroup>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#8fa2bd]">
            {briefViewMode === 'edition' ? 'Finite curated reading path' : `${displayedItems.length} policy signals indexed`}
          </span>
        </div>
      </div>

      {/* ── MODE 1: FULL DAILY EDITION READER ── */}
      {briefViewMode === 'edition' && (
        <div className="max-w-4xl mx-auto">
          <RebaseEdition
            userId={userId}
            refreshKey={editionRefreshKey}
            fallback={<DailyEdition userId={userId} compactModeDefault={false} />}
          />
        </div>
      )}

      {/* ── MODE 2: SIGNAL DECK & POLICY EXPLORER ── */}
      {briefViewMode === 'signals' && (
        <>
          {/* Optional Daily Edition Upfront Hero Banner */}
          <div className="mb-6 p-4 rounded-xs border border-[rgba(19,108,153,0.45)] bg-[rgba(4,25,54,0.6)] backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xs bg-[rgba(224,208,171,0.12)] border border-[rgba(224,208,171,0.3)] flex items-center justify-center text-[#e0d0ab] shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#e0d0ab]">Today's Finite Curated Edition</span>
                  <span className="text-[11px] font-mono text-[#8fa2bd]">&bull; 10 briefs &bull; ~4 min read</span>
                </div>
                <p className="text-[12px] text-[#9fb0c8] m-0">Significance-ranked policy decisions with verified Prelims & Mains takeaways.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleSelectViewMode('edition')}
                className="px-3 py-1.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] font-mono font-bold text-xs uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
              >
                Open Edition →
              </button>
              <button
                onClick={() => setShowDailyEditionInline(!showDailyEditionInline)}
                className="px-3 py-1.5 bg-[rgba(3,18,42,0.6)] hover:bg-[rgba(11,61,120,0.4)] border border-[rgba(19,108,153,0.4)] text-[#c8b998] font-mono text-xs rounded-xs transition-colors cursor-pointer"
              >
                {showDailyEditionInline ? 'Hide Inline ▴' : 'Expand Inline ▾'}
              </button>
            </div>
          </div>

          {/* Inline Collapsible Edition (if toggled) */}
          <AnimatePresence>
            {showDailyEditionInline && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mb-8"
              >
                <RebaseEdition
                  userId={userId}
                  refreshKey={editionRefreshKey}
                  fallback={<DailyEdition userId={userId} compactModeDefault={true} />}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Archive & Signal Explorer Header ── */}
          <div className="pt-4 border-t border-[rgba(19,108,153,0.3)] mb-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-serif text-base font-bold text-[#e8e0cf] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0194a8]" />
                  <span>Policy Dispatches & Signal Explorer</span>
                </h3>
                <p className="text-xs text-[#8fa2bd] font-sans m-0">
                  Search policy dispatches, filter by ministry, or browse verified intelligence.
                </p>
              </div>
            </div>
          </div>

      {/* ── Search & Horizontal Category Filter Tabs ── */}
      <div className="space-y-4 mb-8 font-sans">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Category Tabs */}
          <LayoutGroup id="ca-category-tabs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {CATEGORY_TABS.map((tab) => {
                const isActive = activeCategoryTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategoryTab(tab.id)}
                    className={`relative px-3.5 py-1.5 rounded-xs text-xs font-mono font-medium tracking-wide whitespace-nowrap transition-colors cursor-pointer border ${
                      isActive ? 'border-transparent text-[#072e63] font-bold' : 'bg-[rgba(3,18,42,0.6)] border-[rgba(19,108,153,0.35)] text-[#8fa2bd] hover:text-[#e0d0ab] hover:border-[rgba(19,108,153,0.6)]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="ca-category-active-pill"
                        className="absolute inset-0 bg-[#e0d0ab] rounded-xs shadow-sm"
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.45 }}
                      />
                    )}
                    <span className="relative z-10">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          {/* Search Input & Deep Filter Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 lg:w-72">
              <Search className="w-3.5 h-3.5 text-[#0194a8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search policy briefs, ministries, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[rgba(3,18,42,0.85)] border border-[rgba(19,108,153,0.4)] rounded-xs text-xs font-sans text-stone-200 placeholder-[#8fa2bd]/60 focus:outline-none focus:border-[#e0d0ab] focus:ring-1 focus:ring-[#e0d0ab]/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8fa2bd] hover:text-stone-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border text-xs font-mono font-medium transition-all cursor-pointer ${
                activeFilterCount > 0 || isFilterDrawerOpen
                  ? 'bg-[rgba(11,61,120,0.4)] border-[#e0d0ab] text-[#e0d0ab]'
                  : 'bg-[rgba(3,18,42,0.6)] border-[rgba(19,108,153,0.35)] text-[#8fa2bd] hover:border-[rgba(19,108,153,0.6)] hover:text-stone-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#0194a8]" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#e0d0ab] text-[#072e63] font-bold text-[9px] flex items-center justify-center ml-0.5">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Refined Filter Tray (Intuitive Command Center) */}
        <AnimatePresence>
          {isFilterDrawerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-[rgba(3,18,42,0.95)] border border-[rgba(19,108,153,0.45)] rounded-xs p-5 backdrop-blur-xl font-sans space-y-5 shadow-2xl"
            >
              {/* Row 1: Time Horizon & Verification Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Time Horizon Presets */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#e0d0ab] font-bold mb-2">
                    Time Horizon
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'ALL', label: 'All Time' },
                      { id: 'TODAY', label: "Today's Briefing" },
                      { id: 'WEEK', label: 'Past 7 Days' },
                      { id: 'MONTH', label: 'This Month' },
                      { id: 'CUSTOM', label: 'Custom Range' },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyTimePreset(preset.id as any)}
                        className={`px-3 py-1.5 rounded-xs text-xs font-mono transition-colors cursor-pointer border ${
                          timePreset === preset.id
                            ? 'bg-[#e0d0ab] text-[#072e63] border-[#e0d0ab] font-bold shadow-sm'
                            : 'bg-[rgba(4,25,54,0.8)] border-[rgba(19,108,153,0.4)] text-[#9fb0c8] hover:border-[#e0d0ab] hover:text-[#e0d0ab]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Date Inputs if Custom selected */}
                  {timePreset === 'CUSTOM' && (
                    <div className="flex items-center gap-2 mt-2.5">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-2.5 py-1.5 bg-[rgba(4,25,54,0.9)] border border-[rgba(19,108,153,0.4)] rounded-xs text-xs font-sans text-stone-200 [color-scheme:dark]"
                      />
                      <span className="text-xs text-[#8fa2bd] font-mono">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-2.5 py-1.5 bg-[rgba(4,25,54,0.9)] border border-[rgba(19,108,153,0.4)] rounded-xs text-xs font-sans text-stone-200 [color-scheme:dark]"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Verification & Grounding Filter */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#e0d0ab] font-bold mb-2">
                    Evidence & Grounding
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'ALL', label: 'All Dispatches' },
                      { id: 'HIGH_GROUNDING', label: '🛡️ High Grounding (≥90%)' },
                      { id: 'CONTESTED', label: '⚠️ Contested Claims' },
                    ].map((trust) => (
                      <button
                        key={trust.id}
                        onClick={() => setTrustFilter(trust.id as any)}
                        className={`px-3 py-1.5 rounded-xs text-xs font-mono transition-colors cursor-pointer border ${
                          trustFilter === trust.id
                            ? 'bg-[#e0d0ab] text-[#072e63] border-[#e0d0ab] font-bold shadow-sm'
                            : 'bg-[rgba(4,25,54,0.8)] border-[rgba(19,108,153,0.4)] text-[#9fb0c8] hover:border-[#e0d0ab] hover:text-[#e0d0ab]'
                        }`}
                      >
                        {trust.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Primary Source Filter */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#e0d0ab] font-bold mb-2">
                  Verified Intelligence Source
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'ALL', label: 'All Sources' },
                    { id: 'PIB', label: '🏛️ PIB Official (Press Information Bureau)' },
                    { id: 'RBI', label: '📈 RBI Notifications (Reserve Bank of India)' },
                    { id: 'PRS', label: '⚖️ PRS Legislative Research (Bills & Acts)' },
                  ].map((src) => (
                    <button
                      key={src.id}
                      onClick={() => {
                        setSelectedSource(src.id);
                        if (src.id === 'PRS') setActiveCategoryTab('PRS');
                      }}
                      className={`px-3 py-1.5 rounded-xs text-xs font-mono transition-colors cursor-pointer border ${
                        selectedSource === src.id
                          ? 'bg-[#e0d0ab] text-[#072e63] border-[#e0d0ab] font-bold shadow-sm'
                          : 'bg-[rgba(4,25,54,0.8)] border-[rgba(19,108,153,0.4)] text-[#9fb0c8] hover:border-[#e0d0ab] hover:text-[#e0d0ab]'
                      }`}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: High-Yield Ministries (Interactive Chips & Search) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#e0d0ab] font-bold">
                    High-Yield Ministries & Departments
                  </label>
                  {selectedMinistry !== 'ALL' && (
                    <button
                      onClick={() => setSelectedMinistry('ALL')}
                      className="text-[10px] font-mono text-[#0194a8] hover:text-[#e0d0ab] cursor-pointer"
                    >
                      Show All Ministries
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setSelectedMinistry('ALL')}
                    className={`px-2.5 py-1 rounded-xs text-xs font-sans transition-colors cursor-pointer border ${
                      selectedMinistry === 'ALL'
                        ? 'bg-[#e0d0ab] text-[#072e63] border-[#e0d0ab] font-bold shadow-sm'
                        : 'bg-[rgba(4,25,54,0.7)] border-[rgba(19,108,153,0.35)] text-[#8fa2bd] hover:text-stone-200'
                    }`}
                  >
                    All Ministries ({items.length})
                  </button>
                  {TOP_MINISTRIES.map((min) => {
                    const count = items.filter((it) => it.ministry === min).length;
                    const isSelected = selectedMinistry === min;
                    const shortName = min.replace('Ministry of ', '').replace('and ', '& ');
                    return (
                      <button
                        key={min}
                        onClick={() => setSelectedMinistry(isSelected ? 'ALL' : min)}
                        className={`px-2.5 py-1 rounded-xs text-xs font-sans transition-colors cursor-pointer border ${
                          isSelected
                            ? 'bg-[#e0d0ab] text-[#072e63] border-[#e0d0ab] font-bold shadow-sm'
                            : 'bg-[rgba(4,25,54,0.7)] border-[rgba(19,108,153,0.35)] text-[#8fa2bd] hover:border-[#e0d0ab] hover:text-[#e0d0ab]'
                        }`}
                      >
                        <span>{shortName}</span>
                        {count > 0 && <span className="ml-1 text-[10px] opacity-75">({count})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-[rgba(19,108,153,0.3)]">
                <span className="text-xs font-mono text-[#8fa2bd]">
                  Showing <span className="text-[#e0d0ab] font-bold">{displayedItems.length}</span> dispatches matching filters
                </span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetAllFilters}
                    className="px-3.5 py-1.5 bg-[rgba(11,61,120,0.5)] hover:bg-[rgba(11,61,120,0.8)] border border-[#e0d0ab] text-[#e0d0ab] rounded-xs text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active Filter Badges Bar (Quick 1-Click Clear) ── */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#8fa2bd]">
              Active Filters:
            </span>

            {activeCategoryTab !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs bg-[rgba(11,61,120,0.5)] border border-[rgba(19,108,153,0.5)] text-[#e0d0ab] text-[11px] font-mono">
                <span>{CATEGORY_TABS.find((t) => t.id === activeCategoryTab)?.label || activeCategoryTab}</span>
                <button onClick={() => setActiveCategoryTab('ALL')} className="hover:text-white cursor-pointer ml-1">×</button>
              </span>
            )}

            {selectedSource !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs bg-[rgba(11,61,120,0.5)] border border-[rgba(19,108,153,0.5)] text-[#e0d0ab] text-[11px] font-mono">
                <span>Source: {selectedSource}</span>
                <button onClick={() => setSelectedSource('ALL')} className="hover:text-white cursor-pointer ml-1">×</button>
              </span>
            )}

            {selectedMinistry !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs bg-[rgba(11,61,120,0.5)] border border-[rgba(19,108,153,0.5)] text-[#e0d0ab] text-[11px] font-mono">
                <span>{selectedMinistry.replace('Ministry of ', '')}</span>
                <button onClick={() => setSelectedMinistry('ALL')} className="hover:text-white cursor-pointer ml-1">×</button>
              </span>
            )}

            {timePreset !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs bg-[rgba(11,61,120,0.5)] border border-[rgba(19,108,153,0.5)] text-[#e0d0ab] text-[11px] font-mono">
                <span>Time: {timePreset === 'TODAY' ? 'Today' : timePreset === 'WEEK' ? 'Past 7 Days' : timePreset === 'MONTH' ? 'Past 30 Days' : 'Custom'}</span>
                <button onClick={() => applyTimePreset('ALL')} className="hover:text-white cursor-pointer ml-1">×</button>
              </span>
            )}

            {trustFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs bg-[rgba(11,61,120,0.5)] border border-[rgba(19,108,153,0.5)] text-[#e0d0ab] text-[11px] font-mono">
                <span>{trustFilter === 'HIGH_GROUNDING' ? 'Grounding ≥90%' : 'Contested'}</span>
                <button onClick={() => setTrustFilter('ALL')} className="hover:text-white cursor-pointer ml-1">×</button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs bg-[rgba(11,61,120,0.5)] border border-[rgba(19,108,153,0.5)] text-[#e0d0ab] text-[11px] font-mono">
                <span>"{searchQuery}"</span>
                <button onClick={() => setSearchQuery('')} className="hover:text-white cursor-pointer ml-1">×</button>
              </span>
            )}

            <button
              onClick={resetAllFilters}
              className="text-[10px] font-mono text-[#8fa2bd] hover:text-[#e0d0ab] underline cursor-pointer ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Loading Skeleton ── */}
      {loading ? (
        <div className="space-y-6">
          {/* Hero skeleton */}
          <div className="p-8 bg-zinc-900/20 border border-zinc-800 rounded-sm animate-pulse space-y-4">
            <div className="h-4 w-32 bg-zinc-800 rounded" />
            <div className="h-8 w-3/4 bg-zinc-800 rounded" />
            <div className="space-y-2 pt-2">
              <div className="h-3.5 w-full bg-zinc-800/60 rounded" />
              <div className="h-3.5 w-5/6 bg-zinc-800/60 rounded" />
            </div>
          </div>
          {/* List skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="p-5 bg-zinc-900/10 border border-zinc-800/60 rounded-sm animate-pulse space-y-3">
                <div className="h-3.5 w-24 bg-zinc-800 rounded" />
                <div className="h-5 w-4/5 bg-zinc-800 rounded" />
                <div className="h-3 w-full bg-zinc-800/50 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : displayedItems.length === 0 ? (
        /* ── Empty State ── */
        <div className="flex flex-col items-center justify-center p-16 border border-dashed border-zinc-800 rounded-sm bg-zinc-900/10 text-center font-sans">
          <Inbox className="w-10 h-10 text-zinc-600 mb-3" />
          <h3 className="font-serif text-sm font-bold tracking-tight text-stone-200 mb-1">
            No Dispatches Ingested For Selected Parameters
          </h3>
          <p className="text-zinc-500 text-xs max-w-md mx-auto mb-4">
            Try adjusting your search keywords, switching category tabs, or clearing your date filters.
          </p>
          <button
            onClick={resetAllFilters}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-[#e0d0ab] text-xs font-sans rounded-sm hover:border-[#e0d0ab] transition-all cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        /* ── Editorial Content Stream ── */
        <div className="space-y-8">
          {/* PRS Legislative Research Vault Banner */}
          {(activeCategoryTab === 'PRS' || selectedSource === 'PRS') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-gradient-to-r from-[rgba(30,15,65,0.8)] via-[rgba(7,30,70,0.7)] to-[rgba(4,25,54,0.85)] border border-[rgba(168,85,247,0.4)] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-2.5 rounded-xs bg-[rgba(168,85,247,0.15)] border border-[rgba(168,85,247,0.35)] text-[#c084fc] shrink-0 shadow-sm">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs bg-[#e0d0ab] text-[#072e63] uppercase tracking-wider shadow-sm">
                      PRS LEGISLATIVE RESEARCH VAULT
                    </span>
                    <span className="text-xs font-mono text-[#e0d0ab]">
                      {displayedItems.length} Parliamentary & Statutory Dossiers
                    </span>
                  </div>
                  <p className="text-xs text-[#9fb0c8] mt-1 leading-relaxed">
                    Dedicated statutory and policy intelligence archive. Contains deep analytical breakdowns of Parliamentary Bills, Acts, Standing Committee reports, and constitutional doctrines, isolated from the daily breaking news feed.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveCategoryTab('ALL');
                  setSelectedSource('ALL');
                }}
                className="px-3.5 py-1.5 rounded-xs bg-[rgba(4,25,54,0.8)] hover:bg-[rgba(11,61,120,0.6)] border border-[rgba(19,108,153,0.4)] hover:border-[#e0d0ab] text-[#e0d0ab] text-xs font-mono uppercase tracking-wider whitespace-nowrap cursor-pointer transition-colors shrink-0"
              >
                Daily Signals [×]
              </button>
            </motion.div>
          )}

          {/* 1. LEAD STORY (HERO DISPATCH) */}
          {leadItem && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={prefersReducedMotion ? undefined : { y: -3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-gradient-to-br from-[rgba(4,25,54,0.85)] via-[rgba(7,46,99,0.55)] to-[rgba(4,25,54,0.9)] border border-[rgba(19,108,153,0.5)] hover:border-[#e0d0ab]/70 rounded-xs p-6 sm:p-8 relative overflow-hidden shadow-[0_16px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl group font-sans"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap font-sans">
                  <span className="px-2.5 py-0.5 bg-[#e0d0ab] text-[#072e63] text-[10px] font-mono font-bold uppercase tracking-wider rounded-xs shadow-sm">
                    LEAD SIGNAL
                  </span>
                  <span className="px-2.5 py-0.5 bg-[rgba(11,61,120,0.35)] text-[#e0d0ab] text-[10px] font-mono uppercase tracking-wider rounded-xs border border-[rgba(19,108,153,0.4)]">
                    {leadItem.ministry}
                  </span>
                  <span className="text-[#8fa2bd] text-[10px] font-mono uppercase">
                    {leadItem.source}
                  </span>
                  <GroundingBadge grounding={leadItem.summary?.grounding} verificationMethod={leadItem.summary?.verification_method} />
                </div>

                {leadItem.created_at && (
                  <span className="text-[11px] font-mono text-[#8fa2bd] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#0194a8]" />
                    {new Date(leadItem.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>

              {/* Lead Headline */}
              <motion.h2
                layoutId={`dossier-headline-${leadItem.id}`}
                onClick={() => setSelectedDossier(leadItem)}
                className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#e8e0cf] group-hover:text-[#e0d0ab] transition-colors leading-tight mb-4 cursor-pointer"
              >
                {leadItem.headline}
              </motion.h2>

              {/* Curated Bullets */}
              {leadItem.summary?.bullets && leadItem.summary.bullets.length > 0 && (
                <div className="space-y-2 mb-4 max-w-4xl">
                  {leadItem.summary.bullets.slice(0, 3).map((bullet, idx) => {
                    const claim = (leadItem.summary?.claims || []).find((c) => c.text?.trim() === bullet?.trim()) || (leadItem.summary?.claims || [])[idx];
                    return (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#9fb0c8] font-sans leading-relaxed">
                        <span className="text-[#0194a8] font-bold mt-0.5 select-none text-[11px]">&bull;</span>
                        <div className="flex-1 min-w-0">
                          <span>{bullet}</span>
                          {claim && <span className="inline-block ml-1.5 align-middle"><SourceAnchor claim={claim} /></span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Contested claim comparison */}
              <ContestedCard contested={leadItem.summary?.contested} />

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[rgba(19,108,153,0.35)] font-sans">
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={() => toggleBookmark(leadItem.id || '')}
                    disabled={savingArticleIds.has(leadItem.id || '')}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.8 }}
                    className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                      savedArticleIds.has(leadItem.id || '')
                        ? 'text-emerald-400 hover:text-emerald-300'
                        : 'text-[#8fa2bd] hover:text-[#e0d0ab]'
                    }`}
                  >
                    <motion.span
                      key={savedArticleIds.has(leadItem.id || '') ? 'on' : 'off'}
                      initial={prefersReducedMotion ? undefined : { scale: 0.6 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      className="inline-flex"
                    >
                      <Bookmark
                        className={`w-4 h-4 ${
                          savedArticleIds.has(leadItem.id || '') ? 'fill-emerald-400 text-emerald-400' : 'text-current'
                        }`}
                      />
                    </motion.span>
                    <span>{savedArticleIds.has(leadItem.id || '') ? 'Saved to Ledger' : 'Save Brief'}</span>
                  </motion.button>

                  <button
                    onClick={() => setSelectedDossier(leadItem)}
                    className="text-xs font-mono text-[#8fa2bd] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>Read Full Brief</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#0194a8]" />
                  </button>
                </div>

                {leadItem.url && (
                  <a
                    href={leadItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-[#e0d0ab] hover:underline cursor-pointer"
                  >
                    <span>Gov Source</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </motion.div>
          )}

          {/* 2. CHRONOLOGICAL GAZETTE FEED */}
          <div>
            <div className="flex items-center justify-between border-b border-[rgba(19,108,153,0.35)] pb-3 mb-6 font-sans">
              <h3 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab] flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#0194a8]" />
                <span>Latest Briefs <span className="font-mono">({displayedItems.length})</span></span>
              </h3>
              <span className="text-[10px] font-mono text-[#8fa2bd]">
                Page <span className="font-mono">{page + 1}</span> &bull; Sorted by Recency
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans">
              {standardItems.map((item, idx) => {
                const articleId = item.id || `item-${idx}`;
                const isSaved = savedArticleIds.has(articleId);

                return (
                  <motion.div
                    key={articleId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.012 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3), type: 'spring', stiffness: 340, damping: 30 }}
                    className="bg-[rgba(4,25,54,0.7)] hover:bg-[rgba(7,36,75,0.8)] border border-[rgba(19,108,153,0.35)] hover:border-[#e0d0ab]/50 p-5 rounded-xs flex flex-col justify-between transition-all duration-200 group backdrop-blur-xl shadow-md"
                  >
                    <div>
                      {/* Meta Tags */}
                      <div className="flex items-center justify-between gap-2 mb-3 font-sans">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 bg-[rgba(11,61,120,0.3)] text-[#e0d0ab] text-[10px] font-mono uppercase tracking-wider rounded-xs border border-[rgba(19,108,153,0.35)] truncate max-w-[180px]">
                            {item.ministry}
                          </span>
                          <GroundingBadge grounding={item.summary?.grounding} verificationMethod={item.summary?.verification_method} />
                        </div>
                        {item.created_at && (
                          <span className="text-[10px] font-mono text-[#8fa2bd]">
                            {new Date(item.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        )}
                      </div>

                      {/* Headline */}
                      <motion.h4
                        layoutId={`dossier-headline-${articleId}`}
                        onClick={() => setSelectedDossier(item)}
                        className="font-serif text-sm font-bold text-[#e8e0cf] group-hover:text-[#e0d0ab] transition-colors leading-snug mb-3 cursor-pointer"
                      >
                        {item.headline}
                      </motion.h4>

                      {/* Summary bullets */}
                      {item.summary?.bullets && item.summary.bullets.length > 0 && (
                        <ul className="space-y-1.5 mb-3">
                          {item.summary.bullets.slice(0, 2).map((b, bIdx) => {
                            const claim = (item.summary?.claims || []).find((c) => c.text?.trim() === b?.trim()) || (item.summary?.claims || [])[bIdx];
                            return (
                              <li key={bIdx} className="text-xs text-[#9fb0c8] font-sans leading-relaxed flex items-start gap-2">
                                <span className="text-[#0194a8] font-bold mt-0.5 select-none text-[10px]">•</span>
                                <div className="flex-1 min-w-0">
                                  <span className="line-clamp-2 inline">{b}</span>
                                  {claim && <span className="inline-block ml-1.5 align-middle"><SourceAnchor claim={claim} /></span>}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {/* Contested claim comparison */}
                      <ContestedCard contested={item.summary?.contested} />
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-[rgba(19,108,153,0.3)] text-xs font-sans">
                      <motion.button
                        onClick={() => toggleBookmark(articleId)}
                        disabled={savingArticleIds.has(articleId)}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.8 }}
                        className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                          isSaved ? 'text-emerald-400' : 'text-[#8fa2bd] hover:text-[#e0d0ab]'
                        }`}
                      >
                        <motion.span
                          key={isSaved ? 'on' : 'off'}
                          initial={prefersReducedMotion ? undefined : { scale: 0.6 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                          className="inline-flex"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-emerald-400' : ''}`} />
                        </motion.span>
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                      </motion.button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedDossier(item)}
                          className="font-mono text-[11px] text-[#8fa2bd] hover:text-white transition-colors cursor-pointer"
                        >
                          Full Brief
                        </button>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[11px] text-[#e0d0ab] hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Source</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── Pagination ── */}
          {hasMore && (
            <div className="flex justify-center pt-8 font-sans">
              <button
                onClick={() => setPage((prev) => prev + 1)}
                className="px-8 py-3 bg-zinc-900 border border-zinc-800 hover:border-[#e0d0ab] text-stone-200 hover:text-[#e0d0ab] text-xs font-sans font-bold uppercase tracking-wider rounded-sm transition-all shadow-md cursor-pointer"
              >
                [ Retrieve Older Dispatches ]
              </button>
            </div>
          )}
        </div>
      )}
      </>
      )}

        </div> {/* Close Main Intelligence Stream Container */}
      </div> {/* Close Main Layout Flex */}

      {/* ── Full Brief Slide-Over (Slide-Over) ── */}
      <AnimatePresence>
        {selectedDossier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDossier(null)}
            className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex justify-end font-sans"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl h-full bg-zinc-950 border-l border-zinc-800 p-6 sm:p-8 overflow-y-auto flex flex-col justify-between shadow-2xl"
            >
              <div className="space-y-6">
                {/* Modal Top Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-sans uppercase tracking-wider text-[#e0d0ab] font-medium">
                      Full Brief
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedDossier(null)}
                    className="p-1.5 text-zinc-500 hover:text-stone-100 transition-colors bg-zinc-900 rounded-sm cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-2 font-sans">
                  <span className="px-2.5 py-1 bg-zinc-900 text-[#e0d0ab] text-xs font-sans font-semibold rounded-sm border border-zinc-800">
                    {selectedDossier.ministry}
                  </span>
                  <span className="px-2.5 py-1 bg-zinc-900 text-zinc-400 text-xs font-sans rounded-sm border border-zinc-800">
                    {selectedDossier.source}
                  </span>
                  <GroundingBadge grounding={selectedDossier.summary?.grounding} verificationMethod={selectedDossier.summary?.verification_method} />
                  {(selectedDossier.summary?.tags || []).map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-[#e0d0ab]/10 text-[#e0d0ab] text-[10px] font-sans font-semibold uppercase tracking-wider rounded-sm border border-[#e0d0ab]/20">
                      {t}
                    </span>
                  ))}
                  {selectedDossier.created_at && (
                    <span className="text-xs font-mono text-zinc-500">
                      {new Date(selectedDossier.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                {/* Title — morphs in from whichever card/hero headline was clicked via the shared layoutId */}
                <motion.h2
                  layoutId={`dossier-headline-${selectedDossier.id}`}
                  className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight"
                >
                  {selectedDossier.headline}
                </motion.h2>

                {/* Structured Synthesis */}
                <div className="space-y-4 pt-2 font-sans">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab]">
                      Key Policy Vectors & Exam Insights
                    </h4>
                    {typeof selectedDossier.summary?.grounding === 'number' && (
                      <span className="text-[10px] font-mono text-zinc-500">
                        Evidence Ledger Verified
                      </span>
                    )}
                  </div>
                  <div className="space-y-3 pl-3 border-l-2 border-[#e0d0ab]/30">
                    {selectedDossier.summary?.bullets?.map((bullet, idx) => {
                      const claim = (selectedDossier.summary?.claims || []).find((c) => c.text?.trim() === bullet?.trim()) || (selectedDossier.summary?.claims || [])[idx];
                      return (
                        <p key={idx} className="text-sm text-zinc-300 font-sans leading-relaxed">
                          {bullet}
                          {claim && <SourceAnchor claim={claim} />}
                        </p>
                      );
                    })}
                  </div>
                </div>

                {/* Contested Claim Disagreement (if present) */}
                <ContestedCard contested={selectedDossier.summary?.contested} />

                {/* Examination Context & Pointers */}
                {(selectedDossier.summary?.prelims || selectedDossier.summary?.mains) ? (
                  <div className="space-y-2.5 font-sans pt-2">
                    {selectedDossier.summary.prelims && (
                      <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-sm space-y-1">
                        <span className="text-[10px] font-sans uppercase text-[#e0d0ab] font-bold flex items-center gap-1">
                          <Zap className="w-3 h-3 text-[#e0d0ab]" /> Prelims Pointer
                        </span>
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                          {selectedDossier.summary.prelims}
                        </p>
                      </div>
                    )}
                    {selectedDossier.summary.mains && (
                      <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-sm space-y-1">
                        <span className="text-[10px] font-sans uppercase text-[#e0d0ab] font-bold flex items-center gap-1">
                          <ChevronRight className="w-3 h-3 text-[#e0d0ab]" /> Mains Perspective
                        </span>
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                          {selectedDossier.summary.mains}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-sm space-y-1 font-sans">
                    <span className="text-[10px] font-sans uppercase text-[#e0d0ab] font-bold">
                      Examination Context
                    </span>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                      Relevant for GS Paper II / III (Governance & Economic Framework) and Prelims Current Affairs. Recommended for revision before Mock Tests.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-6 mt-8 border-t border-zinc-800 font-sans">
                <button
                  onClick={() => toggleBookmark(selectedDossier.id || '')}
                  className={`inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider px-4 py-2 rounded-sm border transition-all cursor-pointer ${
                    savedArticleIds.has(selectedDossier.id || '')
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-[#e0d0ab]'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${savedArticleIds.has(selectedDossier.id || '') ? 'fill-emerald-400' : ''}`} />
                  <span>{savedArticleIds.has(selectedDossier.id || '') ? 'Saved to Profile' : 'Save Brief'}</span>
                </button>

                {selectedDossier.url && (
                  <a
                    href={selectedDossier.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#e0d0ab] text-zinc-950 font-sans text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-stone-100 transition-all cursor-pointer"
                  >
                    <span>Read Primary Source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PIB Digest Newspaper Modal ── */}
      <AnimatePresence>
        {showPibModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPibModal(false)}
            className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-sans"
          >
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-surface text-on-surface rounded-sm shadow-2xl overflow-hidden ${
                isLightMode ? 'light-theme' : ''
              }`}
            >
              {/* Masthead Bar */}
              <div className="flex-shrink-0 flex flex-col border-b border-primary-container/20 bg-surface-dim relative">
                <div className="flex items-center justify-between px-6 py-3.5 font-sans">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="font-serif text-sm font-bold tracking-tight uppercase text-on-surface">
                      PIB Intelligence Digest
                    </span>
                  </div>
                  <div className="flex items-center gap-4 font-sans">
                    {pibDigests.length > 0 && (
                      <span className="text-[10px] uppercase text-primary-container/70 hidden sm:inline-flex items-center gap-2">
                        <span className="font-mono">{activeDigestIndex + 1} / {pibDigests.length}</span>
                        <span className="w-1 h-1 rounded-full bg-primary-container/40" />
                        <span className="inline-flex items-center gap-1 font-sans">
                          <Clock className="w-3 h-3" />
                          <span className="font-mono">{activeDigestReadMinutes}</span> min read
                        </span>
                      </span>
                    )}
                    <motion.button
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.85, rotate: 25 }}
                      onClick={() => setIsLightMode(!isLightMode)}
                      className="text-primary-container/60 hover:text-on-surface transition-colors cursor-pointer"
                      title="Toggle Light / Dark reading mode"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={isLightMode ? 'moon' : 'sun'}
                          initial={prefersReducedMotion ? undefined : { rotate: -90, opacity: 0 }}
                          animate={{ rotate: 0, opacity: 1 }}
                          exit={prefersReducedMotion ? undefined : { rotate: 90, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="inline-flex"
                        >
                          {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                        </motion.span>
                      </AnimatePresence>
                    </motion.button>
                    <motion.button
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.85 }}
                      onClick={() => setShowPibModal(false)}
                      className="font-sans text-xs font-bold text-primary-container/60 hover:text-on-surface transition-colors cursor-pointer"
                    >
                      ✕
                    </motion.button>
                  </div>
                </div>
                {/* Reading Progress */}
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary-container/10">
                  <div
                    className="h-full bg-primary transition-all duration-150 ease-out"
                    style={{ width: `${scrollProgress}%` }}
                  />
                </div>
              </div>

              {/* Scrollable, swipeable Newspaper Body — drag left/right (touch or mouse) to turn
                  editions, exactly like turning through a physical brief; arrow keys and the
                  PREV/NEXT dock below cover keyboard and desktop-pointer users. */}
              <div
                ref={readerBodyRef}
                className="overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar relative"
                onScroll={handleScroll}
              >
                {pibDigests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-16 text-center">
                    <Inbox className="w-8 h-8 text-primary-container/30 mb-4" />
                    <p className="text-primary-container/50 font-sans text-sm tracking-widest uppercase">
                      No PIB digests ingested yet.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout" custom={dragDirection} initial={false}>
                    <motion.div
                      key={activeDigestIndex}
                      custom={dragDirection}
                      variants={prefersReducedMotion ? undefined : editionVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ x: { type: 'spring', stiffness: 320, damping: 34 }, opacity: { duration: 0.15 } }}
                      drag={pibDigests.length > 1 ? 'x' : false}
                      dragDirectionLock
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.55}
                      style={{ x: editionDragX }}
                      onDragEnd={handleEditionDragEnd}
                      className="cursor-grab active:cursor-grabbing font-sans"
                    >
                      <div className="px-8 pt-10 pb-6 text-center border-b border-primary-container/10">
                        <p className="font-sans text-[10px] font-medium tracking-[0.15em] uppercase text-primary-container mb-3">
                          Press Information Bureau &bull; Government of India
                          {pibDigests[activeDigestIndex]?.date && (
                            <>
                              {' | '}
                              <span className="font-mono">
                                {new Date(pibDigests[activeDigestIndex].date).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                }).toUpperCase()}
                              </span>
                            </>
                          )}
                        </p>
                        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-on-surface mb-6 max-w-3xl mx-auto">
                          {pibDigests[activeDigestIndex]?.title || 'Daily PIB Digest'}
                        </h2>
                        <div className="h-[2px] w-full max-w-md mx-auto bg-primary-container/40 mb-1" />
                      </div>

                      <div className="px-8 py-10 w-full">
                        <div className="multi-column text-on-surface-variant first-p-drop-cap">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeSanitize]}
                            components={{
                              p: ({ node, ...props }) => <p className="font-serif text-[15px] leading-[1.7] mb-5 text-justify" {...props} />,
                              h1: ({ node, ...props }) => <h1 className="font-serif text-[22px] font-bold text-primary border-b border-primary-container/30 pb-2 mb-4 mt-6 break-inside-avoid" {...props} />,
                              h2: ({ node, ...props }) => <h2 className="font-serif text-[18px] font-bold text-primary border-b border-primary-container/20 pb-2 mb-4 mt-5 break-inside-avoid" {...props} />,
                              h3: ({ node, ...props }) => <h3 className="font-serif text-[16px] font-bold text-on-surface mb-2 mt-4 break-inside-avoid" {...props} />,
                              ul: ({ node, ...props }) => <ul className="font-serif list-square pl-5 mb-5 mt-2 text-[14px] leading-[1.7]" {...props} />,
                              ol: ({ node, ...props }) => <ol className="font-serif list-decimal pl-5 mb-5 mt-2 text-[14px] leading-[1.7]" {...props} />,
                              li: ({ node, ...props }) => <li className="mb-2 pl-1" {...props} />,
                              strong: ({ node, ...props }) => <strong className="text-primary font-semibold" {...props} />,
                              blockquote: ({ node, ...props }) => <blockquote className="font-serif border-l-[3px] border-primary-container/50 pl-4 py-1 italic my-5 text-on-surface-variant break-inside-avoid" {...props} />,
                              table: ({ node, ...props }) => <div className="overflow-x-auto w-full mb-6 border border-primary-container/30 break-inside-avoid shadow-sm"><table className="w-full font-mono text-[11px] border-collapse bg-surface-dim/30" {...props} /></div>,
                              thead: ({ node, ...props }) => <thead className="bg-surface-container-highest font-sans" {...props} />,
                              th: ({ node, ...props }) => <th className="font-sans text-primary-container font-bold uppercase tracking-wider border border-primary-container/30 p-2.5 text-left text-[11px]" {...props} />,
                              td: ({ node, ...props }) => <td className="font-mono border border-primary-container/20 p-2.5" {...props} />,
                            }}
                          >
                            {pibDigests[activeDigestIndex]?.content || 'No content available.'}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              {/* Edition dot navigator — animated active pill, tap to jump directly to an edition.
                  Capped to a reasonable count so a deep archive doesn't produce an unbounded row. */}
              {pibDigests.length > 1 && pibDigests.length <= 12 && (
                <LayoutGroup id="pib-edition-dots">
                  <div className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-primary-container/10 bg-surface-dim font-sans">
                    {pibDigests.map((d, i) => (
                      <button
                        key={d.id}
                        onClick={() => goToEdition(i)}
                        aria-label={`Go to edition ${i + 1}`}
                        className="relative w-6 h-3 flex items-center justify-center cursor-pointer"
                      >
                        {i === activeDigestIndex ? (
                          <motion.span
                            layoutId="pib-edition-active-dot"
                            className="absolute inset-x-0 h-1.5 rounded-full bg-primary"
                            transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0.3, duration: 0.4 }}
                          />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-container/30 hover:bg-primary-container/50 transition-colors" />
                        )}
                      </button>
                    ))}
                  </div>
                </LayoutGroup>
              )}

              {/* Navigation Dock */}
              <div className="flex-shrink-0 flex items-center justify-between px-8 py-3.5 border-t border-primary-container/20 bg-surface-dim font-sans">
                <motion.button
                  whileTap={prefersReducedMotion || activeDigestIndex === 0 ? undefined : { scale: 0.94, x: -2 }}
                  onClick={() => goToEdition(activeDigestIndex - 1)}
                  disabled={activeDigestIndex === 0}
                  className="font-sans text-[10px] font-bold tracking-wider uppercase text-primary-container hover:text-on-surface transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-3 h-3" />
                  PREVIOUS EDITION
                </motion.button>
                <div className="font-sans text-[10px] text-primary-container/60 tracking-wider">
                  EDITION <span className="font-mono">{activeDigestIndex + 1}</span> OF <span className="font-mono">{pibDigests.length}</span>
                </div>
                <motion.button
                  whileTap={prefersReducedMotion || activeDigestIndex === pibDigests.length - 1 ? undefined : { scale: 0.94, x: 2 }}
                  onClick={() => goToEdition(activeDigestIndex + 1)}
                  disabled={activeDigestIndex === pibDigests.length - 1}
                  className="font-sans text-[10px] font-bold tracking-wider uppercase text-primary-container hover:text-on-surface transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
                >
                  NEXT EDITION
                  <ChevronRight className="w-3 h-3" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast Notifications ── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[700] px-6 py-3 bg-zinc-900 border border-zinc-700/80 rounded-sm shadow-2xl"
          >
            <p className="text-xs text-stone-200 font-sans whitespace-nowrap">{toastMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Sync Toast */}
      <AnimatePresence>
        {showBackgroundToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[700] px-6 py-3 bg-zinc-900 border border-emerald-800/80 rounded-sm shadow-2xl"
          >
            <p className="text-xs text-emerald-300 font-sans whitespace-nowrap flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Scraper dispatched. New intelligence signals will populate momentarily.</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
