import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Truck } from 'lucide-react';

interface Address {
  city: string;
  province: string;
}

interface ShippingStepProps {
  selectedAddress: Address | null;
  shippingMethod: string;
  shippingCost: number;
  onSelectShipping: (method: string, cost: number) => void;
}

const shippingOptions = [
  {
    id: 'jne-reg',
    name: 'JNE Regular',
    courier: 'JNE',
    estimatedDays: '2-3 hari',
    cost: 15000,
  },
  {
    id: 'jne-yes',
    name: 'JNE YES',
    courier: 'JNE',
    estimatedDays: '1-2 hari',
    cost: 25000,
  },
  {
    id: 'jnt-reg',
    name: 'J&T Regular',
    courier: 'J&T',
    estimatedDays: '2-4 hari',
    cost: 12000,
  },
  {
    id: 'sicepat-reg',
    name: 'SiCepat Regular',
    courier: 'SiCepat',
    estimatedDays: '2-3 hari',
    cost: 14000,
  },
  {
    id: 'sicepat-halu',
    name: 'SiCepat HALU',
    courier: 'SiCepat',
    estimatedDays: '1 hari',
    cost: 30000,
  },
];

export function ShippingStep({
  selectedAddress,
  shippingMethod,
  shippingCost,
  onSelectShipping,
}: ShippingStepProps) {
  if (!selectedAddress) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            Silakan pilih alamat pengiriman terlebih dahulu
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Pilih Metode Pengiriman</h2>
        <p className="text-sm text-muted-foreground">
          Pengiriman ke: {selectedAddress.city}, {selectedAddress.province}
        </p>
      </div>

      <RadioGroup
        value={shippingMethod}
        onValueChange={(value) => {
          const option = shippingOptions.find(opt => opt.id === value);
          if (option) {
            onSelectShipping(option.name, option.cost);
          }
        }}
      >
        {shippingOptions.map((option) => (
          <Card
            key={option.id}
            className={shippingMethod === option.id ? 'ring-2 ring-primary' : ''}
          >
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{option.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Estimasi: {option.estimatedDays}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        Rp {option.cost.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
            </CardContent>
          </Card>
        ))}
      </RadioGroup>
    </div>
  );
}
