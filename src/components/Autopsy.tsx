import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

interface AutopsyProps {
  stats: { 
    correct: number; 
    incorrect: number; 
    unattempted: number;
    totalTimeSeconds?: number;
    subjectStats?: Record<string, { correct: number; total: number }>;
  };
  percentile: number;
}

export default function Autopsy({ stats, percentile }: AutopsyProps) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (Object.keys(stats.subjectStats || {}).length > 0) {
      setLoadingInsights(true);
      fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats })
      })
      .then(res => res.json())
      .then(data => {
        if (data.insights) setInsights(data.insights);
      })
      .catch(err => console.error("Error fetching insights:", err))
      .finally(() => setLoadingInsights(false));
    }
  }, [stats]);

  const total = stats.correct + stats.incorrect + stats.unattempted;
  const tts = stats.totalTimeSeconds || 0;
  const mins = Math.floor(tts / 60);
  const secs = tts % 60;
  const avgTime = total > 0 ? (tts / total) : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-stone-50 flex flex-col items-center p-6 pb-24 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950 -z-10 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-xl mt-12 md:mt-24"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-sans font-bold tracking-tight mb-2">Performance Analytics</h1>
          <p className="text-zinc-500 font-sans text-xs uppercase tracking-widest">Post-Session Analysis</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-800 border border-zinc-800 mb-8 rounded-lg overflow-hidden">
          <div className="bg-zinc-950 p-6 flex flex-col items-center justify-center">
            <span className="text-4xl font-sans font-medium mb-1 text-emerald-400">{stats.correct}</span>
            <span className="text-[10px] font-sans text-zinc-500 uppercase tracking-widest">Correct</span>
          </div>
          <div className="bg-zinc-950 p-6 flex flex-col items-center justify-center">
            <span className="text-4xl font-sans font-medium mb-1 text-rose-500">{stats.incorrect}</span>
            <span className="text-[10px] font-sans text-zinc-500 uppercase tracking-widest">Incorrect</span>
          </div>
          <div className="bg-zinc-950 p-6 flex flex-col items-center justify-center">
            <span className="text-4xl font-sans font-medium mb-1 text-zinc-400">{stats.unattempted}</span>
            <span className="text-[10px] font-sans text-zinc-500 uppercase tracking-widest">Unattempted</span>
          </div>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/30 p-8 text-center rounded-lg mb-12">
          <p className="text-lg font-sans text-zinc-300 leading-relaxed font-medium">
            You processed <span className="text-stone-100">{total}</span> protocols.
            <br className="mt-4" />
            <span className="block mt-4 text-emerald-400 text-xl font-sans">
              You scored higher than {percentile}% of the candidate pool.
            </span>
          </p>
        </div>

        {/* Real Performance Metrics */}
        <div className="relative border border-zinc-800 bg-[#0c0c0c] rounded-xl overflow-hidden mt-8">
          
          <div className="p-8 pb-12 space-y-12 transition-all">
            <div className="text-center">
              <h2 className="text-xl font-sans font-medium text-stone-100 mb-2">Metrics</h2>
              <p className="text-xs font-sans text-zinc-500 uppercase tracking-widest">Detailed Insights</p>
            </div>
            
            <div className="space-y-8">
              {/* Total Time */}
              <div className="flex flex-col gap-4">
                <h3 className="text-[10px] font-sans text-zinc-500 uppercase tracking-widest">Execution Time</h3>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-md gap-4">
                  <span className="text-stone-300 font-sans font-medium text-2xl">
                    {mins > 0 ? `${mins}m ` : ''}{secs.toFixed(1)}s
                  </span>
                  <div className="flex flex-col sm:items-end">
                    <span className="text-zinc-400 font-sans font-medium text-lg">
                      {avgTime.toFixed(1)}s
                    </span>
                    <span className="text-zinc-500 font-sans uppercase tracking-widest text-[9px]">
                      Avg. per query
                    </span>
                  </div>
                </div>
              </div>

              {/* Subject Accuracy */}
              <div>
                <h3 className="text-[10px] font-sans text-zinc-500 uppercase tracking-widest mb-4">Subject Areas</h3>
                <div className="space-y-6">
                  {(!stats.subjectStats || Object.keys(stats.subjectStats).length === 0) ? (
                    <p className="text-sm font-sans text-zinc-500">Insufficient data.</p>
                  ) : (
                    Object.entries(stats.subjectStats).map(([subj, data]) => {
                      const percentage = Math.round((data.correct / data.total) * 100);
                      const isWeak = percentage < 60;
                      return (
                        <div key={subj}>
                          <div className="flex justify-between items-center text-xs mb-2 font-sans font-medium">
                            <span className="text-zinc-300">
                              {subj}
                              {isWeak && <span className="ml-3 text-stone-100 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-[9px] uppercase tracking-widest font-normal">Focus Area</span>}
                            </span>
                            <span className="text-stone-100 font-sans">{percentage}%</span>
                          </div>
                          <div className="w-full bg-zinc-900/50 border border-zinc-800/50 h-2 rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full ${isWeak ? 'bg-amber-500/60' : 'bg-emerald-500/60'}`} 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
                            />
                          </div>
                          <p className="text-[10px] font-sans text-zinc-500 mt-2 tracking-wide font-normal">
                            {data.correct} out of {data.total} correct. {isWeak ? "Review suggested to build stronger conceptual grasp." : "Solid understanding."}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Subjective Insights */}
              {(loadingInsights || insights) && (
                <div className="pt-8 border-t border-zinc-800/50">
                  <h3 className="text-[10px] font-sans text-zinc-500 uppercase tracking-widest mb-4">Subjective Feedback</h3>
                  {loadingInsights ? (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Synthesizing performance feedback...
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-p:text-sm prose-li:text-sm prose-p:leading-relaxed prose-li:leading-relaxed max-w-none text-zinc-300 font-serif">
                      <Markdown>{insights}</Markdown>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Founder's Club Bit */}
        <div className="mt-12 w-full max-w-xl mx-auto backdrop-blur-md bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          <h3 className="text-lg font-sans font-semibold text-white mb-4">Unlock The Network</h3>
          <p className="text-sm font-sans text-zinc-400 mb-6 leading-relaxed">
            TARK is an ad-free initiative, forever. Secure Founder Status to unlock global rankings, peer-to-peer combat, direct dev communication, and personalized feedback for rapid growth in our paid package.
          </p>
          <a 
            href="https://razorpay.com/link/placeholder"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-block py-3 px-6 rounded-md text-sm font-sans font-medium text-black bg-white hover:bg-zinc-200 focus:outline-none transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] mb-8"
          >
            Secure Founder Status
          </a>
          <div className="pt-6 border-t border-zinc-800/50">
            <p className="text-sm font-sans text-zinc-300 leading-relaxed max-w-md mx-auto italic">
              "I built this platform to test the absolute limits of true prep and your knowledge horizons. Founder Status gives you direct access. If you see a flaw in the system, I want to hear from you. - Your Architect."
            </p>
            <a 
              href="mailto:tark.feed26@gmail.com"
              className="mt-4 inline-block text-xs font-sans text-zinc-500 hover:text-white underline underline-offset-4"
            >
              tark.feed26@gmail.com
            </a>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
