/**
 * src/lib/candidatePreferences.ts
 *
 * Client persistence & domain helper for Candidate Induction & Preferences.
 * Hydrates optimistically from localStorage (zero flicker) and synchronizes
 * bidirectionally with Supabase public.user_profiles.preferences.
 */

import { supabase } from './supabase';
import type { CandidatePreferences, TargetYear, OptionalSubjectId } from '../types';
import { getOptionalSubject, TARGET_YEARS_CONFIG } from '../data/optional-subjects';

export const CANDIDATE_PROFILE_STORAGE_KEY = 'tark_candidate_profile';
export const ONBOARDING_COMPLETED_KEY = 'tark_onboarding_completed';

export const DEFAULT_PREFERENCES: CandidatePreferences = {
  targetYear: '2026',
  attemptStage: 'foundation',
  aspirantPersona: 'full_time',
  optionalSubject: 'psir',
  optionalStage: 'foundation',
  focusPillars: ['gs2', 'gs3'],
  dailyMcqTarget: 10,
  dailyReadingMins: 7,
  difficultyPreference: 'standard',
  onboardingCompleted: false,
  inductionPledged: false,
  updatedAt: new Date().toISOString()
};

/**
 * Return default preferences object
 */
export function getDefaultPreferences(): CandidatePreferences {
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Load preferences optimistically from localStorage, then verify against Supabase.
 */
export async function loadStoredPreferences(userId?: string): Promise<CandidatePreferences> {
  let localPrefs: CandidatePreferences | null = null;
  try {
    const raw = localStorage.getItem(CANDIDATE_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Support migration from legacy shape
      if (parsed.preferences) {
        localPrefs = parsed.preferences;
      } else if (parsed.targetYear) {
        localPrefs = {
          ...DEFAULT_PREFERENCES,
          ...parsed,
          focusPillars: Array.isArray(parsed.focusPillars)
            ? parsed.focusPillars.map((p: string) => (p.startsWith('gs') ? p : p === 'polity' ? 'gs2' : p === 'economy' ? 'gs3' : p === 'history' ? 'gs1' : p === 'ethics' ? 'gs4' : 'gs2'))
            : DEFAULT_PREFERENCES.focusPillars
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse local candidate profile:', e);
  }

  // If we have a logged-in user, fetch authoritative copy from Supabase
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data && data.preferences) {
        const merged = { ...DEFAULT_PREFERENCES, ...localPrefs, ...data.preferences };
        try {
          localStorage.setItem(CANDIDATE_PROFILE_STORAGE_KEY, JSON.stringify({ preferences: merged }));
          if (merged.onboardingCompleted) {
            localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
          }
        } catch {
          /* ignore */
        }
        return merged;
      }
    } catch (err) {
      console.warn('Failed to fetch remote candidate preferences:', err);
    }
  }

  return localPrefs || getDefaultPreferences();
}

/**
 * Persist preferences to localStorage immediately and sync to Supabase.
 */
export async function savePreferences(
  preferences: CandidatePreferences,
  userId?: string,
  candidateName?: string
): Promise<void> {
  const payload = {
    ...preferences,
    updatedAt: new Date().toISOString()
  };

  // 1. Optimistic local cache
  try {
    localStorage.setItem(CANDIDATE_PROFILE_STORAGE_KEY, JSON.stringify({ name: candidateName, preferences: payload }));
    if (payload.onboardingCompleted) {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    }
  } catch (e) {
    console.warn('Failed to write local candidate profile:', e);
  }

  // 2. Remote database update
  if (userId) {
    try {
      const updateObj: Record<string, any> = {
        preferences: payload,
        updated_at: new Date().toISOString()
      };
      if (candidateName) {
        updateObj.display_name = candidateName;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updateObj)
        .eq('user_id', userId);

      if (error) {
        console.warn('Failed to update user_profiles preferences:', error);
      }
    } catch (err) {
      console.warn('Exception persisting preferences to Supabase:', err);
    }
  }
}

export interface ExamCountdown {
  targetYear: TargetYear;
  label: string;
  daysRemaining: number;
  dateFormatted: string;
  isPast: boolean;
}

/**
 * Compute the remaining days until the chosen UPSC Prelims examination window.
 */
export function calculateExamCountdown(targetYear: TargetYear = '2026'): ExamCountdown {
  const config = TARGET_YEARS_CONFIG.find((y) => y.id === targetYear) || TARGET_YEARS_CONFIG[1];
  const targetDate = new Date(config.targetDate + 'T09:30:00+05:30'); // 9:30 AM IST (Paper 1 start)
  const now = new Date();
  
  const diffTime = targetDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const isPast = diffTime < 0;

  const dateFormatted = targetDate.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return {
    targetYear,
    label: config.label,
    daysRemaining,
    dateFormatted,
    isPast
  };
}

/**
 * Generate high-density status badge string: e.g. "CSE '26 · PSIR · GS-2/3"
 */
export function formatTrackBadge(preferences: CandidatePreferences): string {
  const yearShort = preferences.targetYear === 'state-psc' ? 'State PSC' : `'${preferences.targetYear.slice(2)}`;
  const opt = getOptionalSubject(preferences.optionalSubject);
  const optShort = opt.shortName;
  const pillarsShort = preferences.focusPillars.map((p) => p.toUpperCase()).join('/');

  return `${yearShort} · ${optShort} · ${pillarsShort}`;
}

/**
 * Check if a news article or headline matches candidate's optional subject keywords.
 */
export function matchOptionalRelevance(
  headline: string,
  summaryBullets: string[] = [],
  optionalSubjectId: OptionalSubjectId
): { matches: boolean; matchedKeyword?: string; optionalName: string } {
  const optional = getOptionalSubject(optionalSubjectId);
  const textCorpus = (headline + ' ' + summaryBullets.join(' ')).toLowerCase();

  for (const kw of optional.newsKeywords) {
    if (textCorpus.includes(kw.toLowerCase())) {
      return {
        matches: true,
        matchedKeyword: kw,
        optionalName: optional.shortName
      };
    }
  }

  return {
    matches: false,
    optionalName: optional.shortName
  };
}
