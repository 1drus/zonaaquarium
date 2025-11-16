import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Building2, CreditCard, Wallet } from 'lucide-react';

interface PaymentStepProps {
  paymentMethod: string;
  onSelectPayment: (method: string) => void;
}

const paymentMethods = [
  {
    id: 'bank-transfer',
    name: 'Transfer Bank',
    description: 'BCA, Mandiri, BNI, BRI',
    icon: Building2,
  },
  {
    id: 'e-wallet',
    name: 'E-Wallet',
    description: 'GoPay, OVO, DANA, ShopeePay',
    icon: Wallet,
  },
  {
    id: 'cod',
    name: 'Cash on Delivery (COD)',
    description: 'Bayar saat barang diterima',
    icon: CreditCard,
  },
];

export function PaymentStep({ paymentMethod, onSelectPayment }: PaymentStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Pilih Metode Pembayaran</h2>

      <RadioGroup value={paymentMethod} onValueChange={onSelectPayment}>
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          return (
            <Card
              key={method.id}
              className={paymentMethod === method.id ? 'ring-2 ring-primary' : ''}
            >
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{method.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {method.description}
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </RadioGroup>
    </div>
  );
}
