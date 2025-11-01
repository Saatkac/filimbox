-- Add trigger to auto-set admin username and prevent non-admins from using "Admin"
CREATE OR REPLACE FUNCTION public.validate_admin_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.user_id AND role = 'admin'::app_role
  ) THEN
    -- Force admin username to be "Admin"
    NEW.username := 'Admin';
  ELSE
    -- Prevent non-admins from using "Admin" username
    IF LOWER(NEW.username) = 'admin' THEN
      RAISE EXCEPTION 'Bu kullanıcı adı kullanılamaz';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profiles
DROP TRIGGER IF EXISTS enforce_admin_username ON public.profiles;
CREATE TRIGGER enforce_admin_username
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_username();