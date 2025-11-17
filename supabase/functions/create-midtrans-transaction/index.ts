import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY");
const MIDTRANS_BASE_URL = "https://app.midtrans.com/snap/v1/transactions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TransactionRequestSchema = z.object({
  orderId: z.string().uuid({ message: "Invalid order ID" }),
  orderNumber: z.string().min(1).max(100),
  amount: z.number().positive({ message: "Amount must be positive" }).max(999999999),
  customerDetails: z.object({
    first_name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().min(10).max(15)
  }),
  items: z.array(z.object({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(255),
    price: z.number().positive().max(999999999),
    quantity: z.number().int().positive().max(9999)
  })).min(1, { message: "At least one item is required" })
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawData = await req.json();
    
    // Validate and sanitize input
    const parseResult = TransactionRequestSchema.safeParse(rawData);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid transaction data",
          details: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ")
        }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }
    
    const { orderId, orderNumber, amount, customerDetails, items } = parseResult.data;

    // Create Midtrans transaction
    const authString = btoa(`${MIDTRANS_SERVER_KEY}:`);
    
    const transactionData = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Math.round(amount),
      },
      customer_details: customerDetails,
      item_details: items.map(item => ({
        id: item.id,
        price: Math.round(item.price),
        quantity: item.quantity,
        name: item.name,
      })),
      credit_card: {
        secure: true,
      },
      callbacks: {
        finish: `${req.headers.get('origin')}/order-success/${orderId}`,
      },
    };

    const response = await fetch(MIDTRANS_BASE_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`,
      },
      body: JSON.stringify(transactionData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Midtrans API error:", data);
      throw new Error(data.error_messages?.join(", ") || "Failed to create transaction");
    }

    return new Response(
      JSON.stringify({ 
        token: data.token,
        redirectUrl: data.redirect_url 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-midtrans-transaction:", error);
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
