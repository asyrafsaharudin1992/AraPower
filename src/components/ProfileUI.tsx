import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  RefreshCw, DollarSign, Palette, Sun, Moon, BookOpen, ChevronRight, Lock, MessageSquare, HandHeart, Tag, TrendingUp, Plus, Trash2, Heart, AlertTriangle
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';

export interface ProfileUIProps {
  currentUser: any;
  darkMode: boolean;
  handleUpdateProfile: (data: any) => void;
  THEMES: any;
  selectedTheme: string;
  setSelectedTheme: (theme: string) => void;
  windowWidth: number;
  setDarkMode: (dark: boolean) => void;
  reduceTranslucency: boolean;
  setReduceTranslucency: (reduce: boolean) => void;
  setActiveTab: (tab: any) => void;
  setShowPasswordModal: (show: boolean) => void;
  feedbackMessage: string;
  setFeedbackMessage: (msg: string) => void;
  handleSendFeedback: (e: any) => void;
  isSendingFeedback: boolean;
  handleLogout: () => void;
}

const MALAYSIAN_BANKS = [
  "Affin Bank Berhad","Alliance Bank Malaysia Berhad","AmBank (M) Berhad","BNP Paribas Malaysia Berhad",
  "Bangkok Bank Berhad","Bank of America Malaysia Berhad","Bank of China (Malaysia) Berhad",
  "Bank of Tokyo-Mitsubishi UFJ (Malaysia) Berhad","CIMB Bank Berhad","Citibank Berhad",
  "Deutsche Bank (Malaysia) Berhad","HSBC Bank Malaysia Berhad","Hong Leong Bank Berhad",
  "India International Bank (Malaysia) Berhad","Industrial and Commercial Bank of China (Malaysia) Berhad",
  "J.P. Morgan Chase Bank Berhad","Malayan Banking Berhad","Mizuho Bank (Malaysia) Berhad",
  "National Bank of Abu Dhabi Malaysia Berhad","OCBC Bank (Malaysia) Berhad","Public Bank Berhad",
  "RHB Bank Berhad","Standard Chartered Bank Malaysia Berhad","Sumitomo Mitsui Banking Corporation Malaysia Berhad",
  "The Bank of Nova Scotia Berhad","The Royal Bank of Scotland Berhad","United Overseas Bank (Malaysia) Bhd.",
  "Affin Islamic Bank Berhad","Al Rajhi Banking & Investment Corporation (Malaysia) Berhad",
  "Alliance Islamic Bank Berhad","AmBank Islamic Berhad","Asian Finance Bank Berhad",
  "Bank Islam Malaysia Berhad","Bank Muamalat Malaysia Berhad","CIMB Islamic Bank Berhad",
  "HSBC Amanah Malaysia Berhad","Hong Leong Islamic Bank Berhad","Kuwait Finance House (Malaysia) Berhad",
  "Maybank Islamic Berhad","OCBC Al-Amin Bank Berhad","Public Islamic Bank Berhad",
  "RHB Islamic Bank Berhad","Standard Chartered Saadiq Berhad","Affin Hwang Investment Bank Berhad",
  "Alliance Investment Bank Berhad","AmInvestment Bank Berhad","CIMB Investment Bank Berhad",
  "Hong Leong Investment Bank Berhad","KAF Investment Bank Berhad","Kenanga Investment Bank Berhad",
  "MIMB Investment Bank Berhad","Maybank Investment Bank Berhad","Public Investment Bank Berhad",
  "RHB Investment Bank Berhad","Al Rajhi Banking & Investment Corporation",
  "Deutsche Bank Aktiengesellschaft","PT Bank Muamalat Indonesia, Tbk",
];

// Strip dashes from IC number → 900101105050
const formatMalaysianIC = (raw: string): string => raw.replace(/[-\s]/g, '');

const BLUE = '#1580c2';
const P = "'Poppins', sans-serif";

const inputOnBlue: React.CSSProperties = {
  width: '100%', padding: '14px 20px', borderRadius: '16px', fontSize: '14px', fontWeight: 500,
  background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)',
  color: '#ffffff', outline: 'none', fontFamily: P, transition: 'border-color 0.2s, background 0.2s',
  boxSizing: 'border-box',
};

