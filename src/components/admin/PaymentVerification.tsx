import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Eye, CheckCircle, XCircle, Clock, Loader2, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  payment_method: string;
  payment_proof_url: string | null;
  payment_status: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  profiles: {
    full_name: string;
  };
}

export function PaymentVerification() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, statusFilter, orders]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          payment_method,
          payment_proof_url,
          payment_status,
          status,
          created_at,
          paid_at,
          user_id
        `)
        .not('payment_proof_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(data?.map(o => o.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const ordersWithProfiles = (data || []).map(order => ({
        ...order,
        profiles: profilesMap.get(order.user_id) || { full_name: 'User' }
      }));

      setOrders(ordersWithProfiles as Order[]);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.payment_status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.order_number.toLowerCase().includes(query) ||
          order.profiles?.full_name.toLowerCase().includes(query)
      );
    }

    setFilteredOrders(filtered);
  };

  const handleVerifyPayment = async () => {
    if (!selectedOrder) return;

    setProcessing(true);
    try {
      const updates: any = {
        admin_notes: adminNotes || null,
      };

      if (verifyAction === 'approve') {
        updates.payment_status = 'paid';
        updates.status = 'diproses';
        updates.paid_at = new Date().toISOString();
      } else {
        updates.payment_status = 'failed';
        updates.payment_proof_url = null;
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast.success(
        verifyAction === 'approve'
          ? 'Pembayaran berhasil diverifikasi'
          : 'Pembayaran ditolak'
      );

      setVerifyDialogOpen(false);
      setAdminNotes('');
      loadOrders();
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast.error(error.message || 'Gagal memverifikasi pembayaran');
    } finally {
      setProcessing(false);
    }
  };

  const openVerifyDialog = (order: Order, action: 'approve' | 'reject') => {
    setSelectedOrder(order);
    setVerifyAction(action);
    setAdminNotes('');
    setVerifyDialogOpen(true);
  };

  const openImageDialog = (order: Order) => {
    setSelectedOrder(order);
    setImageDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      pending: { label: 'Menunggu Verifikasi', variant: 'secondary' },
      paid: { label: 'Terverifikasi', variant: 'default' },
      failed: { label: 'Ditolak', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
              <Receipt className="h-5 w-5 text-primary" />
              <CardTitle>Verifikasi Pembayaran</CardTitle>
            </div>
            <Badge variant="outline">
              {filteredOrders.length} pembayaran
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor order atau nama customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Menunggu Verifikasi</SelectItem>
                <SelectItem value="paid">Terverifikasi</SelectItem>
                <SelectItem value="failed">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Tidak ada data pembayaran
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>{order.profiles?.full_name || '-'}</TableCell>
                      <TableCell>
                        Rp {order.total_amount.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.payment_method}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(order.created_at), 'dd MMM yyyy', { locale: id })}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.payment_status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openImageDialog(order)}
                            title="Lihat bukti transfer"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.payment_status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openVerifyDialog(order, 'approve')}
                                title="Terima pembayaran"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openVerifyDialog(order, 'reject')}
                                title="Tolak pembayaran"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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

      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bukti Pembayaran</DialogTitle>
            <DialogDescription>
              Order: {selectedOrder?.order_number}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder?.payment_proof_url && (
            <div className="max-h-[70vh] overflow-auto">
              <img
                src={selectedOrder.payment_proof_url}
                alt="Bukti pembayaran"
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
          <DialogFooter>
            {selectedOrder?.payment_status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImageDialogOpen(false);
                    openVerifyDialog(selectedOrder, 'reject');
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Tolak
                </Button>
                <Button
                  onClick={() => {
                    setImageDialogOpen(false);
                    openVerifyDialog(selectedOrder, 'approve');
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Terima
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Payment Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verifyAction === 'approve' ? 'Terima Pembayaran' : 'Tolak Pembayaran'}
            </DialogTitle>
            <DialogDescription>
              Order: {selectedOrder?.order_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Pembayaran</p>
              <p className="text-2xl font-bold">
                Rp {selectedOrder?.total_amount.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Catatan Admin {verifyAction === 'reject' && '(Wajib)'}
              </label>
              <Textarea
                placeholder={
                  verifyAction === 'approve'
                    ? 'Tambahkan catatan jika diperlukan...'
                    : 'Berikan alasan penolakan...'
                }
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>

            {verifyAction === 'approve' ? (
              <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg text-sm">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-green-800 dark:text-green-200">
                  <p className="font-medium">Pembayaran akan diterima</p>
                  <p>Order akan diubah ke status "Diproses"</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg text-sm">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-red-800 dark:text-red-200">
                  <p className="font-medium">Pembayaran akan ditolak</p>
                  <p>Bukti pembayaran akan dihapus dan customer perlu upload ulang</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVerifyDialogOpen(false)}
              disabled={processing}
            >
              Batal
            </Button>
            <Button
              onClick={handleVerifyPayment}
              disabled={processing || (verifyAction === 'reject' && !adminNotes.trim())}
              variant={verifyAction === 'approve' ? 'default' : 'destructive'}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {verifyAction === 'approve' ? 'Terima Pembayaran' : 'Tolak Pembayaran'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
