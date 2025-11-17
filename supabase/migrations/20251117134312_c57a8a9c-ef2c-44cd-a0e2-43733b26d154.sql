-- Fix the security definer view by recreating it with security_invoker=on
DROP VIEW IF EXISTS public.public_reviews;

CREATE VIEW public.public_reviews
WITH (security_invoker=on)
AS
SELECT 
  r.id,
  r.product_id,
  r.order_id,
  r.rating,
  r.title,
  r.comment,
  r.images,
  r.is_verified_purchase,
  r.created_at,
  r.updated_at,
  -- Join with profiles to show reviewer info without exposing user_id
  p.full_name as reviewer_name,
  p.avatar_url as reviewer_avatar
FROM public.reviews r
LEFT JOIN public.profiles p ON p.id = r.user_id
WHERE r.is_visible = true;

-- Grant access to the view
GRANT SELECT ON public.public_reviews TO authenticated, anon;

-- Add comment explaining the purpose
COMMENT ON VIEW public.public_reviews IS 'Public-facing view of reviews that protects user privacy by not exposing user_id. Uses security_invoker to respect RLS policies. Use this view instead of direct reviews table queries for public review displays.';