-- Create member progress system

-- Table to store member tier configuration
CREATE TABLE IF NOT EXISTS public.member_tier_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name text NOT NULL UNIQUE,
  tier_level integer NOT NULL UNIQUE,
  min_spending numeric NOT NULL,
  max_spending numeric,
  discount_percentage integer DEFAULT 0,
  free_shipping_threshold numeric,
  badge_color text NOT NULL,
  badge_icon text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert tier configurations
INSERT INTO public.member_tier_config (tier_name, tier_level, min_spending, max_spending, discount_percentage, free_shipping_threshold, badge_color, badge_icon) VALUES
('Bronze', 1, 0, 999999, 0, NULL, '#CD7F32', 'Award'),
('Silver', 2, 1000000, 4999999, 5, 500000, '#C0C0C0', 'Medal'),
('Gold', 3, 5000000, 9999999, 10, 300000, '#FFD700', 'Crown'),
('Platinum', 4, 10000000, NULL, 15, 0, '#E5E4E2', 'Gem');

-- Table to track user member progress
CREATE TABLE IF NOT EXISTS public.member_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_tier text NOT NULL DEFAULT 'Bronze',
  total_spending numeric NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  tier_upgraded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_tier_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for member_tier_config
CREATE POLICY "Anyone can view tier config"
  ON public.member_tier_config
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage tier config"
  ON public.member_tier_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for member_progress
CREATE POLICY "Users can view own progress"
  ON public.member_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.member_progress
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to calculate and update member tier
CREATE OR REPLACE FUNCTION public.update_member_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_spending numeric;
  v_order_count integer;
  v_new_tier text;
  v_old_tier text;
BEGIN
  -- Calculate total spending from completed orders
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO v_total_spending, v_order_count
  FROM public.orders
  WHERE user_id = NEW.user_id 
    AND status = 'selesai'
    AND payment_status = 'paid';

  -- Determine new tier based on spending
  SELECT tier_name INTO v_new_tier
  FROM public.member_tier_config
  WHERE v_total_spending >= min_spending 
    AND (max_spending IS NULL OR v_total_spending <= max_spending)
  ORDER BY tier_level DESC
  LIMIT 1;

  -- Get old tier if exists
  SELECT current_tier INTO v_old_tier
  FROM public.member_progress
  WHERE user_id = NEW.user_id;

  -- Insert or update member progress
  INSERT INTO public.member_progress (
    user_id, 
    current_tier, 
    total_spending, 
    order_count,
    tier_upgraded_at,
    updated_at
  )
  VALUES (
    NEW.user_id,
    v_new_tier,
    v_total_spending,
    v_order_count,
    CASE WHEN v_old_tier IS NULL OR v_old_tier != v_new_tier THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    current_tier = v_new_tier,
    total_spending = v_total_spending,
    order_count = v_order_count,
    tier_upgraded_at = CASE 
      WHEN member_progress.current_tier != v_new_tier THEN now()
      ELSE member_progress.tier_upgraded_at
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Trigger to update member tier when order is completed
CREATE TRIGGER update_member_tier_on_order_complete
  AFTER INSERT OR UPDATE OF status, payment_status
  ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'selesai' AND NEW.payment_status = 'paid')
  EXECUTE FUNCTION public.update_member_tier();

-- Function to initialize member progress for existing users
CREATE OR REPLACE FUNCTION public.initialize_member_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.member_progress (user_id, current_tier, total_spending, order_count)
  SELECT 
    o.user_id,
    'Bronze',
    COALESCE(SUM(o.total_amount), 0) as total_spending,
    COUNT(*) as order_count
  FROM public.orders o
  WHERE o.status = 'selesai' 
    AND o.payment_status = 'paid'
  GROUP BY o.user_id
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Initialize progress for existing users
SELECT public.initialize_member_progress();