import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
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


// Day abbreviation → JS getDay() number
const DAY_MAP: Record<string, number> = {
  'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
};

const MONTHS = ['Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'];
const DAYS_HEADER = ['Ahd','Isn','Sel','Rab','Kha','Jum','Sab'];

interface AraCalendarProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  availableDays: string[]; // e.g. ['Mon', 'Wed', 'Fri']
}

const AraCalendar: React.FC<AraCalendarProps> = ({ value, onChange, availableDays }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = React.useState(today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(today.getMonth());

  const availableJsDays = availableDays.map(d => DAY_MAP[d]).filter(n => n !== undefined);

  const isAvailable = (date: Date) => {
    if (date < today) return false;
    if (availableJsDays.length === 0) return true; // no restriction
    return availableJsDays.includes(date.getDay());
  };

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div className="bg-white rounded-2xl p-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#0d1f3c]/40 hover:bg-[#0d1f3c]/5 transition-colors font-bold text-lg">
          ‹
        </button>
        <span className="text-sm font-bold text-[#0d1f3c]">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#0d1f3c]/40 hover:bg-[#0d1f3c]/5 transition-colors font-bold text-lg">
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_HEADER.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-[#0d1f3c]/30 uppercase py-1">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;
          const dateStr = formatDate(date);
          const avail = isAvailable(date);
          const isSelected = dateStr === value;
          const isToday = formatDate(today) === dateStr;
          const isPast = date < today;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!avail}
              onClick={() => avail && onChange(dateStr)}
              className={`
                aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all
                ${isSelected
                  ? 'bg-[#F5F5DC] text-[#0d1f3c] font-bold shadow-sm'
                  : avail
                  ? 'bg-[#F5F5DC]/30 text-[#0d1f3c] hover:bg-[#F5F5DC] cursor-pointer'
                  : isPast
                  ? 'text-[#0d1f3c]/15 cursor-not-allowed'
                  : 'text-[#0d1f3c]/20 cursor-not-allowed line-through'
                }
                ${isToday && !isSelected ? 'ring-1 ring-[#0d1f3c]/20' : ''}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#0d1f3c]/5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#F5F5DC]" />
          <span className="text-[10px] text-[#0d1f3c]/40">Tersedia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#0d1f3c]/10" />
          <span className="text-[10px] text-[#0d1f3c]/40">Tidak tersedia</span>
        </div>
      </div>
    </div>
  );
};

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
  const [isLookingUpAffiliate, setIsLookingUpAffiliate] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get('ref');
    const storedRef = localStorage.getItem('araclinic_ref_code');
    const effectiveRef = urlRef || storedRef;

    if (effectiveRef) {
      localStorage.setItem('araclinic_ref_code', effectiveRef);
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
      <div className="min-h-screen bg-[#0d1f3c] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-3xl border border-white/10 p-8 text-center"
        >
          <div className="w-20 h-20 bg-[#F5F5DC]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-[#F5F5DC]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Tempahan Berjaya!</h2>
          <p className="text-white/50 mb-8 text-sm leading-relaxed">Terima kasih kerana memilih kami. Pihak kami akan menghubungi anda dalam masa terdekat untuk pengesahan.</p>
          <div className="space-y-3">
            <button 
              onClick={() => {
                setBookingSuccess(false);
                setPublicBookingStep('lead');
                setDraftReferralId(null);
                setPatientName('');
                setPatientPhone('');
                setPatientIC('');
                setPatientAddress('');
                setSelectedService('');
                setAppointmentDate('');
                setBookingTime('');
              }}
              className="w-full py-4 bg-[#F5F5DC] text-[#0d1f3c] rounded-2xl font-bold hover:bg-white active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle size={20} />
              Buat Tempahan Baru
            </button>
            <a 
              href="https://klinikara24jam.hsohealthcare.com"
              className="w-full py-4 bg-white/10 text-white/60 rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
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
      <div className="min-h-screen bg-[#0d1f3c] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white/10 rounded-3xl border border-white/10 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F5F5DC] mx-auto mb-6"></div>
          <p className="text-white/40">Mengesahkan kod rujukan...</p>
        </div>
      </div>
    );
  }

  if (!referringStaff && providedRefCode) {
    return (
      <div className="min-h-screen bg-[#0d1f3c] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-3xl border border-white/10 p-8 text-center">
          <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Kod Tidak Sah</h2>
          <p className="text-white/40 mb-8 text-sm">Maaf, kod rujukan ini tidak wujud atau telah tamat tempoh.</p>
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
    <div className="min-h-screen pb-12 bg-[#0d1f3c]">



      <div className="max-w-md mx-auto px-6">

        {/* ── LEAD STEP: Full-page navy design ── */}
        {isLeadStep && (
          <div className="min-h-screen flex flex-col items-center justify-center py-12">

            {/* Logo — white version hardcoded for navy background */}
            <motion.div
              initial={{ opacity: 0, y: -24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="mb-8"
            >
              <img
                src="https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/lOGO%20ARA%20WHITE%20.png?alt=media"
                alt="Klinik Ara 24 Jam"
                className="h-24 w-auto object-contain"
              />
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

        {/* ── CHOICE STEP: full-page design ── */}
        {publicBookingStep === 'choice' && (
          <div className="min-h-screen flex flex-col py-10">

            {/* Header: logo + title side by side */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-4 mb-10"
            >
              <img
                src="https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/lOGO%20ARA%20WHITE%20.png?alt=media"
                alt="Klinik Ara"
                className="h-14 w-auto object-contain"
              />
              <div>
                <p className="text-white font-bold text-2xl leading-tight tracking-tight">Ara</p>
                <p className="text-white font-bold text-2xl leading-tight tracking-tight">Booking Hub</p>
              </div>
            </motion.div>

            {/* Two cards */}
            <div className="flex flex-col gap-4 flex-1">

              {/* Card 1 — full image */}
              <motion.button
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                onClick={() => setPublicBookingStep('form')}
                className="relative w-full rounded-3xl overflow-hidden active:scale-[0.98] transition-transform"
              >
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/1.png?alt=media"
                  alt="Isi borang temu janji"
                  className="w-full h-auto object-cover block"
                />
              </motion.button>

              {/* Card 2 — full image */}
              <motion.button
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.28 }}
                onClick={() => setPublicBookingStep('whatsapp')}
                className="relative w-full rounded-3xl overflow-hidden active:scale-[0.98] transition-transform"
              >
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/2.png?alt=media"
                  alt="Hubungi WhatsApp"
                  className="w-full h-auto object-cover block"
                />
              </motion.button>
            </div>

            {/* Back + brand footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col items-center gap-4 mt-8"
            >
              <button
                onClick={() => setPublicBookingStep('lead')}
                className="text-white/30 text-xs font-bold hover:text-white/60 transition-colors tracking-wide"
              >
                ← Kembali
              </button>
              <p className="text-white/20 text-[10px] font-bold tracking-[0.2em] uppercase">Klinik Ara 24 Jam</p>
            </motion.div>
          </div>
        )}

        {/* ── FORM + WHATSAPP STEPS ── */}
        {(publicBookingStep === 'form' || publicBookingStep === 'whatsapp') && (
          <div className="py-10">
            {/* Header — same design language as choice page */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-4 mb-8"
            >
              <img
                src="https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/lOGO%20ARA%20WHITE%20.png?alt=media"
                alt="Klinik Ara"
                className="h-14 w-auto object-contain"
              />
              <div>
                <p className="text-white font-bold text-2xl leading-tight tracking-tight">Ara</p>
                <p className="text-white font-bold text-2xl leading-tight tracking-tight">Booking Hub</p>
              </div>
            </motion.div>

            <motion.div
              key={publicBookingStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/10"
            >

          {publicBookingStep === 'form' && (
            <form onSubmit={onFormSubmit} className="space-y-5">
              <div className="space-y-4">

                {/* Service (locked or select) */}
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Perkhidmatan</label>
                  {(selectedService || urlServiceName) ? (
                    <div className="relative">
                      <input 
                        type="text"
                        readOnly
                        value={urlServiceName || services.find(s => String(s.id) === String(selectedService))?.name || 'Memuatkan...'}
                        className="w-full px-4 py-3.5 rounded-2xl bg-[#F5F5DC] text-[#0d1f3c] cursor-not-allowed font-bold text-sm"
                      />
                      <div className="absolute right-4 top-3.5">
                        <Lock size={15} className="text-[#0d1f3c]/40" />
                      </div>
                    </div>
                  ) : (
                    <select 
                      value={selectedService}
                      onChange={(e) => { setSelectedService(e.target.value); setUrlServiceName(''); setBookingTime(''); }}
                      className="w-full px-4 py-3.5 rounded-2xl bg-white text-[#0d1f3c] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#F5F5DC]"
                      required
                    >
                      <option value="">Pilih satu...</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Pilih Cawangan</label>
                  <select 
                    value={selectedBranch}
                    onChange={(e) => { setSelectedBranch(e.target.value); setBookingTime(''); }}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white text-[#0d1f3c] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#F5F5DC]"
                    required
                  >
                    <option value="">Pilih cawangan...</option>
                    {getAvailableBranches().map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Calendar */}
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Tarikh Temujanji</label>
                  {selectedBranch && selectedService ? (
                    <AraCalendar
                      value={appointmentDate}
                      onChange={(d) => { setAppointmentDate(d); setBookingTime(''); }}
                      availableDays={(() => {
                        const srv = services.find(s => String(s.id) === String(selectedService) || s.name === selectedService);
                        return (srv?.branches?.[selectedBranch] as any)?.days || [];
                      })()}
                    />
                  ) : (
                    <div className="w-full px-4 py-3.5 rounded-2xl bg-white/10 text-white/30 text-sm text-center">
                      Sila pilih cawangan dahulu...
                    </div>
                  )}
                  {appointmentDate && allPossibleSlots.length === 0 && !isLoadingSlots && (
                    <p className="mt-2 text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                      <span>✕</span> Tarikh ini tidak tersedia. Sila pilih tarikh lain.
                    </p>
                  )}
                </div>

                {/* Time Slots */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Waktu Temujanji</label>
                    {isLoadingSlots && <span className="text-[10px] font-bold text-[#F5F5DC]/60 animate-pulse">Menyemak...</span>}
                  </div>
                  
                  {!appointmentDate || !selectedBranch ? (
                    <div className="w-full px-4 py-3.5 rounded-2xl bg-white/10 text-white/30 text-sm text-center">
                      Sila pilih cawangan & tarikh dahulu...
                    </div>
                  ) : allPossibleSlots.length === 0 ? (
                    <div className="w-full px-4 py-3.5 rounded-2xl bg-rose-500/10 border border-rose-400/20 text-rose-400 text-sm font-bold text-center flex items-center justify-center gap-2">
                      <AlertCircle size={15} /> Tutup pada tarikh ini
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
                            className={`py-3 rounded-xl text-sm font-bold transition-all ${
                              isSelected
                                ? 'bg-[#F5F5DC] text-[#0d1f3c] shadow-md'
                                : isAvailable
                                ? 'bg-white text-[#0d1f3c] hover:bg-[#F5F5DC]/80 active:scale-95'
                                : 'bg-white/10 text-white/20 cursor-not-allowed line-through'
                            }`}
                          >
                            {timeSlot}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <input type="text" value={bookingTime} onChange={() => {}} className="sr-only" required tabIndex={-1} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setPublicBookingStep('choice')}
                  className="flex-1 py-4 bg-white/10 text-white/60 rounded-2xl font-bold hover:bg-white/20 transition-all"
                >
                  Kembali
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-4 bg-[#F5F5DC] text-[#0d1f3c] rounded-2xl font-bold hover:bg-white active:scale-95 transition-all shadow-lg disabled:opacity-40"
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
              <div className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Pilih Cawangan Terdekat</label>
                    <select 
                      value={selectedWaBranch}
                      onChange={(e) => setSelectedWaBranch(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-white text-[#0d1f3c] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#F5F5DC]"
                    >
                      <option value="">Pilih cawangan...</option>
                      {branches.filter(b => b.is_active !== false && b.isActive !== false && b.status?.toLowerCase() !== 'inactive')
                        .map(b => (<option key={b.id} value={b.name}>{b.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Perkhidmatan</label>
                    {(selectedService || urlServiceName) ? (
                      <div className="relative">
                        <input type="text" readOnly
                          value={urlServiceName || services.find(s => String(s.id) === String(selectedService))?.name || 'Memuatkan...'}
                          className="w-full px-4 py-3.5 rounded-2xl bg-[#F5F5DC] text-[#0d1f3c] cursor-not-allowed font-bold text-sm"
                        />
                        <div className="absolute right-4 top-3.5"><Lock size={15} className="text-[#0d1f3c]/40" /></div>
                      </div>
                    ) : (
                      <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-2xl bg-white text-[#0d1f3c] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#F5F5DC]" required>
                        <option value="">Pilih satu...</option>
                        {services.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setPublicBookingStep('choice')}
                    className="flex-1 py-4 bg-white/10 text-white/60 rounded-2xl font-bold hover:bg-white/20 transition-all">
                    Kembali
                  </button>
                  <a href={waUrl} target="_blank" rel="noopener noreferrer"
                    onClick={async (e) => {
                      e.preventDefault();
                      window.open(waUrl, '_blank', 'noopener,noreferrer');
                      if (draftReferralId) {
                        const { error } = await supabase.from('warm_leads').update({ status: 'whatsapp_redirected', branch_preference: selectedWaBranch }).eq('id', draftReferralId);
                        if (error) console.error("Error updating warm lead for WhatsApp:", error);
                      }
                      localStorage.removeItem('araclinic_ref_code');
                      setBookingSuccess(true);
                    }}
                    className={`flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-400 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${!selectedWaBranch ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <MessageCircle size={20} /> Buka WhatsApp
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