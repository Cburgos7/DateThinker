-- Restore proper Row Level Security for date_sets
-- This removes any special allowances for specific user IDs
-- and ensures only authenticated users can access their own data

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert their own date sets" ON public.date_sets;

-- Create a strict insert policy
CREATE POLICY "Users can insert their own date sets" ON public.date_sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop any functions that might bypass security
DROP FUNCTION IF EXISTS is_valid_test_user;

-- Verify other policies are properly secured
DO $$
BEGIN
  -- Check if we need to recreate the select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'date_sets' 
    AND operation = 'select' 
    AND cmd LIKE '%auth.uid() = user_id%'
  ) THEN
    -- Drop existing select policy if it exists
    DROP POLICY IF EXISTS "Users can view their own date sets" ON public.date_sets;
    
    -- Create secure select policy
    CREATE POLICY "Users can view their own date sets" ON public.date_sets
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  -- Check if we need to recreate the update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'date_sets' 
    AND operation = 'update' 
    AND cmd LIKE '%auth.uid() = user_id%'
  ) THEN
    -- Drop existing update policy if it exists
    DROP POLICY IF EXISTS "Users can update their own date sets" ON public.date_sets;
    
    -- Create secure update policy
    CREATE POLICY "Users can update their own date sets" ON public.date_sets
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  -- Check if we need to recreate the delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'date_sets' 
    AND operation = 'delete' 
    AND cmd LIKE '%auth.uid() = user_id%'
  ) THEN
    -- Drop existing delete policy if it exists
    DROP POLICY IF EXISTS "Users can delete their own date sets" ON public.date_sets;
    
    -- Create secure delete policy
    CREATE POLICY "Users can delete their own date sets" ON public.date_sets
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$; 