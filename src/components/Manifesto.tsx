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
    <div className="min-h-screen flex flex-col items-center justify-start p-6 pt-24 md:pt-28 bg-surface text-primary font-sans relative overflow-hidden">
      {/* Background grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

      <div className="w-full max-w-2xl z-10 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-0 right-0 p-2 rounded-sm text-muted hover:text-[#e0d0ab] hover:bg-surface-elevated/60 transition-all border border-transparent hover:border-border/60 cursor-pointer"
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated border border-border rounded-sm text-[10px] uppercase font-sans font-medium text-secondary tracking-wider mb-4 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            CORE PHILOSOPHY
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#e0d0ab] drop-shadow-[0_0_15px_rgba(224,208,171,0.25)] mb-3 select-none">
            THE TARK MANIFESTO
          </h1>

          <p className="text-xs uppercase tracking-[0.25em] text-secondary font-sans">
            The War on Noise &bull; Return on Time
          </p>
        </motion.div>

        {/* Live Scarcity Callout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-10 p-4 bg-surface-elevated/40 border border-[#e0d0ab]/30 rounded-sm flex items-center justify-between gap-4"
        >
          <div className="space-y-0.5">
            <p className="text-[10px] font-sans uppercase text-[#e0d0ab] font-bold tracking-wider">
              Founders Club &bull; Strictly Capped Capacity
            </p>
            <p className="text-xs text-primary font-sans">
              {seatData ? `${seatData.claimed_seats} of ${seatData.max_capacity} lifetime seats claimed.` : 'Capped strictly at 500 members.'}
            </p>
          </div>
          <div className="shrink-0 font-mono text-xs px-2.5 py-1 bg-surface-elevated text-emerald-400 border border-border rounded-sm">
            {seatData ? `${seatData.remaining_seats} remaining` : '500 seats max'}
          </div>
        </motion.div>

        {/* Manifesto Content */}
        <div className="space-y-8">
          
          {/* Act 1: The Bleed */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-surface-elevated/30 border border-rose-500/30 p-6 md:p-8 rounded-sm relative overflow-hidden"
          >
            <div className="flex items-center gap-2 text-rose-400 font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              ACT I: THE BLEED // THE 1.32-MARK AUTOPSY
            </div>
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#f4ecd8] mb-3 leading-snug">
              "I lost Prelims by 1.32 marks because I read the PIB release on Green Hydrogen—and still fell for the nodal ministry swap."
            </h2>
            <p className="text-sm md:text-base text-secondary leading-relaxed font-sans mb-3">
              Like every serious repeater, I spent two hours every morning highlighting 120-page monthly compilation PDFs. I knew the SIGHT programme inside out. I knew the financial outlays.
            </p>
            <p className="text-sm md:text-base text-secondary leading-relaxed font-sans">
              Yet in the exam hall, two 50:50 guesses flipped negative (<span className="text-rose-400 font-bold font-mono">−1.32 marks</span>). The examiner quietly swapped the Ministry of New and Renewable Energy (MNRE) with the Ministry of Petroleum and Natural Gas (MoPNG) and slipped in an absolute statutory mandate. Two clicks on an OMR sheet, and another year was gone.
            </p>
          </motion.section>

          {/* Act 2: The Realization */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="p-6 md:p-8 bg-surface-elevated/20 border border-border/70 rounded-sm"
          >
            <div className="flex items-center gap-2 text-[#e0d0ab] font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#e0d0ab]" />
              ACT II: THE REALIZATION // TWO DIFFERENT COGNITIVE SKILLS
            </div>
            <h2 className="font-serif text-xl font-bold text-[#e0d0ab] mb-3">
              Reading current affairs and surviving an examiner trap have nothing in common.
            </h2>
            <p className="text-sm text-secondary leading-relaxed font-sans mb-3">
              EdTech companies profit by selling you passive reading materials. They give you 100-page booklets that give the illusion of progress. But when we digitized and autopsied 25 years of UPSC Prelims papers (2000–2025), the data was brutal:
            </p>
            <ul className="text-sm text-primary space-y-2 font-mono list-disc list-inside bg-black/20 p-4 rounded border border-white/5 mb-3">
              <li><strong className="text-[#e0d0ab]">70% of magazine bloat</strong> never maps to the 130 testable syllabus nodes.</li>
              <li><strong className="text-rose-400">78.4% of extreme absolute qualifiers</strong> ('only', 'all', 'never', 'solely') are intentional examiner traps.</li>
              <li><strong className="text-amber-300">64% of candidate mark bleed</strong> happens on inter-ministerial jurisdiction swaps and unverified statutory thresholds.</li>
            </ul>
            <p className="text-sm text-secondary leading-relaxed font-sans">
              You do not lose marks because you didn't read enough. You lose marks because you were never trained under adversarial pressure.
            </p>
          </motion.section>

          {/* Act 3: The Weapon */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="p-6 md:p-8 bg-surface-elevated/20 border border-emerald-500/30 rounded-sm"
          >
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              ACT III: THE WEAPON // THE ADVERSARIAL CONVEYOR BELT
            </div>
            <h2 className="font-serif text-xl font-bold text-[#f4ecd8] mb-3">
              Turning mark-bleed telemetry into structural immunity.
            </h2>
            <p className="text-sm text-secondary leading-relaxed font-sans mb-3">
              Tark is built as an adversarial sparring partner. Instead of letting you passively browse six different rooms, our <span className="text-[#e0d0ab] font-semibold">Adversarial Conveyor Belt</span> fuses your daily routine into a single 8-minute crucible:
            </p>
            <p className="text-sm text-secondary leading-relaxed font-sans">
              Reading a wire-verified PIB dispatch immediately triggers an authentic timed <span className="text-emerald-400 font-mono font-bold">+2.00 / −0.66</span> trap question. If you fall for it, our engine instantly auto-opens the exact historical PYQ twin from 2000–2025 and a primary constitutional quote from Ambedkar or Kant on the same screen. You never bleed marks to the same structural trick twice.
            </p>
          </motion.section>

          {/* Act 4: The Sanctuary & Scarcity Guarantee */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="p-6 md:p-8 bg-surface-elevated/20 border border-border/70 rounded-sm"
          >
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              ACT IV: THE COVENANT // STRICT SCARCITY & ZERO NOISE
            </div>
            <h2 className="font-serif text-xl font-bold text-[#e0d0ab] mb-3">
              No ads. No video playlists. Strictly capped at 500 members.
            </h2>
            <p className="text-sm text-secondary leading-relaxed font-sans">
              Because we refuse to monetize attention or sell candidate data, Tark is funded purely by its members. To guarantee zero server latencies, immediate AI diagnostic generations, and direct support, Founders Club memberships are hard-capped at 500 members. No recurring subscriptions. One payment, lifetime access.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-surface-elevated/40 border border-[#e0d0ab]/30 p-6 rounded-sm text-center"
          >
            <p className="font-serif text-lg sm:text-xl text-[#e0d0ab] font-bold tracking-wide">
              Enter the crucible. Defuse the traps. Never bleed to the same trick twice.
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
              className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 py-3.5 px-8 bg-[#e0d0ab] text-surface font-sans text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-primary transition-all shadow-lg shadow-[#e0d0ab]/10 hover:shadow-[#e0d0ab]/20 disabled:opacity-50 cursor-pointer"
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-6 border border-border text-primary font-sans text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-surface-elevated/60 hover:text-[#e0d0ab] transition-all cursor-pointer"
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
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 bg-surface-elevated border border-border rounded-sm shadow-2xl"
        >
          <p className="text-xs text-primary font-sans whitespace-nowrap">
            {toastMsg}
          </p>
        </motion.div>
      )}
    </div>
  );
}