import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Users, Send, Video, VideoOff, Mic, MicOff, X } from "lucide-react";

interface Participant {
  id: string;
  user_id: string;
  video_progress: number;
  is_host: boolean;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface WatchPartyProps {
  partyId: string;
  onClose: () => void;
  onSeek: (time: number) => void;
  currentTime: number;
}

const WatchParty = ({ partyId, onClose, onSeek, currentTime }: WatchPartyProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    loadParticipants();
    loadMessages();

    const participantsChannel = supabase
      .channel(`party-${partyId}-participants`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'watch_party_participants',
        filter: `party_id=eq.${partyId}`
      }, () => {
        loadParticipants();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel(`party-${partyId}-messages`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'party_messages',
        filter: `party_id=eq.${partyId}`
      }, (payload) => {
        loadMessages();
      })
      .subscribe();

    const progressInterval = setInterval(() => {
      updateProgress(currentTime);
    }, 2000);

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(messagesChannel);
      clearInterval(progressInterval);
      stopMedia();
    };
  }, [user, partyId, currentTime]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadParticipants = async () => {
    const { data } = await supabase
      .from("watch_party_participants")
      .select("*, profiles!inner(username, avatar_url)")
      .eq("party_id", partyId)
      .is("left_at", null);

    if (data) {
      setParticipants(data.map(d => ({
        ...d,
        profiles: d.profiles as any
      })));
    }
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("party_messages")
      .select("*, profiles!inner(username, avatar_url)")
      .eq("party_id", partyId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      setMessages(data.map(d => ({
        ...d,
        profiles: d.profiles as any
      })));
    }
  };

  const updateProgress = async (time: number) => {
    if (!user) return;
    
    await supabase
      .from("watch_party_participants")
      .update({ video_progress: time })
      .eq("party_id", partyId)
      .eq("user_id", user.id);
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    const { error } = await supabase
      .from("party_messages")
      .insert({
        party_id: partyId,
        user_id: user.id,
        message: newMessage.trim()
      });

    if (error) {
      toast({ variant: "destructive", title: "Mesaj gönderilemedi" });
    } else {
      setNewMessage("");
    }
  };

  const toggleVideo = async () => {
    if (!videoEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: audioEnabled });
        localStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setVideoEnabled(true);
      } catch (error) {
        toast({ variant: "destructive", title: "Kamera erişimi reddedildi" });
      }
    } else {
      stopMedia();
      setVideoEnabled(false);
    }
  };

  const toggleAudio = async () => {
    if (!audioEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: videoEnabled, audio: true });
        localStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setAudioEnabled(true);
      } catch (error) {
        toast({ variant: "destructive", title: "Mikrofon erişimi reddedildi" });
      }
    } else {
      localStreamRef.current?.getAudioTracks().forEach(track => track.stop());
      setAudioEnabled(false);
    }
  };

  const stopMedia = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
  };

  return (
    <>
      {videoEnabled && (
        <div className="fixed top-20 right-4 z-50 bg-card border-2 border-primary rounded-lg overflow-hidden shadow-2xl">
          <div className="bg-primary/20 p-2 flex justify-between items-center">
            <span className="text-sm font-medium">Video Sohbet</span>
            <Button size="icon" variant="ghost" onClick={() => setVideoEnabled(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <video ref={videoRef} autoPlay muted className="w-64 h-48 bg-black" />
          <div className="flex gap-2 p-2 bg-background/95">
            <Button size="sm" variant={videoEnabled ? "default" : "secondary"} onClick={toggleVideo}>
              {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
            <Button size="sm" variant={audioEnabled ? "default" : "secondary"} onClick={toggleAudio}>
              {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      <Card className="fixed bottom-4 right-4 w-96 h-[500px] z-40 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-primary/10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">İzleme Partisi ({participants.length})</h3>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={toggleVideo}>
              {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={toggleAudio}>
              {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-3 border-b bg-muted/50">
          <div className="flex gap-2 flex-wrap">
            {participants.map(p => (
              <div key={p.id} className="flex items-center gap-1 bg-background px-2 py-1 rounded-full text-xs">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={p.profiles?.avatar_url || ""} />
                  <AvatarFallback>{p.profiles?.username?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <span>{p.profiles?.username || "Kullanıcı"}</span>
                {p.is_host && <span className="text-primary">👑</span>}
              </div>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={msg.profiles?.avatar_url || ""} />
                  <AvatarFallback>{msg.profiles?.username?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{msg.profiles?.username || "Kullanıcı"}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{msg.message}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-3 border-t flex gap-2">
          <Input
            placeholder="Mesaj yazın..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <Button size="icon" onClick={sendMessage}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </>
  );
};

export default WatchParty;
