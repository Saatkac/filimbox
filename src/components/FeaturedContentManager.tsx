import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Star, Search, X, Film, Tv, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FeaturedContentManagerProps {
  onUpdate?: () => void;
}

const FeaturedContentManager = ({ onUpdate }: FeaturedContentManagerProps) => {
  const { toast } = useToast();
  const [currentFeatured, setCurrentFeatured] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrentFeatured();
  }, []);

  const loadCurrentFeatured = async () => {
    setLoading(true);
    const { data: featured } = await supabase
      .from("featured_content")
      .select("*, movies(*), series(*)")
      .maybeSingle();

    if (featured) {
      setCurrentFeatured(featured);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const searchTerm = `%${searchQuery.trim()}%`;

    const [moviesData, seriesData] = await Promise.all([
      supabase
        .from("movies")
        .select("id, title, poster_url, year, rating, category")
        .ilike("title", searchTerm)
        .limit(10),
      supabase
        .from("series")
        .select("id, title, poster_url, year, rating, category")
        .ilike("title", searchTerm)
        .limit(10),
    ]);

    const movies = (moviesData.data || []).map(m => ({ ...m, type: 'movie' }));
    const series = (seriesData.data || []).map(s => ({ ...s, type: 'series' }));

    setSearchResults([...movies, ...series]);
    setIsSearching(false);
  };

  const handleSelectFeatured = async (item: any) => {
    setSaving(true);
    
    const updateData = item.type === 'movie' 
      ? { movie_id: item.id, series_id: null }
      : { movie_id: null, series_id: item.id };

    const { error } = await supabase
      .from("featured_content")
      .update(updateData)
      .not("id", "is", null);

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    } else {
      toast({ title: "Başarılı", description: "Öne çıkan içerik güncellendi" });
      setSearchQuery("");
      setSearchResults([]);
      loadCurrentFeatured();
      onUpdate?.();
    }
    
    setSaving(false);
  };

  const handleClearFeatured = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from("featured_content")
      .update({ movie_id: null, series_id: null })
      .not("id", "is", null);

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    } else {
      toast({ title: "Başarılı", description: "Öne çıkan içerik kaldırıldı (en son eklenen gösterilecek)" });
      loadCurrentFeatured();
      onUpdate?.();
    }
    
    setSaving(false);
  };

  const getFeaturedContent = () => {
    if (!currentFeatured) return null;
    if (currentFeatured.movies) return { ...currentFeatured.movies, type: 'movie' };
    if (currentFeatured.series) return { ...currentFeatured.series, type: 'series' };
    return null;
  };

  const featuredContent = getFeaturedContent();

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gold" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-gold" />
          Öne Çıkan İçerik Yönetimi
        </CardTitle>
        <CardDescription>
          Ana sayfada öne çıkan film veya diziyi seçin. Seçim yapılmazsa en son eklenen içerik gösterilir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Featured */}
        {featuredContent ? (
          <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
            <img
              src={featuredContent.poster_url || "https://via.placeholder.com/80x120"}
              alt={featuredContent.title}
              className="w-16 h-24 object-cover rounded"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {featuredContent.type === 'movie' ? (
                  <Film className="w-4 h-4 text-gold" />
                ) : (
                  <Tv className="w-4 h-4 text-gold" />
                )}
                <span className="text-xs text-muted-foreground uppercase">
                  {featuredContent.type === 'movie' ? 'Film' : 'Dizi'}
                </span>
              </div>
              <h3 className="font-semibold">{featuredContent.title}</h3>
              <p className="text-sm text-muted-foreground">
                {featuredContent.year} • IMDb {featuredContent.rating}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearFeatured}
              disabled={saving}
              className="text-destructive hover:text-destructive"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <div className="p-4 bg-secondary rounded-lg text-center text-muted-foreground">
            Henüz öne çıkan içerik seçilmedi. En son eklenen film gösteriliyor.
          </div>
        )}

        {/* Search */}
        <div className="space-y-2">
          <Label>İçerik Ara</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Film veya dizi adı..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-secondary"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="bg-gold hover:bg-gold-light text-black"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {searchResults.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center gap-3 p-3 bg-secondary/50 hover:bg-secondary rounded-lg cursor-pointer transition-colors"
                  onClick={() => handleSelectFeatured(item)}
                >
                  <img
                    src={item.poster_url || "https://via.placeholder.com/60x90"}
                    alt={item.title}
                    className="w-12 h-18 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {item.type === 'movie' ? (
                        <Film className="w-3 h-3 text-gold" />
                      ) : (
                        <Tv className="w-3 h-3 text-gold" />
                      )}
                      <span className="text-xs text-muted-foreground uppercase">
                        {item.type === 'movie' ? 'Film' : 'Dizi'}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {item.year} • {item.category}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-gold hover:bg-gold-light text-black"
                    disabled={saving}
                  >
                    Seç
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default FeaturedContentManager;
