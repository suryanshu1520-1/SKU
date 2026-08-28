import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Scale,
  BookOpen,
  RefreshCw,
  Zap,
  Sparkles,
  SlidersHorizontal,
  Swords,
  Target,
  BarChart3,
  History,
  Compass,
  Bookmark,
  Layers,
  Search,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Users,
  ShieldAlert,
  Flame
} from 'lucide-react';

export type PageContextTab = 'arena' | 'tracker' | 'library' | 'humanities' | 'leaderboard' | 'profile';

export interface ContextActionItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  isActive?: boolean;
  disabled?: boolean;
  isAccent?: boolean;
  accentColor?: 'gold' | 'purple' | 'cyan' | 'emerald';
  onClick: () => void;
  tooltip?: string;
}

export interface ContextActionRailProps {
  activeTab: PageContextTab;
  gameState: 'landing' | 'arena' | 'autopsy' | 'login';
  customActions?: ContextActionItem[];
  className?: string;
  isFloating?: boolean;
}

export default function ContextActionRail({
  activeTab,
  gameState,
  customActions,
  className = '',
  isFloating = false,
}: ContextActionRailProps) {
  const prefersReducedMotion = useReducedMotion();

  // Persistent collapsed/expanded state
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tark_context_rail_expanded') === 'true';
    } catch {
      return false;
    }
  });

  const toggleExpand = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    try {
      localStorage.setItem('tark_context_rail_expanded', String(next));
    } catch {
      /* ignore */
    }
  };

  // If no custom actions are passed from the active page, provide page-specific intelligence actions
  const actions: ContextActionItem[] = customActions || [];

  if (actions.length === 0) return null;

  return (
    <aside
      aria-label="Contextual Action Bar"
      className={`select-none font-sans z-40 transition-all duration-300 ${
        isFloating
          ? 'fixed left-20 bottom-8 md:bottom-auto md:top-28'
          : 'relative'
      } ${className}`}
    >
      <div
        className={`flex flex-col bg-[rgba(4,25,54,0.92)] border border-[rgba(19,108,153,0.5)] rounded-xs shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl p-1.5 transition-all duration-300 ${
          isExpanded ? 'w-52' : 'w-13'
        }`}
      >
        {/* Rail Header with Expand/Collapse indicator */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-[rgba(19,108,153,0.3)] mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0194a8] animate-pulse shrink-0" />
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[9.5px] font-mono uppercase tracking-wider text-[#0194a8] font-bold truncate"
              >
                Page Actions
              </motion.span>
            )}
          </div>
          <button
            onClick={toggleExpand}
            title={isExpanded ? 'Collapse Sub-bar' : 'Expand Sub-bar'}
            className="p-1 text-[#8fa2bd] hover:text-[#e0d0ab] hover:bg-[rgba(11,61,120,0.4)] rounded-xs transition-colors cursor-pointer shrink-0"
          >
            {isExpanded ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Action Buttons List */}
        <div className="flex flex-col gap-1">
          {actions.map((action) => {
            const Icon = action.icon;
            const active = !!action.isActive;

            let accentBg = 'bg-[rgba(11,61,120,0.35)]';
            let activeBorder = 'border-[#e0d0ab]';
            let activeText = 'text-[#e0d0ab]';
            let activeBg = 'bg-[rgba(224,208,171,0.12)]';

            if (action.accentColor === 'purple') {
              activeBorder = 'border-[#c084fc]';
              activeText = 'text-[#c084fc]';
              activeBg = 'bg-[rgba(168,85,247,0.15)]';
            } else if (action.accentColor === 'emerald') {
              activeBorder = 'border-emerald-400';
              activeText = 'text-emerald-300';
              activeBg = 'bg-emerald-950/40';
            } else if (action.accentColor === 'cyan') {
              activeBorder = 'border-[#0194a8]';
              activeText = 'text-[#7fd4e0]';
              activeBg = 'bg-[rgba(1,148,168,0.15)]';
            }

            return (
              <button
                key={action.id}
                onClick={action.onClick}
                disabled={action.disabled}
                title={action.tooltip || action.label}
                className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-xs text-xs transition-all duration-200 group cursor-pointer border ${
                  active
                    ? `${activeBg} ${activeBorder} ${activeText} font-semibold shadow-sm`
                    : 'border-transparent text-[#8fa2bd] hover:text-[#e8e0cf] hover:bg-[rgba(11,61,120,0.35)] hover:border-[rgba(19,108,153,0.4)]'
                } ${isExpanded ? 'justify-start' : 'justify-center'} ${
                  action.disabled ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                {/* Active left indicator pill */}
                {active && (
                  <motion.span
                    layoutId="context-rail-active-pill"
                    className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#e0d0ab] rounded-r-xs"
                    transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}

                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    active ? 'scale-105' : 'group-hover:scale-110'
                  }`}
                />

                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, x: -3 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between flex-1 min-w-0"
                  >
                    <span className="truncate text-left text-[11.5px] leading-tight">
                      {action.label}
                    </span>
                    {action.badge !== undefined && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded-xs font-mono text-[9px] bg-[rgba(11,61,120,0.6)] text-[#e0d0ab] border border-[rgba(19,108,153,0.5)]">
                        {action.badge}
                      </span>
                    )}
                  </motion.div>
                )}

                {!isExpanded && action.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#0194a8] text-[#072e63] font-bold text-[8px] flex items-center justify-center shadow-xs">
                    {typeof action.badge === 'number' && action.badge > 9 ? '9+' : action.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
