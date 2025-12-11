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
  status_code: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  signature_key: string;
}

// Simple in-memory rate limiting for webhook
const webhookRequestLog = new Map<string, number[]>();

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 100 requests per minute per IP
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    // Clean old entries
    const ipRequests = webhookRequestLog.get(clientIp) || [];
    const recentRequests = ipRequests.filter(timestamp => timestamp > oneMinuteAgo);
    
    if (recentRequests.length >= 100) {
      console.log("Rate limit exceeded for IP:", clientIp);
      return new Response(
        JSON.stringify({ error: "Too many requests" }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Log this request
    recentRequests.push(now);
    webhookRequestLog.set(clientIp, recentRequests);
    
    const notification: MidtransNotification = await req.json();
    
    console.log("Received Midtrans notification:", notification);

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const paymentType = notification.payment_type;

    // Verify signature using Midtrans formula: SHA512(order_id + status_code + gross_amount + server_key)
    const crypto = await import("https://deno.land/std@0.177.0/crypto/mod.ts");
    const signatureKey = notification.signature_key;
    const signatureString = `${orderId}${notification.status_code}${notification.gross_amount}${MIDTRANS_SERVER_KEY}`;
    
    console.log("Signature verification - order_id:", orderId);
    console.log("Signature verification - status_code:", notification.status_code);
    console.log("Signature verification - gross_amount:", notification.gross_amount);
    
    const expectedSignature = await crypto.crypto.subtle.digest(
      "SHA-512",
      new TextEncoder().encode(signatureString)
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

    // Handle test notifications from Midtrans dashboard
    if (orderId.startsWith("payment_notif_test_")) {
      console.log("Test notification received - returning success without database update");
      return new Response(
        JSON.stringify({ success: true, message: "Test notification acknowledged" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let orderStatus = "menunggu_pembayaran";
    let paymentStatus = "pending";
    const isPaid = transactionStatus === "capture" || transactionStatus === "settlement";

    // Map Midtrans status to our status
    if (isPaid) {
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
        paid_at: isPaid ? new Date().toISOString() : null,
        payment_method: paymentType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw updateError;
    }

    console.log(`Order ${orderId} updated: ${orderStatus}, ${paymentStatus}`);

    // Send invoice email if payment successful
    if (isPaid) {
      try {
        const invoiceResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-invoice-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ orderId }),
        });
        
        if (invoiceResponse.ok) {
          console.log(`Invoice email sent for order ${orderId}`);
        } else {
          console.error("Failed to send invoice email:", await invoiceResponse.text());
        }
      } catch (emailError) {
        console.error("Error sending invoice email:", emailError);
      }
    }

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
