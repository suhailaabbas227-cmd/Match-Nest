// Supabase-backed data layer.
// Re-implements the old REST API (auth, profiles, browse, matches, chat,
// safety) directly against Supabase, so the existing pages keep calling
// api.get / api.post / api.put / api.upload with the same paths.
import { supabase } from "./supabase";


// ---------------------------------------------------------------------------
// Mappers between the database row (snake_case) and the app's user shape.
// ---------------------------------------------------------------------------
export function rowToUser(r) {
  if (!r) return null;
  return {
    id: r.id,
    role: r.role || "user",
    fullName: r.full_name || "",
    email: r.email || "",
    phone: r.phone || "",
    dateOfBirth: r.date_of_birth || "",
    gender: r.gender || "",
    country: r.country || "",
    city: r.city || "",
    mode: r.mode || null,
    profile: r.profile || {},
    profilePhoto: r.profile_photo || null,
    photos: r.photos || [],
    verified: r.verified ?? true,
    badge: r.badge ?? false,
    profileComplete: r.profile_complete ?? false,
    photoPrivacy: r.photo_privacy ?? false,
    blockedUsers: r.blocked_users || [],
    suspended: r.suspended ?? false,
    createdAt: r.created_at,
  };
}


function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}


// Guardian/contact fields stay hidden until two users match.
const PRIVATE_PROFILE_FIELDS = ["wali"];


// What another member sees when browsing (mirrors the old server publicView).
function publicView(u, matched = false) {
  if (!u) return null;
  const { email, phone, blockedUsers, ...rest } = u;
  let profile = { ...(rest.profile || {}) };
  if (!matched) for (const f of PRIVATE_PROFILE_FIELDS) delete profile[f];
  const blur = u.mode === "marriage" && u.photoPrivacy && !matched;
  return {
    ...rest,
    profile,
    photosBlurred: blur,
    photos: blur ? [] : rest.photos || [],
    profilePhoto: blur ? null : rest.profilePhoto || null,
    contactLocked: !matched,
    age: ageFromDob(u.dateOfBirth) ?? (profile.age ? Number(profile.age) : null),
  };
}


// ---------------------------------------------------------------------------
// Auth helpers (used by AuthContext / Signup / Login).
// ---------------------------------------------------------------------------
export async function getMe() {
  const { data: { user: au } } = await supabase.auth.getUser();
  if (!au) return null;
  const { data, error } = await supabase
    .from("profiles").select("*").eq("id", au.id).single();
  if (error) {
    // Profile row may not exist yet right after signup — return a minimal user.
    return { id: au.id, email: au.email, fullName: "", mode: null, profileComplete: false, role: "user", profile: {}, photos: [] };
  }
  return rowToUser(data);
}


export async function signUpUser({ fullName, email, password, dateOfBirth, mode }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
      data: {
        full_name: fullName || "",
        date_of_birth: dateOfBirth || "",
        mode: mode || "",
      },
    },
  });
  if (error) return { error: error.message };
  return {
    session: data.session,
    userId: data.user?.id,
    needsEmailConfirmation: !data.session,
  };
}


export async function signInUser(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return {};
}


// ---------------------------------------------------------------------------
// Connections helpers.
// ---------------------------------------------------------------------------
async function myAcceptedIds(meId) {
  const { data } = await supabase
    .from("connections").select("from_user,to_user,status")
    .eq("status", "accepted").or(`from_user.eq.${meId},to_user.eq.${meId}`);
  const set = new Set();
  (data || []).forEach((c) => set.add(c.from_user === meId ? c.to_user : c.from_user));
  return set;
}


async function fetchProfiles(ids) {
  if (!ids.length) return {};
  const { data } = await supabase.from("profiles").select("*").in("id", ids);
  const map = {};
  (data || []).forEach((r) => (map[r.id] = rowToUser(r)));
  return map;
}


