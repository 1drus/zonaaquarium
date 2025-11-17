-- Recalculate all existing member tiers based on current data
DO $$
DECLARE
  user_record RECORD;
  v_total_spending numeric;
  v_order_count integer;
  v_new_tier text;
  v_old_tier text;
BEGIN
  -- Loop through all users who have completed orders
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM public.orders 
    WHERE status = 'selesai' AND payment_status = 'paid'
  LOOP
    -- Get old tier
    SELECT current_tier INTO v_old_tier
    FROM public.member_progress
    WHERE user_id = user_record.user_id;

    -- Calculate total spending from completed orders
    SELECT 
      COALESCE(SUM(total_amount), 0),
      COUNT(*)
    INTO v_total_spending, v_order_count
    FROM public.orders
    WHERE user_id = user_record.user_id 
      AND status = 'selesai'
      AND payment_status = 'paid';

    -- Determine new tier based on spending
    SELECT tier_name INTO v_new_tier
    FROM public.member_tier_config
    WHERE v_total_spending >= min_spending 
      AND (max_spending IS NULL OR v_total_spending < max_spending)
    ORDER BY tier_level DESC
    LIMIT 1;

    -- Default to Bronze if no tier found
    IF v_new_tier IS NULL THEN
      v_new_tier := 'Bronze';
    END IF;

    RAISE NOTICE 'User: %, Old Tier: %, New Tier: %, Spending: %', 
      user_record.user_id, v_old_tier, v_new_tier, v_total_spending;

    -- Update member progress
    INSERT INTO public.member_progress (
      user_id, 
      current_tier, 
      total_spending, 
      order_count,
      tier_upgraded_at,
      updated_at
    )
    VALUES (
      user_record.user_id,
      v_new_tier,
      v_total_spending,
      v_order_count,
      CASE WHEN v_new_tier != 'Bronze' THEN now() ELSE NULL END,
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

    -- Assign tier voucher if tier upgraded
    IF v_old_tier IS NOT NULL AND v_old_tier != v_new_tier AND v_new_tier != 'Bronze' THEN
      PERFORM public.assign_tier_voucher(user_record.user_id, v_new_tier);
    END IF;
  END LOOP;
END $$;