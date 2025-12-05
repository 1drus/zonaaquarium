-- Add Midtrans client keys to system_config
-- Client keys are public and safe to store in database

INSERT INTO system_config (config_key, config_value, description)
VALUES 
  ('midtrans_client_key_sandbox', 'YOUR_SANDBOX_CLIENT_KEY', 'Midtrans Sandbox Client Key - can be found at dashboard.sandbox.midtrans.com'),
  ('midtrans_client_key_production', 'YOUR_PRODUCTION_CLIENT_KEY', 'Midtrans Production Client Key - can be found at dashboard.midtrans.com')
ON CONFLICT (config_key) DO NOTHING;