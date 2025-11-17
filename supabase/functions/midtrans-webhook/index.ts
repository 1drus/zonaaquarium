import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MidtransNotification {
  transaction_status: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  signature_key: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notification: MidtransNotification = await req.json();
    
    console.log("Received Midtrans notification:", notification);

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const paymentType = notification.payment_type;

    // Verify signature
    const crypto = await import("https://deno.land/std@0.177.0/crypto/mod.ts");
    const signatureKey = notification.signature_key;
    const expectedSignature = await crypto.crypto.subtle.digest(
      "SHA-512",
      new TextEncoder().encode(
        `${orderId}${notification.transaction_status}${notification.gross_amount}${MIDTRANS_SERVER_KEY}`
      )
    );
    const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (signatureKey !== expectedSignatureHex) {
      console.error("Invalid signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let orderStatus = "menunggu_pembayaran";
    let paymentStatus = "pending";

    // Map Midtrans status to our status
    if (transactionStatus === "capture" || transactionStatus === "settlement") {
      orderStatus = "diproses";
      paymentStatus = "paid";
    } else if (transactionStatus === "pending") {
      orderStatus = "menunggu_pembayaran";
      paymentStatus = "pending";
    } else if (transactionStatus === "deny" || transactionStatus === "expire" || transactionStatus === "cancel") {
      orderStatus = "dibatalkan";
      paymentStatus = transactionStatus === "expire" ? "expired" : "failed";
    }

    // Update order in database
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: orderStatus,
        payment_status: paymentStatus,
        paid_at: (transactionStatus === "capture" || transactionStatus === "settlement") ? new Date().toISOString() : null,
        payment_method: paymentType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw updateError;
    }

    console.log(`Order ${orderId} updated: ${orderStatus}, ${paymentStatus}`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in midtrans-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
