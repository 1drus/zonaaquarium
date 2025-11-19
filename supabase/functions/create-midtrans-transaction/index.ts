import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to get Midtrans URL based on environment setting from database
async function getMidtransConfig() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'midtrans_environment')
      .single();

    if (error) {
      console.error('Error fetching config:', error);
      // Default to sandbox if config not found
      return "https://app.sandbox.midtrans.com/snap/v1/transactions";
    }

    const isProduction = data?.config_value === 'production';
    const url = isProduction 
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";
    
    console.log(`Using Midtrans ${isProduction ? 'PRODUCTION' : 'SANDBOX'} environment`);
    return url;
  } catch (err) {
    console.error('Error in getMidtransConfig:', err);
    return "https://app.sandbox.midtrans.com/snap/v1/transactions";
  }
}

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
    
    // Extract user ID from authorization header
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    
    if (authHeader?.startsWith("Bearer ")) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
      
      // Rate limiting: Check recent transactions (10 per hour per user)
      if (userId) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('created_at')
          .eq('user_id', userId)
          .gte('created_at', oneHourAgo);
        
        if (recentOrders && recentOrders.length >= 10) {
          console.log("Rate limit exceeded for user:", userId);
          return new Response(
            JSON.stringify({ 
              error: "Terlalu banyak transaksi. Silakan coba lagi dalam 1 jam.",
              retryAfter: 3600
            }),
            { 
              status: 429, 
              headers: { "Content-Type": "application/json", ...corsHeaders } 
            }
          );
        }
      }
    }
    
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

    // Format phone number for Indonesia (add +62 if needed)
    let formattedPhone = customerDetails.phone.replace(/\D/g, ''); // Remove non-digits
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('62')) {
      formattedPhone = '62' + formattedPhone;
    }
    
    console.log('Customer phone formatted:', customerDetails.phone, '->', formattedPhone);

    // Get Midtrans URL based on environment config
    const MIDTRANS_BASE_URL = await getMidtransConfig();

    // Create Midtrans transaction
    const authString = btoa(`${MIDTRANS_SERVER_KEY}:`);
    
    // Map items and calculate gross_amount from item_details to ensure they match
    const itemDetails = items.map(item => ({
      id: item.id,
      price: Math.round(item.price),
      quantity: item.quantity,
      name: item.name,
    }));
    
    // Calculate gross_amount from sum of (price * quantity) for all items
    const calculatedGrossAmount = itemDetails.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );
    
    console.log(`Calculated gross_amount: ${calculatedGrossAmount}, Passed amount: ${Math.round(amount)}`);
    
    const transactionData = {
      transaction_details: {
        order_id: orderId,
        gross_amount: calculatedGrossAmount,
      },
      customer_details: {
        first_name: customerDetails.first_name,
        email: customerDetails.email,
        phone: formattedPhone,
      },
      item_details: itemDetails,
      credit_card: {
        secure: true,
      },
      enabled_payments: [
        "credit_card",
        "bca_va",
        "bni_va", 
        "bri_va",
        "echannel", // Mandiri Bill
        "permata_va",
        "other_va",
        "gopay",
        "shopeepay",
        "qris"
      ],
      callbacks: {
        finish: `${req.headers.get('origin')}/order-success/${orderId}`,
      },
    };

    console.log('Sending transaction data to Midtrans:', JSON.stringify({
      ...transactionData,
      customer_details: {
        ...transactionData.customer_details,
        phone: formattedPhone
      }
    }));

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
      console.error("Midtrans API error:", JSON.stringify(data));
      throw new Error(data.error_messages?.join(", ") || "Failed to create transaction");
    }
    
    console.log('Midtrans response:', JSON.stringify(data));

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
