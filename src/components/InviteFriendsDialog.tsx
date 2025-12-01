import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2 } from "lucide-react";

// Simple UUID generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface Friend {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
}

interface InviteFriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPartyCreated: (partyId: string) => void;
  movieId?: string;
  seriesId?: string;
  episodeId?: string;
  currentVideoTime: number;
}

export const InviteFriendsDialog = ({
  open,
  onOpenChange,
  onPartyCreated,
  movieId,
  seriesId,
  episodeId,
  currentVideoTime
}: InviteFriendsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadFriends();
    }
  }, [open, user]);

  const loadFriends = async () => {
    if (!user) return;
    setLoading(true);

    const { data: friendships } = await supabase
      .from("friends")
      .select("*")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq("status", "accepted");

    if (friendships && friendships.length > 0) {
      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", friendIds);

      if (profiles) {
        setFriends(profiles.map(p => ({
          id: p.user_id,
          user_id: p.user_id,
          username: p.username,
          avatar_url: p.avatar_url
        })));
      }
    }

    setLoading(false);
  };

  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const createPartyWithInvites = async () => {
    if (!user) return;
    if (selectedFriends.size === 0) {
      toast({ variant: "destructive", title: "En az bir arkadaş seçmelisiniz" });
      return;
    }

    setCreating(true);

    try {
      // Create profile if doesn't exist
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        await supabase.from("profiles").insert({
          user_id: user.id,
          username: user.email?.split('@')[0] || "Kullanıcı",
          avatar_url: "https://www.hdfilmizle.life/assets/front/img/default-pp.webp"
        });
      }

      // Generate party ID client-side to avoid SELECT after INSERT (RLS recursion issue)
      const partyId = generateUUID();

      // Create watch party with pre-generated ID (no SELECT needed)
      const { error: partyError } = await supabase
        .from("watch_parties")
        .insert({
          id: partyId,
          host_user_id: user.id,
          movie_id: movieId || null,
          series_id: seriesId || null,
          episode_id: episodeId || null,
          is_active: true
        });

      if (partyError) {
        console.error("Watch party creation error:", partyError);
        throw new Error(`Parti oluşturulamadı: ${partyError.message}`);
      }

      // Join as host
      const { error: hostJoinError } = await supabase
        .from("watch_party_participants")
        .insert({
          party_id: partyId,
          user_id: user.id,
          is_host: true,
          video_progress: currentVideoTime
        });

      if (hostJoinError) {
        console.error("Host join error:", hostJoinError);
        throw new Error(`Host partiye katılamadı: ${hostJoinError.message}`);
      }

      // Add selected friends as participants
      const invites = Array.from(selectedFriends).map(friendId => ({
        party_id: partyId,
        user_id: friendId,
        is_host: false,
        video_progress: 0
      }));

      const { error: invitesError } = await supabase
        .from("watch_party_participants")
        .insert(invites);

      if (invitesError) {
        console.error("Invites error:", invitesError);
        // Don't throw here - party is created, just log the error
        toast({ 
          variant: "destructive",
          title: "Davetlerde sorun oluştu", 
          description: "Parti oluşturuldu ama bazı arkadaşlar eklenemedi" 
        });
      }

      toast({ 
        title: "Parti oluşturuldu!", 
        description: `${selectedFriends.size} arkadaşınız davet edildi` 
      });

      onPartyCreated(partyId);
      onOpenChange(false);
      setSelectedFriends(new Set());
    } catch (error: any) {
      console.error("Party creation error:", error);
      toast({ 
        variant: "destructive", 
        title: "Parti oluşturulamadı", 
        description: error.message 
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Arkadaşlarını Davet Et
          </DialogTitle>
          <DialogDescription>
            Birlikte izlemek istediğin arkadaşlarını seç
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Henüz arkadaşın yok. Arkadaş ekleyerek birlikte izlemeye başla!
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[300px] pr-4">
              <div className="space-y-3">
                {friends.map(friend => (
                  <div
                    key={friend.id}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => toggleFriend(friend.id)}
                  >
                    <Checkbox
                      checked={selectedFriends.has(friend.id)}
                      onCheckedChange={() => toggleFriend(friend.id)}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback>
                        {friend.username?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 font-medium">
                      {friend.username || "Isimsiz"}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedFriends.size} arkadaş seçildi
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={creating}
                >
                  İptal
                </Button>
                <Button
                  onClick={createPartyWithInvites}
                  disabled={creating || selectedFriends.size === 0}
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    "Parti Oluştur"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
