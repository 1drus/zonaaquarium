import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { registerSchema, RegisterFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [email, setEmail] = useState('');
  const [registrationData, setRegistrationData] = useState<RegisterFormData | null>(null);
  const [otp, setOtp] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Step 1: Submit registration and send OTP
  const onSubmitRegistration = async (data: RegisterFormData) => {
    setLoading(true);
    
    try {
      const response = await supabase.functions.invoke('send-verification-code', {
        body: {
          email: data.email,
          fullName: data.fullName,
          phone: data.phone,
          password: data.password
        }
      });
      
      if (response.error) throw response.error;
      
      setRegistrationData(data);
      setEmail(data.email);
      setStep('verify');
      setResendCountdown(60);
      
      toast({
        title: "Kode verifikasi dikirim!",
        description: "Silakan cek email Anda untuk kode verifikasi."
      });
    } catch (error: any) {
      console.error('Send verification error:', error);
      toast({
        variant: "destructive",
        title: "Gagal mengirim kode",
        description: error.message || "Terjadi kesalahan. Silakan coba lagi."
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP code
  const onSubmitVerification = async () => {
    if (otp.length !== 6) {
      toast({
        variant: "destructive",
        title: "Kode tidak lengkap",
        description: "Masukkan 6 digit kode verifikasi"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await supabase.functions.invoke('verify-email-code', {
        body: { 
          email, 
          code: otp 
        }
      });
      
      if (response.error) throw response.error;
      
      const result = response.data;
      
      // Set session if provided
      if (result.session) {
        await supabase.auth.setSession(result.session);
        
        toast({
          title: "Pendaftaran berhasil!",
          description: "Akun Anda telah aktif dan Anda sudah login."
        });
        
        navigate('/');
      } else if (result.requiresLogin) {
        toast({
          title: "Verifikasi berhasil!",
          description: "Silakan login dengan akun Anda."
        });
        
        // Switch to login tab
        window.location.href = '/auth?tab=login';
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        variant: "destructive",
        title: "Verifikasi gagal",
        description: error.message || "Kode tidak valid atau sudah kadaluarsa"
      });
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCountdown > 0 || !registrationData) return;
    await onSubmitRegistration(registrationData);
  };

  // Back to registration form
  const handleBackToRegister = () => {
    setStep('register');
    setOtp('');
    setResendCountdown(0);
  };

  if (step === 'verify') {
    return (
      <div className="space-y-6 mt-4">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Verifikasi Email</h3>
          <p className="text-sm text-muted-foreground">
            Kami telah mengirim kode verifikasi 6 digit ke
          </p>
          <p className="text-sm font-medium text-foreground">{email}</p>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <InputOTP
              value={otp}
              onChange={setOtp}
              maxLength={6}
              disabled={loading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          
          <Button 
            onClick={onSubmitVerification} 
            className="w-full" 
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memverifikasi...
              </>
            ) : (
              'Verifikasi'
            )}
          </Button>
          
          <div className="space-y-3 pt-2">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Tidak menerima kode?
              </p>
              <Button
                variant="link"
                onClick={handleResendOTP}
                disabled={resendCountdown > 0 || loading}
                className="text-sm h-auto p-0"
              >
                {resendCountdown > 0 
                  ? `Kirim ulang dalam ${resendCountdown}s`
                  : 'Kirim ulang kode'
                }
              </Button>
            </div>
            
            <Button
              variant="ghost"
              onClick={handleBackToRegister}
              disabled={loading}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ubah email
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmitRegistration)} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Nama Lengkap</Label>
        <Input
          id="fullName"
          placeholder="John Doe"
          {...register('fullName')}
          disabled={loading}
        />
        {errors.fullName && (
          <p className="text-sm text-destructive">{errors.fullName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-email">Email</Label>
        <Input
          id="reg-email"
          type="email"
          placeholder="nama@email.com"
          {...register('email')}
          disabled={loading}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Nomor Telepon</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="08123456789"
          {...register('phone')}
          disabled={loading}
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password">Password</Label>
        <Input
          id="reg-password"
          type="password"
          placeholder="Minimal 8 karakter"
          {...register('password')}
          disabled={loading}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Ketik ulang password"
          {...register('confirmPassword')}
          disabled={loading}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Mendaftar...
          </>
        ) : (
          'Daftar Sekarang'
        )}
      </Button>
    </form>
  );
}
