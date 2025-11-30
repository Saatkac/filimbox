-- Arkadaşlık sistemi için friends tablosu
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- İzleme partisi tablosu
CREATE TABLE IF NOT EXISTS public.watch_parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  CHECK (
    (movie_id IS NOT NULL AND series_id IS NULL AND episode_id IS NULL) OR
    (movie_id IS NULL AND series_id IS NOT NULL AND episode_id IS NOT NULL) OR
    (movie_id IS NULL AND series_id IS NULL AND episode_id IS NULL)
  )
);

-- Parti katılımcıları
CREATE TABLE IF NOT EXISTS public.watch_party_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_progress NUMERIC DEFAULT 0,
  is_host BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(party_id, user_id)
);

-- Parti mesajları
CREATE TABLE IF NOT EXISTS public.party_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_messages ENABLE ROW LEVEL SECURITY;

-- Friends policies
CREATE POLICY "Users can view their own friendships"
  ON public.friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests"
  ON public.friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friend requests"
  ON public.friends FOR UPDATE
  USING (auth.uid() = friend_id OR auth.uid() = user_id);

CREATE POLICY "Users can delete their friendships"
  ON public.friends FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Watch parties policies
CREATE POLICY "Users can view parties they're in"
  ON public.watch_parties FOR SELECT
  USING (
    auth.uid() = host_user_id OR 
    EXISTS (
      SELECT 1 FROM public.watch_party_participants 
      WHERE party_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create watch parties"
  ON public.watch_parties FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their parties"
  ON public.watch_parties FOR UPDATE
  USING (auth.uid() = host_user_id);

-- Party participants policies
CREATE POLICY "Users can view participants in their parties"
  ON public.watch_party_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.watch_parties 
      WHERE id = party_id AND (host_user_id = auth.uid() OR id IN (
        SELECT party_id FROM public.watch_party_participants WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can join parties"
  ON public.watch_party_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation"
  ON public.watch_party_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave parties"
  ON public.watch_party_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Party messages policies
CREATE POLICY "Users can view messages in their parties"
  ON public.party_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.watch_party_participants 
      WHERE party_id = party_messages.party_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.party_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.watch_party_participants 
      WHERE party_id = party_messages.party_id AND user_id = auth.uid() AND left_at IS NULL
    )
  );

-- Realtime için publication ekle
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friends;

-- Trigger for updated_at
CREATE TRIGGER update_friends_updated_at
  BEFORE UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();