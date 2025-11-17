-- Create function to set user role by email
CREATE OR REPLACE FUNCTION public.set_user_role_by_email(_email text, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from auth.users by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = _email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', _email;
  END IF;
  
  -- Insert role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Assign admin role to admin@zonaaquarium.com
SELECT public.set_user_role_by_email('admin@zonaaquarium.com', 'admin'::app_role);