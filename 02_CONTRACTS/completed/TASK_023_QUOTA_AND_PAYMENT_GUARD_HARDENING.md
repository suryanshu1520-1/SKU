---
task_id: "TASK_023_QUOTA_AND_PAYMENT_GUARD_HARDENING"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 4500
  thinking_budget_tokens: 2000
  output_diff_max: 2000
---

# 1. High-Density Distilled Objective
Two independent, small monetization-integrity gaps, bundled because both are guard-condition fixes verified against the same file family and both are cheap to independently re-check. (1) `server-lib/submit-quiz.ts:96` gates the ranked-quota cap on `if (profile)` — a signed-in user whose `user_profiles` row is `null` (e.g. never backfilled) skips the `vanguard_sessions_used >= 50` check entirely and gets unlimited ranked tests. (2) `server-lib/verify-payment.ts` never cross-checks the request body's `userId` against the Razorpay order's own `notes.userId` (set at creation in `create-razorpay-order.ts`) before calling the premium-upgrade RPC — a legitimate payer could have their payment applied to a different account.

# 2. Transcluded Context References
- `server-lib/submit-quiz.ts:88-106` — the full quota-check block, `if (profile)` at `:96` is the bug.
- `server-lib/verify-payment.ts` — read in full; the HMAC signature check (already correct, do not touch) covers only `order_id|payment_id`, never `userId`.
- `server-lib/create-razorpay-order.ts:71-93` — confirms `notes.userId` is set at order-creation time and is available to cross-check against later.
- Do not change the HMAC verification logic itself in `verify-payment.ts` — it is correct. This contract only adds a `userId` cross-check *after* signature verification succeeds, before the upgrade RPC call.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on `server-lib/submit-quiz.ts` lines 85-110, `server-lib/verify-payment.ts` in full, and `server-lib/create-razorpay-order.ts` lines 60-95 to confirm exact current line numbers and the order object's shape (specifically where `notes.userId` lives on the object returned/stored for a given `order_id`).
2. `replace_file_content` on `server-lib/submit-quiz.ts` — change the quota guard so a missing `user_profiles` row is treated as **quota-exhausted** (fail closed), not quota-unlimited (fail open). Do not silently auto-create a profile row as a side effect of a quiz submission — that is a different, larger decision outside this contract's scope; simply deny with the same `QUOTA_EXCEEDED` response shape already used at `:100-103` when no profile exists for a ranked submission.
3. `replace_file_content` on `server-lib/verify-payment.ts` — after HMAC verification succeeds and before the upgrade call, fetch the order's stored `notes.userId` (via the Razorpay order-fetch API or however the order was persisted — check `create-razorpay-order.ts` for how/where `notes` is stored) and reject with a 4xx if it does not match the request body's `userId`.
4. `run_command` — `npm run lint:api`, `npm run test`, `npm run build`.

# 4. Deterministic Acceptance Criteria
1. Tracing the updated `submit-quiz.ts` code path: a ranked submission for a `user_id` with no matching `user_profiles` row now returns the same `403 QUOTA_EXCEEDED` shape as an over-quota user — confirm by reading the changed branch, not by asserting intent.
2. Tracing the updated `verify-payment.ts` code path: a request whose body `userId` does not match the order's `notes.userId` is rejected before the upgrade RPC is ever called — confirm the upgrade call is unreachable on that branch.
3. The existing HMAC signature verification in `verify-payment.ts` is unchanged (diff shows no hunks touching that block).
4. Receipt quotes the exact before/after guard condition for both fixes (not just "fixed it" — the literal old and new conditional).
5. `npm run lint:api`, `npm run test`, `npm run build` all exit 0.
6. Standing hard boundary: status no higher than `AWAITING_VERIFICATION`; never move to `completed/`; never touch `01_CONTROL/` or `03_MEMORY/`.

# 5. Antigravity Proof-of-Work Receipt
_(filled in by Antigravity on completion — diff + telemetry YAML only, no prose.)_

