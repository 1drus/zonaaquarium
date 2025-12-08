import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export const ForgotPasswordForm = ({ onBack }: ForgotPasswordFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema)
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: redirectUrl
      });

      if (error) {
        throw error;
      }

      setSentEmail(data.email);
      setEmailSent(true);
      toast.success('Email reset password telah dikirim');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Gagal mengirim email reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Email Terkirim!</h3>
          <p className="text-sm text-muted-foreground">
            Kami telah mengirim link reset password ke:
          </p>
          <p className="font-medium text-foreground">{sentEmail}</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>Silakan cek inbox email Anda dan klik link untuk mereset password.</p>
          <p className="mt-2">Tidak menerima email? Cek folder spam atau coba kirim ulang.</p>
        </div>

        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              setEmailSent(false);
              setSentEmail('');
            }}
          >
            <Mail className="w-4 h-4 mr-2" />
            Kirim Ulang Email
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-lg font-semibold">Lupa Password?</h3>
        <p className="text-sm text-muted-foreground">
          Masukkan email Anda dan kami akan mengirimkan link untuk reset password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@contoh.com"
            {...register('email')}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mengirim...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Kirim Link Reset
            </>
          )}
        </Button>
      </form>

      <Button 
        variant="ghost" 
        className="w-full"
        onClick={onBack}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Kembali ke Login
      </Button>
    </div>
  );
};
