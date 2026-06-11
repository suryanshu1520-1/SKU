import { useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Loader2, Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface PasswordResetProps {
  onClose: () => void;
}

export default function PasswordReset({ onClose }: PasswordResetProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      setStatus('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setStatus('success');

      // Clear hash fragment from URL to prevent recovery loop
      window.history.replaceState(null, '', window.location.pathname);

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password. Try again.');
      setStatus('error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800 p-8 md:p-10 rounded-sm max-w-md w-full shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-zinc-800/60 border border-zinc-700/40 rounded-sm mb-6">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>

          <h2 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-2">
            Reset Your Password
          </h2>
          <p className="text-[11px] text-zinc-500 mb-6 font-sans leading-relaxed">
            Choose a new password for your account.
          </p>

          {status === 'success' ? (
            <div className="w-full p-4 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-[11px] font-sans rounded-sm leading-relaxed flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>Password updated successfully. Redirecting...</span>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="w-full space-y-4">
              {/* New Password */}
              <div className="text-left">
                <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-zinc-600" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 border border-zinc-800 rounded-sm bg-zinc-900/50 text-stone-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-xs font-sans transition-all"
                    placeholder="Minimum 6 characters"
                    disabled={status === 'loading'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="text-left">
                <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-zinc-600" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-zinc-800 rounded-sm bg-zinc-900/50 text-stone-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-xs font-sans transition-all"
                    placeholder="Re-enter new password"
                    disabled={status === 'loading'}
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-950/20 border border-rose-900/40 text-rose-400 text-[11px] font-sans rounded-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50 cursor-pointer"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    UPDATING...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Update Password
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 uppercase tracking-wider font-mono transition-colors"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}