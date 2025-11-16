import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';

interface WishlistProduct {
  id: string;
  product_id: string;
  products: {
    id: string;
    name: string;
    slug: string;
    price: number;
    discount_percentage: number | null;
    rating_average: number | null;
    review_count: number;
    stock_quantity: number;
    product_images: Array<{
      image_url: string;
      is_primary: boolean;
    }>;
    categories: {
      name: string;
    } | null;
  };
}

export default function Wishlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wishlist, setWishlist] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadWishlist();
  }, [user, navigate]);

  const loadWishlist = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('wishlist')
      .select(`
        id,
        product_id,
        products (
          id,
          name,
          slug,
          price,
          discount_percentage,
          rating_average,
          review_count,
          stock_quantity,
          product_images (image_url, is_primary),
          categories (name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal memuat wishlist',
        description: error.message,
      });
    } else {
      setWishlist((data as any) || []);
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
          <h1 className="text-3xl font-bold mb-8">Wishlist Saya</h1>

          {wishlist.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Wishlist Kosong</h2>
              <p className="text-muted-foreground mb-6">
                Mulai tambahkan produk favorit Anda ke wishlist!
              </p>
              <Button onClick={() => navigate('/products')}>
                Jelajahi Produk
              </Button>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">
                {wishlist.length} produk dalam wishlist
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {wishlist.map((item) => {
                  const product = item.products;
                  const finalPrice = product.discount_percentage
                    ? product.price - (product.price * product.discount_percentage / 100)
                    : product.price;

                  return (
                    <ProductCard
                      key={item.id}
                      id={product.id}
                      slug={product.slug}
                      name={product.name}
                      price={finalPrice}
                      originalPrice={product.discount_percentage ? product.price : undefined}
                      discount={product.discount_percentage || undefined}
                      rating={product.rating_average || 0}
                      reviews={product.review_count}
                      category={product.categories?.name || 'Produk'}
                      inStock={(product.stock_quantity || 0) > 0}
                      image={
                        product.product_images.find((img) => img.is_primary)?.image_url ||
                        '/placeholder.svg'
                      }
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
