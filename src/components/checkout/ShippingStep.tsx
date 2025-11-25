import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Truck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Address {
  id: string;
  city: string;
  province: string;
}

interface ShippingStepProps {
  selectedAddress: Address | null;
  shippingMethod: string;
  shippingCost: number;
  onSelectShipping: (id: string, name: string, cost: number) => void;
}

interface ShippingOption {
  id: string;
  name: string;
  courier: string;
  estimatedDays: string;
  cost: number;
}

export function ShippingStep({
  selectedAddress,
  shippingMethod,
  shippingCost,
  onSelectShipping,
}: ShippingStepProps) {
  const { toast } = useToast();
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [areaId, setAreaId] = useState<string>('');

  // Get area ID from Biteship based on city name
  useEffect(() => {
    const getAreaId = async () => {
      if (!selectedAddress) return;

      try {
        const { data, error } = await supabase.functions.invoke('rajaongkir-shipping', {
          body: {
            action: 'searchCity',
            cityName: selectedAddress.city,
          },
        });

        if (error) throw error;

        if (data?.areas && data.areas.length > 0) {
          // Use the first matching area
          setAreaId(data.areas[0].id);
        } else {
          console.log('Area not found for city:', selectedAddress.city);
        }
      } catch (error) {
        console.error('Error getting area ID:', error);
      }
    };

    getAreaId();
  }, [selectedAddress]);

  // Fetch shipping costs from Biteship
  useEffect(() => {
    const fetchShippingCosts = async () => {
      if (!areaId || !selectedAddress) return;

      setLoading(true);
      try {
        // Estimate weight based on cart (example: 1kg = 1000g)
        const estimatedWeight = 1000; // You can make this dynamic based on cart items

        const { data, error } = await supabase.functions.invoke('rajaongkir-shipping', {
          body: {
            action: 'rates',
            destinationAreaId: areaId,
            weight: estimatedWeight,
          },
        });

        if (error) throw error;

        if (data?.success && data?.pricing) {
          const allOptions: ShippingOption[] = data.pricing.map((rate: any) => ({
            id: `${rate.courier_code}-${rate.courier_service_code}`,
            name: `${rate.courier_name} ${rate.courier_service_name}`,
            courier: rate.courier_name,
            estimatedDays: rate.duration || 'Estimasi tidak tersedia',
            cost: rate.price,
          }));

          if (allOptions.length > 0) {
            setShippingOptions(allOptions);
          } else {
            toast({
              title: 'Tidak ada opsi pengiriman',
              description: 'Tidak ditemukan layanan pengiriman untuk lokasi Anda',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching shipping costs:', error);
        toast({
          title: 'Error',
          description: 'Gagal mengambil data ongkir',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchShippingCosts();
  }, [areaId, selectedAddress, toast]);

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

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Mengambil data ongkir...</span>
            </div>
          </CardContent>
        </Card>
      ) : shippingOptions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">
              Tidak ada opsi pengiriman tersedia
            </p>
          </CardContent>
        </Card>
      ) : (
        <RadioGroup
        value={shippingMethod}
        onValueChange={(value) => {
          const option = shippingOptions.find(opt => opt.id === value);
          if (option) {
            onSelectShipping(option.id, option.name, option.cost);
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
      )}
    </div>
  );
}
