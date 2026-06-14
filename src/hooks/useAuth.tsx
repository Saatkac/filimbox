import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          ensureProfile(session.user.id);
          checkAdminStatus(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          ensureProfile(session.user.id);
          checkAdminStatus(session.user.id);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureProfile = async (userId: string) => {
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existing) {
        const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        const uniqueUsername = `user_${rand}`;
        await supabase.from("profiles").insert({
          user_id: userId,
          username: uniqueUsername,
          avatar_url:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTubq_1Ec8ya2q1ihaTWobDRzSOoPkhSwpkICgfYvtVHg&s=10",
        });
      }
    } catch {
      // Profil oluşturma hatası sessizce yutulur (kritik değil)
    }
  };


  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data && !error);
    } catch (error) {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return { user, session, isAdmin, loading };
};
