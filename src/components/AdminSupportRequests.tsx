import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SupportRequest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  request_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const AdminSupportRequests = () => {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_requests")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading requests:", error);
      toast({ variant: "destructive", title: "Hata", description: "Talepler yüklenemedi" });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("support_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    
    if (error) {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    } else {
      toast({ title: "Başarılı", description: "Durum güncellendi" });
      loadRequests();
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm("Bu talebi silmek istediğinizden emin misiniz?")) return;
    
    const { error } = await supabase
      .from("support_requests")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    } else {
      toast({ title: "Başarılı", description: "Talep silindi" });
      loadRequests();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500"><Clock className="w-3 h-3 mr-1" />Beklemede</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-green-500/20 text-green-500"><CheckCircle className="w-3 h-3 mr-1" />Onaylandı</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-500/20 text-red-500"><XCircle className="w-3 h-3 mr-1" />Reddedildi</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Film / Dizi Talepleri</CardTitle>
            <CardDescription>
              Kullanıcılardan gelen içerik talepleri ({requests.length} talep)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadRequests} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gold" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Henüz talep bulunmuyor
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{request.title}</h3>
                      {request.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {request.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{formatDate(request.created_at)}</span>
                        <span>•</span>
                        <span className="capitalize">{request.request_type === "content" ? "İçerik Talebi" : request.request_type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                      onClick={() => updateStatus(request.id, "approved")}
                      disabled={request.status === "approved"}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => updateStatus(request.id, "rejected")}
                      disabled={request.status === "rejected"}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reddet
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive ml-auto"
                      onClick={() => deleteRequest(request.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSupportRequests;
