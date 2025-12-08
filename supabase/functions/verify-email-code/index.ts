import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { decode as decodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VerifyRequestSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  code: z.string().length(6, { message: "Code must be 6 digits" }).regex(/^[0-9]+$/, { message: "Code must be numeric" })
});

// Decrypt password using AES-GCM with service role key derived encryption
async function decryptPassword(encryptedData: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Derive decryption key from service role key (use first 32 bytes for AES-256)
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(supabaseServiceKey.slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  // Decode base64 and extract IV + encrypted data
  const combined = decodeBase64(encryptedData);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  // Decrypt password
  const decryptedData = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    ciphertext
  );
  
  return decoder.decode(decryptedData);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawData = await req.json();
    
    // Validate and sanitize input
    const parseResult = VerifyRequestSchema.safeParse(rawData);
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
    
    const { email, code } = parseResult.data;
    
    console.log("Verifying code for:", email);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Rate limiting: Check verification attempts (5 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentAttempts } = await supabase
      .from('email_verification_codes')
      .select('created_at')
      .eq('email', email)
      .gte('created_at', oneHourAgo);
    
    if (recentAttempts && recentAttempts.length >= 5) {
      console.log("Rate limit exceeded for verification attempts:", email);
      return new Response(
        JSON.stringify({ 
          error: "Terlalu banyak percobaan verifikasi. Silakan coba lagi dalam 1 jam.",
          retryAfter: 3600
        }),
        { 
          status: 429, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }
    
    // Find verification code
    const { data: verificationData, error: fetchError } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('verified', false)
      .maybeSingle();
    
    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw fetchError;
    }
    
    if (!verificationData) {
      console.log("Invalid or already used code");
      return new Response(
        JSON.stringify({ error: "Kode verifikasi tidak valid atau sudah digunakan" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Check expiry
    if (new Date(verificationData.expires_at) < new Date()) {
      console.log("Code expired");
      return new Response(
        JSON.stringify({ error: "Kode verifikasi sudah kadaluarsa. Silakan minta kode baru." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Decrypt the stored password
    let plainPassword: string;
    try {
      plainPassword = await decryptPassword(verificationData.password_hash);
    } catch (decryptError) {
      console.error("Failed to decrypt password - may be legacy plain text:", decryptError);
      // Fallback for any existing plain text passwords (legacy support)
      plainPassword = verificationData.password_hash;
    }
    
    // Create user account with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: verificationData.email,
      password: plainPassword,
      email_confirm: true,
      user_metadata: {
        full_name: verificationData.full_name,
        phone: verificationData.phone
      }
    });
    
    if (authError) {
      console.error("Auth error:", authError);
      // Check if user already exists - handle both message and error code
      if (authError.message?.includes('already registered') || 
          (authError as any).code === 'email_exists' ||
          authError.message?.includes('email_exists')) {
        // Mark the verification code as used to prevent retry abuse
        await supabase
          .from('email_verification_codes')
          .update({ verified: true })
          .eq('id', verificationData.id);
          
        return new Response(
          JSON.stringify({ error: "Email sudah terdaftar. Silakan login dengan email tersebut." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      return new Response(
        JSON.stringify({ error: authError.message || "Gagal membuat akun" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log("User created successfully:", authData.user?.id);
    
    // Mark code as verified and clear sensitive data
    await supabase
      .from('email_verification_codes')
      .update({ verified: true, password_hash: '[REDACTED]' })
      .eq('id', verificationData.id);
    
    // Create session for auto-login
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: verificationData.email,
      password: plainPassword
    });
    
    if (signInError) {
      console.error("Sign in error:", signInError);
      // User created but can't auto-login, still return success
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email berhasil diverifikasi! Silakan login.",
          requiresLogin: true
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("User signed in successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email berhasil diverifikasi!",
        session: sessionData.session
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-email-code:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Verifikasi gagal" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
