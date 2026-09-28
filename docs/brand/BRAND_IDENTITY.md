# Tark (तर्क) — Master Brand Identity & Design System Manual

> **Document Status**: Production Standard  
> **Classification**: Brand Architecture & Visual Engineering  
> **Scope**: Testing Arena, Observatory, Mobile App, Print & Static Identity Touchpoints  

---

## 1. Executive Summary & Brand Philosophy

Tark (Sanskrit: **तर्क**, *philosophical dialectic, rigorous reasoning, discernment*) is a sterile, minimalist testing arena and sovereign intelligence engine engineered for serious UPSC CSE and State PSC candidates. 

In classical Indian logic (*Nyāya* and *Tarka-shāstra*), *Tarka* is the crucible of analytical reasoning that systematically burns away cognitive fallacies (*hetvābhāsa*) to arrive at immutable, grounded truth. 

The visual identity makeover embodies this mission: shedding generic ed-tech gamification and casual playfulness in favor of an **academic, sovereign, and chiseled architectural identity** that commands intellectual authority.

```
       5 MULTI-DISCIPLINARY STREAMS              FOCAL JUNCTION
┌──────────────────────────────────────┐               │
│ 1. Polity & Constitutional Governance│ ───┐          │
│ 2. Macroeconomics & Sovereign Fiscal │ ────┐         ▼
│ 3. Modern & Medieval Indian History  │ ─────┼───> [ ᚴ T Λ R K ]
│ 4. Ecology, Climate & Bio-Geography  │ ────┘         ▲
│ 5. Science, Deep Tech & Global IR    │ ───┘          │
└──────────────────────────────────────┘               │
                                           UNIFIED DISCERNMENT
```

---

## 2. Mathematical Anatomy of the Brand Identity

The Tark brand identity consists of two co-equal visual anchors engineered to operate in tandem or as standalone sigils:

```
    97,44 ────────────────────────────────────────── 388,44 ── 403,84 ──────────────────────────── 828,84
      │                                                │      │                                      │
      │   ═════════════════════════════\               │      │  █████████                           │
      │   ══════════════════════════════\     ██       │      │     ██        ████   █████   ██   ██ │
      │   ═══════════════════════════════\   ██        │      │     ██       ██  ██  ██  ██  ██  ██  │
      │   ══════════════════════════════════██         │      │     ██       ██████  █████   █████   │
      │   ═══════════════════════════════/   ██        │      │     ██       ██  ██  ██  ██  ██  ██  │
      │                                 ██    ██       │      │     ██       ██  ██  ██  ██  ██   ██ │
      │                                 ██             │      │                                      │
    97,216 ─────────────────────────────██─────────── 388,216 ─ 403,179 ─────────────────────────── 828,179
```

### 2.1 The Convergence Sigil
- **The 5 Parallel Channels**: Five razor-sharp horizontal tracks represent the multi-disciplinary syllabus streams and timelines of civil services preparation.
- **The Channeled Focal Point**: The parallel streams bend symmetrically inward, channeling dynamic kinetic energy directly into the junction of a geometric Roman `K`.
- **The Baseline & Descender Anchor**:
  - The upper diagonal arm aligns mathematically with the wordmark cap-height ($y = 84$).
  - The lower diagonal arm grounds firmly upon the wordmark baseline ($y = 178$).
  - The vertical stem extends intentionally below the baseline ($y = 206$, a 28px downward drop), providing an architectural anchor that symbolizes unshakeable analytical foundation.
- **Geometry**: Aspect ratio $291 : 172$ ($\approx 1.692 : 1$).

### 2.2 The Chiseled Roman Serif Wordmark (`T Λ R K`)
- **Classical Roman Proportion**: Modeled after imperial lapidary inscriptions with sharp triangular bracketed serifs, disciplined stem widths, and austere elegance.
- **The Triangular Chevron (`Λ`)**: The letter `A` discards the traditional horizontal crossbar in favor of an open chevron lintel (`Λ`). This reinforces the theme of convergence, apex achievement, and upward elevation.
- **Horizontal Kerning Matrix**: Engineered with generous mathematical clearspace between letterforms to ensure instantaneous legibility even at 14px favicon and mobile rail scales.
- **Geometry**: Aspect ratio $435 : 111$ ($\approx 3.919 : 1$).

### 2.3 The Master Horizontal Lockup
- Combines the Convergence Sigil and the `T Λ R K` wordmark into a single vector system.
- **ViewBox**: `95.0 42.0 738.0 176.0` (Aspect ratio $738 : 176 \approx 4.193 : 1$).
- **Alignment**: Perfect horizontal harmony between the Sigil's upper channel and the wordmark cap-height.

---

## 3. Sovereign Color Tokens & Surfaces

The Tark color palette balances luxury archival restraint with deep oceanic focus:

| Token Name | Hex Code | HSL / RGB | Role & Application |
|---|---|---|---|
| **Champagne / Chamber Gold** | `#E8DCBF` | `hsl(43, 44%, 83%)` | **Primary Brand Color**: Master lockup, sigil, key brand highlights |
| **Warm Sand Accent** | `#E0D0AB` | `hsl(42, 49%, 78%)` | **Secondary Brand Highlight**: Card borders, active state glows |
| **Obsidian Oceanic Void** | `#040F21` | `hsl(217, 78%, 7%)` | **Primary Dark Surface**: Deep background for Testing Arena and Command Deck |
| **Nocturne Deep Navy** | `#030B16` | `hsl(215, 77%, 5%)` | **App Base Canvas**: Viewport backdrop, container backgrounds |
| **Elevated Deck Surface** | `#08182C` | `hsl(214, 69%, 10%)` | **Card & Modal Elevate**: Command cards, question stem backplates |
| **Archival Paper** | `#F7F4EB` | `hsl(45, 45%, 95%)` | **Light / Print Surface**: Physical mock papers, print scorecards |
| **Deep Archival Ink** | `#01060C` | `hsl(210, 85%, 2%)` | **Monochrome Dark Ink**: Print lockup, light mode typography |
| **Electric Cyan Signal** | `#0194A8` | `hsl(187, 98%, 33%)` | **Telemetry & Precision**: Grounding percentages, live timers, pulse indicators |

