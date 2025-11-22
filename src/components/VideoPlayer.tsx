import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  initialProgress?: number;
  onProgressUpdate?: (currentTime: number, duration: number) => void;
}

const VideoPlayer = ({ src, poster, initialProgress = 0, onProgressUpdate }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    console.log('[VideoPlayer] Loading video:', src);
    setError(null);

    const handleTimeUpdate = () => {
      if (onProgressUpdate && video.duration > 0) {
        onProgressUpdate(video.currentTime, video.duration);
      }
    };
    
    const handleLoadedMetadata = () => {
      console.log('[VideoPlayer] Video loaded, duration:', video.duration);
      if (initialProgress > 0 && video.duration > 0) {
        video.currentTime = Math.min(initialProgress, video.duration - 1);
      }
    };
    
    const handleError = () => {
      console.error('[VideoPlayer] Video error');
      setError("Video yüklenemedi. Lütfen tekrar deneyin.");
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
    };
  }, [src, initialProgress, onProgressUpdate]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      {error && (
        <Alert variant="destructive" className="absolute top-4 left-4 right-4 z-10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        className="w-full h-full"
        playsInline
      />
    </div>
  );
};

export default VideoPlayer;
