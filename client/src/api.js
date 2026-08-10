// Supabase-backed data layer.
// Re-implements the old REST API (auth, profiles, browse, matches, chat,
// safety) directly against Supabase, so the existing pages keep calling
// api.get / api.post / api.put / api.upload with the same paths.
import { supabase } from "./supabase";

const PUBLIC_PROFILE_SELECT = [
  "id",
  "full_name",
  "gender",
  "country",
  "city",
  "mode",
  "profile",
  "profile_photo",
  "photos",
  "verified",
  "badge",
  "profile_complete",
  "photo_privacy",
  "created_at",
].join(",");

const photoUrlCache = new Map();


// ---------------------------------------------------------------------------
// Mappers between the database row (snake_case) and the app's user shape.
// ---------------------------------------------------------------------------
export function rowToUser(r) {
  if (!r) return null;
  const membership = r.membership || {
    is_premium: false,
    status: "free",
    plan: null,
    free_messages_sent: 0,
    free_messages_remaining: 2,
  };
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
    verified: r.verified ?? false,
    badge: r.badge ?? false,
    profileComplete: r.profile_complete ?? false,
    photoPrivacy: r.photo_privacy ?? false,
    blockedUsers: r.blocked_users || [],
    suspended: r.suspended ?? false,
    membership,
    isPremium: membership.is_premium === true,
    createdAt: r.created_at,
  };
}


function ageFromDob(dob) {
  if (!dob) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  if (
    today.getMonth() < month - 1
    || (today.getMonth() === month - 1 && today.getDate() < day)
  ) age -= 1;
  return age;
}

function storedPhotoPath(value) {
  if (!value || typeof value !== "string") return null;
  if (!/^https?:\/\//i.test(value)) return value;

  const markers = [
    "/storage/v1/object/public/photos/",
    "/storage/v1/object/sign/photos/",
    "/storage/v1/object/authenticated/photos/",
  ];
  const marker = markers.find((candidate) => value.includes(candidate));
  if (!marker) return null;
  return decodeURIComponent(value.split(marker)[1]?.split("?")[0] || "") || null;
}

async function signedPhotoUrl(value) {
  const path = storedPhotoPath(value);
  if (!path) return null;
  const cached = photoUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.url;

  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrl(path, 15 * 60);
  if (error) return null;

  photoUrlCache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + 14 * 60 * 1000,
  });
  return data.signedUrl;
}

async function withSignedPhotos(user) {
  if (!user) return null;
  const [profilePhoto, photos] = await Promise.all([
    signedPhotoUrl(user.profilePhoto),
    Promise.all((user.photos || []).map(signedPhotoUrl)),
  ]);
  return {
    ...user,
    profilePhoto,
    photos: photos.filter(Boolean),
  };
}


// Guardian/contact fields stay hidden until two users match.
const PRIVATE_PROFILE_FIELDS = ["wali"];


// What another member sees when browsing (mirrors the old server publicView).
function publicView(u, matched = false) {
  if (!u) return null;
  const {
    email,
    phone,
    dateOfBirth,
    blockedUsers,
    role,
    suspended,
    ...rest
  } = u;
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
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) throw new Error(error.message);
  if (!data) {
    return {
      id: au.id,
      email: au.email,
      fullName: "",
      mode: null,
      profileComplete: false,
      role: "user",
      profile: {},
      photos: [],
    };
  }
  return withSignedPhotos(rowToUser(data));
}


export async function signUpUser({ fullName, email, password, dateOfBirth, mode }) {
  const age = ageFromDob(dateOfBirth);
  if (age == null) return { error: "Please enter a valid date of birth." };
  if (age < 18) {
    return { error: "Sorry, you must be at least 18 years old to use MatchNest." };
  }
  if (age > 120) return { error: "Please enter a valid date of birth." };

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

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) return { error: error.message };
  return {};
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return {};
}

