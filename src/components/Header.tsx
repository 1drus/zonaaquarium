import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Search, Menu, Heart, Home, Package, User as UserIcon, ShoppingBag, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { UserMenu } from "@/components/UserMenu";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import zonaLogo from "@/assets/zona-aquarium-logo.png";

interface HeaderProps {
  onSearch?: (search: string) => void;
}

export const Header = ({ onSearch }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { isAdmin, user, signOut } = useAuth();

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
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
          <img 
            src={zonaLogo} 
            alt="Zona Aquarium Logo" 
            className="h-12 w-12 object-contain transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
          />
          <span className="text-xl font-bold bg-gradient-ocean bg-clip-text text-transparent transition-all duration-300 group-hover:tracking-wide">
            Zona Aquarium
          </span>
        </div>

        {/* Search Bar - Hidden on mobile and for admin */}
        {!isAdmin && (
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
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {!isAdmin && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="hidden md:flex"
                onClick={() => navigate('/wishlist')}
              >
                <Heart className="h-5 w-5" />
              </Button>
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
            </>
          )}
          <div className="hidden md:flex">
            <UserMenu />
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  {/* User Info */}
                  {user && (
                    <>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.email}</p>
                          {isAdmin && (
                            <p className="text-xs text-muted-foreground">Admin</p>
                          )}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}
                  
                  {/* Admin Menu */}
                  {isAdmin ? (
                    <>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => {
                          navigate('/admin');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Button>
                      
                      <Separator />
                      
                      <Button
                        variant="ghost"
                        className="justify-start text-destructive hover:text-destructive"
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Customer Navigation Links */}
                      {user ? (
                        <>
                          <Button
                            variant="ghost"
                            className="justify-start"
                            onClick={() => {
                              navigate('/');
                              setMobileMenuOpen(false);
                            }}
                          >
                            <Home className="mr-2 h-4 w-4" />
                            Beranda
                          </Button>
                          
                          <Button
                            variant="ghost"
                            className="justify-start"
                            onClick={() => {
                              navigate('/products');
                              setMobileMenuOpen(false);
                            }}
                          >
                            <Package className="mr-2 h-4 w-4" />
                            Produk
                          </Button>
                          
                          <Button
                            variant="ghost"
                            className="justify-start"
                            onClick={() => {
                              navigate('/wishlist');
                              setMobileMenuOpen(false);
                            }}
                          >
                            <Heart className="mr-2 h-4 w-4" />
                            Wishlist
                          </Button>
                          
                          <Button
                            variant="ghost"
                            className="justify-start"
                            onClick={() => {
                              navigate('/cart');
                              setMobileMenuOpen(false);
                            }}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Keranjang
                            {cartCount > 0 && (
                              <Badge className="ml-auto bg-accent text-accent-foreground">
                                {cartCount}
                              </Badge>
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            className="justify-start"
                            onClick={() => {
                              navigate('/orders');
                              setMobileMenuOpen(false);
                            }}
                          >
                            <ShoppingBag className="mr-2 h-4 w-4" />
                            Pesanan Saya
                          </Button>
                          
                          <Separator />
                          
                          <Button
                            variant="ghost"
                            className="justify-start"
                            onClick={() => {
                              navigate('/profile');
                              setMobileMenuOpen(false);
                            }}
                          >
                            <UserIcon className="mr-2 h-4 w-4" />
                            Profil Saya
                          </Button>
                          
                          <Button
                            variant="ghost"
                            className="justify-start text-destructive hover:text-destructive"
                            onClick={() => {
                              signOut();
                              setMobileMenuOpen(false);
                            }}
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="default"
                          className="w-full"
                          onClick={() => {
                            navigate('/auth');
                            setMobileMenuOpen(false);
                          }}
                        >
                          Masuk / Daftar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
        </div>
      </div>

      {/* Mobile Search - Hidden for admin */}
      {!isAdmin && (
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
      )}
    </header>
  );
};
