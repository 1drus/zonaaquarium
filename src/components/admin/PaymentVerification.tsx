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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, CreditCard, CheckCircle, Clock, XCircle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  payment_method: string | null;
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
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadOrders();
    
    // Set up realtime subscription for order updates
    const channel = supabase
      .channel('payment-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Payment status change:', payload);
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
          payment_status,
          status,
          created_at,
          paid_at,
          user_id
        `)
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

  const getStatusBadge = (paymentStatus: string) => {
    const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
      pending: { label: 'Menunggu Pembayaran', variant: 'secondary', icon: Clock },
      paid: { label: 'Lunas', variant: 'default', icon: CheckCircle },
      failed: { label: 'Gagal', variant: 'destructive', icon: XCircle },
      expired: { label: 'Kadaluarsa', variant: 'outline', icon: XCircle },
    };

    const config = statusConfig[paymentStatus] || { label: paymentStatus, variant: 'secondary', icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentMethodBadge = (method: string | null) => {
    if (!method) return <span className="text-muted-foreground">-</span>;
    
    const methodLabels: Record<string, string> = {
      'credit_card': 'Kartu Kredit',
      'bank_transfer': 'Transfer Bank',
      'echannel': 'Mandiri Bill',
      'bca_va': 'BCA VA',
      'bni_va': 'BNI VA',
      'bri_va': 'BRI VA',
      'permata_va': 'Permata VA',
      'gopay': 'GoPay',
      'shopeepay': 'ShopeePay',
      'qris': 'QRIS',
      'cstore': 'Convenience Store',
      'akulaku': 'Akulaku',
      'kredivo': 'Kredivo',
    };

    return <Badge variant="outline">{methodLabels[method] || method}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.payment_status === 'pending').length,
    paid: orders.filter(o => o.payment_status === 'paid').length,
    failed: orders.filter(o => o.payment_status === 'failed' || o.payment_status === 'expired').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Transaksi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Menunggu Bayar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">Lunas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Gagal/Expired</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Status Pembayaran Midtrans</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadOrders}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Badge variant="outline">
                {filteredOrders.length} transaksi
              </Badge>
            </div>
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
                <SelectItem value="pending">Menunggu Bayar</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
                <SelectItem value="failed">Gagal</SelectItem>
                <SelectItem value="expired">Kadaluarsa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Metode Bayar</TableHead>
                  <TableHead>Tanggal Order</TableHead>
                  <TableHead>Tanggal Bayar</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Tidak ada data transaksi
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
                        {getPaymentMethodBadge(order.payment_method)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(order.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.paid_at 
                          ? format(new Date(order.paid_at), 'dd MMM yyyy HH:mm', { locale: id })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>{getStatusBadge(order.payment_status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Pembayaran Otomatis via Midtrans</p>
                <p className="text-muted-foreground">
                  Semua pembayaran diproses secara otomatis melalui Midtrans. Status akan diperbarui secara real-time 
                  ketika customer menyelesaikan pembayaran. Invoice akan dikirim otomatis ke email customer setelah pembayaran berhasil.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}