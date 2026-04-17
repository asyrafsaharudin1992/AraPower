import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { supabase, isPlaceholder } from './supabase';
import { Staff, ClinicProfile } from './types';
import { 
  Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, X, RefreshCw, ShieldAlert, Activity, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

const TERMS_OF_SERVICE = `
# User Agreement & Privacy Policy

Welcome to AraPower. By using our services, you agree to the following terms and conditions:

## 1. Acceptance of Terms
By accessing or using AraPower, you agree to be bound by these Terms of Service and all applicable laws and regulations.

## 2. Privacy Policy
Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information. We comply with standard healthcare data protection regulations.

## 3. User Responsibilities
You are responsible for maintaining the confidentiality of your account and password. You agree to provide accurate and complete information during the registration process.

## 4. Medical Disclaimer
AraPower is a management tool and does not provide medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.

## 5. Limitation of Liability
AraPower shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.

## 6. Changes to Terms
We reserve the right to modify these terms at any time. Your continued use of the service after such changes constitutes your acceptance of the new terms.
`;

const welcomeQuotes = [
  '"The secret of getting ahead is getting started." – Mark Twain',
  '"The future depends on what you do today." – Mahatma Gandhi',
  '"Opportunities don\'t happen. You create them." – Chris Grosser',
  '"Great things are done by a series of small things brought together." – Vincent Van Gogh',
  '"Small daily improvements over time lead to stunning results." – Robin Sharma',
  '"Don\'t watch the clock; do what it does. Keep going." – Sam Levenson',
  '"Start where you are. Use what you have. Do what you can." – Arthur Ashe'
];

interface AuthUIProps {
  onAuthSuccess: (user: Staff) => void;
  clinicProfile: ClinicProfile;
  apiBaseUrl: string;
  branches: any[];
  isSupabaseConfigured: boolean;
  Logo: React.FC<{ className?: string; logoUrl?: string }>;
}

export default function AuthUI({ onAuthSuccess, clinicProfile, apiBaseUrl, branches, isSupabaseConfigured, Logo }: AuthUIProps) {
  useEffect(() => {
    document.title = `Sign Up or Login - ${clinicProfile.name}`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', `Join ${clinicProfile.name} to access healthcare services, track referrals, and manage your wellness journey.`);
  }, [clinicProfile.name]);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [welcomeQuote] = useState(welcomeQuotes[Math.floor(Math.random() * welcomeQuotes.length)]);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authBranch, setAuthBranch] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'welcome' | 'auth'>('welcome');
  
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  
  const [authError, setAuthError] = useState('');
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingForgotPassword, setIsSendingForgotPassword] = useState(false);
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordNewPassword, setResetPasswordNewPassword] = useState('');
  const [confirmResetPasswordNewPassword, setConfirmResetPasswordNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [resetPasswordStatus, setResetPasswordStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;
    if (path === '/update-password' || hash.includes('type=recovery')) {
      setShowResetPasswordModal(true);
      setTimeout(() => {
        window.history.replaceState({}, document.title, '/');
      }, 2000);
    }
  }, []);
  
  const handleGetStarted = () => {
    setOnboardingStep('auth');
  };

  const safeFetch = async (url: string, options?: RequestInit, retries = 3, backoff = 1000): Promise<{ res: Response, data: any }> => {
    try {
      const res = await fetch(url, options);
      if ((res.status === 429 || res.status >= 500) && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return safeFetch(url, options, retries - 1, backoff * 2);
      }
      const data = await res.json().catch(() => ({}));
      return { res, data };
    } catch(e: any) {
      return { res: { ok: false, status: 0 } as Response, data: { error: e.message } };
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setResendStatus(null);
    setShowResendButton(false);
    setIsSubmitting(true);
    
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Authentication service is not configured. Please check your settings.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (error) {
        if (error.message === 'Email not confirmed') {
          throw new Error('Please confirm your email address before logging in, or re-register to auto-confirm.');
        }
        if (error.message === 'Failed to fetch' || error.message?.includes('aborted')) {
          throw new Error('Connection failed. Ensure settings are correct.');
        }
        throw error;
      }

      if (data.user?.email) {
        const { res, data: profileData } = await safeFetch(`${apiBaseUrl}/api/staff/email?email=${data.user.email}`);
        if (!res.ok) throw new Error(profileData?.error || 'Failed to load user profile.');
        onAuthSuccess(profileData); 
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message === 'Invalid login credentials') {
        setAuthError('Invalid login credentials');
      } else {
        setAuthError(error.message || 'Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setAuthError('You must agree to the User Agreement & Privacy Policy to continue.');
      return;
    }
    setAuthError('');
    setIsSubmitting(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Authentication service is not configured. Please check your settings.');
      }
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: authName, 
          email: authEmail, 
          branch: authBranch, 
          phone: authPhone,
          password: authPassword
        })
      });

      if (!res.ok) {
        throw new Error(data?.error || 'Registration failed');
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (signInError) {
        setAuthError('Registration successful! Please log in.');
        setAuthMode('login');
      } else {
        onAuthSuccess(data);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setAuthError(error.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) return;
    
    setIsSendingForgotPassword(true);
    setForgotPasswordStatus(null);
    
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
          redirectTo: `${window.location.origin}/update-password`,
        });
        
        if (error) throw error;
        
        setForgotPasswordStatus({ 
          type: 'success', 
          message: 'Password reset link sent! Please check your inbox (and spam folder).' 
        });
      } else {
        setForgotPasswordStatus({ 
          type: 'error', 
          message: 'Authentication service is not configured.' 
        });
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setForgotPasswordStatus({ 
        type: 'error', 
        message: error.message || 'Failed to send reset link.' 
      });
    } finally {
      setIsSendingForgotPassword(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordNewPassword) return;
    
    if (resetPasswordNewPassword !== confirmResetPasswordNewPassword) {
      setResetPasswordStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    
    setIsUpdatingPassword(true);
    setResetPasswordStatus(null);
    
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({
          password: resetPasswordNewPassword
        });
        
        if (error) throw error;
        
        setResetPasswordStatus({ type: 'success', message: 'Password updated successfully. Redirecting to login...' });
        setTimeout(async () => {
          setShowResetPasswordModal(false);
          setResetPasswordNewPassword('');
          setResetPasswordStatus(null);
          await supabase.auth.signOut();
          setAuthMode('login');
          window.history.pushState({}, '', '/');
        }, 3000);
      } else {
        setResetPasswordStatus({ type: 'success', message: 'Password updated successfully. Redirecting to login...' });
        setTimeout(async () => {
          setShowResetPasswordModal(false);
          setResetPasswordNewPassword('');
          setResetPasswordStatus(null);
          await supabase.auth.signOut();
          setAuthMode('login');
          window.history.pushState({}, '', '/');
        }, 3000);
      }
    } catch (error: any) {
      setResetPasswordStatus({ type: 'error', message: error.message || 'Failed to update password.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (onboardingStep === 'welcome') {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-eggshell flex items-center justify-center p-0 sm:p-4 font-sans">
        <div className={`w-full max-w-md h-screen sm:h-[90vh] bg-eggshell sm:rounded-[3rem] shadow-2xl overflow-y-auto flex flex-col relative`}>
          <div className="relative w-full h-[60%] shrink-0 overflow-hidden z-0 bg-muted-teal border-b-0 shadow-none">
            <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,20 Q25,10 50,20 T100,20" fill="none" stroke="#F4F1DE" strokeWidth="1" />
              <path d="M0,40 Q25,30 50,40 T100,40" fill="none" stroke="#F2CC8F" strokeWidth="1" />
              <path d="M0,60 Q25,50 50,60 T100,60" fill="none" stroke="#F4F1DE" strokeWidth="1" />
              <path d="M0,80 Q25,70 50,80 T100,80" fill="none" stroke="#F2CC8F" strokeWidth="1" />
              <path d="M0,100 Q25,90 50,100 T100,100" fill="none" stroke="#F4F1DE" strokeWidth="1" />
            </svg>
            <svg className="absolute bottom-0 w-full h-32 text-eggshell fill-current translate-y-[1px] scale-y-[1.01]" viewBox="0 0 1440 320" preserveAspectRatio="none">
              <path d="M0,160C480,320,960,0,1440,160L1440,320L0,320Z"></path>
            </svg>
          </div>

          <div className="flex-1 flex flex-col px-10 pb-12 relative z-10 border-t-0 shadow-none">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="mb-6">
                <Logo className="w-16 h-16" logoUrl={clinicProfile.logoUrl} />
              </div>
              <h1 className="text-5xl font-black text-twilight-indigo leading-tight tracking-tighter mb-4">
                Ara<span className="text-burnt-peach">Power</span>
              </h1>
              <p className="text-twilight-indigo/70 text-lg font-medium leading-relaxed mb-6">
                Empowering healthcare professionals to manage referrals, track performance, and grow their practice.
              </p>
              
              <div className="bg-white/50 p-6 rounded-[2rem] border border-black/5 mb-8">
               <p className="text-sm font-medium text-twilight-indigo/80 italic leading-relaxed">
                  {welcomeQuote}
                </p>
              </div>

              <button 
                onClick={handleGetStarted}
                className="w-full py-5 bg-twilight-indigo text-eggshell rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-twilight-indigo/90 focus:ring-4 focus:ring-twilight-indigo/20 transition-all flex items-center justify-center gap-3 shadow-xl shadow-twilight-indigo/20"
              >
                <span>Get Started</span>
                <ArrowRight size={20} />
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-eggshell flex items-center justify-center p-0 sm:p-4 font-sans">
      <div className={`w-full max-w-md min-h-screen sm:min-h-[85vh] bg-eggshell sm:rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col`}>
        <div className="relative w-full h-80 shrink-0 overflow-hidden z-0 bg-muted-teal">
            <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,20 Q25,10 50,20 T100,20" fill="none" stroke="#F4F1DE" strokeWidth="1" />
              <path d="M0,40 Q25,30 50,40 T100,40" fill="none" stroke="#F2CC8F" strokeWidth="1" />
              <path d="M0,60 Q25,50 50,60 T100,60" fill="none" stroke="#F4F1DE" strokeWidth="1" />
              <path d="M0,80 Q25,70 50,80 T100,80" fill="none" stroke="#F2CC8F" strokeWidth="1" />
              <path d="M0,100 Q25,90 50,100 T100,100" fill="none" stroke="#F4F1DE" strokeWidth="1" />
            </svg>
            <svg className="absolute bottom-0 w-full h-40 text-eggshell/40 fill-current translate-y-4" viewBox="0 0 1440 320" preserveAspectRatio="none">
              <path d="M0,160C320,300,640,0,1440,160L1440,320L0,320Z"></path>
            </svg>
            <svg className="absolute bottom-0 w-full h-32 text-eggshell fill-current translate-y-[1px] scale-y-[1.01]" viewBox="0 0 1440 320" preserveAspectRatio="none">
              <path d="M0,224C480,350,960,100,1440,224L1440,320L0,320Z"></path>
            </svg>
        </div>

        <div className="-mt-32 px-8 pb-8 relative z-10 flex-col flex-1 pb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="mb-4">
              <Logo className="w-12 h-12" logoUrl={clinicProfile.logoUrl} />
            </div>
            <h1 className="text-4xl font-black text-twilight-indigo mb-1">
              {authMode === 'login' ? 'Sign in' : 'Sign up'}
            </h1>
            <div className="w-10 h-1 bg-burnt-peach rounded-full mb-4" />
          </motion.div>

          <AnimatePresence mode="wait">
            {authError && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-red-50/80 backdrop-blur border border-red-200/50 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div className="flex-1 text-sm font-medium text-red-600/90 leading-snug">
                  {authError}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {authMode === 'login' ? (
              <motion.form 
                key="login-form"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLoginSubmit} className="space-y-5"
              >
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail size={18} className="text-twilight-indigo/40 group-focus-within:text-twilight-indigo transition-colors" />
                    </div>
                    <input 
                      type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full pl-11 pr-4 py-4 bg-white/80 backdrop-blur border border-black/5 rounded-2xl text-sm font-medium text-twilight-indigo focus:ring-2 focus:ring-burnt-peach focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock size={18} className="text-twilight-indigo/40 group-focus-within:text-twilight-indigo transition-colors" />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"} required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-11 pr-12 py-4 bg-white/80 backdrop-blur border border-black/5 rounded-2xl text-sm font-medium text-twilight-indigo focus:ring-2 focus:ring-burnt-peach focus:border-transparent transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-twilight-indigo/40 hover:text-twilight-indigo focus:outline-none">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${rememberMe ? 'bg-burnt-peach border-burnt-peach' : 'bg-white border-black/10 group-hover:border-black/20'}`}>
                      {rememberMe && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <span className="text-xs font-bold text-twilight-indigo/70">Remember me</span>
                  </label>
                  <button type="button" onClick={() => setShowForgotPasswordModal(true)} className="text-xs font-bold text-burnt-peach hover:text-burnt-peach/80 transition-colors">
                    Forgot Password?
                  </button>
                </div>

                <button 
                  type="submit" disabled={isSubmitting || !authEmail || !authPassword}
                  className="w-full py-4 mt-6 bg-twilight-indigo text-eggshell rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-twilight-indigo/90 focus:ring-4 focus:ring-twilight-indigo/20 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-twilight-indigo/20"
                >
                  {isSubmitting ? <RefreshCw size={20} className="animate-spin" /> : 'Log In'}
                </button>
              </motion.form>
            ) : (
              <motion.form 
                key="register-form"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={handleRegisterSubmit} className="space-y-4"
              >
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User size={18} className="text-twilight-indigo/40 group-focus-within:text-twilight-indigo transition-colors" />
                  </div>
                  <input type="text" required minLength={3} value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Full Name" className="w-full pl-11 pr-4 py-4 bg-white/80 backdrop-blur border border-black/5 rounded-2xl text-sm font-medium text-twilight-indigo focus:ring-2 focus:ring-burnt-peach focus:border-transparent transition-all" />
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail size={18} className="text-twilight-indigo/40 group-focus-within:text-twilight-indigo transition-colors" />
                  </div>
                  <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email address" className="w-full pl-11 pr-4 py-4 bg-white/80 backdrop-blur border border-black/5 rounded-2xl text-sm font-medium text-twilight-indigo focus:ring-2 focus:ring-burnt-peach focus:border-transparent transition-all" />
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone size={18} className="text-twilight-indigo/40 group-focus-within:text-twilight-indigo transition-colors" />
                  </div>
                  <input type="tel" required value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} placeholder="Phone Number" className="w-full pl-11 pr-4 py-4 bg-white/80 backdrop-blur border border-black/5 rounded-2xl text-sm font-medium text-twilight-indigo focus:ring-2 focus:ring-burnt-peach focus:border-transparent transition-all" />
                </div>
                {branches && branches.length > 0 && (
                  <div className="relative group">
                    <select required value={authBranch} onChange={(e) => setAuthBranch(e.target.value)} className="w-full px-4 py-4 bg-white/80 backdrop-blur border border-black/5 rounded-2xl text-sm font-medium text-twilight-indigo focus:ring-2 focus:ring-burnt-peach focus:border-transparent transition-all appearance-none cursor-pointer">
                      <option value="">Select Branch</option>
                      {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className="text-twilight-indigo/40 group-focus-within:text-twilight-indigo transition-colors" />
                  </div>
                  <input type={showPassword ? "text" : "password"} required minLength={6} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password (Min. 6 chars)" className="w-full pl-11 pr-12 py-4 bg-white/80 backdrop-blur border border-black/5 rounded-2xl text-sm font-medium text-twilight-indigo focus:ring-2 focus:ring-burnt-peach focus:border-transparent transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-twilight-indigo/40 hover:text-twilight-indigo focus:outline-none">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-3 p-4 bg-white/50 backdrop-blur rounded-2xl border border-black/5 cursor-pointer group">
                    <div className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${agreedToTerms ? 'bg-burnt-peach border-burnt-peach' : 'bg-white border-black/10 group-hover:border-black/20'}`}>
                      {agreedToTerms && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <span className="text-xs font-medium text-twilight-indigo/70 leading-relaxed">
                      I agree to the <button type="button" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="text-burnt-peach font-bold hover:underline">User Agreement & Privacy Policy</button>
                    </span>
                  </label>
                </div>

                <button type="submit" disabled={isSubmitting || !agreedToTerms || !authEmail || !authPassword || !authName} className="w-full py-4 mt-6 bg-twilight-indigo text-eggshell rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-twilight-indigo/90 focus:ring-4 focus:ring-twilight-indigo/20 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-twilight-indigo/20">
                  {isSubmitting ? <RefreshCw size={20} className="animate-spin" /> : 'Create Account'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Toggle Banner */}
        <div className="absolute bottom-0 left-0 w-full bg-white/80 backdrop-blur border-t border-black/5 py-4 px-8 z-20">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-bold text-twilight-indigo/60 uppercase tracking-widest">
              {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button 
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
              }}
              className="text-sm font-black text-twilight-indigo hover:text-burnt-peach transition-colors"
            >
              {authMode === 'login' ? 'Create an Account' : 'Sign in instead'}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForgotPasswordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div onClick={() => setShowForgotPasswordModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative w-full max-w-md bg-eggshell rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-twilight-indigo">Reset Password</h3>
                <button onClick={() => setShowForgotPasswordModal(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-zinc-100"><X size={20}/></button>
              </div>
              {forgotPasswordStatus && (
                <div className={`p-4 rounded-2xl mb-6 text-sm font-bold ${forgotPasswordStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {forgotPasswordStatus.message}
                </div>
              )}
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <input type="email" required value={forgotPasswordEmail} onChange={e => setForgotPasswordEmail(e.target.value)} placeholder="Email Address" className="w-full px-5 py-4 rounded-2xl border border-black/5 bg-white text-sm focus:ring-2" />
                <button type="submit" disabled={isSendingForgotPassword || !forgotPasswordEmail} className="w-full py-4 bg-burnt-peach text-white rounded-2xl font-black text-sm shadow-xl flex justify-center items-center">
                  {isSendingForgotPassword ? <RefreshCw size={20} className="animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetPasswordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div onClick={() => setShowResetPasswordModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div key="reset-password-modal" initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-eggshell rounded-[2.5rem] shadow-2xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Create New Password</h3>
                <button onClick={() => setShowResetPasswordModal(false)} className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors">
                  <X size={20} className="text-zinc-500" />
                </button>
              </div>
              <p className="text-sm text-zinc-500">Enter your new password below.</p>
              
              {resetPasswordStatus && (
                <div className={`p-4 rounded-2xl text-sm font-bold ${resetPasswordStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {resetPasswordStatus.message}
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-zinc-700">New Password</label>
                    <input type="password" required minLength={6} value={resetPasswordNewPassword} onChange={(e) => setResetPasswordNewPassword(e.target.value)} placeholder="Min. 6 characters" className="w-full px-5 py-4 bg-white border border-black/5 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-burnt-peach focus:border-transparent transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-zinc-700">Confirm New Password</label>
                    <input type="password" required minLength={6} value={confirmResetPasswordNewPassword} onChange={(e) => setConfirmResetPasswordNewPassword(e.target.value)} placeholder="Repeat new password" className="w-full px-5 py-4 bg-white border border-black/5 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-burnt-peach focus:border-transparent transition-all" />
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <button type="button" onClick={() => { setShowResetPasswordModal(false); setResetPasswordNewPassword(''); setConfirmResetPasswordNewPassword(''); setResetPasswordStatus(null); if (typeof window !== 'undefined' && window.location.pathname === '/update-password') { window.history.pushState({}, '', '/'); } }} className="flex-1 px-6 py-4 bg-zinc-100 text-zinc-900 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors">Cancel</button>
                  <button type="submit" disabled={isUpdatingPassword || !resetPasswordNewPassword || resetPasswordNewPassword.length < 6 || resetPasswordNewPassword !== confirmResetPasswordNewPassword} className="flex-1 px-6 py-4 bg-burnt-peach text-white rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center shadow-lg disabled:opacity-50">
                    {isUpdatingPassword ? <RefreshCw size={18} className="animate-spin" /> : 'Update'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTermsModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div onClick={() => setShowTermsModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative w-full max-w-2xl max-h-[80vh] bg-eggshell rounded-[2.5rem] p-8 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="text-2xl font-black text-twilight-indigo">Terms & Privacy</h3>
                <button onClick={() => setShowTermsModal(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-zinc-100"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto pr-4 -mr-4 prose prose-zinc prose-headings:text-twilight-indigo prose-p:text-twilight-indigo/70">
                <Markdown>{TERMS_OF_SERVICE}</Markdown>
              </div>
              <div className="pt-6 shrink-0 border-t border-black/5 mt-4">
                <button onClick={() => { setAgreedToTerms(true); setShowTermsModal(false); }} className="w-full py-4 bg-twilight-indigo text-eggshell rounded-2xl font-black text-sm shadow-xl">I Agree & Continue</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
