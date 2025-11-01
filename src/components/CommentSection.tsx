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
  } | null;
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
      `)
      .order("created_at", { ascending: false });

    if (movieId) {
      query.eq("movie_id", movieId);
    } else if (seriesId) {
      query.eq("series_id", seriesId);
    }

    const { data: commentsData, error } = await query;

    if (!error && commentsData) {
      // Fetch usernames separately
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.username]) || []);

      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: {
          username: profilesMap.get(comment.user_id) || null,
        },
      }));

      setComments(commentsWithProfiles);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ variant: "destructive", title: "Hata", description: "Yorum yapmak için giriş yapmalısınız" });
      return;
    }

    if (!newComment.trim()) {
      toast({ variant: "destructive", title: "Hata", description: "Yorum boş olamaz" });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      movie_id: movieId || null,
      series_id: seriesId || null,
      comment: newComment.trim(),
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

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (!error) {
      toast({ title: "Başarılı", description: "Yorum silindi" });
      loadComments();
    } else {
      toast({ variant: "destructive", title: "Hata", description: error.message });
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
            <Card key={comment.id} className="bg-card border-border">
              <CardContent className="pt-6">
                {comment.is_spoiler && (
                  <div className="flex items-center gap-2 mb-3 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-semibold">Spoiler Uyarısı!</span>
                  </div>
                )}
                
                <p className="text-foreground mb-3 whitespace-pre-wrap">{comment.comment}</p>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {comment.profiles?.username || "Anonim Kullanıcı"}
                    </span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: tr,
                      })}
                    </span>
                  </div>

                  {(user?.id === comment.user_id || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id)}
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
