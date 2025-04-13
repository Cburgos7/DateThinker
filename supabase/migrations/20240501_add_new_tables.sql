-- Create shared_date_sets table
CREATE TABLE IF NOT EXISTS public.shared_date_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  date_set_id UUID NOT NULL REFERENCES public.date_sets(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit')),
  UNIQUE (date_set_id, shared_with_id)
);

-- Create RLS policies for shared_date_sets
ALTER TABLE public.shared_date_sets ENABLE ROW LEVEL SECURITY;

-- Only allow users to see date sets shared with them or owned by them
CREATE POLICY "Users can see shared date sets" ON public.shared_date_sets
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    auth.uid() = shared_with_id
  );

-- Only the owner can insert new shared date sets
CREATE POLICY "Only owners can share date sets" ON public.shared_date_sets
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
  );

-- Only the owner can delete shared date sets
CREATE POLICY "Only owners can delete shared date sets" ON public.shared_date_sets
  FOR DELETE USING (
    auth.uid() = owner_id
  );

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_set_id UUID NOT NULL REFERENCES public.date_sets(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT FALSE NOT NULL,
  UNIQUE (user_id, date_set_id)
);

-- Create RLS policies for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- All users can see public reviews
CREATE POLICY "Users can see public reviews" ON public.reviews
  FOR SELECT USING (
    is_public = TRUE OR auth.uid() = user_id
  );

-- Only premium users can create reviews
CREATE POLICY "Only premium users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (subscription_status = 'premium' OR subscription_status = 'lifetime')
    )
  );

-- Users can only update or delete their own reviews
CREATE POLICY "Users can update their own reviews" ON public.reviews
  FOR UPDATE USING (
    auth.uid() = user_id
  );

CREATE POLICY "Users can delete their own reviews" ON public.reviews
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- Create followers table
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (follower_id, following_id)
);

-- Create RLS policies for followers
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- All users can see follower relationships
CREATE POLICY "Users can see follower relationships" ON public.followers
  FOR SELECT USING (TRUE);

-- Users can only add or remove their own follows
CREATE POLICY "Users can follow others" ON public.followers
  FOR INSERT WITH CHECK (
    auth.uid() = follower_id
  );

CREATE POLICY "Users can unfollow others" ON public.followers
  FOR DELETE USING (
    auth.uid() = follower_id
  );

-- Create trigger to enforce date set limits based on subscription
CREATE OR REPLACE FUNCTION enforce_date_set_limit() 
RETURNS TRIGGER AS $$
DECLARE
  user_sub_status TEXT;
  date_set_count INT;
BEGIN
  -- Get the user's subscription status
  SELECT subscription_status INTO user_sub_status 
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Count how many date sets the user already has
  SELECT COUNT(*) INTO date_set_count
  FROM public.date_sets
  WHERE user_id = NEW.user_id;
  
  -- For free users, allow only 1 date set
  IF user_sub_status = 'free' AND date_set_count >= 1 THEN
    RAISE EXCEPTION 'Free users are limited to 1 date set. Please upgrade to premium.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger to the date_sets table
DROP TRIGGER IF EXISTS check_date_set_limit ON public.date_sets;
CREATE TRIGGER check_date_set_limit
  BEFORE INSERT ON public.date_sets
  FOR EACH ROW
  EXECUTE FUNCTION enforce_date_set_limit(); 