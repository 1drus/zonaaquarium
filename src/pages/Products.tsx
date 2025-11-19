import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductFilters } from '@/components/products/ProductFilters';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductSort } from '@/components/products/ProductSort';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SlidersHorizontal } from 'lucide-react';

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  difficulty?: string;
  waterType?: string;
  inStock?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'popular' | 'rating' | 'newest';
}

const Products = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<ProductFilters>({
    sortBy: 'newest'
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Initialize filters from URL params
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    const urlWaterType = searchParams.get('waterType');
    
    if (urlSearch || urlWaterType) {
      setFilters(prev => ({
        ...prev,
        search: urlSearch || undefined,
        waterType: urlWaterType ? urlWaterType.toLowerCase() : undefined
      }));
    }
  }, [searchParams]);

  const handleFilterChange = (newFilters: Partial<ProductFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onSearch={(search) => handleFilterChange({ search })} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Katalog Ikan Hias</h1>
              <p className="text-muted-foreground mt-1">
                Temukan ikan hias pilihan untuk aquarium Anda
              </p>
            </div>

            {/* Mobile Filter Button */}
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <div className="mt-6">
                  <ProductFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Filters - Desktop */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <ProductFilters
                  filters={filters}
                  onFilterChange={handleFilterChange}
                />
              </div>
            </aside>

            {/* Product Grid */}
            <div className="lg:col-span-3 space-y-4">
              {/* Sort and View Options */}
              <div className="flex items-center justify-between">
              <ProductSort
                sortBy={filters.sortBy || 'newest'}
                onSortChange={(sortBy) => handleFilterChange({ sortBy: sortBy as ProductFilters['sortBy'] })}
              />
              </div>

              {/* Products */}
              <ProductGrid filters={filters} />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Products;
