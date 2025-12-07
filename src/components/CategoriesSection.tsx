import { useEffect, useState } from "react";
import { CategoryCard } from "./CategoryCard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  product_count: number;
}

export const CategoriesSection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug, description, icon')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(6);

      if (catError) throw catError;

      // Fetch product counts for each category
      const categoriesWithCounts = await Promise.all(
        (categoriesData || []).map(async (cat) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', cat.id)
            .eq('is_active', true);

          return {
            ...cat,
            product_count: count || 0,
          };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-light">
        <div className="container">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-light">
      <div className="container">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold">
            Kategori <span className="bg-gradient-ocean bg-clip-text text-transparent">Populer</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Jelajahi berbagai kategori ikan hias dan tanaman akuarium pilihan kami
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              title={category.name}
              description={category.description || `Koleksi ${category.name} berkualitas`}
              image={category.icon || '/placeholder.svg'}
              count={category.product_count}
              slug={category.slug}
            />
          ))}
        </div>
      </div>
    </section>
  );
};