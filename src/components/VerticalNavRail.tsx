import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  House,
  Swords,
  Globe,
  Layers,
  BookOpen,
  Trophy,
  User,
  LogIn,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutTemplate,
  Sparkles
} from 'lucide-react';

export type NavTab = 'arena' | 'tracker' | 'library' | 'humanities' | 'leaderboard' | 'profile';

interface NavItem {
  id: NavTab | 'home';
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey: string;
  group: 'home' | 'intelligence' | 'arena' | 'vault' | 'system';
}

interface VerticalNavRailProps {
  activeTab: NavTab;
  isLanding: boolean;
  userEmail: string | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onNavigateHome: () => void;
  onOpenLogin: () => void;
  onSwitchToHorizontal: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home Sanctuary', shortLabel: 'Home', icon: House, hotkey: '1', group: 'home' },
  { id: 'tracker', label: 'Daily Brief', shortLabel: 'Brief', icon: Globe, hotkey: '2', group: 'intelligence' },
  { id: 'arena', label: 'Test Arena', shortLabel: 'Arena', icon: Swords, hotkey: '3', group: 'arena' },
  { id: 'library', label: 'Syllabus Pillars', shortLabel: 'Pillars', icon: Layers, hotkey: '4', group: 'vault' },
  { id: 'humanities', label: 'Humanities Canon', shortLabel: 'Canon', icon: BookOpen, hotkey: '5', group: 'vault' },
  { id: 'leaderboard', label: 'Leaderboard', shortLabel: 'Rank', icon: Trophy, hotkey: '6', group: 'system' },
];

