import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Bell, Users, Check, X } from "lucide-react";

interface PartyInvite {
  id: string;
  party_id: string;
  joined_at: string;
  watch_parties: {
    id: string;
    host_user_id: string;
    movie_id: string | null;
    series_id: string | null;
    is_active: boolean;
  } | null;
  host_profile?: {
    username: string | null;
    avatar_url: string | null;
  };
  content_title?: string;
}

export const PartyNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<PartyInvite[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadInvites();
      
      // Real-time subscription for new invites
      const channel = supabase
        .channel('party-invites')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'watch_party_participants',
          filter: `user_id=eq.${user.id}`
        }, () => {
          loadInvites();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadInvites = async () => {
    if (!user) return;

    // Get pending party invitations (where user is participant but not host, party is active)
    const { data: participations } = await supabase
      .from("watch_party_participants")
      .select("id, party_id, joined_at, is_host")
      .eq("user_id", user.id)
      .eq("is_host", false)
      .is("left_at", null);

    if (!participations || participations.length === 0) {
      setInvites([]);
      return;
    }

    // Get party details for each invitation
    const partyIds = participations.map(p => p.party_id);
    const { data: parties } = await supabase
      .from("watch_parties")
      .select("id, host_user_id, movie_id, series_id, is_active")
      .in("id", partyIds)
      .eq("is_active", true);

    if (!parties || parties.length === 0) {
      setInvites([]);
      return;
    }

    // Get host profiles and content titles
    const hostIds = [...new Set(parties.map(p => p.host_user_id))];
    const movieIds = parties.filter(p => p.movie_id).map(p => p.movie_id!);
    const seriesIds = parties.filter(p => p.series_id).map(p => p.series_id!);

    const [{ data: profiles }, { data: movies }, { data: series }] = await Promise.all([
      supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", hostIds),
      movieIds.length > 0 ? supabase.from("movies").select("id, title").in("id", movieIds) : { data: [] },
      seriesIds.length > 0 ? supabase.from("series").select("id, title").in("id", seriesIds) : { data: [] }
    ]);

    const enrichedInvites: PartyInvite[] = participations
      .filter(p => parties.some(party => party.id === p.party_id))
      .map(p => {
        const party = parties.find(party => party.id === p.party_id)!;
        const hostProfile = profiles?.find(prof => prof.user_id === party.host_user_id);
        const movie = movies?.find(m => m.id === party.movie_id);
        const seriesItem = series?.find(s => s.id === party.series_id);

        return {
          id: p.id,
          party_id: p.party_id,
          joined_at: p.joined_at,
          watch_parties: party,
          host_profile: hostProfile ? {
            username: hostProfile.username,
            avatar_url: hostProfile.avatar_url
          } : undefined,
          content_title: movie?.title || seriesItem?.title || "İçerik"
        };
      });

    setInvites(enrichedInvites);
  };

  const acceptInvite = (invite: PartyInvite) => {
    // Navigate to movie/series page with the party
    const contentId = invite.watch_parties?.movie_id || invite.watch_parties?.series_id;
    if (contentId) {
      navigate(`/movie/${contentId}?party=${invite.party_id}`);
      setOpen(false);
      toast({ title: "Partiye katılıyorsunuz", description: invite.content_title });
    }
  };

  const declineInvite = async (invite: PartyInvite) => {
    // Leave the party
    await supabase
      .from("watch_party_participants")
      .update({ left_at: new Date().toISOString() })
      .eq("id", invite.id);

    setInvites(prev => prev.filter(i => i.id !== invite.id));
    toast({ title: "Davet reddedildi" });
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {invites.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
            >
              {invites.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Parti Davetleri
          </h4>
        </div>
        <ScrollArea className="max-h-[300px]">
          {invites.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Henüz davet yok
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {invites.map(invite => (
                <div 
                  key={invite.id} 
                  className="p-3 rounded-lg bg-accent/50 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={invite.host_profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {invite.host_profile?.username?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {invite.host_profile?.username || "Bilinmeyen"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {invite.content_title} izliyor
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => acceptInvite(invite)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Katıl
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => declineInvite(invite)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
