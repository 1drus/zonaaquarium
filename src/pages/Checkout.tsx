import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CheckoutStepper } from '@/components/checkout/CheckoutStepper';
import { AddressStep } from '@/components/checkout/AddressStep';
import { ShippingStep } from '@/components/checkout/ShippingStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface Voucher {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
}

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    slug: string;
    price: number;
    discount_percentage: number | null;
    product_images: { image_url: string; is_primary: boolean }[];
  };
}

interface Address {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean | null;
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form data
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [shippingMethod, setShippingMethod] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(
    location.state?.voucher || null
  );

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadCartItems();
  }, [user, navigate]);

  const loadCartItems = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        quantity,
        products (
          id,
          name,
          slug,
          price,
          discount_percentage,
          product_images (image_url, is_primary)
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal memuat keranjang',
        description: error.message,
      });
      return;
    }

    if (!data || data.length === 0) {
      navigate('/cart');
      return;
    }

    setCartItems(data as CartItem[]);
    setLoading(false);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = item.products.price;
      const discount = item.products.discount_percentage || 0;
      const finalPrice = price - (price * discount / 100);
      return sum + (finalPrice * item.quantity);
    }, 0);
  };

  const calculateVoucherDiscount = (subtotal: number) => {
    if (!appliedVoucher) return 0;

    let discount = 0;
    if (appliedVoucher.discount_type === 'percentage') {
      discount = (subtotal * appliedVoucher.discount_value) / 100;
      if (appliedVoucher.max_discount && discount > appliedVoucher.max_discount) {
        discount = appliedVoucher.max_discount;
      }
    } else if (appliedVoucher.discount_type === 'fixed') {
      discount = appliedVoucher.discount_value;
    }
    return Math.min(discount, subtotal);
  };

  const handleSubmitOrder = async () => {
    if (!user || !selectedAddress) return;

    setSubmitting(true);
    
    try {
      const subtotal = calculateSubtotal();
      const voucherDiscount = calculateVoucherDiscount(subtotal);
      const totalAmount = subtotal - voucherDiscount + shippingCost;

      // Generate order number
      const { data: orderNumberData, error: orderNumberError } = await supabase
        .rpc('generate_order_number');

      if (orderNumberError) throw orderNumberError;

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          order_number: orderNumberData,
          recipient_name: selectedAddress.recipient_name,
          recipient_phone: selectedAddress.phone,
          shipping_address: `${selectedAddress.address_line}, ${selectedAddress.kelurahan}, ${selectedAddress.kecamatan}, ${selectedAddress.city}, ${selectedAddress.province} ${selectedAddress.postal_code}`,
          shipping_address_id: selectedAddress.id,
          shipping_method: shippingMethod,
          shipping_cost: shippingCost,
          subtotal: subtotal,
          discount_amount: voucherDiscount,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          notes: notes || null,
          status: 'menunggu_pembayaran',
          payment_status: 'pending',
          payment_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Record voucher usage if voucher was applied
      if (appliedVoucher) {
        const { error: voucherUsageError } = await supabase
          .from('voucher_usage')
          .insert({
            voucher_id: appliedVoucher.id,
            user_id: user.id,
            order_id: orderData.id,
            discount_amount: voucherDiscount,
          });

        if (voucherUsageError) {
          console.error('Error recording voucher usage:', voucherUsageError);
        }
      }

      // Create order items
      const orderItems = cartItems.map(item => {
        const price = item.products.price;
        const discount = item.products.discount_percentage || 0;
        const finalPrice = price - (price * discount / 100);
        const primaryImage = item.products.product_images.find(img => img.is_primary)?.image_url || null;

        return {
          order_id: orderData.id,
          product_id: item.product_id,
          product_name: item.products.name,
          product_slug: item.products.slug,
          product_image_url: primaryImage,
          price: item.products.price,
          discount_percentage: item.products.discount_percentage,
          quantity: item.quantity,
          subtotal: finalPrice * item.quantity,
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart
      const { error: clearError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (clearError) throw clearError;

      navigate(`/order-success/${orderData.id}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal membuat order',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !selectedAddress) {
      toast({
        variant: 'destructive',
        title: 'Pilih alamat pengiriman',
        description: 'Silakan pilih alamat pengiriman terlebih dahulu',
      });
      return;
    }
    if (currentStep === 2 && (!shippingMethod || shippingCost === 0)) {
      toast({
        variant: 'destructive',
        title: 'Pilih metode pengiriman',
        description: 'Silakan pilih metode pengiriman terlebih dahulu',
      });
      return;
    }
    if (currentStep === 3 && !paymentMethod) {
      toast({
        variant: 'destructive',
        title: 'Pilih metode pembayaran',
        description: 'Silakan pilih metode pembayaran terlebih dahulu',
      });
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
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
      <main className="flex-1 bg-background py-8">
        <div className="container max-w-4xl">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate('/cart')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Keranjang
          </Button>

          <h1 className="text-3xl font-bold mb-8">Checkout</h1>

          <CheckoutStepper currentStep={currentStep} />

          <div className="mt-8">
            {currentStep === 1 && (
              <AddressStep
                selectedAddress={selectedAddress}
                onSelectAddress={setSelectedAddress}
              />
            )}

            {currentStep === 2 && (
              <ShippingStep
                selectedAddress={selectedAddress}
                shippingMethod={shippingMethod}
                shippingCost={shippingCost}
                onSelectShipping={(method, cost) => {
                  setShippingMethod(method);
                  setShippingCost(cost);
                }}
              />
            )}

            {currentStep === 3 && (
              <PaymentStep
                paymentMethod={paymentMethod}
                onSelectPayment={setPaymentMethod}
              />
            )}

            {currentStep === 4 && (
              <OrderSummary
                cartItems={cartItems}
                selectedAddress={selectedAddress}
                shippingMethod={shippingMethod}
                shippingCost={shippingCost}
                paymentMethod={paymentMethod}
                notes={notes}
                onNotesChange={setNotes}
                subtotal={calculateSubtotal()}
                voucherDiscount={calculateVoucherDiscount(calculateSubtotal())}
                voucherCode={appliedVoucher?.code}
              />
            )}
          </div>

          <div className="flex justify-between mt-8">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Kembali
              </Button>
            )}
            
            {currentStep < 4 ? (
              <Button onClick={handleNext} className="ml-auto">
                Lanjutkan
              </Button>
            ) : (
              <Button 
                onClick={handleSubmitOrder} 
                disabled={submitting}
                className="ml-auto"
              >
                {submitting ? 'Memproses...' : 'Buat Pesanan'}
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
