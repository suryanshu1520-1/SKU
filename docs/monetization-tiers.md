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
  - Upgrades `profiles.tier` = `'pro'`
  - Unlocks lifetime Pro privileges
```

---

## 3. Order Expiration & Lock Cleanup

If a user abandons checkout or payment fails:
- The `pending_orders` row naturally expires after `expires_at` (15 minutes).
- Subsequent reservation checks ignore expired rows, instantly freeing up the seat for other users without requiring manual administrative intervention.
