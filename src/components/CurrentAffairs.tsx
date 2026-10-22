import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchWithAuth } from '../lib/api';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion, useMotionValue, useTransform, animate, type PanInfo } from 'motion/react';
import {
  Inbox,
  RefreshCw,
  X,
  Sun,
  Moon,
  Clock,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Scale,
} from 'lucide-react';
import { RadarCardExtras } from './radar/RadarCardExtras';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import DailyEdition from './DailyEdition';
import PolicyBrief from './PolicyBrief';
import NewsSignalCard from './NewsSignalCard';
import NewsSignalGrid from './NewsSignalGrid';
import DailyBriefHeader, { DailyBriefFilters } from './DailyBriefHeader';
import { getStoredVulnerabilityIndex } from '../lib/vulnerabilityIndex';
import { EXAMINER_OPERATORS, type ExaminerOperatorType } from '../types';
import { resolveArticleExamInsights } from '../lib/article-exam-insights';

import prsVaultDossiers from '../data/prs-vault-dossiers.json';
import type { CandidatePreferences } from '../types';
import { matchOptionalRelevance } from '../lib/candidatePreferences';
import {
  slugify,
  getArticleUrl,
  getCanonicalArticleUrl,
  updateDocumentMeta,
  ROUTE_META_DEFAULTS,
} from '../lib/seo';
import {
  type VerifiedClaim,
  type ContestedClaim,
} from './TrustUI';
import { PibLogo } from './SourceLogos';
import { GroundingExplainerModal } from './GroundingExplainerModal';

interface RevisionTargets {
  data_metric?: string;
  nodal_body?: string;
  statutory_legal?: string;
}

interface MainsAnalysis {
  context?: string;
  core_implications?: string;
  way_forward?: string;
}

interface StaticLinkage {
  concept: string;
  textbook_context: string;
}

interface ThematicPillar {
  title: string;
  description: string;
}

export interface CurrentAffairsItem {
  id?: string;
  source: string;
  ministry: string;
  headline: string;
  url: string;
  primary_operator?: ExaminerOperatorType;
  node_id?: string;
  chain_id?: string;
  ring_depth?: number;
  entity_slugs?: string[];
  historical_twin?: {
    id: string;
    year: number;
    stem: string;
    primary_operator: ExaminerOperatorType;
    statutory_anchor?: string;
  };
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
    revision_targets?: RevisionTargets;
    thematic_pillars?: ThematicPillar[];
    mains_analysis?: MainsAnalysis;
    static_linkages?: StaticLinkage[];
    prelims_trap_radar?: string;
    prelims_relevance?: 'HIGH' | 'MEDIUM' | 'LOW';
    mains_relevance?: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  created_at?: string;
}

