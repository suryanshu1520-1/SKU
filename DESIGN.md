---
name: Tark
description: Academic clarity with a navy canvas, editorial type and precise evidence graphics.
colors:
  void: "#050b1a"
  ground: "#071630"
  cream: "#f4ecd8"
  gold: "#e0d0ab"
  slate-body: "#b5c1d1"
  cyan: "#0194a8"
  divider: "rgba(224, 208, 171, 0.16)"
typography:
  display:
    fontFamily: '"Bricolage Grotesque", system-ui, sans-serif'
    fontSize: "clamp(56px, 6.8vw, 96px)"
    fontWeight: 650
    lineHeight: 1.07
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"Bricolage Grotesque", system-ui, sans-serif'
    fontSize: "clamp(35px, 3.6vw, 52px)"
    fontWeight: 550
    lineHeight: 1.13
    letterSpacing: "-0.035em"
  editorial:
    fontFamily: '"Newsreader", Georgia, serif'
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.6
  interface:
    fontFamily: '"Bricolage Grotesque", system-ui, sans-serif'
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  notation:
    fontFamily: '"JetBrains Mono", ui-monospace, monospace'
    fontSize: "11px"
rounded:
  action: "7px"
  paper: "0px"
spacing:
  compact: "12px"
  standard: "20px"
  wide: "28px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.void}"
    rounded: "{rounded.action}"
    padding: "15px 22px"
  button-primary-hover:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.void}"
    rounded: "{rounded.action}"
  link-quiet:
    textColor: "{colors.slate-body}"
    padding: "4px 0"
  paper-panel:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.cream}"
    rounded: "{rounded.paper}"
---

# Design System: Tark

## Overview

**Creative North Star: "The Annotated Reading Desk"**

Tark pairs an academic reading voice with an analytical interface. A dark field gives cream text room to breathe; gold establishes emphasis and cyan explains connections. The existing wordmark and three font families carry its identity.

This record captures the completed landing page. Its display sizes, generous spacing and persuasive rhythm belong to that surface. They do not replace the denser layouts, state colors or interaction patterns of Intelligence, the Test Arena or other operating screens. The landing sequence is recorded separately in its surface brief.

The Study library is an additional operating and reading surface within the same identity. Its compact subject navigation, resource index and single reader have a separate surface brief and the component guidance below. The landing frontmatter and composition remain scoped to the landing; the library retains its own observed interface sizes, cream ink and responsive workspace behavior.

**Key Characteristics:**

- Clear editorial hierarchy before interface decoration.
- Flat navy surfaces with fine, warm boundaries.
- Motion that clarifies a state change.
- Actual article substance and source access, with honest sample labels where applicable.

## Colors

Gold supplies the main action; cyan describes information and connections. The navy and cream pair carries most of the composition.

### Primary

- **Chamber gold** (`gold`): primary actions, selected underlines and restrained editorial emphasis.

### Secondary

- **Evidence cyan** (`cyan`): evidence accents and the practice result boundary. It supports the gold hierarchy.

### Neutral

- **Midnight field** (`void`): the landing canvas and text on filled gold actions.
- **Reading navy** (`ground`): the practice section and framed interactive examples.
- **Warm cream** (`cream`): headings, active text and the brightest interactive feedback.
- **Slate body** (`slate-body`): supporting prose, quiet links and interface descriptions.
- **Warm divider** (`divider`): section rules and low-emphasis boundaries. Example panels use slightly stronger translucent gold borders.

**The Evidence Accent Rule.** Color in an explanatory graphic should describe its subject or current selection. Do not turn every annotation into a competing status badge.

## Typography

**Display and interface:** Bricolage Grotesque with system sans fallbacks.

**Editorial reading:** Newsreader with Georgia and serif fallbacks.

**Reference notation:** JetBrains Mono with system monospace fallbacks.

Large sans headings establish the argument; selective serif italics provide editorial emphasis. Newsreader carries reading passages and example questions. Mono stays with reference numbers and answer notation.

The frontmatter records the desktop landing hierarchy. Display lettering contracts to a smaller mobile size; at the narrowest breakpoint it is 56px. Body copy ranges from 18–22px in reading sections. The article preview reuses the feed's serif headline and 14px sans summary, with quieter source, date and topic text. These are distinct roles, not a mandate to enlarge operating screens.

**The Quiet Notation Rule.** Reserve mono for information that benefits from notation. Full sentences, product promises and ordinary controls use the reading or interface face.

## Layout

