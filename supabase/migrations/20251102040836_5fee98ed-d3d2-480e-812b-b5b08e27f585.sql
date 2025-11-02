-- Add avatar_url column to profiles table with default value
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT 'https://www.hdfilmizle.life/assets/front/img/default-pp.webp';

-- Update existing profiles to have the default avatar
UPDATE public.profiles 
SET avatar_url = 'https://www.hdfilmizle.life/assets/front/img/default-pp.webp' 
WHERE avatar_url IS NULL;

-- Add source column to movies table to track import source
ALTER TABLE public.movies 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE;

-- Create index on source for faster filtering
CREATE INDEX IF NOT EXISTS idx_movies_source ON public.movies(source);