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
  Sparkles,
  Scale,
  Zap,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';

import BrandLogo, { TarkSigil } from './BrandLogo';

export type NavTab = 'arena' | 'tracker' | 'library' | 'humanities' | 'leaderboard' | 'profile';

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
  contextActions?: ContextActionItem[];
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

  const effectiveActions: ContextActionItem[] =
    contextActions && contextActions.length > 0
      ? contextActions
      : !isLanding && activeTab === 'tracker'
      ? [
          {
            id: 'prs',
            label: 'PRS Legislative Vault',
            shortLabel: 'PRS',
            icon: Scale,
            accentColor: 'purple',
            onClick: () => window.dispatchEvent(new CustomEvent('tark:brief-action', { detail: 'prs' })),
            tooltip: 'Open Statutory Acts & Parliamentary Bills (PRS Vault)',
          },
          {
            id: 'pib',
            label: 'PIB Daily Digest',
            shortLabel: 'PIB',
            icon: BookOpen,
            onClick: () => window.dispatchEvent(new CustomEvent('tark:brief-action', { detail: 'pib' })),
            tooltip: 'Open PIB Daily Digest Reader',
          },
          {
            id: 'signals',
            label: 'Signal Deck Feed',
            shortLabel: 'Deck',
            icon: Zap,
            accentColor: 'gold',
            onClick: () => window.dispatchEvent(new CustomEvent('tark:brief-action', { detail: 'signals' })),
            tooltip: 'Continuous Policy Dispatches Stream',
          },
          {
            id: 'edition',
            label: 'Daily Edition (10 Briefs)',
            shortLabel: 'Edition',
            icon: Sparkles,
            badge: 10,
            accentColor: 'cyan',
            onClick: () => window.dispatchEvent(new CustomEvent('tark:brief-action', { detail: 'edition' })),
            tooltip: 'Finite Curated Daily Edition',
          },
          {
            id: 'filters',
            label: 'Filter Hub',
            shortLabel: 'Filters',
            icon: SlidersHorizontal,
            onClick: () => window.dispatchEvent(new CustomEvent('tark:brief-action', { detail: 'filters' })),
            tooltip: 'Toggle Intelligence Filters',
          },
          {
            id: 'saved',
            label: 'Saved Signals',
            shortLabel: 'Saved',
            icon: Bookmark,
            onClick: () => window.dispatchEvent(new CustomEvent('tark:brief-action', { detail: 'saved' })),
            tooltip: 'Candidate Bookmarked Dispatches',
          },
        ]
      : [];

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
          className={`flex items-center px-4 py-4 border-b border-[rgba(19,108,153,0.35)] cursor-pointer group transition-colors ${
            isExpanded ? 'justify-start' : 'justify-center'
          }`}
          title="Tark | तर्क — Home"
        >
          <BrandLogo
            size="md"
            isCompact={!isExpanded}
            showSubtitle={true}
          />
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

        {/* ── Contextual Page Actions (Bracket Area - Dynamic per Page) ── */}
        {!isLanding && effectiveActions && effectiveActions.length > 0 && (
          <div className="p-2 border-t border-[rgba(19,108,153,0.3)] my-1 bg-[rgba(3,18,42,0.4)]">
            {isExpanded && (
              <div className="px-2 py-1 mb-1 text-[9px] font-mono uppercase tracking-wider text-[#0194a8] font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0194a8] animate-pulse" />
                  <span>Page Actions</span>
                </span>
              </div>
            )}
            <div className="space-y-1">
              {effectiveActions.map((action) => {
                const Icon = action.icon;
                const active = !!action.isActive;
                return (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    title={`${action.label}${action.tooltip ? ` — ${action.tooltip}` : ''}`}
                    className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xs transition-all duration-200 group cursor-pointer ${
                      isExpanded ? 'justify-start' : 'justify-center'
                    } ${
                      active
                        ? 'bg-[rgba(224,208,171,0.14)] text-[#e0d0ab] border border-[rgba(224,208,171,0.4)] font-medium shadow-sm'
                        : 'text-[#8fa2bd] hover:text-[#e8e0cf] hover:bg-[rgba(11,61,120,0.35)]'
                    } ${action.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {active && (
                      <motion.span
                        layoutId="vertical-rail-context-active-edge"
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
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="text-xs truncate">{action.label}</span>
                        {action.badge !== undefined && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-xs bg-[rgba(11,61,120,0.6)] text-[#e0d0ab] border border-[rgba(19,108,153,0.4)]">
                            {action.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
