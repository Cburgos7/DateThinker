-- Create planning stack table for organizing venues before creating date sets
CREATE TABLE IF NOT EXISTS public.planning_stack (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  venue_category TEXT NOT NULL CHECK (venue_category IN ('restaurant', 'activity', 'outdoor', 'event')),
  venue_address TEXT,
  venue_rating NUMERIC,
  venue_price_level INTEGER,
  venue_photo_url TEXT,
  position INTEGER NOT NULL,
  scheduled_time TIME,
  duration_minutes INTEGER DEFAULT 120,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  UNIQUE (user_id, venue_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_planning_stack_user_id ON public.planning_stack(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_stack_position ON public.planning_stack(user_id, position);
CREATE INDEX IF NOT EXISTS idx_planning_stack_created_at ON public.planning_stack(created_at);

-- Enable RLS
ALTER TABLE public.planning_stack ENABLE ROW LEVEL SECURITY;

-- RLS policies for planning stack
CREATE POLICY "Users can view their own planning stack" ON public.planning_stack
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own planning stack" ON public.planning_stack
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planning stack" ON public.planning_stack
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own planning stack" ON public.planning_stack
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_planning_stack_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp
DROP TRIGGER IF EXISTS update_planning_stack_timestamp ON public.planning_stack;
CREATE TRIGGER update_planning_stack_timestamp
    BEFORE UPDATE ON public.planning_stack
    FOR EACH ROW
    EXECUTE FUNCTION update_planning_stack_timestamp();

-- Add helpful comments
COMMENT ON TABLE public.planning_stack IS 'Temporary planning stack for organizing venues before creating date sets';
COMMENT ON COLUMN public.planning_stack.position IS 'Order of items in the planning stack (1, 2, 3, etc.)';
COMMENT ON COLUMN public.planning_stack.scheduled_time IS 'Planned time for this venue (can be null for unplanned items)';
COMMENT ON COLUMN public.planning_stack.duration_minutes IS 'Estimated duration in minutes for this venue'; 