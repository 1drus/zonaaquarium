-- Fix RLS policy for admin order updates
-- Drop existing admin update policy
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;

-- Create comprehensive admin update policy that allows all updates
CREATE POLICY "Admins can update all orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));