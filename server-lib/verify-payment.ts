import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";
import Razorpay from "razorpay";

function cleanEnvValue(val: any): string {
  if (typeof val !== 'string') return '';
  let cleaned = val.trim();
  while (cleaned.startsWith('"') || cleaned.startsWith("'")) {
    cleaned = cleaned.substring(1);
  }
  while (cleaned.endsWith('"') || cleaned.endsWith("'")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }
  return cleaned.trim();
}

const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
if (!rawSupabaseUrl) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Supabase URL missing.");
const rawSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!rawSupabaseKey) throw new Error("CRITICAL_ENVIRONMENT_FAULT: Secret missing.");
const supabaseServer = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawSupabaseKey));

export default async function handler(req: any, res: any) {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    userId,
  } = req.body || {};

  // Validate required fields
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !userId) {
    return res.status(400).json({
      error: "Missing required payment verification parameters.",
    });
  }

  try {
    // ─── STEP 1: Verify HMAC-SHA256 Signature ────────────────────────────
    const razorpayKeySecret = cleanEnvValue(process.env.RAZORPAY_KEY_SECRET || '');

    if (!razorpayKeySecret) {
      console.error("[razorpay-verify] Missing RAZORPAY_KEY_SECRET");
      return res.status(500).json({ error: "Payment verification configuration error." });
    }

    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error(
        `[razorpay-verify] SIGNATURE MISMATCH — possible tampering detected. ` +
        `Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}, ` +
        `Expected: ${expectedSignature}, Received: ${razorpay_signature}`
      );
      return res.status(400).json({
        error: "Payment signature verification failed. Transaction rejected.",
      });
    }

    console.log(`[razorpay-verify] Signature verified successfully for payment ${razorpay_payment_id}`);

    // ─── STEP 1.5: Cross-check order ownership (prevent misdirected upgrades) ──
    const { data: pendingOrder } = await supabaseServer
      .from('pending_orders')
      .select('user_id')
      .eq('order_id', razorpay_order_id)
      .maybeSingle();

    if (pendingOrder && pendingOrder.user_id !== userId) {
      console.error(
        `[razorpay-verify] USER MISMATCH — Order ${razorpay_order_id} was created for ` +
        `${pendingOrder.user_id}, but verification was submitted for ${userId}`
      );
      return res.status(403).json({
        error: "Payment order does not match authenticated user.",
      });
    }

    const razorpayKeyId = cleanEnvValue(process.env.RAZORPAY_KEY_ID || '');
    if (razorpayKeyId && razorpayKeySecret) {
      try {
        const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
        const orderData = await razorpay.orders.fetch(razorpay_order_id);
        const orderNotesUserId = orderData?.notes?.userId;
        if (orderNotesUserId && orderNotesUserId !== userId) {
          console.error(
            `[razorpay-verify] RAZORPAY NOTES MISMATCH — Order ${razorpay_order_id} notes.userId ` +
            `is ${orderNotesUserId}, but request specified ${userId}`
          );
          return res.status(403).json({
            error: "Payment order does not match authenticated user.",
          });
        }
      } catch (orderFetchErr) {
        console.warn("[razorpay-verify] Order fetch from gateway warning:", orderFetchErr);
      }
    }

    // ─── STEP 2: Atomically upgrade user to premium via Supabase RPC ─────
    const { data: upgradeResult, error: upgradeError } = await supabaseServer.rpc(
      'upgrade_to_premium',
      { user_id_param: userId }
    );

    if (upgradeError) {
      console.error("[razorpay-verify] Premium upgrade RPC failed:", upgradeError);
      return res.status(500).json({
        error: "Failed to upgrade membership due to internal capacity check error. Please contact support with payment ID: " + razorpay_payment_id,
        payment_id: razorpay_payment_id,
      });
    } else {
      const result = upgradeResult as { success: boolean; reason?: string; alreadyPremium?: boolean };
      if (!result.success) {
        console.error("[razorpay-verify] Upgrade rejected by RPC:", result.reason);
        return res.status(403).json({
          error: result.reason || "Membership upgrade failed. Please contact support.",
          payment_id: razorpay_payment_id,
        });
      }
      if (result.alreadyPremium) {
        console.log(`[razorpay-verify] User ${userId} was already premium — idempotent success.`);
      }
    }

    // ─── STEP 3: Clear the pending order lock ─────────────────────────────
    const { error: lockClearError } = await supabaseServer
      .from('pending_orders')
      .delete()
      .eq('user_id', userId);

    if (lockClearError) {
      console.warn(`[razorpay-verify] Failed to clear pending order for ${userId}:`, lockClearError);
    }

    console.log(`[razorpay-verify] User ${userId} upgraded to premium successfully (Payment: ${razorpay_payment_id})`);

    return res.status(200).json({
      success: true,
      message: "Payment verified and membership upgraded successfully.",
      payment_id: razorpay_payment_id,
    });
  } catch (err: any) {
    console.error("[razorpay-verify] Verification error:", err);
    return res.status(500).json({
      error: err.message || "An unexpected error occurred during payment verification.",
      payment_id: razorpay_payment_id,
    });
  }
}