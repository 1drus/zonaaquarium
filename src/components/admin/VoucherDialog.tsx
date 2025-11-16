import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Voucher {
  id?: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_discount: number | null;
  usage_limit: number | null;
  user_usage_limit: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

interface VoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucher: Voucher | null;
  onSuccess: () => void;
}

export function VoucherDialog({ open, onOpenChange, voucher, onSuccess }: VoucherDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Voucher>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_purchase: 0,
    max_discount: null,
    usage_limit: null,
    user_usage_limit: 1,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    is_active: true,
  });

  useEffect(() => {
    if (voucher) {
      setFormData({
        ...voucher,
        valid_from: new Date(voucher.valid_from).toISOString().split('T')[0],
        valid_until: new Date(voucher.valid_until).toISOString().split('T')[0],
      });
    } else {
      setFormData({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        min_purchase: 0,
        max_discount: null,
        usage_limit: null,
        user_usage_limit: 1,
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: '',
        is_active: true,
      });
    }
  }, [voucher, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const voucherData = {
        code: formData.code.toUpperCase(),
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        min_purchase: formData.min_purchase,
        max_discount: formData.max_discount,
        usage_limit: formData.usage_limit,
        user_usage_limit: formData.user_usage_limit,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: new Date(formData.valid_until).toISOString(),
        is_active: formData.is_active,
      };

      if (voucher?.id) {
        // Update existing voucher
        const { error } = await supabase
          .from('vouchers')
          .update(voucherData)
          .eq('id', voucher.id);

        if (error) throw error;
        toast.success('Voucher berhasil diupdate');
      } else {
        // Create new voucher
        const { error } = await supabase
          .from('vouchers')
          .insert(voucherData);

        if (error) throw error;
        toast.success('Voucher berhasil dibuat');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving voucher:', error);
      toast.error(error.message || 'Gagal menyimpan voucher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {voucher ? 'Edit Voucher' : 'Tambah Voucher Baru'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Voucher *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="DISKON50"
                required
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_type">Tipe Diskon *</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi voucher..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount_value">
                Nilai Diskon * {formData.discount_type === 'percentage' ? '(%)' : '(Rp)'}
              </Label>
              <Input
                id="discount_value"
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_discount">Max Diskon (Rp)</Label>
              <Input
                id="max_discount"
                type="number"
                value={formData.max_discount || ''}
                onChange={(e) => setFormData({ ...formData, max_discount: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="Tidak dibatasi"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_purchase">Min. Pembelian (Rp)</Label>
              <Input
                id="min_purchase"
                type="number"
                value={formData.min_purchase}
                onChange={(e) => setFormData({ ...formData, min_purchase: parseFloat(e.target.value) })}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_usage_limit">Limit per User *</Label>
              <Input
                id="user_usage_limit"
                type="number"
                value={formData.user_usage_limit}
                onChange={(e) => setFormData({ ...formData, user_usage_limit: parseInt(e.target.value) })}
                required
                min="1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usage_limit">Total Usage Limit</Label>
            <Input
              id="usage_limit"
              type="number"
              value={formData.usage_limit || ''}
              onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Tidak dibatasi"
              min="1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Berlaku Dari *</Label>
              <Input
                id="valid_from"
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">Berlaku Sampai *</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Voucher Aktif</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {voucher ? 'Update' : 'Buat'} Voucher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
