import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'react-hot-toast';
import { 
  Share2, Heart, TrendingUp, Users, DollarSign, Gift, 
  Plus, Trash2, X, Info
} from 'lucide-react';

export interface AmbassadorDashboardProps {
  currentUser: any;
  referrals: any[];
  clinicProfile: any;
  apiBaseUrl: string;
  safeFetch: (url: string, options?: RequestInit, retries?: number, backoff?: number) => Promise<{ res: Response, data: any }>;
  currentUserStats?: any;
}

export const AmbassadorDashboard: React.FC<AmbassadorDashboardProps> = ({
  currentUser,
  referrals,
  clinicProfile,
  apiBaseUrl,
  safeFetch,
  currentUserStats
}) => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [charityRows, setCharityRows] = useState([{ name: '', amount: '' }]);

  const P = "'Poppins', sans-serif";
  const blue = '#1580c2';

  const mode = currentUser.incentive_mode || 'discount';

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      try {
        const { res, data } = await safeFetch(`${apiBaseUrl}/api/ambassador/${currentUser.id}/dashboard`);
        if (res.ok) {
          setDashboardData(data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (currentUser?.id) {
      fetchDashboard();
    }
  }, [currentUser, apiBaseUrl, safeFetch]);

  const handleShare = () => {
    const url = `https://arapower.vercel.app/book?ref=${currentUser.referral_code}`;
    if (navigator.share) {
      navigator.share({
        title: 'Book Appointment',
        text: `Book an appointment with ${clinicProfile.name} using my referral code!`,
        url: url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Referral link copied!');
    }
  };

  const handleAddRow = () => {
    if (charityRows.length < 5) {
      setCharityRows([...charityRows, { name: '', amount: '' }]);
    }
  };

  const handleRemoveRow = (index: number) => {
    setCharityRows(charityRows.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, key: 'name' | 'amount', value: string) => {
    const newRows = [...charityRows];
    newRows[index] = { ...newRows[index], [key]: value };
    setCharityRows(newRows);
  };

  const currentPot = currentUser.charity_pot || 0;
  const totalRequested = charityRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const remainingPot = currentPot - totalRequested;
  
  const pendingRequest = dashboardData?.donation_requests?.find((r: any) => r.status === 'pending');

  const submitDonationRequest = async () => {
    if (totalRequested <= 0) {
      toast.error('Please request an amount greater than 0');
      return;
    }
    if (remainingPot < 0) {
      toast.error('Insufficient funds in Charity Pot');
      return;
    }
    const cleanRows = charityRows.filter(r => r.name.trim() && Number(r.amount) > 0).map(r => ({ ...r, amount: Number(r.amount) }));
    if (cleanRows.length === 0) {
      toast.error('Please enter valid charity names and amounts');
      return;
    }
    
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/donation-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ambassador_id: currentUser.id,
          requested_charities: cleanRows
        })
      });
      if (res.ok) {
        toast.success('Donation request submitted!');
        setShowDonationModal(false);
        setCharityRows([{ name: '', amount: '' }]);
        // Refresh dashboard data
        const { res: dRes, data: dData } = await safeFetch(`${apiBaseUrl}/api/ambassador/${currentUser.id}/dashboard`);
        if (dRes.ok) setDashboardData(dData);
      } else {
        toast.error(data.error || 'Failed to submit request');
      }
    } catch (err) {
      toast.error('An error occurred');
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading dashboard...</div>;
  }

  const renderRecentReferrals = () => {
    const recent = referrals.slice(0, 5);
    if (recent.length === 0) {
      return <div className="text-center py-8 opacity-50 font-medium">No referrals yet</div>;
    }
    return (
      <div className="space-y-3 mt-4">
        {recent.map(ref => (
          <div key={ref.id} className="p-4 bg-white/50 border border-white/20 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-[#1580c2]">{ref.patient_name}</p>
              <p className="text-xs text-[#1580c2]/60">{new Date(ref.created_at).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <span className={`text-xs px-2 py-1 rounded-full text-white font-semibold ${ref.status === 'completed' || ref.status === 'payment_made' ? 'bg-green-500' : 'bg-amber-500'}`}>
                {ref.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: P }} className="space-y-6 pb-20">
      
      <AnimatePresence mode="wait">
        {/* === DISCOUNT MODE === */}
        {mode === 'discount' && (
          <motion.div
            key="discount"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#1580c2] text-white p-6 rounded-[2rem] flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl"><Users size={24} /></div>
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-70 font-semibold mb-1">Total Referrals</p>
                  <h3 className="text-3xl font-black">{dashboardData?.total_referrals || 0}</h3>
                </div>
              </div>
              <div className="bg-[#1580c2] text-white p-6 rounded-[2rem] flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl"><Gift size={24} /></div>
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-70 font-semibold mb-1">Savings Given</p>
                  <h3 className="text-3xl font-black">{clinicProfile?.currency || 'RM'}{dashboardData?.total_savings_given?.toFixed(2) || '0.00'}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col items-center">
              <h3 className="font-bold text-[#1580c2] mb-4">Your Ambassador Link</h3>
              <div className="p-2 border border-gray-200 rounded-2xl mb-4 bg-white/50">
                 <QRCodeCanvas value={`https://arapower.vercel.app/book?ref=${currentUser.referral_code}`} size={160} />
              </div>
              <p className="text-xs text-[#1580c2]/60 bg-gray-100 px-3 py-1 rounded-full mb-4 font-mono truncate max-w-full">
                arapower.vercel.app/book?ref={currentUser.referral_code}
              </p>
              <button onClick={handleShare} className="bg-[#1580c2] text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 active:scale-95 transition-transform w-[240px] justify-center">
                <Share2 size={18} /> Share Link & QR
              </button>
            </div>

            <div className="bg-[#f8fafc] p-6 rounded-[2rem]">
              <h3 className="font-bold text-[#1580c2]">Recent Referrals</h3>
              {renderRecentReferrals()}
            </div>
          </motion.div>
        )}

        {/* === CHARITY MODE === */}
        {mode === 'charity' && (
          <motion.div
            key="charity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Pot Display */}
            <div className="bg-[#1580c2] text-white p-8 rounded-[2rem] text-center relative overflow-hidden">
               <div className="absolute -top-10 -right-10 opacity-10"><Heart size={200} /></div>
               <p className="text-xs uppercase tracking-widest opacity-70 font-semibold mb-2 relative z-10">Charity Pot</p>
               <h2 className="text-5xl font-black relative z-10">{clinicProfile?.currency || 'RM'}{currentPot.toFixed(2)}</h2>
               
               <div className="mt-8 bg-white/10 rounded-2xl p-4 text-left relative z-10">
                 <div className="flex justify-between items-center mb-4">
                   <p className="text-sm font-semibold opacity-90">Active Donation Request:</p>
                   {pendingRequest ? (
                     <span className="text-xs bg-amber-500 px-2 py-1 rounded-full font-bold uppercase tracking-wider">Pending</span>
                   ) : (
                     <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-bold uppercase tracking-wider">None</span>
                   )}
                 </div>
                 
                 <button 
                   onClick={() => setShowDonationModal(true)}
                   disabled={!!pendingRequest}
                   className={`w-full py-3 rounded-full font-bold flex items-center justify-center gap-2 transition-all ${pendingRequest ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-white text-[#1580c2] hover:bg-gray-50 active:scale-95'}`}
                 >
                   <Heart size={18} /> Make Donation Request
                 </button>
               </div>
            </div>

            {/* Charities Breakdown */}
            <div className="bg-white px-6 py-6 rounded-[2rem] shadow-sm border border-gray-100">
              <h3 className="font-bold text-[#1580c2] mb-4 flex items-center gap-2"><DollarSign size={18}/> Your Supported Charities</h3>
              <div className="space-y-3">
                {Array.isArray(currentUser.charities) && currentUser.charities.length > 0 ? (
                  currentUser.charities.map((ch: any, i: number) => (
                    <div key={i} className="flex flex-col sm:flex-row justify-between p-4 bg-[#f8fafc] rounded-2xl border border-gray-200 gap-2">
                       <span className="font-semibold text-[#1580c2]">{ch.name}</span>
                       <span className="text-sm text-[#1580c2]/70 font-medium whitespace-nowrap bg-white px-3 py-1 rounded-full border border-gray-100">
                         {clinicProfile?.currency || 'RM'}{ch.amount_per_referral} / referral → {clinicProfile?.currency || 'RM'}{(ch.amount_per_referral * (dashboardData?.completed_referrals || 0)).toFixed(2)}
                       </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm opacity-50 px-2">No charities added yet.</p>
                )}
              </div>
            </div>

            {/* History */}
            <div className="bg-[#f8fafc] p-6 rounded-[2rem]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <h3 className="font-bold text-[#1580c2]">Donation History</h3>
                <div className="text-xs font-semibold text-[#1580c2]/80 bg-white px-3 py-1.5 rounded-full border border-gray-100">
                  <span className="opacity-80">Total donated:</span> {clinicProfile?.currency || 'RM'}{(dashboardData?.donation_requests?.filter((r: any) => r.status === 'completed').reduce((sum: number, r: any) => sum + r.total_amount, 0) || 0).toFixed(2)} 
                  <span className="mx-2 opacity-30">|</span> 
                  <span className="opacity-80">Pending:</span> {clinicProfile?.currency || 'RM'}{(dashboardData?.donation_requests?.filter((r: any) => r.status === 'pending').reduce((sum: number, r: any) => sum + r.total_amount, 0) || 0).toFixed(2)}
                </div>
              </div>
              {dashboardData?.donation_requests && dashboardData.donation_requests.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.donation_requests.map((req: any) => (
                    <div key={req.id} className="p-4 bg-white border border-[#1580c2]/10 rounded-2xl flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm text-[#1580c2]">{new Date(req.submitted_at).toLocaleDateString()}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${req.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {req.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-xs text-gray-500 font-mono">Ref: {req.id.split('-')[0]}</span>
                        <span className="font-black text-[#1580c2] text-lg">{clinicProfile?.currency || 'RM'}{req.total_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm opacity-50 px-2">No requests yet.</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100">
              <h3 className="font-bold text-[#1580c2]">Recent Referrals</h3>
              {renderRecentReferrals()}
            </div>
          </motion.div>
        )}

        {/* === EARN MODE === */}
        {mode === 'earn' && (
          <motion.div
            key="earn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-[#1580c2] text-white p-6 sm:p-8 rounded-[2rem] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/4 translate-x-1/4 blur-2xl" />
               <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-end gap-6">
                 <div>
                   <p className="text-xs uppercase tracking-widest opacity-70 font-semibold mb-1">Lifetime Earnings</p>
                   <h2 className="text-4xl sm:text-5xl font-black mb-4">{clinicProfile?.currency || 'RM'}{(currentUserStats?.earned || 0).toFixed(0)}</h2>
                   
                   <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-full inline-flex">
                     <TrendingUp size={16} />
                     <span className="text-sm font-semibold">{currentUserStats?.tier?.name || 'Bronze'} Tier ({(currentUserStats?.tier?.bonus || 1)}x Multiplier)</span>
                   </div>
                 </div>

                 <div className="bg-white/10 p-4 rounded-2xl min-w-[140px]">
                   <p className="text-xs opacity-70 font-medium mb-1 uppercase tracking-wider">This Month</p>
                   <p className="text-2xl font-bold">{currentUserStats?.monthlySuccessfulRefs || 0} <span className="text-sm font-normal opacity-80">Referrals</span></p>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#f8fafc] p-5 rounded-3xl border border-gray-100 flex flex-col items-center text-center">
                <div className="bg-[#1580c2]/10 p-3 rounded-full mb-3"><Users className="text-[#1580c2]" size={20} /></div>
                <h4 className="font-bold text-lg text-[#1580c2]">{currentUserStats?.monthlySuccessfulRefs || 0}</h4>
                <p className="text-[10px] uppercase tracking-wider font-semibold opacity-60 text-[#1580c2]">Monthly Referrals</p>
              </div>
              <div className="bg-[#f8fafc] p-5 rounded-3xl border border-gray-100 flex flex-col items-center text-center">
                <div className="bg-[#1580c2]/10 p-3 rounded-full mb-3"><DollarSign className="text-[#1580c2]" size={20} /></div>
                <h4 className="font-bold text-lg text-[#1580c2]">{clinicProfile?.currency || 'RM'}{(currentUser.pending_earnings || 0).toFixed(0)}</h4>
                <p className="text-[10px] uppercase tracking-wider font-semibold opacity-60 text-[#1580c2]">Pending Commission</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col items-center">
              <h3 className="font-bold text-[#1580c2] mb-4">Your Affiliate Link</h3>
              <div className="p-2 border border-gray-200 rounded-2xl mb-4 bg-white/50">
                 <QRCodeCanvas value={`https://arapower.vercel.app/book?ref=${currentUser.referral_code}`} size={160} />
              </div>
              <p className="text-xs text-[#1580c2]/60 bg-gray-100 px-3 py-1 rounded-full mb-4 font-mono truncate max-w-full">
                arapower.vercel.app/book?ref={currentUser.referral_code}
              </p>
              <button 
                onClick={handleShare} 
                className="bg-[#1580c2] text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 active:scale-95 transition-transform w-[240px] justify-center shadow-lg shadow-[#1580c2]/30"
              >
                <Share2 size={18} /> Share Link
              </button>
            </div>

            <div className="bg-[#f8fafc] p-6 rounded-[2rem]">
              <h3 className="font-bold text-[#1580c2]">Recent Referrals</h3>
              {renderRecentReferrals()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === DONATION MODAL === */}
      <AnimatePresence>
        {showDonationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: P }}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDonationModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="bg-[#1580c2] p-6 text-white relative">
                <button onClick={() => setShowDonationModal(false)} className="absolute top-6 right-6 p-1 bg-white/20 rounded-full active:scale-95 transition-transform hover:bg-white/30">
                  <X size={18} />
                </button>
                <h3 className="text-xl font-bold mb-2">Make Donation Request</h3>
                <p className="text-sm bg-white/20 inline-block px-3 py-1 rounded-full font-semibold">Available pot: {clinicProfile?.currency || 'RM'}{currentPot.toFixed(2)}</p>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-4 bg-gray-50 flex-1">
                <p className="text-xs text-[#1580c2] opacity-70 font-semibold uppercase tracking-wider mb-2">Charities to allocate</p>
                
                {charityRows.map((row, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
                    <input 
                      type="text" 
                      placeholder="Charity Name" 
                      value={row.name}
                      onChange={(e) => handleRowChange(index, 'name', e.target.value)}
                      className="flex-1 w-1/2 bg-transparent border-none focus:outline-none px-2 py-1 text-sm text-[#1580c2] font-semibold"
                    />
                    <div className="w-px h-6 bg-gray-200 shrink-0" />
                    <span className="text-xs font-bold text-gray-400 pl-2 shrink-0">{clinicProfile?.currency || 'RM'}</span>
                    <input 
                      type="number" 
                      placeholder="Amount" 
                      value={row.amount}
                      onChange={(e) => handleRowChange(index, 'amount', e.target.value)}
                      className="w-20 bg-transparent border-none focus:outline-none px-2 py-1 text-sm font-bold text-[#1580c2] shrink-0"
                    />
                    {charityRows.length > 1 && (
                      <button onClick={() => handleRemoveRow(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                
                {charityRows.length < 5 && (
                  <button 
                    onClick={handleAddRow}
                    className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-[#1580c2] border-2 border-dashed border-[#1580c2]/30 rounded-2xl active:bg-[#1580c2]/5 transition-colors"
                  >
                    <Plus size={16} /> Add Charity
                  </button>
                )}
              </div>

              <div className="p-6 bg-white border-t border-gray-100">
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm font-semibold text-[#1580c2]/70">
                    <span>Total requested:</span>
                    <span className="text-[#1580c2]">{clinicProfile?.currency || 'RM'}{totalRequested.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[#1580c2]">
                    <span>Remaining pot:</span>
                    <span className={remainingPot < 0 ? 'text-red-500' : ''}>{clinicProfile?.currency || 'RM'}{remainingPot.toFixed(2)}</span>
                  </div>
                </div>
                
                <button 
                  onClick={submitDonationRequest}
                  disabled={totalRequested <= 0 || remainingPot < 0}
                  className="w-full bg-[#1580c2] text-white py-4 rounded-full font-black text-lg active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  Submit Request
                </button>
                {remainingPot < 0 && (
                  <p className="text-center text-red-500 text-xs font-semibold mt-3 flex items-center justify-center gap-1">
                    <Info size={12}/> Exceeds available pot
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
