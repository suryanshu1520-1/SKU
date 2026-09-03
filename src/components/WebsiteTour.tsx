import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Swords,
  Globe,
  Layers,
  Target,
  Check,
  BookOpen,
  Command,
  Award,
  Zap,
  HelpCircle
} from 'lucide-react';
import type { NavTab } from '../lib/navItems';

export interface TourStep {
  id: string;
  targetSelector: string;
  fallbackSelector?: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  proTip?: string;
  hotkey?: string;
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right';
  targetTab?: NavTab;
}

export const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    id: 'brand',
    targetSelector: '[data-tour="nav-brand"]',
    fallbackSelector: 'aside',
    category: 'WAR ROOM COMMAND',
    icon: Command,
    title: 'Your Analytical Command Deck',
    body: 'Tark is a sterile, distraction-free war room engineered specifically for UPSC CSE and State PSC aspirants. Use the command rail to swiftly toggle between high-stakes testing, policy intelligence, and syllabus vaults.',
    proTip: 'Press [Alt + [] to toggle rail expansion or [Alt + 1]–[6] to switch tabs instantly.',
    hotkey: 'Alt+[',
    preferredPlacement: 'right',
  },
  {
    id: 'tracker',
    targetSelector: '[data-tour="nav-tracker"]',
    category: 'OFFICIAL INTELLIGENCE',
    icon: Globe,
    title: 'The Daily Brief & Gazette Feed',
    body: 'Live policy dispatches aggregated directly from PIB, RBI, PRS Legislative, and The Hindu. Every notification is distilled into a 6-layer syllabus framework (Executive Takeaways, Revision Targets, Mains 360°, and Prelims Trap Radar).',
    proTip: 'Read the finite 10-Dispatch Daily Edition each morning in under 5 minutes.',
    hotkey: 'Alt+3',
    preferredPlacement: 'right',
    targetTab: 'tracker',
  },
  {
    id: 'grounding',
    targetSelector: '[data-tour="grounding-info"]',
    fallbackSelector: '[data-tour="nav-tracker"]',
    category: 'ANTI-HALLUCINATION',
    icon: ShieldCheck,
    title: 'Zero-Hallucination Grounding',
    body: 'Tark enforces a deterministic Cite-or-Drop protocol. Every budget outlay, percentage, and statutory acronym is audited against raw government gazettes. A 67% or 100% badge means facts you can quote with absolute authority in Mains answers.',
    proTip: 'Click on any Grounding Badge to inspect sentence-level verbatim quotes.',
    preferredPlacement: 'bottom',
    targetTab: 'tracker',
  },
  {
    id: 'arena',
    targetSelector: '[data-tour="nav-arena"]',
    category: 'AUTHENTIC SIMULATION',
    icon: Swords,
    title: 'Competitive Test Arena',
    body: 'Experience true UPSC Prelims conditions (+2.00 / -0.66 marking) with negative marking psychological pressure. Evaluates your score instantly against an All-India candidate distribution with post-drill mistake autopsies.',
    proTip: 'Take daily 10-question sprint drills directly based on today’s news briefs.',
    hotkey: 'Alt+2',
    preferredPlacement: 'right',
    targetTab: 'arena',
  },
  {
    id: 'observatory',
    targetSelector: '[data-tour="nav-observatory"]',
    category: 'SYLLABUS GRAPH',
    icon: Layers,
    title: 'The Observatory & PYQ Vault',
    body: 'Explore 25 years of categorized Previous Year Questions (PYQs). Track your syllabus mastery across GS-1 through GS-4, spot recurring exam themes, and access high-yield standard textbook linkages (Laxmikanth, NCERT, PMFIAS).',
    proTip: 'Audit your weak micro-topics before scheduling full-length mock tests.',
    hotkey: 'Alt+4',
    preferredPlacement: 'right',
    targetTab: 'observatory',
  },
  {
    id: 'track',
    targetSelector: '[data-tour="candidate-track"]',
    fallbackSelector: '[data-tour="nav-profile"]',
    category: 'PERSONALIZED HORIZON',
    icon: Target,
    title: 'Personalized Candidate Track',
    body: 'Calibrate your target exam year (2026/2027) and optional subject (PSIR, Sociology, Geography, History, etc.). Tark automatically pins relevant Optional Paper 2 cross-over anchors to daily policy dispatches.',
    proTip: 'Click your countdown badge anytime to recalibrate your track and syllabus focus.',
    preferredPlacement: 'right',
  },
];

