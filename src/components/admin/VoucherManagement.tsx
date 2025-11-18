import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { VoucherDialog } from './VoucherDialog';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Ticket, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Voucher {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_purchase: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number | null;
  user_usage_limit: number | null;
  valid_from: string;
  valid_until: string;
  is_active: boolean | null;
  created_at: string;
  allowed_tiers: string[] | null;
}

export function VoucherManagement() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [filteredVouchers, setFilteredVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadVouchers();
  }, []);

  useEffect(() => {
    filterVouchers();
  }, [searchQuery, vouchers]);

  const loadVouchers = async () => {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVouchers(data || []);
    } catch (error) {
      console.error('Error loading vouchers:', error);
      toast.error('Gagal memuat voucher');
    } finally {
      setLoading(false);
    }
  };

  const filterVouchers = () => {
    if (!searchQuery.trim()) {
      setFilteredVouchers(vouchers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = vouchers.filter(
      (voucher) =>
        voucher.code.toLowerCase().includes(query) ||
        voucher.description?.toLowerCase().includes(query)
    );
    setFilteredVouchers(filtered);
  };

  const handleEdit = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!voucherToDelete) return;

    try {
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', voucherToDelete);

      if (error) throw error;

      toast.success('Voucher berhasil dihapus');
      loadVouchers();
    } catch (error) {
      console.error('Error deleting voucher:', error);
      toast.error('Gagal menghapus voucher');
    } finally {
      setDeleteDialogOpen(false);
      setVoucherToDelete(null);
    }
  };

  const getDiscountDisplay = (voucher: Voucher) => {
    if (voucher.discount_type === 'percentage') {
      return `${voucher.discount_value}%`;
    }
    return `Rp ${voucher.discount_value.toLocaleString('id-ID')}`;
  };

  const isVoucherActive = (voucher: Voucher) => {
    if (!voucher.is_active) return false;
    const now = new Date();
    const validFrom = new Date(voucher.valid_from);
    const validUntil = new Date(voucher.valid_until);
    return now >= validFrom && now <= validUntil;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              <CardTitle>Manajemen Voucher</CardTitle>
            </div>
            <Button onClick={() => {
              setSelectedVoucher(null);
              setDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Voucher
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kode atau deskripsi voucher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Diskon</TableHead>
                  <TableHead>Min. Belanja</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Penggunaan</TableHead>
                  <TableHead>Berlaku</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Tidak ada voucher
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVouchers.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell className="font-mono font-bold">
                        {voucher.code}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {voucher.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getDiscountDisplay(voucher)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {voucher.min_purchase
                          ? `Rp ${voucher.min_purchase.toLocaleString('id-ID')}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {voucher.allowed_tiers && voucher.allowed_tiers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {voucher.allowed_tiers.map((tier) => (
                              <Badge key={tier} variant="outline" className="text-xs">
                                {tier}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Semua Tier</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {voucher.usage_count || 0}
                        {voucher.usage_limit ? ` / ${voucher.usage_limit}` : ''}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{format(new Date(voucher.valid_from), 'dd MMM yyyy', { locale: id })}</div>
                        <div className="text-muted-foreground">
                          s/d {format(new Date(voucher.valid_until), 'dd MMM yyyy', { locale: id })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isVoucherActive(voucher) ? (
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
                            onClick={() => handleEdit(voucher)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setVoucherToDelete(voucher.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <VoucherDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        voucher={selectedVoucher}
        onSuccess={loadVouchers}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Voucher?</AlertDialogTitle>
            <AlertDialogDescription>
              Voucher yang sudah dihapus tidak dapat dikembalikan. Yakin ingin menghapus?
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
