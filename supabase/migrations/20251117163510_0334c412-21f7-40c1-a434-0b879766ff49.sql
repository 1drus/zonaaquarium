-- Fix null current_tier when updating member tier by adding safe fallback
CREATE OR REPLACE FUNCTION public.update_member_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_spending numeric;
  v_order_count integer;
  v_new_tier text;
  v_old_tier text;
  v_voucher_id uuid;
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

  -- SAFE FALLBACK: default to Bronze when no matching tier config
  IF v_new_tier IS NULL THEN
    v_new_tier := 'Bronze';
  END IF;

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
    current_tier = EXCLUDED.current_tier,
    total_spending = EXCLUDED.total_spending,
    order_count = EXCLUDED.order_count,
    tier_upgraded_at = CASE 
      WHEN member_progress.current_tier != EXCLUDED.current_tier THEN now()
      ELSE member_progress.tier_upgraded_at
    END,
    updated_at = now();

  -- Auto-assign voucher if tier upgraded
  IF v_old_tier IS NOT NULL AND v_old_tier != v_new_tier THEN
    v_voucher_id := public.assign_tier_voucher(NEW.user_id, v_new_tier);
  END IF;

  RETURN NEW;
END;
$function$;