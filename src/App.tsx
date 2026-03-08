/// <reference types="vite/client" />
// Force rebuild - Logo update
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  PlusCircle, 
  Phone,
  TrendingUp, 
  CheckCircle2, 
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
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import DatePicker from 'react-datepicker';
import { supabase } from './supabase';

interface Promotion {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

interface Staff {
  id: number;
  name: string;
  email: string;
  role: string;
  promo_code: string;
  staff_id_code?: string;
  branch?: string;
  department?: string;
  position?: string;
  employment_status?: string;
  date_joined?: string;
  pending_earnings: number;
  approved_earnings: number;
  paid_earnings: number;
  lifetime_earnings: number;
  last_payout_date?: string;
  referrer_type: string;
  phone?: string;
  aracoins?: number;
  is_approved?: number;
  nickname?: string;
  profile_picture?: string;
  bank_name?: string;
  bank_account_number?: string;
  id_type?: string;
  id_number?: string;
  tier?: { name: string; bonus: number; color: string; bg: string };
  monthlySuccessfulRefs?: number;
  earned?: number;
}

interface Service {
  id: number;
  name: string;
  base_price: number;
  commission_rate: number;
  aracoins_perk: number;
  allowances: { [tier: string]: number };
}

interface Referral {
  id: number;
  staff_id: number;
  staff_name: string;
  promo_code: string;
  service_id: number;
  service_name: string;
  patient_name: string;
  patient_phone: string;
  patient_ic?: string;
  patient_address?: string;
  appointment_date: string;
  booking_time: string;
  visit_date?: string;
  date: string;
  status: 'entered' | 'completed' | 'paid_completed' | 'buffer' | 'approved' | 'payout_processed' | 'rejected';
  payment_status: 'pending' | 'completed';
  commission_amount: number;
  fraud_flags?: string;
  rejection_reason?: string;
  branch?: string;
  patient_type?: 'new' | 'existing';
  aracoins_perk?: number;
}

interface AppSettings {
  blockedDates: string[];
  blockedTimes: string[];
  workingHours: { start: string; end: string };
}

interface ClinicProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  logoUrl?: string;
}

interface RolePermissions {
  canApprove: boolean;
  canEditServices: boolean;
  canEditStaff: boolean;
  canViewAnalytics: boolean;
  canManagePayouts: boolean;
  canManageSettings: boolean;
}

interface RolesConfig {
  [role: string]: RolePermissions;
}

const safeFetch = async (url: string, options?: RequestInit) => {
  try {
    console.log(`Fetching: ${url}`, options?.method || 'GET');
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await res.json();
      return { res, data };
    } else {
      const text = await res.text();
      // Truncate long error messages
      const errorText = text.length > 100 ? text.substring(0, 100) + '...' : text;
      return { res, data: { error: errorText || res.statusText || "Unknown error" } };
    }
  } catch (e: any) {
    console.error(`Fetch error for ${url}:`, e);
    return { res: { ok: false, status: 0 } as Response, data: { error: e.message || "Network error" } };
  }
};

