import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  format, 
  addDays, 
  subDays, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  parseISO, 
  startOfDay, 
  endOfDay,
  isSameMonth,
  addWeeks,
  subWeeks,
  getHours,
  getMinutes,
  setHours,
  setMinutes
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Filter,
  MessageSquare,
  Lock
} from 'lucide-react';

interface BookingCalendarProps {
  currentUser: any;
  referrals: any[];
  staffList: any[];
  clinicProfile: any;
  branches: any[];
}

const SERVICE_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
];

const STATUS_STYLES: Record<string, string> = {
  pending:          'bg-amber-50 text-amber-700 border-amber-200',
  arrived:          'bg-blue-50 text-blue-700 border-blue-200',
  in_session:       'bg-cyan-50 text-cyan-700 border-cyan-200',
  completed:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  payment_approved: 'bg-purple-50 text-purple-700 border-purple-200',
  payment_made:     'bg-indigo-50 text-indigo-700 border-indigo-200',
  rejected:         'bg-red-50 text-red-700 border-red-200',
};

const getServiceColor = (serviceName: string) => {
  if (!serviceName) return SERVICE_COLORS[0];
  const hash = serviceName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SERVICE_COLORS[hash % SERVICE_COLORS.length];
};

const getStatusLabel = (status: string) => {
  return status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN';
};

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────

