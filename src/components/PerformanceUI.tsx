import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MousePointerClick, Users, TrendingUp, Megaphone, Share2, Trophy } from 'lucide-react';
import { supabase } from '../supabase';

interface PerformanceUIProps {
  currentUser: any;
  referrals: any[];
  branches?: any[];
  staffList?: any[];
  services?: any[];
}

const TIERS = [
  { name: 'Bronze', min: 0,  max: 5,  next: 'Silver', bonus: '×1.0', textColor: '#1580c2', bg: '#f0f9ff', border: '#bae6fd', bar: '#38bdf8' },
  { name: 'Silver', min: 6,  max: 10, next: 'Gold',   bonus: '×1.2', textColor: '#0c4a6e', bg: '#e0f2fe', border: '#7dd3fc', bar: '#0284c7' },
  { name: 'Gold',   min: 11, max: 999,next: null,      bonus: '×1.5', textColor: '#075985', bg: '#eff6ff', border: '#60a5fa', bar: '#1580c2' },
];

const getGrade = (rate: number) => {
  if (rate >= 15) return { label: 'Excellent',     textColor: '#0c4a6e', bg: '#f0f9ff', border: '#bae6fd', bar: '#1580c2' };
  if (rate >= 5)  return { label: 'Good form',     textColor: '#1580c2', bg: '#f8fafc', border: '#e2e8f0', bar: '#38bdf8' };
  return              { label: 'Keep sharing',   textColor: '#475569', bg: '#f1f5f9', border: '#cbd5e1', bar: '#94a3b8' };
};

const getMotivation = (clicks: number, refs: number, rate: number) => {
  if (refs === 0 && clicks === 0) return { text: "Let's get your first click!", sub: "Share your link today.", emoji: '🚀' };
  if (refs === 0)                 return { text: `${clicks} people checked your link!`, sub: "Turn those clicks into bookings.", emoji: '👀' };
  if (rate >= 15)                 return { text: "You're on fire!",      sub: "Your network trusts you.", emoji: '🔥' };
  if (rate >= 5)                  return { text: "Solid performance!",   sub: "Push for the next tier.", emoji: '💪' };
  return                                 { text: "Good start!",          sub: "Keep sharing — you're building momentum.", emoji: '⭐' };
};

const BADGES = [
  { id: 'first_click', emoji: '👆', label: 'First click',  unlock: (_r: number, c: number) => c >= 1 },
  { id: 'first_ref',   emoji: '🎯', label: 'First ref',    unlock: (r: number) => r >= 1 },
  { id: 'five_refs',   emoji: '🔥', label: '5 refs',       unlock: (r: number) => r >= 5 },
  { id: 'ten_refs',    emoji: '⚡', label: '10 refs',      unlock: (r: number) => r >= 10 },
  { id: 'sharp',       emoji: '🎯', label: 'Sharp shooter', unlock: (r: number, c: number, rate: number) => rate >= 15 },
  { id: 'gold',        emoji: '👑', label: 'Gold tier',    unlock: (r: number) => r >= 11 },
];

const COMPLETED_STATUSES = ['completed', 'payment_approved', 'payment_made'];

const NoData: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-10 opacity-60">
    <Share2 size={32} className="mx-auto mb-2 text-[#1580c2]" />
    <p className="text-sm font-medium text-[#1580c2]">{message}</p>
  </div>
);

