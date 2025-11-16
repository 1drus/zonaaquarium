import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin, Truck, CreditCard, Package } from 'lucide-react';

interface CartItem {
  id: string;
  quantity: number;
  products: {
    name: string;
    price: number;
    discount_percentage: number | null;
    product_images: { image_url: string; is_primary: boolean }[];
  };
}

interface Address {
  recipient_name: string;
  phone: string;
  address_line: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  province: string;
  postal_code: string;
}

interface OrderSummaryProps {
  cartItems: CartItem[];
  selectedAddress: Address | null;
  shippingMethod: string;
  shippingCost: number;
  paymentMethod: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  subtotal: number;
}

export function OrderSummary({
  cartItems,
  selectedAddress,
  shippingMethod,
  shippingCost,
  paymentMethod,
  notes,
  onNotesChange,
  subtotal,
}: OrderSummaryProps) {
  const total = subtotal + shippingCost;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Konfirmasi Pesanan</h2>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produk yang Dipesan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cartItems.map((item) => {
            const price = item.products.price;
            const discount = item.products.discount_percentage || 0;
            const finalPrice = price - (price * discount / 100);
            const primaryImage = item.products.product_images.find(img => img.is_primary)?.image_url;

            return (
              <div key={item.id} className="flex gap-4">
                <img
                  src={primaryImage || '/placeholder.svg'}
                  alt={item.products.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-medium">{item.products.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} x Rp {finalPrice.toLocaleString('id-ID')}
                  </p>
                </div>
                <p className="font-semibold">
                  Rp {(finalPrice * item.quantity).toLocaleString('id-ID')}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Shipping Address */}
      {selectedAddress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Alamat Pengiriman
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{selectedAddress.recipient_name}</p>
            <p className="text-sm text-muted-foreground">{selectedAddress.phone}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {selectedAddress.address_line}, {selectedAddress.kelurahan}, {selectedAddress.kecamatan}
              <br />
              {selectedAddress.city}, {selectedAddress.province} {selectedAddress.postal_code}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Shipping Method */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Metode Pengiriman
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            <p className="font-medium">{shippingMethod}</p>
            <p className="font-semibold">Rp {shippingCost.toLocaleString('id-ID')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Metode Pembayaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium capitalize">{paymentMethod.replace('-', ' ')}</p>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-6">
          <Label htmlFor="notes">Catatan untuk Penjual (Opsional)</Label>
          <Textarea
            id="notes"
            placeholder="Contoh: Warna ikan, ukuran khusus, dll"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="mt-2"
          />
        </CardContent>
      </Card>

      {/* Price Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ringkasan Pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal Produk</span>
            <span>Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ongkos Kirim</span>
            <span>Rp {shippingCost.toLocaleString('id-ID')}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total Pembayaran</span>
            <span className="text-primary">Rp {total.toLocaleString('id-ID')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
