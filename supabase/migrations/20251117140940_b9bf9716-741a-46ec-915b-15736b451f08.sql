-- Fix user registration flow: ensure profiles and member progress are created

-- First, check if trigger exists and recreate it properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to auto-create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Initialize existing users who don't have profiles
INSERT INTO public.profiles (id, full_name, phone)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User') as full_name,
  COALESCE(au.raw_user_meta_data->>'phone', '') as phone
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Initialize member progress for all users who don't have it
INSERT INTO public.member_progress (user_id, current_tier, total_spending, order_count)
SELECT 
  au.id,
  'Bronze' as current_tier,
  0 as total_spending,
  0 as order_count
FROM auth.users au
LEFT JOIN public.member_progress mp ON mp.user_id = au.id
WHERE mp.user_id IS NULL;