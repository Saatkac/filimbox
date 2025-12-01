import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client that bypasses RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { partyId, movieId, seriesId, episodeId, friendIds, currentVideoTime } = await req.json();
    
    if (!friendIds || friendIds.length === 0) {
      return new Response(JSON.stringify({ error: "No friends selected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure user profile exists
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      await supabaseAdmin.from("profiles").insert({
        user_id: user.id,
        username: user.email?.split('@')[0] || "Kullanıcı",
        avatar_url: "https://www.hdfilmizle.life/assets/front/img/default-pp.webp"
      });
    }

    // Create watch party
    const { data: party, error: partyError } = await supabaseAdmin
      .from("watch_parties")
      .insert({
        host_user_id: user.id,
        movie_id: movieId || null,
        series_id: seriesId || null,
        episode_id: episodeId || null,
        is_active: true
      })
      .select("id")
      .single();

    if (partyError) {
      console.error("Party creation error:", partyError);
      return new Response(JSON.stringify({ error: "Failed to create party", details: partyError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add host as participant
    await supabaseAdmin.from("watch_party_participants").insert({
      party_id: party.id,
      user_id: user.id,
      is_host: true,
      video_progress: currentVideoTime || 0
    });

    // Add invited friends as participants (using admin client to bypass RLS)
    const invites = friendIds.map((friendId: string) => ({
      party_id: party.id,
      user_id: friendId,
      is_host: false,
      video_progress: 0
    }));

    const { error: invitesError } = await supabaseAdmin
      .from("watch_party_participants")
      .insert(invites);

    if (invitesError) {
      console.error("Invites error:", invitesError);
      // Party is created, just log the error
    }

    return new Response(JSON.stringify({ 
      success: true, 
      partyId: party.id,
      invitedCount: friendIds.length 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});