-- Add interest and preference columns to user_preferences table
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS activity_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS dining_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS location_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS age_range VARCHAR(50);
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS relationship_status VARCHAR(50);
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS date_frequency VARCHAR(50);
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS budget_range VARCHAR(50);

-- Update the updated_at timestamp when preferences are modified
CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_preferences_updated_at();

-- Add helpful comments
COMMENT ON COLUMN public.user_preferences.interests IS 'Array of interest categories the user is interested in';
COMMENT ON COLUMN public.user_preferences.activity_preferences IS 'JSON object containing specific activity preferences';
COMMENT ON COLUMN public.user_preferences.dining_preferences IS 'JSON object containing dining and food preferences';
COMMENT ON COLUMN public.user_preferences.location_preferences IS 'JSON object containing location and atmosphere preferences';
COMMENT ON COLUMN public.user_preferences.age_range IS 'Users age range for age-appropriate recommendations';
COMMENT ON COLUMN public.user_preferences.relationship_status IS 'Relationship status to tailor date recommendations';
COMMENT ON COLUMN public.user_preferences.date_frequency IS 'How often the user goes on dates';
COMMENT ON COLUMN public.user_preferences.budget_range IS 'Preferred budget range for date activities'; 