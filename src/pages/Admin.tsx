import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Tv, LogOut, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { categories } from "@/data/categories";
import { z } from "zod";

const movieSchema = z.object({
  title: z.string().trim().min(1, "Başlık gereklidir").max(200),
  description: z.string().trim().max(1000).transform(val => val || undefined),
  poster_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
  backdrop_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
  rating: z.number().min(0).max(10),
  year: z.number().min(1900).max(2100),
  category: z.string().min(1, "Kategori gereklidir"),
  duration: z.string().trim().min(1, "Süre gereklidir"),
  video_url: z.string().url("Geçerli bir video URL girin"),
  trailer_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
});

const seriesSchema = z.object({
  title: z.string().trim().min(1, "Başlık gereklidir").max(200),
  description: z.string().trim().max(1000).transform(val => val || undefined),
  poster_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
  backdrop_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
  rating: z.number().min(0).max(10),
  year: z.number().min(1900).max(2100),
  category: z.string().min(1, "Kategori gereklidir"),
  trailer_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
});

const episodeSchema = z.object({
  title: z.string().trim().min(1, "Başlık gereklidir").max(200),
  description: z.string().trim().max(1000).transform(val => val || undefined),
  episode_number: z.number().min(1, "Bölüm numarası gereklidir"),
  season_number: z.number().min(1, "Sezon numarası gereklidir"),
  video_url: z.string().url("Geçerli bir video URL girin"),
  duration: z.string().trim().transform(val => val || undefined),
  thumbnail_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
});

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string>("");
  const [episodes, setEpisodes] = useState<any[]>([]);

  useEffect(() => {
    loadMovies();
    loadSeries();
  }, []);

  useEffect(() => {
    if (selectedSeries) {
      loadEpisodes(selectedSeries);
    }
  }, [selectedSeries]);

  const loadMovies = async () => {
    const { data } = await supabase.from("movies").select("*").order("created_at", { ascending: false });
    setMovies(data || []);
  };

  const loadSeries = async () => {
    const { data } = await supabase.from("series").select("*").order("created_at", { ascending: false });
    setSeries(data || []);
  };

  const loadEpisodes = async (seriesId: string) => {
    const { data } = await supabase
      .from("episodes")
      .select("*")
      .eq("series_id", seriesId)
      .order("season_number", { ascending: true })
      .order("episode_number", { ascending: true });
    setEpisodes(data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleAddMovie = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const movieData = {
      title: (formData.get("title") as string) || "",
      description: (formData.get("description") as string) || "",
      poster_url: (formData.get("poster_url") as string) || "",
      backdrop_url: (formData.get("backdrop_url") as string) || "",
      rating: parseFloat((formData.get("rating") as string) || "0"),
      year: parseInt((formData.get("year") as string) || "0"),
      category: (formData.get("category") as string) || "",
      duration: (formData.get("duration") as string) || "",
      video_url: ((formData.get("video_url") as string) || "").replace(/&amp;/g, "&").trim(),
      trailer_url: (formData.get("trailer_url") as string) || "",
    };

    try {
      const validated = movieSchema.parse(movieData);
      
      const { error } = await supabase.from("movies").insert([validated as any]);

      if (error) {
        toast({ variant: "destructive", title: "Hata", description: error.message });
      } else {
        toast({ title: "Başarılı", description: "Film eklendi" });
        e.currentTarget.reset();
        loadMovies();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ variant: "destructive", title: "Doğrulama Hatası", description: error.errors[0].message });
      }
    }
  };

  const handleAddSeries = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const seriesData = {
      title: (formData.get("title") as string) || "",
      description: (formData.get("description") as string) || "",
      poster_url: (formData.get("poster_url") as string) || "",
      backdrop_url: (formData.get("backdrop_url") as string) || "",
      rating: parseFloat((formData.get("rating") as string) || "0"),
      year: parseInt((formData.get("year") as string) || "0"),
      category: (formData.get("category") as string) || "",
      trailer_url: (formData.get("trailer_url") as string) || "",
    };

    try {
      const validated = seriesSchema.parse(seriesData);
      
      const { error } = await supabase.from("series").insert([validated as any]);

      if (error) {
        toast({ variant: "destructive", title: "Hata", description: error.message });
      } else {
        toast({ title: "Başarılı", description: "Dizi eklendi" });
        e.currentTarget.reset();
        loadSeries();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ variant: "destructive", title: "Doğrulama Hatası", description: error.errors[0].message });
      }
    }
  };

  const handleAddEpisode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const episodeData = {
      title: (formData.get("title") as string) || "",
      description: (formData.get("description") as string) || "",
      episode_number: parseInt((formData.get("episode_number") as string) || "0"),
      season_number: parseInt((formData.get("season_number") as string) || "0"),
      video_url: ((formData.get("video_url") as string) || "").replace(/&amp;/g, "&").trim(),
      duration: (formData.get("duration") as string) || "",
      thumbnail_url: (formData.get("thumbnail_url") as string) || "",
    };

    try {
      const validated = episodeSchema.parse(episodeData);
      
      const { error } = await supabase.from("episodes").insert([{
        series_id: selectedSeries,
        ...validated,
      } as any]);

      if (error) {
        toast({ variant: "destructive", title: "Hata", description: error.message });
      } else {
        toast({ title: "Başarılı", description: "Bölüm eklendi" });
        e.currentTarget.reset();
        loadEpisodes(selectedSeries);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ variant: "destructive", title: "Doğrulama Hatası", description: error.errors[0].message });
      }
    }
  };

  const handleDeleteMovie = async (id: string) => {
    const { error } = await supabase.from("movies").delete().eq("id", id);
    if (!error) {
      toast({ title: "Başarılı", description: "Film silindi" });
      loadMovies();
    }
  };

  const handleDeleteSeries = async (id: string) => {
    const { error } = await supabase.from("series").delete().eq("id", id);
    if (!error) {
      toast({ title: "Başarılı", description: "Dizi silindi" });
      loadSeries();
    }
  };

  const handleDeleteEpisode = async (id: string) => {
    const { error } = await supabase.from("episodes").delete().eq("id", id);
    if (!error) {
      toast({ title: "Başarılı", description: "Bölüm silindi" });
      loadEpisodes(selectedSeries);
    }
  };

  return (
    <div className="min-h-screen bg-cinema-dark p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Film className="w-8 h-8 text-gold" />
            <h1 className="text-3xl font-bold text-gold gold-glow">Admin Paneli</h1>
          </div>
          <Button onClick={handleLogout} variant="destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>

        <Tabs defaultValue="movies" className="space-y-6">
          <TabsList className="bg-card">
            <TabsTrigger value="movies">
              <Film className="w-4 h-4 mr-2" />
              Filmler
            </TabsTrigger>
            <TabsTrigger value="series">
              <Tv className="w-4 h-4 mr-2" />
              Diziler
            </TabsTrigger>
            <TabsTrigger value="episodes">
              <Plus className="w-4 h-4 mr-2" />
              Bölümler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="movies" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Yeni Film Ekle</CardTitle>
                <CardDescription>Film bilgilerini doldurun</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddMovie} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Başlık *</Label>
                      <Input name="title" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategori *</Label>
                      <Select name="category" required>
                        <SelectTrigger className="bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.filter(c => c !== "Tümü").map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Yıl *</Label>
                      <Input name="year" type="number" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rating">IMDb Puanı *</Label>
                      <Input name="rating" type="number" step="0.1" min="0" max="10" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Süre *</Label>
                      <Input name="duration" placeholder="2s 25dk" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="video_url">Video URL *</Label>
                      <Input name="video_url" type="url" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poster_url">Poster URL</Label>
                      <Input name="poster_url" type="url" className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backdrop_url">Backdrop URL</Label>
                      <Input name="backdrop_url" type="url" className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trailer_url">Fragman URL</Label>
                      <Input name="trailer_url" type="url" className="bg-secondary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <Textarea name="description" rows={3} className="bg-secondary" />
                  </div>
                  <Button type="submit" className="bg-gold hover:bg-gold-light text-black">
                    Film Ekle
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Mevcut Filmler ({movies.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {movies.map((movie) => (
                    <div key={movie.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div>
                        <p className="font-semibold">{movie.title}</p>
                        <p className="text-sm text-muted-foreground">{movie.year} • {movie.category}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteMovie(movie.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="series" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Yeni Dizi Ekle</CardTitle>
                <CardDescription>Dizi bilgilerini doldurun</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddSeries} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Başlık *</Label>
                      <Input name="title" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategori *</Label>
                      <Select name="category" required>
                        <SelectTrigger className="bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.filter(c => c !== "Tümü").map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Yıl *</Label>
                      <Input name="year" type="number" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rating">IMDb Puanı *</Label>
                      <Input name="rating" type="number" step="0.1" min="0" max="10" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poster_url">Poster URL</Label>
                      <Input name="poster_url" type="url" className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backdrop_url">Backdrop URL</Label>
                      <Input name="backdrop_url" type="url" className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trailer_url">Fragman URL</Label>
                      <Input name="trailer_url" type="url" className="bg-secondary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <Textarea name="description" rows={3} className="bg-secondary" />
                  </div>
                  <Button type="submit" className="bg-gold hover:bg-gold-light text-black">
                    Dizi Ekle
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Mevcut Diziler ({series.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {series.map((show) => (
                    <div key={show.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div>
                        <p className="font-semibold">{show.title}</p>
                        <p className="text-sm text-muted-foreground">{show.year} • {show.category}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSeries(show.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="episodes" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Diziye Bölüm Ekle</CardTitle>
                <CardDescription>Önce dizi seçin, sonra bölüm ekleyin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="series_select">Dizi Seçin *</Label>
                  <Select value={selectedSeries} onValueChange={setSelectedSeries}>
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Bir dizi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {series.map((show) => (
                        <SelectItem key={show.id} value={show.id}>
                          {show.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSeries && (
                  <form onSubmit={handleAddEpisode} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Bölüm Başlığı *</Label>
                        <Input name="title" required className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="season_number">Sezon *</Label>
                        <Input name="season_number" type="number" min="1" required className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="episode_number">Bölüm No *</Label>
                        <Input name="episode_number" type="number" min="1" required className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration">Süre</Label>
                        <Input name="duration" placeholder="45dk" className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="video_url">Video URL *</Label>
                        <Input name="video_url" type="url" required className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                        <Input name="thumbnail_url" type="url" className="bg-secondary" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Açıklama</Label>
                      <Textarea name="description" rows={2} className="bg-secondary" />
                    </div>
                    <Button type="submit" className="bg-gold hover:bg-gold-light text-black">
                      Bölüm Ekle
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {selectedSeries && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>
                    {series.find(s => s.id === selectedSeries)?.title} - Bölümler ({episodes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {episodes.map((episode) => (
                      <div key={episode.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                        <div>
                          <p className="font-semibold">
                            S{episode.season_number}E{episode.episode_number} - {episode.title}
                          </p>
                          <p className="text-sm text-muted-foreground">{episode.duration}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteEpisode(episode.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
