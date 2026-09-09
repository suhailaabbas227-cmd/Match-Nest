import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { buildDemoProfiles } from "./demo-profile-data.mjs";

const args = new Set(process.argv.slice(2));
const cleanOnly = args.has("--clean");
const dryRun = args.has("--dry-run");
const count = Number(process.env.DEMO_PROFILE_COUNT || 300);
const records = buildDemoProfiles(count);

if (dryRun) {
  const counts = records.reduce((out, item) => {
    const key = `${item.mode}:${item.gender.toLowerCase()}`;
    out[key] = (out[key] || 0) + 1;
    return out;
  }, {});
  console.log(JSON.stringify({ total: records.length, counts, sample: records[0] }, null, 2));
  process.exit(0);
}

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this admin-only script.");
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function chunks(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

async function listAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function deleteDemoProfiles() {
  const { data, error } = await admin.from("profiles").select("id").eq("is_demo", true);
  if (error) throw error;
  const ids = (data || []).map((item) => item.id);
  if (!ids.length) {
    console.log("No demo profiles found.");
    return;
  }

  const { data: conversations, error: conversationsError } = await admin
    .from("conversations")
    .select("id,participants");
  if (conversationsError) throw conversationsError;
  const demoIds = new Set(ids);
  const conversationIds = (conversations || [])
    .filter((item) => (item.participants || []).some((id) => demoIds.has(id)))
    .map((item) => item.id);

  for (const batch of chunks(conversationIds, 50)) {
    const { error: deleteConversationError } = await admin.from("conversations").delete().in("id", batch);
    if (deleteConversationError) throw deleteConversationError;
  }
  for (const batch of chunks(ids, 25)) {
    const { error: deleteNotificationError } = await admin.from("notifications").delete().in("actor_id", batch);
    if (deleteNotificationError) throw deleteNotificationError;
  }

  let removed = 0;
  for (const batch of chunks(ids, 5)) {
    await Promise.all(batch.map(async (id) => {
      const { error: deleteUserError } = await admin.auth.admin.deleteUser(id);
      if (deleteUserError) throw deleteUserError;
      removed += 1;
    }));
    console.log(`Removed ${removed}/${ids.length} demo accounts`);
    await pause(100);
  }
}

async function seedDemoProfiles() {
  const existingUsers = await listAuthUsers();
  const byEmail = new Map(existingUsers.map((user) => [user.email?.toLowerCase(), user]));
  const ready = [];
  let created = 0;

  for (const batch of chunks(records, 5)) {
    const users = await Promise.all(batch.map(async (record) => {
      const existing = byEmail.get(record.email);
      if (existing) return { ...record, id: existing.id };

      const { data, error } = await admin.auth.admin.createUser({
        email: record.email,
        email_confirm: true,
        password: `${crypto.randomUUID()}Aa1!`,
        user_metadata: {
          full_name: record.fullName,
          date_of_birth: record.dateOfBirth,
          gender: record.gender,
          country: record.country,
          city: record.city,
          mode: record.mode,
          is_demo: true,
        },
      });
      if (error) throw error;
      created += 1;
      return { ...record, id: data.user.id };
    }));
    ready.push(...users);
    console.log(`Prepared ${ready.length}/${records.length} demo accounts`);
    await pause(100);
  }

  for (const batch of chunks(ready, 50)) {
    const { error: profileError } = await admin.from("profiles").upsert(
      batch.map((item) => ({
        id: item.id,
        role: "user",
        full_name: item.fullName,
        email: "",
        phone: "",
        date_of_birth: "",
        gender: item.gender,
        country: item.country,
        city: item.city,
        mode: item.mode,
        profile: item.profile,
        profile_photo: null,
        photos: [],
        verified: true,
        badge: false,
        profile_complete: true,
        photo_privacy: item.photoPrivacy,
        blocked_users: [],
        suspended: false,
        is_demo: true,
      })),
      { onConflict: "id" },
    );
    if (profileError) throw profileError;

    const { error: privateError } = await admin.from("private_profiles").upsert(
      batch.map((item) => ({
        id: item.id,
        email: "",
        phone: "",
        date_of_birth: item.dateOfBirth,
        private_profile: {},
      })),
      { onConflict: "id" },
    );
    if (privateError) throw privateError;
  }

  const perGroup = ready.length / 4;
  console.log(`Demo profiles ready: ${ready.length} total (${created} newly created).`);
  console.log(`Distribution: ${perGroup} male + ${perGroup} female in Friendship, and ${perGroup} male + ${perGroup} female in Marriage.`);
}

if (cleanOnly) {
  await deleteDemoProfiles();
} else {
  await seedDemoProfiles();
}
