import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ProductFilters as Filters } from '@/pages/Products';
import { X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Partial<Filters>) => void;
}

export function ProductFilters({ filters, onFilterChange }: ProductFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .is('parent_id', null)
      .order('display_order');
    
    if (data) setCategories(data);
  };

  const handlePriceChange = (value: number[]) => {
    setPriceRange([value[0], value[1]]);
  };

  const applyPriceFilter = () => {
    onFilterChange({
      minPrice: priceRange[0],
      maxPrice: priceRange[1]
    });
  };

  const clearFilters = () => {
    setPriceRange([0, 1000000]);
    onFilterChange({
      categoryId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      difficulty: undefined,
      waterType: undefined,
      inStock: undefined
    });
  };

  const hasActiveFilters = !!(
    filters.categoryId ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.difficulty ||
    filters.waterType ||
    filters.inStock
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filter</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Kategori</Label>
          <RadioGroup
            value={filters.categoryId || 'all'}
            onValueChange={(value) =>
              onFilterChange({ categoryId: value === 'all' ? undefined : value })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="cat-all" />
              <Label htmlFor="cat-all" className="font-normal cursor-pointer">
                Semua Kategori
              </Label>
            </div>
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <RadioGroupItem value={category.id} id={`cat-${category.id}`} />
                <Label
                  htmlFor={`cat-${category.id}`}
                  className="font-normal cursor-pointer"
                >
                  {category.name}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        {/* Price Range Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Harga</Label>
          <div className="pt-2 pb-4">
            <Slider
              min={0}
              max={1000000}
              step={10000}
              value={priceRange}
              onValueChange={handlePriceChange}
              className="mb-4"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Rp {priceRange[0].toLocaleString('id-ID')}</span>
              <span>Rp {priceRange[1].toLocaleString('id-ID')}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={applyPriceFilter}
            >
              Terapkan
            </Button>
          </div>
        </div>

        <Separator />

        {/* Difficulty Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Tingkat Kesulitan</Label>
          <RadioGroup
            value={filters.difficulty || 'all'}
            onValueChange={(value) =>
              onFilterChange({ difficulty: value === 'all' ? undefined : value })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="diff-all" />
              <Label htmlFor="diff-all" className="font-normal cursor-pointer">
                Semua
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mudah" id="diff-mudah" />
              <Label htmlFor="diff-mudah" className="font-normal cursor-pointer">
                Mudah
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sedang" id="diff-sedang" />
              <Label htmlFor="diff-sedang" className="font-normal cursor-pointer">
                Sedang
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sulit" id="diff-sulit" />
              <Label htmlFor="diff-sulit" className="font-normal cursor-pointer">
                Sulit
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Water Type Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Jenis Air</Label>
          <RadioGroup
            value={filters.waterType || 'all'}
            onValueChange={(value) =>
              onFilterChange({ waterType: value === 'all' ? undefined : value })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="water-all" />
              <Label htmlFor="water-all" className="font-normal cursor-pointer">
                Semua
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Tawar" id="water-tawar" />
              <Label htmlFor="water-tawar" className="font-normal cursor-pointer">
                Air Tawar
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Laut" id="water-laut" />
              <Label htmlFor="water-laut" className="font-normal cursor-pointer">
                Air Laut
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Payau" id="water-payau" />
              <Label htmlFor="water-payau" className="font-normal cursor-pointer">
                Air Payau
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Stock Filter */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="in-stock"
            checked={filters.inStock || false}
            onCheckedChange={(checked) =>
              onFilterChange({ inStock: checked as boolean })
            }
          />
          <Label htmlFor="in-stock" className="font-normal cursor-pointer">
            Hanya tampilkan yang tersedia
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
