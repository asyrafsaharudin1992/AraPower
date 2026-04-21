import React from 'react';
import { motion } from 'motion/react';
import { 
  ClipboardList, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  Trophy, 
  TrendingUp, 
  Trash2 
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

export interface DashboardUIProps {
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
  setSelectedPromo,
  setIsPromoModalOpen,
  getStatusColor,
  getStatusLabel,
  setSelectedStaffDetail,
  setShowStaffModal
}) => {
  const P = "'Poppins', sans-serif";
  const blue = '#1580c2';

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
      style={{ fontFamily: P }}
    >
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

      {/* ── Available Services ── */}
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
                      {referral.patient_name.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', margin: '0 0 2px 0' }}>{referral.patient_name}</p>
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
    </motion.div>
  );
};