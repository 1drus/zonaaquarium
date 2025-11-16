import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface CancellationRequestProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  onSuccess: () => void;
}

export function CancellationRequest({
  open,
  onClose,
  orderId,
  orderNumber,
  onSuccess,
}: CancellationRequestProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Alasan diperlukan',
        description: 'Silakan berikan alasan pembatalan pesanan',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          cancellation_requested: true,
          cancellation_request_reason: reason,
          cancellation_request_date: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Permintaan pembatalan terkirim',
        description: 'Admin akan memproses permintaan Anda segera',
      });

      onSuccess();
      onClose();
      setReason('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal mengirim permintaan',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Batalkan Pesanan
          </AlertDialogTitle>
          <AlertDialogDescription>
            Anda akan mengajukan permintaan pembatalan untuk pesanan <strong>{orderNumber}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Alasan Pembatalan *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan Anda membatalkan pesanan ini..."
              rows={4}
              disabled={loading}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Admin akan meninjau permintaan Anda dan memberikan keputusan dalam 1-2 hari kerja.
          </p>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Mengirim...' : 'Kirim Permintaan'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
