import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Search, Menu, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "@/components/UserMenu";
import { useCart } from "@/hooks/useCart";

interface HeaderProps {
  onSearch?: (search: string) => void;
}

export const Header = ({ onSearch }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { cartCount } = useCart();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-ocean">
            <span className="text-xl font-bold text-primary-foreground">ZA</span>
          </div>
          <span className="text-xl font-bold bg-gradient-ocean bg-clip-text text-transparent">
            Zona Aquarium
          </span>
        </div>

        {/* Search Bar - Hidden on mobile */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari ikan hias..."
              className="pl-10 bg-muted/50 border-border/50 focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:flex"
            onClick={() => navigate('/wishlist')}
          >
            <Heart className="h-5 w-5" />
          </Button>
          <div className="hidden md:flex">
            <UserMenu />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
            onClick={() => navigate('/cart')}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-accent text-accent-foreground text-xs">
                {cartCount}
              </Badge>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden border-t p-4">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari ikan hias..."
              className="pl-10 bg-muted/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
      </div>
    </header>
  );
};
