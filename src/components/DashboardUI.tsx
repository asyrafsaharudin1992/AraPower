import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  Trophy, 
  TrendingUp, 
  Trash2,
  Lock,
  MousePointerClick,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  Info,
  X,
  User,
  Phone,
  Banknote,
  Navigation,
  Star,
  Megaphone,
  BarChart3
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Area 
} from 'recharts';
import { CategoryScrollRow } from './CategoryScrollRow';
import { AwarenessCarousel } from './AwarenessCarousel';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';

const MALAYSIAN_BANKS = [
  "Affin Bank Berhad","alliance Bank Malaysia Berhad","AmBank (M) Berhad","BNP Paribas Malaysia Berhad",
  "CIMB Bank Berhad","Citibank Berhad","HSBC Bank Malaysia Berhad","Hong Leong Bank Berhad",
  "Malayan Banking Berhad (Maybank)","OCBC Bank (Malaysia) Berhad","Public Bank Berhad",
  "RHB Bank Berhad","Standard Chartered Bank Malaysia Berhad","United Overseas Bank (Malaysia) Bhd.",
  "Bank Islam Malaysia Berhad","Bank Muamalat Malaysia Berhad"
];


interface DashboardUIProps {
  currentUser: any;
  referrals: any[];
  clinicProfile: any;
  adminStats: any;
  receptionistStats: any;
  activeStaffList: any[];
  staffList: any[];
  services: any[];
  currentUserStats: any;
  progressToNext: number;
  nextTier: any;
  isMobile: boolean;
  checkBranchAccess: (item: any) => boolean;
  setActiveTab: (tab: any) => void;
  handleDeleteReferral: (id: string) => void;
  handleUpdateStatus: (id: string, status: string) => void;
  handleClinicStatusUpdate: (id: string, status: string) => void;
  setSelectedPromo: (promo: any) => void;
  setIsPromoModalOpen: (isOpen: boolean) => void;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  setSelectedStaffDetail: (staff: any) => void;
  setShowStaffModal: (show: boolean) => void;
  handleUpdateProfile?: (data: any) => void;
}

