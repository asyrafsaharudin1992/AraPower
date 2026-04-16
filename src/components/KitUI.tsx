import React from 'react';
import { motion } from 'motion/react';
import { QrCode, Copy, MessageCircle, Share2, PlusCircle, ChevronRight, Info, RefreshCw } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'react-hot-toast';

export interface KitUIProps {
  currentUser: any;
  clinicProfile: any;
  darkMode: boolean;
  isMobile: boolean;
  services: any[];
  branches: any[];
  patientName: string;
  setPatientName: (name: string) => void;
  patientPhone: string;
  setPatientPhone: (phone: string) => void;
  patientIC: string;
  setPatientIC: (ic: string) => void;
  patientType: 'new' | 'existing';
  setPatientType: (type: 'new' | 'existing') => void;
  patientAddress: string;
  setPatientAddress: (address: string) => void;
  selectedService: string;
  setSelectedService: (service: string) => void;
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  appointmentDate: string;
  setAppointmentDate: (date: string) => void;
  bookingTime: string;
  setBookingTime: (time: string) => void;
  isSubmitting: boolean;
  handleSubmitReferral: (e: any) => void;
  urlServiceName: string;
  getAvailableTimeSlots: (serviceId: string, branchName: string, date: string) => string[];
}

export const KitUI: React.FC<KitUIProps> = ({
  currentUser,
  clinicProfile,
  darkMode,
  isMobile,
  services,
  branches,
  patientName,
  setPatientName,
  patientPhone,
  setPatientPhone,
  patientIC,
  setPatientIC,
  patientType,
  setPatientType,
  patientAddress,
  setPatientAddress,
  selectedService,
  setSelectedService,
  selectedBranch,
  setSelectedBranch,
  appointmentDate,
  setAppointmentDate,
  bookingTime,
  setBookingTime,
  isSubmitting,
  handleSubmitReferral,
  urlServiceName,
  getAvailableTimeSlots
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Referral Kit</h2>
          <p className="text-zinc-500 text-sm">Your tools for sharing and earning.</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${currentUser.role === 'affiliate' && !isMobile ? 'lg:grid-cols-2' : ''} gap-8`}>
        <div className="space-y-8">
          <div className={`${darkMode ? 'bg-[#1e293b] border-violet-500' : 'bg-[#EDEADE] border-black/5 shadow-sm'} p-8 rounded-[2.5rem] border relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 w-32 h-32 ${darkMode ? 'bg-brand-accent/10' : 'bg-violet-500'} rounded-full blur-3xl -mr-16 -mt-16`} />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-3xl ${darkMode ? 'bg-zinc-900 text-brand-accent border-zinc-800' : 'bg-white text-violet-500 border-white'} border-4 shadow-xl flex items-center justify-center mb-6`}>
                <QrCode size={32} />
              </div>
              <h3 className={`text-2xl font-black tracking-tighter mb-2 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Your QR Code</h3>
              <p className={`text-sm font-medium mb-8 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Let patients scan this to book directly under your name.</p>
              
              <div className={`p-6 bg-white rounded-3xl shadow-xl mb-8 border-4 ${darkMode ? 'border-brand-accent/20' : 'border-white'}`}>
                <QRCodeCanvas 
                  value={`${window.location.origin}/?ref=${currentUser.id || currentUser.referral_code || currentUser.promo_code}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                  fgColor={darkMode ? '#18181b' : '#09090b'}
                />
              </div>

              <div className="w-full space-y-4">
                <div className={`p-4 rounded-2xl border-2 border-dashed ${darkMode ? 'bg-zinc-900/50 border-zinc-700' : 'bg-white/50 border-violet-500/20'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Your Promo Code</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className={`text-2xl font-black tracking-widest ${darkMode ? 'text-brand-accent' : 'text-violet-500'}`}>
                      {currentUser.promo_code || currentUser.referral_code || 'N/A'}
                    </span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(currentUser.promo_code || currentUser.referral_code || '');
                        toast.success('Code copied!');
                      }}
                      className={`p-2 rounded-xl transition-colors ${darkMode ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-white text-zinc-400 hover:text-violet-500 shadow-sm'}`}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a 
                    href={`https://wa.me/?text=${encodeURIComponent(`Hi! Book your appointment at ${clinicProfile.name} using my link: ${window.location.origin}/?ref=${currentUser.id || currentUser.referral_code || currentUser.promo_code}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-3 p-5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${darkMode ? 'bg-brand-accent text-brand-primary shadow-brand-accent/10 hover:bg-brand-accent/90' : 'bg-gradient-to-r from-brand-accent to-rose-500 text-zinc-900 shadow-brand-accent hover:from-brand-accent hover:to-rose-500'}`}
                  >
                    <MessageCircle size={18} />
                    Share on WhatsApp
                  </a>
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/?ref=${currentUser.id || currentUser.referral_code || currentUser.promo_code}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Pautan disalin!');
                    }}
                    className={`flex items-center justify-center gap-3 p-5 border rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm ${darkMode ? 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50' : 'bg-white text-zinc-900 border-zinc-100 hover:bg-zinc-50'}`}
                  >
                    <Share2 size={18} />
                    Copy Referral Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Log New Referral (Staff Only) */}
        {currentUser.role === 'affiliate' && !isMobile && (
      <div className={`${darkMode ? 'bg-white border-zinc-200 rotate-[-1deg]' : 'bg-violet-500 border-violet-500'} p-8 rounded-[2.5rem] border shadow-[0_8px_30px_rgb(0,0,0,0.02)]`}>
        <div className="flex items-center gap-2 mb-6">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${darkMode ? 'bg-brand-accent text-brand-primary shadow-brand-accent/20 rotate-[5deg]' : 'bg-violet-500 text-white shadow-violet-500'}`}>
            <PlusCircle size={20} />
          </div>
          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Log New Referral</h3>
        </div>
        <form onSubmit={handleSubmitReferral} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Patient Name</label>
            <input 
              type="text" 
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
              placeholder="Enter patient name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">WhatsApp Number</label>
              <input 
                type="tel" 
                required
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
                placeholder="e.g. +60123456789"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Patient IC</label>
              <input 
                type="text" 
                required
                value={patientIC}
                onChange={(e) => setPatientIC(e.target.value)}
                className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
                placeholder="IC Number"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Patient Type</label>
            <select 
              required
              value={patientType}
              onChange={(e) => setPatientType(e.target.value as 'new' | 'existing')}
              className={`w-full px-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
            >
              <option value="new">New Patient</option>
              <option value="existing">Existing Patient</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Patient Address</label>
            <textarea 
              required
              value={patientAddress}
              onChange={(e) => setPatientAddress(e.target.value)}
              className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium h-20 resize-none focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
              placeholder="Enter patient address"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Service Promoted</label>
            <div className="relative">
              <select 
                required
                value={selectedService}
                onChange={(e) => {
                  setSelectedService(e.target.value);
                  setSelectedBranch('');
                  setAppointmentDate('');
                  setBookingTime('');
                }}
                className={`w-full px-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium pr-12 focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
              >
                <option value="">Select a service</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({clinicProfile.currency}{s.commission_rate} incentive {(s.aracoins_perk || 0) > 0 ? `+ ${s.aracoins_perk} Coins` : ''})</option>
                ))}
                {selectedService && !services.find(s => String(s.id) === String(selectedService)) && urlServiceName && (
                  <option value={selectedService}>{urlServiceName}</option>
                )}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Target Branch</label>
            <select 
              required
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setAppointmentDate('');
                setBookingTime('');
              }}
              className={`w-full px-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
            >
              <option value="">Select Branch</option>
              {(() => {
                const s = services.find(srv => String(srv.id) === String(selectedService));
                if (!s || !s.branches) return branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>);
                const activeBranches = Object.keys(s.branches).filter(bName => s.branches![bName].active);
                if (activeBranches.length === 0) return branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>);
                return activeBranches.map(bName => <option key={bName} value={bName}>{bName}</option>);
              })()}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Booking Date</label>
              <input 
                type="date" 
                required
                min={(() => {
                  const s = services.find(srv => String(srv.id) === String(selectedService));
                  const bSched = (s?.branches && selectedBranch) ? s.branches[selectedBranch] : null;
                  const today = new Date().toISOString().split('T')[0];
                  if (bSched?.startDate && bSched.startDate > today) return bSched.startDate;
                  return today;
                })()}
                max={(() => {
                  const s = services.find(srv => String(srv.id) === String(selectedService));
                  const bSched = (s?.branches && selectedBranch) ? s.branches[selectedBranch] : null;
                  return bSched?.endDate || undefined;
                })()}
                value={appointmentDate}
                onChange={(e) => {
                  const date = e.target.value;
                  const s = services.find(srv => String(srv.id) === String(selectedService));
                  const bSched = (s?.branches && selectedBranch) ? s.branches[selectedBranch] : null;
                  
                  if (bSched && bSched.days && bSched.days.length > 0) {
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const selectedDay = dayNames[new Date(date).getDay()];
                    if (!bSched.days.includes(selectedDay)) {
                      alert(`This service is only available on: ${bSched.days.join(', ')}`);
                      setAppointmentDate('');
                      return;
                    }
                  }

                  if (bSched && bSched.blockedDates) {
                    const isBlocked = bSched.blockedDates.some((bd: any) => bd.date === date && bd.type === 'all-day');
                    if (isBlocked) {
                      alert('This date is fully booked or unavailable.');
                      setAppointmentDate('');
                      return;
                    }
                  }

                  setAppointmentDate(date);
                  setBookingTime('');
                }}
                className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-1 tracking-widest">Booking Time</label>
              <select 
                required
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className={`w-full px-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 ${darkMode ? 'bg-zinc-50 border-zinc-100 focus:ring-brand-accent/10 focus:border-brand-accent/50 text-zinc-900' : 'bg-white border-zinc-100 focus:ring-violet-500 focus:border-violet-500 text-zinc-900'}`}
              >
                <option value="">Select time</option>
                {(() => {
                  const slots = getAvailableTimeSlots(selectedService, selectedBranch, appointmentDate);
                  if (slots.length === 0) return <option disabled>No slots available</option>;
                  return slots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ));
                })()}
              </select>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] shadow-xl disabled:opacity-50 mt-2 flex items-center justify-center gap-2 ${darkMode ? 'bg-brand-accent text-brand-primary shadow-brand-accent/20 hover:bg-brand-accent/90' : 'bg-gradient-to-r from-violet-500 to-rose-500 text-zinc-900 shadow-violet-500 hover:from-violet-500 hover:to-rose-500'}`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <PlusCircle size={16} />
                Submit Referral
              </>
            )}
          </button>
        </form>
      </div>
    )}

        <div className="bg-brand-primary p-8 rounded-[2.5rem] border border-brand-primary">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0">
              <Info size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">How to use?</h4>
              <p className="text-xs text-white/80 leading-relaxed">
                Share your link or QR code on social media, WhatsApp, or print it out! When patients book using your link, you'll see them in your history automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
