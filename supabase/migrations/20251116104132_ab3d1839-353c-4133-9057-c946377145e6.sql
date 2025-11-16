-- Create table for email verification codes
CREATE TABLE public.email_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false
);

-- Index for performance
CREATE INDEX idx_email_verification_codes_email ON public.email_verification_codes(email);
CREATE INDEX idx_email_verification_codes_expires ON public.email_verification_codes(expires_at);

-- Enable RLS
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can request verification code
CREATE POLICY "Anyone can request verification code" 
  ON public.email_verification_codes 
  FOR INSERT 
  WITH CHECK (true);

-- Policy: Only system can read/update (edge functions use service role)
CREATE POLICY "System can manage verification codes" 
  ON public.email_verification_codes 
  FOR ALL
  USING (false);

-- Cleanup function for expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.email_verification_codes
  WHERE expires_at < now() OR (verified = true AND created_at < now() - interval '1 day');
END;
$$;