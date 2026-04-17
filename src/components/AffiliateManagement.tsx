import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import {
  Trophy, TrendingUp, Users, DollarSign, Settings,
  ChevronRight, Search, Save, Plus, Trash2, RefreshCw,
  Award, Zap, BarChart2, Edit2, Check, X
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tier {
  name: string;
  min: number;
  bonus: number;
  color: string;
  bg: string;
}

interface AffiliateManagementProps {
  currentUser: any;
  staffPerformance: any[];   // from App.tsx — already includes tier, earnings, monthlyRefs
  staffList: any[];
  referrals: any[];
  services: any[];
  apiBaseUrl: string;
  safeFetch: (url: string, options?: any) => Promise<{ res: Response; data: any }>;
  TIERS: Tier[];
  onTiersChange: (tiers: Tier[]) => void; // so App.tsx TIERS state stays in sync
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RM = (n: number) => `RM ${n.toFixed(2)}`;

const TIER_BG_OPTIONS = [
  { label: 'Blue',   value: 'bg-[#1580c2]',   hex: '#1580c2' },
  { label: 'Gold',   value: 'bg-amber-400',    hex: '#fbbf24' },
  { label: 'Rose',   value: 'bg-rose-500',     hex: '#f43f5e' },
  { label: 'Violet', value: 'bg-violet-500',   hex: '#8b5cf6' },
  { label: 'Teal',   value: 'bg-teal-500',     hex: '#14b8a6' },
  { label: 'Zinc',   value: 'bg-zinc-400',     hex: '#a1a1aa' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, sub, accent }: any) => (
  <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
      <p className="text-xl font-black tracking-tight text-zinc-900">{value}</p>
      {sub && <p className="text-[11px] text-zinc-400 font-medium">{sub}</p>}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const AffiliateManagement: React.FC<AffiliateManagementProps> = ({
  staffPerformance, staffList, referrals, services,
  apiBaseUrl, safeFetch, TIERS, onTiersChange,
}) => {

  const [activeTab, setActiveTab] = useState<'overview' | 'tiers' | 'analytics' | 'commission'>('overview');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  // ── Tier editor state ──────────────────────────────────────────────────────
  const [editingTiers, setEditingTiers] = useState<Tier[]>(() => JSON.parse(JSON.stringify(TIERS)));
  const [isSavingTiers, setIsSavingTiers] = useState(false);
  const [editingTierIdx, setEditingTierIdx] = useState<number | null>(null);

  // ── Commission state ───────────────────────────────────────────────────────
  const [defaultCommission, setDefaultCommission] = useState(5);
  const [isSavingCommission, setIsSavingCommission] = useState(false);

  // ── Derived data ───────────────────────────────────────────────────────────
  const affiliates = useMemo(() =>
    staffPerformance.filter(s =>
      ['affiliate', 'staff', 'manager'].includes(s.role) &&
      s.employment_status !== 'deleted'
    ), [staffPerformance]
  );

  const filtered = useMemo(() => {
    let list = affiliates;
    if (tierFilter !== 'all') list = list.filter(a => a.tier?.name === tierFilter);
    if (search) list = list.filter(a =>
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [affiliates, tierFilter, search]);

  const analytics = useMemo(() => {
    const byTier: Record<string, { count: number; refs: number; earnings: number }> = {};
    TIERS.forEach(t => { byTier[t.name] = { count: 0, refs: 0, earnings: 0 }; });
    affiliates.forEach(a => {
      const t = a.tier?.name || TIERS[0].name;
      if (byTier[t]) {
        byTier[t].count++;
        byTier[t].refs += a.monthlySuccessfulRefs || 0;
        byTier[t].earnings += a.earned || 0;
      }
    });
    const topPerformers = [...affiliates]
      .sort((a, b) => (b.monthlySuccessfulRefs || 0) - (a.monthlySuccessfulRefs || 0))
      .slice(0, 5);
    return { byTier, topPerformers };
  }, [affiliates, TIERS]);

  const totalPending = affiliates.reduce((s, a) => s + (a.pending_earnings || 0), 0);
  const totalApproved = affiliates.reduce((s, a) => s + (a.approved_earnings || 0), 0);
  const totalPaid = affiliates.reduce((s, a) => s + (a.paid_earnings || 0), 0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveTiers = async () => {
    setIsSavingTiers(true);
    try {
      const { res } = await safeFetch(`${apiBaseUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'tiers', value: editingTiers }),
      });
      if (res.ok) {
        onTiersChange(editingTiers);
        toast.success('Tier settings saved!');
      } else {
        toast.error('Failed to save tiers');
      }
    } catch {
      toast.error('Failed to save tiers');
    } finally {
      setIsSavingTiers(false);
    }
  };

  const handleSaveCommission = async () => {
    setIsSavingCommission(true);
    try {
      const { res } = await safeFetch(`${apiBaseUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'referral', value: { defaultCommission } }),
      });
      if (res.ok) toast.success('Commission rate saved!');
      else toast.error('Failed to save');
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSavingCommission(false);
    }
  };

  const updateTierField = (idx: number, field: keyof Tier, value: any) => {
    setEditingTiers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const addTier = () => {
    setEditingTiers(prev => [...prev, {
      name: 'New Tier', min: 20, bonus: 2, color: 'text-white', bg: 'bg-violet-500'
    }]);
  };

  const removeTier = (idx: number) => {
    if (editingTiers.length <= 1) return toast.error('Must have at least one tier');
    setEditingTiers(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Tab nav ────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'overview',   label: 'Overview',   icon: <Users size={14} /> },
    { id: 'tiers',      label: 'Tiers',      icon: <Trophy size={14} /> },
    { id: 'analytics',  label: 'Analytics',  icon: <BarChart2 size={14} /> },
    { id: 'commission', label: 'Commission', icon: <DollarSign size={14} /> },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Affiliate Management</h2>
          <p className="text-zinc-500 text-sm mt-1">Manage tiers, commissions and affiliate performance.</p>
        </div>
        <div className="w-12 h-12 bg-[#1580c2] text-white rounded-2xl flex items-center justify-center shadow-lg">
          <Award size={24} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Users size={18} className="text-white" />} label="Total Affiliates"
          value={affiliates.length} sub={`${affiliates.filter(a => a.monthlySuccessfulRefs > 0).length} active this month`}
          accent="bg-[#1580c2]" />
        <StatCard icon={<TrendingUp size={18} className="text-white" />} label="Monthly Referrals"
          value={affiliates.reduce((s, a) => s + (a.monthlySuccessfulRefs || 0), 0)}
          sub="successful this month" accent="bg-emerald-500" />
        <StatCard icon={<DollarSign size={18} className="text-white" />} label="Pending Payout"
          value={RM(totalPending + totalApproved)}
          sub="awaiting payment" accent="bg-amber-400" />
        <StatCard icon={<Zap size={18} className="text-white" />} label="Total Paid Out"
          value={RM(totalPaid)} sub="all time" accent="bg-violet-500" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-zinc-100 pb-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold transition-all border-b-2 ${
              activeTab === t.id
                ? 'text-[#1580c2] border-[#1580c2] bg-[#1580c2]/5'
                : 'text-zinc-400 border-transparent hover:text-zinc-600'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-white border border-zinc-100 rounded-xl px-3 py-2 flex-1 min-w-[180px]">
                <Search size={14} className="text-zinc-400 flex-shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search affiliates..."
                  className="bg-transparent text-sm focus:outline-none w-full text-zinc-700 placeholder-zinc-300" />
              </div>
              <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}
                className="bg-white border border-zinc-100 rounded-xl px-3 py-2 text-sm text-zinc-700 focus:outline-none">
                <option value="all">All Tiers</option>
                {TIERS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>

            {/* Affiliate table */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-50">
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 px-5 py-4">Affiliate</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 px-4 py-4 hidden sm:table-cell">Tier</th>
                    <th className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-400 px-4 py-4">Monthly Refs</th>
                    <th className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-400 px-4 py-4 hidden md:table-cell">Pending</th>
                    <th className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-400 px-4 py-4 hidden md:table-cell">Paid</th>
                    <th className="px-4 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-zinc-400 text-sm">No affiliates found</td></tr>
                  ) : filtered.map((a, i) => (
                    <tr key={a.id} className={`border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 transition-colors ${i % 2 === 0 ? '' : 'bg-zinc-50/30'}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#1580c2]/10 text-[#1580c2] font-black text-xs flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {a.profile_picture
                              ? <img src={a.profile_picture} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              : (a.name?.charAt(0) || '?')}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900 leading-tight">{a.nickname || a.name}</p>
                            <p className="text-[11px] text-zinc-400">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white ${a.tier?.bg || 'bg-zinc-400'}`}>
                          {a.tier?.name || 'Bronze'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-black text-zinc-900">{a.monthlySuccessfulRefs || 0}</span>
                        <span className="text-xs text-zinc-400 ml-1">refs</span>
                      </td>
                      <td className="px-4 py-3.5 text-right hidden md:table-cell">
                        <span className="text-sm font-bold text-amber-600">{RM((a.pending_earnings || 0) + (a.approved_earnings || 0))}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right hidden md:table-cell">
                        <span className="text-sm font-bold text-emerald-600">{RM(a.paid_earnings || 0)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <ChevronRight size={14} className="text-zinc-300 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── TIERS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'tiers' && (
          <motion.div key="tiers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4">

            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-black text-zinc-900">Tier Configuration</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Define thresholds and bonus multipliers for each tier.</p>
                </div>
                <button onClick={addTier}
                  className="flex items-center gap-2 px-3 py-2 bg-[#1580c2]/10 text-[#1580c2] rounded-xl text-xs font-black hover:bg-[#1580c2]/20 transition-colors">
                  <Plus size={13} /> Add Tier
                </button>
              </div>

              {/* Tier rows */}
              <div className="space-y-3">
                {editingTiers.map((tier, idx) => (
                  <div key={idx} className="border border-zinc-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white ${tier.bg}`}>
                          {tier.name}
                        </span>
                        <span className="text-xs text-zinc-400">#{idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingTierIdx(editingTierIdx === idx ? null : idx)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-[#1580c2] transition-colors">
                          <Edit2 size={13} />
                        </button>
                        {editingTiers.length > 1 && (
                          <button onClick={() => removeTier(idx)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collapsed preview */}
                    {editingTierIdx !== idx ? (
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-zinc-50 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Min Refs</p>
                          <p className="text-lg font-black text-zinc-900">{tier.min}</p>
                        </div>
                        <div className="bg-zinc-50 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Multiplier</p>
                          <p className="text-lg font-black text-zinc-900">{tier.bonus}×</p>
                        </div>
                        <div className="bg-zinc-50 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Bonus</p>
                          <p className="text-lg font-black text-emerald-600">+{Math.round((tier.bonus - 1) * 100)}%</p>
                        </div>
                      </div>
                    ) : (
                      /* Expanded edit form */
                      <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Tier Name</label>
                            <input value={tier.name} onChange={e => updateTierField(idx, 'name', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-bold focus:outline-none focus:border-[#1580c2] focus:ring-1 focus:ring-[#1580c2]/20" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Min Monthly Refs</label>
                            <input type="number" min={0} value={tier.min}
                              onChange={e => updateTierField(idx, 'min', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-bold focus:outline-none focus:border-[#1580c2] focus:ring-1 focus:ring-[#1580c2]/20" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                            Bonus Multiplier — <span className="text-[#1580c2]">{tier.bonus}× = +{Math.round((tier.bonus - 1) * 100)}% on top of base commission</span>
                          </label>
                          <div className="flex items-center gap-3">
                            <input type="range" min="1" max="3" step="0.1"
                              value={tier.bonus}
                              onChange={e => updateTierField(idx, 'bonus', parseFloat(e.target.value))}
                              className="flex-1 accent-[#1580c2]" />
                            <input type="number" min="1" max="10" step="0.1"
                              value={tier.bonus}
                              onChange={e => updateTierField(idx, 'bonus', parseFloat(e.target.value) || 1)}
                              className="w-20 px-3 py-2 rounded-xl border border-zinc-200 text-sm font-bold text-center focus:outline-none focus:border-[#1580c2]" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Badge Colour</label>
                          <div className="flex gap-2 flex-wrap">
                            {TIER_BG_OPTIONS.map(opt => (
                              <button key={opt.value} type="button"
                                onClick={() => updateTierField(idx, 'bg', opt.value)}
                                className={`w-7 h-7 rounded-lg transition-all border-2 ${tier.bg === opt.value ? 'border-zinc-900 scale-110' : 'border-transparent'}`}
                                style={{ background: opt.hex }} title={opt.label} />
                            ))}
                          </div>
                        </div>
                        <button onClick={() => setEditingTierIdx(null)}
                          className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-600">
                          <Check size={12} /> Done editing
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* How it works explainer */}
              <div className="bg-[#1580c2]/5 border border-[#1580c2]/10 rounded-2xl p-4">
                <p className="text-xs font-black uppercase tracking-widest text-[#1580c2] mb-2">How Tiers Work</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Each affiliate is placed in a tier based on their <strong>successful referrals this month</strong> (completed, payment approved, or paid). The bonus multiplier is applied on top of the base commission rate. Example: if base commission is RM10 and the multiplier is 1.5×, Gold tier affiliates earn RM15 per referral.
                </p>
              </div>

              <button onClick={handleSaveTiers} disabled={isSavingTiers}
                className="w-full py-4 bg-[#1580c2] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#1268a8] transition-all shadow-lg shadow-[#1580c2]/20 disabled:opacity-50 flex items-center justify-center gap-2">
                {isSavingTiers ? <><RefreshCw size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Tier Settings</>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ANALYTICS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Tier breakdown */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
              <h3 className="font-black text-zinc-900 mb-4">Tier Breakdown</h3>
              <div className="space-y-3">
                {TIERS.map(tier => {
                  const data = analytics.byTier[tier.name] || { count: 0, refs: 0, earnings: 0 };
                  const pct = affiliates.length > 0 ? (data.count / affiliates.length) * 100 : 0;
                  return (
                    <div key={tier.name} className="flex items-center gap-4">
                      <span className={`w-16 text-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white ${tier.bg} flex-shrink-0`}>
                        {tier.name}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-zinc-600">{data.count} affiliates · {data.refs} refs this month</span>
                          <span className="text-xs font-black text-zinc-900">{RM(data.earnings)}</span>
                        </div>
                        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
                            className={`h-full rounded-full ${tier.bg}`} />
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400 w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top performers */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
              <h3 className="font-black text-zinc-900 mb-4">Top Performers This Month</h3>
              {analytics.topPerformers.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-6">No referral activity this month.</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topPerformers.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${
                        i === 0 ? 'bg-amber-400 text-white' :
                        i === 1 ? 'bg-zinc-300 text-zinc-700' :
                        i === 2 ? 'bg-amber-700/60 text-white' :
                        'bg-zinc-100 text-zinc-500'
                      }`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-900 truncate">{a.nickname || a.name}</p>
                        <p className="text-[11px] text-zinc-400">{a.email}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-zinc-900">{a.monthlySuccessfulRefs} refs</p>
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-white ${a.tier?.bg || 'bg-zinc-400'}`}>
                          {a.tier?.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payout summary */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
              <h3 className="font-black text-zinc-900 mb-4">Commission Summary</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Pending', value: RM(totalPending), color: 'text-zinc-600', bg: 'bg-zinc-100' },
                  { label: 'Approved', value: RM(totalApproved), color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Paid Out', value: RM(totalPaid), color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
                    <p className={`text-base font-black ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── COMMISSION TAB ───────────────────────────────────────────────── */}
        {activeTab === 'commission' && (
          <motion.div key="commission" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Default commission rate */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 space-y-5">
              <div>
                <h3 className="font-black text-zinc-900">Global Default Commission</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Applied to services that don't have a specific commission rate set.</p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">
                  Default Rate — <span className="text-[#1580c2]">RM {defaultCommission} per referral</span>
                </label>
                <div className="flex items-center gap-4">
                  <input type="range" min="1" max="500" step="1"
                    value={defaultCommission}
                    onChange={e => setDefaultCommission(parseInt(e.target.value))}
                    className="flex-1 accent-[#1580c2]" />
                  <div className="flex items-center gap-1 border border-zinc-200 rounded-xl px-3 py-2">
                    <span className="text-sm text-zinc-400 font-bold">RM</span>
                    <input type="number" min="1" value={defaultCommission}
                      onChange={e => setDefaultCommission(parseInt(e.target.value) || 1)}
                      className="w-16 text-sm font-black text-zinc-900 focus:outline-none bg-transparent" />
                  </div>
                </div>
              </div>

              <button onClick={handleSaveCommission} disabled={isSavingCommission}
                className="w-full py-4 bg-[#1580c2] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#1268a8] transition-all shadow-lg shadow-[#1580c2]/20 disabled:opacity-50 flex items-center justify-center gap-2">
                {isSavingCommission ? <><RefreshCw size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Commission Rate</>}
              </button>
            </div>

            {/* Per-service commission overview */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
              <h3 className="font-black text-zinc-900 mb-1">Per-Service Rates</h3>
              <p className="text-xs text-zinc-400 mb-4">Services with a custom commission rate set override the global default.</p>
              <div className="space-y-2">
                {services.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-zinc-50 last:border-0">
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{s.name}</p>
                      <p className="text-[11px] text-zinc-400">{s.category || 'Uncategorised'}</p>
                    </div>
                    <div className="text-right">
                      {s.commission_rate ? (
                        <span className="px-2.5 py-1 bg-[#1580c2]/10 text-[#1580c2] rounded-lg text-xs font-black">
                          RM {s.commission_rate}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-zinc-100 text-zinc-400 rounded-lg text-xs font-bold">
                          Default (RM {defaultCommission})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {services.length === 0 && (
                  <p className="text-sm text-zinc-400 text-center py-6">No services found.</p>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-4">To edit per-service rates, go to <strong>Setup → Services</strong> and update the commission rate field for each service.</p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
};