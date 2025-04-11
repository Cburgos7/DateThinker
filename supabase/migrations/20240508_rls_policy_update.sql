-- Add an alternative policy for date_sets inserts that's more permissive in development
-- This policy allows inserting if the user_id matches a specific list of known testing IDs
-- IMPORTANT: In production, this should be removed or carefully restricted

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert their own date sets" ON public.date_sets;

-- Create an updated insert policy that's more flexible
CREATE POLICY "Users can insert their own date sets" ON public.date_sets
  FOR INSERT WITH CHECK (
    -- Standard RLS check (user ID matches authenticated user)
    auth.uid() = user_id
    OR
    -- Allow specific test user IDs for development environment
    user_id IN (
      'a17c9b47-b462-4d96-8519-90b7601e76ec',  -- Test user ID
      'fd3e01e0-21f5-4257-8375-adac419a2171'   -- Your actual user ID
    )
  );

-- Update the policy to allow direct client inserts for specific test users
-- This helps with development and avoids auth issues
CREATE OR REPLACE FUNCTION is_valid_test_user(user_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_id IN (
    'a17c9b47-b462-4d96-8519-90b7601e76ec',  -- Test user ID
    'fd3e01e0-21f5-4257-8375-adac419a2171'   -- Your actual user ID
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
