import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  PlusCircle, 
  CheckCircle2, 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  Calendar as CalendarIcon,
  User,
  ExternalLink,
  ClipboardList
} from 'lucide-react';

interface ReceptionistUIProps {
  currentUser: any;
  referrals: any[];
  services: any[];
  branches: any[];
  clinicProfile: any;
  isMobile: boolean;
  handleSubmitReferral: (e: React.FormEvent) => Promise<boolean>;
  checkPromoCode: (code: string) => void;
  walkInPromoCode: string;
  walkInStaff: any;
  patientName: string;
  setPatientName: (name: string) => void;
  patientType: 'new' | 'existing';
  setPatientType: (type: 'new' | 'existing') => void;
  selectedService: string;
  setSelectedService: (id: string) => void;
  isSubmitting: boolean;
  branchFilter: string;
  setBranchFilter: (branch: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleClinicStatusUpdate: (id: string, status: string) => void;
  getWhatsAppUrl: (phone: string, referral?: any) => string;
  onOpenWhatsApp?: (referral: any) => void;
}

export const ReceptionistUI: React.FC<ReceptionistUIProps> = ({
  currentUser,
  referrals,
  services,
  branches,
  clinicProfile,
  isMobile,
  handleSubmitReferral,
  checkPromoCode,
  walkInPromoCode,
  walkInStaff,
  patientName,
  setPatientName,
  patientType,
  setPatientType,
  selectedService,
  setSelectedService,
  isSubmitting,
  branchFilter,
  setBranchFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  handleClinicStatusUpdate,
  getWhatsAppUrl,
  onOpenWhatsApp
}) => {
  const blue = '#1580c2';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 sm:space-y-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Walk-in Form (Receptionist Only) */}
        {currentUser.role === 'receptionist' && (
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <PlusCircle className="text-zinc-900" size={20} />
                <h3 className="font-bold text-lg tracking-tight">Log Walk-in Referral</h3>
              </div>
              <form onSubmit={handleSubmitReferral} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Referral Code</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      value={walkInPromoCode}
                      onChange={(e) => checkPromoCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1580c2]/20 focus:border-[#1580c2]/20 transition-all font-mono text-sm"
                      placeholder="e.g. SMITH10"
                    />
                    {walkInStaff && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                  </div>
                  {walkInStaff ? (
                    <p className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1 ml-1 uppercase tracking-tight">
                      Confirmed: {walkInStaff.name}
                    </p>
                  ) : walkInPromoCode.length >= 3 ? (
                    <p className="mt-2 text-[10px] text-rose-500 font-bold ml-1 uppercase tracking-tight">✗ Invalid Referral Code</p>
                  ) : (
                    <p className="mt-2 text-[10px] text-zinc-400 font-medium ml-1">Enter the affiliate's unique code</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Patient Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />
                    <input 
                      type="text" 
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1580c2]/20 transition-all text-sm font-medium"
                      placeholder="Patient Full Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Patient Type</label>
                    <select 
                      required
                      value={patientType}
                      onChange={(e) => setPatientType(e.target.value as 'new' | 'existing')}
                      className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1580c2]/20 transition-all appearance-none text-sm font-medium"
                    >
                      <option value="new">New Patient</option>
                      <option value="existing">Existing</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Service</label>
                    <select 
                      required
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1580c2]/20 transition-all appearance-none text-sm font-medium"
                    >
                      <option value="">Select Service</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isSubmitting || !walkInStaff}
                    className="w-full bg-[#1580c2] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#1580c2]/20 hover:bg-[#1580c2]/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    {isSubmitting ? 'Processing...' : 'Log Referral'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* arrivals List */}
        <div className={currentUser.role === 'receptionist' ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg tracking-tight">
                  {currentUser.role === 'receptionist' ? 'Patient Arrivals' : 'Arrival Management'}
                </h3>
                <p className="text-xs text-zinc-400 font-medium">{branchFilter === 'all' ? 'Filtering: All Branches' : `Branch: ${branchFilter}`}</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <select 
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1580c2]/20 transition-all appearance-none min-w-[140px]"
                  >
                    <option value="all">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1580c2]/20 transition-all appearance-none min-w-[140px]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="arrived">Arrived</option>
                    <option value="in_session">In Session</option>
                    <option value="completed">Completed</option>
                    <option value="payment_approved">Approved</option>
                    <option value="payment_made">Paid</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    type="text"
                    placeholder="Search name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1580c2]/20 transition-all w-32 sm:w-44"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-50 min-h-[400px]">
              {referrals
                .filter(r => (r.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                .filter(r => statusFilter === 'all' ? true : r.status?.toLowerCase() === statusFilter.toLowerCase())
                // RECEPTIONIST SPECIFIC: By default show actionable items, but allow more if explicitly filtered
                .filter(r => {
                   if (currentUser.role !== 'receptionist') return true;
                   if (statusFilter !== 'all') return true; // Show whatever they selected
                   return ['pending', 'arrived', 'in_session', 'completed', 'payment_approved'].includes(r.status?.toLowerCase());
                })
                .length > 0 ? (
                  referrals
                    .filter(r => (r.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .filter(r => statusFilter === 'all' ? true : r.status?.toLowerCase() === statusFilter.toLowerCase())
                    .filter(r => {
                       if (currentUser.role !== 'receptionist') return true;
                       if (statusFilter !== 'all') return true;
                       return ['pending', 'arrived', 'in_session', 'completed', 'payment_approved'].includes(r.status?.toLowerCase());
                    })
                    .map((ref) => (
                      <div key={ref.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-50/50 transition-colors group">
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#1580c2]/5 text-[#1580c2] flex items-center justify-center font-black">
                              {ref.patient_name?.charAt(0) || <User size={16}/>}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-zinc-900 truncate">{ref.patient_name || 'Anonymous'}</p>
                              <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                                <MapPin size={10} />
                                <span className="truncate">{ref.branch || 'General'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Service & Staff</p>
                            <p className="text-xs font-bold text-zinc-700 truncate">{ref.service_name}</p>
                            <p className="text-[10px] font-bold text-[#1580c2] truncate">@{ref.staff_name || 'Direct'}</p>
                          </div>

                          <div className="space-y-0.5">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Appointment</p>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                              <CalendarIcon size={12} className="text-zinc-300" />
                              <span>{ref.appointment_date || 'TBD'}</span>
                            </div>
                            {ref.booking_time && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                                <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                <span>{ref.booking_time}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-1.5 items-start sm:items-center">
                            <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                              ref.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              ref.status === 'arrived' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              ref.status === 'in_session' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                              ref.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              ref.status === 'payment_approved' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                              'bg-zinc-50 text-zinc-400 border-zinc-100'
                            }`}>
                              {ref.status?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          {ref.patient_phone && (
                            <button 
                              onClick={() => onOpenWhatsApp ? onOpenWhatsApp(ref) : window.open(getWhatsAppUrl(ref.patient_phone, ref), '_blank')}
                              className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all active:scale-90"
                              title="WhatsApp Patient"
                            >
                              <Phone size={18} />
                            </button>
                          )}
                          
                          <div className="flex-1 sm:flex-initial flex items-center gap-2">
                             <select
                               onChange={(e) => handleClinicStatusUpdate(ref.id, e.target.value)}
                               value={ref.status}
                               className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1580c2]/50 appearance-none min-w-[120px] text-center"
                             >
                               <option value="pending">Pending</option>
                               <option value="arrived">Mark Arrived</option>
                               <option value="in_session">In Session</option>
                               <option value="completed">Completed</option>
                               <option value="payment_approved">Approved</option>
                               <option value="rejected">Rejected</option>
                             </select>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                    <div className="w-16 h-16 bg-zinc-50 rounded-[1.5rem] flex items-center justify-center mb-4">
                      <ClipboardList size={32} className="text-zinc-200" />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900">No arrivals found</h3>
                    <p className="text-xs text-zinc-400 max-w-[200px] mt-1 font-medium">Check your filters or branch selection if you're expecting patients.</p>
                  </div>
                )
              }
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
