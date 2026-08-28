import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { composeFrame, type EyesKey, type MouthKey, type ThinkerArt } from '../data/thinker-ascii';

interface ThinkerTerminalCardProps {
  name: string;
  workTitle: string;
  year: number;
  art: ThinkerArt;
  isSelected: boolean;
  onSelect: () => void;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

export default function ThinkerTerminalCard({
  name,
  workTitle,
  year,
  art,
  isSelected,
  onSelect,
}: ThinkerTerminalCardProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [isHovering, setIsHovering] = useState(false);
  // Touch has no hover — a tap sets this instead, and it self-clears after
  // roughly how long the quote takes to finish "speaking."
  const [isTapped, setIsTapped] = useState(false);
  const [blinkClosed, setBlinkClosed] = useState(false);
  const [talkFrame, setTalkFrame] = useState<'openA' | 'openB'>('openA');
  const [revealedChars, setRevealedChars] = useState(0);

  const isActive = isHovering || isTapped;
  const quote = art.pullQuote.text;

  useEffect(() => {
    if (!isTapped) return;
    const timeout = setTimeout(() => setIsTapped(false), quote.length * 24 + 3500);
    return () => clearTimeout(timeout);
  }, [isTapped, quote]);

  // Idle blink loop, randomized so a row of cards doesn't blink in lockstep.
  // Paused while actively "speaking" — talking frames keep the eyes open.
  useEffect(() => {
    if (isActive || reducedMotion) return;
    let openTimer: ReturnType<typeof setTimeout>;
    let closeTimer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      closeTimer = setTimeout(() => {
        setBlinkClosed(true);
        openTimer = setTimeout(() => {
          setBlinkClosed(false);
          scheduleBlink();
        }, 150);
      }, 2400 + Math.random() * 2600);
    };
    scheduleBlink();
    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
    };
  }, [isActive, reducedMotion]);

  // Mouth "flap" loop while speaking.
  useEffect(() => {
    if (!isActive || reducedMotion) return;
    const interval = setInterval(() => {
      setTalkFrame((f) => (f === 'openA' ? 'openB' : 'openA'));
    }, 130);
    return () => clearInterval(interval);
  }, [isActive, reducedMotion]);

  // Typewriter reveal of the pull-quote while speaking.
  useEffect(() => {
    if (!isActive) {
      setRevealedChars(0);
      return;
    }
    if (reducedMotion) {
      setRevealedChars(quote.length);
      return;
    }
    setRevealedChars(0);
    const interval = setInterval(() => {
      setRevealedChars((n) => {
        if (n >= quote.length) {
          clearInterval(interval);
          return n;
        }
        return n + 1;
      });
    }, 24);
    return () => clearInterval(interval);
  }, [isActive, quote, reducedMotion]);

  const eyesKey: EyesKey = isActive || !blinkClosed ? 'open' : 'closed';
  const mouthKey: MouthKey = isActive ? talkFrame : 'closed';
  const frame = composeFrame(art, eyesKey, mouthKey);

  const revealedText = quote.slice(0, revealedChars);
  const isFullyRevealed = revealedChars >= quote.length;

  return (
    <button
      type="button"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocus={() => setIsHovering(true)}
      onBlur={() => setIsHovering(false)}
      onClick={() => {
        onSelect();
        setIsTapped(true);
      }}
      aria-pressed={isSelected}
      className={`relative text-left rounded-sm border p-4 transition-colors cursor-pointer w-full ${
        isSelected
          ? 'bg-zinc-900 border-[#e0d0ab]/50 shadow-lg'
          : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <span className="absolute top-1 left-1.5 text-[10px] font-mono text-zinc-600 leading-none select-none">┌</span>
      <span className="absolute top-1 right-1.5 text-[10px] font-mono text-zinc-600 leading-none select-none">┐</span>
      <span className="absolute bottom-1 left-1.5 text-[10px] font-mono text-zinc-600 leading-none select-none">└</span>
      <span className="absolute bottom-1 right-1.5 text-[10px] font-mono text-zinc-600 leading-none select-none">┘</span>

      <pre
        aria-hidden="true"
        className={`font-mono text-[11px] leading-[13px] text-center mx-auto transition-colors duration-300 ${
          isSelected || isActive ? 'text-[#e0d0ab]' : 'text-zinc-500'
        }`}
      >
        {frame.join('\n')}
      </pre>

      <div className="mt-1 text-center">
        <div className="font-serif font-bold text-sm text-stone-100">{name}</div>
        <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
          {workTitle} · {year}
        </div>
      </div>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 pt-3 border-t border-zinc-800 overflow-hidden"
          >
            <p className="font-mono text-[11px] text-zinc-300 leading-relaxed text-left min-h-[3.2em]">
              <span className="text-[#e0d0ab]">&gt; </span>
              {revealedText}
              {!isFullyRevealed && (
                <span className="inline-block w-1.5 h-3 bg-[#e0d0ab] ml-0.5 animate-pulse align-middle" />
              )}
            </p>
            {isFullyRevealed && (
              <div className="mt-2 text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                [ cited: {art.pullQuote.citation.paper} · {art.pullQuote.citation.year} ]
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