export const PerformanceUI: React.FC<PerformanceUIProps> = ({ 
  currentUser, 
  referrals, 
  branches = [], 
  staffList = [], 
  services = [] 
}) => {
  const [stats, setStats] = useState({ clicks: 0, referrals: 0, rate: 0 });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [clicksByAffiliate, setClicksByAffiliate] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'service' | 'affiliate' | 'location'>('overview');

  const completedRefs = referrals.filter(r =>
    r.status?.toLowerCase() === 'payment_made'
  ).length;

  const currentTier = TIERS.find(t => completedRefs >= t.min && completedRefs <= t.max) || TIERS[0];
  const nextTier    = TIERS.find(t => t.name === currentTier.next);
  const toNext      = nextTier ? nextTier.min - completedRefs : 0;
  const progress    = nextTier ? Math.min(((completedRefs - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100) : 100;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
  const motivation = isAdmin 
    ? { text: "Clinic Performance Overview", sub: "Monitoring growth and conversion across all channels.", emoji: '📊' }
    : getMotivation(stats.clicks, stats.referrals, stats.rate);
  
  const grade       = getGrade(stats.rate);
  const unlockedCount = BADGES.filter(b => b.unlock(stats.referrals, stats.clicks, stats.rate)).length;

  useEffect(() => {
    const load = async () => {
      const effectiveCode = currentUser.referral_code || String(currentUser.id || '');
      if (!isAdmin && !effectiveCode) return;
      
      setIsLoading(true);
      try {
        const tableName = 'booking_analytics';
        let query = supabase.from(tableName).select('*');
        if (!isAdmin) {
          query = query.or(`referral_code.eq."${currentUser.referral_code || '___none___'}",referral_code.eq."${currentUser.id}"`);
        }
        
        let result = await query;

        if (result.error && (result.error.message.includes('not found') || result.error.message.includes('relation'))) {
           let singularQuery = supabase.from('booking_analytic').select('*');
           if (!isAdmin) {
             singularQuery = singularQuery.or(`referral_code.eq."${currentUser.referral_code || '___none___'}",referral_code.eq."${currentUser.id}"`);
           }
           const singularResult = await singularQuery;
           if (!singularResult.error) result = singularResult;
        }

        if (!result.error && result.data) {
          const clicks       = result.data.filter(e => e.event_type === 'clicked_tempah').length;
          const successRefs  = referrals.filter(r => COMPLETED_STATUSES.includes(r.status?.toLowerCase())).length;
          const rate         = clicks > 0 ? (successRefs / clicks) * 100 : 0;
          setStats({ clicks, referrals: successRefs, rate });

          const map: Record<string, any> = {};
          const getNormalizedKey = (name: string) => name.trim().toLowerCase();

          referrals.forEach(ref => {
            const rawName = ref.service_name || 'General Link';
            const key = getNormalizedKey(rawName);
            if (!map[key]) map[key] = { name: rawName.trim(), clicks: 0, refs: 0 };
            if (COMPLETED_STATUSES.includes(ref.status?.toLowerCase())) map[key].refs++;
          });
          
          result.data.forEach(ev => {
            if (ev.event_type === 'clicked_tempah') {
              const rawName = ev.service_name || 'General Link';
              const key = getNormalizedKey(rawName);
              if (!map[key]) map[key] = { name: rawName.trim(), clicks: 0, refs: 0 };
              map[key].clicks++;
            }
          });
          setCampaigns(
            Object.values(map)
              .map(s => ({ ...s, rate: s.clicks > 0 ? (s.refs / s.clicks) * 100 : 0 }))
              .sort((a, b) => b.clicks - a.clicks)
          );

          if (isAdmin) {
            const affClicks: Record<string, number> = {};
            result.data.forEach(ev => {
              if (ev.event_type === 'clicked_tempah' && ev.referral_code) {
                const code = String(ev.referral_code);
                affClicks[code] = (affClicks[code] || 0) + 1;
              }
            });
            setClicksByAffiliate(affClicks);
          }
        }
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    load();
  }, [currentUser.referral_code, currentUser.id, currentUser.role, referrals, isAdmin]);

  const adminStatsByService = React.useMemo(() => {
    if (!isAdmin) return [];
    const map: Record<string, any> = {};
    referrals.filter(r => COMPLETED_STATUSES.includes(r.status?.toLowerCase())).forEach(ref => {
      const name = ref.service_name || 'Unspecified';
      if (!map[name]) map[name] = { name, count: 0 };
      map[name].count++;
    });
    return Object.values(map).sort((a: any, b: any) => b.count - a.count);
  }, [referrals, isAdmin]);

  const adminStatsByAffiliate = React.useMemo(() => {
    if (!isAdmin) return [];
    const map: Record<string, any> = {};
    
    // Process Conversions (Referrals)
    referrals.filter(r => COMPLETED_STATUSES.includes(r.status?.toLowerCase())).forEach(ref => {
      const staffId = String(ref.staff_id || ref.affiliate_id || '');
      if (!staffId) return;
      if (!map[staffId]) {
        const staff = staffList.find(s => 
          String(s.id) === staffId || 
          String(s.referral_code) === staffId || 
          String(s.email) === staffId
        );
        map[staffId] = { 
          id: staffId,
          name: staff?.name || (staffId.length > 15 ? `${staffId.substring(0, 8)}...` : staffId), 
          fullName: staff?.name || staffId,
          email: staff?.email,
          branch: staff?.branch || ref.branch,
          count: 0,
          clicks: 0
        };
      }
      map[staffId].count++;
    });

    // Add Clicks
    Object.entries(clicksByAffiliate).forEach(([code, count]) => {
      if (!map[code]) {
        const staff = staffList.find(s => String(s.id) === code || String(s.referral_code) === code || String(s.email) === code);
        map[code] = {
          id: code,
          name: staff?.name || (code.length > 15 ? `${code.substring(0, 8)}...` : code),
          fullName: staff?.name || code,
          email: staff?.email,
          branch: staff?.branch,
          count: 0,
          clicks: count
        };
      } else {
        map[code].clicks = count;
      }
    });

    return Object.values(map)
      .map((a: any) => ({
        ...a,
        rate: a.clicks > 0 ? (a.count / a.clicks) * 100 : 0
      }))
      .sort((a: any, b: any) => {
        // Sort by conversions first, then clicks
        if (b.count !== a.count) return b.count - a.count;
        return b.clicks - a.clicks;
      });
  }, [referrals, staffList, isAdmin, clicksByAffiliate]);

  const adminStatsByLocation = React.useMemo(() => {
    if (!isAdmin) return [];
    const map: Record<string, any> = {};
    referrals.filter(r => COMPLETED_STATUSES.includes(r.status?.toLowerCase())).forEach(ref => {
      const branchName = ref.branch || 'Online/General';
      if (!map[branchName]) map[branchName] = { name: branchName, count: 0 };
      map[branchName].count++;
    });
    return Object.values(map).sort((a: any, b: any) => b.count - a.count);
  }, [referrals, isAdmin]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pb-20">
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      <div style={{ background: '#1580c2', borderRadius: '20px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0 }}>{motivation.text}</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', margin: '2px 0 0', fontFamily: 'inherit' }}>{motivation.sub}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLoading && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: 'pulse 1.5s ease-in-out infinite' }} />}
          <span style={{ fontSize: 24, lineHeight: 1 }}>{motivation.emoji}</span>
        </div>
      </div>

      {isAdmin && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'service', label: 'By Service', icon: Megaphone },
            { id: 'affiliate', label: 'By Affiliate', icon: Users },
            { id: 'location', label: 'By Location', icon: Share2 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setAdminSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                adminSubTab === tab.id 
                ? 'bg-[#1580c2] text-white shadow-md' 
                : 'bg-white text-[#1580c2] border border-[#1580c2]/10 hover:bg-[#1580c2]/5'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {adminSubTab === 'overview' && (
        <>
          {!isAdmin && (
            <div style={{ background: currentTier.bg, border: `0.5px solid ${currentTier.border}`, borderRadius: '16px', padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: currentTier.textColor }}>
                  {currentTier.name} · {currentTier.bonus} bonus
                </span>
                {nextTier
                  ? <span style={{ fontSize: 11, color: currentTier.textColor }}>{toNext} more to {nextTier.name} 👑</span>
                  : <span style={{ fontSize: 11, fontWeight: 700, color: currentTier.textColor }}>Maximum tier! 👑</span>
                }
              </div>
              <div style={{ height: 5, background: currentTier.border, borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
                  style={{ height: '100%', background: currentTier.bar, borderRadius: 99 }}
                />
              </div>
              {nextTier && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontSize: 9, color: currentTier.textColor, opacity: 0.6 }}>{currentTier.name} ({currentTier.min})</span>
                  <span style={{ fontSize: 9, color: currentTier.textColor, opacity: 0.6 }}>{nextTier.name} ({nextTier.min})</span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="bg-white rounded-2xl border border-[#1580c2]/5 p-3 shadow-sm">
              <p style={{ fontSize: 10, color: '#1580c2', opacity: 0.6, margin: '0 0 4px', letterSpacing: '0.05em' }}>{isAdmin ? 'TOTAL CLICKS' : 'CLICKS'}</p>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                style={{ fontSize: 28, fontWeight: 700, color: '#0c4a6e', margin: 0, lineHeight: 1 }}
              >{stats.clicks}</motion.p>
              <p style={{ fontSize: 10, color: '#1580c2', opacity: 0.5, margin: '4px 0 0' }}>{isAdmin ? 'all affiliate links' : 'your links'}</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#1580c2]/5 p-3 shadow-sm">
              <p style={{ fontSize: 10, color: '#1580c2', opacity: 0.6, margin: '0 0 4px', letterSpacing: '0.05em' }}>{isAdmin ? 'TOTAL REFERRALS' : 'REFERRALS'}</p>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                style={{ fontSize: 28, fontWeight: 700, color: '#0c4a6e', margin: 0, lineHeight: 1 }}
              >{stats.referrals}</motion.p>
              <p style={{ fontSize: 10, color: '#1580c2', opacity: 0.5, margin: '4px 0 0' }}>{isAdmin ? 'all completed visits' : `${completedRefs} incentives earned`}</p>
            </div>
          </div>

          <div style={{ background: grade.bg, border: `0.5px solid ${grade.border}`, borderRadius: '16px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 10, color: grade.textColor, margin: '0 0 2px', letterSpacing: '0.05em' }}>CONVERSION</p>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                style={{ fontSize: 28, fontWeight: 700, color: grade.textColor, margin: 0, lineHeight: 1 }}
              >{stats.rate.toFixed(1)}%</motion.p>
            </div>
            <div style={{ background: grade.border, borderRadius: 99, padding: '4px 12px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: grade.textColor }}>{grade.label}</span>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-[#1580c2]/5 rounded-2xl p-4 border border-[#1580c2]/10">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="text-[#1580c2]" size={20} />
                <div>
                  <p className="text-sm font-bold text-[#0c4a6e]">Global Overview</p>
                  <p className="text-xs text-[#1580c2]/60">Summary across all channels.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-[#1580c2]/5 shadow-sm">
                  <p className="text-[10px] font-bold text-[#1580c2]/40 uppercase tracking-widest mb-1">Avg per Affiliate</p>
                  <p className="text-2xl font-black text-[#0c4a6e]">
                    {(stats.referrals / (staffList.filter(s => s.role === 'affiliate').length || 1)).toFixed(1)}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#1580c2]/5 shadow-sm">
                  <p className="text-[10px] font-bold text-[#1580c2]/40 uppercase tracking-widest mb-1">Active Staff</p>
                  <p className="text-2xl font-black text-[#0c4a6e]">{staffList.length}</p>
                </div>
              </div>
            </div>
          )}

          {!isAdmin && (
            <div className="bg-white rounded-2xl border border-[#1580c2]/5 p-3 shadow-sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ fontSize: 10, color: '#1580c2', opacity: 0.6, margin: 0, letterSpacing: '0.05em', fontWeight: 700 }}>CAMPAIGNS</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#38bdf8', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <span style={{ fontSize: 9, color: '#1580c2', opacity: 0.6, letterSpacing: '0.05em', fontWeight: 500 }}>LIVE</span>
                </div>
              </div>
              
              {campaigns.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {campaigns.map((c, i) => {
                    const g = getGrade(c.rate);
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 12, padding: '10px 12px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#0c4a6e' }}>{c.name}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: g.textColor }}>{c.rate.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: 3, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', background: g.bar, width: `${Math.min(c.rate * 5, 100)}%` }} />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <MousePointerClick size={10} className="text-[#1580c2] opacity-50" />
                            <span className="text-[10px] font-medium text-[#1580c2]/60">{c.clicks} clicks</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp size={10} className="text-[#1580c2] opacity-50" />
                            <span className="text-[10px] font-medium text-[#1580c2]/60">{c.refs} refs</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 bg-[#f0f9ff] rounded-xl border border-[#bae6fd]">
                  <p className="text-[10px] text-[#1580c2] font-medium">No active campaigns</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {isAdmin && adminSubTab === 'service' && (
        <div className="bg-white rounded-2xl border border-[#1580c2]/5 p-4 space-y-4 shadow-sm">
          <p className="text-[10px] text-[#1580c2] opacity-60 font-bold tracking-widest uppercase mb-2">PERFORMANCE BY SERVICE</p>
          {campaigns.length > 0 ? (
            <div className="space-y-3">
              {campaigns.map((s: any, i: number) => {
                const g = getGrade(s.rate);
                return (
                  <div key={i} className="flex flex-col p-3 bg-[#f8fafc] border border-[#1580c2]/5 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1580c2]/10 flex items-center justify-center text-[#1580c2]">
                          <Megaphone size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#0c4a6e]">{s.name}</p>
                          <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-tight">{s.refs} visits · {s.clicks} clicks</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#1580c2]">{s.rate.toFixed(1)}%</p>
                        <p className="text-[9px] font-bold text-[#1580c2]/50 uppercase">{g.label}</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(s.rate * 4, 100)}%` }}
                        className="h-full bg-[#1580c2]" 
                        style={{ backgroundColor: g.bar }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <NoData message="No service analytics yet" />
          )}
        </div>
      )}

      {isAdmin && adminSubTab === 'affiliate' && (
        <div className="bg-white rounded-2xl border border-black/5 p-4 space-y-4">
          <p className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase mb-2">TOP PERFORMING AFFILIATES</p>
          {adminStatsByAffiliate.length > 0 ? (
            <div className="space-y-3">
              {adminStatsByAffiliate.map((s: any, i: number) => (
                <div key={i} className="flex flex-col p-3 bg-white border border-[#1580c2]/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1580c2]/5 flex items-center justify-center text-[#1580c2]">
                        <Users size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0c4a6e]">{s.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-tight">{s.branch || 'General'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      {i === 0 && s.count > 0 && <span className="text-[8px] bg-[#1580c2]/10 text-[#1580c2] px-1.5 py-0.5 rounded-md font-bold mb-1 uppercase">Top</span>}
                      <p className="text-lg font-black text-[#1580c2] leading-none">{s.count}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase">Visits</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1580c2]/5">
                    <div className="flex items-center gap-2">
                      <MousePointerClick size={12} className="text-[#1580c2] opacity-40" />
                      <div>
                        <p className="text-[10px] font-bold text-[#0c4a6e] leading-none">{s.clicks}</p>
                        <p className="text-[8px] font-medium text-zinc-400 uppercase">Clicks</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={12} className="text-[#1580c2] opacity-40" />
                      <div>
                        <p className="text-[10px] font-bold text-[#0c4a6e] leading-none">{s.rate.toFixed(1)}%</p>
                        <p className="text-[8px] font-medium text-zinc-400 uppercase">Conv Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <NoData message="No affiliate data found" />
          )}
        </div>
      )}

      {isAdmin && adminSubTab === 'location' && (
        <div className="bg-white rounded-2xl border border-black/5 p-4 space-y-4">
          <p className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase mb-2">VISITS BY LOCATION</p>
          {adminStatsByLocation.length > 0 ? (
            <div className="space-y-4">
              {adminStatsByLocation.map((s: any, i: number) => (
                <div key={i} className="relative">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-[#0c4a6e]">{s.name}</span>
                    <span className="text-xs font-black text-[#1580c2]">{s.count}</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-50 rounded-full overflow-hidden border border-zinc-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.count / stats.referrals) * 100}%` }}
                      className="h-full bg-gradient-to-r from-[#1580c2] to-[#38bdf8] rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <NoData message="No location data found" />
          )}
        </div>
      )}
    </motion.div>
  );
};
