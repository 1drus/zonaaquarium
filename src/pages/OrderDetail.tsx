import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { PaymentProofUpload } from '@/components/orders/PaymentProofUpload';
import { ArrowLeft, Download, Package, MapPin, Truck, CreditCard } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  payment_proof_url: string | null;
  payment_deadline: string | null;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_method: string;
  shipping_cost: number;
  subtotal: number;
  discount_amount: number | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  order_items: Array<{
    id: string;
    product_name: string;
    product_slug: string;
    product_image_url: string | null;
    price: number;
    discount_percentage: number | null;
    quantity: number;
    subtotal: number;
  }>;
}

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadOrder();
  }, [id, user, navigate]);

  const loadOrder = async () => {
    if (!user || !id) return;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setOrder(data as OrderDetail);
    } else {
      navigate('/orders');
    }
    setLoading(false);
  };

  const handlePrintInvoice = () => {
    window.print();
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

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8 bg-background">
        <div className="container max-w-5xl">
          <Button
            variant="ghost"
            onClick={() => navigate('/orders')}
            className="mb-6 print:hidden"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Pesanan
          </Button>

          {/* Order Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Order {order.order_number}</h1>
              <p className="text-sm text-muted-foreground">
                Dibuat pada {new Date(order.created_at).toLocaleString('id-ID', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <OrderStatusBadge status={order.status} />
              <OrderStatusBadge status={order.payment_status} isPaymentStatus />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* Payment Proof Upload */}
              {order.status === 'menunggu_pembayaran' && order.payment_status === 'pending' && (
                <PaymentProofUpload
                  orderId={order.id}
                  currentProofUrl={order.payment_proof_url}
                  paymentDeadline={order.payment_deadline}
                  onUploadSuccess={loadOrder}
                />
              )}

              {/* Order Timeline */}
              <OrderTimeline order={order} />

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produk yang Dipesan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <img
                        src={item.product_image_url || '/placeholder.svg'}
                        alt={item.product_name}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x Rp {item.price.toLocaleString('id-ID')}
                          {item.discount_percentage && (
                            <span className="text-destructive ml-2">
                              (-{item.discount_percentage}%)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          Rp {item.subtotal.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Alamat Pengiriman
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{order.recipient_name}</p>
                  <p className="text-sm text-muted-foreground">{order.recipient_phone}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {order.shipping_address}
                  </p>
                </CardContent>
              </Card>

              {/* Shipping Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Pengiriman
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between">
                    <span className="text-sm">{order.shipping_method}</span>
                    <span className="text-sm font-semibold">
                      Rp {order.shipping_cost.toLocaleString('id-ID')}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pembayaran
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm capitalize">
                    {order.payment_method?.replace('-', ' ') || 'Belum dipilih'}
                  </p>
                </CardContent>
              </Card>

              {/* Price Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ringkasan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>Rp {order.subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  {order.discount_amount && order.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Diskon</span>
                      <span>-Rp {order.discount_amount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ongkir</span>
                    <span>Rp {order.shipping_cost.toLocaleString('id-ID')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                      Rp {order.total_amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Print Invoice */}
              <Button variant="outline" className="w-full print:hidden" onClick={handlePrintInvoice}>
                <Download className="mr-2 h-4 w-4" />
                Cetak Invoice
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
