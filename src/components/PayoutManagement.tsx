import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, Download, AlertCircle, RefreshCw, DollarSign } from 'lucide-react';

interface PayoutManagementProps {
  currentUser: any;
  rolesConfig: any;
  clinicProfile: any;
  referrals: any[];
  staffList: any[];
  branches: any[];
  handleBulkStatusUpdate: (ids: string[], newStatus: string) => Promise<void>; // NEW PROP
}

export const PayoutManagement: React.FC<PayoutManagementProps> = ({
  currentUser,
  rolesConfig,
  clinicProfile,
  referrals,
  staffList,
  branches,
  handleBulkStatusUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'approval' | 'payout'>('approval');
  const [searchQuery, setSearchQuery] = useState('');
  const [affiliateFilter, setAffiliateFilter] = useState('all');
  
  // Checkbox states
  const [selectedForApproval, setSelectedForApproval] = useState<string[]>([]);
  const [selectedForPayout, setSelectedForPayout] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Security Check
  if (!rolesConfig[currentUser.role]?.canViewAnalytics) return null;

  // Filter data based on the new status pipeline
  const completedCases = referrals.filter(r => r.status?.toLowerCase() === 'completed' && r.commission_amount > 0 && r.staff_id);
  const approvedCases = referrals.filter(r => r.status?.toLowerCase() === 'payment_approved' && r.commission_amount > 0 && r.staff_id);

  // Apply search and affiliate filters
  const filteredCompleted = completedCases.filter(r => 
    (affiliateFilter === 'all' || String(r.staff_id) === affiliateFilter) &&
    (r.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || r.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredApproved = approvedCases.filter(r => 
    (affiliateFilter === 'all' || String(r.staff_id) === affiliateFilter) &&
    (r.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || r.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleApproveSelected = async () => {
    if (selectedForApproval.length === 0) return;
    setIsProcessing(true);
    await handleBulkStatusUpdate(selectedForApproval, 'payment_approved');
    setSelectedForApproval([]);
    setIsProcessing(false);
  };

  const handleMarkAsPaidSelected = async () => {
    if (selectedForPayout.length === 0) return;
    if (window.confirm(`Mark ${selectedForPayout.length} cases as officially paid?`)) {
      setIsProcessing(true);
      await handleBulkStatusUpdate(selectedForPayout, 'payment_made');
      setSelectedForPayout([]);
      setIsProcessing(false);
    }
  };

  const generateBulkCSV = () => {
    if (selectedForPayout.length === 0) {
      alert("Please select cases to export.");
      return;
    }

    // Force strict typing on IDs to fix the blank file issue
    const casesToExport = approvedCases.filter(r => selectedForPayout.includes(String(r.id)));
    
    // Group referrals by staff member to create single bulk payments per person
    const aggregatedPayouts: Record<string, { staff: any, amount: number }> = {};
    
    casesToExport.forEach(ref => {
      const staffId = String(ref.staff_id);
      if (!aggregatedPayouts[staffId]) {
        aggregatedPayouts[staffId] = {
          staff: staffList.find(s => String(s.id) === staffId) || { name: ref.staff_name },
          amount: 0
        };
      }
      aggregatedPayouts[staffId].amount += Number(ref.commission_amount || 0);
    });

    const csvRows: string[] = [];
    
    // M2U Biz Header Template exactly matching the corporate format
    csvRows.push(',,,,,,,,');
    csvRows.push('Employer Info :,,,,,,,,');
    csvRows.push('Crediting Date (eg. dd/MM/yyyy),,,Please save this template to .csv (comma delimited) file before uploading the file via M2U Biz,,,,,');
    csvRows.push('Payment Reference,,,,,,,,');
    csvRows.push('Payment Description,,,,,,,,');
    csvRows.push('Bulk Payment Type,,,,,,,,');
    csvRows.push(',,,,,,,,');
    csvRows.push('Beneficiary Name,Beneficiary Bank,Beneficiary Account No,ID Type,ID Number,Payment Amount,Payment Reference,Payment Description,');

    // Helper to safely format CSV strings with commas
    const escapeCsv = (str: string) => {
      const stringified = String(str || '');
      if (stringified.includes(',') || stringified.includes('"')) {
        return `"${stringified.replace(/"/g, '""')}"`;
      }
      return stringified;
    };

    // Data Rows (One row per staff member)
    Object.values(aggregatedPayouts).forEach(({ staff, amount }) => {
      const row = [
        escapeCsv(staff.name || 'Unknown'),
        escapeCsv(staff.bank_name || ''),
        escapeCsv(staff.bank_account_number || staff.account_number || ''),
        escapeCsv(staff.id_type || 'NEW NRIC'), // Defaults to NEW NRIC for banks
        escapeCsv(staff.id_number || ''),
        amount.toFixed(2),
        'INCENTIVE', // Payment Reference
        'REFERRAL INCENTIVE', // Payment Description
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `M2U_Bulk_Payout_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Payout Management</h2>
        <p className="text-zinc-500 text-sm">Review completed cases, approve incentives, and process bulk payments.</p>
      </div>

      {/* Filters & Navigation */}
      <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex flex-wrap gap-4 items-end justify-between">
        <div className="flex gap-2 p-1 bg-zinc-50 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('approval')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'approval' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            1. Review & Approve ({completedCases.length})
          </button>
          <button 
            onClick={() => setActiveTab('payout')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'payout' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            2. Bulk Payout ({approvedCases.length})
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="relative min-w-[200px]">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search patient or staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select 
            value={affiliateFilter}
            onChange={(e) => setAffiliateFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-[150px]"
          >
            <option value="all">All Affiliates</option>
            {staffList.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab 1: Review & Approve */}
      {activeTab === 'approval' && (
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={selectedForApproval.length === filteredCompleted.length && filteredCompleted.length > 0}
                onChange={(e) => {
                  if (e.target.checked) setSelectedForApproval(filteredCompleted.map(r => String(r.id)));
                  else setSelectedForApproval([]);
                }}
                className="w-5 h-5 rounded border-zinc-300 text-violet-500 focus:ring-violet-500"
              />
              <span className="text-sm font-bold text-zinc-700">Select All ({filteredCompleted.length})</span>
            </label>
            <button 
              onClick={handleApproveSelected}
              disabled={selectedForApproval.length === 0 || isProcessing}
              className="bg-violet-500 hover:bg-violet-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Approve Selected ({selectedForApproval.length})
            </button>
          </div>
          
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-zinc-100 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <th className="p-4 w-12"></th>
                <th className="p-4">Affiliate</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Service</th>
                <th className="p-4 text-right">Incentive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredCompleted.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No completed cases awaiting approval.</td></tr>
              )}
              {filteredCompleted.map(ref => (
                <tr key={ref.id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => {
                  setSelectedForApproval(prev => prev.includes(String(ref.id)) ? prev.filter(id => id !== String(ref.id)) : [...prev, String(ref.id)]);
                }}>
                  <td className="p-4">
                    <input 
                      type="checkbox"
                      checked={selectedForApproval.includes(String(ref.id))}
                      onChange={() => {}} // Handled by tr onClick
                      className="w-5 h-5 rounded border-zinc-300 text-violet-500 focus:ring-violet-500"
                    />
                  </td>
                  <td className="p-4 font-bold text-sm text-zinc-900">{ref.staff_name}</td>
                  <td className="p-4 text-sm text-zinc-600">{ref.patient_name}</td>
                  <td className="p-4 text-sm text-zinc-600">{ref.service_name}</td>
                  <td className="p-4 text-sm font-black text-emerald-600 text-right">{clinicProfile.currency}{ref.commission_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Bulk Payout */}
      {activeTab === 'payout' && (
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between flex-wrap gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={selectedForPayout.length === filteredApproved.length && filteredApproved.length > 0}
                onChange={(e) => {
                  if (e.target.checked) setSelectedForPayout(filteredApproved.map(r => String(r.id)));
                  else setSelectedForPayout([]);
                }}
                className="w-5 h-5 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm font-bold text-zinc-700">Select All ({filteredApproved.length})</span>
            </label>
            <div className="flex items-center gap-2">
              <button 
                onClick={generateBulkCSV}
                disabled={selectedForPayout.length === 0}
                className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-900 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
              >
                <Download size={14} />
                Generate CSV
              </button>
              <button 
                onClick={handleMarkAsPaidSelected}
                disabled={selectedForPayout.length === 0 || isProcessing}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <DollarSign size={14} />}
                Mark as Payment Made
              </button>
            </div>
          </div>
          
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-zinc-100 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <th className="p-4 w-12"></th>
                <th className="p-4">Affiliate & Bank</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Service</th>
                <th className="p-4 text-right">Incentive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredApproved.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No approved cases waiting for payout.</td></tr>
              )}
              {filteredApproved.map(ref => {
                const staff = staffList.find(s => String(s.id) === String(ref.staff_id));
                return (
                  <tr key={ref.id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => {
                    setSelectedForPayout(prev => prev.includes(String(ref.id)) ? prev.filter(id => id !== String(ref.id)) : [...prev, String(ref.id)]);
                  }}>
                    <td className="p-4">
                      <input 
                        type="checkbox"
                        checked={selectedForPayout.includes(String(ref.id))}
                        onChange={() => {}} // Handled by tr onClick
                        className="w-5 h-5 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-sm text-zinc-900">{ref.staff_name}</p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{staff?.bank_name || 'N/A'} - {staff?.bank_account_number || staff?.account_number || 'N/A'}</p>
                    </td>
                    <td className="p-4 text-sm text-zinc-600">{ref.patient_name}</td>
                    <td className="p-4 text-sm text-zinc-600">{ref.service_name}</td>
                    <td className="p-4 text-sm font-black text-emerald-600 text-right">{clinicProfile.currency}{ref.commission_amount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};