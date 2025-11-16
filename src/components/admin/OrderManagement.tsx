import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  cancellation_requested: boolean;
  cancellation_request_reason: string | null;
  profiles: {
    full_name: string;
  };
}

export function OrderManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    let filtered = orders;

    if (searchQuery) {
      filtered = filtered.filter(o =>
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, orders]);

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        total_amount,
        created_at,
        user_id,
        cancellation_requested,
        cancellation_request_reason
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch user profiles separately
      const userIds = [...new Set(data.map(o => o.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const ordersWithProfiles = data.map(order => ({
        ...order,
        profiles: profilesMap.get(order.user_id) || { full_name: 'User' }
      }));

      setOrders(ordersWithProfiles as Order[]);
      setFilteredOrders(ordersWithProfiles as Order[]);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const updateData: any = { status: newStatus };

    // Update timestamps based on status
    if (newStatus === 'diproses') {
      updateData.paid_at = new Date().toISOString();
      updateData.payment_status = 'paid';
    } else if (newStatus === 'dikirim') {
      updateData.shipped_at = new Date().toISOString();
    } else if (newStatus === 'selesai') {
      updateData.completed_at = new Date().toISOString();
    } else if (newStatus === 'dibatalkan') {
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancellation_requested = false; // Clear cancellation request
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal update status',
        description: error.message,
      });
    } else {
      toast({
        title: 'Status diperbarui',
        description: 'Status pesanan berhasil diperbarui',
      });
      loadOrders();
    }
  };

  const handleRejectCancellation = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({
        cancellation_requested: false,
        cancellation_request_reason: null,
        cancellation_request_date: null,
      })
      .eq('id', orderId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal menolak pembatalan',
        description: error.message,
      });
    } else {
      toast({
        title: 'Permintaan ditolak',
        description: 'Permintaan pembatalan telah ditolak',
      });
      loadOrders();
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Memuat pesanan...</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pesanan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="menunggu_pembayaran">Menunggu Pembayaran</SelectItem>
                <SelectItem value="diproses">Diproses</SelectItem>
                <SelectItem value="dikirim">Dikirim</SelectItem>
                <SelectItem value="selesai">Selesai</SelectItem>
                <SelectItem value="dibatalkan">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Pesanan</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Permintaan</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.profiles.full_name}</TableCell>
                    <TableCell>Rp {Number(order.total_amount).toLocaleString('id-ID')}</TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleUpdateStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="menunggu_pembayaran">Menunggu Pembayaran</SelectItem>
                          <SelectItem value="diproses">Diproses</SelectItem>
                          <SelectItem value="dikirim">Dikirim</SelectItem>
                          <SelectItem value="selesai">Selesai</SelectItem>
                          <SelectItem value="dibatalkan">Dibatalkan</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {order.payment_status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell>
                      {order.cancellation_requested ? (
                        <div className="space-y-2 min-w-[180px]">
                          <Badge variant="destructive" className="w-full justify-center">
                            Pembatalan Diminta
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUpdateStatus(order.id, 'dibatalkan')}
                              className="flex-1 text-xs"
                            >
                              Setujui
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectCancellation(order.id)}
                              className="flex-1 text-xs"
                            >
                              Tolak
                            </Button>
                          </div>
                          {order.cancellation_request_reason && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {order.cancellation_request_reason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
