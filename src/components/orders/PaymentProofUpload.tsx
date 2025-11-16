import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface PaymentProofUploadProps {
  orderId: string;
  currentProofUrl: string | null;
  paymentDeadline: string | null;
  onUploadSuccess: () => void;
}

export function PaymentProofUpload({
  orderId,
  currentProofUrl,
  paymentDeadline,
  onUploadSuccess,
}: PaymentProofUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'File tidak valid',
          description: 'Harap upload file gambar (JPG, PNG, dll)',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File terlalu besar',
          description: 'Ukuran maksimal file adalah 5MB',
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}-${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // Update order with payment proof URL
      const { error: updateError } = await supabase
        .from('orders')
        .update({ payment_proof_url: publicUrl })
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Bukti pembayaran berhasil diupload',
        description: 'Pembayaran Anda sedang diverifikasi',
      });

      setFile(null);
      onUploadSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal upload bukti pembayaran',
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const isDeadlinePassed = paymentDeadline && new Date(paymentDeadline) < new Date();
  const deadlineDate = paymentDeadline ? new Date(paymentDeadline) : null;

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Upload className="h-5 w-5" />
          Upload Bukti Pembayaran
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentDeadline && (
          <Alert variant={isDeadlinePassed ? 'destructive' : 'default'}>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {isDeadlinePassed ? (
                <span>Batas waktu pembayaran telah lewat</span>
              ) : (
                <span>
                  Batas waktu pembayaran:{' '}
                  <strong>
                    {deadlineDate?.toLocaleString('id-ID', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })}
                  </strong>
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {currentProofUrl ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>Bukti pembayaran telah diupload dan sedang diverifikasi.</p>
                <a
                  href={currentProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Lihat bukti pembayaran
                </a>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Silakan upload bukti pembayaran Anda. Format yang didukung: JPG, PNG (Maks. 5MB)
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="payment-proof">Pilih File</Label>
              <Input
                id="payment-proof"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading || isDeadlinePassed}
              />
            </div>

            {file && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  File dipilih: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || isDeadlinePassed}
                  className="w-full"
                >
                  {uploading ? 'Mengupload...' : 'Upload Bukti Pembayaran'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
