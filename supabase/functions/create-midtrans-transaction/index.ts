import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY");
const MIDTRANS_BASE_URL = "https://app.midtrans.com/snap/v1/transactions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  customerDetails: {
    first_name: string;
    email: string;
    phone: string;
  };
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, orderNumber, amount, customerDetails, items }: TransactionRequest = await req.json();

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
