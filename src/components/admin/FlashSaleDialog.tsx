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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Search, Package } from 'lucide-react';
import { format } from 'date-fns';

interface FlashSale {
  id: string;
  name: string;
  description: string | null;
  banner_image_url: string | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface FlashSaleItem {
  id: string;
  product_id: string;
  flash_price: number;
  original_price: number;
  stock_limit: number;
  sold_count: number;
  product_name?: string;
  product_image?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number | null;
  product_images: { image_url: string; is_primary: boolean | null }[];
}

interface FlashSaleDialogProps {
  open: boolean;
  onClose: () => void;
  flashSale: FlashSale | null;
}

export function FlashSaleDialog({ open, onClose, flashSale }: FlashSaleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [items, setItems] = useState<FlashSaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (flashSale) {
        setName(flashSale.name);
        setDescription(flashSale.description || '');
        setStartTime(format(new Date(flashSale.start_time), "yyyy-MM-dd'T'HH:mm"));
        setEndTime(format(new Date(flashSale.end_time), "yyyy-MM-dd'T'HH:mm"));
        loadItems(flashSale.id);
      } else {
        resetForm();
      }
      loadProducts();
    }
  }, [open, flashSale]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setStartTime('');
    setEndTime('');
    setItems([]);
    setSearchQuery('');
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, stock_quantity, product_images (image_url, is_primary)')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setProducts(data);
    }
    setLoadingProducts(false);
  };

  const loadItems = async (flashSaleId: string) => {
    const { data, error } = await supabase
      .from('flash_sale_items')
      .select(`
        id,
        product_id,
        flash_price,
        original_price,
        stock_limit,
        sold_count,
        products (
          name,
          product_images (
            image_url,
            is_primary
          )
        )
      `)
      .eq('flash_sale_id', flashSaleId);

    if (!error && data) {
      setItems(
        data.map((item: any) => ({
          ...item,
          product_name: item.products?.name,
          product_image:
            item.products?.product_images?.find((img: any) => img.is_primary)?.image_url ||
            item.products?.product_images?.[0]?.image_url,
        }))
      );
    }
  };

  const handleSubmit = async () => {
    if (!name || !startTime || !endTime) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Nama, waktu mulai, dan waktu selesai wajib diisi',
      });
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Waktu selesai harus lebih besar dari waktu mulai',
      });
      return;
    }

    setLoading(true);

    try {
      let flashSaleId = flashSale?.id;

      if (flashSale) {
        // Update existing
        const { error } = await supabase
          .from('flash_sales')
          .update({
            name,
            description: description || null,
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
          })
          .eq('id', flashSale.id);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('flash_sales')
          .insert({
            name,
            description: description || null,
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        flashSaleId = data.id;
      }

      // Sync items
      if (flashSaleId) {
        // Delete removed items
        const existingIds = items.filter((i) => i.id && !i.id.startsWith('new-')).map((i) => i.id);
        if (flashSale) {
          await supabase
            .from('flash_sale_items')
            .delete()
            .eq('flash_sale_id', flashSaleId)
            .not('id', 'in', `(${existingIds.join(',')})`);
        }

        // Upsert items
        for (const item of items) {
          if (item.id.startsWith('new-')) {
            await supabase.from('flash_sale_items').insert({
              flash_sale_id: flashSaleId,
              product_id: item.product_id,
              flash_price: item.flash_price,
              original_price: item.original_price,
              stock_limit: item.stock_limit,
            });
          } else {
            await supabase
              .from('flash_sale_items')
              .update({
                flash_price: item.flash_price,
                stock_limit: item.stock_limit,
              })
              .eq('id', item.id);
          }
        }
      }

      toast({ title: `Flash sale berhasil ${flashSale ? 'diperbarui' : 'dibuat'}` });
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const addProduct = (product: Product) => {
    if (items.find((i) => i.product_id === product.id)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Produk sudah ditambahkan',
      });
      return;
    }

    const primaryImage =
      product.product_images?.find((img) => img.is_primary)?.image_url ||
      product.product_images?.[0]?.image_url;

    setItems([
      ...items,
      {
        id: `new-${Date.now()}`,
        product_id: product.id,
        flash_price: Math.round(product.price * 0.8), // Default 20% discount
        original_price: product.price,
        stock_limit: Math.min(product.stock_quantity || 10, 50),
        sold_count: 0,
        product_name: product.name,
        product_image: primaryImage,
      },
    ]);
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.product_id !== productId));
  };

  const updateItem = (productId: string, field: 'flash_price' | 'stock_limit', value: number) => {
    setItems(
      items.map((i) =>
        i.product_id === productId ? { ...i, [field]: value } : i
      )
    );
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !items.find((i) => i.product_id === p.id)
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{flashSale ? 'Edit Flash Sale' : 'Tambah Flash Sale'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informasi</TabsTrigger>
            <TabsTrigger value="products">Produk ({items.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Nama Flash Sale *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Flash Sale Weekend"
                />
              </div>

              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi flash sale..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Waktu Mulai *</Label>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Waktu Selesai *</Label>
                  <Input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4 mt-4">
            {/* Search Products */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari produk untuk ditambahkan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Available Products */}
            {searchQuery && (
              <Card>
                <CardContent className="pt-4 max-h-48 overflow-y-auto">
                  {loadingProducts ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Tidak ada produk ditemukan
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredProducts.slice(0, 10).map((product) => {
                        const primaryImage =
                          product.product_images?.find((img) => img.is_primary)?.image_url ||
                          product.product_images?.[0]?.image_url;
                        return (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                            onClick={() => addProduct(product)}
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={primaryImage || '/placeholder.svg'}
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                              <div>
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Rp {product.price.toLocaleString('id-ID')} · Stok: {product.stock_quantity || 0}
                                </p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Selected Items */}
            {items.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead>Harga Asli</TableHead>
                      <TableHead>Harga Flash</TableHead>
                      <TableHead>Diskon</TableHead>
                      <TableHead>Limit Stok</TableHead>
                      <TableHead>Terjual</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const discountPercentage = Math.round(
                        ((item.original_price - item.flash_price) / item.original_price) * 100
                      );
                      const stockProgress = (item.sold_count / item.stock_limit) * 100;
                      return (
                        <TableRow key={item.product_id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <img
                                src={item.product_image || '/placeholder.svg'}
                                alt={item.product_name}
                                className="w-10 h-10 rounded object-cover"
                              />
                              <span className="font-medium text-sm line-clamp-1">{item.product_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            Rp {item.original_price.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.flash_price}
                              onChange={(e) =>
                                updateItem(item.product_id, 'flash_price', Number(e.target.value))
                              }
                              className="w-32"
                              min={1}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={discountPercentage >= 50 ? 'destructive' : 'secondary'}>
                              -{discountPercentage}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.stock_limit}
                              onChange={(e) =>
                                updateItem(item.product_id, 'stock_limit', Number(e.target.value))
                              }
                              className="w-20"
                              min={1}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 w-20">
                              <Progress value={stockProgress} className="h-2" />
                              <span className="text-xs">{item.sold_count}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.product_id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada produk ditambahkan</p>
                <p className="text-sm">Cari dan pilih produk di atas</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {flashSale ? 'Simpan Perubahan' : 'Buat Flash Sale'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
