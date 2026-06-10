import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Login from './components/Login';
import Landing from './components/Landing';
import Arena from './components/Arena';
import Autopsy from './components/Autopsy';
import CurrentAffairs from './components/CurrentAffairs';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import PublicProfile from './components/PublicProfile';
import { supabase } from './lib/supabase';
import { Loader2, Trophy } from 'lucide-react';
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
      {/* Fixed Header Logo */}
      <div className="fixed top-6 left-6 md:top-8 md:left-8 z-[100] flex items-center justify-center">
        {gameState !== 'login' && (
          <motion.h1
            layoutId="brand-header-h1"
            className="font-stencil text-2xl md:text-3xl font-bold tracking-wider text-[#e0d0ab] cursor-default select-none whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
            transition={{
              type: "spring",
              stiffness: 140,
              damping: 18,
              mass: 0.8
            }}
          >
            Tark 1.0 | तर्क 1.0
          </motion.h1>
        )}
      </div>

      {/* FIXED TAB NAVIGATION Selector - visible only after authentication */}
      {userEmail && gameState !== 'login' && gameState !== 'landing' && (
        <div className="fixed top-6 right-6 md:top-8 md:right-8 z-[100] flex items-center gap-1.5 bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 p-1 rounded-sm shadow-2xl">
          <button
            onClick={() => {
              setActiveTab('arena');
              if (gameState === 'autopsy') {
                setGameState('arena');
              }
            }}
            className={`px-3 py-1.5 text-[10px] uppercase font-sans font-bold tracking-widest transition-all rounded-sm leading-none cursor-pointer ${
              activeTab === 'arena'
                ? 'bg-[#e0d0ab] text-[#072e63] font-extrabold shadow-sm'
                : 'text-zinc-400 hover:text-stone-100 hover:bg-zinc-800/60'
            }`}
          >
            Test Arena
          </button>

          <button
            onClick={() => setActiveTab('tracker')}
            className={`px-3 py-1.5 text-[10px] uppercase font-sans font-bold tracking-widest transition-all rounded-sm leading-none cursor-pointer ${
              activeTab === 'tracker'
                ? 'bg-[#e0d0ab] text-[#072e63] font-extrabold shadow-sm'
                : 'text-zinc-400 hover:text-stone-100 hover:bg-zinc-800/60'
            }`}
          >
            Policy Tracker
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1.5 text-[10px] uppercase font-sans font-bold tracking-widest transition-all rounded-sm leading-none cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-[#e0d0ab] text-[#072e63] font-extrabold shadow-sm'
                : 'text-zinc-400 hover:text-stone-100 hover:bg-zinc-800/60'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Trophy className="w-3 h-3" />
              Leaderboard
            </span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 text-[10px] uppercase font-sans font-bold tracking-widest transition-all rounded-sm leading-none cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#e0d0ab] text-[#072e63] font-extrabold shadow-sm'
                : 'text-zinc-400 hover:text-stone-100 hover:bg-zinc-800/60'
            }`}
          >
            Profile & History
          </button>
        </div>
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
        <div className="pt-24 min-h-screen">
          {activeTab === 'profile' ? (
            <Profile userEmail={userEmail} userId={userId} userName={userName} onLogout={handleLogout} />
          ) : activeTab === 'leaderboard' ? (
            <Leaderboard onAnalystClick={setViewingAnalystId} />
          ) : activeTab === 'tracker' ? (
            <CurrentAffairs userId={userId} />
          ) : gameState === 'arena' ? (
            <Arena onComplete={handleArenaComplete} userId={userId} />
          ) : (
            <Autopsy stats={arenaStats} percentile={percentile} />
          )}
        </div>
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
    </div>
  );
}