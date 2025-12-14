import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Clock, ShoppingCart, Star, Loader2 } from 'lucide-react';
import { useFlashSale } from '@/hooks/useFlashSale';
import { useCart } from '@/hooks/useCart';
import { useState } from 'react';

export const FlashSaleSection = () => {
  const { activeFlashSale, loading, timeLeft } = useFlashSale();
  const { addToCart } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);

  if (loading) {
    return (
      <section className="py-12 bg-gradient-to-r from-destructive/10 via-destructive/5 to-accent/10">
        <div className="container">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-destructive" />
          </div>
        </div>
      </section>
    );
  }

  if (!activeFlashSale || !activeFlashSale.items?.length) {
    return null;
  }

  const handleAddToCart = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    setAddingId(productId);
    await addToCart(productId);
    setAddingId(null);
  };

  return (
    <section className="py-12 bg-gradient-to-r from-destructive/10 via-destructive/5 to-accent/10 relative overflow-hidden">
      {/* Animated background effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-destructive/20 to-transparent animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-accent/20 to-transparent animate-pulse delay-1000" />
      </div>

      <div className="container relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-destructive rounded-full p-3 animate-pulse">
              <Zap className="h-6 w-6 text-destructive-foreground" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {activeFlashSale.name}
              </h2>
              {activeFlashSale.description && (
                <p className="text-muted-foreground">{activeFlashSale.description}</p>
              )}
            </div>
          </div>

          {/* Countdown Timer */}
          {timeLeft && (
            <div className="flex items-center gap-2 bg-card rounded-lg p-4 shadow-lg">
              <Clock className="h-5 w-5 text-destructive" />
              <span className="text-sm text-muted-foreground">Berakhir dalam:</span>
              <div className="flex gap-1">
                <div className="bg-destructive text-destructive-foreground px-3 py-2 rounded-md font-mono font-bold">
                  {String(timeLeft.hours).padStart(2, '0')}
                </div>
                <span className="text-2xl font-bold">:</span>
                <div className="bg-destructive text-destructive-foreground px-3 py-2 rounded-md font-mono font-bold">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </div>
                <span className="text-2xl font-bold">:</span>
                <div className="bg-destructive text-destructive-foreground px-3 py-2 rounded-md font-mono font-bold">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {activeFlashSale.items.map((item) => {
            const product = item.products;
            const primaryImage = product.product_images?.find((img) => img.is_primary)?.image_url 
              || product.product_images?.[0]?.image_url 
              || '/placeholder.svg';
            const stockLeft = item.stock_limit - item.sold_count;
            const stockPercentage = (item.sold_count / item.stock_limit) * 100;
            const discountPercentage = Math.round(((item.original_price - item.flash_price) / item.original_price) * 100);
            const isOutOfStock = stockLeft <= 0;

            return (
              <Link to={`/products/${product.slug}`} key={item.id}>
                <Card className={`group overflow-hidden border-destructive/30 hover:border-destructive/50 transition-all duration-300 hover:shadow-lg ${isOutOfStock ? 'opacity-75' : ''}`}>
                  <div className="relative aspect-square overflow-hidden bg-muted/30">
                    <img
                      src={primaryImage}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    
                    {/* Flash Sale Badge */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <Badge className="bg-destructive text-destructive-foreground animate-pulse">
                        <Zap className="h-3 w-3 mr-1" />
                        -{discountPercentage}%
                      </Badge>
                      {isOutOfStock && (
                        <Badge variant="secondary">Habis</Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    {/* Product Name */}
                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>

                    {/* Rating */}
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-accent text-accent" />
                      <span className="text-xs">
                        {product.rating_average?.toFixed(1) || '0'} ({product.review_count || 0})
                      </span>
                    </div>

                    {/* Price */}
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-destructive">
                        Rp {item.flash_price.toLocaleString('id-ID')}
                      </div>
                      <div className="text-xs text-muted-foreground line-through">
                        Rp {item.original_price.toLocaleString('id-ID')}
                      </div>
                    </div>

                    {/* Stock Progress */}
                    <div className="space-y-1">
                      <Progress value={stockPercentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Terjual {item.sold_count}</span>
                        <span>Sisa {stockLeft}</span>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <Button
                      size="sm"
                      className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      disabled={isOutOfStock || addingId === product.id}
                      onClick={(e) => handleAddToCart(e, product.id)}
                    >
                      {addingId === product.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          {isOutOfStock ? 'Habis' : 'Beli'}
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
