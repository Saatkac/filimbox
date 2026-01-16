import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface Comment {
  id: string;
  comment: string;
  is_spoiler: boolean;
  created_at: string;
  user_id: string;
  profiles: {
    username: string | null;
    avatar_url: string;
  } | null;
  isAdmin?: boolean;
}

interface CommentSectionProps {
  movieId?: string;
  seriesId?: string;
}

const CommentSection = ({ movieId, seriesId }: CommentSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadComments();
    checkAdmin();
  }, [movieId, seriesId]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const loadComments = async () => {
    const query = supabase
      .from("comments")
      .select(`
        id,
        comment,
        is_spoiler,
        created_at,
        user_id
      `);

    if (movieId) {
      query.eq("movie_id", movieId);
    } else if (seriesId) {
      query.eq("series_id", seriesId);
    }

    const { data: commentsData, error } = await query;

    if (!error && commentsData) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .in("user_id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, { username: p.username, avatar_url: p.avatar_url }]) || []);
      const adminIds = new Set(adminRoles?.map(r => r.user_id) || []);

      const commentsWithProfiles = commentsData.map(comment => {
        const profile = profilesMap.get(comment.user_id);
        return {
          ...comment,
          profiles: {
            username: profile?.username || null,
            avatar_url: profile?.avatar_url || "https://www.hdfilmizle.life/assets/front/img/default-pp.webp",
          },
          isAdmin: adminIds.has(comment.user_id),
        };
      });

      commentsWithProfiles.sort((a, b) => {
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setComments(commentsWithProfiles);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ variant: "destructive", title: "Hata", description: "Yorum yapmak için giriş yapmalısınız" });
      return;
    }

    const trimmedComment = newComment.trim();
    if (!trimmedComment) {
      toast({ variant: "destructive", title: "Hata", description: "Yorum boş olamaz" });
      return;
    }

    if (trimmedComment.length > 500) {
      toast({ variant: "destructive", title: "Hata", description: "Yorum en fazla 500 karakter olabilir" });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      movie_id: movieId || null,
      series_id: seriesId || null,
      comment: trimmedComment,
      is_spoiler: isSpoiler,
    });

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    } else {
      toast({ title: "Başarılı", description: "Yorumunuz eklendi" });
      setNewComment("");
      setIsSpoiler(false);
      loadComments();
    }

    setLoading(false);
  };

  const handleDelete = async (commentId: string, commentUserId: string) => {
    // Admin deleting someone else's comment - uses admin policy
    // User deleting own comment - uses user policy
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (!error) {
      toast({ title: "Başarılı", description: "Yorum silindi" });
      loadComments();
    } else {
      console.error("Delete error:", error);
      toast({ variant: "destructive", title: "Hata", description: "Yorum silinemedi: " + error.message });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Yorumlar</h2>

      {user && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Yorumunuzu yazın..."
                className="bg-secondary min-h-[100px]"
                maxLength={500}
              />
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="spoiler"
                  checked={isSpoiler}
                  onCheckedChange={(checked) => setIsSpoiler(checked === true)}
                />
                <Label
                  htmlFor="spoiler"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Bu yorum spoiler içeriyor
                </Label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="bg-gold hover:bg-gold-light text-black"
              >
                Yorum Yap
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className={`bg-card border-border ${comment.isAdmin ? 'border-admin-red border-2' : ''}`}>
              <CardContent className="pt-6">
                {comment.is_spoiler && (
                  <div className="flex items-center gap-2 mb-3 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-semibold">Spoiler Uyarısı!</span>
                  </div>
                )}
                
                <div className="flex items-start gap-3 mb-3">
                  <img 
                    src={comment.profiles?.avatar_url || "https://www.hdfilmizle.life/assets/front/img/default-pp.webp"}
                    alt="Profil"
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${comment.isAdmin ? 'text-admin-red' : 'text-foreground'}`}>
                        {comment.profiles?.username || "Anonim Kullanıcı"}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: tr,
                        })}
                      </span>
                    </div>
                    <p className={`whitespace-pre-wrap ${comment.isAdmin ? 'text-admin-red font-semibold' : 'text-foreground'}`}>
                      {comment.comment}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-end text-sm text-muted-foreground">
                  {(user?.id === comment.user_id || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id, comment.user_id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;
