# Tark Design System & Motion Graphics Architecture

## 1. Aesthetic Identity & Philosophy

**Tark** balances two complementary principles:
1. **Academic Austerity**: Zero noise, high contrast, serif typography (`Merriweather`), and sharp corners (`rounded-sm`).
2. **Antigravity Spatial Interactivity**: 3D perspective layers, weightless floating elements, live cursor spotlight gradients, and reactive spring physics.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Tark Visual Hierarchy                           │
├────────────────────────┬───────────────────────────────────────────────┤
│ Background Canvas      │ Dynamic particle constellation with reactive  │
│ Layer (Z: 0)           │ mouse proximity repelling & ambient spotlight │
├────────────────────────┼───────────────────────────────────────────────┤
│ Spatial Containers     │ 3D TiltCards with perspective(1000px),        │
│ Layer (Z: 10)          │ dynamic cursor glare sheen, and spring tilt   │
├────────────────────────┼───────────────────────────────────────────────┤
│ Floating Telemetry &   │ Glassmorphic backdrop-blur overlays, live     │
│ HUD (Z: 50)            │ seat counter, animated circular timers        │
└────────────────────────┴───────────────────────────────────────────────┘
```

---

## 2. Interactive Motion Components

### A. `InteractiveBackground.tsx`
- **Location**: [`src/components/InteractiveBackground.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/InteractiveBackground.tsx)
- **Engine**: HTML5 Canvas + `requestAnimationFrame`.
- **Physics**:
  - Generates 65 particle nodes interconnected by proximity distance lines ($\text{dist} < 120\text{px}$).
  - Smoothly tracks mouse velocity and exerts inverse-distance repelling force when cursor enters within 140px.
  - Draws a diffuse radial gold/teal spotlight (`rgba(224, 208, 171, 0.045)`) that follows the candidate's focus.

### B. `TiltCard.tsx`
- **Location**: [`src/components/TiltCard.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/TiltCard.tsx)
- **Engine**: CSS 3D Transforms (`transform-style: preserve-3d`) + Motion Spring Physics (`stiffness: 280, damping: 24`).
- **Effect**: Calculates mouse coordinates relative to card center and tilts up to $\pm 7^\circ$ along X and Y axes, moving a specular reflection glare across the glass surface.

### C. `DiagnosticPreview.tsx`
- **Location**: [`src/components/DiagnosticPreview.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/DiagnosticPreview.tsx)
- **Functionality**: Embeds an instant, unauthenticated UPSC standard MCQ directly on the Landing page with zero-trust simulation, showing positive (+2) and negative (-0.66) scoring dynamics and conceptual autopsy feedback.

### D. `SyllabusMatrix.tsx`
- **Location**: [`src/components/SyllabusMatrix.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/SyllabusMatrix.tsx)
- **Functionality**: Interactive taxonomy browser across 6 core prelims subjects (Polity, Economy, Environment, Science & Tech, Geography, History) showcasing weightages and 1,720+ item coverage.

### E. Policy Intelligence Dossier (`CurrentAffairs.tsx`)
- **Location**: [`src/components/CurrentAffairs.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/CurrentAffairs.tsx)
- **Hierarchy**:
  - **Editorial Byline**: Authentic source mark and date, followed by a full Newsreader headline at weight 500 and plain ministry attribution.
  - **Reading Metadata**: Display actual Prelims/Mains relevance only when supplied. A quiet “Sources & verification” action opens the evidence ledger without claiming verification in the header.
  - **Syllabus Mapping**: A native disclosure summarizes the topic count and papers, then reveals the full supplied mapping.
  - **Study Connections**: A separate native disclosure groups exam focus, policy-chain navigation, and topic resurgence into labeled rows with consistent Lucide icons. Inferred focus is marked as a suggestion; resurgence is identified as a model signal.
  - **Agency Advisory**: No ministry-wide warning or generic Government of India risk label. A source-check advisory can appear beside a specific nodal fact only with at least three evidenced agency-role attempts and a negative net score, plus relevant article content. Cold-start cohort flags, generic Polity labels and opaque question IDs do not establish personal agency-role evidence.
  - **Historical Examples**: Show an article's supplied historical twin only; never substitute a generic example selected from a heuristic operator.

