-- Create product_variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT,
  variant_name TEXT NOT NULL,
  size TEXT,
  color TEXT,
  price_adjustment NUMERIC DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, variant_name)
);

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Public can view active variants
CREATE POLICY "Public can view active variants"
ON public.product_variants
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage variants
CREATE POLICY "Admins can manage variants"
ON public.product_variants
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add variant_id to cart_items
ALTER TABLE public.cart_items
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;

-- Add variant info to order_items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS variant_name TEXT,
ADD COLUMN IF NOT EXISTS variant_sku TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON public.cart_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);