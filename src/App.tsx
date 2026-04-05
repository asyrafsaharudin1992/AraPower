/// <reference types="vite/client" />
// Force rebuild - Logo update
import { GoogleGenAI } from "@google/genai";
import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { PromotionsCarousel } from './components/PromotionsCarousel';
import { AdminUI } from './components/AdminUI';
import { DashboardUI } from './components/DashboardUI';
import { CategoryScrollRow } from './components/CategoryScrollRow';
import AddServiceForm from './components/AddServiceForm';
import { Service, Promotion, Staff, Referral, AppSettings, ClinicProfile } from './types';
import { 
  Users, 
  PlusCircle, 
  Phone,
  TrendingUp, 
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  FileText,
  XCircle,
  Clock, 
  DollarSign, 
  LogOut,
  ChevronRight,
  Lock,
  Stethoscope,
  LayoutDashboard,
  ClipboardList,
  Download,
  QrCode,
  Share2,
  ExternalLink,
  MessageCircle,
  Search,
  Settings,
  Trash2,
  Edit2,
  Coins,
  UserCircle,
  Key,
  Copy,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  Zap,
  ShieldAlert,
  Calendar,
  CheckSquare,
  Activity,
  RefreshCw,
  Info,
  Plus,
  BarChart3,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Mail,
  Trophy,
  Star,
  Sparkles,
  MapPin,
  Tag,
  Palette,
  Sun,
  Moon,
  MessageSquare,
  Send,
  ArrowLeft,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import PullToRefresh from 'react-simple-pull-to-refresh';
import DatePicker from 'react-datepicker';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { supabase, isPlaceholder } from './supabase';
import PublicBookingUI from './components/PublicBookingUI';

// Interfaces moved to types.ts

const getServiceStatus = (item: Service) => {
  if (!item.start_date && !item.end_date) return 'active';
  const now = new Date();
  
  const parseDate = (d: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m - 1, day);
    }
    return new Date(d);
  };

  const start = item.start_date ? parseDate(item.start_date) : null;
  const end = item.end_date ? parseDate(item.end_date) : null;
  
  if (start) {
    if (item.start_time) {
      const [h, m] = item.start_time.split(':').map(Number);
      start.setHours(h, m, 0, 0);
    } else {
      start.setHours(0, 0, 0, 0);
    }
    if (now < start) return 'upcoming';
  }
  
  if (end) {
    if (item.end_time) {
      const [h, m] = item.end_time.split(':').map(Number);
      end.setHours(h, m, 59, 999);
    } else {
      end.setHours(23, 59, 59, 999);
    }
    if (now > end) return 'expired';
  }
  
  return 'active';
};

