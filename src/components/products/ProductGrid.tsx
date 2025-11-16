import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { ProductFilters } from '@/pages/Products';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  discount_percentage: number | null;
  stock_quantity: number;
  rating_average: number | null;
  review_count: number;
  product_images: Array<{
    image_url: string;
    is_primary: boolean;
  }>;
}

interface ProductGridProps {
  filters: ProductFilters;
}

const ITEMS_PER_PAGE = 12;

export function ProductGrid({ filters }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
    loadProducts(1);
  }, [filters]);

  const loadProducts = async (currentPage: number) => {
    setLoading(true);

    let query = supabase
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
        product_images!inner(image_url, is_primary)
      `, { count: 'exact' })
      .eq('is_active', true);

    // Apply filters
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters.difficulty) {
      query = query.eq('difficulty_level', filters.difficulty as 'mudah' | 'sedang' | 'sulit');
    }

    if (filters.waterType) {
      query = query.eq('water_type', filters.waterType);
    }

    if (filters.inStock) {
      query = query.gt('stock_quantity', 0);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'popular':
        query = query.order('view_count', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating_average', { ascending: false, nullsFirst: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Pagination
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (!error && data) {
      setProducts(data as Product[]);
      setTotal(count || 0);
      setHasMore((count || 0) > currentPage * ITEMS_PER_PAGE);
    }

    setLoading(false);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadProducts(nextPage);
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Tidak ada produk yang sesuai dengan filter Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Menampilkan {products.length} dari {total} produk
      </p>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => {
        const primaryImage = product.product_images.find(img => img.is_primary);
        const imageUrl = primaryImage?.image_url || product.product_images[0]?.image_url;
        const finalPrice = product.discount_percentage
          ? product.price * (1 - product.discount_percentage / 100)
          : product.price;
        const originalPrice = product.discount_percentage ? product.price : undefined;

        return (
          <ProductCard
            key={product.id}
            name={product.name}
            price={finalPrice}
            originalPrice={originalPrice}
            image={imageUrl}
            rating={product.rating_average || 0}
            reviews={product.review_count}
            category="Ikan Hias"
            discount={product.discount_percentage || undefined}
            inStock={product.stock_quantity > 0}
          />
        );
      })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memuat...
              </>
            ) : (
              'Muat Lebih Banyak'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
