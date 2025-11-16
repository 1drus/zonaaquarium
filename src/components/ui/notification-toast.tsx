import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function OrderNotifications() {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to order updates for the current user
    const channel = supabase
      .channel('order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const order = payload.new as any;
          const oldOrder = payload.old as any;

          // Show toast for status changes
          if (order.status !== oldOrder.status) {
            let title = 'Status Pesanan Diperbarui';
            let description = '';

            switch (order.status) {
              case 'diproses':
                title = '✅ Pembayaran Diterima';
                description = `Pesanan ${order.order_number} sedang diproses`;
                break;
              case 'dikirim':
                title = '📦 Pesanan Dikirim';
                description = `Pesanan ${order.order_number} sedang dalam pengiriman`;
                break;
              case 'selesai':
                title = '🎉 Pesanan Selesai';
                description = `Pesanan ${order.order_number} telah selesai. Jangan lupa berikan review!`;
                break;
              case 'dibatalkan':
                title = '❌ Pesanan Dibatalkan';
                description = `Pesanan ${order.order_number} telah dibatalkan`;
                break;
            }

            toast({
              title,
              description,
              duration: 5000,
            });
          }

          // Show toast for payment status changes
          if (order.payment_status !== oldOrder.payment_status) {
            if (order.payment_status === 'paid') {
              toast({
                title: '✅ Pembayaran Berhasil',
                description: `Pembayaran untuk pesanan ${order.order_number} telah dikonfirmasi`,
                duration: 5000,
              });
            } else if (order.payment_status === 'failed') {
              toast({
                variant: 'destructive',
                title: '❌ Pembayaran Ditolak',
                description: `Pembayaran untuk pesanan ${order.order_number} ditolak. Silakan upload ulang bukti pembayaran.`,
                duration: 7000,
              });
            }
          }

          // Show toast for cancellation request responses
          if (oldOrder.cancellation_requested && !order.cancellation_requested) {
            if (order.status === 'dibatalkan') {
              toast({
                title: 'Pembatalan Disetujui',
                description: `Permintaan pembatalan pesanan ${order.order_number} telah disetujui`,
                duration: 5000,
              });
            } else {
              toast({
                variant: 'destructive',
                title: 'Pembatalan Ditolak',
                description: `Permintaan pembatalan pesanan ${order.order_number} ditolak`,
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  return null; // This component doesn't render anything
}