const MonthView = ({ 
  currentDate, 
  getBookingsForDate, 
  getCapacityWarning, 
  setCurrentDate, 
  setViewMode, 
  setSelectedBooking 
}: {
  currentDate: Date;
  getBookingsForDate: (date: Date) => any[];
  getCapacityWarning: (date: Date) => any;
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: 'day' | 'week' | 'month') => void;
  setSelectedBooking: (booking: any) => void;
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="grid grid-cols-7 border-t border-l border-zinc-100">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="bg-zinc-50/50 p-2 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 border-r border-b border-zinc-100">
          {day}
        </div>
      ))}
      {days.map((day, dayIdx) => {
        const dayBookings = getBookingsForDate(day);
        const capacity = getCapacityWarning(day);
        const isCurrentMonth = isSameMonth(day, monthStart);
        
        return (
          <div 
            key={dayIdx} 
            className={`min-h-[120px] p-2 border-r border-b border-zinc-100 transition-colors cursor-pointer hover:bg-zinc-50/30 ${
              !isCurrentMonth ? 'bg-zinc-50/20' : 'bg-white'
            } ${isToday(day) ? 'bg-blue-50/20' : ''}`}
            onClick={() => {
              setCurrentDate(day);
              setViewMode('day');
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-xs font-bold leading-none ${
                isToday(day) 
                  ? 'w-6 h-6 rounded-full bg-[#1580c2] text-white flex items-center justify-center -mt-1 -ml-1' 
                  : !isCurrentMonth ? 'text-zinc-300' : 'text-zinc-500'
              }`}>
                {format(day, 'd')}
              </span>
              {capacity && (
                 <div className={`w-2 h-2 rounded-full ${capacity.level === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
              )}
            </div>
            <div className="space-y-1">
              {dayBookings.slice(0, 3).map(booking => (
                <div 
                  key={booking.id}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 border ${getServiceColor(booking.service_name || 'General')}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBooking(booking);
                  }}
                >
                  <div className={`w-1 h-1 rounded-full bg-current`} />
                  {booking.service_name || 'General'}
                </div>
              ))}
              {dayBookings.length > 3 && (
                <div className="text-[9px] font-bold text-zinc-400 pl-1">
                  + {dayBookings.length - 3} more
                </div>
              )}
            </div>
            {capacity && capacity.level === 'critical' && isCurrentMonth && (
               <div className="mt-2 p-1 bg-red-50 border border-red-100 rounded text-[8px] font-black uppercase text-red-600 text-center">
                 High Load
               </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const WeekView = ({
  currentDate,
  getBookingsForDate,
  filteredReferrals,
  setSelectedBooking,
  formatTimeStr
}: {
  currentDate: Date;
  getBookingsForDate: (date: Date) => any[];
  filteredReferrals: any[];
  setSelectedBooking: (booking: any) => void;
  formatTimeStr: (time: string) => string;
}) => {
  const weekStart = startOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate) });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getUnscheduledForDate = (date: Date) => {
    return getBookingsForDate(date).filter(r => !r.booking_time);
  };

  const isCurrentTimeInRange = () => {
    const h = currentTime.getHours();
    return h >= 8 && h < 21;
  };

  const currentTimePosition = () => {
    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    const offset = (h - 8) * 60 + m;
    return (offset / 15) * 20; 
  };

  const timeRows = [];
  for (let h = 8; h <= 20; h++) {
    timeRows.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < 20) timeRows.push(`${h.toString().padStart(2, '0')}:30`);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="flex border-b border-zinc-100">
        <div className="w-[60px] flex-shrink-0 border-r border-zinc-100 bg-zinc-50/50" />
        <div className="grid grid-cols-7 flex-1">
          {weekDays.map(day => (
            <div 
              key={day.toISOString()} 
              className={`p-3 text-center border-r border-zinc-100 transition-colors ${
                isToday(day) ? 'bg-blue-50/30' : ''
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                {format(day, 'EEE')}
              </p>
              <p className={`text-xl font-black ${isToday(day) ? 'text-[#1580c2]' : 'text-zinc-900'}`}>
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex border-b border-zinc-100 bg-zinc-50/20">
        <div className="w-[60px] flex-shrink-0 border-r border-zinc-100 flex items-center justify-center">
          <span className="text-[9px] font-black uppercase tracking-tighter text-zinc-400 text-center leading-tight">Un- scheduled</span>
        </div>
        <div className="grid grid-cols-7 flex-1 min-h-[40px]">
          {weekDays.map(day => {
            const unscheduled = getUnscheduledForDate(day);
            return (
              <div key={day.toISOString()} className="p-1 border-r border-zinc-100 flex flex-col gap-1">
                {unscheduled.map(b => (
                  <div 
                    key={b.id} 
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer truncate ${getServiceColor(b.service_name || 'General')}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBooking(b);
                    }}
                  >
                    {b.service_name || 'General'}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <div className="flex">
          <div className="w-[60px] flex-shrink-0 border-r border-zinc-100 bg-zinc-50/50 sticky left-0 z-10">
            {timeRows.map(time => (
              <div key={time} className="h-10 border-b border-zinc-50 flex items-start justify-center pt-1">
                <span className="text-[9px] font-bold text-zinc-400">{time}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 flex-1 relative min-h-full">
            {weekDays.map(day => (
              <div key={day.toISOString()} className="border-r border-zinc-100 relative h-full">
                {timeRows.map(time => (
                  <div key={time} className="h-10 border-b border-zinc-50/50" />
                ))}
                
                {isToday(day) && isCurrentTimeInRange() && (
                  <div 
                    className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none" 
                    style={{ top: `${currentTimePosition()}px` }}
                  >
                    <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                )}

                {getBookingsForDate(day).filter(b => b.booking_time).map(b => {
                  const [h, m] = b.booking_time.split(':').map(Number);
                  const top = ((h - 8) * 60 + m) / 15 * 20;
                  return (
                    <div 
                      key={b.id}
                      className={`absolute left-1 right-1 px-1.5 py-1 rounded-xl border-l-4 shadow-sm cursor-pointer z-10 transition-all hover:scale-[1.02] hover:shadow-md ${getServiceColor(b.service_name || 'General')}`}
                      style={{ top: `${top}px`, minHeight: '32px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBooking(b);
                      }}
                    >
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        <p className="text-[10px] font-black truncate leading-tight">{b.service_name}</p>
                        <div className="flex items-center gap-1">
                           <div className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES[b.status?.toLowerCase()]?.split(' ')[0] || 'bg-zinc-400'}`} />
                           <p className="text-[8px] font-bold opacity-60 uppercase">{formatTimeStr(b.booking_time)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const DayView = ({
  currentDate,
  getBookingsForDate,
  formatTimeStr,
  setSelectedBooking,
  currentUser
}: {
  currentDate: Date;
  getBookingsForDate: (date: Date) => any[];
  formatTimeStr: (time: string) => string;
  setSelectedBooking: (booking: any) => void;
  currentUser: any;
}) => {
  const dayBookings = getBookingsForDate(currentDate);
  const scheduled = dayBookings.filter(b => b.booking_time).sort((a,b) => a.booking_time.localeCompare(b.booking_time));
  const unscheduled = dayBookings.filter(b => !b.booking_time);

  const timeRows = [];
  for (let h = 8; h <= 20; h++) {
    timeRows.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < 20) timeRows.push(`${h.toString().padStart(2, '0')}:30`);
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
            <Clock size={16} />
            Schedule for Today
          </h3>

          {scheduled.length === 0 && unscheduled.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
               <div className="w-16 h-16 bg-zinc-50 rounded-3xl flex items-center justify-center mb-4">
                  <CalendarIcon size={32} className="text-zinc-200" />
               </div>
               <p className="text-sm font-bold text-zinc-400">No appointments scheduled</p>
               <p className="text-xs text-zinc-300">Try checking another date</p>
            </div>
          ) : (
            <div className="space-y-6">
              {timeRows.map(time => {
                const slots = scheduled.filter(b => {
                  const [h, m] = b.booking_time.split(':').map(Number);
                  const slotTime = `${h.toString().padStart(2, '0')}:${m < 30 ? '00' : '30'}`;
                  return slotTime === time;
                });

                return (
                  <div key={time} className="flex gap-6 group">
                    <div className="w-16 pt-1 text-right">
                      <span className="text-xs font-bold text-zinc-400">{time}</span>
                    </div>
                    <div className="flex-1 space-y-3">
                      {slots.length > 0 ? (
                        slots.map(b => (
                          <motion.div 
                            key={b.id}
                            whileHover={{ x: 4 }}
                            className={`bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 border-l-4 flex justify-between items-center cursor-pointer ${getServiceColor(b.service_name || 'General').split(' ')[0].replace('bg-', 'border-l-')}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(b);
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-base font-black text-zinc-900 leading-tight">
                                  {b.service_name}
                                </h4>
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${STATUS_STYLES[b.status?.toLowerCase()] || 'bg-zinc-50 text-zinc-400'}`}>
                                  {getStatusLabel(b.status)}
                                </span>
                              </div>
                              <div className="flex items-center flex-wrap gap-4 text-xs text-zinc-500 font-medium">
                                <div className="flex items-center gap-1.5">
                                  <User size={12} className="opacity-50" />
                                  <span>{currentUser?.role === 'affiliate' ? 'Private' : (b.patient_name || 'Unknown')}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Clock size={12} className="opacity-50" />
                                  <span>{formatTimeStr(b.booking_time)}</span>
                                </div>
                                {b.branch && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin size={12} className="opacity-50" />
                                    <span>{b.branch}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="text-zinc-300" size={20} />
                          </motion.div>
                        ))
                      ) : (
                        <div className="h-px bg-zinc-100 mt-3 group-hover:bg-zinc-200 transition-colors" />
                      )}
                    </div>
                  </div>
                );
              })}

              {unscheduled.length > 0 && (
                <div className="mt-12 pt-8 border-t border-zinc-100">
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Unscheduled Appointments</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {unscheduled.map(b => (
                      <div 
                        key={b.id}
                        className="bg-white rounded-2xl border border-dashed border-zinc-300 p-4 flex justify-between items-center cursor-pointer hover:border-[#1580c2] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(b);
                        }}
                      >
                        <div>
                           <p className="font-bold text-zinc-900">{b.service_name}</p>
                           <p className="text-xs text-zinc-500">{currentUser?.role === 'affiliate' ? 'Private' : b.patient_name}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${STATUS_STYLES[b.status?.toLowerCase()] || 'bg-zinc-50 text-zinc-400'}`}>
                          {getStatusLabel(b.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BookingPopover = ({
  selectedBooking,
  setSelectedBooking,
  staffList,
  currentUser,
  clinicProfile,
  formatTimeStr
}: {
  selectedBooking: any;
  setSelectedBooking: (booking: any) => void;
  staffList: any[];
  currentUser: any;
  clinicProfile: any;
  formatTimeStr: (time: string) => string;
}) => {
  const staff = staffList.find(s => String(s.id) === String(selectedBooking.staff_id));
  const isAffiliate = currentUser?.role === 'affiliate';
  const isAdminOrReceptionist = currentUser?.role === 'admin' || currentUser?.role === 'receptionist';

    const getWhatsAppUrl = (phone: string) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('60') ? cleanPhone : `60${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`;
    
    // Date formatter - human readable
    const formatDateStr = (dateStr: string) => {
      if (!dateStr) return '—';
      try {
        return new Date(dateStr).toLocaleDateString('en-MY', {
          day: 'numeric', month: 'short', year: 'numeric',
        });
      } catch { return '—'; }
    };

    const dateStr = formatDateStr(selectedBooking.appointment_date);
    const timeStr = selectedBooking.booking_time ? formatTimeStr(selectedBooking.booking_time) : 'TBD';
    const branchStr = selectedBooking.branch || '—';
    const serviceStr = selectedBooking.service_name || '—';

    const message = `[KLINIK ARA 24 JAM]

Assalamualaikum dan Selamat sejahtera. Berikut adalah maklumat temu janji pihak tuan/puan. 

Tarikh: ${dateStr}
Waktu: ${timeStr}
Cawangan: ${branchStr}
Servis: ${serviceStr}

Kami doakan semoga segala urusan tuan/puan dimudahkan.
 
Terima kasih.`;
    
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => setSelectedBooking(null)}
      />
      <motion.div 
        key="booking-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className={`p-6 border-b ${getServiceColor(selectedBooking.service_name || 'General')}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${STATUS_STYLES[selectedBooking.status?.toLowerCase()] || 'bg-zinc-100'}`}>
              {getStatusLabel(selectedBooking.status)}
            </span>
            <button 
              onClick={() => setSelectedBooking(null)}
              className="p-1 hover:bg-black/5 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <h3 className="text-xl font-black text-zinc-900 leading-tight">
            {selectedBooking.service_name || 'General Service'}
          </h3>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                 <User size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Patient</p>
                {isAffiliate ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                     <Lock size={12} className="text-zinc-300" />
                     <p className="text-zinc-300 tracking-[0.3em] font-bold">•••••••</p>
                     <span className="text-[9px] font-bold text-zinc-300 italic">(P&C)</span>
                  </div>
                ) : (
                  <p className="font-bold text-zinc-900">{selectedBooking.patient_name || 'Unknown'}</p>
                )}
              </div>
            </div>

            {!isAffiliate && selectedBooking.patient_phone && (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                     <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Contact</p>
                    <p className="font-bold text-zinc-900">{selectedBooking.patient_phone}</p>
                  </div>
                </div>
                {isAdminOrReceptionist && (
                  <a 
                    href={getWhatsAppUrl(selectedBooking.patient_phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
                  >
                    <MessageSquare size={14} />
                    WHATSAPP
                  </a>
                )}
              </div>
            )}

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                 <CalendarIcon size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Date & Time</p>
                <p className="font-bold text-zinc-900">
                  {format(parseISO(selectedBooking.appointment_date), 'd MMM yyyy')}
                  {selectedBooking.booking_time ? ` @ ${formatTimeStr(selectedBooking.booking_time)}` : ' (TBD)'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                 <MapPin size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Branch</p>
                <p className="font-bold text-zinc-900">{selectedBooking.branch || 'Main Clinic'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Referred By</p>
                <p className="text-sm font-bold text-[#1580c2]">{staff?.name || selectedBooking.staff_name || 'Direct Walk-in'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Incentive</p>
                <p className="text-xl font-black text-[#1580c2] tracking-tighter">
                  {clinicProfile?.currency || 'RM'} {selectedBooking.commission_amount?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  currentUser,
  referrals,
  staffList,
  clinicProfile,
  branches
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // Filter referrals
  const filteredReferrals = useMemo(() => {
    return referrals.filter(r => {
      if (!r.appointment_date) return false;
      if (r.status === 'rejected') return false;
      if (selectedService !== 'all' && r.service_name !== selectedService) return false;
      if (selectedBranch !== 'all' && r.branch !== selectedBranch) return false;
      return true;
    });
  }, [referrals, selectedService, selectedBranch]);

  const uniqueServices = useMemo(() => {
    const services = referrals.map(r => r.service_name).filter(Boolean);
    return Array.from(new Set(services)).sort();
  }, [referrals]);

  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredReferrals.filter(r => r.appointment_date === dateStr);
  };

  const getCapacityWarning = (date: Date) => {
    const count = getBookingsForDate(date).length;
    if (count >= 10) return { level: 'critical', label: `${count} bookings`, color: 'text-red-600 bg-red-50 border-red-100' };
    if (count >= 6)  return { level: 'high',     label: `${count} bookings`, color: 'text-amber-600 bg-amber-50 border-amber-100' };
    return null;
  };

  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  const getPeriodLabel = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      if (isSameMonth(start, end)) {
        return `${format(start, 'MMMM yyyy')} · Week ${format(start, 'w')}`;
      }
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'EEEE, d MMMM yyyy');
  };

  const timeRows = [];
  for (let h = 8; h <= 20; h++) {
    timeRows.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < 20) timeRows.push(`${h.toString().padStart(2, '0')}:30`);
  }

  // Format time for display (AM/PM)
  const formatTimeStr = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const hour = h % 12 || 12;
      const ampm = h >= 12 ? 'PM' : 'AM';
      return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const checkCapacityStrip = () => {
    if (viewMode !== 'month' && viewMode !== 'week') return null;
    
    const interval = viewMode === 'month' 
      ? { start: startOfMonth(currentDate), end: endOfMonth(currentDate) }
      : { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
    
    const days = eachDayOfInterval(interval);
    const warnings = days.map(d => ({ date: d, warning: getCapacityWarning(d) })).filter(d => d.warning);

    if (warnings.length === 0) return null;

    return (
      <div className="flex items-center gap-4 px-6 py-2 bg-zinc-50 border-b border-zinc-100">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
          <AlertCircle size={12} />
          Capacity Warnings
        </span>
        <div className="flex flex-wrap gap-2">
          {warnings.map((w, idx) => (
            <div key={idx} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${w.warning?.color}`}>
              {format(w.date, 'EEE d')}: {w.warning?.label}
              {w.warning?.level === 'critical' && ' — CRITICAL'}
            </div>
          ))}
        </div>
      </div>
    );
  };



  return (
    <div className="w-full h-full flex flex-col bg-zinc-50/30">
      {/* Calendar Header */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrev}
              className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-black text-zinc-900 tracking-tight min-w-[200px] text-center">
              {getPeriodLabel()}
            </h2>
            <button 
              onClick={handleNext}
              className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button 
            onClick={handleToday}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-bold text-zinc-700 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggles */}
          <div className="flex p-1 bg-zinc-100 rounded-xl">
            {(['day', 'week', 'month'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === mode 
                    ? 'bg-[#1580c2] text-white shadow-md' 
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
               <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
               <select 
                value={selectedService}
                onChange={e => setSelectedService(e.target.value)}
                className="pl-9 pr-4 py-2 bg-zinc-100 border-0 rounded-xl text-xs font-bold text-zinc-700 focus:ring-2 focus:ring-[#1580c2]/20 appearance-none cursor-pointer hover:bg-zinc-200 transition-colors min-w-[150px]"
              >
                <option value="all">All Services</option>
                {uniqueServices.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div className="relative">
               <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
               <select 
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-zinc-100 border-0 rounded-xl text-xs font-bold text-zinc-700 focus:ring-2 focus:ring-[#1580c2]/20 appearance-none cursor-pointer hover:bg-zinc-200 transition-colors min-w-[150px]"
              >
                <option value="all">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Strip */}
      {checkCapacityStrip()}

      {/* Main Calendar Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'month' && (
          <MonthView 
            currentDate={currentDate}
            getBookingsForDate={getBookingsForDate}
            getCapacityWarning={getCapacityWarning}
            setCurrentDate={setCurrentDate}
            setViewMode={setViewMode}
            setSelectedBooking={setSelectedBooking}
          />
        )}
        {viewMode === 'week' && (
          <WeekView 
            currentDate={currentDate}
            getBookingsForDate={getBookingsForDate}
            filteredReferrals={filteredReferrals}
            setSelectedBooking={setSelectedBooking}
            formatTimeStr={formatTimeStr}
          />
        )}
        {viewMode === 'day' && (
          <DayView 
            currentDate={currentDate}
            getBookingsForDate={getBookingsForDate}
            formatTimeStr={formatTimeStr}
            setSelectedBooking={setSelectedBooking}
            currentUser={currentUser}
          />
        )}
      </div>

      {/* Booking Details Popover */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingPopover 
            selectedBooking={selectedBooking}
            setSelectedBooking={setSelectedBooking}
            staffList={staffList}
            currentUser={currentUser}
            clinicProfile={clinicProfile}
            formatTimeStr={formatTimeStr}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingCalendar;
