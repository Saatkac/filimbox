import { Search, Film, LogIn, UserCircle, Shield, Heart, Settings } from "lucide-react";
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

const Navbar = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAdmin } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cinema-dark/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <Film className="w-8 h-8 text-gold transition-transform group-hover:scale-110" />
            <h1 className="text-2xl font-bold text-gold gold-glow">FilimBox</h1>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-foreground hover:text-gold transition-colors">
              Ana Sayfa
            </Link>
            <Link to="/categories" className="text-foreground hover:text-gold transition-colors">
              Kategoriler
            </Link>
          </div>

          <form onSubmit={handleSearch} className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Film veya dizi ara..."
              className="pl-10 bg-secondary border-border focus:border-gold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                {isAdmin && (
                  <Button
                    onClick={() => navigate("/admin")}
                    variant="secondary"
                    size="sm"
                    className="bg-gold hover:bg-gold-light text-black"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none">
                      <UserCircle className="w-6 h-6 text-gold hover:text-gold-light transition-colors cursor-pointer" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem onClick={() => navigate("/favorites")} className="cursor-pointer">
                      <Heart className="w-4 h-4 mr-2" />
                      Favorilerim
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
                className="bg-gold hover:bg-gold-light text-black"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Giriş
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
