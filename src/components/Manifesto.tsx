import { fetchWithAuth } from '../lib/api';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowRight, X, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ManifestoProps {
  onNavigateArena: () => void;
  onNavigateSignup: () => void;
  onClose: () => void;
  userId?: string;
}

interface SeatCountData {
  max_capacity: number;
  claimed_seats: number;
  remaining_seats: number;
}

export default function Manifesto({ onNavigateArena, onNavigateSignup, onClose, userId }: ManifestoProps) {
  const [processingPayment, setProcessingPayment] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [seatData, setSeatData] = useState<SeatCountData | null>(null);

  // Fetch live seat status
  useEffect(() => {
    async function fetchSeats() {
      try {
        const { data, error } = await supabase.rpc('get_available_seat_count');
        if (!error && data) {
          setSeatData(data as SeatCountData);
        }
      } catch (e) {
        console.warn('Could not fetch seat capacity:', e);
      }
    }
    fetchSeats();
  }, []);

  // Inject Razorpay checkout script dynamically
  useEffect(() => {
    if (document.getElementById('razorpay-checkout-script')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 4000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const handleJoinFoundersClub = async () => {
    if (processingPayment) return;
    setProcessingPayment(true);
    setToastMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || userId;

      if (!currentUserId) {
        setToastMsg('Please sign in first to join the Founders Club.');
        setProcessingPayment(false);
        return;
      }

      // Step 1: Create Razorpay order via backend
      const orderRes = await fetchWithAuth('/api/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });

      const orderData = await orderRes.json();

      // Handle 403 - Founders Club is full
      if (orderRes.status === 403) {
        setToastMsg(orderData.error || 'Founders Club is full. The 500-seat capacity has been reached.');
        setProcessingPayment(false);
        return;
      }

      // Handle already premium
      if (orderData.alreadyPremium) {
        setToastMsg('You are already a Founders Club member!');
        setProcessingPayment(false);
        return;
      }

      if (!orderRes.ok || !orderData.order_id) {
        setToastMsg(orderData.error || 'Failed to initiate payment. Please try again.');
        setProcessingPayment(false);
        return;
      }

      // Step 2: Check if Razorpay is loaded
      if (!(window as any).Razorpay) {
        setToastMsg('Payment gateway is loading. Please try again in a moment.');
        setProcessingPayment(false);
        return;
      }

      // Step 3: Launch Razorpay checkout modal
      const razorpayKeyId = orderData.key_id;
      const options = {
        key: razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Tark | तर्क',
        description: 'Founders Club Lifetime Access',
        order_id: orderData.order_id,
        prefill: {
          name: session?.user?.user_metadata?.name || '',
          email: session?.user?.email || '',
        },
        theme: {
          color: '#e0d0ab',
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetchWithAuth('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                userId: currentUserId,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setToastMsg('Welcome to the Founders Club! Lifetime access unlocked.');
              setProcessingPayment(false);
              setTimeout(() => onNavigateArena(), 2000);
            } else {
              setToastMsg(verifyData.error || 'Payment verified but membership update failed. Contact support with ID: ' + response.razorpay_payment_id);
              setProcessingPayment(false);
            }
          } catch (err) {
            console.error('[Manifesto] Payment verification error:', err);
            setToastMsg('Payment verification failed. Please contact support.');
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error('[Manifesto] Razorpay payment failed:', response.error);
        setToastMsg('Payment failed: ' + (response.error?.description || 'Please try again.'));
        setProcessingPayment(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('[Manifesto] Razorpay error:', err);
      setToastMsg(err.message || 'An unexpected error occurred.');
      setProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 pt-24 md:pt-28 bg-zinc-950 text-stone-50 font-sans relative overflow-hidden">
      {/* Background grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

      <div className="w-full max-w-2xl z-10 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-0 right-0 p-2 rounded-sm text-zinc-500 hover:text-[#e0d0ab] hover:bg-zinc-900/60 transition-all border border-transparent hover:border-zinc-800/60 cursor-pointer"
          title="Close Manifesto"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-sm text-[10px] uppercase font-sans font-medium text-zinc-400 tracking-wider mb-4 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            CORE PHILOSOPHY
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#e0d0ab] drop-shadow-[0_0_15px_rgba(224,208,171,0.25)] mb-3 select-none">
            THE TARK MANIFESTO
          </h1>

          <p className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-sans">
            The War on Noise &bull; Return on Time
          </p>
        </motion.div>

        {/* Live Scarcity Callout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-10 p-4 bg-zinc-900/40 border border-[#e0d0ab]/30 rounded-sm flex items-center justify-between gap-4"
        >
          <div className="space-y-0.5">
            <p className="text-[10px] font-sans uppercase text-[#e0d0ab] font-bold tracking-wider">
              Founders Club &bull; Strictly Capped Capacity
            </p>
            <p className="text-xs text-zinc-300 font-sans">
              {seatData ? `${seatData.claimed_seats} of ${seatData.max_capacity} lifetime seats claimed.` : 'Capped strictly at 500 members.'}
            </p>
          </div>
          <div className="shrink-0 font-mono text-xs px-2.5 py-1 bg-zinc-800 text-emerald-400 border border-zinc-700 rounded-sm">
            {seatData ? `${seatData.remaining_seats} remaining` : '500 seats max'}
          </div>
        </motion.div>

        {/* Manifesto Content */}
        <div className="space-y-10">
          
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-zinc-900/20 border border-zinc-800/60 p-6 md:p-8 rounded-sm"
          >
            <p className="text-sm md:text-base text-zinc-300 leading-relaxed font-sans">
              Your time is your most finite resource. Traditional EdTech is engineered to maximize your screen time through addictive gamification, intrusive ads, and endless video lecture playlists. We reject this entirely. Tark is built exclusively to maximize your <span className="text-[#e0d0ab] font-semibold">return on time</span>.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="font-serif text-lg md:text-xl font-bold text-[#e0d0ab] mb-3 tracking-wide flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              1. The Intelligence Advantage
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed font-sans">
              Instead of spending 3 hours deciphering bureaucratic jargon and political press releases, our ingestion engine distills 40+ daily government dispatches into ultra-focused, 4-minute analytical briefs. You bypass the noise and retain the exact factual baseline tested in the examination.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2 className="font-serif text-lg md:text-xl font-bold text-[#e0d0ab] mb-3 tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#e0d0ab]" />
              2. An Ad-Free, Noise-Free Sanctuary
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed font-sans">
              Tark is engineered for deep focus. You will never see an advertisement, a third-party affiliate link, or a cartoon mascot demanding your attention. We provide a pristine analytical environment so 100% of your cognitive capacity is deployed on retention and reasoning.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h2 className="font-serif text-lg md:text-xl font-bold text-[#e0d0ab] mb-3 tracking-wide flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              3. The Provable Scarcity Guarantee
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed font-sans">
              Because we refuse to monetize attention or sell candidate data, Tark is funded purely by its members. To maintain low server latencies, immediate AI diagnostic generations, and direct support, Founders Club memberships are hard-capped at 500 members. No recurring subscriptions. One price, lifetime access.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-sm text-center"
          >
            <p className="font-serif text-lg sm:text-xl text-[#e0d0ab] font-bold tracking-wide">
              Enter the arena. Do the work. Exit.
            </p>
          </motion.section>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 pb-12"
          >
            <button
              onClick={handleJoinFoundersClub}
              disabled={processingPayment}
              className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 py-3.5 px-8 bg-[#e0d0ab] text-zinc-950 font-sans text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-stone-100 transition-all shadow-lg shadow-[#e0d0ab]/10 hover:shadow-[#e0d0ab]/20 disabled:opacity-50 cursor-pointer"
            >
              {processingPayment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              {processingPayment ? 'PROCESSING RESERVATION...' : 'JOIN THE FOUNDERS CLUB'}
              {!processingPayment && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>

            <button
              onClick={onClose}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-6 border border-zinc-800 text-zinc-300 font-sans text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-zinc-900/60 hover:text-[#e0d0ab] transition-all cursor-pointer"
            >
              Back to Overview
            </button>
          </motion.div>

        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 bg-zinc-900 border border-zinc-700 rounded-sm shadow-2xl"
        >
          <p className="text-xs text-stone-200 font-sans whitespace-nowrap">
            {toastMsg}
          </p>
        </motion.div>
      )}
    </div>
  );
}