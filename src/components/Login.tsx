import { useState } from 'react';
import { Mail, ArrowRight, Loader2, AlertCircle, Lock, Check, RefreshCw, Sparkles, Eye, EyeOff, Shield, Swords, Globe, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchWithAuth } from '../lib/api';
import { supabase } from '../lib/supabase';
import InteractiveBackground from './InteractiveBackground';

interface LoginProps {
  onAuthenticated: (email: string, name: string, uuid?: string) => void;
  onNavigateManifesto?: () => void;
  onNavigateLegal?: (type: 'privacy' | 'terms' | 'refund') => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ onAuthenticated, onNavigateManifesto, onNavigateLegal }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const isEmailValid = EMAIL_REGEX.test(email);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = forgotEmail.trim() || email.trim();
    if (!targetEmail) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/?type=recovery`,
      });
      if (error) throw error;
      setForgotSent(true);
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send recovery link. Try again.');
      setStatus('idle');
    }
  };

  const handleAuthentication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const cleanedEmail = email.toLowerCase().trim();

      if (isSignUp) {
        const response = await fetchWithAuth('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: cleanedEmail,
            password: password,
            name: name,
          }),
        });

        const contentType = response.headers.get('content-type');
        let data: any = {};

        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          const shortText = text.substring(0, 150).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          throw new Error(`Server Error (${response.status}): ${shortText || 'Received invalid non-JSON output'}`);
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to register candidate dossier.');
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanedEmail,
        password: password,
      });

      if (authError) {
        throw new Error(authError.message || 'Invalid candidate credentials.');
      }

      if (!authData.session || !authData.user) {
        throw new Error('Failed to start authenticated session state.');
      }

      setStatus('success');

      const matchedName = authData.user.user_metadata?.name || name || cleanedEmail.split('@')[0];
      const matchedEmail = authData.user.email || cleanedEmail;

      localStorage.setItem('tark_session_email', matchedEmail);
      localStorage.setItem('tark_session_name', matchedName);
      if (authData.user.id) {
        localStorage.setItem('tark_session_user_id', authData.user.id);
      }

      setTimeout(() => {
        onAuthenticated(matchedEmail, matchedName, authData.user.id);
      }, 400);

    } catch (err: any) {
      console.warn("Authentication Phase Exception:", err);
      let displayError = err.message || '';
      if (displayError.includes('Database error saving new user')) {
        displayError = 'Saved user state bypassed successfully. Please sign in directly.';
      } else if (displayError.includes('signup_disabled')) {
        displayError = 'Registration is currently disabled on this instance. Try standard sign-in.';
      }
      setErrorMsg(displayError || 'The database is active but credentials did not match. Check spelling and retry.');
      setStatus('idle');
    }
  };

  const handleGoogleSignIn = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.warn("Google OAuth Exception:", err);
      setErrorMsg(err.message || 'Failed to initiate Google authentication.');
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-stone-100 font-sans relative overflow-hidden selection:bg-[#e0d0ab] selection:text-[#072e63]">
      
      {/* Background Interactive Constellations */}
      <InteractiveBackground />

      {/* ══════════════════════════════════════════════════════════════════
          LEFT PANEL - THE CANDIDATE INTEL SHOWCASE
          ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:w-1/2 bg-[rgba(4,25,54,0.7)] backdrop-blur-xl border-b md:border-b-0 md:border-r border-[rgba(19,108,153,0.35)] justify-between p-6 sm:p-10 md:p-14 relative z-10">
        
        {/* Top Status & Brand Lockup */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[rgba(11,61,120,0.3)] border border-[rgba(19,108,153,0.5)] rounded-xs text-[11px] font-sans text-[#e8e0cf]">
            <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
            <span className="text-[#8fa2bd]">Founders Induction:</span>
            <span className="text-[#e0d0ab] font-semibold">500 Lifetime Seats</span>
            <span className="text-[#8fa2bd] hidden sm:inline">&bull; 15-Min Lock</span>
          </div>

          <div className="space-y-2.5">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#e0d0ab] drop-shadow-[0_4px_24px_rgba(224,208,171,0.2)] leading-[1.15]">
              Absolute Focus. Rigorous Assessment.
            </h1>
            <p className="text-sm sm:text-base text-[#c8b998] font-sans leading-relaxed max-w-md">
              Tark is a sterile, zero-noise testing arena and daily intelligence engine engineered to isolate your blind spots before the examiner does.
            </p>
          </div>

          {/* 3 High-Yield Engine Steles */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3 rounded-xs bg-[rgba(11,61,120,0.2)] border border-[rgba(19,108,153,0.3)]">
              <div className="p-2 rounded-xs bg-[rgba(4,25,54,0.8)] border border-[rgba(224,208,171,0.3)] text-[#e0d0ab] shrink-0">
                <Swords className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-serif text-xs font-bold text-[#e8e0cf]">The Test Arena & Autopsy</h3>
                <p className="text-xs text-[#9fb0c8] mt-0.5">Timed simulation with server-evaluated scoring and AI conceptual autopsy.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xs bg-[rgba(11,61,120,0.2)] border border-[rgba(19,108,153,0.3)]">
              <div className="p-2 rounded-xs bg-[rgba(4,25,54,0.8)] border border-[rgba(224,208,171,0.3)] text-[#e0d0ab] shrink-0">
                <Globe className="w-4 h-4 text-[#0194a8]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-serif text-xs font-bold text-[#e8e0cf]">The Daily Brief</h3>
                <p className="text-xs text-[#9fb0c8] mt-0.5">10 curated policy signals daily with 100% grounded government citations.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xs bg-[rgba(11,61,120,0.2)] border border-[rgba(19,108,153,0.3)]">
              <div className="p-2 rounded-xs bg-[rgba(4,25,54,0.8)] border border-[rgba(224,208,171,0.3)] text-[#e0d0ab] shrink-0">
                <BookOpen className="w-4 h-4 text-[#e0d0ab]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-serif text-xs font-bold text-[#e8e0cf]">The Humanities Canon</h3>
                <p className="text-xs text-[#9fb0c8] mt-0.5">Verbatim primary texts from Ambedkar, Gandhi, and Kant with dialectic synthesis.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Integrity Pledge */}
        <div className="pt-6 border-t border-[rgba(19,108,153,0.3)] mt-6">
          <p className="text-xs text-[#8fa2bd]">
            Zero ads &bull; Zero tracking &bull; Zero sponsored distractions. Pure analytical intelligence.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT PANEL - THE AUTHENTICATION CRUCIBLE
          ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 relative z-10">
        <div className="w-full max-w-md">
          
          {/* Card Wrapper */}
          <div className="bg-[rgba(4,25,54,0.8)] backdrop-blur-xl border border-[rgba(19,108,153,0.45)] rounded-xs p-6 sm:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.7)] space-y-6">
            
            {/* Brand Title */}
            <div className="text-center space-y-1">
              <span className="font-mono text-xs uppercase tracking-widest text-[#0194a8]">
                Candidate Access Portal
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#e0d0ab] tracking-tight">
                Tark 1.0 &bull; तर्क
              </h2>
            </div>

            {/* Segmented Mode Switcher (Sign In vs Enroll) */}
            {!forgotPasswordMode && (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[rgba(3,16,38,0.7)] border border-[rgba(19,108,153,0.35)] rounded-xs">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
                  className={`py-2 text-xs font-sans font-semibold rounded-xs transition-all cursor-pointer ${
                    !isSignUp
                      ? 'bg-[#e0d0ab] text-[#072e63] shadow-sm'
                      : 'text-[#8fa2bd] hover:text-[#e8e0cf]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
                  className={`py-2 text-xs font-sans font-semibold rounded-xs transition-all cursor-pointer ${
                    isSignUp
                      ? 'bg-[#e0d0ab] text-[#072e63] shadow-sm'
                      : 'text-[#8fa2bd] hover:text-[#e8e0cf]'
                  }`}
                >
                  Enroll Dossier
                </button>
              </div>
            )}

            {/* Form */}
            <AnimatePresence mode="wait">
              <motion.form
                key={forgotPasswordMode ? "forgot" : isSignUp ? "signup" : "signin"}
                onSubmit={forgotPasswordMode ? handleForgotPassword : handleAuthentication}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {forgotPasswordMode ? (
                  <>
                    {forgotSent ? (
                      <div className="p-4 bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.4)] text-[#e8e0cf] text-xs font-sans rounded-xs leading-relaxed text-center space-y-1">
                        <CheckCircle2 className="w-5 h-5 text-[#34d399] mx-auto mb-1" />
                        <p className="font-bold text-[#34d399]">Recovery Link Dispatched</p>
                        <p className="text-[#9fb0c8]">Please check your inbox for password reset instructions.</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-sans text-[#8fa2bd] font-medium">
                            Registered Email Address
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa2bd]" />
                            <input
                              type="email"
                              required
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              placeholder="candidate@domain.com"
                              disabled={status === 'loading'}
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xs bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.4)] focus:border-[#e0d0ab] focus:outline-none text-sm text-[#e8e0cf] transition-all"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={status === 'loading'}
                          className="w-full py-2.5 px-4 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-sans font-semibold rounded-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                        >
                          {status === 'loading' ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              DISPATCHING...
                            </span>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Send Reset Link</span>
                            </>
                          )}
                        </button>
                      </>
                    )}

                    <div className="text-center pt-2 border-t border-[rgba(19,108,153,0.3)]">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordMode(false);
                          setErrorMsg('');
                          setForgotSent(false);
                          setStatus('idle');
                        }}
                        className="text-xs text-[#8fa2bd] hover:text-[#e0d0ab] transition-colors cursor-pointer"
                      >
                        &larr; Back to Sign In
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Name (Sign Up only) */}
                    {isSignUp && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5"
                      >
                        <label className="block text-xs font-sans text-[#8fa2bd] font-medium">
                          Candidate Full Name
                        </label>
                        <input
                          type="text"
                          required={isSignUp}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your Full Name"
                          disabled={status === 'loading'}
                          className="w-full px-3.5 py-2.5 rounded-xs bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.4)] focus:border-[#e0d0ab] focus:outline-none text-sm text-[#e8e0cf] transition-all"
                        />
                      </motion.div>
                    )}

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-sans text-[#8fa2bd] font-medium">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa2bd]" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="candidate@domain.com"
                          disabled={status === 'loading'}
                          className="w-full pl-10 pr-10 py-2.5 rounded-xs bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.4)] focus:border-[#e0d0ab] focus:outline-none text-sm text-[#e8e0cf] transition-all"
                        />
                        {isEmailValid && email.length > 0 && (
                          <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#34d399]" />
                        )}
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-sans text-[#8fa2bd] font-medium">
                          Password
                        </label>
                        {!isSignUp && (
                          <button
                            type="button"
                            onClick={() => {
                              setForgotPasswordMode(true);
                              setForgotEmail(email);
                              setErrorMsg('');
                              setForgotSent(false);
                            }}
                            className="text-[11px] text-[#8fa2bd] hover:text-[#e0d0ab] transition-colors cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa2bd]" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={status === 'loading'}
                          className="w-full pl-10 pr-10 py-2.5 rounded-xs bg-[rgba(11,61,120,0.25)] border border-[rgba(19,108,153,0.4)] focus:border-[#e0d0ab] focus:outline-none text-sm text-[#e8e0cf] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8fa2bd] hover:text-[#e8e0cf] cursor-pointer"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {isSignUp && (
                        <p className="text-[11px] text-[#8fa2bd]">Minimum 6 characters</p>
                      )}
                    </div>

                    {/* Error Display */}
                    {errorMsg && (
                      <div className="p-3 bg-[rgba(225,78,78,0.12)] border border-[rgba(225,78,78,0.4)] text-[#e8e0cf] text-xs font-sans rounded-xs leading-relaxed flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-[#e14e4e] mt-0.5" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="w-full py-3 px-4 bg-[#e0d0ab] hover:bg-white text-[#072e63] text-xs font-sans font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                    >
                      {status === 'loading' ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          AUTHENTICATING...
                        </span>
                      ) : isSignUp ? (
                        <>
                          <span>Enroll Candidate Dossier</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>Enter Analytical Arena</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>

                    {/* Google OAuth Divider */}
                    <div className="flex items-center my-3">
                      <div className="flex-1 border-t border-[rgba(19,108,153,0.3)]"></div>
                      <div className="px-3 text-[10.5px] font-sans uppercase tracking-wider text-[#8fa2bd]">
                        Or continue with
                      </div>
                      <div className="flex-1 border-t border-[rgba(19,108,153,0.3)]"></div>
                    </div>

                    {/* Google Button */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={status === 'loading'}
                      className="w-full py-2.5 px-4 bg-[rgba(11,61,120,0.3)] hover:bg-[rgba(11,61,120,0.5)] border border-[rgba(19,108,153,0.4)] text-[#e8e0cf] text-xs font-sans font-semibold rounded-xs transition-all cursor-pointer flex items-center justify-center gap-2.5"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </>
                )}
              </motion.form>
            </AnimatePresence>

          </div>

          {/* Manifesto Link */}
          {onNavigateManifesto && (
            <div className="text-center mt-5">
              <button
                onClick={onNavigateManifesto}
                className="text-xs text-[#8fa2bd] hover:text-[#e0d0ab] transition-colors cursor-pointer"
              >
                Read The Tark Manifesto
              </button>
            </div>
          )}

          {/* Legal Links */}
          <div className="text-center mt-5 pt-4 border-t border-[rgba(19,108,153,0.3)]">
            <div className="flex items-center justify-center gap-4 text-xs font-sans text-[#8fa2bd]">
              <button onClick={() => onNavigateLegal?.('terms')} className="hover:text-[#e0d0ab] transition-colors cursor-pointer">Terms</button>
              <span>&bull;</span>
              <button onClick={() => onNavigateLegal?.('privacy')} className="hover:text-[#e0d0ab] transition-colors cursor-pointer">Privacy</button>
              <span>&bull;</span>
              <button onClick={() => onNavigateLegal?.('refund')} className="hover:text-[#e0d0ab] transition-colors cursor-pointer">Refunds</button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}