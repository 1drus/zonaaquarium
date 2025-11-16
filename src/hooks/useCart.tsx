import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useCart() {
  const [cartCount, setCartCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadCartCount();
      
      // Subscribe to cart changes
      const channel = supabase
        .channel('cart-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cart_items',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadCartCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setCartCount(0);
    }
  }, [user]);

  const loadCartCount = async () => {
    if (!user) return;

    const { count } = await supabase
      .from('cart_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    setCartCount(count || 0);
  };

  const addToCart = async (productId: string, quantity: number = 1) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Login diperlukan',
        description: 'Silakan login terlebih dahulu untuk menambahkan produk ke keranjang',
      });
      return false;
    }

    // Check if item already exists in cart
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existingItem) {
      // Update quantity
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Gagal update keranjang',
          description: error.message,
        });
        return false;
      }
    } else {
      // Insert new item
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity,
        });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Gagal menambahkan ke keranjang',
          description: error.message,
        });
        return false;
      }
    }

    toast({
      title: 'Berhasil ditambahkan',
      description: 'Produk telah ditambahkan ke keranjang',
    });

    loadCartCount();
    return true;
  };

  return {
    cartCount,
    addToCart,
    refreshCart: loadCartCount,
  };
}
