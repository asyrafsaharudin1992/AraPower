-- REBUILD SCHEMA SCRIPT
-- Run this in your Supabase SQL Editor to recreate all missing tables and relationships

-- 1. Create Staff table
CREATE TABLE IF NOT EXISTS staff (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT DEFAULT 'password123',
  role TEXT DEFAULT 'staff',
  promo_code TEXT UNIQUE,
  approved_earnings NUMERIC DEFAULT 0,
  pending_earnings NUMERIC DEFAULT 0,
  lifetime_earnings NUMERIC DEFAULT 0,
  branch TEXT,
  department TEXT,
  position TEXT,
  employment_status TEXT,
  date_joined DATE,
  staff_id_code TEXT
);

-- 2. Create Services table (if not already created)
CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  type TEXT,
  description TEXT,
  base_price NUMERIC,
  promo_price NUMERIC,
  aracoins_perk NUMERIC DEFAULT 0,
  branches JSONB DEFAULT '[]'::jsonb,
  duration_mins INTEGER,
  is_featured BOOLEAN DEFAULT false,
  image_url TEXT,
  start_date DATE,
  end_date DATE,
  start_time TIME,
  end_time TIME
);

-- 3. Create Referrals table with proper foreign keys
CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  patient_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  staff_id BIGINT REFERENCES staff(id),
  service_id BIGINT REFERENCES services(id),
  patient_phone TEXT,
  patient_ic TEXT,
  patient_address TEXT,
  patient_type TEXT DEFAULT 'new',
  appointment_date DATE,
  booking_time TIME,
  fraud_flags JSONB DEFAULT '[]'::jsonb,
  created_by BIGINT REFERENCES staff(id),
  branch TEXT,
  aracoins_perk NUMERIC DEFAULT 0,
  commission_earned NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  visit_date DATE,
  verified_by BIGINT REFERENCES staff(id),
  rejection_reason TEXT,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Branches table
CREATE TABLE IF NOT EXISTS branches (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT
);

-- 5. Create Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 6. Create Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  assigned_to BIGINT REFERENCES staff(id),
  due_date DATE,
  description TEXT
);

-- 7. Create Branch Change Requests table
CREATE TABLE IF NOT EXISTS branch_change_requests (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT REFERENCES staff(id),
  status TEXT DEFAULT 'pending',
  current_branch TEXT,
  requested_branch TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES staff(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'announcement',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT REFERENCES staff(id),
  staff_name TEXT,
  staff_email TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Enable Row Level Security (RLS) for all tables
ALTER TABLE IF EXISTS services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branch_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feedback ENABLE ROW LEVEL SECURITY;

-- 11. Create permissive policies for the backend app
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON services FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON referrals FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON staff FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON branches FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON settings FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON tasks FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branch_change_requests' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON branch_change_requests FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON notifications FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON feedback FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
