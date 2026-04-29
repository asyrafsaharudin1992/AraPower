import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Mail, Send, CheckCircle2, User, 
  Users, Search, ChevronRight, Phone, MessageCircle, 
  Clock, Info, RefreshCw, AlertCircle, Eye, Trash2,
  Zap, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Staff, Communication } from '../types';
import { toast } from 'react-hot-toast';
import { formatMyDate } from '../utils';

interface CommunicationUIProps {
  currentUser: Staff;
  activeStaffList: Staff[];
  apiBaseUrl: string;
  safeFetch: (url: string, options?: RequestInit) => Promise<{ res: Response, data: any }>;
  TIERS: any[];
}

type Channel = 'in-app' | 'email' | 'whatsapp' | 'feedback';

export const CommunicationUI: React.FC<CommunicationUIProps> = ({ 
  currentUser, 
  activeStaffList, 
  apiBaseUrl, 
  safeFetch,
  TIERS
}) => {
  const [activeTab, setActiveTab] = useState<Channel>('in-app');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState(''); // For In-App
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  
  // Recipient selection
  const [selectionType, setSelectionType] = useState<'all' | 'tier' | 'individual'>('all');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // WhatsApp Modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappQueue, setWhatsappQueue] = useState<Staff[]>([]);
  const [whatsappSentCount, setWhatsappSentCount] = useState(0);

  // History
  const [history, setHistory] = useState<Communication[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Feedback
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

  const affiliates = activeStaffList.filter(s => s.role === 'affiliate');

  useEffect(() => {
    fetchHistory();
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setIsLoadingFeedback(true);
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/feedback`);
      if (res.ok && Array.isArray(data)) setFeedbackList(data);
    } catch (err) {
      console.error('Feedback fetch error:', err);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/communications/history`);
      if (res.ok) setHistory(data);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const getRecipients = () => {
    if (selectionType === 'all') return affiliates;
    if (selectionType === 'tier') return affiliates.filter(s => s.tier?.name === selectedTier);
    if (selectionType === 'individual') return affiliates.filter(s => selectedIndividuals.includes(String(s.id)));
    return [];
  };

  const filteredAffiliates = affiliates.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = async () => {
    const recipients = getRecipients();
    if (recipients.length === 0) {
      toast.error('Sila pilih sekurang-kurangnya satu penerima');
      return;
    }

    if (activeTab === 'in-app') {
      if (!title || !message) {
        toast.error('Sila isi tajuk dan mesej');
        return;
      }
      sendInApp(recipients);
    } else if (activeTab === 'email') {
      if (!subject || !message) {
        toast.error('Sila isi subjek dan mesej');
        return;
      }
      sendEmail(recipients);
    } else if (activeTab === 'whatsapp') {
      if (!message) {
        toast.error('Sila isi mesej');
        return;
      }
      setWhatsappQueue(recipients);
      setWhatsappSentCount(0);
      setShowWhatsAppModal(true);
    }
  };

  const sendInApp = async (recipients: Staff[]) => {
    setIsSending(true);
    setSendProgress({ current: 0, total: recipients.length });
    
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: recipients.map(r => r.id),
          title,
          message,
          type: 'announcement'
        })
      });

      if (res.ok) {
        // Log communication
        await safeFetch(`${apiBaseUrl}/api/communications/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'in_app',
            recipient_count: recipients.length,
            subject: title,
            message,
            recipients: recipients.map(r => ({ id: r.id, name: r.name }))
          })
        });

        toast.success(`Berjaya menghantar mesej dalam-aplikasi kepada ${recipients.length} penerima`);
        resetForm();
        fetchHistory();
      } else {
        toast.error(data.error || 'Gagal menghantar mesej');
      }
    } catch (err) {
      toast.error('Ralat semasa menghantar mesej');
    } finally {
      setIsSending(false);
    }
  };

  const sendEmail = async (recipients: Staff[]) => {
    setIsSending(true);
    try {
      const { res, data } = await safeFetch(`${apiBaseUrl}/api/communications/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: recipients.map(r => String(r.id)),
          subject,
          message,
          sender_id: currentUser.id
        })
      });

      if (res.ok) {
        if (data.sent > 0 && data.failed === 0) {
          toast.success(`E-mel berjaya dihantar kepada ${data.sent} penerima`);
          resetForm();
          fetchHistory();
        } else if (data.sent > 0 && data.failed > 0) {
          toast.success(`E-mel dihantar kepada ${data.sent} penerima, tetapi gagal untuk ${data.failed} penerima`);
          resetForm();
          fetchHistory();
        } else if (data.sent === 0 && data.failed > 0) {
          toast.error(`Gagal menghantar e-mel. Sila pastikan API Key Resend telah disahkan.`);
        }
      } else {
        toast.error(data.error || 'Gagal menghantar e-mel');
      }
    } catch (err) {
      toast.error('Ralat semasa menghantar e-mel');
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setSubject('');
    setMessage('');
    setTitle('');
  };

  const logWhatsAppCommunication = async () => {
    const recipients = whatsappQueue;
    await safeFetch(`${apiBaseUrl}/api/communications/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'whatsapp',
        recipient_count: recipients.length,
        message,
        recipients: recipients.map(r => ({ id: r.id, name: r.name, phone: r.phone }))
      })
    });
    fetchHistory();
    setShowWhatsAppModal(false);
    resetForm();
    toast.success('WhatsApp communication logged');
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Hub Komunikasi</h2>
          <p className="text-zinc-500 text-sm">Hantar hebahan dan mesej kepada semua rakan niaga.</p>
        </div>
        <div className="w-12 h-12 bg-[#1580c2] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <MessageSquare size={24} />
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl w-fit">
        {(['in-app', 'email', 'whatsapp', 'feedback'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? 'bg-white text-zinc-900 shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'feedback' ? (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-zinc-900 tracking-tight">Maklum Balas Rakan Niaga</h3>
                <p className="text-zinc-500 text-sm">Lihat maklum balas dan cadangan daripada staf anda.</p>
              </div>
              <button 
                onClick={fetchFeedback}
                className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <RefreshCw size={16} className={isLoadingFeedback ? 'animate-spin' : ''} />
              </button>
            </div>

            {isLoadingFeedback ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="animate-spin text-zinc-300" size={32} />
              </div>
            ) : feedbackList.length === 0 ? (
              <div className="text-center py-12 bg-zinc-50 rounded-[2rem]">
                <MessageSquare className="mx-auto text-zinc-200 mb-2" size={48} />
                <p className="text-zinc-400 text-sm font-medium">Tiada maklum balas ditemui.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbackList.map((f) => (
                  <div key={f.id} className="p-6 bg-white border border-zinc-100 rounded-3xl hover:border-blue-100 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-[#1580c2] font-black">
                          {f.staff_name?.charAt(0) || <User size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{f.staff_name || 'Anonymous'}</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            {new Date(f.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-[#1580c2]/10 text-[#1580c2] rounded-full text-[8px] font-black uppercase tracking-widest">
                        Maklum Balas
                      </span>
                    </div>
                    <div className="pl-13">
                      <p className="text-sm text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-2xl">
                        {f.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl">
                <Users size={18} className="text-zinc-400" />
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Penerima</p>
                  <p className="text-sm font-bold text-zinc-900">
                    {getRecipients().length} Rakan Niaga Diplih
                  </p>
                </div>
              </div>

              {activeTab === 'in-app' && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Tajuk Notifikasi</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Masukkan tajuk hebahan..."
                    className="w-full px-5 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#1580c2] transition-all"
                  />
                </div>
              )}

              {activeTab === 'email' && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Subjek E-mel</label>
                  <input 
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Masukkan subjek e-mel..."
                    className="w-full px-5 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#1580c2] transition-all"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Kandungan Mesej</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Taip mesej anda di sini..."
                  rows={10}
                  className="w-full px-5 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#1580c2] transition-all resize-none shadow-inner"
                />
              </div>

              <button 
                onClick={handleSend}
                disabled={isSending || (activeTab === 'in-app' && !title) || (activeTab === 'email' && !subject) || !message}
                className="w-full flex items-center justify-center gap-2 px-6 py-5 bg-[#1580c2] text-white rounded-3xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none group"
              >
                {isSending ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : activeTab === 'whatsapp' ? (
                  <MessageCircle size={20} className="group-hover:translate-x-1 transition-transform" />
                ) : (
                  <Send size={20} className="group-hover:translate-x-1 transition-transform" />
                )}
                {isSending ? 'Menghantar...' : activeTab === 'whatsapp' ? 'Buka Senarai WhatsApp' : `Hantar kepada ${getRecipients().length} Penerima`}
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">Sejarah Hebahan</h3>
              <button 
                onClick={fetchHistory}
                className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={16} className={isLoadingHistory ? 'animate-spin' : ''} />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="animate-spin text-zinc-300" size={32} />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 bg-zinc-50 rounded-[2rem]">
                <MessageSquare className="mx-auto text-zinc-200 mb-2" size={48} />
                <p className="text-zinc-400 text-sm font-medium">Tiada sejarah komunikasi ditemui.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((h) => (
                  <div key={h.id} className="p-5 bg-white border border-zinc-100 rounded-3xl hover:border-blue-100 transition-colors group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                          h.channel === 'in-app' ? 'bg-blue-50 text-blue-600' :
                          h.channel === 'email' ? 'bg-zinc-50 text-zinc-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {h.channel === 'in-app' && <Zap size={18} />}
                          {h.channel === 'email' && <Mail size={18} />}
                          {h.channel === 'whatsapp' && <MessageCircle size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900 leading-tight">
                            {h.channel === 'whatsapp' ? 'Mesej WhatsApp' : h.subject || 'Hebahan Tanpa Tajuk'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#1580c2]">
                              {h.recipient_count} Penerima
                            </span>
                            <span className="text-[10px] text-zinc-300">•</span>
                            <span className="text-[10px] font-medium text-zinc-400">
                              {formatMyDate(h.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        h.channel === 'in-app' ? 'bg-blue-100 text-blue-700' :
                        h.channel === 'email' ? 'bg-zinc-100 text-zinc-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {h.channel}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed pl-[3.25rem]">
                      {h.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-6 sticky top-8">
            <h3 className="text-xl font-black text-zinc-900 tracking-tight">Pilih Penerima</h3>
            
            <div className="space-y-2">
              <button 
                onClick={() => setSelectionType('all')}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                  selectionType === 'all' 
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg' 
                    : 'bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200'
                }`}
              >
                <Users size={18} />
                <span className="text-sm font-bold flex-1 text-left">Semua Rakan Niaga ({affiliates.length})</span>
                {selectionType === 'all' && <CheckCircle2 size={18} />}
              </button>

              <div className="space-y-2">
                <button 
                  onClick={() => setSelectionType('tier')}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    selectionType === 'tier' 
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg' 
                      : 'bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200'
                  }`}
                >
                  <TrendingUp size={18} />
                  <span className="text-sm font-bold flex-1 text-left">Ikut Tier</span>
                  {selectionType === 'tier' && <ChevronRight size={18} />}
                </button>
                
                <AnimatePresence>
                  {selectionType === 'tier' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="grid grid-cols-3 gap-2 overflow-hidden px-1"
                    >
                      {TIERS.map(tier => (
                        <button
                          key={tier.name}
                          onClick={() => setSelectedTier(tier.name)}
                          className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                            selectedTier === tier.name 
                              ? 'bg-[#1580c2] text-white shadow-md' 
                              : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'
                          }`}
                        >
                          {tier.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={() => setSelectionType('individual')}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    selectionType === 'individual' 
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg' 
                      : 'bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200'
                  }`}
                >
                  <User size={18} />
                  <span className="text-sm font-bold flex-1 text-left">Pilih Individu</span>
                  {selectionType === 'individual' && <ChevronRight size={18} />}
                </button>

                <AnimatePresence>
                  {selectionType === 'individual' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 400, opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex flex-col gap-3 overflow-hidden"
                    >
                      <div className="relative mt-2">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                          type="text"
                          placeholder="Cari nama..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-zinc-50 border-none rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#1580c2]"
                        />
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                        {filteredAffiliates.map(staff => (
                          <label key={staff.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 transition-colors cursor-pointer group">
                             <input 
                                type="checkbox"
                                checked={selectedIndividuals.includes(String(staff.id))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedIndividuals([...selectedIndividuals, String(staff.id)]);
                                  } else {
                                    setSelectedIndividuals(selectedIndividuals.filter(id => id !== String(staff.id)));
                                  }
                                }}
                                className="w-5 h-5 rounded-lg border-zinc-200 text-[#1580c2] focus:ring-[#1580c2]"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-zinc-900 truncate">{staff.name}</p>
                                <p className="text-[10px] text-zinc-500 font-medium">{staff.tier?.name || 'No Tier'}</p>
                              </div>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* WhatsApp Queue Modal */}
      <AnimatePresence>
        {showWhatsAppModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm"
          >
            <motion.div 
               initial={{ scale: 0.95, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 20 }}
               className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Giliran WhatsApp</h3>
                  <p className="text-zinc-500 text-sm">Klik butang untuk setiap rakan niaga untuk menghantar mesej.</p>
                </div>
                <button 
                  onClick={() => setShowWhatsAppModal(false)}
                  className="w-10 h-10 rounded-full hover:bg-zinc-100 flex items-center justify-center transition-colors"
                >
                  <Trash2 size={20} className="text-zinc-400" />
                </button>
              </div>

              <div className="bg-emerald-50 p-6 rounded-3xl flex items-center justify-between border border-emerald-100">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                     <MessageCircle size={24} />
                   </div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Perkembangan</p>
                     <p className="text-lg font-bold text-emerald-900">
                        {whatsappSentCount} daripada {whatsappQueue.length} Selesai
                     </p>
                   </div>
                 </div>
                 {whatsappSentCount === whatsappQueue.length && (
                   <button 
                    onClick={logWhatsAppCommunication}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                   >
                     Tamatkan & Log
                   </button>
                 )}
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {whatsappQueue.map((staff) => {
                  const hasPhone = !!staff.phone?.replace(/\D/g, '');
                  return (
                    <div key={staff.id} className="flex items-center gap-4 p-4 rounded-3xl border border-zinc-100 hover:bg-zinc-50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-400">
                        {staff.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-900">{staff.name}</p>
                        <p className="text-xs text-zinc-500">{staff.phone || 'Tiada nombor telefon'}</p>
                      </div>
                      {hasPhone ? (
                        <a 
                          href={`https://wa.me/${staff.phone?.replace(/\D/g, '').startsWith('0') ? '60' + staff.phone?.replace(/\D/g, '').substring(1) : staff.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setWhatsappSentCount(prev => prev + 1)}
                          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-emerald-500 text-white shadow-lg shadow-emerald-500/10 hover:bg-emerald-600"
                        >
                          Buka WhatsApp
                          <ChevronRight size={14} />
                        </a>
                      ) : (
                        <button 
                          disabled
                          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-zinc-100 text-zinc-400"
                        >
                          Buka WhatsApp
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};