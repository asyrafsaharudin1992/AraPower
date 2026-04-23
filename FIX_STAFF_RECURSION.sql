-- This script fixes the infinite recursion error on the staff table.
-- It works by finding all policies on the 'staff' table and disabling/dropping them,
-- and then applying a single, simple non-recursive policy.

-- 1. First, check what policies exist (you can run this first, or just run the DROP below)
-- SELECT policyname FROM pg_policies WHERE tablename = 'staff';

-- 2. Drop all existing policies on the staff table to clear the infinite loop
DROP POLICY IF EXISTS "Enable all for app" ON staff;
DROP POLICY IF EXISTS "Allow staff to read their own data" ON staff;
DROP POLICY IF EXISTS "Admins can view all staff" ON staff;
DROP POLICY IF EXISTS "Admins can update all staff" ON staff;
DROP POLICY IF EXISTS "Staff can read all staff" ON staff;
DROP POLICY IF EXISTS "Staff can read staff" ON staff;
-- (If you have a policy with a different name, you'll need to drop it too. You can delete them manually via Authentication -> Policies)

-- 3. Re-enable the non-recursive base policy
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for app" 
ON public.staff 
FOR ALL
USING (true)
WITH CHECK (true);
