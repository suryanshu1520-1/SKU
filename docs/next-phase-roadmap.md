# Next Phase Development Roadmap — Tark 2.0 (Executive Scope)

## 1. Executive Summary & Direction

Following the Claude Code strategic audits (`strategy/roadmap-synthesis.md`, `brand-review.md`, `landing-page-copy.md`, `seo-audit.md`), this document scopes out the **Phase 2 & Phase 3 Development Milestones** for Tark.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Tark Evolution Pipeline                         │
├────────────────────────┬───────────────────────────────────────────────┤
│ Phase 1 (Completed)    │ • ICM Workspace & Contract Standardization    │
│                        │ • Supabase Security & RLS Performance Audit   │
│                        │ • Antigravity 3D Motion Graphics & Landing    │
│                        │ • Provable Scarcity & Live Seat Reservation   │
├────────────────────────┼───────────────────────────────────────────────┤
│ Phase 2 (Active Focus) │ • Editorial Overhaul of Daily Briefs (PIB)    │
│                        │ • High-Density Gazette & Timeline Hierarchy   │
│                        │ • Inline Knowledge Checks & Retention Loop    │
│                        │ • Instant Search & Ministry Categorization    │
├────────────────────────┼───────────────────────────────────────────────┤
│ Phase 3 (Next Sprint)  │ • Public Permalinked SEO Digest Pages         │
│                        │ • Spaced-Repetition "Revision Arena"          │
│                        │ • Candidate Syllabus Coverage Ledger          │
└────────────────────────┴───────────────────────────────────────────────┘
```

---

## 2. Phase 2 Scope: Daily Briefs & Intelligence Feed Redesign

### Objective
Transform the Current Affairs interface from a fragmented box-grid into an **authoritative, high-signal intelligence gazette** that UPSC aspirants treat as their primary morning briefing.

### Key Functional Pillars
1. **Editorial Intelligence Hierarchy**:
   - **Lead Intelligence Dispatch (Hero)**: Top breaking policy/cabinet decision presented with high visual priority, key policy vectors, and exam relevance.
   - **Chronological Gazette List**: High-density, elegant stream with clean typography, timestamp badges, and ministry pills replacing redundant borders.
2. **Sleek Horizontal Segment Bar & Search**:
   - Top-level domain filter tabs (*All Dispatches, Governance & Polity, Economy & Banking, Environment, Science & Defence*).
   - Instant real-time search across headlines, ministry tags, and synthesized bullet points.
3. **Interactive Slide-over Intelligence Dossier**:
   - Clicking an item opens a distraction-free reader with synthesized takeaways, Prelims & Mains pointers, and direct source verification.
4. **Retrieval-Practice Loop**:
   - Inline "Check Retention" micro-quiz on select high-yield dispatches to test immediate conceptual comprehension.

---

## 3. Phase 3 Scope: Distribution, SEO & Spaced Repetition

1. **Public Digest Permalinks (SEO Engine)**:
   - Server-side prerendered public route (`/briefs/[slug]`) indexing daily PIB digests on Google for UPSC keyword queries.
2. **Syllabus Coverage Ledger**:
   - Interactive progress ledger tracking how many syllabus sub-topics the candidate has tested and conquered.
3. **Spaced-Repetition Revision Arena**:
   - Dynamic 10-question practice quizzes populated automatically from the candidate's historical incorrect attempts stored in `question_attempts`.
