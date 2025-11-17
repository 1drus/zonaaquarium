import { Card, CardContent } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

interface PaymentStepProps {
  paymentMethod: string;
  onSelectPayment: (method: string) => void;
}

export function PaymentStep({ paymentMethod, onSelectPayment }: PaymentStepProps) {
  // Auto-select Midtrans payment
  if (!paymentMethod) {
    onSelectPayment('midtrans');
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Metode Pembayaran</h2>

      <Card className="ring-2 ring-primary">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Pembayaran Digital</p>
              <p className="text-sm text-muted-foreground">
                Kartu Kredit, Debit, Transfer Bank, E-Wallet, dan lainnya via Midtrans
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          Anda akan diarahkan ke halaman pembayaran Midtrans yang aman untuk menyelesaikan transaksi.
        </p>
      </div>
    </div>
  );
}
