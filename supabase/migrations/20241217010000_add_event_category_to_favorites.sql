-- Add 'event' category to favorites table constraint
-- This allows saving timed events like baseball games, concerts, etc.

-- First, drop the existing constraint
ALTER TABLE public.favorites 
DROP CONSTRAINT IF EXISTS favorites_category_check;

-- Add the new constraint that includes 'event'
ALTER TABLE public.favorites 
ADD CONSTRAINT favorites_category_check 
CHECK (category IN ('restaurant', 'activity', 'drink', 'outdoor', 'event'));

-- Add a comment to document the category meanings
COMMENT ON COLUMN public.favorites.category IS 'Category types: restaurant (dining), activity (bowling, axe throwing, minigolf, theme parks, movie theaters), event (timed events like baseball games, concerts), drink (bars, breweries), outdoor (outdoor activities)';
