import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Package, ShoppingCart, Users, TrendingUp, Clock } from 'lucide-react';

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  totalUsers: number;
  recentOrders: Array<{
    order_number: string;
    total_amount: number;
    status: string;
    created_at: string;
  }>;
}

export function AdminStats() {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get total revenue and orders
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status, order_number, created_at')
        .order('created_at', { ascending: false });

      const totalRevenue = orders?.reduce((sum, order) => {
        if (order.status !== 'dibatalkan') {
          return sum + Number(order.total_amount);
        }
        return sum;
      }, 0) || 0;

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'menunggu_pembayaran').length || 0;
      const recentOrders = orders?.slice(0, 5) || [];

      // Get total products
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalRevenue,
        totalOrders,
        pendingOrders,
        totalProducts: productsCount || 0,
        totalUsers: usersCount || 0,
        recentOrders,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Pendapatan',
      value: `Rp ${stats.totalRevenue.toLocaleString('id-ID')}`,
      icon: DollarSign,
      description: 'Total pendapatan dari semua pesanan',
    },
    {
      title: 'Total Pesanan',
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      description: 'Jumlah pesanan yang masuk',
    },
    {
      title: 'Pesanan Pending',
      value: stats.pendingOrders.toString(),
      icon: Clock,
      description: 'Menunggu pembayaran',
    },
    {
      title: 'Total Produk',
      value: stats.totalProducts.toString(),
      icon: Package,
      description: 'Produk yang tersedia',
    },
    {
      title: 'Total Pengguna',
      value: stats.totalUsers.toString(),
      icon: Users,
      description: 'Pengguna terdaftar',
    },
  ];

  if (loading) {
    return <p className="text-muted-foreground">Memuat statistik...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Pesanan Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentOrders.map((order) => (
              <div key={order.order_number} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div>
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Rp {Number(order.total_amount).toLocaleString('id-ID')}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {order.status.replace('_', ' ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
