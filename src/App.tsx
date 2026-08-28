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
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import PublicProfile from './components/PublicProfile';
import PasswordReset from './components/PasswordReset';
import LegalModal, { LegalDocumentType } from './components/LegalModal';
import VerticalNavRail from './components/VerticalNavRail';
import { supabase } from './lib/supabase';
import { Loader2, Trophy, Swords, Globe, User, House, LogIn, Layers, BookOpen, PanelLeftOpen, LayoutTemplate } from 'lucide-react';

export default function App() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<'login' | 'landing' | 'arena' | 'autopsy'>('landing');

  const [activeTab, setActiveTab] = useState<'arena' | 'tracker' | 'library' | 'humanities' | 'profile' | 'leaderboard'>('arena');

  const [viewingAnalystId, setViewingAnalystId] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  // Manifesto modal overlay state
  const [showManifesto, setShowManifesto] = useState(false);
  const [legalDocumentType, setLegalDocumentType] = useState<LegalDocumentType | null>(null);
  const [targetPillar, setTargetPillar] = useState<{ id: string; title: string } | null>(null);

  const [arenaStats, setArenaStats] = useState({
    correct: 0,
    incorrect: 0,
    unattempted: 0,
    totalTimeSeconds: 0,
    subjectStats: {} as Record<string, { correct: number; total: number }>
  });
  const [percentile, setPercentile] = useState(0);

  // Layout Orientation: 'horizontal' (Top Bar) vs 'vertical' (Left Command Rail)
  type NavOrientation = 'horizontal' | 'vertical';
  const [navOrientation, setNavOrientation] = useState<NavOrientation>(() => {
    try {
      return (localStorage.getItem('tark_nav_orientation') as NavOrientation) || 'horizontal';
    } catch {
      return 'horizontal';
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

  // Keyboard Shortcuts: Alt+[ or Alt+V to toggle orientation, Alt+1..6 to switch tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.altKey && (e.key === '[' || e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        handleToggleNavOrientation();
      } else if (e.altKey && e.key === '1') {
        e.preventDefault();
        handleNavigateHome();
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        navigateToTab('tracker');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        navigateToTab('arena');
      } else if (e.altKey && e.key === '4') {
        e.preventDefault();
        navigateToTab('library');
      } else if (e.altKey && e.key === '5') {
        e.preventDefault();
        navigateToTab('humanities');
      } else if (e.altKey && e.key === '6') {
        e.preventDefault();
        navigateToTab('leaderboard');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navOrientation, isRailExpanded]);

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

  const handleArenaComplete = (stats: { correct: number; incorrect: number; unattempted: number; totalTimeSeconds: number; subjectStats: Record<string, { correct: number; total: number }>; isRanked?: boolean }, perc: number) => {
    setArenaStats(stats);
    setPercentile(perc);
    setGameState('autopsy');
    setActiveTab('arena');
  };

  const handleNavigateManifesto = () => {
    setShowManifesto(true);
  };

  const handleNavigateHome = () => {
    setGameState('landing');
    setActiveTab('arena');
    setShowManifesto(false);
  };

  const navigateToTab = (tab: 'arena' | 'tracker' | 'library' | 'profile' | 'leaderboard') => {
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
            onToggleExpand={handleToggleRailExpand}
            onNavigateTab={navigateToTab}
            onNavigateHome={handleNavigateHome}
            onOpenLogin={() => setGameState('login')}
            onSwitchToHorizontal={() => setNavOrientation('horizontal')}
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
              <motion.h1
                layoutId="brand-header-h1"
                onClick={handleNavigateHome}
                className="font-serif text-base md:text-xl font-bold tracking-wider text-[#e0d0ab] cursor-pointer select-none whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] shrink-0"
              >
                Tark | तर्क
              </motion.h1>

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
            <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <LayoutGroup id="app-nav-pills">
                <button
                  onClick={handleNavigateHome}
                  className="relative px-3 py-1.5 flex items-center justify-center shrink-0 rounded-xs outline-none group cursor-pointer"
                  title="Home (Alt+1)"
                >
                  {gameState === 'landing' && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 bg-[#e0d0ab] rounded-xs z-0 shadow-sm"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 transition-all duration-200 ease-out ${gameState === 'landing' ? 'text-[#072e63] font-bold' : 'text-[#8fa2bd] group-hover:text-[#e0d0ab] group-hover:-translate-y-0.5'}`}>
                    <House className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-200 ease-out ${gameState !== 'landing' ? 'group-hover:scale-110 drop-shadow-md' : ''}`} />
                    <span className="hidden sm:inline">Home</span>
                    <span className="sm:hidden">Home</span>
                  </span>
                </button>

                <button
                  onClick={() => navigateToTab('arena')}
                  className="relative px-3 py-1.5 flex items-center justify-center shrink-0 rounded-xs outline-none group cursor-pointer"
                  title="Test Arena (Alt+3)"
                >
                  {gameState !== 'landing' && activeTab === 'arena' && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 bg-[#e0d0ab] rounded-xs z-0 shadow-sm"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 transition-all duration-200 ease-out ${gameState !== 'landing' && activeTab === 'arena' ? 'text-[#072e63] font-bold' : 'text-[#8fa2bd] group-hover:text-[#e0d0ab] group-hover:-translate-y-0.5'}`}>
                    <Swords className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-200 ease-out ${!(gameState !== 'landing' && activeTab === 'arena') ? 'group-hover:scale-110 drop-shadow-md' : ''}`} />
                    <span className="hidden sm:inline">Test Arena</span>
                    <span className="sm:hidden">Arena</span>
                  </span>
                </button>

                <button
                  onClick={() => navigateToTab('tracker')}
                  className="relative px-3 py-1.5 flex items-center justify-center shrink-0 rounded-xs outline-none group cursor-pointer"
                  title="Daily Brief (Alt+2)"
                >
                  {gameState !== 'landing' && activeTab === 'tracker' && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 bg-[#e0d0ab] rounded-xs z-0 shadow-sm"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 transition-all duration-200 ease-out ${gameState !== 'landing' && activeTab === 'tracker' ? 'text-[#072e63] font-bold' : 'text-[#8fa2bd] group-hover:text-[#e0d0ab] group-hover:-translate-y-0.5'}`}>
                    <Globe className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-200 ease-out ${!(gameState !== 'landing' && activeTab === 'tracker') ? 'group-hover:scale-110 drop-shadow-md' : ''}`} />
                    <span className="hidden sm:inline">Daily Brief</span>
                    <span className="sm:hidden">Brief</span>
                  </span>
                </button>

                <button
                  onClick={() => navigateToTab('library')}
                  className="relative px-3 py-1.5 flex items-center justify-center shrink-0 rounded-xs outline-none group cursor-pointer"
                  title="Syllabus Pillars (Alt+4)"
                >
                  {gameState !== 'landing' && activeTab === 'library' && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 bg-[#e0d0ab] rounded-xs z-0 shadow-sm"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 transition-all duration-200 ease-out ${gameState !== 'landing' && activeTab === 'library' ? 'text-[#072e63] font-bold' : 'text-[#8fa2bd] group-hover:text-[#e0d0ab] group-hover:-translate-y-0.5'}`}>
                    <Layers className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-200 ease-out ${!(gameState !== 'landing' && activeTab === 'library') ? 'group-hover:scale-110 drop-shadow-md' : ''}`} />
                    <span className="hidden sm:inline">Syllabus Pillars</span>
                    <span className="sm:hidden">Pillars</span>
                  </span>
                </button>

                <button
                  onClick={() => navigateToTab('humanities')}
                  className="relative px-3 py-1.5 flex items-center justify-center shrink-0 rounded-xs outline-none group cursor-pointer"
                  title="Humanities Canon (Alt+5)"
                >
                  {gameState !== 'landing' && activeTab === 'humanities' && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 bg-[#e0d0ab] rounded-xs z-0 shadow-sm"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 transition-all duration-200 ease-out ${gameState !== 'landing' && activeTab === 'humanities' ? 'text-[#072e63] font-bold' : 'text-[#8fa2bd] group-hover:text-[#e0d0ab] group-hover:-translate-y-0.5'}`}>
                    <BookOpen className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-200 ease-out ${!(gameState !== 'landing' && activeTab === 'humanities') ? 'group-hover:scale-110 drop-shadow-md' : ''}`} />
                    <span className="hidden sm:inline">Humanities</span>
                    <span className="sm:hidden">Canon</span>
                  </span>
                </button>

                <button
                  onClick={() => navigateToTab('leaderboard')}
                  className="relative px-3 py-1.5 flex items-center justify-center shrink-0 rounded-xs outline-none group cursor-pointer"
                  title="Leaderboard (Alt+6)"
                >
                  {gameState !== 'landing' && activeTab === 'leaderboard' && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 bg-[#e0d0ab] rounded-xs z-0 shadow-sm"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 transition-all duration-200 ease-out ${gameState !== 'landing' && activeTab === 'leaderboard' ? 'text-[#072e63] font-bold' : 'text-[#8fa2bd] group-hover:text-[#e0d0ab] group-hover:-translate-y-0.5'}`}>
                    <Trophy className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-200 ease-out ${!(gameState !== 'landing' && activeTab === 'leaderboard') ? 'group-hover:scale-110 drop-shadow-md' : ''}`} />
                    <span className="hidden sm:inline">Leaderboard</span>
                    <span className="sm:hidden">Rank</span>
                  </span>
                </button>

                {/* Profile tab only exists when signed in */}
                {userEmail && (
                  <button
                    onClick={() => navigateToTab('profile')}
                    className="relative px-3 py-1.5 flex items-center justify-center shrink-0 rounded-xs outline-none group cursor-pointer"
                    title="Profile & History"
                  >
                    {gameState !== 'landing' && activeTab === 'profile' && (
                      <motion.div
                        layoutId="active-nav-pill"
                        className="absolute inset-0 bg-[#e0d0ab] rounded-xs z-0 shadow-sm"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 transition-all duration-200 ease-out ${gameState !== 'landing' && activeTab === 'profile' ? 'text-[#072e63] font-bold' : 'text-[#8fa2bd] group-hover:text-[#e0d0ab] group-hover:-translate-y-0.5'}`}>
                      <User className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-200 ease-out ${!(gameState !== 'landing' && activeTab === 'profile') ? 'group-hover:scale-110 drop-shadow-md' : ''}`} />
                      <span className="hidden sm:inline">Profile & History</span>
                      <span className="sm:hidden">Profile</span>
                    </span>
                  </button>
                )}
              </LayoutGroup>

              {/* Layout Switcher Button (Switch to Left Vertical Rail) */}
              <button
                onClick={() => setNavOrientation('vertical')}
                title="Switch to Left Vertical Command Rail (Alt+[)"
                className="hidden md:inline-flex items-center gap-1.5 ml-2 px-2.5 py-1.5 bg-zinc-900/80 border border-zinc-800 hover:border-[#e0d0ab]/50 text-[#8fa2bd] hover:text-[#e0d0ab] rounded-xs text-xs font-mono transition-all cursor-pointer"
              >
                <PanelLeftOpen className="w-3.5 h-3.5 text-[#0194a8]" />
                <span className="hidden lg:inline">Vertical Rail</span>
              </button>

              {!userEmail && (
                <button
                  onClick={() => setGameState('login')}
                  className="hidden md:inline-flex items-center gap-1.5 ml-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-[#e0d0ab] hover:border-[#e0d0ab]/50 rounded-sm text-xs font-sans font-medium transition-all cursor-pointer"
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
            onNavigateManifesto={handleNavigateManifesto}
            onNavigateLegal={(type) => setLegalDocumentType(type)}
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
          } ${activeTab === 'humanities' ? 'max-w-none px-0' : 'max-w-7xl mx-auto px-4 md:px-8'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {activeTab === 'profile' && userEmail ? (
            <Profile userEmail={userEmail} userId={userId} userName={userName} onLogout={handleLogout} />
          ) : activeTab === 'leaderboard' ? (
            <Leaderboard onAnalystClick={setViewingAnalystId} />
          ) : activeTab === 'tracker' ? (
            <CurrentAffairs userId={userId || 'guest'} />
          ) : activeTab === 'library' ? (
            <SubjectPillars
              onNavigateArena={() => {
                localStorage.removeItem('tark_arena_results');
                setTargetPillar(null);
                setGameState('arena');
                setActiveTab('arena');
              }}
              onLaunchPractice={(categoryOrId) => {
                localStorage.removeItem('tark_arena_results');
                setTargetPillar({ id: categoryOrId, title: categoryOrId });
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
              onClearTargetPillar={() => setTargetPillar(null)}
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