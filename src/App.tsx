/// <reference types="vite/client" />
// Force rebuild - Logo update
import { GoogleGenAI } from "@google/genai";
import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { PromotionsCarousel } from './components/PromotionsCarousel';
import { AdminUI } from './components/AdminUI';
import { DashboardUI } from './components/DashboardUI';
import { CategoryScrollRow } from './components/CategoryScrollRow';
import { PayoutManagement } from './components/PayoutManagement';
import { ReferralBoard } from './components/ReferralBoard';
import { MobileUI, MobileTab } from './components/MobileUI';
import { PromotionsUI } from './components/PromotionsUI';
import { ProfileUI } from './components/ProfileUI';
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
import { toast } from 'react-hot-toast';
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
  const idHash = item.id?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
  const gradient = gradients[idHash % gradients.length];

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

  const linkCode = currentUser?.id || currentUser?.referral_code || currentUser?.promo_code;

  const generateAffiliateLink = () => {
    if (!linkCode) return '';
    
    let baseUrl = (item as any).target_url || window.location.origin;
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    if (!baseUrl.startsWith('http') && !baseUrl.includes('localhost')) {
      baseUrl = `https://${baseUrl}`;
    }

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}serviceName=${encodeURIComponent(item.name)}&serviceCode=${item.id}&ref=${linkCode}`;
  };

  const shareLink = generateAffiliateLink();

  const handleCopyLink = async () => {
    if (!shareLink) {
      toast.error('Code not generated yet');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Pautan disalin!');
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

const PromotionCard = ({ item, darkMode, clinicProfile, currentUser, handleDeleteService, setEditingService }: { item: Service, darkMode: boolean, clinicProfile: ClinicProfile, currentUser: Staff, handleDeleteService: (id: string) => void, setEditingService: (service: Partial<Service> | null) => void }) => {
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
  if (customDomain && typeof customDomain === 'string') {
    let domain = customDomain.trim();
    if (domain && !domain.startsWith('http://') && !domain.startsWith('https://')) {
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
  // Flag to prevent login flow during password recovery
  const isPasswordRecovery = useRef(false);

  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    // If this is a password recovery URL, clear any cached user
    // so the app doesn't render as logged-in before the modal appears
    const isRecovery =
      window.location.pathname === '/update-password' ||
      window.location.hash.includes('type=recovery');
    if (isRecovery) {
      localStorage.removeItem('currentUser');
      return null;
    }
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
  const [showArchivedLeads, setShowArchivedLeads] = useState(false);
  const [promoServices, setPromoServices] = useState<PromoService[]>([]);

  const [branches, setBranches] = useState<any[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  const [promotions, setPromotions] = useState<Promotion[]>([
    {
      id: 'promo-1',
      title: "Ramadan Special 2026",
      description: "Get 20% off on all dental checkups during the month of Ramadan. Share the smile with your family!",
      start_date: "2026-03-01",
      end_date: "2026-03-31",
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'promo-2',
      title: "New Branch Opening: Bangi",
      description: "We are opening our new branch in Bangi! Refer 5 friends and get a free scaling session.",
      start_date: "2026-04-01",
      end_date: "2026-05-31",
      is_active: true,
      created_at: new Date().toISOString()
    }
  ]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'referrals' | 'admin' | 'receptionist' | 'setup' | 'guide' | 'profile' | 'tasks' | 'promotions' | 'payouts' | 'inbox' | 'communication' | 'warm-leads'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastActiveTab');
      if (saved) return saved as any;
    }
    return 'dashboard';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastActiveTab', activeTab);
    }
  }, [activeTab]);
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
  const [promoSubTab, setPromoSubTab] = useState<string>('manage');
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
  const [isPublicBooking, setIsPublicBooking] = useState(false);

  // Receptionist state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

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
          user_ids: notificationForm.user_ids.length === 0 ? [] : notificationForm.user_ids.map(id => id === 'all' ? null : id)
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

  const [payoutSummaries, setPayoutSummaries] = useState<any[]>([]);
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
    staffId: string | null;
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
    quotas: {} as Record<string, number>
  });

  useEffect(() => {
    const randomQuote = welcomeQuotes[Math.floor(Math.random() * welcomeQuotes.length)];
    setWelcomeQuote(randomQuote);
  }, []);

  // URL detection for password reset — handled in the effect below

  useEffect(() => {
    checkConnection();
  }, [apiBaseUrl]);

  const handleAuthError = async (error: any) => {
    if (!error) return false;
    console.warn('Supabase auth error detected:', error);
    const message = typeof error === 'string' ? error : (error.message || '');
    if (message.includes('Refresh Token Not Found') || 
        message.includes('invalid_refresh_token') || 
        message.includes('Invalid Refresh Token') ||
        message.includes('refresh_token_not_found')) {
      
      console.log('Clearing invalid Supabase session due to refresh token error...');
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Error during signOut:', e);
      }
      
      // Manually clear Supabase auth tokens from local storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
      
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      setIsAuthChecking(false);
      toast.error('Your session has expired. Please log in again.');
      return true;
    }
    return false;
  };

  useEffect(() => {
    // Check for active session
    if (isPlaceholder) {
      setIsAuthChecking(false);
      return;
    }

    // Set recovery flag synchronously before ANY async code runs
    // This ensures INITIAL_SESSION and SIGNED_IN are blocked from the start
    const isRecoveryUrl =
      window.location.pathname === '/update-password' ||
      window.location.hash.includes('type=recovery');
    if (isRecoveryUrl) {
      isPasswordRecovery.current = true;
    }

    const checkSession = async () => {
      try {
        // Skip session check entirely if this is a password recovery URL
        if (isPasswordRecovery.current) {
          setIsAuthChecking(false);
          return;
        }

        // Use getSession first as it's faster
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          if (await handleAuthError(sessionError)) return;
        }

        if (session?.user?.email) {
          // If we have a session, verify it with getUser() to be sure
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) {
            if (await handleAuthError(userError)) return;
          }
          
          if (user?.email) {
            fetchStaffByEmail(user.email, user).catch(e => console.error('Error fetching staff on session check:', e));
          } else {
            setIsAuthChecking(false);
          }
        } else {
          setIsAuthChecking(false);
        }
      } catch (err) {
        if (await handleAuthError(err)) return;
        setIsAuthChecking(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'PASSWORD_RECOVERY') {
        // Set flag to block normal login flow during password recovery
        isPasswordRecovery.current = true;
        setShowResetPasswordModal(true);
        window.history.replaceState({}, document.title, '/');
        return;
      }
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Don't log in if this is a password recovery session
        if (isPasswordRecovery.current) return;
        if (session?.user?.email) {
          fetchStaffByEmail(session.user.email, session.user).catch(e => console.error('Error fetching staff on auth change:', e));
        }
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
      } else if (event === 'INITIAL_SESSION') {
        if (!session) {
          setIsAuthChecking(false);
        } else if (isPasswordRecovery.current) {
          // Recovery session — don't log in, let PASSWORD_RECOVERY event handle it
          setIsAuthChecking(false);
        } else if (session.user?.email) {
          fetchStaffByEmail(session.user.email, session.user).catch(e => console.error('Error fetching staff on initial session:', e));
        }
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
      
      if (!res.ok) {
        throw new Error(data?.error || `Server error: ${res.status}`);
      }
      
      if (data) {
        // Preserve is_approved from previous state if API response doesn't include it
        // This prevents the pending screen flashing during re-fetches
        const enriched = {
          ...data,
          is_approved: data.is_approved !== undefined ? data.is_approved : 1
        };
        localStorage.setItem('currentUser', JSON.stringify(enriched));
        setCurrentUser(enriched);
        return enriched;
      } else {
        throw new Error('User profile not found.');
      }
    } catch (error: any) {
      console.error('Error in fetchStaffByEmail:', error);
      if (await handleAuthError(error)) return;
      setAuthError(error.message || 'Failed to load user profile.');
      
      const isNetworkError = error.message && error.message.includes('Network error');
      
      if (!isNetworkError) {
        // If we fail to load the profile (and it's not a transient network error), 
        // we should probably sign them out so they aren't stuck in a weird state
        supabase.auth.signOut().catch(e => console.warn('Error during auto-signOut:', e));
        
        // Manually clear Supabase auth tokens from local storage just in case signOut failed
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        });
        
        localStorage.removeItem('currentUser');
        setCurrentUser(null);
      }
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
        if (data.db && typeof data.db === 'string' && data.db.startsWith('error')) {
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
        fetchPayoutSummaries();
      }
      
      const interval = setInterval(() => {
        fetchReferrals();
        if (currentUser.role === 'admin' || currentUser.role === 'manager') {
          fetchWarmLeads();
          fetchPayoutSummaries();
        }
      }, 60000);
      
      return () => clearInterval(interval);
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

  const fetchPayoutSummaries = async () => {
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/payouts/summary`);
    if (res.ok && Array.isArray(data)) {
      setPayoutSummaries(data);
    }
  };

  const handleProcessPayout = async (affiliate_id: string, patient_ids: string[]) => {
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/payouts/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: affiliate_id, affiliate_id: affiliate_id, patient_ids })
      });
      
      if (res.ok) {
        toast.success('Payout processed successfully!');
        fetchPayoutSummaries();
        fetchReferrals(); // Update referrals list as well
      } else {
        toast.error(`Failed to process payout: ${data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error processing payout:', error);
      toast.error('An error occurred while processing payout');
    }
  };

  const handleBulkStatusUpdate = async (ids: string[], newStatus: string) => {
    try {
      // Update all selected referrals concurrently
      const promises = ids.map(id => 
        safeFetch(`${apiBaseUrl}/api/referrals/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
      );
      await Promise.all(promises);
      
      // Refresh data to show UI changes
      fetchReferrals();
      toast.success(`Successfully updated ${ids.length} cases to ${newStatus}`);
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error("An error occurred during bulk update");
    }
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
      const { data } = await supabase
        .from('warm_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setWarmLeads(data);
    } catch (error) {
      console.error('Error fetching warm leads:', error);
    }
  };

  const handleUpdateWarmLeadStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('warm_leads').update({ status }).eq('id', id);
      if (!error) {
        fetchWarmLeads();
        toast.success('Status berjaya dikemas kini!');
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Error updating warm lead status:', error);
      toast.error('Gagal mengemas kini status');
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
    // Handle Supabase password recovery redirect
    // Do NOT wipe the hash here — let onAuthStateChange handle the token first
    const hash = window.location.hash;
    const path = window.location.pathname;
    if (path === '/update-password' || hash.includes('type=recovery')) {
      setShowResetPasswordModal(true);
      // Clean URL after a short delay so Supabase can read the token from the hash
      setTimeout(() => {
        window.history.replaceState({}, document.title, '/');
      }, 2000);
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

  // handleForgotPassword removed — use handleForgotPasswordSubmit

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
          isPasswordRecovery.current = false;
          setShowResetPasswordModal(false);
          setResetPasswordNewPassword('');
          setResetPasswordStatus(null);
          // Sign out the recovery session so user logs in fresh
          await supabase.auth.signOut();
          setCurrentUser(null);
          localStorage.removeItem('currentUser');
          setAuthMode('login');
          window.history.pushState({}, '', '/');
        }, 3000);
      } else {
        // Local fallback
        setResetPasswordStatus({ type: 'success', message: 'Password updated successfully. Redirecting to login...' });
        setTimeout(async () => {
          isPasswordRecovery.current = false;
          setShowResetPasswordModal(false);
          setResetPasswordNewPassword('');
          setResetPasswordStatus(null);
          // Sign out the recovery session so user logs in fresh
          await supabase.auth.signOut();
          setCurrentUser(null);
          localStorage.removeItem('currentUser');
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

  const checkPromoCode = async (code: string) => {
    setWalkInPromoCode(code);
    if (code.length >= 3) {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff?promoCode=${code}`);
      if (res.ok) setWalkInStaff(data);
    } else {
      setWalkInStaff(null);
    }
  };

  const handleSubmitReferral = async (e: React.FormEvent, publicFormData?: any, draftReferralId?: string | null) => {
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

    if (!data.selectedService || !data.patientName) return false;

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
      const serviceData = services.find(srv => String(srv.id) === String(data.selectedService));

      // 1. BULLETPROOF EXTRACTION: Bypass state, grab '?ref=' straight from URL
      const urlParams = new URLSearchParams(window.location.search);
      const directAffiliateId = isPublicBooking 
        ? (urlParams.get('ref') || localStorage.getItem('araclinic_ref_code')) 
        : null;

      // 2. BUILD THE BULLETPROOF PAYLOAD
      const payload: any = {
        // FORCE staff_id directly from the URL 'ref'
        staff_id: isPublicBooking 
          ? (directAffiliateId || null) 
          : (activeTab === 'receptionist' ? walkInStaff?.id : currentUser?.id),
          
        // Also send the referral code string just in case
        referral_code: directAffiliateId || null,
        
        service_id: data.selectedService,
        service_name: serviceData?.name || '',
        commission_amount: serviceData?.commission_rate || 0,
        patient_name: data.patientName,
        patient_phone: data.patientPhone,
        patient_ic: data.patientIC,
        patient_address: data.patientAddress,
        patient_type: data.patientType,
        appointment_date: data.appointmentDate,
        booking_time: data.bookingTime,
        status: 'pending',
        branch: data.selectedBranch || (isPublicBooking ? data.referringStaff?.branch : currentUser?.branch)
      };

      const url = `${apiBaseUrl}/api/referrals`;
      const method = 'POST';

      const { res, data: resultData } = await safeFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const actualDraftId = draftReferralId || data.draftReferralId;
        if (actualDraftId) { 
          const { error: warmLeadError } = await supabase.from('warm_leads').update({ status: 'converted' }).eq('id', actualDraftId);
          if (warmLeadError) console.error("Error updating warm lead:", warmLeadError);
        }
        
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



  const handleUpdateStatus = async (id: string, status: string, additionalData: any = {}) => {
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
        toast.success('Status berjaya dikemas kini!');
      } else {
        const errorMsg = data.error || 'Update failed';
        console.error('Status update failed:', { id, status, data });
        toast.error(`Status update failed: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error in handleUpdateStatus:', error);
      toast.error(`An error occurred while updating status`);
    }
  };

  const handleClinicStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const payload = { 
        status: newStatus,
        verified_by: (currentUser?.role === 'receptionist' || currentUser?.role === 'manager' || currentUser?.role === 'admin') ? currentUser.id : undefined
      };
      
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/referrals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        // Auto-transition: arrived → in_session immediately
        if (newStatus === 'arrived') {
          await safeFetch(`${apiBaseUrl}/api/referrals/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'in_session' })
          });
        }
        fetchReferrals();
        fetchStaff();
        toast.success('Status berjaya dikemas kini!');
      } else {
        const errorMsg = data.error || 'Update failed';
        console.error('Status update failed:', { id, newStatus, data });
        toast.error(`Status update failed: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error in handleClinicStatusUpdate:', error);
      toast.error(`An error occurred while updating status`);
    }
  };

  const handleDeleteReferral = async (id: string) => {
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
        toast.success('Profil berjaya dikemas kini!');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus({ type: 'error', message: data.error || 'Failed to update profile' });
        toast.error('Gagal mengemas kini profil');
      }
    } catch (error) {
      console.error(error);
      setSaveStatus({ type: 'error', message: 'Failed to update profile' });
      toast.error('Gagal mengemas kini profil');
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
        if (await handleAuthError(error)) return;
      }
      if (!session) {
        console.warn('No active Supabase session. Upload might fail if RLS policies require authentication.');
      }
    } catch (err) {
      console.warn('Failed to get Supabase session:', err);
      if (await handleAuthError(err)) return;
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
        toast.success('Tetapan berjaya disimpan!');
      } else {
        const errorMsg = data?.message || data?.error || 'Failed to save service';
        showNotification('error', errorMsg);
        toast.error('Gagal menyimpan tetapan');
      }
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan tetapan');
    } finally {
      setIsSavingSetup(false);
    }
  };

  const handleDeleteService = async (id: string) => {
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

  const handleAdminResetPassword = (staffId: string, email: string) => {
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

  const handleDeleteStaff = async (id: string) => {
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

  const handleRestoreStaff = async (id: string) => {
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

  const handlePermanentDeleteStaff = async (id: string) => {
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

  const handleRejectStaff = async (id: string) => {
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

  const handleResetPassword = async (id: string) => {
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

  const handleDeleteTask = async (id: string) => {
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

  const handleApproveStaff = async (id: string, isApproved: boolean) => {
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
      const staffMember = staffList.find(s => String(s.id) === String(ref.staff_id));
      const row = [
        ref.date,
        `"${ref.patient_name}"`,
        ref.patient_type || 'new',
        `"${ref.service_name}"`,
        ...(currentUser?.role === 'admin' ? [`"${staffMember?.name || ref.staff_name || 'Direct Walk-in'}"`] : []),
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
      ['completed', 'payment_approved', 'payment_made'].includes(r.status?.toLowerCase()) && 
      r.date && typeof r.date === 'string' && r.date.startsWith(currentMonth)
    ).length;

    const tier = getTier(monthlySuccessfulRefs);
    
    const totalRefs = staffRefs.length;
    
   // Calculate dynamic earnings based on status
    const pending_earnings = staffRefs
      .filter(r => ['completed'].includes(r.status?.toLowerCase()))
      .reduce((sum, r) => sum + (r.commission_amount * tier.bonus), 0);
    
    const approved_earnings = staffRefs
      .filter(r => r.status?.toLowerCase() === 'payment_approved')
      .reduce((sum, r) => sum + (r.commission_amount * tier.bonus), 0);
      
    const paid_earnings = staffRefs
      .filter(r => r.status?.toLowerCase() === 'payment_made')
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
    activeStaff: new Set(referrals.filter(r => r.staff_id).map(r => r.staff_id)).size,
    pendingPayout: staffPerformance.reduce((sum, s) => sum + (s.approved_earnings || 0) + (s.pending_earnings || 0), 0)
  };

  const receptionistStats = {
    arrivedToday: referrals.filter(r => ['completed', 'payment_approved', 'payment_made'].includes(r.status?.toLowerCase()) && r.visit_date === new Date().toISOString().split('T')[0]).length,
    pendingVerifications: referrals.filter(r => ['arrived','in_session'].includes(r.status?.toLowerCase())).length
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
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-zinc-100 text-zinc-500 border border-zinc-200';
      case 'arrived': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'in_session': return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
      case 'completed': return 'bg-teal-100 text-teal-700 border border-teal-200';
      case 'payment_approved': return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'payment_made': return 'bg-emerald-500 text-white shadow-sm border border-emerald-600';
      case 'rejected': return 'bg-rose-500 text-white';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'arrived': return 'Arrived';
      case 'in_session': return 'In Session';
      case 'completed': return 'Completed';
      case 'payment_approved': return 'Payment Approved';
      case 'payment_made': return 'Payment Made';
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

        {/* Mobile UI — dedicated component for easy updates */}
        {isMobile && (
          <MobileUI
            currentUser={currentUser}
            clinicProfile={clinicProfile}
            darkMode={darkMode}
            reduceTranslucency={reduceTranslucency}
            activeTab={activeTab as MobileTab}
            setActiveTab={(tab) => setActiveTab(tab as any)}
            setShowReferralModal={setShowReferralModal}
            referrals={referrals}
            branches={branches}
            services={services}
            promotions={promotions}
            serviceCategories={serviceCategories}
            staffList={staffList}
            notifications={notifications}
            unreadNotificationsCount={unreadNotificationsCount}
            adminStats={adminStats}
            receptionistStats={receptionistStats}
            activeStaffList={activeStaffList}
            currentUserStats={currentUserStats}
            progressToNext={progressToNext}
            nextTier={nextTier}
            getStatusColor={getStatusColor}
            getStatusLabel={getStatusLabel}
            checkBranchAccess={checkBranchAccess}
            getServiceStatus={getServiceStatus}
            fetchReferrals={fetchReferrals}
            handleUpdateStatus={handleUpdateStatus}
            handleClinicStatusUpdate={handleClinicStatusUpdate}
            handleDeleteReferral={handleDeleteReferral}
            handleDeleteService={handleDeleteService}
            setSelectedPromo={setSelectedPromo}
            setIsPromoModalOpen={setIsPromoModalOpen}
            setSelectedStaffDetail={setSelectedStaffDetail}
            setShowStaffModal={setShowStaffModal}
            promoSubTab={promoSubTab}
            setPromoSubTab={setPromoSubTab}
            editingService={editingService}
            setEditingService={setEditingService}
            fetchServices={fetchServices}
            selectedPromo={selectedPromo}
            isPromoModalOpen={isPromoModalOpen}
            isUploading={isUploading}
            handleImageUpload={handleImageUpload}
            handleUpdateProfile={handleUpdateProfile}
            THEMES={THEMES}
            selectedTheme={selectedTheme}
            setSelectedTheme={setSelectedTheme}
            windowWidth={windowWidth}
            setDarkMode={setDarkMode}
            setReduceTranslucency={setReduceTranslucency}
            setShowPasswordModal={setShowPasswordModal}
            feedbackMessage={feedbackMessage}
            setFeedbackMessage={setFeedbackMessage}
            handleSendFeedback={handleSendFeedback}
            isSendingFeedback={isSendingFeedback}
            handleLogout={handleLogout}
            markAllAsRead={markAllAsRead}
            markNotificationAsRead={markNotificationAsRead}
          />
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

          {currentUser.is_approved === 0 && currentUser.role !== 'admin' && activeTab !== 'profile' ? (
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
                    {activeTab === 'guide' ? 'User Guide' : activeTab === 'profile' ? 'My Profile' : activeTab}
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
            <ReferralBoard 
              currentUser={currentUser}
              referrals={referrals}
              branches={branches}
              clinicProfile={clinicProfile}
              isMobile={isMobile}
              darkMode={darkMode}
              fetchReferrals={fetchReferrals}
              handleUpdateStatus={handleUpdateStatus}
              handleClinicStatusUpdate={handleClinicStatusUpdate}
              handleDeleteReferral={handleDeleteReferral}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              staffList={staffList}
            />
          )}


          {activeTab === 'promotions' && (
            <PromotionsUI 
              currentUser={currentUser}
              clinicProfile={clinicProfile}
              darkMode={darkMode}
              isMobile={isMobile}
              services={services}
              promotions={promotions}
              serviceCategories={serviceCategories}
              promoSubTab={promoSubTab}
              setPromoSubTab={setPromoSubTab}
              editingService={editingService}
              setEditingService={setEditingService}
              fetchServices={fetchServices}
              handleDeleteService={handleDeleteService}
              getServiceStatus={getServiceStatus}
              checkBranchAccess={checkBranchAccess}
              selectedPromo={selectedPromo}
              setSelectedPromo={setSelectedPromo}
              isPromoModalOpen={isPromoModalOpen}
              setIsPromoModalOpen={setIsPromoModalOpen}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileUI 
              currentUser={currentUser}
              darkMode={darkMode}
              isUploading={isUploading}
              handleImageUpload={handleImageUpload}
              handleUpdateProfile={handleUpdateProfile}
              THEMES={THEMES}
              selectedTheme={selectedTheme}
              setSelectedTheme={setSelectedTheme}
              windowWidth={windowWidth}
              setDarkMode={setDarkMode}
              reduceTranslucency={reduceTranslucency}
              setReduceTranslucency={setReduceTranslucency}
              setActiveTab={setActiveTab}
              setShowPasswordModal={setShowPasswordModal}
              feedbackMessage={feedbackMessage}
              setFeedbackMessage={setFeedbackMessage}
              handleSendFeedback={handleSendFeedback}
              isSendingFeedback={isSendingFeedback}
              handleLogout={handleLogout}
            />
          )}

          {activeTab === 'warm-leads' && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Warm Leads CRM</h2>
                  <p className="text-zinc-500 text-sm">Manage early drop-offs and unconverted inquiries.</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      if (fetchWarmLeads) fetchWarmLeads();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-50 transition-all font-medium text-sm"
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </button>
                  <div className="flex bg-zinc-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setShowArchivedLeads(false)}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${!showArchivedLeads ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      Active
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${!showArchivedLeads ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
                        {warmLeads.filter(l => l.status !== 'archived' && l.status !== 'converted').length}
                      </span>
                    </button>
                    <button 
                      onClick={() => setShowArchivedLeads(true)}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showArchivedLeads ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      Archived
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${showArchivedLeads ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
                        {warmLeads.filter(l => l.status === 'archived').length}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-zinc-900">{showArchivedLeads ? 'Archived Leads' : 'Warm Leads Engine'}</h3>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{showArchivedLeads ? 'Previously archived inquiries' : 'Early drop-offs from booking form'}</p>
                  </div>
                  <div className={`w-10 h-10 ${showArchivedLeads ? 'bg-zinc-100 text-zinc-600' : 'bg-amber-50 text-amber-600'} rounded-xl flex items-center justify-center`}>
                    {showArchivedLeads ? <Trash2 size={20} /> : <Zap size={20} />}
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
                      {warmLeads.filter(l => showArchivedLeads ? l.status === 'archived' : (l.status !== 'archived' && l.status !== 'converted')).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-zinc-500 text-sm italic">No {showArchivedLeads ? 'archived' : 'active'} warm leads found.</td>
                        </tr>
                      ) : (
                        warmLeads
                          .filter(l => showArchivedLeads ? l.status === 'archived' : (l.status !== 'archived' && l.status !== 'converted'))
                          .map((lead) => (
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
                                {(() => {
                                  const matchedService = services.find(s => 
                                    String(s.id) === String(lead.service_id) || 
                                    (s.target_url && String(s.target_url).includes(String(lead.service_id))) ||
                                    String(s.name).toLowerCase() === String(lead.service_id).toLowerCase()
                                  );
                                  return matchedService ? matchedService.name : (lead.service_id || 'N/A');
                                })()}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                lead.status === 'new' ? 'bg-amber-100 text-amber-700' : 
                                lead.status === 'archived' ? 'bg-zinc-100 text-zinc-600' : 'bg-blue-100 text-blue-700'
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
                                {lead.status === 'archived' ? (
                                  <button 
                                    onClick={() => handleUpdateWarmLeadStatus(lead.id, 'new')}
                                    className="px-3 py-1.5 bg-violet-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-violet-600 transition-all"
                                  >
                                    Restore
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => handleUpdateWarmLeadStatus(lead.id, 'archived')}
                                    className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors"
                                    title="Archive Lead"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
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

          {activeTab === 'payouts' && (
  <PayoutManagement
    currentUser={currentUser}
    rolesConfig={rolesConfig}
    clinicProfile={clinicProfile}
    referrals={referrals}
    staffList={staffList}
    branches={branches}
    handleBulkStatusUpdate={handleBulkStatusUpdate}
  />
)}
```"

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
                          <option value="pending">Pending</option>
                          <option value="arrived">Arrived</option>
                          <option value="in_session">In Session</option>
                          <option value="completed">Completed</option>
                          <option value="payment_approved">Payment Approved</option>
                          <option value="payment_made">Payment Made</option>
                          <option value="rejected">Rejected</option>
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
                        .filter(r => statusFilter === 'all' ? true : r.status?.toLowerCase() === statusFilter.toLowerCase())
                        .filter(r => currentUser.role === 'receptionist' ? ['arrived','in_session','completed'].includes(r.status?.toLowerCase()) : true)
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
                                <p className="text-xs font-medium text-zinc-900">
                                  {staffList.find(s => String(s.id) === String(ref.staff_id))?.name || ref.staff_name || <span className="text-zinc-400 italic">Direct Walk-in</span>}
                                </p>
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
                              <option value="arrived">Arrived</option>
                              <option value="in_session">In Session</option>
                              <option value="completed">Completed</option>
                              <option value="payment_approved">Payment Approved</option>
                              <option value="payment_made">Payment Made</option>
                              <option value="rejected">Rejected</option>
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
                          toast.success('Tetapan berjaya disimpan!');
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
                              toast.success('Tetapan berjaya disimpan!');
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
                        onClick={async () => {
                          try {
                            const { res } = await safeFetch(`${apiBaseUrl}/api/settings`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ key: 'referral', value: referralSettings })
                            });
                            if (res.ok) {
                              toast.success('Tetapan berjaya disimpan!');
                            } else {
                              toast.error('Gagal menyimpan tetapan');
                            }
                          } catch (e) {
                            toast.error('Gagal menyimpan tetapan');
                          }
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
                            toast.success('Tetapan berjaya disimpan!');
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
                                toast.success('Tetapan berjaya disimpan!');
                                setTimeout(() => setSaveStatus(null), 3000);
                              } else {
                                toast.error('Gagal menyimpan tetapan');
                              }
                            } catch (e) {
                              setSaveStatus({ type: 'error', message: 'Failed to update settings' });
                              toast.error('Gagal menyimpan tetapan');
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
                            const { res } = await safeFetch(`${apiBaseUrl}/api/settings`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ key: 'booking', value: appSettings })
                            });
                            if (res.ok) {
                              toast.success('Tetapan berjaya disimpan!');
                            } else {
                              toast.error('Gagal menyimpan tetapan');
                            }
                          } catch (e) {
                            console.error(e);
                            toast.error('Gagal menyimpan tetapan');
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
                        {(() => {
                          const linkCode = currentUser.id || currentUser.referral_code || currentUser.promo_code;
                          return linkCode ? (
                          <QRCodeCanvas 
                            value={`${window.location.origin}/?ref=${linkCode}`}
                            size={120}
                            level="H"
                            includeMargin={false}
                          />
                        ) : (
                          <div className="w-[120px] h-[120px] flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500 text-xs font-bold text-center px-2">
                            Code not generated yet
                          </div>
                        );
                        })()}
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