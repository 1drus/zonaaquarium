import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2 } from 'lucide-react';

interface CartItemProps {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  price: number;
  discountPercentage: number | null;
  quantity: number;
  stockQuantity: number;
  variantName?: string;
  priceAdjustment?: number;
  variantStockQuantity?: number;
  flashSalePrice?: number;
  flashSaleOriginalPrice?: number;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function CartItem({
  id,
  productId,
  productName,
  productSlug,
  productImage,
  price,
  discountPercentage,
  quantity,
  stockQuantity,
  variantName,
  priceAdjustment = 0,
  variantStockQuantity,
  flashSalePrice,
  flashSaleOriginalPrice,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  const isFlashSale = flashSalePrice !== undefined;
  
  let finalPrice: number;
  let originalPrice: number;
  
  if (isFlashSale) {
    // Flash sale price + variant adjustment
    finalPrice = flashSalePrice + priceAdjustment;
    originalPrice = (flashSaleOriginalPrice || price) + priceAdjustment;
  } else {
    const adjustedPrice = price + priceAdjustment;
    finalPrice = discountPercentage
      ? adjustedPrice * (1 - discountPercentage / 100)
      : adjustedPrice;
    originalPrice = adjustedPrice;
  }
  
  const subtotal = finalPrice * quantity;
  const hasDiscount = isFlashSale || (discountPercentage && discountPercentage > 0);

  // Determine actual stock (variant stock takes priority)
  const actualStock = variantStockQuantity !== undefined ? variantStockQuantity : stockQuantity;
  const isOutOfStock = actualStock <= 0;

  return (
    <Card className={isOutOfStock ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          <Link to={`/products/${productSlug}`} className="flex-shrink-0">
            <div className="relative w-24 h-24">
              <img
                src={productImage}
                alt={productName}
                className={`w-full h-full object-cover rounded-lg ${isOutOfStock ? 'grayscale' : ''}`}
              />
              {isOutOfStock && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                  <span className="text-white text-xs font-bold px-2 py-1 bg-destructive rounded">
                    HABIS
                  </span>
                </div>
              )}
            </div>
          </Link>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <Link
              to={`/products/${productSlug}`}
              className={`font-semibold hover:text-primary transition-colors line-clamp-2 ${
                isOutOfStock ? 'text-muted-foreground' : ''
              }`}
            >
              {productName}
            </Link>
            
            {variantName && (
              <p className="text-sm text-muted-foreground mt-1">
                Variant: {variantName}
              </p>
            )}

            {isOutOfStock && (
              <div className="mt-2 inline-block">
                <span className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded-full font-semibold">
                  Stok Habis
                </span>
              </div>
            )}

            <div className="mt-2 space-y-1">
              {hasDiscount && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">
                    Rp {originalPrice.toLocaleString('id-ID')}
                  </span>
                  {isFlashSale ? (
                    <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded font-semibold animate-pulse">
                      ⚡ FLASH SALE
                    </span>
                  ) : discountPercentage ? (
                    <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">
                      -{discountPercentage}%
                    </span>
                  ) : null}
                </div>
              )}
              <div className={`text-lg font-bold ${isOutOfStock ? 'text-muted-foreground' : 'text-primary'}`}>
                Rp {finalPrice.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onUpdateQuantity(id, quantity - 1)}
                  disabled={quantity <= 1 || isOutOfStock}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val > 0 && val <= actualStock) {
                      onUpdateQuantity(id, val);
                    }
                  }}
                  className="w-16 h-8 text-center"
                  min={1}
                  max={actualStock}
                  disabled={isOutOfStock}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onUpdateQuantity(id, quantity + 1)}
                  disabled={quantity >= actualStock || isOutOfStock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive opacity-100"
                onClick={() => onRemove(id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {!isOutOfStock && actualStock < 10 && (
              <p className="text-xs text-destructive mt-2">
                Stok tersisa: {actualStock}
              </p>
            )}
          </div>

          {/* Subtotal (Desktop) */}
          <div className="hidden md:block text-right flex-shrink-0">
            <div className="font-bold text-lg">
              Rp {subtotal.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* Subtotal (Mobile) */}
        <div className="md:hidden mt-3 pt-3 border-t flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Subtotal:</span>
          <span className="font-bold text-lg">
            Rp {subtotal.toLocaleString('id-ID')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
