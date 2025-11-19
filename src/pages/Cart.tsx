import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShoppingBag } from 'lucide-react';

interface CartItemData {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    discount_percentage: number | null;
    stock_quantity: number;
    product_images: Array<{
      image_url: string;
      is_primary: boolean;
    }>;
  };
  product_variants: {
    id: string;
    variant_name: string;
    price_adjustment: number;
    stock_quantity: number;
  } | null;
}

const Cart = () => {
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadCart();
  }, [user, navigate]);

  const loadCart = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        variant_id,
        quantity,
        product:products!inner(
          id,
          name,
          slug,
          price,
          discount_percentage,
          stock_quantity,
          product_images!inner(image_url, is_primary)
        ),
        product_variants(
          id,
          variant_name,
          price_adjustment,
          stock_quantity
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal memuat keranjang',
        description: error.message,
      });
    } else {
      setCartItems((data as any) || []);
    }
    setLoading(false);
  };

  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: newQuantity })
      .eq('id', cartItemId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal update jumlah',
        description: error.message,
      });
    } else {
      loadCart();
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus item',
        description: error.message,
      });
    } else {
      toast({
        title: 'Item dihapus',
        description: 'Produk telah dihapus dari keranjang',
      });
      loadCart();
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      let price = item.product.price;
      
      // Add variant price adjustment if exists
      if (item.product_variants) {
        price += item.product_variants.price_adjustment;
      }
      
      // Apply product discount
      if (item.product.discount_percentage) {
        price = price * (1 - item.product.discount_percentage / 100);
      }
      
      return sum + price * item.quantity;
    }, 0);
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

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-12 pb-8">
              <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-2xl font-bold mb-2">Keranjang Kosong</h2>
              <p className="text-muted-foreground mb-6">
                Belum ada produk di keranjang Anda
              </p>
              <Button asChild>
                <Link to="/products">Mulai Belanja</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Keranjang Belanja</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              const primaryImage = item.product.product_images.find(
                (img) => img.is_primary
              );
              const imageUrl =
                primaryImage?.image_url || item.product.product_images[0]?.image_url;

              return (
                <CartItem
                  key={item.id}
                  id={item.id}
                  productId={item.product.id}
                  productName={item.product.name}
                  productSlug={item.product.slug}
                  productImage={imageUrl}
                  price={item.product.price}
                  discountPercentage={item.product.discount_percentage}
                  quantity={item.quantity}
                  stockQuantity={item.product.stock_quantity}
                  variantName={item.product_variants?.variant_name}
                  priceAdjustment={item.product_variants?.price_adjustment || 0}
                  variantStockQuantity={item.product_variants?.stock_quantity}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                />
              );
            })}
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <CartSummary subtotal={calculateSubtotal()} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
