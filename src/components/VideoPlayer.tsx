import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import * as dashjs from "dashjs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
}

const VideoPlayer = ({ src, poster }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizeUrl = (u: string) => {
    if (!u) return u;
    let out = u.trim();
    // Decode common HTML entities and strip quotes
    out = out.replace(/&amp;/g, '&').replace(/^"|"$/g, '');
    // Fix missing protocol variants
    if (/^ttps?:\/\//i.test(out)) out = 'h' + out; // fix missing 'h' in protocol
    if (/^\/\//.test(out)) out = 'https:' + out;   // protocol-relative -> https
    return out;
  };

  useEffect(() => {
    if (!videoRef.current || !src) return;

    const video = videoRef.current;
    const normalizedSrc = normalizeUrl(src);
    setError(null);

    // Determine the video format
    const isHLS = /\.m3u8?(\?|$)/i.test(normalizedSrc);
    const isDASH = /\.mpd(\?|$)/i.test(normalizedSrc);
    const isMP4 = /\.mp4(\?|$)/i.test(normalizedSrc);

    try {
      if (isHLS && Hls.isSupported()) {
        // HLS.js for .m3u8 streams
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          xhrSetup: (xhr) => {
            try {
              // Credentials kapalı tut, bazı CDN'lerde gerekli
              xhr.withCredentials = false;
            } catch {}
          },
        });
        
        hls.loadSource(normalizedSrc);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("HLS manifest loaded");
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS Error:", data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Try to recover network error
                try { hls.startLoad(); } catch {}
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                // Try to recover media error
                try { hls.recoverMediaError(); } catch {}
                break;
              default:
                setError("Video yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
                hls.destroy();
                break;
            }
          }
        });

        return () => {
          hls.destroy();
        };
      } else if (isDASH) {
        // DASH.js for .mpd streams
        const player = dashjs.MediaPlayer().create();
        player.initialize(video, normalizedSrc, true);
        
        player.on('error', (e: any) => {
          setError("Video yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
          console.error("DASH Error:", e);
        });

        return () => {
          player.destroy();
        };
      } else if (isMP4 || video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native support for MP4 or Safari HLS
        video.src = normalizedSrc;
        video.load();
      } else {
        setError("Bu video formatı desteklenmiyor.");
      }
    } catch (err) {
      setError("Video oynatıcı başlatılırken bir hata oluştu.");
      console.error("Video Player Error:", err);
    }
  }, [src]);

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden">
      {error ? (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <video
          ref={videoRef}
          controls
          poster={poster}
          className="w-full aspect-video"
          controlsList="nodownload"
          crossOrigin="anonymous"
          preload="metadata"
        >
          Tarayıcınız video oynatmayı desteklemiyor.
        </video>
      )}
    </div>
  );
};

export default VideoPlayer;
