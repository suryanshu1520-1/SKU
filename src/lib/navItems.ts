import React from 'react';
import {
  House,
  Swords,
  Globe,
  Layers,
  BookOpen,
  Radio,
  Trophy,
  User,
} from 'lucide-react';

export type NavTab = 'arena' | 'tracker' | 'library' | 'humanities' | 'observatory' | 'leaderboard' | 'profile';

export interface NavItem {
  id: NavTab | 'home';
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey: string;
  group: 'home' | 'intelligence' | 'arena' | 'vault' | 'system';
  requiresAuth?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', shortLabel: 'Home', icon: House, hotkey: '1', group: 'home' },
  { id: 'arena', label: 'Test Arena', shortLabel: 'Arena', icon: Swords, hotkey: '3', group: 'arena' },
  { id: 'tracker', label: 'Daily Brief', shortLabel: 'Brief', icon: Globe, hotkey: '2', group: 'intelligence' },
  { id: 'library', label: 'Syllabus Pillars', shortLabel: 'Pillars', icon: Layers, hotkey: '4', group: 'vault' },
  { id: 'humanities', label: 'Humanities', shortLabel: 'Canon', icon: BookOpen, hotkey: '5', group: 'vault' },
  { id: 'observatory', label: 'Observatory', shortLabel: 'Observatory', icon: Radio, hotkey: '6', group: 'vault' },
  { id: 'leaderboard', label: 'Leaderboard', shortLabel: 'Rank', icon: Trophy, hotkey: '7', group: 'system' },
];

export const PROFILE_NAV_ITEM: NavItem = {
  id: 'profile',
  label: 'Profile & History',
  shortLabel: 'Profile',
  icon: User,
  hotkey: '8',
  group: 'system',
  requiresAuth: true,
};
