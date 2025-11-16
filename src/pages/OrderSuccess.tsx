import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Package, 
  Copy,
  Home,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface OrderData {
  id: string;
  order_number: string;
  total_amount: number;
  payment_method: string;
  payment_deadline: string;
  status: string;
  created_at: string;
}

export default function OrderSuccess() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) {
      navigate('/');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, payment_method, payment_deadline, status, created_at')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Gagal memuat data pesanan');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const copyOrderNumber = () => {
    if (order) {
      navigator.clipboard.writeText(order.order_number);
      toast.success('Nomor order disalin');
    }
  };

  const getPaymentInstructions = () => {
    if (!order) return null;

    const bankAccounts: Record<string, { name: string; account: string; accountName: string }> = {
      'BCA': { name: 'BCA', account: '1234567890', accountName: 'Zaifara Aquatic' },
      'Mandiri': { name: 'Mandiri', account: '0987654321', accountName: 'Zaifara Aquatic' },
      'BNI': { name: 'BNI', account: '5678901234', accountName: 'Zaifara Aquatic' },
    };

    const selectedBank = bankAccounts[order.payment_method];

    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Penting: Lakukan pembayaran sebelum batas waktu
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              Pesanan akan otomatis dibatalkan jika pembayaran tidak diterima sebelum{' '}
              {format(new Date(order.payment_deadline), 'dd MMM yyyy, HH:mm', { locale: id })}
            </p>
          </div>
        </div>

        {selectedBank && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Transfer Bank {selectedBank.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Nomor Rekening</p>
                <div className="flex items-center justify-between p-3 bg-secondary rounded-md">
                  <p className="font-mono font-bold text-lg">{selectedBank.account}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedBank.account);
                      toast.success('Nomor rekening disalin');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Nama Penerima</p>
                <p className="font-medium">{selectedBank.accountName}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Jumlah Transfer</p>
                <div className="flex items-center justify-between p-3 bg-secondary rounded-md">
                  <p className="font-bold text-xl text-primary">
                    Rp {order.total_amount.toLocaleString('id-ID')}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(order.total_amount.toString());
                      toast.success('Jumlah transfer disalin');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <p className="font-medium">Langkah-langkah:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Transfer sesuai jumlah yang tertera</li>
                  <li>Simpan bukti transfer</li>
                  <li>Upload bukti transfer di halaman detail pesanan</li>
                  <li>Tunggu konfirmasi dari admin (maksimal 1x24 jam)</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
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
      <main className="flex-1 bg-background py-8">
        <div className="container max-w-3xl">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Pesanan Berhasil Dibuat!</h1>
            <p className="text-muted-foreground">
              Terima kasih atas pesanan Anda. Silakan lakukan pembayaran untuk melanjutkan.
            </p>
          </div>

          {/* Order Number Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Nomor Pesanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                  <p className="font-mono font-bold text-2xl">{order.order_number}</p>
                </div>
                <Button variant="outline" size="sm" onClick={copyOrderNumber}>
                  <Copy className="h-4 w-4 mr-2" />
                  Salin
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Deadline Alert */}
          <Alert className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <span className="font-medium">Batas Pembayaran: </span>
              {format(new Date(order.payment_deadline), 'dd MMMM yyyy, HH:mm', { locale: id })} WIB
            </AlertDescription>
          </Alert>

          {/* Payment Instructions */}
          {getPaymentInstructions()}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button 
              className="flex-1" 
              size="lg"
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <Eye className="mr-2 h-5 w-5" />
              Lihat Detail Pesanan
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              size="lg"
              onClick={() => navigate('/')}
            >
              <Home className="mr-2 h-5 w-5" />
              Kembali ke Beranda
            </Button>
          </div>

          {/* Additional Info */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                Jika ada pertanyaan, hubungi customer service kami melalui WhatsApp atau email.
                Pesanan Anda akan diproses setelah pembayaran dikonfirmasi.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
