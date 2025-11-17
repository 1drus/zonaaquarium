-- Lock down profiles table to protect customer privacy
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view basic profiles" ON public.profiles;

-- Allow authenticated users to view all profiles (for internal app features)
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow anonymous users to view only their own profile during registration flow
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO anon
  USING (auth.uid() = id);

COMMENT ON TABLE public.profiles IS 'User profiles table with restricted access. Public access removed to protect customer privacy. Reviewer information is exposed via public_reviews view instead.';