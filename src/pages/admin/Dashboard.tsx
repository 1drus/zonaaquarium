import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminStats } from '@/components/admin/AdminStats';
import { ProductManagement } from '@/components/admin/ProductManagement';
import { OrderManagement } from '@/components/admin/OrderManagement';
import { ReviewManagement } from '@/components/admin/ReviewManagement';
import { VoucherManagement } from '@/components/admin/VoucherManagement';
import { PaymentVerification } from '@/components/admin/PaymentVerification';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { AdvancedAnalytics } from '@/components/admin/AdvancedAnalytics';
import { UserManagement } from '@/components/admin/UserManagement';
import { LowStockAlerts } from '@/components/admin/LowStockAlerts';
import { Loader2, Shield } from 'lucide-react';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, [user, isAdmin]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!isAdmin) {
      navigate('/');
      return;
    }

    setLoading(false);
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
        <div className="container max-w-7xl">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Kelola toko dan pesanan</p>
            </div>
          </div>

          <Tabs defaultValue="stats" className="space-y-6">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-5 lg:grid-cols-10 gap-1">
                <TabsTrigger value="stats" className="whitespace-nowrap">Statistik</TabsTrigger>
                <TabsTrigger value="analytics" className="whitespace-nowrap">Analytics</TabsTrigger>
                <TabsTrigger value="products" className="whitespace-nowrap">Produk</TabsTrigger>
                <TabsTrigger value="categories" className="whitespace-nowrap">Kategori</TabsTrigger>
                <TabsTrigger value="orders" className="whitespace-nowrap">Pesanan</TabsTrigger>
                <TabsTrigger value="payment" className="whitespace-nowrap">Pembayaran</TabsTrigger>
                <TabsTrigger value="reviews" className="whitespace-nowrap">Reviews</TabsTrigger>
                <TabsTrigger value="vouchers" className="whitespace-nowrap">Voucher</TabsTrigger>
                <TabsTrigger value="users" className="whitespace-nowrap">Users</TabsTrigger>
                <TabsTrigger value="stock" className="whitespace-nowrap">Stok</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="stats">
              <AdminStats />
            </TabsContent>

            <TabsContent value="analytics">
              <AdvancedAnalytics />
            </TabsContent>

            <TabsContent value="products">
              <ProductManagement />
            </TabsContent>

            <TabsContent value="categories">
              <CategoryManagement />
            </TabsContent>

            <TabsContent value="orders">
              <OrderManagement />
            </TabsContent>

            <TabsContent value="payment">
              <PaymentVerification />
            </TabsContent>

            <TabsContent value="reviews">
              <ReviewManagement />
            </TabsContent>

            <TabsContent value="vouchers">
              <VoucherManagement />
            </TabsContent>

            <TabsContent value="users">
              <UserManagement />
            </TabsContent>

            <TabsContent value="stock">
              <LowStockAlerts />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
