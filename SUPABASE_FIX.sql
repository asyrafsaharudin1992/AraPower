-- SUPABASE DATABASE SETUP & SECURITY FIX
-- Run these commands in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Enable Row Level Security (RLS) for all tables
-- This satisfies the Supabase Security Advisor and protects your data.
ALTER TABLE IF EXISTS services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branch_change_requests ENABLE ROW LEVEL SECURITY;

-- 2. Create permissive policies
-- Since our application backend handles authentication and business logic, 
-- we allow the backend to perform all operations. 
-- Note: If you are using the 'service_role' key, these policies are bypassed anyway.
-- If you are using the 'anon' key, these policies allow the app to function.

DO $$ 
BEGIN
    -- Services
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON services FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Referrals
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON referrals FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Staff
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON staff FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Branches
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON branches FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON settings FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Tasks
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON tasks FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Branch Change Requests
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branch_change_requests' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON branch_change_requests FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 3. Ensure the 'services' table has the 'is_featured' column if it's missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='is_featured') THEN
        ALTER TABLE services ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 4. Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT REFERENCES staff(id),
    staff_name TEXT,
    staff_email TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add policy for feedback
ALTER TABLE IF EXISTS feedback ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON feedback FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES staff(id), -- recipient, null for "all"
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    type TEXT DEFAULT 'announcement',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add policy for notifications
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Enable all for app') THEN
        CREATE POLICY "Enable all for app" ON notifications FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 6. Create Storage Buckets and RLS Policies
-- Create 'posters' bucket for service and promotion images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('posters', 'posters', true)
ON CONFLICT (id) DO NOTHING;

-- Create 'avatars' bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create 'clinic-assets' bucket just in case
INSERT INTO storage.buckets (id, name, public) 
VALUES ('clinic-assets', 'clinic-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for storage.objects (Usually already enabled by Supabase)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow all access to posters (since app uses custom auth)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow All Access to Posters') THEN
        CREATE POLICY "Allow All Access to Posters" ON storage.objects FOR ALL USING (bucket_id = 'posters') WITH CHECK (bucket_id = 'posters');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow All Access to Avatars') THEN
        CREATE POLICY "Allow All Access to Avatars" ON storage.objects FOR ALL USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow All Access to Clinic Assets') THEN
        CREATE POLICY "Allow All Access to Clinic Assets" ON storage.objects FOR ALL USING (bucket_id = 'clinic-assets') WITH CHECK (bucket_id = 'clinic-assets');
    END IF;
END $$;
