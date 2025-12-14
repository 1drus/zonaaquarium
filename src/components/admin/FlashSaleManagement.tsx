import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Plus, Pencil, Trash2, Zap, Clock, TrendingUp, Package, Search, Loader2 } from 'lucide-react';
import { FlashSaleDialog } from './FlashSaleDialog';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface FlashSale {
  id: string;
  name: string;
  description: string | null;
  banner_image_url: string | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  items_count?: number;
  total_sold?: number;
  total_revenue?: number;
}

export function FlashSaleManagement() {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [filteredFlashSales, setFilteredFlashSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFlashSale, setSelectedFlashSale] = useState<FlashSale | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadFlashSales();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredFlashSales(
        flashSales.filter((fs) =>
          fs.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredFlashSales(flashSales);
    }
  }, [searchQuery, flashSales]);

  const loadFlashSales = async () => {
    try {
      // Get flash sales with aggregated data
      const { data: salesData, error: salesError } = await supabase
        .from('flash_sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // Get items data for each flash sale
      const salesWithStats = await Promise.all(
        (salesData || []).map(async (sale) => {
          const { data: items } = await supabase
            .from('flash_sale_items')
            .select('sold_count, flash_price')
            .eq('flash_sale_id', sale.id);

          const itemsCount = items?.length || 0;
          const totalSold = items?.reduce((acc, item) => acc + item.sold_count, 0) || 0;
          const totalRevenue = items?.reduce((acc, item) => acc + (item.sold_count * item.flash_price), 0) || 0;

          return {
            ...sale,
            items_count: itemsCount,
            total_sold: totalSold,
            total_revenue: totalRevenue,
          };
        })
      );

      setFlashSales(salesWithStats);
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

  const getStatus = (sale: FlashSale) => {
    const now = new Date();
    const start = new Date(sale.start_time);
    const end = new Date(sale.end_time);

    if (!sale.is_active) return { label: 'Nonaktif', variant: 'secondary' as const };
    if (now < start) return { label: 'Terjadwal', variant: 'outline' as const };
    if (now > end) return { label: 'Berakhir', variant: 'destructive' as const };
    return { label: 'Berlangsung', variant: 'default' as const };
  };

  const handleEdit = (sale: FlashSale) => {
    setSelectedFlashSale(sale);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedFlashSale(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus flash sale ini? Semua produk di dalamnya akan dihapus.')) return;

    const { error } = await supabase.from('flash_sales').delete().eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({ title: 'Flash sale berhasil dihapus' });
      loadFlashSales();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('flash_sales')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({ title: `Flash sale ${!isActive ? 'diaktifkan' : 'dinonaktifkan'}` });
      loadFlashSales();
    }
  };

  // Calculate analytics
  const totalActiveSales = flashSales.filter(
    (s) => s.is_active && new Date(s.start_time) <= new Date() && new Date(s.end_time) >= new Date()
  ).length;
  const totalProducts = flashSales.reduce((acc, s) => acc + (s.items_count || 0), 0);
  const totalSold = flashSales.reduce((acc, s) => acc + (s.total_sold || 0), 0);
  const totalRevenue = flashSales.reduce((acc, s) => acc + (s.total_revenue || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-destructive/10 p-3 rounded-full">
                <Zap className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Flash Sale Aktif</p>
                <p className="text-2xl font-bold">{totalActiveSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Produk</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Terjual</p>
                <p className="text-2xl font-bold">{totalSold}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-secondary/10 p-3 rounded-full">
                <Clock className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                <p className="text-2xl font-bold">Rp {totalRevenue.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flash Sales List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Kelola Flash Sale
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari flash sale..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Flash Sale
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Penjualan</TableHead>
                  <TableHead>Pendapatan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFlashSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Belum ada flash sale
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFlashSales.map((sale) => {
                    const status = getStatus(sale);
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{format(new Date(sale.start_time), 'dd MMM yyyy HH:mm', { locale: localeId })}</div>
                            <div className="text-muted-foreground">
                              s/d {format(new Date(sale.end_time), 'dd MMM yyyy HH:mm', { locale: localeId })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{sale.items_count || 0}</TableCell>
                        <TableCell>{sale.total_sold || 0}</TableCell>
                        <TableCell>Rp {(sale.total_revenue || 0).toLocaleString('id-ID')}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(sale.id, sale.is_active)}
                            >
                              {sale.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(sale)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(sale.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FlashSaleDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedFlashSale(null);
          loadFlashSales();
        }}
        flashSale={selectedFlashSale}
      />
    </div>
  );
}
