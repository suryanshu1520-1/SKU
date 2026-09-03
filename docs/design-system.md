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
  - **Editorial Byline**: Quiet, unboxed metadata breadcrumb (`Source • Ministry • Date`) using authentic agency marks (`PibLogo`, `TheHinduLogo`) and muted typography (`#8fa2bd`).
  - **Headline Prominence**: Elevates the authoritative serif headline immediately under the byline, eliminating badge-soup displacement.
  - **Consolidated Telemetry Strip**: High-density glass bar (`bg-[rgba(3,18,42,0.7)] border border-[rgba(19,108,153,0.35)]`) uniting:
    1. Deterministic Grounding audit ledger trigger (`<GroundingBadge />`).
    2. Compact Prelims/Mains relevance indicator (`Prelims: MED • Mains: MED`).
    3. Intelligent syllabus chips (`parseSyllabusTag`) condensing verbose 80-character strings into clean identifiers (`GS-II • Health & Social Sector`).
  - **Verbatim Syllabus Drawer**: Interactive accordion that reveals exact, untruncated UPSC syllabus mapping on demand without visual clutter.

---

## 3. Color Palette & Typography Tokens

| Token | Hex Value | Semantic Usage |
|---|---|---|
| `--color-zinc-950` | `#072e63` / `#09090b` | Deep void background |
| `--color-zinc-900` | `#136c99` / `#18181b` | Frosted cards & elevation surfaces |
| `--color-gold-accent` | `#e0d0ab` | Hero wordmarks, CTAs, serif titles |
| `--color-emerald` | `#10b981` / `#34d399` | Integrity verification, +2.00 accuracy |
| `--color-rose` | `#e14e4e` / `#ad0202` | -0.66 Negative marking penalty, incorrect options |
| `--font-serif` | `Merriweather` / `Cinzel` | Authoritative academic headings |
| `--font-mono` | `JetBrains Mono` | Telemetry, timers, keyboard HUD, question stats |
| `--font-sans` | `Inter` | Body prose, question stems, explanations |

