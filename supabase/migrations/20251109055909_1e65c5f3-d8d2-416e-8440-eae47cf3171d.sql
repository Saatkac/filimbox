-- Add use_custom_player field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS use_custom_player BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.profiles.use_custom_player IS 'If true, use custom video player with HLS.js. If false, use native browser video player.';