// src/AuthUI.tsx
import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Staff, ClinicProfile } from './types';
import {
  Mail,
  Lock,
  User,
  Phone,
  ArrowLeft,
  X,
  RefreshCw,
  HeartPulse,
  Coins,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';


// Normalise Malaysian phone → 60XXXXXXXXX
const formatMalaysianPhone = (raw: string): string => {
  let v = raw.replace(/[\s\-().+]/g, '');   // strip spaces, dashes, parens, dots, +
  if (v.startsWith('60')) return v;
  if (v.startsWith('0')) v = '60' + v.slice(1);
  else v = '60' + v;
  return v;
};

// Normalise Malaysian IC → 12 digits, no dashes
const formatMalaysianIC = (raw: string): string => raw.replace(/[-\s]/g, '');

const TERMS_OF_SERVICE = `
# User Agreement & Privacy Policy
Welcome to AraPower. By using our services, you agree to the following terms and conditions:
## 1. Acceptance of Terms
By accessing or using AraPower, you agree to be bound by these Terms of Service and all applicable laws and regulations.
## 2. Privacy Policy
Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information. We comply with standard healthcare data protection regulations.
`;

const ARA_POWER_LOGO = 'https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/lOGO%20ARA%20dark%20blue%20(1).png?alt=media&token=e9c445db-4f1d-4858-9673-e3a9a94b0590';

const onboardingSlides = [
  {
    icon: Coins,
    iconColor: '#f59e0b',   // amber — money/coins colour
    bgColor: '#fffbeb',     // warm cream background
    title: 'Earn Extra Income',
    description: 'Share Klinik Ara health services and earn commission every time your referral succeeds. Easy, flexible, right from your phone.'
  },
  {
    icon: HeartPulse,
    iconColor: '#ef4444',   // red — heart colour
    bgColor: '#fef2f2',     // light red background
    title: 'Help Your Community',
    description: 'Many people need healthcare but don\'t know where to go. You can be the bridge — connect them to trusted health services.'
  },
  {
    icon: TrendingUp,
    iconColor: '#10b981',   // emerald — growth colour
    bgColor: '#f0fdf4',     // light green background
    title: 'More Active, Greater Rewards',
    description: 'Reach Silver and Gold tier for up to 50% commission bonus. The more people you help, the more you earn.'
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
  onAuthSuccess,
  clinicProfile,
  apiBaseUrl,
  branches,
  isSupabaseConfigured,
  Logo,
  safeFetch,
  supabase
}: AuthUIProps) {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

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

  const [authMode, setAuthMode] = useState<'welcome' | 'entry' | 'onboarding' | 'login' | 'register'>('welcome');
  const [onboardingStep, setOnboardingStep] = useState(0);

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
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [resetPasswordNewPassword, setResetPasswordNewPassword] = useState('');
  const [confirmResetPasswordNewPassword, setConfirmResetPasswordNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [resetPasswordStatus, setResetPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [canProceed, setCanProceed] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Reset timer when slide changes
  React.useEffect(() => {
    setCanProceed(false);
    const duration = 3;
    setCountdown(duration);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanProceed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onboardingStep]);

  const goToEntry = () => {
    setAuthError('');
    setAuthMode('entry');
  };

  const goToLogin = () => {
    setAuthError('');
    setAuthMode('login');
  };

  const goToSignupFlow = () => {
    setAuthError('');
    setOnboardingStep(0);
    setAuthMode('onboarding');
  };

  const goToRegister = () => {
    setAuthError('');
    setAuthMode('register');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    try {
      if (!isSupabaseConfigured) throw new Error('Authentication service is not configured.');
      const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) throw error;
      if (data.user?.email) {
        const { res, data: profileData } = await safeFetch(`${apiBaseUrl}/api/staff/email?email=${data.user.email}`);
        if (!res.ok) throw new Error(profileData?.error || 'Server error');
        onAuthSuccess(profileData);
      }
    } catch (error: any) {
      setAuthError(error.message === 'Email not confirmed' ? 'Please confirm your email address.' : error.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setAuthError('You must agree to the User Agreement.');
      return;
    }
    setAuthError('');
    setIsSubmitting(true);
    try {
      if (!isSupabaseConfigured) throw new Error('Authentication service is not configured.');
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authName, email: authEmail, branch: authBranch, phone: formatMalaysianPhone(authPhone), password: authPassword })
      });
      if (!res.ok) throw new Error(data?.error || 'Registration failed');
      // Auto sign in after registration
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (signInError || !signInData?.user?.email) {
        setAuthError('Registration successful! Please log in.');
        setAuthMode('login');
        return;
      }
      // Fetch full staff profile — don't pass raw register response
      const { res: profileRes, data: profileData } = await safeFetch(`${apiBaseUrl}/api/staff/email?email=${signInData.user.email}`);
      if (!profileRes.ok) throw new Error(profileData?.error || 'Failed to load profile');
      onAuthSuccess(profileData);
    } catch (error: any) {
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
      if (!isSupabaseConfigured) throw new Error('Not configured');
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/update-password`
      });
      if (error) throw error;
      setForgotPasswordStatus({ type: 'success', message: 'Password reset link sent! Check your inbox.' });
    } catch (error: any) {
      setForgotPasswordStatus({ type: 'error', message: error.message });
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
        const { error } = await supabase.auth.updateUser({ password: resetPasswordNewPassword });
        if (error) throw error;
      }
      setResetPasswordStatus({ type: 'success', message: 'Password updated. Redirecting...' });
      setTimeout(async () => {
        isPasswordRecovery.current = false;
        setShowResetPasswordModal(false);
        setResetPasswordNewPassword('');
        await supabase.auth.signOut();
        window.history.pushState({}, '', '/');
      }, 3000);
    } catch (error: any) {
      setResetPasswordStatus({ type: 'error', message: error.message });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  useEffect(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;
    if (path === '/update-password' || hash.includes('type=recovery')) {
      setShowResetPasswordModal(true);
      setAuthMode('login');
      setTimeout(() => window.history.replaceState({}, document.title, '/'), 2000);
    }
  }, []);

  const renderWelcome = () => (
    <div
      className="w-full sm:max-w-md h-screen sm:h-[90vh] sm:rounded-[3rem] sm:shadow-2xl overflow-hidden flex flex-col relative"
      style={{ background: '#ffffff', fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Top: Logo + Brand */}
      <div className="px-8 pt-10 flex items-center gap-3">
        <img
          src={ARA_POWER_LOGO}
          alt="Klinik Ara Logo"
          style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
        />
        <div className="flex flex-col leading-tight">
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#1580c2', fontFamily: "'Poppins', sans-serif" }}>
            Klinik Ara
          </span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#1580c2', fontFamily: "'Poppins', sans-serif" }}>
            24 Jam
          </span>
        </div>
      </div>

      {/* Middle: Main Content */}
      <div className="flex-1 flex flex-col justify-center px-8">
        <h1
          style={{
            fontSize: '60px',
            fontWeight: 600,
            color: '#1580c2',
            lineHeight: 1.0,
            letterSpacing: '-1px',
            margin: 0,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Ara<br />Power
        </h1>

        <h2
          style={{
            fontSize: '36px',
            fontWeight: 400,
            color: '#1580c2',
            lineHeight: 1.2,
            margin: '16px 0 0 0',
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Become an<br />Ara Ambassador
        </h2>

        <p
          style={{
            fontSize: '15px',
            fontWeight: 500,
            color: '#1580c2',
            lineHeight: 1.6,
            margin: '12px 0 0 0',
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          The exclusive affiliate<br />
          programme for<br />
          TeamAra
        </p>
      </div>

      {/* Bottom: CTA Buttons */}
      <div className="px-8 pb-14 flex items-center gap-4">
        {/* Join button */}
        <button
          onClick={goToSignupFlow}
          className="flex-1 active:scale-[0.97] transition-all"
          style={{
            height: '58px',
            border: '2.5px solid #1580c2',
            borderRadius: '40px',
            background: 'transparent',
            color: '#1580c2',
            fontSize: '18px',
            fontWeight: 600,
            fontFamily: "'Poppins', sans-serif",
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          Join
        </button>

        {/* Solid blue circle arrow button */}
        <button
          onClick={goToEntry}
          className="active:scale-[0.95] transition-transform flex items-center justify-center"
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            background: '#1580c2',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ChevronRight size={26} strokeWidth={2.5} color="white" />
        </button>
      </div>
    </div>
  );

  const renderEntry = () => (
    <div
      className="w-full sm:max-w-md h-screen sm:h-[90vh] sm:rounded-[3rem] sm:shadow-2xl overflow-hidden flex flex-col"
      style={{ background: '#ffffff', fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Top nav */}
      <div className="px-8 pt-10 flex items-center">
        <button
          onClick={() => setAuthMode('welcome')}
          className="w-10 h-10 rounded-full border flex items-center justify-center active:scale-95 transition-transform"
          style={{ borderColor: '#1580c2', color: '#1580c2', background: 'transparent' }}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Logo */}
      <div className="px-8 pt-8 flex items-center gap-3">
        <img src={ARA_POWER_LOGO} alt="Klinik Ara Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
        <div className="flex flex-col leading-tight">
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1580c2' }}>Klinik Ara</span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#1580c2' }}>24 Jam</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-8">
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#1580c2', opacity: 0.5, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Choose your path
        </p>
        <h3 style={{ fontSize: '36px', fontWeight: 600, color: '#1580c2', lineHeight: 1.1, margin: '0 0 12px 0' }}>
          Welcome in
        </h3>
        <p style={{ fontSize: '15px', fontWeight: 400, color: '#1580c2', opacity: 0.6, lineHeight: 1.6, maxWidth: '280px' }}>
          Sign in to continue, or create a new AraPower account and go through the onboarding flow first.
        </p>
      </div>

      {/* Buttons */}
      <div className="px-8 pb-14 flex flex-col gap-4">
        <button
          onClick={goToLogin}
          className="w-full active:scale-[0.97] transition-all"
          style={{
            height: '58px', borderRadius: '40px', background: '#1580c2',
            border: 'none', color: '#ffffff', fontSize: '16px', fontWeight: 600,
            fontFamily: "'Poppins', sans-serif", cursor: 'pointer',
          }}
        >
          Sign In
        </button>
        <button
          onClick={goToSignupFlow}
          className="w-full active:scale-[0.97] transition-all"
          style={{
            height: '58px', borderRadius: '40px', background: 'transparent',
            border: '2.5px solid #1580c2', color: '#1580c2', fontSize: '16px', fontWeight: 600,
            fontFamily: "'Poppins', sans-serif", cursor: 'pointer',
          }}
        >
          Sign Up
        </button>
      </div>
    </div>
  );

  const renderOnboarding = () => (
    <div
      className="w-full sm:max-w-md h-screen sm:h-[90vh] sm:rounded-[3rem] sm:shadow-2xl overflow-hidden flex flex-col"
      style={{ background: '#ffffff', fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Top nav */}
      <div className="px-8 pt-10 flex items-center justify-between">
        <button
          onClick={() => setAuthMode('entry')}
          className="w-10 h-10 rounded-full border flex items-center justify-center active:scale-95 transition-transform"
          style={{ borderColor: '#1580c2', color: '#1580c2', background: 'transparent' }}
        >
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={goToRegister}
          style={{ fontSize: '14px', fontWeight: 600, color: '#1580c2', opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`slide-${onboardingStep}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <div
              className="flex items-center justify-center mb-10"
              style={{ width: '120px', height: '120px', borderRadius: '2.5rem', background: onboardingSlides[onboardingStep].bgColor, border: `2px solid ${onboardingSlides[onboardingStep].iconColor}20` }}
            >
              {React.createElement((onboardingSlides[onboardingStep] as any).icon, { size: 56, strokeWidth: 1.5, color: onboardingSlides[onboardingStep].iconColor })}
            </div>
            <div className="text-center">
              <h2 style={{ fontSize: '28px', fontWeight: 600, color: '#1580c2', marginBottom: '12px', lineHeight: 1.2 }}>
                {onboardingSlides[onboardingStep].title}
              </h2>
              <p style={{ fontSize: '15px', fontWeight: 400, color: '#1580c2', opacity: 0.6, lineHeight: 1.6, maxWidth: '280px', margin: '0 auto' }}>
                {onboardingSlides[onboardingStep].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom */}
      <div className="px-8 pb-14 flex flex-col gap-6">
        {/* Dot indicators */}
        <div className="flex justify-center gap-2">
          {onboardingSlides.map((_, idx) => (
            <motion.div
              key={idx}
              animate={{
                width: idx === onboardingStep ? 32 : 8,
                backgroundColor: idx === onboardingStep ? '#1580c2' : 'rgba(21,128,194,0.2)'
              }}
              transition={{ duration: 0.3 }}
              style={{ height: '8px', borderRadius: '9999px' }}
            />
          ))}
        </div>

        <button
          disabled={!canProceed}
          onClick={() => {
            if (!canProceed) return;
            if (onboardingStep === onboardingSlides.length - 1) goToRegister();
            else setOnboardingStep(prev => prev + 1);
          }}
          className="w-full flex items-center justify-center gap-3 transition-all"
          style={{
            height: '58px', borderRadius: '40px',
            background: canProceed ? '#1580c2' : 'rgba(21,128,194,0.25)',
            border: 'none', color: '#ffffff', fontSize: '16px', fontWeight: 600,
            fontFamily: "'Poppins', sans-serif",
            cursor: canProceed ? 'pointer' : 'not-allowed',
            transition: 'background 0.3s',
          }}
        >
          {canProceed
            ? (onboardingStep === onboardingSlides.length - 1 ? 'Create Account' : 'Next')
            : `Wait ${countdown}s...`}
          {canProceed && <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  );

  const renderAuth = () => (
    <div
      className="w-full sm:max-w-md h-screen sm:h-[90vh] sm:rounded-[3rem] sm:shadow-2xl overflow-y-auto flex flex-col custom-scrollbar"
      style={{ background: '#ffffff', fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Top nav */}
      <div className="px-8 pt-10 flex items-center shrink-0">
        <button
          onClick={() => setAuthMode(authMode === 'login' ? 'entry' : 'onboarding')}
          className="w-10 h-10 rounded-full border flex items-center justify-center active:scale-95 transition-transform"
          style={{ borderColor: '#1580c2', color: '#1580c2', background: 'transparent' }}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-8 pb-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="pt-8 pb-6 shrink-0"
        >
          <img src={ARA_POWER_LOGO} alt="Klinik Ara Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain', marginBottom: '20px' }} />
          <h1 style={{ fontSize: '32px', fontWeight: 600, color: '#1580c2', margin: '0 0 6px 0', lineHeight: 1.1 }}>
            {authMode === 'login' ? 'Welcome back' : 'Create Account'}
          </h1>
          <div style={{ width: '40px', height: '4px', background: '#1580c2', borderRadius: '9999px', marginBottom: '8px' }} />
          <p style={{ fontSize: '14px', fontWeight: 400, color: '#1580c2', opacity: 0.55 }}>
            {authMode === 'login' ? 'Sign in to continue to AraPower' : 'Join the AraPower healthcare network'}
          </p>
        </motion.div>

        {/* Error */}
        <AnimatePresence mode="wait">
          {authError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 flex items-center gap-3 text-xs font-semibold text-white"
              style={{ background: '#ef4444', borderRadius: '16px' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
              <span>{authError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forms */}
        <AnimatePresence mode="wait">
          {authMode === 'login' ? (
            <motion.form
              key="login-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleLoginSubmit}
              className="flex-1 flex flex-col"
            >
              <div className="space-y-5 mb-8">
                <div className="space-y-2">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#1580c2', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email Address</label>
                  <div className="flex items-center gap-3 px-4 transition-all"
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px' }}>
                    <Mail size={18} style={{ color: '#1580c2', opacity: 0.4, flexShrink: 0 }} />
                    <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 500, color: '#1580c2', fontFamily: "'Poppins', sans-serif" }}
                      placeholder="name@example.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#1580c2', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Password</label>
                    <button type="button" onClick={() => setShowForgotPasswordModal(true)}
                      style={{ fontSize: '11px', fontWeight: 600, color: '#1580c2', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
                      Forgot Password?
                    </button>
                  </div>
                  <div className="flex items-center gap-3"
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px' }}>
                    <Lock size={18} style={{ color: '#1580c2', opacity: 0.4, flexShrink: 0 }} />
                    <input type={showPassword ? 'text' : 'password'} required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 500, color: '#1580c2', fontFamily: "'Poppins', sans-serif" }}
                      placeholder="Enter your password" />
                  </div>
                </div>
              </div>
              <div className="mt-auto space-y-4">
                <button type="submit" disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-50"
                  style={{ height: '58px', borderRadius: '40px', background: '#1580c2', border: 'none', color: '#ffffff', fontSize: '16px', fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
                  {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : 'Sign In'}
                </button>
                <p className="text-center" style={{ fontSize: '14px', fontWeight: 500, color: '#1580c2', opacity: 0.6 }}>
                  Don&apos;t have an account?{' '}
                  <button type="button" onClick={goToSignupFlow}
                    style={{ color: '#1580c2', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
                    Sign Up
                  </button>
                </p>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="register-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleRegisterSubmit}
              className="flex-1 flex flex-col"
            >
              <div className="space-y-4 mb-6">
                {[
                  { label: 'Full Name', type: 'text', value: authName, onChange: (e: any) => setAuthName(e.target.value), placeholder: 'Your full name', icon: User },
                  { label: 'Email Address', type: 'email', value: authEmail, onChange: (e: any) => setAuthEmail(e.target.value), placeholder: 'name@example.com', icon: Mail },
                  { label: 'Phone Number', type: 'tel', value: authPhone, onChange: (e: any) => setAuthPhone(e.target.value), onBlur: (e: any) => setAuthPhone(formatMalaysianPhone(e.target.value)), placeholder: '60123456789', icon: Phone },
                ].map(({ label, type, value, onChange, onBlur, placeholder, icon: Icon }: any) => (
                  <div key={label} className="space-y-2">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#1580c2', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</label>
                    <div className="flex items-center gap-3" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px' }}>
                      <Icon size={18} style={{ color: '#1580c2', opacity: 0.4, flexShrink: 0 }} />
                      <input type={type} required value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 500, color: '#1580c2', fontFamily: "'Poppins', sans-serif" }} />
                    </div>
                  </div>
                ))}

                <div className="space-y-2">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#1580c2', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Password</label>
                  <div className="flex items-center gap-3" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px' }}>
                    <Lock size={18} style={{ color: '#1580c2', opacity: 0.4, flexShrink: 0 }} />
                    <input type={showPassword ? 'text' : 'password'} required minLength={6} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 500, color: '#1580c2', fontFamily: "'Poppins', sans-serif" }} />
                  </div>
                </div>
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div
                      onClick={() => setAgreedToTerms(!agreedToTerms)}
                      className="flex items-center justify-center shrink-0 mt-0.5 transition-all"
                      style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${agreedToTerms ? '#1580c2' : '#e2e8f0'}`, background: agreedToTerms ? '#1580c2' : 'transparent', cursor: 'pointer' }}>
                      <input type="checkbox" className="hidden" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} />
                      {agreedToTerms && <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '2px' }} />}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#1580c2', opacity: 0.7, lineHeight: 1.5 }}>
                      I agree to the{' '}
                      <button type="button" onClick={() => setShowTermsModal(true)}
                        style={{ color: '#1580c2', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", textDecoration: 'underline' }}>
                        Terms of Service
                      </button>
                    </span>
                  </label>
                </div>
              </div>
              <div className="mt-auto space-y-4">
                <button type="submit" disabled={isSubmitting || !agreedToTerms}
                  className="w-full flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ height: '58px', borderRadius: '40px', background: '#1580c2', border: 'none', color: '#ffffff', fontSize: '16px', fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
                  {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : 'Create Account'}
                </button>
                <p className="text-center" style={{ fontSize: '14px', fontWeight: 500, color: '#1580c2', opacity: 0.6 }}>
                  Already have an account?{' '}
                  <button type="button" onClick={goToLogin}
                    style={{ color: '#1580c2', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
                    Sign In
                  </button>
                </p>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showTermsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowTermsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl overflow-hidden flex flex-col"
              style={{ background: '#ffffff', borderRadius: '2rem', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', maxHeight: '80vh', fontFamily: "'Poppins', sans-serif" }}
            >
              <div className="flex justify-between items-center p-6" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1580c2', margin: 0 }}>Terms of Service</h2>
                <button onClick={() => setShowTermsModal(false)}
                  className="flex items-center justify-center active:scale-95 transition-transform"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'transparent', cursor: 'pointer', color: '#1580c2' }}>
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none" style={{ color: '#1580c2' }}>
                <Markdown>{TERMS_OF_SERVICE}</Markdown>
              </div>
              <div className="p-4 flex justify-end" style={{ borderTop: '1px solid #e2e8f0' }}>
                <button
                  onClick={() => { setAgreedToTerms(true); setShowTermsModal(false); }}
                  className="active:scale-95 transition-transform"
                  style={{ padding: '12px 28px', background: '#1580c2', color: '#ffffff', borderRadius: '40px', border: 'none', fontSize: '14px', fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
                  I Agree
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForgotPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowForgotPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md"
              style={{ background: '#ffffff', borderRadius: '2rem', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', padding: '32px', fontFamily: "'Poppins', sans-serif" }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#1580c2', margin: 0 }}>Forgot Password</h3>
                <button onClick={() => setShowForgotPasswordModal(false)}
                  className="flex items-center justify-center active:scale-95 transition-transform"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'transparent', cursor: 'pointer', color: '#1580c2' }}>
                  <X size={16} />
                </button>
              </div>
              {forgotPasswordStatus && (
                <div className="mb-4 p-4 text-sm font-semibold" style={{ borderRadius: '12px', background: forgotPasswordStatus.type === 'success' ? '#f0fdf4' : '#fef2f2', color: forgotPasswordStatus.type === 'success' ? '#16a34a' : '#dc2626' }}>
                  {forgotPasswordStatus.message}
                </div>
              )}
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="flex items-center gap-3" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px' }}>
                  <Mail size={18} style={{ color: '#1580c2', opacity: 0.4, flexShrink: 0 }} />
                  <input type="email" required value={forgotPasswordEmail} onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 500, color: '#1580c2', fontFamily: "'Poppins', sans-serif" }} />
                </div>
                <button type="submit" disabled={isSendingForgotPassword}
                  className="w-full active:scale-[0.97] transition-all disabled:opacity-50"
                  style={{ height: '52px', borderRadius: '40px', background: '#1580c2', border: 'none', color: '#ffffff', fontSize: '15px', fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
                  {isSendingForgotPassword ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowResetPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md"
              style={{ background: '#ffffff', borderRadius: '2rem', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', padding: '32px', fontFamily: "'Poppins', sans-serif" }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#1580c2', margin: 0 }}>Reset Password</h3>
                <button onClick={() => setShowResetPasswordModal(false)}
                  className="flex items-center justify-center active:scale-95 transition-transform"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'transparent', cursor: 'pointer', color: '#1580c2' }}>
                  <X size={16} />
                </button>
              </div>
              {resetPasswordStatus && (
                <div className="mb-4 p-4 text-sm font-semibold" style={{ borderRadius: '12px', background: resetPasswordStatus.type === 'success' ? '#f0fdf4' : '#fef2f2', color: resetPasswordStatus.type === 'success' ? '#16a34a' : '#dc2626' }}>
                  {resetPasswordStatus.message}
                </div>
              )}
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <input type="password" required minLength={6} value={resetPasswordNewPassword}
                  onChange={(e) => setResetPasswordNewPassword(e.target.value)}
                  placeholder="New Password (min 6 chars)"
                  style={{ width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: '#1580c2', fontFamily: "'Poppins', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
                <input type="password" required minLength={6} value={confirmResetPasswordNewPassword}
                  onChange={(e) => setConfirmResetPasswordNewPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  style={{ width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: '#1580c2', fontFamily: "'Poppins', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
                <button type="submit" disabled={isUpdatingPassword || resetPasswordNewPassword !== confirmResetPasswordNewPassword}
                  className="w-full flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-50"
                  style={{ height: '52px', borderRadius: '40px', background: '#1580c2', border: 'none', color: '#ffffff', fontSize: '15px', fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
                  {isUpdatingPassword ? <RefreshCw size={16} className="animate-spin" /> : 'Update Password'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="min-h-screen w-full overflow-x-hidden p-0 sm:flex sm:items-center sm:justify-center sm:p-4 font-sans" style={{ background: '#ffffff' }}>
      <AnimatePresence mode="wait">
        {authMode === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {renderWelcome()}
          </motion.div>
        )}

        {authMode === 'entry' && (
          <motion.div
            key="entry"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {renderEntry()}
          </motion.div>
        )}

        {authMode === 'onboarding' && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {renderOnboarding()}
          </motion.div>
        )}

        {(authMode === 'login' || authMode === 'register') && (
          <motion.div
            key={`auth-${authMode}`}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {renderAuth()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}