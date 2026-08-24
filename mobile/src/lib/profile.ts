import { supabase } from "./supabase";
import type { MatchMode, Profile } from "../types";

type ProfileRow = Record<string, any>;

export function mapProfile(row: ProfileRow | null, fallbackEmail = ""): Profile | null {
  if (!row) return null;
  const membership = row.membership || {};
  return {
    id: row.id,
    email: row.email || fallbackEmail,
    fullName: row.full_name || "",
    dateOfBirth: row.date_of_birth || "",
    mode: row.mode || null,
    gender: row.gender || "",
    country: row.country || row.profile?.country || "",
    city: row.city || row.profile?.city || "",
    profile: row.profile || {},
    profileComplete: row.profile_complete ?? false,
    suspended: row.suspended ?? false,
    deactivatedAt: row.deactivated_at || "",
    verified: row.verified ?? false,
    badge: row.badge ?? false,
    profilePhoto: row.profile_photo || null,
    photos: row.photos || [],
    photoPrivacy: row.photo_privacy ?? false,
    membership: {
      isPremium: membership.is_premium === true,
      status: membership.status || "free",
      plan: membership.plan || null,
      freeMessagesSent: membership.free_messages_sent || 0,
      freeMessagesRemaining: membership.free_messages_remaining ?? 2,
    },
  };
}

export async function getMyProfile(): Promise<Profile | null> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) throw new Error(error.message);

  if (!data) {
    return {
      id: authData.user.id,
      email: authData.user.email || "",
      fullName: "",
      dateOfBirth: "",
      mode: null,
      gender: "",
      country: "",
      city: "",
      profile: {},
      profileComplete: false,
      suspended: false,
      deactivatedAt: "",
      verified: false,
      badge: false,
      profilePhoto: null,
      photos: [],
      photoPrivacy: false,
      membership: {
        isPremium: false,
        status: "free",
        plan: null,
        freeMessagesSent: 0,
        freeMessagesRemaining: 2,
      },
    };
  }

  return mapProfile(data, authData.user.email || "");
}

export async function confirmDateOfBirth(dateOfBirth: string) {
  const { data, error } = await supabase.rpc("confirm_my_date_of_birth", {
    requested_dob: dateOfBirth,
  });
  if (error) throw new Error(error.message);
  return mapProfile(data);
}

export async function setProfileMode(mode: MatchMode) {
  const { data, error } = await supabase.rpc("set_profile_mode", {
    requested_mode: mode,
  });
  if (error) throw new Error(error.message);
  return mapProfile(data);
}

export async function completeBasicProfile(input: {
  mode: MatchMode;
  gender: string;
  lookingFor: string;
  country: string;
  city: string;
  bio: string;
  occupation: string;
  education: string;
  maritalStatus: string;
  photoPrivacy: boolean;
}) {
  const { data, error } = await supabase.rpc("update_my_profile", {
    profile_data: {
      gender: input.gender,
      lookingFor: input.lookingFor,
      country: input.country,
      city: input.city,
      aboutMe: input.bio,
      biodataNote: input.bio,
      occupation: input.occupation,
      education: input.education,
      maritalStatus: input.maritalStatus,
      relationshipGoal: input.mode === "marriage" ? "Marriage" : "A serious relationship",
    },
    requested_photo_privacy: input.photoPrivacy,
  });
  if (error) throw new Error(error.message);
  return mapProfile(data);
}