interface WebsiteTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: NavTab) => void;
  steps?: TourStep[];
}

export function WebsiteTour({
  isOpen,
  onClose,
  onNavigateTab,
  steps = DEFAULT_TOUR_STEPS,
}: WebsiteTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [bubblePosition, setBubblePosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'left' | 'right' }>({
    top: 100,
    left: 100,
    placement: 'bottom',
  });

  const step = steps[currentStepIndex];

  // Update target bounding box
  const updateTargetRect = useCallback(() => {
    if (!step) return;

    let el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!el && step.fallbackSelector) {
      el = document.querySelector(step.fallbackSelector) as HTMLElement | null;
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      // Compute bubble coordinates based on target rect
      const bubbleWidth = Math.min(380, window.innerWidth - 32);
      const bubbleHeight = 240;
      const gap = 14;

      let placement = step.preferredPlacement || 'bottom';
      let top = 0;
      let left = 0;

      // Smart positioning
      if (placement === 'right') {
        left = rect.right + gap;
        top = Math.max(16, Math.min(rect.top + rect.height / 2 - bubbleHeight / 2, window.innerHeight - bubbleHeight - 16));
        // Fallback to bottom if not enough space on right
        if (left + bubbleWidth > window.innerWidth - 16) {
          placement = 'bottom';
        }
      }

      if (placement === 'left') {
        left = rect.left - bubbleWidth - gap;
        top = Math.max(16, Math.min(rect.top + rect.height / 2 - bubbleHeight / 2, window.innerHeight - bubbleHeight - 16));
        // Fallback to bottom if not enough space on left
        if (left < 16) {
          placement = 'bottom';
        }
      }

      if (placement === 'bottom') {
        top = rect.bottom + gap;
        left = Math.max(16, Math.min(rect.left + rect.width / 2 - bubbleWidth / 2, window.innerWidth - bubbleWidth - 16));
        // Fallback to top if bottom is off screen
        if (top + bubbleHeight > window.innerHeight - 16) {
          placement = 'top';
        }
      }

      if (placement === 'top') {
        top = rect.top - bubbleHeight - gap;
        left = Math.max(16, Math.min(rect.left + rect.width / 2 - bubbleWidth / 2, window.innerWidth - bubbleWidth - 16));
        if (top < 16) {
          top = 16;
        }
      }

      setBubblePosition({ top, left, placement });
    } else {
      // Fallback: Center screen
      setTargetRect(null);
      setBubblePosition({
        top: window.innerHeight / 2 - 120,
        left: Math.max(16, window.innerWidth / 2 - 190),
        placement: 'bottom',
      });
    }
  }, [step]);

  // Navigate tabs if step requires it
  useEffect(() => {
    if (!isOpen || !step) return;

    if (step.targetTab && onNavigateTab) {
      onNavigateTab(step.targetTab);
    }

    // Allow time for DOM updates
    const timer = setTimeout(() => {
      updateTargetRect();
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, currentStepIndex, step, onNavigateTab, updateTargetRect]);

  // Listen to window scroll & resize to update spotlight geometry
  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [isOpen, updateTargetRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    try {
      localStorage.setItem('tark_website_tour_completed', 'true');
    } catch {
      // ignore local storage restrictions
    }
    onClose();
  };

  if (!isOpen || !step) return null;

  const padding = 6;
  const radius = 8;
  const StepIcon = step.icon || Sparkles;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[800] overflow-hidden select-none font-sans">
        {/* ── 1. The Glass-Out SVG Mask Layer ── */}
        <svg
          className="fixed inset-0 w-full h-full pointer-events-auto cursor-default"
          style={{ width: '100vw', height: '100vh' }}
          onClick={onClose}
        >
          <defs>
            <mask id="tour-spotlight-mask">
              {/* Entire screen is white (visible/dimmed) */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Cutout is black (creates transparent hole) */}
              {targetRect && (
                <rect
                  x={targetRect.left - padding}
                  y={targetRect.top - padding}
                  width={targetRect.width + padding * 2}
                  height={targetRect.height + padding * 2}
                  rx={radius}
                  fill="black"
                />
              )}
            </mask>
          </defs>

          {/* Frosted Dark Glass Backdrop */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(3, 15, 33, 0.82)"
            mask="url(#tour-spotlight-mask)"
            className="backdrop-blur-sm"
          />
        </svg>

        {/* ── 2. Glowing Golden Spotlight Frame around Target ── */}
        {targetRect && (
          <motion.div
            className="fixed pointer-events-none z-[810] rounded-lg border-2 border-[#e0d0ab] shadow-[0_0_35px_rgba(224,208,171,0.4),0_0_15px_rgba(1,148,168,0.3)] transition-all duration-300 ease-out"
            style={{
              top: targetRect.top - padding,
              left: targetRect.left - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          >
            {/* Subtle Pulsing Corner Accents */}
            <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#e0d0ab] rounded-xs shadow-xs" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#e0d0ab] rounded-xs shadow-xs" />
            <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#e0d0ab] rounded-xs shadow-xs" />
            <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#e0d0ab] rounded-xs shadow-xs" />
          </motion.div>
        )}

        {/* ── 3. Tiny Text Bubble Callout Popover ── */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-[820] w-[340px] sm:w-[380px] bg-zinc-950/95 border border-[#e0d0ab]/40 rounded-sm p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-zinc-200"
          style={{
            top: bubblePosition.top,
            left: bubblePosition.left,
          }}
        >
          {/* Top Bar: Step Pill & Close */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 rounded-xs text-[10px] font-mono font-bold text-[#e0d0ab] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
                <span>STEP {currentStepIndex + 1} OF {steps.length}</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                {step.category}
              </span>
            </div>

            <button
              onClick={handleFinish}
              className="p-1 text-zinc-500 hover:text-white transition-colors rounded-xs hover:bg-zinc-900 cursor-pointer"
              title="Close Tour (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title with Feature Icon */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-sm bg-[rgba(1,148,168,0.15)] border border-[rgba(1,148,168,0.35)] flex items-center justify-center text-[#0194a8] shrink-0">
              <StepIcon className="w-4 h-4" />
            </div>
            <h4 className="font-serif text-sm sm:text-base font-bold text-white leading-tight">
              {step.title}
            </h4>
          </div>

          {/* Body Text */}
          <p className="text-xs text-zinc-300 font-sans leading-relaxed mb-3">
            {step.body}
          </p>

          {/* Pro Tip Box */}
          {step.proTip && (
            <div className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-sm mb-4 text-[11px] text-[#e0d0ab] flex items-start gap-2">
              <Zap className="w-3.5 h-3.5 text-[#e0d0ab] shrink-0 mt-0.5" />
              <span className="leading-snug">{step.proTip}</span>
            </div>
          )}

          {/* Footer Controls: Dots, Back, Next */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
            {/* Skip Button */}
            <button
              onClick={handleFinish}
              className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Skip Tour
            </button>

            {/* Step Progression Dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'bg-[#e0d0ab] w-5'
                      : idx < currentStepIndex
                      ? 'bg-[#0194a8]'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                  title={`Jump to step ${idx + 1}: ${s.title}`}
                />
              ))}
            </div>

            {/* Next / Back Controls */}
            <div className="flex items-center gap-1.5">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-2.5 py-1.5 rounded-sm bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-sans font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-3.5 py-1.5 rounded-sm bg-[#e0d0ab] hover:bg-white text-zinc-950 text-xs font-sans font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
              >
                {currentStepIndex === steps.length - 1 ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Get Started</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
