import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Chrome, CheckCircle2, AlertCircle, Loader2, Smartphone } from 'lucide-react';
import JSZip from 'jszip';

// Chrome extension API type declaration
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage?: (message: unknown, callback?: (response: unknown) => void) => void;
      };
    };
  }
}

const POPUP_SHOWN_KEY = 'extension_popup_shown';

const EXTENSION_FILES = [
  'manifest.json',
  'rules.json',
  'background.js',
  'popup.html',
  'popup.js',
  'icon16.png',
  'icon48.png',
  'icon128.png'
];

export const ExtensionPopup = () => {
  const [open, setOpen] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Mobil cihaz kontrolü
    const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobileCheck);

    // Daha önce gösterildi mi kontrol et
    const wasShown = localStorage.getItem(POPUP_SHOWN_KEY);
    if (wasShown) return;

    // Eklenti yüklü mü kontrol et (sadece masaüstü)
    if (!mobileCheck) {
      checkExtension();
    }

    // Popup'ı göster
    const timer = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(POPUP_SHOWN_KEY, 'true');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const checkExtension = () => {
    const chromeApi = window.chrome;
    if (chromeApi?.runtime?.sendMessage) {
      try {
        chromeApi.runtime.sendMessage({ action: 'checkStatus' }, (response: unknown) => {
          if (response && typeof response === 'object' && 'active' in response) {
            setHasExtension(true);
          }
        });
      } catch {
        setHasExtension(false);
      }
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      const zip = new JSZip();
      
      const fetchPromises = EXTENSION_FILES.map(async (filename) => {
        const response = await fetch(`/extension/${filename}`);
        if (response.ok) {
          const blob = await response.blob();
          zip.file(filename, blob);
        }
      });
      
      await Promise.all(fetchPromises);
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'video-player-helper.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Eklenti indirme hatası:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  // Mobil görünüm - APK indirme bilgisi
  const MobileContent = () => (
    <>
      <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <Smartphone className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-primary">Mobil Uygulama</p>
          <p className="text-sm text-muted-foreground">
            Tüm videolara sorunsuz erişim için FilimBox uygulamasını indirin.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-foreground">APK Kurulum Adımları:</h4>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>APK dosyasını indirin</li>
          <li>İndirilenler klasöründe APK'yı bulun</li>
          <li>Dosyaya tıklayarak yükleyin</li>
          <li>"Bilinmeyen kaynaklara izin ver" seçeneğini açın</li>
          <li>Kurulumu tamamlayın</li>
        </ol>
      </div>

      <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">⚠️ Not:</p>
        <p>APK dosyası hazırlanıyor. Yakında bu sayfadan indirebileceksiniz.</p>
      </div>
    </>
  );

  // Masaüstü görünüm - Chrome eklentisi
  const DesktopContent = () => (
    <>
      {hasExtension ? (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle2 className="w-6 h-6 text-green-500" />
          <div>
            <p className="font-medium text-green-500">Eklenti Yüklü</p>
            <p className="text-sm text-muted-foreground">Video oynatma hazır</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertCircle className="w-6 h-6 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-500">Eklenti Gerekli</p>
              <p className="text-sm text-muted-foreground">
                Bazı videolar CORS kısıtlamaları nedeniyle oynatılamayabilir. 
                Eklentiyi yükleyerek tüm videolara erişebilirsiniz.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Kurulum Adımları:</h4>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Aşağıdaki butona tıklayarak ZIP dosyasını indirin</li>
              <li>İndirilen ZIP dosyasını bir klasöre çıkartın</li>
              <li>Chrome'da <code className="bg-muted px-1.5 py-0.5 rounded text-xs">chrome://extensions</code> adresine gidin</li>
              <li>Sağ üstten "Geliştirici modu"nu açın</li>
              <li>"Paketlenmemiş öğe yükle" butonuna tıklayın</li>
              <li>Çıkarttığınız klasörü seçin</li>
              <li>Sayfayı yenileyin</li>
            </ol>
          </div>

          <Button 
            onClick={handleDownload} 
            className="w-full" 
            size="lg"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                İndiriliyor...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Eklentiyi İndir (ZIP)
              </>
            )}
          </Button>
        </>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {isMobile ? (
              <>
                <Smartphone className="w-6 h-6 text-primary" />
                FilimBox Uygulaması
              </>
            ) : (
              <>
                <Chrome className="w-6 h-6 text-primary" />
                Video Player Eklentisi
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isMobile 
              ? 'Tüm videoların sorunsuz oynatılması için uygulamayı yükleyin'
              : 'Tüm videoların sorunsuz oynatılması için Chrome eklentisini yükleyin'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isMobile ? <MobileContent /> : <DesktopContent />}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={handleClose}>
            {hasExtension ? 'Tamam' : 'Daha Sonra'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
