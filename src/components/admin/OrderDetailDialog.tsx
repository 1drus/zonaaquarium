import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, 
  User, 
  Phone, 
  MapPin, 
  Truck, 
  CreditCard, 
  Calendar,
  Clock,
  FileText,
  ShoppingBag
} from 'lucide-react';

interface OrderItem {
  id: string;
  product_name: string;
  product_image_url: string | null;
  variant_name: string | null;
  variant_sku: string | null;
  price: number;
  discount_percentage: number | null;
  quantity: number;
  subtotal: number;
}

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_method: string;
  shipping_cost: number;
  subtotal: number;
  discount_amount: number | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  order_items: OrderItem[];
}

interface OrderDetailDialogProps {
  order: OrderData | null;
  open: boolean;
  onClose: () => void;
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'menunggu_pembayaran':
      return { label: 'Menunggu Pembayaran', variant: 'secondary' as const };
    case 'diproses':
      return { label: 'Diproses', variant: 'default' as const };
    case 'dikirim':
      return { label: 'Dikirim', variant: 'default' as const };
    case 'selesai':
      return { label: 'Selesai', variant: 'default' as const };
    case 'dibatalkan':
      return { label: 'Dibatalkan', variant: 'destructive' as const };
    default:
      return { label: status, variant: 'secondary' as const };
  }
};

const getPaymentStatusConfig = (status: string) => {
  switch (status) {
    case 'paid':
      return { label: 'Lunas', className: 'bg-green-100 text-green-800 border-green-200' };
    case 'pending':
      return { label: 'Pending', className: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'failed':
      return { label: 'Gagal', className: 'bg-red-100 text-red-800 border-red-200' };
    case 'expired':
      return { label: 'Expired', className: 'bg-gray-100 text-gray-800 border-gray-200' };
    default:
      return { label: status, className: 'bg-gray-100 text-gray-800 border-gray-200' };
  }
};

export function OrderDetailDialog({ order, open, onClose }: OrderDetailDialogProps) {
  if (!order) return null;

  const statusConfig = getStatusConfig(order.status);
  const paymentConfig = getPaymentStatusConfig(order.payment_status);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Detail Pesanan
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                {order.order_number}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              <Badge className={paymentConfig.className}>{paymentConfig.label}</Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Waktu Pesanan */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Tanggal Pesanan</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(order.created_at)}
                  </p>
                </div>
              </div>
              {order.paid_at && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Waktu Pembayaran</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(order.paid_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Info Penerima */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Informasi Penerima
              </h4>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{order.recipient_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{order.recipient_phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{order.shipping_address}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Info Pengiriman & Pembayaran */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Pengiriman
                </h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="font-medium">{order.shipping_method}</p>
                  <p className="text-sm text-muted-foreground">
                    Rp {order.shipping_cost.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Pembayaran
                </h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="font-medium capitalize">
                    {order.payment_method?.replace(/-/g, ' ') || '-'}
                  </p>
                  <Badge className={`mt-1 ${paymentConfig.className}`}>
                    {paymentConfig.label}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Daftar Produk */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Produk ({order.order_items.length} item)
              </h4>
              <div className="space-y-3">
                {order.order_items.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    {item.product_image_url ? (
                      <img 
                        src={item.product_image_url} 
                        alt={item.product_name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-sm text-muted-foreground">
                          Varian: {item.variant_name}
                          {item.variant_sku && ` (${item.variant_sku})`}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-muted-foreground">
                          {item.quantity} x Rp {item.price.toLocaleString('id-ID')}
                        </span>
                        <span className="font-medium">
                          Rp {item.subtotal.toLocaleString('id-ID')}
                        </span>
                      </div>
                      {item.discount_percentage && item.discount_percentage > 0 && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Diskon {item.discount_percentage}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Ringkasan Pembayaran */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal Produk</span>
                <span>Rp {order.subtotal.toLocaleString('id-ID')}</span>
              </div>
              {order.discount_amount && order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Diskon</span>
                  <span>-Rp {order.discount_amount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ongkos Kirim</span>
                <span>Rp {order.shipping_cost.toLocaleString('id-ID')}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">
                  Rp {order.total_amount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Catatan */}
            {order.notes && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Catatan
                  </h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    {order.notes}
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
