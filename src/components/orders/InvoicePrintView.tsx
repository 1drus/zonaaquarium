import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, Truck } from 'lucide-react';

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

interface Order {
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

interface InvoicePrintViewProps {
  order: Order;
  onClose: () => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getPaymentStatusConfig = (status: string) => {
  switch (status) {
    case 'paid':
      return { label: 'LUNAS', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' };
    case 'pending':
      return { label: 'BELUM BAYAR', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' };
    case 'failed':
    case 'expired':
      return { label: 'GAGAL', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' };
    default:
      return { label: status.toUpperCase(), icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50' };
  }
};

export function InvoicePrintView({ order, onClose }: InvoicePrintViewProps) {
  const paymentConfig = getPaymentStatusConfig(order.payment_status);
  const PaymentIcon = paymentConfig.icon;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-auto print:bg-white print:static">
      {/* Print Controls - Hidden when printing */}
      <div className="sticky top-0 z-10 bg-background border-b p-4 flex justify-between items-center print:hidden">
        <h2 className="text-lg font-semibold">Preview Invoice</h2>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Cetak Invoice
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-[800px] mx-auto bg-white p-8 my-4 shadow-lg print:shadow-none print:my-0 print:p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary tracking-tight">ZONA AQUARIUM</h1>
            <p className="text-sm text-gray-500 mt-1">Premium Aquatic Store</p>
            <div className="mt-3 text-sm text-gray-600 space-y-0.5">
              <p>Jl. Parit H. Husin 2, Pontianak</p>
              <p>Kalimantan Barat, Indonesia</p>
              <p>Email: info@zonaaquarium.com</p>
              <p>Telp: +62 812-3456-7890</p>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block border-2 border-primary px-4 py-2 rounded-lg">
              <h2 className="text-2xl font-bold text-primary">INVOICE</h2>
            </div>
            <div className="mt-4 text-sm space-y-1">
              <p className="text-gray-600">
                <span className="font-medium">No. Invoice:</span>
              </p>
              <p className="font-mono font-bold text-lg">{order.order_number}</p>
              <p className="text-gray-600 mt-2">
                <span className="font-medium">Tanggal:</span>
              </p>
              <p>{formatDate(order.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Payment Status Banner */}
        <div className={`${paymentConfig.bg} rounded-lg p-4 mb-6 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <PaymentIcon className={`h-6 w-6 ${paymentConfig.color}`} />
            <div>
              <p className={`font-bold text-lg ${paymentConfig.color}`}>{paymentConfig.label}</p>
              {order.paid_at && (
                <p className="text-sm text-gray-600">
                  Dibayar pada: {formatDateTime(order.paid_at)}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Metode Pembayaran</p>
            <p className="font-medium capitalize">{order.payment_method?.replace('-', ' ') || '-'}</p>
          </div>
        </div>

        {/* Customer & Shipping Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Ditagihkan Kepada
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-bold text-lg">{order.recipient_name}</p>
              <p className="text-gray-600">{order.recipient_phone}</p>
              <p className="text-gray-600 mt-2 text-sm leading-relaxed">
                {order.shipping_address}
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Informasi Pengiriman
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4 text-gray-500" />
                <p className="font-medium">{order.shipping_method}</p>
              </div>
              <p className="text-sm text-gray-600">
                Biaya: Rp {order.shipping_cost.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Detail Pesanan
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Produk</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm w-20">Qty</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm w-32">Harga</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm w-36">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.order_items.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="py-4 px-4">
                      <p className="font-medium">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-sm text-gray-500">
                          Varian: {item.variant_name}
                          {item.variant_sku && (
                            <span className="text-gray-400 ml-1">({item.variant_sku})</span>
                          )}
                        </p>
                      )}
                      {item.discount_percentage && item.discount_percentage > 0 && (
                        <Badge variant="secondary" className="mt-1 text-xs bg-red-100 text-red-700">
                          Diskon {item.discount_percentage}%
                        </Badge>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">{item.quantity}</td>
                    <td className="py-4 px-4 text-right font-mono">
                      Rp {item.price.toLocaleString('id-ID')}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-medium">
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="flex justify-end">
          <div className="w-80">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal Produk</span>
                <span className="font-mono">Rp {order.subtotal.toLocaleString('id-ID')}</span>
              </div>
              {order.discount_amount && order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Diskon</span>
                  <span className="font-mono">-Rp {order.discount_amount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ongkos Kirim</span>
                <span className="font-mono">Rp {order.shipping_cost.toLocaleString('id-ID')}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center pt-1">
                <span className="text-lg font-bold">TOTAL</span>
                <span className="text-2xl font-bold text-primary font-mono">
                  Rp {order.total_amount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Catatan
            </h3>
            <p className="text-sm text-gray-600 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              {order.notes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Syarat & Ketentuan</h4>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Barang yang sudah dibeli tidak dapat dikembalikan</li>
                <li>• Garansi berlaku untuk produk tertentu</li>
                <li>• Hubungi kami jika ada pertanyaan</li>
              </ul>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-4">Terima kasih atas pesanan Anda!</p>
              <div className="inline-block border-t-2 border-gray-300 pt-2 px-8">
                <p className="text-sm font-medium">Zona Aquarium</p>
                <p className="text-xs text-gray-500">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>

        {/* Watermark for unpaid */}
        {order.payment_status !== 'paid' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none print:hidden">
            <p className="text-8xl font-bold text-gray-200/50 rotate-[-30deg] select-none">
              BELUM LUNAS
            </p>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}