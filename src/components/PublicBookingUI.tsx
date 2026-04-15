import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Phone, 
  ChevronRight, 
  FileText, 
  MessageCircle, 
  CheckCircle, 
  AlertCircle,
  Lock,
  PlusCircle,
  Home
} from 'lucide-react';
import { Service, Staff, ClinicProfile } from '../types';
import { supabase } from '../supabase';

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
  const [draftReferralId, setDraftReferralId] = useState<string | null>(null);
  const [referringStaff, setReferringStaff] = useState<Staff | null>(null);
  const [providedRefCode, setProvidedRefCode] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [realAvailableSlots, setRealAvailableSlots] = useState<string[]>([]);
  const [allPossibleSlots, setAllPossibleSlots] = useState<string[]>([]); // ADD THIS
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
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
  const [rawRefCode, setRawRefCode] = useState<string | null>(null);
  const [isLookingUpAffiliate, setIsLookingUpAffiliate] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get('ref');
    const storedRef = localStorage.getItem('araclinic_ref_code');
    const effectiveRef = urlRef || storedRef;

    if (effectiveRef) {
      localStorage.setItem('araclinic_ref_code', effectiveRef);
      setRawRefCode(effectiveRef);
      setProvidedRefCode(effectiveRef);
      setIsLookingUpAffiliate(true);
      
      safeFetch(`${apiBaseUrl}/api/affiliate-lookup/${effectiveRef}`)
        .then(({ res, data }) => {
          if (res.ok && data) setReferringStaff(data);
        })
        .catch(err => console.error('Failed to lookup affiliate:', err))
        .finally(() => setIsLookingUpAffiliate(false));
    }

    const serviceFromUrl = params.get('serviceName') || params.get('sName');
    if (serviceFromUrl) {
      const decodedService = decodeURIComponent(serviceFromUrl.replace(/\+/g, ' '));
      setUrlServiceName(decodedService);
      // Try to find a matching service ID
      const matchedService = services.find(s => 
        s.name.toLowerCase() === decodedService.toLowerCase()
      );
      if (matchedService) {
        setSelectedService(String(matchedService.id));
      } else {
        // If it's a generic word (e.g. from an ad) just store the string
        setSelectedService(decodedService);
      }
    }

    const urlId = params.get('service') || params.get('serviceId');
    const urlNameRaw = params.get('sName') || params.get('serviceName');
    const decodedName = urlNameRaw ? decodeURIComponent(urlNameRaw) : '';

    // The Smart Translator: Wait for services to load from Supabase
    if (services.length > 0 && (urlId || decodedName)) {
      const matchedService = services.find(s => 
        String(s.id) === String(urlId) || 
        (s.target_url && s.target_url.includes(urlId || '')) ||
        (decodedName && s.name.toLowerCase().trim() === decodedName.toLowerCase().trim())
      );

      if (matchedService) {
        setSelectedService(String(matchedService.id)); // Lock in valid Supabase UUID
        setUrlServiceName(matchedService.name);
      } else {
        // Fallback if truly not found
        if (urlId) setSelectedService(urlId);
        if (decodedName) setUrlServiceName(decodedName);
      }
    }
  }, [services, apiBaseUrl, safeFetch]); // Crucial: Re-runs when services arrive from DB

  const handleProceedLead = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!patientName || !patientPhone) return;
    
    setPublicBookingStep('choice');
    
    try {
      const params = new URLSearchParams(window.location.search);
      const rawName = params.get('sName') || params.get('serviceName');
      
      let finalName = selectedService || 'Unknown Service';
      
      if (rawName) {
        finalName = decodeURIComponent(rawName.replace(/\+/g, ' '));
      } else {
        const matchedService = services.find(s => String(s.id) === String(selectedService));
        if (matchedService) finalName = matchedService.name;
      }

      const { data, error } = await supabase
        .from('warm_leads')
        .insert([{
          patient_name: patientName,
          patient_phone: patientPhone,
          service_id: finalName,
          status: 'new',
          ...(providedRefCode && { ref_code: providedRefCode })
        }])
        .select();

      if (error) {
        console.error('Supabase Insert Error:', error);
      } else if (data && data[0]) {
        setDraftReferralId(data[0].id);
      }
      
    } catch (err) {
      console.error('Failed to initiate warm lead process:', err);
    }
  };

  useEffect(() => {
    async function checkRealTimeSlots() {
      if (!appointmentDate || !selectedBranch || !selectedService) {
        setRealAvailableSlots([]);
        setAllPossibleSlots([]);
        return;
      }
      setIsLoadingSlots(true);

      const srv = services.find(s => String(s.id) === String(selectedService) || s.name === selectedService);
      const actualServiceId = srv ? String(srv.id) : selectedService;

      // 1. Get base slots from the clinic's schedule config (App.tsx)
      const baseSlots = getAvailableTimeSlots(actualServiceId, selectedBranch, appointmentDate);
      setAllPossibleSlots(baseSlots);

      if (baseSlots.length === 0) {
        setRealAvailableSlots([]);
        setIsLoadingSlots(false);
        return;
      }

      try {
        // Securely ask the backend for taken slots (Bypasses RLS safely)
        const { res, data } = await safeFetch(`${apiBaseUrl}/api/public/slots?branch=${encodeURIComponent(selectedBranch)}&date=${appointmentDate}`);
        
        if (res.ok && data?.takenSlots) {
          const bSched = srv?.branches?.[selectedBranch] as any;
          // If limitBookings is disabled, slots are unlimited — do not cap at 1
          const maxSlots = bSched?.limitBookings ? (bSched.maxSlots || 1) : Infinity;

          const timeCounts: Record<string, number> = {};
          data.takenSlots.forEach((time: string) => {
            timeCounts[time] = (timeCounts[time] || 0) + 1;
          });

          // Filter out slots that have reached the max capacity for the whole branch
          const finalSlots = baseSlots.filter(slot => (timeCounts[slot] || 0) < maxSlots);
          setRealAvailableSlots(finalSlots);
        } else {
          setRealAvailableSlots(baseSlots);
        }
      } catch (err) {
        console.error("Error fetching taken slots:", err);
        setRealAvailableSlots(baseSlots);
      }
      setIsLoadingSlots(false);
    }

    checkRealTimeSlots();
  }, [appointmentDate, selectedBranch, selectedService, services]);

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // LIVE STRICT GUARD: Securely check the backend 1 millisecond before submitting
    if (appointmentDate && selectedBranch && bookingTime) {
      const srv = services.find(s => String(s.id) === String(selectedService) || s.name === selectedService);
      const bSched = srv?.branches?.[selectedBranch] as any;
      // If limitBookings is disabled, slots are unlimited — skip the capacity check entirely
      const maxSlots = bSched?.limitBookings ? (bSched.maxSlots || 1) : Infinity;

      const { res, data: slotCheck } = await safeFetch(`${apiBaseUrl}/api/public/slots?branch=${encodeURIComponent(selectedBranch)}&date=${appointmentDate}`);

      if (res.ok && slotCheck?.takenSlots && maxSlots !== Infinity) {
        // Use exact match (same logic as real-time slot checker above)
        const takenCount = slotCheck.takenSlots.filter((time: string) => time === bookingTime).length;
        if (takenCount >= maxSlots) {
          alert("Maaf! Waktu yang anda pilih baru sahaja ditempah oleh orang lain. Sila pilih waktu lain.");
          setBookingTime(''); 
          return; 
        }
      }
    }

    const formData = {
      patientName,
      patientPhone,
      patientIC,
      patientAddress,
      patientType,
      appointmentDate,
      bookingTime,
      selectedBranch,
      selectedService, // Send the properly translated state
      referringStaff,
      providedRefCode,
      draftReferralId
    };
    
    const success = await handleSubmitReferral(e, formData);
    if (success) {
      localStorage.removeItem('araclinic_ref_code'); // CLEAR THE CACHE HERE
      setBookingSuccess(true);
      setPatientName('');
      setPatientPhone('');
      setPatientIC('');
      setPatientAddress('');
      setPatientType('new');
      setAppointmentDate('');
      setBookingTime('');
      setSelectedService('');
      setUrlServiceName('');
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
          <div className="space-y-3">
            <button 
              onClick={() => {
                setBookingSuccess(false);
                setPublicBookingStep('lead');
                setDraftReferralId(null);
                // Clear everything so they can start fresh
                setPatientName('');
                setPatientPhone('');
                setPatientIC('');
                setPatientAddress('');
                setSelectedService('');
                setAppointmentDate('');
                setBookingTime('');
              }}
              className="w-full py-4 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2"
            >
              <PlusCircle size={20} />
              Buat Tempahan Baru
            </button>
            
            <a 
              href="https://klinikara24jam.hsohealthcare.com"
              className="w-full py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
            >
              <Home size={20} />
              Kembali ke Laman Utama
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isLookingUpAffiliate) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-600 mx-auto mb-6"></div>
          <p className="text-zinc-500">Mengesahkan kod rujukan...</p>
        </div>
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

  const getAvailableBranches = () => {
    const allActive = branches.filter(b => b.is_active !== false && b.status !== 'inactive');
    if (!selectedService) return allActive;
    
    const srv = services.find(s => String(s.id) === String(selectedService) || s.name === selectedService);
    if (!srv || !srv.branches) return allActive;

    // Return only branches that actually offer this service
    return allActive.filter(b => Object.keys(srv.branches).includes(b.name));
  };

  // Navy + beige theme for lead step
  const isLeadStep = publicBookingStep === 'lead';

  return (
    <div className={`min-h-screen pb-12 transition-colors duration-500 ${isLeadStep ? 'bg-[#0d1f3c]' : 'bg-zinc-50'}`}>

      {/* Navbar — transparent on lead, white on other steps */}
      {!isLeadStep && (
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
      )}

      <div className="max-w-md mx-auto px-6">

        {/* ── LEAD STEP: Full-page navy design ── */}
        {isLeadStep && (
          <div className="min-h-screen flex flex-col items-center justify-center py-12">

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="mb-8"
            >
              <Logo logoUrl={clinicProfile?.logoUrl} />
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
              className="text-center mb-10"
            >
              <h1 className="text-3xl font-bold text-white leading-snug tracking-tight">
                Welcome to Ara<br />Booking Hub
              </h1>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={handleProceedLead}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              className="w-full space-y-4"
            >
              {/* Name input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-6 py-5 rounded-2xl bg-[#F5F5DC] text-[#0d1f3c] placeholder-[#8a8a6a] text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#F5F5DC]/60 transition-all"
                  placeholder="Nama pesakit"
                />
              </motion.div>

              {/* Phone input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <input
                  type="tel"
                  required
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full px-6 py-5 rounded-2xl bg-[#F5F5DC] text-[#0d1f3c] placeholder-[#8a8a6a] text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#F5F5DC]/60 transition-all"
                  placeholder="Nombor telefon"
                />
              </motion.div>

              {/* Submit button */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="pt-2"
              >
                <button
                  type="submit"
                  disabled={!patientName || !patientPhone}
                  className="w-full py-5 bg-[#38bdf8] hover:bg-[#29aee8] active:scale-95 text-white rounded-2xl font-bold text-lg tracking-wide transition-all shadow-lg shadow-sky-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Teruskan proses
                </button>
              </motion.div>

              {/* Disclaimer */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.75 }}
                className="text-[11px] text-white/40 text-center px-4 leading-relaxed pt-1"
              >
                Dengan menekan 'Teruskan proses', anda bersetuju untuk berkongsi butiran perhubungan anda dengan klinik kami bagi tujuan tempahan.
              </motion.p>
            </motion.form>

            {/* Footer brand */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="mt-12 text-white/30 text-xs font-bold tracking-[0.2em] uppercase"
            >
              Klinik Ara 24 Jam
            </motion.p>
          </div>
        )}

        {/* ── ALL OTHER STEPS: original layout ── */}
        {!isLeadStep && (
          <div className="py-8">
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

              <p className="text-[10px] text-zinc-500 text-center mt-3 px-4 leading-relaxed">
                Dengan menekan 'Teruskan proses', anda bersetuju untuk berkongsi butiran perhubungan anda dengan klinik kami bagi tujuan tempahan.
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
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Perkhidmatan</label>
                  {(selectedService || urlServiceName) ? (
                    <div className="relative">
                      <input 
                        type="text"
                        readOnly
                        value={urlServiceName || services.find(s => String(s.id) === String(selectedService))?.name || 'Memuatkan...'}
                        className="w-full px-4 py-3.5 rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-700 cursor-not-allowed font-bold"
                      />
                      <div className="absolute right-4 top-3.5">
                        <Lock size={16} className="text-zinc-400" />
                      </div>
                    </div>
                  ) : (
                    <select 
                      value={selectedService}
                      onChange={(e) => {
                        setSelectedService(e.target.value);
                        setUrlServiceName('');
                        setBookingTime(''); // Strictly reset time if service changes
                      }}
                      className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      required
                    >
                      <option value="">Pilih satu...</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Pilih Cawangan</label>
                  <select 
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value);
                      setBookingTime(''); // Strictly reset time if branch changes
                    }}
                    className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    required
                  >
                    <option value="">Pilih cawangan...</option>
                    {getAvailableBranches().map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Tarikh Temujanji</label>
                  <input 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]} 
                    value={appointmentDate}
                    onChange={(e) => {
                      // Just set the date — let the "Tutup pada tarikh ini" UI message
                      // inform the user naturally without blocking them with an alert.
                      setAppointmentDate(e.target.value);
                      setBookingTime('');
                    }}
                    className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    required
                  />
                  {/* Show available days hint when a branch is selected */}
                  {selectedBranch && selectedService && (() => {
                    const srv = services.find(s => String(s.id) === String(selectedService) || s.name === selectedService);
                    const bSched = srv?.branches?.[selectedBranch] as any;
                    const days: string[] = bSched?.days || [];
                    if (days.length === 0) return null;
                    return (
                      <p className="mt-2 text-[11px] text-violet-500 font-semibold flex items-center gap-1">
                        <span>✦</span>
                        <span>Perkhidmatan ini tersedia pada: <span className="font-bold">{days.join(', ')}</span></span>
                      </p>
                    );
                  })()}
                  {/* Friendly message when selected date is a closed day */}
                  {appointmentDate && selectedBranch && allPossibleSlots.length === 0 && !isLoadingSlots && (
                    <p className="mt-2 text-[11px] text-rose-500 font-semibold flex items-center gap-1">
                      <span>✕</span>
                      <span>Tarikh ini tidak tersedia. Sila pilih tarikh lain.</span>
                    </p>
                  )}
                </div>

               <div>
                  <div className="flex items-center justify-between mb-2 ml-1">
                    <label className="block text-xs font-bold text-zinc-500 uppercase">Waktu Temujanji</label>
                    {isLoadingSlots && <span className="text-[10px] font-bold text-violet-500 animate-pulse">Menyemak...</span>}
                  </div>
                  
                  {!appointmentDate || !selectedBranch ? (
                    <div className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 text-zinc-400 text-sm text-center">
                      Sila pilih cawangan & tarikh dahulu...
                    </div>
                  ) : allPossibleSlots.length === 0 ? (
                    <div className="w-full px-4 py-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 text-sm font-bold text-center flex items-center justify-center gap-2">
                      <AlertCircle size={16} />
                      Tutup pada tarikh ini
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {allPossibleSlots.map((timeSlot: string) => {
                        const isAvailable = realAvailableSlots.includes(timeSlot);
                        const isSelected = bookingTime === timeSlot;
                        
                        return (
                          <button
                            key={timeSlot}
                            type="button"
                            disabled={!isAvailable || isLoadingSlots}
                            onClick={() => setBookingTime(timeSlot)}
                            className={`py-3 rounded-xl text-sm font-bold transition-all border ${
                              isSelected
                                ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200'
                                : isAvailable
                                ? 'bg-white text-zinc-700 border-zinc-200 hover:border-violet-500 hover:text-violet-600 hover:bg-violet-50'
                                : 'bg-zinc-100 text-zinc-400 border-zinc-100 cursor-not-allowed opacity-60'
                            }`}
                          >
                            {timeSlot}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* Hidden input to ensure form validation works for required field */}
                  <input type="text" value={bookingTime} onChange={() => {}} className="sr-only" required tabIndex={-1} />
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
                      {branches
                        .filter(b => 
                          b.is_active !== false && 
                          b.isActive !== false && 
                          b.status?.toLowerCase() !== 'inactive'
                        )
                        .map(b => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Perkhidmatan</label>
                    {(selectedService || urlServiceName) ? (
                      <div className="relative">
                        <input 
                          type="text"
                          readOnly
                          value={urlServiceName || services.find(s => String(s.id) === String(selectedService))?.name || 'Memuatkan...'}
                          className="w-full px-4 py-3.5 rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-700 cursor-not-allowed font-bold"
                        />
                        <div className="absolute right-4 top-3.5">
                          <Lock size={16} className="text-zinc-400" />
                        </div>
                      </div>
                    ) : (
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
                      </select>
                    )}
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
                    onClick={async (e) => {
                      e.preventDefault();
                      window.open(waUrl, '_blank', 'noopener,noreferrer');
                      if (draftReferralId) {
                        const { error } = await supabase
                          .from('warm_leads')
                          .update({ 
                            status: 'whatsapp_redirected', 
                            branch_preference: selectedWaBranch 
                          })
                          .eq('id', draftReferralId);
                        if (error) console.error("Error updating warm lead for WhatsApp:", error);
                      }
                      localStorage.removeItem('araclinic_ref_code'); // CLEAR THE CACHE HERE
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
        )}
      </div>
    </div>
  );
};

export default PublicBookingUI;