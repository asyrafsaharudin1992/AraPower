import React, { useState, useMemo } from 'react'; // Added useMemo
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RefreshCw, Download, ChevronRight, MessageCircle, Phone, Trash2, Lock } from 'lucide-react';

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
  staffList: any[];
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
  staffList,
}) => {
  const [referralSearch, setReferralSearch] = useState('');
  const [referralBranchFilter, setReferralBranchFilter] = useState('all');
  const [referralStatusFilter, setReferralStatusFilter] = useState('all');
  const [referralServiceFilter, setReferralServiceFilter] = useState('all'); // NEW STATE
  const [expandedReferralIds, setExpandedReferralIds] = useState<string[]>([]);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{id: string, status: string} | null>(null);

  // NEW: Extract unique services dynamically from the referrals data
  const uniqueServices = useMemo(() => {
    if (!referrals) return [];
    const services = Array.from(
      new Set(referrals.map(ref => ref.service_name).filter(Boolean))
    );
    return services.sort(); // Sort alphabetically
  }, [referrals]);

  // Centralized filtering logic (Fixed null safety + Added Service Filter)
  const filteredReferrals = referrals
    .filter(ref => {
      if (!referralSearch) return true;
      const search = referralSearch.toLowerCase();
      return (
        (ref.patient_name || '').toLowerCase().includes(search) || // SAFE CHECK
        (ref.staff_name || '').toLowerCase().includes(search) ||  // SAFE CHECK
        (ref.service_name || '').toLowerCase().includes(search)   // SAFE CHECK
      );
    })
    .filter(ref => referralBranchFilter === 'all' ? true : ref.branch === referralBranchFilter)
    .filter(ref => referralStatusFilter === 'all' ? true : ref.status === referralStatusFilter)
    .filter(ref => referralServiceFilter === 'all' ? true : ref.service_name === referralServiceFilter); // NEW FILTER

  // ... [exportToCSV function remains exactly the same] ...
  const exportToCSV = () => {
    const headers = currentUser?.role === 'admin' 
      ? ['Date', 'Patient Name', 'Patient Type', 'Service', 'Staff Name', 'Incentive ($)', 'Status']
      : ['Date', 'Patient Name', 'Patient Type', 'Service', 'Incentive ($)', 'Status'];

    const csvRows = filteredReferrals.map(ref => {
      const row = [
        ref.date,
        `"${ref.patient_name}"`,
        ref.patient_type || 'new',
        `"${ref.service_name}"`,
        ...(currentUser?.role === 'admin' ? [`"${staffList?.find(s => String(s.id) === String(ref.staff_id))?.name || ref.staff_name || 'Direct Walk-in'}"`] : []),
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

  // Standard classes for your filter dropdowns to keep things DRY
  const filterSelectClass = `px-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 ${darkMode ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20' : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:ring-violet-500'}`;

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
            
            <select value={referralBranchFilter} onChange={(e) => setReferralBranchFilter(e.target.value)} className={filterSelectClass}>
              <option value="all">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>

            {/* NEW: Service Filter Dropdown */}
            <select value={referralServiceFilter} onChange={(e) => setReferralServiceFilter(e.target.value)} className={filterSelectClass}>
              <option value="all">All Services</option>
              {uniqueServices.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>

            <select value={referralStatusFilter} onChange={(e) => setReferralStatusFilter(e.target.value)} className={filterSelectClass}>
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
        
        {/* Rest of your JSX remains exactly the same below... */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={fetchReferrals} className={`flex items-center gap-2 text-xs font-bold transition-colors px-3 py-2 rounded-xl ${darkMode ? 'text-brand-accent hover:bg-zinc-50' : 'text-zinc-900 hover:bg-violet-500 hover:text-white'}`}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={exportToCSV} className={`flex items-center gap-2 text-xs font-bold transition-colors px-3 py-2 rounded-xl ${darkMode ? 'text-brand-accent hover:bg-zinc-50' : 'text-zinc-900 hover:bg-violet-500 hover:text-white'}`}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Mobile View */}
      {isMobile ? (
        <div className={`divide-y ${darkMode ? 'divide-zinc-800' : 'divide-zinc-100'}`}>
          {filteredReferrals.length === 0 ? (
            <p className="p-8 text-center text-zinc-500 text-sm">No referrals found.</p>
          ) : (
            filteredReferrals.map((ref) => (
              <div key={ref.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{ref.patient_name}</p>
                    <p className="text-xs text-zinc-500">{ref.service_name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ref.status)}`}>
                    {getStatusLabel(ref.status)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>{new Date(ref.date).toLocaleDateString()}</span>
                  <span className="font-medium text-brand-accent">
                    {clinicProfile?.currency || 'RM'} {ref.commission_amount?.toFixed(2) || '0.00'}
                  </span>
                </div>

                {/* Status Actions */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'receptionist') && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {ref.status === 'pending' && (
                      <button onClick={() => setPendingStatusUpdate({ id: ref.id, status: 'entered' })} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-medium">Mark Entered</button>
                    )}
                    {ref.status === 'entered' && (
                      <button onClick={() => setPendingStatusUpdate({ id: ref.id, status: 'completed' })} className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-medium">Mark Completed</button>
                    )}
                    {ref.status === 'completed' && currentUser?.role === 'admin' && (
                      <button onClick={() => setPendingStatusUpdate({ id: ref.id, status: 'payment_approved' })} className="px-3 py-1 bg-purple-500 text-white rounded-lg text-xs font-medium">Approve Payment</button>
                    )}
                    {(ref.status === 'pending' || ref.status === 'entered') && (
                      <button onClick={() => setPendingStatusUpdate({ id: ref.id, status: 'rejected' })} className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium">Reject</button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        // Desktop View
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-xs uppercase tracking-wider ${darkMode ? 'bg-zinc-800/50 text-zinc-400' : 'bg-zinc-50 text-zinc-500'}`}>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Patient</th>
                <th className="p-4 font-medium">Service</th>
                <th className="p-4 font-medium">Staff</th>
                <th className="p-4 font-medium">Incentive</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-zinc-800' : 'divide-zinc-50'}`}>
              {filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 text-sm">No referrals found.</td>
                </tr>
              ) : (
                filteredReferrals.map((ref) => (
                  <tr key={ref.id} className={`transition-colors ${darkMode ? 'hover:bg-zinc-800/30' : 'hover:bg-zinc-50/50'}`}>
                    <td className="p-4 text-sm text-zinc-500">{new Date(ref.date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <p className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{ref.patient_name}</p>
                      <p className="text-xs text-zinc-500">{ref.patient_phone}</p>
                    </td>
                    <td className="p-4 text-sm text-zinc-600">{ref.service_name}</td>
                    <td className="p-4 text-sm text-zinc-600">{staffList?.find(s => String(s.id) === String(ref.staff_id))?.name || ref.staff_name || 'Direct Walk-in'}</td>
                    <td className="p-4">
                      <span className="font-medium text-brand-accent text-sm">
                        {clinicProfile?.currency || 'RM'} {ref.commission_amount?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ref.status)}`}>
                        {getStatusLabel(ref.status)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {(currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'receptionist') && (
                        <div className="flex items-center justify-end gap-2">
                          {ref.status === 'pending' && (
                            <button onClick={() => setPendingStatusUpdate({ id: ref.id, status: 'entered' })} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors">Entered</button>
                          )}
                          {ref.status === 'entered' && (
                            <button onClick={() => setPendingStatusUpdate({ id: ref.id, status: 'completed' })} className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors">Completed</button>
                          )}
                          {ref.status === 'completed' && currentUser?.role === 'admin' && (
                            <button onClick={() => setPendingStatusUpdate({ id: ref.id, status: 'payment_approved' })} className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition-colors">Approve</button>
                          )}
                          {(ref.status === 'pending' || ref.status === 'entered') && (
                            <button onClick={() => setPendingStatusUpdate({ id: ref.id, status: 'rejected' })} className="p-1 text-zinc-400 hover:text-red-500 transition-colors" title="Reject">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Safeguard Modal */}
      <AnimatePresence>
        {pendingStatusUpdate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} rounded-2xl shadow-xl w-full max-w-md overflow-hidden border`}
            >
              <div className="p-6">
                <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Confirm Status Update</h3>
                <p className={`text-sm mb-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Are you sure you want to change this referral's status to <span className="font-semibold">{getStatusLabel(pendingStatusUpdate.status)}</span>?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setPendingStatusUpdate(null)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleClinicStatusUpdate(pendingStatusUpdate.id, pendingStatusUpdate.status);
                      setPendingStatusUpdate(null);
                    }}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    Confirm Update
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};