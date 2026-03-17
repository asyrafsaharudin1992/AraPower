export interface Service {
  id: number;
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
  branches?: string[];
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  days_of_week?: string[];
  blocked_dates?: string[];
  blocked_times?: {start: string, end: string}[];
  block_weekends?: boolean;
  is_featured?: boolean;
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
