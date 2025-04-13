-- SQL script to audit and check RLS policies for date_sets table

-- List all policies on the date_sets table
SELECT tablename, policyname, permissive, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'date_sets';

-- List all privileges on the date_sets table
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'date_sets';

-- Ensure the table has RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'date_sets';

-- Check if there might be conflicting policies
WITH policy_matrix AS (
  SELECT
    tablename,
    policyname,
    cmd,
    CASE
      WHEN qual ILIKE '%auth.uid()%' THEN 'Uses auth.uid()'
      ELSE 'Does NOT use auth.uid()'
    END as auth_check
  FROM pg_policies
  WHERE tablename = 'date_sets'
)
SELECT * FROM policy_matrix;

-- Create a secure test policy that allows accessing only your own data and specific test IDs
-- First, drop any existing test policy
DROP POLICY IF EXISTS "Debug test read policy for date_sets" ON public.date_sets;

-- Create a policy that allows SELECT for test user IDs and your own data
CREATE POLICY "Debug test read policy for date_sets" ON public.date_sets
  FOR SELECT USING (
    -- Standard RLS check (user ID matches authenticated user)
    auth.uid() = user_id
    OR
    -- Allow these specific test user IDs for development environment
    user_id IN (
      'a17c9b47-b462-4d96-8519-90b7601e76ec',  -- Test user ID
      'fd3e01e0-21f5-4257-8375-adac419a2171'   -- Your actual user ID from the logs
    )
  );

-- Optional: Restore a clean insert policy that only uses auth.uid()
DROP POLICY IF EXISTS "Users can insert their own date sets" ON public.date_sets;

CREATE POLICY "Users can insert their own date sets" ON public.date_sets
  FOR INSERT WITH CHECK (
    -- Standard RLS check (user ID matches authenticated user)
    auth.uid() = user_id
  );

-- Ensure anonymous is allowed to access the table with proper RLS applied
GRANT SELECT, INSERT, UPDATE, DELETE ON public.date_sets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.date_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.date_sets TO service_role; 