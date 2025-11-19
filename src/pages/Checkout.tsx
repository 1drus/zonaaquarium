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
  variant_id: string | null;
  product_variants?: {
    id: string;
    variant_name: string;
    sku: string | null;
    price_adjustment: number | null;
  } | null;
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
  const [shippingMethodName, setShippingMethodName] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('midtrans');
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
    
    // Load Midtrans Snap script
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
    if (clientKey) {
      const script = document.createElement('script');
      script.src = 'https://app.midtrans.com/snap/snap.js';
      script.setAttribute('data-client-key', clientKey);
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [user, navigate]);

  const loadCartItems = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        quantity,
        variant_id,
        product_variants (
          id,
          variant_name,
          sku,
          price_adjustment
        ),
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
      let price = item.products.price;
      
      // Add variant price adjustment if applicable
      if (item.product_variants?.price_adjustment) {
        price += item.product_variants.price_adjustment;
      }
      
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
      // Validate stock availability first
      for (const item of cartItems) {
        if (item.variant_id) {
          // Check variant stock
          const { data: variant, error } = await supabase
            .from('product_variants')
            .select('stock_quantity, variant_name')
            .eq('id', item.variant_id)
            .single();

          if (error || !variant) {
            throw new Error(`Produk ${item.products.name} tidak ditemukan`);
          }

          if (variant.stock_quantity < item.quantity) {
            throw new Error(
              `Stok ${item.products.name} (${variant.variant_name}) tidak mencukupi. Tersedia: ${variant.stock_quantity}, Diminta: ${item.quantity}`
            );
          }
        } else {
          // Check product stock
          const { data: product, error } = await supabase
            .from('products')
            .select('stock_quantity, name')
            .eq('id', item.product_id)
            .single();

          if (error || !product) {
            throw new Error(`Produk tidak ditemukan`);
          }

          if ((product.stock_quantity || 0) < item.quantity) {
            throw new Error(
              `Stok ${product.name} tidak mencukupi. Tersedia: ${product.stock_quantity || 0}, Diminta: ${item.quantity}`
            );
          }
        }
      }

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
          shipping_method: shippingMethodName,
          shipping_cost: shippingCost,
          subtotal: subtotal,
          discount_amount: voucherDiscount,
          total_amount: totalAmount,
          payment_method: 'midtrans',
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
        let price = item.products.price;
        
        // Add variant price adjustment if applicable
        if (item.product_variants?.price_adjustment) {
          price += item.product_variants.price_adjustment;
        }
        
        const discount = item.products.discount_percentage || 0;
        const finalPrice = price - (price * discount / 100);
        const primaryImage = item.products.product_images.find(img => img.is_primary)?.image_url || null;

        return {
          order_id: orderData.id,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          variant_name: item.product_variants?.variant_name || null,
          variant_sku: item.product_variants?.sku || null,
          product_name: item.products.name,
          product_slug: item.products.slug,
          product_image_url: primaryImage,
          price: price,
          discount_percentage: item.products.discount_percentage,
          quantity: item.quantity,
          subtotal: finalPrice * item.quantity,
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Get user profile for Midtrans
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Create Midtrans transaction
      const items = cartItems.map(item => {
        let price = item.products.price;
        if (item.product_variants?.price_adjustment) {
          price += item.product_variants.price_adjustment;
        }
        const discount = item.products.discount_percentage || 0;
        const finalPrice = price - (price * discount / 100);

        return {
          id: item.product_id,
          name: item.products.name,
          price: finalPrice,
          quantity: item.quantity,
        };
      });

      // Add shipping as item
      if (shippingCost > 0) {
        items.push({
          id: 'shipping',
          name: `Ongkir - ${shippingMethodName}`,
          price: shippingCost,
          quantity: 1,
        });
      }

      // Add voucher discount as negative item if applied
      if (voucherDiscount > 0 && appliedVoucher) {
        items.push({
          id: 'voucher',
          name: `Diskon Voucher - ${appliedVoucher.code}`,
          price: -voucherDiscount,
          quantity: 1,
        });
      }

      const { data: midtransData, error: midtransError } = await supabase.functions.invoke(
        'create-midtrans-transaction',
        {
          body: {
            orderId: orderData.id,
            orderNumber: orderNumberData,
            amount: totalAmount,
            customerDetails: {
              first_name: profileData?.full_name || selectedAddress.recipient_name,
              email: user.email!,
              phone: selectedAddress.phone,
            },
            items,
          },
        }
      );

      if (midtransError) throw midtransError;

      // Clear cart
      const { error: clearError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (clearError) throw clearError;

      // Redirect to Midtrans payment page
      if (midtransData?.redirectUrl) {
        window.location.href = midtransData.redirectUrl;
      } else {
        throw new Error('Gagal membuat transaksi pembayaran');
      }
    } catch (error: any) {
      console.error('Order creation error:', error);
      
      let errorMessage = error.message;
      
      // Handle specific error cases
      if (error.message?.includes('stok') || error.message?.includes('stock')) {
        errorMessage = error.message;
      } else if (error.message?.includes('must be owner')) {
        errorMessage = 'Terjadi kesalahan sistem. Silakan hubungi administrator.';
      } else if (error.code === 'PGRST116') {
        errorMessage = 'Data tidak valid. Silakan periksa kembali data pesanan Anda.';
      } else if (!errorMessage || errorMessage === 'An error occurred') {
        errorMessage = 'Gagal membuat pesanan. Silakan coba lagi.';
      }

      toast({
        variant: 'destructive',
        title: 'Gagal membuat order',
        description: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectShipping = (id: string, name: string, cost: number) => {
    setShippingMethod(id);
    setShippingMethodName(name);
    setShippingCost(cost);
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
      <main className="flex-1 bg-background py-4 md:py-8">
        <div className="container max-w-4xl px-4">
          <Button
            variant="ghost"
            className="mb-4 md:mb-6"
            size="sm"
            onClick={() => navigate('/cart')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Kembali ke Keranjang</span>
            <span className="sm:hidden">Kembali</span>
          </Button>

          <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8">Checkout</h1>

          <div className="mb-4 md:mb-8 overflow-x-auto -mx-4 px-4">
            <CheckoutStepper currentStep={currentStep} />
          </div>

          <div className="mt-4 md:mt-8">
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
                onSelectShipping={handleSelectShipping}
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
