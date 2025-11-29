import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { addressSchema, AddressFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Province {
  id: number;
  name: string;
}

interface City {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
}

interface Subdistrict {
  id: number;
  name: string;
}

interface AddressDialogProps {
  open: boolean;
  onClose: (shouldRefresh?: boolean) => void;
  address?: {
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
    is_default: boolean;
  } | null;
}

export function AddressDialog({ open, onClose, address }: AddressDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // RajaOngkir data states
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [subdistricts, setSubdistricts] = useState<Subdistrict[]>([]);
  
  // Selected values
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedSubdistrictId, setSelectedSubdistrictId] = useState<string>('');
  
  // Loading states
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingSubdistricts, setLoadingSubdistricts] = useState(false);
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema)
  });

  // Load provinces on mount
  useEffect(() => {
    loadProvinces();
  }, []);

  const loadProvinces = async () => {
    setLoadingProvinces(true);
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
      setLoadingProvinces(false);
    }
  };

  const loadCities = async (provinceId: string) => {
    setLoadingCities(true);
    setCities([]);
    setDistricts([]);
    setSubdistricts([]);
    setSelectedCityId('');
    setSelectedDistrictId('');
    setSelectedSubdistrictId('');
    
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
      setLoadingCities(false);
    }
  };

  const loadDistricts = async (cityId: string) => {
    setLoadingDistricts(true);
    setDistricts([]);
    setSubdistricts([]);
    setSelectedDistrictId('');
    setSelectedSubdistrictId('');
    
    try {
      const { data, error } = await supabase.functions.invoke('rajaongkir-shipping', {
        body: { 
          action: 'getDistricts',
          cityId: parseInt(cityId)
        },
      });

      if (error) throw error;

      if (data?.meta?.status === 'success' && data?.data) {
        setDistricts(data.data);
      }
    } catch (error) {
      console.error('Error loading districts:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat daftar kecamatan',
        variant: 'destructive',
      });
    } finally {
      setLoadingDistricts(false);
    }
  };

  const loadSubdistricts = async (districtId: string) => {
    setLoadingSubdistricts(true);
    setSubdistricts([]);
    setSelectedSubdistrictId('');
    
    try {
      const { data, error } = await supabase.functions.invoke('rajaongkir-shipping', {
        body: { 
          action: 'getSubdistricts',
          districtId: parseInt(districtId)
        },
      });

      if (error) throw error;

      if (data?.meta?.status === 'success' && data?.data) {
        setSubdistricts(data.data);
      }
    } catch (error) {
      console.error('Error loading subdistricts:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat daftar kelurahan',
        variant: 'destructive',
      });
    } finally {
      setLoadingSubdistricts(false);
    }
  };

  const handleProvinceChange = (provinceId: string) => {
    setSelectedProvinceId(provinceId);
    const province = provinces.find(p => p.id.toString() === provinceId);
    if (province) {
      setValue('province', province.name);
      loadCities(provinceId);
    }
  };

  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
    const city = cities.find(c => c.id.toString() === cityId);
    if (city) {
      setValue('city', city.name);
      loadDistricts(cityId);
    }
  };

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrictId(districtId);
    const district = districts.find(d => d.id.toString() === districtId);
    if (district) {
      setValue('kecamatan', district.name);
      loadSubdistricts(districtId);
    }
  };

  const handleSubdistrictChange = (subdistrictId: string) => {
    setSelectedSubdistrictId(subdistrictId);
    const subdistrict = subdistricts.find(s => s.id.toString() === subdistrictId);
    if (subdistrict) {
      setValue('kelurahan', subdistrict.name);
    }
  };

  useEffect(() => {
    if (address) {
      reset({
        label: address.label,
        recipientName: address.recipient_name,
        phone: address.phone,
        addressLine: address.address_line,
        kelurahan: address.kelurahan,
        kecamatan: address.kecamatan,
        city: address.city,
        province: address.province,
        postalCode: address.postal_code,
        isDefault: address.is_default
      });
      setIsDefault(address.is_default);
    } else {
      reset({
        label: '',
        recipientName: '',
        phone: '',
        addressLine: '',
        kelurahan: '',
        kecamatan: '',
        city: '',
        province: '',
        postalCode: '',
        isDefault: false
      });
      setIsDefault(false);
    }
  }, [address, reset]);

  const onSubmit = async (data: AddressFormData) => {
    if (!user) return;
    
    setLoading(true);

    const addressData = {
      user_id: user.id,
      label: data.label,
      recipient_name: data.recipientName,
      phone: data.phone,
      address_line: data.addressLine,
      kelurahan: data.kelurahan,
      kecamatan: data.kecamatan,
      city: data.city,
      province: data.province,
      postal_code: data.postalCode,
      is_default: isDefault
    };

    let error;
    
    if (address) {
      // Update existing
      ({ error } = await supabase
        .from('addresses')
        .update(addressData)
        .eq('id', address.id));
    } else {
      // Insert new
      ({ error } = await supabase
        .from('addresses')
        .insert(addressData));
    }

    if (error) {
      toast({
        variant: "destructive",
        title: address ? "Update gagal" : "Tambah gagal",
        description: error.message
      });
    } else {
      toast({
        title: address ? "Alamat berhasil diupdate" : "Alamat berhasil ditambahkan",
      });
      onClose(true);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-2xl w-[calc(100vw-2rem)]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl sm:text-2xl">{address ? 'Edit Alamat' : 'Tambah Alamat Baru'}</DialogTitle>
          <DialogDescription className="text-sm">
            {address ? 'Update informasi alamat pengiriman' : 'Tambahkan alamat pengiriman baru'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="label">Label Alamat</Label>
              <Input
                id="label"
                placeholder="e.g., Rumah, Kantor"
                {...register('label')}
                disabled={loading}
              />
              {errors.label && (
                <p className="text-sm text-destructive">{errors.label.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientName">Nama Penerima</Label>
              <Input
                id="recipientName"
                {...register('recipientName')}
                disabled={loading}
              />
              {errors.recipientName && (
                <p className="text-sm text-destructive">{errors.recipientName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                disabled={loading}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine">Alamat Lengkap</Label>
              <Input
                id="addressLine"
                placeholder="Nama jalan, nomor rumah, RT/RW"
                {...register('addressLine')}
                disabled={loading}
              />
              {errors.addressLine && (
                <p className="text-sm text-destructive">{errors.addressLine.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Provinsi</Label>
              <Select 
                value={selectedProvinceId} 
                onValueChange={handleProvinceChange}
                disabled={loading || loadingProvinces}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingProvinces ? "Memuat..." : "Pilih provinsi"} />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((province) => (
                    <SelectItem key={province.id} value={province.id.toString()}>
                      {province.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.province && (
                <p className="text-sm text-destructive">{errors.province.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Kota</Label>
              <Select 
                value={selectedCityId} 
                onValueChange={handleCityChange}
                disabled={loading || loadingCities || !selectedProvinceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingCities ? "Memuat..." : "Pilih kota"} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id.toString()}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kecamatan">Kecamatan</Label>
              <Select 
                value={selectedDistrictId} 
                onValueChange={handleDistrictChange}
                disabled={loading || loadingDistricts || !selectedCityId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingDistricts ? "Memuat..." : "Pilih kecamatan"} />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((district) => (
                    <SelectItem key={district.id} value={district.id.toString()}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.kecamatan && (
                <p className="text-sm text-destructive">{errors.kecamatan.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kelurahan">Kelurahan</Label>
              <Select 
                value={selectedSubdistrictId} 
                onValueChange={handleSubdistrictChange}
                disabled={loading || loadingSubdistricts || !selectedDistrictId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingSubdistricts ? "Memuat..." : "Pilih kelurahan"} />
                </SelectTrigger>
                <SelectContent>
                  {subdistricts.map((subdistrict) => (
                    <SelectItem key={subdistrict.id} value={subdistrict.id.toString()}>
                      {subdistrict.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.kelurahan && (
                <p className="text-sm text-destructive">{errors.kelurahan.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">Kode Pos</Label>
              <Input
                id="postalCode"
                placeholder="12345"
                {...register('postalCode')}
                disabled={loading}
              />
              {errors.postalCode && (
                <p className="text-sm text-destructive">{errors.postalCode.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDefault"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked as boolean)}
              disabled={loading}
            />
            <Label
              htmlFor="isDefault"
              className="text-sm font-normal cursor-pointer"
            >
              Jadikan alamat utama
            </Label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                address ? 'Simpan Perubahan' : 'Tambah Alamat'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => onClose()} className="w-full sm:w-auto">
              Batal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
