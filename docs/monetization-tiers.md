# Monetization & Concurrency Controls — Tark 1.0

## 1. Membership Tiers

| Feature / Limit | Free Tier (`'free'`) | Pro Tier (`'pro'`) |
|---|---|---|
| **Daily Competitive Quizzes** | 1 per day | Unlimited |
| **Practice / Unranked Arena** | 3 sessions per day | Unlimited |
| **Autopsy Deep Dive** | Basic score & answer breakdown | Full AI conceptual diagnostics & recommendations |
| **Bookmarks Archive** | Up to 15 bookmarks | Unlimited |
| **PIB & Current Affairs Feed** | Current week only | Full historical archive & search |
| **Leaderboard Visibility** | Standard rank | Verified Pro badge & cohort percentiles |

---

## 2. Concurrency & Race Condition Defense

To prevent the **501st member race condition** (overselling a capped batch of memberships), Tark 1.0 implements a two-phase reservation protocol:

```
[ User clicks "Upgrade to Pro" ]
               │
               ▼
[ RPC: `reserve_premium_seat_if_available(user_id)` ]
  - Checks if active pro seats + active pending locks < Max Capacity
  - Inserts row into `pending_orders` with 15-minute expiration
               │
      ┌────────┴────────┐
      │ Success         │ Capacity Full
      ▼                 ▼
[ Create Razorpay Order ] [ Return 409 Conflict: Batch Full ]
      │
[ User Completes Payment ]
      │
      ▼
[ Verify HMAC Signature (`/api/verify-payment`) ]
  - Marks `pending_orders` status = `'paid'`
  - Upgrades `user_profiles.membership_tier` = `'founder'`
  - Unlocks lifetime Founding Member privileges
```

---

## 3. Order Expiration & Lock Cleanup

If a user abandons checkout or payment fails:
- The `pending_orders` row naturally expires after `expires_at` (15 minutes).
- Subsequent reservation checks ignore expired rows, instantly freeing up the seat for other users without requiring manual administrative intervention.

---

## 4. Infrastructure & Cost Floor Record (Decisions D-1 / D-2, 2026-08-23)

- **Vercel Pro Floor (Decision D-1)**: Vercel Hobby was transitioned to Vercel Pro ($20/month) as a compliance decision (enabling commercial transactions and production-grade cron/timeout reliability), not a scaling bottleneck.
- **Retirement of "$0 Recurring" (Decision D-2)**: "$0 recurring" is officially retired as architectural and planning language across the project. While AI ingestion, embeddings, and data pipelines remain aggressively optimized for cost-free and open tiers where possible (Gemini free tier, GitHub Actions runners, got-scraping + cheerio), the actual production operational cost floor is $20/month (Vercel Pro).
- **Source of Truth**: All planning, roadmap, and architectural documents must treat this $20/month floor as canonical reality rather than claiming zero recurring infrastructure cost.
