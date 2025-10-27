-- Create favorites table for users
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT one_content_per_favorite CHECK (
    (movie_id IS NOT NULL AND series_id IS NULL) OR
    (movie_id IS NULL AND series_id IS NOT NULL)
  ),
  UNIQUE(user_id, movie_id),
  UNIQUE(user_id, series_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add to their own favorites
CREATE POLICY "Users can add to their own favorites"
ON public.favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove from their own favorites
CREATE POLICY "Users can remove from their own favorites"
ON public.favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Add missing DELETE policy for user_roles
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));