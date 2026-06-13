import { createClient } from "@supabase/supabase-js";
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

const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://ixngfxaerlkkcacrbdgc.supabase.co";
const rawSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmdmeGFlcmxra2NhY3JiZGdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDIxNjc0NCwiZXhwIjoyMDk1NzkyNzQ0fQ.BY5YQh7nbSUrNZ61nHDIuzOX2P2s3iD3L_s11QHz9mg";
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

  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  try {
    // ─── STEP 1: Atomically check premium capacity via Supabase RPC ─────────
    const { data: capacityResult, error: capacityError } = await supabaseServer.rpc(
      'check_premium_capacity'
    );

    if (capacityError) {
      console.error("[razorpay] Premium capacity check RPC failed:", capacityError);
      // Fall back to direct count query
      const { count, error: countError } = await supabaseServer
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('membership_tier', 'premium');

      if (countError) {
        return res.status(500).json({ error: "Failed to verify membership capacity." });
      }

      if (count !== null && count >= 500) {
        return res.status(403).json({
          error: "Founders Club is full. The 500-seat capacity has been reached."
        });
      }
    } else {
      // Parse the RPC result
      const capacityInfo = capacityResult as { count: number; hasCapacity: boolean; lockAcquired: boolean };
      if (!capacityInfo.hasCapacity) {
        return res.status(403).json({
          error: "Founders Club is full. The 500-seat capacity has been reached.",
          capacity: capacityInfo,
        });
      }
    }

    // ─── STEP 2: Check if user is already premium ────────────────────────
    const { data: userProfile, error: profileError } = await supabaseServer
      .from('user_profiles')
      .select('membership_tier')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error("[razorpay] Profile fetch error:", profileError);
    }

    if (userProfile?.membership_tier === 'premium') {
      return res.status(200).json({
        alreadyPremium: true,
        message: "You are already a Founders Club member.",
      });
    }

    // ─── STEP 3: Initialize Razorpay SDK ─────────────────────────────────
    const razorpayKeyId = cleanEnvValue(process.env.RAZORPAY_KEY_ID || '');
    const razorpayKeySecret = cleanEnvValue(process.env.RAZORPAY_KEY_SECRET || '');

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("[razorpay] Missing Razorpay credentials");
      return res.status(500).json({ error: "Payment gateway configuration error." });
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    // ─── STEP 4: Create Razorpay order (₹399 = 39900 paise) ──────────────
    const order = await razorpay.orders.create({
      amount: 39900,
      currency: "INR",
      receipt: userId,
      notes: {
        userId: userId,
      },
    });

    console.log(`[razorpay] Order created: ${order.id} for user ${userId}`);

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: razorpayKeyId,
    });
  } catch (err: any) {
    console.error("[razorpay] Order creation error:", err);
    return res.status(500).json({
      error: err.message || "An unexpected error occurred while creating the payment order.",
    });
  }
}