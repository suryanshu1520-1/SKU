import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Shield, FileText, RotateCcw, ExternalLink, Mail, CheckCircle2 } from 'lucide-react';

export type LegalDocumentType = 'privacy' | 'terms' | 'refund';

interface LegalModalProps {
  documentType: LegalDocumentType;
  onClose: () => void;
  onSelectType?: (type: LegalDocumentType) => void;
}

export default function LegalModal({ documentType: initialDocType, onClose, onSelectType }: LegalModalProps) {
  const [currentType, setCurrentType] = useState<LegalDocumentType>(initialDocType);

  const handleTabChange = (type: LegalDocumentType) => {
    setCurrentType(type);
    if (onSelectType) {
      onSelectType(type);
    } else if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `/${type}`);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 md:py-12 relative text-[#f4ecd8]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#050b1a] border border-[rgba(224,208,171,0.18)] rounded-sm p-5 sm:p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85)] relative max-h-[88vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close legal charter modal"
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-[#7d8ca4] hover:text-[#e0d0ab] transition-colors bg-[#071630] hover:bg-[#0a2148] border border-[rgba(224,208,171,0.14)] rounded-sm cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Switcher Header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[rgba(224,208,171,0.10)] pb-4 pr-12 shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange('privacy')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-sm font-sans text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              currentType === 'privacy'
                ? 'bg-[#e0d0ab] text-[#050b1a] shadow-sm'
                : 'bg-[#071630] text-[#7d8ca4] hover:text-[#f4ecd8] border border-[rgba(224,208,171,0.10)]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('terms')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-sm font-sans text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              currentType === 'terms'
                ? 'bg-[#e0d0ab] text-[#050b1a] shadow-sm'
                : 'bg-[#071630] text-[#7d8ca4] hover:text-[#f4ecd8] border border-[rgba(224,208,171,0.10)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('refund')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-sm font-sans text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              currentType === 'refund'
                ? 'bg-[#e0d0ab] text-[#050b1a] shadow-sm'
                : 'bg-[#071630] text-[#7d8ca4] hover:text-[#f4ecd8] border border-[rgba(224,208,171,0.10)]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refund Policy</span>
          </button>

          <span className="hidden sm:inline-block ml-auto font-mono text-[11px] text-[#6e7d94]">
            Republic of India Jurisdiction
          </span>
        </div>

        {/* Scrollable Content Container */}
        <div className="overflow-y-auto pr-1 sm:pr-2 pt-6 font-sans text-sm leading-relaxed text-[#b5c1d1] scrollbar-thin">
          {currentType === 'privacy' && <PrivacyPolicyContent />}
          {currentType === 'terms' && <TermsContent />}
          {currentType === 'refund' && <RefundContent />}
        </div>

        {/* Footer Support Strip */}
        <div className="mt-6 pt-4 border-t border-[rgba(224,208,171,0.10)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#6e7d94] shrink-0">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-[#e0d0ab]" />
            <span>Official Legal & Grievance Desk:</span>
            <a href="mailto:support@tark.live" className="text-[#e0d0ab] hover:underline">
              support@tark.live
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#7d8ca4]">TAT SLA: 24h ack · 7d resolution</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PrivacyPolicyContent() {
  return (
    <article className="space-y-6">
      {/* Document Metadata Header */}
      <div className="space-y-2 pb-4 border-b border-[rgba(224,208,171,0.08)]">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[rgba(52,211,153,0.10)] border border-[rgba(52,211,153,0.30)] rounded font-mono text-[11px] text-[#34d399] font-medium">
          <Shield className="w-3.5 h-3.5" />
          <span>STATUTORY CHARTER // TARK-LEGAL-PP-2026-V2.4</span>
        </div>
        <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-[#f4ecd8] tracking-tight m-0">
          Privacy Policy & Data Governance Charter
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#7d8ca4]">
          <span>Effective: October 14, 2026</span>
          <span>·</span>
          <span>DPDP Act, 2023 Compliant</span>
          <span>·</span>
          <span>IT Act Section 43A & SPDI Rules, 2011</span>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">1. Preamble & Sovereign Data Covenant</h2>
        <p>
          This Privacy Policy and Data Governance Charter governs the collection, processing, cryptographic storage, telemetry aggregation, and erasure of Personal Data and Usage Telemetry by <strong>Tark</strong> (<span className="text-[#f4ecd8]">https://www.tark.live</span>). Under the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, Tark acts as a <em>Data Fiduciary</em> and you act as a <em>Data Principal</em>.
        </p>
        <div className="p-4 rounded bg-[#071630] border border-[rgba(224,208,171,0.12)] space-y-2">
          <div className="text-xs font-mono font-bold text-[#e0d0ab] uppercase tracking-wider">
            The Tark Zero-Ad & Zero-Brokerage Mandate:
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#b5c1d1]">
            <li>We do not serve third-party ads, behavioural retargeting pixels, affiliate links, or sponsored commercial content.</li>
            <li>We never sell, rent, license, syndicate, or trade your Personal Data, test performance records, or psychometric telemetry to coaching institutes, marketing agencies, or data brokers.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">2. Categories of Data Collected & Lawful Purpose Matrix</h2>
        <p className="text-xs text-[#7d8ca4]">
          Under the principle of Data Minimization, we collect strictly what is required to execute server-side grading, maintain your longitudinal performance record, and verify lifetime seat ownership:
        </p>
        <div className="overflow-x-auto border border-[rgba(224,208,171,0.14)] rounded">
          <table className="w-full text-left font-sans text-xs border-collapse min-w-[620px]">
            <thead>
              <tr className="border-b border-[rgba(224,208,171,0.14)] bg-[#071630] text-[#e0d0ab] font-mono">
                <th className="py-2.5 px-3">Data Category</th>
                <th className="py-2.5 px-3">Specific Elements</th>
                <th className="py-2.5 px-3">Lawful Basis & Purpose</th>
                <th className="py-2.5 px-3">Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(224,208,171,0.08)] text-[#b5c1d1]">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#f4ecd8]">A. Unauthenticated Diagnostic</td>
                <td className="py-2.5 px-3">Ephemeral option clicks (a, b, c, d), timer ticks, landing page diagnostic payload.</td>
                <td className="py-2.5 px-3">User-initiated +2.00 / −0.66 evaluation without mandatory login.</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">Purged on session close</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#f4ecd8]">B. Identity & Auth</td>
                <td className="py-2.5 px-3">Email, chosen handle (Leaderboard), OAuth session JWTs.</td>
                <td className="py-2.5 px-3">Explicit Consent (Sec. 6, DPDP Act) for account synchronization and seat binding.</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">Active account + 30 days</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#f4ecd8]">C. Psychometric Telemetry</td>
                <td className="py-2.5 px-3">Attempt history, +2.00 / −0.66 logs, 50:50 risk ratios, subject accuracy matrices, vulnerability tags.</td>
                <td className="py-2.5 px-3">Contractual performance: powering the 4-stage loop (Practice → Diagnose → Review → Improve).</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">Account lifetime; erasable on demand</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#f4ecd8]">D. Financial Metadata</td>
                <td className="py-2.5 px-3">Razorpay order_id, payment_id, verification signature, lifetime seat index (1–500).</td>
                <td className="py-2.5 px-3">Statutory tax & audit compliance (Income Tax Act, 1961 and GST rules).</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">8 years (Statutory)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#f4ecd8]">E. Security Logs</td>
                <td className="py-2.5 px-3">Truncated IP, TLS handshake metadata, User-Agent, rate-limit counters.</td>
                <td className="py-2.5 px-3">Scraping prevention, DDoS defense, server-side grading integrity.</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">Rolling 90-day window</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#7d8ca4] italic">
          * Strictly Zero Payment Instrument Storage: Transactions are settled via Razorpay Software Pvt. Ltd. (RBI-authorized PCI-DSS Level 1 aggregator). Tark never collects or stores raw card numbers, CVVs, or UPI PINs.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">3. Server-Side Telemetry & Leaderboard Privacy</h2>
        <p>
          When you lock an answer in the Test Arena, selection telemetry is transmitted over encrypted TLS 1.3 transport to our server grading pipeline. The Tark Leaderboard ranks accuracy and net marks pseudonymously: only your chosen display handle is visible. Your private email and contact details are never exposed.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">4. Infrastructure Sub-Processors</h2>
        <ul className="list-disc pl-5 space-y-1 text-xs">
          <li><strong>Database & Auth:</strong> Supabase, Inc. (PostgreSQL relational tables with kernel-level Row Level Security).</li>
          <li><strong>Edge Compute & Delivery:</strong> Vercel Inc. (Global edge routing and serverless grading execution).</li>
          <li><strong>Payment Processing:</strong> Razorpay Software Pvt. Ltd. (₹399 settlement, webhook cryptographic verification, and refund disbursement).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">5. Enforceable Rights of the Data Principal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#071630] border border-[rgba(224,208,171,0.10)] rounded">
            <strong className="text-[#e0d0ab] block mb-1">Right to Access (Sec. 11)</strong>
            Request a complete export of your personal data and telemetry in standard JSON/CSV format.
          </div>
          <div className="p-3 bg-[#071630] border border-[rgba(224,208,171,0.10)] rounded">
            <strong className="text-[#e0d0ab] block mb-1">Right to Erasure (Sec. 12)</strong>
            Trigger permanent account purge within 72 hours, removing all personal data and historical telemetry.
          </div>
          <div className="p-3 bg-[#071630] border border-[rgba(224,208,171,0.10)] rounded">
            <strong className="text-[#e0d0ab] block mb-1">Right to Withdraw Consent (Sec. 6)</strong>
            Revoke consent at any time through account settings or via our support desk.
          </div>
          <div className="p-3 bg-[#071630] border border-[rgba(224,208,171,0.10)] rounded">
            <strong className="text-[#e0d0ab] block mb-1">Grievance Redressal (Sec. 13)</strong>
            Direct escalation to our Grievance Officer with 24-hour acknowledgement and 7-day resolution SLA.
          </div>
        </div>
      </section>
    </article>
  );
}

function TermsContent() {
  return (
    <article className="space-y-6">
      {/* Document Metadata Header */}
      <div className="space-y-2 pb-4 border-b border-[rgba(224,208,171,0.08)]">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[rgba(224,208,171,0.10)] border border-[rgba(224,208,171,0.30)] rounded font-mono text-[11px] text-[#e0d0ab] font-medium">
          <FileText className="w-3.5 h-3.5" />
          <span>STATUTORY CHARTER // TARK-LEGAL-TOS-2026-V2.4</span>
        </div>
        <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-[#f4ecd8] tracking-tight m-0">
          Terms of Service & Platform License Agreement
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#7d8ca4]">
          <span>Effective: October 14, 2026</span>
          <span>·</span>
          <span>Indian Contract Act, 1872</span>
          <span>·</span>
          <span>IT Act, 2000 & Copyright Act, 1957</span>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">1. Binding Agreement & Service Nature</h2>
        <p>
          By accessing or running diagnostics on Tark (<span className="text-[#f4ecd8]">https://www.tark.live</span>), you enter into a legally binding contract under the <strong>Indian Contract Act, 1872</strong>. Tark provides high-stakes timed examination simulations (+2.00 / −0.66), OMR discipline tracking, the 50:50 Risk Ledger, 130-node syllabus practice sets, and primary-source daily intelligence.
        </p>
        <div className="p-3.5 rounded bg-[#071630] border border-[rgba(224,208,171,0.12)] text-xs text-[#b5c1d1]">
          <strong className="text-[#f4ecd8] block mb-1">Government Non-Affiliation Disclaimer:</strong>
          Tark is an independent private technology platform. It is not affiliated with, endorsed by, or officially connected to the Union Public Service Commission (UPSC), any State Public Service Commission (State PSC), Press Information Bureau (PIB), or any Ministry of the Government of India.
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">2. 500-Seat Founding Cohort & Single-Aspirant License</h2>
        <p>
          Upon verification of the one-time ₹399 payment for a Founding Seat, Tark grants you a personal, non-exclusive, non-transferable license for the operational lifetime of the platform.
        </p>
        <div className="p-3 bg-rose-950/20 border border-rose-500/25 rounded text-xs text-rose-200">
          <strong>Single-Aspirant Covenant:</strong> Each seat is licensed strictly to one (1) natural person. Sharing credentials, session tokens, or concurrent multi-IP access across Telegram study groups or shared drives is a material breach resulting in immediate license revocation.
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">3. Intellectual Property & Statutory Fair Dealing</h2>
        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li>
            <strong>Historical Question Papers (2000–2025):</strong> Indexed from official public-record examinations conducted by the UPSC in strict accordance with <strong>Section 52(1)(q) of the Indian Copyright Act, 1957</strong>.
          </li>
          <li>
            <strong>Government Releases:</strong> Primary links and citations in the Daily Brief originate from public government gazettes, PIB, and Parliament releases.
          </li>
          <li>
            <strong>Tark Proprietary Rights:</strong> The 130-node syllabus taxonomy, Examiner Trap syntheses, telemetry algorithms, 50:50 mathematical risk ledger, and source code are the copyrighted intellectual property of Tark.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">4. Server Integrity & Anti-Scraping Covenants</h2>
        <p className="text-xs">
          You covenant not to scrape or bulk-extract questions using automated scripts or headless browsers, tamper with server-side evaluation APIs (<code className="text-[#e0d0ab]">SRV_EVAL</code>), or redistribute Tark's diagnostic analyses in commercial coaching products.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">5. Limitation of Liability & Dispute Jurisdiction</h2>
        <p className="text-xs">
          Tark's aggregate cumulative liability for any claim arising out of these Terms shall not exceed the amount paid by you (<strong>₹399</strong>). Disputes shall be subject to the exclusive jurisdiction of the competent courts in India, subject to consumer rights under the Consumer Protection Act, 2019.
        </p>
      </section>
    </article>
  );
}

function RefundContent() {
  return (
    <article className="space-y-6">
      {/* Document Metadata Header */}
      <div className="space-y-2 pb-4 border-b border-[rgba(224,208,171,0.08)]">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[rgba(1,148,168,0.12)] border border-[rgba(1,148,168,0.30)] rounded font-mono text-[11px] text-[#0194a8] font-medium">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>STATUTORY CHARTER // TARK-LEGAL-REF-2026-V2.4</span>
        </div>
        <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-[#f4ecd8] tracking-tight m-0">
          Refund, Cancellation & Seat Allocation Policy
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#7d8ca4]">
          <span>Effective: October 14, 2026</span>
          <span>·</span>
          <span>Consumer Protection (E-Commerce) Rules, 2020</span>
          <span>·</span>
          <span>RBI Harmonisation of TAT Directives</span>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">1. Philosophy: Try Before You Pay</h2>
        <p>
          Tark provides full access to the live timed +2.00 / −0.66 diagnostic on the landing page before any payment is requested. If you purchase one of the <strong>500 Lifetime Seats (₹399 one-time)</strong> and find it does not align with your study workflow, our refund policy is simple and transparent.
        </p>
      </section>

      <section className="space-y-3">
        <div className="p-4 rounded bg-[#071630] border border-[rgba(52,211,153,0.25)] space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-[#34d399]">
            <CheckCircle2 className="w-4 h-4" />
            <span>The 7-Day No-Friction Refund Window</span>
          </div>
          <p className="text-xs text-[#b5c1d1] leading-relaxed">
            You are entitled to a <strong>100% full refund of your ₹399 payment</strong> within seven (7) calendar days (168 hours) of purchase. No justification or retention hoops required: email <strong className="text-[#f4ecd8]">support@tark.live</strong> with your registered email and Razorpay payment ID.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">2. Duplicate Payments & Settlement Failures</h2>
        <p className="text-xs">
          If your bank or UPI account is debited multiple times due to a network glitch or gateway timeout, Tark will immediately provision your seat or issue an <strong>unconditional 100% refund</strong> of the duplicate charge, regardless of the 7-day window.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">3. Effect on the 500-Seat Cohort Ledger</h2>
        <p className="text-xs">
          Because the Founding Cohort is strictly capped at 500 seats:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#b5c1d1]">
          <li>Upon refund initiation, your Lifetime Seat license is revoked and reverts to free status.</li>
          <li>The vacated seat is released back into the live inventory pool on <code className="text-[#e0d0ab]">tark.live</code> (+1 open seat).</li>
          <li>Once all 500 seats are claimed and the cohort closes, vacated seats cannot be re-claimed under founding terms.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">4. Disbursement Timelines & Zero Deductions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#071630] border border-[rgba(224,208,171,0.10)] rounded">
            <span className="text-[#7d8ca4] block font-mono text-[10px] uppercase">Razorpay Refund API Initiation</span>
            <strong className="text-[#f4ecd8] text-sm mt-0.5 block">24 to 48 Hours</strong>
          </div>
          <div className="p-3 bg-[#071630] border border-[rgba(224,208,171,0.10)] rounded">
            <span className="text-[#7d8ca4] block font-mono text-[10px] uppercase">Bank / UPI Account Credit</span>
            <strong className="text-[#f4ecd8] text-sm mt-0.5 block">5 to 7 Business Days</strong>
          </div>
        </div>
        <p className="text-xs text-[#7d8ca4]">
          * Zero Fee Deductions: Tark absorbs all payment gateway processing charges on valid refunds; you receive the exact ₹399 back.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-[#e0d0ab]">5. Zero Auto-Renewal Guarantee</h2>
        <p className="text-xs">
          The ₹399 lifetime seat is a strict one-time settlement. Tark does not register UPI Autopay mandates or standing credit card instructions. There are no recurring subscriptions.
        </p>
      </section>
    </article>
  );
}
