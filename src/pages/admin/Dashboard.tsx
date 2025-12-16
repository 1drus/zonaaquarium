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
import { SystemSettings } from '@/components/admin/SystemSettings';
import { TierConfigManagement } from '@/components/admin/TierConfigManagement';
import { FlashSaleManagement } from '@/components/admin/FlashSaleManagement';
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
              <div className="flex flex-col gap-2 min-w-max md:min-w-0">
                {/* Row 1: Overview & Analytics */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[80px]">Overview</span>
                  <TabsList className="h-9">
                    <TabsTrigger value="stats" className="text-xs">Statistik</TabsTrigger>
                    <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
                  </TabsList>
                </div>

                {/* Row 2: Catalog Management */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[80px]">Katalog</span>
                  <TabsList className="h-9">
                    <TabsTrigger value="products" className="text-xs">Produk</TabsTrigger>
                    <TabsTrigger value="categories" className="text-xs">Kategori</TabsTrigger>
                    <TabsTrigger value="stock" className="text-xs">Stok</TabsTrigger>
                  </TabsList>
                </div>

                {/* Row 3: Sales & Orders */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[80px]">Penjualan</span>
                  <TabsList className="h-9">
                    <TabsTrigger value="orders" className="text-xs">Pesanan</TabsTrigger>
                    <TabsTrigger value="payment" className="text-xs">Pembayaran</TabsTrigger>
                    <TabsTrigger value="flash-sale" className="text-xs">Flash Sale</TabsTrigger>
                  </TabsList>
                </div>

                {/* Row 4: Marketing & Engagement */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[80px]">Marketing</span>
                  <TabsList className="h-9">
                    <TabsTrigger value="vouchers" className="text-xs">Voucher</TabsTrigger>
                    <TabsTrigger value="tiers" className="text-xs">Tier Member</TabsTrigger>
                    <TabsTrigger value="reviews" className="text-xs">Reviews</TabsTrigger>
                  </TabsList>
                </div>

                {/* Row 5: System */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[80px]">Sistem</span>
                  <TabsList className="h-9">
                    <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
                    <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
                  </TabsList>
                </div>
              </div>
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

            <TabsContent value="stock">
              <LowStockAlerts />
            </TabsContent>

            <TabsContent value="orders">
              <OrderManagement />
            </TabsContent>

            <TabsContent value="payment">
              <PaymentVerification />
            </TabsContent>

            <TabsContent value="flash-sale">
              <FlashSaleManagement />
            </TabsContent>

            <TabsContent value="vouchers">
              <VoucherManagement />
            </TabsContent>

            <TabsContent value="tiers">
              <TierConfigManagement />
            </TabsContent>

            <TabsContent value="reviews">
              <ReviewManagement />
            </TabsContent>

            <TabsContent value="users">
              <UserManagement />
            </TabsContent>

            <TabsContent value="settings">
              <SystemSettings />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