const ModernPromotionCard = ({ item, onClick }: { item: Service, onClick: () => void }) => {
  const status = getServiceStatus(item);

  // Generate a consistent gradient based on the item ID
  const gradients = [
    'from-brand-primary to-violet-500',
    'from-emerald-500 to-brand-surface',
    'from-violet-500 to-brand-primary',
    'from-brand-primary to-violet-500',
    'from-brand-surface to-emerald-500'
  ];
  const gradient = gradients[(Number(item.id) || 0) % gradients.length];

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative flex-shrink-0 w-64 h-80 rounded-[20px] bg-gradient-to-br ${gradient} p-6 flex flex-col justify-between shadow-2xl cursor-pointer overflow-hidden border border-violet-500`}
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-2">
          <span className="px-2 py-1 rounded-full bg-violet-500/20 backdrop-blur-md text-[8px] font-black text-zinc-900 uppercase tracking-widest border border-violet-500">
            {item.type || 'SERVICE'}
          </span>
          <span className={`px-2 py-1 rounded-full backdrop-blur-md text-[8px] font-black uppercase tracking-widest border border-violet-500 ${
            status === 'active' ? 'bg-emerald-500 text-white' : 
            status === 'upcoming' ? 'bg-brand-surface text-zinc-900' : 
            'bg-rose-50 text-rose-700'
          }`}>
            {status}
          </span>
        </div>
        {item.is_featured && <Star size={14} className="text-zinc-900" fill="currentColor" />}
      </div>
      
      {/* Subtle background glow */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-zinc-50 rounded-full blur-3xl" />
    </motion.div>
  );
};

const PromotionDetailModal = ({ item, isOpen, onClose, clinicProfile, darkMode, currentUser }: { item: Service | null, isOpen: boolean, onClose: () => void, clinicProfile: ClinicProfile, darkMode: boolean, currentUser: Staff | null }) => {
  if (!item) return null;

  const referralCode = currentUser?.referral_code || currentUser?.promo_code;

  const generateAffiliateLink = () => {
    if (!referralCode) return '';
    const baseUrl = item.target_url || getShareUrl(clinicProfile.customDomain);
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}ref=${referralCode}`;
  };

  const shareLink = generateAffiliateLink();

  const handleCopyLink = async () => {
    if (!shareLink) {
      alert('Code not generated yet');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareLink);
      alert('Link copied!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };



  const handleDownloadPoster = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: fileName,
            text: `Poster for ${item.name}`,
          });
          return;
        } catch (shareError) {
          if ((shareError as Error).name !== 'AbortError') {
            console.error('Share failed:', shareError);
          }
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'poster.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[101] max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 flex flex-col items-center">
              <div className="w-12 h-1.5 bg-violet-500/40 rounded-full my-4" />
              <button 
                onClick={onClose}
                className="absolute top-2 right-6 w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors active:scale-90"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="px-6 pb-36 space-y-8">
              {/* Poster */}
              {item.image_url ? (
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <img src={item.image_url} alt={item.name} className="w-full aspect-[4/5] object-cover" />
                </div>
              ) : (
                <div className="w-full aspect-[4/5] bg-gradient-to-br from-brand-primary to-violet-500 rounded-2xl flex items-center justify-center">
                  <Zap size={48} className="text-zinc-900" />
                </div>
              )}

              {/* Info */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2 py-1 rounded-md bg-violet-500/20 text-[10px] font-black text-zinc-900 uppercase tracking-widest border border-violet-500">
                      {item.type || 'SERVICE'}
                    </span>
                    {(() => {
                      const status = getServiceStatus(item);
                      return (
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-violet-500 ${
                          status === 'active' ? 'bg-emerald-500 text-white' : 
                          status === 'upcoming' ? 'bg-brand-surface text-zinc-900' : 
                          'bg-rose-500 text-white'
                        }`}>
                          {status}
                        </span>
                      );
                    })()}
                  </div>
                  <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">{item.name}</h2>
                  <p className="text-zinc-500 text-sm leading-relaxed">{item.description || 'No description provided'}</p>
                </div>

                {/* Pricing */}
                <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-transparent border-violet-500/20'} rounded-3xl p-6 border space-y-4`}>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Base Price</span>
                    <span className="text-zinc-500 text-lg line-through font-medium">
                      {clinicProfile.currency}{(item.base_price || 0).toFixed(0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Promo Price</span>
                    <span className="text-zinc-900 text-3xl font-black">
                      {clinicProfile.currency}{(item.promo_price || item.base_price || 0).toFixed(0)}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-violet-500 flex justify-between items-center">
                    <span className="text-brand-accent text-xs font-bold uppercase tracking-widest">Agent Incentive</span>
                    <span className="text-brand-accent text-xl font-black">
                      {clinicProfile.currency}{(item.commission_rate || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => item.image_url && handleDownloadPoster(item.image_url, `${item.name}-poster.jpg`)}
                  disabled={!item.image_url}
                  className="w-full py-5 bg-white text-zinc-900 rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Download size={20} />
                  Download Poster to Share
                </button>

                {/* Share Buttons */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <button
                    onClick={handleCopyLink}
                    className="py-4 bg-zinc-100 text-zinc-900 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Copy size={16} />
                    Copy Link
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Check out this promotion at our clinic: ${shareLink}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-4 bg-emerald-500 text-white rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </a>
                </div>

                <div className="pt-4">
                  <button
                    onClick={onClose}
                    className="w-full py-4 bg-zinc-100 text-zinc-900 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <ArrowLeft size={16} />
                    Back to Promotions
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const PromotionCard = ({ item, darkMode, clinicProfile, currentUser, handleDeleteService, setEditingService }: { item: Service, darkMode: boolean, clinicProfile: ClinicProfile, currentUser: Staff, handleDeleteService: (id: number) => void, setEditingService: (service: Partial<Service> | null) => void }) => {
  const handleDownloadPoster = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: fileName,
            text: `Poster for ${item.name}`,
          });
          return;
        } catch (shareError) {
          if ((shareError as Error).name !== 'AbortError') {
            console.error('Share failed:', shareError);
          }
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'poster.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const status = getServiceStatus(item);

  return (
    <div className="p-4 rounded-[2.5rem] bg-eggshell border-4 border-eggshell shadow-xl overflow-hidden">
      <div className="bg-twilight-indigo rounded-[2rem] overflow-hidden flex flex-col">
        {/* Flyer Watermark Area */}
        <div className="relative h-48 bg-twilight-indigo flex items-center justify-center overflow-hidden p-4">
          {item.image_url ? (
            <img 
              src={item.image_url} 
              alt={item.name} 
              className="w-full h-full object-contain opacity-40 scale-90" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <Zap size={80} className="text-eggshell" />
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-4 right-4 flex gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
              status === 'active' ? 'bg-emerald-500 text-white' : 
              status === 'upcoming' ? 'bg-apricot-cream text-twilight-indigo' : 
              'bg-rose-500 text-white'
            }`}>
              {status}
            </span>
          </div>
        </div>

        {/* Clear Text Panel */}
        <div className="bg-eggshell p-6 flex flex-col gap-4">
          <div className="space-y-1">
            <h4 className="text-2xl font-black text-twilight-indigo tracking-tight uppercase leading-tight">
              {item.name === 'UJIAN DNA' ? 'UJIAN DNA PROMOTION' : item.name}
            </h4>
            <div className="w-12 h-1 bg-burnt-peach rounded-full" />
          </div>

          {/* Pricing Section */}
          <div className="flex flex-col">
            <p className="text-sm text-twilight-indigo/60 line-through font-bold">
              Was: {clinicProfile.currency}{(item.base_price || 0).toLocaleString()}
            </p>
            <p className="text-2xl font-black text-twilight-indigo">
              SPECIAL NOW PRICE: {clinicProfile.currency}{(item.promo_price || item.base_price || 0).toLocaleString()}
            </p>
          </div>

          {/* Location List */}
          <div className="space-y-1">
            <p className="text-[10px] font-black text-twilight-indigo/50 uppercase tracking-widest">Available At:</p>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const activeBranches = item.branches ? Object.keys(item.branches).filter(bName => item.branches![bName].active) : [];
                return (activeBranches.length > 0 ? activeBranches : ['Main Branch, Bangi', 'Damansara']).map((branch, idx) => (
                  <span key={idx} className="text-xs font-bold text-twilight-indigo flex items-center gap-1">
                    <div className="w-1 h-1 bg-muted-teal rounded-full" />
                    {branch}
                  </span>
                ));
              })()}
            </div>
          </div>

          {/* Incentive Text Callout */}
          <div className="p-4 bg-eggshell border-2 border-apricot-cream rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-apricot-cream rounded-xl flex items-center justify-center text-twilight-indigo shadow-sm">
                <DollarSign size={20} />
              </div>
              <p className="text-lg font-black text-twilight-indigo uppercase tracking-tight">
                Get {clinicProfile.currency}{(item.commission_rate || 0).toFixed(0)} INCENTIVE
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => item.image_url && handleDownloadPoster(item.image_url, `${item.name}-poster.jpg`)}
            disabled={!item.image_url}
            className="w-full py-4 bg-burnt-peach text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-burnt-peach/20"
          >
            <Download size={20} className="text-white" />
            DOWNLOAD POSTER
          </button>
        </div>
      </div>
      
      {/* Admin Controls */}
      {currentUser.role === 'admin' && (
        <div className="flex justify-end gap-2 mt-4 px-2">
          <button onClick={() => {
            setEditingService(item);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} className="p-2 rounded-xl bg-twilight-indigo/5 text-twilight-indigo hover:bg-twilight-indigo/10 transition-colors">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDeleteService(item.id)} className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

interface PromoService {
  id: number;
  type: 'Service' | 'Promotion';
  title: string;
  incentiveAmount: number;
  posterImages: string[];
  servicePrice: number;
  promoPrice?: number;
  branches: string[];
  description?: string;
}

interface RolePermissions {
  canApprove: boolean;
  canEditServices: boolean;
  canEditStaff: boolean;
  canViewAnalytics: boolean;
  canManagePayouts: boolean;
  canManageSettings: boolean;
  canManageCommunication: boolean;
}

interface RolesConfig {
  [role: string]: RolePermissions;
}

const welcomeQuotes = [
  '"The secret of getting ahead is getting started." – Mark Twain',
  '"The future depends on what you do today." – Mahatma Gandhi',
  '"Opportunities don\'t happen. You create them." – Chris Grosser',
  '"Great things are done by a series of small things brought together." – Vincent Van Gogh',
  '"Small daily improvements over time lead to stunning results." – Robin Sharma',
  '"Don\'t watch the clock; do what it does. Keep going." – Sam Levenson',
  '"Start where you are. Use what you have. Do what you can." – Arthur Ashe'
];

const safeFetch = async (url: string, options?: RequestInit, retries = 3, backoff = 1000): Promise<{ res: Response, data: any }> => {
  try {
    console.log(`Fetching: ${url}`, options?.method || 'GET');
    const res = await fetch(url, options);
    
    // Handle rate limiting (429) or server errors (500, 502, 503, 504) with retries
    if ((res.status === 429 || res.status >= 500) && retries > 0) {
      console.warn(`Request to ${url} failed with status ${res.status}. Retrying in ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return safeFetch(url, options, retries - 1, backoff * 2);
    }

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await res.json();
      
      // Some APIs return 200 or 400 but include an error message like "Rate exceeded"
      if (data?.error && typeof data.error === 'string' && data.error.toLowerCase().includes('rate') && retries > 0) {
        console.warn(`Request to ${url} returned rate limit error in payload. Retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return safeFetch(url, options, retries - 1, backoff * 2);
      }
      
      return { res, data };
    } else {
      const text = await res.text();
      // Truncate long error messages
      const errorText = text.length > 100 ? text.substring(0, 100) + '...' : text;
      
      if (errorText.toLowerCase().includes('rate') && retries > 0) {
        console.warn(`Request to ${url} returned rate limit error in text. Retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return safeFetch(url, options, retries - 1, backoff * 2);
      }
      
      return { res, data: { error: errorText || res.statusText || "Unknown error" } };
    }
  } catch (e: any) {
    console.error(`Fetch error for ${url}:`, e);
    
    // Retry on network errors
    if (retries > 0) {
      console.warn(`Network error for ${url}. Retrying in ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return safeFetch(url, options, retries - 1, backoff * 2);
    }
    
    const isNetworkError = e.message === 'Failed to fetch' || e.name === 'TypeError';
    const errorMsg = isNetworkError 
      ? "Network error: The server could not be reached. Please ensure the backend is running and you have a stable connection."
      : (e.message || "Network error");
    return { res: { ok: false, status: 0 } as Response, data: { error: errorMsg } };
  }
};

// Reusable Logo Component with Fallback
const Logo = ({ className = "w-8 h-8", logoUrl }: { className?: string, logoUrl?: string }) => {
  const [error, setError] = useState(false);
  const size = parseInt(className.match(/\d+/)?.[0] || "24");
  
  if (logoUrl && !error) {
    return (
      <div className={`${className} flex items-center justify-center bg-white rounded-xl shadow-inner overflow-hidden`}>
        <img 
          src={logoUrl} 
          alt="Logo" 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${className} flex items-center justify-center bg-violet-500 rounded-xl shadow-inner overflow-hidden`}>
      <Activity className="text-zinc-900" size={size * 0.7} strokeWidth={2.5} />
    </div>
  );
};

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

const getShareUrl = (customDomain?: string) => {
  if (customDomain) {
    let domain = customDomain.trim();
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = 'https://' + domain;
    }
    if (domain.endsWith('/')) {
      domain = domain.slice(0, -1);
    }
    return domain;
  }
  const origin = window.location.origin;
  // If we're in the dev environment, replace 'ais-dev-' with 'ais-pre-' to get the public share URL
  // This allows the QR code to be scanned from a mobile device that isn't logged into AI Studio
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin;
};

const MobilePullToRefreshWrapper = ({ isMobile, onRefresh, children }: { isMobile: boolean, onRefresh: () => Promise<any>, children: React.ReactNode }) => {
  if (isMobile) {
    return <PullToRefresh onRefresh={onRefresh} pullDownThreshold={60} maxPullDownDistance={90}>{children as React.ReactElement}</PullToRefresh>;
  }
  return <>{children}</>;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    const saved = localStorage.getItem('currentUser');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  });
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [warmLeads, setWarmLeads] = useState<any[]>([]);
  const [promoServices, setPromoServices] = useState<PromoService[]>([]);

  const [branches, setBranches] = useState<any[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  const [promotions, setPromotions] = useState<Promotion[]>([
    {
      id: 1,
      title: "Ramadan Special 2026",
      description: "Get 20% off on all dental checkups during the month of Ramadan. Share the smile with your family!",
      start_date: "2026-03-01",
      end_date: "2026-03-31",
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      title: "New Branch Opening: Bangi",
      description: "We are opening our new branch in Bangi! Refer 5 friends and get a free scaling session.",
      start_date: "2026-04-01",
      end_date: "2026-05-31",
      is_active: true,
      created_at: new Date().toISOString()
    }
  ]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'referrals' | 'admin' | 'receptionist' | 'setup' | 'guide' | 'profile' | 'tasks' | 'kit' | 'promotions' | 'payouts' | 'inbox' | 'communication' | 'warm-leads'>('dashboard');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isMobile = windowWidth < 1024;
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('dark-mode');
    // Force light mode on small mobile screens for better readability
    if (windowWidth < 768) return false;
    if (saved !== null) return saved === 'true';
    return false;
  });
  const [setupSubTab, setSetupSubTab] = useState<'services' | 'staff' | 'booking' | 'auth' | 'clinic' | 'roles' | 'referral' | 'branches' | 'trash' | 'categories'>('staff');
  const [serviceCategories, setServiceCategories] = useState<string[]>(['Health screening', 'Diagnostic test', 'Vaccination']);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState<string>('');
  const [promoSubTab, setPromoSubTab] = useState<'manage'>('manage');
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [selectedPromo, setSelectedPromo] = useState<Service | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Partial<Staff> | null>(null);
  const [isSavingSetup, setIsSavingSetup] = useState(false);

  // Add auto-refresh for approval status
  useEffect(() => {
    if (currentUser && currentUser.is_approved === 0 && currentUser.role !== 'admin') {
      const interval = setInterval(async () => {
        const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/${currentUser.id}`);
        if (res.ok && data && data.is_approved) {
          setCurrentUser(data);
          localStorage.setItem('currentUser', JSON.stringify(data));
          clearInterval(interval);
        }
      }, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Refetch user profile on load to ensure latest status
  useEffect(() => {
    const fetchLatestUser = async () => {
      if (currentUser?.id) {
        try {
          const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/${currentUser.id}`);
          if (res.ok && data) {
            setCurrentUser(data);
            localStorage.setItem('currentUser', JSON.stringify(data));
          }
        } catch (error) {
          console.error('Error refetching user on load:', error);
        }
      }
    };
    fetchLatestUser();
  }, []); // Run once on mount

  // Clinic & Roles State
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile>({
    name: 'AraPower',
    address: '',
    phone: '',
    email: '',
    currency: 'RM',
    logoUrl: '' // Resetting broken URL, user can upload or provide a new one
  });
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);

  const handleGenerateIcon = async () => {
    const aistudio = (window as any).aistudio;
    if (!aistudio) {
      alert('AI Studio environment not detected.');
      return;
    }

    if (!(await aistudio.hasSelectedApiKey())) {
      await aistudio.openSelectKey();
      return;
    }

    setIsGeneratingIcon(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: 'A modern, minimalist healthcare app icon featuring a stylized medical medical cross, clean lines, professional blue and white color palette, high resolution, 3D render style with soft shadows, white background.',
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
      });

      const base64EncodeString = response.generatedImages[0].image.imageBytes;
      const imageUrl = `data:image/jpeg;base64,${base64EncodeString}`;
      setClinicProfile(prev => ({ ...prev, logoUrl: imageUrl }));
    } catch (error: any) {
      console.error('Error generating icon:', error);
      if (error.message?.includes("Requested entity was not found")) {
        await aistudio.openSelectKey();
      } else {
        alert('Failed to generate icon. Please ensure you have a valid API key selected (ai.google.dev/gemini-api/docs/billing).');
      }
    } finally {
      setIsGeneratingIcon(false);
    }
  };
  const [rolesConfig, setRolesConfig] = useState<RolesConfig>({
    admin: { canApprove: true, canEditServices: true, canEditStaff: true, canViewAnalytics: true, canManagePayouts: true, canManageSettings: true, canManageCommunication: true },
    manager: { canApprove: true, canEditServices: true, canEditStaff: true, canViewAnalytics: true, canManagePayouts: true, canManageSettings: false, canManageCommunication: true },
    receptionist: { canApprove: false, canEditServices: false, canEditStaff: false, canViewAnalytics: false, canManagePayouts: false, canManageSettings: false, canManageCommunication: true },
    affiliate: { canApprove: false, canEditServices: false, canEditStaff: false, canViewAnalytics: false, canManagePayouts: false, canManageSettings: false, canManageCommunication: false }
  });

  // Staff Detail State
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<Staff | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [selectedPayoutStaff, setSelectedPayoutStaff] = useState<number[]>([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMetadata, setPayoutMetadata] = useState({
    creditingDate: new Date().toLocaleDateString('en-GB'),
    paymentReference: 'INCENTIVE',
    paymentDescription: 'STAFF REFERRAL INCENTIVE',
    bulkPaymentType: 'SALARY'
  });
  const [isPublicBooking, setIsPublicBooking] = useState(false);

  // Receptionist state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [referralSearch, setReferralSearch] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [notificationForm, setNotificationForm] = useState({
    user_ids: [] as string[],
    title: '',
    message: '',
    type: 'announcement'
  });

  const sendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      showNotification('error', 'Please fill in all fields');
      return;
    }
    
    setIsSavingSetup(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notificationForm,
          user_ids: notificationForm.user_ids.length === 0 ? [] : notificationForm.user_ids.map(id => id === 'all' ? null : parseInt(id))
        })
      });

      if (response.ok) {
        showNotification('success', 'Notification sent successfully');
        setNotificationForm({ user_ids: [], title: '', message: '', type: 'announcement' });
      } else {
        const errorData = await response.json();
        showNotification('error', `Error: ${errorData.error}`);
      }
    } catch (error) {
      showNotification('error', 'Failed to send notification');
    } finally {
      setIsSavingSetup(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchNotifications();
    }
  }, [currentUser?.id]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications/${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadNotificationsCount(data.filter((n: any) => !n.is_read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationAsRead = async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      await Promise.all(unreadIds.map(id => 
        fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      ));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotificationsCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  const [referralStatusFilter, setReferralStatusFilter] = useState<string>('all');
  const [referralBranchFilter, setReferralBranchFilter] = useState<string>('all');
  const [adminSearch, setAdminSearch] = useState('');
  const [walkInPromoCode, setWalkInPromoCode] = useState('');
  const [walkInStaff, setWalkInStaff] = useState<Staff | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    blockedDates: [],
    blockedTimes: [],
    workingHours: { start: '09:00', end: '18:00' }
  });

  // Commission Tiers Configuration
  const TIERS = [
    { name: 'Bronze', min: 0, bonus: 1, color: 'text-white', bg: 'bg-brand-accent' },
    { name: 'Silver', min: 6, bonus: 1.2, color: 'text-white', bg: 'bg-violet-500' },
    { name: 'Gold', min: 11, bonus: 1.5, color: 'text-white', bg: 'bg-rose-500' }
  ];

  // Form states
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientIC, setPatientIC] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  const [patientType, setPatientType] = useState<'new' | 'existing'>('new');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [urlServiceName, setUrlServiceName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [serviceSlideshowIndex, setServiceSlideshowIndex] = useState(0);
  const [reduceTranslucency, setReduceTranslucency] = useState(() => {
    return localStorage.getItem('reduceTranslucency') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('reduceTranslucency', String(reduceTranslucency ?? false));
  }, [reduceTranslucency]);

  useEffect(() => {
    const featured = services.filter(s => s.is_featured);
    setFeaturedIndex(0);
    if (featured.length <= 1) return;

    const timer = setInterval(() => {
      setFeaturedIndex(prev => (prev + 1) % featured.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [services]);

  useEffect(() => {
    if (services.length <= 1) return;

    const timer = setInterval(() => {
      setServiceSlideshowIndex(prev => (prev + 1) % services.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [services]);

  // Auth States
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [welcomeQuote, setWelcomeQuote] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'welcome' | 'auth'>('welcome');
  const [welcomeScreenClass, setWelcomeScreenClass] = useState('');
  const [loginScreenClass, setLoginScreenClass] = useState('hidden');
  const [showWelcome, setShowWelcome] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authBranch, setAuthBranch] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetPasswordNewPassword, setResetPasswordNewPassword] = useState('');
  const [confirmResetPasswordNewPassword, setConfirmResetPasswordNewPassword] = useState('');
  const [isSendingForgotPassword, setIsSendingForgotPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [resetPasswordStatus, setResetPasswordStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [authError, setAuthError] = useState('');
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline' | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState(typeof window !== 'undefined' ? window.location.origin : '');
  const isSupabaseConfigured = !isPlaceholder;
  const [payoutUserFilter, setPayoutUserFilter] = useState<string>('all');
  const [payoutBranchFilter, setPayoutBranchFilter] = useState<string>('all');
  const [payoutSubTab, setPayoutSubTab] = useState<'history' | 'bulk'>('history');
  const [branchChangeRequests, setBranchChangeRequests] = useState<any[]>([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchPerformance, setBranchPerformance] = useState<any>(null);
  const [authSettings, setAuthSettings] = useState({ allowRegistration: true });
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [resetPasswordModal, setResetPasswordModal] = useState<{
    isOpen: boolean;
    staffId: number | null;
    email: string;
    tempPassword?: string;
    isLoading?: boolean;
    error?: string;
  }>({ isOpen: false, staffId: null, email: '' });

  // Theme state
  const THEMES: Record<string, { accent: string, surface: string, name: string }> = {
    pastel: { accent: '#F2994A', surface: '#FFF5E9', name: 'Pastel Orange' },
    red: { accent: '#E11D48', surface: '#FFF1F2', name: 'Vibrant Red' },
    blue: { accent: '#2563EB', surface: '#EFF6FF', name: 'Classic Blue' },
    pink: { accent: '#DB2777', surface: '#FDF2F8', name: 'Soft Pink' },
  };
  const [selectedTheme, setSelectedTheme] = useState<string>(localStorage.getItem('app-theme') || 'pastel');

  useEffect(() => {
    const theme = THEMES[selectedTheme] || THEMES.pastel;
    document.documentElement.style.setProperty('--brand-accent', theme.accent);
    document.documentElement.style.setProperty('--brand-surface', theme.surface);
    localStorage.setItem('app-theme', selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    localStorage.setItem('dark-mode', String(darkMode ?? false));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };
  
  // Task State
  const [tasks, setTasks] = useState<any[]>([]);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [expandedReferralIds, setExpandedReferralIds] = useState<number[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskDueDate, setTaskDueDate] = useState<Date | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [referralSettings, setReferralSettings] = useState({
    types: ['Staff', 'Patient', 'Public'],
    defaultCommission: 5,
    eligibilityCriteria: 'Must be an active staff member with an approved account.',
    quotas: {} as Record<number, number>
  });

  useEffect(() => {
    const randomQuote = welcomeQuotes[Math.floor(Math.random() * welcomeQuotes.length)];
    setWelcomeQuote(randomQuote);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/update-password') {
        setShowResetPasswordModal(true);
      }
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [apiBaseUrl]);

  useEffect(() => {
    // Check for active session
    if (isPlaceholder) {
      setIsAuthChecking(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.warn('Supabase session check error:', error);
        if (error.message?.includes('Refresh Token Not Found') || error.message?.includes('invalid_refresh_token') || error.message?.includes('Invalid Refresh Token')) {
          console.log('Clearing invalid Supabase session...');
          try {
            await supabase.auth.signOut();
          } catch (e) {
            console.error('Error during signOut:', e);
          }
          
          // Manually clear Supabase auth tokens from local storage just in case signOut failed
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          });
          
          localStorage.removeItem('currentUser');
          setCurrentUser(null);
        }
        setIsAuthChecking(false);
        return;
      }
      
      if (session?.user?.email) {
        fetchStaffByEmail(session.user.email, session.user).then((userProfile) => {
          if (userProfile) {
            if (userProfile.role === 'admin' || userProfile.role === 'manager') {
              setActiveTab('admin');
            } else if (userProfile.role === 'receptionist') {
              setActiveTab('receptionist');
            } else {
              setActiveTab('dashboard');
            }
          }
        }).catch(e => console.error('Error fetching staff on session check:', e));
      } else {
        setIsAuthChecking(false);
      }
    }).catch(async (err: any) => {
      console.warn('Supabase session check failed:', err);
      // Handle invalid refresh token by clearing the session
      if (err.message?.includes('Refresh Token Not Found') || err.message?.includes('invalid_refresh_token') || err.message?.includes('Invalid Refresh Token')) {
        console.log('Clearing invalid Supabase session...');
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.error('Error during signOut:', e);
        }
        
        // Manually clear Supabase auth tokens from local storage just in case signOut failed
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        });
        
        localStorage.removeItem('currentUser');
        setCurrentUser(null);
      }
      setIsAuthChecking(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      if (session?.user?.email) {
        fetchStaffByEmail(session.user.email, session.user).then((userProfile) => {
          if (userProfile && event === 'SIGNED_IN') {
            if (userProfile.role === 'admin' || userProfile.role === 'manager') {
              setActiveTab('admin');
            } else if (userProfile.role === 'receptionist') {
              setActiveTab('receptionist');
            } else {
              setActiveTab('dashboard');
            }
          }
        }).catch(e => console.error('Error fetching staff on auth change:', e));
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        
        // Manually clear Supabase auth tokens from local storage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        });
        
        localStorage.removeItem('currentUser');
        setIsAuthChecking(false);
      } else if (event === 'INITIAL_SESSION' && !session) {
        setIsAuthChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  const fetchStaffByEmail = async (email: string, user?: any) => {
    try {
      const authIdQuery = user?.id ? `&auth_id=${user.id}` : '';
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/email?email=${email}${authIdQuery}`);
      
      if (!res.ok && res.status >= 500) {
        throw new Error(data?.error || `Server error: ${res.status}`);
      }
      
      if (res.ok && data) {
        localStorage.setItem('currentUser', JSON.stringify(data));
        setCurrentUser(data);
        return data;
      } else {
        throw new Error('User profile not found.');
      }
    } catch (error: any) {
      console.error('Error in fetchStaffByEmail:', error);
      setAuthError(error.message || 'Failed to load user profile.');
      // If we fail to load the profile, we should probably sign them out so they aren't stuck in a weird state
      supabase.auth.signOut().catch(e => console.warn('Error during auto-signOut:', e));
      
      // Manually clear Supabase auth tokens from local storage just in case signOut failed
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
      
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      throw error;
    } finally {
      setIsAuthChecking(false);
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePublicBooking = async (code: string | null, serviceId: string | null, serviceName: string | null = null) => {
    setIsPublicBooking(true);
    // Any additional logic for public booking initialization can go here
  };

  useEffect(() => {
    console.log('App mounted', {
      apiBaseUrl,
      isMobile,
      windowWidth,
      isSupabaseConfigured,
      userAgent: navigator.userAgent
    });
    
    // Check for public booking link
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    const serviceId = params.get('service') || params.get('serviceId');
    const serviceName = params.get('sName') || params.get('serviceName');
    
    if (refCode || serviceId) {
      const decodedServiceName = serviceName ? decodeURIComponent(serviceName) : null;
      handlePublicBooking(refCode, serviceId, decodedServiceName);
    }

    fetchPromotions();
    fetchServices();
    fetchSettings();
    fetchBranches();
    fetchTasks();
  }, []);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    setConnectionError(null);
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/health`);
      if (res.ok) {
        setConnectionStatus('online');
        if (data.db && data.db.startsWith('error')) {
          setConnectionError(`Database Error: ${data.db}`);
          setConnectionStatus('offline');
        }
      } else if (res.status === 503) {
        setConnectionStatus('checking');
        setConnectionError('Server is initializing database connection...');
        // Retry after 2 seconds
        setTimeout(checkConnection, 2000);
      } else {
        setConnectionStatus('offline');
        setConnectionError(data.error || `Server responded with status ${res.status}`);
      }
    } catch (e: any) {
      setConnectionStatus('offline');
      setConnectionError(e.message || 'Connection failed');
    }
  };

  const fetchTasks = async () => {
    if (!currentUser) return;
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/tasks`, {
      headers: { 'x-user-id': String(currentUser.id ?? '') }
    });
    if (res.ok && Array.isArray(data)) setTasks(data);
  };

  const fetchSettings = async () => {
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/settings`);
    if (res.ok) {
      if (data.booking) setAppSettings(data.booking);
      if (data.auth) setAuthSettings(data.auth);
      if (data.clinic) setClinicProfile(data.clinic);
      if (data.roles) setRolesConfig(data.roles);
      if (data.referral) setReferralSettings(data.referral);
    }
  };

  const getAvailableTimeSlots = (serviceId: string, branchName: string, date: string) => {
    const s = services.find(srv => String(srv.id) === String(serviceId));
    if (!s) return [];
    
    const bSched = (s.branches && branchName) ? (s.branches as any)[branchName] : null;
    
    // Check overall limit if enabled
    if (s.overall_limit_enabled && s.overall_limit !== null) {
      const totalBookings = referrals.filter(r => r.service_id === s.id && r.status !== 'cancelled').length;
      if (totalBookings >= s.overall_limit) return [];
    }

    // Check if date is within service start/end date if they exist
    if (s.start_date && date < s.start_date) return [];
    if (s.end_date && date > s.end_date) return [];

    // Check branch schedule
    if (bSched) {
      // Check branch start/end date
      if (bSched.startDate && date < bSched.startDate) return [];
      if (bSched.endDate && date > bSched.endDate) return [];

      // Check days of week
      if (bSched.days && bSched.days.length > 0 && date) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        // Use local date parts to avoid timezone issues
        const [y, m, d] = date.split('-').map(Number);
        const selectedDay = dayNames[new Date(y, m - 1, d).getDay()];
        if (!bSched.days.includes(selectedDay)) return [];
      }

      // Check blocked dates (all-day)
      if (bSched.blockedDates && date) {
        const isAllDayBlocked = bSched.blockedDates.some((bd: any) => bd.date === date && bd.type === 'all-day');
        if (isAllDayBlocked) return [];
      }
    }
    
    let start = 9;
    let end = 18;
    if (bSched?.startTime) start = parseInt(bSched.startTime.split(':')[0]);
    if (bSched?.endTime) end = parseInt(bSched.endTime.split(':')[0]);

    const slots = [];
    for (let i = start; i < end; i++) {
      const time = `${String(i ?? 0).padStart(2, '0')}:00`;
      
      // Check blocked times for this specific date
      if (bSched && bSched.blockedDates && date) {
        const isBlocked = bSched.blockedDates.some((bd: any) => 
          bd.date === date && 
          bd.type === 'time-range' && 
          bd.startTime && bd.endTime &&
          time >= bd.startTime && time < bd.endTime
        );
        if (isBlocked) continue;
      }

      // Check max slots if limitBookings is enabled
      if (bSched?.limitBookings && bSched.maxSlots > 0 && date) {
        const existingCount = referrals.filter(r => 
          r.service_id === s.id && 
          r.branch === branchName && 
          r.appointment_date === date && 
          r.booking_time === time &&
          r.status !== 'cancelled'
        ).length;
        if (existingCount >= bSched.maxSlots) continue;
      }
      
      slots.push(time);
    }
    return slots;
  };

  const fetchPromotions = async () => {
    console.log('fetchPromotions() called');
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/special-offers`);
    if (res.ok && Array.isArray(data)) {
      console.log(`Fetched ${data?.length || 0} promotions from backend:`, data);
      setPromoServices(data || []);
      
      // Also update the main promotions state used in the UI
      const mappedPromotions = data.map((p: any) => ({
        id: p.id,
        title: p.title || p.name,
        description: p.description || '',
        image_url: p.posterImages?.[0] || p.image_url,
        start_date: p.start_date || new Date().toISOString(),
        end_date: p.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      }));
      if (mappedPromotions.length > 0) {
        setPromotions(mappedPromotions);
      }
    } else {
      console.error('Failed to fetch promotions from backend', data);
    }
  };

  useEffect(() => {
    if (currentUser) {
      console.log('Current user detected:', currentUser.email, currentUser.role, currentUser.branch);
      fetchReferrals();
      if (currentUser.role === 'admin' || currentUser.role === 'manager') {
        fetchWarmLeads();
      }
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.branch, branchFilter]);

  useEffect(() => {
    if (currentUser) {
      fetchStaff();
      if (currentUser.role === 'admin' || currentUser.role === 'manager') {
        fetchBranchChangeRequests();
      }
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    let interval: any;
    if (activeTab === 'admin' && (currentUser?.role === 'admin' || currentUser?.role === 'manager')) {
      // Poll every 30 seconds for new applications
      interval = setInterval(fetchStaff, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, currentUser?.role]);

  useEffect(() => {
    if (activeTab === 'communication' && rolesConfig[currentUser?.role || '']?.canManageCommunication) {
      safeFetch(`${apiBaseUrl}/api/feedback`).then(({ res, data }) => {
        if (res.ok && data) setFeedbackList(data);
      });
    }
  }, [activeTab, currentUser]);

  const fetchStaff = async () => {
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff`);
    if (res.ok && Array.isArray(data)) {
      setStaffList(data);
      if (currentUser) {
        const updatedMe = data.find((s: Staff) => s.id === currentUser.id);
        if (updatedMe && JSON.stringify(updatedMe) !== JSON.stringify(currentUser)) {
          setCurrentUser(updatedMe);
        }
      }
    }
  };

  const checkBranchAccess = (item: Service) => {
    if (!currentUser) return true;
    if (currentUser.role === 'admin' || currentUser.role === 'manager') return true;
    
    let branches: any = item.branches;
    
    // Handle stringified JSON if it wasn't parsed by the server
    if (typeof branches === 'string' && branches.trim() !== '') {
      try {
        branches = JSON.parse(branches);
      } catch (e) {
        // If it's not JSON, maybe it's a comma-separated string?
        if (branches.includes(',')) {
          branches = branches.split(',').map(b => b.trim());
        } else {
          branches = [branches.trim()];
        }
      }
    }

    // If no branches are specified, it's available to all
    if (!branches || (Array.isArray(branches) && branches.length === 0)) return true;
    
    const userBranch = currentUser.branch?.trim();
    // If user has no branch assigned, they can see everything (or we can restrict, but let's be permissive for now)
    if (!userBranch || userBranch.toLowerCase() === 'undefined' || userBranch.toLowerCase() === 'null') return true;

    if (Array.isArray(branches)) {
      return branches.some(b => {
        if (typeof b === 'string') return b.trim().toLowerCase() === userBranch.toLowerCase();
        if (typeof b === 'object' && b !== null) return String(b.name || b.id || '').trim().toLowerCase() === userBranch.toLowerCase();
        return false;
      });
    }
    
    // Handle object format { "BranchName": { active: true } }
    if (typeof branches === 'object' && branches !== null) {
      const branchKeys = Object.keys(branches);
      if (branchKeys.length === 0) return true;
      
      // Try exact match first
      if (branches[userBranch] && branches[userBranch].active) return true;
      
      // Try case-insensitive match
      const matchingKey = branchKeys.find(k => k.trim().toLowerCase() === userBranch.toLowerCase());
      if (matchingKey && branches[matchingKey].active) return true;
    }
    
    return false;
  };

  const fetchServices = async () => {
    console.log('fetchServices() called');
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/services`);
      if (res.ok && Array.isArray(data)) {
        console.log(`Fetched ${data.length} services:`, data);
        setServices(data);
        const newCategories = Array.from(new Set(data.map((s: Service) => s.category).filter(Boolean)));
        setServiceCategories(prev => {
          // Filter out old categories that are no longer in the database or have been renamed
          const filteredPrev = prev.filter(c => c !== 'Healthscreening' && c !== 'Health Screening');
          const combined = Array.from(new Set([...filteredPrev, ...newCategories]));
          console.log('Updated serviceCategories:', combined);
          return combined;
        });
      } else {
        console.error('Failed to fetch services', { status: res.status, data });
      }
    } catch (err) {
      console.error('Error in fetchServices:', err);
    }
  };

  const fetchBranches = async () => {
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/branches`);
      if (res.ok) {
        setBranches(Array.isArray(data) ? data : []);
        setDbError(null);
      } else {
        console.error('Failed to fetch branches:', data.error);
        if (res.status === 412 || data.isMissingTable || data.error?.includes('Could not find the table') || data.error?.includes('relation "branches" does not exist')) {
          setDbError('branches');
        }
        setBranches([]);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      setBranches([]);
    }
  };

  const fetchBranchChangeRequests = async () => {
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/branch-change-requests`);
    if (res.ok) setBranchChangeRequests(data);
  };

  const fetchReferrals = async () => {
    if (!currentUser) return;
    
    let url = (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'receptionist') 
      ? `${apiBaseUrl}/api/referrals?requesterRole=${currentUser.role}&requesterBranch=${currentUser.branch}` 
      : `${apiBaseUrl}/api/referrals?staffId=${currentUser.id}`;
    
    if (currentUser.role === 'receptionist') {
      url += '&upcoming=true';
    }
    
    if (branchFilter !== 'all' && (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'receptionist')) {
      url += `&branch=${branchFilter}`;
    }

    const { res, data } = await safeFetch(url);
    if (res.ok && Array.isArray(data)) setReferrals(data);
  };

  const fetchWarmLeads = async () => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) return;
    try {
      const { data } = await supabase.from('warm_leads').select('*').order('created_at', { ascending: false });
      if (data) setWarmLeads(data);
    } catch (error) {
      console.error('Error fetching warm leads:', error);
    }
  };

  const handleUpdateWarmLeadStatus = async (id: any, status: string) => {
    try {
      await supabase.from('warm_leads').update({ status }).eq('id', id);
      fetchWarmLeads();
    } catch (error) {
      console.error('Error updating warm lead status:', error);
    }
  };

  const handleRefresh = async () => {
    if (!currentUser) return;
    const promises = [
      fetchReferrals(),
      fetchPromotions(),
      fetchServices(),
      fetchTasks(),
      fetchNotifications(),
      fetchStaff(),
      fetchWarmLeads()
    ];
    if (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'receptionist') {
      promises.push(fetchBranches());
    }
    if (currentUser.role === 'admin' || currentUser.role === 'manager') {
      promises.push(fetchSettings(), fetchBranchChangeRequests());
    }
    await Promise.all(promises);
  };

  useEffect(() => {
    if (window.location.pathname === '/reset-password' || window.location.hash.includes('type=recovery')) {
      setShowResetPasswordModal(true);
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  const handleGetStarted = () => {
    setWelcomeScreenClass('fade-out');
    setTimeout(() => {
      setWelcomeScreenClass('hidden');
      setOnboardingStep('auth');
      setLoginScreenClass('fade-in');
    }, 400);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) return;
    
    setIsSendingForgotPassword(true);
    setForgotPasswordStatus(null);
    
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) {
          throw error;
        }
        
        setForgotPasswordStatus({ type: 'success', message: 'Password reset link sent to your email.' });
        setTimeout(() => {
          setShowForgotPasswordModal(false);
          setForgotPasswordEmail('');
          setForgotPasswordStatus(null);
        }, 3000);
      } else {
        const { res, data } = await safeFetch(`${apiBaseUrl}/api/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotPasswordEmail }),
        });
        
        if (res.ok) {
          setForgotPasswordStatus({ type: 'success', message: 'Password reset link sent to your email.' });
          setTimeout(() => {
            setShowForgotPasswordModal(false);
            setForgotPasswordEmail('');
            setForgotPasswordStatus(null);
          }, 3000);
        } else {
          setForgotPasswordStatus({ type: 'error', message: data?.error || 'Failed to send reset link.' });
        }
      }
    } catch (error: any) {
      setForgotPasswordStatus({ type: 'error', message: error.message || 'An error occurred.' });
    } finally {
      setIsSendingForgotPassword(false);
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
        setTimeout(() => {
          setShowResetPasswordModal(false);
          setResetPasswordNewPassword('');
          setResetPasswordStatus(null);
          // Redirect to login and clear URL
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/');
          }
          setAuthMode('login');
        }, 3000);
      } else {
        // Local fallback
        setResetPasswordStatus({ type: 'success', message: 'Password updated successfully. Redirecting to login...' });
        setTimeout(() => {
          setShowResetPasswordModal(false);
          setResetPasswordNewPassword('');
          setResetPasswordStatus(null);
          // Redirect to login and clear URL
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/');
          }
          setAuthMode('login');
        }, 3000);
      }
    } catch (error: any) {
      setResetPasswordStatus({ type: 'error', message: error.message || 'Failed to update password.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setResendStatus(null);
    setShowResendButton(false);
    setIsSubmitting(true);
    console.log('Login attempt started', { email: authEmail, apiBaseUrl });
    
    try {
      // Strictly use Supabase for authentication
      if (!isSupabaseConfigured) {
        throw new Error('Authentication service is not configured. Please check your settings.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (error) {
        if (error.message === 'Email not confirmed') {
          // If for some reason they are still unconfirmed, we can auto-confirm them via the backend
          // But for now, we'll just show the error and let them know they need to register properly
          throw new Error('Please confirm your email address before logging in, or re-register to auto-confirm.');
        }
        
        if (error.message === 'Failed to fetch' || error.message?.includes('aborted')) {
          throw new Error('Connection failed. If you are on a custom domain, ensure it is added to your Supabase Site URLs. Otherwise, check your Supabase URL and Key.');
        }
        throw error;
      }

      if (data.user?.email) {
        const userProfile = await fetchStaffByEmail(data.user.email, data.user);
        setShowWelcome(true);
        if (userProfile?.role === 'admin' || userProfile?.role === 'manager') {
          setActiveTab('admin');
        } else if (userProfile?.role === 'receptionist') {
          setActiveTab('receptionist');
        } else {
          setActiveTab('dashboard');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message === 'Failed to fetch' || error.message?.includes('aborted') || error.message?.includes('Connection failed')) {
        setAuthError('Connection failed. If you are using a custom domain, please add it to your Supabase Dashboard under Authentication -> URL Configuration -> Site URL. Otherwise, check your Supabase URL and Key in Settings.');
      } else if (error.message === 'Invalid login credentials') {
        setAuthError('Invalid login credentials');
      } else {
        setAuthError(error.message || 'Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!authEmail) {
      setAuthError('Please enter your email address first.');
      return;
    }
    setResendStatus(null);
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: authEmail,
      });
      if (error) throw error;
      setResendStatus({ type: 'success', message: 'Confirmation email resent! Please check your inbox.' });
      setShowResendButton(false);
      setAuthError('');
    } catch (error: any) {
      console.error('Resend error:', error);
      setResendStatus({ type: 'error', message: error.message || 'Failed to resend confirmation email.' });
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
      console.log('Registration attempt started', { email: authEmail, name: authName });
      
      if (!isSupabaseConfigured) {
        throw new Error('Authentication service is not configured. Please check your settings.');
      }

      // 1. Register in our backend
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

      // 2. Sign in with Supabase
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (signInError) {
        // If sign in fails, still show success but ask to login
        console.warn('Auto-login failed after registration:', signInError);
        setAuthError('Registration successful! Please log in.');
        setAuthMode('login');
      } else {
        // Sign in successful
        console.log('Registration and auto-login successful');
        setCurrentUser(data);
        localStorage.setItem('currentUser', JSON.stringify(data));
        setShowWelcome(true);
        if (data.role === 'admin' || data.role === 'manager') {
          setActiveTab('admin');
        } else if (data.role === 'receptionist') {
          setActiveTab('receptionist');
        } else {
          setActiveTab('dashboard');
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setAuthError(error.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Error during Supabase signOut:', error);
    } finally {
      // Manually clear Supabase auth tokens from local storage just in case signOut failed
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
      
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      setActiveTab('dashboard');
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
      setAuthBranch('');
      setAuthPhone('');
      setAuthError('');
    }
  };

  const generatePayoutCSV = (metadata: typeof payoutMetadata) => {
    const staffToPay = staffPerformance.filter(s => selectedPayoutStaff.includes(s.id) && (s.approved_earnings > 0 || s.pending_earnings > 0));
    if (staffToPay.length === 0) {
      alert('No staff selected or no payable earnings to pay.');
      return;
    }

    // Maybank2u Biz Format (M2U Biz)
    const csvRows = [];
    
    // Row 1 empty
    csvRows.push([]);
    
    // Header Section
    csvRows.push(['Employer Info :']);
    csvRows.push(['Crediting Date (eg. dd/MM/yyyy)', metadata.creditingDate]);
    csvRows.push(['Payment Reference', metadata.paymentReference]);
    csvRows.push(['Payment Description', metadata.paymentDescription]);
    csvRows.push(['Bulk Payment Type', metadata.bulkPaymentType]);
    csvRows.push([]); // Row 7 empty
    
    // Data Header (Row 8)
    csvRows.push([
      'Beneficiary Name',
      'Beneficiary Bank',
      'Beneficiary Account No',
      'ID Type',
      'ID Number',
      'Payment Amount',
      'Payment Reference',
      'Payment Description'
    ]);

    // Data Rows
    staffToPay.forEach(s => {
      csvRows.push([
        s.name,
        s.bank_name || '',
        s.bank_account_number || '',
        s.id_type || 'NRIC',
        s.id_number || '',
        ((s.approved_earnings || 0) + (s.pending_earnings || 0)).toFixed(2),
        metadata.paymentReference,
        metadata.paymentDescription
      ]);
    });

    // Join with commas and newlines
    const csvContent = csvRows.map(row => 
      row.map(cell => {
        const cellStr = String(cell);
        // Escape commas and quotes if necessary
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(",")
    ).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `M2U_Bulk_Payment_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowPayoutModal(false);
  };

  const processPayouts = async () => {
    if (selectedPayoutStaff.length === 0) return;
    
    showConfirm(
      'Process Payouts',
      'Are you sure you want to mark these payouts as processed? This will update the status of all approved and pending referrals for the selected staff.',
      async () => {
        const staffToPay = staffPerformance.filter(s => selectedPayoutStaff.includes(s.id) && (s.approved_earnings > 0 || s.pending_earnings > 0));
        
        for (const staff of staffToPay) {
          const payableRefs = referrals.filter(r => String(r.staff_id) === String(staff.id) && ['paid_completed', 'approved'].includes(r.status));
          for (const ref of payableRefs) {
            await safeFetch(`${apiBaseUrl}/api/referrals/${ref.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'payout_processed' })
            });
          }
        }
        
        fetchReferrals();
        setSelectedPayoutStaff([]);
        showNotification('success', 'Payouts processed successfully.');
      }
    );
  };

  const checkPromoCode = async (code: string) => {
    setWalkInPromoCode(code);
    if (code.length >= 3) {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff?promoCode=${code}`);
      if (res.ok) setWalkInStaff(data);
    } else {
      setWalkInStaff(null);
    }
  };

  const handleSubmitReferral = async (e: React.FormEvent, publicFormData?: any) => {
    e.preventDefault();
    
    const data = publicFormData || {
      patientName,
      patientPhone,
      patientIC,
      patientAddress,
      patientType,
      appointmentDate,
      bookingTime,
      selectedService,
      selectedBranch
    };

    let staffId = isPublicBooking ? data.referringStaff?.id : (activeTab === 'receptionist' ? walkInStaff?.id : currentUser?.id);
    let referralCode = isPublicBooking ? data.providedRefCode : null;

    // If public booking and we don't have staffId but we have a ref code in URL, try to fetch it right now
    if (isPublicBooking) {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        referralCode = ref;
        try {
          const { res, data: lookupData } = await safeFetch(`${apiBaseUrl}/api/affiliate-lookup/${ref}`);
          if (res.ok && lookupData && lookupData.id) {
            staffId = lookupData.id;
          }
        } catch (err) {
          console.error('Failed to lookup affiliate during submission:', err);
        }
      }
    }
    
    // For public bookings, staffId is optional. For staff/receptionist, it's required.
    if ((!isPublicBooking && !staffId) || !data.selectedService || !data.patientName) return false;

    // Check overall limit
    const s = services.find(srv => String(srv.id) === String(data.selectedService));
    if (s?.overall_limit_enabled && s.overall_limit !== null) {
      const totalBookings = referrals.filter(r => r.service_id === s.id && r.status !== 'cancelled').length;
      if (totalBookings >= s.overall_limit) {
        alert('This service has reached its overall booking limit.');
        return false;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        staff_id: staffId,
        service_id: data.selectedService,
        patient_name: data.patientName,
        patient_phone: data.patientPhone,
        patient_ic: data.patientIC,
        patient_address: data.patientAddress,
        patient_type: data.patientType,
        appointment_date: data.appointmentDate,
        booking_time: data.bookingTime,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        created_by: currentUser?.id,
        branch: data.selectedBranch || (isPublicBooking ? data.referringStaff?.branch : currentUser?.branch)
      };

      if (referralCode) {
        payload.referral_code = referralCode;
      }

      const url = data.draftReferralId ? `${apiBaseUrl}/api/referrals/${data.draftReferralId}` : `${apiBaseUrl}/api/referrals`;
      const method = data.draftReferralId ? 'PATCH' : 'POST';

      const { res, data: resultData } = await safeFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        if (resultData.fraudFlags && resultData.fraudFlags.length > 0) {
          alert(`Referral submitted with flags: ${resultData.fraudFlags.join(', ')}`);
        }

        if (!isPublicBooking) {
          setPatientName('');
          setPatientPhone('');
          setPatientIC('');
          setPatientAddress('');
          setPatientType('new');
          setAppointmentDate('');
          setBookingTime('');
          setSelectedService('');
          setWalkInPromoCode('');
          setWalkInStaff(null);
          fetchReferrals();
        }
        return true;
      } else {
        alert('Submission Failed: ' + (resultData.error || 'Unknown Error') + (resultData.details ? ' | Details: ' + JSON.stringify(resultData.details) : ''));
        return false;
      }
    } catch (error: any) {
      console.error(error);
      alert('Submission Failed: ' + error.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedLead = async (e?: React.FormEvent | React.MouseEvent) => {
    // This function has been moved to PublicBookingUI.tsx
  };



  const handleUpdateStatus = async (id: number, status: string, additionalData: any = {}) => {
    try {
      const payload = { 
        status,
        ...additionalData,
        verified_by: (currentUser?.role === 'receptionist' || currentUser?.role === 'manager' || currentUser?.role === 'admin') ? currentUser.id : undefined
      };
      
      console.log('Updating status:', { id, payload });
      
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/referrals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        fetchReferrals();
        fetchStaff();
      } else {
        const errorMsg = data.error || 'Update failed';
        console.error('Status update failed:', { id, status, data });
        alert(`Status update failed: ${errorMsg}\n\nDetails: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error('Error in handleUpdateStatus:', error);
      alert(`An error occurred while updating status: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleClinicStatusUpdate = async (id: number, newStatus: string) => {
    try {
      const payload = { 
        status: newStatus,
        verified_by: (currentUser?.role === 'receptionist' || currentUser?.role === 'manager' || currentUser?.role === 'admin') ? currentUser.id : undefined
      };
      
      console.log('Updating clinic status:', { id, payload });
      
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/referrals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        fetchReferrals();
        fetchStaff();
      } else {
        const errorMsg = data.error || 'Update failed';
        console.error('Status update failed:', { id, newStatus, data });
        alert(`Status update failed: ${errorMsg}\n\nDetails: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error('Error in handleClinicStatusUpdate:', error);
      alert(`An error occurred while updating status: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDeleteReferral = async (id: number) => {
    showConfirm(
      'Delete Referral',
      'Are you sure you want to delete this referral? This action cannot be undone.',
      async () => {
        const { res, data } = await safeFetch(`${apiBaseUrl}/api/referrals/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          fetchReferrals();
          fetchStaff();
        } else {
          showNotification('error', data.error || 'Delete failed');
        }
      }
    );
  };

  const handleUpdateProfile = async (profileData: Partial<Staff>) => {
    if (!currentUser) return;
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/${currentUser.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        setCurrentUser(data);
        setSaveStatus({ type: 'success', message: 'Profile updated successfully' });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus({ type: 'error', message: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error(error);
      setSaveStatus({ type: 'error', message: 'Failed to update profile' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Check if Supabase is actually configured
    if (isPlaceholder) {
      console.log('Supabase is not configured. Using local backend and mock storage.');
      return;
    }

    // Check if user has a Supabase session
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Supabase session check error during upload:', error);
      }
      if (!session) {
        console.warn('No active Supabase session. Upload might fail if RLS policies require authentication.');
      }
    } catch (err) {
      console.warn('Failed to get Supabase session:', err);
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // We'll try 'clinic-assets' first, then 'CLINIC-ASSETS' if it fails
      const bucketNames = ['clinic-assets', 'CLINIC-ASSETS'];
      let uploadError = null;
      let successfulBucket = '';

      for (const bucket of bucketNames) {
        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (!error) {
          successfulBucket = bucket;
          uploadError = null;
          break;
        }
        uploadError = error;
      }

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        if (uploadError.message.includes('bucket not found')) {
          throw new Error('Storage bucket "clinic-assets" not found. Please ensure you created it in Supabase and it is named exactly "clinic-assets" (lowercase).');
        }
        if (uploadError.message.includes('row-level security policy')) {
          throw new Error('Security Policy Error: Your Supabase bucket is locked. Please ensure you have added the "INSERT" and "SELECT" policies for "public" or "authenticated" users on the "clinic-assets" bucket.');
        }
        if (uploadError.message.includes('Failed to fetch')) {
          throw new Error('Network Error: Failed to upload image. This could be due to a slow connection, a large file size, or a CORS issue with your Supabase project.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(successfulBucket)
        .getPublicUrl(filePath);

      await handleUpdateProfile({ profile_picture: publicUrl });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert('Upload Error: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.name) return;
    
    // Ensure allowances is an object, not undefined
    const serviceToSave = {
      ...editingService,
      allowances: editingService.allowances || {}
    };
    
    console.log('Saving service, serviceToSave:', JSON.stringify(serviceToSave, null, 2));
    if (!serviceToSave.category) {
      console.warn('Saving service without category!');
    }
    setIsSavingSetup(true);
    try {
      const method = serviceToSave.id ? 'PATCH' : 'POST';
      const url = serviceToSave.id ? `${apiBaseUrl}/api/services/${serviceToSave.id}` : `${apiBaseUrl}/api/services`;
      const { res, data } = await safeFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceToSave)
      });
      if (res.ok) {
        setEditingService(null);
        fetchServices();
      } else {
        const errorMsg = data?.message || data?.error || 'Failed to save service';
        showNotification('error', errorMsg);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingSetup(false);
    }
  };

  const handleDeleteService = async (id: number) => {
    showConfirm(
      'Delete Service',
      'Are you sure you want to delete this service?',
      async () => {
        const { res, data } = await safeFetch(`${apiBaseUrl}/api/services/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchServices();
        } else {
          showNotification('error', data?.error || 'Failed to delete service. It may be referenced by existing referrals.');
        }
      }
    );
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff?.name || !editingStaff?.email) return;
    setIsSavingSetup(true);
    try {
      const method = editingStaff.id ? 'PATCH' : 'POST';
      const url = editingStaff.id ? `${apiBaseUrl}/api/staff/${editingStaff.id}` : `${apiBaseUrl}/api/staff`;
      const { res, data } = await safeFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingStaff)
      });
      if (res.ok) {
        setEditingStaff(null);
        fetchStaff();
      } else {
        const errorMsg = data?.message || data?.error || 'Failed to save staff';
        showNotification('error', errorMsg);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingSetup(false);
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim() || !currentUser) return;
    
    setIsSendingFeedback(true);
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: currentUser.id,
          staff_name: currentUser.name,
          staff_email: currentUser.email,
          message: feedbackMessage
        })
      });

      if (res.ok) {
        showNotification('success', 'Feedback sent successfully! Thank you.');
        setFeedbackMessage('');
      } else {
        showNotification('error', data?.error || 'Failed to send feedback');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'An error occurred while sending feedback');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const handleAdminResetPassword = (staffId: number, email: string) => {
    setResetPasswordModal({ isOpen: true, staffId, email });
  };

  const executeAdminResetPassword = async () => {
    if (!resetPasswordModal.staffId) return;
    
    setResetPasswordModal(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/admin/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: resetPasswordModal.staffId }),
      });

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to reset password');
      }

      setResetPasswordModal(prev => ({ ...prev, isLoading: false, tempPassword: data.tempPassword }));
      
    } catch (error) {
      console.error('Error resetting password:', error);
      setResetPasswordModal(prev => ({ ...prev, isLoading: false, error: error instanceof Error ? error.message : 'Failed to reset password' }));
    }
  };

  const handleDeleteStaff = async (id: number) => {
    showConfirm(
      'Trash Staff',
      'Are you sure you want to move this staff member to the trash bin?',
      async () => {
        const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchStaff();
        } else {
          showNotification('error', data.error || 'Delete failed');
        }
      }
    );
  };

  const handleRestoreStaff = async (id: number) => {
    showConfirm(
      'Restore Staff',
      'Are you sure you want to restore this staff member?',
      async () => {
        const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/${id}/restore`, { method: 'POST' });
        if (res.ok) {
          fetchStaff();
        } else {
          showNotification('error', data.error || 'Restore failed');
        }
      }
    );
  };

  const handlePermanentDeleteStaff = async (id: number) => {
    showConfirm(
      'Permanent Delete',
      'Are you sure you want to PERMANENTLY delete this staff member? This action cannot be undone.',
      async () => {
        const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/${id}/permanent`, { method: 'DELETE' });
        if (res.ok) {
          fetchStaff();
        } else {
          showNotification('error', data.error || 'Permanent delete failed');
        }
      }
    );
  };

  const handleRejectStaff = async (id: number) => {
    showConfirm(
      'Reject Staff',
      'Reject this application? The user will not be able to access the portal.',
      async () => {
        const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employment_status: 'rejected', is_approved: 0 })
        });
        if (res.ok) {
          fetchStaff();
          showNotification('success', 'Staff application rejected');
        } else {
          showNotification('error', data.error || 'Rejection failed');
        }
      }
    );
  };

  const handleResetPassword = async (id: number) => {
    showConfirm(
      'Reset Password',
      'Reset password to default "password123"?',
      async () => {
        const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/${id}/reset-password`, { method: 'POST' });
        if (res.ok) {
          showNotification('success', 'Password reset successfully');
        } else {
          showNotification('error', data.error || 'Reset failed');
        }
      }
    );
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordForm.new.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: currentUser?.id,
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new
        })
      });

      if (res.ok) {
        showNotification('success', 'Password changed successfully');
        setShowPasswordModal(false);
        setPasswordForm({ current: '', new: '', confirm: '' });
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError('An unexpected error occurred');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const taskData = {
      title: formData.get('title'),
      description: formData.get('description'),
      due_date: taskDueDate ? taskDueDate.toISOString().split('T')[0] : null,
      assigned_to: formData.get('assigned_to') || null,
    };

    const method = editingTask?.id ? 'PATCH' : 'POST';
    const url = editingTask?.id ? `/api/tasks/${editingTask.id}` : '/api/tasks';

    const { res } = await safeFetch(editingTask?.id ? `${apiBaseUrl}/api/tasks/${editingTask.id}` : `${apiBaseUrl}/api/tasks`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });

    if (res.ok) {
      setShowTaskModal(false);
      setEditingTask(null);
      fetchTasks();
    }
  };

  const handleDeleteTask = async (id: number) => {
    showConfirm(
      'Delete Task',
      'Delete this task?',
      async () => {
        const { res, data } = await safeFetch(`${apiBaseUrl}/api/tasks/${id}`, { method: 'DELETE' });
        if (res.ok) fetchTasks();
        else showNotification('error', data.error || 'Delete failed');
      }
    );
  };

  const handleUpdateTaskStatus = async (id: number, status: string) => {
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) fetchTasks();
    else alert(data.error || 'Update failed');
  };

  const handleApproveStaff = async (id: number, isApproved: boolean) => {
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_approved: isApproved })
    });
    if (res.ok) fetchStaff();
    else alert(data.error || 'Approval failed');
  };

  const exportToCSV = () => {
    const headers = currentUser?.role === 'admin' 
      ? ['Date', 'Patient Name', 'Patient Type', 'Service', 'Staff Name', 'Incentive ($)', 'Status']
      : ['Date', 'Patient Name', 'Patient Type', 'Service', 'Incentive ($)', 'Status'];

    const csvRows = referrals.map(ref => {
      const row = [
        ref.date,
        `"${ref.patient_name}"`,
        ref.patient_type || 'new',
        `"${ref.service_name}"`,
        ...(currentUser?.role === 'admin' ? [`"${ref.staff_name}"`] : []),
        (ref.commission_amount || 0).toFixed(2),
        ref.status
      ];
      return row.join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `referrals_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isPublicBooking) {
    return (
      <PublicBookingUI 
        services={services}
        branches={branches}
        clinicProfile={clinicProfile}
        handleSubmitReferral={handleSubmitReferral}
        apiBaseUrl={apiBaseUrl}
        getAvailableTimeSlots={getAvailableTimeSlots}
        Logo={Logo}
        isSubmitting={isSubmitting}
        safeFetch={safeFetch}
      />
    );
  }

  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-violet-500 rounded-full animate-spin"></div>
          <p className="text-zinc-500 font-black text-[10px] uppercase tracking-widest">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Welcome / Onboarding Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-eggshell flex items-center justify-center p-0 sm:p-4 font-sans">
        <div 
          id="welcome-screen"
          className={`w-full max-w-md h-screen sm:h-[90vh] bg-eggshell sm:rounded-[3rem] shadow-2xl overflow-y-auto flex flex-col relative ${welcomeScreenClass}`}
        >
          {/* Topographic Background */}
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="mb-6">
                <Logo className="w-16 h-16" logoUrl={clinicProfile.logoUrl} />
              </div>
              <h1 className="text-5xl font-black text-twilight-indigo mb-2 tracking-tight leading-tight">Welcome to AraPower</h1>
              <p id="welcome-quote" className="text-twilight-indigo italic mb-12 animate-fade-in opacity-0 fill-mode-forwards">
                {welcomeQuote}
              </p>
              
              <div className="flex items-center justify-end gap-4">
                <button 
                  onClick={handleGetStarted}
                  className="flex items-center gap-3 group"
                >
                  <span className="text-twilight-indigo font-bold text-lg group-hover:text-twilight-indigo transition-colors">Get Started</span>
                      <div className="w-14 h-14 bg-burnt-peach rounded-full flex items-center justify-center text-white shadow-lg shadow-burnt-peach/30 group-hover:scale-110 transition-transform">
                    <ArrowRight size={24} />
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        <div 
          id="login-screen"
          className={`w-full max-w-md h-screen sm:h-[90vh] bg-eggshell sm:rounded-[3rem] shadow-2xl overflow-y-auto flex flex-col relative ${loginScreenClass}`}
        >
          {/* Topographic Background */}
          <div className="relative w-full h-[45%] shrink-0 overflow-hidden z-0 bg-muted-teal border-b-0 shadow-none">
            <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M10,10 Q30,0 50,10 T90,10" fill="none" stroke="#F4F1DE" strokeWidth="1" />
              <path d="M0,30 Q40,20 80,30 T120,30" fill="none" stroke="#F2CC8F" strokeWidth="1" />
              <path d="M-20,50 Q20,40 60,50 T140,50" fill="none" stroke="#F4F1DE" strokeWidth="1" />
            </svg>
            <svg className="absolute bottom-0 w-full h-32 text-eggshell fill-current translate-y-[1px] scale-y-[1.01]" viewBox="0 0 1440 320" preserveAspectRatio="none">
              <path d="M0,128C480,256,960,0,1440,128L1440,320L0,320Z"></path>
            </svg>
          </div>

          <div className="flex-1 flex flex-col px-8 pb-10 relative z-10 border-t-0 shadow-none">
            <div className="flex-1 flex flex-col justify-center py-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="mb-8"
              >
                <div className="mb-4">
                  <Logo className="w-12 h-12" logoUrl={clinicProfile.logoUrl} />
                </div>
                <h1 className="text-4xl font-black text-twilight-indigo mb-1">
                  {authMode === 'login' ? 'Sign in' : 'Sign up'}
                </h1>
                <div className="w-10 h-1 bg-apricot-cream rounded-full mb-4" />
              </motion.div>

              <AnimatePresence mode="wait">
                {authError && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 bg-rose-500 text-white text-xs font-bold rounded-2xl border border-rose-500 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="flex-1">{authError}</span>
                    </div>
                    {showResendButton && (
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={isSubmitting}
                        className="mt-2 py-2 px-4 bg-white text-rose-500 rounded-xl hover:bg-rose-50 transition-colors text-[10px] uppercase tracking-wider font-black self-start"
                      >
                        {isSubmitting ? 'Resending...' : 'Resend Confirmation Email'}
                      </button>
                    )}
                  </motion.div>
                )}

                {resendStatus && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mb-6 p-4 ${resendStatus.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'} text-white text-xs font-bold rounded-2xl flex items-center gap-3`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {resendStatus.message}
                  </motion.div>
                )}
              </AnimatePresence>

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
                    <div className="space-y-6 mb-8">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-twilight-indigo/60">Email</label>
                        <div className="flex items-center gap-3 border-b border-twilight-indigo/20 focus-within:border-burnt-peach pb-2 transition-colors">
                          <Mail size={18} className="text-twilight-indigo/40" />
                          <input 
                            type="email"
                            required
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            className="w-full bg-transparent focus:outline-none text-twilight-indigo placeholder-twilight-indigo/20 text-base"
                            placeholder="demo@email.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 relative">
                        <label className="block text-sm font-bold text-twilight-indigo/60">Password</label>
                        <div className="flex items-center gap-3 border-b border-twilight-indigo/20 focus-within:border-burnt-peach pb-2 transition-colors">
                          <Lock size={18} className="text-twilight-indigo/40" />
                          <input 
                            type={showPassword ? "text" : "password"}
                            required
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            className="w-full bg-transparent focus:outline-none text-twilight-indigo placeholder-twilight-indigo/20 text-base"
                            placeholder="enter your password"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-twilight-indigo/40 hover:text-twilight-indigo transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-10">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-burnt-peach border-burnt-peach' : 'border-twilight-indigo/20 group-hover:border-burnt-peach'}`}>
                          <input 
                            type="checkbox"
                            className="hidden"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          {rememberMe && <div className="w-2.5 h-2.5 bg-twilight-indigo rounded-sm" />}
                        </div>
                        <span className="text-xs font-bold text-twilight-indigo/60">Remember Me</span>
                      </label>
                      <button type="button" onClick={() => setShowForgotPasswordModal(true)} className="text-burnt-peach text-xs font-bold hover:underline">
                        Forgot Password?
                      </button>
                    </div>

                    <div className="mt-auto space-y-6">
                      <button 
                        type="submit"
                        className="w-full py-5 bg-burnt-peach text-white rounded-2xl font-black text-lg shadow-xl shadow-burnt-peach/30 hover:shadow-burnt-peach/40 transition-all active:scale-[0.98]"
                      >
                        Login
                      </button>
                      
                      <p className="text-center text-sm font-bold text-twilight-indigo/60">
                        Don't have an Account ? <button onClick={() => {
                          setAuthMode('register');
                          setAuthError('');
                          setResendStatus(null);
                          setShowResendButton(false);
                        }} className="text-burnt-peach hover:underline">Sign up</button>
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
                    <div className="space-y-4 mb-8">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-twilight-indigo/60">Full Name</label>
                        <div className="flex items-center gap-3 border-b border-twilight-indigo/20 focus-within:border-burnt-peach pb-1 transition-colors">
                          <User size={16} className="text-twilight-indigo/40" />
                          <input 
                            type="text"
                            required
                            value={authName}
                            onChange={(e) => setAuthName(e.target.value)}
                            className="w-full bg-transparent focus:outline-none text-twilight-indigo placeholder-twilight-indigo/20 text-base"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-twilight-indigo/60">Email</label>
                        <div className="flex items-center gap-3 border-b border-twilight-indigo/20 focus-within:border-burnt-peach pb-1 transition-colors">
                          <Mail size={16} className="text-twilight-indigo/40" />
                          <input 
                            type="email"
                            required
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            className="w-full bg-transparent focus:outline-none text-twilight-indigo placeholder-twilight-indigo/20 text-base"
                            placeholder="john@clinic.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-1 relative">
                        <label className="block text-xs font-bold text-twilight-indigo/60">Password</label>
                        <div className="flex items-center gap-3 border-b border-twilight-indigo/20 focus-within:border-burnt-peach pb-1 transition-colors">
                          <Lock size={16} className="text-twilight-indigo/40" />
                          <input 
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            className="w-full bg-transparent focus:outline-none text-twilight-indigo placeholder-twilight-indigo/20 text-base"
                            placeholder="Min. 6 characters"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-twilight-indigo/60">Branch</label>
                          <div className="border-b border-twilight-indigo/20 focus-within:border-burnt-peach pb-1 transition-colors">
                            <select 
                              required
                              value={authBranch}
                              onChange={(e) => setAuthBranch(e.target.value)}
                              className="w-full bg-transparent focus:outline-none text-twilight-indigo appearance-none text-base"
                            >
                              <option value="">Select</option>
                              {branches.map(b => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-twilight-indigo/60">Phone</label>
                          <div className="flex items-center gap-3 border-b border-twilight-indigo/20 focus-within:border-burnt-peach pb-1 transition-colors">
                            <Phone size={16} className="text-twilight-indigo/40" />
                            <input 
                              type="tel"
                              required
                              value={authPhone}
                              onChange={(e) => setAuthPhone(e.target.value)}
                              className="w-full bg-transparent focus:outline-none text-twilight-indigo placeholder-twilight-indigo/20 text-base"
                              placeholder="6012..."
                            />
                          </div>
                        </div>
                      </div>
                    <div className="mt-4 mb-4">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${agreedToTerms ? 'bg-burnt-peach border-burnt-peach' : 'border-twilight-indigo/20 group-hover:border-burnt-peach'}`}>
                          <input 
                            type="checkbox"
                            className="hidden"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                          />
                          {agreedToTerms && <div className="w-2.5 h-2.5 bg-twilight-indigo rounded-sm" />}
                        </div>
                        <span className="text-xs font-bold text-twilight-indigo/60 leading-tight">
                          I agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="text-burnt-peach hover:underline">User Agreement & Privacy Policy</button>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-auto space-y-4">
                    <button 
                      type="submit"
                      disabled={isSubmitting || !agreedToTerms}
                      className="w-full py-4 bg-burnt-peach text-white rounded-2xl font-black text-lg shadow-xl shadow-burnt-peach/30 hover:shadow-burnt-peach/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Creating...' : 'Sign Up'}
                    </button>
                      <p className="text-center text-sm font-bold text-twilight-indigo/60">
                        Already have an account? <button onClick={() => {
                          setAuthMode('login');
                          setAuthError('');
                          setResendStatus(null);
                          setShowResendButton(false);
                        }} className="text-burnt-peach hover:underline">Sign in</button>
                      </p>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Terms of Service Modal */}
        <AnimatePresence>
          {showTermsModal && (
            <motion.div 
              key="terms-modal-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            >
              <div
                onClick={() => setShowTermsModal(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                key="terms-modal"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-eggshell rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-8 border-b border-twilight-indigo/10 flex items-center justify-between bg-muted-teal text-eggshell">
                  <h2 className="text-2xl font-black tracking-tight">User Agreement</h2>
                  <button 
                    onClick={() => setShowTermsModal(false)}
                    className="w-10 h-10 rounded-full bg-eggshell/20 flex items-center justify-center hover:bg-eggshell/40 transition-colors"
                  >
                    <ArrowRight className="rotate-180" size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 prose prose-zinc max-w-none">
                  <div className="markdown-body">
                    <Markdown>{TERMS_OF_SERVICE}</Markdown>
                  </div>
                </div>
                <div className="p-6 bg-eggshell border-t border-twilight-indigo/10 flex justify-end">
                  <button
                    onClick={() => {
                      setAgreedToTerms(true);
                      setShowTermsModal(false);
                    }}
                    className="px-8 py-3 bg-burnt-peach text-white rounded-xl font-bold shadow-lg shadow-burnt-peach/20 hover:shadow-burnt-peach/30 transition-all active:scale-95"
                  >
                    I Agree
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forgot Password Modal */}
        <AnimatePresence>
          {showForgotPasswordModal && (
            <motion.div 
              key="forgot-password-container" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            >
              <div
                onClick={() => setShowForgotPasswordModal(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                key="forgot-password-modal"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-eggshell rounded-[2.5rem] shadow-2xl p-8 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Forgot Password</h3>
                  <button 
                    onClick={() => {
                      setShowForgotPasswordModal(false);
                      setForgotPasswordStatus(null);
                      setForgotPasswordEmail('');
                    }}
                    className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
                  >
                    <X size={20} className="text-zinc-500" />
                  </button>
                </div>
                <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                  Enter your email address below and we'll send you a link to reset your password.
                </p>
                
                {forgotPasswordStatus && (
                  <div className={`p-4 rounded-2xl text-sm font-bold ${forgotPasswordStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {forgotPasswordStatus.message}
                  </div>
                )}

                <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-zinc-700">Email Address</label>
                    <div className="flex items-center gap-3 border border-zinc-200 rounded-2xl px-4 py-3 bg-white focus-within:ring-2 focus-within:ring-burnt-peach transition-all">
                      <Mail size={18} className="text-zinc-400" />
                      <input 
                        type="email"
                        required
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full bg-transparent focus:outline-none text-zinc-900 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSendingForgotPassword}
                    className="w-full py-4 bg-burnt-peach text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-burnt-peach/30 hover:shadow-burnt-peach/40 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSendingForgotPassword ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>

                <div className="pt-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowForgotPasswordModal(false);
                      setForgotPasswordStatus(null);
                      setForgotPasswordEmail('');
                    }} 
                    className="w-full px-6 py-4 bg-zinc-100 text-zinc-900 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset Password Modal */}
        <AnimatePresence>
          {showResetPasswordModal && (
            <motion.div 
              key="reset-password-container" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            >
              <div
                onClick={() => setShowResetPasswordModal(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                key="reset-password-modal"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-eggshell rounded-[2.5rem] shadow-2xl p-8 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Reset Password</h3>
                  <button 
                    onClick={() => setShowResetPasswordModal(false)}
                    className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
                  >
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
                      <input 
                        type="password"
                        required
                        minLength={6}
                        value={resetPasswordNewPassword}
                        onChange={(e) => setResetPasswordNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full px-5 py-4 bg-white border border-zinc-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-burnt-peach focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-zinc-700">Confirm New Password</label>
                      <input 
                        type="password"
                        required
                        minLength={6}
                        value={confirmResetPasswordNewPassword}
                        onChange={(e) => setConfirmResetPasswordNewPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full px-5 py-4 bg-white border border-zinc-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-burnt-peach focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowResetPasswordModal(false);
                        setResetPasswordNewPassword('');
                        setConfirmResetPasswordNewPassword('');
                        setResetPasswordStatus(null);
                        if (typeof window !== 'undefined' && window.location.pathname === '/update-password') {
                          window.history.pushState({}, '', '/');
                        }
                      }} 
                      className="flex-1 px-6 py-4 bg-zinc-100 text-zinc-900 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isUpdatingPassword || !resetPasswordNewPassword || resetPasswordNewPassword.length < 6 || resetPasswordNewPassword !== confirmResetPasswordNewPassword} 
                      className="flex-1 px-6 py-4 bg-burnt-peach text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-burnt-peach/90 shadow-lg shadow-burnt-peach/20 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                      {isUpdatingPassword ? <RefreshCw size={18} className="animate-spin" /> : 'Update'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (showWelcome && currentUser) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-eggshell flex items-center justify-center p-0 sm:p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full max-w-md h-screen sm:h-[90vh] bg-eggshell sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative"
        >
          {/* Wavy Top Background - Same as Login */}
          <div className="relative w-full h-[45%] shrink-0 overflow-hidden z-0 bg-muted-teal">
            <svg className="absolute bottom-0 w-full h-40 text-eggshell/10 fill-current translate-y-4" viewBox="0 0 1440 320" preserveAspectRatio="none">
              <path d="M0,160C320,300,640,0,1440,160L1440,320L0,320Z"></path>
            </svg>
            <svg className="absolute bottom-0 w-full h-32 text-eggshell fill-current translate-y-[1px] scale-y-[1.01]" viewBox="0 0 1440 320" preserveAspectRatio="none">
              <path d="M0,224C480,350,960,100,1440,224L1440,320L0,320Z"></path>
            </svg>
          </div>

          <div className="flex-1 flex flex-col justify-center relative z-10 text-center px-8 pb-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8, type: 'spring' }}
              className="mb-8"
            >
              <h1 className="text-4xl font-black text-twilight-indigo tracking-tighter mb-2">Welcome to</h1>
              <h2 className="text-5xl font-black text-twilight-indigo tracking-tighter">AraPower</h2>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="flex flex-col items-center gap-4"
            >
              <p className="text-twilight-indigo/60 font-medium">Preparing your personalized dashboard...</p>
              <div className="w-48 h-1.5 bg-twilight-indigo/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.5, ease: "easeInOut" }}
                  className="h-full bg-burnt-peach"
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }
  
  if (currentUser.is_approved === 0 && currentUser.role !== 'admin') {
    console.log('Current User State (Pending Screen):', currentUser);
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-eggshell flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-eggshell p-12 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] max-w-md w-full border border-twilight-indigo/5 text-center"
        >
          <div className="w-20 h-20 bg-apricot-cream text-twilight-indigo rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Clock size={40} />
          </div>
          <p className="text-twilight-indigo text-[10px] font-black uppercase tracking-[0.3em] mb-8">Empowering Healthcare</p>
          <h1 className="text-2xl font-black text-twilight-indigo tracking-tight mb-4">Account Pending Approval</h1>
          <p className="text-twilight-indigo/60 text-sm leading-relaxed mb-8 font-medium">
            Hi <span className="text-twilight-indigo font-bold">{currentUser.name}</span>, your account has been created successfully. 
            However, an administrator needs to approve your profile before you can access the portal features.
          </p>
          <div className="p-4 bg-eggshell rounded-2xl border border-twilight-indigo/10 mb-8">
            <p className="text-[10px] font-black text-twilight-indigo/50 uppercase tracking-widest mb-1">Status</p>
            <p className="text-xs font-bold text-twilight-indigo uppercase">Under Review</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={async () => {
                const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/${currentUser.id}`);
                if (res.ok && data) {
                  if (data.is_approved) {
                    setCurrentUser(data);
                    localStorage.setItem('currentUser', JSON.stringify(data));
                  } else {
                    alert('Your account is still pending approval.');
                  }
                }
              }}
              className="bg-burnt-peach text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-burnt-peach/20"
            >
              Check Status
            </button>
            <button 
              onClick={handleLogout}
              className="bg-twilight-indigo text-eggshell py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-twilight-indigo/10"
            >
              Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Helper to get tier for a given count
  const getTier = (count: number) => {
    return [...TIERS].reverse().find(t => count >= t.min) || TIERS[0];
  };

  const activeStaffList = staffList.filter(s => s.employment_status !== 'deleted');
  const deletedStaffList = staffList.filter(s => s.employment_status === 'deleted');

  // Analytics calculation
  const staffPerformance = activeStaffList.map(staff => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const staffRefs = referrals.filter(r => String(r.staff_id) === String(staff.id));
    const monthlySuccessfulRefs = staffRefs.filter(r => 
      (r.status === 'completed' || r.status === 'paid_completed' || r.status === 'approved' || r.status === 'payout_processed') && 
      r.date.startsWith(currentMonth)
    ).length;

    const tier = getTier(monthlySuccessfulRefs);
    
    const totalRefs = staffRefs.length;
    
    // Calculate dynamic earnings based on status
    const pending_earnings = staffRefs
      .filter(r => r.status === 'completed' || r.status === 'paid_completed')
      .reduce((sum, r) => sum + (r.commission_amount * tier.bonus), 0);
    
    const approved_earnings = staffRefs
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + (r.commission_amount * tier.bonus), 0);
      
    const paid_earnings = staffRefs
      .filter(r => r.status === 'payout_processed')
      .reduce((sum, r) => sum + (r.commission_amount * tier.bonus), 0);

    const totalWithBonus = pending_earnings + approved_earnings + paid_earnings;

    return { 
      ...staff, 
      totalRefs, 
      monthlySuccessfulRefs, 
      earned: totalWithBonus, 
      tier,
      pending_earnings,
      approved_earnings,
      paid_earnings,
      lifetime_earnings: totalWithBonus
    };
  }).sort((a, b) => b.earned - a.earned);

  const currentUserStats = staffPerformance.find(s => s.id === currentUser?.id);

  const adminStats = {
    totalPayout: staffPerformance.reduce((sum, s) => sum + (s.paid_earnings || 0), 0),
    totalReferrals: referrals.length,
    activeStaff: new Set(referrals.map(r => r.staff_id)).size,
    pendingPayout: staffPerformance.reduce((sum, s) => sum + (s.approved_earnings || 0) + (s.pending_earnings || 0), 0)
  };

  const receptionistStats = {
    arrivedToday: referrals.filter(r => (r.status === 'completed' || r.status === 'paid_completed') && r.visit_date === new Date().toISOString().split('T')[0]).length,
    pendingVerifications: referrals.filter(r => r.status === 'entered').length
  };
  
  const totalEarned = currentUserStats?.lifetime_earnings || 0;
  const pendingAmount = currentUserStats?.pending_earnings || 0;
  const approvedAmount = currentUserStats?.approved_earnings || 0;
  const paidAmount = currentUserStats?.paid_earnings || 0;
  const nextTier = TIERS.find(t => (currentUserStats?.monthlySuccessfulRefs || 0) < t.min);
  const progressToNext = nextTier 
    ? ((currentUserStats?.monthlySuccessfulRefs || 0) / nextTier.min) * 100 
    : 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-burnt-peach/10 text-burnt-peach border border-burnt-peach/20';
      case 'entered': return 'bg-apricot-cream text-twilight-indigo';
      case 'completed': return 'bg-muted-teal/20 text-muted-teal';
      case 'paid_completed': return 'bg-muted-teal text-eggshell';
      case 'approved': return 'bg-burnt-peach text-white';
      case 'payout_processed': return 'bg-eggshell text-twilight-indigo border border-twilight-indigo/10';
      case 'rejected': return 'bg-rose-500 text-white';
      default: return 'bg-eggshell text-twilight-indigo';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'entered': return 'Entered';
      case 'completed': return 'Arrived';
      case 'paid_completed': return 'Paid';
      case 'approved': return 'Approved';
      case 'payout_processed': return 'Payout Processed';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  if (currentUser) {

    return (
      <div className={`min-h-screen w-full overflow-x-hidden font-sans transition-colors duration-500 bg-eggshell text-twilight-indigo relative`}>
        {/* Background elements for translucency visibility */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-muted-teal/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-burnt-peach/5 rounded-full blur-[150px]" />
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-muted-teal/5 rounded-full blur-[100px]" />
        </div>

        {/* Mobile Navigation (Floating Glass Dock - iOS 26 style) */}
        {isMobile && (
          <div className="fixed bottom-6 left-0 right-0 px-4 z-50 pointer-events-none">
            <nav className={`max-w-md mx-auto ${reduceTranslucency ? 'bg-eggshell' : 'bg-eggshell/80 backdrop-blur-2xl'} border border-twilight-indigo/10 px-4 py-3 flex justify-between items-center rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] pointer-events-auto`}>
              <div className="flex flex-1 justify-around items-center">
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'dashboard' ? 'text-burnt-peach scale-110' : 'text-twilight-indigo/40 hover:text-twilight-indigo'}`}
                >
                  <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'dashboard' ? 'bg-burnt-peach/10' : ''}`}>
                    <LayoutDashboard size={22} />
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('referrals')}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'referrals' ? 'text-burnt-peach scale-110' : 'text-twilight-indigo/40 hover:text-twilight-indigo'}`}
                >
                  <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'referrals' ? 'bg-burnt-peach/10' : ''}`}>
                    <Calendar size={22} />
                  </div>
                </button>
              </div>

              {/* Central FAB */}
              <div className="px-2">
                <button 
                  onClick={() => setShowReferralModal(true)}
                  className="w-14 h-14 bg-burnt-peach text-white rounded-full flex items-center justify-center shadow-lg shadow-burnt-peach/40 active:scale-95 transition-transform"
                >
                  <Plus size={28} strokeWidth={3} />
                </button>
              </div>

              <div className="flex flex-1 justify-around items-center">
                <button 
                  onClick={() => setActiveTab('promotions')}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'promotions' ? 'text-burnt-peach scale-110' : 'text-twilight-indigo/40 hover:text-twilight-indigo'}`}
                >
                  <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'promotions' ? 'bg-burnt-peach/10' : ''}`}>
                    <Zap size={22} />
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'profile' ? 'text-burnt-peach scale-110' : 'text-twilight-indigo/40 hover:text-twilight-indigo'}`}
                >
                  <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'profile' ? 'bg-burnt-peach/10' : ''}`}>
                    <UserCircle size={22} />
                  </div>
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Desktop Sidebar (Admin Only) */}
        {!isMobile && (
          <nav className={`fixed left-0 top-0 bottom-0 w-64 ${reduceTranslucency ? 'bg-eggshell' : 'bg-eggshell/70 backdrop-blur-xl'} border-r border-twilight-indigo/5 p-6 flex flex-col z-40`}>
            <div className="flex items-center gap-3 mb-10 px-2">
              <div className="w-10 h-10 bg-eggshell border border-twilight-indigo/10 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden">
                <Logo className="w-8 h-8" logoUrl={clinicProfile.logoUrl} />
              </div>
              <div>
                <h1 className="font-black text-xl tracking-tight text-twilight-indigo">{clinicProfile.name}</h1>
                <p className="text-[8px] font-black text-twilight-indigo/60 uppercase tracking-[0.2em] -mt-0.5">Empowering Healthcare</p>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-burnt-peach text-white shadow-lg shadow-burnt-peach/20' : 'text-twilight-indigo/60 hover:bg-twilight-indigo/5'}`}
              >
                <LayoutDashboard size={18} />
                <span className="text-sm font-bold">Dashboard</span>
              </button>
              <button 
                onClick={() => setActiveTab('referrals')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'referrals' ? 'bg-burnt-peach text-white shadow-lg shadow-burnt-peach/20' : 'text-twilight-indigo/60 hover:bg-twilight-indigo/5'}`}
              >
                <ClipboardList size={18} />
                <span className="text-sm font-bold">Referrals</span>
              </button>
              <button 
                onClick={() => setActiveTab('kit')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'kit' ? 'bg-burnt-peach text-white shadow-lg shadow-burnt-peach/20' : 'text-twilight-indigo/60 hover:bg-twilight-indigo/5'}`}
              >
                <QrCode size={18} />
                <span className="text-sm font-bold">Referral Kit</span>
              </button>
              <button 
                onClick={() => setActiveTab('promotions')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'promotions' ? 'bg-burnt-peach text-white shadow-lg shadow-burnt-peach/20' : 'text-twilight-indigo/60 hover:bg-twilight-indigo/5'}`}
              >
                <Zap size={18} />
                <span className="text-sm font-bold">Promotions</span>
              </button>
              <button 
                onClick={() => setActiveTab('tasks')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'tasks' ? 'bg-burnt-peach text-white shadow-lg shadow-burnt-peach/20' : 'text-twilight-indigo/60 hover:bg-twilight-indigo/5'}`}
              >
                <CheckSquare size={18} />
                <span className="text-sm font-bold">Tasks</span>
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'profile' ? 'bg-burnt-peach text-white shadow-lg shadow-burnt-peach/20' : 'text-twilight-indigo/60 hover:bg-twilight-indigo/5'}`}
              >
                <UserCircle size={18} />
                <span className="text-sm font-bold">My Profile</span>
              </button>
              {rolesConfig[currentUser.role]?.canManageCommunication && (
                <button 
                  onClick={() => setActiveTab('communication')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'communication' ? 'bg-burnt-peach text-white shadow-lg shadow-burnt-peach/20' : 'text-twilight-indigo/60 hover:bg-twilight-indigo/5'}`}
                >
                  <MessageSquare size={18} />
                  <span className="text-sm font-bold">Communication</span>
                </button>
              )}
              {rolesConfig[currentUser.role]?.canViewAnalytics && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'admin' ? 'bg-burnt-peach text-white shadow-lg shadow-burnt-peach/20' : 'text-twilight-indigo/60 hover:bg-twilight-indigo/5'}`}
                >
                  <Users size={18} />
                  <span className="text-sm font-bold">Admin Panel</span>
                </button>
              )}
              {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                <button 
                  onClick={() => setActiveTab('warm-leads')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'warm-leads' ? 'bg-burnt-peach text-white shadow-lg shadow-burnt-peach/20' : 'text-twilight-indigo/60 hover:bg-twilight-indigo/5'}`}
                >
                  <Activity size={18} />
                  <span className="text-sm font-bold">Warm Leads</span>
                </button>
              )}
              {rolesConfig[currentUser.role]?.canViewAnalytics && (
                <button 
                  onClick={() => setActiveTab('payouts')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'payouts' ? 'bg-burnt-peach text-white shadow-lg shadow-burnt-peach/20' : 'text-twilight-indigo/60 hover:bg-twilight-indigo/5'}`}
                >
                  <DollarSign size={18} />
                  <span className="text-sm font-bold">Payouts</span>
                </button>
              )}
            </div>

            <div className="pt-6 border-t border-twilight-indigo/10">
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 rounded-full bg-muted-teal text-eggshell flex items-center justify-center text-xs font-bold">
                  {currentUser?.name?.charAt(0) || '?'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold truncate text-twilight-indigo">{currentUser.name}</p>
                  <div className="flex items-center gap-1">
                    <Coins size={10} className="text-twilight-indigo/60" />
                    <span className="text-[10px] font-black text-twilight-indigo/60 uppercase tracking-wider">{currentUser.aracoins || 0} AraCoins</span>
                  </div>
                </div>
              </div>
              {rolesConfig[currentUser.role]?.canManageSettings && (
                <button 
                  onClick={() => setActiveTab('setup')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'setup' ? 'bg-burnt-peach text-white shadow-lg shadow-burnt-peach/20' : 'text-twilight-indigo/60 hover:bg-twilight-indigo/5'}`}
                >
                  <Settings size={18} />
                  <span className="text-sm font-bold">Setup</span>
                </button>
              )}
            </div>
          </nav>
        )}

        {/* Supabase Configuration Warning */}
        {!isSupabaseConfigured && (
          <div 
            onClick={async () => {
              console.log('--- Supabase Diagnostic ---');
              console.log('isPlaceholder:', isPlaceholder);
              console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
              console.log('Supabase Key Length:', import.meta.env.VITE_SUPABASE_ANON_KEY?.length);
              
              try {
                const r = await fetch('/api/health');
                const data = await r.json();
                console.log('Server Health Check:', data);
                alert(`Diagnostic info logged to browser console (F12).\n\nServer DB Status: ${data.db}\nServer Config: ${JSON.stringify(data.config, null, 2)}`);
              } catch (err: any) {
                console.error('Server Health Check Failed:', err);
                alert(`Diagnostic info logged to browser console (F12).\n\nServer Health Check Failed: ${err.message}`);
              }
              console.log('---------------------------');
            }}
            className="fixed top-0 left-0 w-full z-[200] bg-amber-500 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-center shadow-lg cursor-pointer hover:bg-amber-600 transition-colors"
          >
            Supabase is not configured. Click for diagnostics or set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Settings.
          </div>
        )}

        {/* Connection Status Indicator */}
        {connectionStatus === 'offline' && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-rose-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 animate-bounce">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Offline Mode
          </div>
        )}
        
        {/* Main Content */}
        <MobilePullToRefreshWrapper isMobile={isMobile} onRefresh={handleRefresh}>
          <main className={`${!isMobile ? `ml-64 bg-eggshell` : `pb-44 min-h-screen bg-eggshell`} p-4 lg:p-8 relative ${!isMobile ? 'overflow-hidden' : ''}`}>
          {isMobile && (
            <>
              <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-muted-teal/10 to-transparent -z-10" />
              <div className="absolute top-[10%] -right-[20%] w-[80%] h-[40%] bg-burnt-peach/5 rounded-full blur-[100px] -z-10" />
            </>
          )}

          {!currentUser.is_approved && currentUser.role !== 'admin' && activeTab !== 'profile' ? (
            (() => {
              console.log('Current User State (Main Content Pending):', currentUser);
              return (
                <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 relative z-10"
            >
              <div className="w-24 h-24 bg-apricot-cream text-twilight-indigo rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-apricot-cream/20 border border-apricot-cream/30">
                <ShieldAlert size={48} />
              </div>
              <div className="space-y-3 max-w-md">
                <h3 className="text-3xl font-black tracking-tighter text-twilight-indigo">Account Pending Approval</h3>
                <p className="text-twilight-indigo/60 text-sm font-medium leading-relaxed">
                  Welcome to {clinicProfile.name}! Your account has been successfully created and is currently being reviewed by our administration team.
                </p>
              </div>
              <div className="bg-eggshell p-8 rounded-[2.5rem] border border-twilight-indigo/10 shadow-sm max-w-sm w-full">
                <ul className="space-y-5 text-left">
                  <li className="flex gap-4 items-center text-xs font-bold text-twilight-indigo/60">
                    <div className="w-2.5 h-2.5 rounded-full bg-burnt-peach shadow-[0_0_10px_rgba(224,122,95,0.5)]" />
                    <span>Reviewing your credentials</span>
                  </li>
                  <li className="flex gap-4 items-center text-xs font-bold text-twilight-indigo/40">
                    <div className="w-2.5 h-2.5 rounded-full bg-twilight-indigo/5" />
                    <span>Activating your referral code</span>
                  </li>
                  <li className="flex gap-4 items-center text-xs font-bold text-twilight-indigo/40">
                    <div className="w-2.5 h-2.5 rounded-full bg-twilight-indigo/5" />
                    <span>Granting access to dashboard</span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col items-center gap-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-twilight-indigo/40">
                  Estimated time: 24-48 hours
                </p>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="px-6 py-3 bg-burnt-peach text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-burnt-peach transition-all active:scale-95"
                >
                  Complete your profile while you wait
                </button>
                <button 
                  onClick={handleLogout}
                  className="text-[10px] font-black uppercase tracking-widest text-twilight-indigo hover:text-twilight-indigo/70 transition-all"
                >
                  Sign Out
                </button>
              </div>
                </motion.div>
              );
            })()
          ) : (
            <>
              <header className={`flex flex-row items-center justify-between gap-4 z-[100] ${isMobile ? `sticky top-0 bg-eggshell/80 backdrop-blur-xl py-4 -mx-4 px-4 border-b border-twilight-indigo/10 mb-6` : 'mb-8 relative'}`}>
                <div className={isMobile ? '' : ''}>
                  <h2 className={`text-3xl sm:text-3xl font-black tracking-tighter capitalize text-twilight-indigo`}>
                    {activeTab === 'guide' ? 'User Guide' : activeTab === 'profile' ? 'My Profile' : activeTab === 'kit' ? 'Referral Kit' : activeTab}
                  </h2>
                  {!isMobile && <p className={`text-twilight-indigo/60 text-sm font-medium`}>Welcome back, {currentUser.name}</p>}
                </div>
                
                <div className="flex items-center gap-4">
                  {activeTab === 'dashboard' && currentUser.role !== 'admin' && !isMobile && (
                    <div className="flex items-center gap-2 bg-eggshell/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-twilight-indigo/10 shadow-sm">
                      <Clock size={16} className="text-twilight-indigo/60" />
                      <span className="text-xs font-bold text-twilight-indigo/60">
                        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}

                  {/* User Profile Quick Access */}
                  {activeTab === 'dashboard' && (
                    <button 
                      onClick={() => setActiveTab('profile')}
                      className={`flex items-center gap-3 p-1.5 pr-4 rounded-2xl transition-all active:scale-95 bg-eggshell hover:bg-twilight-indigo/5 border-twilight-indigo/10 shadow-sm border`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-burnt-peach text-white flex items-center justify-center text-xs font-black shadow-lg shadow-burnt-peach/20 overflow-hidden relative">
                        {currentUser.profile_picture ? (
                          <img 
                            src={currentUser.profile_picture} 
                            alt={currentUser.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          currentUser?.name?.charAt(0) || '?'
                        )}
                        {unreadNotificationsCount > 0 && (
                          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 border-2 border-eggshell rounded-full" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className={`text-xs font-black tracking-tight text-twilight-indigo`}>{currentUser.name}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest text-twilight-indigo/40`}>{currentUser.role}</p>
                      </div>
                    </button>
                  )}

                  {activeTab === 'profile' && (
                    <button 
                      onClick={() => setActiveTab('inbox')}
                      className={`p-3 rounded-2xl transition-all relative ${darkMode ? 'bg-zinc-50 hover:bg-violet-500/20 text-zinc-900' : 'bg-white hover:bg-zinc-50 text-zinc-500 border border-black/5 shadow-sm'}`}
                    >
                      <Mail size={20} />
                      {unreadNotificationsCount > 0 && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                      )}
                    </button>
                  )}
                </div>
              </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <DashboardUI 
              currentUser={currentUser}
              referrals={referrals}
              clinicProfile={clinicProfile}
              adminStats={adminStats}
              receptionistStats={receptionistStats}
              activeStaffList={activeStaffList}
              staffList={staffList}
              services={services}
              currentUserStats={currentUserStats}
              progressToNext={progressToNext}
              nextTier={nextTier}
              isMobile={isMobile}
              checkBranchAccess={checkBranchAccess}
              setActiveTab={setActiveTab}
              handleDeleteReferral={handleDeleteReferral}
              handleUpdateStatus={handleUpdateStatus}
              handleClinicStatusUpdate={handleClinicStatusUpdate}
              setSelectedPromo={setSelectedPromo}
              setIsPromoModalOpen={setIsPromoModalOpen}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              setSelectedStaffDetail={setSelectedStaffDetail}
              setShowStaffModal={setShowStaffModal}
            />
          )}

          {activeTab === 'inbox' && (
            <motion.div 
              key="inbox"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <button 
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors mb-4"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-bold">Back to Profile</span>
              </button>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Notification Inbox</h2>
                  <p className="text-zinc-500">Stay updated with the latest messages from admin.</p>
                </div>
                {notifications.some(n => !n.is_read) && (
                  <button 
                    onClick={markAllAsRead}
                    className="flex items-center gap-2 px-6 py-3 bg-zinc-50 hover:bg-zinc-50 text-zinc-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    <CheckCircle2 size={16} />
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {notifications.map((notif) => (
                  <motion.div 
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`relative p-6 rounded-[2rem] border transition-all ${
                      notif.is_read 
                        ? 'bg-white border-zinc-100 opacity-75' 
                        : 'bg-white border-violet-500 shadow-xl shadow-violet-500 ring-1 ring-violet-500'
                    }`}
                  >
                    {!notif.is_read && (
                      <div className="absolute top-6 right-6 w-3 h-3 bg-violet-500 rounded-full animate-pulse shadow-lg shadow-violet-500" />
                    )}
                    
                    <div className="flex gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                        notif.is_read ? 'bg-zinc-50 text-zinc-500' : 'bg-violet-500 text-white'
                      }`}>
                        <Mail size={24} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-lg font-black tracking-tight truncate ${
                            notif.is_read ? 'text-zinc-500' : 'text-zinc-900'
                          }`}>
                            {notif.title}
                          </h4>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-sm leading-relaxed mb-4 ${
                          notif.is_read ? 'text-zinc-500' : 'text-zinc-500'
                        }`}>
                          {notif.message}
                        </p>
                        
                        {!notif.is_read && (
                          <button 
                            onClick={() => markNotificationAsRead(notif.id)}
                            className="text-[10px] font-black uppercase tracking-widest text-zinc-900 hover:text-zinc-900 flex items-center gap-1.5 group"
                          >
                            <CheckCircle2 size={14} className="group-hover:scale-110 transition-transform" />
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {notifications.length === 0 && (
                  <div className="bg-zinc-50 rounded-[3rem] p-20 text-center border-2 border-dashed border-zinc-200">
                    <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-500">
                      <Mail size={40} />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 mb-2">No notifications yet</h3>
                    <p className="text-zinc-500 max-w-xs mx-auto text-sm">
                      Your inbox is empty. We'll notify you when there's something new!
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'referrals' && (
            <motion.div 
              key="referrals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${darkMode ? 'bg-[#1e293b] border-violet-500' : 'bg-white border-black/5 shadow-sm'} rounded-3xl border overflow-hidden`}
            >
              <div className={`p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Referral History</h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                      <input 
                        type="text"
                        placeholder="Search patient, staff, or service..."
                        value={referralSearch}
                        onChange={(e) => setReferralSearch(e.target.value)}
                        className={`pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 w-full sm:w-64 ${darkMode ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20' : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:ring-violet-500'}`}
                      />
                    </div>
                    <select 
                      value={referralBranchFilter}
                      onChange={(e) => setReferralBranchFilter(e.target.value)}
                      className={`px-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 ${darkMode ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20' : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:ring-violet-500'}`}
                    >
                      <option value="all">All Branches</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                    <select 
                      value={referralStatusFilter}
                      onChange={(e) => setReferralStatusFilter(e.target.value)}
                      className={`px-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 ${darkMode ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20' : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:ring-violet-500'}`}
                    >
                      <option value="all">All Statuses</option>
                      <option value="entered">Entered</option>
                      <option value="completed">Arrived</option>
                      <option value="paid_completed">Paid</option>
                      <option value="approved">Approved</option>
                      <option value="payout_processed">Payout Processed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={exportToCSV}
                  className={`flex items-center gap-2 text-xs font-bold transition-colors self-start sm:self-auto px-3 py-2 rounded-xl ${darkMode ? 'text-brand-accent hover:bg-zinc-50' : 'text-zinc-900 hover:bg-violet-500 hover:text-white'}`}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {isMobile ? (
                <div className="divide-y divide-zinc-100">
                  {referrals
                    .filter(ref => 
                      ref.patient_name.toLowerCase().includes(referralSearch.toLowerCase()) ||
                      ref.staff_name.toLowerCase().includes(referralSearch.toLowerCase()) ||
                      ref.service_name.toLowerCase().includes(referralSearch.toLowerCase())
                    )
                    .filter(ref => referralBranchFilter === 'all' ? true : ref.branch === referralBranchFilter)
                    .filter(ref => referralStatusFilter === 'all' ? true : ref.status === referralStatusFilter)
                    .map((ref, idx) => (
                    <div 
                      key={ref.id} 
                      className={`transition-all duration-300 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white'}`}
                    >
                      <div 
                        onClick={() => {
                          setExpandedReferralIds(prev => 
                            prev.includes(ref.id) ? prev.filter(id => id !== ref.id) : [...prev, ref.id]
                          );
                        }}
                        className="p-4 flex items-center justify-between cursor-pointer active:bg-zinc-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{ref.patient_name}</p>
                            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-tight">
                              {ref.service_name} • {ref.branch}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className={`text-sm font-bold ${darkMode ? 'text-brand-accent' : 'text-zinc-900'}`}>
                              {clinicProfile.currency}{(ref.commission_amount || 0).toFixed(2)}
                            </p>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                              ref.status === 'completed' || ref.status === 'paid_completed' ? 'text-emerald-600' :
                              ref.status === 'rejected' ? 'text-rose-600' : 
                              ref.status === 'approved' ? 'text-orange-600' :
                              'text-zinc-400'
                            }`}>
                              {getStatusLabel(ref.status)}
                            </span>
                          </div>
                          <ChevronRight size={14} className={`text-zinc-300 transition-transform duration-300 ${expandedReferralIds.includes(ref.id) ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedReferralIds.includes(ref.id) && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-zinc-50/50"
                          >
                            <div className="p-4 pt-0 space-y-4 border-t border-zinc-100/50">
                              <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Referral Date</p>
                                  <p className="text-xs font-medium text-zinc-700">{ref.date}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Staff Name</p>
                                  <p className="text-xs font-medium text-zinc-700">{ref.staff_name}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Patient IC</p>
                                  <p className="text-xs font-medium text-zinc-700">{ref.patient_ic || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Appointment</p>
                                  <p className="text-xs font-medium text-zinc-700">{ref.appointment_date || 'N/A'}</p>
                                </div>
                              </div>
                              
                              {ref.patient_address && (
                                <div>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Address</p>
                                  <p className="text-xs font-medium text-zinc-700 leading-relaxed">{ref.patient_address}</p>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-[8px] font-bold text-zinc-500">
                                    {ref?.staff_name?.charAt(0) || '?'}
                                  </div>
                                  <p className="text-[10px] font-medium text-zinc-500">Referred by {ref.staff_name}</p>
                                </div>
                                {ref.patient_phone && (
                                  <a 
                                    href={`https://wa.me/${ref.patient_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${ref.patient_name}! This is ${ref.staff_name} from the clinic. Just following up on your booking for ${ref.appointment_date} at ${ref.booking_time}.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest active:scale-95 transition-transform"
                                  >
                                    <MessageCircle size={12} />
                                    WhatsApp
                                  </a>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">No.</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Booking</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Patient</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Service</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Staff</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Incentive</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</th>
                      {(currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'receptionist') && <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {referrals
                      .filter(ref => 
                        ref.patient_name.toLowerCase().includes(referralSearch.toLowerCase()) ||
                        ref.staff_name.toLowerCase().includes(referralSearch.toLowerCase()) ||
                        ref.service_name.toLowerCase().includes(referralSearch.toLowerCase())
                      )
                      .filter(ref => referralBranchFilter === 'all' ? true : ref.branch === referralBranchFilter)
                      .filter(ref => referralStatusFilter === 'all' ? true : ref.status === referralStatusFilter)
                      .map((ref, index) => (
                      <tr key={ref.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="p-4 text-sm text-zinc-500 font-medium">{index + 1}</td>
                        <td className="p-4">
                          <p className="text-sm font-medium">{ref.appointment_date}</p>
                          <p className="text-[10px] text-zinc-500">{ref.booking_time}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{ref.patient_name}</p>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${ref.patient_type === 'existing' ? 'bg-brand-primary text-white' : 'bg-brand-accent text-white'}`}>
                              {ref.patient_type || 'new'}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500">{ref.patient_phone} • <span className="font-bold text-indigo-600">{ref.branch}</span></p>
                          <div className="mt-1 pt-1 border-t border-zinc-50">
                            <p className="text-[9px] text-zinc-500 font-medium">IC: {ref.patient_ic || 'N/A'}</p>
                            <p className="text-[9px] text-zinc-500 font-medium truncate max-w-[150px]" title={ref.patient_address}>Addr: {ref.patient_address || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-zinc-500">{ref.service_name}</td>
                        <td className="p-4 text-sm font-medium text-zinc-900">{ref.staff_name}</td>
                        <td className="p-4 text-sm font-bold">{clinicProfile.currency}{(ref.commission_amount || 0).toFixed(2)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(ref.status)}`}>
                            {getStatusLabel(ref.status)}
                          </span>
                        </td>
                        {(currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'receptionist') && (
                          <td className="p-4">
                            <div className="flex gap-2">
                              {ref.patient_phone && (
                                <a 
                                  href={`https://wa.me/${ref.patient_phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-zinc-900 hover:bg-violet-500 hover:text-white rounded-lg transition-colors"
                                  title="WhatsApp Follow-up"
                                >
                                  <Phone size={14} />
                                </a>
                              )}
                              {currentUser.role === 'receptionist' && ref.status === 'entered' && (
                                <>
                                  <button 
                                    onClick={() => handleUpdateStatus(ref.id, 'completed', { visit_date: new Date().toISOString().split('T')[0] })}
                                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                                  >
                                    Arrived
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateStatus(ref.id, 'rejected', { rejection_reason: 'Patient did not arrive' })}
                                    className="text-[10px] font-bold text-zinc-900 hover:underline"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {currentUser.role === 'receptionist' && ref.status === 'completed' && (
                                <button 
                                  onClick={() => handleUpdateStatus(ref.id, 'paid_completed', { payment_status: 'completed' })}
                                  className="text-[10px] font-bold text-zinc-900 hover:underline"
                                >
                                  Paid
                                </button>
                              )}
                              { (currentUser.role === 'admin' || currentUser.role === 'manager') && ref.status === 'paid_completed' && (
                                <button 
                                  onClick={() => handleUpdateStatus(ref.id, 'approved')}
                                  className="text-[10px] font-bold text-zinc-900 hover:underline"
                                >
                                  Approve
                                </button>
                              )}
                              { (currentUser.role === 'admin' || currentUser.role === 'manager') && ref.status === 'approved' && (
                                <button 
                                  onClick={() => handleUpdateStatus(ref.id, 'payout_processed')}
                                  className="text-[10px] font-bold text-zinc-900 hover:underline"
                                >
                                  Pay
                                </button>
                              )}
                              { (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                                <button 
                                  onClick={() => handleDeleteReferral(ref.id)}
                                  className="p-2 text-zinc-500 hover:text-rose-500 transition-colors"
                                  title="Delete Referral"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                              {currentUser.role === 'receptionist' && (
                                <select 
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) handleClinicStatusUpdate(ref.id, e.target.value);
                                  }}
                                  className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                                >
                                  <option value="" disabled>Set Status</option>
                                  <option value="Pending">Pending</option>
                                  <option value="Arrived">Arrived</option>
                                  <option value="In Session">In Session</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
          )}

          {activeTab === 'warm-leads' && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="mb-8">
                <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Warm Leads CRM</h2>
                <p className="text-zinc-500 text-sm">Manage early drop-offs and unconverted inquiries.</p>
              </div>

              <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-zinc-900">Warm Leads Engine</h3>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Early drop-offs from booking form</p>
                  </div>
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <Zap size={20} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Date</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Patient</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Phone</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Service</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {warmLeads.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-zinc-500 text-sm italic">No active warm leads found.</td>
                        </tr>
                      ) : (
                        warmLeads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="p-4 text-xs text-zinc-600">
                              {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-4">
                              <span className="text-sm font-bold text-zinc-900">{lead.patient_name}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-zinc-600">{lead.patient_phone}</span>
                                <a 
                                  href={`https://wa.me/${lead.patient_phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageCircle size={14} />
                                </a>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-xs font-medium text-zinc-500">
                                {services.find(s => String(s.id) === String(lead.service_id))?.name || lead.service_id || 'N/A'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                lead.status === 'new' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {lead.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {lead.status === 'new' && (
                                  <button 
                                    onClick={() => handleUpdateWarmLeadStatus(lead.id, 'contacted')}
                                    className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
                                  >
                                    Mark Contacted
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleUpdateWarmLeadStatus(lead.id, 'archived')}
                                  className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors"
                                  title="Archive Lead"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <AdminUI 
              currentUser={currentUser}
              referrals={referrals}
              clinicProfile={clinicProfile}
              staffPerformance={staffPerformance}
              activeStaffList={activeStaffList}
              staffList={staffList}
              warmLeads={warmLeads}
              services={services}
              adminSearch={adminSearch}
              setAdminSearch={setAdminSearch}
              handleApproveStaff={handleApproveStaff}
              handleRejectStaff={handleRejectStaff}
              handleDeleteStaff={handleDeleteStaff}
              setSelectedStaffDetail={setSelectedStaffDetail}
              setShowStaffModal={setShowStaffModal}
              handleUpdateWarmLeadStatus={handleUpdateWarmLeadStatus}
              handleAdminResetPassword={handleAdminResetPassword}
            />
          )}

          {activeTab === 'communication' && rolesConfig[currentUser.role]?.canManageCommunication && (
            <motion.div 
              key="communication"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Communication</h2>
                  <p className="text-zinc-500 text-sm">Send notifications and announcements to staff members.</p>
                </div>
                <div className="w-12 h-12 bg-violet-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500">
                  <MessageSquare size={24} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Notification Title</label>
                        <input 
                          type="text"
                          value={notificationForm.title}
                          onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                          placeholder="Enter a descriptive title..."
                          className="w-full px-5 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500 transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Message Content</label>
                        <textarea 
                          value={notificationForm.message}
                          onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                          placeholder="Type your message here..."
                          rows={6}
                          className="w-full px-5 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500 transition-all resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Notification Type</label>
                          <select 
                            value={notificationForm.type}
                            onChange={(e) => setNotificationForm({...notificationForm, type: e.target.value as any})}
                            className="w-full px-5 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500 transition-all"
                          >
                            <option value="announcement">Announcement</option>
                            <option value="alert">Alert</option>
                            <option value="update">Update</option>
                            <option value="reminder">Reminder</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button 
                            onClick={sendNotification}
                            disabled={isSavingSetup || !notificationForm.title || !notificationForm.message}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-violet-500 to-rose-500 text-zinc-900 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-violet-500 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                          >
                            {isSavingSetup ? (
                              <RefreshCw size={18} className="animate-spin" />
                            ) : (
                              <Send size={18} />
                            )}
                            Send Notification
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-50 p-8 rounded-[2.5rem] border border-zinc-100">
                    <div className="flex items-center gap-3 mb-4">
                      <Info size={18} className="text-zinc-900" />
                      <h4 className="font-bold text-zinc-900">Communication Tips</h4>
                    </div>
                    <ul className="space-y-3 text-sm text-zinc-500">
                      <li className="flex gap-2">
                        <span className="text-zinc-900 font-bold">•</span>
                        Use clear and concise titles to grab attention.
                      </li>
                      <li className="flex gap-2">
                        <span className="text-zinc-900 font-bold">•</span>
                        Announcements are sent to all staff by default if no specific users are selected.
                      </li>
                      <li className="flex gap-2">
                        <span className="text-zinc-900 font-bold">•</span>
                        Staff will receive these in their notification inbox in real-time.
                      </li>
                    </ul>
                  </div>

                  {/* Feedback Section */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-6">
                    <h3 className="text-xl font-black text-zinc-900">Staff Feedback</h3>
                    {feedbackList.length === 0 ? (
                      <p className="text-zinc-500 text-sm">No feedback received yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {feedbackList.map((f) => (
                          <div key={f.id} className="p-4 bg-zinc-50 rounded-2xl border border-black/5">
                            <p className="text-sm font-bold text-zinc-900">{f.staff_name} ({f.staff_email})</p>
                            <p className="text-sm text-zinc-600 mt-1">{f.message}</p>
                            <p className="text-[10px] text-zinc-400 mt-2">{new Date(f.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-black text-zinc-900 tracking-tight">Recipients</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          {notificationForm.user_ids.length === 0 ? 'All Staff' : `${notificationForm.user_ids.length} Selected`}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      <label className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 transition-colors cursor-pointer border border-transparent hover:border-zinc-100">
                        <input 
                          type="checkbox"
                          checked={notificationForm.user_ids.length === activeStaffList.length && activeStaffList.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNotificationForm({ ...notificationForm, user_ids: activeStaffList.map(s => String(s.id ?? '')) });
                            } else {
                              setNotificationForm({ ...notificationForm, user_ids: [] });
                            }
                          }}
                          className="w-5 h-5 rounded-lg border-zinc-200 text-zinc-900 focus:ring-violet-500"
                        />
                        <span className="text-sm font-bold text-zinc-900">Select All Staff</span>
                      </label>

                      <div className="h-px bg-zinc-50 my-2" />

                      {activeStaffList.map(staff => (
                        <label key={staff.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 transition-colors cursor-pointer border border-transparent hover:border-zinc-100">
                          <input 
                            type="checkbox"
                            checked={notificationForm.user_ids.includes(String(staff.id ?? ''))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNotificationForm({ ...notificationForm, user_ids: [...notificationForm.user_ids, String(staff.id ?? '')] });
                              } else {
                                setNotificationForm({ ...notificationForm, user_ids: notificationForm.user_ids.filter(id => id !== String(staff.id ?? '')) });
                              }
                            }}
                            className="w-5 h-5 rounded-lg border-zinc-200 text-zinc-900 focus:ring-violet-500"
                          />
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                              {staff.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-zinc-900 leading-tight">{staff.name}</p>
                              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{staff.role}</p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'payouts' && rolesConfig[currentUser.role]?.canViewAnalytics && (() => {
            const filteredStaffForBulk = staffPerformance
              .filter(s => (s.approved_earnings || 0) + (s.pending_earnings || 0) > 0)
              .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .filter(s => payoutBranchFilter === 'all' ? true : s.branch === payoutBranchFilter)
              .filter(s => payoutUserFilter === 'all' ? true : String(s.id) === payoutUserFilter);

            return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Payout Management</h2>
                  <p className="text-zinc-500 text-sm">Manage and track staff commissions and payouts.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm min-w-[150px]">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Pending</p>
                    <p className="text-xl font-black text-zinc-900">
                      {clinicProfile.currency}{referrals
                        .filter(r => r.status === 'approved')
                        .filter(r => payoutBranchFilter === 'all' ? true : r.branch === payoutBranchFilter)
                        .filter(r => payoutUserFilter === 'all' ? true : String(r.staff_id) === payoutUserFilter)
                        .reduce((sum, r) => sum + r.commission_amount, 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm min-w-[150px]">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Processed</p>
                    <p className="text-xl font-black text-zinc-900">
                      {clinicProfile.currency}{referrals
                        .filter(r => r.status === 'payout_processed')
                        .filter(r => payoutBranchFilter === 'all' ? true : r.branch === payoutBranchFilter)
                        .filter(r => payoutUserFilter === 'all' ? true : String(r.staff_id) === payoutUserFilter)
                        .reduce((sum, r) => sum + r.commission_amount, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-2 p-1 bg-zinc-50 rounded-2xl w-fit">
                <button 
                  onClick={() => setPayoutSubTab('history')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${payoutSubTab === 'history' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                  Referral History
                </button>
                <button 
                  onClick={() => setPayoutSubTab('bulk')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${payoutSubTab === 'bulk' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                  Bulk Payouts
                </button>
              </div>

              {/* Filters */}
              <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">
                    {payoutSubTab === 'history' ? 'Search Referrals' : 'Search Staff'}
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                      type="text"
                      placeholder={payoutSubTab === 'history' ? "Search patient, staff, or service..." : "Search staff name..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Filter by Staff</label>
                  <select 
                    value={payoutUserFilter}
                    onChange={(e) => setPayoutUserFilter(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  >
                    <option value="all">All Staff</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.branch})</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Filter by Branch</label>
                  <select 
                    value={payoutBranchFilter}
                    onChange={(e) => setPayoutBranchFilter(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  >
                    <option value="all">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={() => {
                    setPayoutUserFilter('all');
                    setPayoutBranchFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2.5 text-zinc-500 hover:text-zinc-900 text-sm font-bold transition-colors"
                >
                  Reset
                </button>
              </div>

              {payoutSubTab === 'history' ? (
                <>
                  {/* Payout Table */}
                  <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50/50 border-b border-zinc-100">
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">No.</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Staff</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Patient</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Amount</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {referrals
                            .filter(r => ['paid_completed', 'approved', 'payout_processed'].includes(r.status))
                            .filter(r => 
                              r.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              r.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (r.service_name && r.service_name.toLowerCase().includes(searchQuery.toLowerCase()))
                            )
                            .filter(r => payoutBranchFilter === 'all' ? true : r.branch === payoutBranchFilter)
                            .filter(r => payoutUserFilter === 'all' ? true : String(r.staff_id) === payoutUserFilter)
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((ref, index) => (
                              <tr key={ref.id} className="hover:bg-zinc-50/50 transition-colors">
                                <td className="px-6 py-4 text-sm text-zinc-500 font-medium">{index + 1}</td>
                                <td className="px-6 py-4">
                                  <p className="text-sm font-medium text-zinc-900">{new Date(ref.date).toLocaleDateString()}</p>
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase">{ref.branch}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm font-bold text-zinc-900">{ref.staff_name}</p>
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Code: {ref.promo_code}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm font-medium text-zinc-900">{ref.patient_name}</p>
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase">{ref.service_name}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm font-black text-zinc-900">{clinicProfile.currency}{(ref.commission_amount || 0).toFixed(2)}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    ref.status === 'payout_processed' ? 'bg-emerald-500 text-white' : 'bg-brand-surface text-zinc-900'
                                  }`}>
                                    {ref.status === 'payout_processed' ? 'Paid' : 'Pending'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {ref.status === 'approved' && (
                                      <button 
                                        onClick={() => handleUpdateStatus(ref.id, 'payout_processed')}
                                        className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-brand-primary transition-all active:scale-95"
                                      >
                                        Process Payout
                                      </button>
                                    )}
                                    {ref.status === 'payout_processed' && (
                                      <div className="flex items-center justify-end gap-1 text-zinc-900">
                                        <CheckCircle2 size={14} />
                                        <span className="text-xs font-bold">Processed</span>
                                      </div>
                                    )}
                                    { (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                                      <button 
                                        onClick={() => handleDeleteReferral(ref.id)}
                                        className="p-2 text-zinc-500 hover:text-rose-500 transition-colors"
                                        title="Delete Referral"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          {referrals.filter(r => r.status === 'approved' || r.status === 'payout_processed').length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center">
                                <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                  <DollarSign className="text-zinc-500" size={24} />
                                </div>
                                <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">No payout records found</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Bulk Payout Section */}
                  <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">Bulk Payout Management</h3>
                        <p className="text-xs text-zinc-500 font-medium">Generate bulk payment files for banking software</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowPayoutModal(true)}
                          disabled={selectedPayoutStaff.length === 0}
                          className="flex items-center gap-2 text-xs font-bold bg-violet-500 text-white px-4 py-2 rounded-xl transition-all hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500"
                        >
                          <Download size={14} />
                          Generate Bulk CSV
                        </button>
                        <button 
                          onClick={processPayouts}
                          disabled={selectedPayoutStaff.length === 0}
                          className="flex items-center gap-2 text-xs font-bold bg-brand-primary text-white px-4 py-2 rounded-xl transition-all hover:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-primary/20"
                        >
                          <CheckCircle2 size={14} />
                          Mark as Paid
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-100">
                            <th className="p-4 w-10">
                              <input 
                                type="checkbox"
                                className="rounded border-zinc-300 text-zinc-900 focus:ring-violet-500"
                                checked={filteredStaffForBulk.length > 0 && filteredStaffForBulk.every(s => selectedPayoutStaff.includes(s.id))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const newSelected = Array.from(new Set([...selectedPayoutStaff, ...filteredStaffForBulk.map(s => s.id)]));
                                    setSelectedPayoutStaff(newSelected);
                                  } else {
                                    const filteredOut = selectedPayoutStaff.filter(id => !filteredStaffForBulk.some(s => s.id === id));
                                    setSelectedPayoutStaff(filteredOut);
                                  }
                                }}
                              />
                            </th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">No.</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Staff Member</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Bank Details</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Payable Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {filteredStaffForBulk.map((staff, index) => (
                            <tr key={staff.id} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="p-4">
                                <input 
                                  type="checkbox"
                                  className="rounded border-zinc-300 text-zinc-900 focus:ring-violet-500"
                                  checked={selectedPayoutStaff.includes(staff.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPayoutStaff([...selectedPayoutStaff, staff.id]);
                                    } else {
                                      setSelectedPayoutStaff(selectedPayoutStaff.filter(id => id !== staff.id));
                                    }
                                  }}
                                />
                              </td>
                              <td className="p-4 text-sm text-zinc-500 font-medium">{index + 1}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-xs font-bold text-zinc-500">
                                    {staff?.name?.charAt(0) || '?'}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{staff.name}</span>
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{staff.branch}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-zinc-900">{staff.bank_name || 'MISSING BANK'}</span>
                                  <span className="text-[10px] text-zinc-500 font-medium tracking-wider">{staff.bank_account_number || 'MISSING ACCOUNT'}</span>
                                </div>
                              </td>
                              <td className="p-4 text-sm font-bold text-right text-zinc-900">
                                {clinicProfile.currency}{((staff.approved_earnings || 0) + (staff.pending_earnings || 0)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          {filteredStaffForBulk.length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-zinc-500 text-sm italic">
                                No approved earnings matching your filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
            );
          })()}

          {activeTab === 'receptionist' && (currentUser.role === 'receptionist' || currentUser.role === 'manager' || currentUser.role === 'admin') && (
            <motion.div 
              key="receptionist"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Walk-in Form (Receptionist Only) */}
                {currentUser.role === 'receptionist' && (
                  <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                      <div className="flex items-center gap-2 mb-6">
                        <PlusCircle className="text-zinc-900" size={20} />
                        <h3 className="font-semibold">Log Walk-in Referral</h3>
                      </div>
                      <form onSubmit={handleSubmitReferral} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Referral Code</label>
                          <input 
                            type="text" 
                            required
                            value={walkInPromoCode}
                            onChange={(e) => checkPromoCode(e.target.value.toUpperCase())}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all font-mono"
                            placeholder="e.g. SMITH10"
                          />
                          {walkInStaff ? (
                            <p className="mt-2 text-xs text-zinc-900 font-medium flex items-center gap-1">
                              <CheckCircle2 size={12} /> Valid Referral Code
                            </p>
                          ) : walkInPromoCode.length >= 3 ? (
                            <p className="mt-2 text-xs text-zinc-900 font-medium">✗ Invalid Referral Code</p>
                          ) : null}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Patient Name</label>
                          <input 
                            type="text" 
                            required
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                            placeholder="Enter patient name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Patient Type</label>
                          <select 
                            required
                            value={patientType}
                            onChange={(e) => setPatientType(e.target.value as 'new' | 'existing')}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all appearance-none"
                          >
                            <option value="new">New Patient</option>
                            <option value="existing">Existing Patient</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Service</label>
                          <select 
                            required
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all appearance-none"
                          >
                            <option value="">Select a service</option>
                            {services.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                            {selectedService && !services.find(s => String(s.id) === String(selectedService)) && urlServiceName && (
                              <option value={selectedService}>{urlServiceName}</option>
                            )}
                          </select>
                        </div>
                        <button 
                          type="submit"
                          disabled={isSubmitting || !walkInStaff}
                          className="w-full bg-brand-primary text-white py-3 rounded-xl font-medium hover:bg-brand-primary transition-colors disabled:opacity-50"
                        >
                          {isSubmitting ? 'Logging...' : 'Log Referral'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Check-in / Payout List */}
                <div className={currentUser.role === 'receptionist' ? 'lg:col-span-2' : 'lg:col-span-3'}>
                  <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="font-semibold">{currentUser.role === 'receptionist' ? `Patient Arrivals (${branchFilter === 'all' ? 'All Branches' : branchFilter})` : 'Pending Payouts'}</h3>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {(currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'receptionist') && (
                          <select 
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="px-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                          >
                            <option value="all">All Branches</option>
                            {branches.map(b => (
                              <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                          </select>
                        )}
                        <select 
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="px-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="all">All Statuses</option>
                          <option value="entered">Entered</option>
                          <option value="completed">Arrived</option>
                          <option value="paid_completed">Paid</option>
                          <option value="approved">Approved</option>
                          <option value="payout_processed">Payout Processed</option>
                        </select>
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="Search patient name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-4 pr-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-zinc-50">
                      {referrals
                        .filter(r => r.patient_name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .filter(r => statusFilter === 'all' ? true : r.status === statusFilter)
                        .filter(r => currentUser.role === 'receptionist' ? r.status === 'completed' : true)
                        .map((ref) => (
                        <div key={ref.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                            <div>
                              <p className="text-sm font-semibold">{ref.patient_name}</p>
                              <p className="text-[10px] text-zinc-500">{ref.patient_phone}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-zinc-500">{ref.service_name}</p>
                              <p className="text-[10px] text-zinc-500">Service</p>
                            </div>
                            { (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                              <div className="flex flex-col">
                                <p className="text-xs font-bold text-zinc-900">{clinicProfile.currency}{(ref.commission_amount || 0).toFixed(2)}</p>
                                <p className="text-[10px] text-zinc-500">Commission</p>
                              </div>
                            )}
                            { (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                              <div>
                                <p className="text-xs font-medium text-zinc-900">{ref.staff_name}</p>
                                <p className="text-[10px] text-zinc-500">Staff</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-zinc-500">{ref.appointment_date}</p>
                              <p className="text-[10px] text-zinc-500">{ref.booking_time}</p>
                            </div>
                            <div>
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(ref.status)}`}>
                                {getStatusLabel(ref.status)}
                              </span>
                              <p className="text-[10px] text-zinc-500 mt-1">Status</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <select 
                              value={ref.status}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                const additionalData = newStatus === 'completed' ? { visit_date: new Date().toISOString().split('T')[0] } : {};
                                handleUpdateStatus(ref.id, newStatus as any, additionalData);
                              }}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="entered">Entered</option>
                              <option value="completed">Arrived</option>
                              <option value="paid_completed">Paid</option>
                              <option value="rejected">Rejected</option>
                              { (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'receptionist') && (
                                <>
                                  <option value="approved">Approved</option>
                                  <option value="payout_processed">Payout Processed</option>
                                </>
                              )}
                            </select>
                            <select 
                              value=""
                              onChange={(e) => {
                                if (e.target.value) handleClinicStatusUpdate(ref.id, e.target.value);
                              }}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                              <option value="" disabled>Set Status</option>
                              <option value="Pending">Pending</option>
                              <option value="Arrived">Arrived</option>
                              <option value="In Session">In Session</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>
                      ))}
                      {referrals.length === 0 && (
                        <div className="p-12 text-center text-zinc-500">
                          <p className="text-sm">No referrals found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'kit' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              { (currentUser.role === 'admin' || currentUser.role === 'manager') ? (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-zinc-200">
                  <div className="w-20 h-20 bg-zinc-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <Users size={32} className="text-zinc-500" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-zinc-900 mb-2">Staff Access Only</h3>
                  <p className="text-zinc-500 text-sm font-medium max-w-xs mx-auto">
                    The Referral Kit is designed for staff members to generate their personal referral links and QR codes.
                  </p>
                </div>
              ) : (
                <>
                  <div className={`p-8 rounded-[2.5rem] relative overflow-hidden ${darkMode ? 'bg-gradient-to-br from-brand-primary via-pale-yellow to-bg-main text-zinc-900' : 'bg-gradient-to-br from-violet-500 via-peach to-rose-500 text-zinc-900'}`}>
                    <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] -mr-32 -mt-32 ${darkMode ? 'bg-brand-accent/20' : 'bg-rose-500/20'}`} />
                    <div className="relative z-10">
                      <h3 className="text-2xl font-black tracking-tighter mb-2">Referral Kit</h3>
                      <p className={`${darkMode ? 'text-zinc-300' : 'text-zinc-900/70'} text-sm font-medium max-w-md`}>Everything you need to refer patients and earn rewards.</p>
                    </div>
                  </div>

                  <div className={`${darkMode ? 'bg-white border-zinc-200 rotate-[1deg]' : 'bg-white border-black/5'} p-8 rounded-[2.5rem] border shadow-[0_8px_30px_rgb(0,0,0,0.04)]`}>
                    <div className="flex items-center gap-2 mb-8">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${darkMode ? 'bg-brand-accent text-brand-primary shadow-brand-accent/20 rotate-[-5deg]' : 'bg-brand-primary text-white shadow-brand-primary'}`}>
                        <QrCode size={20} />
                      </div>
                      <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Your Toolkit</h3>
                    </div>
                    
                    <div className="space-y-8">
                      <div className={`flex flex-col items-center p-8 rounded-[2.5rem] border ${darkMode ? 'bg-zinc-50 border-zinc-100' : 'bg-zinc-50/50 border-zinc-100'}`}>
                        <div className={`p-6 rounded-[2rem] shadow-sm mb-6 bg-white`}>
                          {(currentUser.referral_code || currentUser.promo_code) ? (
                            <QRCodeCanvas 
                              value={`${getShareUrl(clinicProfile.customDomain)}?ref=${(currentUser.referral_code || currentUser.promo_code)}`}
                              size={180}
                              level="H"
                              includeMargin={false}
                              className="rounded-lg"
                            />
                          ) : (
                            <div className="w-[180px] h-[180px] flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500 text-sm font-bold text-center px-4">
                              Code not generated yet
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Personal QR Code</p>
                        <p className={`text-xs mt-2 text-center max-w-[200px] ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Patients can scan this to book directly with your referral code.</p>
                      </div>

                      <div className="space-y-4">
                        <div className={`p-6 rounded-2xl border flex items-center justify-between ${darkMode ? 'bg-zinc-50 border-zinc-100' : 'bg-zinc-50/50 border-zinc-100'}`}>
                          <div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Referral Code</p>
                            <p className={`text-2xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{(currentUser.referral_code || currentUser.promo_code)}</p>
                          </div>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText((currentUser.referral_code || currentUser.promo_code));
                              alert('Code copied!');
                            }}
                            className={`p-4 rounded-xl border transition-all active:scale-90 ${darkMode ? 'bg-white border-zinc-200 text-brand-primary hover:bg-zinc-50' : 'bg-white border-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                          >
                            <Copy size={20} />
                          </button>
                        </div>

                        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-zinc-50 border-zinc-100' : 'bg-zinc-50/50 border-zinc-100'}`}>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Referral Link</p>
                          <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-zinc-100 overflow-hidden">
                            <p className="text-xs font-medium text-zinc-500 truncate flex-1">
                              {`${getShareUrl(clinicProfile.customDomain)}?ref=${(currentUser.referral_code || currentUser.promo_code)}`}
                            </p>
                            <button 
                              onClick={() => {
                                const url = `${getShareUrl(clinicProfile.customDomain)}?ref=${(currentUser.referral_code || currentUser.promo_code)}`;
                                navigator.clipboard.writeText(url);
                                alert('Link copied!');
                              }}
                              className="p-2 text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-all"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <a 
                            href={`https://wa.me/?text=${encodeURIComponent(`Hi! Book your appointment at our clinic using my referral link: ${getShareUrl(clinicProfile.customDomain)}?ref=${(currentUser.referral_code || currentUser.promo_code)}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-center gap-3 p-5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${darkMode ? 'bg-brand-accent text-brand-primary shadow-brand-accent/10 hover:bg-brand-accent/90' : 'bg-gradient-to-r from-brand-accent to-rose-500 text-zinc-900 shadow-brand-accent hover:from-brand-accent hover:to-rose-500'}`}
                          >
                            <MessageCircle size={18} />
                            Share on WhatsApp
                          </a>
                          <button 
                            onClick={() => {
                              const url = `${getShareUrl(clinicProfile.customDomain)}?ref=${(currentUser.referral_code || currentUser.promo_code)}`;
                              navigator.clipboard.writeText(url);
                              alert('Link copied!');
                            }}
                            className={`flex items-center justify-center gap-3 p-5 border rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm ${darkMode ? 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50' : 'bg-white text-zinc-900 border-zinc-100 hover:bg-zinc-50'}`}
                          >
                            <Share2 size={18} />
                            Copy Referral Link
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Log New Referral (Staff Only) */}
                  {currentUser.role === 'affiliate' && !isMobile && (
                <div className={`${darkMode ? 'bg-white border-zinc-200 rotate-[-1deg]' : 'bg-violet-500 border-violet-500'} p-8 rounded-[2.5rem] border shadow-[0_8px_30px_rgb(0,0,0,0.02)]`}>
                  <div className="flex items-center gap-2 mb-6">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${darkMode ? 'bg-brand-accent text-brand-primary shadow-brand-accent/20 rotate-[5deg]' : 'bg-violet-500 text-white shadow-violet-500'}`}>
                      <PlusCircle size={20} />
                    </div>
                    <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Log New Referral</h3>
                  </div>
                  <form onSubmit={handleSubmitReferral} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Patient Name</label>
                      <input 
                        type="text" 
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
                        placeholder="Enter patient name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">WhatsApp Number</label>
                        <input 
                          type="tel" 
                          required
                          value={patientPhone}
                          onChange={(e) => setPatientPhone(e.target.value)}
                          className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
                          placeholder="e.g. +60123456789"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Patient IC</label>
                        <input 
                          type="text" 
                          required
                          value={patientIC}
                          onChange={(e) => setPatientIC(e.target.value)}
                          className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
                          placeholder="IC Number"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Patient Type</label>
                      <select 
                        required
                        value={patientType}
                        onChange={(e) => setPatientType(e.target.value as 'new' | 'existing')}
                        className={`w-full px-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
                      >
                        <option value="new">New Patient</option>
                        <option value="existing">Existing Patient</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Patient Address</label>
                      <textarea 
                        required
                        value={patientAddress}
                        onChange={(e) => setPatientAddress(e.target.value)}
                        className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium h-20 resize-none focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
                        placeholder="Enter patient address"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Service Promoted</label>
                      <div className="relative">
                        <select 
                          required
                          value={selectedService}
                          onChange={(e) => {
                            setSelectedService(e.target.value);
                            setSelectedBranch('');
                            setAppointmentDate('');
                            setBookingTime('');
                          }}
                          className={`w-full px-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium pr-12 focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
                        >
                          <option value="">Select a service</option>
                          {services.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({clinicProfile.currency}{s.commission_rate} incentive {(s.aracoins_perk || 0) > 0 ? `+ ${s.aracoins_perk} Coins` : ''})</option>
                          ))}
                          {selectedService && !services.find(s => String(s.id) === String(selectedService)) && urlServiceName && (
                            <option value={selectedService}>{urlServiceName}</option>
                          )}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Target Branch</label>
                      <select 
                        required
                        value={selectedBranch}
                        onChange={(e) => {
                          setSelectedBranch(e.target.value);
                          setAppointmentDate('');
                          setBookingTime('');
                        }}
                        className={`w-full px-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
                      >
                        <option value="">Select Branch</option>
                        {(() => {
                          const s = services.find(srv => String(srv.id) === String(selectedService));
                          if (!s || !s.branches) return branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>);
                          const activeBranches = Object.keys(s.branches).filter(bName => s.branches![bName].active);
                          if (activeBranches.length === 0) return branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>);
                          return activeBranches.map(bName => <option key={bName} value={bName}>{bName}</option>);
                        })()}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Booking Date</label>
                        <input 
                          type="date" 
                          required
                          min={(() => {
                            const s = services.find(srv => String(srv.id) === String(selectedService));
                            const bSched = (s?.branches && selectedBranch) ? s.branches[selectedBranch] : null;
                            const today = new Date().toISOString().split('T')[0];
                            if (bSched?.startDate && bSched.startDate > today) return bSched.startDate;
                            return today;
                          })()}
                          max={(() => {
                            const s = services.find(srv => String(srv.id) === String(selectedService));
                            const bSched = (s?.branches && selectedBranch) ? s.branches[selectedBranch] : null;
                            return bSched?.endDate || undefined;
                          })()}
                          value={appointmentDate}
                          onChange={(e) => {
                            const date = e.target.value;
                            const s = services.find(srv => String(srv.id) === String(selectedService));
                            const bSched = (s?.branches && selectedBranch) ? s.branches[selectedBranch] : null;
                            
                            if (bSched && bSched.days && bSched.days.length > 0) {
                              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                              const selectedDay = dayNames[new Date(date).getDay()];
                              if (!bSched.days.includes(selectedDay)) {
                                alert(`This service is only available on: ${bSched.days.join(', ')}`);
                                setAppointmentDate('');
                                return;
                              }
                            }

                            if (bSched && bSched.blockedDates) {
                              const isBlocked = bSched.blockedDates.some(bd => bd.date === date && bd.type === 'all-day');
                              if (isBlocked) {
                                alert('This date is fully booked or unavailable.');
                                setAppointmentDate('');
                                return;
                              }
                            }

                            setAppointmentDate(date);
                            setBookingTime('');
                          }}
                          className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Booking Time</label>
                        <select 
                          required
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className={`w-full px-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
                        >
                          <option value="">Select time</option>
                          {(() => {
                            const slots = getAvailableTimeSlots(selectedService, selectedBranch, appointmentDate);
                            if (slots.length === 0) return <option disabled>No slots available</option>;
                            return slots.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className={`w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] shadow-xl disabled:opacity-50 mt-2 flex items-center justify-center gap-2 ${darkMode ? 'bg-brand-accent text-brand-primary shadow-brand-accent/20 hover:bg-brand-accent/90' : 'bg-gradient-to-r from-violet-500 to-rose-500 text-zinc-900 shadow-violet-500 hover:from-violet-500 hover:to-rose-500'}`}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <PlusCircle size={16} />
                          Submit Referral
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

                  <div className="bg-brand-primary p-8 rounded-[2.5rem] border border-brand-primary">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0">
                        <Info size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">How to use?</h4>
                        <p className="text-xs text-white/80 leading-relaxed">
                          Share your link or QR code on social media, WhatsApp, or print it out! When patients book using your link, you'll see them in your history automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
          {activeTab === 'guide' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-brand-primary text-white p-8 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] -mr-32 -mt-32" />
                <div className="relative z-10">
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-widest mb-4 hover:text-white transition-colors"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                    Back to Profile
                  </button>
                  <h3 className="text-2xl font-black tracking-tighter mb-2">Platform User Guide</h3>
                  <p className="text-white/70 text-sm font-medium max-w-md">Learn how to maximize your efficiency and earnings with the {clinicProfile.name} portal.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-6 rounded-3xl border ${currentUser.role === 'affiliate' ? 'bg-violet-500 border-violet-500' : 'bg-white border-black/5'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${currentUser.role === 'affiliate' ? 'bg-violet-500 text-white' : 'bg-zinc-50 text-zinc-500'}`}>
                    <Users size={24} />
                  </div>
                  <h4 className="font-bold mb-2">For Staff Members</h4>
                  <ul className="space-y-3 text-xs text-zinc-500 font-medium">
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Share your unique QR code or referral link with patients.</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Track your "Pending" earnings as soon as a patient books.</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Earnings move to "Approved" once the patient completes their visit.</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Reach higher tiers (Silver/Gold) to earn up to 1.5x bonus!</span>
                    </li>
                  </ul>
                </div>

                <div className={`p-6 rounded-3xl border ${currentUser.role === 'receptionist' ? 'bg-violet-500 border-violet-500' : 'bg-white border-black/5'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${currentUser.role === 'receptionist' ? 'bg-violet-500 text-white' : 'bg-zinc-50 text-zinc-500'}`}>
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="font-bold mb-2">For Receptionists</h4>
                  <ul className="space-y-3 text-xs text-zinc-500 font-medium">
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Use the "Arrived" tab to find patients arriving today.</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Mark visits as "Completed" after the consultation.</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Update "Payment Status" to approve the referral.</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Verify walk-in referrals by entering the staff's promo code.</span>
                    </li>
                  </ul>
                </div>

                <div className={`p-6 rounded-3xl border ${ (currentUser.role === 'admin' || currentUser.role === 'manager') ? 'bg-violet-500 border-violet-500' : 'bg-white border-black/5'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${ (currentUser.role === 'admin' || currentUser.role === 'manager') ? 'bg-violet-500 text-white' : 'bg-zinc-50 text-zinc-500'}`}>
                    <ShieldCheck size={24} />
                  </div>
                  <h4 className="font-bold mb-2">For Administrators</h4>
                  <ul className="space-y-3 text-xs text-zinc-500 font-medium">
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Approve new staff registrations in the "Setup &gt; Staff" tab.</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Monitor clinic-wide performance in the "Admin Panel".</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Process payouts for "Approved" earnings at the end of the month.</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Manage services, branches, and system roles in "Setup".</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
                <h4 className="font-black text-xs uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                  <Zap size={14} className="text-zinc-900" />
                  Frequently Asked Questions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-zinc-900">When do I get paid?</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">Incentives are eligible for payout 7 days after the patient's payment is completed. Admins typically process these monthly.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-zinc-900">What are AraCoins?</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">AraCoins are internal points earned alongside cash incentives. They can be used for clinic perks or redeemed for rewards (if enabled by admin).</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-zinc-900">How do tiers work?</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">Tiers are calculated monthly based on your successful referrals. Bronze (0-5), Silver (6-10), and Gold (11+). Higher tiers give you a bonus multiplier on all earnings that month.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-zinc-900">Can I refer patients to any branch?</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">Yes! Patients can select their preferred branch during booking, and you will still receive the referral credit regardless of the location.</p>
                  </div>
                  <div className="space-y-2 md:col-span-2 pt-4 border-t border-zinc-50">
                    <p className="text-sm font-bold text-zinc-900">What do the referral statuses mean?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Entered</p>
                        <p className="text-xs text-zinc-500">Referral is logged (e.g., patient booked an appointment).</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-1">Completed</p>
                        <p className="text-xs text-zinc-500">Patient has attended the appointment.</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Buffer</p>
                        <p className="text-xs text-zinc-500">7-day safety period after payment to finalize the transaction.</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-1">Approved</p>
                        <p className="text-xs text-zinc-500">Incentive is verified and ready for the next payout cycle.</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest mb-1">Payout Processed</p>
                        <p className="text-xs text-zinc-500">The incentive has been successfully paid out to you.</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-1">Rejected</p>
                        <p className="text-xs text-zinc-500">Referral invalidated (e.g., no-show or duplicate entry).</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && currentUser && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className={`${darkMode ? 'bg-[#1e293b] border-violet-500' : 'bg-[#EDEADE] border-black/5 shadow-sm'} p-8 rounded-[2.5rem] border relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-32 h-32 ${darkMode ? 'bg-brand-accent/10' : 'bg-violet-500'} rounded-full blur-3xl -mr-16 -mt-16`} />
                
                <div className="flex flex-col items-center text-center mb-10 relative z-10">
                  <div className="relative group mb-6 flex flex-col items-center">
                    <div className={`w-32 h-32 rounded-[2.5rem] ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#EDEADE]'} border-4 shadow-xl overflow-hidden flex items-center justify-center relative`}>
                      {currentUser.profile_picture ? (
                        <img src={currentUser.profile_picture} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserCircle size={64} className={darkMode ? 'text-zinc-900/20' : 'text-zinc-500'} />
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <RefreshCw className="text-zinc-900 animate-spin" size={24} />
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <label className={`cursor-pointer ${darkMode ? 'bg-brand-accent text-white' : 'bg-brand-primary text-white'} px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2`}>
                        <PlusCircle size={14} />
                        Choose Image
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                      </label>
                      {currentUser.profile_picture && (
                        <button 
                          type="button"
                          onClick={() => handleUpdateProfile({ profile_picture: '' })}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${darkMode ? 'bg-rose-500 text-white' : 'bg-rose-500 text-white hover:bg-rose-500'}`}
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className={`text-2xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{currentUser.nickname || currentUser.name}</h3>
                  <p className={`text-sm font-medium uppercase tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{currentUser.role}</p>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleUpdateProfile({
                      nickname: formData.get('nickname') as string,
                      bank_name: formData.get('bank_name') as string,
                      bank_account_number: formData.get('bank_account_number') as string,
                      id_type: formData.get('id_type') as string,
                      id_number: formData.get('id_number') as string,
                    });
                  }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Nickname</label>
                      <input 
                        name="nickname"
                        type="text"
                        defaultValue={currentUser.nickname || ''}
                        className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                          darkMode 
                            ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20 focus:border-brand-accent' 
                            : 'bg-white border-black/5 text-zinc-900 focus:ring-violet-500 focus:border-violet-500'
                        }`}
                        placeholder="Your preferred name"
                      />
                    </div>
                  </div>

                  <div className={`pt-6 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      <MapPin size={14} className={darkMode ? 'text-brand-accent' : 'text-brand-accent'} />
                      Branch Assignment
                    </h4>
                    <div className="space-y-4">
                      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Current Branch</p>
                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{currentUser.branch || 'Not Assigned'}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Request Branch Change</label>
                        <div className="flex gap-2">
                          <select 
                            id="requestedBranch"
                            className={`flex-1 px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                              darkMode 
                                ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20 focus:border-brand-accent' 
                                : 'bg-white border-black/5 text-zinc-900 focus:ring-violet-500 focus:border-violet-500'
                            }`}
                          >
                            <option value="">Select New Branch</option>
                            {branches.filter(b => b.name !== currentUser.branch).map(branch => (
                              <option key={branch.id} value={branch.name}>{branch.name}</option>
                            ))}
                          </select>
                          <button 
                            type="button"
                            onClick={async () => {
                              const requestedBranch = (document.getElementById('requestedBranch') as HTMLSelectElement).value;
                              if (!requestedBranch) return alert('Please select a branch');
                              
                              const reason = prompt('Reason for branch change request:');
                              if (!reason) return;

                              const { res } = await safeFetch(`${apiBaseUrl}/api/branch-change-requests`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  staff_id: currentUser.id,
                                  current_branch: currentUser.branch,
                                  requested_branch: requestedBranch,
                                  reason
                                })
                              });
                              
                              if (res.ok) {
                                alert('Branch change request submitted!');
                              }
                            }}
                            className={`px-6 py-4 rounded-2xl font-bold text-sm transition-all ${darkMode ? 'bg-brand-accent text-white' : 'bg-brand-primary text-white hover:bg-brand-primary'}`}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`pt-6 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      <DollarSign size={14} className={darkMode ? 'text-brand-accent' : 'text-brand-accent'} />
                      Bank Account Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Bank Name</label>
                        <input 
                          name="bank_name"
                          type="text"
                          defaultValue={currentUser.bank_name || ''}
                          className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                            darkMode 
                              ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20 focus:border-brand-accent' 
                              : 'bg-white border-black/5 text-zinc-900 focus:ring-violet-500 focus:border-violet-500'
                          }`}
                          placeholder="e.g. Maybank, CIMB"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Account Number</label>
                        <input 
                          name="bank_account_number"
                          type="text"
                          defaultValue={currentUser.bank_account_number || ''}
                          className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                            darkMode 
                              ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20 focus:border-brand-accent' 
                              : 'bg-white border-black/5 text-zinc-900 focus:ring-violet-500 focus:border-violet-500'
                          }`}
                          placeholder="1234567890"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>ID Type</label>
                        <select 
                          name="id_type"
                          defaultValue={currentUser.id_type || 'NRIC'}
                          className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                            darkMode 
                              ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20 focus:border-brand-accent' 
                              : 'bg-white border-black/5 text-zinc-900 focus:ring-violet-500 focus:border-violet-500'
                          }`}
                        >
                          <option value="NRIC">NRIC</option>
                          <option value="PASSPORT">Passport</option>
                          <option value="BUSINESS_REG">Business Registration</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>ID Number</label>
                        <input 
                          name="id_number"
                          type="text"
                          defaultValue={currentUser.id_number || ''}
                          className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                            darkMode 
                              ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20 focus:border-brand-accent' 
                              : 'bg-white border-black/5 text-zinc-900 focus:ring-violet-500 focus:border-violet-500'
                          }`}
                          placeholder="e.g. 900101-10-5050"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`pt-6 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      <Palette size={14} className={darkMode ? 'text-brand-accent' : 'text-brand-accent'} />
                      Appearance & Theme
                    </h4>
                    
                    <div className="mb-8">
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-4 ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Color Theme</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Object.entries(THEMES).map(([key, theme]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedTheme(key)}
                            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                              selectedTheme === key 
                                ? (darkMode ? 'border-brand-accent bg-brand-accent/10' : 'border-violet-500 bg-violet-500')
                                : (darkMode ? 'border-violet-500 bg-zinc-50' : 'border-black/5 bg-white hover:border-zinc-200')
                            }`}
                          >
                            <div 
                              className="w-8 h-8 rounded-full shadow-inner"
                              style={{ backgroundColor: theme.accent }}
                            />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${
                              selectedTheme === key 
                                ? (darkMode ? 'text-brand-accent' : 'text-zinc-900')
                                : (darkMode ? 'text-zinc-500' : 'text-zinc-500')
                            }`}>
                              {theme.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {windowWidth >= 768 && (
                      <div className="mb-8">
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-4 ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Display Mode</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setDarkMode(false)}
                            className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                              !darkMode 
                                ? (darkMode ? 'border-brand-accent bg-brand-accent/10' : 'border-violet-500 bg-violet-500')
                                : (darkMode ? 'border-violet-500 bg-zinc-50' : 'border-black/5 bg-white hover:border-zinc-200')
                            }`}
                          >
                            <Sun size={18} className={!darkMode ? 'text-white' : 'text-zinc-500'} />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${
                              !darkMode 
                                ? (darkMode ? 'text-brand-accent' : 'text-zinc-900')
                                : (darkMode ? 'text-zinc-500' : 'text-zinc-500')
                            }`}>
                              Light Mode
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDarkMode(true)}
                            className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                              darkMode 
                                ? (darkMode ? 'border-brand-accent bg-brand-accent/10' : 'border-violet-500 bg-violet-500')
                                : (darkMode ? 'border-violet-500 bg-zinc-50' : 'border-black/5 bg-white hover:border-zinc-200')
                            }`}
                          >
                            <Moon size={18} className={darkMode ? 'text-white' : 'text-zinc-500'} />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${
                              darkMode 
                                ? (darkMode ? 'text-brand-accent' : 'text-zinc-900')
                                : (darkMode ? 'text-zinc-500' : 'text-zinc-500')
                            }`}>
                              Dark Mode
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mb-8">
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-4 ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>App Appearance</label>
                      <button
                        type="button"
                        onClick={() => setReduceTranslucency(!reduceTranslucency)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                          reduceTranslucency 
                            ? (darkMode ? 'border-brand-accent bg-brand-accent/10' : 'border-violet-500 bg-violet-500')
                            : (darkMode ? 'border-violet-500 bg-zinc-50' : 'border-black/5 bg-white hover:border-zinc-200')
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-5 rounded-full relative transition-colors ${reduceTranslucency ? 'bg-brand-accent' : 'bg-zinc-50'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${reduceTranslucency ? 'left-6' : 'left-1'}`} />
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${
                            reduceTranslucency 
                              ? (darkMode ? 'text-brand-accent' : 'text-zinc-900')
                              : (darkMode ? 'text-zinc-500' : 'text-zinc-500')
                          }`}>
                            Reduce deck translucent
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className={`pt-6 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      <BookOpen size={14} className={darkMode ? 'text-brand-accent' : 'text-brand-accent'} />
                      Resources
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('guide')}
                      className={`w-full px-6 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group mb-4 ${
                        darkMode 
                          ? 'bg-zinc-50 border-violet-500 text-zinc-900 hover:bg-brand-accent/10' 
                          : 'bg-brand-surface border-brand-accent/10 text-brand-accent hover:bg-brand-accent/5'
                      }`}
                    >
                      <span>View User Guide & FAQ</span>
                      <ChevronRight size={16} className={`${darkMode ? 'text-zinc-500' : 'text-brand-accent/60'} group-hover:text-brand-accent transition-colors`} />
                    </button>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      <Lock size={14} className={darkMode ? 'text-zinc-900/20' : 'text-zinc-500'} />
                      Security
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setShowPasswordModal(true)}
                      className={`w-full px-6 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group ${
                        darkMode 
                          ? 'bg-zinc-50 border-violet-500 text-zinc-900/60 hover:bg-brand-accent/10' 
                          : 'bg-zinc-50 border-zinc-100 text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      <span>Change Account Password</span>
                      <ChevronRight size={16} className={`${darkMode ? 'text-zinc-900/20' : 'text-zinc-500'} group-hover:text-brand-accent transition-colors`} />
                    </button>
                  </div>

                  <div className={`pt-6 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      <MessageSquare size={14} className={darkMode ? 'text-brand-accent' : 'text-brand-accent'} />
                      Developer Feedback
                    </h4>
                    <div className="space-y-4">
                      <p className={`text-xs font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        Have a suggestion or found a bug? Send a message directly to the developer.
                      </p>
                      <textarea 
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium min-h-[120px] resize-none ${
                          darkMode 
                            ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20 focus:border-brand-accent' 
                            : 'bg-white border-black/5 text-zinc-900 focus:ring-violet-500 focus:border-violet-500'
                        }`}
                        placeholder="Type your feedback here..."
                      />
                      <button 
                        type="button"
                        onClick={handleSendFeedback}
                        disabled={isSendingFeedback || !feedbackMessage.trim()}
                        className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          isSendingFeedback 
                            ? 'opacity-50 cursor-not-allowed' 
                            : ''
                        } ${
                          darkMode 
                            ? 'bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20' 
                            : 'bg-violet-500 text-white hover:bg-violet-500'
                        }`}
                      >
                        {isSendingFeedback ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}
                        {isSendingFeedback ? 'Sending...' : 'Send Feedback'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button 
                      type="submit"
                      className={`flex-1 py-5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] ${
                        darkMode 
                          ? 'bg-brand-accent text-white shadow-brand-accent/20 hover:opacity-90' 
                          : 'bg-brand-primary text-white shadow-brand-primary/20 hover:bg-brand-primary'
                      }`}
                    >
                      Save Changes
                    </button>
                    <button 
                      type="button"
                      onClick={handleLogout}
                      className={`px-8 py-5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest transition-all border active:scale-[0.98] flex items-center gap-2 ${
                        darkMode 
                          ? 'bg-rose-500 text-white border-rose-500 hover:bg-rose-500' 
                          : 'bg-rose-500 text-white border-rose-500 hover:bg-rose-500'
                      }`}
                    >
                      <LogOut size={18} />
                      Sign Out
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-brand-primary text-white p-8 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-10 h-10 bg-brand-accent text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-accent/20">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1 text-brand-accent">Security Tip</h4>
                    <p className="text-xs leading-relaxed text-white/70">Keep your bank details updated to ensure smooth incentive payouts. Your information is encrypted and only visible to the clinic administrator.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-zinc-900">Task Management</h2>
                  <p className="text-zinc-500 text-sm font-medium">Track and manage clinic operations</p>
                </div>
                { (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                  <button 
                    onClick={() => {
                      setEditingTask(null);
                      setTaskDueDate(new Date());
                      setShowTaskModal(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary transition-all active:scale-95 shadow-lg shadow-brand-primary/20"
                  >
                    <Plus size={16} />
                    New Task
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 pb-44">
                {tasks.map((task) => (
                  <motion.div 
                    key={task.id}
                    layout
                    className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`mt-1 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          task.status === 'completed' ? 'bg-emerald-500 text-white' : 
                          task.status === 'in_progress' ? 'bg-brand-primary text-white' : 'bg-zinc-50 text-zinc-500'
                        }`}>
                          {task.status === 'completed' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-zinc-900 mb-1">{task.title}</h3>
                          <p className="text-sm text-zinc-500 line-clamp-2 mb-3">{task.description}</p>
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              <Calendar size={12} className="text-zinc-900" />
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              <User size={12} className="text-zinc-900" />
                              Assigned: {task.assigned_to_name || 'Unassigned'}
                            </div>
                            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
                              task.status === 'completed' ? 'text-zinc-900' : 
                              task.status === 'in_progress' ? 'text-zinc-900' : 'text-zinc-500'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                task.status === 'completed' ? 'bg-emerald-500' : 
                                task.status === 'in_progress' ? 'bg-brand-primary' : 'bg-violet-500'
                              }`} />
                              {task.status.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <select 
                          value={task.status}
                          onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                          className="px-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all appearance-none cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>

                        { (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                          <div className="flex items-center gap-2 pl-3 border-l border-zinc-100">
                            <button 
                              onClick={() => {
                                setEditingTask(task);
                                setTaskDueDate(new Date(task.due_date));
                                setShowTaskModal(true);
                              }}
                              className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-50 hover:text-zinc-500 transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-2 rounded-lg text-zinc-500 hover:bg-rose-500 hover:text-white transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {tasks.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-zinc-200">
                    <div className="w-20 h-20 bg-zinc-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                      <CheckSquare size={32} className="text-zinc-500" />
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-zinc-900 mb-2">No tasks found</h3>
                    <p className="text-zinc-500 text-sm font-medium">Everything is up to date!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'promotions' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mx-auto space-y-8 px-4 pb-44 ${ (currentUser.role === 'admin' || currentUser.role === 'manager') ? 'max-w-6xl' : 'max-w-md'}`}
            >
              <div className={`mb-8 ${darkMode ? 'bg-brand-primary p-8 rounded-[2.5rem] shadow-2xl shadow-brand-primary/20 relative overflow-hidden' : ''}`}>
                {darkMode && <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full blur-3xl -mr-16 -mt-16" />}
                <h2 className={`text-4xl font-black tracking-tighter mb-2 ${darkMode ? 'text-zinc-900 relative z-10' : 'text-zinc-900'}`}>Promotions & Services</h2>
                <p className={`${darkMode ? 'text-zinc-900/70 relative z-10' : 'text-zinc-500'} text-sm font-medium`}>Download posters to share with your network</p>
              </div>

              { (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                <div className="space-y-12">
                  <div className={`flex items-center gap-4 border-b pb-4 ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                    <button 
                      onClick={() => setPromoSubTab('manage')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${promoSubTab === 'manage' ? (darkMode ? 'bg-brand-accent text-white' : 'bg-brand-primary text-white') : (darkMode ? 'text-zinc-500' : 'text-zinc-500 hover:bg-zinc-50')}`}
                    >
                      Manage Services & Promotions
                    </button>
                  </div>

                  <div className={`${darkMode ? 'bg-[#1e293b] border-violet-500' : 'bg-white border-black/5 shadow-sm'} p-8 rounded-[2.5rem] border`}>
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className={`text-2xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{editingService?.id ? 'Edit Service / Promotion' : 'Add New Service / Promotion'}</h3>
                        <p className={`text-sm font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Configure service details, incentives, and marketing materials</p>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${darkMode ? 'bg-brand-accent text-white shadow-brand-accent/20' : 'bg-rose-500 text-white shadow-brand-accent'}`}>
                        <Zap size={24} />
                      </div>
                    </div>

                                        <AddServiceForm 
                                          onSuccess={() => {
                                            fetchServices();
                                            setEditingService(null);
                                          }} 
                                          onCancel={() => setEditingService(null)}
                                          initialData={editingService} 
                                          categories={serviceCategories}
                                        />
                  </div>
                  
                  <div className={`${darkMode ? 'bg-[#1e293b] border-violet-500' : 'bg-white border-black/5 shadow-sm'} p-8 rounded-[2.5rem] border mt-8`}>
                        {/* List Section */}
                      <div className="space-y-6">
                        <label className="block text-xs font-bold text-zinc-500 uppercase ml-1">Existing Services & Promotions</label>
                        <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                          {services.map(service => (
                            <div key={service.id} className={`p-6 rounded-3xl border transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-transparent border-zinc-100 hover:border-violet-500'}`}>
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{service.name}</h4>
                                    {service.is_featured && <Star size={10} className="text-brand-accent" fill="currentColor" />}
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${service.type === 'Promotion' ? 'bg-brand-accent text-white' : 'bg-brand-primary text-white'}`}>
                                      {service.type || 'Service'}
                                    </span>
                                    {(() => {
                                      const status = getServiceStatus(service);
                                      return (
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                          status === 'active' ? 'bg-emerald-500 text-white' : 
                                          status === 'upcoming' ? 'bg-brand-surface text-zinc-900' : 
                                          'bg-rose-500 text-white'
                                        }`}>
                                          {status}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  <p className="text-[10px] text-zinc-500 font-medium line-clamp-1">{service.description || 'No description provided'}</p>
                                  {(service.start_date || service.end_date) && (
                                    <div className="flex items-center gap-1 mt-1 text-[8px] font-bold text-zinc-500">
                                      <Clock size={8} />
                                      <span>
                                        {(() => {
                                          const d = service.start_date;
                                          if (!d) return 'Start';
                                          if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                                            const [y, m, day] = d.split('-').map(Number);
                                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                            return `${day} ${months[m-1]} ${y}`;
                                          }
                                          return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                                        })()} 
                                        {' - '} 
                                        {(() => {
                                          const d = service.end_date;
                                          if (!d) return 'End';
                                          if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                                            const [y, m, day] = d.split('-').map(Number);
                                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                            return `${day} ${months[m-1]} ${y}`;
                                          }
                                          return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                                        })()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => {
                                    setEditingService(service);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }} className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors">
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteService(service.id)} className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Price</p>
                                  <p className="text-xs font-bold">{clinicProfile.currency}{service.base_price}</p>
                                </div>
                                <div>
                                  <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Incentive</p>
                                  <p className="text-xs font-bold text-zinc-900">{clinicProfile.currency}{service.commission_rate}</p>
                                </div>
                                <div>
                                  <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Poster</p>
                                  <p className="text-xs font-bold">{service.image_url ? 'Yes' : 'No'}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {services.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-zinc-100 rounded-3xl">
                              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">No services configured</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
              )}

              <div className="space-y-12">
                {/* Categories & Carousels */}
                {[
                  { title: 'Featured', filter: (s: Service) => s.is_featured && checkBranchAccess(s) },
                  ...serviceCategories.map(cat => ({ 
                    title: cat, 
                    filter: (s: Service) => {
                      const sCat = (s.category || '').trim().toLowerCase();
                      const targetCat = cat.trim().toLowerCase();
                      return sCat === targetCat && checkBranchAccess(s);
                    }
                  }))
                ].map((category, idx) => {
                  const displayServices = services.length > 0 ? services : promotions.map(p => ({
                    id: p.id,
                    name: p.title,
                    description: p.description,
                    start_date: p.start_date,
                    end_date: p.end_date,
                    type: 'Promotion',
                    base_price: 0,
                    commission_rate: 0,
                    is_featured: true,
                    allowances: {},
                    branches: {}
                  } as Service));

                  let filteredServices = displayServices.filter(item => {
                    return checkBranchAccess(item) && category.filter(item);
                  });

                  if (filteredServices.length === 0) {
                    filteredServices = [
                      { id: -1, name: `${category.title} Coming Soon`, base_price: 0, commission_rate: 0, allowances: {}, category: category.title, type: 'Service', description: 'Stay tuned for more services in this category.' },
                      { id: -2, name: 'More info coming', base_price: 0, commission_rate: 0, allowances: {}, category: category.title, type: 'Service', description: 'We are working on adding new services.' },
                    ] as Service[];
                  }

                  return (
                    <div key={idx} className="space-y-6">
                      <h3 className={`text-2xl font-bold tracking-tight px-2 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                        {category.title}
                      </h3>
                      {isMobile ? (
                          <PromotionsCarousel 
                            size={idx === 0 ? 'large' : 'small'}
                            items={filteredServices} 
                            onClick={(item) => {
                              if (item.id > 0) {
                                setSelectedPromo(item);
                                setIsPromoModalOpen(true);
                              }
                            }} 
                          />
                        ) : (
                          <div className="flex overflow-x-auto gap-6 pb-4 px-2 scrollbar-hide flex-nowrap">
                            {filteredServices.map((item) => (
                              <div key={item.id} className="flex-shrink-0 w-[3.2rem] h-[4rem] flex flex-col gap-2">
                                <div className="scale-[0.2] origin-top-left">
                                  <ModernPromotionCard 
                                    item={item} 
                                    onClick={() => {
                                      if (item.id > 0) {
                                        setSelectedPromo(item);
                                        setIsPromoModalOpen(true);
                                      }
                                    }} 
                                  />
                                </div>
                                <div className="px-1">
                                  <h4 className="text-[6px] font-bold text-zinc-900 truncate">{item.name}</h4>
                                  <p className="text-[5px] text-zinc-500 font-medium">
                                    {item.promo_price ? `RM${item.promo_price}` : `RM${item.base_price || 0}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  );
                })}

                {(services.length > 0 ? services : promotions).filter((item: any) => {
                  return currentUser.role === 'admin' || currentUser.role === 'manager' || 
                    !item.branches ||
                    (Array.isArray(item.branches) && (item.branches.length === 0 || !currentUser.branch || item.branches.includes(currentUser.branch))) ||
                    (!Array.isArray(item.branches) && (Object.keys(item.branches).length === 0 || !currentUser.branch || (item.branches[currentUser.branch] && item.branches[currentUser.branch].active)));
                }).length === 0 && (
                  <div className="col-span-full text-center py-20">
                    <div className={`w-20 h-20 ${darkMode ? 'bg-zinc-900' : 'bg-transparent'} rounded-[2rem] flex items-center justify-center mx-auto mb-6`}>
                      <Zap size={32} className="text-zinc-500" />
                    </div>
                    <h3 className={`text-xl font-black tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>No active promotions</h3>
                    <p className="text-zinc-500 text-sm font-medium">Check back later for exciting new offers!</p>
                  </div>
                )}
              </div>

              {/* Detail Modal */}
              <PromotionDetailModal 
                item={selectedPromo} 
                isOpen={isPromoModalOpen} 
                onClose={() => setIsPromoModalOpen(false)} 
                clinicProfile={clinicProfile}
                darkMode={darkMode}
                currentUser={currentUser}
              />
            </motion.div>
          )}

          {activeTab === 'setup' && currentUser.role === 'admin' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
                <button 
                  onClick={() => setSetupSubTab('staff')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'staff' ? 'bg-brand-primary text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Staff Setup
                </button>
                <button 
                  onClick={() => setSetupSubTab('booking')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'booking' ? 'bg-brand-primary text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Booking Settings
                </button>
                <button 
                  onClick={() => setSetupSubTab('auth')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'auth' ? 'bg-brand-primary text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Authentication
                </button>
                <button 
                  onClick={() => setSetupSubTab('clinic')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'clinic' ? 'bg-brand-primary text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Clinic Profile
                </button>
                <button 
                  onClick={() => setSetupSubTab('roles')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'roles' ? 'bg-brand-primary text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Roles & Permissions
                </button>
                <button 
                  onClick={() => setSetupSubTab('referral')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'referral' ? 'bg-brand-primary text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Referral Settings
                </button>
                <button 
                  onClick={() => setSetupSubTab('branches')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'branches' ? 'bg-brand-primary text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Branch Management
                </button>
                <button 
                  onClick={() => setSetupSubTab('trash')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'trash' ? 'bg-brand-primary text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Trash Bin
                </button>
                <button 
                  onClick={() => setSetupSubTab('categories')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'categories' ? 'bg-brand-primary text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Categories
                </button>
              </div>

              {setupSubTab === 'categories' && (
                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                  <h3 className="font-semibold mb-6">Service Categories</h3>
                  <div className="space-y-4">
                    {serviceCategories.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
                        {editingCategoryIndex === idx ? (
                          <input 
                            value={editingCategoryValue}
                            onChange={(e) => setEditingCategoryValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setServiceCategories(prev => prev.map((c, i) => i === idx ? editingCategoryValue : c));
                                setEditingCategoryIndex(null);
                              }
                            }}
                            className="px-2 py-1 rounded border"
                          />
                        ) : (
                          <span>{cat}</span>
                        )}
                        <div className="flex gap-2">
                          {editingCategoryIndex === idx ? (
                            <button onClick={() => {
                              setServiceCategories(prev => prev.map((c, i) => i === idx ? editingCategoryValue : c));
                              setEditingCategoryIndex(null);
                            }} className="text-emerald-600">Save</button>
                          ) : (
                            <button onClick={() => {
                              setEditingCategoryIndex(idx);
                              setEditingCategoryValue(cat);
                            }} className="text-blue-600">Edit</button>
                          )}
                          <button onClick={() => setServiceCategories(prev => prev.filter((_, i) => i !== idx))} className="text-rose-500">Remove</button>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="New category name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setServiceCategories(prev => [...prev, e.currentTarget.value]);
                            e.currentTarget.value = '';
                          }
                        }}
                        className="flex-1 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              )}
              {setupSubTab === 'staff' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm sticky top-8">
                      <h3 className="font-semibold mb-6">{editingStaff?.id ? 'Edit Staff' : 'Add New Staff'}</h3>
                      <form onSubmit={handleSaveStaff} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Full Name</label>
                          <input 
                            type="text" 
                            required
                            value={editingStaff?.name || ''}
                            onChange={(e) => setEditingStaff(prev => ({...(prev || {}), name: e.target.value}))}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Email</label>
                          <input 
                            type="email" 
                            required
                            value={editingStaff?.email || ''}
                            onChange={(e) => setEditingStaff(prev => ({...(prev || {}), email: e.target.value}))}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Phone Number</label>
                          <input 
                            type="text" 
                            value={editingStaff?.phone || ''}
                            onChange={(e) => setEditingStaff(prev => ({...(prev || {}), phone: e.target.value}))}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="e.g. 60123456789"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Staff ID Code</label>
                            <input 
                              type="text" 
                              required
                              value={editingStaff?.staff_id_code || ''}
                              onChange={(e) => setEditingStaff(prev => ({...(prev || {}), staff_id_code: e.target.value.toUpperCase()}))}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                              placeholder="e.g. HR001"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Branch</label>
                            <select 
                              required
                              value={editingStaff?.branch || ''}
                              onChange={(e) => setEditingStaff(prev => ({...(prev || {}), branch: e.target.value}))}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                              <option value="">Select Branch</option>
                              {branches.map(b => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Department</label>
                            <input 
                              type="text" 
                              value={editingStaff?.department || ''}
                              onChange={(e) => setEditingStaff(prev => ({...(prev || {}), department: e.target.value}))}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Position</label>
                            <input 
                              type="text" 
                              value={editingStaff?.position || ''}
                              onChange={(e) => setEditingStaff(prev => ({...(prev || {}), position: e.target.value}))}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Employment</label>
                            <select 
                              value={editingStaff?.employment_status || 'permanent'}
                              onChange={(e) => setEditingStaff(prev => ({...(prev || {}), employment_status: e.target.value}))}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                              <option value="permanent">Permanent</option>
                              <option value="contract">Contract</option>
                              <option value="locum">Locum</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Date Joined</label>
                            <input 
                              type="date" 
                              value={editingStaff?.date_joined || ''}
                              onChange={(e) => setEditingStaff(prev => ({...(prev || {}), date_joined: e.target.value}))}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Role</label>
                          <select 
                            required
                            value={editingStaff?.role || 'affiliate'}
                            onChange={(e) => setEditingStaff(prev => ({...(prev || {}), role: e.target.value}))}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="receptionist">Receptionist</option>
                            <option value="affiliate">Affiliate</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Custom Referral Code</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              required
                              value={editingStaff?.promo_code || ''}
                              onChange={(e) => setEditingStaff(prev => ({...(prev || {}), promo_code: e.target.value.toUpperCase()}))}
                              className="flex-1 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                              placeholder="e.g. SMITH10"
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                const namePart = (editingStaff?.name || 'STAFF').split(' ')[0].toUpperCase();
                                const randomPart = Math.floor(10 + Math.random() * 90);
                                setEditingStaff(prev => ({...(prev || {}), promo_code: `${namePart}${randomPart}`}));
                              }}
                              className="px-3 bg-zinc-50 text-zinc-500 rounded-xl hover:bg-zinc-50 transition-colors"
                              title="Generate random code"
                            >
                              <QrCode size={18} />
                            </button>
                          </div>
                          <p className="mt-1 text-[10px] text-zinc-500 ml-1 italic">Must be unique. Used for tracking referrals.</p>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <button 
                            type="submit"
                            disabled={isSavingSetup}
                            className="flex-1 bg-brand-primary text-white py-3 rounded-xl font-medium hover:bg-brand-primary transition-colors disabled:opacity-50"
                          >
                            {isSavingSetup ? 'Saving...' : 'Save Staff'}
                          </button>
                          {editingStaff && (
                            <button 
                              type="button"
                              onClick={() => setEditingStaff(null)}
                              className="px-4 bg-zinc-50 text-zinc-500 py-3 rounded-xl font-medium hover:bg-zinc-50 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50/50">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Staff Directory</h3>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={async () => {
                              try {
                                const { res, data } = await safeFetch('/api/debug/supabase');
                                alert(`Database Status: ${data.message}\n\nReport:\n${JSON.stringify(data.report, null, 2)}`);
                              } catch (err: any) {
                                alert(`Failed to check database: ${err.message}`);
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-500 hover:bg-zinc-50 transition-colors shadow-sm"
                          >
                            <Activity size={12} />
                            Diagnostics
                          </button>
                          <button 
                            onClick={fetchStaff}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-500 hover:bg-zinc-50 transition-colors shadow-sm"
                          >
                            <RefreshCw size={12} />
                            Refresh
                          </button>
                        </div>
                      </div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-100">
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">No.</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Staff Member</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">HR Info</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Wallet ({clinicProfile.currency})</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {staffPerformance.map((staff, index) => (
                            <tr key={staff.id} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="p-4 text-sm text-zinc-500 font-medium">{index + 1}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-zinc-50 overflow-hidden flex items-center justify-center shrink-0">
                                    {staff.profile_picture ? (
                                      <img src={staff.profile_picture} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <UserCircle size={16} className="text-zinc-500" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{staff.nickname || staff.name}</p>
                                    {staff.nickname && <p className="text-[10px] text-zinc-500">Real Name: {staff.name}</p>}
                                    <p className="text-[10px] text-zinc-500">{staff.email} • <span className="font-bold text-zinc-900">{staff.referral_code || staff.promo_code}</span></p>
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold uppercase text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                                  {staff.role}
                                </span>
                              </td>
                              <td className="p-4">
                                <p className="text-xs font-medium text-zinc-500">{staff.staff_id_code || 'N/A'}</p>
                                <p className="text-[10px] text-zinc-500">{staff.branch} • {staff.department}</p>
                                {staff.bank_name && (
                                  <p className="text-[9px] font-bold text-zinc-900 mt-1 uppercase tracking-tighter">
                                    {staff.bank_name}: {staff.bank_account_number}
                                  </p>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col gap-2">
                                  <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider w-fit ${
                                    staff.is_approved ? 'bg-violet-500 text-white border border-violet-500' : 
                                    (staff.employment_status === 'rejected' ? 'bg-rose-500 text-white border border-rose-500' : 'bg-rose-500 text-white border border-brand-accent')
                                  }`}>
                                    {staff.is_approved ? 'Approved' : (staff.employment_status === 'rejected' ? 'Rejected' : 'Pending')}
                                  </span>
                                  <button 
                                    onClick={() => handleApproveStaff(staff.id, !staff.is_approved)}
                                    className={`text-[9px] font-bold uppercase tracking-tighter underline decoration-dotted underline-offset-2 ${staff.is_approved ? 'text-zinc-900 hover:text-zinc-900' : 'text-zinc-900 hover:text-zinc-900'}`}
                                  >
                                    {staff.is_approved ? 'Revoke Approval' : (staff.employment_status === 'rejected' ? 'Restore & Approve' : 'Approve Now')}
                                  </button>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-zinc-500 uppercase font-bold">Pending</span>
                                    <span className="text-xs font-bold text-zinc-900">{(staff.pending_earnings || 0).toFixed(0)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-zinc-500 uppercase font-bold">Approved</span>
                                    <span className="text-xs font-bold text-zinc-900">{(staff.approved_earnings || 0).toFixed(0)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-zinc-500 uppercase font-bold">Paid</span>
                                    <span className="text-xs font-bold text-zinc-900">{(staff.paid_earnings || 0).toFixed(0)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-zinc-500 uppercase font-bold">Lifetime</span>
                                    <span className="text-xs font-bold text-zinc-900">{(staff.lifetime_earnings || 0).toFixed(0)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => handleResetPassword(staff.id)} title="Reset Password" className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors">
                                    <Key size={14} />
                                  </button>
                                  <button onClick={() => setEditingStaff(staff)} className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors">
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteStaff(staff.id)} className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : setupSubTab === 'trash' ? (
                <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50/50">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Trash Bin (Deleted Staff)</h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={fetchStaff}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-500 hover:bg-zinc-50 transition-colors shadow-sm"
                      >
                        <RefreshCw size={12} />
                        Refresh
                      </button>
                    </div>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">No.</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Staff Member</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Role & Details</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedStaffList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-zinc-500">
                            No deleted staff found in the trash bin.
                          </td>
                        </tr>
                      ) : (
                        deletedStaffList.map((staff, index) => (
                          <tr key={staff.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                            <td className="p-4 text-sm text-zinc-500 font-medium">{index + 1}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-500 font-bold overflow-hidden">
                                  {staff.profile_picture ? (
                                    <img src={staff.profile_picture} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    staff.name.charAt(0)
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{staff.nickname || staff.name}</p>
                                  {staff.nickname && <p className="text-[10px] text-zinc-500">Real Name: {staff.name}</p>}
                                  <p className="text-[10px] text-zinc-500">{staff.email} • <span className="font-bold text-zinc-900">{staff.referral_code || staff.promo_code}</span></p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-50 text-zinc-500 w-fit">
                                  {staff.role}
                                </span>
                                <p className="text-xs font-medium text-zinc-500">{staff.staff_id_code || 'N/A'}</p>
                                <p className="text-[10px] text-zinc-500">{staff.branch} • {staff.department}</p>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleRestoreStaff(staff.id)} title="Restore Staff" className="flex items-center gap-1 px-3 py-1.5 bg-violet-500 text-white hover:bg-violet-500 rounded-lg text-xs font-bold transition-colors">
                                  <RefreshCw size={14} />
                                  Restore
                                </button>
                                <button onClick={() => handlePermanentDeleteStaff(staff.id)} title="Permanently Delete" className="flex items-center gap-1 px-3 py-1.5 bg-rose-500 text-white hover:bg-rose-500 rounded-lg text-xs font-bold transition-colors">
                                  <Trash2 size={14} />
                                  Delete Permanently
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : setupSubTab === 'clinic' ? (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                  <h3 className="font-semibold mb-6">Clinic Profile</h3>
                  <div className="space-y-6">
                    <div className="flex items-center gap-6 mb-8">
                      <div className="w-24 h-24 rounded-3xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden relative group">
                        <Logo className="w-full h-full" logoUrl={clinicProfile.logoUrl} />
                        {isGeneratingIcon && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                            <RefreshCw size={24} className="text-zinc-900 animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-zinc-900 mb-1">Clinic Logo</h4>
                        <p className="text-xs text-zinc-500 mb-3">Generate a professional healthcare-themed icon using AI.</p>
                        <div className="flex flex-wrap gap-2">
                          <button 
                            onClick={handleGenerateIcon}
                            disabled={isGeneratingIcon}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-xl text-xs font-bold hover:bg-violet-500 transition-all disabled:opacity-50"
                          >
                            <Sparkles size={14} />
                            {isGeneratingIcon ? 'Generating...' : 'Generate AI Icon'}
                          </button>
                          <div className="flex-1 min-w-[200px]">
                            <input 
                              type="text"
                              placeholder="Or paste logo URL here..."
                              value={clinicProfile.logoUrl || ''}
                              onChange={(e) => setClinicProfile(prev => ({ ...prev, logoUrl: e.target.value }))}
                              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Clinic Name</label>
                        <input 
                          type="text"
                          value={clinicProfile.name}
                          onChange={(e) => setClinicProfile({ ...clinicProfile, name: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Currency Code</label>
                        <input 
                          type="text"
                          value={clinicProfile.currency}
                          onChange={(e) => setClinicProfile({ ...clinicProfile, currency: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                          placeholder="RM, $, etc."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Address</label>
                      <textarea 
                        value={clinicProfile.address}
                        onChange={(e) => setClinicProfile({ ...clinicProfile, address: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium h-24 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Phone Number</label>
                        <input 
                          type="tel"
                          value={clinicProfile.phone}
                          onChange={(e) => setClinicProfile({ ...clinicProfile, phone: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Clinic Status</label>
                        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-sm font-medium text-zinc-900">Active & Verified</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Email Address</label>
                        <input 
                          type="email"
                          value={clinicProfile.email}
                          onChange={(e) => setClinicProfile({ ...clinicProfile, email: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Custom Domain (Optional)</label>
                        <input 
                          type="text"
                          value={clinicProfile.customDomain || ''}
                          onChange={(e) => setClinicProfile({ ...clinicProfile, customDomain: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                          placeholder="e.g., refer.myclinic.com"
                        />
                        <p className="text-[10px] text-zinc-500 mt-1.5 ml-1">If set, this domain will be used for QR codes and referral links.</p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        setIsSavingSetup(true);
                        try {
                          await safeFetch(`${apiBaseUrl}/api/settings`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key: 'clinic', value: clinicProfile })
                          });
                          alert('Clinic profile saved!');
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setIsSavingSetup(false);
                        }
                      }}
                      disabled={isSavingSetup}
                      className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-primary transition-all shadow-lg shadow-brand-primary/10 disabled:opacity-50"
                    >
                      {isSavingSetup ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              ) : setupSubTab === 'branches' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm sticky top-8">
                      <h3 className="font-semibold mb-6">{editingBranch?.id ? 'Edit Branch' : 'Create New Branch'}</h3>
                      <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setIsSavingSetup(true);
                          try {
                            const url = editingBranch?.id ? `${apiBaseUrl}/api/branches/${editingBranch.id}` : `${apiBaseUrl}/api/branches`;
                            const method = editingBranch?.id ? 'PUT' : 'POST';
                            const { res, data } = await safeFetch(url, {
                              method,
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(editingBranch)
                            });
                            if (res.ok) {
                              alert(`Branch ${editingBranch?.id ? 'updated' : 'created'}!`);
                              setEditingBranch(null);
                              fetchBranches();
                            } else {
                              alert(`Failed to save branch: ${data.error || 'Unknown error'}`);
                            }
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setIsSavingSetup(false);
                          }
                        }} 
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Branch Name</label>
                          <input 
                            type="text" 
                            required
                            value={editingBranch?.name || ''}
                            onChange={(e) => setEditingBranch(prev => ({...(prev || {}), name: e.target.value}))}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="e.g. Bangi, Kajang"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Location</label>
                          <input 
                            type="text" 
                            value={editingBranch?.location || ''}
                            onChange={(e) => setEditingBranch(prev => ({...(prev || {}), location: e.target.value}))}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="e.g. Selangor"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">WhatsApp Number</label>
                          <input 
                            type="tel" 
                            value={editingBranch?.whatsapp_number || ''}
                            onChange={(e) => setEditingBranch(prev => ({...(prev || {}), whatsapp_number: e.target.value}))}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="e.g. 60123456789"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button 
                            type="submit"
                            disabled={isSavingSetup}
                            className="flex-1 bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-primary transition-all disabled:opacity-50"
                          >
                            {isSavingSetup ? 'Saving...' : (editingBranch?.id ? 'Update Branch' : 'Create Branch')}
                          </button>
                          {editingBranch && (
                            <button 
                              type="button"
                              onClick={() => setEditingBranch(null)}
                              className="px-4 py-3 rounded-xl bg-zinc-50 text-zinc-500 font-bold hover:bg-zinc-50 transition-all"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-100">
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">No.</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Branch Name</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Location</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">WhatsApp</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Members</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {branches.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-12 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-500">
                                    <MapPin size={24} />
                                  </div>
                                  <p className="text-sm font-bold text-zinc-500">No branches found</p>
                                  {dbError === 'branches' ? (
                                    <div className="mt-4 p-6 bg-rose-500 border border-rose-500 rounded-2xl max-w-md">
                                      <p className="text-xs font-bold text-zinc-900 uppercase mb-2">Database Setup Required</p>
                                      <p className="text-xs text-zinc-900 mb-4">The 'branches' table is missing from your Supabase database. Please run the following SQL in your Supabase SQL Editor:</p>
                                      <pre className="text-[10px] bg-white p-3 rounded-xl border border-rose-500 overflow-x-auto text-left font-mono text-zinc-500 mb-4">
{`CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.branch_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id INTEGER REFERENCES public.staff(id) ON DELETE CASCADE,
  current_branch TEXT,
  requested_branch TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable security for branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.branches FOR INSERT WITH CHECK (true);

-- Enable security for branch_change_requests
ALTER TABLE public.branch_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow staff to read own requests" ON public.branch_change_requests FOR SELECT USING (true);
CREATE POLICY "Allow staff to insert requests" ON public.branch_change_requests FOR INSERT WITH CHECK (true);`}
                                      </pre>
                                      <button 
                                        onClick={() => {
                                          navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.branch_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id INTEGER REFERENCES public.staff(id) ON DELETE CASCADE,
  current_branch TEXT,
  requested_branch TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable security for branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.branches FOR INSERT WITH CHECK (true);

-- Enable security for branch_change_requests
ALTER TABLE public.branch_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow staff to read own requests" ON public.branch_change_requests FOR SELECT USING (true);
CREATE POLICY "Allow staff to insert requests" ON public.branch_change_requests FOR INSERT WITH CHECK (true);`);
                                          alert('SQL copied to clipboard!');
                                        }}
                                        className="w-full py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-500 transition-colors"
                                      >
                                        Copy SQL to Clipboard
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-zinc-500">Create your first clinic branch to get started.</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            branches.map((branch, index) => (
                              <tr key={branch.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                                <td className="p-4 text-sm text-zinc-500 font-medium">{index + 1}</td>
                                <td className="p-4">
                                  <span className="font-bold text-zinc-900">{branch.name}</span>
                                </td>
                                <td className="p-4 text-sm text-zinc-500">{branch.location || 'N/A'}</td>
                                <td className="p-4 text-sm text-zinc-500">
                                  {branch.whatsapp_number ? (
                                    <a 
                                      href={`https://wa.me/${branch.whatsapp_number}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-emerald-600 hover:underline font-bold"
                                    >
                                      <MessageCircle size={14} />
                                      {branch.whatsapp_number}
                                    </a>
                                  ) : 'N/A'}
                                </td>
                                <td className="p-4">
                                  <span className="px-2 py-1 bg-zinc-50 text-zinc-500 rounded-lg text-[10px] font-bold">
                                    {activeStaffList.filter(s => s.branch === branch.name).length} members
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={async () => {
                                        const { res, data } = await safeFetch(`${apiBaseUrl}/api/branches/${branch.name}/performance`);
                                        if (res.ok) setBranchPerformance({ ...data, name: branch.name });
                                      }}
                                      className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
                                      title="View Performance"
                                    >
                                      <TrendingUp size={16} />
                                    </button>
                                    <button onClick={() => setEditingBranch(branch)} className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors">
                                      <Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        showConfirm(
                                          'Delete Branch',
                                          `Are you sure you want to delete branch "${branch.name}"?`,
                                          async () => {
                                            const { res } = await safeFetch(`${apiBaseUrl}/api/branches/${branch.id}`, { method: 'DELETE' });
                                            if (res.ok) fetchBranches();
                                          }
                                        );
                                      }}
                                      className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {branchPerformance && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-brand-primary text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden"
                      >
                        <button 
                          onClick={() => setBranchPerformance(null)}
                          className="absolute top-6 right-6 text-white/40 hover:text-white"
                        >
                          <Plus size={20} className="rotate-45" />
                        </button>
                        <h4 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6">Performance: {branchPerformance.name}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                          <div>
                            <p className="text-3xl font-black tracking-tighter mb-1">{branchPerformance.total}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Total Referrals</p>
                          </div>
                          <div>
                            <p className="text-3xl font-black tracking-tighter mb-1 text-white">{branchPerformance.successful}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Successful</p>
                          </div>
                          <div>
                            <p className="text-3xl font-black tracking-tighter mb-1 text-white">{branchPerformance.pending}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Pending</p>
                          </div>
                          <div>
                            <p className="text-3xl font-black tracking-tighter mb-1 text-white">RM {branchPerformance.total_commission}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Total Commission</p>
                          </div>
                        </div>
                        
                        <div className="mt-8 pt-8 border-t border-white/10">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Branch Members</h5>
                          <div className="flex flex-wrap gap-2">
                            {activeStaffList.filter(s => s.branch === branchPerformance.name).map(member => (
                              <div key={member.id} className="px-3 py-1.5 bg-zinc-50 rounded-xl border border-violet-500 flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center text-[8px] font-bold">
                                  {member?.name?.charAt(0) || '?'}
                                </div>
                                <span className="text-xs font-medium">{member.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              ) : setupSubTab === 'referral' ? (
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
                    <h3 className="text-xl font-black mb-6">Referral Configuration</h3>
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Referral Types</label>
                          <div className="flex flex-wrap gap-2">
                            {referralSettings.types.map(type => (
                              <span key={type} className="px-3 py-1.5 bg-zinc-50 text-zinc-900 rounded-lg text-xs font-bold">{type}</span>
                            ))}
                            <button className="px-3 py-1.5 border border-dashed border-zinc-300 text-zinc-500 rounded-lg text-xs font-bold hover:border-violet-500 hover:text-zinc-900 transition-colors">+ Add Type</button>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Default Commission ({clinicProfile.currency})</label>
                          <input 
                            type="number" 
                            value={referralSettings.defaultCommission}
                            onChange={(e) => setReferralSettings({...referralSettings, defaultCommission: Number(e.target.value)})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Eligibility Criteria</label>
                        <textarea 
                          value={referralSettings.eligibilityCriteria}
                          onChange={(e) => setReferralSettings({...referralSettings, eligibilityCriteria: e.target.value})}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                        />
                      </div>

                      <div className="pt-6 border-t border-zinc-100">
                        <h4 className="font-bold mb-4">Staff Referral Quotas</h4>
                        <div className="bg-zinc-50 rounded-2xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-zinc-50">
                                <th className="p-3 font-black uppercase tracking-widest text-zinc-500">No.</th>
                                <th className="p-3 font-black uppercase tracking-widest text-zinc-500">Staff Member</th>
                                <th className="p-3 font-black uppercase tracking-widest text-zinc-500">Monthly Quota</th>
                                <th className="p-3 font-black uppercase tracking-widest text-zinc-500">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                              {activeStaffList.map((staff, index) => (
                                <tr key={staff.id}>
                                  <td className="p-3 text-zinc-500 font-medium">{index + 1}</td>
                                  <td className="p-3 font-bold">{staff.name}</td>
                                  <td className="p-3">
                                    <input 
                                      type="number"
                                      value={referralSettings.quotas[staff.id] || 0}
                                      onChange={(e) => {
                                        const newQuotas = { ...referralSettings.quotas, [staff.id]: Number(e.target.value) };
                                        setReferralSettings({ ...referralSettings, quotas: newQuotas });
                                      }}
                                      className="w-20 px-2 py-1 rounded bg-white border border-zinc-200"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <button className="text-zinc-900 font-bold hover:underline">Update</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          safeFetch(`${apiBaseUrl}/api/settings`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key: 'referral', value: referralSettings })
                          });
                          alert('Referral settings saved!');
                        }}
                        className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-primary transition-all"
                      >
                        Save Referral Settings
                      </button>
                    </div>
                  </div>
                </div>
              ) : setupSubTab === 'roles' ? (
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                    <h3 className="font-semibold mb-6">Roles & Permissions</h3>
                    <div className="space-y-8">
                      {Object.entries(rolesConfig).map(([role, perms]) => (
                        <div key={role} className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                          <div className="flex items-center justify-between mb-6">
                            <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900">{role}</h4>
                            <span className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">System Role</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(perms as RolePermissions).map(([permKey, value]) => (
                              <div key={permKey} className="flex items-center justify-between p-3 bg-white rounded-xl border border-zinc-100">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                                  {permKey.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <button 
                                  onClick={() => {
                                    const newConfig = {
                                      ...rolesConfig,
                                      [role]: { ...(perms as RolePermissions), [permKey]: !value }
                                    };
                                    setRolesConfig(newConfig);
                                  }}
                                  className={`w-10 h-5 rounded-full transition-all relative ${value ? 'bg-violet-500' : 'bg-zinc-50'}`}
                                >
                                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${value ? 'left-5.5' : 'left-0.5'}`} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 pt-8 border-t border-zinc-100">
                      <button 
                        onClick={async () => {
                          setIsSavingSetup(true);
                          try {
                            await safeFetch(`${apiBaseUrl}/api/settings`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ key: 'roles', value: rolesConfig })
                            });
                            alert('Roles configuration saved!');
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setIsSavingSetup(false);
                          }
                        }}
                        disabled={isSavingSetup}
                        className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-primary transition-all shadow-lg shadow-brand-primary/10 disabled:opacity-50"
                      >
                        {isSavingSetup ? 'Saving...' : 'Save Permissions'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : setupSubTab === 'auth' ? (
                <div className="max-w-2xl mx-auto space-y-8">
                  <div className="bg-white p-10 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/50 rounded-full blur-3xl -z-10 -mr-32 -mt-32" />
                    
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-14 h-14 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-brand-primary/20">
                        <ShieldCheck size={28} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black tracking-tighter text-zinc-900">Authentication Settings</h3>
                        <p className="text-zinc-500 text-sm font-medium">Manage how users access the AraClinic portal</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-8 bg-zinc-50 rounded-[2rem] border border-zinc-100 group hover:bg-white hover:shadow-md transition-all duration-300">
                        <div className="space-y-1">
                          <p className="text-base font-black tracking-tight text-zinc-900">Allow Self-Registration</p>
                          <p className="text-xs text-zinc-500 font-medium max-w-xs leading-relaxed">
                            When enabled, new staff members can create their own accounts from the login screen. 
                            All new accounts will still require admin approval.
                          </p>
                        </div>
                        <button 
                          onClick={async () => {
                            const newVal = !authSettings.allowRegistration;
                            setAuthSettings({ ...authSettings, allowRegistration: newVal });
                            try {
                              const { res, data } = await safeFetch(`${apiBaseUrl}/api/settings`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ key: 'auth', value: { allowRegistration: newVal } })
                              });
                              if (res.ok) {
                                setSaveStatus({ type: 'success', message: `Self-registration ${newVal ? 'enabled' : 'disabled'} successfully` });
                                setTimeout(() => setSaveStatus(null), 3000);
                              }
                            } catch (e) {
                              setSaveStatus({ type: 'error', message: 'Failed to update settings' });
                              setTimeout(() => setSaveStatus(null), 3000);
                            }
                          }}
                          className={`w-16 h-8 rounded-full transition-all relative shadow-inner ${authSettings.allowRegistration ? 'bg-violet-500' : 'bg-zinc-50'}`}
                        >
                          <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all shadow-md ${authSettings.allowRegistration ? 'left-9' : 'left-1.5'}`} />
                        </button>
                      </div>

                      <AnimatePresence>
                        {saveStatus && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${saveStatus.type === 'success' ? 'bg-violet-500 text-white border border-violet-500' : 'bg-rose-500 text-white border border-rose-500'}`}
                          >
                            <div className={`w-2 h-2 rounded-full ${saveStatus.type === 'success' ? 'bg-violet-500' : 'bg-rose-500'} animate-pulse`} />
                            {saveStatus.message}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="p-8 bg-brand-primary text-white rounded-[2rem] border border-brand-primary space-y-4">
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={16} className="text-white" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Security Protocol</p>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs leading-relaxed font-medium">
                            <span className="font-black">Restricted Mode:</span> If disabled, the "Register" tab will be hidden from the login screen. Only administrators can add new staff via the <span className="font-black">Staff Setup</span> tab.
                          </p>
                          <p className="text-xs leading-relaxed font-medium">
                            <span className="font-black">Approval Required:</span> Regardless of this setting, all self-registered accounts are created with <span className="text-white font-black">Pending Approval</span> status and cannot access clinic data until an admin approves them.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm max-w-2xl">
                  <h3 className="font-semibold mb-6">Booking Availability Settings</h3>
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-3 ml-1">Working Hours (Start)</label>
                        <input 
                          type="time" 
                          value={appSettings.workingHours.start}
                          onChange={(e) => setAppSettings({...appSettings, workingHours: {...appSettings.workingHours, start: e.target.value}})}
                          className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-3 ml-1">Working Hours (End)</label>
                        <input 
                          type="time" 
                          value={appSettings.workingHours.end}
                          onChange={(e) => setAppSettings({...appSettings, workingHours: {...appSettings.workingHours, end: e.target.value}})}
                          className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-3 ml-1">Block Specific Dates</label>
                      <div className="flex gap-2 mb-4">
                        <input 
                          type="date" 
                          id="new-blocked-date"
                          className="flex-1 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <button 
                          onClick={() => {
                            const input = document.getElementById('new-blocked-date') as HTMLInputElement;
                            if (input.value && !appSettings.blockedDates.includes(input.value)) {
                              setAppSettings({...appSettings, blockedDates: [...appSettings.blockedDates, input.value]});
                              input.value = '';
                            }
                          }}
                          className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold text-xs uppercase tracking-wider"
                        >
                          Add Date
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {appSettings.blockedDates.map(date => (
                          <span key={date} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg text-xs font-medium">
                            {date}
                            <button onClick={() => setAppSettings({...appSettings, blockedDates: appSettings.blockedDates.filter(d => d !== date)})} className="text-zinc-900 hover:text-zinc-900">
                              <Trash2 size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-3 ml-1">Block Specific Times (Daily)</label>
                      <div className="flex gap-2 mb-4">
                        <input 
                          type="time" 
                          id="new-blocked-time"
                          className="flex-1 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <button 
                          onClick={() => {
                            const input = document.getElementById('new-blocked-time') as HTMLInputElement;
                            if (input.value && !appSettings.blockedTimes.includes(input.value)) {
                              setAppSettings({...appSettings, blockedTimes: [...appSettings.blockedTimes, input.value]});
                              input.value = '';
                            }
                          }}
                          className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold text-xs uppercase tracking-wider"
                        >
                          Add Time
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {appSettings.blockedTimes.map(time => (
                          <span key={time} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg text-xs font-medium">
                            {time}
                            <button onClick={() => setAppSettings({...appSettings, blockedTimes: appSettings.blockedTimes.filter(t => t !== time)})} className="text-zinc-900 hover:text-zinc-900">
                              <Trash2 size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-zinc-100">
                      <button 
                        onClick={async () => {
                          setIsSavingSetup(true);
                          try {
                            await safeFetch(`${apiBaseUrl}/api/settings`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ key: 'booking', value: appSettings })
                            });
                            alert('Booking settings saved successfully!');
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setIsSavingSetup(false);
                          }
                        }}
                        disabled={isSavingSetup}
                        className="w-full bg-violet-500 text-white py-4 rounded-xl font-bold text-sm hover:bg-violet-500 transition-all shadow-lg shadow-violet-500 disabled:opacity-50"
                      >
                        {isSavingSetup ? 'Saving...' : 'Save Booking Settings'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payout Modal */}
        <AnimatePresence>
          {showPayoutModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPayoutModal(false)}
                className="absolute inset-0 bg-brand-primary/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-violet-500 text-white flex items-center justify-center">
                        <Download size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-zinc-900 tracking-tight">M2U Biz Payout</h3>
                    </div>
                    <button 
                      onClick={() => setShowPayoutModal(false)}
                      className="p-2 hover:bg-zinc-50 rounded-xl transition-colors"
                    >
                      <PlusCircle className="rotate-45 text-zinc-500" size={24} />
                    </button>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const metadata = {
                        creditingDate: formData.get('creditingDate') as string,
                        paymentReference: formData.get('paymentReference') as string,
                        paymentDescription: formData.get('paymentDescription') as string,
                        bulkPaymentType: formData.get('bulkPaymentType') as string
                      };
                      generatePayoutCSV(metadata);
                    }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Crediting Date (dd/MM/yyyy)</label>
                      <input 
                        name="creditingDate"
                        type="text"
                        required
                        defaultValue={new Date().toLocaleDateString('en-GB')}
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="e.g. 07/03/2026"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Payment Reference</label>
                      <input 
                        name="paymentReference"
                        type="text"
                        required
                        defaultValue="INCENTIVE"
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="e.g. INCENTIVE"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Payment Description</label>
                      <input 
                        name="paymentDescription"
                        type="text"
                        required
                        defaultValue="STAFF REFERRAL INCENTIVE"
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="e.g. STAFF REFERRAL INCENTIVE"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Bulk Payment Type</label>
                      <select 
                        name="bulkPaymentType"
                        defaultValue="SALARY"
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                      >
                        <option value="SALARY">SALARY</option>
                        <option value="DIVIDEND">DIVIDEND</option>
                        <option value="COMMISSION">COMMISSION</option>
                        <option value="OTHERS">OTHERS</option>
                      </select>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-violet-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-violet-500 transition-all shadow-lg shadow-violet-500"
                    >
                      Download CSV Template
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        
        {/* Staff Detail Modal */}
        <AnimatePresence>
          {showStaffModal && selectedStaffDetail && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowStaffModal(false)}
                className="absolute inset-0 bg-brand-primary/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-3xl bg-violet-500 text-white flex items-center justify-center text-2xl font-bold overflow-hidden border border-violet-500 shadow-sm">
                        {selectedStaffDetail.profile_picture ? (
                          <img 
                            src={selectedStaffDetail.profile_picture} 
                            alt={selectedStaffDetail.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          selectedStaffDetail?.name?.charAt(0) || '?'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-2xl font-bold tracking-tight text-zinc-900">{selectedStaffDetail.name}</h3>
                          {selectedStaffDetail.nickname && (
                            <span className="text-zinc-500 font-medium text-lg">({selectedStaffDetail.nickname})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white bg-violet-500 px-2 py-0.5 rounded-md">{selectedStaffDetail.role}</p>
                          <p className="text-zinc-500 text-xs font-medium">{selectedStaffDetail.email}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${selectedStaffDetail.tier?.bg || 'bg-zinc-50'} ${selectedStaffDetail.tier?.color || 'text-zinc-500'}`}>
                            {selectedStaffDetail.tier?.name || 'Bronze'} Tier
                          </span>
                          <div className="flex items-center gap-1 text-zinc-900 bg-brand-surface px-2 py-0.5 rounded-lg border border-brand-surface">
                            <Coins size={12} />
                            <span className="text-[10px] font-black uppercase tracking-tight">{selectedStaffDetail.aracoins || 0} AraCoins</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      { (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                        <>
                          <button 
                            onClick={() => {
                              handleAdminResetPassword(selectedStaffDetail.id, selectedStaffDetail.email);
                            }}
                            className="p-2 hover:bg-amber-50 text-amber-500 hover:text-amber-600 rounded-xl transition-colors"
                            title="Reset Password"
                          >
                            <Key size={20} />
                          </button>
                          <button 
                            onClick={() => {
                              handleDeleteStaff(selectedStaffDetail.id);
                              setShowStaffModal(false);
                            }}
                            className="p-2 hover:bg-rose-50 text-zinc-400 hover:text-rose-500 rounded-xl transition-colors"
                            title="Delete Staff"
                          >
                            <Trash2 size={20} />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => setShowStaffModal(false)}
                        className="p-2 hover:bg-zinc-50 rounded-xl transition-colors"
                      >
                        <PlusCircle className="rotate-45 text-zinc-500" size={24} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Monthly Success</p>
                      <p className="text-xl font-bold">{selectedStaffDetail.monthlySuccessfulRefs}</p>
                    </div>
                    <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Total Earned</p>
                      <p className="text-xl font-bold text-zinc-900">${(selectedStaffDetail.earned || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Promo Code</p>
                      <p className="text-xl font-bold font-mono text-zinc-900">{selectedStaffDetail.referral_code || selectedStaffDetail.promo_code}</p>
                    </div>
                  </div>

                  <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 mb-8">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <DollarSign size={14} className="text-zinc-900" />
                      Payment Information
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Bank Details</p>
                        <p className="text-sm font-bold text-zinc-900">{selectedStaffDetail.bank_name || 'Not Set'}</p>
                        <p className="text-xs text-zinc-500 font-mono">{selectedStaffDetail.bank_account_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Identity Info</p>
                        <p className="text-sm font-bold text-zinc-900">{selectedStaffDetail.id_type || 'NRIC'}</p>
                        <p className="text-xs text-zinc-500 font-mono">{selectedStaffDetail.id_number || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-500 ml-1">Recent Referrals & Allowances</h4>
                    <div className="max-height-[300px] overflow-y-auto pr-2 space-y-2">
                      {referrals
                        .filter(r => String(r.staff_id) === String(selectedStaffDetail.id))
                        .slice(0, 10)
                        .map(ref => {
                          const service = services.find(s => s.id === ref.service_id);
                          const allowance = service?.allowances?.[selectedStaffDetail.tier?.name || 'Bronze'] || 0;
                          return (
                            <div key={ref.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 group">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="text-sm font-bold text-zinc-900">{ref.patient_name}</p>
                                  <p className="text-[10px] text-zinc-500 uppercase font-medium">{ref.service_name} • {ref.date}</p>
                                </div>
                                { (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteReferral(ref.id);
                                    }}
                                    className="p-2 text-zinc-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete Referral"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-zinc-900">+${((ref.commission_amount || 0) * (selectedStaffDetail.tier?.bonus || 1)).toFixed(2)}</p>
                                {allowance > 0 && (
                                  <p className="text-[9px] font-bold text-zinc-900 uppercase">Allowance: +${(allowance || 0).toFixed(2)}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {referrals.filter(r => String(r.staff_id) === String(selectedStaffDetail.id)).length === 0 && (
                        <p className="text-center py-8 text-zinc-500 text-sm italic">No referral history found.</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Task Modal */}
        <AnimatePresence>
          {showTaskModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowTaskModal(false)}
                className="absolute inset-0 bg-brand-primary/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black tracking-tighter">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
                    <button onClick={() => setShowTaskModal(false)} className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-all">
                      <PlusCircle size={20} className="rotate-45" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveTask} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Task Title</label>
                      <input 
                        name="title"
                        required
                        defaultValue={editingTask?.title || ''}
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="e.g. Monthly Inventory Check"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Description</label>
                      <textarea 
                        name="description"
                        rows={3}
                        defaultValue={editingTask?.description || ''}
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="Details about the task..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Due Date</label>
                        <DatePicker
                          selected={taskDueDate}
                          onChange={(date) => setTaskDueDate(date)}
                          dateFormat="yyyy-MM-dd"
                          className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                          placeholderText="Select due date"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Assign To</label>
                        <select 
                          name="assigned_to"
                          defaultValue={editingTask?.assigned_to || ''}
                          className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium appearance-none"
                        >
                          <option value="">Unassigned</option>
                          {activeStaffList.map(staff => (
                            <option key={staff.id} value={staff.id}>{staff.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-brand-primary text-white py-5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest hover:bg-brand-primary transition-all shadow-xl shadow-brand-primary/20 active:scale-[0.98]"
                    >
                      {editingTask ? 'Update Task' : 'Create Task'}
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPasswordModal && (
            <motion.div 
              key="password-modal-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            >
              <div 
                onClick={() => setShowPasswordModal(false)}
                className="absolute inset-0 bg-brand-primary/60 backdrop-blur-sm"
              />
              <motion.div 
                key="password-modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black tracking-tighter">Change Password</h3>
                    <button onClick={() => setShowPasswordModal(false)} className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-all">
                      <PlusCircle size={20} className="rotate-45" />
                    </button>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-6">
                    {passwordError && (
                      <div className="p-4 bg-rose-500 border border-rose-500 rounded-2xl text-white text-xs font-bold">
                        {passwordError}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Current Password</label>
                      <input 
                        type="password"
                        value={passwordForm.current}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">New Password</label>
                      <input 
                        type="password"
                        value={passwordForm.new}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="Min. 6 characters"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                      <input 
                        type="password"
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isChangingPassword}
                      className="w-full bg-brand-primary text-white py-5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest hover:bg-brand-primary transition-all shadow-xl shadow-brand-primary/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isChangingPassword ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Updating...
                        </>
                      ) : 'Update Password'}
                    </button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReferralModal && (
            <motion.div 
              key="referral-modal-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            >
              <div 
                onClick={() => setShowReferralModal(false)}
                className="absolute inset-0 bg-brand-primary/60 backdrop-blur-sm"
              />
              <motion.div 
                key="referral-modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="p-8 overflow-y-auto">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black tracking-tighter">Log New Referral</h3>
                    <button onClick={() => setShowReferralModal(false)} className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-all">
                      <PlusCircle size={20} className="rotate-45" />
                    </button>
                  </div>

                  <form onSubmit={(e) => {
                    handleSubmitReferral(e);
                    setShowReferralModal(false);
                  }} className="space-y-6">
                    {/* QR Code Section */}
                    <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 flex flex-col items-center text-center">
                      <div className="p-3 bg-white rounded-2xl shadow-sm mb-4">
                        {(currentUser.referral_code || currentUser.promo_code) ? (
                          <QRCodeCanvas 
                            value={`${getShareUrl(clinicProfile.customDomain)}?ref=${(currentUser.referral_code || currentUser.promo_code)}`}
                            size={120}
                            level="H"
                            includeMargin={false}
                          />
                        ) : (
                          <div className="w-[120px] h-[120px] flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500 text-xs font-bold text-center px-2">
                            Code not generated yet
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Your Personal QR</p>
                      <p className="text-[9px] font-bold text-zinc-500 leading-tight">Patients can scan this to book directly under your name</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Patient Name</label>
                      <input 
                        type="text" 
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900"
                        placeholder="Enter patient name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">WhatsApp Number</label>
                        <input 
                          type="tel" 
                          required
                          value={patientPhone}
                          onChange={(e) => setPatientPhone(e.target.value)}
                          className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900"
                          placeholder="e.g. +60123456789"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Patient IC</label>
                        <input 
                          type="text" 
                          required
                          value={patientIC}
                          onChange={(e) => setPatientIC(e.target.value)}
                          className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900"
                          placeholder="IC Number"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Service Promoted</label>
                      <select 
                        required
                        value={selectedService}
                        onChange={(e) => {
                          setSelectedService(e.target.value);
                          setSelectedBranch('');
                          setAppointmentDate('');
                          setBookingTime('');
                        }}
                        className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900"
                      >
                        <option value="">Select a service</option>
                        {services.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                        {selectedService && !services.find(s => String(s.id) === String(selectedService)) && urlServiceName && (
                          <option value={selectedService}>{urlServiceName}</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Target Branch</label>
                      <select 
                        required
                        value={selectedBranch}
                        onChange={(e) => {
                          setSelectedBranch(e.target.value);
                          setAppointmentDate('');
                          setBookingTime('');
                        }}
                        className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900"
                      >
                        <option value="">Select Branch</option>
                        {(() => {
                          const s = services.find(srv => String(srv.id) === String(selectedService));
                          if (!s || !s.branches) return branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>);
                          const activeBranches = Object.keys(s.branches).filter(bName => s.branches![bName].active);
                          if (activeBranches.length === 0) return branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>);
                          return activeBranches.map(bName => <option key={bName} value={bName}>{bName}</option>);
                        })()}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Booking Date</label>
                        <input 
                          type="date" 
                          required
                          min={(() => {
                            const s = services.find(srv => String(srv.id) === String(selectedService));
                            const bSched = (s?.branches && selectedBranch) ? s.branches[selectedBranch] : null;
                            const today = new Date().toISOString().split('T')[0];
                            if (bSched?.startDate && bSched.startDate > today) return bSched.startDate;
                            return today;
                          })()}
                          max={(() => {
                            const s = services.find(srv => String(srv.id) === String(selectedService));
                            const bSched = (s?.branches && selectedBranch) ? s.branches[selectedBranch] : null;
                            return bSched?.endDate || undefined;
                          })()}
                          value={appointmentDate}
                          onChange={(e) => {
                            const date = e.target.value;
                            const s = services.find(srv => String(srv.id) === String(selectedService));
                            const bSched = (s?.branches && selectedBranch) ? (s.branches as any)[selectedBranch] : null;
                            
                            if (bSched && bSched.days && bSched.days.length > 0 && date) {
                              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                              const [y, m, d] = date.split('-').map(Number);
                              const selectedDay = dayNames[new Date(y, m - 1, d).getDay()];
                              if (!bSched.days.includes(selectedDay)) {
                                alert(`This service is only available on: ${bSched.days.join(', ')}`);
                                setAppointmentDate('');
                                return;
                              }
                            }

                            if (bSched && bSched.blockedDates && date) {
                              const isBlocked = bSched.blockedDates.some((bd: any) => bd.date === date && bd.type === 'all-day');
                              if (isBlocked) {
                                alert('This date is fully booked or unavailable.');
                                setAppointmentDate('');
                                return;
                              }
                            }

                            setAppointmentDate(date);
                            setBookingTime('');
                          }}
                          className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Booking Time</label>
                        <select 
                          required
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900"
                        >
                          <option value="">Select time</option>
                          {(() => {
                            const slots = getAvailableTimeSlots(selectedService, selectedBranch, appointmentDate);
                            if (slots.length === 0) return <option disabled>No slots available</option>;
                            return slots.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full py-5 bg-brand-accent text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-xl shadow-brand-accent/20 disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Referral'}
                    </button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 right-8 z-[200]"
            >
              <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border ${
                notification.type === 'success' ? 'bg-emerald-500 border-emerald-500 text-white' :
                notification.type === 'error' ? 'bg-rose-500 border-rose-500 text-white' :
                'bg-brand-primary border-brand-primary text-white'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  notification.type === 'success' ? 'bg-emerald-500' :
                  notification.type === 'error' ? 'bg-rose-500' :
                  'bg-brand-primary'
                }`} />
                <span className="text-sm font-black tracking-tight">{notification.message}</span>
                <button onClick={() => setNotification(null)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
                  <PlusCircle size={16} className="rotate-45" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmDialog.isOpen && (
            <motion.div 
              key="confirm-dialog-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center p-4"
            >
              <div 
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="absolute inset-0 bg-brand-primary/60 backdrop-blur-sm"
              />
              <motion.div 
                key="confirm-dialog"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-rose-500 text-white rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-2xl font-black tracking-tighter mb-2">{confirmDialog.title}</h3>
                  <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-8">
                    {confirmDialog.message}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                      className="py-4 rounded-2xl bg-zinc-50 text-zinc-500 font-black text-xs uppercase tracking-widest hover:bg-zinc-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={confirmDialog.onConfirm}
                      className="py-4 rounded-2xl bg-rose-500 text-white font-black text-xs uppercase tracking-widest hover:bg-rose-500 transition-all shadow-lg shadow-rose-500"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {resetPasswordModal.isOpen && (
            <motion.div 
              key="reset-password-dialog-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center p-4"
            >
              <div 
                onClick={() => !resetPasswordModal.isLoading && setResetPasswordModal({ isOpen: false, staffId: null, email: '' })}
                className="absolute inset-0 bg-brand-primary/60 backdrop-blur-sm"
              />
              <motion.div 
                key="reset-password-dialog"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto mb-6">
                    <Key size={32} />
                  </div>
                  <h3 className="text-2xl font-black tracking-tighter mb-2">Reset Password</h3>
                  
                  {resetPasswordModal.tempPassword ? (
                    <div className="mb-8">
                      <p className="text-emerald-600 text-sm font-bold mb-4">Password reset successfully!</p>
                      <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 mb-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2">Temporary Password</p>
                        <p className="text-2xl font-mono text-zinc-900 select-all">{resetPasswordModal.tempPassword}</p>
                      </div>
                      <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                        Please provide this password to <span className="font-bold text-zinc-900">{resetPasswordModal.email}</span>. They should change it immediately after logging in.
                      </p>
                    </div>
                  ) : (
                    <div className="mb-8">
                      <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-4">
                        Are you sure you want to reset the password for <span className="font-bold text-zinc-900">{resetPasswordModal.email}</span>?
                      </p>
                      <p className="text-amber-600 text-sm font-bold bg-amber-50 p-3 rounded-xl border border-amber-100">
                        They will be given a randomly generated temporary password.
                      </p>
                      {resetPasswordModal.error && (
                        <p className="text-rose-500 text-sm font-bold mt-4 bg-rose-50 p-3 rounded-xl border border-rose-100">
                          {resetPasswordModal.error}
                        </p>
                      )}
                    </div>
                  )}

                  {resetPasswordModal.tempPassword ? (
                    <button 
                      onClick={() => setResetPasswordModal({ isOpen: false, staffId: null, email: '' })}
                      className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20"
                    >
                      Done
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setResetPasswordModal({ isOpen: false, staffId: null, email: '' })}
                        disabled={resetPasswordModal.isLoading}
                        className="py-4 rounded-2xl bg-zinc-50 text-zinc-500 font-black text-xs uppercase tracking-widest hover:bg-zinc-100 transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={executeAdminResetPassword}
                        disabled={resetPasswordModal.isLoading}
                        className="py-4 rounded-2xl bg-amber-500 text-white font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {resetPasswordModal.isLoading ? <RefreshCw size={16} className="animate-spin" /> : 'Reset'}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )}
      </main>
      </MobilePullToRefreshWrapper>
    </div>
  );
  }
}
