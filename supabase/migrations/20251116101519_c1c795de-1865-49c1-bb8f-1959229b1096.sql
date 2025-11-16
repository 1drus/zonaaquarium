-- Create function to set user role
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Create function to remove user role
CREATE OR REPLACE FUNCTION public.remove_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = _role;
END;
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS TABLE(role app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id;
$$;

-- Set first user as admin (arilakbar41@gmail.com)
INSERT INTO public.user_roles (user_id, role)
VALUES ('2b2ebdc5-49f3-4d9f-bf8b-ac18055c0b8c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;