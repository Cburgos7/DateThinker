-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if needed (COMMENT OUT IF YOU HAVE PRODUCTION DATA!)
DROP TABLE IF EXISTS public.followers CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.shared_date_sets CASCADE;
DROP TABLE IF EXISTS public.date_sets CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.test_entries CASCADE;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'lifetime')),
  subscription_expiry TIMESTAMPTZ,
  stripe_customer_id TEXT
);

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'activity', 'drink', 'outdoor')),
  address TEXT NOT NULL,
  rating NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  photo_url TEXT,
  UNIQUE (user_id, place_id)
);

-- Create date_sets table
CREATE TABLE public.date_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  places JSONB NOT NULL,
  share_id TEXT NOT NULL UNIQUE,
  notes TEXT
);

-- Create user_preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_city TEXT,
  default_filters JSONB,
  default_price_range NUMERIC,
  UNIQUE (user_id)
);

-- Create shared_date_sets table
CREATE TABLE public.shared_date_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  date_set_id UUID NOT NULL REFERENCES public.date_sets(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit')),
  UNIQUE (date_set_id, shared_with_id)
);

-- Create reviews table
CREATE TABLE public.reviews (
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

-- Create followers table
CREATE TABLE public.followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (follower_id, following_id)
);

-- Test entries table (if needed)
CREATE TABLE public.test_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  content TEXT
);

-- FUNCTIONS AND TRIGGERS

-- Function to handle profile creation when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, subscription_status)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'avatar_url', 
    NEW.email,
    'free'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create a profile when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to enforce date set limits based on subscription
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

-- Function to update timestamp when a profile is updated
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger to the profiles table
DROP TRIGGER IF EXISTS update_profile_timestamp ON public.profiles;
CREATE TRIGGER update_profile_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ROW LEVEL SECURITY POLICIES

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_date_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_entries ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policies for favorites
CREATE POLICY "Users can view their own favorites" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites" ON public.favorites
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for date_sets
CREATE POLICY "Users can view their own date sets" ON public.date_sets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared date sets" ON public.date_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shared_date_sets
      WHERE date_set_id = id
      AND shared_with_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own date sets" ON public.date_sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own date sets" ON public.date_sets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Collaborators can update shared date sets" ON public.date_sets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shared_date_sets
      WHERE date_set_id = id
      AND shared_with_id = auth.uid()
      AND permission_level = 'edit'
    )
  );

CREATE POLICY "Users can delete their own date sets" ON public.date_sets
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON public.user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for shared_date_sets
CREATE POLICY "Users can see shared date sets" ON public.shared_date_sets
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    auth.uid() = shared_with_id
  );

CREATE POLICY "Only owners can share date sets" ON public.shared_date_sets
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
  );

CREATE POLICY "Only owners can delete shared date sets" ON public.shared_date_sets
  FOR DELETE USING (
    auth.uid() = owner_id
  );

-- Policies for reviews
CREATE POLICY "Users can see public reviews" ON public.reviews
  FOR SELECT USING (
    is_public = TRUE OR auth.uid() = user_id
  );

CREATE POLICY "Only premium users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (subscription_status = 'premium' OR subscription_status = 'lifetime')
    )
  );

CREATE POLICY "Users can update their own reviews" ON public.reviews
  FOR UPDATE USING (
    auth.uid() = user_id
  );

CREATE POLICY "Users can delete their own reviews" ON public.reviews
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- Policies for followers
CREATE POLICY "Users can see follower relationships" ON public.followers
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can follow others" ON public.followers
  FOR INSERT WITH CHECK (
    auth.uid() = follower_id
  );

CREATE POLICY "Users can unfollow others" ON public.followers
  FOR DELETE USING (
    auth.uid() = follower_id
  );

-- Policies for test_entries (if needed)
CREATE POLICY "Anyone can see test entries" ON public.test_entries
  FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can create test entries" ON public.test_entries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);