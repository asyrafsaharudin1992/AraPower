import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, CheckCircle2, Download, DollarSign, RefreshCw , AlertTriangle } from 'lucide-react';

interface PayoutManagementProps {
  currentUser: any;
  rolesConfig: any;
  clinicProfile: any;
  referrals: any[];
  staffList: any[];
  branches: any[];
  handleBulkStatusUpdate: (ids: string[], newStatus: string) => Promise<void>;
  apiBaseUrl?: string;
  safeFetch?: (url: string, options?: RequestInit) => Promise<{ res: Response; data: any }>;
}

export const PayoutManagement: React.FC<PayoutManagementProps> = ({
  currentUser,
  rolesConfig,
  clinicProfile,
  referrals,
  staffList,
  branches,
  handleBulkStatusUpdate,
  apiBaseUrl,
  safeFetch,
}) => {
 const [activeTab, setActiveTab] = useState<'approval' | 'payout' | 'history'>('approval');
  const [searchQuery, setSearchQuery] = useState('');
  const [affiliateFilter, setAffiliateFilter] = useState('all');
  
  const [selectedForApproval, setSelectedForApproval] = useState<string[]>([]);
  const [selectedForPayout, setSelectedForPayout] = useState<string[]>([]);
  const [selectedOverrides, setSelectedOverrides] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overrideEarnings, setOverrideEarnings] = useState<any[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);

  // Fetch override earnings on mount
  React.useEffect(() => {
    if (!apiBaseUrl || !safeFetch) return;
    setLoadingOverrides(true);
    safeFetch(`${apiBaseUrl}/api/override-earnings/pending`)
      .then(({ res, data }) => { if (res.ok) setOverrideEarnings(data || []); })
      .catch(() => {})
      .finally(() => setLoadingOverrides(false));
  }, [apiBaseUrl]);

  if (!rolesConfig[currentUser.role]?.canViewAnalytics) return null;

  const completedCases = referrals.filter(r => r.status?.toLowerCase() === 'completed' && r.commission_amount > 0 && r.staff_id);
  const approvedCases = referrals.filter(r => r.status?.toLowerCase() === 'payment_approved' && r.commission_amount > 0 && r.staff_id);
  const paidCases = referrals.filter(r => r.status?.toLowerCase() === 'payment_made' && r.commission_amount > 0 && r.staff_id);

  const filteredCompleted = completedCases.filter(r => 
    (affiliateFilter === 'all' || String(r.staff_id) === affiliateFilter) &&
    ((r.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || r.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredApproved = approvedCases.filter(r => 
    (affiliateFilter === 'all' || String(r.staff_id) === affiliateFilter) &&
    ((r.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || r.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPaid = paidCases.filter(r => 
    (affiliateFilter === 'all' || String(r.staff_id) === affiliateFilter) &&
    ((r.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || r.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()))
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
    setIsProcessing(true);
    await handleBulkStatusUpdate(selectedForPayout, 'payment_made');
    setSelectedForPayout([]);
    setIsProcessing(false);
  };

  const generateBulkCSV = () => {
    if (selectedForPayout.length === 0) {
      alert("Please select cases to export.");
      return;
    }

    const casesToExport = approvedCases.filter(r => selectedForPayout.includes(String(r.id)));
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
    csvRows.push(',,,,,,,,');
    csvRows.push('Employer Info :,,,,,,,,');
    csvRows.push('Crediting Date (eg. dd/MM/yyyy),,,Please save this template to .csv (comma delimited) file before uploading the file via M2U Biz,,,,,');
    csvRows.push('Payment Reference,,,,,,,,');
    csvRows.push('Payment Description,,,,,,,,');
    csvRows.push('Bulk Payment Type,,,,,,,,');
    csvRows.push(',,,,,,,,');
    csvRows.push('Beneficiary Name,Beneficiary Bank,Beneficiary Account No,ID Type,ID Number,Payment Amount,Payment Reference,Payment Description,');

    const escapeCsv = (str: string) => {
      const stringified = String(str || '');
      if (stringified.includes(',') || stringified.includes('"')) return `"${stringified.replace(/"/g, '""')}"`;
      return stringified;
    };

    Object.values(aggregatedPayouts).forEach(({ staff, amount }) => {
      // Clean account number and ID number to be strictly numeric (no dashes/spaces)
      const rawAccount = staff.bank_account_number || staff.account_number || '';
      const cleanAccount = String(rawAccount).replace(/\D/g, '');
      
      const rawIdNumber = staff.id_number || '';
      const cleanIdNumber = String(rawIdNumber).replace(/\D/g, '');

      const row = [
        escapeCsv(staff.name || 'Unknown'),
        escapeCsv(staff.bank_name || ''),
        escapeCsv(cleanAccount),
        escapeCsv('NRIC'), // Always set ID Type to NRIC
        escapeCsv(cleanIdNumber),
        amount.toFixed(2),
        'INCENTIVE',
        'REFERRAL INCENTIVE',
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

  const handleMarkOverridesAsPaidSelected = async () => {
    if (selectedOverrides.length === 0 || !apiBaseUrl || !safeFetch) return;
    setIsProcessing(true);
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/override-earnings/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedOverrides })
      });
      if (res.ok) {
        setOverrideEarnings(prev => prev.filter(oe => !selectedOverrides.includes(String(oe.id))));
        setSelectedOverrides([]);
      } else {
        alert(data?.error || 'Failed to mark overrides as paid');
      }
    } catch (e: any) {
      alert(e.message || 'Error occurred while updating override status');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateOverrideBulkCSV = () => {
    if (selectedOverrides.length === 0) {
      alert("Please select override earnings to export.");
      return;
    }

    const earningsToExport = overrideEarnings.filter(oe => selectedOverrides.includes(String(oe.id)));
    const aggregatedPayouts: Record<string, { staff: any, amount: number }> = {};
    
    earningsToExport.forEach(oe => {
      const staffId = String(oe.upline_id);
      if (!aggregatedPayouts[staffId]) {
        const staff = staffList.find(s => String(s.id) === staffId) || { 
          name: oe.upline_name, 
          bank_name: oe.upline_bank_name, 
          bank_account_number: oe.upline_bank_account 
        };
        aggregatedPayouts[staffId] = { staff, amount: 0 };
      }
      aggregatedPayouts[staffId].amount += Number(oe.override_amount || 0);
    });

    const csvRows: string[] = [];
    csvRows.push(',,,,,,,,');
    csvRows.push('Employer Info :,,,,,,,,');
    csvRows.push('Crediting Date (eg. dd/MM/yyyy),,,Please save this template to .csv (comma delimited) file before uploading the file via M2U Biz,,,,,');
    csvRows.push('Payment Reference,,,,,,,,');
    csvRows.push('Payment Description,,,,,,,,');
    csvRows.push('Bulk Payment Type,,,,,,,,');
    csvRows.push(',,,,,,,,');
    csvRows.push('Beneficiary Name,Beneficiary Bank,Beneficiary Account No,ID Type,ID Number,Payment Amount,Payment Reference,Payment Description,');

    const escapeCsv = (str: string) => {
      const stringified = String(str || '');
      if (stringified.includes(',') || stringified.includes('"')) return `"${stringified.replace(/"/g, '""')}"`;
      return stringified;
    };

    Object.values(aggregatedPayouts).forEach(({ staff, amount }) => {
      const rawAccount = staff.bank_account_number || staff.account_number || '';
      const cleanAccount = String(rawAccount).replace(/\D/g, '');
      const rawIdNumber = staff.id_number || '';
      const cleanIdNumber = String(rawIdNumber).replace(/\D/g, '');

      const row = [
        escapeCsv(staff.name || 'Unknown'),
        escapeCsv(staff.bank_name || ''),
        escapeCsv(cleanAccount),
        escapeCsv('NRIC'),
        escapeCsv(cleanIdNumber),
        amount.toFixed(2),
        'INCENTIVE',
        'OVERRIDE EARNINGS',
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `M2U_Override_Payout_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Payout Management</h2>
        <p className="text-zinc-500 text-sm">Review completed cases, approve incentives, and process bulk payments.</p>
      </div>

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
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            3. History ({paidCases.length})
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

      {activeTab === 'approval' && (
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={selectedForApproval.length === filteredCompleted.length && filteredCompleted.length > 0}
                onChange={(e) => setSelectedForApproval(e.target.checked ? filteredCompleted.map(r => String(r.id)) : [])}
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
              {filteredCompleted.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No completed cases awaiting approval.</td></tr>}
              {filteredCompleted.map(ref => (
                <tr key={ref.id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => setSelectedForApproval(prev => prev.includes(String(ref.id)) ? prev.filter(id => id !== String(ref.id)) : [...prev, String(ref.id)])}>
                  <td className="p-4">
                    <input 
                      type="checkbox"
                      checked={selectedForApproval.includes(String(ref.id))}
                      readOnly
                      className="w-5 h-5 rounded border-zinc-300 text-violet-500 focus:ring-violet-500"
                    />
                  </td>
                  <td className="p-4 font-bold text-sm text-zinc-900">{ref.staff_name}</td>
                  <td className="p-4 text-sm text-zinc-600">{ref.patient_name || 'Hidden (P&C)'}</td>
                  <td className="p-4 text-sm text-zinc-600">{ref.service_name}</td>
                  <td className="p-4 text-sm font-black text-emerald-600 text-right">{clinicProfile.currency}{ref.commission_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payout' && (
        <div className="space-y-4">
        {/* Warning for affiliates with incomplete profiles */}
        {(() => {
          const incomplete = filteredApproved.filter(ref => {
            const staff = staffList.find(s => String(s.id) === String(ref.staff_id));
            return !staff?.bank_account_number || !staff?.id_number;
          });
          const uniqueNames = [...new Set(incomplete.map(r => r.staff_name).filter(Boolean))];
          return uniqueNames.length > 0 ? (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-amber-800">Incomplete profiles detected</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {uniqueNames.join(', ')} — missing bank account or IC number. Payouts may fail. Ask them to complete their profile first.
                </p>
              </div>
            </div>
          ) : null;
        })()}
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between flex-wrap gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={selectedForPayout.length === filteredApproved.length && filteredApproved.length > 0}
                onChange={(e) => setSelectedForPayout(e.target.checked ? filteredApproved.map(r => String(r.id)) : [])}
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
                Generate M2U CSV
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
              {filteredApproved.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No approved cases waiting for payout.</td></tr>}
              {filteredApproved.map(ref => {
                const staff = staffList.find(s => String(s.id) === String(ref.staff_id));
                return (
                  <tr key={ref.id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => setSelectedForPayout(prev => prev.includes(String(ref.id)) ? prev.filter(id => id !== String(ref.id)) : [...prev, String(ref.id)])}>
                    <td className="p-4">
                      <input 
                        type="checkbox"
                        checked={selectedForPayout.includes(String(ref.id))}
                        readOnly
                        className="w-5 h-5 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-zinc-900">{ref.staff_name}</p>
                        {(!staff?.bank_account_number || !staff?.id_number) && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-black text-amber-700 uppercase tracking-wider flex-shrink-0">
                            <AlertTriangle size={10} />
                            Incomplete Profile
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">
                        {staff?.bank_name || <span className="text-amber-600">No bank</span>}
                        {' - '}
                        {staff?.bank_account_number || staff?.account_number || <span className="text-amber-600">No account</span>}
                      </p>
                      {!staff?.id_number && (
                        <p className="text-[10px] text-amber-600 font-bold mt-0.5">⚠ IC number missing</p>
                      )}
                    </td>
                    <td className="p-4 text-sm text-zinc-600">{ref.patient_name || 'Hidden (P&C)'}</td>
                    <td className="p-4 text-sm text-zinc-600">{ref.service_name}</td>
                    <td className="p-4 text-sm font-black text-emerald-600 text-right">{clinicProfile.currency}{ref.commission_amount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* Tab 3: Payout History */}


          {/* ── OVERRIDE EARNINGS — upline commissions ─────── */}
          {overrideEarnings.length > 0 && (
            <div className="bg-white rounded-3xl border border-[#1580c2]/20 shadow-sm overflow-hidden mb-8">
              <div className="p-4 border-b border-[#1580c2]/10 bg-[#1580c2]/5 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-black text-sm text-[#1580c2]">Override Earnings — Pending Payout</h3>
                  <p className="text-[10px] text-[#1580c2]/60 mt-0.5">Network upline commissions awaiting bank transfer</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-[#1580c2]/20">
                    <input 
                      type="checkbox"
                      checked={selectedOverrides.length === overrideEarnings.length && overrideEarnings.length > 0}
                      onChange={(e) => setSelectedOverrides(e.target.checked ? overrideEarnings.map(oe => String(oe.id)) : [])}
                      className="w-4 h-4 rounded border-zinc-300 text-[#1580c2] focus:ring-[#1580c2]"
                    />
                    <span className="text-[10px] font-black text-[#1580c2] uppercase tracking-widest">Select All</span>
                  </label>
                  <button 
                    onClick={generateOverrideBulkCSV}
                    disabled={selectedOverrides.length === 0}
                    className="bg-white border border-[#1580c2]/20 hover:bg-[#1580c2]/5 text-[#1580c2] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    <Download size={14} />
                    M2U CSV
                  </button>
                  <button 
                    onClick={handleMarkOverridesAsPaidSelected}
                    disabled={selectedOverrides.length === 0 || isProcessing}
                    className="bg-[#1580c2] hover:bg-[#0d5a8a] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <DollarSign size={14} />}
                    Mark Paid
                  </button>
                </div>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white border-b border-zinc-100 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    <th className="p-4 w-12"></th>
                    <th className="p-4">Upline Affiliate</th>
                    <th className="p-4">From Downline</th>
                    <th className="p-4">Case #</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Override Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {overrideEarnings.map((oe: any) => (
                    <tr key={oe.id} className="hover:bg-[#1580c2]/5 transition-colors cursor-pointer" onClick={() => setSelectedOverrides(prev => prev.includes(String(oe.id)) ? prev.filter(id => id !== String(oe.id)) : [...prev, String(oe.id)])}>
                      <td className="p-4">
                        <input 
                          type="checkbox"
                          checked={selectedOverrides.includes(String(oe.id))}
                          readOnly
                          className="w-5 h-5 rounded border-zinc-300 text-[#1580c2] focus:ring-[#1580c2]"
                        />
                      </td>
                      <td className="p-4">
                        <p className="font-black text-sm text-zinc-900">{oe.upline_name || `Affiliate #${oe.upline_id}`}</p>
                        <p className="text-[10px] text-zinc-400">{oe.upline_bank_name} {oe.upline_bank_account}</p>
                      </td>
                      <td className="p-4 text-sm text-zinc-600">{oe.downline_name || `Affiliate #${oe.downline_id}`}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-[#1580c2]/10 text-[#1580c2] rounded-lg text-[10px] font-black">
                          Case {oe.case_number}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-zinc-500">
                        {oe.created_at ? new Date(oe.created_at).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-black text-[#1580c2]">{clinicProfile.currency}{Number(oe.override_amount || 0).toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#1580c2]/5 border-t border-[#1580c2]/10">
                    <td colSpan={5} className="p-4 text-sm font-black text-[#1580c2] text-right">Selected Override pending payout:</td>
                    <td className="p-4 text-right font-black text-[#1580c2]">
                      {clinicProfile.currency}{overrideEarnings.filter(oe => selectedOverrides.includes(String(oe.id))).reduce((s: number, o: any) => s + Number(o.override_amount || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          {loadingOverrides && (
            <div className="flex items-center gap-2 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <RefreshCw size={14} className="animate-spin text-zinc-400" />
              <span className="text-xs text-zinc-400">Loading override earnings...</span>
            </div>
          )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-700 ml-2">Historical Payment Records</h3>
          </div>
          
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-zinc-100 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <th className="p-4">Affiliate</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Service</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Incentive Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredPaid.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No historical payments found.</td></tr>}
              {filteredPaid.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(ref => (
                <tr key={ref.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="p-4 font-bold text-sm text-zinc-900">{ref.staff_name}</td>
                  <td className="p-4 text-sm text-zinc-600">{ref.patient_name || 'Hidden (P&C)'}</td>
                  <td className="p-4 text-sm text-zinc-600">{ref.service_name}</td>
                  <td className="p-4">
                    <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                      <CheckCircle2 size={12} /> Paid
                    </span>
                  </td>
                  <td className="p-4 text-sm font-black text-emerald-600 text-right">{clinicProfile.currency}{ref.commission_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};