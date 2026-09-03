import React, { useState } from 'react';
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
  Bookmark,
  Radio,
  Clock,
  Target,
  Compass
} from 'lucide-react';

import BrandLogo, { TarkSigil } from './BrandLogo';
import { NAV_ITEMS, PROFILE_NAV_ITEM, NavItem, NavTab } from '../lib/navItems';
import AnimatedNavIcon from './AnimatedNavIcon';
import type { CandidatePreferences } from '../types';
import { calculateExamCountdown, formatTrackBadge } from '../lib/candidatePreferences';
import { getOptionalSubject } from '../data/optional-subjects';
export type { NavTab, NavItem };

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

interface VerticalNavRailProps {
  activeTab: NavTab;
  isLanding: boolean;
  userEmail: string | null;
  isExpanded: boolean;
  candidatePreferences?: CandidatePreferences;
  contextActions?: ContextActionItem[];
  onToggleExpand: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onNavigateHome: () => void;
  onOpenLogin: () => void;
  onSwitchToHorizontal: () => void;
  onRecalibrateTrack?: () => void;
  onStartTour?: () => void;
}

export default function VerticalNavRail({
  activeTab,
  isLanding,
  userEmail,
  isExpanded,
  candidatePreferences,
  contextActions,
  onToggleExpand,
  onNavigateTab,
  onNavigateHome,
  onOpenLogin,
  onSwitchToHorizontal,
  onRecalibrateTrack,
  onStartTour,
}: VerticalNavRailProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hoveredNavId, setHoveredNavId] = useState<string | null>(null);
  const countdown = calculateExamCountdown(candidatePreferences?.targetYear || '2026');
  const trackBadge = candidatePreferences ? formatTrackBadge(candidatePreferences) : "CSE '26 · PSIR";


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
      aria-label="Candidate Command Rail"
      className={`fixed top-0 left-0 bottom-0 z-40 bg-[rgba(4,25,54,0.85)] backdrop-blur-xl border-r border-[rgba(19,108,153,0.45)] flex flex-col justify-between transition-all duration-300 select-none shadow-2xl ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
      style={{
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top Section: Brand Sigil + Candidate Horizon Command Card + Nav */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-none">
        {/* Brand Header */}
        <div className={`p-3.5 border-b border-[rgba(19,108,153,0.3)] flex items-center ${isExpanded ? 'justify-between' : 'justify-center'}`}>
          <div
            data-tour="nav-brand"
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Tark 1.0 — Analytical Test Arena"
          >
            <TarkSigil size={32} />
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <span className="font-serif font-bold text-sm text-[#e0d0ab] tracking-wider leading-none">
                  TARK
                </span>
                <span className="text-[10px] font-sans uppercase tracking-widest text-[#0194a8] leading-tight">
                  Arena 1.0
                </span>
              </motion.div>
            )}
          </div>

          {/* Expand / Collapse Rail Toggle */}
          {isExpanded && (
            <button
              onClick={onToggleExpand}
              title="Collapse Rail (Alt+[)"
              className="p-1 rounded text-[#8fa2bd] hover:text-[#e0d0ab] hover:bg-[rgba(11,61,120,0.4)] transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Candidate Command Pill: Uncluttered Horizon & Track ── */}
        {candidatePreferences && (() => {
          const opt = getOptionalSubject(candidatePreferences.optionalSubject);
          return isExpanded ? (
            <button
              data-tour="candidate-track"
              type="button"
              onClick={onRecalibrateTrack}
              title="Click to recalibrate candidate profile & track"
              className="mx-3 mt-3 p-3 rounded-md bg-[rgba(11,61,120,0.25)] hover:bg-[rgba(11,61,120,0.4)] border border-[rgba(19,108,153,0.35)] hover:border-[#e0d0ab]/50 transition-all text-left group cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]/80"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#e0d0ab] tracking-tight">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse shrink-0" />
                  <span className="tabular-nums">{countdown.daysRemaining}d</span>
                  <span className="text-[11px] font-sans font-normal text-[#8fa2bd]">to {countdown.label}</span>
                </span>
                {onRecalibrateTrack && (
                  <span className="text-[11px] font-sans text-[#8fa2bd] group-hover:text-[#e0d0ab] flex items-center gap-0.5 transition-colors">
                    Edit
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                )}
              </div>
              <div className="text-[11px] font-medium text-[#cad5e2] truncate">
                {opt?.shortName || 'General Studies'}
              </div>
            </button>
          ) : (
            <button
              data-tour="candidate-track"
              type="button"
              onClick={onRecalibrateTrack}
              title={`Target: ${countdown.label} (${countdown.daysRemaining} days remaining) · ${opt?.shortName || 'Track'}. Click to recalibrate.`}
              className="mx-auto mt-3 w-10 h-10 rounded-md bg-[rgba(11,61,120,0.25)] hover:bg-[rgba(11,61,120,0.4)] border border-[rgba(19,108,153,0.35)] hover:border-[#e0d0ab]/50 transition-all cursor-pointer flex flex-col items-center justify-center text-center group shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]/80"
            >
              <span className="font-mono text-[10px] font-bold text-[#e0d0ab] leading-none tabular-nums">
                {countdown.daysRemaining}d
              </span>
              <span className="text-[9px] font-sans font-medium text-[#8fa2bd] group-hover:text-[#e0d0ab] mt-0.5 leading-none">
                {candidatePreferences.targetYear === 'state-psc' ? 'PSC' : `'${candidatePreferences.targetYear.slice(2)}`}
              </span>
            </button>
          );
        })()}

        {/* ── Navigation Groupings ── */}
        <nav className="p-2 space-y-1 mt-2">
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item);
            const isItemHovered = hoveredNavId === item.id;

            return (
              <motion.button
                key={item.id}
                data-tour={`nav-${item.id}`}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setHoveredNavId(item.id)}
                onMouseLeave={() => setHoveredNavId(null)}
                whileHover={prefersReducedMotion ? undefined : { x: 2 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                title={`${item.label} (Alt+${item.hotkey})`}
                className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]/80 ${
                  isExpanded ? 'justify-start' : 'justify-center'
                } ${
                  active
                    ? 'bg-[rgba(224,208,171,0.12)] text-[#e0d0ab] border border-[rgba(224,208,171,0.3)] font-semibold shadow-xs'
                    : 'text-[#8fa2bd] hover:text-[#e8e0cf] hover:bg-[rgba(11,61,120,0.3)]'
                }`}
              >
                {/* Active Indicator Bar on left edge */}
                {active && (
                  <motion.span
                    layoutId="vertical-rail-active-edge"
                    className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#e0d0ab] rounded-r-xs"
                    transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}

                <AnimatedNavIcon
                  id={item.id}
                  isActive={active}
                  isHovered={isItemHovered}
                  size={18}
                  className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                    active ? 'text-[#e0d0ab]' : 'text-[#8fa2bd] group-hover:text-[#e8e0cf]'
                  }`}
                />

                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between flex-1 min-w-0"
                  >
                    <span className="text-xs font-sans truncate">{item.label}</span>
                    <span className="text-[10px] font-sans text-[#7a8ea8] border border-[rgba(19,108,153,0.35)] bg-[rgba(3,18,42,0.6)] px-1.5 py-0.5 rounded group-hover:text-[#e8e0cf] group-hover:border-[#e0d0ab]/40 transition-colors">
                      {item.hotkey}
                    </span>
                  </motion.div>
                )}
              </motion.button>
            );
          })}

          {/* Profile Button (when signed in) */}
          {userEmail && (() => {
            const active = !isLanding && activeTab === 'profile';
            const isItemHovered = hoveredNavId === 'profile';
            return (
              <motion.button
                onClick={() => onNavigateTab('profile')}
                onMouseEnter={() => setHoveredNavId('profile')}
                onMouseLeave={() => setHoveredNavId(null)}
                whileHover={prefersReducedMotion ? undefined : { x: 2 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                title={`${PROFILE_NAV_ITEM.label} (Alt+${PROFILE_NAV_ITEM.hotkey})`}
                className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]/80 ${
                  isExpanded ? 'justify-start' : 'justify-center'
                } ${
                  active
                    ? 'bg-[rgba(224,208,171,0.12)] text-[#e0d0ab] border border-[rgba(224,208,171,0.3)] font-semibold shadow-xs'
                    : 'text-[#8fa2bd] hover:text-[#e8e0cf] hover:bg-[rgba(11,61,120,0.3)]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="vertical-rail-active-edge"
                    className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#e0d0ab] rounded-r-xs"
                    transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <AnimatedNavIcon
                  id="profile"
                  isActive={active}
                  isHovered={isItemHovered}
                  size={18}
                  className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                    active ? 'text-[#e0d0ab]' : 'text-[#8fa2bd] group-hover:text-[#e8e0cf]'
                  }`}
                />
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between flex-1 min-w-0"
                  >
                    <span className="text-xs font-sans truncate">{PROFILE_NAV_ITEM.label}</span>
                    <span className="text-[10px] font-sans text-[#7a8ea8] border border-[rgba(19,108,153,0.35)] bg-[rgba(3,18,42,0.6)] px-1.5 py-0.5 rounded group-hover:text-[#e8e0cf] group-hover:border-[#e0d0ab]/40 transition-colors">
                      {PROFILE_NAV_ITEM.hotkey}
                    </span>
                  </motion.div>
                )}
              </motion.button>
            );
          })()}
        </nav>

        {/* ── Contextual Page Actions (Bracket Area - Dynamic per Page) ── */}
        {!isLanding && effectiveActions && effectiveActions.length > 0 && (
          <div className="p-2 border-t border-[rgba(19,108,153,0.3)] my-1">
            {isExpanded && (
              <div className="px-2 py-1 mb-1 text-[10px] font-sans uppercase tracking-wider text-[#0194a8] font-bold flex items-center justify-between">
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
                  <motion.button
                    key={action.id}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    whileHover={prefersReducedMotion || action.disabled ? undefined : { x: 2 }}
                    whileTap={prefersReducedMotion || action.disabled ? undefined : { scale: 0.98 }}
                    title={`${action.label}${action.tooltip ? ` — ${action.tooltip}` : ''}`}
                    className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]/80 ${
                      isExpanded ? 'justify-start' : 'justify-center'
                    } ${
                      active
                        ? 'bg-[rgba(224,208,171,0.12)] text-[#e0d0ab] border border-[rgba(224,208,171,0.3)] font-semibold shadow-xs'
                        : 'text-[#8fa2bd] hover:text-[#e8e0cf] hover:bg-[rgba(11,61,120,0.3)]'
                    } ${action.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {active && (
                      <motion.span
                        layoutId="vertical-rail-context-active-edge"
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#e0d0ab] rounded-r-xs"
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.4 }}
                      />
                    )}
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                        active ? 'text-[#e0d0ab] scale-105' : 'text-[#8fa2bd] group-hover:text-[#e8e0cf] group-hover:scale-105'
                      }`}
                    />
                    {isExpanded && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="text-xs font-sans truncate">{action.label}</span>
                        {action.badge !== undefined && (
                          <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-[rgba(11,61,120,0.6)] text-[#e0d0ab] border border-[rgba(19,108,153,0.4)]">
                            {action.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Controls & Layout Switcher ── */}
      <div className="p-2 space-y-1.5 border-t border-[rgba(19,108,153,0.35)]">
        {/* Sign In Affordance if Logged Out */}
        {!userEmail && (
          <motion.button
            onClick={onOpenLogin}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            title="Sign In to Tark"
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md bg-[#e0d0ab] hover:bg-white text-[#072e63] font-sans text-xs font-semibold shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab] ${
              isExpanded ? 'justify-start' : 'justify-center'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            {isExpanded && <span>Sign In</span>}
          </motion.button>
        )}

        {/* Product Tour Trigger */}
        {onStartTour && (
          <button
            onClick={onStartTour}
            title="Start Interactive Product Tour"
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[#8fa2bd] hover:text-[#e0d0ab] hover:bg-[rgba(11,61,120,0.35)] text-xs font-sans transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]/80 ${
              isExpanded ? 'justify-start' : 'justify-center'
            }`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0 text-[#e0d0ab]" />
            {isExpanded && <span className="text-xs">Product Tour</span>}
          </button>
        )}

        {/* Layout Switcher (Switch to Top Horizontal Header) */}
        <button
          onClick={onSwitchToHorizontal}
          title="Switch to Top Header Mode"
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[#8fa2bd] hover:text-[#e0d0ab] hover:bg-[rgba(11,61,120,0.35)] text-xs font-sans transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]/80 ${
            isExpanded ? 'justify-start' : 'justify-center'
          }`}
        >
          <LayoutTemplate className="w-3.5 h-3.5 shrink-0 text-[#0194a8]" />
          {isExpanded && <span className="text-xs">Top Header Mode</span>}
        </button>

        {/* Rail Width Toggle */}
        <button
          onClick={onToggleExpand}
          title={isExpanded ? 'Collapse Rail' : 'Expand Rail'}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[#8fa2bd] hover:text-[#e0d0ab] hover:bg-[rgba(11,61,120,0.35)] text-xs font-sans transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]/80 ${
            isExpanded ? 'justify-start' : 'justify-center'
          }`}
        >
          {isExpanded ? (
            <>
              <PanelLeftClose className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs">Collapse Rail</span>
            </>
          ) : (
            <PanelLeftOpen className="w-3.5 h-3.5 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}
