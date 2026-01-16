import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Headphones, Loader2 } from "lucide-react";

const SupportRequestDialog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ variant: "destructive", title: "Hata", description: "Bu özelliği kullanmak için giriş yapmalısınız" });
      return;
    }

    if (!title.trim()) {
      toast({ variant: "destructive", title: "Hata", description: "Film veya dizi adı giriniz" });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("support_requests").insert({
      user_id: user.id,
      request_type: "content",
      title: title.trim(),
      description: description.trim() || null,
    });

    setLoading(false);

    if (error) {
      console.error("Support request error:", error);
      toast({ variant: "destructive", title: "Hata", description: "Talep gönderilemedi" });
    } else {
      toast({ title: "Başarılı", description: "Film/dizi talebiniz gönderildi" });
      setTitle("");
      setDescription("");
      setOpen(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="focus:outline-none touch-manipulation" title="Destek / Film İsteği">
          <Headphones className="w-6 h-6 text-gold hover:text-gold-light transition-colors cursor-pointer" />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Film / Dizi Talebi</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Film veya Dizi Adı *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Breaking Bad"
              className="bg-secondary"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Ek Bilgi (Opsiyonel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Yıl, yönetmen veya diğer detaylar..."
              className="bg-secondary min-h-[80px]"
              maxLength={500}
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gold hover:bg-gold-light text-black"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              "Talep Gönder"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SupportRequestDialog;