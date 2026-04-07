export interface Service {
  id: string;
  name: string;
  base_price: number;
  commission_rate: number;
  aracoins_perk?: number;
  allowances: { [tier: string]: number };
  description?: string;
  image_url?: string;
  promo_price?: number;
  type?: 'Service' | 'Promotion';
  category?: string;
  branches?: {
    [branchName: string]: {
      active: boolean;
      startDate: string;
      endDate: string;
      startTime: string;
      endTime: string;
      days: string[];
      limitBookings: boolean;
      maxSlots: number;
      blockedDates: {
        id: string;
        date: string;
        type: 'all-day' | 'time-range';
        startTime?: string;
        endTime?: string;
      }[];
    };
  };
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  is_featured?: boolean;
  visibility?: string;
  tags?: string[];
  duration?: string;
  overall_limit_enabled?: boolean;
  overall_limit?: number;
  require_deposit?: boolean;
  deposit_amount?: number;
  category_carousel?: boolean;
  target_url?: string;
  is_arapower_linked?: boolean;
  is_affiliate_enabled?: boolean;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  promo_code: string;
  referral_code?: string;
  staff_id_code?: string;
  branch?: string;
  department?: string;
  position?: string;
  employment_status?: string;
  date_joined?: string;
  pending_earnings: number;
  approved_earnings: number;
  paid_earnings: number;
  lifetime_earnings: number;
  last_payout_date?: string;
  referrer_type: string;
  phone?: string;
  aracoins?: number;
  is_approved?: number;
  nickname?: string;
  profile_picture?: string;
  bank_name?: string;
  bank_account_number?: string;
  id_type?: string;
  id_number?: string;
  tier?: { name: string; bonus: number; color: string; bg: string };
  monthlySuccessfulRefs?: number;
  earned?: number;
}

export interface Referral {
  id: string;
  staff_id: string;
  staff_name: string;
  promo_code: string;
  service_id: string;
  service_name: string;
  patient_name: string;
  patient_phone: string;
  patient_ic?: string;
  patient_address?: string;
  appointment_date: string;
  booking_time: string;
  visit_date?: string;
  date: string;
  status: 'pending' | 'arrived' | 'in_session' | 'completed' | 'approved' | 'payout_processed' | 'cancelled' | 'entered' | 'paid_completed' | 'rejected' | 'warm_lead' | 'whatsapp_redirected';
  payment_status: 'pending' | 'completed';
  commission_amount: number;
  fraud_flags?: string;
  rejection_reason?: string;
  branch?: string;
  patient_type?: 'new' | 'existing';
  aracoins_perk?: number;
  created_at?: string;
}

export interface AppSettings {
  blockedDates: string[];
  blockedTimes: string[];
  workingHours: { start: string; end: string };
}

export interface ClinicProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  logoUrl?: string;
  customDomain?: string;
}
