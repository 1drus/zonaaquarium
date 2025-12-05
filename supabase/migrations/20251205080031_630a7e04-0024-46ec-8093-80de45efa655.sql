-- Fix profiles table RLS: restrict viewing to own profile only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create restrictive policy for own profile viewing
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Create a limited public view for reviewer info (only name and avatar for reviews)
CREATE OR REPLACE VIEW public.reviewer_public_info AS
SELECT 
  id,
  full_name,
  avatar_url
FROM public.profiles;

-- Grant select on the view to authenticated and anon users
GRANT SELECT ON public.reviewer_public_info TO authenticated;
GRANT SELECT ON public.reviewer_public_info TO anon;