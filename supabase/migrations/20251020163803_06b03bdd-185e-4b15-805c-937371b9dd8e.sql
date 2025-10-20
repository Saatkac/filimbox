-- Create app_role enum if not exists
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    role public.app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Drop existing policies if they exist
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
    DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
EXCEPTION
    WHEN undefined_table THEN null;
    WHEN undefined_object THEN null;
END $$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create movies table
CREATE TABLE IF NOT EXISTS public.movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    poster_url TEXT,
    backdrop_url TEXT,
    rating DECIMAL(2,1) DEFAULT 0.0,
    year INTEGER,
    category TEXT NOT NULL,
    duration TEXT,
    video_url TEXT NOT NULL,
    trailer_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

-- Drop existing movie policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view movies" ON public.movies;
    DROP POLICY IF EXISTS "Only admins can insert movies" ON public.movies;
    DROP POLICY IF EXISTS "Only admins can update movies" ON public.movies;
    DROP POLICY IF EXISTS "Only admins can delete movies" ON public.movies;
EXCEPTION
    WHEN undefined_table THEN null;
    WHEN undefined_object THEN null;
END $$;

-- Movies RLS Policies
CREATE POLICY "Anyone can view movies"
  ON public.movies FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert movies"
  ON public.movies FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update movies"
  ON public.movies FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete movies"
  ON public.movies FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create series table
CREATE TABLE IF NOT EXISTS public.series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    poster_url TEXT,
    backdrop_url TEXT,
    rating DECIMAL(2,1) DEFAULT 0.0,
    year INTEGER,
    category TEXT NOT NULL,
    trailer_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

-- Drop existing series policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view series" ON public.series;
    DROP POLICY IF EXISTS "Only admins can insert series" ON public.series;
    DROP POLICY IF EXISTS "Only admins can update series" ON public.series;
    DROP POLICY IF EXISTS "Only admins can delete series" ON public.series;
EXCEPTION
    WHEN undefined_table THEN null;
    WHEN undefined_object THEN null;
END $$;

-- Series RLS Policies
CREATE POLICY "Anyone can view series"
  ON public.series FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert series"
  ON public.series FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update series"
  ON public.series FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete series"
  ON public.series FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create episodes table
CREATE TABLE IF NOT EXISTS public.episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    episode_number INTEGER NOT NULL,
    season_number INTEGER NOT NULL,
    video_url TEXT NOT NULL,
    duration TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(series_id, season_number, episode_number)
);

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- Drop existing episode policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view episodes" ON public.episodes;
    DROP POLICY IF EXISTS "Only admins can insert episodes" ON public.episodes;
    DROP POLICY IF EXISTS "Only admins can update episodes" ON public.episodes;
    DROP POLICY IF EXISTS "Only admins can delete episodes" ON public.episodes;
EXCEPTION
    WHEN undefined_table THEN null;
    WHEN undefined_object THEN null;
END $$;

-- Episodes RLS Policies
CREATE POLICY "Anyone can view episodes"
  ON public.episodes FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert episodes"
  ON public.episodes FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update episodes"
  ON public.episodes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete episodes"
  ON public.episodes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers
DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_movies_updated_at ON public.movies;
    DROP TRIGGER IF EXISTS update_series_updated_at ON public.series;
    DROP TRIGGER IF EXISTS update_episodes_updated_at ON public.episodes;
EXCEPTION
    WHEN undefined_table THEN null;
    WHEN undefined_object THEN null;
END $$;

-- Add triggers for updated_at
CREATE TRIGGER update_movies_updated_at
    BEFORE UPDATE ON public.movies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_series_updated_at
    BEFORE UPDATE ON public.series
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at
    BEFORE UPDATE ON public.episodes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_movies_category ON public.movies(category);
CREATE INDEX IF NOT EXISTS idx_movies_year ON public.movies(year);
CREATE INDEX IF NOT EXISTS idx_series_category ON public.series(category);
CREATE INDEX IF NOT EXISTS idx_episodes_series_id ON public.episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON public.episodes(series_id, season_number);