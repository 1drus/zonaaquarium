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
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  const adjustedPrice = price + priceAdjustment;
  const finalPrice = discountPercentage
    ? adjustedPrice * (1 - discountPercentage / 100)
    : adjustedPrice;
  const subtotal = finalPrice * quantity;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          <Link to={`/products/${productSlug}`} className="flex-shrink-0">
            <img
              src={productImage}
              alt={productName}
              className="w-24 h-24 object-cover rounded-lg"
            />
          </Link>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <Link
              to={`/products/${productSlug}`}
              className="font-semibold hover:text-primary transition-colors line-clamp-2"
            >
              {productName}
            </Link>
            
            {variantName && (
              <p className="text-sm text-muted-foreground mt-1">
                Variant: {variantName}
              </p>
            )}

            <div className="mt-2 space-y-1">
              {discountPercentage && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">
                    Rp {price.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">
                    -{discountPercentage}%
                  </span>
                </div>
              )}
              <div className="text-lg font-bold text-primary">
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
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val > 0 && val <= stockQuantity) {
                      onUpdateQuantity(id, val);
                    }
                  }}
                  className="w-16 h-8 text-center"
                  min={1}
                  max={stockQuantity}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onUpdateQuantity(id, quantity + 1)}
                  disabled={quantity >= stockQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => onRemove(id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {stockQuantity < 10 && (
              <p className="text-xs text-destructive mt-2">
                Stok tersisa: {stockQuantity}
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
