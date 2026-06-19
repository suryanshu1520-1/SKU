import { motion } from 'motion/react';
import { X } from 'lucide-react';

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
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-zinc-500 hover:text-stone-100 transition-colors bg-zinc-900/50 hover:bg-zinc-900 rounded-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="prose prose-invert prose-zinc max-w-none pt-4 md:pt-0">
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
      <h1 className="font-serif text-2xl md:text-3xl font-bold text-zinc-100 mb-8 uppercase tracking-wider">Privacy Policy</h1>
      <p className="font-bold text-zinc-300">Effective Date: June 19, 2026</p>
      <p className="font-bold text-zinc-300">Platform: Project Tark (Project Tark V2)</p>

      <p>Welcome to Project Tark. We are committed to maintaining a secure, zero-noise environment for your academic and policy assessment needs. This Privacy Policy outlines how we collect, process, and protect your data within our infrastructure.</p>
      <p>By accessing the Training Ground, the Vanguard Arena, or enrolling in the Founders Club, you consent to the data practices described in this document.</p>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">1. INFORMATION WE COLLECT</h2>
      <p>To operate the Tark engine effectively, we collect the following categories of information:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Account & Identity Data:</strong> When you enroll, we collect your email address and name. Authentication is securely handled via our database provider (Supabase).</li>
        <li><strong>Assessment & Telemetry Data:</strong> We track your performance metrics, including quiz_sessions, quiz_answers, time-taken, and your overall ranking on the public leaderboard.</li>
        <li><strong>AI Diagnostic Data:</strong> The inputs you submit for "Autopsy" insights are processed to generate personalized conceptual feedback.</li>
        <li><strong>Transaction Data:</strong> If you upgrade to the Founders Club, our payment gateway (Razorpay) processes your payment. Project Tark does not store or process your credit card numbers or banking details on our servers. We only store secure UUID order receipts to validate your tier access.</li>
      </ul>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">2. HOW WE USE YOUR DATA</h2>
      <p>We do not sell your personal data. We use the information we collect strictly to:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Provide, operate, and maintain the Project Tark platform.</li>
        <li>Authenticate your identity and secure your session against unauthorized access or API abuse.</li>
        <li>Calculate your test metrics, update the global leaderboard, and generate AI-driven conceptual blind-spot analysis.</li>
        <li>Process your ₹399 Founders Club enrollment and ensure structural compliance with our 500-user capacity lock.</li>
        <li>Communicate with you regarding critical platform updates, security notices, or support requests.</li>
      </ul>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">3. THIRD-PARTY INFRASTRUCTURE</h2>
      <p>Project Tark is built on a modern, decoupled tech stack. To deliver our services, your data interacts with the following highly secure, enterprise-grade third parties:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Supabase:</strong> Acts as our secure database and authentication layer. User profiles and test metrics are stored here under strict Row-Level Security (RLS) protocols.</li>
        <li><strong>Vercel:</strong> Hosts our frontend and serverless backend architecture.</li>
        <li><strong>Razorpay:</strong> Securely processes all financial transactions and webhook validations.</li>
        <li><strong>Google (Gemini) / Llama LLMs:</strong> Processes assessment text and user queries to generate the "Autopsy" insights.</li>
      </ul>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">4. COOKIES AND LOCAL STORAGE</h2>
      <p>We utilize minimal, functional local storage and cookies strictly for operational integrity:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Session Management:</strong> To keep you securely logged in and maintain your authentication tokens.</li>
        <li><strong>Autopsy Persistence:</strong> To preserve your UI state (like your immediate quiz results and AI insights) locally on your device so you do not lose data when navigating between the Arena and your Profile.</li>
      </ul>
      <p>We do not use invasive third-party tracking or advertising cookies.</p>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">5. DATA SECURITY</h2>
      <p>We treat your data with the same rigor we apply to our system architecture. Project Tark employs strict security measures, including database Row-Level Security (RLS), environment-variable isolation, server-side identity validation (JWT), and automated rate-limiting to protect against DDoS and extraction attacks.</p>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">6. YOUR RIGHTS</h2>
      <p>You retain absolute control over your data. You may request to:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Access the personal data and performance metrics we hold about you.</li>
        <li>Correct any inaccuracies in your profile.</li>
        <li>Request the permanent deletion of your account and associated telemetry data from our Supabase tables.</li>
      </ul>
      <p>To exercise these rights, please contact our support team.</p>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">7. CHANGES TO THIS POLICY</h2>
      <p>As the Tark engine evolves and new features are deployed, we may update this Privacy Policy. We will notify you of any significant structural changes by updating the "Effective Date" at the top of this document or by displaying a prominent notice within the application interface.</p>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">8. CONTACT US</h2>
      <p>For any questions regarding this Privacy Policy, your data footprint, or Razorpay transaction issues, please reach out to the architect:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Email:</strong> tark.feed26@gmail.com</li>
        <li><strong>Developer:</strong> Suryanshu Chaturvedi</li>
      </ul>
    </div>
  );
}

function TermsAndConditions() {
  return (
    <div className="space-y-6 text-zinc-400 font-sans text-sm leading-relaxed">
      <h1 className="font-serif text-2xl md:text-3xl font-bold text-zinc-100 mb-8 uppercase tracking-wider">Terms & Conditions</h1>
      <p className="font-bold text-zinc-300">Effective Date: June 19, 2026</p>

      <p>Welcome to Project Tark. By accessing our platform, you agree to these terms.</p>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">1. PLATFORM USAGE</h2>
      <p>Project Tark is an educational and assessment platform. You agree to use the platform in good faith and not to extract, scrape, or otherwise reverse-engineer the underlying algorithms, questions, or AI "Autopsy" insights.</p>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">2. ACCOUNT INTEGRITY</h2>
      <p>You are responsible for maintaining the security of your account credentials. The platform enforces strict rate limits and anomaly detection. Any abuse of the API will result in immediate termination of your Founders Club status without refund.</p>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">3. FOUNDERS CLUB ENROLLMENT</h2>
      <p>Enrollment in the Founders Club requires a one-time fee of ₹399 via Razorpay. Access privileges are non-transferable.</p>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">4. CONTACT</h2>
      <p>For support, contact us at <strong>tark.feed26@gmail.com</strong>.</p>
    </div>
  );
}

function RefundPolicy() {
  return (
    <div className="space-y-6 text-zinc-400 font-sans text-sm leading-relaxed">
      <h1 className="font-serif text-2xl md:text-3xl font-bold text-zinc-100 mb-8 uppercase tracking-wider">Refund & Cancellation Policy</h1>
      <p className="font-bold text-zinc-300">Effective Date: June 19, 2026</p>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">1. NO REFUNDS</h2>
      <p>Project Tark delivers digital access to the Founders Club, premium AI insights, and assessment tools. Due to the immediate, digital nature of these services, <strong>all sales are final</strong>. We do not offer refunds, exchanges, or cancellations once a payment is successfully processed.</p>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">2. PAYMENT FAILURES</h2>
      <p>If your payment fails or is deducted but tier access is not granted, the amount will automatically be refunded to your original payment method by Razorpay within 5-7 business days. If issues persist, please contact our support team with your Transaction UUID.</p>

      <h2 className="font-bold text-lg text-zinc-100 mt-8 mb-4">3. CONTACT</h2>
      <p>For transaction disputes or questions, contact us at <strong>tark.feed26@gmail.com</strong>.</p>
    </div>
  );
}
