import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Users, Send, Video, VideoOff, Mic, MicOff, X, Minimize2, MessageSquare, GripHorizontal } from "lucide-react";
import Draggable from "react-draggable";

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
  onPlay: () => void;
  onPause: () => void;
  currentTime: number;
  isPlaying: boolean;
}

const WatchParty = ({ partyId, onClose, onSeek, onPlay, onPause, currentTime, isPlaying }: WatchPartyProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [videoMinimized, setVideoMinimized] = useState(false);
  const [isHost, setIsHost] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const syncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSyncRef = useRef<number>(0);
  const nodeRef = useRef(null);
  const chatNodeRef = useRef(null);

  // Initialize sync channel
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`party-sync-${partyId}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'play' }, ({ payload }) => {
        console.log('Received play from', payload.from, 'at', payload.time);
        if (payload.from !== user.id) {
          onSeek(payload.time);
          onPlay();
          toast({ title: `${payload.username || 'Kullanıcı'} videoyu başlattı` });
        }
      })
      .on('broadcast', { event: 'pause' }, ({ payload }) => {
        console.log('Received pause from', payload.from, 'at', payload.time);
        if (payload.from !== user.id) {
          onPause();
          onSeek(payload.time);
          toast({ title: `${payload.username || 'Kullanıcı'} videoyu durdurdu` });
        }
      })
      .on('broadcast', { event: 'seek' }, ({ payload }) => {
        console.log('Received seek from', payload.from, 'to', payload.time);
        if (payload.from !== user.id) {
          onSeek(payload.time);
          toast({ title: `${payload.username || 'Kullanıcı'} ${Math.floor(payload.time / 60)}:${Math.floor(payload.time % 60).toString().padStart(2, '0')}'e atladı` });
        }
      })
      .on('broadcast', { event: 'sync-request' }, ({ payload }) => {
        // Host responds to sync requests
        if (isHost && payload.from !== user.id) {
          channel.send({
            type: 'broadcast',
            event: 'sync-response',
            payload: {
              from: user.id,
              to: payload.from,
              time: currentTime,
              isPlaying
            }
          });
        }
      })
      .on('broadcast', { event: 'sync-response' }, ({ payload }) => {
        if (payload.to === user.id) {
          console.log('Sync response:', payload);
          onSeek(payload.time);
          if (payload.isPlaying) {
            onPlay();
          } else {
            onPause();
          }
        }
      })
      .subscribe();

    syncChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, partyId, isHost]);

  // Request sync on join
  useEffect(() => {
    if (syncChannelRef.current && user && !isHost) {
      setTimeout(() => {
        syncChannelRef.current?.send({
          type: 'broadcast',
          event: 'sync-request',
          payload: { from: user.id }
        });
      }, 1000);
    }
  }, [isHost, user]);

  // Broadcast play/pause/seek
  const broadcastPlay = useCallback((time: number) => {
    const now = Date.now();
    if (now - lastSyncRef.current < 500) return;
    lastSyncRef.current = now;
    
    const myProfile = participants.find(p => p.user_id === user?.id);
    syncChannelRef.current?.send({
      type: 'broadcast',
      event: 'play',
      payload: { 
        from: user?.id, 
        time,
        username: myProfile?.profiles?.username
      }
    });
  }, [user?.id, participants]);

  const broadcastPause = useCallback((time: number) => {
    const now = Date.now();
    if (now - lastSyncRef.current < 500) return;
    lastSyncRef.current = now;
    
    const myProfile = participants.find(p => p.user_id === user?.id);
    syncChannelRef.current?.send({
      type: 'broadcast',
      event: 'pause',
      payload: { 
        from: user?.id, 
        time,
        username: myProfile?.profiles?.username
      }
    });
  }, [user?.id, participants]);

  const broadcastSeek = useCallback((time: number) => {
    const now = Date.now();
    if (now - lastSyncRef.current < 500) return;
    lastSyncRef.current = now;
    
    const myProfile = participants.find(p => p.user_id === user?.id);
    syncChannelRef.current?.send({
      type: 'broadcast',
      event: 'seek',
      payload: { 
        from: user?.id, 
        time,
        username: myProfile?.profiles?.username
      }
    });
  }, [user?.id, participants]);

  // Expose broadcast functions to parent via window
  useEffect(() => {
    (window as any).__watchPartySync = {
      broadcastPlay,
      broadcastPause,
      broadcastSeek
    };
    return () => {
      delete (window as any).__watchPartySync;
    };
  }, [broadcastPlay, broadcastPause, broadcastSeek]);

  // Load participants and messages
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
      }, () => {
        loadMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(messagesChannel);
      stopMedia();
    };
  }, [user, partyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from("watch_party_participants")
        .select("id, user_id, video_progress, is_host, joined_at")
        .eq("party_id", partyId)
        .is("left_at", null);

      if (error) {
        console.error("Load participants error:", error);
        return;
      }

      if (data && data.length > 0) {
        const userIds = data.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", userIds);

        const participantsWithProfiles = data.map(d => ({
          ...d,
          profiles: profiles?.find(p => p.user_id === d.user_id) || null
        }));

        setParticipants(participantsWithProfiles);
        
        // Check if current user is host
        const myParticipation = data.find(d => d.user_id === user?.id);
        setIsHost(myParticipation?.is_host || false);
      }
    } catch (err) {
      console.error("Load participants exception:", err);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("party_messages")
        .select("id, user_id, message, created_at")
        .eq("party_id", partyId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("Load messages error:", error);
        return;
      }

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(d => d.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", userIds);

        setMessages(data.map(d => ({
          ...d,
          profiles: profiles?.find(p => p.user_id === d.user_id) || null
        })));
      }
    } catch (err) {
      console.error("Load messages exception:", err);
    }
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      const { error } = await supabase
        .from("party_messages")
        .insert({
          party_id: partyId,
          user_id: user.id,
          message: messageText
        });

      if (error) {
        console.error("Message send error:", error.message);
        setNewMessage(messageText);
        toast({ 
          variant: "destructive", 
          title: "Mesaj gönderilemedi"
        });
      } else {
        const newMsg: Message = {
          id: crypto.randomUUID(),
          user_id: user.id,
          message: messageText,
          created_at: new Date().toISOString(),
          profiles: participants.find(p => p.user_id === user.id)?.profiles || null
        };
        setMessages(prev => [...prev, newMsg]);
      }
    } catch (err) {
      console.error("Message send exception:", err);
      setNewMessage(messageText);
    }
  };

  const handleClose = async () => {
    // Leave the party
    if (user) {
      await supabase
        .from("watch_party_participants")
        .update({ left_at: new Date().toISOString() })
        .eq("party_id", partyId)
        .eq("user_id", user.id);
      
      // If host, end the party
      if (isHost) {
        await supabase
          .from("watch_parties")
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq("id", partyId);
      }
    }
    
    stopMedia();
    onClose();
  };

  const startMedia = async (video: boolean, audio: boolean) => {
    try {
      // Stop existing tracks first
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: video ? { width: 320, height: 240, facingMode: 'user' } : false, 
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return true;
    } catch (error) {
      console.error('Media access error:', error);
      return false;
    }
  };

  const toggleVideo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!videoEnabled) {
      const success = await startMedia(true, audioEnabled);
      if (success) {
        setVideoEnabled(true);
        toast({ title: "Kamera açıldı" });
      } else {
        toast({ variant: "destructive", title: "Kamera erişimi reddedildi" });
      }
    } else {
      localStreamRef.current?.getVideoTracks().forEach(track => {
        track.stop();
        localStreamRef.current?.removeTrack(track);
      });
      setVideoEnabled(false);
      toast({ title: "Kamera kapatıldı" });
    }
  };

  const toggleAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!audioEnabled) {
      const success = await startMedia(videoEnabled, true);
      if (success) {
        setAudioEnabled(true);
        toast({ title: "Mikrofon açıldı" });
      } else {
        toast({ variant: "destructive", title: "Mikrofon erişimi reddedildi" });
      }
    } else {
      localStreamRef.current?.getAudioTracks().forEach(track => {
        track.stop();
        localStreamRef.current?.removeTrack(track);
      });
      setAudioEnabled(false);
      toast({ title: "Mikrofon kapatıldı" });
    }
  };

  const stopMedia = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    setVideoEnabled(false);
    setAudioEnabled(false);
  };

  return (
    <>
      {/* Video Panel - Draggable */}
      {(videoEnabled || remoteStreams.size > 0) && !videoMinimized && (
        <Draggable handle=".video-drag-handle" bounds="parent" nodeRef={nodeRef}>
          <div ref={nodeRef} className="fixed top-20 right-80 z-50 bg-card border-2 border-primary rounded-lg overflow-hidden shadow-2xl">
            <div className="video-drag-handle bg-primary/20 p-2 flex justify-between items-center cursor-move">
              <div className="flex items-center gap-2">
                <GripHorizontal className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Video</span>
              </div>
              <div className="flex gap-1" onMouseDown={e => e.stopPropagation()}>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setVideoMinimized(true); }}>
                  <Minimize2 className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); stopMedia(); }}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="p-2">
              {videoEnabled && (
                <div className="relative">
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    muted 
                    playsInline
                    className="w-48 h-36 bg-black rounded object-cover"
                  />
                  <span className="absolute bottom-1 left-1 text-xs bg-black/70 px-1 rounded">Sen</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 p-2 bg-background/95 border-t" onMouseDown={e => e.stopPropagation()}>
              <Button size="sm" variant={videoEnabled ? "default" : "secondary"} onClick={toggleVideo}>
                {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant={audioEnabled ? "default" : "secondary"} onClick={toggleAudio}>
                {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </Draggable>
      )}

      {/* Minimized video indicator */}
      {videoMinimized && (videoEnabled || remoteStreams.size > 0) && (
        <Button 
          className="fixed top-20 right-80 z-50" 
          size="sm"
          onClick={() => setVideoMinimized(false)}
        >
          <Video className="w-4 h-4 mr-2" />
          Video
        </Button>
      )}

      {/* Chat Panel - Draggable */}
      {!chatMinimized ? (
        <Draggable handle=".chat-drag-handle" bounds="parent" nodeRef={chatNodeRef}>
          <Card ref={chatNodeRef} className="fixed bottom-4 right-4 w-72 h-[360px] z-40 flex flex-col shadow-2xl">
            <div className="chat-drag-handle p-2 border-b flex justify-between items-center bg-primary/10 cursor-move">
              <div className="flex items-center gap-2">
                <GripHorizontal className="w-4 h-4 text-muted-foreground" />
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Parti ({participants.length})</h3>
                {isHost && <span className="text-xs text-primary">👑</span>}
              </div>
              <div className="flex gap-1" onMouseDown={e => e.stopPropagation()}>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={toggleVideo}>
                  {videoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={toggleAudio}>
                  {audioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setChatMinimized(true); }}>
                  <Minimize2 className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); handleClose(); }}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="p-1.5 border-b bg-muted/50 max-h-16 overflow-y-auto">
              <div className="flex gap-1 flex-wrap">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center gap-1 bg-background px-1.5 py-0.5 rounded-full text-[10px]">
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={p.profiles?.avatar_url || ""} />
                      <AvatarFallback className="text-[8px]">{p.profiles?.username?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="max-w-[50px] truncate">{p.profiles?.username || "Kullanıcı"}</span>
                    {p.is_host && <span>👑</span>}
                  </div>
                ))}
              </div>
            </div>

            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-1.5">
                    <Avatar className="w-5 h-5 flex-shrink-0">
                      <AvatarImage src={msg.profiles?.avatar_url || ""} />
                      <AvatarFallback className="text-[8px]">{msg.profiles?.username?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-medium truncate">{msg.profiles?.username || "Kullanıcı"}</span>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground break-words">{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-2 border-t flex gap-1.5" onMouseDown={e => e.stopPropagation()}>
              <Input
                placeholder="Mesaj yazın..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                className="h-7 text-xs"
              />
              <Button size="icon" className="h-7 w-7" onClick={sendMessage}>
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        </Draggable>
      ) : (
        <Button 
          className="fixed bottom-4 right-4 z-40 shadow-lg" 
          onClick={() => setChatMinimized(false)}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Sohbet ({messages.length})
        </Button>
      )}
    </>
  );
};

export default WatchParty;
