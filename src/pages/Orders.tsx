import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { OrderCard } from '@/components/orders/OrderCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package } from 'lucide-react';

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
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Order change detected:', payload);
          // Reload orders when any change occurs
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
          <h1 className="text-3xl font-bold mb-8">Pesanan Saya</h1>

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
