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
import { ReviewDialog } from '@/components/orders/ReviewDialog';
import { CancellationRequest } from '@/components/orders/CancellationRequest';
import { InvoicePrintView } from '@/components/orders/InvoicePrintView';
import { ArrowLeft, FileText, Package, MapPin, Truck, CreditCard, Star, XCircle } from 'lucide-react';
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
  admin_notes: string | null;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_requested: boolean;
  cancellation_request_reason: string | null;
  order_items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    product_slug: string;
    product_image_url: string | null;
    variant_id: string | null;
    variant_name: string | null;
    variant_sku: string | null;
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
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [reviewedProducts, setReviewedProducts] = useState<Set<string>>(new Set());
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadOrder();
    if (order?.status === 'selesai') {
      loadReviews();
    }

    // Set up realtime subscription for this specific order
    if (id) {
      const channel = supabase
        .channel(`order-${id}-changes`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${id}`
          },
          (payload) => {
            console.log('Order detail change detected:', payload);
            loadOrder();
            
            // Show notification for status changes
            const newOrder = payload.new as any;
            if (newOrder.status !== order?.status) {
              // Status changed notification will be shown when order reloads
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id, user, navigate, order?.status]);

  const loadReviews = async () => {
    if (!user || !id) return;

    const { data } = await supabase
      .from('reviews')
      .select('product_id')
      .eq('user_id', user.id)
      .eq('order_id', id);

    if (data) {
      setReviewedProducts(new Set(data.map(r => r.product_id)));
    }
  };

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
    setShowInvoice(true);
  };

  const handleReview = (item: any) => {
    setSelectedProduct(item);
    setReviewDialogOpen(true);
  };

  const handleReviewClose = () => {
    setReviewDialogOpen(false);
    setSelectedProduct(null);
    loadReviews();
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
              {/* Cancellation Request Card */}
              {order.cancellation_requested && (
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-orange-800 dark:text-orange-200">
                      <XCircle className="h-5 w-5" />
                      Permintaan Pembatalan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-2 font-medium">
                      Status: Menunggu persetujuan admin
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      Alasan: {order.cancellation_request_reason}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-3">
                      Admin akan meninjau permintaan Anda dalam 1-2 hari kerja.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Payment Proof Upload */}
              {order.status === 'menunggu_pembayaran' && order.payment_status === 'pending' && (
                <PaymentProofUpload
                  orderId={order.id}
                  currentProofUrl={order.payment_proof_url}
                  paymentDeadline={order.payment_deadline}
                  onUploadSuccess={loadOrder}
                />
              )}

              {/* Admin Notes - Payment Rejected */}
              {order.admin_notes && order.payment_status === 'failed' && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-red-800 dark:text-red-200">
                      <CreditCard className="h-5 w-5" />
                      Pembayaran Ditolak
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-2 font-medium">
                      Alasan penolakan:
                    </p>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {order.admin_notes}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-3">
                      Silakan upload ulang bukti pembayaran yang valid.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Admin Notes - General */}
              {order.admin_notes && order.payment_status !== 'failed' && (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-blue-800 dark:text-blue-200">
                      <Package className="h-5 w-5" />
                      Catatan dari Admin
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {order.admin_notes}
                    </p>
                  </CardContent>
                </Card>
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
                  {order.order_items.map((item) => {
                    const hasReviewed = reviewedProducts.has(item.product_id);
                    return (
                      <div key={item.id} className="space-y-3">
                        <div className="flex gap-4">
                          <img
                            src={item.product_image_url || '/placeholder.svg'}
                            alt={item.product_name}
                            className="w-20 h-20 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            {item.variant_name && (
                              <p className="text-xs text-muted-foreground">
                                Varian: {item.variant_name}
                                {item.variant_sku && ` (SKU: ${item.variant_sku})`}
                              </p>
                            )}
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
                        {order.status === 'selesai' && !hasReviewed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReview(item)}
                            className="w-full"
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Tulis Review
                          </Button>
                        )}
                        {hasReviewed && (
                          <p className="text-sm text-muted-foreground text-center">
                            ✓ Sudah direview
                          </p>
                        )}
                      </div>
                    );
                  })}
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
                <FileText className="mr-2 h-4 w-4" />
                Lihat Invoice
              </Button>

              {/* Cancel Order Button */}
              {!order.cancellation_requested && 
               (order.status === 'menunggu_pembayaran' || order.status === 'diproses') && (
                <Button 
                  variant="destructive" 
                  className="w-full print:hidden" 
                  onClick={() => setCancellationDialogOpen(true)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Batalkan Pesanan
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Review Dialog */}
      {selectedProduct && (
        <ReviewDialog
          open={reviewDialogOpen}
          onClose={handleReviewClose}
          orderItem={selectedProduct}
          orderId={order!.id}
        />
      )}

      {/* Cancellation Request Dialog */}
      <CancellationRequest
        open={cancellationDialogOpen}
        onClose={() => setCancellationDialogOpen(false)}
        orderId={order.id}
        orderNumber={order.order_number}
        onSuccess={loadOrder}
      />

      {/* Invoice Print View */}
      {showInvoice && (
        <InvoicePrintView
          order={order}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </div>
  );
}
