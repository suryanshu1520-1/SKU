import { fetchWithAuth } from '../lib/api';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowRight, X, Crown, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ManifestoProps {
  onNavigateArena: () => void;
  onNavigateSignup: () => void;
  onClose: () => void;
  userId?: string;
}

export default function Manifesto({ onNavigateArena, onNavigateSignup, onClose, userId }: ManifestoProps) {
  const [processingPayment, setProcessingPayment] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

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
        name: 'Tark 1.0',
        description: 'Founders Club Membership',
        order_id: orderData.order_id,
        prefill: {
          name: session?.user?.user_metadata?.name || '',
          email: session?.user?.email || '',
        },
        theme: {
          color: '#e0d0ab',
        },
        handler: async function (response: any) {
          // Verify payment on the backend
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
              setToastMsg('Welcome to the Founders Club! Your premium access is now active.');
              setProcessingPayment(false);
              // Navigate to arena after successful payment
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
    <div className="min-h-screen flex flex-col items-center justify-start p-6 pt-32 md:pt-28 bg-zinc-950 text-stone-50 font-sans relative overflow-hidden">
      {/* Subtle background grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      <div className="w-full max-w-2xl z-10 relative">
        {/* Close button - anchored inside relative container */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-sm text-zinc-500 hover:text-[#e0d0ab] hover:bg-zinc-900/50 transition-all border border-transparent hover:border-zinc-800/60"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-16"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-sm text-[8px] uppercase font-mono text-zinc-400 tracking-widest mb-6 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            PHILOSOPHY
          </div>

          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-widest text-[#e0d0ab] drop-shadow-[0_0_15px_rgba(224,208,171,0.25)] mb-4 select-none">
            THE TARK MANIFESTO
          </h1>

          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400 font-mono">
            The War on Noise.
          </p>
        </motion.div>

        {/* Manifesto Content */}
        <div className="space-y-12">
          {/* Intro */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-zinc-900/10 border border-zinc-900/60 p-6 md:p-8 rounded-sm"
          >
            <p className="text-sm md:text-base text-zinc-400 leading-relaxed font-sans">
              Your time is your most finite resource. Traditional EdTech is built to maximize your screen time through addictive gamification, intrusive ads, and bloated materials. We reject this entirely. Tark is built exclusively to maximize your <span className="text-[#e0d0ab] font-bold">return on time</span>. It is a premium, high-density academic sanctuary designed for those who treat their preparation as a professional pursuit.
            </p>
          </motion.section>

          {/* Section 1 */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="font-serif text-lg md:text-xl font-bold text-[#e0d0ab] mb-4 tracking-wide">
              The Unfair Advantage
            </h2>
            <p className="text-sm md:text-base text-zinc-400 leading-relaxed font-sans">
              While others waste countless hours deciphering bureaucratic jargon and political PR, our intelligence systems do the heavy lifting for you. We instantly distill hundreds of pages of complex government dispatches into ultra-focused, high-yield insights. You bypass the noise entirely and immediately access the exact, metric-dense facts required to conquer your assessments.
            </p>
          </motion.section>

          {/* Section 2 */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <h2 className="font-serif text-lg md:text-xl font-bold text-[#e0d0ab] mb-4 tracking-wide">
              An Ad-Free Sanctuary
            </h2>
            <p className="text-sm md:text-base text-zinc-400 leading-relaxed font-sans">
              Tark is engineered to cultivate deep work. You will never see an advertisement, a pop-up, or a colorful mascot demanding your attention. We provide a pristine, minimal environment so your brain can deploy 100% of its cognitive capacity toward retention and rigorous testing in the Analytical Arena.
            </p>
          </motion.section>

          {/* Section 3 */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h2 className="font-serif text-lg md:text-xl font-bold text-[#e0d0ab] mb-4 tracking-wide">
              The Founders Club Guarantee
            </h2>
            <p className="text-sm md:text-base text-zinc-400 leading-relaxed font-sans">
              Because we refuse to monetize your attention, Tark is proudly independent and exclusively member-supported. Your membership directly funds a lightning-fast, premium experience with zero compromises. To guarantee unparalleled quality and stability, access is strictly capped at 500 Founders Club members. When you join, you are investing in an elite instrument built specifically for your success.
            </p>
          </motion.section>

          {/* Conclusion */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75 }}
            className="bg-zinc-900/10 border border-zinc-900/60 p-6 md:p-8 rounded-sm text-center"
          >
            <p className="font-serif text-xl md:text-2xl text-[#e0d0ab] font-bold tracking-wider mb-2">
              Enter the arena. Do the work. Exit.
            </p>
          </motion.section>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 pb-16"
          >
            <button
              onClick={handleJoinFoundersClub}
              disabled={processingPayment}
              className="group inline-flex items-center gap-2 py-3 px-8 bg-[#e0d0ab] text-zinc-950 font-sans text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-stone-100 transition-all shadow-lg shadow-[#e0d0ab]/10 hover:shadow-[#e0d0ab]/20 disabled:opacity-50"
            >
              {processingPayment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crown className="w-4 h-4" />
              )}
              {processingPayment ? 'PROCESSING...' : 'JOIN THE FOUNDERS CLUB'}
              {!processingPayment && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
            </button>

            <button
              onClick={onClose}
              className="group inline-flex items-center gap-2 py-3 px-8 border border-[#e0d0ab]/50 text-[#e0d0ab] font-sans text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-[#e0d0ab]/10 transition-all"
            >
              <Shield className="w-4 h-4" />
              Let&rsquo;s see
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 bg-zinc-900 border border-zinc-700/60 rounded-sm shadow-2xl"
        >
          <p className="text-xs text-stone-200 font-sans whitespace-nowrap">
            {toastMsg}
          </p>
        </motion.div>
      )}
    </div>
  );
}