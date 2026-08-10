import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ModerationStatus = "approved" | "rejected" | "pending" | "review";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization") || "";

  if (!supabaseUrl || !anonKey || !serviceKey || !authorization) {
    return json({ error: "Photo review service is not configured" }, 503);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  const user = authData.user;
  if (authError || !user) return json({ error: "Authentication required" }, 401);

  let path = "";
  let isMainPhoto = false;
  try {
    const body = await req.json();
    path = String(body?.path || "").trim();
    isMainPhoto = body?.main === true;
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  if (!path.startsWith(`${user.id}/`) || path.includes("..")) {
    return json({ error: "Invalid photo path" }, 400);
  }

  const { data: file, error: downloadError } = await admin.storage.from("photos").download(path);
  if (downloadError || !file) return json({ error: "Photo could not be read" }, 404);
  if (file.size > 10 * 1024 * 1024) return json({ error: "Photo must be smaller than 10 MB" }, 400);

  const apiUser = Deno.env.get("SIGHTENGINE_API_USER");
  const apiSecret = Deno.env.get("SIGHTENGINE_API_SECRET");
  let status: ModerationStatus = "pending";
  let reason = "Photo is waiting for a manual safety review.";
  let provider = "manual";
  let scores: Record<string, unknown> = {};

  if (apiUser && apiSecret) {
    provider = "sightengine";
    try {
      const form = new FormData();
      form.append("media", file, path.split("/").at(-1) || "photo.jpg");
      form.append("models", "nudity-2.1,genai,gore-2.0,offensive-2.0,face-analysis");
      form.append("api_user", apiUser);
      form.append("api_secret", apiSecret);

      const response = await fetch("https://api.sightengine.com/1.0/check.json", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok || result?.status !== "success") throw new Error("Moderation provider failed");

      const nudity = result?.nudity || {};
      const aiGenerated = Number(result?.type?.ai_generated || 0);
      const explicit = Math.max(
        Number(nudity.sexual_activity || 0),
        Number(nudity.sexual_display || 0),
        Number(nudity.erotica || 0),
        Number(nudity.sextoy || 0),
      );
      const suggestive = Number(nudity.suggestive || 0);
      const gore = Number(result?.gore?.prob || 0);
      const offensiveValues = Object.entries(result?.offensive || {})
        .filter(([key, value]) => key !== "boxes" && typeof value === "number")
        .map(([, value]) => Number(value));
      const offensive = offensiveValues.length ? Math.max(...offensiveValues) : 0;
      const realFaces = Array.isArray(result?.faces) ? result.faces.length : 0;
      const artificialFaces = Array.isArray(result?.artificial_faces) ? result.artificial_faces.length : 0;
      scores = {
        nudity: {
          sexual_activity: nudity.sexual_activity,
          sexual_display: nudity.sexual_display,
          erotica: nudity.erotica,
          sextoy: nudity.sextoy,
          suggestive: nudity.suggestive,
          none: nudity.none,
        },
        ai_generated: aiGenerated,
        gore,
        offensive,
        real_faces: realFaces,
        artificial_faces: artificialFaces,
        request_id: result?.request?.id,
      };

      if (explicit >= 0.45 || suggestive >= 0.80) {
        status = "rejected";
        reason = "This image may contain nudity or sexual content. Please upload a different photo.";
      } else if (gore >= 0.65 || offensive >= 0.70) {
        status = "rejected";
        reason = "This image may contain graphic or hateful content. Please upload a respectful profile photo.";
      } else if (aiGenerated >= 0.82) {
        status = "rejected";
        reason = "AI-generated or heavily AI-edited profile photos are not allowed. Please upload a real photo.";
      } else if (isMainPhoto && realFaces === 0) {
        status = "rejected";
        reason = artificialFaces > 0
          ? "This does not appear to be a real face. Please upload a clear photo of yourself."
          : "Your main profile photo must clearly show your face. Please upload another photo.";
      } else if (isMainPhoto && realFaces > 1) {
        status = "review";
        reason = "A main profile photo should clearly identify one person. This photo needs manual review.";
      } else if (
        explicit >= 0.25 || suggestive >= 0.60 || aiGenerated >= 0.62
        || gore >= 0.40 || offensive >= 0.45
      ) {
        status = "review";
        reason = "This photo needs a quick manual safety review before it can appear on your profile.";
      } else {
        status = "approved";
        reason = "Photo approved.";
      }
    } catch {
      status = "pending";
      reason = "Automatic review is temporarily unavailable. Your photo is waiting for manual review.";
    }
  }

  const { error: reviewError } = await admin.from("photo_reviews").upsert({
    path,
    user_id: user.id,
    is_main: isMainPhoto,
    status,
    reason,
    provider,
    scores,
    reviewed_at: status === "approved" || status === "rejected" ? new Date().toISOString() : null,
  });
  if (reviewError) return json({ error: "Photo review could not be saved" }, 500);

  if (status === "rejected") {
    await admin.storage.from("photos").remove([path]);
  }

  return json({ status, reason });
});
