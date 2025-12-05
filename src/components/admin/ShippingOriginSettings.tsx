import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin } from 'lucide-react';

interface Province {
  id: number;
  name: string;
}

interface City {
  id: number;
  name: string;
  province_id: number;
}

export function ShippingOriginSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [originCityName, setOriginCityName] = useState<string>('');

  // Load current origin settings
  useEffect(() => {
    loadCurrentOrigin();
    loadProvinces();
  }, []);

  const loadCurrentOrigin = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_key, config_value')
        .in('config_key', ['shipping_origin_city_id', 'shipping_origin_name']);

      if (error) throw error;

      if (data) {
        const cityIdConfig = data.find(c => c.config_key === 'shipping_origin_city_id');
        const nameConfig = data.find(c => c.config_key === 'shipping_origin_name');
        
        if (cityIdConfig) setSelectedCityId(cityIdConfig.config_value);
        if (nameConfig) setOriginCityName(nameConfig.config_value);
      }
    } catch (error) {
      console.error('Error loading origin:', error);
    }
  };

  const loadProvinces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rajaongkir-shipping', {
        body: { action: 'getProvinces' },
      });

      if (error) throw error;

      if (data?.meta?.status === 'success' && data?.data) {
        setProvinces(data.data);
      }
    } catch (error) {
      console.error('Error loading provinces:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat daftar provinsi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async (provinceId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rajaongkir-shipping', {
        body: { 
          action: 'getCities',
          provinceId: parseInt(provinceId)
        },
      });

      if (error) throw error;

      if (data?.meta?.status === 'success' && data?.data) {
        setCities(data.data);
      }
    } catch (error) {
      console.error('Error loading cities:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat daftar kota',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProvinceChange = (provinceId: string) => {
    setSelectedProvinceId(provinceId);
    setSelectedCityId('');
    setCities([]);
    loadCities(provinceId);
  };

  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
    const city = cities.find(c => c.id.toString() === cityId);
    if (city) {
      setOriginCityName(city.name);
    }
  };

  const saveOrigin = async () => {
    if (!selectedCityId || !originCityName) {
      toast({
        title: 'Error',
        description: 'Silakan pilih kota terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Save city ID
      const { error: cityError } = await supabase
        .from('system_config')
        .upsert({
          config_key: 'shipping_origin_city_id',
          config_value: selectedCityId,
          description: 'RajaOngkir City ID untuk lokasi toko (Origin pengiriman)'
        }, { onConflict: 'config_key' });

      if (cityError) throw cityError;

      // Save city name
      const { error: nameError } = await supabase
        .from('system_config')
        .upsert({
          config_key: 'shipping_origin_name',
          config_value: originCityName,
          description: 'Nama kota origin untuk display'
        }, { onConflict: 'config_key' });

      if (nameError) throw nameError;

      toast({
        title: 'Berhasil',
        description: 'Lokasi origin berhasil disimpan',
      });
    } catch (error) {
      console.error('Error saving origin:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan lokasi origin',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Lokasi Origin Pengiriman
        </CardTitle>
        <CardDescription>
          Atur lokasi toko sebagai titik asal pengiriman untuk kalkulasi ongkir
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="province">Provinsi</Label>
          <Select 
            value={selectedProvinceId} 
            onValueChange={handleProvinceChange}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih provinsi" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((province) => (
                <SelectItem key={province.id} value={province.id.toString()}>
                  {province.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Kota</Label>
          <Select 
            value={selectedCityId} 
            onValueChange={handleCityChange}
            disabled={loading || !selectedProvinceId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kota" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.id.toString()}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {originCityName && (
          <div className="space-y-2">
            <Label>Lokasi Saat Ini</Label>
            <Input 
              value={originCityName}
              disabled
              className="bg-muted"
            />
          </div>
        )}

        <Button 
          onClick={saveOrigin} 
          disabled={saving || !selectedCityId}
          className="w-full"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Lokasi Origin
        </Button>
      </CardContent>
    </Card>
  );
}
