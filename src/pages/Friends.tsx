import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Check, X, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FriendProfile {
  username: string | null;
  avatar_url: string | null;
}

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  friend_profile: FriendProfile | null;
  requester_profile: FriendProfile | null;
}

const Friends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchEmail, setSearchEmail] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFriends();
      loadPendingRequests();
      
      const channel = supabase
        .channel('friends-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'friends'
        }, () => {
          loadFriends();
          loadPendingRequests();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("friends")
      .select("*, friend_profile:profiles!friends_friend_id_fkey(username, avatar_url)")
      .eq("user_id", user.id)
      .eq("status", "accepted");

    if (data) {
      setFriends(data.map(d => ({
        ...d,
        friend_profile: d.friend_profile as any,
        requester_profile: null
      })));
    }
    setLoading(false);
  };

  const loadPendingRequests = async () => {
    if (!user) return;
    
    const { data: friendRequests } = await supabase
      .from("friends")
      .select("*")
      .eq("friend_id", user.id)
      .eq("status", "pending");

    if (friendRequests) {
      const requestsWithProfiles = await Promise.all(
        friendRequests.map(async (request) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("user_id", request.user_id)
            .maybeSingle();
          
          return {
            ...request,
            friend_profile: null,
            requester_profile: profile
          };
        })
      );
      setPendingRequests(requestsWithProfiles);
    }
  };

  const sendFriendRequest = async () => {
    if (!user || !searchEmail.trim()) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", searchEmail.trim())
      .maybeSingle();

    if (!profiles) {
      toast({ variant: "destructive", title: "Kullanıcı bulunamadı" });
      return;
    }

    if (profiles.user_id === user.id) {
      toast({ variant: "destructive", title: "Kendinizi ekleyemezsiniz" });
      return;
    }

    const { error } = await supabase.from("friends").insert({
      user_id: user.id,
      friend_id: profiles.user_id,
      status: "pending"
    });

    if (error) {
      if (error.code === "23505") {
        toast({ variant: "destructive", title: "Zaten arkadaş isteği gönderildi" });
      } else {
        toast({ variant: "destructive", title: "Hata", description: error.message });
      }
    } else {
      toast({ title: "Başarılı", description: "Arkadaşlık isteği gönderildi" });
      setSearchEmail("");
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    if (accept) {
      const { error } = await supabase
        .from("friends")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) {
        toast({ variant: "destructive", title: "Hata", description: error.message });
      } else {
        toast({ title: "Başarılı", description: "Arkadaşlık kabul edildi" });
      }
    } else {
      const { error } = await supabase
        .from("friends")
        .delete()
        .eq("id", requestId);

      if (error) {
        toast({ variant: "destructive", title: "Hata", description: error.message });
      } else {
        toast({ title: "Başarılı", description: "Arkadaşlık reddedildi" });
      }
    }
  };

  const removeFriend = async (friendId: string) => {
    const { error } = await supabase
      .from("friends")
      .delete()
      .eq("id", friendId);

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    } else {
      toast({ title: "Başarılı", description: "Arkadaş çıkarıldı" });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h1 className="text-3xl font-bold mb-4">Giriş Yapmalısınız</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-4xl font-bold mb-8 flex items-center gap-3">
          <Users className="w-10 h-10 text-primary" />
          Arkadaşlarım
        </h1>

        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Arkadaş Ekle</h2>
          <div className="flex gap-3">
            <Input
              placeholder="Kullanıcı adı girin"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendFriendRequest()}
            />
            <Button onClick={sendFriendRequest}>
              <UserPlus className="w-4 h-4 mr-2" />
              Ekle
            </Button>
          </div>
        </Card>

        {pendingRequests.length > 0 && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Bekleyen İstekler</h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.requester_profile?.avatar_url || ""} />
                      <AvatarFallback>{request.requester_profile?.username?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{request.requester_profile?.username || "Kullanıcı"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respondToRequest(request.id, true)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => respondToRequest(request.id, false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Arkadaşlarım ({friends.length})</h2>
          {loading ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : friends.length === 0 ? (
            <p className="text-muted-foreground">Henüz arkadaşınız yok</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={friend.friend_profile?.avatar_url || ""} />
                      <AvatarFallback>{friend.friend_profile?.username?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{friend.friend_profile?.username || "Kullanıcı"}</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => removeFriend(friend.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Friends;
