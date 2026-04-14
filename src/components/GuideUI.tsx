import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Users, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export interface GuideUIProps {
  currentUser: any;
  clinicProfile: any;
  setActiveTab: (tab: string) => void;
}

export const GuideUI: React.FC<GuideUIProps> = ({
  currentUser,
  clinicProfile,
  setActiveTab
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="bg-brand-primary text-white p-8 rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="relative z-10">
          <button 
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-widest mb-4 hover:text-white transition-colors"
          >
            <ChevronRight size={16} className="rotate-180" />
            Back to Profile
          </button>
          <h3 className="text-2xl font-black tracking-tighter mb-2">Platform User Guide</h3>
          <p className="text-white/70 text-sm font-medium max-w-md">Learn how to maximize your efficiency and earnings with the {clinicProfile.name} portal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-3xl border ${currentUser.role === 'affiliate' ? 'bg-violet-500 border-violet-500' : 'bg-white border-black/5'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${currentUser.role === 'affiliate' ? 'bg-violet-500 text-white' : 'bg-zinc-50 text-zinc-500'}`}>
            <Users size={24} />
          </div>
          <h4 className="font-bold mb-2">For Staff Members</h4>
          <ul className="space-y-3 text-xs text-zinc-500 font-medium">
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
              <span>Share your unique QR code or referral link with patients.</span>
            </li>
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
              <span>Track your "Pending" earnings as soon as a patient books.</span>
            </li>
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
              <span>Earnings move to "Approved" once the patient completes their visit.</span>
            </li>
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
              <span>Reach higher tiers (Silver/Gold) to earn up to 1.5x bonus!</span>
            </li>
          </ul>
        </div>

        <div className={`p-6 rounded-3xl border ${currentUser.role === 'receptionist' ? 'bg-violet-500 border-violet-500' : 'bg-white border-black/5'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${currentUser.role === 'receptionist' ? 'bg-violet-500 text-white' : 'bg-zinc-50 text-zinc-500'}`}>
            <CheckCircle2 size={24} />
          </div>
          <h4 className="font-bold mb-2">For Receptionists</h4>
          <ul className="space-y-3 text-xs text-zinc-500 font-medium">
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
              <span>Use the "Arrived" tab to find patients arriving today.</span>
            </li>
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
              <span>Mark visits as "Completed" after the consultation.</span>
            </li>
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
              <span>Update "Payment Status" to approve the referral.</span>
            </li>
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
              <span>Verify walk-in referrals by entering the staff's promo code.</span>
            </li>
          </ul>
        </div>

        <div className={`p-6 rounded-3xl border ${ (currentUser.role === 'admin' || currentUser.role === 'manager') ? 'bg-violet-500 border-violet-500' : 'bg-white border-black/5'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${ (currentUser.role === 'admin' || currentUser.role === 'manager') ? 'bg-violet-500 text-white' : 'bg-zinc-50 text-zinc-500'}`}>
            <ShieldCheck size={24} />
          </div>
          <h4 className="font-bold mb-2">For Administrators</h4>
          <ul className="space-y-3 text-xs text-zinc-500 font-medium">
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
              <span>Approve new staff registrations in the "Setup &gt; Staff" tab.</span>
            </li>
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
              <span>Monitor clinic-wide performance in the "Admin Panel".</span>
            </li>
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
              <span>Process payouts for "Approved" earnings at the end of the month.</span>
            </li>
            <li className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
              <span>Manage services, branches, and system roles in "Setup".</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
        <h4 className="font-black text-xs uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
          <Zap size={14} className="text-zinc-900" />
          Frequently Asked Questions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <p className="text-sm font-bold text-zinc-900">When do I get paid?</p>
            <p className="text-xs text-zinc-500 leading-relaxed">Incentives are eligible for payout 7 days after the patient's payment is completed. Admins typically process these monthly.</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-zinc-900">What are AraCoins?</p>
            <p className="text-xs text-zinc-500 leading-relaxed">AraCoins are internal points earned alongside cash incentives. They can be used for clinic perks or redeemed for rewards (if enabled by admin).</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-zinc-900">How do tiers work?</p>
            <p className="text-xs text-zinc-500 leading-relaxed">Tiers are calculated monthly based on your successful referrals. Bronze (0-5), Silver (6-10), and Gold (11+). Higher tiers give you a bonus multiplier on all earnings that month.</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-zinc-900">Can I refer patients to any branch?</p>
            <p className="text-xs text-zinc-500 leading-relaxed">Yes! Patients can select their preferred branch during booking, and you will still receive the referral credit regardless of the location.</p>
          </div>
          <div className="space-y-2 md:col-span-2 pt-4 border-t border-zinc-50">
            <p className="text-sm font-bold text-zinc-900">What do the referral statuses mean?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Entered</p>
                <p className="text-xs text-zinc-500">Referral is logged (e.g., patient booked an appointment).</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-1">Completed</p>
                <p className="text-xs text-zinc-500">Patient has attended the appointment.</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Buffer</p>
                <p className="text-xs text-zinc-500">7-day safety period after payment to finalize the transaction.</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-1">Approved</p>
                <p className="text-xs text-zinc-500">Incentive is verified and ready for the next payout cycle.</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest mb-1">Payout Processed</p>
                <p className="text-xs text-zinc-500">The incentive has been successfully paid out to you.</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-1">Rejected</p>
                <p className="text-xs text-zinc-500">Referral invalidated (e.g., no-show or duplicate entry).</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