The landing shell caps at 1440px, with fluid horizontal padding. Desktop pairs a reading column with an actual article preview, using a slightly wider second column. The editorial overview repeats that alignment; the practice passage changes the ground tone. Membership finishes with a compact side note rather than a seat inventory visualization.

At 800px and below, the same component tree becomes one column: promise and action, then article preview. The mobile shell uses 26px gutters, reduced to 20px at 400px. Practice and membership also stack. Do not duplicate previews for separate desktop and mobile trees.

Reading paragraphs have deliberate measures, usually 35–48 characters. Larger gaps separate sections; smaller gaps join headings, explanations and actions. The app retains ownership of its global navigation.

## Elevation & Depth

Depth comes from navy tonal changes, fine borders and whitespace. The article preview shares the feed's flat reading-card treatment. Buttons respond through a small positional shift and color change; there is no general glass or glowing-panel treatment on this surface.

## Shapes

Article panels and answer choices have square corners and fine strokes. The main gold action is gently rounded through the `action` token. Circular answer letters are notation within a rectangular choice. Light rules carry structure without an ornamental frame around every passage.

## Components

### Actions and links

The primary action uses gold, dark text, a small arrow and a minimum 46px height. Hover lightens the fill and lifts the action by 2px. Quiet links use slate or gold text, adding an underline on hover. Focus is a visible gold outline with space around it. Navigation actions retain real destination URLs and native modified-click behavior.

### Intelligence article preview

A read-only excerpt uses the feed's own card styles and a real recent article: stored headline, source, valid feed date, up to two unchanged summary bullets and up to three nonempty topic tags. Its headline and Read brief link open the actual article; the original source opens in a new tab. The landing does not add a teaching method, inferred exam context, bookmark action or verification guarantee.

A bounded public-feed request excludes digest and PRS rows. Loading uses a static skeleton; errors offer retry and direct Intelligence access; no usable rows produce an honest empty state. A loaded article appears with a 320ms opacity and 8px position reveal, disabled by reduced motion. No fabricated article substitutes for unavailable data.

### Practice preview

One canonical question uses native radio controls inside a fieldset. Selection, correctness and a mistaken answer have distinct styles; text and accessible announcements explain the result. Checking reveals the explanation over 400ms, and retry reverses that state. The preview does not write a scored attempt. Its source and Arena destination remain accessible as links.

### Membership and footer

Membership is a quiet aside with price, account action and refund link. The footer keeps the existing wordmark and direct legal links. Availability and purchase state belong to the account flow; the landing does not simulate live seat counts.

### Study library

The library organises the existing editorial collection into six subjects and three available activity groups: Study notes, Compare & recall, and Answer writing. Desktop pairs compact subject and resource navigation with a single reader. Gold selected states, navy tonal changes and fine warm rules establish hierarchy. At narrower container widths the subject navigation becomes a labelled native select, then the resource index becomes a disclosure above the reader. These workspace patterns do not replace the landing composition.

The reading voice uses Newsreader at approximately 18–20px with a generous line height and a clear 30px resource title. Bricolage carries the compact controls and labels; mono stays with numerical notation. Visible gold focus, native links and controls, at least 44px interaction heights and bounded Previous/Next navigation are part of this surface's working character.

Global local search opens real resources across subjects, including table cells and existing worked examples. Concept explorers select actual categories or ordered steps without implying completion. Reference tables offer a keyboard-accessible comparison region and an optional Recall view: reveal the existing details, then move to another entry. Answer outlines offer Opening, Arguments and Conclusion rather than a wall of simultaneous text. Source information stays available through a quiet disclosure, and editorial outlines are distinguished from official marking schemes.

State changes stay brief: a new resource reveals over 200ms, an outline part over 220ms, a concept choice over 260ms and recall details over 240ms. Reduced motion removes transitions. Selection and recall do not record mastery or progress. This surface does not display the former hardcoded volcano indicators, trap percentages or unsupported examination forecasts; backend evidence and reviewed sources remain a separate integration responsibility.

## Do's and Don'ts

### Do:

- **Do** preserve the existing logo, navy/cream/gold/cyan identity and three font families.
- **Do** use restrained state-change motion and respect reduced-motion preferences.
- **Do** keep source links, keyboard focus and native navigation behavior visible and usable.
- **Do** showcase supported product behavior, label practice samples and keep claims within the available evidence.

### Don't:

- **Don't** carry the landing's large type and section spacing into operating screens by default.
- **Don't** replace useful explanation with decorative telemetry or repeated badge stacks.
- **Don't** invent live availability, customer counts or complete-verification guarantees.
- **Don't** conceal essential content behind animation or create separate responsive copies of interactive examples.
