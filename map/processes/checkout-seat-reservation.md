---
type: process
status: verified 2026-08-18
universe: live
---

# Process: Checkout & Seat Reservation

## 1. Summary
Atomic upgrade process where a candidate locks an available membership seat for 15 minutes before payment, completes Razorpay checkout, and automatically upgrades to Pro tier upon cryptographic verification.

## 2. Movement
1. **Initiate**: Candidate clicks "Upgrade to Pro" in [`src/components/Profile.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Profile.tsx).
2. **Lock Seat**: [`server-lib/create-razorpay-order.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/create-razorpay-order.ts) calls `reserve_premium_seat_if_available` RPC.
3. **Razorpay Init**: Creates order via Razorpay SDK and returns order parameters to client.
4. **Checkout Modal**: Client renders Razorpay popup.
5. **Verify Payment**: Client posts payment ID and signature to `/api/verify-payment`.
6. **Finalize**: [`server-lib/verify-payment.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/verify-payment.ts) verifies HMAC signature, marks order `paid`, and sets `profiles.tier = 'pro'`.

## 3. Objects Touched
- **Consumes**: [`map/objects/user-and-auth.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/user-and-auth.md).
- **Produces**: [`map/objects/subscription-and-orders.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/subscription-and-orders.md).

## 4. If You Change This
- **Hits**: [`server-lib/create-razorpay-order.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/create-razorpay-order.ts), [`server-lib/verify-payment.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/verify-payment.ts), [`src/components/Profile.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Profile.tsx).
- **Does not hit**: Quiz evaluation or question generation.
