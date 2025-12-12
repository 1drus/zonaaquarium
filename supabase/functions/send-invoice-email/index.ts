import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  product_name: string;
  variant_name: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  discount_percentage: number | null;
}

interface OrderData {
  id: string;
  order_number: string;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_method: string;
  shipping_cost: number;
  subtotal: number;
  discount_amount: number | null;
  total_amount: number;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  user_id: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const generateInvoiceHtml = (order: OrderData, items: OrderItem[], customerEmail: string): string => {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left;">
        <strong>${item.product_name}</strong>
        ${item.variant_name ? `<br><span style="color: #6b7280; font-size: 12px;">${item.variant_name}</span>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        ${item.discount_percentage ? `<span style="text-decoration: line-through; color: #9ca3af; font-size: 12px;">${formatCurrency(item.price)}</span><br>` : ''}
        ${formatCurrency(item.discount_percentage ? item.price * (1 - item.discount_percentage / 100) : item.price)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
        ${formatCurrency(item.subtotal)}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${order.order_number}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">ZONA AQUARIUM</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Toko Ikan Hias & Perlengkapan Aquarium</p>
    </div>

    <!-- Invoice Badge -->
    <div style="background-color: #10b981; padding: 15px; text-align: center;">
      <span style="color: white; font-weight: 600; font-size: 16px;">✓ PEMBAYARAN BERHASIL</span>
    </div>

    <!-- Main Content -->
    <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      
      <!-- Invoice Info -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px;">
        <div>
          <h2 style="margin: 0 0 5px 0; color: #1f2937; font-size: 20px;">INVOICE</h2>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">${order.order_number}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Tanggal Order</p>
          <p style="margin: 0; color: #1f2937; font-weight: 600;">${formatDate(order.created_at)}</p>
          ${order.paid_at ? `
          <p style="margin: 10px 0 5px 0; color: #6b7280; font-size: 12px;">Tanggal Bayar</p>
          <p style="margin: 0; color: #10b981; font-weight: 600;">${formatDate(order.paid_at)}</p>
          ` : ''}
        </div>
      </div>

      <!-- Customer Info -->
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Informasi Pengiriman</h3>
        <p style="margin: 0 0 5px 0; color: #1f2937; font-weight: 600;">${order.recipient_name}</p>
        <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">${order.recipient_phone}</p>
        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">${order.shipping_address}</p>
        <p style="margin: 10px 0 0 0; color: #0ea5e9; font-size: 13px;">
          <strong>Kurir:</strong> ${order.shipping_method}
        </p>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; color: #374151; font-size: 13px; text-transform: uppercase;">Produk</th>
            <th style="padding: 12px; text-align: center; color: #374151; font-size: 13px; text-transform: uppercase;">Qty</th>
            <th style="padding: 12px; text-align: right; color: #374151; font-size: 13px; text-transform: uppercase;">Harga</th>
            <th style="padding: 12px; text-align: right; color: #374151; font-size: 13px; text-transform: uppercase;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="border-top: 2px solid #e5e7eb; padding-top: 20px;">
        <table style="width: 100%; max-width: 300px; margin-left: auto;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Subtotal</td>
            <td style="padding: 8px 0; text-align: right; color: #1f2937;">${formatCurrency(order.subtotal)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Ongkos Kirim</td>
            <td style="padding: 8px 0; text-align: right; color: #1f2937;">${order.shipping_cost === 0 ? '<span style="color: #10b981;">GRATIS</span>' : formatCurrency(order.shipping_cost)}</td>
          </tr>
          ${order.discount_amount && order.discount_amount > 0 ? `
          <tr>
            <td style="padding: 8px 0; color: #10b981;">Diskon</td>
            <td style="padding: 8px 0; text-align: right; color: #10b981;">-${formatCurrency(order.discount_amount)}</td>
          </tr>
          ` : ''}
          <tr style="border-top: 2px solid #1f2937;">
            <td style="padding: 15px 0; color: #1f2937; font-weight: 700; font-size: 16px;">TOTAL</td>
            <td style="padding: 15px 0; text-align: right; color: #0ea5e9; font-weight: 700; font-size: 20px;">${formatCurrency(order.total_amount)}</td>
          </tr>
        </table>
      </div>

      <!-- Payment Method -->
      <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
        <p style="margin: 0; color: #065f46; font-size: 14px;">
          <strong>Metode Pembayaran:</strong> ${order.payment_method || 'Transfer Bank'}
        </p>
      </div>

      <!-- Footer Note -->
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
          Terima kasih telah berbelanja di Zona Aquarium!
        </p>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Pesanan Anda sedang diproses dan akan segera dikirim.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0 0 5px 0;">© ${new Date().getFullYear()} Zona Aquarium. All rights reserved.</p>
      <p style="margin: 0;">Email ini dikirim secara otomatis, mohon tidak membalas email ini.</p>
    </div>
  </div>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error("Order ID is required");
    }

    console.log("Sending invoice email for order:", orderId);

    // Fetch order data
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("product_name, variant_name, quantity, price, subtotal, discount_percentage")
      .eq("order_id", orderId);

    if (itemsError) {
      throw new Error("Failed to fetch order items");
    }

    // Get user email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(order.user_id);

    if (userError || !userData.user?.email) {
      throw new Error("User email not found");
    }

    const customerEmail = userData.user.email;
    const invoiceHtml = generateInvoiceHtml(order as OrderData, items as OrderItem[], customerEmail);

    // Send email via Brevo
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: {
          name: "Zona Aquarium",
          email: "noreply@zonaaquarium.store",
        },
        to: [
          {
            email: customerEmail,
            name: order.recipient_name,
          },
        ],
        subject: `Invoice Pembayaran - ${order.order_number}`,
        htmlContent: invoiceHtml,
      }),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.text();
      console.error("Brevo API error:", errorData);
      throw new Error("Failed to send email via Brevo");
    }

    const brevoResult = await brevoResponse.json();
    console.log("Invoice email sent successfully:", brevoResult);

    return new Response(
      JSON.stringify({ success: true, messageId: brevoResult.messageId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invoice-email:", error);
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
