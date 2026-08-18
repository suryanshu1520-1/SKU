# Product Brainstorm — Making Tark Indispensable Without Betraying the Brand

> Generated: 2026-08-18 · Lens: `product-management:product-brainstorming`

## The Tension to Name First

"Cannot look away from" and "The War on Noise" pull in opposite directions if "cannot look away" is read as attention-hijacking. That's not the right target here, and it isn't necessary for this audience anyway.

A UPSC aspirant already has a highly loss-averse, anxiety-driven relationship with their own preparation — the exam date doesn't move for anyone. That's real stakes, not manufactured ones. The Duolingo playbook (streaks, variable rewards, guilt notifications) works by *inventing* stakes for people who don't have any. Tark has the opposite problem: real stakes, badly served. So the brief isn't "make it addictive" — it's "make it the one place that tells the truth about where the aspirant stands, every day." That's a different design target, and it's the one that's brand-coherent.

## Jobs-to-be-Done

- *"When I wake up, I want to know instantly whether I'm behind or on track, so I can decide what to do with the next hour without spending 20 minutes figuring out what to study."* — the job isn't "take a quiz," it's "remove ambiguity about where I stand."
- *"When something happens in the news, I want to know if it's UPSC-relevant and how it might be tested, so I don't waste time reading things that won't show up in Mains/Prelims."*
- *"When exam day approaches, I want to know I've covered everything the syllabus demands, not just what I enjoyed studying."* — coverage anxiety is a huge, underserved emotional job given how enormous the UPSC syllabus is (GS I–IV, CSAT, optional).

**What did aspirants "fire" to hire Tark?** Likely candidates: disorganized Telegram current-affairs channels, PDF dumps, ad-heavy mock-test apps (Testbook, Oliveboard), and their own Google Sheets syllabus trackers. The competitive set isn't just other quiz apps — it's the aspirant's own spreadsheet and messy forwards.

## SCAMPER Pass on the Existing Product

- **Combine**: Merge Policy Tracker + Arena. After reading a digest article, an inline 2–3 question self-test drawn from that article appears in the same sitting. Turns passive reading into active recall without adding a new subsystem — the AI distillation pipeline already produces structured insight per article (`saved_insights`, `pib_digests`).
- **Eliminate**: What if the daily *quiz-count* cap were removed for free users but a different limiter (autopsy depth) took its place? Flagged as an assumption to test, not a recommendation — changes conversion dynamics and needs real data before committing.
- **Reverse**: Default flow order could become "read then quiz" rather than "quiz first" — mirrors how retrieval practice actually works (input before test).
- **Modify (10x)**: Compress the daily digest into a single "Today's Brief" — one page, ranked by exam-relevance, capped at a visible ~7-minute read, ending in a self-test. Makes the brand's "return on time" promise a literal, visible product mechanic (a reading-time indicator).
- **Put to other use**: The same ingestion/distillation pipeline that generates digest content could produce spaced-repetition flashcards of high-yield facts (dates, scheme names, numbers) as a natural byproduct — no new AI capability required.

## First Principles

The two irreducible anxieties in UPSC prep are: **(1) "Am I behind?"** (coverage/pace) and **(2) "Will I forget what I learned three months ago?"** (retention). Any feature that visibly and honestly answers those two questions every day becomes the reason to open the app — not manufactured urgency, but the real stakes already present in the user's life.

## The Three Ideas That Converge

### 1. The Coverage Ledger
A persistent map of the entire GS syllabus against: PYQ-tagged questions available per topic, how many the user has attempted, accuracy per topic, and staleness (days since last tested). Turns free-floating dread into a specific, actionable list.

- **Why it's cheap to validate**: mostly a tagging project on the existing 1,722-question bank (`static_questions`) — LLM-classify each question into a syllabus taxonomy + PYQ year, spot-check ~50 samples for accuracy — before any UI work. Built from data that already exists; no new AI capability.
- **Natural extension of**: the per-quiz `subjectStats` already computed in Autopsy (`map/objects/arena-ui.md`).

### 2. Close the Loop Between Tracker and Arena
Every digest item ends with 2–3 inline questions pulled from the same synthesis step that already generates `saved_insights`. Questions missed on first pass seed a "Revision Arena" a few days later, reusing the existing unranked/`training_sessions` plumbing (`map/objects/gamification-leaderboard.md` name-collision note: `quiz_sessions` vs. `training_sessions`).

- **Biggest unknown**: whether the ingestion pipeline already extracts MCQs per digest item or only produces prose insight — worth checking `server-lib/cron/pipeline.ts` and the `/api/explanation` / `consume_insight_token` RPC before assuming this is net-new backend work. It may already exist in embryonic form and just need UI surfacing.

### 3. Replace "Streak" with "The Clock"
Instead of a generic gamified streak counter (exactly the noise the brand rejects), show an always-visible exam countdown plus a computed pace read-out: *"At this rate, you'll have covered 61% of the syllabus by Prelims day."* Same loss-aversion mechanic that makes streaks sticky, sourced from the user's real exam date instead of a manufactured chain. Fits "Assess. Analyze. Track." literally.

## Deliberately Not Solved Yet

- **Mains answer-writing practice**: the single biggest real gap — Tark is MCQ-only, but Mains is the exam that actually eliminates people. Full long-form answer evaluation is a much bigger, riskier bet than the three ideas above. Cheap test before committing: a weekly answer-writing prompt with lightweight AI feedback (not full grading) to gauge engagement before building a whole module.
- **Push notifications**: resist habit-loop notification patterns entirely — a push notification is noise by definition, and variable-reward pings are the exact addictive mechanic the brand's manifesto disavows. If a daily anchor is wanted, make it a fixed-time "edition drop" (like a newspaper arriving at 9am), not a variable-reward ping.
- **PWA/offline support**: a real gap for commute-based study, but it's table-stakes infrastructure work, not a differentiator — worth doing, not worth centering the brainstorm on.
