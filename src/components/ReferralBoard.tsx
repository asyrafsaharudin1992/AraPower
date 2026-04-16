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

      {/* Mobile View - unchanged */}
      {isMobile ? (
         // ... (Keep your existing mobile view code here)
         <div className="divide-y divide-zinc-100">
            <p className="p-4 text-center text-zinc-400 text-sm">Mobile View</p>
         </div>
      ) : (
        // Desktop View - unchanged
        <table className="w-full text-left border-collapse">
           {/* ... (Keep your existing table code here) */}
           <tbody className="divide-y divide-zinc-50">
              <tr><td className="p-4 text-sm text-zinc-500">Desktop View</td></tr>
           </tbody>
        </table>
      )}

      {/* Safeguard Modal - unchanged */}
      <AnimatePresence>
        {pendingStatusUpdate && (
           // ... (Keep your existing modal code here)
           null
        )}
      </AnimatePresence>
    </motion.div>
  );
};