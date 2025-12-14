-- Fix security definer view by dropping and recreating without security definer
DROP VIEW IF EXISTS public.active_flash_sales;

-- Recreate as regular view (inherits RLS of querying user)
CREATE VIEW public.active_flash_sales AS
SELECT 
  fs.id,
  fs.name,
  fs.description,
  fs.banner_image_url,
  fs.start_time,
  fs.end_time,
  fs.is_active
FROM public.flash_sales fs
WHERE fs.is_active = true
  AND now() >= fs.start_time
  AND now() <= fs.end_time;