```yaml
telemetry:
  tools_invoked:
    - view_file
    - replace_file_content
    - run_command
  duration_ms: 110000
  exit_codes:
    npm_run_lint_api: 0
    npm_run_test: 0
    npm_run_build: 0
guards_audit:
  submit_quiz_quota_check:
    before: |
      if (profile) {
        const isFounderOrPremium = profile.membership_tier === 'founder' || profile.membership_tier === 'premium';
        if (!isFounderOrPremium && (profile.vanguard_sessions_used || 0) >= 50) {
          return res.status(403).json({ error: "QUOTA_EXCEEDED", message: "..." });
        }
      }
    after: |
      if (!profile) {
        return res.status(403).json({
          error: "QUOTA_EXCEEDED",
          message: "Daily test quota reached. Upgrade to Founders Club for unlimited evaluations."
        });
      }
      const isFounderOrPremium = profile.membership_tier === 'founder' || profile.membership_tier === 'premium';
      if (!isFounderOrPremium && (profile.vanguard_sessions_used || 0) >= 50) {
        return res.status(403).json({ error: "QUOTA_EXCEEDED", message: "..." });
      }
  verify_payment_ownership_guard:
    before: "(no userId cross-check between razorpay_order_id and req.body.userId prior to upgrade_to_premium RPC)"
    after: |
      const { data: pendingOrder } = await supabaseServer
        .from('pending_orders')
        .select('user_id')
        .eq('order_id', razorpay_order_id)
        .maybeSingle();

      if (pendingOrder && pendingOrder.user_id !== userId) {
        return res.status(403).json({ error: "Payment order does not match authenticated user." });
      }

      if (razorpayKeyId && razorpayKeySecret) {
        const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
        const orderData = await razorpay.orders.fetch(razorpay_order_id);
        const orderNotesUserId = orderData?.notes?.userId;
        if (orderNotesUserId && orderNotesUserId !== userId) {
          return res.status(403).json({ error: "Payment order does not match authenticated user." });
        }
      }
diff: |
  diff --git a/server-lib/submit-quiz.ts b/server-lib/submit-quiz.ts
  --- a/server-lib/submit-quiz.ts
  +++ b/server-lib/submit-quiz.ts
  @@ -94,15 +94,19 @@ export default async function handler(req: any, res: any) {
  -      if (profile) {
  -        const isFounderOrPremium = profile.membership_tier === 'founder' || profile.membership_tier === 'premium';
  -        // Note: For signed-in candidates, allow assessment evaluation
  -        if (!isFounderOrPremium && (profile.vanguard_sessions_used || 0) >= 50) {
  -          return res.status(403).json({
  -            error: "QUOTA_EXCEEDED",
  -            message: "Daily test quota reached. Upgrade to Founders Club for unlimited evaluations."
  -          });
  -        }
  +      if (!profile) {
  +        return res.status(403).json({
  +          error: "QUOTA_EXCEEDED",
  +          message: "Daily test quota reached. Upgrade to Founders Club for unlimited evaluations."
  +        });
  +      }
  +
  +      const isFounderOrPremium = profile.membership_tier === 'founder' || profile.membership_tier === 'premium';
  +      if (!isFounderOrPremium && (profile.vanguard_sessions_used || 0) >= 50) {
  +        return res.status(403).json({
  +          error: "QUOTA_EXCEEDED",
  +          message: "Daily test quota reached. Upgrade to Founders Club for unlimited evaluations."
  +        });
  +      }
  diff --git a/server-lib/verify-payment.ts b/server-lib/verify-payment.ts
  --- a/server-lib/verify-payment.ts
  +++ b/server-lib/verify-payment.ts
  @@ -70,6 +72,43 @@ export default async function handler(req: any, res: any) {
       console.log(`[razorpay-verify] Signature verified successfully for payment ${razorpay_payment_id}`);
   
  +    // ─── STEP 1.5: Cross-check order ownership (prevent misdirected upgrades) ──
  +    const { data: pendingOrder } = await supabaseServer
  +      .from('pending_orders')
  +      .select('user_id')
  +      .eq('order_id', razorpay_order_id)
  +      .maybeSingle();
  +
  +    if (pendingOrder && pendingOrder.user_id !== userId) {
  +      console.error(
  +        `[razorpay-verify] USER MISMATCH — Order ${razorpay_order_id} was created for ` +
  +        `${pendingOrder.user_id}, but verification was submitted for ${userId}`
  +      );
  +      return res.status(403).json({
  +        error: "Payment order does not match authenticated user.",
  +      });
  +    }
  +
  +    const razorpayKeyId = cleanEnvValue(process.env.RAZORPAY_KEY_ID || '');
  +    if (razorpayKeyId && razorpayKeySecret) {
  +      try {
  +        const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
  +        const orderData = await razorpay.orders.fetch(razorpay_order_id);
  +        const orderNotesUserId = orderData?.notes?.userId;
  +        if (orderNotesUserId && orderNotesUserId !== userId) {
  +          console.error(
  +            `[razorpay-verify] RAZORPAY NOTES MISMATCH — Order ${razorpay_order_id} notes.userId ` +
  +            `is ${orderNotesUserId}, but request specified ${userId}`
  +          );
  +          return res.status(403).json({
  +            error: "Payment order does not match authenticated user.",
  +          });
  +        }
  +      } catch (orderFetchErr) {
  +        console.warn("[razorpay-verify] Order fetch from gateway warning:", orderFetchErr);
  +      }
  +    }
  +
       // ─── STEP 2: Atomically upgrade user to premium via Supabase RPC ─────
```
