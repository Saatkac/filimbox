
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_username text;
  default_avatar text := 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTubq_1Ec8ya2q1ihaTWobDRzSOoPkhSwpkICgfYvtVHg&s=10';
  attempt int := 0;
BEGIN
  LOOP
    new_username := 'user_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    BEGIN
      INSERT INTO public.profiles (id, user_id, username, avatar_url)
      VALUES (NEW.id, NEW.id, new_username, default_avatar)
      ON CONFLICT (user_id) DO NOTHING;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      attempt := attempt + 1;
      IF attempt > 5 THEN
        EXIT;
      END IF;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;
