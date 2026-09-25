---
name: design-craft-crucible
description: >-
  Expert standard and workflow for building sterile, academic, high-craft UI/UX
  in Tark. Covers React 19, Tailwind v4 (@theme tokens), Lucide icon safety,
  motion physics (Framer Motion, 3D tilt, canvas), typography hierarchy, and
  prevention of visual clipping seams and mobile layout regressions.
license: MIT
---

# Design & Craft Crucible (Tark Standard)

This skill governs all frontend UI, component architecture, styling, and motion graphics within Tark. Every visual component must satisfy two non-negotiable standards: **Academic Austerity** (analytical, high contrast, zero noise) and **Spatial Interactivity** (buttery micro-interactions, subtle 3D depth, weightless physics).

---

## 1. Typography Hierarchy & Invariants

Tark uses a deliberate 3-typeface system defined in `@theme` (`src/index.css`):

1. **`font-sans` ("Bricolage Grotesque", system-ui, sans-serif)**:
   - Primary display headlines (`h1`, `h2`, `h3` in Hero and major sections).
   - Interactive buttons, pills, filter badges, and functional chrome.
   - **Rule**: Never use `leading-[1.0]` on multiline display sizes (`text-[58px]`, `text-[76px]`). Always use `leading-[1.05]` to `leading-[1.08]` to prevent ascender/descender collisions.

2. **`font-serif` ("Newsreader" / "Merriweather", Georgia, serif)**:
   - Editorial body copy, lead descriptions, explanations, question stems, and reading passages.
   - Authoritative section intros and academic quotes.
   - **Rule**: Pair with `leading-[1.5]` to `leading-[1.6]` and slate/ivory colors (`#b5c1d1`, `#f4ecd8`, `#e8e0cf`).

3. **`font-mono` ("JetBrains Mono", monospace)**:
   - Numerical telemetry, countdown timers, keyboard shortcuts (`Alt+3`), question indices, penalty scores (`-0.66`), and status codes.
   - **Rule**: Always apply `tabular-nums` when displaying numbers or clocks that update in real time.

---

## 2. Color Palette Tokens & Chamber Void System

Always use established theme tokens and hex values. Never introduce arbitrary ad-hoc colors.

| Token | Hex Value | Purpose |
|---|---|---|
| Chamber Void (Canvas) | `#050b1a` | Deep void background |
| Chamber Ground | `#071630` | Card surfaces, container backgrounds |
| Chamber Elevated | `#0a2148` | Hover states, elevated panels, modal backgrounds |
| Chamber Shell | `#041228` | Outer frame, status bar, docked rails |
| Chamber Gold / Sand | `#e0d0ab` / `#c8b998` | Primary CTA, key highlights, active indicators |
| Chamber Slate Body | `#b5c1d1` | Secondary prose, explanations, subtitle copy |
| Chamber Slate Dim | `#6e7d94` | Inactive icons, timestamps, metadata labels |
| Chamber Divider | `rgba(224, 208, 171, 0.10)` | Hairline borders, separators |
| Accuracy Green | `#34d399` / `#10b981` | Correct answers, positive trajectory (+2.00) |
| Penalty Red | `#f87171` / `#ef4444` | Incorrect answers, negative marking (-0.66) |

---

## 3. Tailwind v4 Architectural Invariants

- **No `tailwind.config.js`**: Tailwind v4 is CSS-first. All configurations live in `src/index.css` under `@theme`.
- **CSS Variables & Custom Utilities**: Use `@theme` tokens or inline CSS variables (`var(--color-...)`).
- **Gradient Feathering Standard**:
  - **CRITICAL ANTI-PATTERN**: Never anchor radial gradients with `at 0% 0%` inside constrained (`max-w-[...]`) containers! This creates razor-sharp vertical clipping seams on high-resolution displays.
  - **SAFE STANDARD**: Ambient glows must be placed at the full-bleed root container or centered (`at center` or `at 50% 30%`), tapering to `transparent 70%` so alpha is strictly 0 at the bounding edges.

---

## 4. Lucide React Icon Safety Protocol

Runtime crashes frequently occur when agents import non-existent icon names from `lucide-react`.

1. **Verification**: Check if the icon exists in `node_modules/lucide-react` before importing.
2. **Standard Verified Icons in Tark**:
   - Navigation: `Compass`, `BookOpen`, `Shield`, `Award`, `Activity`, `FileText`, `Layers`, `Home`, `Menu`, `X`
   - Actions & Arrows: `ArrowRight`, `ArrowLeft`, `ChevronRight`, `ChevronLeft`, `ChevronDown`, `ExternalLink`, `Share2`
   - Status & Alerts: `Check`, `CheckCircle2`, `AlertCircle`, `AlertTriangle`, `Info`, `Lock`, `Unlock`, `Clock`
   - Telemetry: `TrendingUp`, `TrendingDown`, `Target`, `Flame`, `Zap`, `BarChart2`, `Filter`, `Search`
3. **If unsure**: Grep existing icons in `src/components/` with `grep_search` before introducing a new import.

---

## 5. Mobile & Responsive Interaction Rules

1. **Touch Targets**: All buttons, links, and selectable options on mobile (`< 768px`) must have a minimum interactive height of `44px` (ideally `48px` to `56px` for primary CTAs).
2. **Navigation Rail**: On desktop, navigation is a fixed vertical rail (`md:pl-16` collapsed, `md:pl-56` expanded). Layout containers must account for this offset without horizontal overflow.
3. **Palette Grids**: Question number palettes must wrap cleanly on narrow screens (e.g., 5 or 10 columns) without overflowing the viewport.
4. **Modals & Drawers**: Modals must be full-screen or bottom-sheet on mobile with touch-friendly dismiss buttons and no backdrop scroll leak.
