-- Boş username unique çakışmasını önle: unique constraint'i kaldır ve handle_new_user fonksiyonunu benzersiz username üretecek şekilde güncelle
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Boş olmayan değerler için partial unique index (büyük/küçük harf duyarsız)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL AND username <> '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_username text;
BEGIN
  new_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 12);
  INSERT INTO public.profiles (id, user_id, username, avatar_url)
  VALUES (NEW.id, NEW.id, new_username, '')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;