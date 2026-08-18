# Landing Page Copy Draft — Tark 1.0

> Generated: 2026-08-18 · Lens: `marketing:draft-content` · Target: [`src/components/Landing.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Landing.tsx) · Applies the fixes identified in [`brand-review.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/brand-review.md) · Content type: landing page copy · Audience: UPSC/State PSC aspirants, India · Tone: terse, declarative, unsentimental, zero exclamation marks.

## Hero

**Headline (3 options):**
1. **The War on Noise.**
2. **Assess. Analyze. Track. No Noise.**
3. **One Exam Date. No Room for Noise.**

*Recommended: #1 — it's the brand's sharpest line, currently buried in a gated modal. Leading with it does double duty: distinctive hook + honest positioning.*

**Subhead:**
> Tark is an analytical testing arena and daily intelligence brief for UPSC and State PSC aspirants — built to show you exactly where you stand, not to keep you scrolling.

**Hero body (one line, above the fold, before any button):**
> You have one exam date and a syllabus that keeps growing. Somewhere in it is the one topic that fails you. Tark exists to find it before the examiner does.

## Value Proposition Sections

**1. Analytical Arena — "Where You Find Out."**
> A timed, negatively-marked test environment built to feel like the real thing, because comfortable practice produces uncomfortable surprises on exam day. Every session ends in an autopsy: what you got wrong, why, and which subject is quietly costing you rank.

**2. Policy Tracker → suggest renaming "The Daily Brief"** *(current name collides with the tagline's own verb "Track" — see brand review)*
> Every PIB release, ministry order, and governance story that matters, distilled into a few honest minutes each morning. No aggregator noise, no listicles. Read it, then prove you retained it.

**3. New section — proof, not promise:**
> Headline: **"No Guesswork."**
> Copy: 1,700+ questions. Server-graded, zero-trust scoring — you never see the answer key until the test is over, so neither does your shortcut instinct.

*This replaces the old unsubstantiated "Unfair Advantage" claim with a real, verifiable number pulled straight from the existing question bank.*

## Social Proof / Trust Section

No real testimonials exist yet — placeholder structure, not fabricated quotes:

> **[Reserve this block for a real aspirant quote once one exists — even a single honest sentence outperforms a fabricated one for this audience, which is unusually scam-fatigued.]**

In the meantime, replace "social proof" with **provable scarcity** — the one place Tark can out-honest every competitor running fake urgency banners:

> **[X] of 500 Founders Club seats claimed.**
> When they're gone, they're gone. No waitlist, no "limited time" reset next quarter.

*Pull this live from the existing seat-reservation system rather than stating the cap in prose only.*

## CTA Section

**Primary CTA:** `Take a Diagnostic Test — No Signup Required`
*Lower-friction entry point than sending cold visitors straight into a gated Manifesto/paywall — lets a skeptical visitor feel the product before being asked to trust the brand.*

**Secondary CTA:** `Read the Manifesto`

**Footer line (revised):**
> Before: *"TARK 1.0 IS AN AD-FREE INITIATIVE FOREVER."*
> After: *"No ads. No affiliate links. No sponsored content. Ever."* — same commitment, stated as fact rather than movement, more credible to a skeptical buyer than "initiative."

## FAQ Section (suggested, currently absent)

For an audience this wary of edtech scams, an FAQ does real trust work:
- "Is this a subscription?" → No — one-time payment, lifetime access, capped at 500 seats.
- "What happens after 500 seats fill?" → **[Open question — needs a real answer before shipping this copy: what is the plan for aspirant #501?]**
- "Do you sell my data or run ads?" → No. Ever.
- "What if I don't clear the exam?" → **[Link directly to refund policy terms here, don't make them hunt the footer.]**

## SEO Recommendations

- **Meta title:** `Tark — Analytical Test Arena & Daily Current Affairs for UPSC Aspirants`
- **Meta description (≤160 chars):** `Timed mock tests with zero-trust grading, plus a daily distilled brief of PIB and governance news. Ad-free, built for UPSC and State PSC aspirants.`
- Primary keyword candidates: "UPSC current affairs daily," "UPSC mock test negative marking" — see [`seo-audit.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/seo-audit.md) for the full keyword landscape.
- This is a client-rendered React SPA today — meta tags above won't be crawlable as-is without SSR or prerendering. See SEO audit for the technical fix.

**Brand voice applied:** terse, declarative, no exclamation marks, no superlatives without a number attached — matching the Manifesto's own register rather than typical landing-page hype.
