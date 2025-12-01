import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin } from 'lucide-react';
import { AddressDialog } from '@/components/profile/AddressDialog';

interface Address {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean | null;
  city_id: number | null;
}

interface AddressStepProps {
  selectedAddress: Address | null;
  onSelectAddress: (address: Address) => void;
}

export function AddressStep({ selectedAddress, onSelectAddress }: AddressStepProps) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, [user]);

  const loadAddresses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAddresses(data);
      if (data.length > 0 && !selectedAddress) {
        const defaultAddress = data.find(addr => addr.is_default) || data[0];
        onSelectAddress(defaultAddress);
      }
    }

    setLoading(false);
  };

  const handleDialogClose = (shouldReload: boolean) => {
    setShowDialog(false);
    if (shouldReload) {
      loadAddresses();
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Memuat alamat...</p>;
  }

  if (addresses.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Belum Ada Alamat</h3>
            <p className="text-muted-foreground mb-4">
              Tambahkan alamat pengiriman untuk melanjutkan checkout
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Alamat
            </Button>
          </div>
        </CardContent>
        <AddressDialog
          open={showDialog}
          onClose={handleDialogClose}
          address={null}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Pilih Alamat Pengiriman</h2>
        <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Alamat Baru
        </Button>
      </div>

      <RadioGroup
        value={selectedAddress?.id}
        onValueChange={(value) => {
          const address = addresses.find(addr => addr.id === value);
          if (address) onSelectAddress(address);
        }}
      >
        {addresses.map((address) => (
          <Card
            key={address.id}
            className={selectedAddress?.id === address.id ? 'ring-2 ring-primary' : ''}
          >
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <RadioGroupItem value={address.id} id={address.id} />
                <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{address.label}</span>
                    {address.is_default && (
                      <Badge variant="secondary">Utama</Badge>
                    )}
                  </div>
                  <p className="font-medium">{address.recipient_name}</p>
                  <p className="text-sm text-muted-foreground">{address.phone}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {address.address_line}, {address.kelurahan}, {address.kecamatan}
                    <br />
                    {address.city}, {address.province} {address.postal_code}
                  </p>
                </Label>
              </div>
            </CardContent>
          </Card>
        ))}
      </RadioGroup>

      <AddressDialog
        open={showDialog}
        onClose={handleDialogClose}
        address={null}
      />
    </div>
  );
}
