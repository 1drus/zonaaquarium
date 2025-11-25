import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, Search } from 'lucide-react';

interface AreaOption {
  id: string;
  name: string;
  administrative_division_level_1_name: string;
  administrative_division_level_2_name: string;
}

export function ShippingOriginSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [originAreaId, setOriginAreaId] = useState('');
  const [originName, setOriginName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AreaOption[]>([]);

  useEffect(() => {
    loadCurrentOrigin();
  }, []);

  const loadCurrentOrigin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_key, config_value')
        .in('config_key', ['shipping_origin_area_id', 'shipping_origin_name']);

      if (error) throw error;

      const areaId = data?.find(c => c.config_key === 'shipping_origin_area_id')?.config_value || '';
      const name = data?.find(c => c.config_key === 'shipping_origin_name')?.config_value || '';

      setOriginAreaId(areaId);
      setOriginName(name);
    } catch (error) {
      console.error('Error loading origin:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat pengaturan origin',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const searchCity = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Peringatan',
        description: 'Masukkan nama kota untuk pencarian',
        variant: 'destructive',
      });
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('rajaongkir-shipping', {
        body: {
          action: 'searchCity',
          cityName: searchQuery,
        },
      });

      if (error) throw error;

      if (data?.areas && data.areas.length > 0) {
        setSearchResults(data.areas);
      } else {
        toast({
          title: 'Tidak Ditemukan',
          description: 'Tidak ada hasil untuk pencarian tersebut',
        });
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching city:', error);
      toast({
        title: 'Error',
        description: 'Gagal mencari kota',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const selectArea = (area: AreaOption) => {
    setOriginAreaId(area.id);
    setOriginName(`${area.name}, ${area.administrative_division_level_2_name}`);
    setSearchResults([]);
  };

  const saveOrigin = async () => {
    if (!originAreaId || !originName) {
      toast({
        title: 'Validasi Error',
        description: 'Area ID dan nama origin harus diisi',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Update or insert area ID
      const { error: areaError } = await supabase
        .from('system_config')
        .upsert({
          config_key: 'shipping_origin_area_id',
          config_value: originAreaId,
          description: 'Biteship Area ID untuk lokasi toko (Origin pengiriman)',
        });

      if (areaError) throw areaError;

      // Update or insert name
      const { error: nameError } = await supabase
        .from('system_config')
        .upsert({
          config_key: 'shipping_origin_name',
          config_value: originName,
          description: 'Nama lokasi origin untuk display',
        });

      if (nameError) throw nameError;

      toast({
        title: 'Berhasil',
        description: 'Pengaturan origin berhasil disimpan',
      });
    } catch (error) {
      console.error('Error saving origin:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan pengaturan origin',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Pengaturan Origin Pengiriman
        </CardTitle>
        <CardDescription>
          Atur lokasi toko sebagai titik asal pengiriman untuk kalkulasi ongkir
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search City */}
        <div className="space-y-3">
          <Label>Cari Lokasi Origin</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Cari kota/kecamatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchCity()}
            />
            <Button onClick={searchCity} disabled={searching}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {searchResults.map((area) => (
                <button
                  key={area.id}
                  onClick={() => selectArea(area)}
                  className="w-full px-4 py-3 text-left hover:bg-accent transition-colors"
                >
                  <p className="font-medium">{area.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {area.administrative_division_level_2_name}, {area.administrative_division_level_1_name}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current Origin */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Origin Name</Label>
            <Input
              value={originName}
              onChange={(e) => setOriginName(e.target.value)}
              placeholder="Nama lokasi origin"
            />
          </div>

          <div className="space-y-2">
            <Label>Biteship Area ID</Label>
            <Input
              value={originAreaId}
              onChange={(e) => setOriginAreaId(e.target.value)}
              placeholder="Area ID dari Biteship"
            />
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={saveOrigin} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            'Simpan Pengaturan Origin'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
