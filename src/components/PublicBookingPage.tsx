import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Clock } from 'lucide-react';
import { BookingForm } from './BookingForm';
import { Logo } from './Logo';

interface PublicBookingPageProps {
  services: any[];
  branches: any[];
  clinicProfile: any;
  handleSubmitReferral: (e?: React.FormEvent, payload?: any) => Promise<void>;
  getAvailableTimeSlots: (serviceId: string, branchName: string, date: string) => string[];
  isSubmitting: boolean;
  apiBaseUrl: string;
  safeFetch: (url: string, options?: any) => Promise<{ res: Response; data: any }>;
}

export const PublicBookingPage: React.FC<PublicBookingPageProps> = ({
  services,
  branches,
  clinicProfile,
  handleSubmitReferral,
  getAvailableTimeSlots,
  isSubmitting,
  apiBaseUrl,
  safeFetch
}) => {
  const [searchParams] = useSearchParams();
  const [referringStaff, setReferringStaff] = useState<any>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const refCode = searchParams.get('ref');
  const serviceId = searchParams.get('serviceId');
  const serviceName = searchParams.get('serviceName');

  useEffect(() => {
    const lookupAffiliate = async () => {
      if (refCode) {
        setIsLookingUp(true);
        try {
          const { res, data } = await safeFetch(`${apiBaseUrl}/api/affiliate-lookup/${refCode}`);
          if (res.ok && data) {
            setReferringStaff(data);
          }
        } catch (err) {
          console.error('Failed to lookup affiliate:', err);
        } finally {
          setIsLookingUp(false);
        }
      }
    };
    lookupAffiliate();
  }, [refCode, apiBaseUrl, safeFetch]);

  const handleFormSubmit = async (payload: any) => {
    // Attach ref code if present
    const finalPayload = { ...payload };
    if (refCode) finalPayload.referral_code = refCode;
    
    await handleSubmitReferral(undefined, finalPayload);
    setBookingSuccess(true);
  };

  if (!serviceId && !serviceName) {
    return (
      <div className="min-h-screen w-full bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm max-w-md w-full border border-black/5 text-center">
          <div className="bg-rose-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Logo className="w-8 h-8 opacity-50" logoUrl={clinicProfile.logoUrl} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Invalid Booking Link</h2>
          <p className="text-zinc-500 mb-8">This booking link is missing required service information. Please contact the person who shared this link with you.</p>
          <a 
            href="/"
            className="inline-block w-full bg-zinc-900 text-white py-3 rounded-xl font-medium text-center"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-zinc-50 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-sm max-w-md w-full border border-black/5"
      >
        {bookingSuccess ? (
          <div className="text-center py-8">
            <div className="bg-violet-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-zinc-900 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
            <p className="text-zinc-500 mb-8">Thank you for your referral. We will contact you shortly to finalize your appointment.</p>
            <button 
              onClick={() => setBookingSuccess(false)}
              className="w-full bg-gradient-to-r from-violet-500 to-rose-500 text-zinc-900 py-3 rounded-xl font-medium shadow-lg shadow-violet-500"
            >
              Book Another
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-white p-1 rounded-xl border border-zinc-100 shadow-sm">
                <Logo className="w-8 h-8" logoUrl={clinicProfile.logoUrl} />
              </div>
              <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Clinic Booking</h1>
            </div>
            
            {referringStaff ? (
              <div className="bg-emerald-500 p-4 rounded-2xl mb-6 border border-emerald-600">
                <p className="text-xs text-emerald-950 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Referred By
                </p>
                <p className="font-semibold text-emerald-950">{referringStaff.name}</p>
              </div>
            ) : refCode && !isLookingUp ? (
              <div className="bg-rose-500 p-4 rounded-2xl mb-6 border border-brand-accent">
                <p className="text-xs text-zinc-900 font-bold uppercase tracking-wider mb-1">Notice</p>
                <p className="text-sm text-zinc-900">Referral code not found, but you can still book below.</p>
              </div>
            ) : null}

            <BookingForm 
              selectedService={{ 
                id: serviceId || null, 
                name: serviceName || (serviceId ? services.find(s => String(s.id) === String(serviceId))?.name : 'General Consultation')
              }}
              services={services}
              branches={branches}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
              getAvailableTimeSlots={getAvailableTimeSlots}
              darkMode={false}
            />
          </>
        )}
      </motion.div>
    </div>
  );
};
