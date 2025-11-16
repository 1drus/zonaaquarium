import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  tierName: string;
  voucherCode: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, tierName, voucherCode }: NotificationRequest = await req.json();

    console.log('Processing tier voucher notification:', { userId, tierName, voucherCode });

    // Mark voucher as notified
    const { error: updateError } = await supabaseClient
      .from('user_tier_vouchers')
      .update({ is_notified: true })
      .eq('user_id', userId)
      .eq('tier_name', tierName);

    if (updateError) {
      console.error('Error marking voucher as notified:', updateError);
    }

    // You can add email notification here if needed
    // For now, we rely on real-time subscription in the frontend

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification processed successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in notify-tier-voucher function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});