// ---------------------------------------------------------------------------
// Path handlers — each returns the same JSON the old API returned.
// ---------------------------------------------------------------------------
async function handleGet(path) {
  const [p, qs] = path.split("?");
  const q = Object.fromEntries(new URLSearchParams(qs || ""));


  if (p === "/auth/me") return { user: await getMe() };


  // ---- Browse list ----
  if (p === "/browse") {
    const me = await getMe();
    let query = supabase.from("profiles").select("*")
      .eq("mode", me.mode).eq("verified", true).eq("profile_complete", true)
      .neq("id", me.id).neq("role", "admin").eq("suspended", false);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const accepted = await myAcceptedIds(me.id);
    const blockedByMe = me.blockedUsers || [];
    const profiles = (data || [])
      .map(rowToUser)
      .filter((u) => !blockedByMe.includes(u.id) && !(u.blockedUsers || []).includes(me.id))
      .filter((u) => {
        const pr = u.profile || {};
        if (q.city && !`${u.city} ${pr.city || ""}`.toLowerCase().includes(q.city.toLowerCase())) return false;
        if (q.sect && (pr.sect || "").toLowerCase() !== q.sect.toLowerCase()) return false;
        if (q.religiosity && (pr.religiosity || "").toLowerCase() !== q.religiosity.toLowerCase()) return false;
        const age = ageFromDob(u.dateOfBirth) ?? Number(pr.age) ?? null;
        if (q.minAge && age != null && age < Number(q.minAge)) return false;
        if (q.maxAge && age != null && age > Number(q.maxAge)) return false;
        if (q.q) {
          const hay = `${u.fullName} ${pr.displayName || ""} ${pr.aboutMe || ""} ${pr.occupation || ""}`.toLowerCase();
          if (!hay.includes(q.q.toLowerCase())) return false;
        }
        return true;
      })
      .map((u) => publicView(u, accepted.has(u.id)));
    return { profiles };
  }


  // ---- My matches ----
  if (p === "/browse/me/matches") {
    const me = await getMe();
    const { data } = await supabase.from("connections").select("*")
      .eq("status", "accepted").or(`from_user.eq.${me.id},to_user.eq.${me.id}`);
    const others = (data || []).map((c) => (c.from_user === me.id ? c.to_user : c.from_user));
    const map = await fetchProfiles(others);
    const matches = (data || []).map((c) => {
      const otherId = c.from_user === me.id ? c.to_user : c.from_user;
      return { connId: c.id, user: publicView(map[otherId], true) };
    }).filter((m) => m.user);
    return { matches };
  }


  // ---- Incoming requests ----
  if (p === "/browse/me/requests") {
    const me = await getMe();
    const { data } = await supabase.from("connections").select("*")
      .eq("to_user", me.id).eq("status", "pending");
    const map = await fetchProfiles((data || []).map((c) => c.from_user));
    const requests = (data || []).map((c) => ({ connId: c.id, user: publicView(map[c.from_user], false) })).filter((r) => r.user);
    return { requests };
  }


  // ---- Single profile ----
  if (p.startsWith("/browse/")) {
    const id = p.split("/")[2];
    const me = await getMe();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (error) throw new Error("Profile not found");
    const accepted = await myAcceptedIds(me.id);
    return { profile: publicView(rowToUser(data), accepted.has(id)) };
  }


  // ---- Chat: conversations ----
  if (p === "/chat/conversations") {
    const me = await getMe();
    // Array "contains" is more reliable than .or(...cs...); merge the two cases.
    const [{ data: asPart }, { data: asChap }] = await Promise.all([
      supabase.from("conversations").select("*").contains("participants", [me.id]),
      supabase.from("conversations").select("*").contains("chaperones", [me.id]),
    ]);
    const byId = {};
    [...(asPart || []), ...(asChap || [])].forEach((c) => (byId[c.id] = c));
    const convos = Object.values(byId);
    const otherIds = convos.map((c) => (c.participants || []).find((x) => x !== me.id) || c.participants?.[0]).filter(Boolean);
    const map = await fetchProfiles(otherIds);
    const out = [];
    for (const c of convos) {
      const otherId = (c.participants || []).find((x) => x !== me.id) || c.participants?.[0];
      const { data: msgs } = await supabase.from("messages").select("text,created_at")
        .eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1);
      const last = msgs?.[0];
      out.push({
        id: c.id,
        user: publicView(map[otherId], true),
        lastMessage: last?.text || null,
        lastAt: last?.created_at || c.created_at,
        chaperones: c.chaperones || [],
      });
    }
    out.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
    return { conversations: out };
  }


  // ---- Chat: open conversation with a user ----
  if (p.startsWith("/chat/with/")) {
    const otherId = p.split("/")[3];
    const me = await getMe();
    const accepted = await myAcceptedIds(me.id);
    if (!accepted.has(otherId)) throw new Error("You can only chat with matched users");
    const convo = await getOrCreateConversation(me.id, otherId);
    const { data: msgs } = await supabase.from("messages").select("*")
      .eq("conversation_id", convo.id).order("created_at", { ascending: true });
    const messages = (msgs || []).map(mapMessage);
    return { conversation: convo, messages };
  }


  // ---- Admin (best-effort; reads only) ----
  if (p === "/safety/admin/users") {
    const { data } = await supabase.from("profiles").select("*");
    return { users: (data || []).map(rowToUser) };
  }
  if (p === "/safety/admin/reports") {
    const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    const ids = [...new Set((data || []).flatMap((r) => [r.reporter, r.reported]))];
    const map = await fetchProfiles(ids);
    const asUser = (id) => (map[id] ? { id, fullName: map[id].fullName, profile: map[id].profile } : { id, fullName: "(unknown)" });
    const reports = (data || []).map((r) => ({
      id: r.id, reason: r.reason, status: r.status || "open",
      reportedUser: asUser(r.reported), reportedBy: asUser(r.reporter),
    }));
    return { reports };
  }


  throw new Error(`Unhandled GET ${path}`);
}


