-- Add user_rating column to favorites table
-- This allows users to rate their experience at each favorite place (1-5 stars)

ALTER TABLE public.favorites 
ADD COLUMN IF NOT EXISTS user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5);

-- Add index for faster filtering by rating
CREATE INDEX IF NOT EXISTS idx_favorites_user_rating ON public.favorites(user_rating);

-- Also add some missing columns that might be useful
ALTER TABLE public.favorites 
ADD COLUMN IF NOT EXISTS types TEXT[],
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS user_notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(); 