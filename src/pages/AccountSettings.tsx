import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, LogOut, User, Image as ImageIcon } from "lucide-react";

const AccountSettings = () => {
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("https://www.hdfilmizle.life/assets/front/img/default-pp.webp");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setUsername(data.username || "");
      setAvatarUrl(data.avatar_url || "https://www.hdfilmizle.life/assets/front/img/default-pp.webp");
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (isAdmin) {
      toast({ 
        variant: "destructive", 
        title: "Uyarı", 
        description: "Admin kullanıcı adını değiştiremezsiniz" 
      });
      return;
    }

    if (!username.trim()) {
      toast({ variant: "destructive", title: "Hata", description: "Kullanıcı adı boş olamaz" });
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from("profiles")
      .upsert({ 
        user_id: user.id, 
        username: username.trim(),
        avatar_url: avatarUrl
      }, { onConflict: 'user_id' });

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    } else {
      toast({ title: "Başarılı", description: "Kullanıcı adı güncellendi" });
      loadProfile();
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-cinema-dark">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-gold" />
          <h1 className="text-3xl font-bold text-gold">Hesap Ayarları</h1>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Profil Fotoğrafı
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <img 
                  src={avatarUrl} 
                  alt="Profil Resmi" 
                  className="w-20 h-20 rounded-full object-cover"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profil Bilgileri
              </CardTitle>
              <CardDescription>
                {isAdmin && "Admin kullanıcı adı değiştirilemez"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" value={user?.email || ""} disabled className="bg-secondary" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isAdmin}
                  className="bg-secondary"
                />
              </div>

              <Button 
                onClick={handleSave} 
                disabled={loading || isAdmin}
                className="bg-gold hover:bg-gold-light text-black"
              >
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <LogOut className="w-5 h-5" />
                Çıkış Yap
              </CardTitle>
              <CardDescription>Hesabınızdan çıkış yapın</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleLogout} 
                variant="destructive"
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Çıkış Yap
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
