import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RefreshCw, Download, ChevronRight, MessageCircle, Phone, Trash2 } from 'lucide-react';

interface ReferralBoardProps {
  currentUser: any;
  referrals: any[];
  branches: any[];
  clinicProfile: any;
  isMobile: boolean;
  darkMode: boolean;
  fetchReferrals: () => void;
  handleUpdateStatus: (id: string, status: string, additionalData?: any) => void;
  handleClinicStatusUpdate: (id: string, newStatus: string) => void;
  handleDeleteReferral: (id: string) => void;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

export const ReferralBoard: React.FC<ReferralBoardProps> = ({
  currentUser,
  referrals,
  branches,
  clinicProfile,
  isMobile,
  darkMode,
  fetchReferrals,
  handleUpdateStatus,
  handleClinicStatusUpdate,
  handleDeleteReferral,
  getStatusColor,
  getStatusLabel,
}) => {
  // Local states moved out of App.tsx!
  const [referralSearch, setReferralSearch] = useState('');
  const [referralBranchFilter, setReferralBranchFilter] = useState('all');
  const [referralStatusFilter, setReferralStatusFilter] = useState('all');
  const [expandedReferralIds, setExpandedReferralIds] = useState<string[]>([]);

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
        ...(currentUser?.role === 'admin' ? [`"${ref.staff_name || 'Direct Walk-in'}"`] : []),
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

  return (
    <motion.div 
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
              <option value="pending">Pending</option>
              <option value="entered">Entered</option>
              <option value="completed">Arrived / Completed</option>
              <option value="payment_approved">Payment Approved</option>
              <option value="payment_made">Payment Made</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button 
            onClick={fetchReferrals}
            className={`flex items-center gap-2 text-xs font-bold transition-colors px-3 py-2 rounded-xl ${darkMode ? 'text-brand-accent hover:bg-zinc-50' : 'text-zinc-900 hover:bg-violet-500 hover:text-white'}`}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button 
            onClick={exportToCSV}
            className={`flex items-center gap-2 text-xs font-bold transition-colors px-3 py-2 rounded-xl ${darkMode ? 'text-brand-accent hover:bg-zinc-50' : 'text-zinc-900 hover:bg-violet-500 hover:text-white'}`}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {isMobile ? (
        <div className="divide-y divide-zinc-100">
          {referrals
            .filter(ref => 
              ref.patient_name.toLowerCase().includes(referralSearch.toLowerCase()) ||
              (ref.staff_name && ref.staff_name.toLowerCase().includes(referralSearch.toLowerCase())) ||
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
                      ref.status === 'completed' || ref.status === 'payment_made' ? 'text-emerald-600' :
                      ref.status === 'rejected' ? 'text-rose-600' : 
                      ref.status === 'payment_approved' ? 'text-orange-600' :
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
                          <p className="text-xs font-medium text-zinc-700">{ref.staff_name || <span className="text-zinc-400 italic">Direct Walk-in</span>}</p>
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
                            {ref?.staff_name?.charAt(0) || 'W'}
                          </div>
                          <p className="text-[10px] font-medium text-zinc-500">{ref.staff_name ? `Referred by ${ref.staff_name}` : 'Direct Walk-in'}</p>
                        </div>
                        {ref.patient_phone && (
                          <a 
                            href={`https://wa.me/${ref.patient_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${ref.patient_name}! This is from the clinic. Just following up on your booking for ${ref.appointment_date} at ${ref.booking_time}.`)}`}
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
                (ref.staff_name && ref.staff_name.toLowerCase().includes(referralSearch.toLowerCase())) ||
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
                <td className="p-4 text-sm font-medium text-zinc-900">
                  {ref.staff_name ? ref.staff_name : <span className="text-zinc-400 italic text-xs">Direct Walk-in</span>}
                </td>
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
  );
};