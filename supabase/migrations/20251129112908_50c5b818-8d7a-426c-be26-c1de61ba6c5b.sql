-- Update system_config for RajaOngkir integration
-- Change from Biteship area_id to RajaOngkir city_id

-- Update or insert shipping_origin_city_id
INSERT INTO system_config (config_key, config_value, description)
VALUES ('shipping_origin_city_id', '151', 'RajaOngkir City ID untuk lokasi toko (Origin pengiriman)')
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description;

-- Update shipping_origin_name with Jakarta Pusat as default
UPDATE system_config 
SET 
  config_value = 'Jakarta Pusat',
  description = 'Nama kota origin untuk display'
WHERE config_key = 'shipping_origin_name';

-- Remove old Biteship area_id config if exists
DELETE FROM system_config 
WHERE config_key = 'shipping_origin_area_id';