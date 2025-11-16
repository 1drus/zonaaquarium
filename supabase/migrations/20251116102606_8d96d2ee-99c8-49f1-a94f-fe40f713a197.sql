-- Function to check and decrease stock when order is created
CREATE OR REPLACE FUNCTION public.decrease_stock_on_order()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If variant_id exists, update variant stock
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE public.product_variants
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.variant_id;
    
    -- Check if stock went negative (overselling prevention)
    IF (SELECT stock_quantity FROM public.product_variants WHERE id = NEW.variant_id) < 0 THEN
      RAISE EXCEPTION 'Stok variant tidak mencukupi. Tersedia: %, Diminta: %',
        (SELECT stock_quantity + NEW.quantity FROM public.product_variants WHERE id = NEW.variant_id),
        NEW.quantity;
    END IF;
  ELSE
    -- Update product stock if no variant
    UPDATE public.products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
    
    -- Check if stock went negative (overselling prevention)
    IF (SELECT stock_quantity FROM public.products WHERE id = NEW.product_id) < 0 THEN
      RAISE EXCEPTION 'Stok produk tidak mencukupi. Tersedia: %, Diminta: %',
        (SELECT stock_quantity + NEW.quantity FROM public.products WHERE id = NEW.product_id),
        NEW.quantity;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to restore stock when order is cancelled
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only restore stock if order status changed to 'dibatalkan'
  IF NEW.status = 'dibatalkan' AND OLD.status != 'dibatalkan' THEN
    -- Restore stock for all items in this order with variants
    UPDATE public.product_variants pv
    SET stock_quantity = stock_quantity + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.variant_id = pv.id
      AND oi.variant_id IS NOT NULL;
    
    -- Restore stock for products without variants
    UPDATE public.products p
    SET stock_quantity = stock_quantity + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id
      AND oi.variant_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for decreasing stock when order items are inserted
DROP TRIGGER IF EXISTS trigger_decrease_stock ON public.order_items;
CREATE TRIGGER trigger_decrease_stock
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.decrease_stock_on_order();

-- Create trigger for restoring stock when order is cancelled
DROP TRIGGER IF EXISTS trigger_restore_stock ON public.orders;
CREATE TRIGGER trigger_restore_stock
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_stock_on_cancel();