export async function confirmDateOfBirth(dateOfBirth) {
  const age = ageFromDob(dateOfBirth);
  if (age == null || age > 120) return { error: "Please enter a valid date of birth." };
  if (age < 18) return { error: "Sorry, you must be at least 18 years old to use MatchNest." };

  const { data, error } = await supabase.rpc("confirm_my_date_of_birth", {
    requested_dob: dateOfBirth,
  });
  if (error) return { error: error.message };
  return { user: await withSignedPhotos(rowToUser(data)) };
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
  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_SELECT)
    .in("id", ids);
  if (error) throw new Error(error.message);
  const map = {};
  await Promise.all((data || []).map(async (r) => {
    map[r.id] = await withSignedPhotos(rowToUser(r));
  }));
  return map;
}

async function getMyMembership() {
  const { data, error } = await supabase.rpc("get_my_membership");
  if (error) throw new Error(error.message);
  return data;
}

async function getConversationMessages(conversationId) {
  const { data, error } = await supabase.rpc("get_conversation_messages", {
    target_conversation: conversationId,
  });
  if (error) throw new Error(error.message);
  return (data || []).map(mapMessage);
}


// ---------------------------------------------------------------------------
// Path handlers — each returns the same JSON the old API returned.
// ---------------------------------------------------------------------------
async function handleGet(path) {
  const [p, qs] = path.split("?");
  const q = Object.fromEntries(new URLSearchParams(qs || ""));


  if (p === "/auth/me") return { user: await getMe() };

  if (p === "/membership") return { membership: await getMyMembership() };


  // ---- Browse list ----
  if (p === "/browse") {
    const me = await getMe();
    let query = supabase.from("profiles").select(PUBLIC_PROFILE_SELECT)
      .eq("mode", me.mode).eq("verified", true).eq("profile_complete", true)
      .neq("id", me.id)
      .order("created_at", { ascending: false })
      .limit(60);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const accepted = await myAcceptedIds(me.id);
    const filtered = (data || [])
      .map(rowToUser)
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
    const profiles = await Promise.all(filtered.map(withSignedPhotos));
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
    const { data, error } = await supabase
      .from("profiles")
      .select(PUBLIC_PROFILE_SELECT)
      .eq("id", id)
      .single();
    if (error) throw new Error("Profile not found");
    const accepted = await myAcceptedIds(me.id);
    const profile = publicView(rowToUser(data), accepted.has(id));
    return { profile: await withSignedPhotos(profile) };
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
      const msgs = await getConversationMessages(c.id);
      const last = msgs.at(-1);
      out.push({
        id: c.id,
        user: publicView(map[otherId], true),
        lastMessage: last?.locked ? "Premium message" : last?.text || null,
        lastAt: last?.createdAt || c.created_at,
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
    const convo = await getOrCreateConversation(otherId);
    const [messages, access] = await Promise.all([
      getConversationMessages(convo.id),
      getMyMembership(),
    ]);
    return { conversation: convo, messages, access };
  }


  // ---- Admin ----
  if (p === "/safety/admin/users") {
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) throw new Error(error.message);
    return { users: (data || []).map(rowToUser) };
  }
  if (p === "/safety/admin/reports") {
    const { data, error } = await supabase.rpc("admin_list_reports");
    if (error) throw new Error(error.message);
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
    locked: m.locked ?? false,
    createdAt: m.created_at,
  };
}


async function getOrCreateConversation(otherId) {
  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    other_user: otherId,
  });
  if (error) throw new Error(error.message);
  return data;
}


