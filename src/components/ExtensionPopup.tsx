import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Chrome, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    // Sadece bilgisayardan girişte göster
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) return;

    // Daha önce gösterildi mi kontrol et
    const wasShown = localStorage.getItem(POPUP_SHOWN_KEY);
    if (wasShown) return;

    // Eklenti yüklü mü kontrol et
    checkExtension();

    // Popup'ı göster
    const timer = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(POPUP_SHOWN_KEY, 'true');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const checkExtension = () => {
    // Chrome eklentisi ile iletişim dene
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
      
      // Tüm dosyaları fetch et ve zip'e ekle
      const fetchPromises = EXTENSION_FILES.map(async (filename) => {
        const response = await fetch(`/extension/${filename}`);
        if (response.ok) {
          const blob = await response.blob();
          zip.file(filename, blob);
        }
      });
      
      await Promise.all(fetchPromises);
      
      // ZIP dosyasını oluştur ve indir
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Chrome className="w-6 h-6 text-primary" />
            Video Player Eklentisi
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Tüm videoların sorunsuz oynatılması için Chrome eklentisini yükleyin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
