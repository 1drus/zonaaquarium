import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Package } from 'lucide-react';

interface LowStockItem {
  id: string;
  name: string;
  type: 'product' | 'variant';
  stock: number;
  variant_name?: string;
  sku?: string;
}

export function LowStockAlerts() {
  const [threshold, setThreshold] = useState(10);
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLowStockItems();
  }, [threshold]);

  const loadLowStockItems = async () => {
    setLoading(true);
    const lowStockItems: LowStockItem[] = [];

    // Get low stock products
    const { data: products } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .lte('stock_quantity', threshold)
      .gte('stock_quantity', 0)
      .eq('is_active', true)
      .order('stock_quantity', { ascending: true });

    if (products) {
      lowStockItems.push(
        ...products.map((p) => ({
          id: p.id,
          name: p.name,
          type: 'product' as const,
          stock: p.stock_quantity || 0,
        }))
      );
    }

    // Get low stock variants
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, variant_name, sku, stock_quantity, product_id, products(name)')
      .lte('stock_quantity', threshold)
      .gte('stock_quantity', 0)
      .eq('is_active', true)
      .order('stock_quantity', { ascending: true });

    if (variants) {
      lowStockItems.push(
        ...variants.map((v: any) => ({
          id: v.id,
          name: v.products.name,
          type: 'variant' as const,
          stock: v.stock_quantity,
          variant_name: v.variant_name,
          sku: v.sku,
        }))
      );
    }

    // Sort by stock quantity
    lowStockItems.sort((a, b) => a.stock - b.stock);

    setItems(lowStockItems);
    setLoading(false);
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Habis</Badge>;
    } else if (stock <= threshold / 2) {
      return <Badge variant="destructive">Sangat Rendah</Badge>;
    } else {
      return <Badge className="bg-orange-500">Rendah</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Memuat data...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle>Peringatan Stok Rendah</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="threshold" className="text-sm whitespace-nowrap">
                Threshold:
              </Label>
              <Input
                id="threshold"
                type="number"
                min="1"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-20"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Stok Aman</h3>
              <p className="text-muted-foreground">
                Tidak ada produk atau variant dengan stok di bawah threshold
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  {items.length} item memerlukan perhatian (stok ≤ {threshold})
                </span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="text-center">Stok</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell>
                        <Badge variant="outline">
                          {item.type === 'product' ? 'Produk' : 'Variant'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.type === 'variant' ? (
                          <div>
                            <div>{item.variant_name}</div>
                            {item.sku && (
                              <div className="text-xs">SKU: {item.sku}</div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {item.stock}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStockBadge(item.stock)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
