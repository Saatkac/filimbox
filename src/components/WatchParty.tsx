import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Users, Send, Video, VideoOff, Mic, MicOff, X, Minimize2, Maximize2, MessageSquare } from "lucide-react";
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
  currentTime: number;
}

interface PeerConnection {
  pc: RTCPeerConnection;
  remoteStream: MediaStream;
}

const WatchParty = ({ partyId, onClose, onSeek, currentTime }: WatchPartyProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [videoMinimized, setVideoMinimized] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const signalingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ICE servers for WebRTC
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  // Initialize signaling channel for WebRTC
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`party-signaling-${partyId}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.to === user.id) {
          console.log('Received offer from', payload.from);
          await handleOffer(payload.from, payload.sdp);
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.to === user.id) {
          console.log('Received answer from', payload.from);
          await handleAnswer(payload.from, payload.sdp);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.to === user.id) {
          console.log('Received ICE candidate from', payload.from);
          await handleIceCandidate(payload.from, payload.candidate);
        }
      })
      .on('broadcast', { event: 'media-state' }, ({ payload }) => {
        console.log('Media state update from', payload.from, payload);
      })
      .subscribe();

    signalingChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, partyId]);

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

    const progressInterval = setInterval(() => {
      updateProgress(currentTime);
    }, 2000);

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(messagesChannel);
      clearInterval(progressInterval);
      stopMedia();
      closePeerConnections();
    };
  }, [user, partyId, currentTime]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const closePeerConnections = () => {
    peerConnectionsRef.current.forEach((conn) => {
      conn.pc.close();
    });
    peerConnectionsRef.current.clear();
    setRemoteStreams(new Map());
  };

  const createPeerConnection = useCallback((remoteUserId: string): RTCPeerConnection => {
    console.log('Creating peer connection for', remoteUserId);
    const pc = new RTCPeerConnection(iceServers);
    const remoteStream = new MediaStream();

    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannelRef.current) {
        signalingChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: user?.id,
            to: remoteUserId,
            candidate: event.candidate
          }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track', event.track.kind);
      remoteStream.addTrack(event.track);
      setRemoteStreams(prev => new Map(prev).set(remoteUserId, remoteStream));
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };

    // Add local tracks if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionsRef.current.set(remoteUserId, { pc, remoteStream });
    return pc;
  }, [user?.id]);

  const handleOffer = async (fromUserId: string, sdp: RTCSessionDescriptionInit) => {
    let peerConn = peerConnectionsRef.current.get(fromUserId);
    if (!peerConn) {
      const pc = createPeerConnection(fromUserId);
      peerConn = peerConnectionsRef.current.get(fromUserId)!;
    }

    await peerConn.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await peerConn.pc.createAnswer();
    await peerConn.pc.setLocalDescription(answer);

    signalingChannelRef.current?.send({
      type: 'broadcast',
      event: 'answer',
      payload: {
        from: user?.id,
        to: fromUserId,
        sdp: answer
      }
    });
  };

  const handleAnswer = async (fromUserId: string, sdp: RTCSessionDescriptionInit) => {
    const peerConn = peerConnectionsRef.current.get(fromUserId);
    if (peerConn) {
      await peerConn.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  };

  const handleIceCandidate = async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    const peerConn = peerConnectionsRef.current.get(fromUserId);
    if (peerConn) {
      await peerConn.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const initiateCall = async (remoteUserId: string) => {
    const pc = createPeerConnection(remoteUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    signalingChannelRef.current?.send({
      type: 'broadcast',
      event: 'offer',
      payload: {
        from: user?.id,
        to: remoteUserId,
        sdp: offer
      }
    });
  };

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

        setParticipants(data.map(d => ({
          ...d,
          profiles: profiles?.find(p => p.user_id === d.user_id) || null
        })));
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
        console.error("Message send error:", error.message, error.code, error.details);
        setNewMessage(messageText);
        toast({ 
          variant: "destructive", 
          title: "Mesaj gönderilemedi",
          description: error.message
        });
      } else {
        const newMsg: Message = {
          id: crypto.randomUUID(),
          user_id: user.id,
          message: messageText,
          created_at: new Date().toISOString(),
          profiles: null
        };
        setMessages(prev => [...prev, newMsg]);
      }
    } catch (err) {
      console.error("Message send exception:", err);
      setNewMessage(messageText);
      toast({ 
        variant: "destructive", 
        title: "Mesaj gönderilemedi"
      });
    }
  };

  const startMedia = async (video: boolean, audio: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: video ? { width: 320, height: 240 } : false, 
        audio 
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add tracks to existing peer connections
      peerConnectionsRef.current.forEach((conn) => {
        stream.getTracks().forEach(track => {
          conn.pc.addTrack(track, stream);
        });
      });

      // Initiate calls to all other participants
      participants.forEach(p => {
        if (p.user_id !== user?.id) {
          initiateCall(p.user_id);
        }
      });

      // Notify others about media state
      signalingChannelRef.current?.send({
        type: 'broadcast',
        event: 'media-state',
        payload: {
          from: user?.id,
          video,
          audio
        }
      });

      return true;
    } catch (error) {
      console.error('Media access error:', error);
      return false;
    }
  };

  const toggleVideo = async () => {
    if (!videoEnabled) {
      const success = await startMedia(true, audioEnabled);
      if (success) {
        setVideoEnabled(true);
        toast({ title: "Kamera açıldı" });
      } else {
        toast({ variant: "destructive", title: "Kamera erişimi reddedildi" });
      }
    } else {
      localStreamRef.current?.getVideoTracks().forEach(track => track.stop());
      setVideoEnabled(false);
      toast({ title: "Kamera kapatıldı" });
    }
  };

  const toggleAudio = async () => {
    if (!audioEnabled) {
      const success = await startMedia(videoEnabled, true);
      if (success) {
        setAudioEnabled(true);
        toast({ title: "Mikrofon açıldı" });
      } else {
        toast({ variant: "destructive", title: "Mikrofon erişimi reddedildi" });
      }
    } else {
      localStreamRef.current?.getAudioTracks().forEach(track => track.stop());
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

  const remoteVideoElements = Array.from(remoteStreams.entries()).map(([oderId, stream]) => {
    const participant = participants.find(p => p.user_id === oderId);
    return (
      <div key={oderId} className="relative">
        <video
          autoPlay
          playsInline
          className="w-32 h-24 bg-black rounded object-cover"
          ref={(el) => {
            if (el) el.srcObject = stream;
          }}
        />
        <span className="absolute bottom-1 left-1 text-xs bg-black/70 px-1 rounded">
          {participant?.profiles?.username || "Kullanıcı"}
        </span>
      </div>
    );
  });

  return (
    <>
      {/* Video Panel - Draggable */}
      {(videoEnabled || remoteStreams.size > 0) && !videoMinimized && (
        <Draggable handle=".drag-handle" bounds="parent">
          <div className="fixed top-20 right-4 z-50 bg-card border-2 border-primary rounded-lg overflow-hidden shadow-2xl">
            <div className="drag-handle bg-primary/20 p-2 flex justify-between items-center cursor-move">
              <span className="text-sm font-medium">Video Sohbet</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setVideoMinimized(true)}>
                  <Minimize2 className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={stopMedia}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="p-2 space-y-2">
              {/* Local video */}
              {videoEnabled && (
                <div className="relative">
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    muted 
                    playsInline
                    className="w-40 h-30 bg-black rounded object-cover"
                  />
                  <span className="absolute bottom-1 left-1 text-xs bg-black/70 px-1 rounded">Sen</span>
                </div>
              )}
              {/* Remote videos */}
              <div className="flex flex-wrap gap-2">
                {remoteVideoElements}
              </div>
            </div>
            <div className="flex gap-2 p-2 bg-background/95 border-t">
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
          className="fixed top-20 right-4 z-50" 
          size="sm"
          onClick={() => setVideoMinimized(false)}
        >
          <Video className="w-4 h-4 mr-2" />
          Video ({remoteStreams.size + (videoEnabled ? 1 : 0)})
        </Button>
      )}

      {/* Chat Panel - Draggable */}
      {!chatMinimized ? (
        <Draggable handle=".chat-drag-handle" bounds="parent">
          <Card className="fixed bottom-4 right-4 w-80 h-[400px] z-40 flex flex-col shadow-2xl">
            <div className="chat-drag-handle p-3 border-b flex justify-between items-center bg-primary/10 cursor-move">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Parti ({participants.length})</h3>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={toggleVideo}>
                  {videoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={toggleAudio}>
                  {audioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setChatMinimized(true)}>
                  <Minimize2 className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="p-2 border-b bg-muted/50">
              <div className="flex gap-1 flex-wrap">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center gap-1 bg-background px-2 py-0.5 rounded-full text-xs">
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={p.profiles?.avatar_url || ""} />
                      <AvatarFallback className="text-[8px]">{p.profiles?.username?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="max-w-[60px] truncate">{p.profiles?.username || "Kullanıcı"}</span>
                    {p.is_host && <span className="text-primary">👑</span>}
                  </div>
                ))}
              </div>
            </div>

            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-2">
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarImage src={msg.profiles?.avatar_url || ""} />
                      <AvatarFallback className="text-[10px]">{msg.profiles?.username?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-medium truncate">{msg.profiles?.username || "Kullanıcı"}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground break-words">{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-2 border-t flex gap-2">
              <Input
                placeholder="Mesaj yazın..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                className="h-8 text-sm"
              />
              <Button size="icon" className="h-8 w-8" onClick={sendMessage}>
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
