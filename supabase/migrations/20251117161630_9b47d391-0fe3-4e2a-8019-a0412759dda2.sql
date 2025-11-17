-- Allow users to insert order items for their own orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'order_items' 
      AND policyname = 'Users can insert items for own orders'
  ) THEN
    CREATE POLICY "Users can insert items for own orders"
    ON public.order_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.user_id = auth.uid()
      )
    );
  END IF;
END$$;

-- Attach trigger to decrease stock on new order_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'decrease_stock_on_order_trigger') THEN
    CREATE TRIGGER decrease_stock_on_order_trigger
    AFTER INSERT ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.decrease_stock_on_order();
  END IF;
END$$;

-- Attach trigger to restore stock when order is cancelled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'restore_stock_on_cancel_trigger') THEN
    CREATE TRIGGER restore_stock_on_cancel_trigger
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.restore_stock_on_cancel();
  END IF;
END$$;

-- Allow users to insert their own voucher usage (for their own order)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'voucher_usage' 
      AND policyname = 'Users can insert own voucher usage'
  ) THEN
    CREATE POLICY "Users can insert own voucher usage"
    ON public.voucher_usage
    FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.user_id = auth.uid()
      )
    );
  END IF;
END$$;