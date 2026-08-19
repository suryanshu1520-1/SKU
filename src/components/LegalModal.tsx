import { motion } from 'motion/react';
import { X, Shield } from 'lucide-react';

export type LegalDocumentType = 'privacy' | 'terms' | 'refund';

interface LegalModalProps {
  documentType: LegalDocumentType;
  onClose: () => void;
}

export default function LegalModal({ documentType, onClose }: LegalModalProps) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-12 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-950 border border-zinc-800 rounded-sm p-6 md:p-12 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-zinc-500 hover:text-[#e0d0ab] transition-colors bg-zinc-900/50 hover:bg-zinc-900 rounded-sm cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="prose prose-invert prose-zinc max-w-none pt-4 md:pt-0 font-sans">
          {documentType === 'privacy' && <PrivacyPolicy />}
          {documentType === 'terms' && <TermsAndConditions />}
          {documentType === 'refund' && <RefundPolicy />}
        </div>
      </motion.div>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <div className="space-y-6 text-zinc-400 font-sans text-sm leading-relaxed">
      <div className="flex items-center gap-2 text-[#e0d0ab] font-sans text-xs uppercase tracking-wider font-medium">
        <Shield className="w-4 h-4 text-emerald-400" />
        Legal &bull; Tark Trust Charter
      </div>
      <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#e0d0ab] mb-6 tracking-tight">Privacy Policy</h1>
      <p className="font-sans text-xs text-zinc-400">Effective Date: 2026-08-18 &bull; Platform: Tark (तर्क)</p>

      <p>Tark is committed to maintaining an ad-free, noise-free, zero-tracker environment for high-stakes competitive examination preparation. This document details our data handling standards.</p>

      <h2 className="font-serif font-bold text-base text-zinc-200 mt-8 mb-3">1. INFORMATION WE COLLECT</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Account Authentication:</strong> Email and chosen display name, managed securely via Supabase Auth.</li>
        <li><strong>Assessment Telemetry:</strong> Test sessions, question attempts, response times, accuracy, and leaderboard rankings.</li>
        <li><strong>Diagnostic Queries:</strong> Performance matrices processed by LLM engines (Google Gemini) exclusively to generate post-exam autopsies and study prescriptions.</li>
        <li><strong>Transactions:</strong> Handled securely by Razorpay. Tark never receives or stores debit/credit card numbers.</li>
      </ul>

      <h2 className="font-serif font-bold text-base text-zinc-200 mt-8 mb-3">2. ZERO DATA MONETIZATION PLEDGE</h2>
      <p>We do not sell candidate data, serve targeted ads, or share test performance metrics with third-party recruiters or commercial data aggregators. All usage data is used strictly to power your test analysis, diagnostic feedback, and leaderboard ranking.</p>

      <h2 className="font-serif font-bold text-base text-zinc-200 mt-8 mb-3">3. SECURITY & RETENTION</h2>
      <p>User records are stored in PostgreSQL with strict Row Level Security (RLS). You may request the permanent export or deletion of your account and test history at any time by contacting our support desk.</p>

      <h2 className="font-serif font-bold text-base text-zinc-200 mt-8 mb-3">4. CONTACT</h2>
      <p>For data privacy queries or account deletion requests: <strong>tark.feed26@gmail.com</strong></p>
    </div>
  );
}

function TermsAndConditions() {
  return (
    <div className="space-y-6 text-zinc-400 font-sans text-sm leading-relaxed">
      <div className="flex items-center gap-2 text-[#e0d0ab] font-sans text-xs uppercase tracking-wider font-medium">
        <Shield className="w-4 h-4 text-emerald-400" />
        Legal &bull; Terms of Service
      </div>
      <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#e0d0ab] mb-6 tracking-tight">Terms & Conditions</h1>
      <p className="font-sans text-xs text-zinc-400">Effective Date: 2026-08-18 &bull; Platform: Tark (तर्क)</p>

      <h2 className="font-serif font-bold text-base text-zinc-200 mt-8 mb-3">1. PLATFORM INTEGRITY</h2>
      <p>Tark provides competitive test simulation and current affairs intelligence. You agree not to scrape, automatedly harvest questions, exploit server endpoints, or circumvent rate-limiting barriers.</p>

      <h2 className="font-serif font-bold text-base text-zinc-200 mt-8 mb-3">2. FOUNDERS CLUB LIFETIME ACCESS</h2>
      <p>Founders Club enrollment grants one-time payment lifetime access to all platform features and AI diagnostic autopsies. Enrollment is strictly limited to 500 members to guarantee ultra-low server latencies and priority LLM token allocation.</p>

      <h2 className="font-serif font-bold text-base text-zinc-200 mt-8 mb-3">3. CONTACT</h2>
      <p>Platform Support: <strong>tark.feed26@gmail.com</strong></p>
    </div>
  );
}

function RefundPolicy() {
  return (
    <div className="space-y-6 text-zinc-400 font-sans text-sm leading-relaxed">
      <div className="flex items-center gap-2 text-[#e0d0ab] font-sans text-xs uppercase tracking-wider font-medium">
        <Shield className="w-4 h-4 text-emerald-400" />
        Legal &bull; Refund & Cancellation Policy
      </div>
      <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#e0d0ab] mb-6 tracking-tight">Refund Policy</h1>
      <p className="font-sans text-xs text-zinc-400">Effective Date: 2026-08-18 &bull; Platform: Tark (तर्क)</p>

      <h2 className="font-serif font-bold text-base text-zinc-200 mt-8 mb-3">1. DIGITAL ACCESS & SEAT INVENTORY</h2>
      <p>Due to the immediate provisioning of lifetime access and the hard capacity cap (500 seats), all Founders Club sales are final once digital access is granted.</p>

      <h2 className="font-serif font-bold text-base text-zinc-200 mt-8 mb-3">2. TRANSACTION OR DEDUCTION ERRORS</h2>
      <p>If payment is deducted from your bank but your account is not upgraded due to network interruption or Razorpay gateway timeout, the transaction will either be automatically reconciled within 24 hours or refunded to your original payment method within 5-7 business days. You can also email us directly with your Razorpay payment ID for immediate manual tier elevation.</p>

      <h2 className="font-serif font-bold text-base text-zinc-200 mt-8 mb-3">3. CONTACT</h2>
      <p>Payment Reconciliation: <strong>tark.feed26@gmail.com</strong></p>
    </div>
  );
}