// Reusable Logo Component with Fallback
const Logo = ({ className = "w-8 h-8" }: { className?: string }) => {
  const size = parseInt(className.match(/\d+/)?.[0] || "24");
  
  return (
    <div className={`${className} flex items-center justify-center bg-violet-600 rounded-xl shadow-inner overflow-hidden`}>
      <Activity className="text-white" size={size * 0.7} strokeWidth={2.5} />
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'referrals' | 'admin' | 'receptionist' | 'setup' | 'guide' | 'profile' | 'tasks' | 'kit' | 'promotions'>('dashboard');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  // Setup Tab State
  const [setupSubTab, setSetupSubTab] = useState<'services' | 'staff' | 'booking' | 'auth' | 'clinic' | 'roles' | 'referral'>('services');
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [editingStaff, setEditingStaff] = useState<Partial<Staff> | null>(null);
  const [isSavingSetup, setIsSavingSetup] = useState(false);

  // Clinic & Roles State
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile>({
    name: 'AraPower',
    address: '',
    phone: '',
    email: '',
    currency: 'RM'
  });
  const [rolesConfig, setRolesConfig] = useState<RolesConfig>({
    admin: { canApprove: true, canEditServices: true, canEditStaff: true, canViewAnalytics: true, canManagePayouts: true, canManageSettings: true },
    receptionist: { canApprove: false, canEditServices: false, canEditStaff: false, canViewAnalytics: false, canManagePayouts: false, canManageSettings: false },
    staff: { canApprove: false, canEditServices: false, canEditStaff: false, canViewAnalytics: false, canManagePayouts: false, canManageSettings: false },
    dispensary: { canApprove: false, canEditServices: false, canEditStaff: false, canViewAnalytics: false, canManagePayouts: true, canManageSettings: false }
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
  const [referringStaff, setReferringStaff] = useState<Staff | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Receptionist state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [referralSearch, setReferralSearch] = useState('');
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
    { name: 'Bronze', min: 0, bonus: 1, color: 'text-orange-700', bg: 'bg-orange-100' },
    { name: 'Silver', min: 6, bonus: 1.2, color: 'text-violet-700', bg: 'bg-violet-100' },
    { name: 'Gold', min: 11, bonus: 1.5, color: 'text-fuchsia-700', bg: 'bg-fuchsia-100' }
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth States
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authBranch, setAuthBranch] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline' | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [authSettings, setAuthSettings] = useState({ allowRegistration: true });
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Task State
  const [tasks, setTasks] = useState<any[]>([]);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [expandedReferralId, setExpandedReferralId] = useState<number | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskDueDate, setTaskDueDate] = useState<Date | null>(null);
  const [referralSettings, setReferralSettings] = useState({
    types: ['Staff', 'Patient', 'Public'],
    defaultCommission: 5,
    eligibilityCriteria: 'Must be an active staff member with an approved account.',
    quotas: {} as Record<number, number>
  });

  useEffect(() => {
    checkConnection();
  }, [apiBaseUrl]);

  useEffect(() => {
    // Check for active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        fetchStaffByEmail(session.user.email, session.user);
      } else {
        // If no Supabase session, check if we have a local user before stopping check
        const saved = localStorage.getItem('currentUser');
        if (!saved) {
          setIsAuthChecking(false);
        } else {
          // If we have a saved user, we keep it but still stop the initial check
          setIsAuthChecking(false);
        }
      }
    }).catch(err => {
      console.warn('Supabase session check failed:', err);
      setIsAuthChecking(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      if (session?.user?.email) {
        fetchStaffByEmail(session.user.email, session.user);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        setIsAuthChecking(false);
      } else {
        // For other events like INITIAL_SESSION with no session, 
        // only clear if we don't have a local user
        const saved = localStorage.getItem('currentUser');
        if (!saved && event === 'INITIAL_SESSION') {
          setIsAuthChecking(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchStaffByEmail = async (email: string, user?: any) => {
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/email?email=${email}`);
      if (res.ok && data) {
        localStorage.setItem('currentUser', JSON.stringify(data));
        setCurrentUser(data);
      } else if (user) {
        // User exists in Supabase but not in our local DB (likely due to DB reset)
        // Attempt to auto-recreate the record using Supabase metadata
        console.log('User not found in local DB, attempting to recreate from Supabase metadata');
        const metadata = user.user_metadata || {};
        const { res: regRes, data: regData } = await safeFetch(`${apiBaseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: metadata.full_name || email.split('@')[0],
            email: email,
            branch: metadata.branch || 'HQ',
            phone: metadata.phone || '',
            password: 'password123' // Default password since we can't get it from Supabase
          })
        });
        if (regRes.ok && regData) {
          localStorage.setItem('currentUser', JSON.stringify(regData));
          setCurrentUser(regData);
        }
      }
    } finally {
      setIsAuthChecking(false);
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Check for public booking link
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      handlePublicBooking(refCode);
    }

    fetchStaff();
    fetchServices();
    fetchSettings();
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
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/tasks`);
    if (res.ok) setTasks(data);
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

  const handlePublicBooking = async (code: string) => {
    setIsPublicBooking(true);
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff?promoCode=${code}`);
    if (res.ok && data) {
      setReferringStaff(data);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchReferrals();
    }
  }, [currentUser, branchFilter]);

  useEffect(() => {
    let interval: any;
    if (activeTab === 'admin' && currentUser?.role === 'admin') {
      fetchStaff();
      // Poll every 30 seconds for new applications
      interval = setInterval(fetchStaff, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, currentUser?.role]);

  const fetchStaff = async () => {
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff`);
    if (res.ok) {
      setStaffList(data);
      if (currentUser) {
        const updatedMe = data.find((s: Staff) => s.id === currentUser.id);
        if (updatedMe && JSON.stringify(updatedMe) !== JSON.stringify(currentUser)) {
          setCurrentUser(updatedMe);
        }
      }
    }
  };

  const fetchServices = async () => {
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/services`);
    if (res.ok) setServices(data);
  };

  const fetchReferrals = async () => {
    let url = (currentUser?.role === 'admin' || currentUser?.role === 'receptionist') ? `${apiBaseUrl}/api/referrals` : `${apiBaseUrl}/api/referrals?staffId=${currentUser?.id}`;
    
    if (branchFilter !== 'all') {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}branch=${branchFilter}`;
    }

    const { res, data } = await safeFetch(url);
    if (res.ok) setReferrals(data);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    console.log('Login attempt started', { email: authEmail, apiBaseUrl });
    try {
      // Check if Supabase is properly configured
      const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && 
                                  import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder-project.supabase.co';

      if (!isSupabaseConfigured) {
        console.log('Supabase not configured, using local backend login...');
        const { res, data } = await safeFetch(`${apiBaseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword })
        });

        if (res.ok && data && !data.error) {
          setCurrentUser(data);
          localStorage.setItem('currentUser', JSON.stringify(data));
          return;
        } else {
          throw new Error(data.error || 'Invalid credentials');
        }
      }

      // If Supabase is configured, try it
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (error) {
        // Fallback to local backend if Supabase fails (e.g. user not in Supabase but in local DB)
        console.log('Supabase login failed, trying local backend...');
        const { res, data: localData } = await safeFetch(`${apiBaseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword })
        });

        if (res.ok && localData && !localData.error) {
          setCurrentUser(localData);
          localStorage.setItem('currentUser', JSON.stringify(localData));
          return;
        }
        throw error;
      }

      if (data.user?.email) {
        await fetchStaffByEmail(data.user.email, data.user);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setAuthError(error.message || 'Login failed');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    try {
      console.log('Registration attempt started', { email: authEmail, name: authName });
      
      // Check if Supabase is properly configured
      const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && 
                                  import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder-project.supabase.co';

      if (isSupabaseConfigured) {
        try {
          const { error: authError } = await supabase.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: {
              data: {
                full_name: authName,
                branch: authBranch
              }
            }
          });
          if (authError) console.warn('Supabase registration warning:', authError.message);
        } catch (err) {
          console.warn('Supabase registration error (skipping):', err);
        }
      }

      // 2. Register in our backend
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

      if (res.ok) {
        console.log('Registration successful', data);
        setCurrentUser(data);
        localStorage.setItem('currentUser', JSON.stringify(data));
        setActiveTab('dashboard');
      } else {
        console.error('Registration failed:', data);
        setAuthError(data.error || 'Registration failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Registration network error:', error);
      setAuthError(error.message || 'Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setActiveTab('dashboard');
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
    setAuthBranch('');
    setAuthPhone('');
    setAuthError('');
  };

  const generatePayoutCSV = (metadata: typeof payoutMetadata) => {
    const staffToPay = staffPerformance.filter(s => selectedPayoutStaff.includes(s.id) && s.approved_earnings > 0);
    if (staffToPay.length === 0) {
      alert('No staff selected or no approved earnings to pay.');
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
        s.approved_earnings.toFixed(2),
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
    if (!confirm('Are you sure you want to mark these payouts as processed? This will update the status of all approved referrals for the selected staff.')) return;
    
    const staffToPay = staffPerformance.filter(s => selectedPayoutStaff.includes(s.id) && s.approved_earnings > 0);
    
    for (const staff of staffToPay) {
      const approvedRefs = referrals.filter(r => r.staff_id === staff.id && r.status === 'approved');
      for (const ref of approvedRefs) {
        await safeFetch(`${apiBaseUrl}/api/referrals/${ref.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'payout_processed' })
        });
      }
    }
    
    fetchReferrals();
    setSelectedPayoutStaff([]);
    alert('Payouts processed successfully.');
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

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    const staffId = isPublicBooking ? referringStaff?.id : (activeTab === 'receptionist' ? walkInStaff?.id : currentUser?.id);
    if (!staffId || !selectedService || !patientName) return;

    setIsSubmitting(true);
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staffId,
          service_id: parseInt(selectedService),
          patient_name: patientName,
          patient_phone: patientPhone,
          patient_ic: patientIC,
          patient_address: patientAddress,
          patient_type: patientType,
          appointment_date: appointmentDate,
          booking_time: bookingTime,
          date: new Date().toISOString().split('T')[0],
          created_by: currentUser?.id,
          branch: selectedBranch || (isPublicBooking ? referringStaff?.branch : currentUser?.branch)
        })
      });
      
      if (res.ok) {
        if (data.fraudFlags && data.fraudFlags.length > 0) {
          alert(`Referral submitted with flags: ${data.fraudFlags.join(', ')}`);
        }

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
        if (isPublicBooking) {
          setBookingSuccess(true);
        } else {
          fetchReferrals();
        }
      } else {
        alert(data.error || 'Submission failed');
      }
    } catch (error) {
      console.error(error);
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string, additionalData: any = {}) => {
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/referrals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status,
        ...additionalData,
        verified_by: (currentUser?.role === 'receptionist' || currentUser?.role === 'admin') ? currentUser.id : undefined
      })
    });
    if (res.ok) {
      fetchReferrals();
      fetchStaff();
    } else {
      alert(data.error || 'Update failed');
    }
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
    const { data: { publicUrl: testUrl } } = supabase.storage.from('test').getPublicUrl('test');
    const isPlaceholder = testUrl.includes('placeholder-project.supabase.co');

    if (isPlaceholder) {
      alert('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your platform settings and restart the dev server.');
      return;
    }

    // Check if user has a Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No active Supabase session. Upload might fail if RLS policies require authentication.');
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
    setIsSavingSetup(true);
    try {
      const method = editingService.id ? 'PATCH' : 'POST';
      const url = editingService.id ? `/api/services/${editingService.id}` : '/api/services';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingService)
      });
      if (res.ok) {
        setEditingService(null);
        fetchServices();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingSetup(false);
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    const { res } = await safeFetch(`/api/services/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchServices();
    }
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
        alert(data.error || 'Failed to save staff');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingSetup(false);
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (!confirm('Are you sure you want to delete this staff member? This will permanently remove their record.')) return;
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchStaff();
    } else {
      alert(data.error || 'Delete failed');
    }
  };

  const handleRejectStaff = async (id: number) => {
    if (!confirm('Reject this application? The user will not be able to access the portal.')) return;
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employment_status: 'rejected', is_approved: 0 })
    });
    if (res.ok) {
      fetchStaff();
    } else {
      alert(data.error || 'Rejection failed');
    }
  };

  const handleResetPassword = async (id: number) => {
    if (!confirm('Reset password to default "password123"?')) return;
    const { res } = await safeFetch(`${apiBaseUrl}/api/staff/${id}/reset-password`, { method: 'POST' });
    if (res.ok) {
      alert('Password reset successfully');
    }
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
        alert('Password changed successfully');
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
    if (!confirm('Delete this task?')) return;
    const { res, data } = await safeFetch(`${apiBaseUrl}/api/tasks/${id}`, { method: 'DELETE' });
    if (res.ok) fetchTasks();
    else alert(data.error || 'Delete failed');
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
        ref.commission_amount.toFixed(2),
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
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-sm max-w-md w-full border border-black/5"
        >
          {bookingSuccess ? (
            <div className="text-center py-8">
              <div className="bg-violet-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="text-violet-600 w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
              <p className="text-zinc-500 mb-8">Thank you for your referral. We will contact you shortly to finalize your appointment.</p>
              <button 
                onClick={() => setBookingSuccess(false)}
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-3 rounded-xl font-medium shadow-lg shadow-violet-500/20"
              >
                Book Another
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-white p-1 rounded-xl border border-zinc-100 shadow-sm">
                  <Logo className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Clinic Booking</h1>
              </div>
              
              {referringStaff ? (
                <div className="bg-violet-50 p-4 rounded-2xl mb-6 border border-violet-100">
                  <p className="text-xs text-violet-700 font-bold uppercase tracking-wider mb-1">Referred By</p>
                  <p className="font-semibold text-violet-900">{referringStaff.name}</p>
                </div>
              ) : (
                <div className="bg-orange-50 p-4 rounded-2xl mb-6 border border-orange-100">
                  <p className="text-xs text-orange-700 font-bold uppercase tracking-wider mb-1">Notice</p>
                  <p className="text-sm text-orange-900">Referral code not found, but you can still book below.</p>
                </div>
              )}

              <form onSubmit={handleSubmitReferral} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Your Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">WhatsApp Number</label>
                  <input 
                    type="tel" 
                    required
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    placeholder="e.g. +60123456789"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Patient Type</label>
                  <select 
                    required
                    value={patientType}
                    onChange={(e) => setPatientType(e.target.value as 'new' | 'existing')}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all appearance-none"
                  >
                    <option value="new">New Patient</option>
                    <option value="existing">Existing Patient</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Service Required</label>
                  <select 
                    required
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all appearance-none"
                  >
                    <option value="">Select a service</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Booking Date</label>
                    <input 
                      type="date" 
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Booking Time</label>
                    <select 
                      required
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all appearance-none"
                    >
                      <option value="">Select time</option>
                      {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-xl font-bold hover:from-violet-700 hover:to-fuchsia-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Appointment'}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
          <p className="text-zinc-400 font-black text-[10px] uppercase tracking-widest">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-50 rounded-full blur-[120px] opacity-60" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] max-w-lg w-full border border-black/[0.03] relative z-10"
        >
          <div className="flex flex-col items-center text-center mb-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-white p-2 rounded-[1.5rem] shadow-lg shadow-black/5 mb-6 border border-zinc-100"
            >
              <Logo className="w-12 h-12" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-1">{clinicProfile.name}</h1>
              <p className="text-violet-600 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Empowering Healthcare</p>
              <p className="text-zinc-400 text-sm font-medium">{greeting}, please sign in to your account</p>
            </motion.div>
          </div>
          
          <div className="flex gap-8 mb-10 border-b border-zinc-100 relative">
            <button 
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative z-10 ${authMode === 'login' ? 'text-violet-600' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Login
              {authMode === 'login' && (
                <motion.div 
                  layoutId="auth-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600"
                />
              )}
            </button>
            {authSettings.allowRegistration && (
              <button 
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
                className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative z-10 ${authMode === 'register' ? 'text-violet-600' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                Register
                {authMode === 'register' && (
                  <motion.div 
                    layoutId="auth-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600"
                  />
                )}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {connectionStatus === 'offline' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-xl border border-amber-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  API Connection Issue: {connectionError || 'Offline'}
                </div>
                <button onClick={checkConnection} className="underline hover:text-amber-900">
                  Retry
                </button>
              </motion.div>
            )}
            {authError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 p-4 bg-red-50 text-red-600 text-[11px] font-bold rounded-2xl border border-red-100 flex items-center gap-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {authError}
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
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <input 
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium group-hover:bg-white"
                      placeholder="admin@clinic.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Password</label>
                  <div className="relative group">
                    <input 
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium group-hover:bg-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-xl shadow-violet-600/20 active:scale-[0.98]"
                >
                  Sign In
                </button>
                <p className="text-center text-[10px] text-zinc-400 font-bold tracking-tight">
                  Forgot password? Contact your administrator for a reset.
                </p>
              </motion.form>
            ) : (
              <motion.form 
                key="register-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleRegisterSubmit} 
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                    placeholder="john@clinic.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Password</label>
                  <input 
                    type="password"
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Branch</label>
                    <div className="relative">
                      <select 
                        required
                        value={authBranch}
                        onChange={(e) => setAuthBranch(e.target.value)}
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium appearance-none"
                      >
                        <option value="">Select</option>
                        <option value="Bangi">Bangi</option>
                        <option value="Kajang">Kajang</option>
                        <option value="HQ">HQ</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Phone</label>
                    <input 
                      type="tel"
                      required
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                      placeholder="6012..."
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-xl shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  if (currentUser.is_approved === 0 && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-50 rounded-full blur-[120px] opacity-60" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] max-w-md w-full border border-black/[0.03] text-center"
        >
          <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Clock size={40} />
          </div>
          <p className="text-violet-600 text-[10px] font-black uppercase tracking-[0.3em] mb-8">Empowering Healthcare</p>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight mb-4">Account Pending Approval</h1>
          <p className="text-zinc-500 text-sm leading-relaxed mb-8 font-medium">
            Hi <span className="text-zinc-900 font-bold">{currentUser.name}</span>, your account has been created successfully. 
            However, an administrator needs to approve your profile before you can access the portal features.
          </p>
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 mb-8">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Status</p>
            <p className="text-xs font-bold text-orange-600 uppercase">Under Review</p>
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
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-lg shadow-violet-600/10"
            >
              Check Status
            </button>
            <button 
              onClick={handleLogout}
              className="bg-zinc-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
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

  // Analytics calculation
  const staffPerformance = staffList.map(staff => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const staffRefs = referrals.filter(r => r.staff_id === staff.id);
    const monthlySuccessfulRefs = staffRefs.filter(r => 
      (r.status === 'completed' || r.status === 'paid_completed' || r.status === 'buffer' || r.status === 'approved' || r.status === 'payout_processed') && 
      r.date.startsWith(currentMonth)
    ).length;

    const tier = getTier(monthlySuccessfulRefs);
    
    const totalRefs = staffRefs.length;
    
    // Calculate dynamic earnings based on status
    const pending_earnings = staffRefs
      .filter(r => r.status === 'completed' || r.status === 'paid_completed' || r.status === 'buffer')
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
    pendingPayout: staffPerformance.reduce((sum, s) => sum + (s.approved_earnings || 0), 0)
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

  const isMobile = windowWidth < 1024;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'entered': return 'bg-orange-100 text-orange-700';
      case 'completed': return 'bg-indigo-100 text-indigo-700';
      case 'paid_completed': return 'bg-violet-100 text-violet-700';
      case 'buffer': return 'bg-blue-100 text-blue-700';
      case 'approved': return 'bg-violet-100 text-violet-700 border border-violet-200';
      case 'payout_processed': return 'bg-zinc-100 text-zinc-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'entered': return 'Entered';
      case 'completed': return 'Visit Completed';
      case 'paid_completed': return 'Payment Completed';
      case 'buffer': return '7-Day Buffer';
      case 'approved': return 'Approved';
      case 'payout_processed': return 'Payout Processed';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  if (currentUser) {
    // Device Guard
    if ((currentUser.role === 'admin' || currentUser.role === 'receptionist' || currentUser.role === 'dispensary') && isMobile) {
      return (
        <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-violet-100 text-violet-600 rounded-3xl flex items-center justify-center mb-6">
            <LayoutDashboard size={40} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Desktop View Required</h1>
          <p className="text-zinc-500 max-w-xs mb-8">The {currentUser.role === 'admin' ? 'Admin Panel' : (currentUser.role === 'receptionist' ? 'Receptionist Portal' : 'Dispensary Portal')} is optimized for desktop use. Please switch to a larger screen to manage the clinic.</p>
          <button 
            onClick={handleLogout}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium shadow-lg shadow-violet-500/20"
          >
            Sign Out
          </button>
        </div>
      );
    }

    if (currentUser.role === 'staff' && !isMobile) {
      return (
        <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-violet-100 text-violet-600 rounded-3xl flex items-center justify-center mb-6">
            <MessageCircle size={40} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Mobile View Required</h1>
          <p className="text-zinc-500 max-w-xs mb-8">The Staff Portal is optimized for mobile use. Please access this page from your smartphone.</p>
          <button 
            onClick={handleLogout}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium shadow-lg shadow-violet-500/20"
          >
            Sign Out
          </button>
        </div>
      );
    }

    return (
      <div className={`min-h-screen font-sans transition-colors duration-500 ${isMobile ? 'bg-zinc-50 text-zinc-900' : 'bg-zinc-50 text-zinc-900'}`}>
        {/* Mobile Navigation (Floating Glass Dock - iOS 26 style) */}
        {isMobile && (
          <div className="fixed bottom-6 left-0 right-0 px-4 z-50 pointer-events-none">
            <nav className="max-w-md mx-auto bg-white/90 backdrop-blur-2xl border border-zinc-200 px-4 py-3 flex justify-between items-center rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] pointer-events-auto">
              <div className="flex flex-1 justify-around items-center">
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'dashboard' ? 'text-brand-primary scale-110' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'dashboard' ? 'bg-brand-surface' : ''}`}>
                    <LayoutDashboard size={22} />
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('referrals')}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'referrals' ? 'text-brand-primary scale-110' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'referrals' ? 'bg-brand-surface' : ''}`}>
                    <Calendar size={22} />
                  </div>
                </button>
              </div>

              {/* Central FAB */}
              <div className="px-2">
                <button 
                  onClick={() => setShowReferralModal(true)}
                  className="w-14 h-14 bg-brand-accent text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-accent/40 active:scale-95 transition-transform"
                >
                  <Plus size={28} strokeWidth={3} />
                </button>
              </div>

              <div className="flex flex-1 justify-around items-center">
                <button 
                  onClick={() => setActiveTab('promotions')}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'promotions' ? 'text-brand-primary scale-110' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'promotions' ? 'bg-brand-surface' : ''}`}>
                    <Zap size={22} />
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'profile' ? 'text-brand-primary scale-110' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'profile' ? 'bg-brand-surface' : ''}`}>
                    <UserCircle size={22} />
                  </div>
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Desktop Sidebar (Admin Only) */}
        {!isMobile && (
          <nav className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-zinc-100 p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-10 px-2">
              <div className="w-10 h-10 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden">
                <Logo className="w-8 h-8" />
              </div>
              <div>
                <h1 className="font-bold text-xl tracking-tight text-zinc-900">{clinicProfile.name}</h1>
                <p className="text-[8px] font-black text-violet-600 uppercase tracking-[0.2em] -mt-0.5">Empowering Healthcare</p>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20' : 'text-zinc-500 hover:bg-zinc-50'}`}
              >
                <LayoutDashboard size={18} />
                <span className="text-sm font-medium">Dashboard</span>
              </button>
              <button 
                onClick={() => setActiveTab('referrals')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'referrals' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20' : 'text-zinc-500 hover:bg-zinc-50'}`}
              >
                <ClipboardList size={18} />
                <span className="text-sm font-medium">Referrals</span>
              </button>
              <button 
                onClick={() => setActiveTab('kit')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'kit' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20' : 'text-zinc-500 hover:bg-zinc-50'}`}
              >
                <QrCode size={18} />
                <span className="text-sm font-medium">Referral Kit</span>
              </button>
              <button 
                onClick={() => setActiveTab('promotions')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'promotions' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20' : 'text-zinc-500 hover:bg-zinc-50'}`}
              >
                <Zap size={18} />
                <span className="text-sm font-medium">Promotions</span>
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'profile' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20' : 'text-zinc-500 hover:bg-zinc-50'}`}
              >
                <UserCircle size={18} />
                <span className="text-sm font-medium">My Profile</span>
              </button>
              {rolesConfig[currentUser.role]?.canViewAnalytics && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'admin' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  <Users size={18} />
                  <span className="text-sm font-medium">Admin Panel</span>
                </button>
              )}
            </div>

            <div className="pt-6 border-t border-zinc-100">
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{currentUser.name}</p>
                  <div className="flex items-center gap-1">
                    <Coins size={10} className="text-yellow-500" />
                    <span className="text-[10px] font-bold text-yellow-600">{currentUser.aracoins || 0} AraCoins</span>
                  </div>
                </div>
              </div>
              {rolesConfig[currentUser.role]?.canManageSettings && (
                <button 
                  onClick={() => setActiveTab('setup')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'setup' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  <Settings size={18} />
                  <span className="text-sm font-medium">Setup</span>
                </button>
              )}
            </div>
          </nav>
        )}

        {/* Main Content */}
        <main className={`${!isMobile ? 'ml-64 bg-[#FBFBFD]' : 'pb-32 min-h-screen bg-zinc-50'} p-4 lg:p-8 relative ${!isMobile ? 'overflow-hidden' : ''}`}>
          {isMobile && (
            <>
              <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-peach/10 to-transparent -z-10" />
              <div className="absolute top-[10%] -right-[20%] w-[80%] h-[40%] bg-brand-pink/10 rounded-full blur-[100px] -z-10" />
            </>
          )}

          {!currentUser.is_approved && activeTab !== 'profile' ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 relative z-10"
            >
              <div className="w-24 h-24 bg-orange-50 text-orange-500 rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-orange-500/10 border border-orange-100">
                <ShieldAlert size={48} />
              </div>
              <div className="space-y-3 max-w-md">
                <h3 className="text-3xl font-black tracking-tighter text-zinc-900">Account Pending Approval</h3>
                <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                  Welcome to {clinicProfile.name}! Your account has been successfully created and is currently being reviewed by our administration team.
                </p>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm max-w-sm w-full">
                <ul className="space-y-5 text-left">
                  <li className="flex gap-4 items-center text-xs font-bold text-zinc-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]" />
                    <span>Reviewing your credentials</span>
                  </li>
                  <li className="flex gap-4 items-center text-xs font-bold text-zinc-200">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-100" />
                    <span>Activating your referral code</span>
                  </li>
                  <li className="flex gap-4 items-center text-xs font-bold text-zinc-200">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-100" />
                    <span>Granting access to dashboard</span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col items-center gap-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Estimated time: 24-48 hours
                </p>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="px-6 py-3 bg-violet-50 text-violet-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-100 transition-all active:scale-95"
                >
                  Complete your profile while you wait
                </button>
                <button 
                  onClick={handleLogout}
                  className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              <header className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-[100] ${isMobile ? 'sticky top-0 bg-zinc-50/80 backdrop-blur-xl py-4 -mx-4 px-4 border-b border-zinc-200/50 mb-6' : 'mb-8 relative'}`}>
                <div className={isMobile ? '' : ''}>
                  <h2 className={`text-3xl sm:text-3xl font-black tracking-tighter capitalize ${isMobile ? 'text-zinc-900' : 'text-zinc-900'}`}>
                    {activeTab === 'guide' ? 'User Guide' : activeTab === 'profile' ? 'My Profile' : activeTab === 'kit' ? 'Referral Kit' : activeTab}
                  </h2>
                  {!isMobile && <p className={`${isMobile ? 'text-zinc-600' : 'text-zinc-500'} text-sm font-medium`}>Welcome back, {currentUser.name}</p>}
                </div>
                
                {activeTab === 'dashboard' && currentUser.role !== 'admin' && !isMobile && (
                  <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-black/5 shadow-sm">
                    <Clock size={16} className="text-zinc-400" />
                    <span className="text-xs font-bold text-zinc-500">
                      {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Left Column: Form & Toolkit */}
              <div className="lg:col-span-1 space-y-6">
                {/* Mobile Stats Grid - ios26v style */}
                {isMobile && currentUser.role === 'staff' && (
                  <div className="space-y-4">
                    {/* Main Card: Earnings Breakdown - Dark Design */}
                    <div className="relative overflow-hidden bg-brand-primary p-8 rounded-[2.5rem] shadow-2xl shadow-brand-primary/20">
                      <div className="relative flex items-center justify-between">
                        <div className="max-w-[60%]">
                          <p className="text-brand-peach text-[10px] font-black uppercase tracking-widest mb-1">Lifetime Earning</p>
                          <h3 className="text-white text-3xl font-black leading-tight mb-4">
                            {clinicProfile.currency}{(currentUserStats?.lifetime_earnings || 0).toFixed(0)}
                          </h3>
                          <button 
                            onClick={() => setActiveTab('referrals')}
                            className="px-6 py-2.5 bg-brand-accent text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20 active:scale-95 transition-transform"
                          >
                            View History
                          </button>
                        </div>
                        
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="8"
                              className="text-white/10"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="8"
                              strokeDasharray={2 * Math.PI * 38}
                              strokeDashoffset={2 * Math.PI * 38 * (1 - Math.min(1, (currentUserStats?.monthlySuccessfulRefs || 0) / (nextTier?.min || 1)))}
                              strokeLinecap="round"
                              className="text-brand-accent transition-all duration-1000"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-black text-sm">
                              {Math.round(Math.min(100, (currentUserStats?.monthlySuccessfulRefs || 0) / (nextTier?.min || 1) * 100))}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Service Performance - Approved Commissions */}
                    <div className="pt-4">
                      <h3 className="text-xl font-black text-zinc-900 tracking-tight">Service Performance</h3>
                      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Approved Commissions</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {services.map(service => {
                        const count = referrals.filter(r => 
                          r.staff_id === currentUser.id && 
                          r.service_id === service.id && 
                          r.status === 'approved'
                        ).length;
                        
                        if (count === 0) return null;

                        return (
                          <div 
                            key={service.id}
                            className="p-5 rounded-[2rem] bg-brand-accent flex flex-col justify-between min-h-[120px] shadow-lg shadow-brand-accent/20 active:scale-[0.98] transition-transform"
                          >
                            <p className="text-xs font-black text-zinc-900 leading-tight line-clamp-2">{service.name}</p>
                            <div className="flex items-end justify-between mt-2">
                              <span className="text-3xl font-black text-zinc-900">{count}</span>
                              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-900/60 mb-1">Approved</span>
                            </div>
                          </div>
                        );
                      }).filter(Boolean)}
                      
                      {services.filter(service => 
                        referrals.some(r => r.staff_id === currentUser.id && r.service_id === service.id && r.status === 'approved')
                      ).length === 0 && (
                        <div className="col-span-2 p-10 rounded-[2.5rem] bg-zinc-100 border border-zinc-200 text-center">
                          <div className="w-12 h-12 bg-zinc-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <ClipboardList className="text-zinc-400" size={24} />
                          </div>
                          <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">No approved commissions</p>
                          <p className="text-zinc-400 text-[10px] font-bold mt-1">Your approved referrals will appear here</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isMobile && currentUser.role === 'receptionist' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-brand-surface p-4 rounded-3xl border border-white/10 shadow-sm">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">Arrived Today</p>
                      <p className="text-xl font-bold text-brand-peach">{receptionistStats.arrivedToday}</p>
                    </div>
                    <div className="bg-brand-surface p-4 rounded-3xl border border-white/10 shadow-sm">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">Pending</p>
                      <p className="text-xl font-bold text-brand-pink">{receptionistStats.pendingVerifications}</p>
                    </div>
                  </div>
                )}

                {/* Desktop Admin/Receptionist/Dispensary Stats */}
                {!isMobile && (currentUser.role === 'admin' || currentUser.role === 'receptionist' || currentUser.role === 'dispensary') && (
                  <div className="grid grid-cols-2 gap-4">
                    {currentUser.role === 'admin' ? (
                      <>
                        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                          <p className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">Total Payout</p>
                          <p className="text-2xl font-bold text-zinc-900">${adminStats.totalPayout.toFixed(2)}</p>
                          <p className="text-[10px] text-zinc-400 mt-1">Pending: ${adminStats.pendingPayout.toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                          <p className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">Active Staff</p>
                          <p className="text-2xl font-bold text-zinc-900">{adminStats.activeStaff}</p>
                          <p className="text-[10px] text-zinc-400 mt-1">Total Referrals: {adminStats.totalReferrals}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                          <p className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">
                            {currentUser.role === 'receptionist' ? 'Arrived Today' : 'Paid Today'}
                          </p>
                          <p className="text-2xl font-bold text-violet-600">
                            {currentUser.role === 'receptionist' ? receptionistStats.arrivedToday : referrals.filter(r => r.status === 'paid_completed' && r.date === new Date().toISOString().split('T')[0]).length}
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-1">
                            {currentUser.role === 'receptionist' ? 'Patients checked in' : 'Referrals completed'}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                          <p className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">
                            {currentUser.role === 'receptionist' ? 'Pending Arrival' : 'Pending Payout'}
                          </p>
                          <p className="text-2xl font-bold text-orange-500">
                            {currentUser.role === 'receptionist' ? receptionistStats.pendingVerifications : referrals.filter(r => r.status === 'approved').length}
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-1">
                            {currentUser.role === 'receptionist' ? 'Waiting for check-in' : 'Waiting for payment'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Tier Progress Card (Staff Only - Desktop) */}
                {!isMobile && currentUser.role === 'staff' && (
                  <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 shadow-sm overflow-hidden relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="text-purple-500" size={20} />
                        <h3 className="font-semibold text-purple-900">Monthly Tier</h3>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${currentUserStats?.tier.bg} ${currentUserStats?.tier.color}`}>
                        {currentUserStats?.tier.name}
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-zinc-400 font-medium">Monthly Success</span>
                        <span className="font-bold">{currentUserStats?.monthlySuccessfulRefs || 0} referrals</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden relative">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progressToNext}%` }}
                          transition={{ type: "spring", stiffness: 40, damping: 12, delay: 0.2 }}
                          className="h-full bg-violet-500 rounded-full relative"
                        >
                          {/* Shimmer effect */}
                          <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                          />
                        </motion.div>
                      </div>
                    </div>

                    {nextTier ? (
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Achieve <span className="font-bold text-zinc-900">{nextTier.min - (currentUserStats?.monthlySuccessfulRefs || 0)} more</span> successful referrals this month to reach <span className="font-bold text-zinc-900">{nextTier.name} Tier</span> and get a <span className="text-violet-600 font-bold">{((nextTier.bonus - 1) * 100).toFixed(0)}% bonus</span> on all commissions!
                      </p>
                    ) : (
                      <p className="text-[11px] text-violet-600 font-bold leading-relaxed">
                        Maximum Tier Reached! You are earning 50% bonus on all successful referrals this month.
                      </p>
                    )}
                  </div>
                )}

                {/* Log New Referral moved to Kit Page */}

                {/* Referral Toolkit removed from Home - Moved to Kit Page */}
              </div>

              {/* Recent Activity & Admin Insights */}
              <div className="lg:col-span-2 space-y-6">
                {currentUser.role === 'admin' && (
                  <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-100">
                      <h3 className="font-semibold">Staff Performance</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {staffPerformance.slice(0, 5).map((staff, index) => (
                          <div 
                            key={staff.id} 
                            className="flex items-center justify-between cursor-pointer hover:bg-zinc-50 p-2 -mx-2 rounded-xl transition-colors"
                            onClick={() => {
                              setSelectedStaffDetail(staff);
                              setShowStaffModal(true);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-zinc-300 w-4">{index + 1}</span>
                              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600">
                                {staff.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{staff.name}</p>
                                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{staff.tier.name} Tier</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-zinc-900">{staff.monthlySuccessfulRefs} referrals</p>
                              <p className="text-[10px] text-violet-600 font-bold">${staff.earned.toFixed(2)} earned</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="text-violet-500" size={20} />
                      <h3 className="font-semibold">Recent Referrals</h3>
                    </div>
                    <button onClick={() => setActiveTab('referrals')} className="text-xs font-bold text-violet-600 hover:underline">View All</button>
                  </div>
                  <div className="divide-y divide-zinc-50">
                    {referrals.slice(0, 5).map((ref) => (
                      <div key={ref.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${getStatusColor(ref.status)}`}>
                            {ref.status === 'payout_processed' || ref.status === 'approved' || ref.status === 'paid_completed' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{ref.patient_name}</p>
                            <p className="text-xs text-zinc-400">{ref.service_name} • {ref.branch || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{clinicProfile.currency}{ref.commission_amount.toFixed(2)}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${getStatusColor(ref.status).split(' ')[1]}`}>{getStatusLabel(ref.status)}</p>
                        </div>
                      </div>
                    ))}
                    {referrals.length === 0 && (
                      <div className="p-12 text-center text-zinc-400">
                        <ClipboardList className="mx-auto mb-2 opacity-20" size={40} />
                        <p className="text-sm">No referrals logged yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'referrals' && (
            <motion.div 
              key="referrals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${isMobile ? 'bg-[#1e293b] border-white/10' : 'bg-white border-black/5 shadow-sm'} rounded-3xl border overflow-hidden`}
            >
              <div className={`p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isMobile ? 'border-white/10' : 'border-zinc-100'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <h3 className={`font-semibold ${isMobile ? 'text-[#f5f5dc]' : 'text-zinc-900'}`}>Referral History</h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                      <input 
                        type="text"
                        placeholder="Search patient, staff, or service..."
                        value={referralSearch}
                        onChange={(e) => setReferralSearch(e.target.value)}
                        className={`pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 w-full sm:w-64 ${isMobile ? 'bg-[#0f172a] border-white/10 text-[#f5f5dc] focus:ring-brand-accent/20' : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:ring-violet-500/20'}`}
                      />
                    </div>
                    <select 
                      value={referralBranchFilter}
                      onChange={(e) => setReferralBranchFilter(e.target.value)}
                      className={`px-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 ${isMobile ? 'bg-[#0f172a] border-white/10 text-[#f5f5dc] focus:ring-brand-accent/20' : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:ring-violet-500/20'}`}
                    >
                      <option value="all">All Branches</option>
                      <option value="Bangi">Bangi</option>
                      <option value="Kajang">Kajang</option>
                      <option value="HQ">HQ</option>
                    </select>
                    <select 
                      value={referralStatusFilter}
                      onChange={(e) => setReferralStatusFilter(e.target.value)}
                      className={`px-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 ${isMobile ? 'bg-[#0f172a] border-white/10 text-[#f5f5dc] focus:ring-brand-accent/20' : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:ring-violet-500/20'}`}
                    >
                      <option value="all">All Statuses</option>
                      <option value="entered">Entered</option>
                      <option value="completed">Visit Completed</option>
                      <option value="paid_completed">Payment Completed</option>
                      <option value="buffer">7-Day Buffer</option>
                      <option value="approved">Approved</option>
                      <option value="payout_processed">Payout Processed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={exportToCSV}
                  className={`flex items-center gap-2 text-xs font-bold transition-colors self-start sm:self-auto px-3 py-2 rounded-xl ${isMobile ? 'text-brand-accent hover:bg-[#0f172a]' : 'text-violet-600 hover:bg-violet-50'}`}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {isMobile ? (
                <div className="space-y-4 p-4">
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
                      className={`rounded-[2.5rem] overflow-hidden transition-all duration-300 border border-white/5 ${expandedReferralId === ref.id ? 'ring-2 ring-brand-accent shadow-2xl' : 'shadow-sm'}`}
                    >
                      <div 
                        onClick={() => setExpandedReferralId(expandedReferralId === ref.id ? null : ref.id)}
                        className={`p-6 flex items-center justify-between cursor-pointer transition-colors ${expandedReferralId === ref.id ? 'bg-[#172554]' : 'bg-[#1e3a8a]'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            ref.status === 'completed' || ref.status === 'paid_completed' ? 'bg-green-500/20 text-green-400' :
                            ref.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/80'
                          }`}>
                            <ClipboardList size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#f5f5dc]">{ref.patient_name}</p>
                            <p className="text-[10px] font-bold text-[#f5f5dc]/80 uppercase tracking-widest">{ref.date}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-sm font-black text-brand-accent">{clinicProfile.currency}{ref.commission_amount.toFixed(0)}</p>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${
                              ref.status === 'completed' || ref.status === 'paid_completed' ? 'text-green-400' :
                              ref.status === 'rejected' ? 'text-red-400' : 'text-[#f5f5dc]/70'
                            }`}>
                              {getStatusLabel(ref.status)}
                            </span>
                          </div>
                          <ChevronRight size={16} className={`text-[#f5f5dc]/40 transition-transform duration-300 ${expandedReferralId === ref.id ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedReferralId === ref.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-[#172554] border-t border-white/10"
                          >
                            <div className="p-6 space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <p className="text-[10px] font-black text-[#f5f5dc]/60 uppercase tracking-widest mb-1">Service</p>
                                  <p className="text-xs font-bold text-[#f5f5dc] leading-tight">{ref.service_name}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-[#f5f5dc]/60 uppercase tracking-widest mb-1">Branch</p>
                                  <p className="text-xs font-bold text-[#f5f5dc]">{ref.branch}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-[#f5f5dc]/60 uppercase tracking-widest mb-1">Patient IC</p>
                                  <p className="text-xs font-bold text-[#f5f5dc]">{ref.patient_ic || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-[#f5f5dc]/60 uppercase tracking-widest mb-1">Incentive</p>
                                  <p className="text-xs font-bold text-brand-accent">{clinicProfile.currency}{ref.commission_amount.toFixed(2)}</p>
                                </div>
                              </div>
                              
                              <div>
                                <p className="text-[10px] font-black text-[#f5f5dc]/60 uppercase tracking-widest mb-1">Patient Address</p>
                                <p className="text-xs font-bold text-[#f5f5dc] leading-relaxed">{ref.patient_address || 'N/A'}</p>
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[10px] font-black text-[#f5f5dc]/60">
                                    {ref.staff_name.charAt(0)}
                                  </div>
                                  <p className="text-xs font-bold text-[#f5f5dc]/80">{ref.staff_name}</p>
                                </div>
                                {ref.patient_phone && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const text = `Hi ${ref.patient_name}! This is ${ref.staff_name} from the clinic. Just following up on your booking for ${ref.appointment_date} at ${ref.booking_time}.`;
                                      window.open(`https://wa.me/${ref.patient_phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform border border-green-500/30"
                                  >
                                    <MessageCircle size={14} />
                                    Follow Up
                                  </button>
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
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Booking</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Patient</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Service</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Staff</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Incentive</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Status</th>
                      {(currentUser.role === 'admin' || currentUser.role === 'receptionist') && <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Actions</th>}
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
                      .map((ref) => (
                      <tr key={ref.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="p-4">
                          <p className="text-sm font-medium">{ref.appointment_date}</p>
                          <p className="text-[10px] text-zinc-400">{ref.booking_time}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{ref.patient_name}</p>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${ref.patient_type === 'existing' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                              {ref.patient_type || 'new'}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400">{ref.patient_phone} • <span className="font-bold text-indigo-600">{ref.branch}</span></p>
                          <div className="mt-1 pt-1 border-t border-zinc-50">
                            <p className="text-[9px] text-zinc-400 font-medium">IC: {ref.patient_ic || 'N/A'}</p>
                            <p className="text-[9px] text-zinc-400 font-medium truncate max-w-[150px]" title={ref.patient_address}>Addr: {ref.patient_address || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-zinc-500">{ref.service_name}</td>
                        <td className="p-4 text-sm font-medium text-violet-600">{ref.staff_name}</td>
                        <td className="p-4 text-sm font-bold">{clinicProfile.currency}{ref.commission_amount.toFixed(2)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(ref.status)}`}>
                            {getStatusLabel(ref.status)}
                          </span>
                        </td>
                        {(currentUser.role === 'admin' || currentUser.role === 'receptionist' || currentUser.role === 'dispensary') && (
                          <td className="p-4">
                            <div className="flex gap-2">
                              {ref.patient_phone && (
                                <a 
                                  href={`https://wa.me/${ref.patient_phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-violet-500 hover:bg-violet-50 rounded-lg transition-colors"
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
                                    Check-in
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateStatus(ref.id, 'rejected', { rejection_reason: 'Patient did not arrive' })}
                                    className="text-[10px] font-bold text-red-600 hover:underline"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {(currentUser.role === 'receptionist' || currentUser.role === 'dispensary') && ref.status === 'completed' && (
                                <button 
                                  onClick={() => handleUpdateStatus(ref.id, 'paid_completed', { payment_status: 'completed' })}
                                  className="text-[10px] font-bold text-violet-600 hover:underline"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {currentUser.role === 'admin' && ref.status === 'paid_completed' && (
                                <button 
                                  onClick={() => handleUpdateStatus(ref.id, 'buffer')}
                                  className="text-[10px] font-bold text-blue-600 hover:underline"
                                >
                                  Start Buffer
                                </button>
                              )}
                              {currentUser.role === 'admin' && ref.status === 'approved' && (
                                <button 
                                  onClick={() => handleUpdateStatus(ref.id, 'payout_processed')}
                                  className="text-[10px] font-bold text-violet-600 hover:underline"
                                >
                                  Pay
                                </button>
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

          {activeTab === 'admin' && currentUser.role === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Total Referrals</p>
                    <p className="text-3xl font-bold tracking-tight">{referrals.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Total Payouts</p>
                    <p className="text-3xl font-bold tracking-tight text-violet-600">
                      {clinicProfile.currency}{staffPerformance.reduce((s, staff) => s + (staff.paid_earnings || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Referral Approvals</p>
                    <p className="text-3xl font-bold tracking-tight text-orange-500">
                      {referrals.filter(r => r.status === 'paid_completed' || r.status === 'buffer').length}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Staff Approvals</p>
                    <p className="text-3xl font-bold tracking-tight text-blue-500">
                      {staffList.filter(s => !s.is_approved && s.employment_status !== 'rejected').length}
                    </p>
                  </div>
                </div>

              {/* Staff Approvals Section */}
              {staffList.filter(s => !s.is_approved && s.employment_status !== 'rejected').length > 0 && (
                <div className="bg-blue-50/50 rounded-[2.5rem] border border-blue-100 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-black tracking-tighter text-blue-900">Pending Staff Approvals</h3>
                      <p className="text-sm text-blue-700 font-medium">Review and approve new staff registrations</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <ShieldCheck size={24} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {staffList.filter(s => !s.is_approved && s.employment_status !== 'rejected').map(staff => (
                      <div key={staff.id} className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-lg font-black text-zinc-400">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900">{staff.name}</h4>
                            <p className="text-xs text-zinc-400 font-medium">{staff.email}</p>
                          </div>
                        </div>
                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            <span>Branch</span>
                            <span className="text-zinc-900">{staff.branch}</span>
                          </div>
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            <span>Phone</span>
                            <span className="text-zinc-900">{staff.phone || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            <span>Joined</span>
                            <span className="text-zinc-900">{new Date(staff.date_joined || '').toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleApproveStaff(staff.id, true)}
                            className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-lg shadow-violet-600/10"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleRejectStaff(staff.id)}
                            className="px-4 bg-red-50 text-red-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Staff Performance Analytics */}
              <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="font-semibold">Staff Performance Analytics</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                    <input 
                      type="text"
                      placeholder="Search staff name..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 w-full sm:w-64"
                    />
                  </div>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Staff Member</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Current Tier</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">Monthly Success</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-right">Total Earned (Incl. Bonus)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {staffPerformance
                      .filter(staff => staff.name.toLowerCase().includes(adminSearch.toLowerCase()))
                      .map((staff) => (
                      <tr 
                        key={staff.id} 
                        className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedStaffDetail(staff);
                          setShowStaffModal(true);
                        }}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600">
                              {staff.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{staff.name}</span>
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{staff.branch}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${staff.tier.bg} ${staff.tier.color}`}>
                            {staff.tier.name}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-semibold text-center">{staff.monthlySuccessfulRefs}</td>
                        <td className="p-4 text-sm font-bold text-right text-violet-600">
                          {clinicProfile.currency}{staff.earned.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Approval Table */}
              <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                  <h3 className="font-semibold">Manage Referrals</h3>
                  <button 
                    onClick={exportToCSV}
                    className="flex items-center gap-2 text-xs font-bold text-violet-600 hover:bg-violet-50 px-3 py-2 rounded-xl transition-colors"
                  >
                    <Download size={14} />
                    Export CSV
                  </button>
                </div>
                <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100">
                          <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Staff</th>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Patient</th>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Service</th>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Incentive</th>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Status</th>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {referrals.map((ref) => (
                          <tr key={ref.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="p-4 text-sm font-medium">{ref.staff_name}</td>
                            <td className="p-4 text-sm">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{ref.patient_name}</p>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${ref.patient_type === 'existing' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                  {ref.patient_type || 'new'}
                                </span>
                              </div>
                              {ref.patient_phone && <p className="text-[10px] text-zinc-400">{ref.patient_phone} • <span className="font-bold text-indigo-600">{ref.branch}</span></p>}
                            </td>
                            <td className="p-4 text-sm text-zinc-500">{ref.service_name}</td>
                            <td className="p-4 text-sm font-bold">{clinicProfile.currency}{ref.commission_amount.toFixed(2)}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(ref.status)}`}>
                                {getStatusLabel(ref.status)}
                              </span>
                              {ref.fraud_flags && (
                                <div className="mt-1 flex gap-1">
                                  {JSON.parse(ref.fraud_flags).map((flag: string) => (
                                    <span key={flag} className="px-1 py-0.5 bg-red-50 text-red-600 rounded text-[8px] font-bold uppercase border border-red-100">
                                      {flag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                {ref.status === 'paid_completed' && (
                                  <button 
                                    onClick={() => handleUpdateStatus(ref.id, 'buffer')}
                                    className="text-[10px] font-bold uppercase tracking-wider bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors"
                                  >
                                    Start Buffer
                                  </button>
                                )}
                                {ref.status === 'buffer' && (
                                  <button 
                                    onClick={() => handleUpdateStatus(ref.id, 'approved')}
                                    className="text-[10px] font-bold uppercase tracking-wider bg-violet-500 text-white px-3 py-1.5 rounded-lg hover:bg-violet-600 transition-colors"
                                  >
                                    Approve
                                  </button>
                                )}
                                {ref.status === 'approved' && (
                                  <button 
                                    onClick={() => handleUpdateStatus(ref.id, 'payout_processed')}
                                    className="text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                                  >
                                    Pay
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                </table>
              </div>

              {/* Payout Management Section */}
              <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Payout Management</h3>
                    <p className="text-xs text-zinc-400 font-medium">Generate bulk payment files for banking software</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowPayoutModal(true)}
                      disabled={selectedPayoutStaff.length === 0}
                      className="flex items-center gap-2 text-xs font-bold bg-violet-600 text-white px-4 py-2 rounded-xl transition-all hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
                    >
                      <Download size={14} />
                      Generate Bulk CSV
                    </button>
                    <button 
                      onClick={processPayouts}
                      disabled={selectedPayoutStaff.length === 0}
                      className="flex items-center gap-2 text-xs font-bold bg-zinc-900 text-white px-4 py-2 rounded-xl transition-all hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-zinc-900/20"
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
                            className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                            checked={selectedPayoutStaff.length === staffPerformance.filter(s => s.approved_earnings > 0).length && staffPerformance.filter(s => s.approved_earnings > 0).length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPayoutStaff(staffPerformance.filter(s => s.approved_earnings > 0).map(s => s.id));
                              } else {
                                setSelectedPayoutStaff([]);
                              }
                            }}
                          />
                        </th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Staff Member</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Bank Details</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-right">Approved Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {staffPerformance
                        .filter(s => s.approved_earnings > 0)
                        .map((staff) => (
                        <tr key={staff.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="p-4">
                            <input 
                              type="checkbox"
                              className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
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
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600">
                                {staff.name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{staff.name}</span>
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{staff.branch}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-700">{staff.bank_name || 'MISSING BANK'}</span>
                              <span className="text-[10px] text-zinc-400 font-medium tracking-wider">{staff.bank_account_number || 'MISSING ACCOUNT'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm font-bold text-right text-violet-600">
                            {clinicProfile.currency}{staff.approved_earnings.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {staffPerformance.filter(s => s.approved_earnings > 0).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-zinc-400 text-sm italic">
                            No approved earnings ready for payout.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'receptionist' && (currentUser.role === 'receptionist' || currentUser.role === 'dispensary') && (
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
                        <PlusCircle className="text-violet-500" size={20} />
                        <h3 className="font-semibold">Log Walk-in Referral</h3>
                      </div>
                      <form onSubmit={handleSubmitReferral} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Referral Code</label>
                          <input 
                            type="text" 
                            required
                            value={walkInPromoCode}
                            onChange={(e) => checkPromoCode(e.target.value.toUpperCase())}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-mono"
                            placeholder="e.g. SMITH10"
                          />
                          {walkInStaff ? (
                            <p className="mt-2 text-xs text-violet-600 font-medium">✓ Referrer: {walkInStaff.name}</p>
                          ) : walkInPromoCode.length >= 3 ? (
                            <p className="mt-2 text-xs text-red-500 font-medium">✗ Invalid Referral Code</p>
                          ) : null}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Patient Name</label>
                          <input 
                            type="text" 
                            required
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                            placeholder="Enter patient name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Patient Type</label>
                          <select 
                            required
                            value={patientType}
                            onChange={(e) => setPatientType(e.target.value as 'new' | 'existing')}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all appearance-none"
                          >
                            <option value="new">New Patient</option>
                            <option value="existing">Existing Patient</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Service</label>
                          <select 
                            required
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all appearance-none"
                          >
                            <option value="">Select a service</option>
                            {services.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <button 
                          type="submit"
                          disabled={isSubmitting || !walkInStaff}
                          className="w-full bg-zinc-900 text-white py-3 rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
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
                      <h3 className="font-semibold">{currentUser.role === 'receptionist' ? 'Patient Check-in' : 'Pending Payouts'}</h3>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select 
                          value={branchFilter}
                          onChange={(e) => setBranchFilter(e.target.value)}
                          className="px-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        >
                          <option value="all">All Branches</option>
                          <option value="Bangi">Bangi</option>
                          <option value="Kajang">Kajang</option>
                          <option value="HQ">HQ</option>
                        </select>
                        <select 
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="px-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        >
                          <option value="all">All Statuses</option>
                          <option value="entered">Entered</option>
                          <option value="completed">Visit Completed</option>
                          <option value="paid_completed">Payment Completed</option>
                          <option value="buffer">7-Day Buffer</option>
                          <option value="approved">Approved</option>
                          <option value="payout_processed">Payout Processed</option>
                        </select>
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="Search patient name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-4 pr-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-zinc-50">
                      {referrals
                        .filter(r => r.patient_name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .filter(r => statusFilter === 'all' ? true : r.status === statusFilter)
                        .filter(r => currentUser.role === 'dispensary' ? r.status === 'completed' : true)
                        .map((ref) => (
                        <div key={ref.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                            <div>
                              <p className="text-sm font-semibold">{ref.patient_name}</p>
                              <p className="text-[10px] text-zinc-400">{ref.patient_phone}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-zinc-500">{ref.service_name}</p>
                              <p className="text-[10px] text-zinc-400">Service</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-violet-600">{ref.staff_name}</p>
                              <p className="text-[10px] text-zinc-400">Staff</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-zinc-500">{ref.appointment_date}</p>
                              <p className="text-[10px] text-zinc-400">{ref.booking_time}</p>
                            </div>
                            <div>
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(ref.status)}`}>
                                {getStatusLabel(ref.status)}
                              </span>
                              <p className="text-[10px] text-zinc-400 mt-1">Status</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <select 
                              value={ref.status}
                              onChange={(e) => handleUpdateStatus(ref.id, e.target.value as any)}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            >
                              <option value="entered">Entered</option>
                              <option value="completed">Visit Completed</option>
                              <option value="paid_completed">Payment Completed</option>
                              <option value="buffer">7-Day Buffer</option>
                              <option value="approved">Approved</option>
                              <option value="payout_processed">Payout Processed</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>
                        </div>
                      ))}
                      {referrals.length === 0 && (
                        <div className="p-12 text-center text-zinc-400">
                          <p className="text-sm">No referrals found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'kit' && currentUser.role === 'staff' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className={`p-8 rounded-[2.5rem] relative overflow-hidden ${isMobile ? 'bg-gradient-to-br from-brand-primary via-brand-surface to-brand-bg text-white' : 'bg-gradient-to-br from-violet-600 via-violet-700 to-fuchsia-700 text-white'}`}>
                <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] -mr-32 -mt-32 ${isMobile ? 'bg-brand-peach/20' : 'bg-fuchsia-500/20'}`} />
                <div className="relative z-10">
                  <h3 className="text-2xl font-black tracking-tighter mb-2">Referral Kit</h3>
                  <p className={`${isMobile ? 'text-white/80' : 'text-white/70'} text-sm font-medium max-w-md`}>Everything you need to refer patients and earn rewards.</p>
                </div>
              </div>

              <div className={`${isMobile ? 'bg-white border-zinc-200 rotate-[1deg]' : 'bg-white border-black/5'} p-8 rounded-[2.5rem] border shadow-[0_8px_30px_rgb(0,0,0,0.04)]`}>
                <div className="flex items-center gap-2 mb-8">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${isMobile ? 'bg-brand-peach text-brand-primary shadow-brand-peach/20 rotate-[-5deg]' : 'bg-blue-500 text-white shadow-blue-500/20'}`}>
                    <QrCode size={20} />
                  </div>
                  <h3 className={`font-bold ${isMobile ? 'text-zinc-900' : 'text-zinc-900'}`}>Your Toolkit</h3>
                </div>
                
                <div className="space-y-8">
                  <div className={`flex flex-col items-center p-8 rounded-[2.5rem] border ${isMobile ? 'bg-zinc-50 border-zinc-100' : 'bg-zinc-50/50 border-zinc-100'}`}>
                    <div className={`p-6 rounded-[2rem] shadow-sm mb-6 bg-white`}>
                      <QRCodeCanvas 
                        value={`${window.location.origin}?ref=${currentUser.promo_code}`}
                        size={180}
                        level="H"
                        includeMargin={false}
                        className="rounded-lg"
                      />
                    </div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Personal QR Code</p>
                    <p className={`text-xs mt-2 text-center max-w-[200px] ${isMobile ? 'text-zinc-600' : 'text-zinc-500'}`}>Patients can scan this to book directly with your referral code.</p>
                  </div>

                  <div className="space-y-4">
                    <div className={`p-6 rounded-2xl border flex items-center justify-between ${isMobile ? 'bg-zinc-50 border-zinc-100' : 'bg-zinc-50/50 border-zinc-100'}`}>
                      <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Referral Code</p>
                        <p className={`text-2xl font-black tracking-tighter ${isMobile ? 'text-zinc-900' : 'text-zinc-900'}`}>{currentUser.promo_code}</p>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(currentUser.promo_code);
                          alert('Code copied!');
                        }}
                        className={`p-4 rounded-xl border transition-all active:scale-90 ${isMobile ? 'bg-white border-zinc-200 text-brand-primary hover:bg-zinc-50' : 'bg-white border-zinc-100 text-zinc-400 hover:text-violet-500'}`}
                      >
                        <Copy size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button 
                        onClick={() => {
                          const url = `${window.location.origin}?ref=${currentUser.promo_code}`;
                          const text = `Hi! Book your appointment at our clinic using my referral link: ${url}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className={`flex items-center justify-center gap-3 p-5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isMobile ? 'bg-brand-peach text-brand-primary shadow-brand-peach/10 hover:bg-brand-peach/90' : 'bg-gradient-to-r from-orange-400 to-rose-400 text-white shadow-orange-500/10 hover:from-orange-500 hover:to-rose-500'}`}
                      >
                        <MessageCircle size={18} />
                        Share on WhatsApp
                      </button>
                      <button 
                        onClick={() => {
                          const url = `${window.location.origin}?ref=${currentUser.promo_code}`;
                          navigator.clipboard.writeText(url);
                          alert('Link copied!');
                        }}
                        className={`flex items-center justify-center gap-3 p-5 border rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm ${isMobile ? 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50' : 'bg-white text-zinc-900 border-zinc-100 hover:bg-zinc-50'}`}
                      >
                        <Share2 size={18} />
                        Copy Referral Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Log New Referral (Staff Only) */}
              {currentUser.role === 'staff' && !isMobile && (
                <div className={`${isMobile ? 'bg-white border-zinc-200 rotate-[-1deg]' : 'bg-violet-50 border-violet-100'} p-8 rounded-[2.5rem] border shadow-[0_8px_30px_rgb(0,0,0,0.02)]`}>
                  <div className="flex items-center gap-2 mb-6">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${isMobile ? 'bg-brand-peach text-brand-primary shadow-brand-peach/20 rotate-[5deg]' : 'bg-violet-500 text-white shadow-violet-500/20'}`}>
                      <PlusCircle size={20} />
                    </div>
                    <h3 className={`font-bold ${isMobile ? 'text-zinc-900' : 'text-violet-900'}`}>Log New Referral</h3>
                  </div>
                  <form onSubmit={handleSubmitReferral} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Patient Name</label>
                      <input 
                        type="text" 
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${isMobile ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500/10 focus:border-violet-500/50 text-zinc-900'}`}
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
                          className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${isMobile ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500/10 focus:border-violet-500/50 text-zinc-900'}`}
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
                          className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${isMobile ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500/10 focus:border-violet-500/50 text-zinc-900'}`}
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
                        className={`w-full px-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 ${isMobile ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500/10 focus:border-violet-500/50 text-zinc-900'}`}
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
                        className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium h-20 resize-none focus:outline-none focus:ring-4 ${isMobile ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500/10 focus:border-violet-500/50 text-zinc-900'}`}
                        placeholder="Enter patient address"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Target Branch</label>
                      <select 
                        required
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className={`w-full px-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 ${isMobile ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500/10 focus:border-violet-500/50 text-zinc-900'}`}
                      >
                        <option value="">Select Branch</option>
                        <option value="Bangi">Bangi</option>
                        <option value="Kajang">Kajang</option>
                        <option value="HQ">HQ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Service Promoted</label>
                      <div className="relative">
                        <select 
                          required
                          value={selectedService}
                          onChange={(e) => setSelectedService(e.target.value)}
                          className={`w-full px-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium pr-12 focus:outline-none focus:ring-4 ${isMobile ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500/10 focus:border-violet-500/50 text-zinc-900'}`}
                        >
                          <option value="">Select a service</option>
                          {services.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({clinicProfile.currency}{s.commission_rate} incentive {s.aracoins_perk > 0 ? `+ ${s.aracoins_perk} Coins` : ''})</option>
                          ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Booking Date</label>
                        <input 
                          type="date" 
                          required
                          min={new Date().toISOString().split('T')[0]}
                          value={appointmentDate}
                          onChange={(e) => setAppointmentDate(e.target.value)}
                          className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${isMobile ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500/10 focus:border-violet-500/50 text-zinc-900'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Booking Time</label>
                        <select 
                          required
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className={`w-full px-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 ${isMobile ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500/10 focus:border-violet-500/50 text-zinc-900'}`}
                        >
                          <option value="">Select time</option>
                          {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className={`w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] shadow-xl disabled:opacity-50 mt-2 flex items-center justify-center gap-2 ${isMobile ? 'bg-brand-peach text-brand-primary shadow-brand-peach/20 hover:bg-brand-peach/90' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-violet-900/10 hover:from-violet-700 hover:to-fuchsia-700'}`}
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

              <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-500 text-white rounded-2xl flex items-center justify-center shrink-0">
                    <Info size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-900 mb-1">How to use?</h4>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Share your link or QR code on social media, WhatsApp, or print it out! When patients book using your link, you'll see them in your history automatically.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'guide' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-zinc-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] -mr-32 -mt-32" />
                <div className="relative z-10">
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className="flex items-center gap-2 text-violet-400 text-xs font-bold uppercase tracking-widest mb-4 hover:text-violet-300 transition-colors"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                    Back to Profile
                  </button>
                  <h3 className="text-2xl font-black tracking-tighter mb-2">Platform User Guide</h3>
                  <p className="text-zinc-400 text-sm font-medium max-w-md">Learn how to maximize your efficiency and earnings with the {clinicProfile.name} portal.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-6 rounded-3xl border ${currentUser.role === 'staff' ? 'bg-violet-50 border-violet-100' : 'bg-white border-black/5'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${currentUser.role === 'staff' ? 'bg-violet-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
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

                <div className={`p-6 rounded-3xl border ${currentUser.role === 'receptionist' ? 'bg-violet-50 border-violet-100' : 'bg-white border-black/5'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${currentUser.role === 'receptionist' ? 'bg-violet-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="font-bold mb-2">For Receptionists</h4>
                  <ul className="space-y-3 text-xs text-zinc-500 font-medium">
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Use the "Check-in" tab to find patients arriving today.</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Mark visits as "Completed" after the consultation.</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Update "Payment Status" to trigger the 7-day buffer period.</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>Verify walk-in referrals by entering the staff's promo code.</span>
                    </li>
                  </ul>
                </div>

                <div className={`p-6 rounded-3xl border ${currentUser.role === 'admin' ? 'bg-violet-50 border-violet-100' : 'bg-white border-black/5'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${currentUser.role === 'admin' ? 'bg-violet-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
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
                <h4 className="font-black text-xs uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                  <Zap size={14} className="text-yellow-500" />
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
              <div className={`${isMobile ? 'bg-[#1e293b] border-white/5' : 'bg-white border-black/5 shadow-sm'} p-8 rounded-[2.5rem] border relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-32 h-32 ${isMobile ? 'bg-brand-accent/10' : 'bg-violet-50'} rounded-full blur-3xl -mr-16 -mt-16`} />
                
                <div className="flex flex-col items-center text-center mb-10 relative z-10">
                  <div className="relative group mb-6 flex flex-col items-center">
                    <div className={`w-32 h-32 rounded-[2.5rem] ${isMobile ? 'bg-[#0f172a] border-white/10' : 'bg-zinc-100 border-white'} border-4 shadow-xl overflow-hidden flex items-center justify-center relative`}>
                      {currentUser.profile_picture ? (
                        <img src={currentUser.profile_picture} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserCircle size={64} className={isMobile ? 'text-[#f5f5dc]/20' : 'text-zinc-300'} />
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <RefreshCw className="text-white animate-spin" size={24} />
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <label className={`cursor-pointer ${isMobile ? 'bg-brand-accent text-white' : 'bg-zinc-900 text-white'} px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2`}>
                        <PlusCircle size={14} />
                        Choose Image
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                      </label>
                      {currentUser.profile_picture && (
                        <button 
                          type="button"
                          onClick={() => handleUpdateProfile({ profile_picture: '' })}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isMobile ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className={`text-2xl font-black tracking-tighter ${isMobile ? 'text-[#f5f5dc]' : 'text-zinc-900'}`}>{currentUser.nickname || currentUser.name}</h3>
                  <p className={`text-sm font-medium uppercase tracking-widest ${isMobile ? 'text-[#f5f5dc]/60' : 'text-zinc-400'}`}>{currentUser.role}</p>
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
                      <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${isMobile ? 'text-[#f5f5dc]/40' : 'text-zinc-400'}`}>Nickname</label>
                      <input 
                        name="nickname"
                        type="text"
                        defaultValue={currentUser.nickname || ''}
                        className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                          isMobile 
                            ? 'bg-[#0f172a] border-white/5 text-[#f5f5dc] focus:ring-brand-accent/20 focus:border-brand-accent' 
                            : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:ring-violet-500/10 focus:border-violet-500'
                        }`}
                        placeholder="Your preferred name"
                      />
                    </div>
                  </div>

                  <div className={`pt-6 border-t ${isMobile ? 'border-white/5' : 'border-zinc-100'}`}>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isMobile ? 'text-[#f5f5dc]/40' : 'text-zinc-400'}`}>
                      <DollarSign size={14} className={isMobile ? 'text-brand-accent' : 'text-violet-500'} />
                      Bank Account Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${isMobile ? 'text-[#f5f5dc]/40' : 'text-zinc-400'}`}>Bank Name</label>
                        <input 
                          name="bank_name"
                          type="text"
                          defaultValue={currentUser.bank_name || ''}
                          className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                            isMobile 
                              ? 'bg-[#0f172a] border-white/5 text-[#f5f5dc] focus:ring-brand-accent/20 focus:border-brand-accent' 
                              : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:ring-violet-500/10 focus:border-violet-500'
                          }`}
                          placeholder="e.g. Maybank, CIMB"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${isMobile ? 'text-[#f5f5dc]/40' : 'text-zinc-400'}`}>Account Number</label>
                        <input 
                          name="bank_account_number"
                          type="text"
                          defaultValue={currentUser.bank_account_number || ''}
                          className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                            isMobile 
                              ? 'bg-[#0f172a] border-white/5 text-[#f5f5dc] focus:ring-brand-accent/20 focus:border-brand-accent' 
                              : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:ring-violet-500/10 focus:border-violet-500'
                          }`}
                          placeholder="1234567890"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${isMobile ? 'text-[#f5f5dc]/40' : 'text-zinc-400'}`}>ID Type</label>
                        <select 
                          name="id_type"
                          defaultValue={currentUser.id_type || 'NRIC'}
                          className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                            isMobile 
                              ? 'bg-[#0f172a] border-white/5 text-[#f5f5dc] focus:ring-brand-accent/20 focus:border-brand-accent' 
                              : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:ring-violet-500/10 focus:border-violet-500'
                          }`}
                        >
                          <option value="NRIC">NRIC</option>
                          <option value="PASSPORT">Passport</option>
                          <option value="BUSINESS_REG">Business Registration</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${isMobile ? 'text-[#f5f5dc]/40' : 'text-zinc-400'}`}>ID Number</label>
                        <input 
                          name="id_number"
                          type="text"
                          defaultValue={currentUser.id_number || ''}
                          className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                            isMobile 
                              ? 'bg-[#0f172a] border-white/5 text-[#f5f5dc] focus:ring-brand-accent/20 focus:border-brand-accent' 
                              : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:ring-violet-500/10 focus:border-violet-500'
                          }`}
                          placeholder="e.g. 900101-10-5050"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`pt-6 border-t ${isMobile ? 'border-white/5' : 'border-zinc-100'}`}>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isMobile ? 'text-[#f5f5dc]/40' : 'text-zinc-400'}`}>
                      <BookOpen size={14} className={isMobile ? 'text-brand-accent' : 'text-violet-500'} />
                      Resources
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('guide')}
                      className={`w-full px-6 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group mb-4 ${
                        isMobile 
                          ? 'bg-[#0f172a] border-white/5 text-[#f5f5dc] hover:bg-brand-accent/10' 
                          : 'bg-violet-50 border-violet-100 text-violet-700 hover:bg-violet-100'
                      }`}
                    >
                      <span>View User Guide & FAQ</span>
                      <ChevronRight size={16} className={`${isMobile ? 'text-[#f5f5dc]/40' : 'text-violet-400'} group-hover:text-brand-accent transition-colors`} />
                    </button>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isMobile ? 'text-[#f5f5dc]/40' : 'text-zinc-400'}`}>
                      <Lock size={14} className={isMobile ? 'text-[#f5f5dc]/20' : 'text-zinc-400'} />
                      Security
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setShowPasswordModal(true)}
                      className={`w-full px-6 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group ${
                        isMobile 
                          ? 'bg-[#0f172a] border-white/5 text-[#f5f5dc]/60 hover:bg-brand-accent/10' 
                          : 'bg-zinc-50 border-zinc-100 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      <span>Change Account Password</span>
                      <ChevronRight size={16} className={`${isMobile ? 'text-[#f5f5dc]/20' : 'text-zinc-300'} group-hover:text-brand-accent transition-colors`} />
                    </button>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button 
                      type="submit"
                      className={`flex-1 py-5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] ${
                        isMobile 
                          ? 'bg-brand-accent text-white shadow-brand-accent/20 hover:opacity-90' 
                          : 'bg-zinc-900 text-white shadow-zinc-900/20 hover:bg-zinc-800'
                      }`}
                    >
                      Save Changes
                    </button>
                    <button 
                      type="button"
                      onClick={handleLogout}
                      className={`px-8 py-5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest transition-all border active:scale-[0.98] flex items-center gap-2 ${
                        isMobile 
                          ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' 
                          : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                      }`}
                    >
                      <LogOut size={18} />
                      Sign Out
                    </button>
                  </div>
                </form>
              </div>

              <div className={`${isMobile ? 'bg-brand-accent/10 border-brand-accent/20' : 'bg-violet-50 border-violet-100'} p-8 rounded-[2.5rem] border`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 ${isMobile ? 'bg-brand-accent' : 'bg-violet-500'} text-white rounded-2xl flex items-center justify-center shrink-0`}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className={`font-bold mb-1 ${isMobile ? 'text-brand-accent' : 'text-violet-900'}`}>Security Tip</h4>
                    <p className={`text-xs leading-relaxed ${isMobile ? 'text-[#f5f5dc]/70' : 'text-violet-700'}`}>Keep your bank details updated to ensure smooth incentive payouts. Your information is encrypted and only visible to the clinic administrator.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'promotions' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className={`text-3xl font-black tracking-tighter ${isMobile ? 'text-zinc-900' : 'text-zinc-900'}`}>Promotions</h2>
                  <p className="text-zinc-500 text-sm font-medium">Stay updated with our latest offers and news</p>
                </div>
                {currentUser.role === 'admin' && (
                  <button 
                    onClick={() => {
                      // Logic to show create promotion modal
                      alert('Admin: Create promotion feature coming soon!');
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-brand-accent/20"
                  >
                    <Plus size={16} />
                    New Promotion
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
                {promotions.map((promo) => (
                  <motion.div 
                    key={promo.id}
                    whileHover={{ y: -5 }}
                    className={`${isMobile ? 'bg-[#1e293b] border-white/5' : 'bg-white border-black/5 shadow-sm'} rounded-[2.5rem] border overflow-hidden flex flex-col`}
                  >
                    {promo.image_url ? (
                      <div className="h-48 overflow-hidden">
                        <img src={promo.image_url} alt={promo.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className={`h-48 ${isMobile ? 'bg-[#0f172a]' : 'bg-violet-50'} flex items-center justify-center`}>
                        <Zap size={48} className={isMobile ? 'text-brand-accent/20' : 'text-violet-200'} />
                      </div>
                    )}
                    <div className="p-8 flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${promo.is_active ? 'bg-green-500/10 text-green-500' : 'bg-zinc-100 text-zinc-400'}`}>
                          {promo.is_active ? 'Active' : 'Ended'}
                        </span>
                        <span className={`text-[10px] font-bold ${isMobile ? 'text-[#f5f5dc]/40' : 'text-zinc-400'}`}>
                          {new Date(promo.start_date).toLocaleDateString()} - {new Date(promo.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className={`text-xl font-black tracking-tight mb-3 ${isMobile ? 'text-[#f5f5dc]' : 'text-zinc-900'}`}>{promo.title}</h3>
                      <p className={`text-sm leading-relaxed mb-6 flex-1 ${isMobile ? 'text-[#f5f5dc]/70' : 'text-zinc-600'}`}>{promo.description}</p>
                      
                      {currentUser.role === 'admin' && (
                        <div className="flex gap-3 pt-6 border-t border-white/5">
                          <button className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isMobile ? 'bg-white/5 text-[#f5f5dc]/60 hover:bg-white/10' : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'}`}>
                            Edit
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this promotion?')) {
                                setPromotions(promotions.filter(p => p.id !== promo.id));
                              }
                            }}
                            className={`px-4 py-3 rounded-xl text-red-500 transition-all ${isMobile ? 'bg-red-500/10 hover:bg-red-500/20' : 'bg-red-50 hover:bg-red-100'}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {promotions.length === 0 && (
                <div className="text-center py-20">
                  <div className={`w-20 h-20 ${isMobile ? 'bg-[#1e293b]' : 'bg-zinc-100'} rounded-[2rem] flex items-center justify-center mx-auto mb-6`}>
                    <Zap size={32} className="text-zinc-400" />
                  </div>
                  <h3 className={`text-xl font-black tracking-tight mb-2 ${isMobile ? 'text-[#f5f5dc]' : 'text-zinc-900'}`}>No active promotions</h3>
                  <p className="text-zinc-500 text-sm font-medium">Check back later for exciting new offers!</p>
                </div>
              )}
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
                  onClick={() => setSetupSubTab('services')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'services' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Service Setup
                </button>
                <button 
                  onClick={() => setSetupSubTab('staff')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'staff' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Staff Setup
                </button>
                <button 
                  onClick={() => setSetupSubTab('booking')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'booking' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Booking Settings
                </button>
                <button 
                  onClick={() => setSetupSubTab('auth')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'auth' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Authentication
                </button>
                <button 
                  onClick={() => setSetupSubTab('clinic')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'clinic' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Clinic Profile
                </button>
                <button 
                  onClick={() => setSetupSubTab('roles')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'roles' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Roles & Permissions
                </button>
                <button 
                  onClick={() => setSetupSubTab('referral')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${setupSubTab === 'referral' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  Referral Settings
                </button>
              </div>

              {setupSubTab === 'services' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm sticky top-8">
                      <h3 className="font-semibold mb-6">{editingService?.id ? 'Edit Service' : 'Add New Service'}</h3>
                      <form onSubmit={handleSaveService} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Service Name</label>
                          <input 
                            type="text" 
                            required
                            value={editingService?.name || ''}
                            onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            placeholder="e.g. Dental Cleaning"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Base Price ($)</label>
                            <input 
                              type="number" 
                              required
                              value={editingService?.base_price || ''}
                              onChange={(e) => setEditingService({...editingService, base_price: parseFloat(e.target.value)})}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Incentive ($)</label>
                            <input 
                              type="number" 
                              required
                              value={editingService?.commission_rate || ''}
                              onChange={(e) => setEditingService({...editingService, commission_rate: parseFloat(e.target.value)})}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">AraCoins Perk</label>
                          <input 
                            type="number" 
                            value={editingService?.aracoins_perk || ''}
                            onChange={(e) => setEditingService({...editingService, aracoins_perk: parseInt(e.target.value)})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            placeholder="Coins per referral"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Tier Allowances ($)</label>
                          {TIERS.map(tier => (
                            <div key={tier.name} className="flex items-center gap-3">
                              <span className={`w-16 text-[10px] font-bold uppercase ${tier.color}`}>{tier.name}</span>
                              <input 
                                type="number" 
                                value={editingService?.allowances?.[tier.name] || ''}
                                onChange={(e) => setEditingService({
                                  ...editingService, 
                                  allowances: { ...editingService?.allowances, [tier.name]: parseFloat(e.target.value) }
                                })}
                                className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-100 text-xs"
                                placeholder="0.00"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-4">
                          <button 
                            type="submit"
                            disabled={isSavingSetup}
                            className="flex-1 bg-zinc-900 text-white py-3 rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
                          >
                            {isSavingSetup ? 'Saving...' : 'Save Service'}
                          </button>
                          {editingService && (
                            <button 
                              type="button"
                              onClick={() => setEditingService(null)}
                              className="px-4 bg-zinc-100 text-zinc-600 py-3 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
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
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-100">
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Service</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Price/Inc</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Perks</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {services.map(service => (
                            <tr key={service.id} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="p-4">
                                <p className="text-sm font-medium">{service.name}</p>
                              </td>
                              <td className="p-4">
                                <p className="text-xs text-zinc-500">${service.base_price} / <span className="text-violet-600 font-bold">${service.commission_rate}</span></p>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-wrap gap-1">
                                  {service.aracoins_perk > 0 && (
                                    <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded text-[9px] font-bold uppercase flex items-center gap-1">
                                      <Coins size={8} /> {service.aracoins_perk}
                                    </span>
                                  )}
                                  {Object.entries(service.allowances || {}).map(([tier, amt]) => (
                                    <span key={tier} className="px-1.5 py-0.5 bg-zinc-50 text-zinc-500 rounded text-[9px] font-bold uppercase">
                                      {tier[0]}: ${amt}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setEditingService(service)} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteService(service.id)} className="p-2 text-zinc-400 hover:text-red-600 transition-colors">
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
              ) : setupSubTab === 'staff' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm sticky top-8">
                      <h3 className="font-semibold mb-6">{editingStaff?.id ? 'Edit Staff' : 'Add New Staff'}</h3>
                      <form onSubmit={handleSaveStaff} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Full Name</label>
                          <input 
                            type="text" 
                            required
                            value={editingStaff?.name || ''}
                            onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Email</label>
                          <input 
                            type="email" 
                            required
                            value={editingStaff?.email || ''}
                            onChange={(e) => setEditingStaff({...editingStaff, email: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Phone Number</label>
                          <input 
                            type="text" 
                            value={editingStaff?.phone || ''}
                            onChange={(e) => setEditingStaff({...editingStaff, phone: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            placeholder="e.g. 60123456789"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Staff ID Code</label>
                            <input 
                              type="text" 
                              required
                              value={editingStaff?.staff_id_code || ''}
                              onChange={(e) => setEditingStaff({...editingStaff, staff_id_code: e.target.value.toUpperCase()})}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                              placeholder="e.g. HR001"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Branch</label>
                            <select 
                              required
                              value={editingStaff?.branch || ''}
                              onChange={(e) => setEditingStaff({...editingStaff, branch: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            >
                              <option value="">Select Branch</option>
                              <option value="Bangi">Bangi</option>
                              <option value="Kajang">Kajang</option>
                              <option value="HQ">HQ</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Department</label>
                            <input 
                              type="text" 
                              value={editingStaff?.department || ''}
                              onChange={(e) => setEditingStaff({...editingStaff, department: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Position</label>
                            <input 
                              type="text" 
                              value={editingStaff?.position || ''}
                              onChange={(e) => setEditingStaff({...editingStaff, position: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Employment</label>
                            <select 
                              value={editingStaff?.employment_status || 'permanent'}
                              onChange={(e) => setEditingStaff({...editingStaff, employment_status: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            >
                              <option value="permanent">Permanent</option>
                              <option value="contract">Contract</option>
                              <option value="locum">Locum</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Date Joined</label>
                            <input 
                              type="date" 
                              value={editingStaff?.date_joined || ''}
                              onChange={(e) => setEditingStaff({...editingStaff, date_joined: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Role</label>
                          <select 
                            required
                            value={editingStaff?.role || 'staff'}
                            onChange={(e) => setEditingStaff({...editingStaff, role: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 appearance-none"
                          >
                            <option value="staff">Staff</option>
                            <option value="receptionist">Receptionist</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Custom Referral Code</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              required
                              value={editingStaff?.promo_code || ''}
                              onChange={(e) => setEditingStaff({...editingStaff, promo_code: e.target.value.toUpperCase()})}
                              className="flex-1 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-mono"
                              placeholder="e.g. SMITH10"
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                const namePart = (editingStaff?.name || 'STAFF').split(' ')[0].toUpperCase();
                                const randomPart = Math.floor(10 + Math.random() * 90);
                                setEditingStaff({...editingStaff, promo_code: `${namePart}${randomPart}`});
                              }}
                              className="px-3 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-colors"
                              title="Generate random code"
                            >
                              <QrCode size={18} />
                            </button>
                          </div>
                          <p className="mt-1 text-[10px] text-zinc-400 ml-1 italic">Must be unique. Used for tracking referrals.</p>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <button 
                            type="submit"
                            disabled={isSavingSetup}
                            className="flex-1 bg-zinc-900 text-white py-3 rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
                          >
                            {isSavingSetup ? 'Saving...' : 'Save Staff'}
                          </button>
                          {editingStaff && (
                            <button 
                              type="button"
                              onClick={() => setEditingStaff(null)}
                              className="px-4 bg-zinc-100 text-zinc-600 py-3 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
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
                                const res = await fetch('/api/debug/supabase');
                                const data = await res.json();
                                alert(`Database Status: ${data.message}\n\nReport:\n${JSON.stringify(data.report, null, 2)}`);
                              } catch (err: any) {
                                alert(`Failed to check database: ${err.message}`);
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm"
                          >
                            <Activity size={12} />
                            Diagnostics
                          </button>
                          <button 
                            onClick={fetchStaff}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm"
                          >
                            <RefreshCw size={12} />
                            Refresh
                          </button>
                        </div>
                      </div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-100">
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Staff Member</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">HR Info</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Status</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Wallet ({clinicProfile.currency})</th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {staffPerformance.map(staff => (
                            <tr key={staff.id} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-zinc-100 overflow-hidden flex items-center justify-center shrink-0">
                                    {staff.profile_picture ? (
                                      <img src={staff.profile_picture} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <UserCircle size={16} className="text-zinc-400" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{staff.nickname || staff.name}</p>
                                    {staff.nickname && <p className="text-[10px] text-zinc-400">Real Name: {staff.name}</p>}
                                    <p className="text-[10px] text-zinc-400">{staff.email} • <span className="font-bold text-violet-600">{staff.promo_code}</span></p>
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold uppercase text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                  {staff.role}
                                </span>
                              </td>
                              <td className="p-4">
                                <p className="text-xs font-medium text-zinc-600">{staff.staff_id_code || 'N/A'}</p>
                                <p className="text-[10px] text-zinc-400">{staff.branch} • {staff.department}</p>
                                {staff.bank_name && (
                                  <p className="text-[9px] font-bold text-violet-600 mt-1 uppercase tracking-tighter">
                                    {staff.bank_name}: {staff.bank_account_number}
                                  </p>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col gap-2">
                                  <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider w-fit ${
                                    staff.is_approved ? 'bg-violet-50 text-violet-600 border border-violet-100' : 
                                    (staff.employment_status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-orange-50 text-orange-600 border border-orange-100')
                                  }`}>
                                    {staff.is_approved ? 'Approved' : (staff.employment_status === 'rejected' ? 'Rejected' : 'Pending')}
                                  </span>
                                  <button 
                                    onClick={() => handleApproveStaff(staff.id, !staff.is_approved)}
                                    className={`text-[9px] font-bold uppercase tracking-tighter underline decoration-dotted underline-offset-2 ${staff.is_approved ? 'text-red-400 hover:text-red-600' : 'text-violet-500 hover:text-violet-700'}`}
                                  >
                                    {staff.is_approved ? 'Revoke Approval' : (staff.employment_status === 'rejected' ? 'Restore & Approve' : 'Approve Now')}
                                  </button>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-zinc-400 uppercase font-bold">Pending</span>
                                    <span className="text-xs font-bold text-orange-600">{staff.pending_earnings.toFixed(0)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-zinc-400 uppercase font-bold">Approved</span>
                                    <span className="text-xs font-bold text-violet-600">{staff.approved_earnings.toFixed(0)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-zinc-400 uppercase font-bold">Paid</span>
                                    <span className="text-xs font-bold text-blue-600">{staff.paid_earnings.toFixed(0)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-zinc-400 uppercase font-bold">Lifetime</span>
                                    <span className="text-xs font-bold text-zinc-900">{staff.lifetime_earnings.toFixed(0)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => handleResetPassword(staff.id)} title="Reset Password" className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
                                    <Key size={14} />
                                  </button>
                                  <button onClick={() => setEditingStaff(staff)} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteStaff(staff.id)} className="p-2 text-zinc-400 hover:text-red-600 transition-colors">
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
              ) : setupSubTab === 'clinic' ? (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                  <h3 className="font-semibold mb-6">Clinic Profile</h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1.5 ml-1 tracking-widest">Clinic Name</label>
                        <input 
                          type="text"
                          value={clinicProfile.name}
                          onChange={(e) => setClinicProfile({ ...clinicProfile, name: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1.5 ml-1 tracking-widest">Currency Code</label>
                        <input 
                          type="text"
                          value={clinicProfile.currency}
                          onChange={(e) => setClinicProfile({ ...clinicProfile, currency: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                          placeholder="RM, $, etc."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1.5 ml-1 tracking-widest">Address</label>
                      <textarea 
                        value={clinicProfile.address}
                        onChange={(e) => setClinicProfile({ ...clinicProfile, address: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium h-24 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1.5 ml-1 tracking-widest">Phone Number</label>
                        <input 
                          type="tel"
                          value={clinicProfile.phone}
                          onChange={(e) => setClinicProfile({ ...clinicProfile, phone: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1.5 ml-1 tracking-widest">Email Address</label>
                        <input 
                          type="email"
                          value={clinicProfile.email}
                          onChange={(e) => setClinicProfile({ ...clinicProfile, email: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        setIsSavingSetup(true);
                        try {
                          await fetch(`${apiBaseUrl}/api/settings`, {
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
                      className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10 disabled:opacity-50"
                    >
                      {isSavingSetup ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              ) : setupSubTab === 'referral' ? (
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
                    <h3 className="text-xl font-black mb-6">Referral Configuration</h3>
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Referral Types</label>
                          <div className="flex flex-wrap gap-2">
                            {referralSettings.types.map(type => (
                              <span key={type} className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-bold">{type}</span>
                            ))}
                            <button className="px-3 py-1.5 border border-dashed border-zinc-300 text-zinc-400 rounded-lg text-xs font-bold hover:border-violet-500 hover:text-violet-500 transition-colors">+ Add Type</button>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Default Commission ({clinicProfile.currency})</label>
                          <input 
                            type="number" 
                            value={referralSettings.defaultCommission}
                            onChange={(e) => setReferralSettings({...referralSettings, defaultCommission: Number(e.target.value)})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Eligibility Criteria</label>
                        <textarea 
                          value={referralSettings.eligibilityCriteria}
                          onChange={(e) => setReferralSettings({...referralSettings, eligibilityCriteria: e.target.value})}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-sm"
                        />
                      </div>

                      <div className="pt-6 border-t border-zinc-100">
                        <h4 className="font-bold mb-4">Staff Referral Quotas</h4>
                        <div className="bg-zinc-50 rounded-2xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-zinc-100">
                                <th className="p-3 font-black uppercase tracking-widest text-zinc-400">Staff Member</th>
                                <th className="p-3 font-black uppercase tracking-widest text-zinc-400">Monthly Quota</th>
                                <th className="p-3 font-black uppercase tracking-widest text-zinc-400">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                              {staffList.map(staff => (
                                <tr key={staff.id}>
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
                                    <button className="text-violet-600 font-bold hover:underline">Update</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          fetch(`${apiBaseUrl}/api/settings`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key: 'referral', value: referralSettings })
                          });
                          alert('Referral settings saved!');
                        }}
                        className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all"
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
                                  className={`w-10 h-5 rounded-full transition-all relative ${value ? 'bg-violet-500' : 'bg-zinc-200'}`}
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
                            await fetch(`${apiBaseUrl}/api/settings`, {
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
                        className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10 disabled:opacity-50"
                      >
                        {isSavingSetup ? 'Saving...' : 'Save Permissions'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : setupSubTab === 'auth' ? (
                <div className="max-w-2xl mx-auto space-y-8">
                  <div className="bg-white p-10 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-50/50 rounded-full blur-3xl -z-10 -mr-32 -mt-32" />
                    
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-14 h-14 bg-zinc-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-zinc-900/20">
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
                              const res = await fetch(`${apiBaseUrl}/api/settings`, {
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
                          className={`w-16 h-8 rounded-full transition-all relative shadow-inner ${authSettings.allowRegistration ? 'bg-violet-500' : 'bg-zinc-200'}`}
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
                            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${saveStatus.type === 'success' ? 'bg-violet-50 text-violet-600 border border-violet-100' : 'bg-red-50 text-red-600 border border-red-100'}`}
                          >
                            <div className={`w-2 h-2 rounded-full ${saveStatus.type === 'success' ? 'bg-violet-500' : 'bg-red-500'} animate-pulse`} />
                            {saveStatus.message}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="p-8 bg-blue-50/50 text-blue-800 rounded-[2rem] border border-blue-100 space-y-4">
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={16} className="text-blue-600" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Security Protocol</p>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs leading-relaxed font-medium">
                            <span className="font-black">Restricted Mode:</span> If disabled, the "Register" tab will be hidden from the login screen. Only administrators can add new staff via the <span className="font-black">Staff Setup</span> tab.
                          </p>
                          <p className="text-xs leading-relaxed font-medium">
                            <span className="font-black">Approval Required:</span> Regardless of this setting, all self-registered accounts are created with <span className="text-orange-600 font-black">Pending Approval</span> status and cannot access clinic data until an admin approves them.
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
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-3 ml-1">Working Hours (Start)</label>
                        <input 
                          type="time" 
                          value={appSettings.workingHours.start}
                          onChange={(e) => setAppSettings({...appSettings, workingHours: {...appSettings.workingHours, start: e.target.value}})}
                          className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-3 ml-1">Working Hours (End)</label>
                        <input 
                          type="time" 
                          value={appSettings.workingHours.end}
                          onChange={(e) => setAppSettings({...appSettings, workingHours: {...appSettings.workingHours, end: e.target.value}})}
                          className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-3 ml-1">Block Specific Dates</label>
                      <div className="flex gap-2 mb-4">
                        <input 
                          type="date" 
                          id="new-blocked-date"
                          className="flex-1 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                        <button 
                          onClick={() => {
                            const input = document.getElementById('new-blocked-date') as HTMLInputElement;
                            if (input.value && !appSettings.blockedDates.includes(input.value)) {
                              setAppSettings({...appSettings, blockedDates: [...appSettings.blockedDates, input.value]});
                              input.value = '';
                            }
                          }}
                          className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider"
                        >
                          Add Date
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {appSettings.blockedDates.map(date => (
                          <span key={date} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-lg text-xs font-medium">
                            {date}
                            <button onClick={() => setAppSettings({...appSettings, blockedDates: appSettings.blockedDates.filter(d => d !== date)})} className="text-red-500 hover:text-red-700">
                              <Trash2 size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-3 ml-1">Block Specific Times (Daily)</label>
                      <div className="flex gap-2 mb-4">
                        <input 
                          type="time" 
                          id="new-blocked-time"
                          className="flex-1 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                        <button 
                          onClick={() => {
                            const input = document.getElementById('new-blocked-time') as HTMLInputElement;
                            if (input.value && !appSettings.blockedTimes.includes(input.value)) {
                              setAppSettings({...appSettings, blockedTimes: [...appSettings.blockedTimes, input.value]});
                              input.value = '';
                            }
                          }}
                          className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider"
                        >
                          Add Time
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {appSettings.blockedTimes.map(time => (
                          <span key={time} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-lg text-xs font-medium">
                            {time}
                            <button onClick={() => setAppSettings({...appSettings, blockedTimes: appSettings.blockedTimes.filter(t => t !== time)})} className="text-red-500 hover:text-red-700">
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
                            await fetch(`${apiBaseUrl}/api/settings`, {
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
                        className="w-full bg-violet-500 text-white py-4 rounded-xl font-bold text-sm hover:bg-violet-600 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
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
                className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
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
                      <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
                        <Download size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-zinc-900 tracking-tight">M2U Biz Payout</h3>
                    </div>
                    <button 
                      onClick={() => setShowPayoutModal(false)}
                      className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
                    >
                      <PlusCircle className="rotate-45 text-zinc-400" size={24} />
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
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Crediting Date (dd/MM/yyyy)</label>
                      <input 
                        name="creditingDate"
                        type="text"
                        required
                        defaultValue={new Date().toLocaleDateString('en-GB')}
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="e.g. 07/03/2026"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Payment Reference</label>
                      <input 
                        name="paymentReference"
                        type="text"
                        required
                        defaultValue="INCENTIVE"
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="e.g. INCENTIVE"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Payment Description</label>
                      <input 
                        name="paymentDescription"
                        type="text"
                        required
                        defaultValue="STAFF REFERRAL INCENTIVE"
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="e.g. STAFF REFERRAL INCENTIVE"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Bulk Payment Type</label>
                      <select 
                        name="bulkPaymentType"
                        defaultValue="SALARY"
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                      >
                        <option value="SALARY">SALARY</option>
                        <option value="DIVIDEND">DIVIDEND</option>
                        <option value="COMMISSION">COMMISSION</option>
                        <option value="OTHERS">OTHERS</option>
                      </select>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-violet-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-violet-700 transition-all shadow-lg shadow-violet-600/20"
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
                className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
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
                      <div className="w-16 h-16 rounded-3xl bg-violet-100 text-violet-700 flex items-center justify-center text-2xl font-bold overflow-hidden border border-violet-100 shadow-sm">
                        {selectedStaffDetail.profile_picture ? (
                          <img 
                            src={selectedStaffDetail.profile_picture} 
                            alt={selectedStaffDetail.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          selectedStaffDetail.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-2xl font-bold tracking-tight text-zinc-900">{selectedStaffDetail.name}</h3>
                          {selectedStaffDetail.nickname && (
                            <span className="text-zinc-400 font-medium text-lg">({selectedStaffDetail.nickname})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">{selectedStaffDetail.role}</p>
                          <p className="text-zinc-400 text-xs font-medium">{selectedStaffDetail.email}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${selectedStaffDetail.tier?.bg || 'bg-zinc-50'} ${selectedStaffDetail.tier?.color || 'text-zinc-400'}`}>
                            {selectedStaffDetail.tier?.name || 'Bronze'} Tier
                          </span>
                          <div className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100">
                            <Coins size={12} />
                            <span className="text-[10px] font-black uppercase tracking-tight">{selectedStaffDetail.aracoins || 0} AraCoins</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowStaffModal(false)}
                      className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
                    >
                      <PlusCircle className="rotate-45 text-zinc-400" size={24} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Monthly Success</p>
                      <p className="text-xl font-bold">{selectedStaffDetail.monthlySuccessfulRefs}</p>
                    </div>
                    <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Total Earned</p>
                      <p className="text-xl font-bold text-violet-600">${selectedStaffDetail.earned.toFixed(2)}</p>
                    </div>
                    <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Promo Code</p>
                      <p className="text-xl font-bold font-mono text-zinc-900">{selectedStaffDetail.promo_code}</p>
                    </div>
                  </div>

                  <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 mb-8">
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <DollarSign size={14} className="text-violet-500" />
                      Payment Information
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Bank Details</p>
                        <p className="text-sm font-bold text-zinc-900">{selectedStaffDetail.bank_name || 'Not Set'}</p>
                        <p className="text-xs text-zinc-500 font-mono">{selectedStaffDetail.bank_account_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Identity Info</p>
                        <p className="text-sm font-bold text-zinc-900">{selectedStaffDetail.id_type || 'NRIC'}</p>
                        <p className="text-xs text-zinc-500 font-mono">{selectedStaffDetail.id_number || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-400 ml-1">Recent Referrals & Allowances</h4>
                    <div className="max-height-[300px] overflow-y-auto pr-2 space-y-2">
                      {referrals
                        .filter(r => r.staff_id === selectedStaffDetail.id)
                        .slice(0, 10)
                        .map(ref => {
                          const service = services.find(s => s.id === ref.service_id);
                          const allowance = service?.allowances?.[selectedStaffDetail.tier?.name || 'Bronze'] || 0;
                          return (
                            <div key={ref.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{ref.patient_name}</p>
                                <p className="text-[10px] text-zinc-500 uppercase font-medium">{ref.service_name} • {ref.date}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-violet-600">+${(ref.commission_amount * (selectedStaffDetail.tier?.bonus || 1)).toFixed(2)}</p>
                                {allowance > 0 && (
                                  <p className="text-[9px] font-bold text-blue-600 uppercase">Allowance: +${allowance.toFixed(2)}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {referrals.filter(r => r.staff_id === selectedStaffDetail.id).length === 0 && (
                        <p className="text-center py-8 text-zinc-400 text-sm italic">No referral history found.</p>
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
                className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
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
                    <button onClick={() => setShowTaskModal(false)} className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-200 transition-all">
                      <PlusCircle size={20} className="rotate-45" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveTask} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Task Title</label>
                      <input 
                        name="title"
                        required
                        defaultValue={editingTask?.title || ''}
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="e.g. Monthly Inventory Check"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Description</label>
                      <textarea 
                        name="description"
                        rows={3}
                        defaultValue={editingTask?.description || ''}
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="Details about the task..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Due Date</label>
                        <DatePicker
                          selected={taskDueDate}
                          onChange={(date) => setTaskDueDate(date)}
                          dateFormat="yyyy-MM-dd"
                          className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                          placeholderText="Select due date"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Assign To</label>
                        <select 
                          name="assigned_to"
                          defaultValue={editingTask?.assigned_to || ''}
                          className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium appearance-none"
                        >
                          <option value="">Unassigned</option>
                          {staffList.map(staff => (
                            <option key={staff.id} value={staff.id}>{staff.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-zinc-900 text-white py-5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 active:scale-[0.98]"
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
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPasswordModal(false)}
                className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black tracking-tighter">Change Password</h3>
                    <button onClick={() => setShowPasswordModal(false)} className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-200 transition-all">
                      <PlusCircle size={20} className="rotate-45" />
                    </button>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-6">
                    {passwordError && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
                        {passwordError}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Current Password</label>
                      <input 
                        type="password"
                        value={passwordForm.current}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">New Password</label>
                      <input 
                        type="password"
                        value={passwordForm.new}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="Min. 6 characters"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                      <input 
                        type="password"
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-medium"
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isChangingPassword}
                      className="w-full bg-zinc-900 text-white py-5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReferralModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowReferralModal(false)}
                className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="p-8 overflow-y-auto">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black tracking-tighter">Log New Referral</h3>
                    <button onClick={() => setShowReferralModal(false)} className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-200 transition-all">
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
                        <QRCodeCanvas 
                          value={`${window.location.origin}/refer?staff=${currentUser.id}`}
                          size={120}
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Your Personal QR</p>
                      <p className="text-[9px] font-bold text-zinc-500 leading-tight">Patients can scan this to book directly under your name</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Patient Name</label>
                      <input 
                        type="text" 
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900"
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
                          className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900"
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
                          className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900"
                          placeholder="IC Number"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Target Branch</label>
                      <select 
                        required
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900"
                      >
                        <option value="">Select Branch</option>
                        <option value="Bangi">Bangi</option>
                        <option value="Kajang">Kajang</option>
                        <option value="HQ">HQ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Service Promoted</label>
                      <select 
                        required
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900"
                      >
                        <option value="">Select a service</option>
                        {services.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Booking Date</label>
                        <input 
                          type="date" 
                          required
                          min={new Date().toISOString().split('T')[0]}
                          value={appointmentDate}
                          onChange={(e) => setAppointmentDate(e.target.value)}
                          className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Booking Time</label>
                        <select 
                          required
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full px-5 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-peach/10 focus:border-brand-peach/50 text-zinc-900"
                        >
                          <option value="">Select time</option>
                          {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
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
            </div>
          )}
        </AnimatePresence>
      </>
    )}
      </main>
    </div>
  );
  }
}
