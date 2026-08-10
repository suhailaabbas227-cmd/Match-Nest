import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ error: "Authentication required" }, 401);

  try {
    const payload = await request.json().catch(() => ({}));
    if (payload?.confirmation !== "DELETE") {
      return json({ error: "Deletion confirmation is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing required Supabase function environment variables");
      return json({ error: "Account deletion is temporarily unavailable" }, 503);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Authentication required" }, 401);

    const userId = userData.user.id;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Remove physical Storage objects through the Storage API. Direct SQL
    // deletion would leave the underlying files behind.
    const { data: photoEntries, error: listError } = await admin.storage
      .from("photos")
      .list(userId, { limit: 100 });
    if (listError) throw listError;

    const photoPaths = (photoEntries ?? [])
      .filter((entry) => entry.id)
      .map((entry) => `${userId}/${entry.name}`);
    if (photoPaths.length > 0) {
      const { error: removeError } = await admin.storage.from("photos").remove(photoPaths);
      if (removeError) throw removeError;
    }

    // Participant conversations contain UUID arrays rather than foreign keys,
    // so remove them explicitly; their messages cascade automatically.
    const { data: participantConversations, error: participantError } = await admin
      .from("conversations")
      .select("id")
      .contains("participants", [userId]);
    if (participantError) throw participantError;

    const conversationIds = (participantConversations ?? []).map((row) => row.id);
    if (conversationIds.length > 0) {
      const { error: conversationDeleteError } = await admin
        .from("conversations")
        .delete()
        .in("id", conversationIds);
      if (conversationDeleteError) throw conversationDeleteError;
    }

    // If the member was only a chaperone, retain the participants' chat and
    // remove this account from its chaperone list.
    const { data: chaperonedConversations, error: chaperoneError } = await admin
      .from("conversations")
      .select("id, chaperones")
      .contains("chaperones", [userId]);
    if (chaperoneError) throw chaperoneError;

    for (const conversation of chaperonedConversations ?? []) {
      const remaining = (conversation.chaperones ?? []).filter((id: string) => id !== userId);
      const { error: updateError } = await admin
        .from("conversations")
        .update({ chaperones: remaining })
        .eq("id", conversation.id);
      if (updateError) throw updateError;
    }

    // Chaperone-authored messages can live in a retained participant chat and
    // therefore need their own cleanup because from_user has no foreign key.
    const { error: messagesError } = await admin
      .from("messages")
      .delete()
      .eq("from_user", userId);
    if (messagesError) throw messagesError;

    // Reports currently store UUIDs without foreign keys, so clear rows that
    // would otherwise retain an identifier after account deletion.
    const { error: reportsError } = await admin
      .from("reports")
      .delete()
      .or(`reporter.eq.${userId},reported.eq.${userId}`);
    if (reportsError) throw reportsError;

    // Deleting the Auth user cascades to profile, private profile,
    // connections, and block rows.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return json({ deleted: true });
  } catch (error) {
    console.error("delete-account failed", error);
    return json({ error: "Could not delete the account. Please try again." }, 500);
  }
});
