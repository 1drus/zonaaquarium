import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const brevoApiKey = Deno.env.get("BREVO_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VerificationRequestSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  fullName: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).max(100),
  phone: z.string().trim().regex(/^[0-9+\-\s()]*$/, { message: "Invalid phone number" }).min(10).max(15),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(100)
});

// Encrypt password using AES-GCM with service role key derived encryption
async function encryptPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Derive encryption key from service role key (use first 32 bytes for AES-256)
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(supabaseServiceKey.slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt password
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    encoder.encode(password)
  );
  
  // Combine IV + encrypted data and encode as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(encryptedData).length);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  // Convert to ArrayBuffer for encodeBase64
  return encodeBase64(combined.buffer);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawData = await req.json();
    
    // Validate and sanitize input
    const parseResult = VerificationRequestSchema.safeParse(rawData);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid input data",
          details: parseResult.error.errors.map(e => e.message).join(", ")
        }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }
    
    const { email, fullName, phone, password } = parseResult.data;
    
    console.log("Sending verification code to:", email);
    
    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Calculate expiry (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Rate limiting: Check if code was requested recently (3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentCodes } = await supabase
      .from('email_verification_codes')
      .select('created_at')
      .eq('email', email)
      .gte('created_at', oneHourAgo);
    
    if (recentCodes && recentCodes.length >= 3) {
      console.log("Rate limit exceeded for email:", email);
      return new Response(
        JSON.stringify({ 
          error: "Terlalu banyak permintaan. Silakan coba lagi dalam 1 jam.",
          retryAfter: 3600
        }),
        { 
          status: 429, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }
    
    // Delete existing verification codes for this email
    await supabase
      .from('email_verification_codes')
      .delete()
      .eq('email', email);
    
    // Encrypt password before storing
    const encryptedPassword = await encryptPassword(password);
    
    // Save verification code to database with encrypted password
    const { error: dbError } = await supabase
      .from('email_verification_codes')
      .insert({
        email,
        code,
        full_name: fullName,
        phone,
        password_hash: encryptedPassword,
        expires_at: expiresAt
      });
    
    if (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }
    
    // Send email via Brevo
    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey!,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Zona Aquarium",
          email: "noreply@zonaaquarium.store"
        },
        to: [
          {
            email: email,
            name: fullName
          }
        ],
        subject: "Kode Verifikasi Pendaftaran - Zona Aquarium",
        htmlContent: `
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
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Brevo API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully via Brevo:", emailResult);

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
