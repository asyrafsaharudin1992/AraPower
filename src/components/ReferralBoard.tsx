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

  // Safe local date formatter — avoids UTC midnight timezone shift
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const d = dateStr.split('T')[0]; // strip time if present
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return dateStr;
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };
  const [referralBranchFilter, setReferralBranchFilter] = useState('all');
  const [referralStatusFilter, setReferralStatusFilter] = useState('all');
  const [referralServiceFilter, setReferralServiceFilter] = useState('all'); // NEW STATE
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
    if (s === 'in_session') {
      actions.push({ label: 'Mark Completed', status: 'completed', colour: 'text-green-600' });
    }
    if (s === 'completed' && (isAdmin || isManager)) {
      actions.push({ label: 'Approve Payment', status: 'payment_approved', colour: 'text-purple-600' });
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
    background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px',
    padding: '8px 14px', fontSize: '12px', fontWeight: 500, color: blue,
    fontFamily: P, outline: 'none',
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: '#ffffff', borderRadius: '1.5rem', border: '1.5px solid #e2e8f0', overflow: 'hidden', fontFamily: P }}
    >
      {/* ── Header: search + filters + actions ── */}
      <div style={{ padding: '20px 24px', borderBottom: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: blue, margin: 0 }}>Referral History</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={fetchReferrals}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: blue, background: 'none', border: 'none', cursor: 'pointer', padding: '7px 12px', borderRadius: '10px', fontFamily: P, transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = `${blue}10`)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={exportToCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#ffffff', background: blue, border: 'none', cursor: 'pointer', padding: '7px 14px', borderRadius: '10px', fontFamily: P }}>
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: `${blue}80` }} size={13} />
            <input
              type="text"
              placeholder="Search patient, staff, or service..."
              value={referralSearch}
              onChange={(e) => setReferralSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '30px', width: '220px' }}
            />
          </div>
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
        </div>
      </div>

      {/* ── Mobile View ── */}
      {isMobile ? (
        <div>
          {filteredReferrals.length === 0 ? (
            <p style={{ padding: '48px', textAlign: 'center', fontSize: '14px', fontWeight: 500, color: blue, opacity: 0.45 }}>No referrals found.</p>
          ) : (
            filteredReferrals.map((ref) => (
              <div key={ref.id}
                style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#ffffff', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fbff')}
                onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
              >
                {/* Top row: name + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: blue, margin: '0 0 2px 0' }}>{ref.patient_name}</p>
                    <p style={{ fontSize: '12px', fontWeight: 500, color: blue, opacity: 0.55, margin: 0 }}>{ref.service_name}</p>
                  </div>
                  <span className={getStatusColor(ref.status)}
                    style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    {getStatusLabel(ref.status)}
                  </span>
                </div>

                {/* Middle row: meta + incentive */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: blue }}>
                      <span style={{ fontWeight: 600, opacity: 0.55 }}>Appt:</span>
                      <span style={{ fontWeight: 500 }}>{formatDate(ref.appointment_date)}{ref.booking_time ? ` @ ${ref.booking_time}` : ''}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: blue }}>
                      <span style={{ fontWeight: 600, opacity: 0.55 }}>Branch:</span>
                      <span style={{ fontWeight: 500 }}>{ref.branch || '—'}</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: blue, opacity: 0.4 }}>Submitted: {formatDate(ref.date)}</div>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: blue }}>
                    {clinicProfile?.currency || 'RM'} {ref.commission_amount?.toFixed(2) || '0.00'}
                  </span>
                </div>

                {/* Status action dropdown */}
                {(() => {
                  const actions = getAvailableActions(ref);
                  if (actions.length === 0) return null;
                  return (
                    <div style={{ marginTop: '12px' }}>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) { setPendingStatusUpdate({ id: ref.id, status: e.target.value }); e.target.value = ''; }
                        }}
                        style={{ ...selectStyle, width: '100%' }}
                      >
                        <option value="" disabled>Update Status...</option>
                        {actions.map(a => <option key={a.status} value={a.status}>{a.label}</option>)}
                      </select>
                    </div>
                  );
                })()}
              </div>
            ))
          )}
        </div>
      ) : (
        /* ── Desktop View ── */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Submitted','Patient','Service','Branch','Appt Date','Appt Time','Staff','Incentive','Status','Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 600, color: blue, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '48px', textAlign: 'center', fontSize: '14px', fontWeight: 500, color: blue, opacity: 0.4 }}>No referrals found.</td>
                </tr>
              ) : (
                filteredReferrals.map((ref) => (
                  <tr key={ref.id} style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fbff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 500, color: blue, opacity: 0.55 }}>{formatDate(ref.date)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: blue, margin: '0 0 2px 0' }}>{ref.patient_name}</p>
                      <p style={{ fontSize: '11px', fontWeight: 500, color: blue, opacity: 0.5, margin: 0 }}>{ref.patient_phone}</p>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 500, color: blue, opacity: 0.75 }}>{ref.service_name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 500, color: blue, opacity: 0.75 }}>{ref.branch || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: blue }}>{formatDate(ref.appointment_date)}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 500, color: blue, opacity: 0.75 }}>{ref.booking_time || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 500, color: blue, opacity: 0.75 }}>{staffList?.find(s => String(s.id) === String(ref.staff_id))?.name || ref.staff_name || 'Direct Walk-in'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: blue }}>{clinicProfile?.currency || 'RM'} {ref.commission_amount?.toFixed(2) || '0.00'}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={getStatusColor(ref.status)}
                        style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {getStatusLabel(ref.status)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {(() => {
                        const actions = getAvailableActions(ref);
                        if (actions.length === 0) return null;
                        return (
                          <select defaultValue=""
                            onChange={(e) => { if (e.target.value) { setPendingStatusUpdate({ id: ref.id, status: e.target.value }); e.target.value = ''; } }}
                            style={selectStyle}>
                            <option value="" disabled>Action...</option>
                            {actions.map(a => <option key={a.status} value={a.status}>{a.label}</option>)}
                          </select>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Confirm modal ── */}
      <AnimatePresence>
        {pendingStatusUpdate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
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
    </motion.div>
  );
};
export default ReferralBoard;
