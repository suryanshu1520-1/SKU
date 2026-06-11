import { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import Login from './components/Login';
import Landing from './components/Landing';
import Arena from './components/Arena';
import Autopsy from './components/Autopsy';
import CurrentAffairs from './components/CurrentAffairs';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import PublicProfile from './components/PublicProfile';
import PasswordReset from './components/PasswordReset';
import { supabase } from './lib/supabase';
import { Loader2, Trophy, Swords, Globe, User } from 'lucide-react';
// @ts-ignore
import logoUrl from './assets/logo.png';

export default function App() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<'login' | 'landing' | 'arena' | 'autopsy'>('login');

  const [activeTab, setActiveTab] = useState<'arena' | 'tracker' | 'profile' | 'leaderboard'>('arena');

  const [viewingAnalystId, setViewingAnalystId] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const [arenaStats, setArenaStats] = useState({
    correct: 0,
    incorrect: 0,
    unattempted: 0,
    totalTimeSeconds: 0,
    subjectStats: {} as Record<string, { correct: number; total: number }>
  });
  const [percentile, setPercentile] = useState(0);

  // Restore authenticated states on start
  useEffect(() => {
    async function restoreSession() {
      const isRecovery = window.location.hash.includes('type=recovery');
      console.log("[Tark Auth] Hash:", window.location.hash, "isRecovery:", isRecovery);
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
            // Block redirect - stay on login screen, mount password reset overlay
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
          setGameState('landing');
          setActiveTab('arena');
        } else {
          const cachedEmail = localStorage.getItem('tark_session_email');
          const cachedName = localStorage.getItem('tark_session_name');
          const cachedUserId = localStorage.getItem('tark_session_user_id');
          if (cachedEmail && cachedName) {
            setUserEmail(cachedEmail);
            setUserName(cachedName);
            setUserId(cachedUserId || cachedEmail);
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
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      console.log("[Tark Auth] Event:", event, "Hash:", window.location.hash);
      if (event === 'PASSWORD_RECOVERY' ||
          (event === 'SIGNED_IN' && window.location.hash.includes('type=recovery'))) {
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
    setGameState('login');
    setLoading(false);
  };

  const handleArenaComplete = (stats: { correct: number; incorrect: number; unattempted: number; totalTimeSeconds: number; subjectStats: Record<string, { correct: number; total: number }> }, perc: number) => {
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
    <div className="bg-zinc-950 min-h-screen relative font-sans text-stone-100 selection:bg-[#e0d0ab] selection:text-zinc-950">
      {/* Unified Frosted Header Bar - visible after login */}
      {userEmail && gameState !== 'login' && (
        <header className="fixed top-0 left-0 w-full z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 md:px-8 gap-3 md:gap-0">
            {/* Brand Logo */}
            <motion.h1
              layoutId="brand-header-h1"
              className="font-serif text-base md:text-xl font-bold tracking-wider text-[#e0d0ab] cursor-default select-none whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] shrink-0"
              transition={{
                type: "spring",
                stiffness: 140,
                damping: 18,
                mass: 0.8
              }}
            >
              Tark 1.0 | तर्क 1.0
            </motion.h1>

            {/* Navigation Tabs - Animated Pill */}
            <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <LayoutGroup>
                 <button
                   onClick={() => {
                     setActiveTab('arena');
                     if (gameState === 'autopsy') {
                       setGameState('arena');
                     }
                   }}
                   className="relative px-3 py-1.5 flex items-center justify-center shrink-0 rounded-sm outline-none transition-colors"
                 >
                   {activeTab === 'arena' && (
                     <motion.div
                       layoutId="active-nav-pill"
                       className="absolute inset-0 bg-zinc-100 rounded-sm z-0"
                       transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                     />
                   )}
                   <span className={`relative z-10 flex items-center gap-1.5 ${activeTab === 'arena' ? 'text-zinc-950' : 'text-zinc-400'}`}>
                     <Swords className="w-3.5 h-3.5 md:w-4 md:h-4" />
                     <span className="hidden sm:inline">Test Arena</span>
                     <span className="sm:hidden">Arena</span>
                   </span>
                 </button>

                 <button
                   onClick={() => setActiveTab('tracker')}
                   className="relative px-3 py-1.5 flex items-center justify-center shrink-0 rounded-sm outline-none transition-colors"
                 >
                   {activeTab === 'tracker' && (
                     <motion.div
                       layoutId="active-nav-pill"
                       className="absolute inset-0 bg-zinc-100 rounded-sm z-0"
                       transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                     />
                   )}
                   <span className={`relative z-10 flex items-center gap-1.5 ${activeTab === 'tracker' ? 'text-zinc-950' : 'text-zinc-400'}`}>
                     <Globe className="w-3.5 h-3.5 md:w-4 md:h-4" />
                     <span className="hidden sm:inline">Policy Tracker</span>
                     <span className="sm:hidden">Tracker</span>
                   </span>
                 </button>

                 <button
                   onClick={() => setActiveTab('leaderboard')}
                   className="relative px-3 py-1.5 flex items-center justify-center shrink-0 rounded-sm outline-none transition-colors"
                 >
                   {activeTab === 'leaderboard' && (
                     <motion.div
                       layoutId="active-nav-pill"
                       className="absolute inset-0 bg-zinc-100 rounded-sm z-0"
                       transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                     />
                   )}
                   <span className={`relative z-10 flex items-center gap-1.5 ${activeTab === 'leaderboard' ? 'text-zinc-950' : 'text-zinc-400'}`}>
                     <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                     <span className="hidden sm:inline">Leaderboard</span>
                     <span className="sm:hidden">Rank</span>
                   </span>
                 </button>

                 <button
                   onClick={() => setActiveTab('profile')}
                   className="relative px-3 py-1.5 flex items-center justify-center shrink-0 rounded-sm outline-none transition-colors"
                 >
                   {activeTab === 'profile' && (
                     <motion.div
                       layoutId="active-nav-pill"
                       className="absolute inset-0 bg-zinc-100 rounded-sm z-0"
                       transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                     />
                   )}
                   <span className={`relative z-10 flex items-center gap-1.5 ${activeTab === 'profile' ? 'text-zinc-950' : 'text-zinc-400'}`}>
                     <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
                     <span className="hidden sm:inline">Profile & History</span>
                     <span className="sm:hidden">Profile</span>
                   </span>
                 </button>
              </LayoutGroup>
            </nav>
          </div>
        </header>
      )}

      {/* Screen Routing */}
      {gameState === 'login' && (
        <Login onAuthenticated={handleAuthenticated} />
      )}

      {gameState === 'landing' && (
        <Landing 
          onNavigateArena={() => { setGameState('arena'); setActiveTab('arena'); }}
          onNavigateTracker={() => { setGameState('arena'); setActiveTab('tracker'); }}
          onNavigateProfile={() => { setGameState('arena'); setActiveTab('profile'); }}
        />
      )}

      {gameState !== 'login' && gameState !== 'landing' && userEmail && (
        <main className="pt-28 md:pt-24 pb-12 w-full max-w-7xl mx-auto px-4 md:px-8">
          {activeTab === 'profile' ? (
            <Profile userEmail={userEmail} userId={userId} userName={userName} onLogout={handleLogout} />
          ) : activeTab === 'leaderboard' ? (
            <Leaderboard onAnalystClick={setViewingAnalystId} />
          ) : activeTab === 'tracker' ? (
            <CurrentAffairs userId={userId} />
          ) : gameState === 'arena' ? (
            <Arena onComplete={handleArenaComplete} userId={userId} onReturnToDashboard={() => setActiveTab('tracker')} />
          ) : (
            <Autopsy stats={arenaStats} percentile={percentile} />
          )}
        </main>
      )}

      {/* Analyst Dossier Overlay */}
      <AnimatePresence>
        {viewingAnalystId && (
          <PublicProfile
            analystId={viewingAnalystId}
            onClose={() => setViewingAnalystId(null)}
          />
        )}
      </AnimatePresence>

      {/* Password Reset Overlay */}
      <AnimatePresence>
        {showPasswordReset && (
          <PasswordReset onClose={() => setShowPasswordReset(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}