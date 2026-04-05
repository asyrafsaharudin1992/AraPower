import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Phone, 
  ChevronRight, 
  FileText, 
  MessageCircle, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { Service, Staff, ClinicProfile } from '../types';

interface PublicBookingUIProps {
  services: Service[];
  branches: any[];
  clinicProfile: ClinicProfile;
  handleSubmitReferral: (e: React.FormEvent, formData: any) => Promise<boolean>;
  apiBaseUrl: string;
  getAvailableTimeSlots: (serviceId: string, branchName: string, date: string) => string[];
  Logo: React.ComponentType<any>;
  isSubmitting: boolean;
  safeFetch: (url: string, options?: RequestInit) => Promise<{ res: Response; data: any }>;
}

const PublicBookingUI: React.FC<PublicBookingUIProps> = ({
  services,
  branches,
  clinicProfile,
  handleSubmitReferral,
  apiBaseUrl,
  getAvailableTimeSlots,
  Logo,
  isSubmitting,
  safeFetch
}) => {
  const [publicBookingStep, setPublicBookingStep] = useState<'lead' | 'choice' | 'form' | 'whatsapp'>('lead');
  const [selectedWaBranch, setSelectedWaBranch] = useState('');
  const [draftReferralId, setDraftReferralId] = useState<number | null>(null);
  const [referringStaff, setReferringStaff] = useState<Staff | null>(null);
  const [providedRefCode, setProvidedRefCode] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientIC, setPatientIC] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  const [patientType, setPatientType] = useState('new');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [urlServiceName, setUrlServiceName] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const serviceId = params.get('service');
    const sName = params.get('sName');

    if (ref) {
      setProvidedRefCode(ref);
      safeFetch(`${apiBaseUrl}/api/affiliate-lookup/${ref}`)
        .then(({ res, data }) => {
          if (res.ok && data) {
            setReferringStaff(data);
          }
        })
        .catch(err => console.error('Failed to lookup affiliate:', err));
    }

    if (serviceId) {
      setSelectedService(serviceId);
    }
    if (sName) {
      setUrlServiceName(sName);
    }
  }, [apiBaseUrl, safeFetch]);

  const handleProceedLead = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!patientName || !patientPhone) return;
    
    setPublicBookingStep('choice');
    
    try {
      const payload = {
        patient_name: patientName,
        patient_phone: patientPhone,
        service_id: selectedService || null
      };
      
      safeFetch(`${apiBaseUrl}/api/warm-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.error('Silent fail for warm lead:', err));
      
    } catch (err) {
      console.error('Failed to initiate warm lead process:', err);
    }
  };

  const onFormSubmit = async (e: React.FormEvent) => {
    const formData = {
      patientName,
      patientPhone,
      patientIC,
      patientAddress,
      patientType,
      appointmentDate,
      bookingTime,
      selectedBranch,
      selectedService,
      referringStaff,
      providedRefCode,
      draftReferralId
    };
    
    const success = await handleSubmitReferral(e, formData);
    if (success) {
      setBookingSuccess(true);
      // Reset local states if needed, though App.tsx might handle redirect/success UI
      setPatientName('');
      setPatientPhone('');
      setPatientIC('');
      setPatientAddress('');
      setPatientType('new');
      setAppointmentDate('');
      setBookingTime('');
      setSelectedService('');
      setDraftReferralId(null);
      setPublicBookingStep('lead');
    }
  };

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-8 text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Tempahan Berjaya!</h2>
          <p className="text-zinc-500 mb-8">Terima kasih kerana memilih kami. Pihak kami akan menghubungi anda dalam masa terdekat untuk pengesahan.</p>
          <button 
            onClick={() => {
              setBookingSuccess(false);
              setPublicBookingStep('lead');
              setDraftReferralId(null);
              setPatientName('');
              setPatientPhone('');
            }}
            className="w-full py-4 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200"
          >
            Kembali ke Laman Utama
          </button>
        </motion.div>
      </div>
    );
  }

  if (!referringStaff && providedRefCode) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Kod Tidak Sah</h2>
          <p className="text-zinc-500 mb-8">Maaf, kod rujukan ini tidak wujud atau telah tamat tempoh.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <Logo logoUrl={clinicProfile?.logoUrl} />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
              <User size={16} className="text-violet-600" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-zinc-400 uppercase leading-none">Rujukan Oleh</p>
              <p className="text-xs font-bold text-zinc-900">{referringStaff?.name || 'Pusat Rawatan'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Tempahan Rawatan</h1>
          <p className="text-zinc-500">Sila lengkapkan maklumat di bawah untuk temujanji anda.</p>
        </div>

        <motion.div 
          key={publicBookingStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-6 border border-zinc-100"
        >
          {publicBookingStep === 'lead' && (
            <form onSubmit={handleProceedLead} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Nama Pesakit</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                    <input 
                      type="text" 
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      placeholder="Nama penuh anda"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Nombor Telefon</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                    <input 
                      type="tel" 
                      required
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      placeholder="Contoh: 0123456789"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={!patientName || !patientPhone}
                className="w-full py-4 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Teruskan proses
                <ChevronRight size={20} />
              </button>

              {/* Add this disclaimer right here! */}
              <p className="text-[10px] text-zinc-500 text-center mt-3 px-4 leading-relaxed">
                By pressing proceed, you agree to share your contact information with our clinic for booking purposes.
              </p>
            </form>
          )}

          {publicBookingStep === 'choice' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-zinc-600 font-medium">Terima kasih {patientName}! Bagaimana anda ingin meneruskan?</p>
              </div>
              
              <div className="grid gap-4">
                <button 
                  onClick={() => setPublicBookingStep('form')}
                  className="p-6 rounded-2xl border-2 border-violet-100 hover:border-violet-500 hover:bg-violet-50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all">
                      <FileText size={24} />
                    </div>
                    <ChevronRight size={20} className="text-zinc-300 group-hover:text-violet-500" />
                  </div>
                  <h3 className="font-bold text-zinc-900">Isi Borang Temujanji</h3>
                  <p className="text-xs text-zinc-500">Lengkapkan maklumat untuk pengesahan pantas.</p>
                </button>

                <button 
                  onClick={() => setPublicBookingStep('whatsapp')}
                  className="p-6 rounded-2xl border-2 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <MessageCircle size={24} />
                    </div>
                    <ChevronRight size={20} className="text-zinc-300 group-hover:text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-zinc-900">Hubungi Melalui WhatsApp</h3>
                  <p className="text-xs text-zinc-500">Berbual dengan pegawai kami secara terus.</p>
                </button>
              </div>

              <button 
                onClick={() => setPublicBookingStep('lead')}
                className="w-full py-3 text-zinc-400 text-sm font-bold hover:text-zinc-600"
              >
                Kembali
              </button>
            </div>
          )}

          {publicBookingStep === 'form' && (
            <form onSubmit={onFormSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Pilih Perkhidmatan</label>
                  <select 
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    required
                  >
                    <option value="">Pilih satu...</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    {selectedService && !services.find(s => String(s.id) === String(selectedService)) && urlServiceName && (
                      <option value={selectedService}>{urlServiceName}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Pilih Cawangan</label>
                  <select 
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    required
                  >
                    <option value="">Pilih cawangan...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Tarikh Temujanji</label>
                  <input 
                    type="date" 
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Waktu Temujanji</label>
                  <input 
                    type="time" 
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setPublicBookingStep('choice')}
                  className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                >
                  Kembali
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-4 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menghantar...' : 'Hantar Tempahan'}
                </button>
              </div>
            </form>
          )}

          {publicBookingStep === 'whatsapp' && (() => {
            const waNum = branches.find(b => b.name === selectedWaBranch)?.whatsapp_number || '60123456789';
            const srv = services.find(s => String(s.id) === String(selectedService));
            const serviceName = srv?.name || urlServiceName || 'perkhidmatan kami';
            const waUrl = `https://wa.me/${waNum}?text=Hi/Salam,%20Saya%20${encodeURIComponent(patientName)},%20saya%20berminat%20dengan%20${encodeURIComponent(serviceName)}`;
            
            return (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Pilih Cawangan Terdekat</label>
                    <select 
                      value={selectedWaBranch}
                      onChange={(e) => setSelectedWaBranch(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    >
                      <option value="">Pilih cawangan...</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Pilih Perkhidmatan (Opsional)</label>
                    <select 
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    >
                      <option value="">Pilih satu...</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      {selectedService && !services.find(s => String(s.id) === String(selectedService)) && urlServiceName && (
                        <option value={selectedService}>{urlServiceName}</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setPublicBookingStep('choice')}
                    className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                  >
                    Kembali
                  </button>
                  <a 
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(waUrl, '_blank', 'noopener,noreferrer');
                      if (draftReferralId) {
                        safeFetch(`${apiBaseUrl}/api/referrals/${draftReferralId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'whatsapp_redirected', branch: selectedWaBranch })
                        }).catch(console.error);
                      }
                      setBookingSuccess(true);
                    }}
                    className={`flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 ${!selectedWaBranch ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <MessageCircle size={20} />
                    Buka WhatsApp
                  </a>
                </div>
              </div>
            );
          })()}
        </motion.div>
      </div>
    </div>
  );
};

export default PublicBookingUI;
