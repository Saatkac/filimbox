import { useAdminSettings } from '@/hooks/useAdminSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, Video, MessageSquare, Heart, Gauge } from 'lucide-react';

const settingsConfig = [
  {
    key: 'quality_selector_enabled' as const,
    label: 'Kalite Seçimi',
    description: 'Kullanıcıların video kalitesini değiştirmesine izin ver',
    icon: Video,
  },
  {
    key: 'playback_speed_enabled' as const,
    label: 'Oynatma Hızı',
    description: 'Kullanıcıların oynatma hızını değiştirmesine izin ver',
    icon: Gauge,
  },
  {
    key: 'comments_enabled' as const,
    label: 'Yorumlar',
    description: 'Yorum sistemini aç/kapat',
    icon: MessageSquare,
  },
  {
    key: 'favorites_enabled' as const,
    label: 'Favoriler',
    description: 'Favorilere ekleme özelliğini aç/kapat',
    icon: Heart,
  },
];

const AdminSettings = () => {
  const { settings, loading, updateSetting } = useAdminSettings();
  const { toast } = useToast();

  const handleToggle = async (key: keyof typeof settings, value: boolean) => {
    try {
      await updateSetting(key, value);
      toast({
        title: 'Başarılı',
        description: `Ayar ${value ? 'açıldı' : 'kapatıldı'}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Ayar güncellenirken hata oluştu',
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="text-muted-foreground">Ayarlar yükleniyor...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gold">
          <Settings className="w-5 h-5" />
          Özellik Ayarları
        </CardTitle>
        <CardDescription>
          Kullanıcıların erişebileceği özellikleri yönetin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {settingsConfig.map((setting) => {
          const Icon = setting.icon;
          return (
            <div
              key={setting.key}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-background/80 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-gold/10">
                  <Icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <Label htmlFor={setting.key} className="text-base font-medium text-foreground">
                    {setting.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
              </div>
              <Switch
                id={setting.key}
                checked={settings[setting.key]}
                onCheckedChange={(checked) => handleToggle(setting.key, checked)}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AdminSettings;
