import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email: string;
  fullName: string;
  phone: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, phone, password }: VerificationRequest = await req.json();
    
    console.log("Sending verification code to:", email);
    
    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Calculate expiry (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Delete existing verification codes for this email
    await supabase
      .from('email_verification_codes')
      .delete()
      .eq('email', email);
    
    // Save verification code to database
    const { error: dbError } = await supabase
      .from('email_verification_codes')
      .insert({
        email,
        code,
        full_name: fullName,
        phone,
        password_hash: password,
        expires_at: expiresAt
      });
    
    if (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }
    
    // Send email with OTP code
    const emailResponse = await resend.emails.send({
      from: "Zona Aquarium <onboarding@resend.dev>",
      to: [email],
      subject: "Kode Verifikasi Pendaftaran - Zona Aquarium",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🐠 Zona Aquarium</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h2 style="color: #1e293b; margin-top: 0;">Kode Verifikasi Anda</h2>
            <p style="color: #475569; line-height: 1.6;">Halo <strong>${fullName}</strong>,</p>
            <p style="color: #475569; line-height: 1.6;">Terima kasih telah mendaftar di Zona Aquarium. Gunakan kode verifikasi berikut untuk menyelesaikan pendaftaran:</p>
            
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; text-align: center; margin: 25px 0; border-radius: 12px; border: 2px solid #0ea5e9;">
              <div style="color: #0ea5e9; font-size: 42px; font-weight: bold; letter-spacing: 12px; font-family: 'Courier New', monospace;">${code}</div>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                ⏱️ Kode ini akan <strong>kadaluarsa dalam 10 menit</strong>
              </p>
            </div>
            
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-top: 25px;">
              Jika Anda tidak mendaftar di Zona Aquarium, abaikan email ini.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
            <p style="margin: 5px 0;">Email ini dikirim otomatis, mohon tidak membalas.</p>
            <p style="margin: 5px 0;">© 2024 Zona Aquarium - Platform Jual Beli Ikan Hias Terpercaya</p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Kode verifikasi telah dikirim ke email Anda" 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error: any) {
    console.error("Error in send-verification-code:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Gagal mengirim kode verifikasi" }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
};

serve(handler);
