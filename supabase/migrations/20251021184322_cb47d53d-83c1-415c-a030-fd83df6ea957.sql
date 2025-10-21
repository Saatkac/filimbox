-- Fix video URLs with encoding issues

-- Fix &amp; in episodes
UPDATE public.episodes 
SET video_url = REPLACE(video_url, '&amp;', '&') 
WHERE video_url LIKE '%&amp;%';

-- Fix missing h in https for movies
UPDATE public.movies 
SET video_url = REPLACE(video_url, 'ttps:', 'https:') 
WHERE video_url LIKE 'ttps:%';

-- Fix &amp; in movies as well
UPDATE public.movies 
SET video_url = REPLACE(video_url, '&amp;', '&') 
WHERE video_url LIKE '%&amp;%';
