-- Add cancellation request fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cancellation_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancellation_request_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_request_date TIMESTAMP WITH TIME ZONE;

-- Update RLS policy to allow users to request cancellation on their pending orders
DROP POLICY IF EXISTS "Users can request cancellation" ON public.orders;
CREATE POLICY "Users can request cancellation"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND status IN ('menunggu_pembayaran', 'diproses')
  AND cancellation_requested = false
)
WITH CHECK (
  auth.uid() = user_id 
  AND cancellation_requested = true
);