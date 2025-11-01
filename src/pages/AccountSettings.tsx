import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Settings, Mail, Lock, LogOut, User } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Geçerli bir email adresi girin");
const passwordSchema = z.string().min(6, "Şifre en az 6 karakter olmalıdır");
const usernameSchema = z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır").max(30, "Kullanıcı adı en fazla 30 karakter olabilir");

const AccountSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();
      
      if (data?.username) {
        setCurrentUsername(data.username);
        setUsername(data.username);
      }
    };
    fetchProfile();
  }, [user]);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(newEmail);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ variant: "destructive", title: "Hata", description: error.errors[0].message });
        return;
      }
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    
    if (error) {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    } else {
      toast({ title: "Başarılı", description: "Email adresiniz güncellendi. Lütfen yeni email adresinizi doğrulayın." });
      setNewEmail("");
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      passwordSchema.parse(newPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ variant: "destructive", title: "Hata", description: error.errors[0].message });
        return;
      }
    }

    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Hata", description: "Şifreler eşleşmiyor" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    } else {
      toast({ title: "Başarılı", description: "Şifreniz güncellendi" });
      setNewPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  };

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      usernameSchema.parse(username);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ variant: "destructive", title: "Hata", description: error.errors[0].message });
        return;
      }
    }

    setLoading(true);
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { error } = await supabase
        .from('profiles')
        .update({ username })
        .eq('user_id', user?.id);
      
      if (error) {
        toast({ variant: "destructive", title: "Hata", description: error.message });
      } else {
        toast({ title: "Başarılı", description: "Kullanıcı adınız güncellendi" });
        setCurrentUsername(username);
      }
    } else {
      // Insert new profile
      const { error } = await supabase
        .from('profiles')
        .insert({ user_id: user?.id, username });
      
      if (error) {
        toast({ variant: "destructive", title: "Hata", description: error.message });
      } else {
        toast({ title: "Başarılı", description: "Kullanıcı adınız ayarlandı" });
        setCurrentUsername(username);
      }
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-cinema-dark">
      <Navbar />
      <div className="container mx-auto px-4 pt-32 pb-16 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-gold" />
          <h1 className="text-4xl font-bold text-gold gold-glow">Hesap Ayarları</h1>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Kullanıcı Adı
              </CardTitle>
              <CardDescription>
                {currentUsername ? `Mevcut kullanıcı adı: ${currentUsername}` : 'Henüz kullanıcı adı belirlenmedi'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUsernameChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Kullanıcı Adı</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="kullaniciadi"
                    className="bg-secondary"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="bg-gold hover:bg-gold-light text-black"
                  disabled={loading}
                >
                  Kullanıcı Adını Güncelle
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Değiştir
              </CardTitle>
              <CardDescription>Mevcut email: {user.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmail">Yeni Email</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="yeni@email.com"
                    className="bg-secondary"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="bg-gold hover:bg-gold-light text-black"
                  disabled={loading}
                >
                  Email'i Güncelle
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Şifre Değiştir
              </CardTitle>
              <CardDescription>Yeni şifrenizi girin</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Yeni Şifre</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    className="bg-secondary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Şifrenizi tekrar girin"
                    className="bg-secondary"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="bg-gold hover:bg-gold-light text-black"
                  disabled={loading}
                >
                  Şifreyi Güncelle
                </Button>
              </form>
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
