import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart } from 'lucide-react';

interface CartSummaryProps {
  subtotal: number;
  discount?: number;
  shippingCost?: number;
  onCheckout: () => void;
}

export function CartSummary({
  subtotal,
  discount = 0,
  shippingCost = 0,
  onCheckout,
}: CartSummaryProps) {
  const [voucherCode, setVoucherCode] = useState('');
  const total = subtotal - discount + shippingCost;

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="text-lg">Ringkasan Belanja</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voucher Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Kode Voucher</label>
          <div className="flex gap-2">
            <Input
              placeholder="Masukkan kode"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
            />
            <Button variant="outline">Pakai</Button>
          </div>
        </div>

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Diskon</span>
              <span>-Rp {discount.toLocaleString('id-ID')}</span>
            </div>
          )}

          {shippingCost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ongkos Kirim</span>
              <span>Rp {shippingCost.toLocaleString('id-ID')}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Total</span>
          <span className="text-primary">Rp {total.toLocaleString('id-ID')}</span>
        </div>

        {/* Checkout Button */}
        <Button className="w-full" size="lg" onClick={onCheckout}>
          <ShoppingCart className="mr-2 h-5 w-5" />
          Lanjut ke Checkout
        </Button>

        {/* Info Text */}
        <p className="text-xs text-muted-foreground text-center">
          Ongkos kirim akan dihitung saat checkout
        </p>
      </CardContent>
    </Card>
  );
}