export function getDispatchOperator(item: CurrentAffairsItem): ExaminerOperatorType {
  if (item.primary_operator) return item.primary_operator;
  const text = `${item.headline} ${item.summary?.bullets?.join(' ') || ''}`.toLowerCase();

  // 1. PSY_05_SCOPE_MUTATE: Outlays, multi-year timelines (FY27-32), percentages, targets, numbers
  if (/\b(\d+|crore|percent|percentage|fy\s*\d{2}|\d{4}[-–]\d{2,4}|target|outlay|allocation|threshold|increased|decreased|growth|tenure)\b/i.test(text)) {
    return 'PSY_05_SCOPE_MUTATE';
  }

  // 2. PSY_03_LEGAL_TIER: Constitutional, Statutory, Executive Resolution, or Section-8 Society status
  if (/\b(constitution|constitutional|statutory|act|bill|ordinance|resolution|section[- ]?8|cabinet resolution|treaty|court|schedule|tribunal)\b/i.test(text)) {
    return 'PSY_03_LEGAL_TIER';
  }

  // 3. PSY_02_QUAL_POLARITY: Restrictive determiners (only, all, every, never, strictly, mandatory)
  if (/\b(only|all|every|never|strictly|exclusively|prohibition|mandatory|immediate mandatory|immediate|none)\b/i.test(text)) {
    return 'PSY_02_QUAL_POLARITY';
  }

  // 4. PSY_01_INST_SWAP: Reserve strictly for dispatches with non-obvious nodal agencies, inter-ministerial SPVs, or regulatory overlaps
  if (/\b(nodal agency|implementing agency|spv|special purpose vehicle|birac|npci|nfra|dri|cbn|ism|india semiconductor mission|sebi vs rbi|cci|cag|regulatory overlap)\b/i.test(text)) {
    return 'PSY_01_INST_SWAP';
  }

  return 'PSY_04_CAUSAL_INV';
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
  candidatePreferences?: CandidatePreferences;
  onLaunchPractice?: (pillarOrSubject: string) => void;
  onLaunchConveyor?: () => void;
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
  { id: 'Governance', label: 'Polity & Cabinet', keywords: ['Cabinet', 'Prime Minister', 'Home Affairs', 'Law', 'Personnel', 'Parliament', 'Governance', 'Supreme Court', 'Judiciary'] },
  { id: 'Economy', label: 'Economy & RBI', keywords: ['Finance', 'Commerce', 'RBI', 'Corporate Affairs', 'NITI Aayog', 'Revenue', 'Economy', 'Budget', 'Tax'] },
  { id: 'SciTech', label: 'Science & Defence', keywords: ['Defence', 'Space', 'ISRO', 'Atomic Energy', 'Electronics', 'IT', 'Science', 'Technology', 'Missile', 'AI'] },
  { id: 'Environment', label: 'Climate & Ecology', keywords: ['Environment', 'Forest', 'Climate', 'Renewable', 'Earth Sciences', 'Agriculture', 'Water', 'Pollution', 'Wildlife'] },
  { id: 'Social', label: 'Social & Health', keywords: ['Health', 'Education', 'Social Justice', 'Women', 'Child', 'Tribal', 'Rural', 'Welfare', 'Caste'] },
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

export interface ParsedSyllabusTag {
  paper: string;
  topic: string;
  full: string;
}

export function parseSyllabusTag(rawTag: string): ParsedSyllabusTag {
  const clean = (rawTag || '').trim();
  if (!clean) return { paper: 'UPSC', topic: 'General Studies', full: clean };

  const match = clean.match(/^(GS[- ]?(?:I{1,3}|IV|[1-4])|CSAT|ESSAY|PRELIMS|MAINS)[:\s-]*(.*)/i);

  if (match) {
    let paper = match[1].toUpperCase().replace(/\s+/, '-');
    paper = paper
      .replace(/GS-?1\b/i, 'GS-I')
      .replace(/GS-?2\b/i, 'GS-II')
      .replace(/GS-?3\b/i, 'GS-III')
      .replace(/GS-?4\b/i, 'GS-IV');

    const remainder = match[2].trim();
    let topic = remainder;

    if (/SOCIAL SECTOR|HEALTH|EDUCATION|HUMAN RESOURCES/i.test(remainder)) {
      topic = 'Health & Social Sector';
    } else if (/SCIENCE AND TECHNOLOGY|APPLICATIONS IN EVERYDAY LIFE/i.test(remainder)) {
      topic = 'Science & Technology';
    } else if (/ENVIRONMENT|POLLUTION|BIODIVERSITY|CONSERVATION/i.test(remainder)) {
      topic = 'Ecology & Environment';
    } else if (/INDIAN CONSTITUTION|POLITY|PARLIAMENT|FEDERALISM/i.test(remainder)) {
      topic = 'Polity & Governance';
    } else if (/ECONOMIC DEVELOPMENT|INFLATION|GROWTH|FISCAL|AGRICULTURE/i.test(remainder)) {
      topic = 'Economy & Agriculture';
    } else if (/INTERNAL SECURITY|SECURITY CHALLENGES|DEFENCE|CYBER/i.test(remainder)) {
      topic = 'Internal Security';
    } else if (/INTERNATIONAL RELATIONS|BILATERAL|GLOBAL/i.test(remainder)) {
      topic = 'International Relations';
    } else if (/ETHICS|INTEGRITY|APTITUDE/i.test(remainder)) {
      topic = 'Ethics & Integrity';
    } else if (/DISASTER|DISASTER MANAGEMENT/i.test(remainder)) {
      topic = 'Disaster Management';
    } else if (remainder) {
      const firstChunk = remainder.split(/[-–;,]/)[0].trim();
      let formatted = firstChunk;
      if (formatted === formatted.toUpperCase() && formatted.length > 3) {
        formatted = formatted
          .toLowerCase()
          .split(' ')
          .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
          .join(' ');
      }
      topic = formatted.length > 24 ? formatted.slice(0, 22) + '…' : formatted;
    } else {
      topic = 'General Studies';
    }

    return { paper, topic, full: clean };
  }

  let formatted = clean;
  if (formatted === formatted.toUpperCase() && formatted.length > 3) {
    formatted = formatted
      .toLowerCase()
      .split(' ')
      .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ');
  }
  if (formatted.length > 22) formatted = formatted.slice(0, 20) + '…';

  return { paper: 'UPSC', topic: formatted, full: clean };
}

export default function CurrentAffairs({ userId, candidatePreferences, onLaunchPractice, onLaunchConveyor }: CurrentAffairsProps) {
  const [items, setItems] = useState<CurrentAffairsItem[]>([]);
  const vulnerabilityIndex = useMemo(() => getStoredVulnerabilityIndex(), []);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [syncCooldown, setSyncCooldown] = useState(0);

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
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [expandedContextIds, setExpandedContextIds] = useState<Set<string>>(() => new Set());
  interface UserTelemetrySummary {
    totalAttempts: number;
    worstOperatorBleed: number;
    worstBleedOperator: ExaminerOperatorType | null;
  }
  const [userTelemetry, setUserTelemetry] = useState<UserTelemetrySummary | null>(null);

  // Load candidate psyche autopsy for personal trap radar
  useEffect(() => {
    if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
      fetchWithAuth(`/api/analytics/examiner-psyche/user-autopsy/${userId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            const wb = json.data.worstBleedOperator;
            setUserTelemetry({
              totalAttempts: json.data.totalAttempts || 0,
              worstOperatorBleed: wb ? -Math.abs(wb.totalBleedMarks) : 0,
              worstBleedOperator: wb?.operator || null,
            });
          }
        })
        .catch(() => {});
    }
  }, [userId]);

  const hasSufficientTelemetry =
    Boolean(userTelemetry) &&
    (userTelemetry?.totalAttempts ?? 0) >= 3 &&
    (userTelemetry?.worstOperatorBleed ?? 0) < 0;

  const isPersonalBlindSpot = (operator?: ExaminerOperatorType | null) =>
    hasSufficientTelemetry &&
    Boolean(operator) &&
    userTelemetry?.worstBleedOperator === operator;

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
  const hasInitialMounted = useRef(false);

  // Deep-link inspection on mount & direct route synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('id') || params.get('article');

      if (pathname.includes('/daily-edition')) {
        setBriefViewMode('edition');
        if (pathname === '/daily-edition') {
          updateDocumentMeta(ROUTE_META_DEFAULTS.edition);
        }
      } else if (pathname.includes('/prs')) {
        setActiveCategoryTab('PRS');
        setSelectedSource('PRS');
        if (pathname === '/prs') {
          updateDocumentMeta(ROUTE_META_DEFAULTS.prs);
        }
      } else if (pathname.includes('/gs-1') || pathname.includes('/gs-i')) {
        setActiveCategoryTab('ALL');
        setSearchQuery('GS-1');
        updateDocumentMeta(ROUTE_META_DEFAULTS.gs1);
      } else if (pathname.includes('/gs-2') || pathname.includes('/gs-ii')) {
        setActiveCategoryTab('Governance');
        updateDocumentMeta(ROUTE_META_DEFAULTS.gs2);
      } else if (pathname.includes('/gs-3') || pathname.includes('/gs-iii')) {
        setActiveCategoryTab('Economy');
        updateDocumentMeta(ROUTE_META_DEFAULTS.gs3);
      } else if (pathname.includes('/gs-4') || pathname.includes('/gs-iv')) {
        setActiveCategoryTab('ALL');
        setSearchQuery('Ethics');
        updateDocumentMeta(ROUTE_META_DEFAULTS.gs4);
      } else if (pathname.includes('/ministry/')) {
        const mSlug = pathname.split('/ministry/')[1]?.split('?')[0];
        if (mSlug) {
          const rawWords = mSlug.split('-').filter(w => !['ministry', 'of', 'and', 'the', 'for'].includes(w));
          if (rawWords[0]) {
            setSearchQuery(rawWords[0]);
          }
        }
      }

      let resolvedId = targetId;
      if (!resolvedId && pathname.startsWith('/prs/')) {
        const seg = pathname.split('/')[2];
        if (seg) resolvedId = seg;
      } else if (!resolvedId && (pathname.startsWith('/intelligence/') || pathname.startsWith('/news/'))) {
        const seg = pathname.split('/')[2]?.split('?')[0];
        if (seg && !seg.startsWith('gs-') && seg !== 'ministry') {
          resolvedId = seg;
        }
      }

      if (resolvedId && !selectedDossier) {
        // First check PRS Vault
        const matchedPrs = (prsVaultDossiers as unknown as CurrentAffairsItem[]).find(
          (p) => p.id === resolvedId || slugify(p.headline) === resolvedId || slugify(p.id || '') === resolvedId
        );
        if (matchedPrs) {
          setSelectedDossier(matchedPrs);
          return;
        }

        // Check if already in items
        const matchedItem = items.find(
          (it) => it.id === resolvedId || slugify(it.headline) === resolvedId || slugify(it.id || '') === resolvedId
        );
        if (matchedItem) {
          setSelectedDossier(matchedItem);
          return;
        }

        // Fetch directly from Supabase
        (async () => {
          try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedId);
            let matchedData: CurrentAffairsItem | null = null;
            if (isUuid) {
              const { data, error } = await supabase
                .from('current_affairs')
                .select('*')
                .eq('id', resolvedId)
                .maybeSingle();
              if (!error && data) matchedData = data as CurrentAffairsItem;
            }
            if (!matchedData) {
              const { data, error } = await supabase
                .from('current_affairs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);
              if (!error && data) {
                const found = data.find((d: any) => slugify(d.headline) === resolvedId || d.id === resolvedId);
                if (found) matchedData = found as CurrentAffairsItem;
              }
            }
            if (matchedData) {
              setSelectedDossier(matchedData);
            }
          } catch (fetchErr) {
            console.warn('Failed to resolve deep-link dossier:', fetchErr);
          }
        })();
      }
    } catch {
      // ignore
    }
  }, [items]);

  // Synchronize browser URL bar and meta tags when a dossier opens or closes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedDossier) {
      hasInitialMounted.current = true;
      const artUrl = getArticleUrl(selectedDossier);
      if (window.location.pathname + window.location.search !== artUrl) {
        window.history.pushState(null, '', artUrl);
      }
      updateDocumentMeta({
        title: `${selectedDossier.headline} — UPSC Policy Intelligence & Prelims Analysis | Tark`,
        description: (selectedDossier.summary?.bullets || []).slice(0, 2).join(' ') || selectedDossier.summary?.prelims || selectedDossier.headline,
        canonicalPath: artUrl,
      });
    } else {
      // Only rewrite URL if the user previously had a dossier open and closed it
      if (!hasInitialMounted.current) {
        hasInitialMounted.current = true;
        return;
      }
      const isSubRoute = window.location.pathname.startsWith('/intelligence/gs-') || 
                         window.location.pathname.startsWith('/intelligence/ministry/') ||
                         window.location.pathname.startsWith('/daily-edition');
      if (isSubRoute) return;

      const fallbackPath = activeCategoryTab === 'PRS' ? '/prs' : '/intelligence';
      if (window.location.pathname.startsWith('/intelligence/') || window.location.pathname.startsWith('/prs/')) {
        window.history.pushState(null, '', fallbackPath);
        updateDocumentMeta(activeCategoryTab === 'PRS' ? ROUTE_META_DEFAULTS.prs : ROUTE_META_DEFAULTS.tracker);
      }
    }
  }, [selectedDossier?.id]);

  const handleShareArticle = async (item: CurrentAffairsItem, e?: React.MouseEvent, copyOnly = false) => {
    if (e) e.stopPropagation();
    const shareUrl = getCanonicalArticleUrl(item);
    const shareText = `${item.headline} (${item.source} · ${item.ministry})\nRead high-yield Prelims pointers and Mains analysis on Tark:`;

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setToastMsg('Link copied to clipboard! Share on Telegram or WhatsApp.');
        setTimeout(() => setToastMsg(''), 4000);
      } catch {
        // fallback
      }
    }

    if (navigator.share && !copyOnly) {
      try {
        await navigator.share({
          title: item.headline,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // ignore share cancellation
      }
    }
  };

  // Grounding Explainer Modal State
  const [groundingExplainerData, setGroundingExplainerData] = useState<{
    isOpen: boolean;
    grounding?: number;
    headline?: string;
    source?: string;
    sourceUrl?: string;
    claims?: VerifiedClaim[];
  }>({
    isOpen: false,
  });

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
          const supplementary = (prsVaultDossiers as unknown as CurrentAffairsItem[]).filter(
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
          void fetchPolicyData(false);
        }, 10000);
        setTimeout(() => setSyncSuccess(null), 5000);
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Sync error.');

      setSyncSuccess(true);
      await fetchPolicyData(false);
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
    } else if (activeCategoryTab === 'TRACK' && candidatePreferences) {
      list = list.filter((item) => {
        // 1. Check if matches candidate's optional subject
        const syn = matchOptionalRelevance(item.headline, item.summary?.bullets, candidatePreferences.optionalSubject);
        if (syn.matches) return true;

        // 2. Check if matches candidate's focus pillars
        const p = candidatePreferences.focusPillars || [];
        const text = (item.ministry + ' ' + item.headline + ' ' + (item.summary?.tags?.join(' ') || '')).toLowerCase();
        
        if (p.includes('gs2') && ['cabinet', 'prime minister', 'home affairs', 'law', 'personnel', 'parliament', 'governance', 'external affairs', 'supreme court', 'judiciary', 'rights', 'constitution'].some((k) => text.includes(k))) return true;
        if (p.includes('gs3') && ['finance', 'commerce', 'rbi', 'corporate affairs', 'niti aayog', 'revenue', 'economy', 'budget', 'tax', 'defence', 'space', 'isro', 'atomic', 'electronics', 'science', 'technology', 'environment', 'forest', 'climate', 'renewable', 'agriculture', 'water', 'security'].some((k) => text.includes(k))) return true;
        if (p.includes('gs1') && ['culture', 'heritage', 'monuments', 'history', 'geography', 'urban', 'society', 'women', 'child', 'tribal'].some((k) => text.includes(k))) return true;
        if (p.includes('gs4') && ['ethics', 'social justice', 'welfare', 'integrity', 'charter', 'administrative'].some((k) => text.includes(k))) return true;
        
        return false;
      });
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

  const categoryTabs = useMemo(() => {
    if (!candidatePreferences) return CATEGORY_TABS;
    const yearStr = candidatePreferences.targetYear === 'state-psc' ? 'PSC' : `'${candidatePreferences.targetYear.slice(2)}`;
    const trackTab = {
      id: 'TRACK',
      label: `🎯 For Your Track (${yearStr})`
    };
    return [CATEGORY_TABS[0], trackTab, ...CATEGORY_TABS.slice(1)];
  }, [candidatePreferences]);

  const resetAllFilters = () => {
    setSelectedMinistry('ALL');
    setSelectedSource('ALL');
    setTimePreset('ALL');
    setTrustFilter('ALL');
    setStartDate('');
    setEndDate('');
    setActiveCategoryTab('ALL');
    setSearchQuery('');
    setPage(0);
  };

  // Listen to Contextual Navigation Action Events dispatched from Vertical Nav Rail
  useEffect(() => {
    const handleBriefAction = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const action = customEvent.detail;
      if (action === 'prs') {
        setBriefViewMode('signals');
        setActiveCategoryTab('PRS');
        setSelectedSource('PRS');
      } else if (action === 'pib') {
        setShowPibModal(true);
      } else if (action === 'signals') {
        setBriefViewMode('signals');
        try {
          localStorage.setItem('tark_brief_view_mode', 'signals');
        } catch {
          /* ignore */
        }
      } else if (action === 'edition') {
        setBriefViewMode('edition');
        try {
          localStorage.setItem('tark_brief_view_mode', 'edition');
        } catch {
          /* ignore */
        }
      } else if (action === 'filters') {
        setBriefViewMode('signals');
        setIsFilterDrawerOpen((prev) => !prev);
      } else if (action === 'saved') {
        setBriefViewMode('signals');
        setActiveCategoryTab((prev) => (prev === 'SAVED' ? 'ALL' : 'SAVED'));
      }
    };

    window.addEventListener('tark:brief-action', handleBriefAction);
    return () => window.removeEventListener('tark:brief-action', handleBriefAction);
  }, []);

  const renderSignalCard = (item: CurrentAffairsItem, articleId: string, lead = false) => {
    const operator = getDispatchOperator(item);
    const operatorMeta = EXAMINER_OPERATORS[operator];
    const twin = item.historical_twin;
    const statutoryAnchor = twin?.statutory_anchor;
    const optional = candidatePreferences
      ? matchOptionalRelevance(item.headline, item.summary?.bullets, candidatePreferences.optionalSubject)
      : null;
    const examInsights = resolveArticleExamInsights(item);

    return (
      <NewsSignalCard
        key={articleId}
        item={item}
        articleId={articleId}
        lead={lead}
        saved={savedArticleIds.has(item.id || '')}
        saving={savingArticleIds.has(item.id || '')}
        contextOpen={expandedContextIds.has(articleId)}
        onToggleContext={() => setExpandedContextIds((current) => {
          const next = new Set(current);
          if (next.has(articleId)) next.delete(articleId);
          else next.add(articleId);
          return next;
        })}
        onOpen={() => setSelectedDossier(item)}
        onSave={() => { void toggleBookmark(item.id || ''); }}
        onShare={(event) => { void handleShareArticle(item, event); }}
        onGrounding={() => setGroundingExplainerData({
          isOpen: true,
          grounding: item.summary?.grounding,
          headline: item.headline,
          source: item.source,
          sourceUrl: item.url,
          claims: item.summary?.claims || [],
        })}
        examContext={(
          <div className="news-signal__exam-details">
            <dl className="news-signal__facts">
              {examInsights.status === 'ready' && examInsights.facts.length > 0 ? (
                <div>
                  <dt>What to remember</dt>
                  <dd>
                    <ul className="news-signal__insights-list">
                      {examInsights.facts.map((fact) => (
                        <li key={fact.id} className="news-signal__insight-item">
                          {fact.label && <strong className="news-signal__insight-label">{fact.label}: </strong>}
                          <span>{fact.statement}</span>
                          {fact.evidence?.length > 0 && fact.evidence[0].quote && (
                            <span
                              className="news-signal__evidence-tag"
                              title={`Source excerpt: "${fact.evidence[0].quote}"`}
                            >
                              · Source verified
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {examInsights.distinction && (
                      <div className="news-signal__insight-distinction">
                        <strong>Read carefully:</strong> {examInsights.distinction.statement}
                      </div>
                    )}
                  </dd>
                </div>
              ) : item.primary_operator ? (
                <div>
                  <dt>Exam focus</dt>
                  <dd>
                    <strong>{operatorMeta.label}</strong>{isPersonalBlindSpot(operator) && <strong> · Your blind spot</strong>}
                  </dd>
                </div>
              ) : null}
              {optional?.matches && <div><dt>Optional subject</dt><dd>{optional.optionalName} · Paper 2 anchor</dd></div>}
            </dl>
            <RadarCardExtras dispatchId={item.id} nodeId={item.node_id} variant="signal" />
            {twin && (
              <section className="news-signal__historical">
                <h4>Historical twin · Prelims {twin.year}</h4>
                <blockquote>{twin.stem}</blockquote>
                {statutoryAnchor && <p><strong>Anchor:</strong> {statutoryAnchor}</p>}
              </section>
            )}
          </div>
        )}
      />
    );
  };

  return (
    <div className="w-full min-h-screen text-primary font-sans pb-24 md:pl-6">
      
      <DailyBriefHeader
        count={items.length}
        metrics={vulnerabilityIndex}
        onInspectGrounding={() => setGroundingExplainerData({
          isOpen: true,
          grounding: leadItem?.summary?.grounding || 0.67,
          headline: leadItem?.headline || 'Government Policy Gazette',
          source: leadItem?.source || 'Official Wire',
          claims: leadItem?.summary?.claims || [],
        })}
        onLaunchPractice={onLaunchPractice ? () => onLaunchPractice('CURRENT_AFFAIRS') : undefined}
        onLaunchConveyor={onLaunchConveyor}
      />
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

      {/* ── MODE 1: FULL DAILY EDITION READER (When selected from sidebar) ── */}
      {briefViewMode === 'edition' && (
        <div className="max-w-4xl mx-auto pt-2">
          <DailyEdition 
            userId={userId} 
            compactModeDefault={false} 
            onOpenArenaQuiz={() => onLaunchPractice?.('CURRENT_AFFAIRS')}
          />
        </div>
      )}

      {/* ── MODE 2: SIGNAL DECK & POLICY EXPLORER ── */}
      {briefViewMode === 'signals' && (
        <>
          <DailyBriefFilters
            categories={categoryTabs}
            ministries={[...TOP_MINISTRIES, ...ministries]}
            ministryCounts={items.reduce<Record<string, number>>((counts, item) => {
              counts[item.ministry] = (counts[item.ministry] || 0) + 1;
              return counts;
            }, {})}
            indexedCount={items.length}
            sources={sources}
            category={activeCategoryTab}
            source={selectedSource}
            ministry={selectedMinistry}
            time={timePreset}
            trust={trustFilter}
            startDate={startDate}
            endDate={endDate}
            search={searchQuery}
            open={isFilterDrawerOpen}
            resultCount={displayedItems.length}
            loading={loading}
            onCategory={(value) => { setActiveCategoryTab(value); setPage(0); }}
            onSource={(value) => { setSelectedSource(value); setPage(0); }}
            onMinistry={(value) => { setSelectedMinistry(value); setPage(0); }}
            onTime={(value) => { applyTimePreset(value); setPage(0); }}
            onTrust={setTrustFilter}
            onStartDate={(value) => { setStartDate(value); setPage(0); }}
            onEndDate={(value) => { setEndDate(value); setPage(0); }}
            onSearch={setSearchQuery}
            onToggle={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            onReset={resetAllFilters}
          />
      {/* ── Loading Skeleton ── */}
      {loading ? (
        <div className="space-y-6">
          {/* Hero skeleton */}
          <div className="p-8 bg-surface-elevated/20 border border-border rounded-sm animate-pulse space-y-4">
            <div className="h-4 w-32 bg-surface-elevated rounded" />
            <div className="h-8 w-3/4 bg-surface-elevated rounded" />
            <div className="space-y-2 pt-2">
              <div className="h-3.5 w-full bg-surface-elevated/60 rounded" />
              <div className="h-3.5 w-5/6 bg-surface-elevated/60 rounded" />
            </div>
          </div>
          {/* List skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="p-5 bg-surface-elevated/10 border border-border/60 rounded-sm animate-pulse space-y-3">
                <div className="h-3.5 w-24 bg-surface-elevated rounded" />
                <div className="h-5 w-4/5 bg-surface-elevated rounded" />
                <div className="h-3 w-full bg-surface-elevated/50 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : displayedItems.length === 0 ? (
        /* ── Empty State ── */
        <div className="flex flex-col items-center justify-center p-16 border border-dashed border-border rounded-sm bg-surface-elevated/10 text-center font-sans">
          <Inbox className="w-10 h-10 text-muted mb-3" />
          <h3 className="font-serif text-sm font-bold tracking-tight text-primary mb-1">
            {activeCategoryTab === 'SAVED' ? 'No saved briefs yet' : 'No briefs match these filters'}
          </h3>
          <p className="text-secondary text-sm max-w-md mx-auto mb-4">
            {activeCategoryTab === 'SAVED'
              ? 'Save a brief while reading to keep it in your reading list.'
              : 'Try another search, choose a different topic in Filters, or reset your date range.'}
          </p>
          <button
            onClick={resetAllFilters}
            className="px-4 py-2 bg-surface-elevated border border-border text-[#e0d0ab] text-xs font-sans rounded-sm hover:border-[#e0d0ab] transition-all cursor-pointer"
          >
            {activeCategoryTab === 'SAVED' ? 'Browse latest briefs' : 'Reset all filters'}
          </button>
        </div>
      ) : !selectedDossier ? (
        /* ── Editorial Content Stream ── */
        <div className="news-signal-stream">
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

          {leadItem && renderSignalCard(leadItem, leadItem.id || leadItem.url || 'lead', true)}

          {standardItems.length > 0 && (
            <section aria-labelledby="latest-briefs-heading">
              <div className="news-signal-feed-heading">
                <h2 id="latest-briefs-heading">More briefs <span>({standardItems.length})</span></h2>
                <span>Latest first</span>
              </div>
              <NewsSignalGrid>
                {standardItems.map((item, index) =>
                  renderSignalCard(item, item.id || item.url || `item-${index}`)
                )}
              </NewsSignalGrid>
            </section>
          )}

          {/* ── Pagination ── */}
          {hasMore && (
            <div className="flex justify-center pt-8 font-sans">
              <button
                onClick={() => setPage((prev) => prev + 1)}
                className="px-8 py-3 bg-surface-elevated border border-border hover:border-[#e0d0ab] text-primary hover:text-[#e0d0ab] text-xs font-sans font-bold uppercase tracking-wider rounded-sm transition-all shadow-md cursor-pointer"
              >
                [ Retrieve Older Dispatches ]
              </button>
            </div>
          )}
        </div>
      ) : null}
      </>
      )}

      {/* Full brief: a continuous, navigable study note. */}
      <AnimatePresence>
        {selectedDossier && (
          <PolicyBrief
            key={selectedDossier.id || selectedDossier.url}
            item={selectedDossier}
            syllabusTags={(selectedDossier.summary?.tags || []).map(parseSyllabusTag)}
            saved={savedArticleIds.has(selectedDossier.id || '')}
            saving={savingArticleIds.has(selectedDossier.id || '')}
            onClose={() => {
              setSelectedDossier(null);
              const cleanPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/prs') ? '/prs' : '/intelligence';
              window.history.pushState({}, '', cleanPath);
            }}
            onSave={() => toggleBookmark(selectedDossier.id || '')}
            onShare={() => handleShareArticle(selectedDossier, undefined, true)}
            onPractice={onLaunchPractice ? () => {
              const tag = selectedDossier.summary?.tags?.[0] || 'CURRENT_AFFAIRS';
              setSelectedDossier(null);
              onLaunchPractice(tag);
            } : undefined}
            onLaunchConveyor={onLaunchConveyor ? () => {
              setSelectedDossier(null);
              onLaunchConveyor();
            } : undefined}
            onInspectGrounding={() => setGroundingExplainerData({
              isOpen: true,
              grounding: selectedDossier.summary?.grounding,
              headline: selectedDossier.headline,
              source: selectedDossier.source,
              claims: selectedDossier.summary?.claims || [],
            })}
          />
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
                  <div className="flex items-center gap-2.5">
                    <PibLogo size={26} animated={true} />
                    <div className="flex flex-col">
                      <span className="font-serif text-sm font-bold tracking-tight uppercase text-on-surface leading-none">
                        PIB Intelligence Digest
                      </span>
                      <span className="text-[9px] font-mono text-[#e0d0ab] uppercase tracking-wider mt-0.5">
                        Press Information Bureau &bull; Government of India
                      </span>
                    </div>
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
            role="status"
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[700] w-max max-w-[calc(100vw-2rem)] px-6 py-3 bg-surface-elevated border border-border/80 rounded-sm shadow-2xl"
          >
            <p className="text-xs text-primary font-sans leading-relaxed">{toastMsg}</p>
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
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[700] px-6 py-3 bg-surface-elevated border border-emerald-800/80 rounded-sm shadow-2xl"
          >
            <p className="text-xs text-emerald-300 font-sans whitespace-nowrap flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Scraper dispatched. New intelligence signals will populate momentarily.</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Grounding Protocol & Verification Explainer Modal ── */}
      <GroundingExplainerModal
        isOpen={groundingExplainerData.isOpen}
        onClose={() => setGroundingExplainerData((prev) => ({ ...prev, isOpen: false }))}
        grounding={groundingExplainerData.grounding}
        headline={groundingExplainerData.headline}
        source={groundingExplainerData.source}
        claims={groundingExplainerData.claims}
      />

    </div>
  );
}
