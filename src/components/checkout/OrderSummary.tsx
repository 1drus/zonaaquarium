import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Truck, CreditCard, Package, Gift } from 'lucide-react';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  variant_id: string | null;
  product_variants?: {
    variant_name: string;
    price_adjustment: number | null;
  } | null;
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

interface TierConfig {
  tier_name: string;
  discount_percentage: number;
  free_shipping_threshold: number | null;
}

interface OrderSummaryProps {
  cartItems: CartItem[];
  selectedAddress: Address | null;
  shippingMethod: string;
  shippingCost: number;
  originalShippingCost?: number;
  paymentMethod: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  subtotal: number;
  voucherDiscount?: number;
  voucherCode?: string;
  tierConfig?: TierConfig | null;
  getFlashSalePrice?: (productId: string) => { isFlashSale: boolean; flashPrice?: number; originalPrice?: number; stockLeft?: number };
}

export function OrderSummary({
  cartItems,
  selectedAddress,
  shippingMethod,
  shippingCost,
  originalShippingCost = 0,
  paymentMethod,
  notes,
  onNotesChange,
  subtotal,
  voucherDiscount = 0,
  voucherCode,
  tierConfig,
  getFlashSalePrice,
}: OrderSummaryProps) {
  const shippingDiscount = originalShippingCost - shippingCost;
  const total = subtotal - voucherDiscount + shippingCost;

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
            // Check for flash sale price
            const flashSaleInfo = getFlashSalePrice?.(item.product_id);
            const isFlashSale = flashSaleInfo?.isFlashSale && flashSaleInfo?.flashPrice;
            
            let finalPrice: number;
            let originalPrice: number | null = null;
            
            if (isFlashSale) {
              finalPrice = flashSaleInfo.flashPrice!;
              originalPrice = flashSaleInfo.originalPrice || item.products.price;
              // Add variant price adjustment if applicable
              if (item.product_variants?.price_adjustment) {
                finalPrice += item.product_variants.price_adjustment;
                originalPrice += item.product_variants.price_adjustment;
              }
            } else {
              let price = item.products.price;
              // Add variant price adjustment if applicable
              if (item.product_variants?.price_adjustment) {
                price += item.product_variants.price_adjustment;
              }
              const discount = item.products.discount_percentage || 0;
              finalPrice = price - (price * discount / 100);
              if (discount > 0) {
                originalPrice = price;
              }
            }
            
            const primaryImage = item.products.product_images.find(img => img.is_primary)?.image_url;

            return (
              <div key={item.id} className="flex gap-4">
                <div className="relative">
                  <img
                    src={primaryImage || '/placeholder.svg'}
                    alt={item.products.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  {isFlashSale && (
                    <span className="absolute -top-1 -right-1 text-[10px] bg-orange-500 text-white px-1 py-0.5 rounded font-semibold">
                      ⚡
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.products.name}</p>
                  {item.product_variants && (
                    <p className="text-xs text-muted-foreground">
                      Varian: {item.product_variants.variant_name}
                    </p>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {originalPrice && (
                      <span className="line-through mr-2">
                        Rp {originalPrice.toLocaleString('id-ID')}
                      </span>
                    )}
                    <span className={isFlashSale ? 'text-orange-500 font-medium' : ''}>
                      {item.quantity} x Rp {finalPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
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
          <div className="flex justify-between items-center">
            <p className="font-medium">{shippingMethod}</p>
            <div className="text-right">
              {shippingDiscount > 0 ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <Gift className="h-3 w-3 mr-1" />
                    GRATIS
                  </Badge>
                  <span className="text-sm text-muted-foreground line-through">
                    Rp {originalShippingCost.toLocaleString('id-ID')}
                  </span>
                </div>
              ) : (
                <p className="font-semibold">Rp {shippingCost.toLocaleString('id-ID')}</p>
              )}
            </div>
          </div>
          {shippingDiscount > 0 && tierConfig && (
            <p className="text-sm text-green-600 mt-2">
              Gratis ongkir member {tierConfig.tier_name}
            </p>
          )}
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
          {voucherDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Diskon Voucher {voucherCode && `(${voucherCode})`}</span>
              <span>-Rp {voucherDiscount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ongkos Kirim</span>
            {shippingDiscount > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-medium">GRATIS</span>
                <span className="text-muted-foreground line-through text-xs">
                  Rp {originalShippingCost.toLocaleString('id-ID')}
                </span>
              </div>
            ) : (
              <span>Rp {shippingCost.toLocaleString('id-ID')}</span>
            )}
          </div>
          {shippingDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Diskon Ongkir (Member {tierConfig?.tier_name})</span>
              <span>-Rp {shippingDiscount.toLocaleString('id-ID')}</span>
            </div>
          )}
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
