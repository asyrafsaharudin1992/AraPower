export interface Service {
  id: string | number;
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
}

export interface Promotion {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}
