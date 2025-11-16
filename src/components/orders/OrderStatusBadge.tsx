import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  status: string;
  isPaymentStatus?: boolean;
}

const orderStatusConfig = {
  menunggu_pembayaran: {
    label: 'Menunggu Pembayaran',
    variant: 'secondary' as const,
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  },
  diproses: {
    label: 'Diproses',
    variant: 'secondary' as const,
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  dikirim: {
    label: 'Dikirim',
    variant: 'secondary' as const,
    className: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  },
  selesai: {
    label: 'Selesai',
    variant: 'secondary' as const,
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  dibatalkan: {
    label: 'Dibatalkan',
    variant: 'destructive' as const,
    className: '',
  },
};

const paymentStatusConfig = {
  pending: {
    label: 'Belum Bayar',
    variant: 'secondary' as const,
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  },
  paid: {
    label: 'Sudah Bayar',
    variant: 'secondary' as const,
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  failed: {
    label: 'Gagal',
    variant: 'destructive' as const,
    className: '',
  },
  expired: {
    label: 'Kadaluarsa',
    variant: 'secondary' as const,
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  },
};

export function OrderStatusBadge({ status, isPaymentStatus = false }: OrderStatusBadgeProps) {
  const config = isPaymentStatus 
    ? paymentStatusConfig[status as keyof typeof paymentStatusConfig]
    : orderStatusConfig[status as keyof typeof orderStatusConfig];

  if (!config) return null;

  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className)}
    >
      {config.label}
    </Badge>
  );
}