export const DashboardUI: React.FC<DashboardUIProps> = ({
  currentUser,
  referrals,
  clinicProfile,
  adminStats,
  receptionistStats,
  activeStaffList,
  staffList,
  services,
  currentUserStats,
  progressToNext,
  nextTier,
  isMobile,
  checkBranchAccess,
  setActiveTab,
  handleDeleteReferral,
  handleUpdateStatus,
  handleUpdateProfile,
  setSelectedPromo,
  setIsPromoModalOpen,
  getStatusColor,
  getStatusLabel,
  setSelectedStaffDetail,
  setShowStaffModal
}) => {
  const P = "'Poppins', sans-serif";
  const blue = '#1580c2';

  const [analytics, setAnalytics] = useState({ clicks: 0, completed: 0, dropOffRate: 0 });
  const [debugMsg, setDebugMsg] = useState("");
  const [announcement, setAnnouncement] = useState<{message: string, is_active: boolean} | null>(null);
  
  // Profile Completion logic
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    bank_name: currentUser?.bank_name || '',
    bank_account_number: currentUser?.bank_account_number || ''
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const calculateCompletion = () => {
    let completedFields = 0;
    const fields = ['name', 'phone', 'bank_name', 'bank_account_number'];
    fields.forEach(field => {
      if (currentUser[field] && currentUser[field].toString().trim() !== '') {
        completedFields++;
      }
    });
    return (completedFields / fields.length) * 100;
  };

  const completionPercentage = calculateCompletion();

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('staff')
        .update({
          name: profileForm.name,
          phone: profileForm.phone,
          bank_name: profileForm.bank_name,
          bank_account_number: profileForm.bank_account_number
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      toast.success('Profile completed! You are now ready for payouts.');
      setShowProfileModal(false);
      
      // Refresh user state
      if (handleUpdateProfile) {
        handleUpdateProfile(profileForm);
      }
    } catch (error: any) {
      console.error('Update Error:', error);
      toast.error('Failed to update profile: ' + error.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  useEffect(() => {
    // Announcements
    const fetchAnnouncement = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (!error && data) {
        setAnnouncement(data);
      }
    };
    fetchAnnouncement();
    
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') return;

    const fetchAnalytics = async () => {
      const { data, error } = await supabase
        .from('booking_analytics')
        .select('event_type');
        
      if (error) {
        console.error("Supabase Analytics Error:", error);
        setDebugMsg(`Error: ${error.message}`);
      } else if (data) {
        setDebugMsg(`Loaded ${data.length} rows from Supabase.`);
        const clicks = data.filter(e => e.event_type === 'clicked_tempah').length;
        const completed = data.filter(e => e.event_type === 'completed_booking').length;
        
        // Calculate drop-off rate safely to avoid dividing by zero
        const dropOffRate = clicks > 0 ? Math.round(((clicks - completed) / clicks) * 100) : 0;
        
        setAnalytics({ clicks, completed, dropOffRate });
      } else {
        setDebugMsg(`No data and no error returned.`);
      }
    };
    
    fetchAnalytics();
  }, [currentUser.role, currentUser.referral_code, referrals]);

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
      style={{ fontFamily: P }}
    >
     {/* ── Global Announcement Banner ── */}
{announcement?.is_active && announcement?.message && (
  <div className="bg-red-500 dark:bg-red-600 border border-red-600 dark:border-red-700 rounded-2xl p-4 mb-6 shadow-sm flex items-start sm:items-center gap-3">
    <div className="p-2 bg-white/20 text-yellow-300 rounded-lg shrink-0">
      <AlertTriangle size={20} />
    </div>
    <div className="flex-1">
      <h3 className="text-sm font-bold text-white">Announcement</h3>
      <p className="text-xs text-white/90 mt-1 whitespace-pre-wrap leading-relaxed">
        {announcement.message}
      </p>
    </div>
  </div>
)}

      {/* ── Profile Completion Widget ── */}
      {completionPercentage < 100 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-[3rem] p-8 text-white shadow-xl relative overflow-hidden"
        >
          {/* Decorative backdrop */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 max-w-xl">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Star className="text-yellow-300 fill-yellow-300" size={20} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-white/80">Profile Mastery</span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tighter leading-tight">Action Required: Complete your profile to ensure smooth commission payouts.</h3>
                <p className="text-white/70 text-sm font-medium mt-2">Almost there! Adding your bank details unlocks higher referral limits and instant withdrawals.</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-white/60">Current Progress</span>
                  <span className="text-lg font-black">{Math.round(completionPercentage)}%</span>
                </div>
                <div className="h-4 bg-black/20 rounded-full overflow-hidden border border-white/10 backdrop-blur-sm">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 rounded-full shadow-[0_0_15px_rgba(253,224,71,0.5)]"
                  />
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setProfileForm({
                  name: currentUser?.name || '',
                  phone: currentUser?.phone || '',
                  bank_name: currentUser?.bank_name || '',
                  bank_account_number: currentUser?.bank_account_number || ''
                });
                setShowProfileModal(true);
              }}
              className="bg-white text-violet-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:shadow-xl hover:bg-zinc-50 active:scale-95 transition-all whitespace-nowrap"
            >
              Complete Profile Now
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Admin / Manager / Receptionist stat cards ── */}
      {(currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'receptionist') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(currentUser.role === 'admin' || currentUser.role === 'manager') ? (
            <>
              {[
                { icon: ClipboardList, label: 'Total Referrals', value: adminStats.totalReferrals, sub: <span style={{ fontSize: '10px', fontWeight: 600, color: '#1580c2', background: 'rgba(255,255,255,0.9)', padding: '2px 8px', borderRadius: '8px' }}>Active</span> },
                { icon: DollarSign, label: 'Processed Payouts', value: `${clinicProfile.currency}${(adminStats.totalPayout || 0).toFixed(0)}`, sub: <span style={{ fontSize: '10px', fontWeight: 600, color: '#ffffff', opacity: 0.65 }}>Payable: {clinicProfile.currency}{(adminStats.pendingPayout || 0).toFixed(0)}</span> },
                { icon: Users, label: 'Active Staff', value: activeStaffList.length, sub: <span style={{ fontSize: '10px', fontWeight: 600, color: '#ffffff', opacity: 0.65 }}>{staffList.length} Registered</span> },
              ].map(({ icon: Icon, label, value, sub }) => (
                <div key={label} style={{ background: '#1580c2', borderRadius: '2rem', border: 'none', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', transform: 'translate(30%, -30%)' }} />
                  <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={24} color="white" />
                  </div>
                  <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, color: '#ffffff', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px 0' }}>{label}</p>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px', margin: '0 0 4px 0', lineHeight: 1 }}>{value}</p>
                    <div>{sub}</div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {[
                {
                  icon: CheckCircle2,
                  label: currentUser.role === 'receptionist' ? 'Arrived Today' : 'Paid Today',
                  value: currentUser.role === 'receptionist' ? receptionistStats.arrivedToday : referrals.filter((r: any) => r.status === 'payment_made' && r.date === new Date().toISOString().split('T')[0]).length,
                  sub: currentUser.role === 'receptionist' ? 'Patients checked in' : 'Referrals completed',
                },
                {
                  icon: Clock,
                  label: 'Pending Action',
                  value: currentUser.role === 'receptionist' ? receptionistStats.pendingArrivals : referrals.filter((r: any) => r.status === 'payment_approved').length,
                  sub: currentUser.role === 'receptionist' ? 'Expected today' : 'Awaiting payment',
                },
                {
                  icon: MessageCircle,
                  label: 'New Leads',
                  value: referrals.filter((r: any) => r.status === 'new').length,
                  sub: 'Requires follow-up',
                },
              ].map(({ icon: Icon, label, value, sub }) => (
                <div key={label} style={{ background: '#1580c2', borderRadius: '2rem', border: 'none', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', transform: 'translate(30%, -30%)' }} />
                  <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={24} color="white" />
                  </div>
                  <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, color: '#ffffff', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px 0' }}>{label}</p>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px', margin: '0 0 4px 0', lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: '10px', fontWeight: 500, color: '#ffffff', opacity: 0.65, margin: 0 }}>{sub}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Booking Conversion Funnel (Admin/Manager) */}
      {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black tracking-tighter text-zinc-900">Booking Conversion Funnel</h3>
              <p className="text-sm text-zinc-500 font-medium">Monitor form abandonment and success rates</p>
              {debugMsg && <p className="text-xs text-rose-500 font-bold mt-1">Debug: {debugMsg}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1" style={{ color: blue }}>Intent to Book</p>
                <p className="text-3xl font-black tracking-tight text-zinc-900">{analytics.clicks}</p>
              </div>
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <MousePointerClick className="text-zinc-400" size={24} />
              </div>
            </div>
            <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1" style={{ color: blue }}>Successful Bookings</p>
                <p className="text-3xl font-black tracking-tight text-zinc-900">{analytics.completed}</p>
              </div>
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <CheckCircle className="text-emerald-500" size={24} />
              </div>
            </div>
            <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1" style={{ color: blue }}>Abandonment Rate</p>
                <p className={`text-3xl font-black tracking-tight ${analytics.dropOffRate > 50 ? 'text-rose-500' : analytics.dropOffRate < 30 ? 'text-emerald-500' : 'text-zinc-900'}`}>
                  {analytics.dropOffRate}%
                </p>
              </div>
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <TrendingDown className={analytics.dropOffRate > 50 ? 'text-rose-500' : analytics.dropOffRate < 30 ? 'text-emerald-500' : 'text-zinc-400'} size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Staff / Ambassador tier card ── */}
      {currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser.role !== 'receptionist' && currentUserStats && (
        <div className="space-y-6">
          <div style={{ background: '#1580c2', borderRadius: '2rem', border: 'none', padding: '32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', transform: 'translate(30%, -30%)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={28} color="white" />
                </div>
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1.1 }}>
                    {currentUserStats?.tier?.name || 'Bronze'} Tier
                  </h3>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#ffffff', opacity: 0.75, margin: 0 }}>
                    {(currentUserStats?.tier?.bonus || 1)}x Commission Multiplier
                  </p>
                </div>
              </div>

              {nextTier && (
                <div className="space-y-3">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                    <span style={{ color: '#ffffff', opacity: 0.7 }}>Progress to {nextTier.name}</span>
                    <span style={{ color: '#ffffff' }}>{currentUserStats?.monthlySuccessfulRefs || 0} / {nextTier.min}</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToNext}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ height: '100%', background: 'rgba(255,255,255,0.9)', borderRadius: '9999px' }}
                    />
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: '#ffffff', opacity: 0.75, margin: 0 }}>
                    {nextTier.min - (currentUserStats?.monthlySuccessfulRefs || 0)} more successful referrals needed to unlock {nextTier.bonus}x multiplier
                  </p>
                </div>
              )}

              {!nextTier && (
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', opacity: 0.9 }}>
                  🏆 You've reached the highest tier!
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div style={{ background: '#1580c2', borderRadius: '1.5rem', border: 'none', padding: '24px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#ffffff', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px 0' }}>This Month</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px', margin: '0 0 4px 0' }}>{currentUserStats?.monthlySuccessfulRefs || 0}</p>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#ffffff', opacity: 0.65, margin: 0 }}>Successful</p>
            </div>
            <div style={{ background: '#1580c2', borderRadius: '1.5rem', border: 'none', padding: '24px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#ffffff', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px 0' }}>Total Earned</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px', margin: '0 0 4px 0' }}>{clinicProfile.currency}{(currentUserStats?.earned || 0).toFixed(0)}</p>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#ffffff', opacity: 0.65, margin: 0 }}>Lifetime</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Awareness Campaigns Carousel ── */}
      <AwarenessCarousel currentUser={currentUser} />

      <div className="space-y-4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: blue, margin: 0 }}>Available Services</h3>
          <button onClick={() => setActiveTab('promotions')}
            style={{ fontSize: '14px', fontWeight: 600, color: blue, background: 'none', border: 'none', cursor: 'pointer', fontFamily: P }}>
            View All
          </button>
        </div>
        <CategoryScrollRow
          title="All Services"
          services={services.filter((s: any) => s.is_affiliate_enabled !== false)}
          onClick={(service: any) => {
            setSelectedPromo(service);
            setActiveTab('promotions');
            setIsPromoModalOpen(true);
          }}
        />
      </div>

      {/* ── Charts + Recent Referrals ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">

          {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <div style={{ background: '#1580c2', borderRadius: '2rem', border: 'none', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', margin: '0 0 2px 0' }}>Revenue Trend</h3>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: '#ffffff', opacity: 0.65, margin: 0 }}>Last 7 days performance</p>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={20} color='white' />
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={adminStats.weeklyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={blue} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false}
                      tick={{ fontSize: 10, fill: blue, fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fontSize: 10, fill: blue, fontWeight: 600 }} dx={-10}
                      tickFormatter={(v: number) => `${clinicProfile.currency}${v}`} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(21,128,194,0.12)', fontFamily: P, fontWeight: 600 }} itemStyle={{ color: blue }} />
                    <Area type="monotone" dataKey="revenue" stroke={blue} strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div style={{ background: '#1580c2', borderRadius: '2rem', border: 'none', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', margin: '0 0 2px 0' }}>Recent Referrals</h3>
                <p style={{ fontSize: '12px', fontWeight: 500, color: '#ffffff', opacity: 0.65, margin: 0 }}>Latest activity across the clinic</p>
              </div>
              <button onClick={() => setActiveTab('referrals')}
                style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer', fontFamily: P }}>
                View All
              </button>
            </div>
            <div>
              {referrals.slice(0, 5).map((referral: any) => (
                <div key={referral.id}
                  style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: blue, flexShrink: 0 }}>
                      {referral.patient_name ? referral.patient_name.charAt(0) : <Lock size={16} />}
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', margin: '0 0 2px 0' }}>{referral.patient_name || 'Hidden (P&C)'}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 500, color: '#ffffff', opacity: 0.65 }}>
                        <span>{referral.service_name || 'General'}</span>
                        <span>·</span>
                        <span>{new Date(referral.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={getStatusColor(referral.status)}
                      style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {getStatusLabel(referral.status)}
                    </span>
                    {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                      <button onClick={() => handleDeleteReferral(referral.id)}
                        style={{ padding: '6px', color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#ef4444')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)')}
                        title="Delete Referral">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {referrals.length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center', color: '#ffffff', opacity: 0.5 }}>
                  <ClipboardList style={{ margin: '0 auto 8px' }} size={36} />
                  <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>No referrals logged yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden"
              style={{ fontFamily: P }}
            >
              <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 p-8 text-white relative">
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-white/20 p-3 rounded-2xl">
                    <User size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Complete Profile</h3>
                    <p className="text-white/70 text-sm font-medium">Verify your details for smooth payouts</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#1580c2]/40 ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1580c2]/40" size={18} />
                      <input
                        type="text"
                        required
                        value={profileForm.name}
                        onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="w-full bg-[#1580c2]/5 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-[#1580c2]/50 outline-none transition-all placeholder:text-zinc-300"
                        placeholder="Legal Full Name"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#1580c2]/40 ml-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1580c2]/40" size={18} />
                      <input
                        type="tel"
                        required
                        value={profileForm.phone}
                        onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full bg-[#1580c2]/5 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-[#1580c2]/50 outline-none transition-all placeholder:text-zinc-300"
                        placeholder="e.g. 0123456789"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#1580c2]/40 ml-1">Bank Name</label>
                      <div className="relative">
                        <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1580c2]/40" size={18} />
                        <select
                          required
                          value={profileForm.bank_name}
                          onChange={e => setProfileForm({ ...profileForm, bank_name: e.target.value })}
                          className="w-full bg-[#1580c2]/5 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-[#1580c2]/50 outline-none transition-all appearance-none"
                        >
                          <option value="">Select Bank</option>
                          {MALAYSIAN_BANKS.map(bank => (
                            <option key={bank} value={bank}>{bank}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#1580c2]/40">
                          <Navigation size={14} className="rotate-90" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#1580c2]/40 ml-1">Account Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={profileForm.bank_account_number}
                          onChange={e => setProfileForm({ ...profileForm, bank_account_number: e.target.value })}
                          className="w-full bg-[#1580c2]/5 border-none rounded-2xl py-4 px-6 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-[#1580c2]/50 outline-none transition-all placeholder:text-zinc-300"
                          placeholder="Bank Account No."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 px-8 py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="flex-2 px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-violet-200 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                  >
                    {isUpdatingProfile ? 'Updating...' : 'Save & Unlock Payouts'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};