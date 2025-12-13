import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate HMAC-SHA256 signature for internal function calls
async function generateInternalSignature(orderId: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SUPABASE_SERVICE_ROLE_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(orderId)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing authentication token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create a client with the user's token to verify identity
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error("Invalid token or user not found:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid authentication token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Order ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Checking payment status for order:", orderId);

    // Get current order status - using admin client
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, payment_status, status, payment_method, user_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the user owns this order (or is admin)
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });

    if (order.user_id !== user.id && !isAdmin) {
      console.error("User does not own this order:", { userId: user.id, orderUserId: order.user_id });
      return new Response(
        JSON.stringify({ error: "Unauthorized - You do not have access to this order" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // If already paid, return current status
    if (order.payment_status === "paid") {
      console.log("Order already paid:", orderId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: order.status,
          payment_status: order.payment_status,
          message: "Pembayaran sudah dikonfirmasi"
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Only check Midtrans for midtrans payment method
    if (order.payment_method !== "midtrans") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: order.status,
          payment_status: order.payment_status,
          message: "Metode pembayaran bukan Midtrans"
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check with Midtrans API
    const authString = btoa(`${MIDTRANS_SERVER_KEY}:`);
    const midtransUrl = MIDTRANS_SERVER_KEY?.includes("SB-") 
      ? `https://api.sandbox.midtrans.com/v2/${orderId}/status`
      : `https://api.midtrans.com/v2/${orderId}/status`;

    console.log("Checking Midtrans status at:", midtransUrl);

    const midtransResponse = await fetch(midtransUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/json",
      },
    });

    const midtransData = await midtransResponse.json();
    console.log("Midtrans response:", midtransData);

    if (midtransData.status_code === "404") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: order.status,
          payment_status: order.payment_status,
          message: "Transaksi belum ditemukan di Midtrans"
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const transactionStatus = midtransData.transaction_status;
    const isPaid = transactionStatus === "capture" || transactionStatus === "settlement";

    let newOrderStatus = order.status;
    let newPaymentStatus = order.payment_status;

    if (isPaid) {
      newOrderStatus = "diproses";
      newPaymentStatus = "paid";
    } else if (transactionStatus === "pending") {
      newOrderStatus = "menunggu_pembayaran";
      newPaymentStatus = "pending";
    } else if (transactionStatus === "deny" || transactionStatus === "expire" || transactionStatus === "cancel") {
      newOrderStatus = "dibatalkan";
      newPaymentStatus = transactionStatus === "expire" ? "expired" : "failed";
    }

    // Update order if status changed
    if (newPaymentStatus !== order.payment_status || newOrderStatus !== order.status) {
      console.log(`Updating order ${orderId}: ${newOrderStatus}, ${newPaymentStatus}`);
      
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: newOrderStatus,
          payment_status: newPaymentStatus,
          paid_at: isPaid ? new Date().toISOString() : null,
          payment_method: midtransData.payment_type || order.payment_method,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Error updating order:", updateError);
        throw updateError;
      }

      // Send invoice email if payment successful
      if (isPaid) {
        try {
          const internalSignature = await generateInternalSignature(orderId);
          const invoiceResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-invoice-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-signature": internalSignature,
            },
            body: JSON.stringify({ orderId }),
          });
          
          if (invoiceResponse.ok) {
            console.log(`Invoice email sent for order ${orderId}`);
          }
        } catch (emailError) {
          console.error("Error sending invoice email:", emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: newOrderStatus,
        payment_status: newPaymentStatus,
        transaction_status: transactionStatus,
        message: isPaid ? "Pembayaran berhasil dikonfirmasi!" : `Status: ${transactionStatus}`
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in check-payment-status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
