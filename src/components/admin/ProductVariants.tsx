import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VariantDialog } from './VariantDialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, Loader2 } from 'lucide-react';

interface Variant {
  id: string;
  product_id: string;
  sku: string | null;
  variant_name: string;
  size: string | null;
  color: string | null;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
}

interface ProductVariantsProps {
  productId: string;
}

export function ProductVariants({ productId }: ProductVariantsProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadVariants();
  }, [productId]);

  const loadVariants = async () => {
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setVariants(data || []);
    } catch (error) {
      console.error('Error loading variants:', error);
      toast.error('Gagal memuat variants');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (variant: Variant) => {
    setSelectedVariant(variant);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!variantToDelete) return;

    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantToDelete);

      if (error) throw error;

      toast.success('Variant berhasil dihapus');
      loadVariants();
    } catch (error) {
      console.error('Error deleting variant:', error);
      toast.error('Gagal menghapus variant');
    } finally {
      setDeleteDialogOpen(false);
      setVariantToDelete(null);
    }
  };

  const getTotalStock = () => {
    return variants.reduce((sum, v) => sum + v.stock_quantity, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Product Variants</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Total Stok: <span className="font-bold">{getTotalStock()}</span>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedVariant(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Variant
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {variants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada variant untuk produk ini</p>
              <p className="text-sm mt-1">Tambahkan variant untuk size/color variations</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Price Adj.</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell className="font-medium">
                        {variant.variant_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {variant.sku || '-'}
                      </TableCell>
                      <TableCell>{variant.size || '-'}</TableCell>
                      <TableCell>{variant.color || '-'}</TableCell>
                      <TableCell>
                        {variant.price_adjustment !== 0 && (
                          <span className={variant.price_adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                            {variant.price_adjustment > 0 ? '+' : ''}
                            Rp {variant.price_adjustment.toLocaleString('id-ID')}
                          </span>
                        )}
                        {variant.price_adjustment === 0 && '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant.stock_quantity > 0 ? 'default' : 'destructive'}>
                          {variant.stock_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {variant.is_active ? (
                          <Badge className="bg-green-500">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(variant)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setVariantToDelete(variant.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <VariantDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        variant={selectedVariant}
        productId={productId}
        onSuccess={loadVariants}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Variant?</AlertDialogTitle>
            <AlertDialogDescription>
              Variant yang sudah dihapus tidak dapat dikembalikan.
              Pastikan tidak ada pesanan yang menggunakan variant ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