#### Reading-first news feed (`NewsSignalCard.tsx`)

This scoped pattern governs the current-affairs feed cards and lead story; the full dossier reader remains a separate reading surface.

- **Implementation**: `src/components/NewsSignalCard.tsx`, `NewsSignalCard.css` and `NewsSignalGrid.tsx`, composed by `CurrentAffairs.tsx`.
- **Surface**: Flat navy (`#071630`, lead `#041936`), cream headlines (`#e8e0cf`), restrained gold (`#e0d0ab`) and cyan (`#0194a8`), with thin borders and no card shadows or tilt.
- **Light mode**: Warm cream surfaces (`#f9f5ee`, `#f1ebdf`), navy headings, dark gold actions and cyan details retain the same hierarchy.
- **Byline**: Quiet linked source and valid article date (`created_at`), with a separate bookmark control exposing saved and saving states.
- **Headline**: Full, untruncated serif text; the lead uses a larger `h2`, standard cards use `h3`, and each headline is a keyboard-operable button.
- **Preview**: Up to two summary bullets on the lead and one on standard cards; inline evidence anchors and contested warnings stay visible.
- **Primary action**: “Read brief” opens the full brief; “Exam context” discloses the supporting study detail.
- **Disclosure**: Holds ministry, grounding inspection, exam focus, matching optional-subject relevance, volcano activity, an article's supplied historical twin, policy-chain link and sharing when available. Cards open independently; inferred focus is labeled as a suggestion.
- **Expansion motion**: A clipped disclosure opens in 220ms and closes in 180ms with a decelerating curve. The grid reserves its final height once and uses translate-only Web Animations for visible neighbours, preserving sharp text and handling interrupted toggles. Closing content becomes inert immediately; reduced-motion preferences skip spatial animation.
- **Feed layout**: The first displayed item leads. Remaining briefs use an auto-fit grid with a `22rem` minimum, contracting to one column. A ResizeObserver measures intrinsic card heights and updates spans in 4px grid rows, packing subsequent cards below available space with approximately 20px gaps. Expanded cards never stretch their neighbours. DOM and keyboard order remain chronological; browsers without ResizeObserver retain a normal grid with natural card heights.
- **Access and motion**: Card actions have at least 44px targets, visible gold focus outlines, `aria-expanded`/`aria-controls` on the disclosure and reduced-motion transition suppression.
- **Narrow screens**: At 639px and below, padding becomes 20px horizontally and exam facts stack into one column; headlines and actions wrap naturally.

---

## 3. Color Palette & Typography Tokens

| Token | Hex Value | Semantic Usage |
|---|---|---|
| `--color-zinc-950` | `#040F21` / `#030B16` | Deep void background |
| `--color-zinc-900` | `#08182C` / `#136c99` | Frosted cards & elevation surfaces |
| `--color-gold-accent` | `#E8DCBF` / `#e0d0ab` | Master Convergence Sigil, wordmark, serif titles |
| `--color-emerald` | `#10b981` / `#34d399` | Integrity verification, +2.00 accuracy |
| `--color-rose` | `#e14e4e` / `#ad0202` | -0.66 Negative marking penalty, incorrect options |
| `--font-serif` | `Merriweather` / `Cinzel` | Authoritative academic headings |
| `--font-mono` | `JetBrains Mono` | Telemetry, timers, keyboard HUD, question stats |
| `--font-sans` | `Inter` | Body prose, question stems, explanations |

---

## 4. Master Brand Identity: The Convergence Sigil & Chiseled Wordmark

The complete brand specification, mathematical geometry, clearspace rules, and SVG asset catalog are documented in [`docs/brand/BRAND_IDENTITY.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/brand/BRAND_IDENTITY.md).

- **Master Component**: [`src/components/BrandLogo.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/BrandLogo.tsx)
- **Vector Assets**: [`public/logos/`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/public/logos) (`tark-lockup-gold.svg`, `tark-symbol-gold.svg`, `favicon.svg`)

