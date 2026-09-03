# Observatory 15-Year Question Depth & Arena Rework Architecture

## Overview

This document details the architectural rework of the **Observatory (Question Vault)** and the **Test Arena CTA Configuration Engine** implemented in Tark 1.0.

---

## 1. Test Arena Dynamic Launch Architecture

### Problem
Previously, multiple calls to action across Tark (Daily Current Affairs, Observatory High-Yield Topics, Syllabus Pillars) routed users to a generic test selection screen with hardcoded 25-question limits and fixed 20-second blitz timers. The intent of the specific drill was lost upon transition.

### Solution: `ArenaLaunchConfig` Contract
A strongly-typed launch configuration interface was established in `src/types.ts`:

```typescript
export interface ArenaLaunchConfig {
  mode: 'daily_brief' | 'topic_drill' | 'subject_drill' | 'full_mock';
  title: string;
  subtitle?: string;
  targetId?: string;
  questionCount?: number;
  isRanked?: boolean;
  timePerQuestionSeconds?: number;
  autoStart?: boolean;
  contextTag?: string;
}
```

### Dedicated Drill Preflight Card
When launching a targeted drill, `Arena.tsx` displays a focused **Preflight Card**:
- **Drill Parameters**: Displays question count (e.g. 10 MCQs, 15 MCQs), scoring scheme (+2.00 / -0.66), and selected pacing.
- **Pacing Selector**:
  - **Standard (60s)**: Authentic Prelims reading and analytical pacing.
  - **Speed Blitz (20s)**: High-pressure rapid recall crucible.
  - **Untimed Practice**: Self-paced study with an elapsed time counter and zero timeout auto-locks.
- **Direct Launch**: Single click initiates question fetching for the exact target category.
- **Fallback**: Candidates can switch to a standard full mock exam with one click.

### Context-Aware Review (`Autopsy.tsx`)
The `contextTag` (e.g. *"Daily Current Affairs Drill Review"*, *"Fundamental Rights Practice Review"*) is preserved through the quiz submission pipeline and displayed dynamically on the post-test autopsy screen.

---

## 2. Observatory (Question Vault) 15-Year Depth Architecture

### Problem
Users reported that filtering in the Question Vault yielded only a few questions, and that 2001–2014 questions were less relevant to modern preparation patterns. The root causes were:
1. **Client-Side Slice Overwriting Server Total**: `Observatory.tsx` set `totalCount = baseList.length` (6), overwriting the true total from the server and disabling pagination.
2. **Pre-Pagination Filtering**: Raw historical archives lacked option strings for recent exams (2020–2025), causing client-side filters to drop items from small page batches.

### Solution: Unified Verified 15-Year Corpus
We synthesized `server-lib/analytics/data/verified_pyqs_15yr.json` using `scripts/build_verified_pyq_vault.ts`:
- **Scope**: Last 15 Years of UPSC CSE Prelims (2011–2025), marking the modern CSAT and revised General Studies syllabus.
- **Question Volume**: **1,549 verified questions** (with 1,869 total archive questions).
- **Quality Standard**: Every question contains complete stems, 4 clean options `(a) ... (b) ... (c) ... (d) ...`, verified official UPSC answer keys, and conceptual trap explanations. Zero placeholder options.

### Breakdown by Exam Year (2011–2025)
| Year | Verified Questions | Focus / Syllabus Pattern |
|---|---|---|
| **2025** | 99 | Latest format, pair-matching, applied science |
| **2024** | 90 | Post-pattern recalibration, environment focus |
| **2023** | 57 | "Only one / Only two / All three" statements |
| **2022** | 51 | Modern paired elimination format |
| **2021** | 50 | Pandemic era policy & global supply chains |
| **2020** | 107 | Agricultural reforms, constitutional doctrines |
| **2019** | 93 | Financial sector stability & ecology |
| **2018** | 155 | Core economic corridor & fundamental rights |
| **2017** | 46 | Tax architecture & judicial review |
| **2016** | 85 | Energy transitions & biodiversity |
| **2015** | 192 | Revised GS pattern standardization |
| **2014** | 204 | Parliamentary procedures & modern history |
| **2013** | 178 | New GS syllabus inception year |
| **2012** | 89 | Early CSAT transition paper |
| **2011** | 53 | First CSAT & GS-1 modern cycle |

### Upgraded Search & Pagination Engine (`pyq_explorer.ts`)
- **Server-Side Filtering**: Filters questions on the server *before* pagination. Each page serves 10 complete items.
- **Intelligent Subject Mapping**:
  - `Polity` $\rightarrow$ 339 questions (34 pages)
  - `Economy` $\rightarrow$ 325 questions (33 pages)
  - `Environment` $\rightarrow$ 196 questions (20 pages)
  - `Geography` $\rightarrow$ 191 questions (20 pages)
  - `History & Culture` $\rightarrow$ 148 questions (15 pages)
  - `CSAT` $\rightarrow$ 279 questions (28 pages)
- **Granular Year Selection**:
  - `Last 15 Years (2011–2025) [Core]` (Default)
  - `Latest 5 Years (2020–2025)`
  - `Modern Core (2015–2019)`
  - `Early Pattern (2011–2014)`
  - `All 25 Years (2000–2025 Archive)`
  - Individual yearly selector (2025 down to 2011).

---

## 3. Candidate Onboarding Lifecycle

### Problem
The onboarding crucible modal was appearing on every page refresh, disrupting candidate workflows.

### Cause
In `src/App.tsx`, both `restoreSession()` (on component mount) and `supabase.auth.onAuthStateChange()` (on session token restoration) invoked `setShowOnboarding(true)` whenever `onboardingCompleted` was not explicitly stored as `true`.

### Solution
- Removed `setShowOnboarding(true)` from initial session restoration and background auth listener.
- Confined automatic onboarding triggers strictly to `handleAuthenticated()` (when a candidate actively submits the login or sign-up form).
- Ensured `onComplete` and `onSkip` immediately persist `tark_onboarding_completed: 'true'` in `localStorage`.
- Candidates can re-open onboarding at any time by clicking "Recalibrate Track" in their Profile or Command Rail.
