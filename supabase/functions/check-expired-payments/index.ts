import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Checking for expired payment deadlines...");

    // Find orders that:
    // 1. Have pending payment status
    // 2. Are waiting for payment (menunggu_pembayaran)
    // 3. Have passed their payment deadline
    const { data: expiredOrders, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_number, user_id, payment_deadline")
      .eq("payment_status", "pending")
      .eq("status", "menunggu_pembayaran")
      .lt("payment_deadline", new Date().toISOString())
      .not("payment_deadline", "is", null);

    if (fetchError) {
      console.error("Error fetching expired orders:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredOrders?.length || 0} expired orders`);

    if (!expiredOrders || expiredOrders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No expired orders found",
          expired_count: 0 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update all expired orders
    const expiredOrderIds = expiredOrders.map(o => o.id);
    
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "expired",
        status: "dibatalkan",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: "Batas waktu pembayaran telah habis",
        updated_at: new Date().toISOString(),
      })
      .in("id", expiredOrderIds);

    if (updateError) {
      console.error("Error updating expired orders:", updateError);
      throw updateError;
    }

    // Log each expired order
    for (const order of expiredOrders) {
      console.log(`Order ${order.order_number} expired - deadline was ${order.payment_deadline}`);
    }

    console.log(`Successfully expired ${expiredOrders.length} orders`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Expired ${expiredOrders.length} orders`,
        expired_count: expiredOrders.length,
        expired_orders: expiredOrders.map(o => o.order_number)
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in check-expired-payments:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);