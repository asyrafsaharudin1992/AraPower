import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Search, Trash2, Users, DollarSign, Zap, MessageCircle } from 'lucide-react';

export interface AdminUIProps {
  currentUser: any;
  referrals: any[];
  clinicProfile: any;
  staffPerformance: any[];
  activeStaffList: any[];
  staffList: any[];
  warmLeads: any[];
  services: any[];
  adminSearch: string;
  setAdminSearch: (search: string) => void;
  handleApproveStaff: (staffId: number, isApproved: boolean) => void;
  handleRejectStaff: (staffId: number) => void;
  handleDeleteStaff: (staffId: number) => void;
  setSelectedStaffDetail: (staff: any) => void;
  setShowStaffModal: (show: boolean) => void;
  handleUpdateWarmLeadStatus: (leadId: number, status: string) => void;
  handleAdminResetPassword: (staffId: number, email: string) => void;
}

export const AdminUI: React.FC<AdminUIProps> = ({
  currentUser,
  referrals,
  clinicProfile,
  staffPerformance,
  activeStaffList,
  staffList,
  warmLeads,
  services,
  adminSearch,
  setAdminSearch,
  handleApproveStaff,
  handleRejectStaff,
  handleDeleteStaff,
  setSelectedStaffDetail,
  setShowStaffModal,
  handleUpdateWarmLeadStatus,
  handleAdminResetPassword
}) => {
  return (
    <motion.div 
      key="admin"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Admin Panel</h2>
          <p className="text-zinc-500 text-sm">Manage clinic operations and staff.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Total Referrals</p>
          <p className="text-3xl font-bold tracking-tight">{referrals.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Total Payouts</p>
          <p className="text-3xl font-bold tracking-tight text-zinc-900">
            {clinicProfile.currency}{staffPerformance.reduce((s, staff) => s + (staff.paid_earnings || 0), 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Referral Approvals</p>
          <p className="text-3xl font-bold tracking-tight text-zinc-900">
            {referrals.filter(r => r.status === 'paid_completed').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Staff Approvals</p>
          <p className="text-3xl font-bold tracking-tight text-zinc-900">
            {activeStaffList.filter(s => !s.is_approved && s.employment_status !== 'rejected').length}
          </p>
        </div>
      </div>

      {/* Staff Approvals Section */}
      {activeStaffList.filter(s => !s.is_approved && s.employment_status !== 'rejected').length > 0 && (
        <div className="bg-brand-primary rounded-[2.5rem] border border-brand-primary p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black tracking-tighter text-zinc-900">Pending Staff Approvals</h3>
              <p className="text-sm text-zinc-900 font-medium">Review and approve new staff registrations</p>
            </div>
            <div className="w-12 h-12 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary">
              <ShieldCheck size={24} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeStaffList.filter(s => !s.is_approved && s.employment_status !== 'rejected').map(staff => (
              <div key={staff.id} className="bg-white p-6 rounded-3xl border border-brand-primary shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-lg font-black text-zinc-500">
                    {staff?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900">{staff.name}</h4>
                    <p className="text-xs text-zinc-500 font-medium">{staff.email}</p>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <span>Branch</span>
                    <span className="text-zinc-900">{staff.branch}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <span>Phone</span>
                    <span className="text-zinc-900">{staff.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <span>Joined</span>
                    <span className="text-zinc-900">{staff.date_joined ? new Date(staff.date_joined).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApproveStaff(staff.id, true)}
                    className="flex-1 bg-gradient-to-r from-violet-500 to-rose-500 text-zinc-900 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:from-violet-500 hover:to-rose-500 transition-all shadow-lg shadow-violet-500"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleRejectStaff(staff.id)}
                    className="px-4 bg-rose-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 transition-all"
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input 
              type="text"
              placeholder="Search staff name..."
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-64"
            />
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100">
              <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">No.</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Staff Member</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Current Tier</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center">Monthly Success</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Total Earned (Incl. Bonus)</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {staffPerformance
              .filter(staff => staff.name.toLowerCase().includes(adminSearch.toLowerCase()))
              .map((staff, index) => (
              <tr 
                key={staff.id} 
                className="hover:bg-zinc-50/50 transition-colors cursor-pointer group"
                onClick={() => {
                  setSelectedStaffDetail(staff);
                  setShowStaffModal(true);
                }}
              >
                <td className="p-4 text-sm text-zinc-500 font-medium">{index + 1}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-xs font-bold text-zinc-500">
                      {staff.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{staff.name}</span>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{staff.branch}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${staff.tier.bg} ${staff.tier.color}`}>
                    {staff.tier.name}
                  </span>
                </td>
                <td className="p-4 text-sm font-semibold text-center">{staff.monthlySuccessfulRefs}</td>
                <td className="p-4 text-sm font-bold text-right text-zinc-900">
                  {clinicProfile.currency}{(staff.earned || 0).toFixed(2)}
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStaff(staff.id);
                    }}
                    className="p-2 text-zinc-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Staff"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </motion.div>
  );
};
