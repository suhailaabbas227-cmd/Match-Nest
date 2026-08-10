import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("NOTIFICATION_CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return response({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFICATION_FROM_EMAIL");
  const appUrl = Deno.env.get("APP_URL") || "https://matchnests.netlify.app";
  if (!supabaseUrl || !serviceKey || !resendKey || !from) {
    return response({ error: "Email provider is not configured" }, 503);
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: notifications, error } = await admin
    .from("notifications")
    .select("id,user_id,actor_id,kind,title,body,premium_identity")
    .eq("email_status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) return response({ error: error.message }, 500);

  let sent = 0;
  let failed = 0;
  for (const item of notifications || []) {
    const [{ data: recipient }, { data: actor }, { data: subscription }] = await Promise.all([
      admin.from("private_profiles").select("email").eq("id", item.user_id).maybeSingle(),
      item.actor_id
        ? admin.from("profiles").select("full_name,profile").eq("id", item.actor_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from("subscriptions").select("id").eq("user_id", item.user_id)
        .eq("status", "active").lte("starts_at", new Date().toISOString())
        .gt("expires_at", new Date().toISOString()).limit(1).maybeSingle(),
    ]);

    if (!recipient?.email) {
      await admin.from("notifications").update({ email_status: "disabled" }).eq("id", item.id);
      continue;
    }

    const reveal = !!subscription || !item.premium_identity;
    const actorName = actor?.profile?.displayName || actor?.profile?.fullLegalName || actor?.full_name || "A MatchNest member";
    const subject = reveal ? item.title : "New activity on MatchNest";
    const message = reveal
      ? `${actorName}: ${item.body}`
      : "Someone is interested in you. Open MatchNest and upgrade to reveal their identity.";

    const mail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [recipient.email],
        subject,
        text: `${message}\n\nOpen MatchNest: ${appUrl}/notifications\n\nFor your privacy, message text is never included in notification emails.`,
      }),
    });

    if (mail.ok) {
      sent += 1;
      await admin.from("notifications").update({ email_status: "sent" }).eq("id", item.id);
    } else {
      failed += 1;
      await admin.from("notifications").update({ email_status: "failed" }).eq("id", item.id);
    }
  }

  return response({ processed: (notifications || []).length, sent, failed });
});
