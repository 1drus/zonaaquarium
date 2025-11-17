import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { OrderCard } from '@/components/orders/OrderCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package, Wifi } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  order_items: Array<{
    product_name: string;
    product_image_url: string | null;
    quantity: number;
  }>;
}

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadOrders();

    // Set up realtime subscription for order updates
    const channel = supabase
      .channel('user-orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Order update detected:', payload);
          const newData = payload.new as Order;
          const oldData = payload.old as Order;
          
          // Show notification based on what changed
          if (newData.payment_status !== oldData.payment_status) {
            toast.success('Status Pembayaran Diperbarui', {
              description: `Pesanan ${newData.order_number} - ${getPaymentStatusText(newData.payment_status)}`
            });
          } else if (newData.status !== oldData.status) {
            toast.success('Status Pesanan Diperbarui', {
              description: `Pesanan ${newData.order_number} - ${getOrderStatusText(newData.status)}`
            });
          }
          
          // Reload orders when any change occurs
          loadOrders();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime connected for orders');
          setIsRealtimeConnected(true);
        } else if (status === 'CLOSED') {
          console.log('Realtime disconnected');
          setIsRealtimeConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsRealtimeConnected(false);
    };
  }, [user, navigate]);

  const loadOrders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        total_amount,
        created_at,
        order_items (
          product_name,
          product_image_url,
          quantity
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  const filterOrders = (status: string) => {
    if (status === 'all') return orders;
    return orders.filter(order => order.status === status);
  };

  const getTabCount = (status: string) => {
    if (status === 'all') return orders.length;
    return orders.filter(order => order.status === status).length;
  };

  const getOrderStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'menunggu_pembayaran': 'Menunggu Pembayaran',
      'diproses': 'Diproses',
      'dikirim': 'Dikirim',
      'selesai': 'Selesai',
      'dibatalkan': 'Dibatalkan'
    };
    return statusMap[status] || status;
  };

  const getPaymentStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Menunggu',
      'paid': 'Lunas',
      'failed': 'Gagal',
      'expired': 'Kedaluwarsa'
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8 bg-background">
        <div className="container max-w-5xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Pesanan Saya</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wifi className={`h-4 w-4 ${isRealtimeConnected ? 'text-green-500' : 'text-gray-400'}`} />
              <span>{isRealtimeConnected ? 'Live Updates' : 'Offline'}</span>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Belum Ada Pesanan</h2>
              <p className="text-muted-foreground mb-6">
                Yuk mulai belanja produk akuarium favorit Anda!
              </p>
              <button
                onClick={() => navigate('/products')}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                Mulai Belanja
              </button>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">
                  Semua ({getTabCount('all')})
                </TabsTrigger>
                <TabsTrigger value="menunggu_pembayaran">
                  Menunggu ({getTabCount('menunggu_pembayaran')})
                </TabsTrigger>
                <TabsTrigger value="diproses">
                  Diproses ({getTabCount('diproses')})
                </TabsTrigger>
                <TabsTrigger value="dikirim">
                  Dikirim ({getTabCount('dikirim')})
                </TabsTrigger>
                <TabsTrigger value="selesai">
                  Selesai ({getTabCount('selesai')})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4 mt-6">
                {filterOrders('all').map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </TabsContent>

              <TabsContent value="menunggu_pembayaran" className="space-y-4 mt-6">
                {filterOrders('menunggu_pembayaran').map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </TabsContent>

              <TabsContent value="diproses" className="space-y-4 mt-6">
                {filterOrders('diproses').map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </TabsContent>

              <TabsContent value="dikirim" className="space-y-4 mt-6">
                {filterOrders('dikirim').map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </TabsContent>

              <TabsContent value="selesai" className="space-y-4 mt-6">
                {filterOrders('selesai').map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
