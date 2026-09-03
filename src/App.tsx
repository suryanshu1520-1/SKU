import { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import Login from './components/Login';
import Landing from './components/Landing';
import Manifesto from './components/Manifesto';
import Arena from './components/Arena';
import Autopsy from './components/Autopsy';
import CurrentAffairs from './components/CurrentAffairs';
import SubjectPillars from './components/SubjectPillars';
import HumanitiesReader from './components/HumanitiesReader';
import Observatory from './components/Observatory';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import PublicProfile from './components/PublicProfile';
import PasswordReset from './components/PasswordReset';
import LegalModal, { LegalDocumentType } from './components/LegalModal';
import VerticalNavRail, { ContextActionItem } from './components/VerticalNavRail';
import Onboarding from './components/Onboarding';
import BrandLogo from './components/BrandLogo';
import { supabase } from './lib/supabase';
import { Loader2, Trophy, Swords, Globe, User, House, LogIn, Layers, BookOpen, PanelLeftOpen, LayoutTemplate, Radio, Clock } from 'lucide-react';
import { NAV_ITEMS, PROFILE_NAV_ITEM, NavTab } from './lib/navItems';
import AnimatedNavIcon from './components/AnimatedNavIcon';
import type { CandidatePreferences, CandidateProfile, ArenaLaunchConfig } from './types';
import {
  loadStoredPreferences,
  DEFAULT_PREFERENCES,
  calculateExamCountdown,
  formatTrackBadge
} from './lib/candidatePreferences';

export default function App() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [preferences, setPreferences] = useState<CandidatePreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<'login' | 'landing' | 'arena' | 'autopsy'>('landing');

  const [activeTab, setActiveTab] = useState<'arena' | 'tracker' | 'library' | 'humanities' | 'observatory' | 'profile' | 'leaderboard'>('arena');
  const [hoveredNavId, setHoveredNavId] = useState<string | null>(null);

  const [viewingAnalystId, setViewingAnalystId] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Manifesto modal overlay state
  const [showManifesto, setShowManifesto] = useState(false);
  const [legalDocumentType, setLegalDocumentType] = useState<LegalDocumentType | null>(null);
  const [targetPillar, setTargetPillar] = useState<{ id: string; title: string } | null>(null);
  const [arenaConfig, setArenaConfig] = useState<ArenaLaunchConfig | null>(null);

  const [arenaStats, setArenaStats] = useState({
    correct: 0,
    incorrect: 0,
    unattempted: 0,
    totalTimeSeconds: 0,
    subjectStats: {} as Record<string, { correct: number; total: number }>,
    isRanked: true as boolean | undefined,
    contextTag: undefined as string | undefined,
  });
  const [percentile, setPercentile] = useState(0);

  // Layout Orientation: 'horizontal' (Top Bar) vs 'vertical' (Left Command Rail)
  type NavOrientation = 'horizontal' | 'vertical';
  const [navOrientation, setNavOrientation] = useState<NavOrientation>(() => {
    try {
      return (localStorage.getItem('tark_nav_orientation') as NavOrientation) || 'vertical';
    } catch {
      return 'vertical';
    }
  });

  const [isRailExpanded, setIsRailExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tark_rail_expanded') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleNavOrientation = () => {
    const next = navOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    setNavOrientation(next);
    try {
      localStorage.setItem('tark_nav_orientation', next);
    } catch {
      /* ignore */
    }
  };

  const handleToggleRailExpand = () => {
    const next = !isRailExpanded;
    setIsRailExpanded(next);
    try {
      localStorage.setItem('tark_rail_expanded', String(next));
    } catch {
      /* ignore */
    }
  };

  const handleNavigateManifesto = () => {
    setShowManifesto(true);
  };

  const handleNavigateHome = () => {
    setGameState('landing');
    setActiveTab('arena');
    setShowManifesto(false);
  };

  const navigateToTab = (tab: 'arena' | 'tracker' | 'library' | 'humanities' | 'observatory' | 'profile' | 'leaderboard') => {
    if (tab === 'profile' && !userEmail) {
      setGameState('login');
      return;
    }
    setActiveTab(tab);
    if (gameState === 'landing' || gameState === 'login') {
      if (tab === 'arena' && localStorage.getItem('tark_arena_results')) {
        setGameState('autopsy');
      } else {
        setGameState('arena');
      }
    } else if (tab === 'arena' && localStorage.getItem('tark_arena_results')) {
      setGameState('autopsy');
    } else if (tab === 'arena') {
      setGameState('arena');
    }
  };

  // Keyboard Shortcuts: Alt+[ or Alt+V to toggle orientation, Alt+1..7 to switch tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.altKey) {
        const key = e.key.toLowerCase();
        const code = e.code;

        if (
          key === '[' ||
          code === 'BracketLeft' ||
          key === 'v' ||
          code === 'KeyV' ||
          key === '\\' ||
          code === 'Backslash'
        ) {
          e.preventDefault();
          handleToggleNavOrientation();
        } else if (key === '1' || code === 'Digit1' || code === 'Numpad1') {
          e.preventDefault();
          handleNavigateHome();
        } else if (key === '2' || code === 'Digit2' || code === 'Numpad2') {
          e.preventDefault();
          navigateToTab('tracker');
        } else if (key === '3' || code === 'Digit3' || code === 'Numpad3') {
          e.preventDefault();
          navigateToTab('arena');
        } else if (key === '4' || code === 'Digit4' || code === 'Numpad4') {
          e.preventDefault();
          navigateToTab('library');
        } else if (key === '5' || code === 'Digit5' || code === 'Numpad5') {
          e.preventDefault();
          navigateToTab('humanities');
        } else if (key === '6' || code === 'Digit6' || code === 'Numpad6' || key === 'o' || code === 'KeyO') {
          e.preventDefault();
          navigateToTab('observatory');
        } else if (key === '7' || code === 'Digit7' || code === 'Numpad7') {
          e.preventDefault();
          navigateToTab('leaderboard');
        } else if (key === '8' || code === 'Digit8' || code === 'Numpad8' || key === 'p' || code === 'KeyP') {
          e.preventDefault();
          navigateToTab('profile');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navOrientation, isRailExpanded, userEmail, gameState]);

  // Restore authenticated states on start
  useEffect(() => {
    async function restoreSession() {
      const isRecovery = window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Supabase auth session restoration warning:", error.message);
          if (
            error.message?.toLowerCase().includes("refresh token") ||
            error.message?.toLowerCase().includes("invalid") ||
            error.status === 400 ||
            error.status === 401
          ) {
            try {
              await supabase.auth.signOut();
            } catch (signOutErr) {
              console.warn("Error cleaning up invalid token:", signOutErr);
            }
          }
        }
        if (session?.user) {
          if (isRecovery) {
            setShowPasswordReset(true);
            setUserEmail(session.user.email || '');
            setUserId(session.user.id);
            setGameState('login');
            setLoading(false);
            return;
          }
          setUserEmail(session.user.email || '');
          const metaName = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Candidate';
          setUserName(metaName);
          setUserId(session.user.id);

          const cachedResultsRaw = localStorage.getItem('tark_arena_results');
          if (cachedResultsRaw) {
            try {
              const parsed = JSON.parse(cachedResultsRaw);
              setArenaStats(parsed.resultsData);
              setPercentile(parsed.percentile);
              setGameState('autopsy');
              setActiveTab('arena');
            } catch {
              setGameState('landing');
              setActiveTab('arena');
            }
          } else {
            setGameState('landing');
            setActiveTab('arena');
          }
        } else {
          const cachedEmail = localStorage.getItem('tark_session_email');
          const cachedName = localStorage.getItem('tark_session_name');
          const cachedUserId = localStorage.getItem('tark_session_user_id');
          if (cachedEmail && cachedName) {
            setUserEmail(cachedEmail);
            setUserName(cachedName);
            setUserId(cachedUserId || cachedEmail);

            const effectiveUid = cachedUserId || cachedEmail;
            loadStoredPreferences(effectiveUid).then((loadedPrefs) => {
              setPreferences(loadedPrefs);
            });

            const cachedResultsRaw = localStorage.getItem('tark_arena_results');
            if (cachedResultsRaw) {
              try {
                const parsed = JSON.parse(cachedResultsRaw);
                setArenaStats(parsed.resultsData);
                setPercentile(parsed.percentile);
                setGameState('autopsy');
                setActiveTab('arena');
              } catch {
                setGameState('landing');
                setActiveTab('arena');
              }
            } else {
              setGameState('landing');
              setActiveTab('arena');
            }
          } else {
            // Cold visitor defaults to landing
            loadStoredPreferences().then((loadedPrefs) => setPreferences(loadedPrefs));
            setGameState('landing');
          }
        }
      } catch (err) {
        console.warn("Failed to check active session:", err);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  // Listen for password recovery events from Supabase
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const matchedEmail = session.user.email || '';
        const matchedName = session.user.user_metadata?.name || matchedEmail.split('@')[0] || 'Candidate';
        const matchedUserId = session.user.id;

        setUserEmail(matchedEmail);
        setUserName(matchedName);
        setUserId(matchedUserId);

        localStorage.setItem('tark_session_email', matchedEmail);
        localStorage.setItem('tark_session_name', matchedName);
        localStorage.setItem('tark_session_user_id', matchedUserId);

        loadStoredPreferences(matchedUserId).then((loadedPrefs) => {
          setPreferences(loadedPrefs);
        });
      }

      if (event === 'PASSWORD_RECOVERY' ||
        (event === 'SIGNED_IN' && (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')))) {
        setShowPasswordReset(true);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleAuthenticated = (email: string, name: string, uid?: string) => {
    setUserEmail(email);
    setUserName(name);
    const resolvedUserId = uid || email;
    setUserId(resolvedUserId);
    localStorage.setItem('tark_session_email', email);
    localStorage.setItem('tark_session_name', name);
    localStorage.setItem('tark_session_user_id', resolvedUserId);

    loadStoredPreferences(resolvedUserId).then((loadedPrefs) => {
      setPreferences(loadedPrefs);
      if (!loadedPrefs.onboardingCompleted && localStorage.getItem('tark_onboarding_completed') !== 'true') {
        setShowOnboarding(true);
      }
    });

    setGameState('landing');
    setActiveTab('arena');
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase forced sign out exception:", err);
    }
    localStorage.removeItem('tark_session_email');
    localStorage.removeItem('tark_session_name');
    localStorage.removeItem('tark_session_user_id');
    setUserEmail('');
    setUserName('');
    setUserId('');
    setGameState('landing');
    setLoading(false);
  };

  const handleArenaComplete = (stats: { correct: number; incorrect: number; unattempted: number; totalTimeSeconds: number; subjectStats: Record<string, { correct: number; total: number }>; isRanked?: boolean; contextTag?: string }, perc: number) => {
    setArenaStats(stats);
    setPercentile(perc);
    setGameState('autopsy');
    setActiveTab('arena');
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative font-sans text-stone-100 selection:bg-[#e0d0ab] selection:text-[#072e63]">
      {/* ── Mode 1: Left Vertical Command Rail (Desktop) ── */}
      {gameState !== 'login' && navOrientation === 'vertical' && (
        <div className="hidden md:block">
          <VerticalNavRail
            activeTab={activeTab}
            isLanding={gameState === 'landing'}
            userEmail={userEmail}
            isExpanded={isRailExpanded}
            candidatePreferences={preferences}
            onToggleExpand={handleToggleRailExpand}
            onNavigateTab={navigateToTab}
            onNavigateHome={handleNavigateHome}
            onOpenLogin={() => setGameState('login')}
            onSwitchToHorizontal={() => setNavOrientation('horizontal')}
            onRecalibrateTrack={() => setShowOnboarding(true)}
          />
        </div>
      )}

      {/* ── Mode 2: Top Horizontal Header (Mobile or when Horizontal is chosen) ── */}
      {gameState !== 'login' && (
        <header
          className={`fixed top-0 left-0 w-full z-40 bg-[rgba(4,25,54,0.75)] backdrop-blur-md border-b border-[rgba(19,108,153,0.5)] ${
            navOrientation === 'vertical' ? 'md:hidden' : ''
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 md:px-8 gap-3 md:gap-0">
            {/* Brand Logo & Mobile Action */}
            <div className="flex items-center justify-between w-full md:w-auto">
              <BrandLogo
                size="md"
                showSubtitle={false}
                onClick={handleNavigateHome}
              />

              {!userEmail && (
                <button
                  onClick={() => setGameState('login')}
                  className="md:hidden flex items-center gap-1 px-3 py-1 bg-zinc-900 border border-zinc-800 text-[#e0d0ab] rounded-sm text-xs font-sans font-medium"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
              )}
            </div>

            {/* Navigation Tabs - Animated Pill */}
            <nav
              className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)',
                maskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)',
              }}
            >
              <LayoutGroup id="app-nav-pills">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.id === 'home' ? gameState === 'landing' : gameState !== 'landing' && activeTab === item.id;
                  const isItemHovered = hoveredNavId === item.id;
                  const handleClick = () => {
                    if (item.id === 'home') {
                      handleNavigateHome();
                    } else {
                      navigateToTab(item.id as NavTab);
                    }
                  };

                  return (
                    <motion.button
                      key={item.id}
                      onClick={handleClick}
                      onMouseEnter={() => setHoveredNavId(item.id)}
                      onMouseLeave={() => setHoveredNavId(null)}
                      whileTap={{ scale: 0.98 }}
                      className="relative px-3 py-1.5 flex items-center justify-center shrink-0 rounded-md outline-none group cursor-pointer focus-visible:ring-2 focus-visible:ring-[#e0d0ab]/80"
                      title={`${item.label} (Alt+${item.hotkey})`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-nav-pill"
                          className="absolute inset-0 bg-[#e0d0ab] rounded-md z-0 shadow-xs"
                          transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                        />
                      )}
                      <span className={`relative z-10 flex items-center gap-1.5 font-sans text-xs transition-all duration-150 ease-out ${isActive ? 'text-[#072e63] font-semibold' : 'text-[#8fa2bd] group-hover:text-[#e0d0ab]'}`}>
                        <AnimatedNavIcon
                          id={item.id}
                          isActive={isActive}
                          isHovered={isItemHovered}
                          size={16}
                          className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 transition-transform duration-150 ease-out"
                        />
                        <span className="hidden sm:inline">{item.label}</span>
                        <span className="sm:hidden">{item.shortLabel}</span>
                      </span>
                    </motion.button>
                  );
                })}

                {/* Profile tab only exists when signed in */}
                {userEmail && (
                  <motion.button
                    onClick={() => navigateToTab('profile')}
                    onMouseEnter={() => setHoveredNavId('profile')}
                    onMouseLeave={() => setHoveredNavId(null)}
                    whileTap={{ scale: 0.98 }}
                    className="relative px-3 py-1.5 flex items-center justify-center shrink-0 rounded-md outline-none group cursor-pointer focus-visible:ring-2 focus-visible:ring-[#e0d0ab]/80"
                    title={`${PROFILE_NAV_ITEM.label} (Alt+${PROFILE_NAV_ITEM.hotkey})`}
                  >
                    {gameState !== 'landing' && activeTab === 'profile' && (
                      <motion.div
                        layoutId="active-nav-pill"
                        className="absolute inset-0 bg-[#e0d0ab] rounded-md z-0 shadow-xs"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 font-sans text-xs transition-all duration-150 ease-out ${gameState !== 'landing' && activeTab === 'profile' ? 'text-[#072e63] font-semibold' : 'text-[#8fa2bd] group-hover:text-[#e0d0ab]'}`}>
                      <AnimatedNavIcon
                        id="profile"
                        isActive={gameState !== 'landing' && activeTab === 'profile'}
                        isHovered={hoveredNavId === 'profile'}
                        size={16}
                        className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 transition-transform duration-150 ease-out"
                      />
                      <span className="hidden sm:inline">{PROFILE_NAV_ITEM.label}</span>
                      <span className="sm:hidden">{PROFILE_NAV_ITEM.shortLabel}</span>
                    </span>
                  </motion.button>
                )}
              </LayoutGroup>

              {/* Exam Countdown Pill */}
              {preferences && (
                <button
                  type="button"
                  onClick={() => setShowOnboarding(true)}
                  title={`UPSC Prep Clock: ${calculateExamCountdown(preferences.targetYear).daysRemaining} days remaining (${calculateExamCountdown(preferences.targetYear).label}). Click to recalibrate dossier.`}
                  className="hidden sm:inline-flex items-center gap-1.5 ml-2 px-3 py-1.5 bg-[rgba(11,61,120,0.3)] hover:bg-[rgba(11,61,120,0.5)] border border-[rgba(19,108,153,0.35)] hover:border-[#e0d0ab]/50 text-[#e0d0ab] rounded-md text-xs font-sans transition-all duration-150 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]/80"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse shrink-0" />
                  <span className="font-mono tabular-nums font-bold">{calculateExamCountdown(preferences.targetYear).daysRemaining}d</span>
                  <span className="text-[#8fa2bd] hidden lg:inline">to {calculateExamCountdown(preferences.targetYear).label}</span>
                </button>
              )}

              {/* Layout Switcher Button (Switch to Left Vertical Rail) */}
              <button
                type="button"
                onClick={() => setNavOrientation('vertical')}
                title="Switch to Left Vertical Command Rail (Alt+[)"
                className="hidden md:inline-flex items-center gap-1.5 ml-1.5 px-3 py-1.5 bg-slate-900/60 hover:bg-slate-850 border border-slate-750 hover:border-[#e0d0ab]/40 text-[#8fa2bd] hover:text-[#e0d0ab] rounded-md text-xs font-sans transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]/80"
              >
                <PanelLeftOpen className="w-3.5 h-3.5 text-[#0194a8]" />
                <span className="hidden lg:inline">Vertical Rail</span>
              </button>

              {!userEmail && (
                <button
                  type="button"
                  onClick={() => setGameState('login')}
                  className="hidden md:inline-flex items-center gap-1.5 ml-2 px-3.5 py-1.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] font-sans font-semibold rounded-md text-xs shadow-xs transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
              )}
            </nav>
          </div>
        </header>
      )}

      {/* Screen Routing */}
      {gameState === 'login' && (
        <Login
          onAuthenticated={handleAuthenticated}
          onNavigateManifesto={handleNavigateManifesto}
          onNavigateLegal={(type) => setLegalDocumentType(type)}
        />
      )}

      {gameState === 'landing' && (
        <div
          className={`transition-all duration-300 ${
            navOrientation === 'vertical'
              ? isRailExpanded
                ? 'md:pl-56 pt-6'
                : 'md:pl-16 pt-6'
              : ''
          }`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <Landing
            onNavigateArena={() => navigateToTab('arena')}
            onNavigateTracker={() => navigateToTab('tracker')}
            onNavigateProfile={() => navigateToTab('profile')}
            onNavigateLibrary={() => navigateToTab('library')}
            onNavigateHumanities={() => navigateToTab('humanities')}
            onNavigateObservatory={() => navigateToTab('observatory')}
            onNavigateManifesto={handleNavigateManifesto}
            onNavigateLegal={(type) => setLegalDocumentType(type)}
            candidatePreferences={preferences}
          />
        </div>
      )}

      {gameState !== 'login' && gameState !== 'landing' && (
        <main
          className={`w-full transition-all duration-300 ${
            navOrientation === 'vertical'
              ? isRailExpanded
                ? 'md:pl-56 pt-6 pb-12'
                : 'md:pl-16 pt-6 pb-12'
              : 'pt-28 md:pt-24 pb-12'
          } ${activeTab === 'humanities' || activeTab === 'observatory' ? 'max-w-none px-0' : 'max-w-7xl mx-auto px-4 md:px-8'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {activeTab === 'profile' && userEmail ? (
            <Profile
              userEmail={userEmail}
              userId={userId}
              userName={userName}
              candidatePreferences={preferences}
              onRecalibrateTrack={() => setShowOnboarding(true)}
              onLogout={handleLogout}
            />
          ) : activeTab === 'leaderboard' ? (
            <Leaderboard onAnalystClick={setViewingAnalystId} />
          ) : activeTab === 'tracker' ? (
            <CurrentAffairs
              userId={userId || 'guest'}
              candidatePreferences={preferences}
              onLaunchPractice={(categoryOrId) => {
                localStorage.removeItem('tark_arena_results');
                setTargetPillar({ id: 'CURRENT_AFFAIRS', title: 'Daily Current Affairs' });
                setArenaConfig({
                  mode: 'daily_brief',
                  title: 'Daily Current Affairs Drill',
                  subtitle: '10 Questions · Grounded PIB & Cabinet Policy Dispatches',
                  targetId: 'CURRENT_AFFAIRS',
                  questionCount: 10,
                  isRanked: false,
                  timePerQuestionSeconds: 60,
                  autoStart: true,
                  contextTag: 'Daily Current Affairs'
                });
                setGameState('arena');
                setActiveTab('arena');
              }}
            />
          ) : activeTab === 'observatory' ? (
            <Observatory
              onNavigateArena={() => {
                localStorage.removeItem('tark_arena_results');
                setTargetPillar(null);
                setArenaConfig({
                  mode: 'full_mock',
                  title: 'UPSC CSE Mock Arena',
                  subtitle: 'Timed recall under authentic Prelims conditions',
                  questionCount: 25,
                  isRanked: true,
                  timePerQuestionSeconds: 60,
                  autoStart: false,
                });
                setGameState('arena');
                setActiveTab('arena');
              }}
              onLaunchPractice={(categoryOrId) => {
                localStorage.removeItem('tark_arena_results');
                setTargetPillar({ id: categoryOrId, title: categoryOrId });
                setArenaConfig({
                  mode: 'topic_drill',
                  title: `${categoryOrId} Practice Drill`,
                  subtitle: 'Targeted High-Yield Matrix & 25-Year PYQ Bank',
                  targetId: categoryOrId,
                  questionCount: 10,
                  isRanked: false,
                  timePerQuestionSeconds: 60,
                  autoStart: true,
                  contextTag: `${categoryOrId} Practice`
                });
                setGameState('arena');
                setActiveTab('arena');
              }}
            />
          ) : activeTab === 'library' ? (
            <SubjectPillars
              candidatePreferences={preferences}
              onNavigateArena={() => {
                localStorage.removeItem('tark_arena_results');
                setTargetPillar(null);
                setArenaConfig(null);
                setGameState('arena');
                setActiveTab('arena');
              }}
              onLaunchPractice={(categoryOrId) => {
                localStorage.removeItem('tark_arena_results');
                setTargetPillar({ id: categoryOrId, title: categoryOrId });
                setArenaConfig({
                  mode: 'subject_drill',
                  title: `${categoryOrId} Syllabus Drill`,
                  subtitle: 'Core General Studies Syllabus & Past Trends',
                  targetId: categoryOrId,
                  questionCount: 15,
                  isRanked: false,
                  timePerQuestionSeconds: 60,
                  autoStart: true,
                  contextTag: `${categoryOrId} Syllabus`
                });
                setGameState('arena');
                setActiveTab('arena');
              }}
            />
          ) : activeTab === 'humanities' ? (
            <HumanitiesReader />
          ) : gameState === 'arena' ? (
            <Arena
              onComplete={handleArenaComplete}
              userId={userId || 'guest'}
              targetPillar={targetPillar}
              arenaConfig={arenaConfig}
              candidatePreferences={preferences}
              onClearTargetPillar={() => {
                setTargetPillar(null);
                setArenaConfig(null);
              }}
              onReturnToDashboard={() => setActiveTab('tracker')}
              onNavigateManifesto={handleNavigateManifesto}
            />
          ) : (
            <Autopsy
              stats={arenaStats}
              percentile={percentile}
              onNavigateManifesto={handleNavigateManifesto}
              onReturnToDashboard={() => {
                localStorage.removeItem('tark_arena_results');
                setGameState('arena');
                setActiveTab(userEmail ? 'profile' : 'tracker');
              }}
              onDeployNext={() => {
                localStorage.removeItem('tark_arena_results');
                setGameState('arena');
                setActiveTab('arena');
              }}
            />
          )}
        </main>
      )}

      {/* Analyst Dossier Overlay */}
      <AnimatePresence>
        {viewingAnalystId && (
          <PublicProfile
            analystId={viewingAnalystId}
            currentUserId={userId}
            onClose={() => setViewingAnalystId(null)}
          />
        )}
      </AnimatePresence>

      {/* Password Reset Overlay */}
      <AnimatePresence>
        {showPasswordReset && (
          <PasswordReset onClose={() => {
            setShowPasswordReset(false);
            if (userEmail) {
              setGameState('landing');
              setActiveTab('arena');
            }
          }} />
        )}
      </AnimatePresence>

      {/* Manifesto Modal Overlay */}
      <AnimatePresence>
        {showManifesto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/90 backdrop-blur-sm flex justify-center items-start pt-12"
          >
            <Manifesto
              onNavigateArena={() => { setGameState('arena'); setActiveTab('arena'); setShowManifesto(false); }}
              onNavigateSignup={() => { setShowManifesto(false); setGameState('login'); }}
              onClose={() => setShowManifesto(false)}
              userId={userId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Crucible Modal */}
      {showOnboarding && (
        <Onboarding
          userName={userName}
          userEmail={userEmail}
          userId={userId}
          initialPreferences={preferences}
          onComplete={(profile) => {
            if (profile.name) setUserName(profile.name);
            if (profile.preferences) setPreferences(profile.preferences);
            try { localStorage.setItem('tark_onboarding_completed', 'true'); } catch {}
            setShowOnboarding(false);
          }}
          onSkip={() => {
            try { localStorage.setItem('tark_onboarding_completed', 'true'); } catch {}
            setShowOnboarding(false);
          }}
        />
      )}

      {/* Legal Modal Overlay */}
      <AnimatePresence>
        {legalDocumentType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/90 backdrop-blur-sm flex justify-center items-start pt-4 md:pt-12"
          >
            <LegalModal
              documentType={legalDocumentType}
              onClose={() => setLegalDocumentType(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}