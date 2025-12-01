-- Add city_id to addresses table for efficient RajaOngkir lookup
ALTER TABLE addresses ADD COLUMN city_id INTEGER;

-- Add weight columns to products (in grams)
ALTER TABLE products ADD COLUMN weight INTEGER DEFAULT 500;
COMMENT ON COLUMN products.weight IS 'Product weight in grams';

-- Add weight columns to product_variants (nullable, fallback to product weight)
ALTER TABLE product_variants ADD COLUMN weight INTEGER;
COMMENT ON COLUMN product_variants.weight IS 'Variant weight in grams, NULL means use product weight';