const ghostBtn = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px',
  borderRadius: '16px', border: `2px solid ${active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)'}`,
  background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', cursor: 'pointer',
  transition: 'all 0.2s', fontFamily: P, color: active ? '#ffffff' : 'rgba(255,255,255,0.55)',
});

// ── BankSelector ──────────────────────────────────────────────────────────────
const BankSelector: React.FC<{ currentBank: string; darkMode: boolean; onChange?: (bank: string) => void }> = ({ currentBank, onChange }) => {
  const [selected, setSelected] = useState(currentBank);
  const [search, setSearch]     = useState('');
  const [open, setOpen]         = useState(false);
  const containerRef            = useRef<HTMLDivElement>(null);

  // Sync when currentUser data arrives async after initial mount
  React.useEffect(() => {
    if (currentBank && currentBank !== selected) {
      setSelected(currentBank);
    }
  }, [currentBank]);

  const filtered = MALAYSIAN_BANKS.filter(b => b.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (bank: string) => {
    setSelected(bank);
    setOpen(false);
    setSearch('');
    if (onChange) onChange(bank);
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>
        Bank Name
      </label>
      <input type="hidden" name="bank_name" value={selected} />
      <div style={{ position: 'relative' }}>
        <button type="button" onClick={() => { setOpen(o => !o); setSearch(''); }}
          style={{ ...inputOnBlue, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <span style={{ color: selected ? '#ffffff' : 'rgba(255,255,255,0.4)' }}>{selected || 'Select your bank...'}</span>
          <svg style={{ width: '16px', height: '16px', flexShrink: 0, marginLeft: '8px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'rgba(255,255,255,0.6)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div style={{ position: 'absolute', zIndex: 50, width: '100%', marginTop: '8px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)', background: '#0f6aa8', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
              <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bank..."
                style={{ width: '100%', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', outline: 'none', fontFamily: P, boxSizing: 'border-box' }} />
            </div>
            <ul style={{ maxHeight: '224px', overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' }}>
              {filtered.length === 0 ? (
                <li style={{ padding: '12px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>No banks found</li>
              ) : filtered.map(bank => (
                <li key={bank}>
                  <button type="button" onClick={() => handleSelect(bank)}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 20px', fontSize: '13px', cursor: 'pointer', border: 'none', fontFamily: P, transition: 'background 0.1s',
                      background: selected === bank ? 'rgba(255,255,255,0.2)' : 'transparent',
                      color: selected === bank ? '#ffffff' : 'rgba(255,255,255,0.8)',
                      fontWeight: selected === bank ? 700 : 500 }}>
                    {bank}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// ── ProfileUI ─────────────────────────────────────────────────────────────────
export const ProfileUI: React.FC<ProfileUIProps> = ({
  currentUser, darkMode, handleUpdateProfile,
  THEMES, selectedTheme, setSelectedTheme, windowWidth, setDarkMode,
  reduceTranslucency, setReduceTranslucency, setActiveTab, setShowPasswordModal,
  feedbackMessage, setFeedbackMessage, handleSendFeedback, isSendingFeedback, handleLogout,
}) => {
  const [selectedMode, setSelectedMode] = useState<string>(currentUser?.incentive_mode || 'discount');
  const [charityList, setCharityList] = useState<{name: string, amount_per_referral: string}[]>(
    Array.isArray(currentUser?.charities) && currentUser?.charities.length > 0 
      ? currentUser?.charities 
      : [{ name: '', amount_per_referral: '' }]
  );

  if (!currentUser) return null;

  const isAmbassador = currentUser?.role === 'ambassador';
  const commission_amount = 10; // Fallback / mock value as mentioned
  
  const totalCharityAmount = charityList.reduce((sum, item) => sum + (Number(item.amount_per_referral) || 0), 0);
  
  // Validation for Earn Mode
  const bankRef = useRef<HTMLInputElement>(null);
  const accRef = useRef<HTMLInputElement>(null);
  const icRef = useRef<HTMLInputElement>(null);

  // We need to check if current user has them, or if user typing them
  const [tmpBank, setTmpBank] = useState(currentUser?.bank_name || '');
  const [tmpAcc, setTmpAcc] = useState(currentUser?.bank_account_number || '');
  const [tmpIc, setTmpIc] = useState(currentUser?.id_number || '');

  const isEarnValid = selectedMode !== 'earn' || (tmpBank && tmpAcc && tmpIc);
  const isCharityValid = selectedMode !== 'charity' || (totalCharityAmount > 0 && totalCharityAmount <= commission_amount && charityList.every(c => c.name.trim() !== ''));

  const sectionLabel = (icon: React.ReactNode, text: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
      {icon}
      <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{text}</span>
    </div>
  );

  const fieldLabel = (text: string) => (
    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>
      {text}
    </label>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto space-y-8"
      style={{ fontFamily: P }}
    >
      {/* ── Blue card ── */}
      <div style={{ background: BLUE, borderRadius: '2rem', padding: '32px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', transform: 'translate(40%,-40%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', transform: 'translate(-40%,40%)', pointerEvents: 'none' }} />

        {/* ── Name + role ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '36px', position: 'relative', zIndex: 1 }}>
          <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>{currentUser?.nickname || currentUser?.name}</h3>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>{currentUser?.role}</p>
        </div>

        {/* ── Form ── */}
        <form
          key={currentUser?.id || currentUser?.email}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            
            const payload: any = {
              nickname: fd.get('nickname') as string,
              bank_name: fd.get('bank_name') as string,
              bank_account_number: fd.get('bank_account_number') as string,
              id_type: 'MyKad',
              id_number: formatMalaysianIC(fd.get('id_number') as string || ''),
            };

            if (isAmbassador) {
              payload.incentive_mode = selectedMode;
              if (selectedMode === 'charity') {
                payload.charities = charityList.map(c => ({
                  name: c.name,
                  amount_per_referral: Number(c.amount_per_referral) || 0
                }));
              }
            }

            handleUpdateProfile(payload);
          }}
          className="space-y-6"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {isAmbassador && (
            <div style={{ paddingTop: '12px', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <TrendingUp size={14} color="rgba(255,255,255,0.7)" />
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Your Incentive Mode</span>
              </div>
              
              <div className="flex gap-2 bg-white/10 p-1.5 rounded-2xl w-full border border-white/20">
                <button
                  type="button"
                  onClick={() => setSelectedMode('discount')}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${selectedMode === 'discount' ? 'bg-white text-[#1580c2] shadow-md' : 'text-white/60 hover:text-white/90 hover:bg-white/5'}`}
                >
                  <Tag size={16} className="inline-block mr-1.5" /> Discount
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode('charity')}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${selectedMode === 'charity' ? 'bg-white text-[#1580c2] shadow-md' : 'text-white/60 hover:text-white/90 hover:bg-white/5'}`}
                >
                  <HandHeart size={16} className="inline-block mr-1.5" /> Charity
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode('earn')}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${selectedMode === 'earn' ? 'bg-white text-[#1580c2] shadow-md' : 'text-white/60 hover:text-white/90 hover:bg-white/5'}`}
                >
                  <DollarSign size={16} className="inline-block mr-1.5" /> Earn
                </button>
              </div>

              <AnimatePresence mode="wait">
                {selectedMode === 'charity' && (
                  <motion.div
                    key="charity"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white/10 border border-white/20 rounded-2xl p-5">
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-4">Supported Charities (Max 5)</p>
                      
                      <div className="space-y-3">
                        {charityList.map((ch, i) => (
                          <div key={i} className="flex gap-3">
                            <input 
                              type="text" 
                              value={ch.name} 
                              onChange={(e) => {
                                const nw = [...charityList];
                                nw[i].name = e.target.value;
                                setCharityList(nw);
                              }}
                              placeholder="Charity Name" 
                              className="flex-1 bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/50" 
                            />
                            <div className="relative w-32">
                              <span className="absolute left-3 top-2 text-sm text-white/50">RM</span>
                              <input 
                                type="number" 
                                value={ch.amount_per_referral} 
                                onChange={(e) => {
                                  const nw = [...charityList];
                                  nw[i].amount_per_referral = e.target.value;
                                  setCharityList(nw);
                                }}
                                placeholder="0" 
                                className="w-full pl-9 pr-4 py-2 bg-white/20 border border-white/30 rounded-xl text-sm text-white focus:outline-none focus:border-white/50 placeholder-white/40" 
                              />
                            </div>
                            {charityList.length > 1 && (
                              <button 
                                type="button"
                                onClick={() => setCharityList(charityList.filter((_, idx) => idx !== i))}
                                className="w-10 h-10 flex items-center justify-center shrink-0 rounded-xl bg-red-500/20 text-red-100 hover:bg-red-500/40 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {charityList.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setCharityList([...charityList, { name: '', amount_per_referral: '' }])}
                          className="w-full flex items-center justify-center gap-2 py-3 mt-4 border border-dashed border-white/30 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/5 transition-colors"
                        >
                          <Plus size={16} /> Add Charity
                        </button>
                      )}

                      <div className="mt-5 pt-4 border-t border-white/20 flex justify-between items-center">
                        <span className="text-sm text-white/70">Total per referral:</span>
                        <span className={`text-base font-bold ${totalCharityAmount > commission_amount ? 'text-red-300' : 'text-white'}`}>
                          RM{totalCharityAmount.toFixed(2)}
                        </span>
                      </div>
                      
                      {totalCharityAmount > commission_amount && (
                        <p className="text-xs text-red-300 font-semibold flex items-center gap-1.5 mt-2">
                          <AlertTriangle size={12} /> Total exceeds available commission
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {selectedMode === 'earn' && (!tmpBank || !tmpAcc || !tmpIc) && (
                  <motion.div
                    key="earn"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-amber-500/20 border border-amber-500/50 rounded-2xl p-4 flex gap-3 text-amber-200">
                      <AlertTriangle size={20} className="shrink-0 text-amber-400" />
                      <p className="text-sm font-medium">
                        Bank Account and IC Number must be provided below to activate Earn mode. Save changes will be disabled until completed.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Nickname */}
          <div>
            {fieldLabel('Nickname')}
            <input name="nickname" type="text" defaultValue={currentUser?.nickname || ''} placeholder="Your preferred name" style={inputOnBlue} />
          </div>

          {/* Bank Details */}
          <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            {sectionLabel(<DollarSign size={14} color="rgba(255,255,255,0.7)" />, 'Bank Account Details')}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Note: BankSelector must update tmpBank. We will pass a callback */}
              <BankSelector 
                currentBank={tmpBank} 
                darkMode={false} 
                onChange={(bName: string) => setTmpBank(bName)}
              />
              <div>
                {fieldLabel('Account Number')}
                <input 
                  name="bank_account_number" 
                  type="text" 
                  value={tmpAcc}
                  onChange={(e) => setTmpAcc(e.target.value)}
                  placeholder="1234567890" 
                  style={inputOnBlue} 
                />
              </div>
              <div>
                {fieldLabel('ID Type')}
                <input type="hidden" name="id_type" value="MyKad" />
                <div style={{ ...inputOnBlue, display: 'flex', alignItems: 'center', opacity: 0.7, cursor: 'default' }}>
                  MyKad (Malaysian IC)
                </div>
              </div>
              <div>
                {fieldLabel('IC Number (MyKad)')}
                <input
                  name="id_number"
                  type="text"
                  inputMode="numeric"
                  value={tmpIc}
                  placeholder="e.g. 900101105050"
                  style={inputOnBlue}
                  maxLength={12}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, '');
                    setTmpIc(clean);
                  }}
                  onBlur={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, '');
                    setTmpIc(clean);
                  }}
                />
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '6px', fontFamily: "'Poppins', sans-serif" }}>
                  12 digits, numbers only — no dashes
                </p>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            {sectionLabel(<Palette size={14} color="rgba(255,255,255,0.7)" />, 'Appearance & Theme')}

            {/* Color theme picker */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '14px' }}>Color Theme</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(THEMES).map(([key, theme]: [string, any]) => {
                  const active = selectedTheme === key;
                  return (
                    <button key={key} type="button" onClick={() => setSelectedTheme(key)} style={ghostBtn(active)}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: theme.accent, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', flexShrink: 0 }} />
                      <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Display mode — desktop only */}
            {windowWidth >= 768 && (
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '14px' }}>Display Mode</label>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    { label: 'Light Mode', icon: <Sun size={18} />,  active: !darkMode, action: () => setDarkMode(false) },
                    { label: 'Dark Mode',  icon: <Moon size={18} />, active: darkMode,  action: () => setDarkMode(true)  },
                  ] as const).map(({ label, icon, active, action }) => (
                    <button key={label} type="button" onClick={action} style={ghostBtn(active)}>
                      {icon}
                      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Translucency toggle */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '14px' }}>App Appearance</label>
              <button type="button" onClick={() => setReduceTranslucency(!reduceTranslucency)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '16px',
                  border: `2px solid ${reduceTranslucency ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)'}`,
                  background: reduceTranslucency ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.2s', fontFamily: P }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '20px', borderRadius: '999px', background: reduceTranslucency ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: '3px', width: '14px', height: '14px', background: reduceTranslucency ? BLUE : '#ffffff', borderRadius: '50%', transition: 'left 0.2s', left: reduceTranslucency ? '23px' : '3px' }} />
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: reduceTranslucency ? '#ffffff' : 'rgba(255,255,255,0.6)' }}>
                    Reduce Translucency
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Resources & Security */}
          <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            {sectionLabel(<BookOpen size={14} color="rgba(255,255,255,0.7)" />, 'Resources')}
            <button type="button" onClick={() => setActiveTab('guide')}
              style={{ width: '100%', padding: '14px 18px', borderRadius: '16px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', fontFamily: P, transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}>
              <span>View User Guide & FAQ</span>
              <ChevronRight size={16} color="rgba(255,255,255,0.6)" />
            </button>

            {sectionLabel(<Lock size={14} color="rgba(255,255,255,0.7)" />, 'Security')}
            <button type="button" onClick={() => setShowPasswordModal(true)}
              style={{ width: '100%', padding: '14px 18px', borderRadius: '16px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: P, transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}>
              <span>Change Account Password</span>
              <ChevronRight size={16} color="rgba(255,255,255,0.6)" />
            </button>
          </div>

          {/* Feedback */}
          <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            {sectionLabel(<MessageSquare size={14} color="rgba(255,255,255,0.7)" />, 'Developer Feedback')}
            <p style={{ fontSize: '13px', fontWeight: 400, color: 'rgba(255,255,255,0.6)', marginBottom: '14px' }}>
              Have a suggestion or found a bug? Send a message directly to the developer.
            </p>
            <textarea value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Type your feedback here..."
              style={{ ...inputOnBlue, minHeight: '120px', resize: 'none', display: 'block', marginBottom: '12px' }} />
            <button type="button" onClick={(e) => { e.preventDefault(); handleSendFeedback(e); }}
              disabled={isSendingFeedback || !feedbackMessage.trim()}
              style={{ width: '100%', height: '52px', borderRadius: '40px', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#ffffff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: P, opacity: (isSendingFeedback || !feedbackMessage.trim()) ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              {isSendingFeedback ? <RefreshCw size={16} className="animate-spin" /> : <MessageSquare size={16} />}
              {isSendingFeedback ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>

          {/* Save + Sign Out */}
          <div style={{ paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button type="submit"
              disabled={isAmbassador && (!isEarnValid || !isCharityValid)}
              style={{ width: '100%', height: '58px', borderRadius: '40px', background: '#ffffff', border: 'none', color: BLUE, fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: (isAmbassador && (!isEarnValid || !isCharityValid)) ? 'not-allowed' : 'pointer', fontFamily: P, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', transition: 'transform 0.15s, box-shadow 0.15s', opacity: (isAmbassador && (!isEarnValid || !isCharityValid)) ? 0.5 : 1 }}
              onMouseEnter={e => { if (!(isAmbassador && (!isEarnValid || !isCharityValid))) { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.25)'; } }}
              onMouseLeave={e => { if (!(isAmbassador && (!isEarnValid || !isCharityValid))) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; } }}>
              Save Profile Changes
            </button>
            <button type="button" onClick={handleLogout}
              style={{ width: '100%', height: '52px', borderRadius: '40px', background: 'transparent', border: '2px solid rgba(252,165,165,0.5)', color: '#fca5a5', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: P, transition: 'background 0.15s, border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = 'rgba(252,165,165,0.8)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(252,165,165,0.5)'; }}>
              Sign Out
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};