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
  return (
    <motion.div 
      key="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {(currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'receptionist') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(currentUser.role === 'admin' || currentUser.role === 'manager') ? (
            <>
              <div className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden group flex items-center gap-6">
                <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                <div className="w-14 h-14 rounded-[1.5rem] bg-violet-500 text-white flex items-center justify-center shrink-0">
                  <ClipboardList size={28} />
                </div>
                <div className="relative z-10 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black mb-1">Total Referrals</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black text-zinc-900 tracking-tighter">{adminStats.totalReferrals}</p>
                    <span className="text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-lg">Active</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden group flex items-center gap-6">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                <div className="w-14 h-14 rounded-[1.5rem] bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <DollarSign size={28} />
                </div>
                <div className="relative z-10 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black mb-1">Processed Payouts</p>
                  <p className="text-3xl font-black text-zinc-900 tracking-tighter">{clinicProfile.currency}{(adminStats.totalPayout || 0).toFixed(0)}</p>
                  <p className="text-[10px] font-bold text-zinc-400 mt-1">Payable: {clinicProfile.currency}{(adminStats.pendingPayout || 0).toFixed(0)}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden group flex items-center gap-6">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                <div className="w-14 h-14 rounded-[1.5rem] bg-brand-primary text-white flex items-center justify-center shrink-0">
                  <Users size={28} />
                </div>
                <div className="relative z-10 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black mb-1">Active Staff</p>
                  <p className="text-3xl font-black text-zinc-900 tracking-tighter">{activeStaffList.length}</p>
                  <p className="text-[10px] font-bold text-zinc-400 mt-1">{staffList.length} Registered</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden group flex items-center gap-6">
                <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                <div className="w-14 h-14 rounded-[1.5rem] bg-violet-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 size={28} />
                </div>
                <div className="relative z-10 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black mb-1">
                    {currentUser.role === 'receptionist' ? 'Arrived Today' : 'Paid Today'}
                  </p>
                  <p className="text-3xl font-black text-zinc-900 tracking-tighter">
                    {currentUser.role === 'receptionist' ? receptionistStats.arrivedToday : referrals.filter(r => r.status === 'payment_made' && r.date === new Date().toISOString().split('T')[0]).length}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-400 mt-1">
                    {currentUser.role === 'receptionist' ? 'Patients checked in' : 'Referrals completed'}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden group flex items-center gap-6">
                <div className="absolute top-0 right-0 w-24 h-24 bg-burnt-peach/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                <div className="w-14 h-14 rounded-[1.5rem] bg-burnt-peach text-white flex items-center justify-center shrink-0">
                  <Clock size={28} />
                </div>
                <div className="relative z-10 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black mb-1">Pending Action</p>
                  <p className="text-3xl font-black text-zinc-900 tracking-tighter">
                    {currentUser.role === 'receptionist' ? receptionistStats.pendingArrivals : referrals.filter(r => r.status === 'payment_approved').length}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-400 mt-1">
                    {currentUser.role === 'receptionist' ? 'Expected today' : 'Awaiting payment'}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden group flex items-center gap-6">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                <div className="w-14 h-14 rounded-[1.5rem] bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <MessageCircle size={28} />
                </div>
                <div className="relative z-10 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black mb-1">New Leads</p>
                  <p className="text-3xl font-black text-zinc-900 tracking-tighters">
                    {referrals.filter(r => r.status === 'new').length}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-400 mt-1">Requires follow-up</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser.role !== 'receptionist' && currentUserStats && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-primary/10 to-transparent rounded-full -mr-32 -mt-32" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-lg ${currentUserStats?.tier?.bg || 'bg-zinc-500'}`}>
                  <Trophy size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tight">
                    {currentUserStats?.tier?.name || 'Bronze'} Tier
                  </h3>
                  <p className="text-sm font-medium text-zinc-500">
                    {(currentUserStats?.tier?.bonus || 1)}x Commission Multiplier
                  </p>
                </div>
              </div>

              {nextTier && (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-zinc-500">Progress to {nextTier.name}</span>
                    <span className="text-brand-primary">{currentUserStats?.monthlySuccessfulRefs || 0} / {nextTier.min}</span>
                  </div>
                  <div className="h-4 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToNext}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full ${nextTier.bg}`}
                    />
                  </div>
                  <p className="text-xs font-medium text-zinc-500">
                    {nextTier.min - (currentUserStats?.monthlySuccessfulRefs || 0)} more successful referrals needed this month to unlock {nextTier.bonus}x commission multiplier!
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">This Month</p>
              <p className="text-3xl font-black tracking-tighter text-zinc-900">{currentUserStats?.monthlySuccessfulRefs || 0}</p>
              <p className="text-[10px] font-bold text-emerald-500 mt-1">Successful</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Total Earned</p>
              <p className="text-3xl font-black tracking-tighter text-zinc-900">
                {clinicProfile.currency}{(currentUserStats?.earned || 0).toFixed(0)}
              </p>
              <p className="text-[10px] font-bold text-zinc-400 mt-1">Lifetime</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black tracking-tight text-zinc-900">Available Services</h3>
          <button 
            onClick={() => setActiveTab('promotions')}
            className="text-sm font-bold text-brand-primary hover:text-brand-primary/80"
          >
            View All
          </button>
        </div>
        <CategoryScrollRow 
          title="All Services"
          services={services.filter(s => s.is_affiliate_enabled !== false)} 
          onClick={(service) => {
            setSelectedPromo(service);
            setActiveTab('promotions');
            setIsPromoModalOpen(true);
          }} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <div className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-zinc-900">Revenue Trend</h3>
                  <p className="text-xs font-medium text-zinc-500">Last 7 days performance</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={adminStats.weeklyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }}
                      dx={-10}
                      tickFormatter={(value) => `${clinicProfile.currency}${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        fontWeight: 'bold'
                      }}
                      itemStyle={{ color: '#18181b' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-tight text-zinc-900">Recent Referrals</h3>
                <p className="text-xs font-medium text-zinc-500">Latest activity across the clinic</p>
              </div>
              <button 
                onClick={() => setActiveTab('referrals')}
                className="text-sm font-bold text-brand-primary hover:text-brand-primary/80"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-zinc-50">
              {referrals.slice(0, 5).map(referral => (
                <div key={referral.id} className="p-4 hover:bg-zinc-50/50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-500 font-black">
                      {referral.patient_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">{referral.patient_name}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                        <span>{referral.service_name || 'General'}</span>
                        <span>•</span>
                        <span>{new Date(referral.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${getStatusColor(referral.status)}`}>
                      {getStatusLabel(referral.status)}
                    </span>
                    
                    {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                      <button 
                        onClick={() => handleDeleteReferral(referral.id)}
                        className="p-2 text-zinc-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Referral"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {referrals.length === 0 && (
                <div className="p-12 text-center text-zinc-500">
                  <ClipboardList className="mx-auto mb-2 opacity-20" size={40} />
                  <p className="text-sm">No referrals logged yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
