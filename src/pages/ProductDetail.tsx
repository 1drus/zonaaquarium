import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductImageGallery } from '@/components/product-detail/ProductImageGallery';
import { ProductSpecs } from '@/components/product-detail/ProductSpecs';
import { ProductReviews } from '@/components/product-detail/ProductReviews';
import { RelatedProducts } from '@/components/product-detail/RelatedProducts';
import { ShoppingCart, Heart, ArrowLeft, Star, Loader2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discount_percentage: number | null;
  stock_quantity: number;
  min_order: number;
  max_order: number | null;
  size: string | null;
  water_type: string | null;
  origin: string | null;
  difficulty_level: string | null;
  temperature_min: number | null;
  temperature_max: number | null;
  ph_min: number | null;
  ph_max: number | null;
  care_instructions: string | null;
  rating_average: number | null;
  review_count: number;
  category_id: string | null;
  product_images: Array<{
    id: string;
    image_url: string;
    is_primary: boolean;
    display_order: number;
  }>;
  categories: {
    name: string;
  } | null;
}

interface ProductVariant {
  id: string;
  variant_name: string;
  size: string | null;
  color: string | null;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
}

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  useEffect(() => {
    if (slug) {
      loadProduct();
      if (user) {
        checkWishlist();
      }
    }
  }, [slug, user]);

  useEffect(() => {
    if (product) {
      loadVariants();
    }
  }, [product]);

  const loadProduct = async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (*),
        categories (name)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      toast({
        variant: 'destructive',
        title: 'Produk tidak ditemukan',
        description: 'Produk yang Anda cari tidak tersedia',
      });
      navigate('/products');
      return;
    }

    // Sort images by display_order and is_primary
    data.product_images.sort((a, b) => {
      if (a.is_primary) return -1;
      if (b.is_primary) return 1;
      return a.display_order - b.display_order;
    });

    setProduct(data as Product);
    setLoading(false);
  };

  const loadVariants = async () => {
    if (!product) return;

    const { data } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('variant_name');

    if (data && data.length > 0) {
      setVariants(data);
      setSelectedVariant(data[0]); // Select first variant by default
    }
  };

  const checkWishlist = async () => {
    if (!user || !product) return;

    const { data } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle();

    setIsWishlisted(!!data);
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    // If has variants, require variant selection
    if (variants.length > 0 && !selectedVariant) {
      toast({
        variant: 'destructive',
        title: 'Pilih variant',
        description: 'Silakan pilih variant produk terlebih dahulu',
      });
      return;
    }
    
    setAddingToCart(true);
    const success = await addToCart(product.id, quantity, selectedVariant?.id);
    if (success) {
      setQuantity(1);
    }
    setAddingToCart(false);
  };

  const getCurrentPrice = () => {
    if (!product) return 0;
    let price = product.price;
    if (selectedVariant) {
      price += selectedVariant.price_adjustment;
    }
    if (product.discount_percentage) {
      price = price - (price * product.discount_percentage / 100);
    }
    return price;
  };

  const getCurrentStock = () => {
    if (selectedVariant) {
      return selectedVariant.stock_quantity;
    }
    return product?.stock_quantity || 0;
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Login diperlukan',
        description: 'Silakan login untuk menambahkan ke wishlist',
      });
      navigate('/auth');
      return;
    }

    if (!product) return;

    if (isWishlisted) {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', product.id);

      if (!error) {
        setIsWishlisted(false);
        toast({
          title: 'Dihapus dari wishlist',
          description: 'Produk telah dihapus dari wishlist',
        });
      }
    } else {
      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          product_id: product.id,
        });

      if (!error) {
        setIsWishlisted(true);
        toast({
          title: 'Ditambahkan ke wishlist',
          description: 'Produk telah ditambahkan ke wishlist',
        });
      }
    }
  };

  const calculateFinalPrice = () => {
    if (!product) return 0;
    const discount = product.discount_percentage || 0;
    return product.price - (product.price * discount / 100);
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

  if (!product) return null;

  const finalPrice = calculateFinalPrice();
  const inStock = (product.stock_quantity || 0) > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8 bg-background">
        <div className="container max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => navigate('/products')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Katalog
          </Button>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Image Gallery */}
            <ProductImageGallery images={product.product_images} productName={product.name} />

            {/* Product Info */}
            <div className="space-y-6">
              {product.categories && (
                <Badge variant="secondary">{product.categories.name}</Badge>
              )}
              
              <div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                {product.rating_average && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{product.rating_average.toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      ({product.review_count} ulasan)
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {product.discount_percentage && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-muted-foreground line-through">
                      Rp {product.price.toLocaleString('id-ID')}
                    </span>
                    <Badge variant="destructive">-{product.discount_percentage}%</Badge>
                  </div>
                )}
                <p className="text-3xl font-bold text-primary">
                  Rp {getCurrentPrice().toLocaleString('id-ID')}
                </p>
                {selectedVariant && selectedVariant.price_adjustment !== 0 && (
                  <p className="text-sm text-muted-foreground">
                    Base price + variant adjustment
                  </p>
                )}
              </div>

              {product.description && (
                <p className="text-muted-foreground">{product.description}</p>
              )}

              <Separator />

              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-4">
                {product.size && (
                  <div>
                    <p className="text-sm text-muted-foreground">Ukuran</p>
                    <p className="font-semibold">{product.size}</p>
                  </div>
                )}
                {product.origin && (
                  <div>
                    <p className="text-sm text-muted-foreground">Asal</p>
                    <p className="font-semibold">{product.origin}</p>
                  </div>
                )}
                {product.water_type && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tipe Air</p>
                    <p className="font-semibold capitalize">{product.water_type}</p>
                  </div>
                )}
                {product.difficulty_level && (
                  <div>
                    <p className="text-sm text-muted-foreground">Kesulitan</p>
                    <p className="font-semibold capitalize">{product.difficulty_level}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Variant Selection */}
              {variants.length > 0 && (
                <div className="space-y-3">
                  <Label>Pilih Variant</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {variants.map((variant) => (
                      <Button
                        key={variant.id}
                        type="button"
                        variant={selectedVariant?.id === variant.id ? 'default' : 'outline'}
                        className="h-auto py-3 flex flex-col items-start"
                        onClick={() => setSelectedVariant(variant)}
                        disabled={variant.stock_quantity === 0}
                      >
                        <span className="font-semibold">{variant.variant_name}</span>
                        <span className="text-xs">
                          {variant.price_adjustment !== 0 && (
                            <span className={variant.price_adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                              {variant.price_adjustment > 0 ? '+' : ''}
                              Rp {Math.abs(variant.price_adjustment).toLocaleString('id-ID')}
                            </span>
                          )}
                          {' • '}
                          Stock: {variant.stock_quantity}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Stock & Quantity */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stok tersedia</span>
                  <span className={`font-semibold ${getCurrentStock() > 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {getCurrentStock() > 0 ? `${getCurrentStock()} unit` : 'Habis'}
                  </span>
                </div>

                {getCurrentStock() > 0 && (
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">Jumlah:</label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(Math.max(product.min_order || 1, quantity - 1))}
                        disabled={quantity <= (product.min_order || 1)}
                      >
                        -
                      </Button>
                      <span className="w-12 text-center font-semibold">{quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(Math.min(product.max_order || getCurrentStock() || 999, quantity + 1))}
                        disabled={quantity >= Math.min(product.max_order || 999, getCurrentStock() || 0)}
                      >
                        +
                      </Button>
                    </div>
                    {product.min_order && product.min_order > 1 && (
                      <span className="text-xs text-muted-foreground">Min: {product.min_order}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={getCurrentStock() === 0 || addingToCart}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {addingToCart ? 'Menambahkan...' : 'Tambah ke Keranjang'}
                </Button>
                <Button
                  variant={isWishlisted ? 'default' : 'outline'}
                  size="lg"
                  onClick={handleToggleWishlist}
                >
                  <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="specs" className="mb-12">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="specs">Spesifikasi</TabsTrigger>
              <TabsTrigger value="care">Cara Perawatan</TabsTrigger>
              <TabsTrigger value="reviews">Ulasan ({product.review_count})</TabsTrigger>
            </TabsList>

            <TabsContent value="specs" className="mt-6">
              <ProductSpecs product={product} />
            </TabsContent>

            <TabsContent value="care" className="mt-6">
              <div className="prose max-w-none">
                {product.care_instructions ? (
                  <p className="text-muted-foreground whitespace-pre-line">
                    {product.care_instructions}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Informasi cara perawatan belum tersedia untuk produk ini.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <ProductReviews productId={product.id} />
            </TabsContent>
          </Tabs>

          {/* Related Products */}
          <RelatedProducts 
            categoryId={product.category_id} 
            currentProductId={product.id}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
