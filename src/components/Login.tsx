import { fetchWithAuth } from '../lib/api';
import { useState } from 'react';
import { Mail, ArrowRight, Loader2, AlertCircle, Lock, Check, RefreshCw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

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
      setErrorMsg('Please enter your email address.');
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
      setErrorMsg(err.message || 'Failed to send reset link. Try again.');
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
          throw new Error(data.error || 'Failed to register account profile.');
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanedEmail,
        password: password,
      });

      if (authError) {
        throw new Error(authError.message || 'Invalid email or password credential.');
      }

      if (!authData.session || !authData.user) {
        throw new Error('Failed to start safe credentialed session state.');
      }

      setStatus('success');

      const matchedName = authData.user.user_metadata?.name || cleanedEmail.split('@')[0];
      const matchedEmail = authData.user.email || cleanedEmail;

      localStorage.setItem('tark_session_email', matchedEmail);
      localStorage.setItem('tark_session_name', matchedName);

      setTimeout(() => {
        onAuthenticated(matchedEmail, matchedName, authData.user.id);
      }, 500);

    } catch (err: any) {
      console.warn("Authentication Phase Exception:", err);
      let displayError = err.message || '';
      if (displayError.includes('Database error saving new user')) {
        displayError = 'Saved user state bypassed successfully. Please sign in directly.';
      } else if (displayError.includes('signup_disabled')) {
        displayError = 'Registration is currently disabled on this project. Try standard sign-in.';
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
      setErrorMsg(err.message || 'Failed to initiate Google sign in.');
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-stone-50 font-sans relative overflow-hidden">
      {/* Left Panel - Value Proposition (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-[#e0d0ab] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#072e63_1px,transparent_1px),linear-gradient(to_bottom,#072e63_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-5 pointer-events-none" />
        <div className="max-w-md z-10 flex flex-col min-h-[60vh] justify-between">
          <div>
            <div className="w-12 h-12 rounded-sm bg-zinc-950/10 flex items-center justify-center mb-8">
              <Sparkles className="w-6 h-6 text-zinc-950" />
            </div>

            <h2 className="font-serif text-3xl md:text-4xl font-bold text-zinc-950 leading-tight mb-4">
              Absolute focus. Rigorous assessment.
            </h2>
            <p className="font-sans text-zinc-800 text-sm leading-relaxed mb-10">
              Tark is a pristine environment designed to test your retention and eliminate noise.
            </p>

            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                className="flex items-start gap-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-950/50 mt-2 shrink-0" />
                <p className="font-sans text-zinc-900 text-sm leading-relaxed">
                  <strong>The Tracker:</strong> Read high-signal policy dispatches.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
                className="flex items-start gap-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-950/50 mt-2 shrink-0" />
                <p className="font-sans text-zinc-900 text-sm leading-relaxed">
                  <strong>The Arena:</strong> Deploy timed, 25-question mock assessments.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
                className="flex items-start gap-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-950/50 mt-2 shrink-0" />
                <p className="font-sans text-zinc-900 text-sm leading-relaxed">
                  <strong>The Autopsy:</strong> Expose your conceptual blind spots with AI.
                </p>
              </motion.div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-zinc-950/15">
            <p className="font-sans text-sm text-zinc-700">
              15 free AI insights included upon registration.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

        <div className="w-full max-w-sm z-10">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <motion.h1
              layoutId="brand-header-h1"
              className="font-serif text-3xl sm:text-4xl font-bold tracking-widest text-[#e0d0ab] drop-shadow-[0_0_15px_rgba(224,208,171,0.25)] text-center whitespace-nowrap mb-1 select-none"
              transition={{
                type: "spring",
                stiffness: 140,
                damping: 18,
                mass: 0.8
              }}
            >
              Tark 1.0 | तर्क 1.0
            </motion.h1>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={forgotPasswordMode ? "forgot-form" : isSignUp ? "signup-form" : "signin-form"}
              onSubmit={forgotPasswordMode ? handleForgotPassword : handleAuthentication}
              className="space-y-4 bg-zinc-900/10 border border-zinc-900/60 p-6 rounded-sm shadow-xl"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {forgotPasswordMode ? (
                <>
                  {forgotSent ? (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-[11px] font-sans rounded-sm leading-relaxed text-center">
                      <p className="font-bold mb-1">Recovery link dispatched.</p>
                      <p className="opacity-80">Check your inbox.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Registered Email</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-zinc-600" />
                          </div>
                          <input
                            type="email"
                            required
                            className="block w-full pl-10 pr-3 py-2.5 border border-zinc-900 rounded-sm bg-zinc-950/80 text-stone-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-[#e0d0ab]/50 focus:border-[#e0d0ab]/50 text-xs font-sans transition-all"
                            placeholder="candidate@domain.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            disabled={status === 'loading'}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full flex items-center justify-center py-2.5 px-4 border border-zinc-800 rounded-sm text-xs font-semibold uppercase tracking-wider text-zinc-950 bg-stone-100 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-550 focus:ring-offset-zinc-950 disabled:opacity-50 transition-colors group cursor-pointer"
                      >
                        {status === 'loading' ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            SENDING...
                          </span>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Send Reset Link
                          </>
                        )}
                      </button>
                    </>
                  )}

                  <div className="text-center pt-2 border-t border-zinc-900/50">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotPasswordMode(false);
                        setErrorMsg('');
                        setForgotSent(false);
                        setStatus('idle');
                      }}
                      className="text-[10px] text-zinc-400 hover:text-stone-200 transition-colors font-mono uppercase tracking-widest"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Email Input */}
                  <div>
                    <label htmlFor="email-input" className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-zinc-600" />
                      </div>
                      <input
                        id="email-input"
                        name="email"
                        type="email"
                        required
                        className="block w-full pl-10 pr-10 py-2.5 border border-zinc-900 rounded-sm bg-zinc-950/80 text-stone-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-[#e0d0ab]/50 focus:border-[#e0d0ab]/50 text-xs font-sans transition-all"
                        placeholder="candidate@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={status === 'loading'}
                      />
                      {isEmailValid && email.length > 0 && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Check className="h-4 w-4 text-emerald-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label htmlFor="password-input" className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-zinc-600" />
                      </div>
                      <input
                        id="password-input"
                        name="password"
                        type="password"
                        required
                        minLength={6}
                        className="block w-full pl-10 pr-3 py-2.5 border border-zinc-900 rounded-sm bg-zinc-950/80 text-stone-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-[#e0d0ab]/50 focus:border-[#e0d0ab]/50 text-xs font-sans transition-all"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={status === 'loading'}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider">Minimum 6 characters</p>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordMode(true);
                          setForgotEmail(email);
                          setErrorMsg('');
                          setForgotSent(false);
                        }}
                        className="text-[8px] text-zinc-600 hover:text-[#e0d0ab] transition-colors font-mono uppercase tracking-wider"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-950/20 border border-rose-900/40 text-rose-400 text-[11px] font-sans rounded-sm leading-relaxed flex items-start gap-2 animate-shake">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full flex items-center justify-center py-2.5 px-4 border border-zinc-800 rounded-sm text-xs font-semibold uppercase tracking-wider text-zinc-950 bg-stone-100 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-550 focus:ring-offset-zinc-950 disabled:opacity-50 transition-colors group cursor-pointer"
                  >
                    {status === 'loading' ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        AUTHENTICATING...
                      </span>
                    ) : isSignUp ? (
                      <>
                        Register & Enroll
                        <ArrowRight className="ml-2 h-3.5 w-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-3.5 w-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </>
                    )}
                  </button>

                  {/* Google Sign In */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-zinc-800/60"></div>
                    </div>
                    <div className="relative flex justify-center text-[9px] font-mono uppercase tracking-widest">
                      <span className="bg-[#1f1f23] px-2 text-zinc-500">Or continue with</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={status === 'loading'}
                    className="w-full flex items-center justify-center py-2.5 px-4 border border-zinc-800 rounded-sm text-xs font-semibold uppercase tracking-wider text-stone-100 bg-zinc-950/50 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-550 focus:ring-offset-zinc-950 disabled:opacity-50 transition-colors group cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                  </button>

                  {/* Mode Toggle */}
                  <div className="text-center pt-2 border-t border-zinc-900/50">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setErrorMsg('');
                      }}
                      className="text-[10px] text-zinc-400 hover:text-stone-200 transition-colors font-mono uppercase tracking-widest"
                      disabled={status === 'loading'}
                    >
                      {isSignUp ? "Already have an account? Sign In" : "New here? Enroll an account"}
                    </button>
                  </div>
                </>
              )}
            </motion.form>
          </AnimatePresence>

          {/* Navigate to Manifesto */}
          {onNavigateManifesto && (
            <div className="text-center mt-6">
              <button
                onClick={onNavigateManifesto}
                className="text-[10px] text-zinc-600 hover:text-[#e0d0ab] transition-colors font-mono uppercase tracking-widest"
              >
                Read the Manifesto
              </button>
            </div>
          )}

          {/* Legal Links */}
          <div className="text-center mt-6 pt-6 border-t border-zinc-900/50">
            <div className="flex items-center justify-center gap-4 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
              <button onClick={() => onNavigateLegal?.('terms')} className="hover:text-zinc-400 transition-colors">Terms</button>
              <span>&bull;</span>
              <button onClick={() => onNavigateLegal?.('privacy')} className="hover:text-zinc-400 transition-colors">Privacy</button>
              <span>&bull;</span>
              <button onClick={() => onNavigateLegal?.('refund')} className="hover:text-zinc-400 transition-colors">Refunds</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}