async function handlePost(path, body = {}) {
  const p = path.split("?")[0];


  // ---- Profile: pick mode ----
  if (p === "/profile/mode") {
    const { data, error } = await supabase.rpc("set_profile_mode", {
      requested_mode: body.mode,
    });
    if (error) throw new Error(error.message);
    return { user: await withSignedPhotos(rowToUser(data)) };
  }


  // ---- Profile: switch mode ----
  if (p === "/profile/switch-mode") {
    const { data, error } = await supabase.rpc("switch_profile_mode");
    if (error) throw new Error(error.message);
    return { user: await withSignedPhotos(rowToUser(data)) };
  }


  // ---- Browse: send connection request ----
  if (p.startsWith("/browse/connect/")) {
    const to = p.split("/")[3];
    const { data, error } = await supabase.rpc("send_connection", {
      target_user: to,
    });
    if (error) throw new Error(error.message);
    return data;
  }


  // ---- Browse: respond to a request ----
  if (p.startsWith("/browse/respond/")) {
    const connId = p.split("/")[3];
    const { data, error } = await supabase.rpc("respond_connection", {
      connection_id: connId,
      requested_action: body.action,
    });
    if (error) throw new Error(error.message);
    return data;
  }


  // ---- Chat: send a message ----
  if (/^\/chat\/[^/]+\/message$/.test(p)) {
    const conversationId = p.split("/")[2];
    const { data, error } = await supabase.rpc("send_chat_message", {
      target_conversation: conversationId,
      message_text: body.text || "",
    });
    if (error) throw new Error(error.message);
    return { message: mapMessage(data) };
  }


  // ---- Chat: add a chaperone ----
  if (/^\/chat\/[^/]+\/chaperone$/.test(p)) {
    const conversationId = p.split("/")[2];
    const { data, error } = await supabase.rpc("add_chaperone_by_email", {
      target_conversation: conversationId,
      chaperone_email: body.email || "",
    });
    if (error) throw new Error(error.message);
    return { message: "Chaperone added", conversation: data };
  }


  // ---- Safety: report ----
  if (p.startsWith("/safety/report/")) {
    const id = p.split("/")[3];
    const { error } = await supabase.rpc("create_member_report", {
      target_user: id,
      report_reason: body.reason || "",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  }


  // ---- Safety: block ----
  if (p.startsWith("/safety/block/")) {
    const id = p.split("/")[3];
    const { error } = await supabase.rpc("block_member", {
      target_user: id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  }


  // ---- Admin moderation ----
  if (p.startsWith("/safety/admin/badge/")) {
    const id = p.split("/")[4];
    const { error } = await supabase.rpc("admin_set_badge", {
      target_user: id,
      requested_value: !!body.value,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  }
  if (p.startsWith("/safety/admin/suspend/")) {
    const id = p.split("/")[4];
    const { error } = await supabase.rpc("admin_set_suspension", {
      target_user: id,
      requested_value: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  }
  if (p.startsWith("/safety/admin/resolve/")) {
    const id = p.split("/")[4];
    const { error } = await supabase.rpc("admin_resolve_report", {
      target_report: id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  }


  throw new Error(`Unhandled POST ${path}`);
}


async function handlePut(path, body = {}) {
  const p = path.split("?")[0];
  // ---- Save profile (builder finish + settings privacy) ----
  if (p === "/profile") {
    const { data, error } = await supabase.rpc("update_my_profile", {
      profile_data: body.profile || {},
      requested_photo_privacy:
        body.photoPrivacy === undefined ? null : !!body.photoPrivacy,
    });
    if (error) throw new Error(error.message);
    return { user: await withSignedPhotos(rowToUser(data)) };
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
    const extensionByType = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = extensionByType[file.type];
    if (!ext) throw new Error("Please upload a JPG, PNG, or WebP image");
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Photo must be smaller than 10 MB");
    }

    const key = `${me.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("photos")
      .upload(key, file, {
        upsert: false,
        cacheControl: "3600",
        contentType: file.type,
      });
    if (upErr) throw new Error(upErr.message);

    const currentMain = storedPhotoPath(me.profilePhoto);
    const currentGallery = (me.photos || []).map(storedPhotoPath).filter(Boolean);
    const mainPhoto = q.main === "true" ? key : currentMain;
    const galleryPhotos = q.main === "true"
      ? currentGallery
      : [...currentGallery, key].slice(0, 5);
    const { data, error } = await supabase.rpc("update_my_photos", {
      main_photo: mainPhoto,
      gallery_photos: galleryPhotos,
    });
    if (error) throw new Error(error.message);
    return { user: await withSignedPhotos(rowToUser(data)) };
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
