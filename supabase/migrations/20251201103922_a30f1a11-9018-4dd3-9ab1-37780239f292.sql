-- Drop existing foreign key constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_shipping_address_id_fkey;

-- Add new foreign key constraint with ON DELETE SET NULL
ALTER TABLE orders
ADD CONSTRAINT orders_shipping_address_id_fkey 
FOREIGN KEY (shipping_address_id) 
REFERENCES addresses(id) 
ON DELETE SET NULL;