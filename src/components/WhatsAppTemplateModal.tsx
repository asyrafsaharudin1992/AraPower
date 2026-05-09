import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send } from 'lucide-react';

interface WhatsAppTemplate {
  id: string;
  name: string;
  message: string;
}

interface WhatsAppTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: WhatsAppTemplate[];
  referral: any;
  phone: string;
  onSend: (message: string) => void;
}

export const WhatsAppTemplateModal: React.FC<WhatsAppTemplateModalProps> = ({
  isOpen,
  onClose,
  templates,
  referral,
  phone,
  onSend
}) => {
  if (!isOpen) return null;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-MY', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return '—'; }
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '—';
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour = h % 12 || 12;
      return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
    } catch { return timeStr; }
  };

  const processMessage = (rawMessage: string) => {
    let msg = rawMessage;
    msg = msg.replace(/{{patient_name}}/g, referral.patient_name || 'Tuan/Puan');
    msg = msg.replace(/{{date}}/g, formatDate(referral.appointment_date || referral.visit_date || referral.date));
    msg = msg.replace(/{{time}}/g, formatTime(referral.booking_time));
    msg = msg.replace(/{{branch}}/g, referral.branch || 'Klinik Ara');
    msg = msg.replace(/{{service}}/g, referral.service_name || 'Servis Klinik');
    return msg;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-emerald-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <MessageCircle size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm text-emerald-900 tracking-tight">WhatsApp Template</h3>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Select a message for {referral.patient_name || 'Patient'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-emerald-100 rounded-full transition-colors text-emerald-900">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
            {templates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-500 text-sm font-bold">No templates found.</p>
                <p className="text-zinc-400 text-xs mt-1">Add them in Setup Settings.</p>
              </div>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSend(processMessage(template.message))}
                  className="w-full text-left p-4 rounded-2xl border border-zinc-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-xs text-zinc-900 uppercase tracking-widest">{template.name}</span>
                    <Send size={14} className="text-zinc-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <p className="text-xs text-zinc-600 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                    {processMessage(template.message)}
                  </p>
                </button>
              ))
            )}
          </div>
          
          <div className="p-6 bg-zinc-50 border-t border-zinc-100">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
              Message will be sent to {phone}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