function mapMessage(m) {
  return {
    id: m.id,
    conversationId: m.conversation_id,
    from: m.from_user,
    fromName: m.from_name,
    isChaperone: m.is_chaperone,
    text: m.text,
    createdAt: m.created_at,
  };
}


async function getOrCreateConversation(meId, otherId) {
  const { data: existing } = await supabase.from("conversations").select("*")
    .contains("participants", [meId, otherId]).limit(1);
  if (existing && existing.length) return existing[0];
  const { data, error } = await supabase.from("conversations")
    .insert({ participants: [meId, otherId], chaperones: [] }).select().single();
  if (error) throw new Error(error.message);
  return data;
}


async function handlePost(path, body = {}) {
  const p = path.split("?")[0];


  // ---- Profile: pick mode ----
  if (p === "/profile/mode") {
    const me = await getMe();
    const { data, error } = await supabase.from("profiles")
      .update({ mode: body.mode }).eq("id", me.id).select().single();
    if (error) throw new Error(error.message);
    return { user: rowToUser(data) };
  }


  // ---- Profile: switch mode ----
  if (p === "/profile/switch-mode") {
    const me = await getMe();
    const next = me.mode === "marriage" ? "dating" : "marriage";
    const { data, error } = await supabase.from("profiles")
      .update({ mode: next }).eq("id", me.id).select().single();
    if (error) throw new Error(error.message);
    return { user: rowToUser(data) };
  }


  // ---- Browse: send connection request ----
  if (p.startsWith("/browse/connect/")) {
    const to = p.split("/")[3];
    const me = await getMe();
    if (to === me.id) throw new Error("Cannot connect to yourself");
    const { data: rows } = await supabase.from("connections").select("*")
      .or(`and(from_user.eq.${me.id},to_user.eq.${to}),and(from_user.eq.${to},to_user.eq.${me.id})`);
    const existing = rows?.[0];
    if (existing) {
      if (existing.status === "accepted") return { status: "accepted", connection: existing };
      if (existing.from_user === to && existing.status === "pending") {
        await supabase.from("connections").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", existing.id);
        return { status: "accepted", matched: true };
      }
      return { status: existing.status, connection: existing };
    }
    const { data, error } = await supabase.from("connections")
      .insert({ from_user: me.id, to_user: to, status: "pending" }).select().single();
    if (error) throw new Error(error.message);
    return { status: "pending", connection: data };
  }


  // ---- Browse: respond to a request ----
  if (p.startsWith("/browse/respond/")) {
    const connId = p.split("/")[3];
    if (body.action === "accept") {
      await supabase.from("connections").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", connId);
      return { status: "accepted", matched: true };
    }
    await supabase.from("connections").update({ status: "declined" }).eq("id", connId);
    return { status: "declined" };
  }


  // ---- Chat: send a message ----
  if (/^\/chat\/[^/]+\/message$/.test(p)) {
    const conversationId = p.split("/")[2];
    const me = await getMe();
    if (!body.text?.trim()) throw new Error("Empty message");
    const { data: convo } = await supabase.from("conversations").select("*").eq("id", conversationId).single();
    const isChap = (convo?.chaperones || []).includes(me.id);
    const { data, error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      from_user: me.id,
      from_name: me.profile?.displayName || me.fullName || "User",
      is_chaperone: isChap,
      text: body.text.trim(),
    }).select().single();
    if (error) throw new Error(error.message);
    return { message: mapMessage(data) };
  }


  // ---- Chat: add a chaperone ----
  if (/^\/chat\/[^/]+\/chaperone$/.test(p)) {
    const conversationId = p.split("/")[2];
    const { data: chap } = await supabase.from("profiles").select("id").ilike("email", body.email || "").limit(1);
    if (!chap || !chap.length) throw new Error("No MatchNest account with that email");
    const { data: convo } = await supabase.from("conversations").select("*").eq("id", conversationId).single();
    const chaperones = [...new Set([...(convo.chaperones || []), chap[0].id])];
    await supabase.from("conversations").update({ chaperones }).eq("id", conversationId);
    return { message: "Chaperone added", conversation: { ...convo, chaperones } };
  }


  // ---- Safety: report ----
  if (p.startsWith("/safety/report/")) {
    const id = p.split("/")[3];
    const me = await getMe();
    await supabase.from("reports").insert({ reporter: me.id, reported: id, reason: body.reason || "" });
    return { ok: true };
  }


  // ---- Safety: block ----
  if (p.startsWith("/safety/block/")) {
    const id = p.split("/")[3];
    const me = await getMe();
    const blocked = [...new Set([...(me.blockedUsers || []), id])];
    await supabase.from("profiles").update({ blocked_users: blocked }).eq("id", me.id);
    return { ok: true };
  }


  // ---- Admin moderation ----
  if (p.startsWith("/safety/admin/badge/")) {
    const id = p.split("/")[4];
    await supabase.from("profiles").update({ badge: !!body.value }).eq("id", id);
    return { ok: true };
  }
  if (p.startsWith("/safety/admin/suspend/")) {
    const id = p.split("/")[4];
    await supabase.from("profiles").update({ suspended: true }).eq("id", id);
    return { ok: true };
  }
  if (p.startsWith("/safety/admin/resolve/")) {
    const id = p.split("/")[4];
    await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
    return { ok: true };
  }


  throw new Error(`Unhandled POST ${path}`);
}


