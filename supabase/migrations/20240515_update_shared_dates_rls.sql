-- Add policy to allow users to accept invitations they receive
DROP POLICY IF EXISTS "Recipients can accept invitations" ON public.shared_date_sets;

CREATE POLICY "Recipients can accept invitations" ON public.shared_date_sets
  FOR UPDATE USING (
    shared_with_id = auth.uid()
  );

-- Add policy to allow users to create an entry when they're the recipient
DROP POLICY IF EXISTS "Users can accept invitations they receive" ON public.shared_date_sets;

CREATE POLICY "Users can accept invitations they receive" ON public.shared_date_sets
  FOR INSERT WITH CHECK (
    shared_with_id = auth.uid()
  );

-- Update the existing policy to support update operations
DROP POLICY IF EXISTS "Only owners can share date sets" ON public.shared_date_sets;

CREATE POLICY "Only owners can share date sets" ON public.shared_date_sets
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
  ); 