import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyRequest = await req.json();
    
    console.log("Verifying code for:", email);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
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
    
    // Create user account with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: verificationData.email,
      password: verificationData.password_hash,
      email_confirm: true,
      user_metadata: {
        full_name: verificationData.full_name,
        phone: verificationData.phone
      }
    });
    
    if (authError) {
      console.error("Auth error:", authError);
      // Check if user already exists
      if (authError.message.includes('already registered')) {
        return new Response(
          JSON.stringify({ error: "Email sudah terdaftar. Silakan gunakan email lain atau login." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      throw authError;
    }
    
    console.log("User created successfully:", authData.user?.id);
    
    // Mark code as verified
    await supabase
      .from('email_verification_codes')
      .update({ verified: true })
      .eq('id', verificationData.id);
    
    // Create session for auto-login
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: verificationData.email,
      password: verificationData.password_hash
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
