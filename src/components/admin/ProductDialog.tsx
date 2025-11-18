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
import { ImagePlus, X } from 'lucide-react';

interface ProductDialogProps {
  open: boolean;
  onClose: (reload?: boolean) => void;
  product: any | null;
}

export function ProductDialog({ open, onClose, product }: ProductDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<Array<{ id: string; image_url: string; is_primary: boolean }>>([]);
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
      loadProductImages(product.id);
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

  const loadProductImages = async (productId: string) => {
    const { data } = await supabase
      .from('product_images')
      .select('id, image_url, is_primary')
      .eq('product_id', productId)
      .order('display_order');
    
    if (data) {
      setExistingImages(data);
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
    setImageFiles([]);
    setExistingImages([]);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...files]);
    }
  };

  const removeNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setExistingImages(prev => prev.filter(img => img.id !== imageId));
      toast({
        title: 'Gambar dihapus',
        description: 'Gambar berhasil dihapus',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus gambar',
        description: error.message,
      });
    }
  };

  const uploadImages = async (productId: string) => {
    if (imageFiles.length === 0) return;

    setUploadingImage(true);
    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${productId}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        const { error: insertError } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: publicUrl,
            is_primary: existingImages.length === 0 && i === 0,
            display_order: existingImages.length + i,
          });

        if (insertError) throw insertError;
      }
    } finally {
      setUploadingImage(false);
    }
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

      let productId: string;
      if (product) {
        const result = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        if (result.error) throw result.error;
        productId = product.id;
      } else {
        const result = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
        if (result.error) throw result.error;
        productId = result.data.id;
      }

      // Upload images
      await uploadImages(productId);

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
              <Label>Gambar Produk</Label>
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  {existingImages.map((img) => (
                    <div key={img.id} className="relative w-24 h-24 border rounded-lg overflow-hidden">
                      <img src={img.image_url} alt="Product" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(img.id)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {img.is_primary && (
                        <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-1 rounded">
                          Utama
                        </span>
                      )}
                    </div>
                  ))}
                  {imageFiles.map((file, index) => (
                    <div key={index} className="relative w-24 h-24 border rounded-lg overflow-hidden">
                      <img src={URL.createObjectURL(file)} alt="New" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload-edit"
                  />
                  <Label htmlFor="image-upload-edit" className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                      <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Klik untuk upload gambar</p>
                    </div>
                  </Label>
                </div>
              </div>
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

            <div>
              <Label htmlFor="water_type">Tipe Air</Label>
              <Select value={formData.water_type} onValueChange={(value) => setFormData({ ...formData, water_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe air" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tawar">Air Tawar</SelectItem>
                  <SelectItem value="laut">Air Laut</SelectItem>
                  <SelectItem value="payau">Air Payau</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty_level">Tingkat Kesulitan</Label>
              <Select value={formData.difficulty_level} onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tingkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mudah">Mudah</SelectItem>
                  <SelectItem value="sedang">Sedang</SelectItem>
                  <SelectItem value="sulit">Sulit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="temperature_min">Suhu Min (°C)</Label>
              <Input
                id="temperature_min"
                type="number"
                step="0.1"
                value={formData.temperature_min}
                onChange={(e) => setFormData({ ...formData, temperature_min: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="temperature_max">Suhu Max (°C)</Label>
              <Input
                id="temperature_max"
                type="number"
                step="0.1"
                value={formData.temperature_max}
                onChange={(e) => setFormData({ ...formData, temperature_max: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="ph_min">pH Min</Label>
              <Input
                id="ph_min"
                type="number"
                step="0.1"
                value={formData.ph_min}
                onChange={(e) => setFormData({ ...formData, ph_min: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="ph_max">pH Max</Label>
              <Input
                id="ph_max"
                type="number"
                step="0.1"
                value={formData.ph_max}
                onChange={(e) => setFormData({ ...formData, ph_max: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="min_order">Min Order</Label>
              <Input
                id="min_order"
                type="number"
                value={formData.min_order}
                onChange={(e) => setFormData({ ...formData, min_order: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="max_order">Max Order</Label>
              <Input
                id="max_order"
                type="number"
                value={formData.max_order}
                onChange={(e) => setFormData({ ...formData, max_order: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="care_instructions">Instruksi Perawatan</Label>
              <Textarea
                id="care_instructions"
                value={formData.care_instructions}
                onChange={(e) => setFormData({ ...formData, care_instructions: e.target.value })}
                rows={3}
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
                <Label>Gambar Produk</Label>
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {imageFiles.map((file, index) => (
                      <div key={index} className="relative w-24 h-24 border rounded-lg overflow-hidden">
                        <img src={URL.createObjectURL(file)} alt="New" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                        <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Klik untuk upload gambar</p>
                      </div>
                    </Label>
                  </div>
                </div>
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

              <div>
                <Label htmlFor="water_type">Tipe Air</Label>
                <Select value={formData.water_type} onValueChange={(value) => setFormData({ ...formData, water_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe air" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tawar">Air Tawar</SelectItem>
                    <SelectItem value="laut">Air Laut</SelectItem>
                    <SelectItem value="payau">Air Payau</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="difficulty_level">Tingkat Kesulitan</Label>
                <Select value={formData.difficulty_level} onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tingkat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mudah">Mudah</SelectItem>
                    <SelectItem value="sedang">Sedang</SelectItem>
                    <SelectItem value="sulit">Sulit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="temperature_min">Suhu Min (°C)</Label>
                <Input
                  id="temperature_min"
                  type="number"
                  step="0.1"
                  value={formData.temperature_min}
                  onChange={(e) => setFormData({ ...formData, temperature_min: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="temperature_max">Suhu Max (°C)</Label>
                <Input
                  id="temperature_max"
                  type="number"
                  step="0.1"
                  value={formData.temperature_max}
                  onChange={(e) => setFormData({ ...formData, temperature_max: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="ph_min">pH Min</Label>
                <Input
                  id="ph_min"
                  type="number"
                  step="0.1"
                  value={formData.ph_min}
                  onChange={(e) => setFormData({ ...formData, ph_min: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="ph_max">pH Max</Label>
                <Input
                  id="ph_max"
                  type="number"
                  step="0.1"
                  value={formData.ph_max}
                  onChange={(e) => setFormData({ ...formData, ph_max: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="min_order">Min Order</Label>
                <Input
                  id="min_order"
                  type="number"
                  value={formData.min_order}
                  onChange={(e) => setFormData({ ...formData, min_order: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="max_order">Max Order</Label>
                <Input
                  id="max_order"
                  type="number"
                  value={formData.max_order}
                  onChange={(e) => setFormData({ ...formData, max_order: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="care_instructions">Instruksi Perawatan</Label>
                <Textarea
                  id="care_instructions"
                  value={formData.care_instructions}
                  onChange={(e) => setFormData({ ...formData, care_instructions: e.target.value })}
                  rows={3}
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