async function handlePut(path, body = {}) {
  const p = path.split("?")[0];
  // ---- Save profile (builder finish + settings privacy) ----
  if (p === "/profile") {
    const me = await getMe();
    const patch = {};
    if (body.profile !== undefined) patch.profile = body.profile;
    if (body.photoPrivacy !== undefined) patch.photo_privacy = body.photoPrivacy;
    patch.profile_complete = true;
    const { data, error } = await supabase.from("profiles").update(patch).eq("id", me.id).select().single();
    if (error) throw new Error(error.message);
    return { user: rowToUser(data) };
  }
  throw new Error(`Unhandled PUT ${path}`);
}


async function handleUpload(path, formData) {
  const p = path.split("?")[0];
  const q = Object.fromEntries(new URLSearchParams(path.split("?")[1] || ""));
  if (p === "/profile/photo") {
    const me = await getMe();
    const file = formData.get("photo");
    if (!file) throw new Error("No file");
    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const key = `${me.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("photos").upload(key, file, { upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { data: pub } = supabase.storage.from("photos").getPublicUrl(key);
    const url = pub.publicUrl;
    const patch = q.main === "true"
      ? { profile_photo: url }
      : { photos: [...(me.photos || []), url].slice(0, 5) };
    const { data, error } = await supabase.from("profiles").update(patch).eq("id", me.id).select().single();
    if (error) throw new Error(error.message);
    return { user: rowToUser(data) };
  }
  throw new Error(`Unhandled upload ${path}`);
}


// ---------------------------------------------------------------------------
// The api object the pages import — same surface as before.
// ---------------------------------------------------------------------------
export const api = {
  get: (path) => handleGet(path),
  post: (path, body) => handlePost(path, body),
  put: (path, body) => handlePut(path, body),
  upload: (path, formData) => handleUpload(path, formData),
};
