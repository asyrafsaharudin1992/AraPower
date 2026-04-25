import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Search, 
  Trash2, 
  Users, 
  DollarSign, 
  Zap, 
  MessageCircle, 
  Info, 
  Save, 
  X,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Megaphone,
  UserPlus,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';

export interface MobileAdminUIProps {
  currentUser: any;
  referrals: any[];
  clinicProfile: any;
  staffPerformance: any[];
  activeStaffList: any[];
  staffList: any[];
  handleApproveStaff: (staffId: string, isApproved: boolean) => void;
  handleRejectStaff: (staffId: string) => void;
  handleDeleteStaff: (staffId: string) => void;
  setSelectedStaffDetail: (staff: any) => void;
  setShowStaffModal: (show: boolean) => void;
}

export const MobileAdminUI: React.FC<MobileAdminUIProps> = ({
  currentUser,
  referrals,
  clinicProfile,
  staffPerformance,
  activeStaffList,
  staffList,
  handleApproveStaff,
  handleRejectStaff,
  handleDeleteStaff,
  setSelectedStaffDetail,
  setShowStaffModal
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'approvals' | 'staff'>('overview');
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAnnouncement = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (!error && data) {
        setAnnouncementMsg(data.message || "");
        setAnnouncementActive(data.is_active || false);
      }
    };
    fetchAnnouncement();
  }, []);

  const saveAnnouncement = async () => {
    const loadingToast = toast.loading('Saving...');
    const { error } = await supabase
      .from('announcements')
      .update({ message: announcementMsg, is_active: announcementActive })
      .eq('id', 1);
      
    if (error) {
       toast.error(`Error: ${error.message}`, { id: loadingToast });
    } else {
       toast.success('Announcement published', { id: loadingToast });
    }
  };

  const pendingApprovals = activeStaffList.filter(s => !s.is_approved && s.employment_status !== 'rejected');

  const stats = [
    { label: 'Total Refs', value: referrals.length, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Total Payout', value: `${clinicProfile.currency}${staffPerformance.reduce((s, staff) => s + (staff.paid_earnings || 0), 0).toFixed(0)}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Pending Staff', value: pendingApprovals.length, icon: UserPlus, color: 'text-[#1580c2]', bg: 'bg-blue-50' },
    { label: 'Total Staff', value: staffList.length, icon: Users, color: 'text-violet-500', bg: 'bg-violet-50' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Sub-tab Navigation */}
      <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl sticky top-20 z-40">
        {(['overview', 'approvals', 'staff'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeSubTab === tab 
                ? 'bg-white text-zinc-900 shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab}
            {tab === 'approvals' && pendingApprovals.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[8px]">
                {pendingApprovals.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white p-5 rounded-[2rem] border border-zinc-100 shadow-sm">
                  <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-3`}>
                    <stat.icon size={20} />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-xl font-black text-zinc-900">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Announcement Section */}
            <div className="bg-[#1580c2] p-6 rounded-[2.5rem] text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl p-1 pointer-events-none" />
               
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                   <Megaphone size={20} />
                 </div>
                 <div>
                   <h3 className="font-black tracking-tight">Global Broadcast</h3>
                   <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Update all dashboards</p>
                 </div>
               </div>

               <textarea
                 value={announcementMsg}
                 onChange={(e) => setAnnouncementMsg(e.target.value)}
                 placeholder="Type message..."
                 className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all mb-4 h-24 resize-none"
               />

               <div className="flex items-center justify-between gap-4">
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={announcementActive}
                      onChange={(e) => setAnnouncementActive(e.target.checked)}
                    />
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${announcementActive ? 'bg-emerald-400' : 'bg-white/20'}`}>
                      <motion.div 
                        className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full"
                        animate={{ x: announcementActive ? 16 : 0 }}
                      />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Active</span>
                 </label>

                 <button 
                   onClick={saveAnnouncement}
                   className="px-6 py-2.5 bg-white text-[#1580c2] rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                 >
                   Broadcast
                 </button>
               </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">Quick Actions</h4>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => setActiveSubTab('approvals')}
                  className="flex items-center justify-between p-5 bg-white border border-zinc-100 rounded-3xl hover:bg-zinc-50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-zinc-900">Manage Approvals</p>
                      <p className="text-[10px] text-zinc-400 font-medium">{pendingApprovals.length} pending staff members</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                </button>

                <button 
                  onClick={() => setActiveSubTab('staff')}
                  className="flex items-center justify-between p-5 bg-white border border-zinc-100 rounded-3xl hover:bg-zinc-50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 text-[#1580c2] rounded-2xl flex items-center justify-center">
                      <Users size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-zinc-900">Staff Performance</p>
                      <p className="text-[10px] text-zinc-400 font-medium">Analyze {staffPerformance.length} members</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'approvals' && (
          <motion.div
            key="approvals"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="font-black tracking-tight text-zinc-900">Pending Approvals</h3>
              <span className="px-3 py-1 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-black">
                {pendingApprovals.length}
              </span>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-100">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-zinc-200 mb-4 shadow-sm">
                  <ShieldCheck size={32} />
                </div>
                <p className="text-zinc-400 text-sm font-medium">All staff are approved!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApprovals.map(staff => (
                  <div key={staff.id} className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center text-xl font-black text-[#1580c2]">
                        {staff.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-zinc-900 truncate">{staff.name}</h4>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{staff.branch}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 py-4 border-y border-zinc-50">
                       <div className="space-y-1">
                         <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Email</p>
                         <p className="text-[10px] font-bold text-zinc-900 truncate">{staff.email}</p>
                       </div>
                       <div className="space-y-1">
                         <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Phone</p>
                         <p className="text-[10px] font-bold text-zinc-900">{staff.phone || 'N/A'}</p>
                       </div>
                    </div>

                    <div className="flex gap-2">
                       <button 
                         onClick={() => handleApproveStaff(staff.id, true)}
                         className="flex-1 bg-zinc-900 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-zinc-900/20 active:scale-95 transition-all"
                       >
                         Approve
                       </button>
                       <button 
                         onClick={() => handleRejectStaff(staff.id)}
                         className="px-6 bg-rose-50 text-rose-500 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                       >
                         Reject
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeSubTab === 'staff' && (
          <motion.div
            key="staff"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="relative mx-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text"
                placeholder="Search staff performance..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-100 rounded-3xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1580c2]/20 transition-all"
              />
            </div>

            <div className="space-y-3">
              {staffPerformance
                .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((staff) => (
                <div 
                  key={staff.id}
                  onClick={() => {
                    setSelectedStaffDetail(staff);
                    setShowStaffModal(true);
                  }}
                  className="bg-white p-5 rounded-[2rem] border border-zinc-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-lg font-black text-zinc-500">
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">{staff.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${staff.tier?.bg || 'bg-zinc-50'} ${staff.tier?.color || 'text-zinc-500'}`}>
                          {staff.tier?.name || 'Bronze'}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{staff.branch}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-zinc-900">{clinicProfile.currency}{(staff.earned || 0).toFixed(0)}</p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{staff.monthlySuccessfulRefs} refs</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
