---
title: "Candidate Onboarding & System-Wide Preferences Architecture"
tags:
  - architecture
  - onboarding
  - preferences
  - upsc-optional
  - tark-1.0
type: technical-manual
status: authoritative-proposal
created_at: 2026-09-03
---

# 🎯 Candidate Onboarding & System-Wide Preferences Architecture

## Executive Summary

Tark is a sterile, zero-noise analytical testing arena and intelligence engine designed specifically for serious UPSC Civil Services Examination (CSE) aspirants. 

In UPSC preparation, preparation strategy diverges fundamentally based on two non-negotiable vectors:
1. **The Target Exam Cycle** (e.g., CSE 2025 final sprint vs. CSE 2026 foundation vs. multi-year 2027+), which dictates temporal pressure and pacing.
2. **The Optional Subject** (500 marks across Paper 1 and Paper 2 — ~29% of Mains written marks), which dictates General Studies synergies, reading prioritization, and thematic cross-overs.

This document establishes the architecture for a **meticulously orchestrated onboarding flow** and the mechanisms by which candidate preferences and optional subjects are **pervasively reflected across every subsystem of the Tark platform**.

---

## 1. Candidate Preferences Domain Model

### 1.1 Data Schema

Candidate preferences are persisted in `public.user_profiles` under a structured `preferences` JSONB column (with optimistic hydration from `localStorage` for zero-flicker client rendering).

```typescript
export type TargetYear = '2025' | '2026' | '2027' | '2028' | 'state-psc';
export type AttemptStage = 'foundation' | 'intermediate' | 'veteran';
export type OptionalSubjectId =
  | 'psir'
  | 'sociology'
  | 'geography'
  | 'pub_ad'
  | 'history'
  | 'anthropology'
  | 'economics'
  | 'philosophy'
  | 'law'
  | 'commerce'
  | 'mathematics'
  | 'psychology'
  | 'agriculture'
  | 'literature'
  | 'other';

export type GsPillarId = 'gs1' | 'gs2' | 'gs3' | 'gs4' | 'csat';
export type DailyMcqTarget = 10 | 25 | 50;
export type DailyReadingMins = 4 | 7 | 15;

export interface CandidatePreferences {
  targetYear: TargetYear;
  attemptStage: AttemptStage;
  optionalSubject: OptionalSubjectId;
  optionalCustomName?: string;
  optionalStage: 'exploring' | 'foundation' | 'notes_pyq' | 'answer_writing';
  focusPillars: GsPillarId[];
  dailyMcqTarget: DailyMcqTarget;
  dailyReadingMins: DailyReadingMins;
  difficultyPreference: 'standard' | 'crucible';
  onboardingCompleted: boolean;
  inductionPledged: boolean;
  updatedAt?: string;
}
```

### 1.2 Database Migration

```sql
-- Migration: 20260903000000_candidate_preferences.sql
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{
  "targetYear": "2026",
  "attemptStage": "foundation",
  "optionalSubject": "psir",
  "optionalStage": "foundation",
  "focusPillars": ["gs2", "gs3"],
  "dailyMcqTarget": 10,
  "dailyReadingMins": 7,
  "difficultyPreference": "standard",
  "onboardingCompleted": false,
  "inductionPledged": false
}'::jsonb;

-- Index on target year for cohort analytics
CREATE INDEX IF NOT EXISTS idx_user_profiles_target_year 
ON public.user_profiles ((preferences->>'targetYear'));
```

---

## 2. The 6-Stage Orchestrated Onboarding Crucible

Rather than a generic form, Tark's induction is styled as a **Sterile Calibration Crucible** with high-contrast, military-minimalist aesthetics (navy, teal, muted gold, titanium slate):

### Stage 1: Call-Sign & Aspirant Persona
- **Candidate Name / Call-Sign**: Pre-filled from auth profile.
- **Aspirant Persona**:
  - *Full-Time Dedicated*: Intensive dual-session daily drill.
  - *Working Professional*: High-yield, time-constrained micro-sprints.
  - *Undergrad / Early Foundation*: Structured long-range conceptual architecture.

### Stage 2: Target Exam Cycle & Countdown Clock
- **Target Cycle**:
  - **UPSC CSE 2025** (Final Sprint — High-Yield Prelims Precision)
  - **UPSC CSE 2026** (Prime Master Cycle — 360° Foundation & Mains Integration)
  - **UPSC CSE 2027+** (Multi-Year Long Range Architecture)
  - **State PSCs** (Combined Civil Services)
- **Attempt Maturity**: First attempt (fresh build), 2nd/3rd attempt (score gap remediation), or Interview veteran.

