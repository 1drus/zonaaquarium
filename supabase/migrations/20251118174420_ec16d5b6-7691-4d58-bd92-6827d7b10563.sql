-- Add allowed_tiers column to vouchers table
ALTER TABLE public.vouchers 
ADD COLUMN allowed_tiers text[] DEFAULT NULL;

COMMENT ON COLUMN public.vouchers.allowed_tiers IS 'Array of tier names that can use this voucher. NULL means all tiers can use it.';

-- Create index for better query performance
CREATE INDEX idx_vouchers_allowed_tiers ON public.vouchers USING GIN (allowed_tiers);