---
type: object
status: verified 2026-08-18
universe: live
---

# Object: Subscription & Orders (`pending_orders`, Razorpay)

## 1. What It Is
The monetization and concurrency-control infrastructure governing user upgrades from Free to Pro tier via Razorpay payment gateway integration.

## 2. Why This Shape
- **Double-Spend Prevention**: Implements atomic seat reservation via `pending_orders` table and `reserve_premium_seat_if_available` RPC.
- **Auto-Expiring Locks**: Seat locks expire in 15 minutes, preventing blocked inventory from abandoned checkouts.

## 3. Shape & Citations
- **Pending Orders Migration**: [`supabase/migrations/20260619000002_pending_orders.sql`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/supabase/migrations/20260619000002_pending_orders.sql)
- **Order Creation Endpoint**: [`server-lib/create-razorpay-order.ts:L1-L60`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/create-razorpay-order.ts#L1-L60)
- **Payment Verification Endpoint**: [`server-lib/verify-payment.ts:L1-L70`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/verify-payment.ts#L1-L70)

## 4. Connected To
- **Updates**: `profiles.tier` to `'pro'`.
- **References**: `profiles.id` as `user_id`.

## 5. If You Change This
- **Hits**: [`server-lib/create-razorpay-order.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/create-razorpay-order.ts), [`server-lib/verify-payment.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/verify-payment.ts), [`src/components/Profile.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Profile.tsx).
- **Does not hit**: Quiz scoring or question generation.

## 6. Surfaces
- **Written by**: Razorpay order endpoints and payment webhooks.
- **Read by**: [`src/components/Profile.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Profile.tsx).

## 7. See
- Source: [`server-lib/create-razorpay-order.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/create-razorpay-order.ts)
- Doc: [`docs/monetization-tiers.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/monetization-tiers.md)
