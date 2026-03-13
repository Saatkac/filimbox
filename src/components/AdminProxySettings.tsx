import { useState } from 'react';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Server, Globe, Code, Cloud, Check } from 'lucide-react';

const proxyMethods = [
  {
    key: 'builtin',
    label: 'FilimBox Dahili Proxy',
    description: 'Kullanıcı → FilimBox Sunucusu → CDN (Supabase Edge Function)',
    icon: Server,
  },
  {
    key: 'custom_php',
    label: 'PHP M3U8 Proxy',
    description: 'Kendi PHP sunucunuz üzerinden proxy (proxy.php?url=...)',
    icon: Globe,
  },
  {
    key: 'custom_node',
    label: 'Node.js Proxy (Express)',
    description: 'Kendi Node.js/Express sunucunuz üzerinden proxy',
    icon: Code,
  },
  {
    key: 'cloudflare_worker',
    label: 'Cloudflare Worker',
    description: 'Cloudflare Worker üzerinden proxy (düşük gecikme, global CDN)',
    icon: Cloud,
  },
  {
    key: 'disabled',
    label: 'Proxy Kapalı',
    description: 'Doğrudan video kaynağına bağlan (CORS sorunları olabilir)',
    icon: Globe,
  },
];

const AdminProxySettings = () => {
  const { textSettings, updateTextSetting } = useAdminSettings();
  const { toast } = useToast();
  const [phpUrl, setPhpUrl] = useState(textSettings.proxy_custom_php_url);
  const [nodeUrl, setNodeUrl] = useState(textSettings.proxy_custom_node_url);
  const [cfUrl, setCfUrl] = useState(textSettings.proxy_cloudflare_worker_url);
  const [saving, setSaving] = useState(false);

  const selectMethod = async (method: string) => {
    try {
      await updateTextSetting('proxy_method', method);
      toast({ title: 'Başarılı', description: `Proxy yöntemi değiştirildi: ${proxyMethods.find(m => m.key === method)?.label}` });
    } catch {
      toast({ variant: 'destructive', title: 'Hata', description: 'Proxy yöntemi değiştirilemedi' });
    }
  };

  const saveUrls = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateTextSetting('proxy_custom_php_url', phpUrl),
        updateTextSetting('proxy_custom_node_url', nodeUrl),
        updateTextSetting('proxy_cloudflare_worker_url', cfUrl),
      ]);
      toast({ title: 'Başarılı', description: 'Proxy URL\'leri kaydedildi' });
    } catch {
      toast({ variant: 'destructive', title: 'Hata', description: 'URL\'ler kaydedilemedi' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gold">
          <Server className="w-5 h-5" />
          Video Proxy Yöntemi
        </CardTitle>
        <CardDescription>
          Video akışı için kullanılacak proxy yöntemini seçin. Proxy, CORS ve Referer sorunlarını çözer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Method Selection */}
        <div className="space-y-3">
          {proxyMethods.map((method) => {
            const Icon = method.icon;
            const isActive = textSettings.proxy_method === method.key;
            return (
              <button
                key={method.key}
                onClick={() => selectMethod(method.key)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
                  isActive
                    ? 'border-gold bg-gold/10'
                    : 'border-border bg-background/50 hover:bg-background/80'
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-gold/20' : 'bg-muted'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-gold' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{method.label}</div>
                  <div className="text-sm text-muted-foreground">{method.description}</div>
                </div>
                {isActive && <Check className="w-5 h-5 text-gold flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Custom URL inputs */}
        {(textSettings.proxy_method === 'custom_php' || textSettings.proxy_method === 'custom_node' || textSettings.proxy_method === 'cloudflare_worker') && (
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-medium text-foreground">Özel Proxy URL Ayarları</h4>
            
            {textSettings.proxy_method === 'custom_php' && (
              <div className="space-y-2">
                <Label>PHP Proxy URL</Label>
                <Input
                  value={phpUrl}
                  onChange={(e) => setPhpUrl(e.target.value)}
                  placeholder="https://mysite.com/proxy.php?url="
                  className="bg-secondary"
                />
                <p className="text-xs text-muted-foreground">
                  Video URL'si bu adresin sonuna eklenir. Örn: https://mysite.com/proxy.php?url=VIDEO_URL
                </p>
              </div>
            )}

            {textSettings.proxy_method === 'custom_node' && (
              <div className="space-y-2">
                <Label>Node.js Proxy URL</Label>
                <Input
                  value={nodeUrl}
                  onChange={(e) => setNodeUrl(e.target.value)}
                  placeholder="https://mysite.com/proxy?url="
                  className="bg-secondary"
                />
                <p className="text-xs text-muted-foreground">
                  Express proxy endpoint URL'si. Video URL'si query parametresi olarak eklenir.
                </p>
              </div>
            )}

            {textSettings.proxy_method === 'cloudflare_worker' && (
              <div className="space-y-2">
                <Label>Cloudflare Worker URL</Label>
                <Input
                  value={cfUrl}
                  onChange={(e) => setCfUrl(e.target.value)}
                  placeholder="https://video-proxy.yourname.workers.dev/?url="
                  className="bg-secondary"
                />
                <p className="text-xs text-muted-foreground">
                  Cloudflare Worker proxy URL'si. Global CDN üzerinden düşük gecikme sağlar.
                </p>
              </div>
            )}

            <Button
              onClick={saveUrls}
              disabled={saving}
              className="bg-gold hover:bg-gold-light text-black"
            >
              {saving ? 'Kaydediliyor...' : 'URL\'leri Kaydet'}
            </Button>
          </div>
        )}

        {/* Info box for builtin */}
        {textSettings.proxy_method === 'builtin' && (
          <div className="p-4 rounded-lg bg-gold/5 border border-gold/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-gold">Dahili Proxy</strong> aktif. Video akışları FilimBox sunucusu üzerinden yönlendirilir.
              M3U8 manifest'leri otomatik olarak yeniden yazılır, Referer header'ları eklenir ve CORS sorunları çözülür.
            </p>
          </div>
        )}

        {textSettings.proxy_method === 'disabled' && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-destructive">Uyarı:</strong> Proxy kapalı. Bazı video kaynakları CORS veya Referer
              kısıtlamaları nedeniyle çalışmayabilir. Sorun yaşarsanız bir proxy yöntemi seçin.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminProxySettings;
