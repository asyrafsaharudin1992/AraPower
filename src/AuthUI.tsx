// src/AuthUI.tsx
import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { supabase, isPlaceholder } from './supabase';
import { Staff, ClinicProfile } from './types';
import { 
  Mail, Lock, User, Phone, ArrowRight, ArrowLeft, Eye, EyeOff, X, RefreshCw, 
  HeartPulse, BarChart3, Users, ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { safeFetch } from './App';

const TERMS_OF_SERVICE = `
# User Agreement & Privacy Policy
Welcome to AraPower. By using our services, you agree to the following terms and conditions:
## 1. Acceptance of Terms
By accessing or using AraPower, you agree to be bound by these Terms of Service and all applicable laws and regulations.
## 2. Privacy Policy
Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information. We comply with standard healthcare data protection regulations.
`;

const onboardingSlides = [
  {
    icon: HeartPulse,
    title: "Premium Health Services",
    description: "Access top-tier health screenings, diagnostics, and wellness programs tailored for your community.",
    gradient: "from-violet-500 to-indigo-600"
  },
  {
    icon: BarChart3,
    title: "Track Your Impact",
    description: "Monitor your referrals in real-time, track wellness progress, and manage your health journey seamlessly.",
    gradient: "from-burnt-peach to-rose-500"
  },
  {
    icon: Users,
    title: "Grow Your Network",
    description: "Share the gift of health with your followers and unlock exclusive rewards and tier benefits.",
    gradient: "from-emerald-500 to-teal-600"
  }
];

interface AuthUIProps {
  onAuthSuccess: (user: Staff) => void;
  clinicProfile: ClinicProfile;
  apiBaseUrl: string;
  branches: any[];
  isSupabaseConfigured: boolean;
  Logo: any;
  safeFetch: typeof safeFetch;
  supabase: any;
}

export default function AuthUI({ 
  onAuthSuccess, clinicProfile, apiBaseUrl, branches, isSupabaseConfigured, Logo, safeFetch, supabase 
}: AuthUIProps) {
  
  useEffect(() => {
    document.title = `Sign Up or Login - ${clinicProfile.name}`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', `Join ${clinicProfile.name} to access healthcare services.`);
    else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = `Join ${clinicProfile.name} to access healthcare services.`;
      document.head.appendChild(meta);
    }
    return () => { document.title = 'AraPower'; };
  }, [clinicProfile.name]);

  // --- UNIFIED STATE MACHINE ---
  // 'onboarding' = Carousel (Sign Up flow only)
  // 'login' = Direct Login screen (Status quo)
  // 'register' = Sign Up form screen
  const [authMode, setAuthMode] = useState<'onboarding' | 'login' | 'register'>('onboarding');
  const [onboardingStep, setOnboardingStep] = useState(0);

  const isPasswordRecovery = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authBranch, setAuthBranch] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingForgotPassword, setIsSendingForgotPassword] = useState(false);
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [resetPasswordNewPassword, setResetPasswordNewPassword] = useState('');
  const [confirmResetPasswordNewPassword, setConfirmResetPasswordNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [resetPasswordStatus, setResetPasswordStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // --- HANDLERS ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(''); setIsSubmitting(true);
    try {
      if (!isSupabaseConfigured) throw new Error('Authentication service is not configured.');
      const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) throw error;
      if (data.user?.email) {
        const { res, data: profileData } = await safeFetch(`${apiBaseUrl}/api/staff/email?email=${data.user.email}`);
        if (!res.ok) throw new Error(profileData?.error || `Server error`);
        onAuthSuccess(profileData);
      }
    } catch (error: any) {
      setAuthError(error.message === 'Email not confirmed' ? 'Please confirm your email address.' : error.message || 'Login failed');
    } finally { setIsSubmitting(false); }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) { setAuthError('You must agree to the User Agreement.'); return; }
    setAuthError(''); setIsSubmitting(true);
    try {
      if (!isSupabaseConfigured) throw new Error('Authentication service is not configured.');
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authName, email: authEmail, branch: authBranch, phone: authPhone, password: authPassword })
      });
      if (!res.ok) throw new Error(data?.error || 'Registration failed');
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (signInError) { setAuthError('Registration successful! Please log in.'); setAuthMode('login'); } 
      else { onAuthSuccess(data); }
    } catch (error: any) { setAuthError(error.message || 'Registration failed'); } 
    finally { setIsSubmitting(false); }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!forgotPasswordEmail) return;
    setIsSendingForgotPassword(true); setForgotPasswordStatus(null);
    try {
      if (!isSupabaseConfigured) throw new Error('Not configured');
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, { redirectTo: `${window.location.origin}/update-password` });
      if (error) throw error;
      setForgotPasswordStatus({ type: 'success', message: 'Password reset link sent! Check your inbox.' });
    } catch (error: any) { setForgotPasswordStatus({ type: 'error', message: error.message }); } 
    finally { setIsSendingForgotPassword(false); }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault(); if (!resetPasswordNewPassword) return;
    if (resetPasswordNewPassword !== confirmResetPasswordNewPassword) { setResetPasswordStatus({ type: 'error', message: 'Passwords do not match.' }); return; }
    setIsUpdatingPassword(true); setResetPasswordStatus(null);
    try {
      if (isSupabaseConfigured) { const { error } = await supabase.auth.updateUser({ password: resetPasswordNewPassword }); if (error) throw error; }
      setResetPasswordStatus({ type: 'success', message: 'Password updated. Redirecting...' });
      setTimeout(async () => { isPasswordRecovery.current = false; setShowResetPasswordModal(false); setResetPasswordNewPassword(''); await supabase.auth.signOut(); window.history.pushState({}, '', '/'); }, 3000);
    } catch (error: any) { setResetPasswordStatus({ type: 'error', message: error.message }); } 
    finally { setIsUpdatingPassword(false); }
  };

  useEffect(() => {
    const hash = window.location.hash; const path = window.location.pathname;
    if (path === '/update-password' || hash.includes('type=recovery')) { 
      setShowResetPasswordModal(true); 
      setAuthMode('login'); // Force background to login screen for password reset
      setTimeout(() => window.history.replaceState({}, document.title, '/'), 2000); 
    }
  }, []);

  // --- ONBOARDING UI (SIGN UP FLOW ONLY) ---
  const renderOnboarding = () => (
    <div className="w-full max-w-md h-screen sm:h-[90vh] bg-eggshell sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative">
      <div className="flex-1 flex flex-col items-center justify-center p-10 relative">
        <button onClick={() => setAuthMode('login')} className="absolute top-6 right-6 text-sm font-bold text-twilight-indigo/50 hover:text-twilight-indigo transition-colors z-10">
          Skip
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={onboardingStep}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.5 }}
            className={`w-32 h-32 rounded-[2.5rem] bg-gradient-to-br ${onboardingSlides[onboardingStep].gradient} flex items-center justify-center text-white shadow-2xl mb-10`}
          >
            {React.createElement(onboardingSlides[onboardingStep].icon, { size: 60, strokeWidth: 1.5 })}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={onboardingStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-center space-y-4"
          >
            <h2 className="text-3xl font-black text-twilight-indigo tracking-tight">{onboardingSlides[onboardingStep].title}</h2>
            <p className="text-twilight-indigo/60 text-sm leading-relaxed max-w-xs mx-auto">{onboardingSlides[onboardingStep].description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 pb-12 space-y-6">
        <div className="flex justify-center gap-2">
          {onboardingSlides.map((_, idx) => (
            <motion.div
              key={idx}
              animate={{ width: idx === onboardingStep ? 32 : 8, backgroundColor: idx === onboardingStep ? '#E07A5F' : 'rgba(79, 70, 100, 0.2)' }}
              transition={{ duration: 0.3 }}
              className="h-2 rounded-full"
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (onboardingStep === onboardingSlides.length - 1) setAuthMode('register');
            else setOnboardingStep(prev => prev + 1);
          }}
          className="w-full py-5 bg-twilight-indigo text-eggshell rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-transform"
        >
          {onboardingStep === onboardingSlides.length - 1 ? 'Create Account' : 'Next'}
          <ChevronRight size={20} />
        </button>
        
        <p className="text-center text-sm font-medium text-twilight-indigo/50">
          Already have an account? <button onClick={() => setAuthMode('login')} className="text-twilight-indigo font-bold hover:underline">Sign In</button>
        </p>
      </div>
    </div>
  );

  // --- AUTH UI (LOGIN & REGISTER FORMS) ---
  const renderAuth = () => (
    <div className="w-full max-w-md h-screen sm:h-[90vh] bg-eggshell sm:rounded-[3rem] shadow-2xl overflow-y-auto flex flex-col relative custom-scrollbar">
      <div className="relative w-full h-[15%] min-h-[100px] shrink-0 overflow-hidden z-0 bg-muted-teal">
        <svg className="absolute bottom-0 w-full h-16 text-eggshell fill-current translate-y-[1px] scale-y-[1.01]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0,224C480,350,960,100,1440,224L1440,320L0,320Z"></path>
        </svg>
        <button onClick={() => setAuthMode('onboarding')} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-8 pb-10 relative z-10">
        <div className="flex-1 flex flex-col justify-center py-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }} className="mb-8">
            <div className="mb-4"><Logo className="w-14 h-14" logoUrl="https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/lOGO%20ARA%20dark%20blue%20(1).png?alt=media&token=e9c445db-4f1d-4858-9673-e3a9a94b0590" /></div>
            <h1 className="text-4xl font-black text-twilight-indigo mb-1">
              {authMode === 'login' ? 'Welcome back' : 'Create Account'}
            </h1>
            <div className="w-10 h-1 bg-apricot-cream rounded-full mb-2" />
            <p className="text-twilight-indigo/50 text-sm font-medium">
              {authMode === 'login' ? 'Sign in to continue to AraPower' : 'Join the AraPower healthcare network'}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {authError && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 p-4 bg-rose-500 text-white text-xs font-bold rounded-2xl flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="flex-1">{authError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {authMode === 'login' ? (
              <motion.form key="login-form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleLoginSubmit} className="flex-1 flex flex-col">
                <div className="space-y-5 mb-8">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-twilight-indigo/60 uppercase tracking-wider">Email Address</label>
                    <div className="flex items-center gap-3 bg-white border border-zinc-100 focus-within:border-burnt-peach focus-within:ring-2 focus-within:ring-burnt-peach/20 rounded-2xl px-4 py-3.5 transition-all">
                      <Mail size={18} className="text-twilight-indigo/40" />
                      <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-transparent focus:outline-none text-twilight-indigo placeholder-twilight-indigo/30 text-sm font-medium" placeholder="name@example.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-twilight-indigo/60 uppercase tracking-wider">Password</label>
                      <button type="button" onClick={() => setShowForgotPasswordModal(true)} className="text-burnt-peach text-[10px] font-bold hover:underline">Forgot Password?</button>
                    </div>
                    <div className="flex items-center gap-3 bg-white border border-zinc-100 focus-within:border-burnt-peach focus-within:ring-2 focus-within:ring-burnt-peach/20 rounded-2xl px-4 py-3.5 transition-all">
                      <Lock size={18} className="text-twilight-indigo/40" />
                      <input type={showPassword ? "text" : "password"} required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-transparent focus:outline-none text-twilight-indigo placeholder-twilight-indigo/30 text-sm font-medium" placeholder="Enter your password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-twilight-indigo/40 hover:text-twilight-indigo transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                </div>
                <div className="mt-auto space-y-4">
                  <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-burnt-peach text-white rounded-2xl font-black text-sm shadow-xl shadow-burnt-peach/30 hover:shadow-burnt-peach/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : 'Sign In'}
                  </button>
                  <p className="text-center text-sm font-medium text-twilight-indigo/50">Don't have an account? <button type="button" onClick={() => { setAuthMode('onboarding'); setAuthError(''); }} className="text-twilight-indigo font-bold hover:underline">Sign Up</button></p>
                </div>
              </motion.form>
            ) : (
              <motion.form key="register-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleRegisterSubmit} className="flex-1 flex flex-col">
                <div className="space-y-4 mb-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-twilight-indigo/60 uppercase tracking-wider">Full Name</label>
                    <div className="flex items-center gap-3 bg-white border border-zinc-100 focus-within:border-burnt-peach focus-within:ring-2 focus-within:ring-burnt-peach/20 rounded-2xl px-4 py-3.5 transition-all">
                      <User size={18} className="text-twilight-indigo/40" />
                      <input type="text" required value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full bg-transparent focus:outline-none text-twilight-indigo placeholder-twilight-indigo/30 text-sm font-medium" placeholder="Your full name" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-twilight-indigo/60 uppercase tracking-wider">Email Address</label>
                    <div className="flex items-center gap-3 bg-white border border-zinc-100 focus-within:border-burnt-peach focus-within:ring-2 focus-within:ring-burnt-peach/20 rounded-2xl px-4 py-3.5 transition-all">
                      <Mail size={18} className="text-twilight-indigo/40" />
                      <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-transparent focus:outline-none text-twilight-indigo placeholder-twilight-indigo/30 text-sm font-medium" placeholder="name@example.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-twilight-indigo/60 uppercase tracking-wider">Phone Number</label>
                    <div className="flex items-center gap-3 bg-white border border-zinc-100 focus-within:border-burnt-peach focus-within:ring-2 focus-within:ring-burnt-peach/20 rounded-2xl px-4 py-3.5 transition-all">
                      <Phone size={18} className="text-twilight-indigo/40" />
                      <input type="tel" required value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} className="w-full bg-transparent focus:outline-none text-twilight-indigo placeholder-twilight-indigo/30 text-sm font-medium" placeholder="60123456789" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-twilight-indigo/60 uppercase tracking-wider">Password</label>
                    <div className="flex items-center gap-3 bg-white border border-zinc-100 focus-within:border-burnt-peach focus-within:ring-2 focus-within:ring-burnt-peach/20 rounded-2xl px-4 py-3.5 transition-all">
                      <Lock size={18} className="text-twilight-indigo/40" />
                      <input type={showPassword ? "text" : "password"} required minLength={6} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-transparent focus:outline-none text-twilight-indigo placeholder-twilight-indigo/30 text-sm font-medium" placeholder="Min. 6 characters" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-twilight-indigo/40 hover:text-twilight-indigo transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                  <div className="pt-2">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${agreedToTerms ? 'bg-burnt-peach border-burnt-peach' : 'border-zinc-200 group-hover:border-burnt-peach'}`}>
                        <input type="checkbox" className="hidden" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} />
                        {agreedToTerms && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                      </div>
                      <span className="text-xs font-medium text-twilight-indigo/60 leading-tight">
                        I agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="text-burnt-peach font-bold hover:underline">Terms of Service</button>
                      </span>
                    </label>
                  </div>
                </div>
                <div className="mt-auto space-y-4">
                  <button type="submit" disabled={isSubmitting || !agreedToTerms} className="w-full py-4 bg-twilight-indigo text-eggshell rounded-2xl font-black text-sm shadow-xl hover:shadow-twilight-indigo/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : 'Create Account'}
                  </button>
                  <p className="text-center text-sm font-medium text-twilight-indigo/50">Already have an account? <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-twilight-indigo font-bold hover:underline">Sign In</button></p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showTermsModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowTermsModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl bg-eggshell rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-6 border-b flex justify-between items-center"><h2 className="text-xl font-black">Terms of Service</h2><button onClick={() => setShowTermsModal(false)} className="p-2 hover:bg-zinc-100 rounded-xl"><X size={20} /></button></div>
              <div className="flex-1 overflow-y-auto p-6 prose prose-sm prose-zinc max-w-none"><Markdown>{TERMS_OF_SERVICE}</Markdown></div>
              <div className="p-4 border-t flex justify-end"><button onClick={() => { setAgreedToTerms(true); setShowTermsModal(false); }} className="px-6 py-2.5 bg-burnt-peach text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform">I Agree</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForgotPasswordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowForgotPasswordModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-eggshell rounded-[2rem] shadow-2xl p-8 space-y-6">
              <div className="flex justify-between items-center"><h3 className="text-xl font-black">Forgot Password</h3><button onClick={() => setShowForgotPasswordModal(false)} className="p-2 hover:bg-zinc-100 rounded-xl"><X size={20} /></button></div>
              {forgotPasswordStatus && <div className={`p-4 rounded-xl text-sm font-bold ${forgotPasswordStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{forgotPasswordStatus.message}</div>}
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-burnt-peach/20"><Mail size={18} className="text-zinc-400" /><input type="email" required value={forgotPasswordEmail} onChange={(e) => setForgotPasswordEmail(e.target.value)} placeholder="your@email.com" className="w-full bg-transparent focus:outline-none text-sm" /></div>
                <button type="submit" disabled={isSendingForgotPassword} className="w-full py-3.5 bg-burnt-peach text-white rounded-xl font-bold text-sm disabled:opacity-50">{isSendingForgotPassword ? 'Sending...' : 'Send Reset Link'}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetPasswordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowResetPasswordModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-eggshell rounded-[2rem] shadow-2xl p-8 space-y-6">
              <div className="flex justify-between items-center"><h3 className="text-xl font-black">Reset Password</h3><button onClick={() => setShowResetPasswordModal(false)} className="p-2 hover:bg-zinc-100 rounded-xl"><X size={20} /></button></div>
              {resetPasswordStatus && <div className={`p-4 rounded-xl text-sm font-bold ${resetPasswordStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{resetPasswordStatus.message}</div>}
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <input type="password" required minLength={6} value={resetPasswordNewPassword} onChange={(e) => setResetPasswordNewPassword(e.target.value)} placeholder="New Password (min 6 chars)" className="w-full px-4 py-3.5 bg-white border border-zinc-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-burnt-peach/20" />
                <input type="password" required minLength={6} value={confirmResetPasswordNewPassword} onChange={(e) => setConfirmResetPasswordNewPassword(e.target.value)} placeholder="Confirm New Password" className="w-full px-4 py-3.5 bg-white border border-zinc-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-burnt-peach/20" />
                <button type="submit" disabled={isUpdatingPassword || resetPasswordNewPassword !== confirmResetPasswordNewPassword} className="w-full py-3.5 bg-twilight-indigo text-eggshell rounded-xl font-bold text-sm disabled:opacity-50 flex justify-center items-center gap-2">{isUpdatingPassword ? <RefreshCw size={16} className="animate-spin" /> : 'Update Password'}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // --- MAIN RENDER ROUTER ---
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-eggshell flex items-center justify-center p-0 sm:p-4 font-sans">
      <AnimatePresence mode="wait">
        {authMode === 'onboarding' ? (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            {renderOnboarding()}
          </motion.div>
        ) : (
          <motion.div
            key={`auth-${authMode}`}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            {renderAuth()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}