export default function VerticalNavRail({
  activeTab,
  isLanding,
  userEmail,
  isExpanded,
  onToggleExpand,
  onNavigateTab,
  onNavigateHome,
  onOpenLogin,
  onSwitchToHorizontal,
}: VerticalNavRailProps) {
  const prefersReducedMotion = useReducedMotion();

  const handleItemClick = (item: NavItem) => {
    if (item.id === 'home') {
      onNavigateHome();
    } else {
      onNavigateTab(item.id as NavTab);
    }
  };

  const isItemActive = (item: NavItem) => {
    if (item.id === 'home') return isLanding;
    return !isLanding && activeTab === item.id;
  };

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col justify-between border-r border-[rgba(19,108,153,0.45)] bg-[rgba(4,25,54,0.85)] backdrop-blur-xl font-sans text-stone-200 select-none transition-all duration-300 ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
      style={{
        boxShadow: '4px 0 24px -4px rgba(0, 0, 0, 0.45)',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ── Top Brand Header ── */}
      <div className="flex flex-col">
        <div
          onClick={onNavigateHome}
          className={`flex items-center gap-3 px-4 py-5 border-b border-[rgba(19,108,153,0.35)] cursor-pointer group transition-colors ${
            isExpanded ? 'justify-start' : 'justify-center'
          }`}
          title="Tark | तर्क — Home"
        >
          <div className="w-8 h-8 rounded-xs bg-[rgba(224,208,171,0.12)] border border-[rgba(224,208,171,0.4)] flex items-center justify-center text-[#e0d0ab] group-hover:border-[#e0d0ab] group-hover:bg-[rgba(224,208,171,0.2)] transition-all shrink-0">
            <span className="font-serif font-bold text-sm">त</span>
          </div>

          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              className="flex flex-col min-w-0"
            >
              <span className="font-serif font-bold text-[15px] tracking-wide text-[#e0d0ab] leading-none">
                Tark
              </span>
              <span className="font-serif text-[11px] text-[#8fa2bd] tracking-widest mt-1">
                तर्क &bull; ARENA
              </span>
            </motion.div>
          )}
        </div>

        {/* ── Navigation Groupings ── */}
        <nav className="p-2 space-y-1 mt-2">
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                title={`${item.label} (Alt+${item.hotkey})`}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xs transition-all duration-200 group cursor-pointer ${
                  isExpanded ? 'justify-start' : 'justify-center'
                } ${
                  active
                    ? 'bg-[rgba(224,208,171,0.12)] text-[#e0d0ab] font-medium'
                    : 'text-[#8fa2bd] hover:text-[#e8e0cf] hover:bg-[rgba(11,61,120,0.35)]'
                }`}
              >
                {/* Active Indicator Bar on left edge */}
                {active && (
                  <motion.span
                    layoutId="vertical-rail-active-edge"
                    className="absolute left-0 top-1 bottom-1 w-1 bg-[#e0d0ab] rounded-r-xs"
                    transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}

                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    active ? 'text-[#e0d0ab] scale-105' : 'text-[#8fa2bd] group-hover:text-[#e8e0cf] group-hover:scale-110'
                  }`}
                />

                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between flex-1 min-w-0"
                  >
                    <span className="text-xs truncate">{item.label}</span>
                    <span className="text-[9px] font-mono text-[#5c6f8a] opacity-70 border border-[rgba(19,108,153,0.4)] px-1 py-0.2 rounded-xs group-hover:text-[#8fa2bd]">
                      {item.hotkey}
                    </span>
                  </motion.div>
                )}
              </button>
            );
          })}

          {/* Profile Button (when signed in) */}
          {userEmail && (
            <button
              onClick={() => onNavigateTab('profile')}
              title="Profile & History"
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xs transition-all duration-200 group cursor-pointer ${
                isExpanded ? 'justify-start' : 'justify-center'
              } ${
                !isLanding && activeTab === 'profile'
                  ? 'bg-[rgba(224,208,171,0.12)] text-[#e0d0ab] font-medium'
                  : 'text-[#8fa2bd] hover:text-[#e8e0cf] hover:bg-[rgba(11,61,120,0.35)]'
              }`}
            >
              {!isLanding && activeTab === 'profile' && (
                <motion.span
                  layoutId="vertical-rail-active-edge"
                  className="absolute left-0 top-1 bottom-1 w-1 bg-[#e0d0ab] rounded-r-xs"
                  transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
              <User className="w-4 h-4 shrink-0" />
              {isExpanded && (
                <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-xs truncate">
                  Profile & History
                </motion.span>
              )}
            </button>
          )}
        </nav>
      </div>

      {/* ── Bottom Controls & Layout Switcher ── */}
      <div className="p-2 space-y-1 border-t border-[rgba(19,108,153,0.35)] bg-[rgba(3,16,38,0.5)]">
        {/* Sign In Affordance if Logged Out */}
        {!userEmail && (
          <button
            onClick={onOpenLogin}
            title="Sign In to Tark"
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xs border border-[rgba(224,208,171,0.35)] bg-[rgba(224,208,171,0.08)] hover:bg-[#e0d0ab] text-[#e0d0ab] hover:text-[#072e63] text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              isExpanded ? 'justify-start' : 'justify-center'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            {isExpanded && <span>Sign In</span>}
          </button>
        )}

        {/* Layout Switcher (Switch to Top Horizontal Header) */}
        <button
          onClick={onSwitchToHorizontal}
          title="Switch to Top Header Mode"
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xs text-[#8fa2bd] hover:text-[#e0d0ab] hover:bg-[rgba(11,61,120,0.35)] text-xs font-sans transition-colors cursor-pointer ${
            isExpanded ? 'justify-start' : 'justify-center'
          }`}
        >
          <LayoutTemplate className="w-3.5 h-3.5 shrink-0 text-[#0194a8]" />
          {isExpanded && <span className="text-[11px]">Top Header Mode</span>}
        </button>

        {/* Rail Width Toggle */}
        <button
          onClick={onToggleExpand}
          title={isExpanded ? 'Collapse Rail' : 'Expand Rail'}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xs text-[#8fa2bd] hover:text-[#e0d0ab] hover:bg-[rgba(11,61,120,0.35)] text-xs font-sans transition-colors cursor-pointer ${
            isExpanded ? 'justify-start' : 'justify-center'
          }`}
        >
          {isExpanded ? (
            <>
              <PanelLeftClose className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px]">Collapse Rail</span>
            </>
          ) : (
            <PanelLeftOpen className="w-3.5 h-3.5 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}
