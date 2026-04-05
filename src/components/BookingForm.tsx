import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, User, Phone, ChevronRight } from 'lucide-react';

interface BookingFormProps {
  selectedService: { id: string | number | null; name: string };
  services: any[];
  branches: any[];
  onSubmit: (payload: any) => Promise<void>;
  isSubmitting: boolean;
  getAvailableTimeSlots: (serviceId: string, branchName: string, date: string) => string[];
  darkMode?: boolean;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  selectedService,
  services,
  branches,
  onSubmit,
  isSubmitting,
  getAvailableTimeSlots,
  darkMode = false
}) => {
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientType, setPatientType] = useState<'new' | 'existing'>('new');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      patient_name: patientName,
      patient_phone: patientPhone,
      patient_type: patientType,
      service_id: selectedService.id,
      service_name: selectedService.name,
      branch: selectedBranch,
      appointment_date: appointmentDate,
      booking_time: bookingTime,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Read-only Service Display - LOCKED IN */}
      <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-violet-50 border-violet-100'} p-5 rounded-2xl border`}>
        <label className="block text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1.5 ml-1">Service Locked In</label>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-zinc-900">
            <ChevronRight size={18} />
          </div>
          <p className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
            {selectedService.name}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className={`block text-[10px] font-black uppercase mb-1.5 ml-1 tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Your Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className={`w-full pl-12 pr-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500/50 ${
                darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'
              }`}
              placeholder="Enter your name"
            />
          </div>
        </div>

        <div>
          <label className={`block text-[10px] font-black uppercase mb-1.5 ml-1 tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>WhatsApp Number</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="tel" 
              required
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              className={`w-full pl-12 pr-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500/50 ${
                darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'
              }`}
              placeholder="e.g. +60123456789"
            />
          </div>
        </div>

        <div>
          <label className={`block text-[10px] font-black uppercase mb-1.5 ml-1 tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Patient Type</label>
          <select 
            required
            value={patientType}
            onChange={(e) => setPatientType(e.target.value as 'new' | 'existing')}
            className={`w-full px-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500/50 ${
              darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'
            }`}
          >
            <option value="new">New Patient</option>
            <option value="existing">Existing Patient</option>
          </select>
        </div>

        <div>
          <label className={`block text-[10px] font-black uppercase mb-1.5 ml-1 tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Select Branch</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <select 
              required
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setAppointmentDate('');
                setBookingTime('');
              }}
              className={`w-full pl-12 pr-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500/50 ${
                darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'
              }`}
            >
              <option value="">Select a branch</option>
              {(() => {
                const s = selectedService.id ? services.find(srv => srv.id === selectedService.id) : null;
                if (!s || !s.branches) return branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>);
                const activeBranches = Object.keys(s.branches).filter(bName => s.branches![bName].active);
                if (activeBranches.length === 0) return branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>);
                return activeBranches.map(bName => <option key={bName} value={bName}>{bName}</option>);
              })()}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-[10px] font-black uppercase mb-1.5 ml-1 tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Booking Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="date" 
                required
                min={new Date().toISOString().split('T')[0]}
                value={appointmentDate}
                onChange={(e) => {
                  setAppointmentDate(e.target.value);
                  setBookingTime('');
                }}
                className={`w-full pl-12 pr-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500/50 ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'
                }`}
              />
            </div>
          </div>
          <div>
            <label className={`block text-[10px] font-black uppercase mb-1.5 ml-1 tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Booking Time</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <select 
                required
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className={`w-full pl-12 pr-5 py-4 rounded-2xl border transition-all appearance-none text-sm font-medium focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500/50 ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'
                }`}
              >
                <option value="">Select time</option>
                {getAvailableTimeSlots(selectedService.id?.toString() || '', selectedBranch, appointmentDate).map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <button 
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-violet-500 text-zinc-900 py-5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest hover:bg-violet-600 transition-all shadow-xl shadow-violet-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Processing...' : 'Confirm Appointment'}
      </button>
    </form>
  );
};
