import { supabase } from "./supabase";
import type {
  ChatMessage,
  ConversationSummary,
  NotificationItem,
  Profile,
  PublicProfile,
} from "../types";

const PUBLIC_SELECT = [
  "id", "full_name", "gender", "country", "city", "mode", "profile",
  "profile_photo", "photos", "verified", "badge", "profile_complete",
  "photo_privacy", "created_at",
].join(",");

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function pathFromPhoto(value: unknown) {
  if (!value || typeof value !== "string") return null;
  if (!/^https?:\/\//i.test(value)) return value;
  const marker = ["/object/public/photos/", "/object/sign/photos/", "/object/authenticated/photos/"]
    .find((item) => value.includes(item));
  return marker ? decodeURIComponent(value.split(marker)[1]?.split("?")[0] || "") : null;
}

async function signedPhoto(value: unknown) {
  const path = pathFromPhoto(value);
  if (!path) return null;
  const { data, error } = await supabase.storage.from("photos").createSignedUrl(path, 15 * 60);
  return error ? null : data.signedUrl;
}

async function mapPublic(row: Record<string, any>, matched = false): Promise<PublicProfile> {
  const blurred = row.mode === "marriage" && row.photo_privacy === true && !matched;
  const main = blurred ? null : await signedPhoto(row.profile_photo);
  const gallery = blurred
    ? []
    : (await Promise.all((row.photos || []).map(signedPhoto))).filter(Boolean) as string[];
  return {
    id: row.id,
    fullName: row.full_name || row.profile?.displayName || "Member",
    gender: row.gender || row.profile?.gender || "",
    country: row.country || row.profile?.country || "",
    city: row.city || row.profile?.city || "",
    mode: row.mode || null,
    profile: row.profile || {},
    profilePhoto: main,
    photos: gallery,
    verified: row.verified === true,
    badge: row.badge === true,
    photosBlurred: blurred,
  };
}

function compatibility(me: Profile, candidate: PublicProfile) {
  const mine = me.profile || {};
  const theirs = candidate.profile || {};
  let score = 45;
  const reasons: string[] = [];
  if (normalized(me.city) && normalized(me.city) === normalized(candidate.city)) {
    score += 12; reasons.push("same city");
  }
  if (normalized(mine.relationshipGoal) && normalized(mine.relationshipGoal) === normalized(theirs.relationshipGoal)) {
    score += 10; reasons.push("same relationship goal");
  }
  if (normalized(mine.sect) && normalized(mine.sect) === normalized(theirs.sect)) {
    score += 8; reasons.push("shared faith preference");
  }
  const myInterests = new Set(Array.isArray(mine.interests) ? mine.interests.map(normalized) : []);
  const shared = (Array.isArray(theirs.interests) ? theirs.interests : [])
    .map(normalized).filter((item: string) => myInterests.has(item));
  if (shared.length) {
    score += Math.min(18, shared.length * 4);
    reasons.push(`${shared.length} shared ${shared.length === 1 ? "interest" : "interests"}`);
  }
  return { score: Math.min(98, score), reasons: reasons.slice(0, 3) };
}

async function profileRows(ids: string[], matched = false) {
  if (!ids.length) return new Map<string, PublicProfile>();
  const { data, error } = await supabase.from("profiles").select(PUBLIC_SELECT).in("id", ids);
  if (error) throw new Error(error.message);
  const rows = (data || []) as unknown as Record<string, any>[];
  const mapped = await Promise.all(rows.map(async (row) => [row.id, await mapPublic(row, matched)] as const));
  return new Map(mapped);
}

export async function fetchBrowse(me: Profile) {
  const { data, error } = await supabase.from("profiles").select(PUBLIC_SELECT)
    .eq("mode", me.mode).eq("verified", true).eq("profile_complete", true)
    .neq("id", me.id).order("created_at", { ascending: false }).limit(60);
  if (error) throw new Error(error.message);
  const rows = (data || []) as unknown as Record<string, any>[];
  const mine = me.profile || {};
  const myGender = normalized(mine.gender || me.gender);
  const iWant = normalized(mine.lookingFor);
  const profiles = await Promise.all(rows.filter((row) => {
    const theirs = row.profile || {};
    const theirGender = normalized(theirs.gender || row.gender);
    const theyWant = normalized(theirs.lookingFor);
    return (!iWant || iWant === theirGender) && (!theyWant || theyWant === myGender);
  }).map(async (row) => {
    const profile = await mapPublic(row, false);
    const match = compatibility(me, profile);
    return { ...profile, matchScore: match.score, matchReasons: match.reasons };
  }));
  return profiles.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

export async function fetchPublicProfile(userId: string, matched = false) {
  const { data, error } = await supabase.from("profiles").select(PUBLIC_SELECT).eq("id", userId).single();
  if (error) throw new Error("Profile could not be loaded.");
  return mapPublic(data, matched);
}

export async function getConnections(kind: "accepted" | "incoming" | "outgoing") {
  const { data, error } = await supabase.rpc("get_my_connections", { requested_kind: kind });
  if (error) throw new Error(error.message);
  const rows = data || [];
  const visibleIds = rows.filter((row: any) => !row.locked && row.other_user).map((row: any) => row.other_user);
  const map = await profileRows(visibleIds, kind === "accepted");
  return rows.map((row: any) => ({
    connectionId: row.connection_id,
    status: row.status,
    locked: row.locked === true,
    userId: row.other_user || null,
    user: row.other_user ? map.get(row.other_user) || null : null,
  }));
}

export async function sendConnection(userId: string) {
  const { error } = await supabase.rpc("send_connection", { target_user: userId });
  if (error) throw new Error(error.message);
}

export async function respondConnection(connectionId: string, action: "accept" | "decline") {
  const { error } = await supabase.rpc("respond_connection", {
    connection_id: connectionId, requested_action: action,
  });
  if (error) throw new Error(error.message);
}

function mapMessage(row: any): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    from: row.from_user,
    fromName: row.from_name || "Member",
    text: row.text,
    locked: row.locked === true,
    createdAt: row.created_at,
  };
}

