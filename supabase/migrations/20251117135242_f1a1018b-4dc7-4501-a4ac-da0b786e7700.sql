-- Secure the email_verification_codes table with RLS
ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Service role only access" ON email_verification_codes;

-- Only service role (edge functions) can access this table
-- No user should ever directly access verification codes
CREATE POLICY "Service role only access" 
ON email_verification_codes 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Add automatic cleanup trigger for expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM email_verification_codes
  WHERE expires_at < NOW();
END;
$$;

-- Create a trigger to run cleanup on each insert
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_codes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM cleanup_expired_verification_codes();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_cleanup_expired_codes ON email_verification_codes;
CREATE TRIGGER auto_cleanup_expired_codes
  BEFORE INSERT ON email_verification_codes
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_expired_codes();

COMMENT ON TABLE email_verification_codes IS 'Stores temporary verification codes during registration. Passwords stored in plaintext temporarily (10min max) as required by Supabase auth.admin.createUser(). Protected by RLS - only accessible to service role.';