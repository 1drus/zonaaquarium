import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, X } from 'lucide-react';
import { useVoucher } from '@/hooks/useVoucher';
import { Badge } from '@/components/ui/badge';

interface CartSummaryProps {
  subtotal: number;
  shippingCost?: number;
}

export function CartSummary({
  subtotal,
  shippingCost = 0,
}: CartSummaryProps) {
  const navigate = useNavigate();
  const [voucherCode, setVoucherCode] = useState('');
  const { appliedVoucher, isValidating, applyVoucher, removeVoucher, calculateDiscount } = useVoucher();
  
  const discount = calculateDiscount(appliedVoucher, subtotal);
  const total = subtotal - discount + shippingCost;

  const handleApplyVoucher = async () => {
    await applyVoucher(voucherCode, subtotal);
  };

  const handleRemoveVoucher = () => {
    removeVoucher();
    setVoucherCode('');
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="text-lg">Ringkasan Belanja</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voucher Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Kode Voucher</label>
          {appliedVoucher ? (
            <div className="flex items-center justify-between p-3 border rounded-md bg-green-50 dark:bg-green-950">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500">{appliedVoucher.code}</Badge>
                <span className="text-sm text-muted-foreground">
                  {appliedVoucher.discount_type === 'percentage' 
                    ? `${appliedVoucher.discount_value}% off`
                    : `Rp ${appliedVoucher.discount_value.toLocaleString('id-ID')} off`}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveVoucher}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Masukkan kode"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                disabled={isValidating}
              />
              <Button 
                variant="outline" 
                onClick={handleApplyVoucher}
                disabled={isValidating || !voucherCode.trim()}
              >
                {isValidating ? 'Validasi...' : 'Pakai'}
              </Button>
            </div>
          )}
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
        <Button 
          className="w-full" 
          size="lg" 
          onClick={() => navigate('/checkout', { 
            state: { voucher: appliedVoucher } 
          })}
        >
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
