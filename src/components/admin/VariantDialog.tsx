import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Variant {
  id?: string;
  product_id: string;
  sku?: string;
  variant_name: string;
  size?: string;
  color?: string;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
}

interface VariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: Variant | null;
  productId: string;
  onSuccess: () => void;
}

export function VariantDialog({ open, onOpenChange, variant, productId, onSuccess }: VariantDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Variant>({
    product_id: productId,
    sku: '',
    variant_name: '',
    size: '',
    color: '',
    price_adjustment: 0,
    stock_quantity: 0,
    is_active: true,
  });

  useEffect(() => {
    if (variant) {
      setFormData(variant);
    } else {
      setFormData({
        product_id: productId,
        sku: '',
        variant_name: '',
        size: '',
        color: '',
        price_adjustment: 0,
        stock_quantity: 0,
        is_active: true,
      });
    }
  }, [variant, productId, open]);

  const generateVariantName = () => {
    const parts = [];
    if (formData.size) parts.push(formData.size);
    if (formData.color) parts.push(formData.color);
    return parts.join(' - ') || 'Default';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const variantData = {
        ...formData,
        variant_name: generateVariantName(),
      };

      if (variant?.id) {
        const { error } = await supabase
          .from('product_variants')
          .update(variantData)
          .eq('id', variant.id);

        if (error) throw error;
        toast.success('Variant berhasil diupdate');
      } else {
        const { error } = await supabase
          .from('product_variants')
          .insert(variantData);

        if (error) throw error;
        toast.success('Variant berhasil ditambahkan');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving variant:', error);
      toast.error(error.message || 'Gagal menyimpan variant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {variant ? 'Edit Variant' : 'Tambah Variant Baru'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Ukuran</Label>
              <Input
                id="size"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="S, M, L, XL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Warna</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="Merah, Biru, Hijau"
              />
            </div>
          </div>

          <div className="p-3 bg-secondary rounded-md">
            <p className="text-sm text-muted-foreground">Nama Variant:</p>
            <p className="font-medium">{generateVariantName()}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU (Optional)</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="PROD-VAR-001"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_adjustment">Penyesuaian Harga (Rp)</Label>
              <Input
                id="price_adjustment"
                type="number"
                value={formData.price_adjustment}
                onChange={(e) => setFormData({ ...formData, price_adjustment: parseFloat(e.target.value) })}
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">
                Positif untuk menambah, negatif untuk mengurangi
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Stok *</Label>
              <Input
                id="stock_quantity"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                required
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Variant Aktif</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {variant ? 'Update' : 'Tambah'} Variant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
