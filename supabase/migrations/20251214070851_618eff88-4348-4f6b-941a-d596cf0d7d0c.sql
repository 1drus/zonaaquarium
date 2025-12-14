-- Create flash_sales table for managing flash sale events
CREATE TABLE public.flash_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  banner_image_url TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flash_sale_items table for products in flash sale
CREATE TABLE public.flash_sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flash_sale_id UUID NOT NULL REFERENCES public.flash_sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  flash_price NUMERIC NOT NULL,
  original_price NUMERIC NOT NULL,
  stock_limit INTEGER NOT NULL DEFAULT 10,
  sold_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(flash_sale_id, product_id)
);

-- Enable RLS
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flash_sale_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for flash_sales
CREATE POLICY "Anyone can view active flash sales"
ON public.flash_sales
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage flash sales"
ON public.flash_sales
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for flash_sale_items
CREATE POLICY "Anyone can view flash sale items"
ON public.flash_sale_items
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage flash sale items"
ON public.flash_sale_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create function to increment sold count and check stock
CREATE OR REPLACE FUNCTION public.increment_flash_sale_sold(p_flash_sale_id UUID, p_product_id UUID, p_quantity INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  SELECT * INTO v_item
  FROM public.flash_sale_items
  WHERE flash_sale_id = p_flash_sale_id AND product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_item.sold_count + p_quantity > v_item.stock_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE public.flash_sale_items
  SET sold_count = sold_count + p_quantity
  WHERE id = v_item.id;

  RETURN TRUE;
END;
$$;

-- Create view for active flash sales with items
CREATE OR REPLACE VIEW public.active_flash_sales AS
SELECT 
  fs.id,
  fs.name,
  fs.description,
  fs.banner_image_url,
  fs.start_time,
  fs.end_time,
  fs.is_active
FROM public.flash_sales fs
WHERE fs.is_active = true
  AND now() >= fs.start_time
  AND now() <= fs.end_time;

-- Create trigger for updated_at
CREATE TRIGGER update_flash_sales_updated_at
BEFORE UPDATE ON public.flash_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for flash_sale_items (for sold count updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.flash_sale_items;