---

## 4. Asset Registry & File Locations

All production vector assets are located in [`public/logos/`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/public/logos):

| Asset Path | Variant | Intended Surface / Context |
|---|---|---|
| [`public/logos/tark-lockup-gold.svg`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/public/logos/tark-lockup-gold.svg) | Full Horizontal Lockup (Gold) | Master dark UI, App header, Hero login |
| [`public/logos/tark-lockup-white.svg`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/public/logos/tark-lockup-white.svg) | Full Horizontal Lockup (Monochrome Light) | High-contrast dark backgrounds, monochrome displays |
| [`public/logos/tark-lockup-dark.svg`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/public/logos/tark-lockup-dark.svg) | Full Horizontal Lockup (Deep Ink) | Cream paper, daylight readability mode, PDF report exports |
| [`public/logos/tark-symbol-gold.svg`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/public/logos/tark-symbol-gold.svg) | Standalone Convergence Sigil (Gold) | Collapsed vertical rail, mobile app bar, watermarks |
| [`public/logos/tark-symbol-white.svg`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/public/logos/tark-symbol-white.svg) | Standalone Convergence Sigil (White) | Monochromatic dark badges |
| [`public/logos/tark-symbol-dark.svg`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/public/logos/tark-symbol-dark.svg) | Standalone Convergence Sigil (Dark) | Print stamp, document seals |
| [`public/logos/tark-wordmark-gold.svg`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/public/logos/tark-wordmark-gold.svg) | Wordmark Only (Gold) | Dedicated mastheads where sigil is displayed elsewhere |
| [`public/logos/tark-wordmark-white.svg`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/public/logos/tark-wordmark-white.svg) | Wordmark Only (White) | Minimalist headers |
| [`public/logos/tark-wordmark-dark.svg`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/public/logos/tark-wordmark-dark.svg) | Wordmark Only (Dark) | Official document headers |
| [`public/favicon.svg`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/public/favicon.svg) | Master App Icon Squircle | Browser favicon, mobile PWA home screen icon |

---

## 5. React Component Architecture (`src/components/BrandLogo.tsx`)

The React component system implements clean vector paths natively in JSX, eliminating external network requests and FOUC:

### 5.1 Component Exports

```tsx
import BrandLogo, { TarkSigil, TarkWordmark, TarkAppIcon } from '@/components/BrandLogo';
```

### 5.2 Usage Matrix

#### A. Master Horizontal Lockup
```tsx
// Default view with subtitle
<BrandLogo size="md" showSubtitle={true} />

// Clean header lockup without subtitle
<BrandLogo size="md" showSubtitle={false} onClick={handleNavigateHome} />
```

#### B. Standalone Sigil (Vertical Rail & Compact Mode)
```tsx
// Collapsed navigation rail
<TarkSigil size={26} color="gold" />

// Monochromatic or custom size
<TarkSigil size={32} color="white" className="hover:opacity-80" />
```

#### C. App Icon Squircle
```tsx
<BrandLogo variant="app-icon" size="md" />
// Or standalone:
<TarkAppIcon size={48} />
```

### 5.3 Size Scale Matrix

| Size Prop | Height (Lockup) | Width (Lockup) | Sigil Size | Recommended Application |
|---|---|---|---|---|
| `sm` | 22px | 92px | 22px | Expanded vertical nav rail, compact toolbars |
| `md` | 30px | 126px | 30px | Top navigation header, standard desktop bar |
| `lg` | 42px | 176px | 42px | Login card hero, modal headers |
| `xl` | 54px | 226px | 54px | Landing page hero, splash screen |

---

## 6. Rules of Brand Non-Violation

To preserve the uncompromising academic dignity of Tark, the following anti-patterns are strictly prohibited:

1. **No Distortion or Aspect Stretches**: The Convergence Sigil and Wordmark must never be scaled disproportionately.
2. **No Rainbow or Multi-Color Fills**: The mark must always be rendered in single-tone Chamber Gold (`#E8DCBF`), Monochrome White (`#FFFFFF`), or Archival Ink (`#040F21`).
3. **No Heavy Drop Shadows**: Use subtle, ambient blur or crisp hairline borders. Never use harsh, blurry, low-craft drop shadows.
4. **No Artificial Rounding**: The angular edges and geometric cuts of the 5 convergence lines must remain chiseled and sharp.
5. **Clearspace Invariant**: Maintain a minimum clearspace equal to $0.5 \times$ the height of the wordmark around all lockup perimeters.

---

## 7. Verification Record

- **Visual QA**: Verified against reference sheets via Playwright visual browser automation across 1280px desktop, 768px tablet, and 375px mobile viewports.
- **Codebase Linting**: Verified zero errors via `npm run lint:web` (`tsc --noEmit`) and `npm run lint:api`.
- **Security & Hygiene**: Verified zero secrets committed via AST scanner (`check_secrets.js`).
