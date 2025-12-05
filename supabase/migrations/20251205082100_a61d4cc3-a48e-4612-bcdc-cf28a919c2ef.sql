-- Allow public read access to specific system config keys that are safe to expose
-- Midtrans client keys are designed to be public (used in browser)
CREATE POLICY "Public can view payment config" ON public.system_config
FOR SELECT
USING (config_key IN ('midtrans_environment', 'midtrans_client_key_sandbox', 'midtrans_client_key_production'));