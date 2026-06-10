import { useState } from 'react';
import { Mail, User, ArrowRight, ShieldCheck, Loader2, KeyRound, AlertCircle, Sparkles, Lock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onAuthenticated: (email: string, name: string, uuid?: string) => void;
}

export default function Login({ onAuthenticated }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

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
        redirectTo: window.location.origin,
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
    if (!email || !password || (isSignUp && !name)) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const cleanedEmail = email.toLowerCase().trim();

      if (isSignUp) {
        // Step 1: Create the confirmed account through our admin backend proxy
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: cleanedEmail,
            password: password,
            name: name.trim(),
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

      // Step 2: Perform client-side standard sign-in to populate session cookies/localStorage automatically
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

      // Successful Authenticated State
      setStatus('success');
      
      const matchedName = authData.user.user_metadata?.name || name.trim() || cleanedEmail.split('@')[0];
      const matchedEmail = authData.user.email || cleanedEmail;
      
      localStorage.setItem('tark_session_email', matchedEmail);
      localStorage.setItem('tark_session_name', matchedName);
      
      setTimeout(() => {
        onAuthenticated(matchedEmail, matchedName, authData.user.id);
      }, 500);

    } catch (err: any) {
      console.warn("Authentication Phase Exception:", err);
      // Give cleaner user feedback
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-stone-50 font-sans relative overflow-hidden">
      
      {/* Decorative background grid subtle overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 1 }}
        className="w-full max-w-sm z-10"
      >
        {/* Banner Brand */}
        <div id="brand-header" className="text-center mb-8 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-sm text-[8px] uppercase font-mono text-zinc-400 tracking-widest mb-3.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              TARK Evaluation Engine v1.0
            </div>
          </div>

          <motion.h1 
            id="brand-header-h1"
            layoutId="brand-header-h1"
            className="font-stencil text-4xl sm:text-5xl font-bold tracking-widest text-[#e0d0ab] drop-shadow-[0_0_15px_rgba(224,208,171,0.25)] text-center whitespace-nowrap mb-1 select-none"
            transition={{
              type: "spring",
              stiffness: 140,
              damping: 18,
              mass: 0.8
            }}
          >
            Tark 1.0 | तर्क 1.0
          </motion.h1>

          <div className="flex flex-col items-center mt-1">
            <p className="text-zinc-500 font-mono text-[9px] uppercase tracking-widest leading-none">Security Identity Hub</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.form 
            key={isSignUp ? "signup-form" : "signin-form"}
            onSubmit={handleAuthentication} 
            className="space-y-4 bg-zinc-900/10 border border-zinc-900/60 p-6 rounded-sm shadow-xl"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <h2 className="text-xs uppercase tracking-widest text-[#e0d0ab] font-bold font-mono mb-2">
              {isSignUp ? "CANDIDATE PROFILE ENROLLMENT" : "CANDIDATE SIGN IN SECURE CHECKOUT"}
            </h2>

            {/* Optional Name (Sign Up only) */}
            {isSignUp && (
              <div>
                <label htmlFor="name-input" className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Candidate Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-zinc-650" />
                  </div>
                  <input
                    id="name-input"
                    name="name"
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-2.5 border border-zinc-900 rounded-sm bg-zinc-950/80 text-stone-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-[#e0d0ab]/50 focus:border-[#e0d0ab]/50 text-xs font-sans transition-all"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={status === 'loading'}
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email-input" className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Registered Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-650" />
                </div>
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-zinc-900 rounded-sm bg-zinc-950/80 text-stone-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-[#e0d0ab]/50 focus:border-[#e0d0ab]/50 text-xs font-sans transition-all"
                  placeholder="candidate@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'loading'}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password-input" className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Secret Access Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-650" />
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
              <p className="text-[8px] font-mono text-zinc-600 mt-1 uppercase tracking-wider">Minimum 6 safety characters required</p>
            </div>

            {/* Forgot Password Link */}
            {!forgotPasswordMode && (
              <div className="text-right -mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setForgotPasswordMode(true);
                    setForgotEmail(email);
                    setErrorMsg('');
                    setForgotSent(false);
                  }}
                  className="text-[9px] text-zinc-600 hover:text-[#e0d0ab] transition-colors font-mono uppercase tracking-wider"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 text-rose-400 text-[11px] font-sans rounded-sm leading-relaxed flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            {/* Forgot Password Mode UI */}
            {forgotPasswordMode ? (
              <>
                {forgotSent ? (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-[11px] font-sans rounded-sm leading-relaxed text-center">
                    <p className="font-bold mb-1">Reset link sent!</p>
                    <p className="opacity-80">Check your email inbox for the password recovery link.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Registered Email</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-zinc-650" />
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
                      onClick={handleForgotPassword}
                      className="w-full flex items-center justify-center py-2.5 px-4 border border-zinc-800 rounded-sm text-xs font-semibold uppercase tracking-wider text-zinc-950 bg-stone-100 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-550 focus:ring-offset-zinc-950 disabled:opacity-50 transition-colors group cursor-pointer"
                    >
                      {status === 'loading' ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          SENDING RESET LINK...
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
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full flex items-center justify-center py-2.5 px-4 border border-zinc-800 rounded-sm text-xs font-semibold uppercase tracking-wider text-zinc-950 bg-stone-100 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-550 focus:ring-offset-zinc-950 disabled:opacity-50 transition-colors group cursor-pointer"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      AUTHENTICATING IDENTITY...
                    </span>
                  ) : isSignUp ? (
                    <>
                      Register & Enroll Account
                      <ArrowRight className="ml-2 h-3.5 w-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </>
                  ) : (
                    <>
                      Enter Evaluation Terminal
                      <ShieldCheck className="ml-2 h-4 w-4 text-zinc-950 opacity-90" />
                    </>
                  )}
                </button>

                {/* Mode Toggle Selector */}
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
                    {isSignUp ? "Registered Identity? Sign In" : "New Candidate? Enroll Account"}
                  </button>
                </div>
              </>
            )}
          </motion.form>
      </AnimatePresence>
      </motion.div>
    </div>
  );
}
