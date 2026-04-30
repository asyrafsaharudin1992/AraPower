import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Share2, 
  Copy, 
  ExternalLink, 
  MessageCircle, 
  ChevronRight, 
  Lock, 
  Info,
  TrendingUp,
  Award
} from 'lucide-react';
import { format } from 'date-fns';

interface NetworkTabProps {
  currentUser: any;
  apiBaseUrl: string;
  safeFetch: (url: string, options?: RequestInit) => Promise<{ res: Response; data: any }>;
  clinicProfile: any;
}

const NetworkTab: React.FC<NetworkTabProps> = ({ 
  currentUser, 
  apiBaseUrl, 
  safeFetch, 
  clinicProfile 
}) => {
  const [downlines, setDownlines] = useState<any[]>([]);
  const [recruitStats, setRecruitStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const recruiterCode = currentUser.referral_code || currentUser.id;
  const recruitLink = `${window.location.origin}${window.location.pathname}?recruiter=${recruiterCode}`;

  useEffect(() => {
    fetchNetworkData();
  }, [currentUser.id]);

  const fetchNetworkData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Eligibility/Status
      const recruitRes = await safeFetch(`${apiBaseUrl}/api/network/recruit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliate_id: currentUser.id })
      });

      if (recruitRes.res.ok) {
        setRecruitStats(recruitRes.data);
      }

      // 2. Fetch Downlines
      const downlinesRes = await safeFetch(`${apiBaseUrl}/api/network/downlines/${currentUser.id}`);
      if (downlinesRes.res.ok) {
        setDownlines(downlinesRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch network data:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(recruitLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const message = `Join me as an affiliate for ${clinicProfile.name}! Register here: ${recruitLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const totalOverrideEarned = downlines.reduce((sum, dl) => sum + (dl.total_override_earned || 0), 0);
  const currency = clinicProfile.currency || 'RM';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-[#1580c2] border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 font-bold text-sm">Loading network...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* ── RECRUIT LINK SECTION ── */}
      <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-zinc-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1580c2]">
            <Share2 size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#1580c2]">Your Recruit Link</h3>
            <p className="text-[10px] font-bold text-zinc-400">Share this link to build your downline team.</p>
          </div>
        </div>

        <div className="bg-zinc-50 rounded-2xl p-4 mb-6 border border-zinc-100">
          <p className="text-[11px] font-mono text-zinc-500 break-all mb-4 text-center">
            {recruitLink}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={copyToClipboard}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${
                copied ? 'bg-green-500 text-white' : 'bg-[#1580c2] text-white hover:bg-[#0d5a8a]'
              }`}
            >
              {copied ? <><Award size={14} /> COPIED</> : <><Copy size={14} /> COPY LINK</>}
            </button>
            <button 
              onClick={shareOnWhatsApp}
              className="flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-xs font-black hover:bg-[#1ebc56] transition-all"
            >
              <MessageCircle size={14} /> WHATSAPP
            </button>
          </div>
        </div>

        {recruitStats && (
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {recruitStats.current} of {recruitStats.cap} slots used
              </span>
              <span className="text-[10px] font-black text-[#1580c2]">
                {Math.round((recruitStats.current / recruitStats.cap) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(recruitStats.current / recruitStats.cap) * 100}%` }}
                className="h-full bg-gradient-to-r from-[#1580c2] to-[#3b82f6]"
              />
            </div>
            {recruitStats.cap < 50 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-700">
                <Lock size={14} />
                <p className="text-[10px] font-bold">
                  Unlock 50 slots: Complete {recruitStats.cap >= 10 ? 'more' : (10)} referrals
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── NETWORK LIST SECTION ── */}
      <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-zinc-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">Your Network</h3>
              <p className="text-[10px] font-bold text-zinc-400">{downlines.length} active downlines</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Earned</p>
            <p className="text-lg font-black text-[#1580c2] tracking-tighter">
              {currency} {totalOverrideEarned.toFixed(2)}
            </p>
          </div>
        </div>

        {downlines.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200 mb-4">
              <Users size={32} />
            </div>
            <p className="text-sm font-bold text-zinc-400 mb-1">No downlines yet</p>
            <p className="text-xs text-zinc-300 max-w-[200px]">
              Share your recruit link to start building your network.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {downlines.map((dl) => {
              const caseCount = dl.upline_cases_count || 0;
              const limit = recruitStats?.settings?.override_case_limit || 20;
              const progress = Math.min((caseCount / limit) * 100, 100);
              const isActive = dl.is_active;

              return (
                <div 
                  key={dl.id}
                  className={`p-4 rounded-3xl border transition-all ${
                    isActive 
                      ? 'bg-white border-zinc-100 shadow-sm' 
                      : 'bg-zinc-50 border-zinc-100 grayscale opacity-70'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-black text-zinc-900 text-sm leading-tight">{dl.name}</h4>
                      <p className="text-[10px] font-bold text-zinc-400">{dl.referral_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-[#1580c2]">
                        {currency} {(dl.total_override_earned || 0).toFixed(2)}
                      </p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Override</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className={`text-[9px] font-bold ${isActive ? 'text-[#1580c2]' : 'text-zinc-400'}`}>
                        {isActive ? `Override active · ${limit - caseCount} cases remaining` : 'Override period ended'}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400">
                        {caseCount}/{limit}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${isActive ? 'bg-[#1580c2]' : 'bg-zinc-300'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── INFO SECTION ── */}
      <div className="bg-[#1580c2]/5 rounded-3xl p-6 border border-[#1580c2]/10">
        <div className="flex gap-4">
          <Info size={18} className="text-[#1580c2] shrink-0" />
          <div className="space-y-2">
            <h4 className="text-xs font-black text-[#1580c2] uppercase tracking-widest">Network Rules</h4>
            <ul className="text-[10px] font-semibold text-zinc-500 space-y-1.5 list-disc pl-4">
              <li>Earn {recruitStats?.settings?.override_percentage || 20}% override from every referral completed by your downline.</li>
              <li>Override is active for the first {recruitStats?.settings?.override_case_limit || 20} cases of each downline.</li>
              <li>Your initial downline capacity is {recruitStats?.settings?.downline_cap_base || 5} slots.</li>
              <li>Complete {recruitStats?.settings?.downline_cap_unlock_threshold || 10} personal referrals to unlock {recruitStats?.settings?.downline_cap_unlocked || 50} downline slots.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkTab;
