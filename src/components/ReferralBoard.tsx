import React, { useState, useMemo } from 'react'; // Added useMemo
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RefreshCw, Download, ChevronRight, MessageCircle, Phone, Trash2, Lock, SlidersHorizontal } from 'lucide-react';
import { ReferralHeader } from './ReferralHeader';

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
  onOpenWhatsApp?: (referral: any) => void;
}

const getWhatsAppUrl = (phone: string | null | undefined, referral?: any) => {
  if (!phone) return '#';
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  // Ensure it starts with 60 for Malaysia
  const formatted = cleaned.startsWith('0') 
    ? '6' + cleaned 
    : (cleaned.startsWith('60') ? cleaned : '60' + cleaned);
  
  let url = `https://wa.me/${formatted}`;

  if (referral) {
    const formatDateHelper = (dateStr: string | null | undefined) => {
      if (!dateStr) return '—';
      try {
        return new Date(dateStr).toLocaleDateString('en-MY', {
          timeZone: 'Asia/Kuala_Lumpur',
          day: 'numeric', month: 'short', year: 'numeric',
        });
      } catch { return '—'; }
    };

    const formatTimeHelper = (timeStr: string | null | undefined) => {
      if (!timeStr) return '—';
      try {
        const [h, m] = timeStr.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
      } catch { return timeStr; }
    };

    const message = `[KLINIK ARA 24 JAM]

Assalamualaikum dan Selamat sejahtera. Berikut adalah maklumat temu janji pihak tuan/puan. 

Tarikh: ${formatDateHelper(referral.appointment_date || referral.date)}
Waktu: ${formatTimeHelper(referral.booking_time)}
Cawangan: ${referral.branch || '—'}
Servis: ${referral.service_name || '—'}

Kami doakan semoga segala urusan tuan/puan dimudahkan.
 
Terima kasih.`;

    url += `?text=${encodeURIComponent(message)}`;
  }

  return url;
};

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
  onOpenWhatsApp
}) => {
  const [referralSearch, setReferralSearch] = useState('');

  // Date formatter — human readable, Malaysia timezone
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return '—'; }
  };

  // Format time cleanly — removes seconds
  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return null;
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour = h % 12 || 12;
      return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
    } catch { return timeStr; }
  };

  // Status colour — soft pill style
  const getStatusPill = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'completed')        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'payment_approved') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (s === 'payment_made')     return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (s === 'arrived')          return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'in_session')       return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (s === 'rejected')         return 'bg-red-50 text-red-600 border-red-200';
    return 'bg-amber-50 text-amber-700 border-amber-200'; // pending
  };

  const isAffiliate = currentUser?.role === 'affiliate';
  const [referralBranchFilter, setReferralBranchFilter] = useState('all');
  const [referralStatusFilter, setReferralStatusFilter] = useState('all');
  const [referralServiceFilter, setReferralServiceFilter] = useState('all'); // NEW STATE
  const [showFilters, setShowFilters] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{id: string, status: string} | null>(null);

  // Helper: returns available next actions for a referral given role
  const getAvailableActions = (ref: any) => {
    const role = currentUser?.role;
    const isAdmin = role === 'admin';
    const isManager = role === 'manager';
    const isReceptionist = role === 'receptionist';
    const canManage = isAdmin || isManager || isReceptionist;
    if (!canManage) return [];

    const actions: { label: string; status: string; colour: string }[] = [];
    const s = ref.status?.toLowerCase();

    if (s === 'pending') {
      actions.push({ label: 'Mark Arrived', status: 'arrived', colour: 'text-blue-600' });
    }
    if (s === 'arrived') {
      actions.push({ label: 'Start Session', status: 'in_session', colour: 'text-brand-primary' });
    }
    if (s === 'in_session') {
      actions.push({ label: 'Mark Completed', status: 'completed', colour: 'text-green-600' });
    }
    if (s === 'completed' && (isAdmin || isManager)) {
      actions.push({ label: 'Approve Payment', status: 'payment_approved', colour: 'text-purple-600' });
    }
    if (s === 'payment_approved' && (isAdmin || isManager)) {
      actions.push({ label: 'Payment Made', status: 'payment_made', colour: 'text-emerald-700' });
    }
    if (['pending', 'arrived', 'in_session'].includes(s) && (isAdmin || isManager)) {
      actions.push({ label: 'Reject', status: 'rejected', colour: 'text-red-600' });
    }
    return actions;
  };

  // NEW: Extract unique services dynamically from the referrals data
  const uniqueServices = useMemo(() => {
    if (!referrals) return [];
    const services: string[] = Array.from(
      new Set(referrals.map(ref => ref.service_name).filter(Boolean))
    );
    return services.sort(); // Sort alphabetically
  }, [referrals]);

  // Centralized filtering logic (Fixed null safety + Added Service Filter)
  const filteredReferrals = referrals
    .filter(ref => {
      if (!referralSearch) return true;
      const search = referralSearch.toLowerCase();
      const staffName = staffList?.find(s => String(s.id) === String(ref.staff_id))?.name || ref.staff_name || '';
      return (
        (ref.patient_name || '').toLowerCase().includes(search) ||
        staffName.toLowerCase().includes(search) ||
        (ref.service_name || '').toLowerCase().includes(search)
      );
    })
    .filter(ref => referralBranchFilter === 'all' ? true : ref.branch === referralBranchFilter)
    .filter(ref => referralStatusFilter === 'all' ? true : ref.status === referralStatusFilter)
    .filter(ref => referralServiceFilter === 'all' ? true : ref.service_name === referralServiceFilter); // NEW FILTER

  // ... [exportToCSV function remains exactly the same] ...
  const exportToCSV = () => {
    const headers = currentUser?.role === 'admin' 
      ? ['Submission Date', 'Patient Name', 'Patient Type', 'Service', 'Branch', 'Appt Date', 'Appt Time', 'Staff Name', 'Incentive ($)', 'Status']
      : ['Submission Date', 'Patient Name', 'Patient Type', 'Service', 'Branch', 'Appt Date', 'Appt Time', 'Incentive ($)', 'Status'];

    const csvRows = filteredReferrals.map(ref => {
      const row = [
        formatDate(ref.date),
        `"${ref.patient_name}"`,
        ref.patient_type || 'new',
        `"${ref.service_name}"`,
        `"${ref.branch || '—'}"`,
        formatDate(ref.appointment_date),
        ref.booking_time || '—',
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

  const blue = '#1580c2';
  const P = "'Poppins', sans-serif";

  const inputStyle: React.CSSProperties = {
    background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px',
    padding: '8px 14px', fontSize: '12px', fontWeight: 500, color: blue,
    fontFamily: P, outline: 'none',
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  // Mobile search + filter bar (inline, no ReferralHeader wrapper)
  const mobileToolbar = (
    <div className="flex items-center gap-2 mb-3">
      <div className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={referralSearch}
          onChange={e => setReferralSearch(e.target.value)}
          placeholder="Search service or branch..."
          className="w-full h-11 bg-zinc-100 border-0 rounded-2xl text-sm font-medium text-zinc-700 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-[#1580c2]/20 placeholder-zinc-400"
        />
      </div>
      <button onClick={() => setShowFilters(!showFilters)}
        className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${showFilters ? 'bg-[#1580c2] text-white' : 'bg-zinc-100 text-zinc-500'}`}>
        <SlidersHorizontal size={16} />
      </button>
      <button onClick={exportToCSV}
        className="w-11 h-11 rounded-2xl bg-zinc-100 flex items-center justify-center flex-shrink-0 text-zinc-500 hover:bg-zinc-200 transition-all">
        <Download size={16} />
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <div>
        {mobileToolbar}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
              <div className="flex flex-wrap gap-2 pb-2">
                <select value={referralBranchFilter} onChange={e => setReferralBranchFilter(e.target.value)} className="flex-1 min-w-[120px] h-9 bg-white border border-zinc-200 rounded-xl px-3 text-xs font-medium text-zinc-700 focus:outline-none">
                  <option value="all">All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
                <select value={referralStatusFilter} onChange={e => setReferralStatusFilter(e.target.value)} className="flex-1 min-w-[120px] h-9 bg-white border border-zinc-200 rounded-xl px-3 text-xs font-medium text-zinc-700 focus:outline-none">
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="arrived">Arrived</option>
                  <option value="in_session">In Session</option>
                  <option value="completed">Completed</option>
                  <option value="payment_approved">Payment Approved</option>
                  <option value="payment_made">Paid</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

          {filteredReferrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-full bg-[#1580c2]/8 flex items-center justify-center">
                <Search size={24} className="text-[#1580c2]/30" />
              </div>
              <p className="text-sm font-bold text-zinc-400">No referrals found</p>
              <p className="text-xs text-zinc-300">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="mt-2">
            {filteredReferrals.map((ref, idx) => {
              const staffName = staffList?.find(s => String(s.id) === String(ref.staff_id) || (s.referral_code && String(s.referral_code) === String(ref.staff_id)))?.name || ref.staff_name || 'Direct Walk-in';
              const staffInitial = staffName[0]?.toUpperCase() || 'D';
              const dateStr = formatDate(ref.appointment_date || ref.date);
              const timeStr = formatTime(ref.booking_time);
              return (
              <motion.div
                key={ref.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`py-4 active:bg-[#f8fafc] transition-colors ${idx !== filteredReferrals.length - 1 ? 'border-b border-[#1580c2]/5' : ''}`}
              >
                {/* Top: service tag + status pill */}
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-block px-2.5 py-1 bg-[#1580c2]/8 text-[#1580c2] rounded-xl text-[11px] font-semibold truncate max-w-[65%]">
                    {ref.service_name || 'General'}
                  </span>
                  <span className={`flex-shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${getStatusPill(ref.status)}`}>
                    {getStatusLabel(ref.status)}
                  </span>
                </div>

                {/* Patient name or privacy mask */}
                {isAffiliate ? (
                  <div className="flex items-center gap-2">
                    <Lock size={11} className="text-zinc-300 flex-shrink-0" />
                    <span className="text-zinc-300 tracking-[0.25em] text-sm font-medium">••••••••</span>
                    <span className="text-[10px] text-zinc-300 font-medium">Private</span>
                  </div>
                ) : (
                  <p className="text-[15px] font-black text-zinc-800 leading-tight">
                    {ref.patient_name || 'Unknown Patient'}
                  </p>
                )}

                {/* Date · Time · Branch */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>📅</span>
                      <span className="font-semibold text-zinc-700">{dateStr}</span>
                      {timeStr && <><span className="text-zinc-300">·</span><span className="font-semibold text-zinc-700">{timeStr}</span></>}
                    </div>
                    {!isAffiliate && ref.patient_phone && (
                      <button 
                        onClick={() => onOpenWhatsApp ? onOpenWhatsApp(ref) : window.open(getWhatsAppUrl(ref.patient_phone, ref), '_blank')}
                        className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center -mt-8 shadow-sm border border-emerald-100/50"
                      >
                        <MessageCircle size={18} />
                      </button>
                    )}
                  </div>
                  {ref.branch && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>🏥</span>
                      <span className="font-medium">{ref.branch}</span>
                    </div>
                  )}
                </div>

                {/* Bottom: submitted date + incentive */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-zinc-400">Submitted</span>
                    <span className="text-[11px] font-semibold text-zinc-500">{formatDate(ref.date)}</span>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-baseline gap-0.5">
                    <span className="text-[11px] font-medium text-[#1580c2]/60">{clinicProfile?.currency || 'RM'}</span>
                    <span className="text-[17px] font-black text-[#1580c2] tracking-tight">{(ref.commission_amount || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Status action dropdown */}
                {(() => {
                  const actions = getAvailableActions(ref);
                  if (actions.length === 0) return null;
                  return (
                    <div style={{ marginTop: '8px' }}>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) { setPendingStatusUpdate({ id: ref.id, status: e.target.value }); e.target.value = ''; }
                        }}
                        className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-700 focus:outline-none focus:border-[#1580c2] transition-colors"
                      >
                        <option value="" disabled>Update Status...</option>
                        {actions.map(a => <option key={a.status} value={a.status}>{a.label}</option>)}
                      </select>
                    </div>
                  );
                })()}
              </motion.div>
            );
            })}
            </div>
          )}
        </div>
    );
  }

  // ── Desktop View ────────────────────────────────────────────────────────
  return (
    <>
      <ReferralHeader
        onSearchChange={setReferralSearch}
        onExportClick={exportToCSV}
        onFilterClick={() => setShowFilters(!showFilters)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px 0' }}>
                  <select value={referralBranchFilter} onChange={(e) => setReferralBranchFilter(e.target.value)} style={selectStyle}>
                    <option value="all">All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                  <select value={referralServiceFilter} onChange={(e) => setReferralServiceFilter(e.target.value)} style={selectStyle}>
                    <option value="all">All Services</option>
                    {uniqueServices.map(service => <option key={service} value={service}>{service}</option>)}
                  </select>
                  <select value={referralStatusFilter} onChange={(e) => setReferralStatusFilter(e.target.value)} style={selectStyle}>
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="arrived">Arrived</option>
                    <option value="in_session">In Session</option>
                    <option value="completed">Completed</option>
                    <option value="payment_approved">Payment Approved</option>
                    <option value="payment_made">Payment Made</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button onClick={fetchReferrals} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: blue, background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', padding: '6px 10px', borderRadius: '10px' }}>
                    <RefreshCw size={12} /> Refresh
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* ── Desktop View ── */}
        <div className="bg-white rounded-2xl border border-[#1580c2]/10 shadow-sm overflow-x-auto">
          <table style={{ minWidth: '1000px', width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
            <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  {['Submitted','Patient','Service','Branch','Appt Date','Appt Time','Staff','Incentive','Status','Actions'].map(h => (
                    <th key={h} style={{ 
                      padding: '16px 12px', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      color: blue, 
                      opacity: 0.6, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em', 
                      whiteSpace: 'nowrap',
                      borderBottom: '1px solid #f1f5f9'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '64px 20px', textAlign: 'center', fontSize: '14px', fontWeight: 500, color: blue, opacity: 0.4 }}>No referrals found in this view.</td>
                  </tr>
                ) : (
                  filteredReferrals.map((ref) => (
                    <motion.tr 
                      key={ref.id} 
                      whileHover={{ backgroundColor: '#f8fafc' }}
                      transition={{ duration: 0.2 }}
                      style={{ borderTop: '1px solid #f1f5f9' }}
                    >
                      <td style={{ padding: '16px 12px', fontSize: '12px', fontWeight: 500, color: '#1580c2', opacity: 0.6 }}>{formatDate(ref.date)}</td>
                      <td style={{ padding: '16px 12px' }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#0c4a6e', margin: '0 0 4px 0' }}>{isAffiliate ? '••••••••' : (ref.patient_name || 'Unknown')}</p>
                        <div className="flex items-center gap-2">
                          <p style={{ fontSize: '12px', fontWeight: 500, color: '#1580c2', opacity: 0.5, margin: 0 }}>{isAffiliate ? '••••••' : (ref.patient_phone || '—')}</p>
                          {ref.patient_phone && (
                            <button 
                              onClick={() => onOpenWhatsApp ? onOpenWhatsApp(ref) : window.open(getWhatsAppUrl(ref.patient_phone, ref), '_blank')}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-[#1580c2]/5 text-[#1580c2] hover:bg-[#1580c2] hover:text-white transition-all transform hover:scale-105"
                              title="WhatsApp Patient"
                            >
                              <MessageCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <span className="inline-block px-3 py-1 bg-[#1580c2]/5 text-[#1580c2] rounded-lg text-xs font-bold uppercase tracking-tight">
                          {ref.service_name}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', fontSize: '12px', fontWeight: 600, color: '#1580c2' }}>{ref.branch || '—'}</td>
                      <td style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 700, color: '#0c4a6e' }}>{formatDate(ref.appointment_date)}</td>
                      <td style={{ padding: '16px 12px', fontSize: '12px', fontWeight: 500, color: '#1580c2', opacity: 0.7 }}>{ref.booking_time || '—'}</td>
                      <td style={{ padding: '16px 12px' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#1580c2]/10 flex items-center justify-center text-[#1580c2] font-bold text-[10px]">
                            {(staffList?.find(s => String(s.id) === String(ref.staff_id))?.name || ref.staff_name || 'D')[0]}
                          </div>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: '#0c4a6e' }}>
                            {staffList?.find(s => String(s.id) === String(ref.staff_id) || (s.referral_code && String(s.referral_code) === String(ref.staff_id)))?.name || ref.staff_name || 'Direct Walk-in'}
                          </p>
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#1580c2' }}>{clinicProfile?.currency || 'RM'} {ref.commission_amount?.toFixed(2) || '0.00'}</span>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(ref.status)}`}>
                          {getStatusLabel(ref.status)}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                        {(() => {
                          const actions = getAvailableActions(ref);
                          if (actions.length === 0) return null;
                          return (
                            <select defaultValue=""
                              onChange={(e) => { if (e.target.value) { setPendingStatusUpdate({ id: ref.id, status: e.target.value }); e.target.value = ''; } }}
                              style={{
                                appearance: 'none',
                                background: 'white',
                                border: '2px solid #1580c2',
                                borderRadius: '12px',
                                padding: '6px 32px 6px 12px',
                                fontSize: '11px',
                                fontWeight: 800,
                                color: '#1580c2',
                                cursor: 'pointer',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%231580c2' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 8px center',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                              <option value="" disabled>Actions</option>
                              {actions.map(a => <option key={a.status} value={a.status}>{a.label}</option>)}
                            </select>
                          );
                        })()}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>
      {/* ── Confirm modal ── */}
      <AnimatePresence>
        {pendingStatusUpdate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: '#ffffff', borderRadius: '1.5rem', boxShadow: '0 24px 60px rgba(21,128,194,0.15)', width: '100%', maxWidth: '420px', overflow: 'hidden', fontFamily: P }}
            >
              <div style={{ padding: '28px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: blue, margin: '0 0 8px 0' }}>Confirm Status Update</h3>
                <p style={{ fontSize: '14px', fontWeight: 400, color: blue, opacity: 0.65, margin: '0 0 24px 0' }}>
                  Are you sure you want to change this referral's status to{' '}
                  <span style={{ fontWeight: 700, opacity: 1 }}>{getStatusLabel(pendingStatusUpdate.status)}</span>?
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={() => setPendingStatusUpdate(null)}
                    style={{ padding: '10px 20px', borderRadius: '40px', fontSize: '13px', fontWeight: 600, color: blue, background: `${blue}12`, border: 'none', cursor: 'pointer', fontFamily: P }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => { handleClinicStatusUpdate(pendingStatusUpdate.id, pendingStatusUpdate.status); setPendingStatusUpdate(null); }}
                    style={{ padding: '10px 20px', borderRadius: '40px', fontSize: '13px', fontWeight: 600, color: '#ffffff', background: blue, border: 'none', cursor: 'pointer', fontFamily: P }}>
                    Confirm Update
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </ReferralHeader>
    </>
  );
};
export default ReferralBoard;