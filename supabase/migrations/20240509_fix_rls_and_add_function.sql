-- Create a function to get policies for a table
CREATE OR REPLACE FUNCTION get_policies_for_table(table_name text)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(row_to_json(t))
  INTO result
  FROM (
    SELECT
      tablename,
      policyname,
      permissive,
      cmd,
      qual
    FROM pg_policies
    WHERE tablename = table_name
  ) t;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION get_policies_for_table TO anon;
GRANT EXECUTE ON FUNCTION get_policies_for_table TO authenticated;
GRANT EXECUTE ON FUNCTION get_policies_for_table TO service_role;

-- Check and fix existing policies for date_sets table
DO $$
BEGIN
  -- First check if we have the SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'date_sets' 
    AND cmd = 'SELECT'
    AND qual LIKE '%auth.uid()%'
  ) THEN
    -- Create the SELECT policy
    DROP POLICY IF EXISTS "Users can view their own date sets" ON public.date_sets;
    
    CREATE POLICY "Users can view their own date sets" ON public.date_sets
      FOR SELECT USING (
        auth.uid() = user_id
      );
  END IF;
  
  -- Now check for INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'date_sets' 
    AND cmd = 'INSERT'
    AND qual LIKE '%auth.uid()%'
  ) THEN
    -- Create the INSERT policy
    DROP POLICY IF EXISTS "Users can insert their own date sets" ON public.date_sets;
    
    CREATE POLICY "Users can insert their own date sets" ON public.date_sets
      FOR INSERT WITH CHECK (
        auth.uid() = user_id
      );
  END IF;
END $$;

-- Create a test policy to allow reading specific test user IDs
DROP POLICY IF EXISTS "Users can view test date sets" ON public.date_sets;

CREATE POLICY "Users can view test date sets" ON public.date_sets
FOR SELECT USING (
  -- Also allow access to specific test user IDs
  user_id IN (
    'a17c9b47-b462-4d96-8519-90b7601e76ec',  -- Test user ID
    'fd3e01e0-21f5-4257-8375-adac419a2171'   -- Common test user ID
  )
);

-- Enable row level security
ALTER TABLE date_sets ENABLE ROW LEVEL SECURITY; 