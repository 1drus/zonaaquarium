import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ProductCard';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  discount_percentage: number | null;
  rating_average: number | null;
  review_count: number;
  product_images: Array<{
    image_url: string;
    is_primary: boolean;
  }>;
}

interface RelatedProductsProps {
  categoryId: string | null;
  currentProductId: string;
}

export function RelatedProducts({ categoryId, currentProductId }: RelatedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelatedProducts();
  }, [categoryId, currentProductId]);

  const loadRelatedProducts = async () => {
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        price,
        discount_percentage,
        rating_average,
        review_count,
        stock_quantity,
        category_id,
        categories (name),
        product_images (image_url, is_primary)
      `)
      .eq('is_active', true)
      .neq('id', currentProductId)
      .limit(4);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setProducts(data as any);
    }
    setLoading(false);
  };

  if (loading || products.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Produk Terkait</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product: any) => {
          const finalPrice = product.discount_percentage 
            ? product.price - (product.price * product.discount_percentage / 100)
            : product.price;
          
          return (
            <ProductCard
              key={product.id}
              id={product.id}
              slug={product.slug}
              name={product.name}
              price={finalPrice}
              originalPrice={product.discount_percentage ? product.price : undefined}
              discount={product.discount_percentage}
              rating={product.rating_average || 0}
              reviews={product.review_count}
              category={product.categories?.name || 'Produk'}
              inStock={(product.stock_quantity || 0) > 0}
              image={product.product_images.find((img: any) => img.is_primary)?.image_url || '/placeholder.svg'}
            />
          );
        })}
      </div>
    </div>
  );
}
