import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MousePointerClick, Users, TrendingUp, Megaphone, Share2, Trophy } from 'lucide-react';
import { supabase } from '../supabase';

interface PerformanceUIProps {
  currentUser: any;
  referrals: any[];
}

const TIERS = [
  { name: 'Bronze', min: 0,  max: 5,  next: 'Silver', bonus: '×1.0', textColor: '#b45309', bg: '#fffbeb', border: '#fde68a', bar: '#f59e0b' },
  { name: 'Silver', min: 6,  max: 10, next: 'Gold',   bonus: '×1.2', textColor: '#475569', bg: '#f8f9fb', border: '#e2e8f0', bar: '#94a3b8' },
  { name: 'Gold',   min: 11, max: 999,next: null,      bonus: '×1.5', textColor: '#b45309', bg: '#fffbeb', border: '#fde68a', bar: '#f59e0b' },
];

const getGrade = (rate: number) => {
  if (rate >= 15) return { label: 'Excellent',     textColor: '#166534', bg: '#f0fdf4', border: '#bbf7d0', bar: '#22c55e' };
  if (rate >= 5)  return { label: 'Good form',     textColor: '#3b6d11', bg: '#eaf3de', border: '#c0dd97', bar: '#639922' };
  return              { label: 'Keep sharing',   textColor: '#854f0b', bg: '#fffbeb', border: '#fde68a', bar: '#ef9f27' };
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

export const PerformanceUI: React.FC<PerformanceUIProps> = ({ currentUser, referrals }) => {
  const [stats, setStats] = useState({ clicks: 0, referrals: 0, rate: 0 });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      const isAdminUser = currentUser.role === 'admin' || currentUser.role === 'manager';
      const effectiveCode = currentUser.referral_code || String(currentUser.id || '');
      if (!isAdminUser && !effectiveCode) return;
      
      setIsLoading(true);
      try {
        const tableName = 'booking_analytics';
        let query = supabase.from(tableName).select('*');
        if (!isAdmin) {
          query = query.or(`referral_code.eq."${currentUser.referral_code || '___none___'}",referral_code.eq."${currentUser.id}"`);
        }
        
        let result = await query;

        // If table not found, try singular "booking_analytic"
        if (result.error && (result.error.message.includes('not found') || result.error.message.includes('relation'))) {
           let singularQuery = supabase.from('booking_analytic').select('*');
           if (!isAdmin) {
             singularQuery = singularQuery.or(`referral_code.eq."${currentUser.referral_code || '___none___'}",referral_code.eq."${currentUser.id}"`);
           }
           const singularResult = await singularQuery;
           if (!singularResult.error) result = singularResult;
        }

        const data = result.data;
        const error = result.error;

        if (!error && data) {
          const clicks       = data.filter(e => e.event_type === 'clicked_tempah').length;
          const successRefs  = referrals.filter(r => r.status?.toLowerCase() === 'completed').length;
          const rate         = clicks > 0 ? (successRefs / clicks) * 100 : 0;
          setStats({ clicks, referrals: successRefs, rate });

          const map: Record<string, any> = {};
          referrals.forEach(ref => {
            const n = ref.service_name || 'General Referral';
            if (!map[n]) map[n] = { name: n, clicks: 0, refs: 0 };
            if (ref.status?.toLowerCase() === 'completed') map[n].refs++;
          });
          data.forEach(ev => {
            if (ev.event_type === 'clicked_tempah') {
              const n = ev.service_name || 'General Link';
              if (!map[n]) map[n] = { name: n, clicks: 0, refs: 0 };
              map[n].clicks++;
            }
          });
          setCampaigns(
            Object.values(map)
              .map(s => ({ ...s, rate: s.clicks > 0 ? (s.refs / s.clicks) * 100 : 0 }))
              .sort((a, b) => b.clicks - a.clicks)
          );
        }
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    load();
  }, [currentUser.referral_code, currentUser.role, referrals]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      {/* ── MOTIVATIONAL HEADER ─────────────────────────── */}
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

      {/* ── TIER PROGRESS (Hidden for Admins) ────────────────── */}
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

      {/* ── STAT CARDS ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="bg-white rounded-2xl border border-black/5 p-3">
          <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', margin: '0 0 4px', letterSpacing: '0.05em' }}>{isAdmin ? 'TOTAL CLICKS' : 'CLICKS'}</p>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1 }}
          >{stats.clicks}</motion.p>
          <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', margin: '4px 0 0' }}>{isAdmin ? 'all affiliate links' : 'your links'}</p>
        </div>
        <div className="bg-white rounded-2xl border border-black/5 p-3">
          <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', margin: '0 0 4px', letterSpacing: '0.05em' }}>{isAdmin ? 'TOTAL REFERRALS' : 'REFERRALS'}</p>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1 }}
          >{stats.referrals}</motion.p>
          <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', margin: '4px 0 0' }}>{isAdmin ? 'all completed visits' : `${completedRefs} incentives earned`}</p>
        </div>
      </div>

      {/* Conversion — full width */}
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

      {/* ── BADGES — horizontal scroll (Hidden for Admins) ── */}
      {!isAdmin && (
        <div className="bg-white rounded-2xl border border-black/5 p-3">
          <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', margin: '0 0 8px', letterSpacing: '0.05em' }}>
            ACHIEVEMENTS · {unlockedCount} of {BADGES.length}
          </p>
          <div className="hide-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 0 }}>
            {BADGES.map(badge => {
              const unlocked = badge.unlock(stats.referrals, stats.clicks, stats.rate);
              return (
                <div
                  key={badge.id}
                  style={{
                    flexShrink: 0, minWidth: 58, textAlign: 'center',
                    padding: '6px 8px', borderRadius: 10,
                    background: unlocked ? '#fffbeb' : 'var(--color-background-secondary)',
                    border: `0.5px solid ${unlocked ? '#fde68a' : 'var(--color-border-tertiary)'}`,
                    opacity: unlocked ? 1 : 0.4,
                    filter: unlocked ? 'none' : 'grayscale(1)',
                  }}
                >
                  <div style={{ fontSize: 16, lineHeight: '1.4' }}>{badge.emoji}</div>
                  <div style={{ fontSize: 9, color: unlocked ? '#b45309' : 'var(--color-text-tertiary)', marginTop: 2, fontWeight: unlocked ? 500 : 400 }}>
                    {badge.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CAMPAIGNS ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-black/5 p-3">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', margin: 0, letterSpacing: '0.05em' }}>CAMPAIGNS</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>LIVE</span>
          </div>
        </div>

        {campaigns.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {campaigns.map((c, i) => {
              const g = getGrade(c.rate);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{ background: 'var(--color-background-secondary)', borderRadius: 12, padding: '10px 12px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{c.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: g.textColor }}>{c.rate.toFixed(1)}% · {g.label}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--color-border-tertiary)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(c.rate * 5, 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.1 + 0.3 }}
                      style={{ height: '100%', background: g.bar, borderRadius: 99 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{c.clicks} clicks</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{c.refs} referrals</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--color-background-secondary)', borderRadius: 12 }}>
            <Megaphone size={28} style={{ color: '#1580c2', opacity: 0.3, margin: '0 auto 8px' }} />
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>No campaign data yet</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '0 0 12px', maxWidth: 220, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
              Share your referral link to start tracking performance.
            </p>
            {!isAdmin && (
              <button
                onClick={() => {
                  const link = `${window.location.origin}?ref=${currentUser.referral_code || currentUser.id}`;
                  navigator.clipboard.writeText(link).catch(() => {});
                }}
                style={{ background: '#1580c2', color: '#fff', border: 'none', borderRadius: 99, padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
              >
                <Share2 size={13} /> Share your first link
              </button>
            )}
          </div>
        )}
      </div>

    </motion.div>
  );
};