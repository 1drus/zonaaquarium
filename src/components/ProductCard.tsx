import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart, Star } from "lucide-react";

interface ProductCardProps {
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  category: string;
  inStock: boolean;
  isNew?: boolean;
  discount?: number;
}

export const ProductCard = ({
  name,
  price,
  originalPrice,
  image,
  rating,
  reviews,
  category,
  inStock,
  isNew,
  discount,
}: ProductCardProps) => {
  return (
    <Card className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-medium">
      <div className="relative aspect-square overflow-hidden bg-muted/30">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isNew && (
            <Badge className="bg-secondary text-secondary-foreground">Baru</Badge>
          )}
          {discount && (
            <Badge className="bg-accent text-accent-foreground">-{discount}%</Badge>
          )}
          {!inStock && (
            <Badge variant="destructive">Habis</Badge>
          )}
        </div>

        {/* Wishlist Button */}
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-3">
        {/* Category */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            {category}
          </Badge>
        </div>

        {/* Product Name */}
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="text-sm font-medium">{rating}</span>
          </div>
          <span className="text-xs text-muted-foreground">({reviews} ulasan)</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-primary">
            Rp {price.toLocaleString('id-ID')}
          </span>
          {originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              Rp {originalPrice.toLocaleString('id-ID')}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <Button
          className="w-full bg-gradient-ocean hover:opacity-90 transition-opacity"
          disabled={!inStock}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {inStock ? 'Tambah ke Keranjang' : 'Stok Habis'}
        </Button>
      </div>
    </Card>
  );
};
