import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductVariants } from './ProductVariants';

interface ProductDialogProps {
  open: boolean;
  onClose: (reload?: boolean) => void;
  product: any | null;
}

export function ProductDialog({ open, onClose, product }: ProductDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    discount_percentage: '',
    stock_quantity: '',
    category_id: '',
    size: '',
    water_type: '',
    origin: '',
    difficulty_level: '',
    temperature_min: '',
    temperature_max: '',
    ph_min: '',
    ph_max: '',
    care_instructions: '',
    min_order: '1',
    max_order: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        discount_percentage: product.discount_percentage?.toString() || '',
        stock_quantity: product.stock_quantity?.toString() || '',
        category_id: product.category_id || '',
        size: product.size || '',
        water_type: product.water_type || '',
        origin: product.origin || '',
        difficulty_level: product.difficulty_level || '',
        temperature_min: product.temperature_min?.toString() || '',
        temperature_max: product.temperature_max?.toString() || '',
        ph_min: product.ph_min?.toString() || '',
        ph_max: product.ph_max?.toString() || '',
        care_instructions: product.care_instructions || '',
        min_order: product.min_order?.toString() || '1',
        max_order: product.max_order?.toString() || '',
      });
    } else {
      resetForm();
    }
  }, [product, open]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (data) {
      setCategories(data);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      price: '',
      discount_percentage: '',
      stock_quantity: '',
      category_id: '',
      size: '',
      water_type: '',
      origin: '',
      difficulty_level: '',
      temperature_min: '',
      temperature_max: '',
      ph_min: '',
      ph_max: '',
      care_instructions: '',
      min_order: '1',
      max_order: '',
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const slug = formData.slug || generateSlug(formData.name);
      
      const productData: any = {
        name: formData.name,
        slug,
        description: formData.description || null,
        price: Number(formData.price),
        discount_percentage: formData.discount_percentage ? Number(formData.discount_percentage) : null,
        stock_quantity: Number(formData.stock_quantity),
        category_id: formData.category_id || null,
        size: formData.size || null,
        water_type: formData.water_type || null,
        origin: formData.origin || null,
        difficulty_level: formData.difficulty_level || null,
        temperature_min: formData.temperature_min ? Number(formData.temperature_min) : null,
        temperature_max: formData.temperature_max ? Number(formData.temperature_max) : null,
        ph_min: formData.ph_min ? Number(formData.ph_min) : null,
        ph_max: formData.ph_max ? Number(formData.ph_max) : null,
        care_instructions: formData.care_instructions || null,
        min_order: Number(formData.min_order),
        max_order: formData.max_order ? Number(formData.max_order) : null,
      };

      let error;
      if (product) {
        const result = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('products')
          .insert(productData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: product ? 'Produk diperbarui' : 'Produk ditambahkan',
        description: `Produk berhasil ${product ? 'diperbarui' : 'ditambahkan'}`,
      });

      onClose(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal menyimpan produk',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
        </DialogHeader>
        
        {product ? (
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Informasi Produk</TabsTrigger>
              <TabsTrigger value="variants">Variants</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nama Produk *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="price">Harga *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="discount">Diskon (%)</Label>
              <Input
                id="discount"
                type="number"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="stock">Stok *</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Kategori</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="size">Ukuran</Label>
              <Input
                id="size"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="origin">Asal</Label>
              <Input
                id="origin"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              />
            </div>
          </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => onClose()}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="variants" className="mt-4">
              <ProductVariants productId={product.id} />
            </TabsContent>
          </Tabs>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nama Produk *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="price">Harga *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="discount">Diskon (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="stock">Stok *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Kategori</Label>
                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="size">Ukuran</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="origin">Asal</Label>
                <Input
                  id="origin"
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onClose()}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
