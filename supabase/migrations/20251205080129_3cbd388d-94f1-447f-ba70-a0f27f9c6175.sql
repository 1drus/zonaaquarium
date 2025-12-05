-- Drop the security definer view and recreate as SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.reviewer_public_info;

-- The public_reviews view is already set up correctly with SECURITY INVOKER
-- No additional changes needed for the reviewer view since public_reviews handles this