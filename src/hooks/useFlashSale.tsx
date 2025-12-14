import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FlashSaleItem {
  id: string;
  flash_sale_id: string;
  product_id: string;
  flash_price: number;
  original_price: number;
  stock_limit: number;
  sold_count: number;
  products: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    rating_average: number | null;
    review_count: number | null;
    stock_quantity: number | null;
    category_id: string | null;
    categories: {
      name: string;
    } | null;
    product_images: {
      image_url: string;
      is_primary: boolean | null;
    }[];
  };
}

interface FlashSale {
  id: string;
  name: string;
  description: string | null;
  banner_image_url: string | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
  items?: FlashSaleItem[];
}

export function useFlashSale() {
  const [activeFlashSale, setActiveFlashSale] = useState<FlashSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  const loadActiveFlashSale = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      
      // Get active flash sale
      const { data: flashSale, error: flashSaleError } = await supabase
        .from('flash_sales')
        .select('*')
        .eq('is_active', true)
        .lte('start_time', now)
        .gte('end_time', now)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (flashSaleError) throw flashSaleError;

      if (!flashSale) {
        setActiveFlashSale(null);
        setLoading(false);
        return;
      }

      // Get flash sale items with product details
      const { data: items, error: itemsError } = await supabase
        .from('flash_sale_items')
        .select(`
          id,
          flash_sale_id,
          product_id,
          flash_price,
          original_price,
          stock_limit,
          sold_count,
          products (
            id,
            name,
            slug,
            description,
            rating_average,
            review_count,
            stock_quantity,
            category_id,
            categories (
              name
            ),
            product_images (
              image_url,
              is_primary
            )
          )
        `)
        .eq('flash_sale_id', flashSale.id);

      if (itemsError) throw itemsError;

      setActiveFlashSale({
        ...flashSale,
        items: items as unknown as FlashSaleItem[],
      });
    } catch (error) {
      console.error('Error loading flash sale:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate time left
  useEffect(() => {
    if (!activeFlashSale) return;

    const calculateTimeLeft = () => {
      const endTime = new Date(activeFlashSale.end_time).getTime();
      const now = Date.now();
      const difference = endTime - now;

      if (difference <= 0) {
        setTimeLeft(null);
        loadActiveFlashSale(); // Reload to check for new flash sale
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24) + Math.floor(difference / (1000 * 60 * 60 * 24)) * 24;
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [activeFlashSale, loadActiveFlashSale]);

  // Subscribe to realtime updates for sold count
  useEffect(() => {
    if (!activeFlashSale) return;

    const channel = supabase
      .channel('flash-sale-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'flash_sale_items',
          filter: `flash_sale_id=eq.${activeFlashSale.id}`,
        },
        () => {
          loadActiveFlashSale();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeFlashSale?.id, loadActiveFlashSale]);

  useEffect(() => {
    loadActiveFlashSale();
  }, [loadActiveFlashSale]);

  // Check if a product is in flash sale
  const getFlashSalePrice = useCallback(
    (productId: string): { isFlashSale: boolean; flashPrice?: number; originalPrice?: number; stockLeft?: number } => {
      if (!activeFlashSale?.items) return { isFlashSale: false };

      const item = activeFlashSale.items.find((i) => i.product_id === productId);
      if (!item) return { isFlashSale: false };

      const stockLeft = item.stock_limit - item.sold_count;
      if (stockLeft <= 0) return { isFlashSale: false };

      return {
        isFlashSale: true,
        flashPrice: item.flash_price,
        originalPrice: item.original_price,
        stockLeft,
      };
    },
    [activeFlashSale]
  );

  return {
    activeFlashSale,
    loading,
    timeLeft,
    getFlashSalePrice,
    refresh: loadActiveFlashSale,
  };
}
