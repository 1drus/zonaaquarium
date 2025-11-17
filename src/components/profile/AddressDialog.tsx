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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema)
  });

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
              <Label htmlFor="kelurahan">Kelurahan</Label>
              <Input
                id="kelurahan"
                {...register('kelurahan')}
                disabled={loading}
              />
              {errors.kelurahan && (
                <p className="text-sm text-destructive">{errors.kelurahan.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kecamatan">Kecamatan</Label>
              <Input
                id="kecamatan"
                {...register('kecamatan')}
                disabled={loading}
              />
              {errors.kecamatan && (
                <p className="text-sm text-destructive">{errors.kecamatan.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Kota</Label>
              <Input
                id="city"
                {...register('city')}
                disabled={loading}
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Provinsi</Label>
              <Input
                id="province"
                {...register('province')}
                disabled={loading}
              />
              {errors.province && (
                <p className="text-sm text-destructive">{errors.province.message}</p>
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