async function conversationMessages(conversationId: string) {
  const { data, error } = await supabase.rpc("get_conversation_messages", { target_conversation: conversationId });
  if (error) throw new Error(error.message);
  return (data || []).map(mapMessage);
}

export async function fetchConversations(myId: string): Promise<ConversationSummary[]> {
  const [{ data: asMember }, { data: asChaperone }] = await Promise.all([
    supabase.from("conversations").select("*").contains("participants", [myId]),
    supabase.from("conversations").select("*").contains("chaperones", [myId]),
  ]);
  const unique = new Map<string, any>();
  [...(asMember || []), ...(asChaperone || [])].forEach((item) => unique.set(item.id, item));
  const conversations = [...unique.values()];
  const otherIds = conversations.map((item) => item.participants.find((id: string) => id !== myId) || item.participants[0]);
  const profiles = await profileRows(otherIds, true);
  const result: ConversationSummary[] = [];
  for (const item of conversations) {
    const otherId = item.participants.find((id: string) => id !== myId) || item.participants[0];
    const user = profiles.get(otherId);
    if (!user) continue;
    const messages = await conversationMessages(item.id);
    const last = messages.at(-1);
    result.push({
      id: item.id,
      user,
      lastMessage: last?.locked ? "Premium message" : last?.text || null,
      lastAt: last?.createdAt || item.created_at,
    });
  }
  return result.sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
}

export async function openConversation(userId: string) {
  const { data: conversation, error } = await supabase.rpc("get_or_create_conversation", { other_user: userId });
  if (error) throw new Error(error.message);
  const [messages, user] = await Promise.all([
    conversationMessages(conversation.id),
    fetchPublicProfile(userId, true),
  ]);
  return { conversation, messages, user };
}

export async function sendMessage(conversationId: string, text: string) {
  const { data, error } = await supabase.rpc("send_chat_message", {
    target_conversation: conversationId, message_text: text,
  });
  if (error) throw new Error(error.message);
  return mapMessage(data);
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const { data, error } = await supabase.rpc("get_my_notifications");
  if (error) throw new Error(error.message);
  return (data || []).map((item: any) => ({ ...item, locked: item.identity_locked === true }));
}

export async function markNotificationsRead(ids?: string[]) {
  const { error } = await supabase.rpc("mark_notifications_read", { notification_ids: ids?.length ? ids : null });
  if (error) throw new Error(error.message);
}

export async function reportMember(userId: string, reason: string) {
  const { error } = await supabase.rpc("create_member_report", { target_user: userId, report_reason: reason });
  if (error) throw new Error(error.message);
}

export async function blockMember(userId: string) {
  const { error } = await supabase.rpc("block_member", { target_user: userId });
  if (error) throw new Error(error.message);
}

export async function switchMode() {
  const { data, error } = await supabase.rpc("switch_profile_mode");
  if (error) throw new Error(error.message);
  return data;
}
