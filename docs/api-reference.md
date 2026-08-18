# API Reference — Tark 1.0

All protected API endpoints require an `Authorization: Bearer <supabase_access_token>` header.

---

## 1. Quiz & Questions

### `GET /api/questions`
- **Description**: Retrieves the active question set for today's competitive daily quiz.
- **Query Params**: `date` (`YYYY-MM-DD`, optional).
- **Response**: Array of question objects without revealing `correct_index` or explanations before submission.

### `GET /api/training-questions`
- **Description**: Retrieves unranked/practice questions categorized by topic or difficulty.
- **Response**: Array of practice question items.

### `POST /api/submit-quiz`
- **Description**: Submits user answers for server-side grading and session storage.
- **Auth**: Required (`Bearer <token>`).
- **Request Body**:
  ```json
  {
    "date": "2026-08-18",
    "answers": {
      "question_uuid_1": 2,
      "question_uuid_2": 0
    },
    "is_training": false
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "score": 3.34,
    "correct_count": 2,
    "incorrect_count": 1,
    "unanswered_count": 0,
    "total_questions": 3,
    "streak": 5,
    "xp_earned": 50,
    "explanations": [ ... ]
  }
  ```

---

## 2. Monetization & Orders

### `POST /api/create-razorpay-order`
- **Description**: Initiates premium subscription purchase. Invokes `reserve_premium_seat_if_available` RPC to lock a seat for 15 minutes before creating Razorpay order.
- **Auth**: Required.
- **Request Body**: `{ "plan_id": "pro_monthly" }`
- **Response**: `{ "order_id": "order_rcptid_...", "amount": 49900, "currency": "INR", "key": "rzp_test_..." }`

### `POST /api/verify-payment`
- **Description**: Validates Razorpay webhook/client payment signature, upgrades user profile tier to `'pro'`, and finalizes order.
- **Auth**: Required.
- **Request Body**:
  ```json
  {
    "razorpay_order_id": "order_...",
    "razorpay_payment_id": "pay_...",
    "razorpay_signature": "hmac_sha256_hash"
  }
  ```
- **Response**: `{ "success": true, "tier": "pro" }`

---

## 3. User Intelligence & Quotas

### `GET /api/insights`
- **Description**: Computes candidate performance metrics, historical accuracy, strength/weakness areas, and percentile comparisons.
- **Auth**: Required.

### `POST /api/bookmark`
- **Description**: Toggles bookmark status for a specific question.
- **Auth**: Required.
- **Request Body**: `{ "question_id": "uuid", "bookmarked": true }`

### `GET /api/user-limits`
- **Description**: Returns daily quiz limits, remaining attempts, and bookmark quota based on user tier.
- **Auth**: Required.

---

## 4. Background Workers & Cron

### `POST /api/cron/scrape`
- **Description**: Triggers automated RSS and PIB press release ingestion.
- **Auth**: Header `Authorization: Bearer <CRON_SECRET>`.
- **Response**: `{ "status": "processing", "sources": 5, "articles_queued": 18 }`

### `POST /api/cron/reset-leaderboard`
- **Description**: Resets weekly leaderboards and archives historical ranks.
- **Auth**: Header `Authorization: Bearer <CRON_SECRET>`.
