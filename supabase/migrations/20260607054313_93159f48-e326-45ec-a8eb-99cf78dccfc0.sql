
-- 1) Drop unused social-feature tables (forbidden per project rules) and the related edge function table refs
DROP TABLE IF EXISTS public.party_messages CASCADE;
DROP TABLE IF EXISTS public.watch_party_participants CASCADE;
DROP TABLE IF EXISTS public.watch_parties CASCADE;
DROP TABLE IF EXISTS public.friends CASCADE;

-- 2) Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.profiles FROM anon;

-- 3) Scope user_roles policies to authenticated role explicitly
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4) Lock down SECURITY DEFINER functions
-- Trigger-only functions: revoke from public entirely
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_admin_username() FROM PUBLIC, anon, authenticated;

-- has_role is used in RLS — keep available for authenticated, revoke from anon/public
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
