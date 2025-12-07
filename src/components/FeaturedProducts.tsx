import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProductCard } from "./ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  discount_percentage: number | null;
  stock_quantity: number | null;
  rating_average: number | null;
  review_count: number | null;
  categories: { name: string } | null;
  product_images: { image_url: string; is_primary: boolean }[];
}

export const FeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          price,
          discount_percentage,
          stock_quantity,
          rating_average,
          review_count,
          categories:category_id (name),
          product_images (image_url, is_primary)
        `)
        .eq('is_active', true)
        .order('view_count', { ascending: false })
        .limit(6);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProductImage = (product: Product) => {
    const primaryImage = product.product_images.find(img => img.is_primary);
    return primaryImage?.image_url || product.product_images[0]?.image_url || '/placeholder.svg';
  };

  const getOriginalPrice = (price: number, discount: number | null) => {
    if (!discount) return undefined;
    return Math.round(price / (1 - discount / 100));
  };

  if (loading) {
    return (
      <section className="py-16">
        <div className="container">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-16">
      <div className="container">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold">
            Produk <span className="bg-gradient-ocean bg-clip-text text-transparent">Unggulan</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Pilihan terbaik dari koleksi kami dengan kualitas premium
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              slug={product.slug}
              price={product.price}
              originalPrice={getOriginalPrice(product.price, product.discount_percentage)}
              image={getProductImage(product)}
              rating={product.rating_average || 0}
              reviews={product.review_count || 0}
              category={product.categories?.name || 'Uncategorized'}
              inStock={(product.stock_quantity ?? 0) > 0}
              discount={product.discount_percentage || undefined}
            />
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg" asChild>
            <Link to="/products">
              Lihat Semua Produk
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};