### Stage 3: The Optional Subject Choice (The 500-Mark Pillar)
The candidate selects their Optional Subject from the UPSC approved roster, complete with real-time syllabus synergy cards:
- **PSIR**: Heavy overlap with GS-2 (Polity, IR) & GS-4 (Political Thinkers).
- **Sociology**: Heavy overlap with GS-1 (Indian Society) & GS-2 (Social Justice, Welfare).
- **Geography**: Heavy overlap with GS-1 (Physical Geo) & GS-3 (Agriculture, Environment).
- **Public Administration**: Heavy overlap with GS-2 (Governance, ARC) & GS-4 (Probity).
- **History**: Heavy overlap with GS-1 (Ancient, Medieval, Modern, Art & Culture).
- **Economics**: Heavy overlap with GS-3 (Macro, Banking, Budget, External Trade).
- **Anthropology**: Overlap with GS-1 (Society) & GS-2 (Tribal Welfare).
- **Philosophy**: Overlap with GS-4 (Ethics, Western & Indian Philosophers).
- **Law**: Overlap with GS-2 (Constitutional Law, Judiciary, Rights).
- **Commerce / Management**: Overlap with GS-3 (Financial Markets, Taxation).
- **STEM / Mathematics / Agriculture / Medical Science**: Specialized technical tracks.
- **Literature of Languages**: Cultural and textual mastery.
- **Optional Preparation Stage**: Selecting / Foundation / Notes & PYQs / Answer Writing.

### Stage 4: General Studies & CSAT Focus Calibration
Multi-select priority domains (1 to 4 pillars) that the candidate wants Tark's daily recommendation engine to emphasize:
- **GS-1**: History, Architecture, Physical/Human Geography, Indian Society.
- **GS-2**: Constitution, Governance, Social Justice, International Relations.
- **GS-3**: Economy, Agriculture, Science & Tech, Ecology & Security.
- **GS-4**: Ethics, Moral Philosophers, ARC Case Studies.
- **CSAT**: Quant, Analytical Reasoning & Reading Comprehension.

### Stage 5: Daily Operating Cadence
- **MCQ Volume**: 10 MCQs (Sprint: ~12 mins), 25 MCQs (Crucible: ~30 mins), 50 MCQs (Full Mock: ~60 mins).
- **Dispatch Reading**: 4-minute Concise Signal vs. 10-minute Forensic Study with verbatim citations.

### Stage 6: The Tark Covenant (Zero-Noise Protocol)
- Verbatim primary source fidelity.
- Server-side zero-trust evaluation.
- Commitment to daily analytical discipline over social distraction.
- Action: "Seal Protocol & Enter Chamber".

---

## 3. System-Wide Reflection Matrix

| Platform Surface | Component / File | Specific Reflection of Candidate Preferences |
|---|---|---|
| **App Shell & Nav Rail** | [`VerticalNavRail.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/VerticalNavRail.tsx), [`App.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/App.tsx) | - **Exam Countdown Clock**: Dynamic days-remaining ticker (e.g. `Prelims '26: 264d`).<br>- **Active Track Pill**: `[CSE '26 · PSIR · GS-2/3]`.<br>- Quick-access drawer to view/recalibrate dossier. |
| **Daily Brief (Intelligence Deck)** | [`CurrentAffairs.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/CurrentAffairs.tsx), [`DailyEdition.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/DailyEdition.tsx) | - **"For Your Track" Priority Filter**: Surfaces dispatches matching candidate's chosen focus pillars.<br>- **Optional Subject Crossover Tag**: Displays bespoke tags (e.g. `🎯 PSIR Overlap (Paper 2)` or `🎯 Sociology Link`) on relevant cabinet releases and bilateral summits. |
| **Test Arena** | [`Arena.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Arena.tsx) | - **Smart Training Ground Pre-Selection**: Training subject picker defaults to the candidate's chosen GS focus pillars.<br>- **Daily Goal Tracker**: Visual counter tracking progress toward daily MCQ target (e.g. `7 / 10 MCQs completed`). |
| **Syllabus Knowledge Vault** | [`SubjectPillars.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/SubjectPillars.tsx) | - **Focus Pillar Highlighting**: Highlights prioritized GS pillars upon entry.<br>- **Optional Subject Synergy Matrix**: Interactive drawer/view showing how GS1–GS4 topics map to the candidate's chosen optional subject. |
| **Humanities Canon** | [`HumanitiesReader.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/HumanitiesReader.tsx) | - Recommends philosophical/ethical dialectic benchmarks aligned with the candidate's track (e.g. Ambedkar/Gandhi/Mill for PSIR & Ethics). |
| **Candidate Profile & Dossier** | [`Profile.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Profile.tsx) | - **Dossier Calibration Deck**: Full inspection of active target year, optional subject, and focus pillars.<br>- **Recalibrate Dossier Button**: Allows re-running induction or updating preferences at any time.<br>- Performance analytics split by "Focus Pillars" vs "Remaining Syllabus". |
| **Landing & Diagnostic** | [`Landing.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Landing.tsx), [`MobileLanding.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/MobileLanding.tsx) | - Contextualized returning state: "Welcome back, Candidate [Call-Sign]. [Target Year] Clock: [Days] Days. Today's Signal Ready." |

---

## 4. Verification & Validation Protocol

1. **Schema & Migration Integrity**: Validate `user_profiles` schema update and RLS policies in Supabase.
2. **Onboarding UX**: Walk through all 6 stages of the induction flow, ensuring fluid step transitions, zero layout shifts, and accurate keyboard/touch accessibility.
3. **Multi-Device Persistence**: Confirm preferences written to Supabase sync instantly upon login from another session or browser refresh.
4. **Surface Cross-Checks**:
   - Verify Countdown Clock calculation for CSE 2025, 2026, 2027.
   - Verify Daily Brief filter and Optional Subject tags.
   - Verify Training Ground pre-selection in Arena.
   - Verify Optional Synergy matrix in Subject Pillars.
   - Verify Dossier editing in Profile.
