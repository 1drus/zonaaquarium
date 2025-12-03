import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Truck, Loader2, Gift, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Address {
  id: string;
  city: string;
  province: string;
  city_id: number | null;
}

interface TierConfig {
  tier_name: string;
  discount_percentage: number;
  free_shipping_threshold: number | null;
}

interface ShippingStepProps {
  selectedAddress: Address | null;
  shippingMethod: string;
  shippingCost: number;
  totalWeight: number;
  onSelectShipping: (id: string, name: string, cost: number) => void;
  tierConfig?: TierConfig | null;
  subtotal?: number;
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
  totalWeight,
  onSelectShipping,
  tierConfig,
  subtotal = 0,
}: ShippingStepProps) {
  const { toast } = useToast();
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch shipping costs from RajaOngkir using city_id directly
  useEffect(() => {
    const fetchShippingCosts = async () => {
      if (!selectedAddress?.city_id) {
        toast({
          title: 'Alamat belum lengkap',
          description: 'Alamat tidak memiliki city_id. Silakan update alamat Anda.',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);
      try {
        // Use actual weight or minimum 100g
        const weight = Math.max(totalWeight, 100);

        const { data, error } = await supabase.functions.invoke('rajaongkir-shipping', {
          body: {
            action: 'rates',
            destinationCityId: selectedAddress.city_id.toString(),
            weight: weight,
          },
        });

        if (error) throw error;

        if (data?.meta?.status === 'success' && data?.data) {
          const allOptions: ShippingOption[] = [];
          
          // Process RajaOngkir response
          data.data.forEach((courier: any) => {
            if (courier.service) {
              const serviceData = Array.isArray(courier.service) ? courier.service : [courier.service];
              
              serviceData.forEach((service: any) => {
                allOptions.push({
                  id: `${courier.code}-${service}`,
                  name: `${courier.name} - ${service}`,
                  courier: courier.name,
                  estimatedDays: courier.etd || 'Estimasi tidak tersedia',
                  cost: courier.cost || 0,
                });
              });
            }
          });

          if (allOptions.length > 0) {
            setShippingOptions(allOptions);
          } else {
            toast({
              title: 'Tidak ada opsi pengiriman',
              description: 'Tidak ditemukan layanan pengiriman untuk lokasi Anda',
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Gagal mengambil data',
            description: 'Tidak dapat menghubungi layanan ongkir',
            variant: 'destructive',
          });
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
  }, [selectedAddress, totalWeight, toast]);

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

  const isFreeShippingEligible = tierConfig?.free_shipping_threshold && subtotal >= tierConfig.free_shipping_threshold;
  const remainingForFreeShipping = tierConfig?.free_shipping_threshold 
    ? Math.max(0, tierConfig.free_shipping_threshold - subtotal) 
    : 0;

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Pilih Metode Pengiriman</h2>
        <p className="text-sm text-muted-foreground">
          Pengiriman ke: {selectedAddress.city}, {selectedAddress.province} (Total: {totalWeight}g)
        </p>
      </div>

      {/* Free Shipping Banner */}
      {tierConfig?.free_shipping_threshold && (
        <Card className={isFreeShippingEligible ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-accent/50 bg-accent/5'}>
          <CardContent className="pt-4 pb-4">
            {isFreeShippingEligible ? (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/20">
                  <Gift className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Gratis Ongkir!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    Sebagai member {tierConfig.tier_name}, Anda mendapat gratis ongkir untuk pesanan ini
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-accent/20">
                  <Truck className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Belanja Rp {remainingForFreeShipping.toLocaleString('id-ID')} lagi untuk gratis ongkir!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Member {tierConfig.tier_name} gratis ongkir untuk belanja min. Rp {tierConfig.free_shipping_threshold.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
        {shippingOptions.map((option) => {
          const displayCost = isFreeShippingEligible ? 0 : option.cost;
          
          return (
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
                        {isFreeShippingEligible ? (
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              GRATIS
                            </Badge>
                            <p className="text-sm text-muted-foreground line-through">
                              Rp {option.cost.toLocaleString('id-ID')}
                            </p>
                          </div>
                        ) : (
                          <p className="font-semibold">
                            Rp {option.cost.toLocaleString('id-ID')}
                          </p>
                        )}
                      </div>
                    </div>
                  </Label>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </RadioGroup>
      )}
    </div>
  );
}
