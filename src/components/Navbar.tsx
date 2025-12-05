import { Search, Film, LogIn, UserCircle, Shield, Heart, Settings, Users, Menu, X, Home, Grid3X3 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PartyNotifications } from "./PartyNotifications";

const Navbar = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { user, isAdmin } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setMobileSearchOpen(false);
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cinema-dark/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 group flex-shrink-0">
            <Film className="w-6 h-6 sm:w-8 sm:h-8 text-gold transition-transform group-hover:scale-110" />
            <h1 className="text-lg sm:text-2xl font-bold text-gold gold-glow">FilimBox</h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-foreground hover:text-gold transition-colors">
              Ana Sayfa
            </Link>
            <Link to="/categories" className="text-foreground hover:text-gold transition-colors">
              Kategoriler
            </Link>
          </div>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="relative hidden sm:block w-48 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Film veya dizi ara..."
              className="pl-10 bg-secondary border-border focus:border-gold text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="sm:hidden p-2 text-foreground hover:text-gold transition-colors touch-manipulation"
            >
              <Search className="w-5 h-5" />
            </button>

            {user ? (
              <>
                {isAdmin && (
                  <Button
                    onClick={() => navigate("/admin")}
                    variant="secondary"
                    size="sm"
                    className="hidden sm:flex bg-gold hover:bg-gold-light text-black"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                )}
                <PartyNotifications />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none touch-manipulation">
                      <UserCircle className="w-6 h-6 text-gold hover:text-gold-light transition-colors cursor-pointer" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer sm:hidden">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate("/favorites")} className="cursor-pointer">
                      <Heart className="w-4 h-4 mr-2" />
                      Favorilerim
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/friends")} className="cursor-pointer">
                      <Users className="w-4 h-4 mr-2" />
                      Arkadaşlarım
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/account-settings")} className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Hesap Ayarları
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                onClick={() => navigate("/auth")}
                variant="secondary"
                size="sm"
                className="bg-gold hover:bg-gold-light text-black text-xs sm:text-sm px-2 sm:px-3"
              >
                <LogIn className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Giriş</span>
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-foreground hover:text-gold transition-colors touch-manipulation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {mobileSearchOpen && (
          <form onSubmit={handleSearch} className="sm:hidden mt-3 pb-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Film veya dizi ara..."
                className="pl-10 bg-secondary border-border focus:border-gold w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </form>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pb-2 border-t border-border pt-3 space-y-1">
            <Link 
              to="/" 
              className="flex items-center gap-3 px-3 py-2.5 text-foreground hover:text-gold hover:bg-secondary/50 rounded-lg transition-colors touch-manipulation"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="w-5 h-5" />
              Ana Sayfa
            </Link>
            <Link 
              to="/categories" 
              className="flex items-center gap-3 px-3 py-2.5 text-foreground hover:text-gold hover:bg-secondary/50 rounded-lg transition-colors touch-manipulation"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Grid3X3 className="w-5 h-5" />
              Kategoriler
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
